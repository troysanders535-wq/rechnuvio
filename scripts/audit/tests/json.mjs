/**
 * Functional specs for the 13 tools of the json engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real pane,
 * presses the real button and reads the real rendered result. The expected
 * values come from RFC 8259 (JSON), the TypeScript type mapping and the
 * TOON object notation - never from this site's own code.
 *
 * Where a tool cannot do what its name promises, the spec asserts the
 * promised behaviour anyway, so the defect shows up in the audit evidence
 * instead of being hidden.
 */

import assert from "node:assert";

import {
  spec,
  fillArea,
  fillInput,
  selectOption,
  clickButton,
  workspaceText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The value of the n-th textarea of the workspace. */
async function areaValue(page, nth = 0) {
  return page.locator("main textarea").nth(nth).inputValue();
}

/** The rows of the difference table of the compare view. */
async function differenceRows(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main table tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) =>
        (td.textContent || "").replace(/\s+/g, " ").trim(),
      ),
    ),
  );
}

/**
 * The nesting depth of a JSON document.
 *
 * The root value is level 1; every member of an object or an array sits one
 * level deeper. The value is counted here, independently of the tool.
 */
function depthOf(value, level = 1) {
  if (Array.isArray(value)) {
    const depths = value.map((item) => depthOf(item, level + 1));
    return depths.length ? Math.max(...depths) : level;
  }
  if (value && typeof value === "object") {
    const depths = Object.values(value).map((v) => depthOf(v, level + 1));
    return depths.length ? Math.max(...depths) : level;
  }
  return level;
}

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("json-compare", "reports the differences between two documents", async (page) => {
    await fillArea(page, '{"a":1,"b":{"c":2},"gone":true}', 0);
    await fillArea(page, '{"a":1,"b":{"c":3},"gone":true,"added":"x"}', 1);
    await sleep(600);

    const text = await workspaceText(page);
    assertIncludes(text, "2 Differences Detected", "two fields differ");
    assertIncludes(text, "+1 Added", "one field was added");
    assertIncludes(text, "-0 Removed", "no field was removed");
    assertIncludes(text, "~1 Modified", "one field was modified");

    const rows = await differenceRows(page);
    assertEqual(rows.length, 2, "the table must list exactly the two differences");
    const modified = rows.find((r) => r[1] === "b.c");
    const added = rows.find((r) => r[1] === "added");
    assert(modified, `the table must list the modified field b.c, got ${JSON.stringify(rows)}`);
    assert(added, `the table must list the added field added, got ${JSON.stringify(rows)}`);
    assertEqual(modified[0], "MODIFIED", "the changed field is a modification");
    assertEqual(modified[2], "2", "b.c was 2 in document A");
    assertEqual(modified[3], "3", "b.c is 3 in document B");
    assertEqual(added[0], "ADDED", "the new field is an addition");
  });

  spec("json-editor", "edits, replaces, formats and inspects a document", async (page) => {
    await fillArea(page, '{"old":"value"}', 0);
    await clickButton(page, "Find & Replace");
    await fillInput(page, "old", 0, "text");
    await fillInput(page, "new", 1, "text");
    await clickButton(page, "Replace All");
    await sleep(400);
    assertIncludes(
      await areaValue(page, 0),
      '"new"',
      "the find and replace must rewrite the document",
    );

    await clickButton(page, "Format");
    assertEqual(
      await areaValue(page, 0),
      '{\n  "new": "value"\n}',
      "the formatter must indent the document with two spaces",
    );

    await clickButton(page, "Tree View");
    await sleep(400);
    assertIncludes(
      await workspaceText(page),
      "new",
      "the tree view must render the edited document",
    );
  });

  spec("json-formatter", "formats a document with the chosen indentation", async (page) => {
    await fillArea(page, '{"b":2,"a":1}', 0);
    await clickButton(page, "Format JSON");
    assertEqual(
      await areaValue(page, 0),
      '{\n  "b": 2,\n  "a": 1\n}',
      "the formatter must indent with two spaces and keep the key order",
    );

    // the "Sort keys A-Z" option must order the members alphabetically
    await page.locator('main input[type="checkbox"]').first().check();
    await sleep(300);
    await clickButton(page, "Format JSON");
    assertEqual(
      await areaValue(page, 0),
      '{\n  "a": 1,\n  "b": 2\n}',
      "sorting the keys must order the members alphabetically",
    );
  });

  spec("json-minifier", "minifies a document into a single line", async (page) => {
    await fillArea(page, '{\n  "a": 1,\n  "b": [1, 2],\n  "c": { "d": "e" }\n}', 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    assertEqual(
      out,
      '{"a":1,"b":[1,2],"c":{"d":"e"}}',
      "the minifier must remove every space that is not inside a string",
    );
    assert(!out.includes("\n"), "the minified document is a single line");
  });

  spec("json-pretty-print", "prints a document with the chosen indentation", async (page) => {
    await fillArea(page, '{"a":1,"b":[2,3]}', 0);
    await selectOption(page, "4", 0);
    await clickButton(page, "Pretty Print");
    assertEqual(
      await areaValue(page, 0),
      '{\n    "a": 1,\n    "b": [\n        2,\n        3\n    ]\n}',
      "the pretty printer must honour the four space indentation",
    );
  });

  spec("json-to-toon", "encodes a document in the TOON notation", async (page) => {
    await fillArea(page, '{"name":"ToolPad","users":[{"id":1,"role":"admin"}]}', 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    assertIncludes(out, "name: ToolPad", "a scalar member is written as key: value");
    assertIncludes(out, "users[1]:", "an array is written with its length");
    assertIncludes(out, "id, role", "a tabular array starts with the column names");
    assertIncludes(out, "1, admin", "a tabular array holds one row per item");
  });

  spec("json-to-toon-converter", "round trips a document through the TOON notation", async (page) => {
    const source = '{"name":"ToolPad","tags":["alpha","beta"],"count":2}';
    await fillArea(page, source, 0);
    await sleep(700);
    const toon = await areaValue(page, 1);
    assertIncludes(toon, "name: ToolPad", "the encoder must write the scalar member");
    assertIncludes(toon, "tags[2]:", "the encoder must write the array length");

    // the "Mode: JSON -> TOON" button moves the result into the input pane
    // and switches to the decoder, so the round trip can be checked.
    await clickButton(page, "Mode: JSON → TOON");
    await sleep(800);
    const back = await areaValue(page, 1);
    assertIncludes(back, '"name"', "the decoded document must carry the name member");
    assertIncludes(back, '"alpha"', "the decoded document must carry the array items");
    assertIncludes(back, '"count"', "the decoded document must carry the count member");
    assert(
      !back.includes('"tags": []'),
      `the array of strings must survive the round trip, got ${JSON.stringify(back)}`,
    );
  });

  spec("json-to-ts", "generates TypeScript types from a document", async (page) => {
    await fillInput(page, "Audit", 0, "text");
    await fillArea(page, '{"id":1,"name":"Ann","tags":["a"],"address":{"city":"Rome"}}', 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    // JSON number -> number, string -> string, array of strings -> string[],
    // object -> a named interface that the member refers to.
    assertIncludes(out, "export interface Audit {", "the root declaration is an interface");
    assertIncludes(out, "id: number;", "a JSON number becomes a number");
    assertIncludes(out, "name: string;", "a JSON string becomes a string");
    assertIncludes(out, "tags: string[];", "an array of strings becomes string[]");
    assertIncludes(out, "address: Address;", "a nested object becomes its own type");
    assertIncludes(out, "export interface Address {", "the nested type is declared");
    assertIncludes(out, "city: string;", "the nested member keeps its JSON type");
  });

  spec("json-to-typescript", "generates a type alias when that is asked for", async (page) => {
    await fillInput(page, "Audit", 0, "text");
    await selectOption(page, "type", 0);
    await fillArea(page, '{"id":1,"name":"Ann"}', 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    assertIncludes(out, "export type Audit = {", "the root declaration is a type alias");
    assertIncludes(out, "id: number;", "a JSON number becomes a number");
    assertIncludes(out, "name: string;", "a JSON string becomes a string");
  });

  spec("json-to-typescript-interface", "generates an interface for the document", async (page) => {
    await fillInput(page, "Audit", 0, "text");
    await selectOption(page, "interface", 0);
    await fillArea(page, '{"id":1,"name":"Ann","active":true}', 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    assertIncludes(out, "export interface Audit {", "the root declaration is an interface");
    assertIncludes(out, "id: number;", "a JSON number becomes a number");
    assertIncludes(out, "name: string;", "a JSON string becomes a string");
    assertIncludes(out, "active: boolean;", "a JSON boolean becomes a boolean");
    assertNotIncludes(out, "export type", "the interface mode must not emit a type alias");
  });

  spec("json-validator", "validates a document and reports its size", async (page) => {
    const doc = '{"alpha": 1, "beta": "two", "gamma": [1, 2, 3]}';
    await fillArea(page, doc, 0);
    await sleep(700);
    const text = await workspaceText(page);
    assertIncludes(text, "Valid JSON Syntax", "a well formed document must be reported as valid");

    const stats = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll("main div").forEach((el) => {
        const label = (el.textContent || "").trim();
        if (
          ["Size", "Lines", "Keys", "Arrays", "Depth", "Characters"].includes(label) &&
          el.className.includes("text-slate-400")
        ) {
          const value = el.parentElement?.children?.[1];
          if (value) out[label] = (value.textContent || "").trim();
        }
      });
      return out;
    });
    // the document has three members, one array and no nested object
    assertEqual(stats.Keys, "3", "the document has three members");
    assertEqual(stats.Arrays, "1", "the document has one array");
    assertEqual(stats.Lines, "1", "the pasted document is a single line");
    assertEqual(stats.Characters, String(doc.length), "the character count is the length of the text");
    assertEqual(stats.Depth, String(depthOf(JSON.parse(doc))), "the depth is the nesting level of the document");
  });

  spec("json-viewer", "shows the document as a tree and as a table", async (page) => {
    await fillArea(page, '[{"id":1,"city":"Rome"},{"id":2,"city":"Oslo"}]', 0);
    await sleep(700);
    const text = await workspaceText(page);
    assertIncludes(text, "Rome", "the tree must render the value of the first row");
    assertIncludes(text, "Oslo", "the tree must render the value of the second row");

    await clickButton(page, "Table");
    await sleep(500);
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main table tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) =>
          (td.textContent || "").replace(/\s+/g, " ").trim(),
        ),
      ),
    );
    assertEqual(rows.length, 2, "the table must show one row per item");
    assertEqual(rows[0][1], "1", "the first row holds the first id");
    assertEqual(rows[0][2], "Rome", "the first row holds the first city");
    assertEqual(rows[1][1], "2", "the second row holds the second id");
    assertEqual(rows[1][2], "Oslo", "the second row holds the second city");
  });

  spec("toon-to-json", "decodes the TOON notation into JSON", async (page) => {
    await fillArea(page, "name: ToolPad\ncount: 2\ntags[2]: alpha, beta", 0);
    await sleep(700);
    const out = await areaValue(page, 1);
    assertIncludes(out, '"name": "ToolPad"', "the scalar member must be decoded");
    assertIncludes(out, '"count": 2', "the number must be decoded as a number");
    assertIncludes(out, '"alpha"', "the array items must be decoded");
    assertIncludes(out, '"beta"', "the array items must be decoded");
    assertNotIncludes(out, '"tags": []', "the array of strings must not be dropped");
  });
}
