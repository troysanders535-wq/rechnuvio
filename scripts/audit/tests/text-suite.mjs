/**
 * Functional specs for the 46 tools of the text suite engine.
 *
 * Every spec drives the real UI in Chrome and asserts on a value that was
 * established independently of this site's own code:
 *
 * - the Unicode Character Database for the text styling tools
 *   (Mathematical Alphanumeric Symbols, Combining Diacritical Marks,
 *   Superscripts and Subscripts, Enclosed Alphanumerics),
 * - UTF-8 (RFC 3629) for the binary and hex converters,
 * - the APA 7th, MLA 9th, Chicago 17th and Harvard reference styles for the
 *   citation generators,
 * - the cl100k_base vocabulary and the "price per 1,000,000 tokens" rule for
 *   the token counters,
 * - the OOXML tracked-change and comment model for the Word (.docx) tools,
 * - the dice definition (kept die plus modifier, higher die on advantage)
 *   for the d20 roller.
 *
 * The Word tools are fed a .docx that is built in memory, so nothing is
 * written to disk and nothing is uploaded.
 */

import JSZip from "jszip";
import assert from "node:assert/strict";

import {
  spec,
  sleep,
  fillPrimary,
  selectOption,
  clickButton,
  mainText,
  assertIncludes,
  assertMatches,
  assertNotIncludes,
  assertEqual,
  statValue,
  waitForStat,
  labelledOutput,
} from "../lib/test-helpers.mjs";

/**
 * Wait until React has hydrated the workspace.
 *
 * The runner hands the page to the spec a moment after domcontentloaded,
 * which can be before React has hydrated. A fill or a click before the
 * hydration is silently dropped by React, so every spec waits until the
 * event handlers of the workspace are attached.
 */
async function waitForHydration(page, timeout = 20000) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main");
      if (!main) return false;
      // React attaches its fiber to the container while it hydrates the tree.
      return Object.keys(main).some((k) => k.startsWith("__reactFiber$"));
    },
    undefined,
    { timeout },
  );
  await sleep(150);
}

/**
 * Register the one spec of a tool.
 *
 * It waits for the React hydration before the test drives the UI, so that a
 * fill or a click is never lost to a page that is not hydrated yet.
 */
function toolSpec(slug, name, fn) {
  spec(slug, name, async (page) => {
    await waitForHydration(page);
    await fn(page);
  });
}

/* ------------------------------------------------------------- fixtures --- */

/**
 * A minimal Word document with one tracked insertion, one tracked deletion
 * and one comment by "Alice Reviewer".
 *
 * The archive is built in memory: the file picker is fed the bytes directly,
 * so no fixture is ever written to disk.
 */
async function docxFixture() {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`,
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello world</w:t></w:r></w:p>
    <w:p>
      <w:ins w:id="1" w:author="Alice Reviewer" w:date="2024-01-01T00:00:00Z">
        <w:r><w:t>added</w:t></w:r>
      </w:ins>
      <w:del w:id="2" w:author="Alice Reviewer" w:date="2024-01-01T00:00:00Z">
        <w:r><w:delText>deleted</w:delText></w:r>
      </w:del>
    </w:p>
    <w:p>
      <w:commentRangeStart w:id="0"/>
      <w:r><w:t>commented</w:t></w:r>
      <w:commentRangeEnd w:id="0"/>
      <w:r><w:commentReference w:id="0"/></w:r>
    </w:p>
  </w:body>
</w:document>`,
  );

  zip.file(
    "word/comments.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="Alice Reviewer" w:initials="AR" w:date="2024-01-01T00:00:00Z">
    <w:p><w:r><w:t>A reviewer note</w:t></w:r></w:p>
  </w:comment>
</w:comments>`,
  );

  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Audit Fixture</dc:title>
  <dc:creator>Alice Reviewer</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created>
</cp:coreProperties>`,
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

/** Hand the in-memory .docx to a file picker. */
async function uploadDocx(page, inputId) {
  const buffer = await docxFixture();
  await page.locator(`#${inputId}`).setInputFiles({
    name: "audit-fixture.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
  });
  await sleep(1500);
}

/* --------------------------------------------------------------- helpers --- */

/** The number of distinct colours painted on a canvas. */
async function canvasColours(page, index = 0) {
  return page.evaluate((i) => {
    const canvas = document.querySelectorAll("main canvas")[i];
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const seen = new Set();
    for (let p = 0; p < data.length; p += 4) {
      seen.add(`${data[p]},${data[p + 1]},${data[p + 2]}`);
    }
    return seen.size;
  }, index);
}

/** The dice faces of the d20 roller: the value and whether it was kept. */
async function diceFaces(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main div.size-20")).map((el) => {
      const column = el.parentElement;
      const caption = column ? column.querySelector("span") : null;
      return {
        value: Number((el.textContent || "").trim()),
        state: caption ? (caption.textContent || "").trim() : "",
      };
    }),
  );
}

/** The code points of a string, as numbers. */
function codePoints(text) {
  return Array.from(text).map((ch) => ch.codePointAt(0));
}

/* ------------------------------------------------------------ the specs --- */

export function register() {
  /* ---- case conversion ------------------------------------------------- */

  toolSpec("uppercase-converter", "uppercases the whole input", async (page) => {
    await fillPrimary(page, "Hello, ToolPad!");
    assertEqual(
      await page.locator("#text-case-input").inputValue(),
      "Hello, ToolPad!",
      "the text the tool accepted",
    );
    await clickButton(page, "UPPERCASE");
    const result = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(result, "HELLO, TOOLPAD!", "the UPPERCASE variant of the input");
  });

  toolSpec("lowercase-converter", "lowercases the whole input", async (page) => {
    await fillPrimary(page, "Hello, ToolPad!");
    assertEqual(
      await page.locator("#text-case-input").inputValue(),
      "Hello, ToolPad!",
      "the text the tool accepted",
    );
    await clickButton(page, "lowercase");
    const result = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(result, "hello, toolpad!", "the lowercase variant of the input");
  });

  toolSpec("title-case-converter", "capitalises the first letter of every word", async (page) => {
    await fillPrimary(page, "hello world");
    assertEqual(
      await page.locator("#text-case-input").inputValue(),
      "hello world",
      "the text the tool accepted",
    );
    await clickButton(page, "Title Case");
    const result = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(result, "Hello World", "the Title Case variant of the input");
  });

  toolSpec("text-case-converter", "shows every case variant at once", async (page) => {
    await fillPrimary(page, "hello world");
    assertEqual(
      await page.locator("#text-case-input").inputValue(),
      "hello world",
      "the text the tool accepted",
    );
    const upper = await labelledOutput(page, "UPPERCASE");
    const lower = await labelledOutput(page, "lowercase");
    const camel = await labelledOutput(page, "camelCase");
    assertEqual(upper, "HELLO WORLD", "the uppercase variant");
    assertEqual(lower, "hello world", "the lowercase variant");
    assertEqual(camel, "helloWorld", "the camelCase variant");
  });

  /* ---- line operations -------------------------------------------------- */

  toolSpec("alphabetical-order-tool", "sorts the lines from A to Z", async (page) => {
    await fillPrimary(page, "banana\napple\ncherry");
    await clickButton(page, "Sort A to Z");
    const lines = await page.locator("#text-lines-input").inputValue();
    assertEqual(lines, "apple\nbanana\ncherry", "the lines sorted A to Z");
  });

  toolSpec("remove-duplicate-lines", "drops the repeated lines and keeps the order", async (page) => {
    await fillPrimary(page, "banana\napple\nbanana\ncherry");
    await clickButton(page, "Remove duplicates");
    const lines = await page.locator("#text-lines-input").inputValue();
    assertEqual(
      lines,
      "banana\napple\ncherry",
      "the lines with the second banana removed",
    );
  });

  toolSpec("remove-duplicate-lines-and-sort", "drops duplicate lines and sorts the rest", async (page) => {
    await fillPrimary(page, "banana\napple\nbanana\ncherry");
    await sleep(800);
    const deduped = await page.locator("#text-lines-input").inputValue();
    assertEqual(
      deduped,
      "banana\napple\ncherry",
      "the duplicate line dropped while typing",
    );
    await clickButton(page, "Remove duplicates and sort");
    const sorted = await page.locator("#text-lines-input").inputValue();
    assertEqual(sorted, "apple\nbanana\ncherry", "the deduplicated lines sorted");
  });

  /* ---- counters --------------------------------------------------------- */

  toolSpec("word-counter", "counts the words and the characters of the text", async (page) => {
    await fillPrimary(page, "Hello world. Second sentence!");
    const words = await statValue(page, "Words");
    const characters = await statValue(page, "Characters (with spaces)");
    assertEqual(words, "4", "the number of words");
    assertEqual(characters, "29", "the number of characters with spaces");
  });

  toolSpec("character-counter", "counts the characters without the spaces", async (page) => {
    await fillPrimary(page, "a  b   c");
    const withoutSpaces = await statValue(page, "Characters (without spaces)");
    const withSpaces = await statValue(page, "Characters (with spaces)");
    assertEqual(withoutSpaces, "3", "the characters without spaces");
    assertEqual(withSpaces, "8", "the characters with spaces");
  });

  toolSpec(
    "string-length-calculator",
    "counts UTF-8 bytes apart from characters",
    async (page) => {
      // U+00E9 LATIN SMALL LETTER E WITH ACUTE: one code point, two UTF-8 bytes
      await fillPrimary(page, "\u00e9");
      assertEqual(
        await statValue(page, "UTF-8 bytes"),
        "2",
        "the UTF-8 byte length of U+00E9",
      );
      assertEqual(
        await statValue(page, "Characters (with spaces)"),
        "1",
        "the character length of U+00E9",
      );
      assertEqual(
        await statValue(page, "Graphemes (code points)"),
        "1",
        "the code point length of U+00E9",
      );

      // U+0065 U+0301: the same letter written as e + COMBINING ACUTE ACCENT,
      // two code points and three UTF-8 bytes
      await fillPrimary(page, "e\u0301");
      assertEqual(
        await statValue(page, "UTF-8 bytes"),
        "3",
        "the UTF-8 byte length of e + U+0301",
      );
      assertEqual(
        await statValue(page, "Characters (with spaces)"),
        "2",
        "the character length of e + U+0301",
      );
      assertEqual(
        await statValue(page, "Graphemes (code points)"),
        "2",
        "the code point length of e + U+0301",
      );
    },
  );

  toolSpec("token-counter", "counts the tokens with the exact OpenAI tokenizer", async (page) => {
    await fillPrimary(page, "Hello world, this is a token counter test!");
    const tokens = await waitForStat(page, "Tokens (exact)");
    assertEqual(tokens, "10", "the cl100k_base token count");
    const characters = await statValue(page, "Characters");
    assertEqual(characters, "42", "the character count of the sample");
  });

  toolSpec("ai-token-counter", "counts tokens and prices them per million tokens", async (page) => {
    await page.locator("#token-text").fill("Hello world, this is a token counter test!");
    const tokens = await waitForStat(page, "Tokens (exact)");
    assertEqual(tokens, "10", "the cl100k_base token count");
    const characters = await statValue(page, "Characters");
    const words = await statValue(page, "Words");
    assertEqual(characters, "42", "the character count of the sample");
    assertEqual(words, "8", "the word count of the sample");

    await page.locator("#token-price").fill("10");
    await sleep(600);
    // the documented rule: cost = tokens / 1,000,000 * price per million tokens
    const cost = await statValue(page, "Estimated cost");
    assertEqual(cost, "$0.000100", "the cost of 10 tokens at $10 per million");
  });

  toolSpec("llm-token-counter", "counts tokens and prices them per million tokens", async (page) => {
    await page.locator("#token-text").fill("Hello world, this is a token counter test!");
    const tokens = await waitForStat(page, "Tokens (exact)");
    assertEqual(tokens, "10", "the cl100k_base token count");
    await page.locator("#token-price").fill("4");
    await sleep(600);
    const cost = await statValue(page, "Estimated cost");
    assertEqual(cost, "$0.000040", "the cost of 10 tokens at $4 per million");
  });

  /* ---- citation generators ---------------------------------------------- */

  /** Fill the citation form with one book by one author. */
  async function fillBook(page) {
    await page.locator("#citation-authors").fill("Smith, John");
    await page.locator("#citation-year").fill("2020");
    await page.locator("#citation-title").fill("The Book Title");
    await page.locator("#citation-publisher").fill("Acme Press");
    await page.locator("#citation-edition").fill("2nd");
    await page.locator("#citation-place").fill("New York");
    await sleep(800);
  }

  toolSpec("apa-citation-generator", "builds the APA 7 book reference", async (page) => {
    await fillBook(page);
    const apa = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(
      apa,
      "Smith, J. (2020). The Book Title (2nd ed.). Acme Press.",
      "the APA 7th edition reference list entry of a book",
    );
  });

  toolSpec("mla-citation-generator", "builds the MLA 9 book reference", async (page) => {
    await fillBook(page);
    const mla = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(
      mla,
      "Smith, John. The Book Title. 2nd ed., Acme Press, 2020.",
      "the MLA 9th edition works-cited entry of a book",
    );
  });

  toolSpec("chicago-citation-generator", "builds the Chicago 17 book reference", async (page) => {
    await fillBook(page);
    // the workspace labels itself "Chicago 17 (author-date)": the reference
    // list of the author-date system puts the year behind the author.
    const chicago = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(
      chicago,
      "Smith, John. 2020. The Book Title. 2nd ed. New York: Acme Press.",
      "the Chicago 17th edition author-date reference list entry of a book",
    );
  });

  toolSpec("harvard-citation-generator", "builds the Harvard book reference", async (page) => {
    await fillBook(page);
    const harvard = await page.locator("main textarea[readonly]").first().inputValue();
    assertEqual(
      harvard,
      "Smith, J. (2020) The Book Title (2nd ed.). New York: Acme Press.",
      "the Harvard reference entry of a book",
    );
  });

  toolSpec("citation-generator", "builds all four reference styles at once", async (page) => {
    await fillBook(page);
    const apa = await labelledOutput(page, "APA 7");
    const mla = await labelledOutput(page, "MLA 9");
    const chicago = await labelledOutput(page, "Chicago 17 (author-date)");
    const harvard = await labelledOutput(page, "Harvard");
    assertEqual(
      apa,
      "Smith, J. (2020). The Book Title (2nd ed.). Acme Press.",
      "the APA 7th edition reference list entry",
    );
    assertEqual(
      mla,
      "Smith, John. The Book Title. 2nd ed., Acme Press, 2020.",
      "the MLA 9th edition works-cited entry",
    );
    assertEqual(
      chicago,
      "Smith, John. 2020. The Book Title. 2nd ed. New York: Acme Press.",
      "the Chicago 17th edition author-date reference list entry",
    );
    assertEqual(
      harvard,
      "Smith, J. (2020) The Book Title (2nd ed.). New York: Acme Press.",
      "the Harvard reference entry",
    );
  });

  /* ---- encoding converters ---------------------------------------------- */

  toolSpec("text-to-binary", "encodes the text as UTF-8 bits", async (page) => {
    await fillPrimary(page, "Hi");
    const bits = await page.locator("#binary-output").inputValue();
    assertEqual(bits, "01001000 01101001", "the UTF-8 bytes of 'Hi' in binary");
  });

  toolSpec("binary-to-text", "decodes the bits back into the text", async (page) => {
    await fillPrimary(page, "01001000 01101001");
    const text = await page.locator("#binary-decoded").inputValue();
    assertEqual(text, "Hi", "the text decoded from the UTF-8 bytes of 'Hi'");
  });

  toolSpec("text-to-hex", "encodes the text as UTF-8 hex bytes", async (page) => {
    await fillPrimary(page, "Hi");
    const hex = await page.locator("#hex-output").inputValue();
    assertEqual(hex, "48 69", "the UTF-8 bytes of 'Hi' in hex");
    const t = await mainText(page);
    assertIncludes(t, "U+0048", "the character table should list the code point of H");
  });

  toolSpec("html-to-md", "turns the HTML into Markdown", async (page) => {
    await fillPrimary(page, "<h1>Hello</h1>");
    const md = await page.locator("#markdown-output").inputValue();
    assertEqual(md, "# Hello", "the Markdown heading of <h1>Hello</h1>");
    await fillPrimary(page, "<p>One</p><p>Two</p>");
    const paragraphs = await page.locator("#markdown-output").inputValue();
    assertMatches(paragraphs, /One[\s\S]*Two/, "both paragraphs in the Markdown output");
  });

  toolSpec("latex-to-word-equation", "converts LaTeX into the Word linear format", async (page) => {
    await fillPrimary(page, "\\frac{a}{b}");
    const equation = await page.locator("#latex-output").inputValue();
    assertEqual(equation, "(a)/(b)", "the Word linear form of \\frac{a}{b}");
  });

  /* ---- text styling ----------------------------------------------------- */

  toolSpec("bold-text-generator", "renders the mathematical bold characters", async (page) => {
    await fillPrimary(page, "A");
    const result = await page.locator("#font-result").inputValue();
    // U+1D400 MATHEMATICAL BOLD CAPITAL A
    assertEqual(result, "\u{1D400}", "the mathematical bold capital A");
    await selectOption(page, "bold-italic");
    const italic = await page.locator("#font-result").inputValue();
    // U+1D468 MATHEMATICAL BOLD ITALIC CAPITAL A
    assertEqual(italic, "\u{1D468}", "the mathematical bold italic capital A");
  });

  toolSpec("cursive-text-generator", "renders the script and fraktur characters", async (page) => {
    await fillPrimary(page, "A");
    const script = await page.locator("#font-result").inputValue();
    // U+1D49C MATHEMATICAL SCRIPT CAPITAL A
    assertEqual(script, "\u{1D49C}", "the mathematical script capital A");
    await selectOption(page, "fraktur");
    const fraktur = await page.locator("#font-result").inputValue();
    // U+1D504 MATHEMATICAL FRAKTUR CAPITAL A
    assertEqual(fraktur, "\u{1D504}", "the mathematical fraktur capital A");
  });

  toolSpec("small-text-generator", "renders the small capital and super/subscript characters", async (page) => {
    await fillPrimary(page, "a");
    const caps = await page.locator("#font-result").inputValue();
    // U+1D00 LATIN LETTER SMALL CAPITAL A
    assertEqual(caps, "\u{1D00}", "the small capital a");
    await selectOption(page, "superscript");
    const raised = await page.locator("#font-result").inputValue();
    // U+1D2C MODIFIER LETTER CAPITAL A, the superscript a of Unicode
    assertEqual(raised, "\u{1D2C}", "the superscript a");
    await selectOption(page, "subscript");
    const sub = await page.locator("#font-result").inputValue();
    // U+2090 LATIN SUBSCRIPT SMALL LETTER A
    assertEqual(sub, "\u{2090}", "the subscript a");
  });

  toolSpec("strikethrough-text-generator", "adds the Unicode combining strike mark", async (page) => {
    await fillPrimary(page, "ab");
    const strike = await page.locator("#font-result").inputValue();
    // U+0336 COMBINING LONG STROKE OVERLAY after every character
    assertEqual(strike, "a\u0336b\u0336", "the struck through text");
    await selectOption(page, "underline");
    const underline = await page.locator("#font-result").inputValue();
    // U+0332 COMBINING LOW LINE
    assertEqual(underline, "a\u0332b\u0332", "the underlined text");
    await selectOption(page, "overline");
    const overline = await page.locator("#font-result").inputValue();
    // U+0305 COMBINING OVERLINE
    assertEqual(overline, "a\u0305b\u0305", "the overlined text");
  });

  toolSpec("fancy-text-generator", "renders the gallery of Unicode styles", async (page) => {
    await fillPrimary(page, "A");
    const bold = await labelledOutput(page, "Bold");
    assertEqual(bold, "\u{1D400}", "the mathematical bold capital A in the gallery");
    const t = await mainText(page);
    assertIncludes(t, "\u{1D400}", "the page should show the mathematical bold capital A");
    const styles = await page.locator("main select#font-style option").count();
    assert(styles >= 15, `expected the full style list, got ${styles} options`);
  });

  toolSpec("font-generator", "filters the style gallery by name", async (page) => {
    await fillPrimary(page, "A");
    const bold = await labelledOutput(page, "Bold");
    assertEqual(bold, "\u{1D400}", "the mathematical bold capital A in the gallery");
    await page.locator("#font-search").fill("fraktur");
    await sleep(600);
    const fraktur = await labelledOutput(page, "Fraktur");
    assertEqual(fraktur, "\u{1D504}", "the mathematical fraktur capital A");
  });

  toolSpec("glitch-text-generator", "glitches the text and reshuffles it", async (page) => {
    await fillPrimary(page, "Fancy Text");
    const first = await page.locator("#glitch-result").inputValue();
    assertNotIncludes(first, "Fancy Text", "the glitched result is not the plain text");
    await clickButton(page, "Shuffle");
    const second = await page.locator("#glitch-result").inputValue();
    assert(
      second !== first,
      `the shuffle should change the glitched result, both were ${JSON.stringify(first)}`,
    );
    const characters = await statValue(page, "Characters");
    assertEqual(characters, "10", "the character count of the source text");
  });

  toolSpec("zalgo-text-generator", "stacks combining marks on the text", async (page) => {
    await fillPrimary(page, "A");
    const result = await page.locator("#zalgo-result").inputValue();
    assert(result.startsWith("A"), `the A should be kept, got ${JSON.stringify(result)}`);
    assertMatches(
      result,
      /[\u0300-\u036f]/,
      "the result should carry at least one combining mark from U+0300-U+036F",
    );

    // a heavier intensity stacks more marks than a light one
    await selectOption(page, "light");
    const light = await page.locator("#zalgo-result").inputValue();
    await selectOption(page, "heavy");
    const heavy = await page.locator("#zalgo-result").inputValue();
    const marks = (text) => codePoints(text).filter((cp) => cp >= 0x0300 && cp <= 0x036f).length;
    assert(
      marks(heavy) > marks(light),
      `heavy (${marks(heavy)}) should stack more marks than light (${marks(light)})`,
    );
  });

  toolSpec("upside-down-text-generator", "flips the text and restores the original", async (page) => {
    await fillPrimary(page, "Hello");
    const flipped = await page.locator("#upside-result").inputValue();
    assertEqual(flipped.length, 5, "the number of flipped characters");
    // the letters are rotated 180 degrees and the order is reversed
    assertEqual(flipped, "oll\u01ddH", "the rotated and reversed text");
    // restoring the flipped text gives the original back
    assertEqual(
      await page.locator("#upside-restored").inputValue(),
      "Hello",
      "the restored original of the flipped text",
    );
    await page.locator("#upside-text").fill(flipped);
    await clickButton(page, "Restore flipped text");
    assertEqual(
      await page.locator("#upside-text").inputValue(),
      "Hello",
      "the text restored from the flipped one",
    );
  });

  toolSpec("backwards-text-generator", "reverses the text in the selected mode", async (page) => {
    await fillPrimary(page, "one two");
    await selectOption(page, "all");
    const all = await page.locator("#backwards-result").inputValue();
    assertEqual(all, "owt eno", "the reversed characters");
    await selectOption(page, "words");
    const words = await page.locator("#backwards-result").inputValue();
    assertEqual(words, "two one", "the reversed word order");
    await selectOption(page, "each");
    const each = await page.locator("#backwards-result").inputValue();
    assertEqual(each, "eno owt", "every word reversed");
  });

  toolSpec("blank-text-generator", "produces the requested number of blank characters", async (page) => {
    await page.locator("#blank-count").fill("3");
    await sleep(700);
    const blank = await page.locator("#blank-result").inputValue();
    // the default filler is the Hangul filler U+3164
    assertEqual(blank, "\u3164\u3164\u3164", "three Hangul fillers");
    const codePoint = await page.locator("#blank-code").innerText();
    assertIncludes(codePoint, "U+3164", "the code point field should show U+3164");
    await selectOption(page, "zwsp");
    await sleep(700);
    const zwsp = await page.locator("#blank-result").inputValue();
    assertEqual(zwsp, "\u200B\u200B\u200B", "three zero-width spaces");
  });

  toolSpec("invisible-character", "detects a zero-width space in the pasted text", async (page) => {
    await fillPrimary(page, "a\u200bb");
    const hits = await statValue(page, "Invisible characters");
    assertEqual(hits, "1", "the number of invisible characters");
    const rows = await page.locator("main ul li").count();
    assertEqual(rows, 1, "the number of reported characters");
  });

  toolSpec("text-repeater", "repeats the text the requested number of times", async (page) => {
    await fillPrimary(page, "ab");
    await page.locator("#repeat-count").fill("3");
    await sleep(700);
    const repeated = await page.locator("#repeat-result").inputValue();
    assertEqual(repeated, "ab ab ab", "the text repeated three times");
    await selectOption(page, "newline");
    await sleep(700);
    const lines = await page.locator("#repeat-result").inputValue();
    assertEqual(lines, "ab\nab\nab", "the text repeated on three lines");
  });

  /* ---- handwriting ------------------------------------------------------ */

  toolSpec("handwriting-generator", "paints the typed text onto the paper canvas", async (page) => {
    const blank = await canvasColours(page, 0);
    await page.locator("#hw-text").fill("Hello");
    await sleep(900);
    const inked = await canvasColours(page, 0);
    assert(
      inked > blank,
      `the canvas should carry ink for the typed text (${inked} colours vs ${blank})`,
    );
    const text = await page.locator("#hw-text").inputValue();
    assertEqual(text, "Hello", "the text that was typed into the workspace");
  });

  toolSpec("text-to-handwriting", "paints the typed text onto the paper canvas", async (page) => {
    const blank = await canvasColours(page, 0);
    await page.locator("#hw-text").fill("Hello");
    await sleep(900);
    const inked = await canvasColours(page, 0);
    assert(
      inked > blank,
      `the canvas should carry ink for the typed text (${inked} colours vs ${blank})`,
    );
    const characters = await statValue(page, "Characters");
    assertEqual(characters, "5", "the character count of the typed text");
  });

  /* ---- Word (.docx) tools ----------------------------------------------- */

  toolSpec("accept-all-changes-in-word", "accepts the tracked changes of a .docx", async (page) => {
    await uploadDocx(page, "accept-docx");
    const insertions = await statValue(page, "Insertions accepted");
    const deletions = await statValue(page, "Deletions removed");
    assertEqual(insertions, "1", "the number of accepted insertions");
    assertEqual(deletions, "1", "the number of removed deletions");
    const text = await page.locator("main textarea[readonly]").first().inputValue();
    assertIncludes(text, "Hello world", "the accepted text keeps the plain runs");
    assertIncludes(text, "added", "the accepted text keeps the inserted run");
    assertNotIncludes(text, "deleted", "the accepted text drops the deleted run");
  });

  toolSpec("remove-comments-from-word", "counts and removes the comments of a .docx", async (page) => {
    await uploadDocx(page, "comments-docx");
    const t = await mainText(page);
    assertMatches(t, /Comments found:\s*1/, "the document holds exactly one comment");
    assertMatches(
      t,
      /Comment anchors removed:\s*3/,
      "the range start, the range end and the reference are removed",
    );
  });

  toolSpec("word-to-html", "converts a .docx into HTML", async (page) => {
    await uploadDocx(page, "html-docx");
    const html = await page.locator("main textarea[readonly]").first().inputValue();
    assertIncludes(html, "<p>", "the HTML should contain a paragraph");
    assertIncludes(html, "Hello world", "the HTML should contain the document text");
    const t = await mainText(page);
    assertIncludes(t, "Hello world", "the preview should render the document text");
  });

  toolSpec("word-viewer", "reads a .docx and counts its words", async (page) => {
    await uploadDocx(page, "viewer-docx");
    const title = await statValue(page, "Title");
    const author = await statValue(page, "Author");
    assertEqual(title, "Audit Fixture", "the document title from docProps/core.xml");
    assertEqual(author, "Alice Reviewer", "the document author from docProps/core.xml");
    const words = await statValue(page, "Words");
    assert(Number(words) > 0, `the word count should be positive, got ${words}`);
    const t = await mainText(page);
    assertIncludes(t, "Hello world", "the preview should render the document text");
  });

  /* ---- notepads --------------------------------------------------------- */

  /**
   * The three notepad tools share one workspace. The audit brief keeps user
   * content in the memory only, so the spec asserts that nothing is written
   * to the browser storage, that the text can be downloaded and that the
   * "Clear all text" control empties the editor.
   */
  async function notepadSpec(page) {
    const t = await mainText(page);
    assertIncludes(
      t,
      "Clear all text",
      "the notepad must offer a control that clears the text",
    );

    const before = await page.evaluate(() => ({
      local: Object.keys(window.localStorage).length,
      session: Object.keys(window.sessionStorage).length,
    }));

    await page.locator("main textarea").first().fill("hello world");
    await sleep(900);
    const characters = await statValue(page, "Characters");
    const words = await statValue(page, "Words");
    assertEqual(characters, "11", "the character count of the typed text");
    assertEqual(words, "2", "the word count of the typed text");

    // The text must stay in the memory of the tab.
    const after = await page.evaluate(() => ({
      local: Object.keys(window.localStorage).length,
      session: Object.keys(window.sessionStorage).length,
      localKeys: Object.keys(window.localStorage),
    }));
    assertEqual(
      after.local,
      before.local,
      `the notepad must not write to the local storage, it added ${JSON.stringify(after.localKeys)}`,
    );
    assertEqual(
      after.session,
      before.session,
      "the notepad must not write to the session storage",
    );

    // The note is kept by downloading it.
    const pending = page.waitForEvent("download", { timeout: 20000 });
    await clickButton(page, "Download");
    const download = await pending;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const saved = Buffer.concat(chunks).toString("utf8");
    assertEqual(
      saved,
      "hello world",
      "the downloaded file must hold the text that was typed",
    );

    // The clear control empties the editor again.
    await clickButton(page, "Clear all text");
    await sleep(400);
    const cleared = await page.locator("main textarea").first().inputValue();
    assertEqual(cleared, "", "the editor must be empty after the clear control");
    assertEqual(
      await statValue(page, "Characters"),
      "0",
      "the character count must be zero after the clear control",
    );
  }

  toolSpec("notepad-plus-plus-online", "edits text in the memory only and can clear it", async (page) => {
    await notepadSpec(page);
  });

  toolSpec("online-notepad", "edits text in the memory only and can clear it", async (page) => {
    await notepadSpec(page);
  });

  toolSpec(
    "rapidtables-notepad-alternative",
    "edits text in the memory only and can clear it",
    async (page) => {
      await notepadSpec(page);
    },
  );

  /* ---- dice ------------------------------------------------------------- */

  toolSpec("d20-roller", "keeps the higher die on advantage and adds the modifier", async (page) => {
    await clickButton(page, "Roll d20");
    await sleep(400);
    const normal = await statValue(page, "Kept die");
    const kept = Number(normal);
    assert(
      kept >= 1 && kept <= 20,
      `a d20 must be between 1 and 20, got ${JSON.stringify(normal)}`,
    );
    const total = Number(await statValue(page, "Total"));
    assertEqual(total, kept, "the total of a normal roll is the kept die");

    await page.locator("#dice-modifier").fill("3");
    await sleep(400);
    await clickButton(page, "Roll d20");
    await sleep(400);
    const keptWithModifier = Number(await statValue(page, "Kept die"));
    const totalWithModifier = Number(await statValue(page, "Total"));
    assertEqual(
      totalWithModifier,
      keptWithModifier + 3,
      "the total is the kept die plus the modifier",
    );

    await selectOption(page, "advantage");
    await sleep(400);
    await clickButton(page, "Roll d20");
    await sleep(400);
    const faces = await diceFaces(page);
    assertEqual(faces.length, 2, "advantage rolls two dice");
    const values = faces.map((f) => f.value);
    const keptAdvantage = Number(await statValue(page, "Kept die"));
    assertEqual(
      keptAdvantage,
      Math.max(...values),
      "advantage keeps the higher of the two dice",
    );
    assertEqual(
      faces.find((f) => f.value === keptAdvantage).state.toLowerCase(),
      "kept",
      "the higher die is marked as kept",
    );

    await selectOption(page, "disadvantage");
    await sleep(400);
    await clickButton(page, "Roll d20");
    await sleep(400);
    const lowFaces = await diceFaces(page);
    const lowValues = lowFaces.map((f) => f.value);
    const keptDisadvantage = Number(await statValue(page, "Kept die"));
    assertEqual(
      keptDisadvantage,
      Math.min(...lowValues),
      "disadvantage keeps the lower of the two dice",
    );
  });
}
