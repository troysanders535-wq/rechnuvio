/**
 * Print one message namespace side by side in both locales.
 *
 * The parity checker reports the counts; this prints the actual pairs, so a
 * reviewer can see which keys carry the same text in English and German and
 * which key is missing on one side.
 *
 * Usage:
 *   node scripts/audit/inspect-namespace.mjs ui.engines.MathCalculatorsEngine
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const namespace = process.argv[2];
if (!namespace) {
  console.error("usage: node scripts/audit/inspect-namespace.mjs <namespace.path>");
  process.exit(1);
}

const en = JSON.parse(readFileSync(join(root, "src", "messages", "en.json"), "utf8"));
const de = JSON.parse(readFileSync(join(root, "src", "messages", "de.json"), "utf8"));

const pick = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const a = pick(en, namespace) || {};
const b = pick(de, namespace) || {};
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

let same = 0;
for (const key of keys) {
  const av = a[key] === undefined ? "<missing>" : a[key];
  const bv = b[key] === undefined ? "<missing>" : b[key];
  if (av === bv) {
    same += 1;
    console.log(`SAME  ${key} = ${JSON.stringify(av)}`);
  } else {
    console.log(`DIFF  ${key}\n        EN=${JSON.stringify(av)}\n        DE=${JSON.stringify(bv)}`);
  }
}
console.log(`\n${namespace}: ${keys.length} keys, ${same} identical`);
