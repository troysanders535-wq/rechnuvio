/**
 * Extract each tool's real UI metadata from the rendered page.
 *
 * Reading the live DOM is more reliable than parsing engine source: it
 * captures the labels, placeholders and buttons that are actually on screen
 * for that specific tool variant, in the requested locale.
 *
 * Output: scripts/audit/data/howto-source.json
 *   slug -> { fields, options, actions, headings }
 *
 * Usage:
 *   node scripts/audit/extract-ui-metadata.mjs --locale=en
 *   node scripts/audit/extract-ui-metadata.mjs --locale=de
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dataDir = join(here, "data");
const outFile = join(dataDir, "howto-source.json");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const PORT = args.port || "3100";
const LOCALE = args.locale || "en";
const WORKERS = Number(args.workers || 4);
const LIMIT = args.limit ? Number(args.limit) : null;
// de.localhost does not resolve on every host, so the German locale is selected
// with the middleware's ?locale= override instead of a subdomain.
const BASE = "http://localhost:" + PORT;
const toolUrl = (slug) =>
  `${BASE}/tools/${slug}${LOCALE === "de" ? "?locale=de" : ""}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pull the interactive controls out of the workspace area. The workspace is
 * everything between the page header and the "Key Features" section.
 */
const EXTRACT = () => {
  const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");

  // Work on a detached copy of <main> so the page is never mutated, and drop
  // everything that is page chrome or the trailing features / how-to / FAQ /
  // related-tools block. What remains is the tool workspace itself.
  const main = document.querySelector("main");
  const scope = main ? main.cloneNode(true) : document.createDocumentFragment();
  scope.querySelectorAll("header, footer, nav, script, style").forEach((n) => n.remove());

  const STOP =
    /key features|frequently asked|how to use|related|hauptmerkmale|häufig gestellte|so verwenden|ähnliche|sofortige|sofort berechnen|inhaltsverzeichnis/i;
  scope.querySelectorAll("h2, h3").forEach((h) => {
    if (STOP.test(txt(h))) {
      const block = h.closest("section") || h.parentElement;
      if (block && block.parentElement) block.remove();
    }
  });

  const controls = Array.from(
    scope.querySelectorAll("input, textarea, select, button"),
  );

  const labelFor = (el) => {
    if (el.id) {
      const l = scope.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return { text: txt(l), fromPlaceholder: false };
    }
    const wrapping = el.closest("label");
    if (wrapping) {
      // The control itself lives inside the label, and its own text - the
      // options of a select, the current value of a textarea - would be
      // glued to the label ("ModelQwen2.5 0.5B Instruct"). The control is
      // removed before the label text is read.
      const clone = wrapping.cloneNode(true);
      clone.querySelectorAll("option, textarea, input, select").forEach((n) => n.remove());
      const t = txt(clone);
      if (t) return { text: t.slice(0, 90), fromPlaceholder: false };
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return { text: aria.slice(0, 90), fromPlaceholder: false };
    const ph = el.getAttribute("placeholder");
    if (ph) return { text: ph.slice(0, 90), fromPlaceholder: true };
    let p = el.previousElementSibling;
    for (let i = 0; i < 3 && p; i += 1) {
      const t = txt(p);
      if (t && t.length < 90) return { text: t, fromPlaceholder: false };
      p = p.previousElementSibling;
    }
    return { text: "", fromPlaceholder: false };
  };

  const fields = [];
  const options = [];
  const actions = [];

  // Page chrome that is not part of the tool itself.
  const CHROME =
    /^(share tool|link copied|tool teilen|link kopiert|explore all|open tool|zur startseite|zurück zur startseite|alle anzeigen|tool öffnen|🇩🇪.*|🇺🇸.*|deutsch|english|german|zur startseite)$/i;
  const isChrome = (t) => CHROME.test(t.trim());

  for (const el of controls) {
    const tag = el.tagName;
    if (tag === "BUTTON") {
      const t = txt(el);
      if (t && !isChrome(t) && !actions.includes(t) && t.length < 60) actions.push(t);
      continue;
    }
    if (tag === "SELECT") {
      const values = Array.from(el.options)
        .map((o) => (o.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const label = labelFor(el);
      if (!isChrome(label.text)) {
        options.push({ label: label.text, values, fromPlaceholder: label.fromPlaceholder });
      }
      continue;
    }
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (type === "hidden") continue;
    if (type === "file") {
      const label = labelFor(el);
      fields.push({
        label: label.text || "File",
        fromPlaceholder: label.fromPlaceholder,
        type: "file",
        accept: el.getAttribute("accept") || "",
        required: el.required === true,
      });
      continue;
    }
    if (type === "checkbox" || type === "radio") {
      const label = labelFor(el);
      options.push({ label: label.text, values: [], fromPlaceholder: label.fromPlaceholder });
      continue;
    }
    const label = labelFor(el);
    fields.push({
      label: label.text,
      fromPlaceholder: label.fromPlaceholder,
      type: tag === "TEXTAREA" ? "textarea" : type,
      placeholder: (el.getAttribute("placeholder") || "").slice(0, 80),
      required: el.required === true,
    });
  }

  const headings = Array.from(scope.querySelectorAll("h3"))
    .map((h) => txt(h))
    .filter(Boolean)
    .slice(0, 12);

  return {
    fields: fields.filter((f) => f.label),
    options: options.filter((o) => o.label && o.values.length),
    actions: actions.slice(0, 10),
    headings,
  };
};

async function extract(context, tool) {
  const page = await context.newPage();
  const out = { slug: tool.slug, engine: tool.engine };
  try {
    await page.goto(toolUrl(tool.slug), {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await sleep(800);
    Object.assign(out, await page.evaluate(EXTRACT));
  } catch (err) {
    out.error = String(err.message).slice(0, 200);
  } finally {
    await page.close();
  }
  return out;
}

async function main() {
  const tools = LIMIT ? TOOLS_CATALOG.slice(0, LIMIT) : TOOLS_CATALOG;
  console.log(`extracting UI metadata for ${tools.length} tools | ${BASE}`);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = new Array(tools.length);
  let index = 0;
  let done = 0;

  const worker = async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: LOCALE === "de" ? "de-DE" : "en-US",
    });
    while (index < tools.length) {
      const i = index;
      index += 1;
      results[i] = await extract(context, tools[i]);
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${tools.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();

  mkdirSync(dataDir, { recursive: true });

  // merge with the existing file so EN and DE runs accumulate
  const merged = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : {};
  for (const r of results) {
    const key = r.slug;
    const prev = merged[key] || {};
    if (LOCALE === "de") {
      merged[key] = {
        ...prev,
        de: { fields: r.fields || [], options: r.options || [], actions: r.actions || [] },
      };
    } else {
      merged[key] = {
        ...prev,
        en: { fields: r.fields || [], options: r.options || [], actions: r.actions || [] },
      };
    }
  }

  writeFileSync(outFile, JSON.stringify(merged, null, 1), "utf8");

  const noFields = results.filter((r) => !(r.fields || []).length && !(r.actions || []).length);
  console.log(`written: ${outFile}`);
  console.log(`tools recorded: ${Object.keys(merged).length}`);
  console.log(`tools with no fields and no actions: ${noFields.length}`);
  for (const r of noFields.slice(0, 15)) console.log(`   ${r.slug} [${r.engine}]`);
}

function readFileSyncSafe(p) {
  return readFileSync(p, "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
