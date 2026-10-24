/**
 * Detect tools whose workspace does not belong to them.
 *
 * The recurring bug in this codebase is a dispatcher that routes a tool to an
 * engine family it has nothing to do with, so the page renders a working but
 * irrelevant workspace. This script reads the live DOM of every tool route
 * and checks whether the workspace says anything about the tool itself:
 * the slug's meaningful words (plus the tool's own name) must appear in the
 * workspace text.
 *
 * A tool that fails the check is reported as SUSPECT for manual review - it
 * is a screen, not a verdict, because a workspace may legitimately use
 * different wording ("duplicate lines" vs "remove repeated entries").
 *
 * Usage: node scripts/audit/audit-workspace-fit.mjs [--limit=N] [--workers=4]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "");
    return [k, v];
  }),
);

const PORT = args.port || "3100";
const WORKERS = Number(args.workers || 4);
const LIMIT = args.limit ? Number(args.limit) : null;
const BASE = `http://localhost:${PORT}`;

const OUT_DIR = join(root, "docs", "audit-evidence");
const OUT_FILE = join(OUT_DIR, "workspace-fit.json");

/** Words that carry no meaning for the fit check. */
const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "with", "by",
  "online", "free", "tool", "tools", "converter", "generator", "calculator",
  "editor", "viewer", "checker", "builder", "maker", "creator", "utility",
  "utilities", "suite", "pro", "your", "my", "best", "simple", "new", "all",
  "how", "what", "is", "it", "does", "do", "can", "you", "use", "via",
]);

function tokens(slug, name) {
  const set = new Set();
  const add = (w) => {
    const t = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (t.length >= 3 && !STOP.has(t)) set.add(t);
  };
  for (const w of slug.split("-")) add(w);
  for (const w of name.split(/\s+/)) add(w);
  return [...set];
}

/** Words that are too generic to prove a match on their own. */
const WEAK = new Set([
  "diff", "text", "image", "file", "pdf", "json", "yaml", "html", "css", "sql",
  "code", "word", "number", "list", "hash", "color", "colour", "time", "date",
  "markdown", "base64", "hex", "binary", "byte", "font", "letter", "line",
  // generic verbs and nouns that appear in almost every workspace
  "remove", "add", "create", "convert", "make", "get", "set", "use", "find",
  "search", "check", "show", "view", "open", "save", "download", "upload",
  "print", "draw", "compare", "count", "sort", "split", "merge", "join",
  "reverse", "format", "clean", "fix", "test", "scan", "analyse", "analyze",
  "process", "extract", "insert", "replace", "calculate", "compute", "estimate",
  "generate", "convert", "validate", "verify", "preview", "render", "apply",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkRoute(context, tool) {
  const page = await context.newPage();
  const result = { slug: tool.slug, engine: tool.engine, name: tool.name };
  try {
    await page.goto(`${BASE}/tools/${tool.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await sleep(800);

    const text = await page.evaluate(() => {
      const scope = document.querySelector("main") || document.body;
      const parts = [];
      for (const el of scope.querySelectorAll("button,label,h1,h2,h3,h4,span,p,td,th,option,legend,a,summary,li")) {
        const t = (el.textContent || "").trim();
        if (t && t.length <= 80) parts.push(t);
      }
      for (const el of scope.querySelectorAll("input,textarea,select")) {
        const ph = el.getAttribute("placeholder");
        const al = el.getAttribute("aria-label");
        if (ph) parts.push(ph);
        if (al) parts.push(al);
      }
      return parts.join(" \n ").toLowerCase();
    });

    const toks = tokens(tool.slug, tool.name);
    const strong = toks.filter((t) => !WEAK.has(t));
    // The slug and the rendered heading do not always use the same spelling:
    // "sha256-generator" renders as "SHA-256 Hash Generator". The comparison
    // therefore ignores hyphens, spaces and underscores.
    const flat = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const flatText = flat(text);
    const hits = toks.filter((t) => text.includes(t) || flatText.includes(flat(t)));
    const strongHits = strong.filter((t) => text.includes(t) || flatText.includes(flat(t)));

    result.tokens = toks;
    result.matched = hits;
    result.strongTokens = strong;
    result.strongMatched = strongHits;
    result.fit = strong.length === 0 ? hits.length > 0 : strongHits.length > 0;
    result.sample = text.slice(0, 260);
  } catch (err) {
    result.error = String(err.message).slice(0, 200);
  } finally {
    await page.close();
  }
  return result;
}

async function main() {
  const tools = LIMIT ? TOOLS_CATALOG.slice(0, LIMIT) : TOOLS_CATALOG;
  console.log(`workspace fit check on ${tools.length} tools | base=${BASE}`);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];
  let index = 0;
  let done = 0;

  const worker = async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    while (index < tools.length) {
      const i = index;
      index += 1;
      results[i] = await checkRoute(context, tools[i]);
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${tools.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();

  const suspect = results.filter((r) => !r.fit && !r.error);
  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    fit: results.filter((r) => r.fit).length,
    suspect: suspect.length,
    errors: results.filter((r) => r.error).length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ summary, results }, null, 1), "utf8");

  console.log("---- summary ----");
  for (const [k, v] of Object.entries(summary)) {
    if (k === "generatedAt") continue;
    console.log(`  ${k}: ${v}`);
  }
  console.log(`written: ${OUT_FILE}`);
  if (suspect.length) {
    console.log(`---- ${suspect.length} tools whose workspace may not belong to them ----`);
    for (const s of suspect) {
      console.log(
        `  ${s.slug} [${s.engine}] tokens=${JSON.stringify(s.strongTokens || s.tokens)} matched=${JSON.stringify(s.matched)}`,
      );
      console.log(`      workspace: ${(s.sample || "").slice(0, 150).replace(/\n/g, " ")}`);
    }
  }
}

main().catch((err) => {
  console.error("workspace fit audit failed:", err);
  process.exit(1);
});
