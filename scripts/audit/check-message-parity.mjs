/**
 * Check the parity of the English and the German message catalogues.
 *
 * Walks both catalogues in parallel and reports every key that is missing on
 * one side or that carries an empty translation. It also reports keys whose
 * value was left as the English source, because those are almost always
 * untranslated leftovers rather than intentional loan words.
 *
 * Usage: node scripts/audit/check-message-parity.mjs [--quiet]
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const en = JSON.parse(readFileSync(join(root, "src", "messages", "en.json"), "utf8"));
const de = JSON.parse(readFileSync(join(root, "src", "messages", "de.json"), "utf8"));

const missingDe = [];
const missingEn = [];
const emptyDe = [];
const emptyEn = [];
const untranslated = [];
let enTotal = 0;
let deTotal = 0;

function walk(a, b, path) {
  const aIsObject = a && typeof a === "object" && !Array.isArray(a);
  const bIsObject = b && typeof b === "object" && !Array.isArray(b);

  if (aIsObject && bIsObject) {
    for (const key of Object.keys(a)) {
      walk(a[key], b ? b[key] : undefined, path ? `${path}.${key}` : key);
    }
    for (const key of Object.keys(b)) {
      if (!(key in a)) walk(undefined, b[key], path ? `${path}.${key}` : key);
    }
    return;
  }

  if (a === undefined) {
    missingEn.push(path);
    deTotal += 1;
    if (b === "") emptyEn.push(path);
    return;
  }
  if (b === undefined) {
    missingDe.push(path);
    enTotal += 1;
    if (a === "") emptyDe.push(path);
    return;
  }

  enTotal += 1;
  deTotal += 1;
  if (typeof a === "string" && a.trim() === "") emptyEn.push(path);
  if (typeof b === "string" && b.trim() === "") emptyDe.push(path);
  if (typeof a === "string" && typeof b === "string" && a === b && /[A-Za-z]{3}/.test(a)) {
    untranslated.push({ path, value: a });
  }
}

walk(en, de, "");

const quiet = process.argv.includes("--quiet");
const list = process.argv.includes("--list");

console.log(`English keys: ${enTotal}`);
console.log(`German keys:  ${deTotal}`);
console.log(`Missing in German: ${missingDe.length}`);
console.log(`Missing in English: ${missingEn.length}`);
console.log(`Empty in German: ${emptyDe.length}`);
console.log(`Empty in English: ${emptyEn.length}`);
console.log(`Identical EN/DE values (candidates for review): ${untranslated.length}`);

if (!quiet) {
  for (const list of [
    ["missing in German", missingDe],
    ["missing in English", missingEn],
    ["empty in German", emptyDe],
    ["empty in English", emptyEn],
  ]) {
    if (list[1].length) {
      console.log(`\n-- ${list[0]} --`);
      for (const key of list[1].slice(0, 40)) console.log(`  ${key}`);
      if (list[1].length > 40) console.log(`  ... and ${list[1].length - 40} more`);
    }
  }
}

if (list && untranslated.length) {
  console.log("\n-- identical EN/DE values --");
  for (const item of untranslated) console.log(`  ${item.path} = ${JSON.stringify(item.value)}`);
}

if (missingDe.length || missingEn.length || emptyDe.length || emptyEn.length) {
  console.error("\nMessage catalogues are not in parity.");
  process.exit(1);
}
console.log("\nMessage catalogues are in parity.");
