/**
 * Repair the German catalogue: strip the name gloss that the machine
 * translation left glued in front of the description.
 *
 * The German descriptions were translated from an English source whose
 * descriptions still carried the tool name in front of them:
 *
 *   EN  "Video to GIF ConverterTurn MP4, MOV or WebM clips into GIFs ..."
 *   DE  "Video zu GIF ConverterTurn MP4, MOV oder WebM Clips in Ihrem Browser. ..."
 *
 * The seam is a lower-case letter that is followed by an upper-case one, so
 * it can be found without a dictionary - but "glTF", "GraphQL", "WebP" and
 * friends contain capitals as well. A seam therefore only counts as the glue
 * when BOTH sides agree with the English source:
 *
 *   left  - the part in front of the seam ends with the last word of the tool
 *           name (in English, in the German name field or in the synonym list)
 *   right - the part behind the seam starts with the first word of the
 *           English description (in English or in the synonym list)
 *
 * Both checks are needed: a name that merely contains a capital ("GraphQL")
 * never satisfies the left check, and a description that starts with a
 * capitalised technical term ("iPhone") never satisfies the right check.
 *
 * Usage: node scripts/audit/fix-de-catalog-text.mjs [--apply]
 */

import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");

/* ------------------------------------------------------------- the data --- */

const enSrc = readFileSync("src/data/tools.ts", "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const enStart = enSrc.indexOf(marker) + marker.length;
const enEnd = enSrc.indexOf("\n];", enStart);
const enTools = JSON.parse(enSrc.slice(enStart, enEnd + 2));
const enBySlug = new Map(enTools.map((t) => [t.slug, t]));

const dePath = "src/data/tools_de.json";
const deRaw = JSON.parse(readFileSync(dePath, "utf8"));

/* ----------------------------------------------------------- the wording --- */

/** The last word of the English name, in its German wording. */
const NOUN_SYNONYMS = {
  calculator: ["rechner", "konverter"],
  converter: ["konverter", "converter"],
  viewer: ["betrachter", "viewer", "betrachter"],
  maker: ["ersteller", "maker", "generator"],
  counter: ["zähler", "counter", "zaehler"],
  generator: ["generator", "ersteller"],
  editor: ["editor", "bearbeitung"],
  tester: ["test", "tester", "pruefer"],
  checker: ["prüfer", "checker", "pruefer"],
  remover: ["entferner", "remover", "entfernen"],
  splitter: ["splitter", "teiler"],
  compressor: ["kompressor", "compressor"],
  beautifier: ["beautifier", "verschönerer"],
  formatter: ["formatter", "formatierer"],
  minifier: ["minifier", "minifizierer"],
  analyzer: ["analyser", "analyzer", "analysator"],
  resizer: ["resizer", "skalierer"],
  translator: ["translator", "übersetzer"],
  decoder: ["decoder", "dekodierer"],
  encoder: ["encoder", "kodierer"],
  inspector: ["inspektor", "prüfer"],
  pages: ["seiten"],
  files: ["dateien"],
  fonts: ["schriften"],
  images: ["bilder"],
  texts: ["texte"],
  numbers: ["zahlen"],
  words: ["wörter"],
  characters: ["zeichen"],
  lists: ["listen"],
  codes: ["codes"],
  keys: ["schlüssel"],
  passwords: ["passwörter"],
  names: ["namen"],
  videos: ["videos"],
  photos: ["fotos"],
  notes: ["notizen"],
  tables: ["tabellen"],
  forms: ["formulare"],
  templates: ["vorlagen"],
  tests: ["tests"],
  sizes: ["größen"],
  weights: ["gewichte"],
  colors: ["farben"],
  interface: ["schnittstelle"],
  equation: ["gleichung"],
  equations: ["gleichungen"],
  text: ["text"],
  image: ["bild"],
  file: ["datei"],
  page: ["seite"],
  document: ["dokument"],
  documents: ["dokumente"],
  card: ["karte"],
  cards: ["karten"],
  board: ["brett"],
  sheet: ["blatt"],
  audio: ["audio"],
  video: ["video"],
  data: ["daten"],
  bitmap: ["bitmap"],
  map: ["karte"],
  grammar: ["grammatik"],
  checkerboard: ["schachbrett"],
  watermark: ["wasserzeichen"],
};

/** The first word of the English description, in its German wording. */
const VERB_SYNONYMS = {
  accept: ["akzeptier"],
  add: ["hinzufüg", "fügen"],
  analyze: ["analysier"],
  apply: ["anwend"],
  beautify: ["verschön", "schön"],
  browse: ["durchsuch"],
  build: ["erstell", "bauen"],
  calculate: ["berechn"],
  check: ["prüf", "check"],
  clean: ["bereinig", "reinig"],
  combine: ["kombinier", "kombin"],
  compress: ["komprimier"],
  convert: ["konvertier", "umwandel", "wandel"],
  copy: ["kopier"],
  count: ["zähl"],
  crop: ["zuschneid", "beschneid"],
  create: ["erstell"],
  decode: ["dekodier", "dekod"],
  define: ["definier"],
  describe: ["beschreib"],
  design: ["entwurf", "design", "gestalt"],
  diagnose: ["diagnostizier"],
  discover: ["entdeck"],
  download: ["herunterlad", "laden"],
  duplicate: ["duplizier"],
  edit: ["bearbeit"],
  encode: ["kodier", "kod"],
  encrypt: ["verschlüssel"],
  estimate: ["schätz"],
  evaluate: ["bewert"],
  examine: ["untersuch"],
  explore: ["durchsuch", "entdeck"],
  export: ["exportier"],
  extract: ["extrabier"],
  flip: ["flip"],
  format: ["formatiere", "format"],
  free: ["frei", "freier"],
  generate: ["erstell", "generier"],
  hash: ["hash", "hashen"],
  highlight: ["hervorheb"],
  import: ["importier"],
  include: ["enthalt", "inkludier"],
  inspect: ["prüf", "inspektier", "untersuch"],
  join: ["verbind"],
  learn: ["lern"],
  lint: ["lint", "prüf"],
  list: ["auflist", "listen"],
  look: ["schau", "find"],
  make: ["erstell", "mach"],
  merge: ["zusammenführ", "zusammenf"],
  mine: ["minen", "extrahier"],
  monitor: ["überwach"],
  normalize: ["normalisier"],
  open: ["öffn"],
  outline: ["glieder"],
  overview: ["überblick"],
  pad: ["auffüll", "füll"],
  parse: ["pars"],
  paste: ["einfüg", "fügen"],
  plan: ["plan"],
  practice: ["üb"],
  preview: ["vorschau"],
  print: ["druck"],
  process: ["verarbeit", "bearbeit"],
  protect: ["schütz"],
  quiz: ["quiz"],
  read: ["lies", "lesen"],
  recolor: ["umfärb", "färb"],
  record: ["aufnehm"],
  regenerate: ["erstell", "generier"],
  remove: ["entfern"],
  rename: ["benenn", "umbenenn"],
  render: ["rend", "darstell"],
  replace: ["ersetz"],
  resize: ["skalier", "skalier"],
  rotate: ["rotier"],
  run: ["ausführ", "start"],
  sanitize: ["bereinig", "reinig"],
  save: ["speicher"],
  scale: ["skalier"],
  scan: ["scann", "scan"],
  schedule: ["plan", "termin"],
  score: ["bewert", "punkt"],
  seal: ["siegel"],
  search: ["such"],
  share: ["teil", "teilen"],
  shuffle: ["misch", "schuffel", "zufällig"],
  sign: ["signier"],
  simplify: ["vereinfach"],
  simulate: ["simulier", "simul"],
  sort: ["sortier"],
  spell: ["korrigier", "rechtschreib"],
  split: ["teil"],
  stamp: ["stempel"],
  stitch: ["stitch", "näh"],
  suggest: ["vorschlag", "schlag"],
  summarize: ["zusammenfass"],
  swap: ["tausch", "wechsel"],
  test: ["test"],
  trace: ["verfolg", "nachverfolg"],
  transform: ["umwandel", "wandel", "transform"],
  translate: ["übersetz"],
  trim: ["kürz", "schneid"],
  turn: ["umwandel", "wandel", "dreh"],
  unfold: ["ausklapp"],
  upload: ["hochlad"],
  validate: ["validier", "prüf"],
  view: ["anseh", "view"],
  wrap: ["umschließ", "umschlie"],
  write: ["schreib"],
  zoom: ["zoom"],
};

/* ------------------------------------------------------------- the logic --- */

const words = (text) => String(text).match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [];

const lower = (s) => s.toLowerCase();

/** Does `text` end with `word`, ignoring case? */
function endsWithWord(text, word) {
  if (!word) return false;
  const w = lower(word);
  if (w.length < 3) return false;
  const t = lower(text);
  if (!t.endsWith(w)) return false;
  const before = t.slice(0, t.length - w.length);
  return before === "" || !/[\p{L}\p{N}]/u.test(before.slice(-1));
}

/**
 * Does `text` start with `word`, ignoring case?
 *
 * A stem match is enough: the German verb carries an ending ("validieren"
 * against "validate"), so the text after the match may continue with
 * letters.
 */
function startsWithWord(text, word) {
  if (!word) return false;
  const w = lower(word);
  if (w.length < 3) return false;
  return lower(text).startsWith(w);
}

/**
 * The ways the left side of a seam can prove that it ends with the name:
 *   a) the whole left side IS the name (the gloss repeats it verbatim)
 *   b) the left side ends with the last word of the English name
 *   c) the left side ends with the last word of the German name field
 *   d) the left side ends with a German wording of an English name word
 */
function leftMatches(before, enName, deName) {
  const norm = (s) => lower(String(s).replace(/[^\p{L}\p{N}]+/gu, ""));
  if (norm(before) && (norm(before) === norm(enName) || norm(before) === norm(deName))) {
    return true;
  }
  const en = words(enName || "");
  const de = words(deName || "");
  const lastEn = en.length ? en[en.length - 1] : "";
  const lastDe = de.length ? de[de.length - 1] : "";
  if (lastEn && endsWithWord(before, lastEn)) return true;
  if (lastDe && endsWithWord(before, lastDe)) return true;
  for (const w of en) {
    for (const syn of NOUN_SYNONYMS[lower(w)] || []) {
      if (endsWithWord(before, syn)) return true;
    }
  }
  return false;
}

/**
 * A strong name match: the left side really is the name, not merely a word
 * that happens to be the last word of it.
 *
 * Either the left side is the name verbatim, or more than half of the
 * English name words are found in it. The second test keeps a description
 * like "Write und Preview Markdown ..." - where "Preview" is the last word
 * of the name "Markdown Preview" but the left side is really the beginning
 * of the description - out of the result.
 */
function strongNameMatch(before, enName, deName) {
  const norm = (s) => lower(String(s).replace(/[^\p{L}\p{N}]+/gu, ""));
  if (norm(before) && (norm(before) === norm(enName) || norm(before) === norm(deName))) {
    return true;
  }
  const en = words(enName || "").filter((w) => w.length >= 3);
  if (!en.length) return false;
  const haystack = lower(before);
  const hits = en.filter((w) => haystack.includes(lower(w))).length;
  return hits / en.length > 0.5;
}

/**
 * The ways the right side of a seam can prove that the description starts
 * there:
 *   strict  - it begins with the first word of the English description or a
 *             German wording of it
 *   relaxed - it begins with any word the English description contains
 *
 * The relaxed test is only allowed when the left side is a strong name
 * match, because otherwise a description that merely starts with a word of
 * the name ("Write und Preview Markdown ...") would be cut apart.
 */
function rightMatches(after, enDesc, relaxed) {
  const en = words(enDesc || "");
  if (!en.length) return false;
  const first = lower(en[0]);
  if (startsWithWord(after, en[0])) return true;
  for (const syn of VERB_SYNONYMS[first] || []) {
    if (startsWithWord(after, syn)) return true;
  }
  if (!relaxed) return false;
  for (const w of en) {
    if (w.length >= 3 && startsWithWord(after, w)) return true;
  }
  return false;
}

function nameCandidates(enName, deName) {
  const out = [];
  const en = words(enName || "");
  if (en.length) out.push(en[en.length - 1]);
  const de = words(deName || "");
  if (de.length) out.push(de[de.length - 1]);
  for (const w of en) {
    for (const syn of NOUN_SYNONYMS[lower(w)] || []) out.push(syn);
  }
  return out;
}

/**
 * Every place where the name gloss could meet the description:
 *   - a glued seam: a lower-case letter directly followed by an upper-case one
 *   - a spaced seam: the end of a word followed by a space
 */
function seams(text, limit) {
  const out = [];
  for (let i = 1; i < Math.min(text.length, limit); i += 1) {
    if (/[a-zäöüß]/.test(text[i - 1]) && /[A-ZÄÖÜ]/.test(text[i])) {
      out.push({ at: i, glued: true });
      continue;
    }
    if (text[i - 1] === " " && /[A-ZÄÖÜ]/.test(text[i])) {
      out.push({ at: i, glued: false });
    }
  }
  return out;
}

/* ------------------------------------------------------------- the repair --- */

/**
 * The boundaries the automatic rule cannot find on its own.
 *
 * `strip` removes the given prefix - the script fails loudly when the
 * description does not start with it. `replace` writes a freshly worded
 * German description, used where the machine translation left a fragment
 * that cannot be repaired by removing the name.
 */
const OVERRIDES = {
  "ai-to-png": { strip: "AI zu PNG Converter" },
  "bank-statement-to-csv": { strip: "Kontoauszug an CSV" },
  "base64-image-viewer": { strip: "Base64 Image Viewer " },
  "base64-to-pdf": { strip: "Base64 zum PDF" },
  "binary-calculator": { strip: "Binärrechner" },
  "binary-translator": { strip: "Binärtranslator" },
  "bmi-calculator-for-women": { strip: "BMI-Rechner für Frauen" },
  "censor-image": { strip: "Zensor Image" },
  "christmas-bingo": { strip: "Weihnachts-Bingo-Karten " },
  "christmas-budget-planner": { strip: "Weihnachtsbudgetplaner " },
  "christmas-gift-tracker": { strip: "Weihnachtsgeschenk-Tracker " },
  "christmas-list-template": { strip: "Druckbare Weihnachtsliste Vorlage " },
  "compress-pdf": { strip: "Komprimieren Sie PDF" },
  "concrete-calculator": { strip: "Betonrechner" },
  "csv-viewer": { strip: "CSV Viewer" },
  "cumulative-gpa-calculator": { strip: "Kumulativer GPA-Rechner " },
  "diff-checker": { strip: "Online Diff Checker" },
  "double-click-test": { strip: "Doppelklick Test" },
  "electricity-cost-calculator": { strip: "Stromkostenrechner" },
  "equation-editor": { strip: "Online-Gleichungseditor " },
  "extract-pdf-pages": { strip: "Auszug PDF Seiten" },
  "fraction-to-decimal-calculator": { strip: "Bruch zu Dezimalrechner" },
  "gift-exchange-generator": { strip: "Geschenkaustauschgenerator " },
  "graphql-schema-viewer-validator": { strip: "GraphQL Schema Viewer & Validator" },
  "hours-calculator": { strip: "Stundenrechner" },
  "html-table-to-markdown": { strip: "HTML-Tabelle in Markdown " },
  "image-to-pdf": { strip: "Bild zu PDF Konverter" },
  "jpg-to-pdf-converter": { strip: "JPG zu PDF Converter" },
  "instagram-photo-splitter": { strip: "Instagram Photo Splitter" },
  "invisible-character": { strip: "Unsichtbare Zeichen " },
  "maintenance-calorie-calculator": { strip: "Wartung Kalorienrechner" },
  "markdown-to-pdf": { strip: "Markdown in PDF" },
  "markdown-to-pdf-converter": { strip: "Konvertieren Sie Markdown in PDF " },
  "md-to-pdf": { strip: "MD zu PDF" },
  "merge-pdf": { strip: "Merge PDF-Dateien " },
  "mouse-test": { strip: "Maus " },
  "overtime-calculator": { strip: "Überstundenkalkulieren " },
  "pdf-to-jpg-converter": { strip: "PDF zu JPG Converter " },
  "pdf-to-md": { strip: "PDF to MD Converter" },
  "photo-resizer": { strip: "Foto Resizer" },
  "png-to-pdf": { strip: "PNG zu PDF" },
  "psd-viewer": { strip: "PSD Viewer" },
  "random-number-generator": { strip: "Zufallszahlengenerator" },
  "resize-png": { strip: "Ändern Sie die Größe von PNG" },
  "rgb-to-hex": { strip: "RGB in HEX" },
  "simplify-fractions-calculator": { strip: "Vereinfachen Sie Fractions Calculator" },
  "string-length-calculator": { strip: "String Length Calculator" },
  "tiff-to-jpg": { strip: "Konvertieren Sie TIFF zu JPG " },
  "variance-calculator": { strip: "Varianzrechner" },
  "white-elephant-rules": { strip: "White-Elephant-Regeln " },
  "world-time-converter": { strip: "World Time Converter " },
  "yes-or-no-wheel": { strip: "Ja oder kein Rad" },
  // The machine translation merged the name and the sentence, so removing the
  // name would leave a fragment. These three are worded again instead.
  "percentage-difference-calculator": {
    replace:
      "Finden Sie die prozentuale Differenz zwischen zwei Zahlen anhand ihres Durchschnitts als Referenz, " +
      "mit Rechenweg, Excel-Formel und Hinweis, wann man die Methode einsetzt.",
  },
  "percentage-increase-calculator": {
    replace:
      "Berechnen Sie die prozentuale Zunahme zwischen zwei Zahlen, erhöhen Sie eine Zahl um einen Prozentsatz " +
      "oder finden Sie den Ausgangswert. Sofortige Antworten mit Rechenweg.",
  },
  "remove-photo-location": {
    replace:
      "Entfernen Sie GPS-Standortdaten, die in einem Foto eingebettet sind, bevor Sie es online teilen, " +
      "und laden Sie dann eine bereinigte Kopie herunter. Kostenlos und privat: Ihr Foto verlässt Ihr Gerät nie.",
  },
};

/** Slugs whose boundary could not be found automatically. */
const unresolved = [];

let repaired = 0;
const changes = [];
for (const [slug, entry] of Object.entries(deRaw)) {
  const desc = typeof entry.description === "string" ? entry.description : "";
  const en = enBySlug.get(slug);
  if (!desc || !en) continue;

  const override = OVERRIDES[slug];
  if (override) {
    if (override.replace !== undefined) {
      changes.push({ slug, removed: desc, kept: override.replace });
      entry.description = override.replace;
      repaired += 1;
      continue;
    }
    const prefix = override.strip;
    if (!desc.startsWith(prefix)) {
      throw new Error(`${slug}: the description does not start with "${prefix}"`);
    }
    const rest = desc.slice(prefix.length).trimStart();
    changes.push({ slug, removed: prefix, kept: rest });
    entry.description = rest;
    repaired += 1;
    continue;
  }

  let boundary = -1;
  for (const seam of seams(desc, 140)) {
    const i = seam.at;
    const before = seam.glued ? desc.slice(0, i) : desc.slice(0, i - 1);
    const after = desc.slice(i);
    if (leftMatches(before, en.name, entry.name) && rightMatches(after, en.description)) {
      boundary = i;
      break;
    }
  }

  if (boundary < 0) {
    // A description only carries a gloss when the translator kept one. The
    // word count of the leading words gives a second opinion: the gloss is
    // roughly as long as the English name.
    const enWords = words(en.name).length;
    let suspicious = false;
    for (const seam of seams(desc, 100)) {
      const before = seam.glued ? desc.slice(0, seam.at) : desc.slice(0, seam.at - 1);
      if (Math.abs(words(before).length - enWords) <= 2) suspicious = true;
    }
    if (suspicious) unresolved.push({ slug, desc, enWords });
    continue;
  }
  const rest = desc.slice(boundary).trimStart();
  if (words(rest).length < 6) {
    unresolved.push({ slug, desc, enWords: words(en.name).length });
    continue;
  }
  changes.push({ slug, removed: desc.slice(0, boundary), kept: rest });
  entry.description = rest;
  repaired += 1;
}

console.log(`repaired: ${repaired} of ${Object.keys(deRaw).length}`);
console.log(`unresolved: ${unresolved.length}`);
console.log("");
for (const c of changes) {
  console.log(`${c.slug}\n  - ${c.removed}\n  + ${c.kept.slice(0, 96)}`);
}
if (unresolved.length) {
  console.log("\n--- unresolved ---");
  for (const u of unresolved) {
    console.log(`${u.slug} :: ${u.desc.slice(0, 90)}`);
  }
}

if (APPLY) {
  writeFileSync(dePath, `${JSON.stringify(deRaw, null, 2)}\n`, "utf8");
  console.log(`\nwritten: ${dePath}`);
}
