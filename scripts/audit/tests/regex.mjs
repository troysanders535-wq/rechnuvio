/**
 * Functional specs for the 6 tools of the regex engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real pattern
 * field and test-string field, presses the real flag buttons and reads the
 * rendered match report.
 *
 * Expected values come from the meaning of the pattern itself (which text it
 * matches, where the match starts, what the capture groups contain) and from
 * the ECMAScript regular expression syntax - never from this site's own
 * implementation.
 */

import {
  spec,
  fillInput,
  fillArea,
  clickButton,
  assertIncludes,
  assertNotIncludes,
  assertMatches,
} from "../lib/test-helpers.mjs";

/**
 * The text of the tool's own panel, so that the page copy around the tool
 * (feature list, how-to, FAQ) cannot satisfy an assertion by accident.
 */
async function panelText(page) {
  return page.evaluate(() => {
    const anchor = document.querySelector("main input, main textarea, main select");
    let el = anchor;
    while (el && el.parentElement && !(el.className || "").toString().includes("overflow-hidden")) {
      el = el.parentElement;
    }
    return el ? el.innerText || "" : "";
  });
}

/** Type a pattern into the pattern field and a text into the test field. */
async function drive(page, pattern, text) {
  await fillInput(page, pattern, 0, "text");
  await fillArea(page, text);
}

export function register() {
  spec("regex-tester", "matches a pattern and reports groups and indexes", async (page) => {
    // The pattern matches YYYY-MM-DD. In "2026-10-23 and 1995-06-15" the first
    // match starts at index 0 and the second one after "2026-10-23 and "
    // (14 characters) at index 15.
    await drive(page, "(\\d{4})-(\\d{2})-(\\d{2})", "2026-10-23 and 1995-06-15");

    const t = await panelText(page);
    assertIncludes(t, "Valid Regular Expression", "pattern is reported as valid");
    assertIncludes(t, "2 matches found", "number of matches");
    assertIncludes(t, 'Match #1: "2026-10-23"', "first match");
    assertIncludes(t, "Index 0", "index of the first match");
    assertIncludes(t, 'Group 1: "2026"', "first capture group");
    assertIncludes(t, 'Group 2: "10"', "second capture group");
    assertIncludes(t, 'Group 3: "23"', "third capture group");
    assertIncludes(t, 'Match #2: "1995-06-15"', "second match");
    assertIncludes(t, "Index 15", "index of the second match");
  });

  spec("regex-checker", "reports an invalid pattern instead of accepting it", async (page) => {
    // "[" opens a character class that is never closed: ECMAScript rejects it.
    await drive(page, "[", "abc");

    const t = await panelText(page);
    assertNotIncludes(t, "Valid Regular Expression", "a broken pattern must not be reported as valid");
    assertIncludes(t, "Invalid regular expression", "the broken pattern is reported");
    assertIncludes(t, "No matches found", "a broken pattern matches nothing");
  });

  spec("regex-explainer", "explains what the pattern does", async (page) => {
    // The tool promises to explain a regular expression token by token. For
    // \d{4} the explanation has to name the token, and \d is the digit class.
    await drive(page, "\\d{4}", "2026");

    const t = await panelText(page);
    assertMatches(t, /\bdigit\b/i, "the explanation names the \\d digit class");
  });

  spec("regex-generator", "generates a pattern from a plain description", async (page) => {
    // Describe the pattern, then check that the generated pattern really finds
    // the described thing in the test text.
    await drive(page, "email address", "write to bob@example.com");

    const t = await panelText(page);
    assertIncludes(t, 'Match #1: "bob@example.com"', "the generated pattern finds the email address");
  });

  spec("regex-ai", "generates a pattern from a plain description offline", async (page) => {
    // Same contract as the generator, with a different description.
    await drive(page, "a date in YYYY-MM-DD form", "today is 2026-10-23");

    const t = await panelText(page);
    assertIncludes(t, 'Match #1: "2026-10-23"', "the generated pattern finds the date");
  });

  spec("javascript-regex-tester", "runs a JavaScript pattern over the test string", async (page) => {
    // The case-insensitive flag button is a real control: with it off
    // "hello" must not match "Hello World", with it on it must.
    await drive(page, "hello", "Hello World");

    let t = await panelText(page);
    assertIncludes(t, "No matches found", "a case-sensitive search finds nothing");

    await clickButton(page, "i");
    t = await panelText(page);
    assertIncludes(t, "1 matches found", "the case-insensitive flag makes the search match");
    assertIncludes(t, 'Match #1: "Hello"', "the matched text");
  });
}
