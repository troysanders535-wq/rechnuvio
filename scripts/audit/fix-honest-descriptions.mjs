/**
 * Make the catalog entries of the tools that claim a capability they do not
 * have honest.
 *
 * Six tools promise a local language model but do not run one:
 *
 * - `local-ai-chat`, `offline-ai-chat` and `private-ai-chatbot` ship a chat
 *   workspace that loads the weights from this site's own origin and reports
 *   whether WebGPU is available. No model is bundled and no inference runtime
 *   is part of this site, so the tool never produces a reply and never invents
 *   one. The description says exactly that, and the tracker records the three
 *   tools as BLOCKED_TECHNICAL for the chat capability itself.
 * - `regex-ai`, `regex-explainer` and `regex-generator` are deterministic
 *   helpers that build, explain and test regular expressions from fixed rules.
 *
 * Thirteen image tools promise a model as well: there is no face detection
 * model and no inpainting model on this site. The user marks the area and the
 * tool works on the pixels, and the description says so. Two of them promise
 * a download from a third party that this site deliberately does not perform;
 * the description explains what the tool really does instead.
 *
 * Three baby name generators promise an AI that does not exist: they draw from
 * the name list that ships with the app and narrow it with the filters.
 *
 * Two equation editors promise an export to PNG, SVG or PDF that the tool does
 * not perform. What the tool really does is render the formula as MathML in the
 * browser, offer a palette of clickable symbols and copy the MathML - and the
 * description says so.
 *
 * The script writes the English and the German text into `src/data/tools.ts`
 * and `src/data/tools_de.json`. It is idempotent: running it twice leaves the
 * catalogues unchanged.
 *
 * Usage: node scripts/audit/fix-honest-descriptions.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/** The honest English and German text for every tool that is corrected. */
const FIXES = {
  "local-ai-chat": {
    en: {
      name: "Local AI Chat",
      description:
        "A chat workspace for a language model that runs on your own device. No model ships with the site: the tool loads the weights for Qwen2.5 or Llama from this origin when you place them there, reports whether WebGPU is available and keeps every prompt on your device. The inference runtime is not part of this site yet, so no reply is generated and none is ever invented.",
    },
    de: {
      name: "Local AI Chat",
      description:
        "Ein Chat-Arbeitsbereich für ein Sprachmodell, das auf Ihrem eigenen Gerät läuft. Der Seite ist kein Modell beigelegt: Das Tool lädt die Gewichte für Qwen2.5 oder Llama von dieser Origin, wenn Sie sie dort abgelegt haben, meldet, ob WebGPU verfügbar ist, und behält jeden Prompt auf Ihrem Gerät. Die Inferenz-Laufzeit ist noch nicht Teil dieser Website, deshalb wird keine Antwort erzeugt und niemals eine erfunden.",
    },
  },
  "offline-ai-chat": {
    en: {
      name: "Offline AI Chat",
      description:
        "A private chat workspace for open-source language models that run on your device. No model is bundled: the tool loads the weights for Qwen2.5 or Llama from this origin when you place them there and reports whether WebGPU is available. The inference runtime is not part of this site yet, so no reply is generated. It never calls a remote service.",
    },
    de: {
      name: "Offline AI Chat",
      description:
        "Ein privater Chat-Arbeitsbereich für quelloffene Sprachmodelle, die auf Ihrem Gerät laufen. Es ist kein Modell mitgeliefert: Das Tool lädt die Gewichte für Qwen2.5 oder Llama von dieser Origin, wenn Sie sie dort abgelegt haben, und meldet, ob WebGPU verfügbar ist. Die Inferenz-Laufzeit ist noch nicht Teil dieser Website, deshalb wird keine Antwort erzeugt. Es ruft nie einen entfernten Dienst auf.",
    },
  },
  "private-ai-chatbot": {
    en: {
      name: "Private AI Chatbot",
      description:
        "A chatbot surface for a model that runs in your browser: your prompts stay on your device. No model is included with the site - the tool loads the weights for Phi-3 or Qwen2.5 from this origin when you place them there and reports whether WebGPU is available. The inference runtime is not part of this site yet, so no reply is generated and none is ever invented.",
    },
    de: {
      name: "Private AI Chatbot",
      description:
        "Eine Chatbot-Oberfläche für ein Modell, das in Ihrem Browser läuft: Ihre Eingaben bleiben auf Ihrem Gerät. Der Seite ist kein Modell beigelegt - Das Tool lädt die Gewichte für Phi-3 oder Qwen2.5 von dieser Origin, wenn Sie sie dort abgelegt haben, und meldet, ob WebGPU verfügbar ist. Die Inferenz-Laufzeit ist noch nicht Teil dieser Website, deshalb wird keine Antwort erzeugt und niemals eine erfunden.",
    },
  },
  "regex-ai": {
    en: {
      name: "Regex Pattern Assistant",
      description:
        "A pattern assistant for regular expressions: it assembles a well formed pattern from a description, breaks every token down in plain language and tests the result live. Deterministic rules, no model and no API key.",
    },
    de: {
      name: "Regex-Musterassistent",
      description:
        "Ein Musterassistent für reguläre Ausdrücke: Er setzt aus einer Beschreibung einen wohlgeformten Ausdruck zusammen, erklärt jedes Token in verständlicher Sprache und prüft das Ergebnis live. Deterministische Regeln, ohne Modell und ohne API-Schlüssel.",
    },
  },
  "regex-explainer": {
    en: {
      name: "Regex Explainer",
      description:
        "Explain a regular expression token by token: every group, quantifier, character class and escape is written out in plain language together with the part of the text it matches.",
    },
    de: {
      name: "Regex Explainer",
      description:
        "Erklären Sie einen regulären Ausdruck Token für Token: Jede Gruppe, jeder Quantifizierer, jede Zeichenklasse und jede Escape-Sequenz wird verständlich beschrieben, samt des Textteils, den sie trifft.",
    },
  },
  "regex-generator": {
    en: {
      name: "Regex Generator",
      description:
        "Build a regular expression from a plain-English description: pick the kind of pattern, type what you need and the tool assembles a matching expression from deterministic rules. No model and no API key needed.",
    },
    de: {
      name: "Regex Generator",
      description:
        "Erstellen Sie einen regulären Ausdruck aus einer englischen Beschreibung: Wählen Sie die Art des Musters, geben Sie an, was Sie brauchen, und das Tool setzt nach deterministischen Regeln eine passende Form zusammen. Ohne Modell und ohne API-Schlüssel.",
    },
  },
};

/**
 * The image tools whose catalogue promised a model that the site does not
 * have. There is no face detection model and no inpainting model here: the
 * user marks the area and the tool works on the pixels.
 */
const IMAGE_FIXES = {
  "blur-face": {
    en: {
      description:
        "Blur a face in a photo: mark the face with a rectangle or a brush and the tool softens that area before you download the picture. Runs in your browser, nothing is uploaded.",
    },
    de: {
      description:
        "Ein Gesicht in einem Foto weichzeichnen: Markieren Sie das Gesicht mit einem Rechteck oder einem Pinsel, dann weichzeichnet das Werkzeug diesen Bereich, bevor Sie das Bild herunterladen. Läuft in Ihrem Browser, nichts wird hochgeladen.",
    },
  },
  "censor-face": {
    en: {
      description:
        "Censor a face in a photo with a black box, an emoji, a blur or pixels: mark the face yourself and the marked area is covered. Runs in your browser, nothing is uploaded.",
    },
    de: {
      description:
        "Ein Gesicht in einem Foto schwärzen - mit Blackbox, Emoji, Unschärfe oder Pixeln: Markieren Sie das Gesicht selbst, der markierte Bereich wird überdeckt. Läuft in Ihrem Browser, nichts wird hochgeladen.",
    },
  },
  "face-pixelator": {
    en: {
      description:
        "Pixelate a face in a photo: mark the face and set the pixel size, then the marked area becomes a mosaic. Runs in your browser, nothing is uploaded.",
    },
    de: {
      description:
        "Ein Gesicht in einem Foto mosaikisieren: Markieren Sie das Gesicht und stellen Sie die Pixelgröße ein, dann wird der markierte Bereich zu einem Mosaik. Läuft in Ihrem Browser, nichts wird hochgeladen.",
    },
  },
  "magic-eraser": {
    en: {
      description:
        "Erase unwanted objects from a photo by brushing over them: the brushed area is filled with the average colour of the surrounding pixels. No model reconstructs what was behind it and nothing is uploaded.",
    },
    de: {
      description:
        "Unerwünschte Objekte aus einem Foto entfernen, indem Sie darüber bürsten: Der gepinselte Bereich wird mit der mittleren Farbe der umgebenden Pixel gefüllt. Kein Modell rekonstruiert das Dahinterliegende, und nichts wird hochgeladen.",
    },
  },
  "remove-object-from-photo": {
    en: {
      description:
        "Remove an object, a person, text or a watermark from a picture: select the photo, paint over what should go and the painted area is filled with the colour of the surrounding pixels. Nothing is uploaded.",
    },
    de: {
      description:
        "Objekt, Person, Text oder Wasserzeichen aus einem Bild entfernen: Wählen Sie das Foto, malen Sie über das, was verschwinden soll, und der gemalte Bereich wird mit der Farbe der umgebenden Pixel gefüllt. Nichts wird hochgeladen.",
    },
  },
  "background-remover": {
    en: {
      name: "Background Remover",
      description:
        "Make the background of a picture transparent: the colour of the border of the picture is treated as the background and removed, and the tolerance decides how many shades around it are caught. Download a transparent PNG or pick a solid background colour. Runs in your browser.",
    },
    de: {
      name: "Hintergrundentferner",
      description:
        "Machen Sie den Hintergrund eines Bildes transparent: Die Farbe am Rand des Bildes gilt als Hintergrund und wird entfernt, die Toleranz legt fest, wie viele Farbtöne darum herum erfasst werden. Laden Sie einen transparenten PNG herunter oder wählen Sie eine einfarbige Hintergrundfarbe. Läuft in Ihrem Browser.",
    },
  },
  "png-background-remover": {
    en: {
      description:
        "Remove the background from a PNG image: the colour of the border of the picture is made transparent and the cutout is saved as a new PNG with a transparent or a solid colour background.",
    },
    de: {
      description:
        "Entfernen Sie den Hintergrund eines PNG-Bildes: Die Farbe am Rand des Bildes wird transparent gemacht und der Ausschnitt als neues PNG mit transparentem oder einfarbigem Hintergrund gespeichert.",
    },
  },
  "transparent-background-maker": {
    en: {
      description:
        "Make the background of a photo transparent: the colour of the border of the picture is treated as the background and removed, then the cutout is exported as a transparent PNG for product pictures and design layouts.",
    },
    de: {
      description:
        "Machen Sie den Hintergrund eines Fotos transparent: Die Farbe am Rand des Bildes gilt als Hintergrund und wird entfernt, danach wird der Ausschnitt als transparenter PNG für Produktbilder und Designlayouts exportiert.",
    },
  },
  "open-graph-checker": {
    en: {
      description:
        "Read the Open Graph and Twitter Card tags of a page: paste the HTML of the head, the tool lists every og: and twitter: tag with its content and shows how the link looks when it is shared. Nothing is fetched from the network.",
    },
    de: {
      description:
        "Lesen Sie die Open-Graph- und Twitter-Card-Tags einer Seite: Fügen Sie den HTML-Code des Kopfbereichs ein, das Werkzeug listet jedes og:- und twitter:-Tag mit Inhalt auf und zeigt, wie der Link beim Teilen aussieht. Es wird nichts aus dem Netz geladen.",
    },
  },
  "open-graph-preview": {
    en: {
      description:
        "Preview the Open Graph and Twitter Card tags of a page: paste the HTML of the head and the tool shows the title, the description and the image the social networks would use for the link. Nothing is fetched from the network.",
    },
    de: {
      description:
        "Vorschau der Open-Graph- und Twitter-Card-Tags einer Seite: Fügen Sie den HTML-Code des Kopfbereichs ein und das Werkzeug zeigt Titel, Beschreibung und Bild, die die sozialen Netzwerke für den Link verwenden würden. Es wird nichts aus dem Netz geladen.",
    },
  },
  "youtube-thumbnail-downloader": {
    en: {
      description:
        "Build the official thumbnail addresses of a YouTube video: paste a video or Shorts link and the tool reads the video ID and lists the addresses of the thumbnails YouTube serves in every size. The pictures stay on YouTube's own server, this site does not download them.",
    },
    de: {
      description:
        "Erzeugen Sie die offiziellen Vorschaubild-Adressen eines YouTube-Videos: Fügen Sie einen Video- oder Shorts-Link ein, das Werkzeug liest die Video-ID und listet die Adressen der Vorschaubilder in allen Größen auf. Die Bilder liegen auf dem eigenen Server von YouTube, diese Seite lädt sie nicht herunter.",
    },
  },
  "youtube-thumbnail-grabber": {
    en: {
      description:
        "Build the thumbnail addresses of up to 50 YouTube videos at once: paste links or video IDs and the tool lists the address of every thumbnail size for each of them. The pictures stay on YouTube's own server, this site does not download them.",
    },
    de: {
      description:
        "Erzeugen Sie die Vorschaubild-Adressen von bis zu 50 YouTube-Videos auf einmal: Fügen Sie Links oder Video-IDs ein und das Werkzeug listet für jedes die Adresse jeder Vorschaubildgröße auf. Die Bilder liegen auf dem eigenen Server von YouTube, diese Seite lädt sie nicht herunter.",
    },
  },
};

Object.assign(FIXES, IMAGE_FIXES);

/**
 * The baby name generators.
 *
 * They draw from the name list that ships with the app and narrow it with the
 * filters. No model runs anywhere near them, so the catalogue must not claim
 * that an AI does the work.
 */
const BABY_NAME_FIXES = {
  "baby-name-ai": {
    en: {
      name: "Baby Name Generator",
      description:
        "Find a baby name from the list that ships with the tool: narrow it down by the gender, the cultural origin, the style and the length, and the generator draws eight suggestions from the names that fit. No model runs here, and nothing is uploaded.",
    },
    de: {
      name: "Baby-Namen-Generator",
      description:
        "Finden Sie einen Babynamen aus der mitgelieferten Liste: Grenzen Sie nach Geschlecht, kultureller Herkunft, Stil und Länge ein, und das Werkzeug zieht acht Vorschläge aus den passenden Namen. Hier läuft kein Modell, und nichts wird hochgeladen.",
    },
  },
  "baby-boy-name-generator": {
    en: {
      description:
        "Get boy name ideas with the origin, the style and the length you want: the generator draws from the names that ship with the tool and shows eight suggestions at a time. Nothing is uploaded.",
    },
    de: {
      description:
        "Bekommen Sie Jungennamen-Vorschläge mit der gewünschten Herkunft, dem Stil und der Länge: Das Werkzeug zieht aus den mitgelieferten Namen und zeigt acht Vorschläge gleichzeitig. Nichts wird hochgeladen.",
    },
  },
  "baby-girl-name-generator": {
    en: {
      description:
        "Get girl name ideas with the origin, the style and the length you want: the generator draws from the names that ship with the tool and shows eight suggestions at a time. Nothing is uploaded.",
    },
    de: {
      description:
        "Bekommen Sie Mädchennamen-Vorschläge mit der gewünschten Herkunft, dem Stil und der Länge: Das Werkzeug zieht aus den mitgelieferten Namen und zeigt acht Vorschläge gleichzeitig. Nichts wird hochgeladen.",
    },
  },
};

Object.assign(FIXES, BABY_NAME_FIXES);

/**
 * The two equation editors.
 *
 * They render the formula as MathML with the browser's own maths engine and
 * copy that MathML. They do not export a PNG, an SVG or a PDF, so the
 * description does not promise one.
 */
const EQUATION_FIXES = {
  "latex-equation-editor": {
    en: {
      description:
        "Write a LaTeX equation and watch it render: the live preview shows real MathML, a palette of clickable symbols helps you write, and you can copy the MathML. Free, private, no signup.",
    },
    de: {
      description:
        "Schreiben Sie eine LaTeX-Formel und sehen Sie sie sofort gerendert: Die Live-Vorschau zeigt echtes MathML, eine Palette anklickbarer Symbole hilft beim Schreiben, und Sie können das MathML kopieren. Kostenlos, privat, ohne Anmeldung.",
    },
  },
  "math-editor": {
    en: {
      description:
        "Write a mathematical formula in LaTeX and watch it render: the live preview shows real MathML, a palette of clickable symbols helps you write, and you can copy the MathML. Free, private, no signup.",
    },
    de: {
      description:
        "Schreiben Sie eine mathematische Formel in LaTeX und sehen Sie sie sofort gerendert: Die Live-Vorschau zeigt echtes MathML, eine Palette anklickbarer Symbole hilft beim Schreiben, und Sie können das MathML kopieren. Kostenlos, privat, ohne Anmeldung.",
    },
  },
};

Object.assign(FIXES, EQUATION_FIXES);

/**
 * The spreadsheet family.
 *
 * The tools read a real XLSX workbook and a real PDF statement in the browser.
 * What they cannot do is write an Excel file, export a ZIP of all sheets, or
 * read Parquet - so the catalogue does not promise those.
 */
const SHEET_FIXES = {
  "parquet-to-csv": {
    en: {
      description:
        "A browser has no Parquet reader: Parquet is a column store that no browser opens without a library, so this tool does not offer the file type at all. It explains what Parquet is and which readers can show the rows.",
    },
    de: {
      description:
        "Ein Browser hat keinen Parquet-Reader: Parquet ist ein Spaltenformat, das kein Browser ohne Bibliothek öffnet, deshalb bietet dieses Werkzeug den Dateityp gar nicht erst an. Es erklärt, was Parquet ist und welche Werkzeuge die Zeilen zeigen können.",
    },
  },
  "parquet-viewer": {
    en: {
      description:
        "A browser has no Parquet reader, so a Parquet file cannot be opened here. The tool explains the format, the row groups and the compression codecs it uses and points to the readers that can show the data.",
    },
    de: {
      description:
        "Ein Browser hat keinen Parquet-Reader, deshalb lässt sich hier keine Parquet-Datei öffnen. Das Werkzeug erklärt das Format, die Zeilengruppen und die Kompressionsverfahren und verweist auf die Werkzeuge, die die Daten zeigen können.",
    },
  },
  "bank-statement-converter": {
    en: {
      description:
        "Convert a text-based PDF bank statement into a clean table you can read, filter and export: the tool extracts the transaction lines from the PDF and hands them over as CSV or JSON. It runs in your browser, so the statement never leaves your device.",
    },
    de: {
      description:
        "Wandeln Sie ein textbasiertes PDF-Bankstatement in eine saubere Tabelle um, die Sie lesen, filtern und exportieren können: Das Werkzeug holt die Buchungszeilen aus dem PDF und übergibt sie als CSV oder JSON. Es läuft in Ihrem Browser, das Statement verlässt Ihr Gerät nie.",
    },
  },
  "bank-statement-to-excel": {
    en: {
      description:
        "Turn the transactions of a text-based PDF statement into a table you can review and export: the tool extracts the lines and hands them over as CSV, which Excel, LibreOffice and Google Sheets open directly.",
    },
    de: {
      description:
        "Machen Sie aus den Buchungen eines textbasierten PDF-Statements eine Tabelle, die Sie prüfen und exportieren können: Das Werkzeug holt die Zeilen heraus und übergibt sie als CSV, das Excel, LibreOffice und Google Sheets direkt öffnen.",
    },
  },
  "excel-to-csv": {
    en: {
      description:
        "Convert an Excel spreadsheet to CSV in your browser: pick the sheet and the delimiter and the tool reads the workbook itself - dates and percentages keep the format of the workbook. The file never leaves your device.",
    },
    de: {
      description:
        "Wandeln Sie ein Excel-Blatt im Browser in CSV um: Wählen Sie das Blatt und das Trennzeichen, und das Werkzeug liest die Arbeitsmappe selbst - Datums- und Prozentangaben behalten das Format der Mappe. Die Datei verlässt Ihr Gerät nie.",
    },
  },
  "excel-viewer": {
    en: {
      description:
        "Open an Excel spreadsheet in the browser: every sheet becomes a table you can sort by clicking a column header, and the sheet can be exported as CSV. The file never leaves your device.",
    },
    de: {
      description:
        "Öffnen Sie eine Excel-Arbeitsmappe im Browser: Jedes Blatt wird zu einer Tabelle, die Sie durch einen Klick auf die Spaltenüberschrift sortieren können, und das Blatt lässt sich als CSV exportieren. Die Datei verlässt Ihr Gerät nie.",
    },
  },
  "xlsx-to-csv": {
    en: {
      description:
        "Convert an XLSX file to CSV in your browser: pick the sheet and the delimiter, and the tool reads the workbook itself - a date cell keeps the format of the workbook. Nothing is uploaded.",
    },
    de: {
      description:
        "Wandeln Sie eine XLSX-Datei im Browser in CSV um: Wählen Sie das Blatt und das Trennzeichen, und das Werkzeug liest die Arbeitsmappe selbst - eine Datumszelle behält das Format der Mappe. Es wird nichts hochgeladen.",
    },
  },
  "xlsx-viewer": {
    en: {
      description:
        "Open an .xlsx file without Excel: every sheet becomes a table you can sort by clicking a column header, dates and percentages keep the format of the workbook, and the sheet can be exported as CSV. Nothing is uploaded.",
    },
    de: {
      description:
        "Öffnen Sie eine .xlsx-Datei ohne Excel: Jedes Blatt wird zu einer Tabelle, die Sie durch einen Klick auf die Spaltenüberschrift sortieren können, Datums- und Prozentangaben behalten das Format der Mappe, und das Blatt lässt sich als CSV exportieren. Es wird nichts hochgeladen.",
    },
  },
};

Object.assign(FIXES, SHEET_FIXES);

const enPath = join(root, "src", "data", "tools.ts");
const dePath = join(root, "src", "data", "tools_de.json");

let changed = 0;

/* --------------------------------------------------------- the EN catalogue -- */

let enSource = readFileSync(enPath, "utf8");
for (const [slug, fix] of Object.entries(FIXES)) {
  const marker = `"slug": "${slug}"`;
  const start = enSource.indexOf(marker);
  if (start < 0) {
    console.error(`! ${slug} is not in the English catalogue`);
    process.exit(1);
  }
  const next = enSource.indexOf('"slug":', start + marker.length);
  const end = next > 0 ? next : enSource.length;
  let block = enSource.slice(start, end);

  for (const [field, value] of Object.entries(fix.en)) {
    // A JSON string may hold an escaped quote, so the value is matched as a
    // whole string instead of up to the first quote character.
    const pattern = new RegExp(`"${field}":\\s*"(?:[^"\\\\]|\\\\.)*"`);
    const replacement = `"${field}": ${JSON.stringify(value)}`;
    if (!pattern.test(block)) {
      console.error(`! ${slug} has no ${field} in the English catalogue`);
      process.exit(1);
    }
    block = block.replace(pattern, replacement);
  }

  if (block !== enSource.slice(start, end)) changed += 1;
  enSource = enSource.slice(0, start) + block + enSource.slice(end);
}
writeFileSync(enPath, enSource, "utf8");

/* --------------------------------------------------------- the DE catalogue -- */

const de = JSON.parse(readFileSync(dePath, "utf8"));
for (const [slug, fix] of Object.entries(FIXES)) {
  if (!de[slug]) {
    console.error(`! ${slug} is not in the German catalogue`);
    process.exit(1);
  }
  for (const [field, value] of Object.entries(fix.de)) {
    if (de[slug][field] !== value) {
      de[slug][field] = value;
      changed += 1;
    }
  }
}
writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n", "utf8");

console.log(`${Object.keys(FIXES).length} tools corrected, ${changed} fields written.`);
