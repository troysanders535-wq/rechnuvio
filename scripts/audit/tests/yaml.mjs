/**
 * Functional specs for the 9 tools of the yaml engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real pane and
 * reads the real rendered output. The expected values come from the YAML 1.2
 * specification (block mappings, block sequences, flow collections) and from
 * JSON (RFC 8259) - never from this site's own code.
 *
 * Where a tool cannot do what its name promises - the shared workspace always
 * converts YAML to JSON and has no YAML formatter or minifier - the spec
 * asserts the promised behaviour anyway, so the defect shows up in the audit
 * evidence instead of being hidden.
 */

import assert from "node:assert";

import {
  spec,
  fillArea,
  clickButton,
  mainText,
  workspaceText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The read-only output pane of the workspace. */
async function output(page) {
  return page.locator("main textarea[readonly]").inputValue();
}

/** The editable input pane of the workspace. */
async function source(page) {
  return page.locator("main textarea").first().inputValue();
}

/**
 * A YAML document and the JSON document it must convert to.
 *
 * `a: 1` is a block mapping with the scalar 1, `list` is a block sequence of
 * two scalars and `nested` is a nested block mapping. The expected JSON is the
 * one RFC 8259 prescribes for that structure, indented with two spaces.
 */
const YAML_SAMPLE = "name: ToolPad\nversion: 2\nlist:\n  - alpha\n  - beta\nnested:\n  ok: true\n";
const JSON_EXPECTED =
  '{\n  "name": "ToolPad",\n  "version": 2,\n  "list": [\n    "alpha",\n    "beta"\n  ],\n  "nested": {\n    "ok": true\n  }\n}';

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("yaml-to-json", "converts a YAML document into the matching JSON", async (page) => {
    await fillArea(page, YAML_SAMPLE, 0);
    await sleep(500);
    assertEqual(
      await output(page),
      JSON_EXPECTED,
      "yaml-to-json must render the JSON that RFC 8259 prescribes for this YAML",
    );
  });

  spec("yml-to-json", "converts a .yml document into the matching JSON", async (page) => {
    await fillArea(page, YAML_SAMPLE, 0);
    await sleep(500);
    assertEqual(
      await output(page),
      JSON_EXPECTED,
      "yml-to-json must render the JSON that RFC 8259 prescribes for this YAML",
    );
  });

  spec("yaml-json-converter", "converts YAML into JSON in both directions", async (page) => {
    await fillArea(page, YAML_SAMPLE, 0);
    await sleep(500);
    assertEqual(
      await output(page),
      JSON_EXPECTED,
      "the converter must render the JSON that RFC 8259 prescribes for this YAML",
    );
    // the "YAML -> JSON" button flips the direction: the JSON just produced is
    // moved into the input pane and the workspace converts it back to YAML.
    await clickButton(page, "YAML → JSON");
    await sleep(700);
    const flipped = await source(page);
    assertEqual(
      flipped,
      JSON_EXPECTED,
      "switching the direction must move the converted document into the input pane",
    );
    assertIncludes(
      await output(page),
      "name: ToolPad",
      "converting the JSON back must yield the original YAML mapping",
    );
  });

  spec("yaml-validator", "reports a valid document and an invalid one", async (page) => {
    await fillArea(page, YAML_SAMPLE, 0);
    await sleep(500);
    assertIncludes(
      await workspaceText(page),
      "Valid YAML Input",
      "a well formed YAML document must be reported as valid",
    );

    // "key: [1, 2" opens a flow sequence that is never closed: the YAML
    // specification requires the flow collection to be terminated.
    await fillArea(page, "key: [1, 2\n", 0);
    await sleep(500);
    const text = await workspaceText(page);
    assertNotIncludes(
      text,
      "Live Converted",
      "an unterminated flow sequence must not be reported as valid",
    );
    const flagged = await page.evaluate(() =>
      Boolean(document.querySelector("main .text-rose-600")),
    );
    assert(
      flagged,
      "an invalid YAML document must be flagged with an error in the workspace",
    );
  });

  spec("yaml-editor-validator", "validates the document while it is edited", async (page) => {
    await fillArea(page, "steps:\n  - one\n  - two\n", 0);
    await sleep(500);
    assertEqual(
      await output(page),
      '{\n  "steps": [\n    "one",\n    "two"\n  ]\n}',
      "the editor must show the parsed document of the edited YAML",
    );
    assertIncludes(
      await workspaceText(page),
      "Valid YAML Input",
      "the editor must report the edited document as valid",
    );
  });

  spec("yaml-formatter", "formats the YAML document", async (page) => {
    await fillArea(page, "name:   ToolPad\nversion:    2\n", 0);
    await sleep(500);
    const out = await output(page);
    assertIncludes(
      out,
      "name: ToolPad",
      "a YAML formatter must output YAML (one key per line), not JSON",
    );
    assertNotIncludes(
      out,
      '"name"',
      "a YAML formatter must not output a JSON document",
    );
  });

  spec("yaml-beautifier", "beautifies the YAML document", async (page) => {
    await fillArea(page, "name:   ToolPad\nversion:    2\n", 0);
    await sleep(500);
    const out = await output(page);
    assertIncludes(
      out,
      "name: ToolPad",
      "a YAML beautifier must output YAML (one key per line), not JSON",
    );
    assertNotIncludes(
      out,
      '"name"',
      "a YAML beautifier must not output a JSON document",
    );
  });

  spec("yaml-minifier", "minifies the YAML document", async (page) => {
    await fillArea(page, "name: ToolPad\nversion: 2\nlist:\n  - alpha\n  - beta\n", 0);
    await sleep(500);
    const out = await output(page);
    assertIncludes(
      out,
      "name: ToolPad",
      "a YAML minifier must output YAML, not JSON",
    );
    assert(
      !out.includes("\n"),
      `a minified YAML document is a single line, got ${JSON.stringify(out.slice(0, 120))}`,
    );
  });

  spec("yaml-editor", "keeps the edited YAML in the editor pane", async (page) => {
    const edited = "title: Audit\ncount: 3\n";
    await fillArea(page, edited, 0);
    await sleep(500);
    assertEqual(
      await source(page),
      edited,
      "the editor pane must hold exactly the YAML that was typed",
    );
    assertEqual(
      await output(page),
      '{\n  "title": "Audit",\n  "count": 3\n}',
      "the editor must show the parsed document of the edited YAML",
    );
    const text = await mainText(page);
    assertIncludes(text, "Audit", "the workspace must render the edited document");
  });
}
