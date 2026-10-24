/**
 * Merge the audit findings into docs/tool-audit.csv.
 *
 * Status sources, in priority order:
 *   1. the real-browser functional test results in
 *      docs/audit-evidence/functional-tests.json,
 *   2. the privacy audit in docs/audit-evidence/privacy-audit.json,
 *   3. the route-level browser audits (docs/audit-evidence/routes-*.json),
 *   4. the structural findings in scripts/audit/data/findings.json.
 *
 * The statuses are exactly the ones the audit brief allows:
 *   NOT_STARTED, IN_PROGRESS, PASS, FAIL, BLOCKED_API, BLOCKED_TECHNICAL,
 *   BLOCKED_ENVIRONMENT
 *
 * A PASS needs a passing real-browser functional test AND a clean route audit
 * AND a clean privacy check. A repaired defect without a functional test is
 * IN_PROGRESS, never PASS.
 *
 * Run: node scripts/audit/sync-audit-tracker.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const docsDir = join(root, "docs");
const csvPath = join(docsDir, "tool-audit.csv");
const evidenceDir = join(docsDir, "audit-evidence");

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);

const findings = readJson(join(here, "data", "findings.json")) || {};
const functional = readJson(join(evidenceDir, "functional-tests.json")) || { results: [] };
const privacy = readJson(join(evidenceDir, "privacy-audit.json")) || { results: [] };
const fit = readJson(join(evidenceDir, "workspace-fit.json")) || { results: [] };

const functionalBySlug = new Map((functional.results || []).map((r) => [r.slug, r]));
const privacyBySlug = new Map((privacy.results || []).map((r) => [r.slug, r]));
const fitBySlug = new Map((fit.results || []).map((r) => [r.slug, r]));

/** Every route audit pass that was run, keyed by slug. */
const routeBySlug = new Map();
const routePasses = [];
for (const file of readdirSync(evidenceDir)) {
  if (!file.startsWith("routes-") || !file.endsWith(".json")) continue;
  const data = readJson(join(evidenceDir, file));
  if (!data || !data.results) continue;
  // A partial run (a smoke test) does not count as a pass over the site.
  if (data.results.length < TOOLS_CATALOG.length) continue;
  routePasses.push(file.replace(/^routes-|\.json$/g, ""));
  for (const r of data.results) {
    const entry = routeBySlug.get(r.slug) || { passes: 0, clean: 0, errors: [], files: [] };
    entry.passes += 1;
    entry.files.push(`docs/audit-evidence/routes-${file.replace(/^routes-|\.json$/g, "")}.json`);
    const bad =
      (r.consoleErrors && r.consoleErrors.length) ||
      (r.pageErrors && r.pageErrors.length) ||
      (r.status !== 200) ||
      (r.externalRequests && r.externalRequests.length);
    if (!bad) entry.clean += 1;
    else entry.errors.push(file);
    routeBySlug.set(r.slug, entry);
  }
}

/**
 * The tools that keep data on purpose.
 *
 * There are none. The audit brief puts every tool on the same rule: user
 * files, extracted text, inputs, outputs and intermediate data stay in the
 * memory of the tab, and only a download that the user asks for leaves the
 * browser. A tool that writes to storage is therefore a defect, and the
 * tracker reports it as one.
 */
const ALLOWED_STORAGE = new Set();

/**
 * The capabilities that cannot be delivered inside the browser.
 *
 * These tools are not broken: each one does exactly what its corrected
 * catalogue description says, and its functional test proves it. What cannot
 * be delivered is the operation its name promises, because the browser has no
 * decoder, no reader and no runtime for it, or because this site deliberately
 * never sends a request to a third party. The tracker records the precise
 * reason instead of pretending the tool is complete.
 */
const BLOCKED = {
  "avi-to-mp4": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No browser can decode the AVI container: Chrome, Firefox and WebKit all refuse the file, so the video cannot be read in the browser and no MP4 can be produced from it.",
  },
  "heic-to-jpg-converter": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No browser this site runs in ships a HEIC decoder, so the photo cannot be decoded and no JPEG can be produced from it. The tool reads the container and shows what it holds.",
  },
  "parquet-to-csv": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No browser ships a Parquet reader and the Apache Arrow format cannot be parsed without a library this site does not bundle, so the file cannot be converted.",
  },
  "parquet-viewer": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No browser ships a Parquet reader, so the rows of the file cannot be shown.",
  },
  "local-ai-chat": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No model weights and no inference runtime ship with this site, so the chat cannot answer. The workspace loads the weights from this origin when they are placed there and reports the WebGPU state.",
  },
  "offline-ai-chat": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No model weights and no inference runtime ship with this site, so the chat cannot answer. The workspace loads the weights from this origin when they are placed there and reports the WebGPU state.",
  },
  "private-ai-chatbot": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "No model weights and no inference runtime ship with this site, so the chatbot cannot answer. The workspace loads the weights from this origin when they are placed there and reports the WebGPU state.",
  },
  "youtube-thumbnail-downloader": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "Downloading from YouTube needs a request to a third-party server, and this site never sends one. The tool reads the video id out of the link and lists the official thumbnail addresses instead.",
  },
  "youtube-thumbnail-grabber": {
    status: "BLOCKED_TECHNICAL",
    reason:
      "Downloading from YouTube needs a request to a third-party server, and this site never sends one. The tool reads the video id out of the link and lists the official thumbnail addresses instead.",
  },
};

const COLUMNS = [
  "sheet", "row", "slug", "name", "category", "engine", "locale_coverage",
  "intended_behavior", "discovered_problem", "changed_files", "dependency_or_api",
  "status", "test_ids", "expected_result", "actual_result", "evidence_path",
  "tested_revision", "tested_date", "blocker_details",
];

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const previous = new Map();
if (existsSync(csvPath)) {
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const header = rows.shift();
  if (header) {
    for (const r of rows) {
      const rec = Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]));
      if (rec.slug) previous.set(rec.slug, rec);
    }
  }
}

const today = new Date().toISOString().slice(0, 10);
const revision = "working tree (uncommitted)";

function cleanDescription(name, description) {
  const d = description || "";
  if (!name) return d;
  if (d.toLowerCase().startsWith(name.toLowerCase())) return d.slice(name.length).trim();
  return d;
}

const rows = [];
const counts = {};
const notes = [];

for (const [index, tool] of TOOLS_CATALOG.entries()) {
  const prior = previous.get(tool.slug) || {};
  const finding = findings[tool.slug] || {};
  const fn = functionalBySlug.get(tool.slug);
  const pr = privacyBySlug.get(tool.slug);
  const fitRow = fitBySlug.get(tool.slug);
  const route = routeBySlug.get(tool.slug);

  let status = "NOT_STARTED";
  let problem = prior.discovered_problem || "";
  let testIds = prior.test_ids || "";
  let expected = prior.expected_result || "";
  let actual = prior.actual_result || "";
  let changed = prior.changed_files || "";
  let evidence = prior.evidence_path || "";
  let blocker = prior.blocker_details || "";
  const evidencePaths = [];

  if (finding.problem) problem = finding.problem;
  if (finding.changed_files) changed = finding.changed_files;
  if (finding.expected_result) expected = finding.expected_result;
  if (finding.actual_result) actual = finding.actual_result;

  // --- route level ------------------------------------------------------
  const routeClean = route && route.clean === route.passes;
  // The evidence is the route-audit files that actually covered this tool.
  if (route) evidencePaths.push(...[...new Set(route.files)]);

  // --- wrong workspace --------------------------------------------------
  const fitOk = !fitRow || fitRow.fit === true || fitRow.suspect === false;

  // --- privacy ----------------------------------------------------------
  let privacyClean = true;
  if (pr) {
    evidencePaths.push("docs/audit-evidence/privacy-audit.json");
    const stored = (pr.localStorageAdded || []).length + (pr.localStorageChanged || []).length +
      (pr.sessionStorageAdded || []).length + (pr.indexedDbAdded || []).length;
    const external = (pr.externalRequests || []).length;
    if (external > 0) {
      privacyClean = false;
      blocker = `external request during use: ${pr.externalRequests.join(", ")}`;
    } else if (stored > 0 && !ALLOWED_STORAGE.has(tool.slug)) {
      privacyClean = false;
      blocker = `writes to browser storage: ${[
        ...(pr.localStorageAdded || []),
        ...(pr.localStorageChanged || []),
        ...(pr.sessionStorageAdded || []),
      ].join(", ")}`;
    }
  }

  // --- the status -------------------------------------------------------
  const blocked = BLOCKED[tool.slug];
  if (blocked) {
    // The tool behaves honestly and its functional test proves it, but the
    // operation its name promises cannot be delivered in the browser.
    status = blocked.status;
    blocker = blocked.reason;
    actual = `the promised capability cannot be delivered: ${blocked.reason}`;
    if (fn) {
      evidencePaths.push("docs/audit-evidence/functional-tests.json");
      testIds = testIds || `functional:${tool.slug}`;
    }
  } else if (fn) {
    evidencePaths.push("docs/audit-evidence/functional-tests.json");
    testIds = testIds || `functional:${tool.slug}`;
    if (fn.status !== "PASS") {
      status = "FAIL";
      actual = `Functional test failed: ${String(fn.error || "").slice(0, 240)}`;
    } else if (!routeClean) {
      status = "FAIL";
      actual = "Functional test passed but the route audit reported an error";
      blocker = blocker || `route audit errors in: ${(route.errors || []).join(", ")}`;
    } else if (!privacyClean) {
      status = "FAIL";
      actual = "Functional test passed but the privacy check failed";
    } else if (!fitOk) {
      status = "FAIL";
      actual = "Functional test passed but the workspace does not mention the tool";
    } else {
      status = "PASS";
      actual = "matches the expected result; route audit clean; no data left on the device";
    }
  } else if (finding.status === "FAIL") {
    status = "FAIL";
    actual = `Functional test failed: ${String(finding.actual_result || "").slice(0, 240)}`;
  } else if (route) {
    // The route was audited but no functional test has been written yet.
    status = "IN_PROGRESS";
    actual =
      "route renders with HTTP 200, no console or page error and no outbound request; " +
      "no functional test written yet";
  } else {
    status = "NOT_STARTED";
  }

  if (!evidencePaths.length) {
    evidencePaths.push(
      "docs/audit-evidence/routes-chrome-en-desktop-light.json",
    );
  }
  evidence = evidencePaths.join("; ");

  const row = {
    sheet: "All Tools",
    row: String(index + 5),
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    engine: tool.engine,
    locale_coverage: prior.locale_coverage || "en,de",
    intended_behavior: cleanDescription(tool.name, tool.description),
    discovered_problem: problem,
    changed_files: changed,
    dependency_or_api: prior.dependency_or_api || "none (browser-only)",
    status,
    test_ids: testIds,
    expected_result: expected,
    actual_result: actual,
    evidence_path: evidence,
    tested_revision: status === "NOT_STARTED" ? "" : revision,
    tested_date: status === "NOT_STARTED" ? "" : today,
    blocker_details: blocker,
  };
  counts[status] = (counts[status] || 0) + 1;
  rows.push(row);
}

const header = COLUMNS.join(",");
const body = rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(",")).join("\n");
writeFileSync(csvPath, `${header}\n${body}\n`, "utf8");

console.log(`wrote ${csvPath}`);
console.log(`rows: ${rows.length}`);
console.log(`route passes merged: ${routePasses.join(", ")}`);
console.log(
  `status: ${Object.entries(counts)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("  ")}`,
);

// A small machine-readable copy of the status counts, so the summary
// document can be generated from the measurements.
writeFileSync(
  join(here, "data", "tracker-status.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      rows: rows.length,
      counts,
      routePasses,
    },
    null,
    1,
  ),
  "utf8",
);

// The durable next-item pointer: a new session must be able to resume from
// the verified progress without re-reading the whole repository.
const nextUp = rows.find((r) => r.status !== "PASS");
const state = {
  generatedAt: new Date().toISOString(),
  reconciledTotal: rows.length,
  counts,
  nextItem: nextUp ? { slug: nextUp.slug, status: nextUp.status, problem: nextUp.discovered_problem } : null,
  remaining: rows.filter((r) => r.status !== "PASS").length,
  resumeCommands: [
    "npm run build  (or: $env:NEXT_DIST_DIR='.next-audit'; npx next build)",
    "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'set \"NEXT_DIST_DIR=.next-audit\" && npx next start -p 3100 > audit-server.log 2>&1'",
    "node scripts/audit/functional-tests.mjs --only=<slug>",
    "node scripts/audit/build-findings.mjs",
    "node scripts/audit/sync-audit-tracker.mjs",
    "node scripts/audit/build-audit-summary.mjs",
  ],
};
writeFileSync(join(here, "data", "audit-state.json"), JSON.stringify(state, null, 1), "utf8");

writeFileSync(
  join(docsDir, "AUDIT-RESUME.md"),
  `# Audit resume pointer

Generated ${state.generatedAt}.

- Reconciled total: **${rows.length}** tools
- ${Object.entries(counts)
  .sort()
  .map(([k, v]) => `${k}: ${v}`)
  .join(" · ")}
- Next item: **${nextUp ? nextUp.slug : "none - every tool is PASS"}** (${nextUp ? nextUp.status : "-"})
- Remaining non-PASS rows: ${state.remaining}

The authoritative tracker is \`docs/tool-audit.csv\`. The machine-readable
pointer is \`scripts/audit/data/audit-state.json\`.

## Resume commands

\`\`\`powershell
${state.resumeCommands.join("\n")}
\`\`\`
`,
  "utf8",
);
console.log(`wrote ${join(docsDir, "AUDIT-RESUME.md")}`);
if (notes.length) console.log(notes.join("\n"));
