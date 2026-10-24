/**
 * Unescape HTML entities in the captured UI metadata.
 *
 * The browser capture recorded the labels exactly as they were rendered, so
 * labels that came from the catalog still carry the "&amp;" leftovers.
 *
 * Usage: node scripts/audit/fix-howto-source.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "data", "howto-source.json");

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  middot: "·", bull: "•", copy: "©", reg: "®", trade: "™",
  deg: "°", euro: "€", pound: "£", yen: "¥", times: "×",
  divide: "÷", minus: "−", laquo: "«", raquo: "»",
};

const RE = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;

function unescape(input) {
  if (typeof input !== "string") return input;
  return input.replace(RE, (match, body) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const lower = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, lower) ? ENTITIES[lower] : match;
  });
}

let changed = 0;
function walk(node) {
  if (typeof node === "string") {
    const next = unescape(node);
    if (next !== node) changed += 1;
    return next;
  }
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    return out;
  }
  return node;
}

const raw = JSON.parse(readFileSync(target, "utf8"));
const fixed = walk(raw);
writeFileSync(target, JSON.stringify(fixed, null, 1), "utf8");
console.log(`unescaped strings: ${changed}`);
console.log(`tools: ${Object.keys(fixed).length}`);
