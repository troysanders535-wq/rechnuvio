/**
 * Apply the German translations to the tool workspace components.
 *
 * For every namespace in scripts/audit/data/ui-strings.json this script:
 *   1. rewrites the hardcoded English literal into a tUi("key") call, in
 *      whichever position it sits (JSX text child, label attribute, or a
 *      standalone string literal inside a function),
 *   2. injects the useTranslations hook for that namespace into every
 *      function that uses it,
 *   3. adds the namespace to src/messages/en.json and src/messages/de.json
 *      as a nested path, the way next-intl resolves it.
 *
 * The rewriting works on the parsed AST (see lib/ast-tools.mjs) rather than
 * with regular expressions.
 *
 * Usage:
 *   node scripts/audit/apply-ui-i18n.mjs --dry-run
 *   node scripts/audit/apply-ui-i18n.mjs --apply
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseTsx,
  collectLiterals,
  injectHook,
  ensureImport,
} from "./lib/ast-tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.UI_I18N_ROOT || join(here, "..", "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);
const APPLY = args.apply === "true";

const source = JSON.parse(readFileSync(join(here, "data", "ui-strings.json"), "utf8"));
const deDir = join(here, "data", "ui-strings-de");
const deAll = {};
for (const f of readdirSync(deDir)) {
  if (!f.endsWith(".json")) continue;
  const part = JSON.parse(readFileSync(join(deDir, f), "utf8"));
  // The namespaces are merged key by key: a batch file may carry only the
  // strings that were added after the earlier batches were written, and it
  // must not drop the translations of the keys it does not mention.
  for (const [ns, entries] of Object.entries(part)) {
    deAll[ns] = { ...(deAll[ns] || {}), ...entries };
  }
}

const enPath = join(root, "src", "messages", "en.json");
const dePath = join(root, "src", "messages", "de.json");
const enMsgs = JSON.parse(readFileSync(enPath, "utf8"));
const deMsgs = JSON.parse(readFileSync(dePath, "utf8"));

/**
 * next-intl resolves a namespace by walking nested objects
 * ("ui" -> "engines" -> "TextCaseWorkspace"), so the namespace has to be
 * written as a nested path, NOT as a flat key containing dots.
 */
function setNested(target, dottedPath, value) {
  const parts = dottedPath.split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!node[part] || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

/* ------------------------------------------------------------- apply ----- */

const report = [];
let totalReplaced = 0;
let filesChanged = 0;
let failed = 0;

for (const [ns, entries] of Object.entries(source)) {
  const file = Object.values(entries)[0].file;
  const abs = join(root, file);
  if (!existsSync(abs)) {
    report.push(`MISSING FILE ${file}`);
    failed += 1;
    continue;
  }
  const original = readFileSync(abs, "utf8");
  const de = deAll[ns] || {};

  // English literal -> key
  const byText = new Map();
  for (const [key, info] of Object.entries(entries)) {
    if (!info.text) continue;
    if (!byText.has(info.text)) byText.set(info.text, key);
  }

  let ast;
  try {
    ast = await parseTsx(original);
  } catch (err) {
    report.push(`PARSE FAILED ${file}: ${String(err.message).slice(0, 120)}`);
    failed += 1;
    continue;
  }

  const literals = collectLiterals(ast, original);

  // For a JSX attribute the span can either include the quotes or not,
  // depending on how the value was written. The replacement has to swallow
  // the quotes either way, otherwise the braces end up inside the string.
  for (const lit of literals) {
    if (!lit.attribute) continue;
    const rawText = original.slice(lit.start, lit.end);
    const startsWithQuote = rawText.startsWith('"') || rawText.startsWith("'");
    if (!startsWithQuote) {
      const before = original[lit.start - 1];
      if (before === '"' || before === "'") {
        lit.start -= 1;
        lit.end += 1;
      }
    }
  }

  const replacements = [];
  for (const lit of literals) {
    const key = byText.get(lit.text);
    if (!key) continue;
    const call = `tUi("${key}")`;
    if (lit.attribute) {
      replacements.push({ start: lit.start, end: lit.end, text: `{${call}}` });
    } else if (lit.literal) {
      replacements.push({ start: lit.start, end: lit.end, text: call });
    } else {
      // JSX text: keep the surrounding whitespace
      const raw = original.slice(lit.start, lit.end);
      const leading = raw.slice(0, raw.length - raw.trimStart().length);
      const trailing = raw.slice(raw.trimEnd().length);
      replacements.push({
        start: lit.start,
        end: lit.end,
        text: `${leading}{${call}}${trailing}`,
      });
    }
  }

  // apply from the end so the offsets stay valid
  let out = original;
  for (const r of replacements.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end);
  }

  // The hook injection also removes declarations that a previous run put into
  // a callback, so it has to run even when there is nothing left to replace.
  const injected = await injectHook(out, ns);
  const bodyText = ensureImport(injected.src);
  const usesTUi = bodyText.includes("tUi(");
  const hasDecl = bodyText.includes(`const tUi = useTranslations(`);
  if (usesTUi && !hasDecl) {
    // tUi() is used but no component or custom hook could take the binding -
    // the call sits in a module-level helper and has to be fixed by hand.
    report.push(`NO HOOK TARGET ${file}`);
    failed += 1;
  }
  out = bodyText;
  if (replacements.length) totalReplaced += replacements.length;

  if (out !== original) {
    filesChanged += 1;
    report.push(
      `${file}: ${replacements.length} replacements, ${injected.injected} hook(s), ` +
        `${injected.removed} misplaced hook(s) removed`,
    );
    if (APPLY) writeFileSync(abs, out, "utf8");
  }

  // messages
  const enNs = {};
  const deNs = {};
  for (const [key, info] of Object.entries(entries)) {
    enNs[key] = info.text;
    deNs[key] = de[key]?.text || info.text;
  }
  setNested(enMsgs, ns, enNs);
  setNested(deMsgs, ns, deNs);
}

if (APPLY) {
  writeFileSync(enPath, JSON.stringify(enMsgs, null, 2) + "\n", "utf8");
  writeFileSync(dePath, JSON.stringify(deMsgs, null, 2) + "\n", "utf8");
}

console.log(APPLY ? "APPLIED" : "DRY RUN");
console.log(`files changed: ${filesChanged}`);
console.log(`replacements: ${totalReplaced}`);
console.log(`failed: ${failed}`);
for (const r of report) console.log(`  ${r}`);
