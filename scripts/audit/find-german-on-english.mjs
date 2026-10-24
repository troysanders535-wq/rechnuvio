/**
 * Find German text that the English pages still show.
 *
 * The mirror image of `find-untranslated-ui.mjs`: that script reports English
 * left on the German pages, this one reports German left on the English
 * pages. A catalogue that carries German under an English key, a hardcoded
 * German literal, or a metadata block that ignores the locale all end up
 * here.
 *
 * The judgement is exact rather than heuristic. Every German message value
 * is known, so a visible segment is German when it equals a German catalogue
 * value and equals no English catalogue value. Segments that carry a German
 * letter (ä, ö, ü, ß) are reported as well, unless the English catalogue
 * contains the same text - a proper noun such as "Baden-Württemberg" is
 * legitimate on an English page about Germany.
 *
 * Usage:
 *   node scripts/audit/find-german-on-english.mjs --port=3100 [--workers=4]
 */

import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";
import { GERMAN_STATES } from "../../src/utils/germanCalendar.ts";

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

/** Every leaf text of the rendered page, plus the document title and the meta description. */
const EXTRACT = () => {
  const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");
  const parts = [];

  parts.push(document.title || "");
  const desc = document.querySelector('meta[name="description"]');
  if (desc) parts.push(desc.getAttribute("content") || "");
  const og = document.querySelector('meta[property="og:title"]');
  if (og) parts.push(og.getAttribute("content") || "");

  const scope = document.body.cloneNode(true);
  scope.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  scope
    .querySelectorAll(
      "span, p, h1, h2, h3, h4, h5, li, td, th, label, button, option, legend, summary, figcaption, a",
    )
    .forEach((el) => {
      if (
        el.querySelector(
          "span, p, h1, h2, h3, h4, h5, li, td, th, label, button, option, legend, summary, figcaption, a",
        )
      ) {
        return;
      }
      const clone = el.cloneNode(true);
      clone.querySelectorAll("option, textarea, input, select").forEach((n) => n.remove());
      const t = txt(clone);
      if (t) parts.push(t);
    });

  return parts;
};

function collectValues(node, into) {
  if (typeof node === "string") {
    into.add(node.trim().toLowerCase());
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectValues(value, into);
  }
}

const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
const GERMAN_LETTER = /[äöüÄÖÜß]/;

/**
 * Proper nouns that German and English spell the same way.
 *
 * The calendar tools list the German federal states on an English page. A
 * state whose English name is the same as its German name ("Berlin",
 * "Schleswig-Holstein") is a name in both languages, so it is not
 * untranslated text. A state with a different English name ("Bayern" versus
 * "Bavaria") is German text on an English page and is reported.
 */
const ALLOWED_PROPER_NOUNS = new Set();
const GERMAN_ONLY_PROPER_NOUNS = new Set();

for (const state of GERMAN_STATES) {
  const de = norm(state.nameDe);
  const en = norm(state.nameEn);
  if (!de || de === en) {
    ALLOWED_PROPER_NOUNS.add(de);
  } else {
    GERMAN_ONLY_PROPER_NOUNS.add(de);
  }
}

async function readPage(context, slug) {
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/tools/${slug}?locale=en`, {
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
  const en = JSON.parse(readFileSync(join(root, "src", "messages", "en.json"), "utf8"));
  const de = JSON.parse(readFileSync(join(root, "src", "messages", "de.json"), "utf8"));
  const enValues = new Set();
  const deValues = new Set();
  collectValues(en, enValues);
  collectValues(de, deValues);

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
      const segments = await readPage(context, tool.slug);
      const name = norm(tool.name);

      const german = [...new Set(segments)].filter((s) => {
        const n = norm(s);
        if (!n || n === name) return false;
        if (ALLOWED_PROPER_NOUNS.has(n)) return false;
        if (GERMAN_ONLY_PROPER_NOUNS.has(n)) return true;
        if (enValues.has(n)) return false;
        if (deValues.has(n)) return true;
        return GERMAN_LETTER.test(s);
      });

      results.push({ slug: tool.slug, engine: tool.engine, german });
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${TOOLS_CATALOG.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();

  const out = join(root, "docs", "audit-evidence", "german-on-english.json");
  writeFileSync(out, JSON.stringify(results, null, 1), "utf8");

  const flagged = results.filter((r) => r.german.length);
  const total = flagged.reduce((sum, r) => sum + r.german.length, 0);
  console.log(`\ntools with German on the English page: ${flagged.length}`);
  console.log(`German segments: ${total}`);

  const byEngine = new Map();
  for (const r of flagged) {
    if (!byEngine.has(r.engine)) byEngine.set(r.engine, []);
    byEngine.get(r.engine).push(r);
  }
  for (const [engine, list] of [...byEngine].sort((a, b) => b[1].length - a[1].length)) {
    const segments = [...new Set(list.flatMap((r) => r.german))];
    console.log(`\n=== ${engine} (${list.length} tools, ${segments.length} distinct)`);
    for (const s of segments.slice(0, 40)) console.log(`   "${s}"`);
    console.log(`   tools: ${list.map((r) => r.slug).join(", ")}`);
  }
  console.log(`\nwritten: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
