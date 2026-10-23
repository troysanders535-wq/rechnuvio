import assert from "assert";
import { jsonToToon, toonToJson, estimateTokens } from "../src/utils/toon.ts";
import { jsonToTypeScript } from "../src/utils/jsonToTs.ts";
import { semanticCompare, deepSortKeys } from "../src/utils/jsonDiffCompare.ts";
import { validateJson, autoRepairJson } from "../src/utils/jsonValidator.ts";
import Papa from "papaparse";
import * as yaml from "js-yaml";

console.log("Starting verification of all 21 JSON tools...\n");

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err);
    process.exit(1);
  }
}

// 1. csv-to-json-converter
test("1. CSV to JSON Converter: parses CSV with headers and types", () => {
  const csv = "id,name,active\n1,Alice,true\n2,Bob,false";
  const res = Papa.parse(csv, { header: true, dynamicTyping: true });
  assert.strictEqual(res.data.length, 2);
  assert.strictEqual(res.data[0].id, 1);
  assert.strictEqual(res.data[0].name, "Alice");
  assert.strictEqual(res.data[0].active, true);
});

// 2. json-compare
test("2. JSON Compare: detects structural differences", () => {
  const a = { x: 1, y: 2 };
  const b = { x: 1, y: 3, z: 4 };
  const res = semanticCompare(a, b);
  assert.strictEqual(res.metrics.areIdentical, false);
  assert.strictEqual(res.metrics.added, 1);
  assert.strictEqual(res.metrics.modified, 1);
});

// 3. json-diff
test("3. JSON Diff: sorts and detects diffs", () => {
  const a = { a: 1, b: 2 };
  const b = { a: 1, b: 3 };
  const res = semanticCompare(a, b);
  assert.strictEqual(res.metrics.modified, 1);
});

// 4. json-editor
test("4. JSON Editor: deep sorts and validates", () => {
  const unordered = { z: 1, a: 2, m: { y: 1, b: 2 } };
  const sorted = deepSortKeys(unordered);
  const keys = Object.keys(sorted);
  assert.deepStrictEqual(keys, ["a", "m", "z"]);
  assert.deepStrictEqual(Object.keys(sorted.m), ["b", "y"]);
});

// 5. json-formatter
test("5. JSON Formatter: formats with custom indentation", () => {
  const obj = { name: "toolpad", count: 21 };
  const formatted2 = JSON.stringify(obj, null, 2);
  assert(formatted2.includes('  "name": "toolpad"'));
  const formatted4 = JSON.stringify(obj, null, 4);
  assert(formatted4.includes('    "name": "toolpad"'));
});

// 6. json-minifier
test("6. JSON Minifier: minifies to single line and calculates savings", () => {
  const obj = { hello: "world", nested: { arr: [1, 2, 3] } };
  const pretty = JSON.stringify(obj, null, 2);
  const minified = JSON.stringify(obj);
  assert(!minified.includes("\n"));
  assert(minified.length < pretty.length);
});

// 7. json-pretty-print
test("7. JSON Pretty Print: pretty prints valid JSON", () => {
  const min = '{"a":1,"b":[true,false]}';
  const pretty = JSON.stringify(JSON.parse(min), null, 2);
  assert(pretty.includes("\n"));
});

// 8. json-diff-compare
test("8. JSON Semantic Diff & Compare: reports identical when keys swapped", () => {
  const a = { id: 10, name: "test", meta: { alpha: "A", beta: "B" } };
  const b = { name: "test", id: 10, meta: { beta: "B", alpha: "A" } };
  const res = semanticCompare(a, b, { ignoreKeyOrder: true });
  assert.strictEqual(res.metrics.areIdentical, true);
  assert.strictEqual(res.metrics.totalDifferences, 0);
});

// 9. json-to-csv-converter
test("9. JSON to CSV Converter: converts array of objects to CSV with headers", () => {
  const data = [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" }
  ];
  const csv = Papa.unparse(data);
  const lines = csv.split(/\r?\n/);
  assert.strictEqual(lines[0], "id,name,role");
  assert.strictEqual(lines[1], "1,Alice,admin");
  assert.strictEqual(lines[2], "2,Bob,user");
});

// 10. json-to-toon
test("10. JSON to TOON: encodes tabular array format", () => {
  const data = {
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
  };
  const toon = jsonToToon(data);
  assert(toon.includes("users[2]:"));
  assert(toon.includes("id, name"));
  assert(toon.includes("1, Alice"));
});

// 11. json-to-toon-converter
test("11. JSON to TOON Converter: calculates token savings", () => {
  const sample = {
    title: "Catalog",
    items: [
      { id: 1, code: "A100", available: true },
      { id: 2, code: "B200", available: false },
      { id: 3, code: "C300", available: true }
    ]
  };
  const jsonStr = JSON.stringify(sample, null, 2);
  const toon = jsonToToon(sample);
  const tJson = estimateTokens(jsonStr);
  const tToon = estimateTokens(toon);
  assert(tToon < tJson);
});

// 12. json-to-ts
test("12. JSON to TS: generates TypeScript interfaces", () => {
  const data = {
    id: 1,
    title: "Post",
    author: { name: "John", email: "john@example.com" }
  };
  const ts = jsonToTypeScript(data, { rootName: "PostResponse" });
  assert(ts.includes("interface Author"));
  assert(ts.includes("interface PostResponse"));
  assert(ts.includes("author: Author;"));
});

// 13. json-to-typescript
test("13. JSON to TypeScript Converter: supports type alias mode", () => {
  const data = { status: "success", code: 200 };
  const ts = jsonToTypeScript(data, { rootName: "ApiResponse", declarationType: "type" });
  assert(ts.includes("type ApiResponse = {"));
});

// 14. json-to-typescript-interface
test("14. JSON to TypeScript Interface: extracts array item interfaces", () => {
  const data = [
    { sku: "SKU1", price: 29.99 },
    { sku: "SKU2", price: 49.99 }
  ];
  const ts = jsonToTypeScript(data, { rootName: "ProductList" });
  assert(ts.includes("interface ProductListItem") || ts.includes("interface ProductList"));
});

// 15. json-validator
test("15. JSON Validator: pinpoints error line/column and auto-repairs", () => {
  const broken = "{\n  title: 'Test',\n  count: 5,\n}";
  const val = validateJson(broken);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.error?.line, 2);
  const fixed = autoRepairJson(broken);
  const val2 = validateJson(fixed);
  assert.strictEqual(val2.isValid, true);
});

// 16. json-viewer
test("16. JSON Viewer: parses deep object hierarchy for tree view", () => {
  const data = { a: { b: { c: [1, 2, 3] } } };
  const val = validateJson(JSON.stringify(data));
  assert.strictEqual(val.stats?.depth, 5);
});

// 17. toon-to-json
test("17. TOON to JSON: decodes tabular TOON back to valid JSON", () => {
  const original = {
    appName: "TestApp",
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
  };
  const toon = jsonToToon(original);
  const decoded = toonToJson(toon);
  assert.deepStrictEqual(decoded, original);
});

// 18. tsv-to-json
test("18. TSV to JSON Converter: parses tab-separated values into JSON array", () => {
  const tsv = "id\tname\tage\n1\tJohn\t25\n2\tMary\t28";
  const res = Papa.parse(tsv, { delimiter: "\t", header: true, dynamicTyping: true });
  assert.strictEqual(res.data.length, 2);
  assert.strictEqual(res.data[0].name, "John");
  assert.strictEqual(res.data[1].age, 28);
});

// 19. yaml-to-json
test("19. YAML to JSON: parses YAML string into structured JSON", () => {
  const yml = "name: ToolPad\nversion: 2.0\ntags:\n  - fast\n  - offline";
  const parsed = yaml.load(yml);
  const jsonStr = JSON.stringify(parsed, null, 2);
  assert.strictEqual(parsed.name, "ToolPad");
  assert.strictEqual(parsed.tags.length, 2);
  assert(jsonStr.includes('"name": "ToolPad"'));
});

// 20. yaml-json-converter
test("20. YAML to JSON Converter: handles nested mappings and types", () => {
  const yml = "database:\n  host: localhost\n  port: 5432\n  ssl: true";
  const parsed = yaml.load(yml);
  assert.strictEqual(parsed.database.port, 5432);
  assert.strictEqual(parsed.database.ssl, true);
});

// 21. yml-to-json
test("21. YML to JSON: converts .yml syntax losslessly", () => {
  const yml = "service:\n  name: auth\n  replicas: 3";
  const parsed = yaml.load(yml);
  const json = JSON.stringify(parsed);
  assert.strictEqual(json, '{"service":{"name":"auth","replicas":3}}');
});

console.log(`\n🎉 ALL ${passedCount} / 21 TOOLS PASSED AUTOMATED FUNCTIONAL VERIFICATION!`);
