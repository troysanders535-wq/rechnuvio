/**
 * Generate scripts/audit/data/findings.json - the structural findings of the
 * audit, per tool.
 *
 * Each finding records a defect that was actually observed in a real browser
 * and the repair that was made. The status is derived from the evidence:
 *
 *   PASS         - a real-browser functional test exists and passed
 *   FAIL         - a real-browser functional test exists and failed
 *   IN_PROGRESS  - a defect was found and repaired, but no functional test yet
 *   (none)       - no defect, no functional test: route-audited only
 *
 * The statuses are exactly the ones the audit brief allows. A repaired
 * defect without a passing functional test is never a PASS.
 *
 * Usage: node scripts/audit/build-findings.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outPath = join(here, "data", "findings.json");

const functionalPath = join(root, "docs", "audit-evidence", "functional-tests.json");
const functional = existsSync(functionalPath)
  ? JSON.parse(readFileSync(functionalPath, "utf8"))
  : { results: [] };
const fnBySlug = new Map((functional.results || []).map((r) => [r.slug, r]));

/* --------------------------------------------------------- defect catalogue */

/**
 * The defects found in the first pass.
 *
 * They are applied first and are overwritten by the more specific second-pass
 * defects below, so a slug always carries the most precise description of
 * what was actually wrong with it.
 */
const TEXT_SUITE_BROKEN = [
  "accept-all-changes-in-word", "apa-citation-generator", "backwards-text-generator",
  "binary-to-text", "blank-text-generator", "bold-text-generator",
  "chicago-citation-generator", "citation-generator", "cursive-text-generator",
  "d20-roller", "fancy-text-generator", "font-generator", "glitch-text-generator",
  "handwriting-generator", "harvard-citation-generator", "html-to-md",
  "invisible-character", "latex-to-word-equation", "mla-citation-generator",
  "remove-comments-from-word", "small-text-generator", "strikethrough-text-generator",
  "text-repeater", "text-to-binary", "text-to-handwriting", "text-to-hex",
  "upside-down-text-generator", "word-to-html", "zalgo-text-generator",
];

const ENCODING_BROKEN = [
  "binary-to-decimal", "binary-to-hex", "binary-translator", "decimal-to-binary",
  "decimal-to-hex", "hex-to-ascii", "hex-to-binary", "hex-to-decimal",
  "hex-to-rgb", "hex-to-rgb-calculator", "hex-rgb-converter", "morse-code-translator",
  "number-base-converter", "rgb-to-hex", "rgb-to-hex-calculator", "rgb-hex-converter",
  "url-decoder", "url-encoder", "url-encoder-decoder",
];

const CALCULATOR_BROKEN = TOOLS_CATALOG.filter((t) => t.engine === "calculator-suite").map(
  (t) => t.slug,
);

const DEFECTS = [
  {
    slugs: TEXT_SUITE_BROKEN,
    problem:
      "The text-suite dispatcher rendered one generic panel (word statistics, case buttons, " +
      "duplicate removal, A-Z sort) for every text-suite tool, so the workspace did not " +
      "match the tool at all.",
    changed_files:
      "src/components/engines/TextSuiteEngine.tsx; src/components/engines/TextKit.tsx; " +
      "src/components/engines/Text*Workspace.tsx",
    expected_result: "The workspace performs the operation the tool is named for.",
    actual_result: "Rebuilt into dedicated per-family workspaces with an explicit slug map.",
    evidence_path: "docs/audit-evidence/functional-tests.json",
    test_ids: "functional:text-suite",
  },
  {
    slugs: ENCODING_BROKEN,
    problem:
      "The engine derived its behaviour from slug.includes(...), so binary-to-decimal " +
      "encoded text to binary instead of converting a number, and one-way tools still " +
      "exposed a misleading Switch Direction toggle.",
    changed_files: "src/components/engines/EncodingConvertersEngine.tsx",
    expected_result:
      "Each slug converts in its stated direction, with readable errors and no misleading controls.",
    actual_result:
      "Rewritten around an explicit per-slug SPECS map with a modes model and BigInt base parsing.",
    evidence_path: "docs/audit-evidence/functional-tests.json",
    test_ids: "functional:encoding-converters",
  },
  {
    slugs: CALCULATOR_BROKEN,
    problem:
      "59 of the 62 calculator tools implemented the wrong formula or exposed the wrong " +
      "fields; only 3 were correct when the suite was audited.",
    changed_files:
      "src/data/calculatorTools.ts; src/components/calculators/*; " +
      "src/components/engines/CalculatorSuiteEngine.tsx; scripts/calculator-selftest.mjs",
    expected_result: "Each calculator returns the value its own name promises.",
    actual_result:
      "Rebuilt around an explicit slug to variant map; 116/116 self-test assertions pass.",
    evidence_path: "docs/audit-evidence/functional-tests.json",
    test_ids: "functional:calculator-suite",
  },
];

/* ------------------------------------------------------- content defects -- */

const CATALOG_TEXT_DEFECT = {
  problem:
    "The catalog text carried HTML entities left over from the source HTML (&amp;, &#x27;) " +
    "and the tool name glued onto the front of the description.",
  changed_files:
    "src/data/tools.ts; src/data/tools_de.json; src/data/howTo.ts; " +
    "scripts/audit/fix-catalog-text.mjs",
  expected_result: "Names and descriptions render as clean text with no entity or name glue.",
  actual_result: "579 descriptions de-glued and 24 entity fields repaired across both catalogs.",
  evidence_path: "scripts/audit/analyze-catalog-text.mjs",
  test_ids: "content:catalog-text",
};

const CATALOG_FEATURE_DEFECT = {
  problem:
    "489 of the 492 tools carried the same five generic feature bullets, including " +
    '"One-click copy to clipboard and file download" for tools that have neither a ' +
    "download nor a clipboard, so the feature list described no tool in particular.",
  changed_files:
    "src/data/tools.ts; src/data/tools_de.json; src/utils/localizedTools.ts; " +
    "scripts/audit/build-features.mjs",
  expected_result:
    "Every tool lists the features it actually has, derived from its own rendered " +
    "controls, in English and German.",
  actual_result:
    "Each tool now lists its own inputs, options, actions, output and formats; " +
    "469 of the 492 English feature lists are unique and the German catalog carries " +
    "its own translated list.",
  evidence_path: "scripts/audit/data/howto-source.json",
  test_ids: "content:catalog-features",
};

/* ------------------------------------------------------ second-pass defects */

/**
 * The developer-suite engine dispatched with slug.includes(...) and only ever
 * branched for the API tester, so every other developer tool rendered the SQL
 * formatter or the API tester.
 */
const DEVELOPER_SUITE_SHARED = TOOLS_CATALOG.filter(
  (t) =>
    t.engine === "developer-suite" &&
    ![
      "api-tester",
      "http-request-tester",
      "rest-api-tester",
      "sql-beautifier",
      "sql-formatter",
      "sql-formatter-beautifier",
    ].includes(t.slug),
).map((t) => t.slug);

const DEFECTS_SECOND = [
  {
    slugs: DEVELOPER_SUITE_SHARED,
    problem:
      "The developer-suite engine dispatched with slug.includes(...) and only branched " +
      "for the API tester, so the tool rendered the SQL formatter (or the API tester) " +
      "instead of the workspace its own name promises.",
    changed_files:
      "src/components/engines/DeveloperSuiteEngine.tsx; src/components/engines/dev/*",
    expected_result:
      "Each developer tool shows its own controls: an XML formatter for xml-formatter, " +
      "a GraphQL validator for graphql-validator, an OpenAPI viewer for openapi-viewer.",
    actual_result: "Rebuilt around an explicit per-slug map with dedicated workspaces.",
    evidence_path: "docs/audit-evidence/functional-tests.json",
    test_ids: "functional:developer-suite",
  },
];

/* ------------------------------------------------------------- build ------ */

const findings = {};

function apply(slug, defect) {
  const fn = fnBySlug.get(slug);
  const entry = {
    problem: defect.problem,
    changed_files: defect.changed_files,
    expected_result: defect.expected_result,
    actual_result: defect.actual_result,
    evidence_path: defect.evidence_path,
    test_ids: defect.test_ids,
  };
  if (fn) {
    entry.status = fn.status === "PASS" ? "PASS" : "FAIL";
    if (fn.status !== "PASS") {
      entry.actual_result = `Functional test failed: ${String(fn.error || "").slice(0, 200)}`;
    }
  } else {
    // A defect that was repaired but has no passing functional test yet is
    // still in progress: only a real-browser test can make it a PASS.
    entry.status = "IN_PROGRESS";
  }
  findings[slug] = entry;
}

for (const defect of DEFECTS) {
  for (const slug of defect.slugs) apply(slug, defect);
}

// The second-pass defects are more precise, so they overwrite the first pass.
for (const defect of DEFECTS_SECOND) {
  for (const slug of defect.slugs) apply(slug, defect);
}

// The catalog text defect touched every tool; it never overrides a stronger
// functional status, so it is only recorded where there is no other finding.
for (const tool of TOOLS_CATALOG) {
  if (findings[tool.slug]) continue;
  const fn = fnBySlug.get(tool.slug);
  findings[tool.slug] = {
    ...CATALOG_TEXT_DEFECT,
    status: fn ? (fn.status === "PASS" ? "PASS" : "FAIL") : "IN_PROGRESS",
  };
}

// The feature-boilerplate defect also touched every tool; it is recorded only
// where no other defect is known, so the tracker stays readable.
for (const tool of TOOLS_CATALOG) {
  const current = findings[tool.slug];
  if (!current || current.problem !== CATALOG_TEXT_DEFECT.problem) continue;
  findings[tool.slug] = {
    ...CATALOG_FEATURE_DEFECT,
    status: current.status,
  };
}

writeFileSync(outPath, JSON.stringify(findings, null, 1), "utf8");

const counts = {};
for (const f of Object.values(findings)) counts[f.status] = (counts[f.status] || 0) + 1;
console.log(`written: ${outPath}`);
console.log(`findings: ${Object.keys(findings).length}`);
console.log(
  Object.entries(counts)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("  "),
);
