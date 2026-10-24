/** Preview the catalog text repair: shows what changes and what is left over. */
import { readFileSync } from "node:fs";

const ENTITY = /&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/g;

function unescapeEntities(input) {
  if (typeof input !== "string") return input;
  return input.replace(ENTITY, (m) => {
    if (m === "&amp;") return "&";
    if (m === "&lt;") return "<";
    if (m === "&gt;") return ">";
    if (m === "&quot;") return '"';
    if (m === "&apos;") return "'";
    if (m === "&nbsp;") return " ";
    if (m.startsWith("&#x")) return String.fromCodePoint(Number.parseInt(m.slice(3, -1), 16));
    if (m.startsWith("&#")) return String.fromCodePoint(Number.parseInt(m.slice(2, -1), 10));
    return m;
  });
}

function deglue(description, name) {
  if (typeof description !== "string" || typeof name !== "string" || !name) return description;
  if (!description.startsWith(name)) return description;
  let rest = description.slice(name.length);
  if (rest === "") return description;
  const lead = rest[0];
  const nameEndsLowerish = !/[A-Z]$/.test(name);
  const startsWithWhitespace = /\s/.test(lead);
  const startsWithPunctuation =
    (lead === "," || lead === ";" || lead === "." || lead === ":") && /\s/.test(rest[1] ?? " ");
  const camelSeam = nameEndsLowerish && /[A-Z]/.test(lead);
  if (!startsWithWhitespace && !startsWithPunctuation && !camelSeam) return description;
  rest = rest.replace(/^[\s,;.:]+/, "");
  if (rest === "") return description;
  return rest.replace(/^([a-z])/, (c) => c.toUpperCase());
}

const enSrc = readFileSync("src/data/tools.ts", "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const s = enSrc.indexOf(marker) + marker.length;
const e = enSrc.indexOf("\n];", s);
const enTools = JSON.parse(enSrc.slice(s, e + 2));

const residual = [];
const samples = [];
for (const t of enTools) {
  const before = t.description;
  const after = deglue(unescapeEntities(t.description), unescapeEntities(t.name));
  if (after !== before) {
    if (samples.length < 8) samples.push({ slug: t.slug, before: before.slice(0, 110), after: after.slice(0, 110) });
  }
  // still glued after the repair?
  if (after.startsWith(unescapeEntities(t.name)) && after.length > t.name.length) {
    residual.push({ slug: t.slug, name: t.name, after: after.slice(0, 120) });
  }
}

console.log("=== sample repairs ===");
for (const x of samples) console.log(`${x.slug}\n  BEFORE: ${x.before}\n  AFTER : ${x.after}\n`);
console.log(`=== residual (still glued): ${residual.length} ===`);
for (const x of residual) console.log(`${x.slug}\n  name : ${x.name}\n  desc : ${x.after}`);

// entity check after repair
let ent = 0;
for (const t of enTools) {
  for (const f of [t.name, t.description, t.category, ...(t.keywords || [])]) {
    if (typeof f === "string" && ENTITY.test(f)) ent += 1;
  }
}
console.log(`\nfields still containing entities after repair: ${ent}`);
