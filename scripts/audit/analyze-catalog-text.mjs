/**
 * Analyse the catalog text for two generation defects:
 *   1. HTML entities left over from an HTML source (e.g. &amp;, &#x27;)
 *   2. descriptions that start with the tool name glued to the real text
 */

import { readFileSync } from "node:fs";

import { isGlued } from "./catalog-deglue.mjs";

const ENTITY = /&(?:amp|lt|gt|quot|apos|nbsp|mdash|ndash|hellip|rsquo|lsquo|ldquo|rdquo|#\d+|#x[0-9a-fA-F]+);/g;

function analyse(label, tools) {
  let entityCount = 0;
  let entityTools = 0;
  let glued = 0;
  let gluedExamples = [];

  for (const t of tools) {
    const fields = [t.name, t.description, t.category, ...(t.keywords || [])];
    let hit = false;
    for (const f of fields) {
      if (typeof f !== "string") continue;
      const m = f.match(ENTITY);
      if (m) {
        entityCount += m.length;
        hit = true;
      }
    }
    if (hit) entityTools += 1;

    // A description counts as glued when the name was really welded onto it:
    // the same rule the repair script uses, so the report and the repair
    // cannot disagree.
    if (typeof t.description === "string" && typeof t.name === "string") {
      if (isGlued(t.description, t.name)) {
        glued += 1;
        if (gluedExamples.length < 5) {
          gluedExamples.push({ slug: t.slug, name: t.name, tail: t.description.slice(0, 90) });
        }
      }
    }
  }

  console.log(`--- ${label} ---`);
  console.log(`tools                : ${tools.length}`);
  console.log(`entity occurrences   : ${entityCount}`);
  console.log(`tools with entities  : ${entityTools}`);
  console.log(`glued descriptions   : ${glued}`);
  console.log("glued examples:");
  for (const e of gluedExamples) console.log(`  ${e.slug}\n    name: ${e.name}\n    tail: ${e.tail}`);
  const kinds = new Map();
  for (const t of tools) {
    for (const f of [t.name, t.description, t.category, ...(t.keywords || [])]) {
      if (typeof f !== "string") continue;
      for (const m of f.match(ENTITY) || []) kinds.set(m, (kinds.get(m) || 0) + 1);
    }
  }
  console.log("entity kinds:");
  for (const [k, v] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${k} -> ${v}`);
  console.log("");
}

// EN catalog
const enSrc = readFileSync("src/data/tools.ts", "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const enStart = enSrc.indexOf(marker) + marker.length;
const enEnd = enSrc.indexOf("\n];", enStart);
const enTools = JSON.parse(enSrc.slice(enStart, enEnd + 2));
analyse("EN catalog (src/data/tools.ts)", enTools);

// DE catalog
const deTools = Object.entries(JSON.parse(readFileSync("src/data/tools_de.json", "utf8"))).map(
  ([slug, v]) => ({ slug, ...v }),
);
analyse("DE catalog (src/data/tools_de.json)", deTools);
