export interface CategoryMeta {
  nameKey: string;
  descKey: string;
  filterKey: string;
  fallbackName: string;
  fallbackDesc: string;
}

export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  "json-tools": {
    nameKey: "jsonTools",
    descKey: "jsonDesc",
    filterKey: "json",
    fallbackName: "JSON Tools & Utilities",
    fallbackDesc: "Format, validate, beautify, and convert JSON data with 100% client-side privacy.",
  },
  "yaml-tools": {
    nameKey: "yamlTools",
    descKey: "yamlDesc",
    filterKey: "yaml",
    fallbackName: "YAML Tools & Validators",
    fallbackDesc: "Edit, validate, and convert YAML to JSON and JSON to YAML online in your browser.",
  },
  "markdown-tools": {
    nameKey: "markdownTools",
    descKey: "markdownDesc",
    filterKey: "markdown",
    fallbackName: "Markdown Tools & Converters",
    fallbackDesc: "Edit, preview, and convert Markdown documents to PDF, Word (DOCX), and HTML.",
  },
  "pdf-tools": {
    nameKey: "pdfTools",
    descKey: "pdfDesc",
    filterKey: "pdf",
    fallbackName: "PDF Tools & Document Suite",
    fallbackDesc: "Merge, split, compress, and convert PDF documents directly in your browser without uploading files.",
  },
  "image-tools": {
    nameKey: "imageTools",
    descKey: "imageDesc",
    filterKey: "image",
    fallbackName: "Image & Photo Utilities",
    fallbackDesc: "Resize, compress, remove backgrounds, convert formats (WebP, PNG, JPG), and inspect Exif metadata.",
  },
  "text-tools": {
    nameKey: "textTools",
    descKey: "textDesc",
    filterKey: "text",
    fallbackName: "Text & Typography Utilities",
    fallbackDesc: "Count words, estimate LLM tokens, compare diffs, convert text case, and remove duplicate lines.",
  },
  "developer-tools": {
    nameKey: "developerTools",
    descKey: "developerDesc",
    filterKey: "coding",
    fallbackName: "Developer & Coding Utilities",
    fallbackDesc: "SQL formatters, Regex testers, API testing runners, SSL decoders, and code generators.",
  },
  "calculator-tools": {
    nameKey: "calculatorTools",
    descKey: "calculatorDesc",
    filterKey: "calculator",
    fallbackName: "Math & Financial Calculators",
    fallbackDesc: "Percentage calculators, GPA estimators, salary to hourly conversions, ratios, and fractions.",
  },
  "productivity-tools": {
    nameKey: "productivityTools",
    descKey: "productivityDesc",
    filterKey: "productivity",
    fallbackName: "Productivity & Time Suite",
    fallbackDesc: "Pomodoro focus timers, Unix timestamp converters, timezone planners, and printable calendars.",
  },
  "base64-tools": {
    nameKey: "base64Tools",
    descKey: "base64Desc",
    filterKey: "base64",
    fallbackName: "Base64 Encoders & Decoders",
    fallbackDesc: "Encode text and files to Base64, decode Base64 data URLs to images and PDFs safely.",
  },
  "encoding-tools": {
    nameKey: "encodingTools",
    descKey: "encodingDesc",
    filterKey: "encoding",
    fallbackName: "Encoding & Cipher Converters",
    fallbackDesc: "Binary to text, Hex to ASCII, Morse code translator, Roman numerals, and number base conversions.",
  },
  "health-tools": {
    nameKey: "healthTools",
    descKey: "healthDesc",
    filterKey: "health",
    fallbackName: "Health & Fitness Calculators",
    fallbackDesc: "BMI body mass index, BMR, TDEE maintenance calorie calculator, and daily water intake estimator.",
  },
  "device-tools": {
    nameKey: "deviceTools",
    descKey: "deviceDesc",
    filterKey: "device",
    fallbackName: "Hardware & Device Testers",
    fallbackDesc: "Test screen refresh rates, dead pixels, microphone input, gamepad stick drift, and mouse double-clicks.",
  },
  "database-tools": {
    nameKey: "databaseTools",
    descKey: "databaseDesc",
    filterKey: "database",
    fallbackName: "Database & SQL Utilities",
    fallbackDesc: "Format SQL queries, inspect SQLite database files, visual schema browser, and CSV table generator.",
  },
  "networking-tools": {
    nameKey: "networkingTools",
    descKey: "networkingDesc",
    filterKey: "networking",
    fallbackName: "Networking & IP Utilities",
    fallbackDesc: "IPv4/IPv6 subnet calculators, CIDR cheat sheets, IP address converters, and DNS lookup testers.",
  },
  "randomizer-tools": {
    nameKey: "randomizerTools",
    descKey: "randomizerDesc",
    filterKey: "randomizer",
    fallbackName: "Randomizers & Decision Makers",
    fallbackDesc: "Spin the wheel, flip a coin, roll 3D dice, generate tournament brackets, and pick random names.",
  },
  "csv-tools": {
    nameKey: "csvTools",
    descKey: "csvDesc",
    filterKey: "csv",
    fallbackName: "CSV & Spreadsheet Converters",
    fallbackDesc: "Convert CSV to JSON, JSON to CSV, Excel XLSX to CSV, and validate delimiter structures.",
  },
  "qr-tools": {
    nameKey: "qrTools",
    descKey: "qrDesc",
    filterKey: "qr",
    fallbackName: "QR & Barcode Utilities",
    fallbackDesc: "Generate and scan QR codes, UPC barcodes, EAN-13, and PDF417 codes directly in your browser.",
  },
  "video-tools": {
    nameKey: "videoTools",
    descKey: "videoDesc",
    filterKey: "video",
    fallbackName: "Video & Audio Converters",
    fallbackDesc: "Transcode WebM to MP4, MP4 to MP3, video to animated GIF without cloud servers.",
  },
  "diy-tools": {
    nameKey: "diyTools",
    descKey: "diyDesc",
    filterKey: "diy",
    fallbackName: "Construction & DIY Calculators",
    fallbackDesc: "Concrete slab volume, square footage, tile calculator with waste buffer, and paint coverage.",
  },
  "privacy-tools": {
    nameKey: "privacyTools",
    descKey: "privacyDesc",
    filterKey: "privacy",
    fallbackName: "Privacy & Cryptography Tools",
    fallbackDesc: "UUID generators, MD5/SHA256 hashers, strong password generator, and document redaction.",
  },
  "student-tools": {
    nameKey: "studentTools",
    descKey: "studentDesc",
    filterKey: "student",
    fallbackName: "Student & Academic Tools",
    fallbackDesc: "GPA calculator, weighted final grade calculator, citation generators (APA/MLA/Chicago), and fractions.",
  },
  "holiday-tools": {
    nameKey: "holidayTools",
    descKey: "holidayDesc",
    filterKey: "holiday",
    fallbackName: "Holiday & Event Planners",
    fallbackDesc: "Secret Santa generator, holiday countdowns, 2026/2027 holiday calendars, and bingo card makers.",
  },
};

export const CATEGORY_SLUGS = Object.keys(CATEGORY_MAP);
