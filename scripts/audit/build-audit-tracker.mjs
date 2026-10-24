/**
 * Generate docs/tool-audit.csv - one row per inventoried tool.
 *
 * The tracker is the durable source of truth for the audit. It is generated
 * from the catalog so it can never drift from the real inventory, and the
 * script re-syncs status/evidence fields that an earlier run recorded, so
 * regenerating never loses recorded work.
 *
 * Run: node scripts/audit/build-audit-tracker.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const docsDir = join(root, "docs");
const csvPath = join(docsDir, "tool-audit.csv");

const toolsDe = JSON.parse(
  readFileSync(join(root, "src", "data", "tools_de.json"), "utf8"),
);

const COLUMNS = [
  "sheet",
  "row",
  "slug",
  "name",
  "category",
  "engine",
  "locale_coverage",
  "intended_behavior",
  "discovered_problem",
  "changed_files",
  "dependency_or_api",
  "status",
  "test_ids",
  "expected_result",
  "actual_result",
  "evidence_path",
  "tested_revision",
  "tested_date",
  "blocker_details",
];

const STATUSES = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "PASS",
  "FAIL",
  "BLOCKED_API",
  "BLOCKED_TECHNICAL",
  "BLOCKED_ENVIRONMENT",
]);

/** Minimal RFC-4180 CSV field encoder. */
function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const previous = new Map();
if (existsSync(csvPath)) {
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const header = rows.shift();
  if (header) {
    header.forEach((h, i) => {
      if (h === "slug") return;
    });
    for (const r of rows) {
      const rec = Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]));
      if (rec.slug) previous.set(rec.slug, rec);
    }
  }
}

/** The authored description carries the tool name glued on the front. */
function cleanDescription(name, description) {
  const d = description || "";
  if (!name) return d;
  if (d.toLowerCase().startsWith(name.toLowerCase())) {
    return d.slice(name.length).trim();
  }
  return d;
}

const now = new Date().toISOString().slice(0, 10);
const rows = [];

TOOLS_CATALOG.forEach((tool, index) => {
  const prior = previous.get(tool.slug) || {};
  const de = toolsDe[tool.slug];
  const localeCoverage = de && de.name && de.description ? "en,de" : "en";
  const row = {
    sheet: "All Tools",
    row: String(index + 5),
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    engine: tool.engine,
    locale_coverage: prior.locale_coverage || localeCoverage,
    intended_behavior: prior.intended_behavior || cleanDescription(tool.name, tool.description),
    discovered_problem: prior.discovered_problem || "",
    changed_files: prior.changed_files || "",
    dependency_or_api: prior.dependency_or_api || "",
    status: prior.status && STATUSES.has(prior.status) ? prior.status : "NOT_STARTED",
    test_ids: prior.test_ids || "",
    expected_result: prior.expected_result || "",
    actual_result: prior.actual_result || "",
    evidence_path: prior.evidence_path || "",
    tested_revision: prior.tested_revision || "",
    tested_date: prior.tested_date || "",
    blocker_details: prior.blocker_details || "",
  };
  rows.push(row);
});

mkdirSync(docsDir, { recursive: true });
const header = COLUMNS.join(",");
const body = rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(",")).join("\n");
writeFileSync(csvPath, `${header}\n${body}\n`, "utf8");

const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
console.log(`wrote ${csvPath}`);
console.log(`rows: ${rows.length}`);
console.log(`status counts: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`locale coverage: en+de=${rows.filter((r) => r.locale_coverage === "en,de").length} en-only=${rows.filter((r) => r.locale_coverage === "en").length}`);
console.log(`generated: ${now}`);
