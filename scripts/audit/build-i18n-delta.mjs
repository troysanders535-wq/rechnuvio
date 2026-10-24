/**
 * Compute the translation delta: the namespaces and keys that the German
 * batches do not cover yet.
 *
 * Output: scripts/audit/data/batches/batch-delta.json, in the same shape as
 * the other batch files, ready to be translated.
 *
 * Usage: node scripts/audit/build-i18n-delta.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const source = JSON.parse(readFileSync(join(here, "data", "ui-strings.json"), "utf8"));

const deDir = join(here, "data", "ui-strings-de");
const covered = new Set();
if (existsSync(deDir)) {
  for (const f of readdirSync(deDir)) {
    if (!f.endsWith(".json")) continue;
    const parsed = JSON.parse(readFileSync(join(deDir, f), "utf8"));
    for (const [ns, entries] of Object.entries(parsed)) {
      for (const key of Object.keys(entries)) covered.add(`${ns}.${key}`);
    }
  }
}

const delta = {};
let missing = 0;
let total = 0;
for (const [ns, entries] of Object.entries(source)) {
  for (const [key, info] of Object.entries(entries)) {
    total += 1;
    if (covered.has(`${ns}.${key}`)) continue;
    (delta[ns] ||= {})[key] = { text: info.text, file: info.file };
    missing += 1;
  }
}

const outPath = join(here, "data", "batches", "batch-delta.json");
writeFileSync(outPath, JSON.stringify(delta, null, 1), "utf8");

console.log(`total strings: ${total}`);
console.log(`already translated: ${total - missing}`);
console.log(`missing: ${missing}`);
console.log(`namespaces in the delta: ${Object.keys(delta).length}`);
for (const [ns, entries] of Object.entries(delta)) {
  console.log(`  ${String(Object.keys(entries).length).padStart(4)}  ${ns}`);
}
console.log(`written: ${outPath}`);
