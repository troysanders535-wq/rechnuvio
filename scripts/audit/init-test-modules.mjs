/**
 * Create the per-family functional spec module stubs and the index.
 *
 * Every family owns exactly one file, so several workers can extend the
 * suite at the same time without touching the same file.
 *
 * Usage: node scripts/audit/init-test-modules.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dir = join(here, "tests");

const slugs = JSON.parse(
  readFileSync(join(here, "data", "engine-slugs.json"), "utf8"),
);

mkdirSync(dir, { recursive: true });

const camel = (name) => name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());

const names = Object.keys(slugs);

for (const name of names) {
  const file = join(dir, `${name}.mjs`);
  if (existsSync(file)) continue;
  const body = [
    "/**",
    ` * Functional specs for the ${slugs[name].length} tools of the`,
    ` * ${name.replace(/-/g, " ")} engine.`,
    " *",
    " * Every spec drives the real UI in Chrome and asserts on a value that",
    " * was established independently of this site's own code.",
    " */",
    "",
    'import { spec } from "../lib/test-helpers.mjs";',
    "",
    "export function register() {",
    "  // the specs of this family are added here",
    "}",
    "",
  ].join("\n");
  writeFileSync(file, body, "utf8");
}

const imports = names
  .map((n) => `import * as ${camel(n)} from "./${n}.mjs";`)
  .join("\n");
const list = names.map((n) => `  ${camel(n)},`).join("\n");

writeFileSync(
  join(dir, "index.mjs"),
  [
    "/**",
    " * The per-family functional spec modules.",
    " *",
    " * Every family owns exactly one file, so several workers can extend the",
    " * suite at the same time without touching the same file.",
    " */",
    "",
    imports,
    "",
    "export const FAMILIES = [",
    list,
    "];",
    "",
  ].join("\n"),
);

console.log(`modules: ${names.length}`);
