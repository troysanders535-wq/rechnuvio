/**
 * Report the tool descriptions that promise a capability the verified
 * features do not mention.
 *
 * The feature bullets of a tool are generated from the live workspace, so
 * they describe what the tool really offers. A description that names a
 * capability no feature mentions is a claim that was never verified.
 *
 * The check is deliberately conservative: only a fixed list of capability
 * words is looked for, and a word only counts when it appears in the
 * description but in none of the tool's features or FAQ answers. Every hit
 * is a candidate for a manual look, not a verdict.
 *
 * Usage: node scripts/audit/find-unsupported-claims.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const CAPABILITIES = [
  "waveform",
  "noise floor",
  "clipping",
  "frame rate",
  "lighting check",
  "recording",
  "annotation",
  "translation",
  "ocr",
  "resize",
  "history",
  "favorites",
  "favourites",
  "bookmark",
  "decrypt",
  "watermark",
  "compress",
  "split",
  "merge",
];

/**
 * The words that turn a capability into the opposite statement.
 *
 * "no watermark", "no uploads or watermark" and "without a watermark" say the
 * tool does NOT stamp a watermark, so the word is not a promise of one.
 */
const NEGATIONS = [
  "no",
  "not",
  "never",
  "without",
  "ohne",
  "kein",
  "keine",
  "keinen",
  "nicht",
  "nie",
];

/**
 * "a FLAC recording" and "an MP3 recording" name the file, they do not
 * promise a recording function. Only the verb form counts there.
 */
const VERB_ONLY = new Set(["recording"]);

const enSrc = readFileSync(join(root, "src", "data", "tools.ts"), "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const start = enSrc.indexOf(marker) + marker.length;
const end = enSrc.indexOf("\n];", start);
const tools = JSON.parse(enSrc.slice(start, end + 2));

const deTools = JSON.parse(readFileSync(join(root, "src", "data", "tools_de.json"), "utf8"));

/** The word has to stand on its own: "lighting" must not match "highlighting". */
const mentions = (text, word) =>
  new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(
    text,
  );

/**
 * The word counts as a promise only when it is not part of a negation.
 *
 * "no watermark" and "kein Wasserzeichen" say the opposite of what the word
 * alone would suggest, so a negated occurrence is not a claim.
 */
const promises = (text, word) => {
  if (!mentions(text, word)) return false;

  if (VERB_ONLY.has(word)) {
    // Only the verb form is a promise: "record", "records", "recording" as a
    // verb. "a WAV recording" names the file.
    return new RegExp(`(^|[^a-z])(record|records|recording)([^a-z]|$)`, "i").test(text) &&
      !new RegExp(`(a|an|your|the)\\s+(wav|mp3|flac|m4a|ogg|audio)\\s+recording`, "i").test(text);
  }

  // Look at every occurrence of the word and check the words right before it.
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z])(${escaped})([^a-z]|$)`, "gi");
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 40), match.index);
    const words = before.split(/[^a-z]+/).filter(Boolean);
    if (!words.some((w) => NEGATIONS.includes(w.toLowerCase()))) return true;
  }
  return false;
};

const hits = [];

for (const tool of tools) {
  const description = (tool.description || "").toLowerCase();
  const own = [
    ...(tool.features || []),
    ...((tool.faqs || []).flatMap((f) => [f.q || "", f.a || ""])),
    ...(tool.keywords || []),
  ]
    .join(" ")
    .toLowerCase();

  const claims = CAPABILITIES.filter((c) => promises(description, c) && !mentions(own, c));
  if (!claims.length) continue;

  const de = deTools[tool.slug];
  const deClaims = de
    ? CAPABILITIES.filter(
        (c) =>
          promises((de.description || "").toLowerCase(), c) && !mentions(own, c),
      )
    : [];

  hits.push({ slug: tool.slug, engine: tool.engine, claims, deClaims });
}

console.log(`tools: ${tools.length}`);
console.log(`tools with a capability claim that the features do not mention: ${hits.length}`);
for (const h of hits) {
  console.log(`\n${h.slug} [${h.engine}]`);
  console.log(`   EN claims: ${h.claims.join(", ")}`);
  if (h.deClaims.length) console.log(`   DE claims: ${h.deClaims.join(", ")}`);
  const t = tools.find((x) => x.slug === h.slug);
  console.log(`   ${t.description}`);
}
