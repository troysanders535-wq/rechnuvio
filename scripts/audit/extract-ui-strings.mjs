/**
 * Extract every user-visible English UI string from the tool workspace
 * components, so they can be moved into the i18n message files.
 *
 * The extraction works on the parsed AST (see lib/ast-tools.mjs) rather than
 * with regular expressions over the source lines. A line-based scan cannot
 * tell a label from a data value, so it picked up grade codes such as "B+"
 * and turned them into translatable strings - and it could not see the
 * strings that live in an error message or an info line.
 *
 * The extractor and the codemod share one rule set:
 *   - only literals inside a React component or a custom hook are collected,
 *     because that is the only place where the translation hook can live;
 *   - a literal that carries meaning (a comparison operand, a switch case,
 *     an object key, a code such as a grade point) is never collected;
 *   - a JSX attribute is only collected when the attribute is a label.
 *
 * Output: scripts/audit/data/ui-strings.json
 *   { "<namespace>": { "<key>": { text, file } } }
 *
 * Usage: node scripts/audit/extract-ui-strings.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseTsx, collectLiterals } from "./lib/ast-tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outFile = join(here, "data", "ui-strings.json");

const TARGET_DIRS = [
  "src/components/engines",
  "src/components/calculators",
  "src/components/pdf",
];

/** Tokens that are technical names and must not be translated. */
const KEEP_AS_IS = new Set([
  "JSON", "YAML", "CSV", "TSV", "PDF", "SVG", "PNG", "JPG", "JPEG", "GIF", "WEBP",
  "WEBM", "MP4", "MP3", "WAV", "OGG", "EXE", "ZIP", "RAR", "GZIP", "BZIP2",
  "HTML", "CSS", "XML", "SQL", "MD", "DOCX", "XLSX", "PPTX", "RTF", "EML",
  "URL", "URI", "HTTP", "HTTPS", "API", "CORS", "DNS", "IP", "TCP", "UDP",
  "UTF8", "UTF-8", "ASCII", "BINARY", "HEX", "OCTAL", "DECIMAL", "BASE64",
  "MD5", "SHA1", "SHA-1", "SHA256", "SHA-256", "SHA512", "SHA-512", "HMAC",
  "UUID", "ULID", "JWT", "JWTs", "CSR", "ASN1", "PEM", "DER", "CRL", "OCSP",
  "X509", "TLS", "SSL", "SSLv3", "AES", "RSA", "ECDSA", "PBKDF2", "BCRYPT",
  "SCrypt", "HTML5", "ISO", "UTC", "GMT", "EST", "PST", "CST", "CET", "BST",
  "QR", "EAN13", "EAN-13", "UPC", "ISBN", "CODE128", "CODE39", "TIFF", "BMP",
  "ICO", "HEIC", "AVIF", "ODD", "XLS", "ODS", "PARQUET", "AVRO", "ORC",
  "TXT", "CSV", "TSV", "PDF/A", "OCR", "Tesseract", "pdf.js", "jsPDF",
  "Papaparse", "CryptoJS", "jsZip", "marked", "UUIDs", "Base64", "Decimal",
  "Binary", "Hex", "Roman", "Morse", "QR Code", "QR code", "MIME", "MIME type",
  "Courier New", "Arial", "Times New Roman", "Helvetica", "Georgia",
]);

/** Attributes whose value is a user-visible label. */
const LABEL_ATTRS = new Set([
  "placeholder", "title", "aria-label", "alt", "label", "confirmText",
  "emptyText", "helperText", "downloadName", "fileLabel", "buttonLabel",
  "subtitle", "hint", "description", "message", "note",
]);

/**
 * Sample/demo data that is rendered inside a tool but is not interface text.
 * These must keep their exact value in every locale.
 */
const SAMPLE_DATA = new Set([
  "Alice Johnson", "Frontend Lead", "Bob Smith", "Security Engineer",
  "Carol Davis", "Data Scientist", "John Doe", "Jane Smith", "Acme Corp",
  "Hello World", "Hello World 2026", "Lorem ipsum dolor sit amet",
]);

/**
 * Is this string a user-visible label?
 *
 * The rules are deliberately strict: a string that is not a label stays in
 * English, which is a far smaller problem than a label that is not
 * translated.
 */
function isUiLabel(text, opts = {}) {
  const sentence = opts.sentence === true;
  const s = text.trim();
  if (!s) return false;
  if (s.length < 2 || s.length > (sentence ? 200 : 90)) return false;
  if (/[{}<>\\`$@#^~|]/.test(s)) return false;
  if (!sentence && /\?/.test(s)) return false; // ternary fragment
  if (!sentence && /:/.test(s)) return false; // ternary fragment or code
  if (/"/.test(s) || /'/.test(s)) return false; // code fragment
  if (/^(https?:|\/\/)/i.test(s)) return false;
  if (/^[a-z0-9_-]+$/.test(s)) return false; // lowercase ids, tailwind, keys
  if (!/[A-Za-z]/.test(s)) return false;
  if (!/^[A-Z0-9?$…]/u.test(s)) return false; // must start like a sentence
  if (KEEP_AS_IS.has(s)) return false;
  if (SAMPLE_DATA.has(s)) return false;
  if (/^[A-Z0-9_]+$/.test(s)) return false; // CONSTANTS
  if (/^[a-z]+\.[A-Z]/.test(s)) return false; // Enum.Value
  if (s.endsWith(".") && s.length < 12) return false;
  return true;
}

/**
 * Is this standalone literal a sentence that a user reads?
 *
 * A literal such as "Content-Type" or "application/json" is part of the
 * program, not something a user reads, so it is never rewritten. A literal
 * that reads like a sentence is an error message or an info line and belongs
 * in the message files.
 */
function isSentence(text) {
  const s = text.trim();
  if (!s.includes(" ")) return false;
  if (s.endsWith(":")) return false;
  if (/^https?:/i.test(s)) return false;
  // a protocol or a path
  if (/^[a-z]+:\/\//i.test(s)) return false;
  // "Bearer token", "Content-Type" - a compound of two capitalised words
  // without a sentence-like ending
  if (/^[A-Z][A-Za-z]+-[A-Z][A-Za-z]+$/.test(s)) return false;
  return true;
}

/** camelCase key from an English label. */
function keyFor(text) {
  const base = text
    .trim()
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "value";
  const camel = base
    .split(" ")
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join("");
  return camel.charAt(0).toLowerCase() + camel.slice(1);
}

function namespaceFor(file) {
  const rel = relative(root, file).replace(/\\/g, "/");
  const base = rel
    .replace(/^src\/components\//, "")
    .replace(/\.tsx$/, "")
    .replace(/\//g, ".");
  return `ui.${base}`;
}

const files = [];
for (const dir of TARGET_DIRS) {
  const abs = join(root, dir);
  const walk = (current) => {
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(current, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".tsx")) files.push(full);
    }
  };
  walk(abs);
}

const namespaces = {};
let totalOccurrences = 0;
const skippedReport = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const ns = namespaceFor(file);
  const rel = relative(root, file).replace(/\\/g, "/");

  let ast;
  try {
    ast = await parseTsx(src);
  } catch (err) {
    console.log(`PARSE FAILED ${rel}: ${String(err.message).slice(0, 120)}`);
    continue;
  }

  const literals = collectLiterals(ast, src);
  const found = new Map(); // text -> { count, key }

  for (const lit of literals) {
    if (lit.attribute) {
      if (!lit.attr || !LABEL_ATTRS.has(lit.attr)) continue;
      if (!isUiLabel(lit.text)) continue;
    } else if (lit.literal) {
      if (!isSentence(lit.text)) continue;
      if (!isUiLabel(lit.text, { sentence: true })) continue;
    } else {
      // JSX text
      if (!isUiLabel(lit.text)) continue;
    }

    const t = lit.text.trim();
    if (!found.has(t)) found.set(t, { count: 0, key: keyFor(t) });
    found.get(t).count += 1;
    totalOccurrences += 1;
  }

  // The skipped literals are reported so they can be moved into a component
  // by hand if they turn out to be user-facing.
  const skipped = literals.skipped || [];
  const interesting = skipped.filter((s) => isUiLabel(s.text) && s.text.includes(" "));
  if (interesting.length) {
    skippedReport.push({
      file: rel,
      count: interesting.length,
      samples: [...new Set(interesting.map((s) => s.text))].slice(0, 8),
    });
  }

  if (!found.size) continue;

  const nsOut = namespaces[ns] || (namespaces[ns] = {});
  const used = new Set();
  for (const [text, info] of found) {
    let key = info.key;
    // two different labels can produce the same key - keep both
    let n = 2;
    while (nsOut[key] && nsOut[key].text !== text) {
      key = `${info.key}${n}`;
      n += 1;
    }
    if (nsOut[key] && nsOut[key].text === text) {
      nsOut[key].count += info.count;
      continue;
    }
    nsOut[key] = { text, file: rel, count: info.count };
    used.add(key);
  }
}

writeFileSync(outFile, JSON.stringify(namespaces, null, 1) + "\n", "utf8");

let unique = 0;
for (const ns of Object.keys(namespaces)) unique += Object.keys(namespaces[ns]).length;

console.log(`written: ${outFile}`);
console.log(`namespaces: ${Object.keys(namespaces).length}`);
console.log(`unique strings: ${unique}`);
console.log(`occurrences: ${totalOccurrences}`);
if (skippedReport.length) {
  console.log(`--- strings outside a component (need a manual look) ---`);
  for (const s of skippedReport) {
    console.log(`  ${s.file}: ${s.count} -> ${JSON.stringify(s.samples)}`);
  }
}
