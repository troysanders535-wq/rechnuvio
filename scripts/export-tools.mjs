/**
 * Export the tool catalogue as JSON for the spreadsheet builder.
 *
 * Source of truth : src/data/tools.ts (TOOLS_CATALOG) + src/data/tools_de.json
 * Output           : scripts/.cache/tools-export.json
 *
 * Lives outside .next/ on purpose - `next build` wipes the .next output
 * directory, and the spreadsheet builder must not depend on build artifacts.
 *
 * Run: node scripts/export-tools.mjs
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOLS_CATALOG } from "../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, ".cache");
const outFile = join(outDir, "tools-export.json");

const toolsDe = JSON.parse(
  readFileSync(join(here, "..", "src", "data", "tools_de.json"), "utf8"),
);

const exportRows = TOOLS_CATALOG.map((tool) => ({
  slug: tool.slug,
  name: tool.name,
  category: tool.category,
  description: tool.description,
  engine: tool.engine,
  keywords: tool.keywords,
  features: tool.features,
  de: toolsDe[tool.slug] ?? null,
}));

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(exportRows), "utf8");

const missingDe = exportRows.filter((t) => !t.de).length;
console.log(`exported ${exportRows.length} tools -> ${outFile}`);
console.log(`missing DE entries: ${missingDe}`);
