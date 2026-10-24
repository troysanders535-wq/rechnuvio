/**
 * Apply targeted corrections to the German translation batches.
 *
 * These are UI labels that legitimately need a German wording but were left
 * identical to the English source by the batch translators.
 *
 * Usage: node scripts/audit/patch-ui-i18n.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const deDir = join(here, "data", "ui-strings-de");

const PATCHES = {
  "ui.engines.MathCalculatorsEngine.computerScience": "Informatik",
  "ui.engines.MathCalculatorsEngine.calculusIII": "Analysis III",
  "ui.engines.MathCalculatorsEngine.physics": "Physik",
  "ui.engines.MathCalculatorsEngine.technicalWriting": "Wissenschaftliches Schreiben",
  "ui.calculators.GradeTools.mathematics": "Mathematik",
  "ui.calculators.GradeTools.physics": "Physik",
  "ui.calculators.GradeTools.history": "Geschichte",
  "ui.calculators.GradeTools.literature": "Literatur",
  "ui.engines.QrBarcodeEngine.code128Universal": "Code 128 (Universell)",
};

let applied = 0;
for (const f of readdirSync(deDir)) {
  if (!f.endsWith(".json")) continue;
  const p = join(deDir, f);
  const data = JSON.parse(readFileSync(p, "utf8"));
  let changed = false;
  for (const [ns, entries] of Object.entries(data)) {
    for (const [key, value] of Object.entries(entries)) {
      const full = `${ns}.${key}`;
      if (PATCHES[full] !== undefined && value.text !== PATCHES[full]) {
        value.text = PATCHES[full];
        applied += 1;
        changed = true;
      }
    }
  }
  if (changed) {
    writeFileSync(p, JSON.stringify(data, null, 1) + "\n", "utf8");
    console.log(`patched: ${f}`);
  }
}
console.log(`applied ${applied}/${Object.keys(PATCHES).length} corrections`);
