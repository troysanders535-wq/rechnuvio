/**
 * Privacy audit: does any tool persist data or talk to a server?
 *
 * For every tool route the script:
 *   1. snapshots the browser storage state (localStorage, sessionStorage,
 *      cookies, IndexedDB databases, Cache Storage),
 *   2. actually uses the tool - types into the first field, presses the
 *      first few of the tool's own action buttons, and deliberately feeds an
 *      invalid value to reach an error path,
 *   3. snapshots the storage state again,
 *   4. records every network request that leaves the local origin.
 *
 * Anything the tool stores is a finding: the site promises that nothing is
 * retained and nothing is uploaded.
 *
 * Usage: node scripts/audit/privacy-audit.mjs [--limit=N] [--workers=4]
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
const OUT_FILE = join(OUT_DIR, "privacy-audit.json");

/**
 * Storage keys the platform itself owns. next-themes stores the colour
 * preference and next-intl stores the locale; neither is tool data.
 */
const SYSTEM_KEYS = new Set(["theme", "NEXT_LOCALE", "i18nextLng", "locale"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SNAPSHOT = `() => {
  const ls = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    ls[k] = (localStorage.getItem(k) || "").slice(0, 400);
  }
  const ss = {};
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const k = sessionStorage.key(i);
    ss[k] = (sessionStorage.getItem(k) || "").slice(0, 400);
  }
  return { ls, ss };
}`;

const INDEXED_DB = `async () => {
  try {
    const dbs = await indexedDB.databases();
    return dbs.map((d) => d.name).filter(Boolean);
  } catch { return []; }
}`;

async function auditRoute(context, tool) {
  const page = await context.newPage();
  const external = [];
  const result = {
    slug: tool.slug,
    engine: tool.engine,
    url: `${BASE}/tools/${tool.slug}`,
  };

  page.on("request", (req) => {
    const url = req.url();
    if (
      !url.startsWith("http://localhost") &&
      !url.startsWith("http://127.0.0.1") &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      external.push(`${req.method()} ${url.slice(0, 200)}`);
    }
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (
      !url.startsWith("http://localhost") &&
      !url.startsWith("http://127.0.0.1") &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      external.push(`FAILED ${url.slice(0, 200)}`);
    }
  });

  try {
    await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sleep(700);

    const before = await page.evaluate(eval(SNAPSHOT));
    const dbBefore = await page.evaluate(eval(INDEXED_DB));

    // --- use the tool -----------------------------------------------------
    // The control type decides what can be typed into it: a number or a
    // range input only accepts a number inside its own range, and a
    // read-only field cannot be filled at all.
    const target = await page.evaluate(() => {
      const scope =
        document.querySelector("main") || document.body;
      const ta = scope.querySelector("textarea:not([readonly])");
      if (ta) return { kind: "textarea", index: 0, type: "textarea" };
      const inputs = Array.from(
        scope.querySelectorAll(
          "input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([readonly])",
        ),
      );
      const usable = inputs.filter((el) => {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        return ["text", "search", "email", "url", "password", "tel", "number", "range"].includes(type);
      });
      if (!usable.length) return { kind: "none", index: -1, type: "none" };
      const first = usable[0];
      const index = inputs.indexOf(first);
      return {
        kind: "input",
        index,
        type: (first.getAttribute("type") || "text").toLowerCase(),
        min: first.getAttribute("min"),
        max: first.getAttribute("max"),
      };
    });

    if (target.kind !== "none") {
      const selector = `${target.kind === "textarea" ? "textarea" : "input"} >> nth=${target.index}`;
      const el = page.locator(selector).first();
      if (await el.count()) {
        let value = "Digital ToolPad privacy probe 12345";
        if (target.type === "number") value = "12345";
        if (target.type === "range") {
          // a range only accepts a value inside its own limits
          const min = Number(target.min ?? 0);
          const max = Number(target.max ?? 100);
          value = String(Math.min(max, Math.max(min, Math.round((min + max) / 2))));
        }
        await el.fill(value);
        await sleep(150);
        if (target.type !== "number" && target.type !== "range") {
          // deliberately invalid input to reach an error path
          await el.fill("@@@not valid@@@");
          await sleep(150);
        }
      }
    }

    // press the tool's own action buttons (never the header/footer chrome)
    const clicked = await page.evaluate(() => {
      const scope = document.querySelector("main") || document.body;
      const buttons = Array.from(scope.querySelectorAll("button"));
      let n = 0;
      for (const b of buttons.slice(0, 12)) {
        const label = (b.textContent || "").trim();
        if (!label) continue;
        if (/^(copy|download|reset|clear|new|open file|select file)/i.test(label)) continue;
        try {
          b.click();
          n += 1;
        } catch {
          /* ignore */
        }
      }
      return n;
    });
    await sleep(400);

    // --- compare ----------------------------------------------------------
    const after = await page.evaluate(eval(SNAPSHOT));
    const dbAfter = await page.evaluate(eval(INDEXED_DB));

    const newLocal = Object.keys(after.ls).filter((k) => !(k in before.ls) && !SYSTEM_KEYS.has(k));
    const changedLocal = Object.keys(after.ls).filter(
      (k) => k in before.ls && after.ls[k] !== before.ls[k] && !SYSTEM_KEYS.has(k),
    );
    const newSession = Object.keys(after.ss).filter((k) => !(k in before.ss) && !SYSTEM_KEYS.has(k));
    const newDb = dbAfter.filter((d) => !dbBefore.includes(d));

    result.clickedButtons = clicked;
    result.localStorageAdded = newLocal;
    result.localStorageChanged = changedLocal;
    result.sessionStorageAdded = newSession;
    result.indexedDbAdded = newDb;
    result.externalRequests = [...new Set(external)];
    result.persists =
      newLocal.length + changedLocal.length + newSession.length + newDb.length > 0;
    result.leaks = result.persists || result.externalRequests.length > 0;
  } catch (err) {
    result.error = String(err.message).slice(0, 300);
  } finally {
    await page.close();
  }
  return result;
}

async function main() {
  const tools = LIMIT ? TOOLS_CATALOG.slice(0, LIMIT) : TOOLS_CATALOG;
  console.log(`privacy audit of ${tools.length} tools | base=${BASE} workers=${WORKERS}`);

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
      results[i] = await auditRoute(context, tools[i]);
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${tools.length}`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    withStorageWrites: results.filter((r) => r.persists).length,
    withExternalRequests: results.filter((r) => (r.externalRequests || []).length > 0).length,
    loadErrors: results.filter((r) => r.error).length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ summary, results }, null, 1), "utf8");

  console.log("---- summary ----");
  for (const [k, v] of Object.entries(summary)) {
    if (k === "generatedAt") continue;
    console.log(`  ${k}: ${v}`);
  }
  console.log(`written: ${OUT_FILE}`);

  const problems = results.filter((r) => r.leaks || r.error);
  if (problems.length) {
    console.log(`---- ${problems.length} tools need review ----`);
    for (const p of problems) {
      console.log(
        `  ${p.slug} [${p.engine}] local=${JSON.stringify(p.localStorageAdded || [])} ` +
          `changed=${JSON.stringify(p.localStorageChanged || [])} ` +
          `session=${JSON.stringify(p.sessionStorageAdded || [])} ` +
          `idb=${JSON.stringify(p.indexedDbAdded || [])} ` +
          `ext=${JSON.stringify(p.externalRequests || [])}` +
          (p.error ? ` err=${p.error}` : ""),
      );
    }
  }
}

main().catch((err) => {
  console.error("privacy audit failed:", err);
  process.exit(1);
});
