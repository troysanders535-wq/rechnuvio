/**
 * Probe every tool page for the signature of a *shared* workspace.
 *
 * The audit found that some engines dispatch with slug.includes(...) and fall
 * through to a generic panel, so a whole family of tools can render the same
 * workspace. This probe looks for the distinctive markers of each shared
 * workspace in the rendered page and reports which tools carry them.
 *
 * Usage: node scripts/audit/probe-shared-workspaces.mjs [--port=3200]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);
const PORT = args.port || "3200";
const BASE = `http://localhost:${PORT}`;

/** Markers that identify one shared workspace by its own control text. */
const SIGNATURES = [
  { id: "sql-formatter", markers: ["Paste SQL query here", "Format SQL"] },
  { id: "api-tester", markers: ["Send Request", "Response Payload"] },
  { id: "json-workspace", markers: ["Paste JSON", "JSON Validator"] },
  { id: "yaml-workspace", markers: ["Paste YAML"] },
  { id: "regex-workspace", markers: ["Test Pattern", "Flags"] },
  { id: "uuid-workspace", markers: ["Generate New UUIDs"] },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const rows = [];
for (const tool of TOOLS_CATALOG) {
  let html = "";
  try {
    const res = await page.goto(`${BASE}/tools/${tool.slug}?locale=en`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    if (res && res.status() !== 200) continue;
    await page.waitForTimeout(400);
    // Only the workspace region: the surrounding page repeats catalog text.
    html = await page.evaluate(() => {
      const main = document.querySelector("main");
      return main ? main.innerText : document.body.innerText;
    });
  } catch {
    continue;
  }
  const hits = SIGNATURES.filter((s) => s.markers.every((m) => html.includes(m))).map((s) => s.id);
  rows.push({ slug: tool.slug, engine: tool.engine, signatures: hits });
  if (hits.length) {
    console.log(`${tool.slug.padEnd(38)} ${tool.engine.padEnd(20)} -> ${hits.join(", ")}`);
  }
}

await context.close();
await browser.close();

mkdirSync(join(root, "docs", "audit-evidence"), { recursive: true });
writeFileSync(
  join(root, "docs", "audit-evidence", "shared-workspaces.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1),
  "utf8",
);

const bySignature = {};
for (const r of rows) {
  for (const s of r.signatures) (bySignature[s] = bySignature[s] || []).push(r.slug);
}
console.log("----");
for (const [sig, slugs] of Object.entries(bySignature)) {
  console.log(`${sig}: ${slugs.length} tools`);
}
console.log(`tools with no shared-workspace signature: ${rows.filter((r) => !r.signatures.length).length}`);
