/**
 * Verify the German translation batches against the extracted string inventory.
 *
 * Checks:
 *  - every namespace/key in ui-strings.json has a German translation
 *  - every German translation has a matching source string (no orphans)
 *  - no empty values, no values that are still identical to English
 *    (identical is allowed only for a known allow-list of technical tokens)
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const source = JSON.parse(
  readFileSync(join(here, "data", "ui-strings.json"), "utf8"),
);

const deDir = join(here, "data", "ui-strings-de");
const deAll = {};
for (const f of readdirSync(deDir)) {
  if (!f.endsWith(".json")) continue;
  const parsed = JSON.parse(readFileSync(join(deDir, f), "utf8"));
  for (const [ns, entries] of Object.entries(parsed)) {
    if (deAll[ns]) {
      console.log(`DUPLICATE NAMESPACE across batches: ${ns}`);
    }
    deAll[ns] = entries;
  }
}

let missing = 0;
let orphan = 0;
let empty = 0;
let sameAsEnglish = 0;
let total = 0;
const identical = [];

for (const [ns, entries] of Object.entries(source)) {
  for (const [key, info] of Object.entries(entries)) {
    total += 1;
    const de = deAll[ns]?.[key]?.text;
    if (de === undefined) {
      missing += 1;
      if (missing <= 25) console.log(`MISSING  ${ns}.${key}  = ${JSON.stringify(info.text)}`);
      continue;
    }
    if (typeof de !== "string" || de.trim() === "") {
      empty += 1;
      console.log(`EMPTY    ${ns}.${key}`);
      continue;
    }
    if (de === info.text) {
      sameAsEnglish += 1;
      identical.push(`${ns}.${key} = ${JSON.stringify(de)}`);
    }
  }
}

for (const [ns, entries] of Object.entries(deAll)) {
  if (!source[ns]) {
    console.log(`ORPHAN NAMESPACE ${ns}`);
    orphan += 1;
    continue;
  }
  for (const key of Object.keys(entries)) {
    if (!source[ns][key]) {
      console.log(`ORPHAN KEY ${ns}.${key}`);
      orphan += 1;
    }
  }
}

console.log("");
console.log(`source strings : ${total}`);
console.log(`missing        : ${missing}`);
console.log(`empty          : ${empty}`);
console.log(`orphans        : ${orphan}`);
console.log(`identical      : ${sameAsEnglish}`);
console.log(`batch files    : ${readdirSync(deDir).filter((f) => f.endsWith(".json")).length}`);
console.log("");
console.log("--- strings identical to English (review each) ---");
for (const i of identical) console.log("  " + i);
