/**
 * The final audit run.
 *
 * Everything in the audit brief that has to happen on the final code state,
 * in the order it has to happen:
 *
 *   1. type check and build the audit runtime (isolated dist dir, so a
 *      concurrent `next build` in the same repository cannot wipe it)
 *   2. start the audit server
 *   3. the full functional suite over all 492 tools
 *   4. the UI metadata of every tool, in both locales, read from the live DOM
 *   5. the "How to use this tool" data, regenerated from that metadata
 *   6. the feature bullets and the per-tool FAQ, regenerated the same way
 *   7. the findings
 *   8. the route matrix: Chrome, Edge, Firefox and WebKit, both locales,
 *      both viewports, both themes
 *   9. the privacy audit and the workspace-fit check
 *  10. the tracker and the summary, which read the evidence of the steps
 *      above and therefore run last
 *
 * Each step writes its own evidence file, so a failed step never destroys
 * the evidence of the steps before it.
 *
 * Usage:
 *   node scripts/audit/run-final-audit.mjs
 *   node scripts/audit/run-final-audit.mjs --skip=matrix
 *   node scripts/audit/run-final-audit.mjs --only=functional,howto
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const PORT = args.port || "3100";
const DIST = args.dist || ".next-audit";
const WORKERS = args.workers || "5";
const SKIP = new Set((args.skip || "").split(",").filter(Boolean));
const ONLY = new Set((args.only || "").split(",").filter(Boolean));

const wants = (step) => {
  if (ONLY.size) return ONLY.has(step);
  return !SKIP.has(step);
};

const BASE = `http://localhost:${PORT}`;

function run(label, command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    process.stdout.write(`\n=== ${label} ===\n`);
    const started = Date.now();
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: { ...process.env, ...(options.env || {}) },
      stdio: options.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      // No shell: on Windows a shell would split the node path at the space
      // in "C:\Program Files\...".
      shell: false,
    });
    let tail = "";
    if (options.quiet) {
      const keep = (d) => {
        tail = (tail + d.toString()).split("\n").slice(-25).join("\n");
      };
      child.stdout.on("data", keep);
      child.stderr.on("data", keep);
    }
    child.on("close", (code) => {
      const minutes = ((Date.now() - started) / 60000).toFixed(1);
      console.log(`--- ${label}: exit ${code} (${minutes} min)`);
      if (code !== 0 && options.quiet) console.log(tail);
      resolve(code);
    });
  });
}

const node = process.execPath;
const steps = [];

steps.push([
  "typecheck",
  () =>
    run("type check", node, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"]),
]);

steps.push([
  "build",
  () =>
    run("build the audit runtime", node, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
      env: { NEXT_DIST_DIR: DIST },
    }),
]);

let server = null;

async function stopServer() {
  if (!server) return;
  // On Windows the server runs under cmd.exe, so the whole tree has to go.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill();
  }
  server = null;
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Kill whatever is listening on the audit port, whoever started it.
 *
 * `next start` loads the build when it starts, so a server that was left
 * running by an earlier run keeps serving that older build even after the
 * build directory was replaced. The audit would then test stale code, which
 * is worse than not testing at all.
 */
function killPortListeners() {
  const pids = new Set();
  if (process.platform === "win32") {
    const res = spawnSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
    for (const line of (res.stdout || "").split("\n")) {
      if (!new RegExp(`:${PORT}\\s+.*LISTENING`).test(line)) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      spawn("taskkill", ["/pid", pid, "/T", "/F"], { stdio: "ignore" });
    }
  } else {
    const res = spawnSync("lsof", ["-ti", `tcp:${PORT}`], { encoding: "utf8" });
    for (const pid of (res.stdout || "").split("\n").map((s) => s.trim()).filter(Boolean)) {
      pids.add(pid);
      spawn("kill", ["-9", pid], { stdio: "ignore" });
    }
  }
  return [...pids];
}

async function startServer() {
  // The env var is passed to the next process directly: through cmd.exe the
  // quoting of `set "VAR=value"` is fragile and the server then silently
  // falls back to the default .next directory.
  const out = openSync(path.join(root, "audit-server.log"), "a");
  server = spawn(
    node,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", PORT],
    {
      cwd: root,
      env: { ...process.env, NEXT_DIST_DIR: DIST },
      stdio: ["ignore", out, out],
    },
  );
  for (let i = 0; i < 120; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const ok = await fetch(`${BASE}/tools/2026-calendar`).then((r) => r.ok).catch(() => false);
    if (ok) {
      console.log(`the audit server answers on ${BASE}`);
      return 0;
    }
  }
  console.error("the audit server did not come up");
  return 1;
}

steps.push([
  "serve",
  async () => {
    // Any server that is already on the port was started against an earlier
    // build, so it is stopped first: the audit has to run against the build
    // that was just made.
    const killed = killPortListeners();
    if (killed.length) {
      console.log(`stopped ${killed.length} process(es) that were listening on ${PORT}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    return startServer();
  },
]);

for (const locale of ["en", "de"]) {
  steps.push([
    `metadata-${locale}`,
    () =>
      run(`the UI metadata (${locale})`, node, [path.join(here, "extract-ui-metadata.mjs"), `--locale=${locale}`, `--port=${PORT}`], {
        env: { FUNCTIONAL_BASE_URL: BASE },
      }),
  ]);
}

steps.push([
  "howto",
  () => run("the how-to data", node, [path.join(here, "build-howto.mjs")]),
]);

steps.push([
  "howto-check",
  () => run("the how-to gate", node, [path.join(here, "check-howto.mjs")]),
]);

steps.push([
  "features",
  () => run("the feature bullets and the per-tool FAQ", node, [path.join(here, "build-features.mjs")]),
]);

/**
 * The generated catalogue data is part of the build, so the build has to be
 * repeated after it was regenerated. `next start` loads the build when it
 * starts, so the server has to be restarted with it.
 */
steps.push([
  "rebuild",
  async () => {
    await stopServer();
    killPortListeners();
    const code = await run("rebuild the audit runtime", node, [
      path.join(root, "node_modules", "next", "dist", "bin", "next"),
      "build",
    ], { env: { NEXT_DIST_DIR: DIST } });
    if (code !== 0) return code;
    return startServer();
  },
]);

steps.push([
  "functional",
  () =>
    run("the full functional suite (492 tools)", node, [
      path.join(here, "functional-tests.mjs"),
    ], { env: { FUNCTIONAL_BASE_URL: BASE } }),
]);

steps.push([
  "integrity",
  () => run("the spec integrity gate", node, [path.join(here, "check-spec-integrity.mjs")]),
]);

steps.push([
  "findings",
  () => run("the findings", node, [path.join(here, "build-findings.mjs")]),
]);

steps.push([
  "matrix",
  () => run("the route matrix", node, [path.join(here, "run-route-matrix.mjs"), `--port=${PORT}`, `--workers=${WORKERS}`]),
]);

steps.push([
  "privacy",
  () =>
    run("the privacy audit", node, [path.join(here, "privacy-audit.mjs"), `--port=${PORT}`, "--workers=4"], {
      env: { FUNCTIONAL_BASE_URL: BASE },
    }),
]);

steps.push([
  "fit",
  () => run("the workspace fit check", node, [path.join(here, "audit-workspace-fit.mjs"), `--port=${PORT}`, "--workers=5"]),
]);

// The locale sweeps read the live DOM of every tool in both languages. They
// report their findings in their own evidence file and exit 0 either way, so
// the result has to be read from that file afterwards.
steps.push([
  "locale-sweeps",
  async () => {
    const a = await run("the untranslated UI sweep", node, [
      path.join(here, "find-untranslated-ui.mjs"),
      `--port=${PORT}`,
      "--workers=4",
    ]);
    const b = await run("the German-on-English sweep", node, [
      path.join(here, "find-german-on-english.mjs"),
      `--port=${PORT}`,
      "--workers=4",
    ]);
    return a !== 0 ? a : b;
  },
]);

// The tracker and the summary read the route, the privacy and the fit
// evidence, so they run last: a status must never be written from the
// evidence of an earlier build.
steps.push([
  "tracker",
  () => run("the tracker", node, [path.join(here, "sync-audit-tracker.mjs")]),
]);

steps.push([
  "summary",
  () => run("the summary", node, [path.join(here, "build-audit-summary.mjs")]),
]);

const results = [];
for (const [name, fn] of steps) {
  if (!wants(name)) {
    console.log(`\n--- ${name}: skipped`);
    results.push([name, "skipped"]);
    continue;
  }
  const code = await fn();
  results.push([name, code === 0 ? "ok" : `exit ${code}`]);
  if (code !== 0 && !args.keepGoing) {
    console.log(`\n${name} failed; the run stops here.`);
    break;
  }
}

if (server) {
  // On Windows the server runs under cmd.exe, so the whole tree has to go.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill();
  }
}

console.log("\n---- final audit ----");
for (const [name, state] of results) console.log(`  ${state === "ok" ? "OK  " : state === "skipped" ? "SKIP" : "FAIL"}  ${name}`);

const evidence = path.join(root, "docs", "audit-evidence", "functional-tests.json");
if (existsSync(evidence)) {
  const j = JSON.parse((await import("node:fs")).readFileSync(evidence, "utf8"));
  const list = j.results || [];
  const pass = list.filter((r) => r.status === "PASS").length;
  console.log(`\nfunctional suite: PASS ${pass} / ${list.length}`);
}
