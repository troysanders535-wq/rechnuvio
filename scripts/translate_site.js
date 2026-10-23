const fs = require('fs');
const path = require('path');

const LIBRE_URL = 'http://127.0.0.1:5000/translate';

// Load existing messages if present
let existingEn = {};
let existingDe = {};

try {
  existingEn = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
} catch (e) {}

try {
  existingDe = JSON.parse(fs.readFileSync('messages/de.json', 'utf8'));
} catch (e) {}

// Comprehensive Site Dictionary
const siteEn = {
  nav: {
    brandName: "Digital ToolPad",
    allTools: "All tools",
    categories: "Categories",
    productivitySuite: "Productivity Suite",
    about: "About",
    contact: "Contact",
    blog: "Blog",
    feedback: "Feedback",
    searchPlaceholder: "Search 492 tools",
    searchModalTitle: "Search All Browser Tools",
    searchModalPlaceholder: "Search 492 free online browser tools... (e.g. JSON, PDF, Base64, UUID)",
    searchNoResults: "No tools match your query.",
    searchShortcut: "⌘K",
    popularCategories: "Popular Categories",
    toggleTheme: "Toggle theme",
    toggleNav: "Toggle navigation",
    close: "Close"
  },
  home: {
    trustBadge: "100% Private Client-Side Architecture • 0 Bytes Sent to Cloud",
    heroTitleLine1: "Free Online Tools for",
    heroTitleLine2: "PDF, Images, Text & Code",
    heroSubtitle: "Instant browser utilities that process files on your device. Convert documents, beautify JSON, resize photos, calculate formulas, and manipulate data with absolute zero server latency.",
    searchTriggerPlaceholder: "Search 492 free online browser tools... (e.g. JSON, PDF, Base64, UUID)",
    popular: "Popular:",
    catalogTitle: "Explore Browser Tools",
    catalogSubtitle: "Browse through our comprehensive directory of 492 high-performance utilities.",
    filterPlaceholder: "Filter by keyword...",
    launchTool: "Launch Tool",
    viewAllTools: "View All 492 Tools in Directory",
    badgeBrowser: "Browser"
  },
  footer: {
    valPropPrivacyTitle: "100% Client-Side Privacy",
    valPropPrivacyDesc: "Your files, JSON, passwords, and text process in your browser sandbox. Nothing is uploaded to remote servers.",
    valPropSpeedTitle: "Zero Latency Performance",
    valPropSpeedDesc: "Instant real-time execution powered by WebAssembly, Web Crypto, and modern browser engines.",
    valPropFreeTitle: "492 Free Browser Tools",
    valPropFreeDesc: "All developer, document, calculation, and media utilities available forever with zero sign-up or paywalls.",
    aboutDesc: "The premier suite of free online web tools for developers, designers, students, and professionals. Format JSON, convert CSV, resize images, test regex, calculate formulas, and manipulate PDFs safely in your browser.",
    copyright: "© 2026 Digital ToolPad. All rights reserved.",
    colDataCode: "Data & Code",
    colMediaPdf: "Media & PDFs",
    colPlatform: "Platform",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    contactUs: "Contact Us",
    allToolsDirectory: "All 492 Tools Directory"
  },
  toolsPage: {
    title: "All Online Tools ({count})",
    subtitle: "Explore our complete directory of free online developer, document, calculation, and media utilities. Every single tool runs 100% locally in your browser memory.",
    searchPlaceholder: "Filter by tool name, purpose, or category (e.g. JSON, YAML, PDF, Hash)...",
    noResults: "No tools match your criteria. Try adjusting your search query or filter.",
    categoryFilterAll: "All"
  },
  categories: {
    jsonTools: "JSON Tools & Utilities",
    jsonDesc: "Format, validate, beautify, and convert JSON data with 100% client-side privacy.",
    yamlTools: "YAML Tools & Validators",
    yamlDesc: "Edit, validate, and convert YAML to JSON and JSON to YAML online in your browser.",
    markdownTools: "Markdown Tools & Converters",
    markdownDesc: "Edit, preview, and convert Markdown documents to PDF, Word (DOCX), and HTML.",
    pdfTools: "PDF Tools & Document Suite",
    pdfDesc: "Merge, split, compress, and convert PDF documents directly in your browser without uploading files.",
    imageTools: "Image & Photo Utilities",
    imageDesc: "Resize, compress, remove backgrounds, convert formats (WebP, PNG, JPG), and inspect Exif metadata.",
    textTools: "Text & Typography Utilities",
    textDesc: "Count words, estimate LLM tokens, compare diffs, convert text case, and remove duplicate lines.",
    developerTools: "Developer & Coding Utilities",
    developerDesc: "SQL formatters, Regex testers, API testing runners, SSL decoders, and code generators.",
    calculatorTools: "Math & Financial Calculators",
    calculatorDesc: "Percentage calculators, GPA estimators, salary to hourly conversions, ratios, and fractions.",
    productivityTools: "Productivity & Time Suite",
    productivityDesc: "Pomodoro focus timers, Unix timestamp converters, timezone planners, and printable calendars.",
    base64Tools: "Base64 Encoders & Decoders",
    base64Desc: "Encode text and files to Base64, decode Base64 data URLs to images and PDFs safely.",
    encodingTools: "Encoding & Cipher Converters",
    encodingDesc: "Binary to text, Hex to ASCII, Morse code translator, Roman numerals, and number base conversions.",
    healthTools: "Health & Fitness Calculators",
    healthDesc: "BMI body mass index, BMR, TDEE maintenance calorie calculator, and daily water intake estimator.",
    diyTools: "Construction & DIY Calculators",
    diyDesc: "Square footage estimators, tile calculators, drywall and concrete volume converters.",
    networkingTools: "Networking & IP Utilities",
    networkingDesc: "CIDR subnet calculators, IP address lookups, DNS record formatters, and MAC address generators.",
    randomizersGames: "Randomizers & Utility Games",
    randomizersDesc: "Dice rollers, coin flippers, random name pickers, lottery number selectors, and decision wheels.",
    deviceTools: "Hardware & Device Testers",
    deviceDesc: "Screen pixel testers, mouse polling rate checks, keyboard ghosting detectors, and microphone testers.",
    fileViewers: "Universal File Viewers",
    fileViewersDesc: "Hex viewer, audio visualizer, CSV table viewer, and SVG inspector without server upload.",
    videoTools: "Audio & Video Suite",
    videoDesc: "Audio waveform inspect, MP3 cutter, video frames extractor, and media converter.",
    studentTools: "Student & Academic Tools",
    studentDesc: "Citation generators, GPA calculators, unit converters, and study timers.",
    holidayTools: "Holiday & Party Utilities",
    holidayDesc: "Secret Santa picker, holiday countdown timers, party cost splitters, and greeting card makers.",
    aiTools: "AI & Prompt Utilities",
    aiDesc: "Prompt token counter, system prompt formatter, JSON schema generator, and LLM text comparison.",
    privacyTools: "Privacy & Security Tools",
    privacyDesc: "Password generators, hash calculators, EXIF metadata strippers, and entropy estimators."
  },
  aboutPage: {
    title: "About Digital ToolPad",
    subtitle: "Digital ToolPad was founded on a simple yet uncompromising principle: software utilities should run in your browser sandbox, without sending sensitive data, confidential files, or API payloads to remote third-party servers.",
    missionHeading: "Our Architectural Mission",
    missionP1: "Every day, millions of developers and professionals paste confidential JSON credentials, database connection strings, financial spreadsheets, and proprietary images into online formatting tools. Many of these legacy websites log, store, and transmit your data to backend APIs.",
    missionP2: "Digital ToolPad changes that standard. By leveraging modern WebAssembly, Web Crypto, the HTML5 Canvas API, and client-side JavaScript compilers, 100% of the computations execute locally inside your browser memory.",
    pillar1Title: "Zero Server Uploads",
    pillar1Desc: "Files and clipboard inputs never leave your device. All parsing, compression, and conversion happens in memory.",
    pillar2Title: "Zero Network Latency",
    pillar2Desc: "No server round-trips. Experience instantaneous real-time updates as you type or adjust parameters.",
    pillar3Title: "Free & Open Access",
    pillar3Desc: "492 tools completely unrestricted. No subscription paywalls, no forced sign-ups, and no artificial daily limits."
  },
  contactPage: {
    title: "Contact Us",
    subtitle: "Have a tool request, bug report, or feature suggestion? We would love to hear from you.",
    thankYou: "Thank you for reaching out!",
    thankYouDesc: "Your message has been received. Our engineering team will review it shortly.",
    sendAnother: "Send Another Note",
    nameLabel: "Your Name",
    namePlaceholder: "Jane Doe",
    emailLabel: "Email Address",
    emailPlaceholder: "jane@company.com",
    messageLabel: "Message / Feedback",
    messagePlaceholder: "Tell us what tool you need or what we can improve...",
    submitButton: "Submit Feedback"
  },
  privacyPolicyPage: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: October 2026",
    s1Title: "1. Core Privacy Commitment",
    s1Desc: "At Digital ToolPad, we believe privacy is a fundamental human right. Our tools are engineered to execute client-side in your web browser. We do not transmit, collect, log, or sell any text, files, images, PDFs, JSON documents, or code you process through our tools.",
    s2Title: "2. Local Browser Sandbox Execution",
    s2Desc: "When you upload an image, convert a CSV file, format JSON, or generate a PDF, that file is loaded strictly into your device's RAM memory using standard HTML5 FileReader, WebAssembly, and Canvas APIs. It never traverses the internet to our servers.",
    s3Title: "3. Cookies and Analytics",
    s3Desc: "We use minimal, privacy-respecting analytics to monitor aggregate website traffic, page view counts, and performance uptime. We do not use third-party tracking pixels or fingerprinting techniques.",
    s4Title: "4. Contact Information",
    s4Desc: "If you have questions regarding this privacy policy or our technical architecture, please contact us via our Contact Page."
  },
  termsOfServicePage: {
    title: "Terms of Service",
    effectiveDate: "Effective Date: October 2026",
    s1Title: "1. Acceptance of Terms",
    s1Desc: "By accessing and using Digital ToolPad, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our utilities.",
    s2Title: "2. Permitted Use",
    s2Desc: "You are free to use all tools for personal, commercial, educational, and professional purposes. You agree not to attempt to reverse engineer, disrupt, overload, or exploit the platform through automated scraping or malicious denial of service.",
    s3Title: "3. Disclaimer of Warranties",
    s3Desc: "Digital ToolPad is provided on an 'AS IS' and 'AS AVAILABLE' basis without warranties of any kind. While we strive for absolute accuracy in all mathematical, formatting, and conversion calculations, you are advised to verify critical outputs before production deployment."
  },
  productivitySuitePage: {
    title: "Productivity Suite - All-In-One Private Web Utilities",
    subtitle: "Explore the Digital ToolPad productivity suite. Integrated workspaces for data formatting, PDF document manipulation, code utilities, and timers.",
    badge: "Integrated Browser Suites"
  },
  blogPage: {
    title: "Digital ToolPad Playbooks",
    subtitle: "Technical deep-dives, architectural analysis, and tutorials on client-side algorithms, data serialization, and privacy-first web design.",
    badge: "Engineering & Tutorials",
    backToArticles: "Back to all articles",
    verifiedPlaybook: "Verified Technical Playbook",
    tryInBrowserTitle: "Try It Directly in Your Browser",
    tryInBrowserDesc: "You can test this tool immediately in our free online workspace without downloading any software or creating an account.",
    launchToolsButton: "Launch Browser Tools"
  },
  toolShell: {
    runsInBrowser: "Runs 100% in your browser",
    shareTool: "Share Tool",
    linkCopied: "Link Copied!",
    keyFeatures: "Key Features of {name}",
    faqHeading: "Frequently Asked Questions",
    relatedTools: "Related {category} Tools",
    exploreAll: "Explore all",
    openTool: "Open tool",
    loadingWorkspace: "Loading tool workspace...",
    notFoundTitle: "Tool Not Found",
    notFoundDesc: "The tool you are looking for does not exist.",
    backHome: "Back to Home"
  },
  common: {
    languageSwitcher: "Language",
    german: "Deutsch",
    english: "English",
    copy: "Copy",
    copied: "Copied!",
    clear: "Clear",
    download: "Download",
    upload: "Upload",
    reset: "Reset",
    calculate: "Calculate",
    result: "Result",
    error: "Error",
    success: "Success",
    input: "Input",
    output: "Output",
    options: "Options",
    settings: "Settings",
    format: "Format",
    minify: "Minify",
    validate: "Validate",
    convert: "Convert",
    editorialReviewNotice: "German version translated via LibreTranslate (editorial review recommended)",
    jurisdictionNotice: "Jurisdiction Notice: Calculations (such as taxes, salary standards, and bank holidays) reflect specific regional baseline rules. Always verify local jurisdiction requirements.",
    decimalNotice: "Numeric Input: Standard decimal numbers (e.g. 12.5 or 12,5) are automatically accepted."
  }
};

// Preserve existing calendar sections
const calendarSections = ['meta', 'header', 'settings', 'months', 'weekdays', 'holidaysList', 'guide', 'faqs'];
for (const sec of calendarSections) {
  if (existingEn[sec]) {
    siteEn[sec] = existingEn[sec];
  }
}

// Flatten keys to detect missing translations
function flatten(obj, prefix = '') {
  let result = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      result = result.concat(flatten(v, p));
    } else if (typeof v === 'string') {
      result.push({ path: p, text: v });
    }
  }
  return result;
}

function getByPath(obj, path) {
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
}

function setByPath(obj, path, val) {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = val;
}

async function run() {
  const allEnItems = flatten(siteEn);
  console.log(`Total English keys in dictionary: ${allEnItems.length}`);

  // Clone existingDe or start fresh
  const deObj = JSON.parse(JSON.stringify(existingDe));

  // Find missing items
  const missingItems = [];
  let preservedCount = 0;

  for (const item of allEnItems) {
    const existingVal = getByPath(deObj, item.path);
    if (existingVal && typeof existingVal === 'string' && existingVal.trim().length > 0 && existingVal !== item.text) {
      preservedCount++;
    } else {
      missingItems.push(item);
    }
  }

  console.log(`Preserved reviewed keys: ${preservedCount}`);
  console.log(`Missing keys to translate via LibreTranslate: ${missingItems.length}`);

  // Translate in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
    const batch = missingItems.slice(i, i + BATCH_SIZE);
    
    // Protect ICU placeholders
    const placeholdersList = [];
    const textsToSend = batch.map((item, idx) => {
      const phs = [...item.text.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map(m => m[0]);
      placeholdersList.push(phs);
      let s = item.text;
      phs.forEach((ph, pIdx) => {
        s = s.replace(ph, `__PH${pIdx}__`);
      });
      return s;
    });

    try {
      console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(missingItems.length / BATCH_SIZE)} (${batch.length} items)...`);
      const response = await fetch(LIBRE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: textsToSend, source: 'en', target: 'de' })
      });

      const data = await response.json();
      const translations = Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];

      translations.forEach((trans, idx) => {
        let restored = trans;
        const phs = placeholdersList[idx];
        phs.forEach((ph, pIdx) => {
          restored = restored.replace(new RegExp(`__\\s*PH\\s*${pIdx}\\s*__`, 'g'), ph);
          restored = restored.replace(new RegExp(`__PH${pIdx}__`, 'g'), ph);
        });
        setByPath(deObj, batch[idx].path, restored);
      });
    } catch (err) {
      console.error('Batch error:', err.message);
      // Fallback
      batch.forEach(item => setByPath(deObj, item.path, item.text));
    }
  }

  // Polish key German website terminology
  setByPath(deObj, 'nav.allTools', 'Alle Tools');
  setByPath(deObj, 'nav.categories', 'Kategorien');
  setByPath(deObj, 'nav.productivitySuite', 'Produktivitäts-Suite');
  setByPath(deObj, 'nav.about', 'Über uns');
  setByPath(deObj, 'nav.contact', 'Kontakt');
  setByPath(deObj, 'nav.feedback', 'Feedback');
  setByPath(deObj, 'nav.searchPlaceholder', '492 Tools durchsuchen');
  setByPath(deObj, 'nav.searchModalTitle', 'Alle Browser-Tools durchsuchen');
  setByPath(deObj, 'nav.searchModalPlaceholder', '492 kostenlose Online-Tools durchsuchen... (z. B. JSON, PDF, Base64, UUID)');
  setByPath(deObj, 'nav.searchNoResults', 'Keine Tools entsprechen Ihrer Suchanfrage.');
  setByPath(deObj, 'nav.close', 'Schließen');
  setByPath(deObj, 'nav.toggleTheme', 'Farbschema wechseln');
  setByPath(deObj, 'nav.toggleNav', 'Navigation umschalten');
  setByPath(deObj, 'toolsPage.title', 'Alle Online-Tools ({count})');

  setByPath(deObj, 'home.trustBadge', '100% private Client-Side-Architektur • 0 Bytes an die Cloud gesendet');
  setByPath(deObj, 'home.heroTitleLine1', 'Kostenlose Online-Tools für');
  setByPath(deObj, 'home.heroTitleLine2', 'PDF, Bilder, Text & Code');
  setByPath(deObj, 'home.heroSubtitle', 'Blitzschnelle Browser-Tools zur lokalen Dateiverarbeitung auf Ihrem Gerät. Dokumente konvertieren, JSON formatieren, Bilder skalieren, Formeln berechnen und Daten ohne Server-Latenz verarbeiten.');
  setByPath(deObj, 'home.catalogTitle', 'Browser-Tools entdecken');
  setByPath(deObj, 'home.catalogSubtitle', 'Durchsuchen Sie unser umfassendes Verzeichnis von 492 leistungsstarken Werkzeugen.');
  setByPath(deObj, 'home.filterPlaceholder', 'Nach Stichwort filtern...');
  setByPath(deObj, 'home.launchTool', 'Tool starten');
  setByPath(deObj, 'home.viewAllTools', 'Alle 492 Tools im Verzeichnis anzeigen');

  setByPath(deObj, 'footer.valPropPrivacyTitle', '100% Datenschutz im Browser');
  setByPath(deObj, 'footer.valPropPrivacyDesc', 'Ihre Dateien, JSON-Daten, Passwörter und Texte werden sicher in der Browser-Sandbox verarbeitet. Nichts wird auf externe Server übertragen.');
  setByPath(deObj, 'footer.valPropSpeedTitle', 'Maximale Ausführungsgeschwindigkeit');
  setByPath(deObj, 'footer.valPropSpeedDesc', 'Sofortige Ausführung in Echtzeit dank modernster Browser-Technologien, WebAssembly und Web Crypto.');
  setByPath(deObj, 'footer.valPropFreeTitle', '492 kostenlose Browser-Tools');
  setByPath(deObj, 'footer.valPropFreeDesc', 'Alle Entwickler-, Dokumenten-, Rechen- und Medienwerkzeuge dauerhaft kostenfrei, ohne Registrierung und ohne Paywall.');
  setByPath(deObj, 'footer.aboutDesc', 'Die führende Sammlung kostenloser Web-Tools für Entwickler, Designer, Studierende und Profis. Formatieren Sie JSON, konvertieren Sie CSV, skalieren Sie Bilder, testen Sie Regex und bearbeiten Sie PDFs sicher im Browser.');
  setByPath(deObj, 'footer.copyright', '© 2026 Digital ToolPad. Alle Rechte vorbehalten.');
  setByPath(deObj, 'footer.colDataCode', 'Daten & Code');
  setByPath(deObj, 'footer.colMediaPdf', 'Medien & PDFs');
  setByPath(deObj, 'footer.colPlatform', 'Plattform');
  setByPath(deObj, 'footer.privacyPolicy', 'Datenschutzerklärung');
  setByPath(deObj, 'footer.termsOfService', 'Nutzungsbedingungen');
  setByPath(deObj, 'footer.contactUs', 'Kontakt');
  setByPath(deObj, 'footer.allToolsDirectory', 'Verzeichnis aller 492 Tools');

  setByPath(deObj, 'toolShell.runsInBrowser', 'Läuft zu 100% in Ihrem Browser');
  setByPath(deObj, 'toolShell.shareTool', 'Tool teilen');
  setByPath(deObj, 'toolShell.linkCopied', 'Link kopiert!');
  setByPath(deObj, 'toolShell.keyFeatures', 'Hauptmerkmale von {name}');
  setByPath(deObj, 'toolShell.faqHeading', 'Häufig gestellte Fragen');
  setByPath(deObj, 'toolShell.relatedTools', 'Ähnliche {category}-Tools');
  setByPath(deObj, 'toolShell.exploreAll', 'Alle anzeigen');
  setByPath(deObj, 'toolShell.openTool', 'Tool öffnen');
  setByPath(deObj, 'toolShell.loadingWorkspace', 'Tool-Arbeitsbereich wird geladen...');
  setByPath(deObj, 'toolShell.notFoundTitle', 'Tool nicht gefunden');
  setByPath(deObj, 'toolShell.notFoundDesc', 'Das von Ihnen gesuchte Tool existiert leider nicht.');
  setByPath(deObj, 'toolShell.backHome', 'Zurück zur Startseite');

  setByPath(deObj, 'common.languageSwitcher', 'Sprache');
  setByPath(deObj, 'common.german', 'Deutsch');
  setByPath(deObj, 'common.english', 'English');
  setByPath(deObj, 'common.copy', 'Kopieren');
  setByPath(deObj, 'common.copied', 'Kopiert!');
  setByPath(deObj, 'common.clear', 'Löschen');
  setByPath(deObj, 'common.download', 'Herunterladen');
  setByPath(deObj, 'common.upload', 'Hochladen');
  setByPath(deObj, 'common.reset', 'Zurücksetzen');
  setByPath(deObj, 'common.calculate', 'Berechnen');
  setByPath(deObj, 'common.result', 'Ergebnis');
  setByPath(deObj, 'common.error', 'Fehler');
  setByPath(deObj, 'common.success', 'Erfolgreich');
  setByPath(deObj, 'common.input', 'Eingabe');
  setByPath(deObj, 'common.output', 'Ausgabe');
  setByPath(deObj, 'common.editorialReviewNotice', 'Deutsche Version – maschinell übersetzt mit LibreTranslate, redaktionelle Prüfung empfohlen');
  setByPath(deObj, 'common.jurisdictionNotice', 'Hinweis zur Gerichtsbarkeit: Berechnungen und Feiertagslisten basieren auf internationalen Standards. Bitte prüfen Sie für verbindliche Auskünfte die lokalen gesetzlichen Bestimmungen.');
  setByPath(deObj, 'common.decimalNotice', 'Dezimalzahlen: Sowohl Komma (12,5) als auch Punkt (12.5) werden automatisch unterstützt.');

  // Save files
  fs.writeFileSync('messages/en.json', JSON.stringify(siteEn, null, 2), 'utf8');
  fs.writeFileSync('messages/de.json', JSON.stringify(deObj, null, 2), 'utf8');
  fs.writeFileSync('src/messages/en.json', JSON.stringify(siteEn, null, 2), 'utf8');
  fs.writeFileSync('src/messages/de.json', JSON.stringify(deObj, null, 2), 'utf8');

  console.log('\nSuccess! All locale files updated in messages/ and src/messages/.');
}

run().catch(console.error);
