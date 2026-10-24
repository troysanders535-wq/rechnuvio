/**
 * Refactor scripts/audit/functional-tests.mjs to use the shared helper module
 * and to load the per-family spec modules.
 *
 * One-off migration script.
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/audit/functional-tests.mjs";
const src = readFileSync(path, "utf8");

const IMPORT = `import {
  specs,
  spec,
  sleep,
  mainText,
  workspaceText,
  inputValues,
  fillPrimary,
  fillInput,
  fillArea,
  fillNumber,
  selectOption,
  clickButton,
  clickButtonContaining,
  clickButtonIfPresent,
  assertIncludes,
  assertMatches,
  assertNotIncludes,
  assertEqual,
  statValue,
  waitForStat,
  labelledOutput,
  valueById,
} from "./lib/test-helpers.mjs";

import { FAMILIES } from "./tests/index.mjs";
`;

let out = src;

// 1. replace the inline helper block with the shared import
const helperStart = out.indexOf("/* ------------------------------------------------------------- helpers --- */");
const helperEnd = out.indexOf("/* --------------------------------------------------------------- specs --- */");
if (helperStart < 0 || helperEnd < 0) {
  throw new Error("helper block not found");
}
out = out.slice(0, helperStart) + IMPORT + "\n" + out.slice(helperEnd);

// 2. drop the local registry
out = out.replace(
  "const specs = [];\nconst spec = (slug, name, fn) => specs.push({ slug, name, fn });\n",
  "",
);

// 3. register the family modules before the runner
const runnerMarker = "/* -------------------------------------------------------------- runner --- */";
if (!out.includes(runnerMarker)) throw new Error("runner marker not found");
out = out.replace(
  runnerMarker,
  "/* ------------------------------------------------------- family modules -- */\nfor (const family of FAMILIES) family.register();\n\n" + runnerMarker,
);

writeFileSync(path, out, "utf8");
console.log("rewritten", path);
