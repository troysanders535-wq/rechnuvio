/**
 * Fold the `locale === "de" ? tUi(a) : tUi(b)` pairs into one key.
 *
 * The calendar engine kept a German key and an English key for the same
 * label. This rewrites the call site to the single key that both catalogues
 * now carry, so the English catalogue no longer needs German text.
 *
 * Usage:
 *   node scripts/audit/collapse-locale-ternaries.mjs src/components/engines/Calendar2026Engine.tsx
 */

import { readFileSync, writeFileSync } from "node:fs";
import { relative, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/audit/collapse-locale-ternaries.mjs <file>");
  process.exit(1);
}

const path = join(root, target);
const source = readFileSync(path, "utf8");

const PATTERN = /locale === "de" \? tUi\("([A-Za-z0-9_]+)"\) : tUi\("([A-Za-z0-9_]+)"\)/g;

const replacements = [];
const next = source.replace(PATTERN, (match, germanKey, englishKey) => {
  replacements.push(`${germanKey} -> ${englishKey}`);
  return `tUi("${englishKey}")`;
});

console.log(`file: ${relative(root, path)}`);
console.log(`replacements: ${replacements.length}`);
for (const r of replacements) console.log(`  ${r}`);

const left = next.match(/locale === "de"/g) || [];
console.log(`remaining "locale === \\"de\\"" occurrences: ${left.length}`);

writeFileSync(path, next, "utf8");
console.log("written.");
