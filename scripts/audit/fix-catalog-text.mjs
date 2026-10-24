/**
 * Repair two generation defects in the tool catalogs.
 *
 * 1. HTML entities left behind when the catalog was extracted from an HTML
 *    source (e.g. "Video &amp; Audio", "string&#x27;s length"). React renders
 *    these literally, so the entity text was visible to users.
 * 2. Descriptions that begin with the tool name glued to the real sentence
 *    (e.g. "Accept All Changes in WordAccept all tracked changes ...").
 *
 * Usage: node scripts/audit/fix-catalog-text.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { deglue } from "./catalog-deglue.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const DRY = process.argv.includes("--dry-run");

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  euro: "€",
  pound: "£",
  yen: "¥",
  times: "×",
  divide: "÷",
  minus: "−",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
};

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;

function unescapeEntities(input) {
  if (typeof input !== "string") return input;
  return input.replace(ENTITY_RE, (match, body) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const lower = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, lower) ? ENTITIES[lower] : match;
  });
}

/**
 * Cases the generic rules cannot recover, because the generator merged the
 * name with the first word of the description (shared prefix) and the
 * original word cannot be reconstructed from the name alone.
 *
 * The `de` entries also repair two descriptions whose name fragment was
 * glued in front of the sentence in a word order the rule cannot see, and
 * one German sentence that started with the English tool name.
 */
const OVERRIDES = {
  "de:keyboard-test": "Testen Sie Ihre Tastatur online: Jeder Schlüssel leuchtet auf, wenn er sich registriert, mit Key-Rollover, Chatter-Erkennung und einem JavaScript-Schlüsselcode-Log. Kostenlos, privat, keine Installation.",

  // The calendar works with the German federal states first and also offers
  // the US and the UK, so the description has to name all three.
  "en:2026-calendar":
    "Free printable 2026 calendar with German, US or UK holidays. Whole year on one page or monthly pages, Sunday or Monday start and week numbers. Instant PDF.",
  "de:2026-calendar":
    "Kostenloser druckbarer Kalender 2026 mit gesetzlichen Feiertagen in Deutschland (alle Bundesländer) sowie US- und britischen Feiertagen. Ganzes Jahr auf einer Seite oder Monatsseiten, Sonntag oder Montag Start- und Wochenzahlen. Sofort als PDF.",

  // The English tool name was glued into the middle of the German sentence.
  "de:white-elephant-rules":
    "White-Elephant-Regeln Schritt für Schritt erklärt: Zugreihenfolge, Stehlen, die 3-Steal-Freeze und der endgültige Tausch, plus beliebige Varianten und ein kostenloser Tracker.",

  // The printable calendar runs the same workspace as the 2026 calendar, so
  // it offers the German holidays as well.
  "en:printable-calendar":
    "Make a printable calendar for any year: monthly pages with notes or a one-page year, German, US or UK holidays, week numbers and 5 colours. Free PDF, no sign-up.",
  "de:printable-calendar":
    "Erstellen Sie einen druckbaren Kalender für jedes Jahr: Monatsseiten mit Notizen oder ein einseitiges Jahr, Feiertage in Deutschland, den USA oder Großbritannien, Wochenzahlen und 5 Farben. Kostenlose PDF, keine Anmeldung.",

  // The German username descriptions: the name was glued in front of the
  // sentence, and the Reddit one named a limit of 20 characters while the
  // tool allows 30.
  "de:username-generator":
    "Generieren Sie einen Benutzernamen mit Ihrem eigenen Wort oder erkunden Sie zufällige Ideen. Wählen Sie einen Stil, speichern Sie Favoriten und kopieren Sie Ihre Auswahl. Kostenlos und in Ihrem Browser verarbeitet.",
  "de:reddit-username-generator":
    "Erzeugen Sie einen Reddit-Benutzernamen aus lustigen, zufälligen oder personalisierten Wortkombinationen innerhalb des 30-Zeichen-Limits und speichern und kopieren Sie dann Ihre Favoriten.",
  "en:reddit-username-generator":
    "Generate a Reddit username from funny, random, or personalized word combinations within the 30-character limit, then save and copy your favorites.",

  // The video to GIF converter promised a trim, a frame rate, a width and a
  // speed. The workspace now offers a frame count, a frame rate, a trim
  // range and an output width, so the description names exactly those.
  "en:video-to-gif":
    "Turn MP4, MOV or WebM clips into animated GIFs in your browser. Set the frame count, the frame rate, the trim range and the output width, preview the clip and download the GIF. No upload, no watermark, completely free.",
  "de:video-to-gif":
    "Verwandeln Sie MP4-, MOV- oder WebM-Clips in Ihrem Browser in animierte GIFs. Legen Sie die Anzahl der Frames, die Bildrate, den Trim-Bereich und die Ausgabebreite fest, sehen Sie den Clip an und laden Sie das GIF herunter. Kein Upload, kein Wasserzeichen, völlig kostenlos.",

  // The two dice roller never animated, so the old description was wrong.
  // The workspace now also exports the history as a CSV file and shows the
  // probability of every sum.
  "en:roll-two-dice":
    "Roll two dice online and see both faces and their sum. Free 2d6 roller with a roll history, CSV export and a two-dice probability guide. Entirely client-side.",
  "de:roll-two-dice":
    "Rollen Sie zwei Würfel online und sehen Sie beide Seiten und ihre Summe. Kostenloser 2d6-Würfelroller mit Verlauf, CSV-Export und einem Zwei-Würfel-Wahrscheinlichkeitsführer. Vollständig im Browser.",
  "en:dice-roller":
    "Roll a dice online in your browser. Roll up to 100 dice, choose d4-d100 or custom sides, add modifiers and keep a history of your rolls. Free and 100% client-side.",
  "de:dice-roller":
    "Rollen Sie einen Würfel online in Ihrem Browser. Rollen Sie bis zu 100 Würfel, wählen Sie d4-d100 oder benutzerdefinierte Seiten, fügen Sie Modifikatoren hinzu und behalten Sie einen Verlauf Ihrer Würfe. Kostenlos und 100% kundenseitig.",

  // The fifteen format converters share one workspace: a file, the target
  // format, a quality slider, the output size and a download. They never had
  // a batch mode and never wrote a ZIP, but the old descriptions promised
  // both - and some of them promised a size saving that was never measured.
  "en:png-to-webp-converter":
    "Convert PNG images to WebP in your browser. Choose the target format, set the quality and the output size, then download the file. 100% in your browser, no uploads.",
  "de:png-to-webp-converter":
    "Wandeln Sie PNG-Bilder in Ihrem Browser in WebP um. Wählen Sie das Zielformat, stellen Sie Qualität und Ausgabegröße ein und laden Sie die Datei herunter. 100% in Ihrem Browser, keine Uploads.",
  "en:jpg-to-png-converter":
    "Convert JPG images to lossless PNG in your browser, for tools that only accept PNG. Set the output size and download the file. No uploads.",
  "de:jpg-to-png-converter":
    "Wandeln Sie JPG-Bilder in Ihrem Browser verlustfrei in PNG um, für Werkzeuge, die nur PNG akzeptieren. Stellen Sie die Ausgabegröße ein und laden Sie die Datei herunter. Keine Uploads.",
  "en:png-to-jpg-converter":
    "Convert PNG images to JPG in your browser. Set the quality and the output size, the transparency is flattened to white. Nothing is uploaded.",
  "de:png-to-jpg-converter":
    "Wandeln Sie PNG-Bilder in Ihrem Browser in JPG um. Stellen Sie Qualität und Ausgabegröße ein, die Transparenz wird auf Weiß flachgezogen. Nichts wird hochgeladen.",
  "en:jpg-to-webp-converter":
    "Convert JPG photos to WebP in your browser. Set the quality and the output size, then download the file. 100% in your browser, no uploads.",
  "de:jpg-to-webp-converter":
    "Wandeln Sie JPG-Fotos in Ihrem Browser in WebP um. Stellen Sie Qualität und Ausgabegröße ein und laden Sie die Datei herunter. 100% in Ihrem Browser, keine Uploads.",
  "en:webp-to-png-converter":
    "Convert WebP images to universally compatible PNG files in your browser. Set the output size and download the file. No uploads.",
  "de:webp-to-png-converter":
    "Wandeln Sie WebP-Bilder in Ihrem Browser in universell kompatible PNG-Dateien um. Stellen Sie die Ausgabegröße ein und laden Sie die Datei herunter. Keine Uploads.",
  "en:webp-to-jpg-converter":
    "Convert WebP images to universally supported JPG files with adjustable quality. Set the output size and download the file. 100% in your browser, no uploads.",
  "de:webp-to-jpg-converter":
    "Wandeln Sie WebP-Bilder mit einstellbarer Qualität in universell unterstützte JPG-Dateien um. Stellen Sie die Ausgabegröße ein und laden Sie die Datei herunter. 100% in Ihrem Browser, keine Uploads.",
  "en:webp-converter":
    "Convert JPG and PNG images to WebP and back again. Choose the target format, set the quality and the output size. 100% browser-based, nothing is uploaded.",
  "de:webp-converter":
    "Wandeln Sie JPG- und PNG-Bilder in WebP um und wieder zurück. Wählen Sie das Zielformat, stellen Sie Qualität und Ausgabegröße ein. 100% im Browser, nichts wird hochgeladen.",
  "en:bmp-to-jpg":
    "Convert BMP bitmaps to JPG in your browser. Set the quality and the output size, then download the file. Free, no upload, no sign-up.",
  "de:bmp-to-jpg":
    "Wandeln Sie BMP-Bitmaps in Ihrem Browser in JPG um. Stellen Sie Qualität und Ausgabegröße ein und laden Sie die Datei herunter. Kostenlos, kein Upload, keine Anmeldung.",
  "en:gif-to-png":
    "Convert a GIF to PNG with the transparency kept. Choose the output size and download the picture. Free, no upload, no sign-up.",
  "de:gif-to-png":
    "Wandeln Sie ein GIF in PNG um und behalten Sie die Transparenz. Wählen Sie die Ausgabegröße und laden Sie das Bild herunter. Kostenlos, kein Upload, keine Anmeldung.",
  "en:jfif-to-jpg":
    "Convert JFIF images to JPG in your browser and get standard .jpg files that every app accepts. Set the quality and the output size. Free and private.",
  "de:jfif-to-jpg":
    "Wandeln Sie JFIF-Bilder in Ihrem Browser in JPG um und erhalten Sie Standard-.jpg-Dateien, die jede App akzeptiert. Stellen Sie Qualität und Ausgabegröße ein. Kostenlos und privat.",
  "en:ico-to-png":
    "Convert an ICO icon to PNG and keep the transparency. Choose the output size and download the picture. No upload needed.",
  "de:ico-to-png":
    "Wandeln Sie ein ICO-Symbol in PNG um und behalten Sie die Transparenz. Wählen Sie die Ausgabegröße und laden Sie das Bild herunter. Kein Upload nötig.",
  "en:svg-to-png":
    "Convert an SVG drawing to PNG in your browser, with the transparency kept. Choose the output size and download the picture. Free, no upload.",
  "de:svg-to-png":
    "Wandeln Sie eine SVG-Zeichnung in Ihrem Browser in PNG um und behalten Sie die Transparenz. Wählen Sie die Ausgabegröße und laden Sie das Bild herunter. Kostenlos, kein Upload.",
  "en:svg-to-jpg":
    "Convert an SVG drawing to JPG in your browser, the transparency is flattened to white. Set the quality and the output size. Free, private and no file limits.",
  "de:svg-to-jpg":
    "Wandeln Sie eine SVG-Zeichnung in Ihrem Browser in JPG um, die Transparenz wird auf Weiß flachgezogen. Stellen Sie Qualität und Ausgabegröße ein. Kostenlos, privat und ohne Dateilimits.",
  "en:avif-to-png":
    "Convert AVIF to PNG in your browser, keeping the transparency. Set the output size and download the file. Free, no upload, no sign-up.",
  "de:avif-to-png":
    "Wandeln Sie AVIF in Ihrem Browser in PNG um und behalten Sie die Transparenz. Stellen Sie die Ausgabegröße ein und laden Sie die Datei herunter. Kostenlos, kein Upload, keine Anmeldung.",
  "en:avif-to-jpg":
    "Convert AVIF images to JPG in your browser. Set the quality and the output size, then download the file. Free, no upload, no sign-up.",
  "de:avif-to-jpg":
    "Wandeln Sie AVIF-Bilder in Ihrem Browser in JPG um. Stellen Sie Qualität und Ausgabegröße ein und laden Sie die Datei herunter. Kostenlos, kein Upload, keine Anmeldung.",

  // The Adobe, Photoshop and TIFF workspaces open one file, offer the target
  // format and save one picture. They never picked an artboard, a layer or
  // a page, never scaled the result and never wrote a ZIP.
  "en:ai-to-png":
    "Open an Adobe Illustrator .ai file in your browser and download the page as a PNG. Choose the target format, preview the artwork and save it. No Illustrator, no upload.",
  "de:ai-to-png":
    "Öffnen Sie eine Adobe Illustrator .ai-Datei in Ihrem Browser und laden Sie die Seite als PNG herunter. Wählen Sie das Zielformat, sehen Sie das Bildwerk an und speichern Sie es. Kein Illustrator, kein Upload.",
  "en:ai-to-pdf":
    "Open an Adobe Illustrator .ai file in your browser and download the page as a PDF. Choose the target format, preview the artwork and save it. No Illustrator, no upload.",
  "de:ai-to-pdf":
    "Öffnen Sie eine Adobe Illustrator .ai-Datei in Ihrem Browser und laden Sie die Seite als PDF herunter. Wählen Sie das Zielformat, sehen Sie das Bildwerk an und speichern Sie es. Kein Illustrator, kein Upload.",
  "en:psd-to-png":
    "Open a PSD file in your browser and download the artwork as a PNG with the transparency kept. Choose the target format and save the picture. Free, no upload.",
  "de:psd-to-png":
    "Öffnen Sie eine PSD-Datei in Ihrem Browser und laden Sie das Bildwerk als PNG mit erhaltener Transparenz herunter. Wählen Sie das Zielformat und speichern Sie das Bild. Kostenlos, kein Upload.",
  "en:psd-to-jpg":
    "Open a PSD file in your browser and download the artwork as a JPG on a white background. Choose the target format and save the picture. Free, private, no upload.",
  "de:psd-to-jpg":
    "Öffnen Sie eine PSD-Datei in Ihrem Browser und laden Sie das Bildwerk als JPG auf weißem Hintergrund herunter. Wählen Sie das Zielformat und speichern Sie das Bild. Kostenlos, privat, kein Upload.",
  "en:tiff-to-jpg":
    "Open a TIFF scan in your browser and download it as a JPG. Choose the target format, preview the scan and save the picture. Free, no upload.",
  "de:tiff-to-jpg":
    "Öffnen Sie einen TIFF-Scan in Ihrem Browser und laden Sie ihn als JPG herunter. Wählen Sie das Zielformat, sehen Sie den Scan an und speichern Sie das Bild. Kostenlos, kein Upload.",

  // The two resizers share one workspace: the new width and the new height,
  // an aspect ratio lock, the output format and the quality. They never
  // offered a percentage, a crop or a set of presets.
  "en:image-resizer":
    "Resize a picture in your browser: set the new width and the new height, keep the aspect ratio or set both by hand, choose the output format and the quality, then download it. Free and private, no uploads.",
  "de:image-resizer":
    "Skalieren Sie ein Bild in Ihrem Browser: legen Sie die neue Breite und die neue Höhe fest, behalten Sie das Seitenverhältnis bei oder geben Sie beide Werte von Hand ein, wählen Sie das Ausgabeformat und die Qualität und laden Sie das Bild herunter. Kostenlos und privat, keine Uploads.",
  "en:photo-resizer":
    "Resize a photo to new pixel dimensions with a live preview, then download the result. Keep the aspect ratio or set the width and the height yourself. Free online photo resizer, no uploads or watermark.",
  "de:photo-resizer":
    "Skalieren Sie ein Foto auf neue Pixeldimensionen mit einer Live-Vorschau und laden Sie das Ergebnis herunter. Behalten Sie das Seitenverhältnis bei oder geben Sie Breite und Höhe selbst an. Kostenloser Online-Foto-Resizer, keine Uploads und kein Wasserzeichen.",

  // The audit brief keeps user content in the memory only, so the three
  // notepads no longer write to the browser storage and the gift tracker
  // no longer keeps its list there either.
  "en:online-notepad":
    "Free online notepad with multi-tab editing and syntax highlighting. Your text stays in the memory of the tab - download it to keep it. 100% client-side, no signup.",
  "de:online-notepad":
    "Kostenloses Online-Notepad mit Multi-Tab-Bearbeitung und Syntax-Hervorhebung. Ihr Text bleibt im Speicher des Tabs - laden Sie ihn herunter, um ihn zu behalten. 100% kundenseitig, keine Anmeldung.",
  "en:notepad-plus-plus-online":
    "Notepad++ style tabbed editor that runs in the browser: syntax highlighting, find and replace, word wrap and zoom on macOS, Linux and ChromeOS, with nothing to install. Your text stays in the memory of the tab - download it to keep it.",
  "de:notepad-plus-plus-online":
    "Notepad++-Stil Tab-Editor, der im Browser läuft: Syntax-Hervorhebung, Suchen und Ersetzen, Zeilenumbruch und Zoom auf macOS, Linux und ChromeOS, ohne etwas zu installieren. Ihr Text bleibt im Speicher des Tabs - laden Sie ihn herunter, um ihn zu behalten.",
  "en:rapidtables-notepad-alternative":
    "A free open-and-type online notepad with no signup, plus named tabs and syntax highlighting. Your text stays in the memory of the tab - download it to keep it.",
  "de:rapidtables-notepad-alternative":
    "Ein kostenloses Open-and-Typ-Online-Notepad ohne Anmeldung, dazu benannte Tabs und Syntax-Hervorhebung. Ihr Text bleibt im Speicher des Tabs - laden Sie ihn herunter, um ihn zu behalten.",
  "en:christmas-gift-tracker":
    "Free Christmas gift tracker: list everyone you buy for, set budgets, and track each gift from idea to bought, wrapped and given. Print a PDF, no sign-up. Your list stays in the memory of the tab.",
  "de:christmas-gift-tracker":
    "Kostenloser Weihnachtsgeschenk-Tracker: Listen Sie alle auf, für die Sie kaufen, legen Sie Budgets fest und verfolgen Sie jedes Geschenk von der Idee bis zum Kauf, verpackt und gegeben. Drucken Sie ein PDF, keine Anmeldung. Ihre Liste bleibt im Speicher des Tabs.",

  // The two device panels show a live preview and a live level meter. The old
  // descriptions promised a waveform, a noise floor, a clipping check, a
  // frame rate, a lighting check, a photo and a clip - none of which the
  // panels ever had.
  "en:mic-test":
    "Test your microphone online: a live input level meter that shows the signal of your microphone while you speak. Free, private, the audio never leaves your device.",
  "de:mic-test":
    "Testen Sie Ihr Mikrofon online: eine Live-Anzeige des Eingangspegels zeigt das Signal Ihres Mikrofons, während Sie sprechen. Kostenlos, privat, der Ton verlässt Ihr Gerät nie.",
  "en:webcam-test":
    "Test your webcam online: a live preview of the camera in your browser, with the video kept on your device. Free, private, nothing uploaded.",
  "de:webcam-test":
    "Testen Sie Ihre Webcam online: eine Live-Vorschau der Kamera in Ihrem Browser, das Video bleibt auf Ihrem Gerät. Kostenlos, privat, nichts wird hochgeladen.",

  // The printable year calendar shows the twelve months as a table. It has
  // no holidays at all - that is the job of the holiday calendar - so the
  // old description, which promised US and UK holidays, was not true.
  "en:2027-calendar":
    "Free printable 2027 calendar: all twelve months as a table, Monday start. Print it straight away or download it as a PDF, no sign-up.",
  "de:2027-calendar":
    "Kostenloser druckbarer Kalender 2027: alle zwölf Monate als Tabelle, Wochenbeginn am Montag. Sofort drucken oder als PDF herunterladen, keine Anmeldung.",

  // The holiday calendar lists the holidays with their date and the day they
  // are observed on. It never offered an .ics file, so the old description
  // named a download that does not exist.
  "en:2027-holidays":
    "All US federal holidays and UK bank holidays of any year with the date they fall on and, when they fall on a weekend, the day they are observed on. Pick the year and the region.",
  "de:2027-holidays":
    "Alle US-Bundesfeiertage und britischen Bankfeiertage eines beliebigen Jahres mit dem Tag, an dem sie fallen, und - wenn sie auf ein Wochenende fallen - mit dem Tag, an dem sie gefeiert werden. Jahr und Region auswählen.",

  // The HEIC file cannot be decoded by the browsers this site runs in: there
  // is no HEIC decoder in the browser and no decoder library in the bundle.
  // The old description promised a real conversion, which the tool never
  // performed - it drew a notice on a canvas and called it a JPEG. The tool
  // stays in the catalogue because it still reads the container, and the
  // limitation is stated instead of hidden.
  "en:heic-to-jpg-converter":
    "Check whether a HEIC photo can be turned into a JPEG in your browser. No browser this site runs in ships a HEIC decoder, so the picture cannot be decoded and no JPEG can be produced from it. The tool reads the container and shows the format brand, the compatible brands and the size of the picture. Convert the photo to JPG first, then work on the JPG here. No upload, no sign-up.",
  "de:heic-to-jpg-converter":
    "Prüfen Sie, ob ein HEIC-Foto in Ihrem Browser in ein JPEG umgewandelt werden kann. Kein Browser, in dem diese Seite läuft, bringt einen HEIC-Decoder mit: Das Bild lässt sich nicht dekodieren, und daraus kann kein JPEG erzeugt werden. Das Werkzeug liest den Container und zeigt die Formatmarke, die kompatiblen Marken und die Bildgröße. Wandeln Sie das Foto zuerst in ein JPG um und arbeiten Sie dann mit dem JPG weiter. Ohne Upload, ohne Anmeldung.",
};

function fixTool(tool, stats, locale, slug) {
  const before = {
    name: tool.name,
    description: tool.description,
    category: tool.category,
  };

  tool.name = unescapeEntities(tool.name);
  tool.category = unescapeEntities(tool.category);
  tool.description = deglue(unescapeEntities(tool.description), tool.name);
  tool.keywords = (tool.keywords || []).map(unescapeEntities);
  tool.features = (tool.features || []).map(unescapeEntities);
  tool.faqs = (tool.faqs || []).map((f) => ({
    q: unescapeEntities(f.q),
    a: unescapeEntities(f.a),
  }));

  const override = OVERRIDES[`${locale}:${slug}`];
  if (override !== undefined) {
    tool.description = override;
  }

  if (before.name !== tool.name) stats.entities += 1;
  if (before.description !== tool.description) stats.deglued += 1;
  return tool;
}

// ---------------------------------------------------------------- EN catalog
const toolsPath = join(root, "src", "data", "tools.ts");
const toolsSrc = readFileSync(toolsPath, "utf8");
const marker = "export const TOOLS_CATALOG: ToolItem[] = ";
const arrStart = toolsSrc.indexOf(marker) + marker.length;
const arrEnd = toolsSrc.indexOf("\n];", arrStart);
const enTools = JSON.parse(toolsSrc.slice(arrStart, arrEnd + 2));

const enStats = { entities: 0, deglued: 0 };
for (const tool of enTools) fixTool(tool, enStats, "en", tool.slug);

const enOut =
  toolsSrc.slice(0, arrStart) +
  JSON.stringify(enTools, null, 2) +
  toolsSrc.slice(arrEnd + 2);
if (!DRY) writeFileSync(toolsPath, enOut, "utf8");
console.log(`EN  tools=${enTools.length} deglued=${enStats.deglued} entityFields=${enStats.entities}`);

// ---------------------------------------------------------------- DE catalog
const dePath = join(root, "src", "data", "tools_de.json");
const deRaw = JSON.parse(readFileSync(dePath, "utf8"));
const deStats = { entities: 0, deglued: 0 };
for (const [slug, value] of Object.entries(deRaw)) {
  fixTool(value, deStats, "de", slug);
}
if (!DRY) writeFileSync(dePath, JSON.stringify(deRaw, null, 2) + "\n", "utf8");
console.log(`DE  tools=${Object.keys(deRaw).length} deglued=${deStats.deglued} entityFields=${deStats.entities}`);
