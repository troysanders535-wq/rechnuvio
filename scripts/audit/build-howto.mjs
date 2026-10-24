/**
 * Generate src/data/howTo.ts - the "How to use this tool" steps for every tool,
 * in English and German.
 *
 * The steps are composed from each tool's real UI metadata (captured in
 * scripts/audit/data/howto-source.json) plus the tool's own name and
 * description, so every step names controls that actually exist on the page.
 *
 * German field labels are resolved from src/messages/de.json by matching the
 * English string back to its i18n key, so the German steps use the same labels
 * the German UI renders.
 *
 * Run: node scripts/audit/build-howto.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOOLS_CATALOG } from "../../src/data/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const sourcePath = join(here, "data", "howto-source.json");
const outPath = join(root, "src", "data", "howTo.ts");

if (!existsSync(sourcePath)) {
  console.error(`missing source inventory: ${sourcePath}`);
  process.exit(1);
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const toolsDe = JSON.parse(readFileSync(join(root, "src", "data", "tools_de.json"), "utf8"));
const enMsgs = JSON.parse(readFileSync(join(root, "src", "messages", "en.json"), "utf8"));
const deMsgs = JSON.parse(readFileSync(join(root, "src", "messages", "de.json"), "utf8"));

/* ------------------------------------------------------------------ i18n -- */
function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const flatEn = flatten(enMsgs);
const flatDe = flatten(deMsgs);

/** English label -> German label, for every message that actually has one. */
const labelMap = new Map();
for (const [key, enValue] of Object.entries(flatEn)) {
  if (typeof enValue !== "string") continue;
  const deValue = flatDe[key];
  if (typeof deValue === "string" && deValue && deValue !== enValue) {
    if (!labelMap.has(enValue)) labelMap.set(enValue, deValue);
  }
}

function deLabel(text) {
  if (!text) return text;
  return labelMap.get(text) || text;
}

/* ------------------------------------------------------------- templates -- */
const T = {
  en: {
    open: (name) =>
      `Open the **${name}** workspace above. Everything runs inside your browser, so nothing you enter is uploaded.`,
    inputs: (fields) => {
      if (fields.length === 1) return `Enter your input in **${fields[0]}**.`;
      if (fields.length === 2)
        return `Enter your input in **${fields[0]}** and **${fields[1]}**.`;
      return `Enter your input in **${fields.slice(0, -1).join("**, **")}** and **${fields[fields.length - 1]}**.`;
    },
    example: (example) => `For example: \`${example}\`.`,
    options: (label, values) =>
      `Set **${label}** to ${values.map((v) => `\`${v}\``).join(", ")} if you need a different mode.`,
    action: (action, live) =>
      live
        ? `The result updates as you type — there is nothing to press.`
        : `Press **${action}** to run the conversion.`,
    output: (outputs) => `${outputs}`,
    export: (exportNote) => exportNote,
    reset: `Press **Reset** to clear the form and start over.`,
  },
  de: {
    open: (name) =>
      `Öffnen Sie oben den Arbeitsbereich **${name}**. Die Verarbeitung läuft vollständig in Ihrem Browser, es wird nichts hochgeladen.`,
    inputs: (fields) => {
      if (fields.length === 1) return `Geben Sie Ihre Eingabe in **${fields[0]}** ein.`;
      if (fields.length === 2)
        return `Geben Sie Ihre Eingabe in **${fields[0]}** und **${fields[1]}** ein.`;
      return `Geben Sie Ihre Eingabe in **${fields.slice(0, -1).join("**, **")}** und **${fields[fields.length - 1]}** ein.`;
    },
    example: (example) => `Zum Beispiel: \`${example}\`.`,
    options: (label, values) =>
      `Wählen Sie bei Bedarf **${label}** mit ${values.map((v) => `\`${v}\``).join(", ")}.`,
    action: (action, live) =>
      live
        ? `Das Ergebnis wird laufend aktualisiert — es ist nichts zu bestätigen.`
        : `Klicken Sie auf **${action}**, um die Berechnung zu starten.`,
    output: (outputs) => `${outputs}`,
    export: (exportNote) => exportNote,
    reset: `Mit **Zurücksetzen** leeren Sie das Formular und beginnen von vorn.`,
  },
};

/** English -> German export / reset phrasing, keyed by the English sentence. */
const EXPORT_DE = new Map([
  ["Use **Copy** to copy the result to your clipboard, and **Download** to save it as a file.", "Mit **Kopieren** übernehmen Sie das Ergebnis in die Zwischenablage, mit **Download** speichern Sie es als Datei."],
  ["Use **Copy** to copy the result to your clipboard.", "Mit **Kopieren** übernehmen Sie das Ergebnis in die Zwischenablage."],
  ["Use **Download** to save the result as a file.", "Mit **Download** speichern Sie das Ergebnis als Datei."],
  ["Press **Reset** to clear the form and start over.", "Mit **Zurücksetzen** leeren Sie das Formular und beginnen von vorn."],
]);

function deExport(note) {
  return EXPORT_DE.get(note) || note;
}

/* -------------------------------------------------------------- compose -- */
function pickActions(meta) {
  const actions = meta.actions || [];
  const copy = actions.find((a) => /^(copy|kopieren)/i.test(a));
  const download = actions.find((a) => /download|save|export|herunterladen/i.test(a));
  const reset = actions.find((a) => /reset|clear|new|zurücksetzen|leeren/i.test(a));
  const main = actions.find(
    (a) =>
      !/^(copy|kopieren|download|save|export|herunterladen|reset|clear|new|zurücksetzen|leeren)/i.test(a) &&
      !/^\s*$/.test(a),
  );
  return { copy, download, reset, main };
}

/** The output sentence: where the result appears, in the tool's own terms. */
function outputSentence(meta, locale) {
  const hasOutputField = (meta.fields || []).some((f) =>
    /^(output|result|ausgabe|ergebnis)/i.test(f.label || ""),
  );
  if (locale === "de") {
    return hasOutputField
      ? "Das Ergebnis erscheint im Feld **Ausgabe** unter den Einstellungen."
      : "Das Ergebnis erscheint direkt unter den Einstellungen im Ergebnisbereich.";
  }
  return hasOutputField
    ? "The result appears in the **Output** field next to the inputs."
    : "The result appears in the results panel directly below the controls.";
}

/**
 * The German name of a control whose only label is an English placeholder.
 *
 * A placeholder is a hint, not a label, and it is not translated. Quoting it
 * in the German steps would put an English sentence into the German page, so
 * the control is named by its role instead.
 */
const GENERIC_DE = {
  file: "die Dateiauswahl",
  textarea: "das Eingabefeld",
  text: "das Eingabefeld",
  search: "das Suchfeld",
  number: "das Zahlenfeld",
  range: "den Schieberegler",
  url: "das Adressfeld",
  email: "das E-Mail-Feld",
  password: "das Passwortfeld",
  date: "das Datumsfeld",
  time: "das Zeitfeld",
  color: "die Farbauswahl",
  month: "die Monatsauswahl",
  week: "die Wochenauswahl",
};

function fieldLabel(field, locale) {
  const translated = locale === "de" ? deLabel(field.label) : field.label;
  if (locale === "de" && field.fromPlaceholder && translated === field.label) {
    return GENERIC_DE[field.type] || "das Eingabefeld";
  }
  return translated;
}

function compose(meta, locale, toolName) {
  const t = T[locale];
  const steps = [];
  const label = (s) => (locale === "de" ? deLabel(s) : s);

  steps.push(t.open(toolName));

  const fields = (meta.fields || []).map((f) => fieldLabel(f, locale)).filter(Boolean);
  if (fields.length) {
    steps.push(t.inputs(fields));
    if (meta.example) steps.push(t.example(meta.example));
  }

  const opt = (meta.options || [])[0];
  if (opt) {
    const values = (opt.values || []).map(label).slice(0, 4);
    const optionLabel = label(opt.label);
    if (locale === "de" && opt.fromPlaceholder && optionLabel === opt.label) {
      // An English placeholder is not a German label.
      steps.push(
        t.options("die Auswahl", values),
      );
    } else if (values.length) {
      steps.push(t.options(optionLabel, values));
    }
  }

  const acts = pickActions(meta);
  if (acts.main) steps.push(t.action(label(acts.main), !!meta.live));
  else if (meta.live) steps.push(t.action("", true));

  steps.push(t.output(outputSentence(meta, locale)));

  const exportParts = [];
  if (acts.copy)
    exportParts.push(
      locale === "de"
        ? `Mit **Kopieren** übernehmen Sie das Ergebnis in die Zwischenablage.`
        : `Use **Copy** to copy the result to your clipboard.`,
    );
  if (acts.download)
    exportParts.push(
      locale === "de"
        ? `Mit **Download** speichern Sie das Ergebnis als Datei.`
        : `Use **Download** to save the result as a file.`,
    );
  if (exportParts.length) steps.push(exportParts.join(" "));

  steps.push(locale === "de" ? t.reset : t.reset);

  return steps.slice(0, 6);
}

/* ---------------------------------------------------------------- emit --- */
const enOut = {};
const deOut = {};
let missing = 0;

for (const tool of TOOLS_CATALOG) {
  const entry = source[tool.slug];
  if (!entry || !entry.en) {
    missing += 1;
    continue;
  }
  const de = toolsDe[tool.slug] || {};
  const enMeta = { ...entry.en };
  const deMeta = { ...(entry.de || entry.en) };
  if (entry.example) enMeta.example = entry.example;
  if (entry.example_de) deMeta.example = entry.example_de;

  enOut[tool.slug] = compose(enMeta, "en", tool.name);
  deOut[tool.slug] = compose(deMeta, "de", de.name || tool.name);
}

const banner = `/**
 * "How to use this tool" steps, generated by scripts/audit/build-howto.mjs.
 *
 * Every entry is composed from the tool's real UI metadata so the steps name
 * controls that exist on the page. German steps reuse the German labels the
 * interface actually renders.
 *
 * Do not edit by hand - re-run the generator instead.
 */

export const HOW_TO_EN: Record<string, string[]> = `;

const body = [
  banner,
  JSON.stringify(enOut, null, 1),
  ";",
  "",
  "export const HOW_TO_DE: Record<string, string[]> = ",
  JSON.stringify(deOut, null, 1),
  ";",
  "",
  "/** Steps for a tool slug, falling back to English when German is missing. */",
  "export function getHowToSteps(",
  "  slug: string,",
  "  locale?: string",
  "): string[] {",
  "  const de = locale && locale.startsWith(\"de\") ? HOW_TO_DE[slug] : undefined;",
  "  return de && de.length ? de : HOW_TO_EN[slug] || [];",
  "}",
  "",
].join("\n");

writeFileSync(outPath, body, "utf8");

const lengths = [...Object.values(enOut).map((s) => s.length)];
console.log(`written: ${outPath}`);
console.log(`tools with steps: ${Object.keys(enOut).length} / ${TOOLS_CATALOG.length}`);
console.log(`missing source inventory: ${missing}`);
console.log(
  `steps per tool: min=${Math.min(...lengths)} max=${Math.max(...lengths)} avg=${(
    lengths.reduce((a, b) => a + b, 0) / lengths.length
  ).toFixed(2)}`,
);
const deLens = Object.values(deOut).map((s) => s.length);
console.log(
  `de steps per tool: min=${Math.min(...deLens)} max=${Math.max(...deLens)}`,
);
const notTranslated = Object.keys(enOut).filter((s) => JSON.stringify(enOut[s]) === JSON.stringify(deOut[s]));
console.log(`tools where DE == EN (label not in i18n): ${notTranslated.length}`);
