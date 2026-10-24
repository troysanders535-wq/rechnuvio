/**
 * Find the English text that the German page still shows.
 *
 * The control labels, the headings and the prose of every tool workspace are
 * read out of the live German page and compared with the English page: a
 * segment that appears on both pages was never translated.
 *
 * The result is the exact list of strings that still have to be localised -
 * no guessing from the source, and no missing a string that only appears in
 * the rendered DOM.
 *
 * Usage:
 *   node scripts/audit/find-untranslated-ui.mjs --port=3100 [--workers=4]
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const PORT = args.port || "3100";
const WORKERS = Number(args.workers || 4);
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The visible text of the workspace.
 *
 * The workspace is everything between the page header and the "Key Features"
 * section: the tool's own controls, results and notes. The page chrome is
 * dropped, and so is every element whose text comes from its value (an input
 * or a textarea renders its content as a value, not as text).
 */
const EXTRACT = () => {
  const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");

  const main = document.querySelector("main");
  const scope = main ? main.cloneNode(true) : document.createDocumentFragment();
  scope.querySelectorAll("header, footer, nav, script, style").forEach((n) => n.remove());

  const STOP =
    /key features|frequently asked|how to use|related|hauptmerkmale|häufig gestellte|so verwenden|ähnliche|sofortige|sofort berechnen|inhaltsverzeichnis|tool teilen|link kopiert|share tool/i;
  scope.querySelectorAll("h2, h3").forEach((h) => {
    if (STOP.test(txt(h))) {
      const block = h.closest("section") || h.parentElement;
      if (block && block.parentElement) block.remove();
    }
  });

  const parts = [];
  scope
    .querySelectorAll(
      "span, p, h1, h2, h3, h4, h5, li, td, th, label, button, option, legend, summary, figcaption, code, pre, blockquote",
    )
    .forEach((el) => {
      // The element must not be a container of other collected elements,
      // otherwise every word appears again inside its parent.
      if (el.querySelector("span, p, h1, h2, h3, h4, h5, li, td, th, label, button, option, legend, summary, figcaption")) {
        return;
      }
      // A label wraps its control, and the control carries the text of the
      // value (the sample code of a textarea). The control is removed before
      // the label text is read.
      const clone = el.cloneNode(true);
      clone.querySelectorAll("option, textarea, input, select").forEach((n) => n.remove());
      const t = txt(clone);
      if (t) parts.push(t);
    });

  return parts;
};

/** The tool name, which is the same in both locales and is not a defect. */
const nameOf = (slug) => {
  const tool = TOOLS_CATALOG.find((t) => t.slug === slug);
  return tool ? tool.name : "";
};

/** A segment is worth reporting when it carries a real English word. */
const ENGLISH_WORD = /[a-z]{2,}/;

async function readPage(context, slug, locale) {
  const page = await context.newPage();
  try {
    // The locale is pinned with the query parameter. The middleware stores
    // the locale in a cookie, and a cookie from the German request would
    // otherwise turn the next English request into a German one.
    await page.goto(`${BASE}/tools/${slug}?locale=${locale}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await sleep(700);
    return await page.evaluate(EXTRACT);
  } catch {
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  let index = 0;
  let done = 0;

  const worker = async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
    });
    while (index < TOOLS_CATALOG.length) {
      const i = index;
      index += 1;
      const tool = TOOLS_CATALOG[i];
      const en = await readPage(context, tool.slug, "en");
      const de = await readPage(context, tool.slug, "de");
      const enSet = new Set(en.map((s) => s.toLowerCase()));
      const shared = [...new Set(de.filter((s) => enSet.has(s.toLowerCase())))];
      const name = nameOf(tool.slug).toLowerCase();
      const untranslated = shared.filter(
        (s) => ENGLISH_WORD.test(s) && s.toLowerCase() !== name && s.length > 2,
      );
      results.push({ slug: tool.slug, engine: tool.engine, untranslated });
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${TOOLS_CATALOG.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();

  const out = join(root, "docs", "audit-evidence", "untranslated-ui.json");
  writeFileSync(out, JSON.stringify(results, null, 1), "utf8");

  const total = results.reduce((sum, r) => sum + r.untranslated.length, 0);
  const tools = results.filter((r) => r.untranslated.length);
  console.log(`\ntools with untranslated English: ${tools.length}`);
  console.log(`untranslated segments: ${total}`);

  const byEngine = new Map();
  for (const r of results) {
    if (!r.untranslated.length) continue;
    if (!byEngine.has(r.engine)) byEngine.set(r.engine, []);
    byEngine.get(r.engine).push(r);
  }
  for (const [engine, list] of [...byEngine].sort((a, b) => b[1].length - a[1].length)) {
    const segments = [...new Set(list.flatMap((r) => r.untranslated))];
    console.log(`\n=== ${engine} (${list.length} tools, ${segments.length} distinct)`);
    for (const s of segments.slice(0, 60)) console.log(`   "${s}"`);
    console.log(`   tools: ${list.map((r) => r.slug).join(", ")}`);
  }
  console.log(`\nwritten: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
