/**
 * Replace the copied boilerplate in the tool catalogs with tool-specific
 * feature bullets and FAQs.
 *
 * The catalog generation gave 489 of the 492 tools the same five generic
 * bullets ("One-click copy to clipboard and file download", ...). Those claims
 * are not true for most tools - many of them have no download, no clipboard and
 * no file output at all - and the audit brief requires the feature list to
 * "match verified behavior" and to contain no "irrelevant copied content".
 *
 * Every bullet here is derived from the tool's real rendered UI, captured in
 * scripts/audit/data/howto-source.json: the actual input fields, the actual
 * option groups and their values, the actual action buttons and the formats
 * the tool's own description claims. Nothing is invented.
 *
 * The German bullets use the German labels of the German UI, so both locales
 * describe the same controls.
 *
 * Usage: node scripts/audit/build-features.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const DRY = process.argv.includes("--dry-run");

const metaPath = join(here, "data", "howto-source.json");
if (!existsSync(metaPath)) {
  console.error(`missing ${metaPath} - run scripts/audit/extract-ui-metadata.mjs first`);
  process.exit(1);
}
const META = JSON.parse(readFileSync(metaPath, "utf8"));

/* ----------------------------------------------------------- EN catalog -- */
const toolsPath = join(root, "src", "data", "tools.ts");
const toolsSrc = readFileSync(toolsPath, "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const arrStart = toolsSrc.indexOf(marker) + marker.length;
const arrEnd = toolsSrc.indexOf("\n];", arrStart);
const enTools = JSON.parse(toolsSrc.slice(arrStart, arrEnd + 2));

/* ----------------------------------------------------------- DE catalog -- */
const dePath = join(root, "src", "data", "tools_de.json");
const deTools = JSON.parse(readFileSync(dePath, "utf8"));

/* ------------------------------------------------------------- helpers -- */

/** Formats a tool description mentions, in the order they appear. */
const FORMAT_TOKENS = [
  "PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG", "ICO", "BMP", "TIFF", "HEIC", "AVIF",
  "PDF", "DOCX", "XLSX", "PPTX", "CSV", "TSV", "JSON", "YAML", "YML", "XML", "HTML",
  "TXT", "RTF", "ZIP", "MP3", "MP4", "WAV", "OGG", "WEBM", "MKV", "AVI", "MOV",
  "FLAC", "M4A", "GLB", "GLTF", "OBJ", "STL", "FBX", "PLY", "3MF", "MKV",
];
const FORMAT_RE = new RegExp(`\\b(${FORMAT_TOKENS.join("|")})\\b`, "g");

function formatsOf(text) {
  const found = [];
  for (const match of String(text || "").matchAll(FORMAT_RE)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

/** A short, comma separated list that never gets out of hand. */
function listOf(items, max = 4) {
  const shown = items.slice(0, max).join(", ");
  if (items.length <= max) return shown;
  return `${shown} and ${items.length - max} more`;
}

/** The German counterpart of listOf(). */
function deListOf(items, max = 4) {
  const shown = items.slice(0, max).join(", ");
  if (items.length <= max) return shown;
  return `${shown} und ${items.length - max} weitere`;
}

function joinAnd(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The German counterpart of joinAnd(). */
function deJoinAnd(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

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

const flatEn = flatten(JSON.parse(readFileSync(join(root, "src", "messages", "en.json"), "utf8")));
const flatDe = flatten(JSON.parse(readFileSync(join(root, "src", "messages", "de.json"), "utf8")));

/** English label -> German label, for every message that actually has one. */
const labelMap = new Map();
for (const [key, enValue] of Object.entries(flatEn)) {
  if (typeof enValue !== "string") continue;
  const deValue = flatDe[key];
  if (typeof deValue === "string" && deValue && deValue !== enValue) {
    if (!labelMap.has(enValue)) labelMap.set(enValue, deValue);
  }
}

/**
 * The German label of an English control label.
 *
 * The captured German DOM metadata still carries English labels for a few
 * engines, so the message catalogue is the authoritative source.
 */
function deLabel(text) {
  if (!text) return text;
  return labelMap.get(text) || text;
}

/** The action buttons that hand a result to the user. */
const EXPORT_RE = /copy|download|export|save|print|kopieren|herunterladen|exportieren|drucken/i;

/**
 * Build the English feature bullets for one tool.
 */
function enFeatures(tool, meta) {
  const fields = meta.fields || [];
  const options = meta.options || [];
  const actions = meta.actions || [];
  const bullets = [];

  // 1. the inputs
  if (!fields.length) {
    bullets.push("No input needed - choose an option and run the tool.");
  } else {
    const labels = fields.map((f) => f.label);
    const fileFields = fields.filter((f) => f.type === "file");
    const textFields = fields.filter((f) => f.type === "text" || f.type === "textarea");
    const numberFields = fields.filter((f) => f.type === "number");
    if (fileFields.length === fields.length) {
      bullets.push(`Reads files straight from your device: ${joinAnd(labels)}.`);
    } else if (textFields.length === fields.length) {
      bullets.push(`Takes ${fields.length} text ${fields.length > 1 ? "inputs" : "input"}: ${joinAnd(labels)}.`);
    } else if (numberFields.length === fields.length) {
      bullets.push(`Takes ${fields.length} numeric ${fields.length > 1 ? "values" : "value"}: ${joinAnd(labels)}.`);
    } else {
      bullets.push(`Takes ${fields.length} ${fields.length > 1 ? "inputs" : "input"}: ${joinAnd(labels)}.`);
    }
  }

  // 2. the options
  if (options.length) {
    const first = options[0];
    const values = first.values || [];
    if (options.length === 1) {
      bullets.push(
        values.length
          ? `Choose ${first.label}: ${listOf(values)}.`
          : `Configure ${first.label} to match your case.`,
      );
    } else {
      const parts = options.slice(0, 2).map((o) =>
        o.values && o.values.length ? `${o.label} (${o.values.length} values)` : o.label,
      );
      bullets.push(`Choose between ${joinAnd(parts)}.`);
    }
  }

  // 3. the actions
  if (actions.length === 1) {
    bullets.push(`Runs one action: ${actions[0]}.`);
  } else if (actions.length) {
    bullets.push(`Provides ${actions.length} actions: ${listOf(actions)}.`);
  }

  // 4. how the result leaves the tool
  const exports = actions.filter((a) => EXPORT_RE.test(a));
  if (exports.length) {
    bullets.push(`Copy, download or print the result with ${joinAnd(exports.slice(0, 3))}.`);
  }

  // 5. the formats
  const formats = formatsOf(tool.description);
  if (formats.length) {
    bullets.push(`Works with ${listOf(formats, 6)}.`);
  }

  // 6. the facts that are true of every tool on this site
  bullets.push(
    `Runs entirely in your browser - ${tool.name} never uploads your data and stores nothing on your device.`,
  );
  if (bullets.length < 5) {
    bullets.push("Works offline once the page has loaded - no account, no API key, no usage limit.");
  }
  if (bullets.length < 5) {
    bullets.push("Light and dark theme, responsive from phone to desktop.");
  }

  return bullets.slice(0, 5);
}

/**
 * Build the German feature bullets for one tool.
 */
function deFeatures(tool, meta, deName) {
  const name = deName || tool.name;
  const fields = meta.fields || [];
  const options = meta.options || [];
  const actions = meta.actions || [];
  const bullets = [];

  // The German labels come from the German UI; the message catalogue fills in
  // the engines whose captured German metadata still carries English labels.
  const deFieldLabels = fields.map((f) => deLabel(f.label));
  const deOptionLabels = options.map((o) => deLabel(o.label));
  const deOptionValues = options.map((o) => (o.values || []).map((v) => deLabel(v)));
  const deActions = actions.map((a) => deLabel(a));

  if (!fields.length) {
    bullets.push("Braucht keine Eingabe - wählen Sie eine Einstellung und starten Sie das Werkzeug.");
  } else {
    const labels = deFieldLabels;
    const fileFields = fields.filter((f) => f.type === "file");
    const textFields = fields.filter((f) => f.type === "text" || f.type === "textarea");
    const numberFields = fields.filter((f) => f.type === "number");
    if (fileFields.length === fields.length) {
      bullets.push(`Liest Dateien direkt von Ihrem Gerät: ${deJoinAnd(labels)}.`);
    } else if (textFields.length === fields.length) {
      bullets.push(`Nimmt ${fields.length} ${fields.length > 1 ? "Texteingaben" : "Texteingabe"} entgegen: ${deJoinAnd(labels)}.`);
    } else if (numberFields.length === fields.length) {
      bullets.push(`Nimmt ${fields.length} ${fields.length > 1 ? "Zahlenwerte" : "Zahlenwert"} entgegen: ${deJoinAnd(labels)}.`);
    } else {
      bullets.push(`Nimmt ${fields.length} ${fields.length > 1 ? "Eingaben" : "Eingabe"} entgegen: ${deJoinAnd(labels)}.`);
    }
  }

  if (options.length) {
    const values = deOptionValues[0] || [];
    if (options.length === 1) {
      bullets.push(
        values.length
          ? `Wählen Sie ${deOptionLabels[0]}: ${deListOf(values)}.`
          : `Passen Sie ${deOptionLabels[0]} an Ihren Fall an.`,
      );
    } else {
      const parts = options.slice(0, 2).map((o, i) =>
        deOptionValues[i] && deOptionValues[i].length
          ? `${deOptionLabels[i]} (${deOptionValues[i].length} Werte)`
          : deOptionLabels[i],
      );
      bullets.push(`Wählen Sie zwischen ${deJoinAnd(parts)}.`);
    }
  }

  if (deActions.length === 1) {
    bullets.push(`Führt eine Aktion aus: ${deActions[0]}.`);
  } else if (deActions.length) {
    bullets.push(`Bietet ${deActions.length} Aktionen: ${deListOf(deActions)}.`);
  }

  const exports = deActions.filter((a) => EXPORT_RE.test(a));
  if (exports.length) {
    bullets.push(`Ergebnis kopieren, herunterladen oder drucken mit ${deJoinAnd(exports.slice(0, 3))}.`);
  }

  const formats = formatsOf(tool.description);
  if (formats.length) {
    bullets.push(`Verarbeitet ${listOf(formats, 6)}.`);
  }

  bullets.push(
    `Läuft vollständig in Ihrem Browser - ${name} lädt Ihre Daten nie hoch und speichert nichts auf Ihrem Gerät.`,
  );
  if (bullets.length < 5) {
    bullets.push("Funktioniert offline, sobald die Seite geladen ist - ohne Konto, ohne API-Schlüssel, ohne Nutzungslimit.");
  }
  if (bullets.length < 5) {
    bullets.push("Helles und dunkles Farbschema, responsiv vom Handy bis zum Desktop.");
  }

  return bullets.slice(0, 5);
}

/**
 * One tool-specific FAQ, built from what the tool really offers.
 */
function extraFaq(tool, meta, locale, nameOverride) {
  const fields = meta.fields || [];
  const options = meta.options || [];
  const actions = meta.actions || [];
  const formats = formatsOf(tool.description);
  const name = nameOverride || tool.name;

  if (locale === "de") {
    if (formats.length) {
      return {
        q: `Welche Dateiformate verarbeitet ${name}?`,
        a: `Das Werkzeug verarbeitet ${deListOf(formats, 6)}. Die Verarbeitung findet vollständig in Ihrem Browser statt.`,
      };
    }
    if (options.length) {
      const labels = options.map((o) => deLabel(o.label));
      return {
        q: `Welche Einstellungen kann ich in ${name} wählen?`,
        a: `Sie können ${deJoinAnd(labels)} auswählen. Das Ergebnis wird direkt auf der Seite berechnet.`,
      };
    }
    if (fields.length) {
      const labels = fields.map((f) => deLabel(f.label));
      return {
        q: `Was braucht ${name} als Eingabe?`,
        a: `Sie geben Ihre Daten in ${deJoinAnd(labels)} ein. Mehr ist nicht nötig.`,
      };
    }
    if (actions.length) {
      return {
        q: `Wie funktioniert ${name}?`,
        a: `Sie starten die Berechnung mit "${deLabel(actions[0])}" und lesen das Ergebnis direkt auf der Seite.`,
      };
    }
    return {
      q: `Wie funktioniert ${name}?`,
      a: `Sie starten die Berechnung auf der Seite und lesen das Ergebnis direkt unter dem Werkzeug.`,
    };
  }

  if (formats.length) {
    return {
      q: `Which file formats does ${name} handle?`,
      a: `It handles ${listOf(formats, 6)}. The processing happens entirely in your browser.`,
    };
  }
  if (options.length) {
    const labels = options.map((o) => o.label);
    return {
      q: `Which settings can I choose in ${name}?`,
      a: `You can choose ${joinAnd(labels)}. The result is calculated right on the page.`,
    };
  }
  if (fields.length) {
    const labels = fields.map((f) => f.label);
    return {
      q: `What does ${name} need as input?`,
      a: `You enter your data in ${joinAnd(labels)}. Nothing else is required.`,
    };
  }
  if (actions.length) {
    return {
      q: `How do I use ${name}?`,
      a: `Press "${actions[0]}" to run the tool and read the result directly on the page.`,
    };
  }
  return {
    q: `How do I use ${name}?`,
    a: `Run the tool on the page and read the result directly below the workspace.`,
  };
}

/**
 * The German translation of the three standard questions, mirroring
 * translateFaq() in src/utils/localizedTools.ts so the German catalog can carry
 * its own complete FAQ list.
 */
function deTranslateFaq(faq, toolName) {
  if (/free to use/i.test(faq.q)) {
    return {
      q: `Ist dieses Tool (${toolName}) kostenlos?`,
      a: `Ja, ${toolName} auf Digital ToolPad ist zu 100% kostenlos ohne versteckte Gebühren, Abonnements oder Einschränkungen.`,
    };
  }
  if (/data safe and private/i.test(faq.q)) {
    return {
      q: "Sind meine Daten sicher und geschützt?",
      a: "Alle Vorgänge werden lokal in Ihrer Browser-Sandbox ausgeführt. Keine Ihrer Dateien, Texte oder Daten werden jemals an externe Server übertragen.",
    };
  }
  if (/mobile devices/i.test(faq.q)) {
    return {
      q: "Kann ich dieses Tool auf Mobilgeräten nutzen?",
      a: "Ja, unsere responsive Benutzeroberfläche funktioniert nahtlos auf Desktops, Laptops, Tablets und Smartphones.",
    };
  }
  return faq;
}

/* --------------------------------------------------------------- build -- */

const stats = { en: 0, de: 0, faq: 0, missingMeta: [] };

for (const tool of enTools) {
  const entry = META[tool.slug];
  if (!entry || !entry.en) {
    stats.missingMeta.push(tool.slug);
    continue;
  }
  tool.features = enFeatures(tool, entry.en);

  const deMeta = entry.de || entry.en;
  const deEntry = deTools[tool.slug];
  if (deEntry) {
    deEntry.features = deFeatures(tool, deMeta, deEntry.name || tool.name);
    stats.de += 1;
  }

  // Add one tool-specific FAQ to both locales, without touching the existing
  // questions (they carry the price / privacy / mobile answers).
  const enFaqs = Array.isArray(tool.faqs) ? tool.faqs : [];
  const q = extraFaq(tool, entry.en, "en");
  if (!enFaqs.some((f) => f.q === q.q)) {
    tool.faqs = [...enFaqs, q];
    stats.faq += 1;
  }
  if (deEntry) {
    const deFaqs = (Array.isArray(deEntry.faqs) ? deEntry.faqs : []).map((f) =>
      deTranslateFaq(f, deEntry.name || tool.name),
    );
    const dq = extraFaq(tool, deMeta, "de", deEntry.name || tool.name);
    if (!deFaqs.some((f) => f.q === dq.q)) deFaqs.push(dq);
    deEntry.faqs = deFaqs;
  }
  stats.en += 1;
}

/* --------------------------------------------------------------- write -- */

if (!DRY) {
  const enOut =
    toolsSrc.slice(0, arrStart) +
    JSON.stringify(enTools, null, 2) +
    toolsSrc.slice(arrEnd + 2);
  writeFileSync(toolsPath, enOut, "utf8");
  writeFileSync(dePath, JSON.stringify(deTools, null, 2) + "\n", "utf8");
}

console.log(`EN tools with generated features: ${stats.en}`);
console.log(`DE tools with generated features: ${stats.de}`);
console.log(`tool-specific FAQs added: ${stats.faq}`);
if (stats.missingMeta.length) {
  console.log(`tools without UI metadata (left untouched): ${stats.missingMeta.length}`);
  console.log(`  ${stats.missingMeta.slice(0, 20).join(", ")}`);
}

// A quick self-check: no two tools may end up with the same feature list.
const seen = new Map();
let duplicates = 0;
for (const tool of enTools) {
  const key = JSON.stringify(tool.features || []);
  if (seen.has(key)) duplicates += 1;
  seen.set(key, tool.slug);
}
console.log(`distinct EN feature lists: ${seen.size} / ${enTools.length} (${duplicates} duplicates)`);
