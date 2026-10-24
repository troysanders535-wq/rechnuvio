/**
 * Real-browser route audit for every tool on Digital ToolPad.
 *
 * Drives the installed Chrome through Playwright and records, for each tool
 * route, the signals that a "HTTP 200 + DOM exists" check would miss:
 *
 *   - uncaught page errors and console errors
 *   - any network request that leaves the local origin (a backend / upload leak)
 *   - whether the tool workspace actually rendered (not "loading", not "not
 *     wired up", not the not-found page)
 *   - the interactive control inventory (buttons / inputs / selects / textareas)
 *   - the presence of the required "How to use" and FAQ sections
 *   - placeholder leakage in the rendered text (undefined / NaN / [object Object])
 *   - horizontal overflow at the current viewport
 *   - the dark / light theme actually applied to <html>
 *
 * Usage:
 *   node scripts/audit/audit-routes.mjs --locale=en --viewport=desktop --theme=light
 *   node scripts/audit/audit-routes.mjs --locale=de --viewport=mobile  --theme=dark
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, firefox, webkit } from "playwright";

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
const LOCALE = args.locale || "en";
const VIEWPORT = args.viewport || "desktop";
const THEME = args.theme || "light";
const WORKERS = Number(args.workers || 4);
const LIMIT = args.limit ? Number(args.limit) : null;
/* A comma separated list of slugs: a targeted run over the tools that changed. */
const SLUG_LIST = args.slugs
  ? args.slugs
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
  : null;
const LABEL = args.label || `${LOCALE}-${VIEWPORT}-${THEME}`;

/**
 * The browser engine to drive.
 *
 * The audit brief asks for Chromium, Firefox and WebKit where supported, so the
 * engine is selectable instead of hard-coded to Chrome. `chrome` and `edge`
 * are Chromium channels, the other three are the bundled Playwright builds.
 */
const ENGINES = {
  chrome: { launcher: chromium, channel: "chrome" },
  edge: { launcher: chromium, channel: "msedge" },
  chromium: { launcher: chromium, channel: undefined },
  firefox: { launcher: firefox, channel: undefined },
  webkit: { launcher: webkit, channel: undefined },
};
const ENGINE_NAME = args.browser || "chrome";
const ENGINE = ENGINES[ENGINE_NAME];
if (!ENGINE) {
  console.error(`unknown browser "${ENGINE_NAME}" (use ${Object.keys(ENGINES).join(", ")})`);
  process.exit(1);
}

// de.localhost does not resolve on every host, so the German locale is
// selected with the middleware's ?locale=de query override.
const BASE =
  LOCALE === "de" ? `http://localhost:${PORT}` : `http://localhost:${PORT}`;
const LOCALE_QUERY = LOCALE === "de" ? "?locale=de" : "";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const OUT_DIR = join(root, "docs", "audit-evidence");
const OUT_FILE = join(OUT_DIR, `routes-${LABEL}.json`);

/** Text that should never reach the user. */
const LEAKS = ["undefined", "NaN", "[object Object]", "nullnull", "Infinity"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function auditRoute(context, tool) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const external = [];
  const result = {
    slug: tool.slug,
    engine: tool.engine,
    category: tool.category,
    url: `${BASE}/tools/${tool.slug}${LOCALE_QUERY}`,
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 400));
  });
  page.on("pageerror", (err) => pageErrors.push(String(err.message).slice(0, 400)));
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith("http://localhost") && !url.startsWith("http://de.localhost") && !url.startsWith("http://127.0.0.1") && !url.startsWith("data:") && !url.startsWith("blob:")) {
      external.push(`${req.method()} ${url.slice(0, 200)}`);
    }
  });

  try {
    const response = await page.goto(result.url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    result.status = response ? response.status() : 0;

    // let client components hydrate and lazy chunks settle
    await sleep(900);

    const dom = await page.evaluate((leaks) => {
      const body = document.body;
      const text = body ? body.innerText : "";
      const headings = Array.from(document.querySelectorAll("h2")).map((h) =>
        (h.textContent || "").trim(),
      );
      const q = (sel) => document.querySelectorAll(sel).length;
      const html = document.documentElement;
      return {
        title: document.title,
        h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 200),
        headings,
        buttons: q("button"),
        inputs: q("input"),
        textareas: q("textarea"),
        selects: q("select"),
        links: q("a[href]"),
        hasMain: !!document.querySelector("main"),
        overflowX:
          html.scrollWidth > html.clientWidth + 2
            ? html.scrollWidth - html.clientWidth
            : 0,
        themeClass: html.className || "",
        textLen: text.length,
        leaks: leaks.filter((l) =>
          new RegExp(`(^|[^\\w])${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w]|$)`).test(text),
        ),
        bodyStart: text.slice(0, 400),
      };
    }, LEAKS);

    Object.assign(result, dom);

    const lowered = (dom.bodyStart || "").toLowerCase();
    result.workspaceStuck =
      lowered.includes("loading tool workspace") ||
      lowered.includes("not wired up") ||
      lowered.includes("tool not found");
    result.hasHowTo = dom.headings.some((h) =>
      LOCALE === "de" ? /so verwenden sie dieses tool/i.test(h) : /how to use/i.test(h),
    );
    result.hasFaq = dom.headings.some((h) =>
      LOCALE === "de" ? /häufig gestellte fragen/i.test(h) : /frequently asked/i.test(h),
    );
    result.hasKeyFeatures = dom.headings.some((h) =>
      LOCALE === "de" ? /hauptmerkmale/i.test(h) : /key features/i.test(h),
    );
    result.controlCount =
      dom.buttons + dom.inputs + dom.textareas + dom.selects;

    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
    result.externalRequests = [...new Set(external)];
  } catch (err) {
    result.error = String(err.message).slice(0, 300);
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
    result.externalRequests = [...new Set(external)];
  } finally {
    await page.close();
  }
  return result;
}

async function main() {
  const tools = SLUG_LIST
    ? TOOLS_CATALOG.filter((tool) => SLUG_LIST.includes(tool.slug))
    : LIMIT
      ? TOOLS_CATALOG.slice(0, LIMIT)
      : TOOLS_CATALOG;
  console.log(
    `auditing ${tools.length} routes | base=${BASE} viewport=${VIEWPORT} theme=${THEME} workers=${WORKERS}`,
  );

  const browser = await ENGINE.launcher.launch(
    ENGINE.channel ? { channel: ENGINE.channel, headless: true } : { headless: true },
  );
  const results = [];
  let index = 0;
  let done = 0;

  const worker = async () => {
    const context = await browser.newContext({
      viewport: VIEWPORTS[VIEWPORT],
      colorScheme: THEME,
      locale: LOCALE === "de" ? "de-DE" : "en-US",
      reducedMotion: "reduce",
    });
    while (index < tools.length) {
      const i = index;
      index += 1;
      const r = await auditRoute(context, tools[i]);
      results[i] = r;
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${tools.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  const browserVersion = browser.version();
  await browser.close();

  const summary = {
    label: LABEL,
    base: BASE,
    browser: ENGINE_NAME,
    browserVersion,
    viewport: VIEWPORT,
    theme: THEME,
    generatedAt: new Date().toISOString(),
    total: results.length,
    withStatus200: results.filter((r) => r.status === 200).length,
    withConsoleErrors: results.filter((r) => (r.consoleErrors || []).length > 0).length,
    withPageErrors: results.filter((r) => (r.pageErrors || []).length > 0).length,
    withExternalRequests: results.filter((r) => (r.externalRequests || []).length > 0).length,
    workspaceStuck: results.filter((r) => r.workspaceStuck).length,
    missingHowTo: results.filter((r) => !r.hasHowTo).length,
    missingFaq: results.filter((r) => !r.hasFaq).length,
    zeroControls: results.filter((r) => r.controlCount === 0).length,
    withLeaks: results.filter((r) => (r.leaks || []).length > 0).length,
    withOverflow: results.filter((r) => (r.overflowX || 0) > 2).length,
    loadErrors: results.filter((r) => r.error).length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ summary, results }, null, 1), "utf8");

  console.log("---- summary ----");
  for (const [k, v] of Object.entries(summary)) {
    if (k === "generatedAt" || k === "label" || k === "base") continue;
    console.log(`  ${k}: ${v}`);
  }
  console.log(`written: ${OUT_FILE}`);

  const problems = results.filter(
    (r) =>
      r.error ||
      r.status !== 200 ||
      (r.pageErrors || []).length ||
      (r.consoleErrors || []).length ||
      (r.externalRequests || []).length ||
      r.workspaceStuck ||
      !r.hasFaq ||
      r.controlCount === 0,
  );
  if (problems.length) {
    console.log(`---- ${problems.length} routes need attention ----`);
    for (const p of problems.slice(0, 40)) {
      console.log(
        `  ${p.slug} [${p.engine}] status=${p.status} ctrl=${p.controlCount} ` +
          `console=${(p.consoleErrors || []).length} page=${(p.pageErrors || []).length} ` +
          `ext=${(p.externalRequests || []).length} stuck=${p.workspaceStuck} faq=${r0(p.hasFaq)}` +
          (p.error ? ` err=${p.error}` : ""),
      );
    }
  }
}

function r0(v) {
  return v ? "y" : "n";
}

main().catch((err) => {
  console.error("audit failed:", err);
  process.exit(1);
});
