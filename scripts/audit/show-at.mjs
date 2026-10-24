/**
 * Show the source around a character offset in a file.
 *
 * Usage: node scripts/audit/show-at.mjs <relative-path> <offset> [before] [after]
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const [, , rel, offsetRaw, beforeRaw, afterRaw] = process.argv;
const offset = Number(offsetRaw);
const before = Number(beforeRaw || 400);
const after = Number(afterRaw || 400);

const src = readFileSync(join(root, rel), "utf8");
const from = Math.max(0, offset - before);
const to = Math.min(src.length, offset + after);
console.log(src.slice(from, to));
