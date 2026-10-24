/**
 * Apply i18n patches to the message catalogues.
 *
 * A patch file lives in scripts/audit/i18n-patches/<namespace>.json and looks
 * like this:
 *
 *   {
 *     "namespace": "ui.engines.HealthFitnessEngine",
 *     "en": { "key": "English text" },
 *     "de": { "key": "Deutscher Text" }
 *   }
 *
 * The script merges the keys into src/messages/en.json and src/messages/de.json
 * key by key, so an existing translation is never dropped. It is idempotent:
 * running it twice leaves the catalogues unchanged.
 *
 * Usage: node scripts/audit/add-i18n-patches.mjs [patchName ...]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const patchDir = join(here, "i18n-patches");

const enPath = join(root, "src", "messages", "en.json");
const dePath = join(root, "src", "messages", "de.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const de = JSON.parse(readFileSync(dePath, "utf8"));

/** Merge two objects, so a nested group is extended instead of replaced. */
function deepMerge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const isObject =
      value && typeof value === "object" && !Array.isArray(value);
    out[key] =
      isObject && typeof out[key] === "object" && out[key] !== null
        ? deepMerge(out[key], value)
        : value;
  }
  return out;
}

/** Write a dotted path into a nested object, creating the levels on the way. */
function setPath(target, dottedPath, value) {
  const parts = dottedPath.split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (typeof node[part] !== "object" || node[part] === null) node[part] = {};
    node = node[part];
  }
  const last = parts[parts.length - 1];
  node[last] = deepMerge(node[last] || {}, value);
}

/** Read a dotted path from a nested object. */
function getPath(target, dottedPath) {
  let node = target;
  for (const part of dottedPath.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return node;
}

const requested = process.argv.slice(2);
const available = readdirSync(patchDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));
const patches = requested.length ? requested : available;

let problems = 0;

for (const name of patches) {
  const file = join(patchDir, `${name}.json`);
  let patch;
  try {
    patch = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`! ${name}: cannot read the patch file (${err.message})`);
    problems += 1;
    continue;
  }

  const namespace = patch.namespace || `ui.engines.${name}`;
  const enKeys = patch.en || {};
  const deKeys = patch.de || {};

  const enMissingDe = Object.keys(enKeys).filter((key) => !(key in deKeys));
  const deMissingEn = Object.keys(deKeys).filter((key) => !(key in enKeys));
  if (enMissingDe.length || deMissingEn.length) {
    console.error(
      `! ${name}: patch is incomplete — only in en: ${enMissingDe.join(", ") || "none"}; only in de: ${deMissingEn.join(", ") || "none"}`,
    );
    problems += 1;
    continue;
  }

  setPath(en, namespace, deepMerge(getPath(en, namespace) || {}, enKeys));
  setPath(de, namespace, deepMerge(getPath(de, namespace) || {}, deKeys));

  console.log(
    `${name}: ${Object.keys(enKeys).length} keys -> ${namespace} (en ${Object.keys(getPath(en, namespace) || {}).length} / de ${Object.keys(getPath(de, namespace) || {}).length})`,
  );
}

if (problems) {
  console.error(`\n${problems} patch file(s) rejected.`);
  process.exit(1);
}

writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n", "utf8");
console.log("\nMessage catalogues updated.");
