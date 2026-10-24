/**
 * Gate for the "How to use this tool" section.
 *
 * The section has to be present for every tool, in both locales, directly
 * above the FAQ, with 3 to 6 steps that describe the tool the reader is
 * actually on. Two failure modes are easy to introduce and hard to see:
 *
 *   - a step that quotes an English placeholder in the German locale,
 *   - a step that describes a different tool (a shared workspace can hand
 *     the same label to a tool whose own controls are different).
 *
 * The gate checks both.
 *
 * Usage:  node scripts/audit/check-howto.mjs [--strict]
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

const source = readFileSync(path.join(root, "src", "data", "howTo.ts"), "utf8");

/* ---------------------------------------------- the labels the page renders --- */

/**
 * The UI metadata, read from the live DOM in both locales.
 *
 * The metadata holds the labels of every control, English and German, in the
 * same order. A label that is byte-identical in both locales was never
 * translated; a label that differs was. That comparison is exact, while a
 * word-based heuristic cannot tell a German compound ("Original-JSON / -Text")
 * from untranslated English.
 */
let meta = {};
try {
  meta = JSON.parse(
    readFileSync(path.join(here, "data", "howto-source.json"), "utf8"),
  );
} catch {
  console.log("no UI metadata inventory: scripts/audit/data/howto-source.json");
}

/** The labels a tool renders, per locale. */
function labelSets(slug) {
  const entry = meta[slug];
  const collect = (side) => {
    const out = new Set();
    if (!entry || !entry[side]) return out;
    for (const f of entry[side].fields || []) if (f.label) out.add(f.label);
    for (const o of entry[side].options || []) if (o.label) out.add(o.label);
    for (const a of entry[side].actions || []) if (a) out.add(a);
    return out;
  };
  return { en: collect("en"), de: collect("de") };
}

/** The labels a tool renders in both locales, side by side. */
function labelPairs(slug) {
  const entry = meta[slug];
  const pairs = [];
  if (!entry || !entry.en || !entry.de) return pairs;
  const zip = (enList, deList) => {
    const n = Math.min(enList.length, deList.length);
    for (let i = 0; i < n; i += 1) {
      const e = enList[i]?.label ?? "";
      const d = deList[i]?.label ?? "";
      pairs.push([e, d]);
    }
  };
  zip(entry.en.fields || [], entry.de.fields || []);
  zip(entry.en.options || [], entry.de.options || []);
  const ea = entry.en.actions || [];
  const da = entry.de.actions || [];
  for (let i = 0; i < Math.min(ea.length, da.length); i += 1) pairs.push([ea[i], da[i]]);
  return pairs;
}

/** The labels a tool shows in both locales unchanged: they were not translated. */
const untranslatedLabelCache = new Map();
function untranslatedLabels(slug) {
  if (untranslatedLabelCache.has(slug)) return untranslatedLabelCache.get(slug);
  const out = new Set();
  for (const [en, de] of labelPairs(slug)) {
    // A single word is often the same in German ("GCD", "JSON"), and a label
    // that is only format names ("CSV → JSON") reads the same in both
    // languages. Only prose - a label with a real English word in it - that
    // stayed English is a defect.
    if (!en || en !== de) continue;
    if (!/[A-Za-z]{3,}\s/.test(en)) continue;
    if (!/[a-z]{2}/.test(en)) continue;
    out.add(en);
  }
  untranslatedLabelCache.set(slug, out);
  return out;
}

/* ------------------------------------------------- read the generated file --- */

/** The steps of one locale of one tool. */
function stepsOf(locale, slug) {
  const anchor = locale === "de" ? "export const HOW_TO_DE" : "export const HOW_TO_EN";
  const anchorAt = source.indexOf(anchor);
  if (anchorAt < 0) return null;
  const sectionEnd = source.indexOf("\nexport ", anchorAt + anchor.length);
  const section = source.slice(anchorAt, sectionEnd < 0 ? source.length : sectionEnd);

  const key = ` "${slug}": [`;
  const at = section.indexOf(key);
  if (at < 0) return null;
  const arr = section.indexOf("[", at);
  let depth = 0;
  let i = arr;
  for (; i < section.length; i += 1) {
    if (section[i] === "[") depth += 1;
    else if (section[i] === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const body = section.slice(arr + 1, i);
  const steps = [];
  let current = "";
  let inString = false;
  for (const c of body) {
    if (c === '"' && current.endsWith("\\")) {
      current += c;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      if (!inString) {
        steps.push(current);
        current = "";
      }
      continue;
    }
    if (inString) current += c;
  }
  return steps;
}

/* --------------------------------------------------------------- the gate --- */

const problems = [];
const slugs = TOOLS_CATALOG.map((t) => t.slug);

let enCount = 0;
let deCount = 0;
let totalEn = 0;
let totalDe = 0;

const seenEnglish = new Map(); // english sentence -> slug
const crossTalk = [];

for (const slug of slugs) {
  const en = stepsOf("en", slug);
  const de = stepsOf("de", slug);

  if (!en) {
    problems.push(`${slug}: no English steps`);
  } else {
    enCount += 1;
    totalEn += en.length;
    if (en.length < 3 || en.length > 6) {
      problems.push(`${slug}: ${en.length} English steps (needs 3-6)`);
    }
    for (const step of en) {
      if (!seenEnglish.has(step)) seenEnglish.set(step, []);
      seenEnglish.get(step).push(slug);
    }
  }

  if (!de) {
    problems.push(`${slug}: no German steps`);
  } else {
    deCount += 1;
    totalDe += de.length;
    if (de.length < 3 || de.length > 6) {
      problems.push(`${slug}: ${de.length} German steps (needs 3-6)`);
    }
    // A German step must not contain an English sentence.
    for (const step of de) {
      const hits = seenEnglish.get(step);
      if (hits) crossTalk.push(`${slug}: German step equals the English step of ${hits.join(", ")}`);
    }
  }
}

/* ------------------------------------- a step must not name a foreign tool --- */

/**
 * Vocabulary that only belongs to some tools. A step of one tool that names
 * another tool's vocabulary is a wrong workspace, not a wording problem.
 *
 * A marker is foreign when the tool's own slug does not contain the marker:
 * "morse-code-translator" may talk about Morse code, "text-suite" tools that
 * are not about Morse code may not.
 */
/**
 * Vocabulary that only belongs to some tools. A step of one tool that names
 * another tool's controls is a wrong workspace, not a wording problem.
 *
 * Each marker has a subject word (the tool family it belongs to) and the
 * phrases that tool's own controls use. The marker is foreign when the tool's
 * own name and description never mention the subject word AND one of its
 * steps uses one of the phrases.
 *
 * "code-screenshot-generator" may offer SQL as a highlighting language, but
 * it never offers a "Paste SQL query here..." field - that field belongs to
 * the SQL formatter, so the steps of the equation editor that mention it are
 * the steps of the wrong tool.
 */
const MARKERS = [
  { subject: "sql", phrases: ["format sql", "paste sql", "sql query", "sql statement", "sql formatter", "sql tabellen"] },
  { subject: "cron", phrases: ["cron expression", "format cron", "paste cron"] },
  { subject: "graphql", phrases: ["format graphql", "graphql schema", "paste graphql"] },
  { subject: "openapi", phrases: ["format openapi", "openapi document", "paste openapi"] },
  { subject: "parquet", phrases: ["parquet file", "read parquet", "paste parquet"] },
  { subject: "exif", phrases: ["exif data", "exif metadata", "read exif"] },
  { subject: "bingo", phrases: ["bingo card", "bingo number"] },
  { subject: "morse", phrases: ["morse code", "morse translator"] },
  { subject: "asn1", phrases: ["asn.1", "asn1"] },
  { subject: "ical", phrases: ["ical file", "icalendar"] },
];

const word = (text) => new RegExp(`\\b${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

for (const tool of TOOLS_CATALOG) {
  const subject = [
    tool.slug,
    tool.name,
    tool.description || "",
    (tool.keywords || []).join(" "),
    (tool.faqs || []).map((f) => `${f.q || ""} ${f.a || ""}`).join(" "),
  ].join(" ");
  const en = stepsOf("en", tool.slug) || [];
  const de = stepsOf("de", tool.slug) || [];
  for (const [locale, steps] of [
    ["English", en],
    ["German", de],
  ]) {
    for (const step of steps) {
      for (const marker of MARKERS) {
        if (word(marker.subject).test(subject)) continue;
        const hit = marker.phrases.find((p) => step.toLowerCase().includes(p.toLowerCase()));
        if (hit) {
          crossTalk.push(
            `${tool.slug}: ${locale} step uses "${hit}", which belongs to the ${marker.subject} tools`,
          );
        }
      }
    }
  }
}

/* --------------------------------- a German step must not be English text --- */

/**
 * The word-grams of every English step.
 *
 * A German step that still carries English words in a row was never
 * translated - the generator quoted an English placeholder instead of the
 * German label of the control.
 */
const englishGrams = new Set();
const englishTriGrams = new Set();

/** The words of a piece of text, without the markup and without numbers. */
const gramOf = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w));

for (const tool of TOOLS_CATALOG) {
  for (const step of stepsOf("en", tool.slug) || []) {
    const words = gramOf(step);
    for (let i = 0; i + 4 <= words.length; i += 1) {
      englishGrams.add(words.slice(i, i + 4).join(" "));
    }
    for (let i = 0; i + 3 <= words.length; i += 1) {
      englishTriGrams.add(words.slice(i, i + 3).join(" "));
    }
  }
}

/** The bold spans of a step: the labels the step quotes. */
const boldSpans = (step) => {
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(step)) !== null) out.push(m[1]);
  return out;
};

/** The prose of a step: the text with the labels and the code removed. */
const proseOf = (step) => step.replace(/\*\*[^*]+\*\*/g, " ").replace(/`[^`]*`/g, " ");

const untranslated = [];
for (const tool of TOOLS_CATALOG) {
  const ownName = `${tool.name}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const notTranslated = untranslatedLabels(tool.slug);
  const germanLabels = labelSets(tool.slug).de;

  for (const step of stepsOf("de", tool.slug) || []) {
    // A quoted label that is still English.
    for (const span of boldSpans(step)) {
      const flat = span.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!flat || flat === ownName) continue;

      // The page shows the very same label in both locales: it was never
      // translated.
      if (notTranslated.has(span)) {
        untranslated.push(`${tool.slug}: the label "${span.slice(0, 90)}" is still English`);
        continue;
      }
      // A label the German page really renders: nothing to report, even when
      // it reads like English.
      if (germanLabels.has(span)) continue;

      const words = gramOf(span);
      if (words.length < 3) continue;
      // The label is English when every three-word window of it is English.
      let allEnglish = true;
      for (let i = 0; i + 3 <= words.length; i += 1) {
        if (!englishTriGrams.has(words.slice(i, i + 3).join(" "))) {
          allEnglish = false;
          break;
        }
      }
      if (allEnglish) {
        untranslated.push(`${tool.slug}: the label "${span.slice(0, 90)}" is still English`);
      }
    }
    // Prose that is still English.
    const words = gramOf(proseOf(step));
    for (let i = 0; i + 4 <= words.length; i += 1) {
      if (englishGrams.has(words.slice(i, i + 4).join(" "))) {
        untranslated.push(
          `${tool.slug}: "${step.slice(0, 100)}" carries the English words "${words.slice(i, i + 4).join(" ")}"`,
        );
        break;
      }
    }
  }
}

/* --------------------------------------------------------------- report --- */

console.log(`tools in the catalogue: ${slugs.length}`);
console.log(`  English steps : ${enCount} tools, avg ${(totalEn / Math.max(enCount, 1)).toFixed(2)} steps`);
console.log(`  German steps  : ${deCount} tools, avg ${(totalDe / Math.max(deCount, 1)).toFixed(2)} steps`);

// The identical English steps across tools are the shared-workspace risk.
const shared = [...seenEnglish.entries()].filter(([, slugsSeen]) => slugsSeen.length > 1);
console.log(`  English steps shared by more than one tool: ${shared.length}`);
if (shared.length && process.argv.includes("--shared")) {
  for (const [step, slugsSeen] of shared) {
    console.log(`    [${slugsSeen.length}] ${step.slice(0, 120)}`);
    console.log(`         ${slugsSeen.slice(0, 8).join(", ")}`);
  }
}

if (problems.length) {
  console.log(`\n${problems.length} problems:`);
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
}

if (crossTalk.length) {
  console.log(`\n${crossTalk.length} cross-tool steps:`);
  for (const c of crossTalk.slice(0, 40)) console.log(`  ${c}`);
}

if (untranslated.length) {
  console.log(`\n${untranslated.length} German steps that still carry English text:`);
  for (const u of untranslated.slice(0, 40)) console.log(`  ${u}`);
}

if (problems.length === 0 && crossTalk.length === 0 && untranslated.length === 0) {
  console.log("\nHow-to data is complete in both locales.");
} else {
  process.exitCode = 1;
}
