import json
import os
import re
import urllib.request
import urllib.error

LIBRE_TRANSLATE_URL = "http://127.0.0.1:5000/translate"

def translate_text(text: str) -> str:
    if not text or not text.strip():
        return text
    
    # Protect ICU placeholders like {year}, {name}, {count}, {category}
    placeholders = re.findall(r'\{[a-zA-Z0-9_]+\}', text)
    temp_text = text
    for i, p in enumerate(placeholders):
        temp_text = temp_text.replace(p, f"__PH{i}__")

    req_data = json.dumps({
        "q": temp_text,
        "source": "en",
        "target": "de",
        "format": "text"
    }).encode("utf-8")

    req = urllib.request.Request(
        LIBRE_TRANSLATE_URL,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            translated = data.get("translatedText", "")
            
            # Restore ICU placeholders
            for i, p in enumerate(placeholders):
                translated = re.sub(rf'__\s*PH\s*{i}\s*__', p, translated)
                translated = translated.replace(f"__PH{i}__", p)
            return translated
    except Exception as e:
        print(f"Translation call failed for '{text[:40]}...': {e}")
        # Return text as fallback so build is not interrupted
        return text

def merge_and_translate(en_dict, de_dict, path=""):
    result = {}
    translated_count = 0
    preserved_count = 0

    for k, v in en_dict.items():
        curr_path = f"{path}.{k}" if path else k
        if isinstance(v, dict):
            existing_sub = de_dict.get(k, {}) if isinstance(de_dict, dict) else {}
            sub_res, t_sub, p_sub = merge_and_translate(v, existing_sub, curr_path)
            result[k] = sub_res
            translated_count += t_sub
            preserved_count += p_sub
        elif isinstance(v, str):
            # If de_dict already has a valid non-empty translation, preserve it!
            if isinstance(de_dict, dict) and k in de_dict and de_dict[k] and de_dict[k].strip() and de_dict[k] != v:
                result[k] = de_dict[k]
                preserved_count += 1
            else:
                # Need translation via LibreTranslate
                print(f"Translating missing key [{curr_path}]...")
                trans = translate_text(v)
                result[k] = trans
                translated_count += 1
        else:
            result[k] = v

    return result, translated_count, preserved_count

# Load existing messages if present
existing_en = {}
existing_de = {}

if os.path.exists("messages/en.json"):
    try:
        with open("messages/en.json", "r", encoding="utf-8") as f:
            existing_en = json.load(f)
    except Exception:
        pass

if os.path.exists("messages/de.json"):
    try:
        with open("messages/de.json", "r", encoding="utf-8") as f:
            existing_de = json.load(f)
    except Exception:
        pass

# Comprehensive Site Dictionary in English
site_en = {
    "nav": {
        "brandName": "Digital ToolPad",
        "allTools": "All tools",
        "categories": "Categories",
        "productivitySuite": "Productivity Suite",
        "about": "About",
        "contact": "Contact",
        "blog": "Blog",
        "feedback": "Feedback",
        "searchPlaceholder": "Search 492 tools",
        "searchModalTitle": "Search All Browser Tools",
        "searchModalPlaceholder": "Search 492 free online browser tools... (e.g. JSON, PDF, Base64, UUID)",
        "searchNoResults": "No tools match your query.",
        "searchShortcut": "⌘K",
        "popularCategories": "Popular Categories",
        "toggleTheme": "Toggle theme",
        "toggleNav": "Toggle navigation",
        "close": "Close"
    },
    "home": {
        "trustBadge": "100% Private Client-Side Architecture • 0 Bytes Sent to Cloud",
        "heroTitleLine1": "Free Online Tools for",
        "heroTitleLine2": "PDF, Images, Text & Code",
        "heroSubtitle": "Instant browser utilities that process files on your device. Convert documents, beautify JSON, resize photos, calculate formulas, and manipulate data with absolute zero server latency.",
        "searchTriggerPlaceholder": "Search 492 free online browser tools... (e.g. JSON, PDF, Base64, UUID)",
        "popular": "Popular:",
        "catalogTitle": "Explore Browser Tools",
        "catalogSubtitle": "Browse through our comprehensive directory of 492 high-performance utilities.",
        "filterPlaceholder": "Filter by keyword...",
        "launchTool": "Launch Tool",
        "viewAllTools": "View All 492 Tools in Directory",
        "badgeBrowser": "Browser"
    },
    "footer": {
        "valPropPrivacyTitle": "100% Client-Side Privacy",
        "valPropPrivacyDesc": "Your files, JSON, passwords, and text process in your browser sandbox. Nothing is uploaded to remote servers.",
        "valPropSpeedTitle": "Zero Latency Performance",
        "valPropSpeedDesc": "Instant real-time execution powered by WebAssembly, Web Crypto, and modern browser engines.",
        "valPropFreeTitle": "492 Free Browser Tools",
        "valPropFreeDesc": "All developer, document, calculation, and media utilities available forever with zero sign-up or paywalls.",
        "aboutDesc": "The premier suite of free online web tools for developers, designers, students, and professionals. Format JSON, convert CSV, resize images, test regex, calculate formulas, and manipulate PDFs safely in your browser.",
        "copyright": "© 2026 Digital ToolPad. All rights reserved.",
        "colDataCode": "Data & Code",
        "colMediaPdf": "Media & PDFs",
        "colPlatform": "Platform",
        "privacyPolicy": "Privacy Policy",
        "termsOfService": "Terms of Service",
        "contactUs": "Contact Us",
        "allToolsDirectory": "All 492 Tools Directory"
    },
    "toolsPage": {
        "title": "All Online Tools",
        "subtitle": "Explore our complete directory of free online developer, document, calculation, and media utilities. Every single tool runs 100% locally in your browser memory.",
        "searchPlaceholder": "Filter by tool name, purpose, or category (e.g. JSON, YAML, PDF, Hash)...",
        "noResults": "No tools match your criteria. Try adjusting your search query or filter.",
        "categoryFilterAll": "All"
    },
    "categories": {
        "jsonTools": "JSON Tools & Utilities",
        "jsonDesc": "Format, validate, beautify, and convert JSON data with 100% client-side privacy.",
        "yamlTools": "YAML Tools & Validators",
        "yamlDesc": "Edit, validate, and convert YAML to JSON and JSON to YAML online in your browser.",
        "markdownTools": "Markdown Tools & Converters",
        "markdownDesc": "Edit, preview, and convert Markdown documents to PDF, Word (DOCX), and HTML.",
        "pdfTools": "PDF Tools & Document Suite",
        "pdfDesc": "Merge, split, compress, and convert PDF documents directly in your browser without uploading files.",
        "imageTools": "Image & Photo Utilities",
        "imageDesc": "Resize, compress, remove backgrounds, convert formats (WebP, PNG, JPG), and inspect Exif metadata.",
        "textTools": "Text & Typography Utilities",
        "textDesc": "Count words, estimate LLM tokens, compare diffs, convert text case, and remove duplicate lines.",
        "developerTools": "Developer & Coding Utilities",
        "developerDesc": "SQL formatters, Regex testers, API testing runners, SSL decoders, and code generators.",
        "calculatorTools": "Math & Financial Calculators",
        "calculatorDesc": "Percentage calculators, GPA estimators, salary to hourly conversions, ratios, and fractions.",
        "productivityTools": "Productivity & Time Suite",
        "productivityDesc": "Pomodoro focus timers, Unix timestamp converters, timezone planners, and printable calendars.",
        "base64Tools": "Base64 Encoders & Decoders",
        "base64Desc": "Encode text and files to Base64, decode Base64 data URLs to images and PDFs safely.",
        "encodingTools": "Encoding & Cipher Converters",
        "encodingDesc": "Binary to text, Hex to ASCII, Morse code translator, Roman numerals, and number base conversions.",
        "healthTools": "Health & Fitness Calculators",
        "healthDesc": "BMI body mass index, BMR, TDEE maintenance calorie calculator, and daily water intake estimator.",
        "diyTools": "Construction & DIY Calculators",
        "diyDesc": "Square footage estimators, tile calculators, drywall and concrete volume converters.",
        "networkingTools": "Networking & IP Utilities",
        "networkingDesc": "CIDR subnet calculators, IP address lookups, DNS record formatters, and MAC address generators.",
        "randomizersGames": "Randomizers & Utility Games",
        "randomizersDesc": "Dice rollers, coin flippers, random name pickers, lottery number selectors, and decision wheels.",
        "deviceTools": "Hardware & Device Testers",
        "deviceDesc": "Screen pixel testers, mouse polling rate checks, keyboard ghosting detectors, and microphone testers.",
        "fileViewers": "Universal File Viewers",
        "fileViewersDesc": "Hex viewer, audio visualizer, CSV table viewer, and SVG inspector without server upload.",
        "videoTools": "Audio & Video Suite",
        "videoDesc": "Audio waveform inspect, MP3 cutter, video frames extractor, and media converter.",
        "studentTools": "Student & Academic Tools",
        "studentDesc": "Citation generators, GPA calculators, unit converters, and study timers.",
        "holidayTools": "Holiday & Party Utilities",
        "holidayDesc": "Secret Santa picker, holiday countdown timers, party cost splitters, and greeting card makers.",
        "aiTools": "AI & Prompt Utilities",
        "aiDesc": "Prompt token counter, system prompt formatter, JSON schema generator, and LLM text comparison.",
        "privacyTools": "Privacy & Security Tools",
        "privacyDesc": "Password generators, hash calculators, EXIF metadata strippers, and entropy estimators."
    },
    "aboutPage": {
        "title": "About Digital ToolPad",
        "subtitle": "Digital ToolPad was founded on a simple yet uncompromising principle: software utilities should run in your browser sandbox, without sending sensitive data, confidential files, or API payloads to remote third-party servers.",
        "missionHeading": "Our Architectural Mission",
        "missionP1": "Every day, millions of developers and professionals paste confidential JSON credentials, database connection strings, financial spreadsheets, and proprietary images into online formatting tools. Many of these legacy websites log, store, and transmit your data to backend APIs.",
        "missionP2": "Digital ToolPad changes that standard. By leveraging modern WebAssembly, Web Crypto, the HTML5 Canvas API, and client-side JavaScript compilers, 100% of the computations execute locally inside your browser memory.",
        "pillar1Title": "Zero Server Uploads",
        "pillar1Desc": "Files and clipboard inputs never leave your device. All parsing, compression, and conversion happens in memory.",
        "pillar2Title": "Zero Network Latency",
        "pillar2Desc": "No server round-trips. Experience instantaneous real-time updates as you type or adjust parameters.",
        "pillar3Title": "Free & Open Access",
        "pillar3Desc": "492 tools completely unrestricted. No subscription paywalls, no forced sign-ups, and no artificial daily limits."
    },
    "contactPage": {
        "title": "Contact Us",
        "subtitle": "Have a tool request, bug report, or feature suggestion? We would love to hear from you.",
        "thankYou": "Thank you for reaching out!",
        "thankYouDesc": "Your message has been received. Our engineering team will review it shortly.",
        "sendAnother": "Send Another Note",
        "nameLabel": "Your Name",
        "namePlaceholder": "Jane Doe",
        "emailLabel": "Email Address",
        "emailPlaceholder": "jane@company.com",
        "messageLabel": "Message / Feedback",
        "messagePlaceholder": "Tell us what tool you need or what we can improve...",
        "submitButton": "Submit Feedback"
    },
    "privacyPolicyPage": {
        "title": "Privacy Policy",
        "lastUpdated": "Last updated: October 2026",
        "s1Title": "1. Core Privacy Commitment",
        "s1Desc": "At Digital ToolPad, we believe privacy is a fundamental human right. Our tools are engineered to execute client-side in your web browser. We do not transmit, collect, log, or sell any text, files, images, PDFs, JSON documents, or code you process through our tools.",
        "s2Title": "2. Local Browser Sandbox Execution",
        "s2Desc": "When you upload an image, convert a CSV file, format JSON, or generate a PDF, that file is loaded strictly into your device's RAM memory using standard HTML5 FileReader, WebAssembly, and Canvas APIs. It never traverses the internet to our servers.",
        "s3Title": "3. Cookies and Analytics",
        "s3Desc": "We use minimal, privacy-respecting analytics to monitor aggregate website traffic, page view counts, and performance uptime. We do not use third-party tracking pixels or fingerprinting techniques.",
        "s4Title": "4. Contact Information",
        "s4Desc": "If you have questions regarding this privacy policy or our technical architecture, please contact us via our Contact Page."
    },
    "termsOfServicePage": {
        "title": "Terms of Service",
        "effectiveDate": "Effective Date: October 2026",
        "s1Title": "1. Acceptance of Terms",
        "s1Desc": "By accessing and using Digital ToolPad, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our utilities.",
        "s2Title": "2. Permitted Use",
        "s2Desc": "You are free to use all tools for personal, commercial, educational, and professional purposes. You agree not to attempt to reverse engineer, disrupt, overload, or exploit the platform through automated scraping or malicious denial of service.",
        "s3Title": "3. Disclaimer of Warranties",
        "s3Desc": "Digital ToolPad is provided on an 'AS IS' and 'AS AVAILABLE' basis without warranties of any kind. While we strive for absolute accuracy in all mathematical, formatting, and conversion calculations, you are advised to verify critical outputs before production deployment."
    },
    "productivitySuitePage": {
        "title": "Productivity Suite - All-In-One Private Web Utilities",
        "subtitle": "Explore the Digital ToolPad productivity suite. Integrated workspaces for data formatting, PDF document manipulation, code utilities, and timers.",
        "badge": "Integrated Browser Suites"
    },
    "blogPage": {
        "title": "Digital ToolPad Playbooks",
        "subtitle": "Technical deep-dives, architectural analysis, and tutorials on client-side algorithms, data serialization, and privacy-first web design.",
        "badge": "Engineering & Tutorials",
        "backToArticles": "Back to all articles",
        "verifiedPlaybook": "Verified Technical Playbook",
        "tryInBrowserTitle": "Try It Directly in Your Browser",
        "tryInBrowserDesc": "You can test this tool immediately in our free online workspace without downloading any software or creating an account.",
        "launchToolsButton": "Launch Browser Tools"
    },
    "toolShell": {
        "runsInBrowser": "Runs 100% in your browser",
        "shareTool": "Share Tool",
        "linkCopied": "Link Copied!",
        "keyFeatures": "Key Features of {name}",
        "faqHeading": "Frequently Asked Questions",
        "relatedTools": "Related {category} Tools",
        "exploreAll": "Explore all",
        "openTool": "Open tool",
        "loadingWorkspace": "Loading tool workspace...",
        "notFoundTitle": "Tool Not Found",
        "notFoundDesc": "The tool you are looking for does not exist.",
        "backHome": "Back to Home"
    },
    "common": {
        "languageSwitcher": "Language",
        "german": "Deutsch",
        "english": "English",
        "copy": "Copy",
        "copied": "Copied!",
        "clear": "Clear",
        "download": "Download",
        "upload": "Upload",
        "reset": "Reset",
        "calculate": "Calculate",
        "result": "Result",
        "error": "Error",
        "success": "Success",
        "input": "Input",
        "output": "Output",
        "options": "Options",
        "settings": "Settings",
        "format": "Format",
        "minify": "Minify",
        "validate": "Validate",
        "convert": "Convert",
        "editorialReviewNotice": "German version translated via LibreTranslate (editorial review recommended)",
        "jurisdictionNotice": "Jurisdiction Notice: Calculations (such as taxes, salary standards, and bank holidays) reflect specific regional baseline rules. Always verify local jurisdiction requirements.",
        "decimalNotice": "Numeric Input: Standard decimal numbers (e.g. 12.5 or 12,5) are automatically accepted."
    }
}

# Merge existing calendar keys so we don't lose any of the reviewed calendar translations
for key in ["meta", "header", "settings", "months", "weekdays", "holidaysList", "guide", "faqs"]:
    if key in existing_en:
        site_en[key] = existing_en[key]

# Translate any missing keys into German
print("Starting localization process...")
merged_de, translated_count, preserved_count = merge_and_translate(site_en, existing_de)

# Terminology refinement for high quality German web terminology
merged_de["nav"]["allTools"] = "Alle Tools"
merged_de["nav"]["categories"] = "Kategorien"
merged_de["nav"]["productivitySuite"] = "Produktivitäts-Suite"
merged_de["nav"]["about"] = "Über uns"
merged_de["nav"]["contact"] = "Kontakt"
merged_de["nav"]["feedback"] = "Feedback"
merged_de["nav"]["searchPlaceholder"] = "492 Tools durchsuchen"
merged_de["nav"]["searchModalTitle"] = "Alle Browser-Tools durchsuchen"
merged_de["nav"]["searchModalPlaceholder"] = "492 kostenlose Online-Tools durchsuchen... (z. B. JSON, PDF, Base64, UUID)"
merged_de["nav"]["searchNoResults"] = "Keine Tools entsprechen Ihrer Suchanfrage."
merged_de["nav"]["close"] = "Schließen"
merged_de["nav"]["toggleTheme"] = "Farbschema wechseln"
merged_de["nav"]["toggleNav"] = "Navigation umschalten"

merged_de["home"]["trustBadge"] = "100% private Client-Side-Architektur • 0 Bytes an die Cloud gesendet"
merged_de["home"]["heroTitleLine1"] = "Kostenlose Online-Tools für"
merged_de["home"]["heroTitleLine2"] = "PDF, Bilder, Text & Code"
merged_de["home"]["heroSubtitle"] = "Blitzschnelle Browser-Tools zur lokalen Dateiverarbeitung auf Ihrem Gerät. Dokumente konvertieren, JSON formatieren, Bilder skalieren, Formeln berechnen und Daten ohne Server-Latenz verarbeiten."
merged_de["home"]["catalogTitle"] = "Browser-Tools entdecken"
merged_de["home"]["catalogSubtitle"] = "Durchsuchen Sie unser umfassendes Verzeichnis von 492 leistungsstarken Werkzeugen."
merged_de["home"]["filterPlaceholder"] = "Nach Stichwort filtern..."
merged_de["home"]["launchTool"] = "Tool starten"
merged_de["home"]["viewAllTools"] = "Alle 492 Tools im Verzeichnis anzeigen"

merged_de["footer"]["valPropPrivacyTitle"] = "100% Datenschutz im Browser"
merged_de["footer"]["valPropPrivacyDesc"] = "Ihre Dateien, JSON-Daten, Passwörter und Texte werden sicher in der Browser-Sandbox verarbeitet. Nichts wird auf externe Server übertragen."
merged_de["footer"]["valPropSpeedTitle"] = "Maximale Ausführungsgeschwindigkeit"
merged_de["footer"]["valPropSpeedDesc"] = "Sofortige Ausführung in Echtzeit dank modernster Browser-Technologien, WebAssembly und Web Crypto."
merged_de["footer"]["valPropFreeTitle"] = "492 kostenlose Browser-Tools"
merged_de["footer"]["valPropFreeDesc"] = "Alle Entwickler-, Dokumenten-, Rechen- und Medienwerkzeuge dauerhaft kostenfrei, ohne Registrierung und ohne Paywall."
merged_de["footer"]["aboutDesc"] = "Die führende Sammlung kostenloser Web-Tools für Entwickler, Designer, Studierende und Profis. Formatieren Sie JSON, konvertieren Sie CSV, skalieren Sie Bilder, testen Sie Regex und bearbeiten Sie PDFs sicher im Browser."
merged_de["footer"]["copyright"] = "© 2026 Digital ToolPad. Alle Rechte vorbehalten."
merged_de["footer"]["colDataCode"] = "Daten & Code"
merged_de["footer"]["colMediaPdf"] = "Medien & PDFs"
merged_de["footer"]["colPlatform"] = "Plattform"
merged_de["footer"]["privacyPolicy"] = "Datenschutzerklärung"
merged_de["footer"]["termsOfService"] = "Nutzungsbedingungen"
merged_de["footer"]["contactUs"] = "Kontakt"
merged_de["footer"]["allToolsDirectory"] = "Verzeichnis aller 492 Tools"

merged_de["toolShell"]["runsInBrowser"] = "Läuft zu 100% in Ihrem Browser"
merged_de["toolShell"]["shareTool"] = "Tool teilen"
merged_de["toolShell"]["linkCopied"] = "Link kopiert!"
merged_de["toolShell"]["keyFeatures"] = "Hauptmerkmale von {name}"
merged_de["toolShell"]["faqHeading"] = "Häufig gestellte Fragen"
merged_de["toolShell"]["relatedTools"] = "Ähnliche {category}-Tools"
merged_de["toolShell"]["exploreAll"] = "Alle anzeigen"
merged_de["toolShell"]["openTool"] = "Tool öffnen"
merged_de["toolShell"]["loadingWorkspace"] = "Tool-Arbeitsbereich wird geladen..."
merged_de["toolShell"]["notFoundTitle"] = "Tool nicht gefunden"
merged_de["toolShell"]["notFoundDesc"] = "Das von Ihnen gesuchte Tool existiert leider nicht."
merged_de["toolShell"]["backHome"] = "Zurück zur Startseite"

merged_de["common"]["languageSwitcher"] = "Sprache"
merged_de["common"]["german"] = "Deutsch"
merged_de["common"]["english"] = "English"
merged_de["common"]["copy"] = "Kopieren"
merged_de["common"]["copied"] = "Kopiert!"
merged_de["common"]["clear"] = "Löschen"
merged_de["common"]["download"] = "Herunterladen"
merged_de["common"]["upload"] = "Hochladen"
merged_de["common"]["reset"] = "Zurücksetzen"
merged_de["common"]["calculate"] = "Berechnen"
merged_de["common"]["result"] = "Ergebnis"
merged_de["common"]["error"] = "Fehler"
merged_de["common"]["success"] = "Erfolgreich"
merged_de["common"]["input"] = "Eingabe"
merged_de["common"]["output"] = "Ausgabe"
merged_de["common"]["editorialReviewNotice"] = "Deutsche Version – maschinell übersetzt mit LibreTranslate, redaktionelle Prüfung empfohlen"
merged_de["common"]["jurisdictionNotice"] = "Hinweis zur Gerichtsbarkeit: Berechnungen und Feiertagslisten basieren auf internationalen Standards. Bitte prüfen Sie für verbindliche Auskünfte die lokalen gesetzlichen Bestimmungen."
merged_de["common"]["decimalNotice"] = "Dezimalzahlen: Sowohl Komma (12,5) als auch Punkt (12.5) werden automatisch unterstützt."

# Write files
os.makedirs("messages", exist_ok=True)
os.makedirs("src/messages", exist_ok=True)

with open("messages/en.json", "w", encoding="utf-8") as f:
    json.dump(site_en, f, ensure_ascii=False, indent=2)

with open("messages/de.json", "w", encoding="utf-8") as f:
    json.dump(merged_de, f, ensure_ascii=False, indent=2)

with open("src/messages/en.json", "w", encoding="utf-8") as f:
    json.dump(site_en, f, ensure_ascii=False, indent=2)

with open("src/messages/de.json", "w", encoding="utf-8") as f:
    json.dump(merged_de, f, ensure_ascii=False, indent=2)

print(f"\nDone! Preserved {preserved_count} reviewed strings, translated {translated_count} new strings.")
print("Updated messages/en.json, messages/de.json, src/messages/en.json, and src/messages/de.json.")
