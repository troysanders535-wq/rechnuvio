/**
 * Report the i18n patches that fight over the same key.
 *
 * The merge script applies the patch files in the order the file system
 * lists them, so two patches that set the same key to different values
 * produce a result that depends on that order. This script finds every such
 * pair before the merge.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const patchDir = join(here, "i18n-patches");

const files = readdirSync(patchDir).filter((f) => f.endsWith(".json")).sort();

/** namespace -> key -> [{ file, value }] */
const index = new Map();

for (const name of files) {
  const patch = JSON.parse(readFileSync(join(patchDir, name), "utf8"));
  const ns = patch.namespace || `ui.engines.${name.replace(/\.json$/, "")}`;
  for (const [locale, side] of [
    ["en", patch.en || {}],
    ["de", patch.de || {}],
  ]) {
    for (const [key, value] of Object.entries(side)) {
      if (!index.has(ns)) index.set(ns, new Map());
      const byKey = index.get(ns);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ file: name, locale, value });
    }
  }
}

let conflicts = 0;
for (const [ns, byKey] of index) {
  for (const [key, entries] of byKey) {
    // Only the same locale can conflict: the English and the German text of a
    // key are supposed to differ.
    for (const locale of ["en", "de"]) {
      const same = entries.filter((e) => e.locale === locale);
      const values = new Set(same.map((e) => e.value));
      if (values.size <= 1) continue;
      conflicts += 1;
      console.log(`! ${ns}.${key} (${locale})`);
      for (const e of same) console.log(`    ${e.file} = ${JSON.stringify(e.value)}`);
    }
  }
}

/** The same namespace spread over several patch files is also worth knowing. */
const namespaces = new Map();
for (const name of files) {
  const patch = JSON.parse(readFileSync(join(patchDir, name), "utf8"));
  const ns = patch.namespace || `ui.engines.${name.replace(/\.json$/, "")}`;
  if (!namespaces.has(ns)) namespaces.set(ns, []);
  namespaces.get(ns).push(name);
}
for (const [ns, list] of namespaces) {
  if (list.length > 1) console.log(`note: ${ns} is covered by ${list.join(", ")}`);
}

console.log(`\nconflicts: ${conflicts}`);
if (conflicts) process.exit(1);
