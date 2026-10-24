/**
 * Merge two UI-string extractions into one namespace map.
 *
 * The namespace map is the work list for the i18n codemod: every entry is a
 * user-visible English string with the key it will carry in the message
 * files. A key must map to exactly one text and one text must map to exactly
 * one key inside a namespace, so the merge keeps both invariants.
 *
 * Usage: node scripts/audit/merge-ui-strings.mjs <base.json> <add.json> <out.json>
 */

import { readFileSync, writeFileSync } from "node:fs";

const [, , basePath, addPath, outPath] = process.argv;
if (!basePath || !addPath || !outPath) {
  console.error("usage: node scripts/audit/merge-ui-strings.mjs <base.json> <add.json> <out.json>");
  process.exit(1);
}

const base = JSON.parse(readFileSync(basePath, "utf8"));
const add = JSON.parse(readFileSync(addPath, "utf8"));

const out = {};
let added = 0;
let kept = 0;

for (const ns of Object.keys(base)) {
  const merged = { ...base[ns] };
  const textToKey = new Map(Object.entries(merged).map(([k, v]) => [v.text, k]));

  for (const [key, info] of Object.entries(add[ns] || {})) {
    if (textToKey.has(info.text)) {
      kept += 1;
      continue;
    }
    let newKey = key;
    let n = 2;
    while (merged[newKey] && merged[newKey].text !== info.text) {
      newKey = `${key}${n}`;
      n += 1;
    }
    merged[newKey] = info;
    textToKey.set(info.text, newKey);
    added += 1;
  }
  out[ns] = merged;
}

// namespaces that only exist in the addition
for (const ns of Object.keys(add)) {
  if (out[ns]) continue;
  out[ns] = add[ns];
  added += Object.keys(add[ns]).length;
}

writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n", "utf8");

let unique = 0;
for (const ns of Object.keys(out)) unique += Object.keys(out[ns]).length;
console.log(`written: ${outPath}`);
console.log(`namespaces: ${Object.keys(out).length}`);
console.log(`unique strings: ${unique}  (added ${added}, already present ${kept})`);
