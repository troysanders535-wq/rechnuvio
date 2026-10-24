/**
 * The final route-audit matrix.
 *
 * The audit brief asks for route-level checks across every tool, in both
 * locales, on both viewports, in both themes, and in more than one browser
 * engine. Running the matrix by hand is easy to get wrong - one missing
 * combination is invisible in the output - so the matrix is written down here
 * and executed in a fixed order.
 *
 * Every run writes its own evidence file:
 *   docs/audit-evidence/routes-<browser>-<locale>-<viewport>-<theme>.json
 *
 * The runs are sequential on purpose: the machine has 24 logical CPUs and
 * about 7 GB of free memory, and two full matrix runs at once starve the
 * browsers and produce false failures.
 *
 * Usage:
 *   node scripts/audit/run-route-matrix.mjs
 *   node scripts/audit/run-route-matrix.mjs --port=3100 --workers=5
 *   node scripts/audit/run-route-matrix.mjs --only=chrome
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const PORT = args.port || "3100";
const WORKERS = args.workers || "5";

/**
 * The matrix.
 *
 * Chrome carries the full cross product (locale x viewport x theme) because
 * it is the browser the functional suite drives. Edge, Firefox and WebKit
 * carry the combinations that prove the site is not Chrome-only: the German
 * desktop pass, a German mobile pass and a dark theme pass.
 */
const MATRIX = [
  { browser: "chrome", locale: "en", viewport: "desktop", theme: "light" },
  { browser: "chrome", locale: "en", viewport: "desktop", theme: "dark" },
  { browser: "chrome", locale: "en", viewport: "mobile", theme: "light" },
  { browser: "chrome", locale: "en", viewport: "mobile", theme: "dark" },
  { browser: "chrome", locale: "de", viewport: "desktop", theme: "light" },
  { browser: "chrome", locale: "de", viewport: "desktop", theme: "dark" },
  { browser: "chrome", locale: "de", viewport: "mobile", theme: "light" },
  { browser: "chrome", locale: "de", viewport: "mobile", theme: "dark" },
  { browser: "edge", locale: "en", viewport: "desktop", theme: "light" },
  { browser: "edge", locale: "de", viewport: "desktop", theme: "light" },
  { browser: "edge", locale: "de", viewport: "mobile", theme: "dark" },
  { browser: "firefox", locale: "en", viewport: "desktop", theme: "light" },
  { browser: "firefox", locale: "de", viewport: "desktop", theme: "light" },
  { browser: "firefox", locale: "de", viewport: "mobile", theme: "dark" },
  { browser: "webkit", locale: "en", viewport: "desktop", theme: "light" },
  { browser: "webkit", locale: "de", viewport: "desktop", theme: "light" },
  { browser: "webkit", locale: "en", viewport: "mobile", theme: "dark" },
];

const runs = args.only
  ? MATRIX.filter((r) => r.browser === args.only)
  : MATRIX;

function runOne(combo) {
  return new Promise((resolve) => {
    const label = `${combo.browser}-${combo.locale}-${combo.viewport}-${combo.theme}`;
    const child = spawn(
      process.execPath,
      [
        path.join(here, "audit-routes.mjs"),
        `--port=${PORT}`,
        `--browser=${combo.browser}`,
        `--locale=${combo.locale}`,
        `--viewport=${combo.viewport}`,
        `--theme=${combo.theme}`,
        `--workers=${WORKERS}`,
        `--label=${label}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("close", (code) => {
      const summary = out
        .split("\n")
        .filter((l) => /summary|clean|routes|problem|need attention|error/i.test(l))
        .slice(-12)
        .join("\n");
      resolve({ label, code, summary });
    });
  });
}

const started = Date.now();
const results = [];

for (const combo of runs) {
  const label = `${combo.browser}-${combo.locale}-${combo.viewport}-${combo.theme}`;
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = await runOne(combo);
  results.push(result);
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(result.summary);
  console.log(`--- ${label}: exit ${result.code} (${minutes} min elapsed)`);
}

console.log("\n---- matrix summary ----");
let failed = 0;
for (const r of results) {
  const ok = r.code === 0;
  if (!ok) failed += 1;
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${r.label}`);
}
console.log(`\n${results.length - failed}/${results.length} matrix runs clean`);
process.exitCode = failed === 0 ? 0 : 1;
