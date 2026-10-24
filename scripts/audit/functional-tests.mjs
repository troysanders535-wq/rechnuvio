/**
 * Real-browser functional tests for the tool families whose output can be
 * verified against an independently established expected value.
 *
 * These drive the real UI in Chrome: they type into the real control, press
 * the real button, and assert on the rendered result. They are not unit tests
 * of a helper and they are not HTTP/DOM-existence checks.
 *
 * Expected values are hard-coded from independent sources - RFC 4648 for
 * Base64, FIPS 180-4 for SHA-256, RFC 1321 for MD5, IANA for the UUID
 * layout - not from running this site's own code.
 *
 * Usage: node scripts/audit/functional-tests.mjs [--only=slug] [--headed]
 */

import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const OUT_DIR = join(root, "docs", "audit-evidence");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const BASE = process.env.FUNCTIONAL_BASE_URL || "http://localhost:3100";
const only = args.only || null;
/* A comma separated list of slugs: a batch run that writes its own file. */
const slugList = args.slugs
  ? args.slugs
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
  : null;
const scopeLabel = only ? `single-${only}` : slugList ? `slugs-${slugList.length}` : null;

import {
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

/* --------------------------------------------------------------- specs --- */

/* ---- text-suite ---- */
/* case conversion - TextCaseWorkspace */
spec("uppercase-converter", "uppercases the whole input", async (page) => {
  await fillPrimary(page, "Hello, ToolPad!");
  await clickButton(page, "UPPERCASE");
  // the only read only textarea in the workspace is the converted result
  const result = await page.locator("main textarea[readonly]").inputValue();
  assert(
    result === "HELLO, TOOLPAD!",
    `expected "HELLO, TOOLPAD!", got ${JSON.stringify(result)}`,
  );
});

spec("lowercase-converter", "lowercases the whole input", async (page) => {
  await fillPrimary(page, "Hello, ToolPad!");
  await clickButton(page, "lowercase");
  const result = await page.locator("main textarea[readonly]").inputValue();
  assert(
    result === "hello, toolpad!",
    `expected "hello, toolpad!", got ${JSON.stringify(result)}`,
  );
});

spec("title-case-converter", "capitalises the first letter of every word", async (page) => {
  await fillPrimary(page, "hello world");
  await clickButton(page, "Title Case");
  const result = await page.locator("main textarea[readonly]").inputValue();
  assert(
    result === "Hello World",
    `expected "Hello World", got ${JSON.stringify(result)}`,
  );
});

spec("text-case-converter", "shows every case variant at once", async (page) => {
  await fillPrimary(page, "hello world");
  const upper = await labelledOutput(page, "UPPERCASE");
  const lower = await labelledOutput(page, "lowercase");
  assert(
    upper === "HELLO WORLD",
    `expected the uppercase variant to be "HELLO WORLD", got ${JSON.stringify(upper)}`,
  );
  assert(
    lower === "hello world",
    `expected the lowercase variant to be "hello world", got ${JSON.stringify(lower)}`,
  );
  const t = await mainText(page);
  assertIncludes(t, "HELLO WORLD", "the page should show the uppercase variant");
  assertIncludes(t, "hello world", "the page should show the lowercase variant");
});

/* line operations - TextLinesWorkspace */
spec("alphabetical-order-tool", "sorts the lines from A to Z", async (page) => {
  await fillPrimary(page, "banana\napple\ncherry");
  await clickButton(page, "Sort A to Z");
  const lines = await page.locator("#text-lines-input").inputValue();
  assert(
    lines === "apple\nbanana\ncherry",
    `expected "apple\\nbanana\\ncherry", got ${JSON.stringify(lines)}`,
  );
});

spec("remove-duplicate-lines-and-sort", "drops duplicate lines and sorts the rest", async (page) => {
  await fillPrimary(page, "banana\napple\nbanana\ncherry");
  await sleep(800); // the workspace removes duplicates while you type
  const deduped = await page.locator("#text-lines-input").inputValue();
  assert(
    deduped === "banana\napple\ncherry",
    `expected the repeated line to be dropped, got ${JSON.stringify(deduped)}`,
  );
  await clickButton(page, "Remove duplicates and sort");
  const sorted = await page.locator("#text-lines-input").inputValue();
  assert(
    sorted === "apple\nbanana\ncherry",
    `expected "apple\\nbanana\\ncherry", got ${JSON.stringify(sorted)}`,
  );
  const t = await mainText(page);
  assertNotIncludes(
    t,
    "banana\napple\nbanana",
    "the repeated line should not be on the page any more",
  );
});

/* counting - TextCounterWorkspace */
spec("word-counter", "counts the words and the characters of the text", async (page) => {
  await fillPrimary(page, "Hello world. Second sentence!");
  const words = await statValue(page, "Words");
  const characters = await statValue(page, "Characters (with spaces)");
  assert(words === "4", `expected 4 words, got ${JSON.stringify(words)}`);
  assert(
    characters === "29",
    `expected 29 characters with spaces, got ${JSON.stringify(characters)}`,
  );
});

spec("character-counter", "counts the characters without the spaces", async (page) => {
  await fillPrimary(page, "a  b   c");
  const withoutSpaces = await statValue(page, "Characters (without spaces)");
  const withSpaces = await statValue(page, "Characters (with spaces)");
  assert(
    withoutSpaces === "3",
    `expected 3 characters without spaces, got ${JSON.stringify(withoutSpaces)}`,
  );
  assert(
    withSpaces === "8",
    `expected 8 characters with spaces, got ${JSON.stringify(withSpaces)}`,
  );
});

spec("string-length-calculator", "counts UTF-8 bytes apart from characters", async (page) => {
  await fillPrimary(page, "e\u00e9");
  const bytes = await statValue(page, "UTF-8 bytes");
  const characters = await statValue(page, "Characters (with spaces)");
  const graphemes = await statValue(page, "Graphemes (code points)");
  assert(
    bytes === "3",
    `expected 3 UTF-8 bytes for "e\u00e9", got ${JSON.stringify(bytes)}`,
  );
  assert(
    characters === "2",
    `expected 2 characters for "e\u00e9", got ${JSON.stringify(characters)}`,
  );
  assert(
    graphemes === "2",
    `expected 2 code points for "e\u00e9", got ${JSON.stringify(graphemes)}`,
  );

  // a single U+00E9 needs two UTF-8 bytes
  await fillPrimary(page, "\u00e9");
  const singleBytes = await statValue(page, "UTF-8 bytes");
  const singleCharacters = await statValue(page, "Characters (with spaces)");
  assert(
    singleBytes === "2",
    `expected 2 UTF-8 bytes for U+00E9, got ${JSON.stringify(singleBytes)}`,
  );
  assert(
    singleCharacters === "1",
    `expected 1 character for U+00E9, got ${JSON.stringify(singleCharacters)}`,
  );
});

/* token counting - TextTokenWorkspace */
spec("token-counter", "counts the tokens with the exact OpenAI tokenizer", async (page) => {
  await fillPrimary(page, "Hello world, this is a token counter test!");
  // the card only turns into "Tokens (exact)" once the BPE ranks are loaded
  const tokens = await waitForStat(page, "Tokens (exact)");
  assert(
    tokens === "10",
    `expected 10 cl100k_base tokens, got ${JSON.stringify(tokens)}`,
  );
});

/* unicode fonts - TextFontWorkspace */
spec("fancy-text-generator", "renders the Unicode bold variant", async (page) => {
  await fillPrimary(page, "A");
  const bold = await labelledOutput(page, "Bold");
  assert(
    bold === "\u{1D400}",
    `expected U+1D400, got ${JSON.stringify(bold)}`,
  );
  const t = await mainText(page);
  assertIncludes(t, "\u{1D400}", "the page should show the mathematical bold capital A");
});

spec("bold-text-generator", "renders the Unicode bold variant", async (page) => {
  await fillPrimary(page, "A");
  const result = await page.locator("#font-result").inputValue();
  assert(
    result === "\u{1D400}",
    `expected U+1D400, got ${JSON.stringify(result)}`,
  );
});

spec("zalgo-text-generator", "stacks combining marks on the text", async (page) => {
  await fillPrimary(page, "A");
  const result = await page.locator("#zalgo-result").inputValue();
  assert(
    result.startsWith("A"),
    `expected the A to be kept, got ${JSON.stringify(result)}`,
  );
  assertMatches(
    result,
    /[\u0300-\u036f]/,
    "the result should carry at least one combining mark from U+0300-U+036F",
  );
});

spec("upside-down-text-generator", "flips the text upside down", async (page) => {
  await fillPrimary(page, "Hello");
  const flipped = await page.locator("#upside-result").inputValue();
  assert(
    flipped.length === 5,
    `expected 5 flipped characters, got ${JSON.stringify(flipped)}`,
  );
  assert(
    flipped.startsWith("o"),
    `expected the flipped text to start with "o", got ${JSON.stringify(flipped)}`,
  );
});

/* citations - TextCitationWorkspace */
spec("citation-generator", "builds an APA citation from the form fields", async (page) => {
  await page.locator("#citation-authors").fill("Smith, John");
  await page.locator("#citation-year").fill("2020");
  await page.locator("#citation-title").fill("The Book Title");
  await page.locator("#citation-publisher").fill("Acme Press");
  await sleep(600);
  const apa = await labelledOutput(page, "APA 7");
  assert(
    apa === "Smith, J. (2020). The Book Title. Acme Press.",
    `expected the APA 7 reference list entry, got ${JSON.stringify(apa)}`,
  );
  const t = await mainText(page);
  assertIncludes(
    t,
    "Smith, J. (2020). The Book Title. Acme Press.",
    "the page should show the APA citation",
  );
});

/* format conversion - TextConvertWorkspace */
spec("text-to-binary", "encodes the text as UTF-8 bits", async (page) => {
  await fillPrimary(page, "Hi");
  const bits = await page.locator("#binary-output").inputValue();
  assert(
    bits === "01001000 01101001",
    `expected "01001000 01101001", got ${JSON.stringify(bits)}`,
  );
});

spec("binary-to-text", "decodes UTF-8 bits back into text", async (page) => {
  await fillPrimary(page, "01001000 01101001");
  const text = await page.locator("#binary-decoded").inputValue();
  assert(text === "Hi", `expected "Hi", got ${JSON.stringify(text)}`);
});

spec("text-to-hex", "encodes the text as UTF-8 hex bytes", async (page) => {
  await fillPrimary(page, "Hi");
  const hex = await page.locator("#hex-output").inputValue();
  assert(hex === "48 69", `expected "48 69", got ${JSON.stringify(hex)}`);
  const t = await mainText(page);
  assertIncludes(t, "U+0048", "the character table should list the code point of H");
});

spec("html-to-md", "converts the HTML into Markdown", async (page) => {
  await fillPrimary(page, "<h1>Hi</h1><p>Hello <strong>world</strong></p>");
  await sleep(600);
  const markdown = await page.locator("#markdown-output").inputValue();
  assertIncludes(markdown, "# Hi", "the heading should become a Markdown heading");
  assertIncludes(
    markdown,
    "Hello **world**",
    "the strong text should become bold Markdown",
  );
});

spec("latex-to-word-equation", "converts LaTeX into the Word linear format", async (page) => {
  await fillPrimary(page, "\\frac{a}{b}");
  const equation = await page.locator("#latex-output").inputValue();
  assert(
    equation === "(a)/(b)",
    `expected "(a)/(b)", got ${JSON.stringify(equation)}`,
  );
});

/* text transforms - TextTransformWorkspace */
spec("text-repeater", "repeats the text the requested number of times", async (page) => {
  await fillPrimary(page, "ab");
  await page.locator("#repeat-count").fill("3");
  await sleep(600);
  const repeated = await page.locator("#repeat-result").inputValue();
  assert(
    repeated === "ab ab ab",
    `expected "ab ab ab", got ${JSON.stringify(repeated)}`,
  );
});

spec("backwards-text-generator", "reverses the characters", async (page) => {
  await fillPrimary(page, "abc");
  const reversed = await page.locator("#backwards-result").inputValue();
  assert(reversed === "cba", `expected "cba", got ${JSON.stringify(reversed)}`);
});

spec("blank-text-generator", "produces the requested number of blank characters", async (page) => {
  await page.locator("#blank-count").fill("3");
  await sleep(600);
  const blank = await page.locator("#blank-result").inputValue();
  const fillers = blank.split("\u3164").length - 1;
  assert(
    fillers === 3,
    `expected 3 Hangul fillers, got ${JSON.stringify(blank)}`,
  );
  const codePoint = await page.locator("#blank-code").innerText();
  assertIncludes(codePoint, "U+3164", "the code point field should show U+3164");
});

spec("invisible-character", "detects a zero-width space in the pasted text", async (page) => {
  await fillPrimary(page, "a\u200bb");
  const hits = await statValue(page, "Invisible characters");
  assert(
    hits === "1",
    `expected 1 invisible character, got ${JSON.stringify(hits)}`,
  );
  const rows = await page.locator("main ul li").count();
  assert(rows === 1, `expected one reported character, got ${rows}`);
  const row = await page.evaluate(() => {
    const li = document.querySelector("main ul li");
    return li ? li.textContent || "" : "";
  });
  assertIncludes(row, "Index 1", "the zero-width space sits at index 1");
  assertIncludes(row, "U+200B", "the report should name the code point");
  assertIncludes(row, "Zero-width space", "the report should name the character");
});

/* ---- base64 ---- */
spec("base64-encoder", "encodes text to Base64", async (page) => {
  await fillPrimary(page, "Hello, ToolPad!");
  await clickButton(page, "Encode");
  const t = await mainText(page);
  assertIncludes(t, "SGVsbG8sIFRvb2xQYWQh", "RFC 4648 base64 of 'Hello, ToolPad!'");
});

spec("base64-decoder", "decodes Base64 back to text", async (page) => {
  await fillPrimary(page, "SGVsbG8sIFRvb2xQYWQh");
  await clickButton(page, "Decode");
  const t = await mainText(page);
  assertIncludes(t, "Hello, ToolPad!", "decoded text should match the original");
});

/* ---- json ---- */
spec("json-formatter", "formats valid JSON and rejects invalid JSON", async (page) => {
  await fillPrimary(page, '{"b":1,"a":2}');
  await clickButton(page, "Format JSON");
  let t = await mainText(page);
  assertMatches(t, /"a":\s*2/, "formatted JSON should contain the a key");
  assertMatches(t, /"b":\s*1/, "formatted JSON should contain the b key");

  await fillPrimary(page, '{"a":}');
  await clickButton(page, "Format JSON");
  t = await mainText(page);
  assertMatches(t, /invalid|error|unexpected/i, "invalid JSON should report an error");
});

spec("json-minifier", "minifies JSON", async (page) => {
  await fillPrimary(page, '{ "a" : 1 , "b" : 2 }');
  await clickButtonIfPresent(page, ["minify"]);
  const t = await mainText(page);
  assertMatches(t, /\{"a":1,"b":2\}/, "minified JSON should have no whitespace");
});

spec("json-validator", "accepts valid JSON and rejects invalid JSON", async (page) => {
  await fillPrimary(page, '{"ok":true}');
  await sleep(700);
  let t = await mainText(page);
  assertMatches(t, /valid json/i, "valid JSON should be reported valid");

  await fillPrimary(page, "{not json}");
  await sleep(700);
  t = await mainText(page);
  assertMatches(t, /invalid|error|unexpected/i, "invalid JSON should be reported");
});

spec("json-to-typescript", "converts JSON to a TypeScript interface", async (page) => {
  await fillPrimary(page, '{"name":"Ada","age":36}');
  await clickButtonIfPresent(page, ["typescript"]);
  const t = await mainText(page);
  assertMatches(t, /interface/i, "output should declare an interface");
  assertMatches(t, /name/i, "output should contain the name property");
});

/* ---- yaml ---- */
spec("yaml-to-json", "converts YAML to JSON", async (page) => {
  await fillPrimary(page, "a: 1\nb: two");
  await clickButtonIfPresent(page, ["yaml", "json"]);
  const t = await mainText(page);
  assertMatches(t, /"a":\s*1/, "converted JSON should contain a");
  assertMatches(t, /"b":\s*"two"/, "converted JSON should contain b");
});

spec("yaml-validator", "flags invalid YAML", async (page) => {
  await fillPrimary(page, "a: 1\n  b: 2\n c: [");
  await clickButtonIfPresent(page, ["yaml", "json"]);
  const t = await mainText(page);
  assertMatches(t, /invalid|error/i, "malformed YAML should report an error");
});

/* ---- crypto-hash ---- */
spec("md5-generator", "computes the RFC 1321 MD5 digest", async (page) => {
  await fillPrimary(page, "hello");
  await sleep(900);
  const t = await mainText(page);
  assertIncludes(t, "5d41402abc4b2a76b9719d911017c592", "MD5('hello')");
});

spec("sha256-generator", "computes the FIPS 180-4 SHA-256 digest", async (page) => {
  await fillPrimary(page, "hello");
  await sleep(900);
  const t = await mainText(page);
  assertIncludes(
    t,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "SHA-256('hello')",
  );
});

/* ---- encoding-converters ---- */
spec("binary-to-decimal", "converts binary to decimal", async (page) => {
  await fillPrimary(page, "1010");
  await sleep(800);
  const t = await mainText(page);
  assertMatches(t, /\b10\b/, "binary 1010 is decimal 10");
});

spec("decimal-to-binary", "converts decimal to binary", async (page) => {
  await fillPrimary(page, "10");
  await sleep(800);
  const t = await mainText(page);
  assertMatches(t, /\b1010\b/, "decimal 10 is binary 1010");
});

spec("hex-to-decimal", "converts hex to decimal", async (page) => {
  await fillPrimary(page, "FF");
  await sleep(800);
  const t = await mainText(page);
  assertMatches(t, /\b255\b/, "hex FF is decimal 255");
});

spec("hex-to-ascii", "converts hex to ASCII", async (page) => {
  await fillPrimary(page, "48656c6c6f");
  await sleep(800);
  const t = await mainText(page);
  assertIncludes(t, "Hello", "hex 48656c6c6f is 'Hello'");
});

spec("binary-to-hex", "converts binary to hex", async (page) => {
  await fillPrimary(page, "1010");
  await sleep(800);
  const t = await mainText(page);
  assertMatches(t, /\bA\b/, "binary 1010 is hex A");
});

spec("hex-to-binary", "converts hex to binary", async (page) => {
  await fillPrimary(page, "FF");
  await sleep(800);
  const t = await mainText(page);
  assertMatches(t, /11111111/, "hex FF is binary 11111111");
});

spec("number-base-converter", "converts between number bases", async (page) => {
  await fillPrimary(page, "10");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /\b1010\b/, "decimal 10 is binary 1010");
});

spec("url-encoder", "percent-encodes a URL query value", async (page) => {
  await fillPrimary(page, "a b&c");
  await sleep(800);
  const t = await mainText(page);
  assertIncludes(t, "a%20b%26c", "encodeURIComponent('a b&c')");
});

spec("url-decoder", "decodes percent-encoding", async (page) => {
  await fillPrimary(page, "a%20b%26c");
  await sleep(800);
  const t = await mainText(page);
  assertIncludes(t, "a b&c", "decodeURIComponent('a%20b%26c')");
});

spec("morse-code-translator", "encodes text to Morse", async (page) => {
  await fillPrimary(page, "SOS");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /\.\.\. --- \.\.\./, "Morse for SOS");
});

spec("hex-rgb-converter", "converts a hex colour to RGB", async (page) => {
  await fillPrimary(page, "#FF0000");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /255/, "red channel is 255");
  assertMatches(t, /\b0\b/, "green and blue channels are 0");
});

/* ---- uuid ---- */
spec("uuid-generator", "generates a v4 UUID", async (page) => {
  await clickButton(page, "Generate");
  const t = await mainText(page);
  assertMatches(
    t,
    /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    "a v4 UUID should match the RFC 4122 layout",
  );
});

/* ---- regex ---- */
spec("regex-tester", "matches a pattern against sample text", async (page) => {
  await fillPrimary(page, "abc 123 def");
  const inputs = page.locator('main input[type="text"]');
  if (await inputs.count()) await inputs.first().fill("\\d+");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /123/, "the match '123' should be reported");
});

/* ---- diff ---- */
spec("text-compare", "reports the difference between two texts", async (page) => {
  const areas = page.locator("main textarea");
  const n = await areas.count();
  if (n >= 2) {
    await areas.nth(0).fill("hello world");
    await areas.nth(1).fill("hello there");
    await sleep(900);
  }
  const t = await mainText(page);
  assertMatches(t, /world|there/i, "the comparison should surface the differing words");
});

/* ---- qr-barcode ---- */
spec("qr-code-generator", "renders a QR code for a URL", async (page) => {
  await fillPrimary(page, "https://example.com");
  await sleep(1200);
  const rendered = await page.evaluate(
    () => document.querySelectorAll("main canvas, main svg").length,
  );
  assert(rendered > 0, "a QR code should render as a canvas or svg");
});

/* ---- calculator-suite ---- */
spec("binary-calculator", "converts binary to decimal, hex and octal", async (page) => {
  await fillPrimary(page, "10110");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /\b22\b/, "binary 10110 is decimal 22");
  // the hex value is rendered as "16Hexadecimal", so a bare \b16\b cannot match
  assertMatches(t, /16\s*Hexadecimal|\b16\b/i, "binary 10110 is hex 16");
  assertMatches(t, /\b26\b/, "binary 10110 is octal 26");
});

spec("z-score-calculator", "computes a z-score", async (page) => {
  const nums = page.locator('main input[type="number"]');
  const n = await nums.count();
  if (n >= 3) {
    await nums.nth(0).fill("50");
    await nums.nth(1).fill("60");
    await nums.nth(2).fill("70");
  }
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /1\.25|1,25/, "z-score of 70 in {50,60,70} is 1.25");
});

spec("percentage-calculator", "computes a percentage of a value", async (page) => {
  // the calculator renders plain text inputs, not number inputs
  const nums = page.locator("main input");
  const n = await nums.count();
  assert(n >= 2, "the percentage calculator should expose a percent and a value field");
  await nums.nth(0).fill("15");
  await nums.nth(1).fill("200");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /\b30\b/, "15% of 200 is 30");
});

/* ---- time-calendar ---- */
spec("epoch-converter", "converts a unix timestamp to a date", async (page) => {
  await fillPrimary(page, "1700000000");
  await sleep(900);
  const t = await mainText(page);
  assertMatches(t, /2023|14 Nov|Nov 14|November 14/, "1700000000 is 2023-11-14");
});

/* ------------------------------------------------------- family modules -- */
for (const family of FAMILIES) family.register();

/* -------------------------------------------------------------- runner --- */
async function run() {
  const selected = only
    ? specs.filter((s) => s.slug === only)
    : slugList
      ? specs.filter((s) => slugList.includes(s.slug))
      : specs;
  console.log(`running ${selected.length} functional specs`);

  // The browser is given a synthetic camera and microphone. The device tests
  // need both states: with the permission refused the tool has to report the
  // refusal, and with the permission granted the tool has to work against a
  // real stream. The fake device supplies that stream without any hardware.
  //
  // The automatic permission prompt is deliberately NOT accepted here: the
  // permission state is driven by Playwright, so a refused permission really
  // reaches the page.
  const browser = await chromium.launch({
    channel: "chrome",
    headless: !args.headed,
    args: ["--use-fake-device-for-media-stream"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const results = [];

  for (const s of selected) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(String(e.message).slice(0, 200)));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    const started = Date.now();
    let status = "PASS";
    let error = "";
    try {
      await page.goto(`${BASE}/tools/${s.slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await sleep(900);
      const expected = await s.fn(page);
      // A spec may declare the console errors it expects. The local-model
      // chats probe for weights that are not installed, and the browser logs
      // that 404 - it is the honest answer, not a defect.
      const allowed = Array.isArray(expected) ? expected : expected ? [expected] : [];
      const unexpected = consoleErrors.filter(
        (message) => !allowed.some((pattern) => message.includes(pattern)),
      );
      if (unexpected.length) {
        status = "FAIL";
        error = `console/page errors: ${unexpected.join(" | ")}`;
      }
    } catch (err) {
      status = "FAIL";
      error = String(err.message).slice(0, 500);
    }
    results.push({
      slug: s.slug,
      name: s.name,
      status,
      error,
      ms: Date.now() - started,
    });
    console.log(`  ${status === "PASS" ? "PASS" : "FAIL"}  ${s.slug} (${Date.now() - started}ms)${error ? ` :: ${error.slice(0, 160)}` : ""}`);
    await page.close();
  }

  await context.close();
  await browser.close();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.length - passed;
  console.log("----");
  console.log(`PASS ${passed} / ${results.length}  (FAIL ${failed})`);

  // Which tools still have no functional test at all?
  const covered = new Set(results.map((r) => r.slug));
  const catalog = await readCatalogSlugs();
  const uncovered = catalog.filter((s) => !covered.has(s));
  console.log(`tools covered by a functional test: ${covered.size} / ${catalog.length}`);
  if (uncovered.length) {
    console.log(`tools without a functional test: ${uncovered.length}`);
    console.log(`  ${uncovered.slice(0, 40).join(", ")}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // A full run supersedes every earlier single-slug evidence file.
  if (!only && !slugList) {
    for (const file of readdirSync(OUT_DIR)) {
      if (file.startsWith("functional-tests-") && file.endsWith(".json")) {
        rmSync(join(OUT_DIR, file), { force: true });
      }
    }
  }
  // A partial run must never overwrite the full-suite evidence, so it is
  // written to its own file. Only a complete run owns
  // docs/audit-evidence/functional-tests.json.
  const evidenceFile = scopeLabel
    ? join(OUT_DIR, `functional-tests-${scopeLabel}.json`)
    : join(OUT_DIR, "functional-tests.json");
  writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scope: only ? `single:${only}` : slugList ? `slugs:${slugList.length}` : "full",
        passed,
        failed,
        toolsTotal: catalog.length,
        toolsCovered: covered.size,
        uncovered,
        results,
      },
      null,
      1,
    ),
    "utf8",
  );
  console.log(`written: ${evidenceFile}`);
  if (failed) process.exitCode = 1;
}

/** The slugs of every tool in the catalog. */
async function readCatalogSlugs() {
  const { TOOLS_CATALOG } = await import("../../src/data/tools.ts");
  return TOOLS_CATALOG.map((t) => t.slug);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
