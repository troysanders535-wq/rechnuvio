/**
 * Validate the i18n patch files.
 *
 * A patch is rejected by the merge script when its en and de key sets differ,
 * so the check runs before the merge: every patch must parse, carry the same
 * keys in both locales, and hold a non-empty German text for every key.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { identicalExemption } from "./i18n-identical-allowlist.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const patchDir = join(here, "i18n-patches");

/**
 * Flatten a nested patch into dotted paths.
 *
 * A patch may extend a group that already exists ("usernames" holds the
 * titles of the platforms), so the leaves are the unit that is checked.
 */
function flatten(value, prefix = "") {
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      Object.assign(out, flatten(entry, path));
    } else {
      out[path] = entry;
    }
  }
  return out;
}

let problems = 0;
let keys = 0;
let exempt = 0;

for (const name of readdirSync(patchDir).filter((f) => f.endsWith(".json")).sort()) {
  let patch;
  try {
    patch = JSON.parse(readFileSync(join(patchDir, name), "utf8"));
  } catch (err) {
    console.error(`! ${name}: invalid JSON (${err.message})`);
    problems += 1;
    continue;
  }
  const en = flatten(patch.en || {});
  const de = flatten(patch.de || {});
  const enKeys = Object.keys(en);
  const deKeys = Object.keys(de);
  const onlyEn = enKeys.filter((k) => !(k in de));
  const onlyDe = deKeys.filter((k) => !(k in en));
  if (onlyEn.length || onlyDe.length) {
    console.error(`! ${name}: key sets differ — only en: ${onlyEn.join(", ")}; only de: ${onlyDe.join(", ")}`);
    problems += 1;
  }
  for (const key of enKeys) {
    if (typeof en[key] !== "string" || !en[key].trim()) {
      console.error(`! ${name}: en.${key} is empty`);
      problems += 1;
    }
    if (typeof de[key] !== "string" || !de[key].trim()) {
      console.error(`! ${name}: de.${key} is empty`);
      problems += 1;
    }
    if (typeof de[key] === "string" && de[key] === en[key]) {
      // A unit symbol ("kg", "lb") or a standard abbreviation ("GCD") reads
      // the same in German. Only prose - a text with a real word in it - that
      // stayed English is a defect.
      if (!/[a-z]{3,}/.test(en[key])) continue;
      const exemption = identicalExemption(patch.namespace, key, en[key]);
      if (exemption) {
        exempt += 1;
        continue;
      }
      console.error(`! ${name}: de.${key} is identical to the English text`);
      problems += 1;
    }
  }
  if (!patch.namespace) {
    console.error(`! ${name}: no namespace`);
    problems += 1;
  }
  keys += enKeys.length;
  console.log(`${name}: ${enKeys.length} keys -> ${patch.namespace}`);
}

console.log(`\npatches: ${readdirSync(patchDir).filter((f) => f.endsWith(".json")).length}, keys: ${keys}, exempt: ${exempt}, problems: ${problems}`);
if (problems) process.exit(1);
