/**
 * Spot-check the German locale on a running server.
 *
 * The check reads the rendered page and reports how much of the visible text
 * is still English. It is a quick sanity check, not a full audit.
 *
 * Usage: node scripts/audit/check-de-locale.mjs [--port=3200] [--slugs=a,b,c]
 */

import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const PORT = args.port || "3200";
const BASE = `http://localhost:${PORT}`;

const SLUGS = args.slugs
  ? args.slugs.split(",")
  : [
      "case-converter",
      "uppercase-converter",
      "word-counter",
      "sha256-generator",
      "json-minifier",
      "word-viewer",
      "d20-roller",
      "online-notepad",
      "percentage-calculator",
      "age-calculator",
    ];

/** Words that are the same in both languages and are not a sign of a bug. */
const NEUTRAL = new Set([
  "und", "der", "die", "das", "in", "mit", "für", "von", "ein", "eine", "zu", "auf",
  "oder", "ist", "sie", "ihr", "ihre", "werden", "wird", "kann", "können", "bitte",
  "hallo", "toolpad", "digital", "pdf", "json", "csv", "html", "xml", "zip", "png",
  "jpg", "jpeg", "docx", "md", "txt", "utf", "sha", "md5", "base64", "url", "api",
  "ja", "nein", "ok", "copy", "kopieren", "clear", "leeren", "reset", "zoom",
  "format", "normal", "total", "median", "minimum", "maximum", "version", "index",
  "bytes", "credits", "acres", "quarts", "pause", "text", "tokens", "hash",
  "excel", "word", "powerpoint", "sql", "yaml", "regex", "uuid", "ip", "dns",
  "http", "https", "pdf", "javascript", "typescript", "react", "next", "github",
]);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

console.log(`German spot check | ${BASE}`);
for (const slug of SLUGS) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
  try {
    await page.goto(`${BASE}/tools/${slug}?locale=de`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    const text = await page.evaluate(() => {
      const m = document.querySelector("main");
      return (m ? m.textContent : document.body.textContent) || "";
    });
    const words = text.split(/\s+/).filter(Boolean);
    const english = [];
    for (const w of words) {
      const clean = w.replace(/[^\wÄÖÜäöüß-]/g, "");
      if (clean.length < 3) continue;
      if (NEUTRAL.has(clean.toLowerCase())) continue;
      if (/[äöüßÄÖÜ]/.test(clean)) continue;
      english.push(clean);
    }
    const ratio = words.length ? english.length / words.length : 0;
    const sample = [...new Set(english)].slice(0, 8).join(", ");
    console.log(
      `${slug.padEnd(24)} words=${String(words.length).padStart(4)} latin=${String(
        english.length,
      ).padStart(4)} (${(ratio * 100).toFixed(1)}%) ${errors.length ? "PAGEERROR " + errors[0] : ""}`,
    );
    if (sample) console.log(`   latin-only sample: ${sample}`);
  } catch (err) {
    console.log(`${slug.padEnd(24)} ERROR ${String(err.message).slice(0, 120)}`);
  }
  await page.close();
}

await context.close();
await browser.close();
