/**
 * Record the browser matrix that the audit actually ran on.
 *
 * The audit brief asks for "Chromium, Firefox, and WebKit where supported;
 * record actual versions and unavailable environments". This script probes
 * every engine Playwright knows about, records the version it can launch, and
 * writes the result into docs/audit-evidence/browser-versions.json.
 *
 * Usage: node scripts/audit/browser-versions.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(root, "docs", "audit-evidence");

const ENGINES = [
  { name: "chromium", label: "Chromium", launcher: chromium, channel: undefined },
  { name: "chrome", label: "Google Chrome (channel)", launcher: chromium, channel: "chrome" },
  { name: "edge", label: "Microsoft Edge (channel)", launcher: chromium, channel: "msedge" },
  { name: "firefox", label: "Firefox", launcher: firefox, channel: undefined },
  { name: "webkit", label: "WebKit", launcher: webkit, channel: undefined },
];

const results = [];

for (const engine of ENGINES) {
  const record = { engine: engine.label, available: false, version: "", note: "" };
  let browser;
  try {
    browser = await engine.launcher.launch(
      engine.channel ? { channel: engine.channel, headless: true } : { headless: true },
    );
    record.available = true;
    record.version = browser.version();
    await browser.close();
  } catch (err) {
    record.note = String(err.message || err).split("\n")[0].slice(0, 220);
  }
  results.push(record);
  console.log(
    `${record.available ? "OK  " : "MISS"} ${record.engine.padEnd(28)} ${record.version || record.note}`,
  );
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "browser-versions.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      engines: results,
      unavailable: results.filter((r) => !r.available).map((r) => r.engine),
    },
    null,
    1,
  ),
  "utf8",
);
console.log(`written: ${join(outDir, "browser-versions.json")}`);
