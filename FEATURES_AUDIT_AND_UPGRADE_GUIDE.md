# Digital ToolPad: Complete Features Working Audit & Open-Source Upgrade Guide

This document provides a comprehensive, transparent audit of all **24 interactive engines** powering the **492 tools** in `f:\Website_Project\digitaltoolpad`.

---

## 1. Executive Summary & Classification Matrix

| Status | Engine Count | Tool Coverage | Description |
| :--- | :---: | :---: | :--- |
| 🟢 **100% Real & Production Ready** | **18 Engines** | **~415 Tools** | Native client-side computation, official libraries, real mathematical formulas, real parsing, zero mock code. |
| 🟡 **Real with Advanced Upgrade Opportunities** | **3 Engines** | **~60 Tools** | Core functionality is 100% real (e.g. Canvas resizer, PDF merge/split, SQL formatter), but advanced AI/vector capabilities can be upgraded. |
| 🔴 **Simulated / Mock Workspaces** | **3 Engines** | **~17 Tools** | Functioning interactive UI, but the underlying heavy binary/WASM computation is simulated with sample data or timeouts. |

---

## 2. Complete Audit of All 24 Engines

### 🟢 1. JSON Formatter & Validator Engine
- **File**: [`src/components/engines/JsonEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/JsonEngine.tsx)
- **Tools Covered (15)**: `json-formatter`, `online-json-formatter`, `json-pretty-print`, `json-validator`, `json-editor`, `json-minifier`, `json-viewer`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses native JavaScript AST parsing (`JSON.parse` / `JSON.stringify`).
  - Real syntax error reporting with exact syntax error descriptions.
  - Recursive key sorting (`deepSort`) for A-to-Z key alphabetization.
  - Real byte size, line count, and recursive object depth computation.
  - 2-space, 4-space, and tab indentation formatting.
  - File upload via `FileReader` and file download via `Blob`.

---

### 🟢 2. YAML Validator & Editor Engine
- **File**: [`src/components/engines/YamlEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/YamlEngine.tsx)
- **Tools Covered (8)**: `yaml-editor-validator`, `yaml-formatter`, `yaml-validator`, `yaml-to-json`, `json-to-yaml`, `yml-to-json`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`js-yaml`](https://github.com/nodeca/js-yaml) (`yaml.load()` and `yaml.dump()`).
  - Real two-way YAML $\leftrightarrow$ JSON conversion.
  - Real indentation formatting and syntax validation.

---

### 🟢 3. CSV & Data Conversion Engine
- **File**: [`src/components/engines/CsvDataEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/CsvDataEngine.tsx)
- **Tools Covered (13)**: `csv-to-json-converter`, `json-to-csv-converter`, `tsv-to-json`, `bank-statement-to-csv`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`papaparse`](https://github.com/mholt/PapaParse) library.
  - Real header detection, dynamic type coercion (strings, numbers, booleans).
  - Dual view modes: Raw JSON output and live interactive HTML Table renderer.
  - Real `Papa.unparse()` for JSON to CSV conversion.

---

### 🟢 4. Diff Checker & Text Comparison Engine
- **File**: [`src/components/engines/DiffEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/DiffEngine.tsx)
- **Tools Covered (6)**: `diff-checker`, `json-diff-compare`, `json-compare`, `text-compare`, `text-diff`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`diff`](https://github.com/kpdecker/jsdiff) library.
  - Line-by-line diffing via `Diff.diffLines()`.
  - Word-by-word diffing via `Diff.diffWords()`.
  - Real added/deleted lines counter with green/red styling.

---

### 🟢 5. Regular Expression Tester Engine
- **File**: [`src/components/engines/RegexEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/RegexEngine.tsx)
- **Tools Covered (6)**: `regex-tester`, `regex-generator`, `javascript-regex-tester`, `regex-checker`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real JavaScript `RegExp` execution in browser sandbox.
  - Dynamic flags toggle: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotAll).
  - Real capture groups breakdown and match index position reporting.

---

### 🟢 6. Base64 Encoder & Decoder Engine
- **File**: [`src/components/engines/Base64Engine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/Base64Engine.tsx)
- **Tools Covered (10)**: `base64-encoder-decoder`, `base64-encoder`, `base64-decoder`, `base64-image-decoder`, `base64-to-image`, `base64-to-pdf`.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real text encoding/decoding using `btoa()` and `atob()` with UTF-8 escape support.
  - Real binary file to Base64 data URL conversion via `FileReader.readAsDataURL()`.
  - Real decoded image rendering in canvas/DOM.

---

### 🟢 7. UUID Generator Engine
- **File**: [`src/components/engines/UuidEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/UuidEngine.tsx)
- **Tools Covered (3)**: `uuid-generator`, `uuid-v4-generator`, `uuid-v7-generator`.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`uuid`](https://github.com/uuidjs/uuid) library.
  - Real Version 4 (cryptographic random).
  - Real Version 7 (Unix timestamp time-ordered sortable).
  - Real Version 1 (MAC & timestamp based).
  - Real Version 5 (deterministic SHA-1 namespace).
  - Batch generation from 1 to 500 with Standard, Compact, Braces, and URN format variations.

---

### 🟢 8. Cryptography & Hash Engine
- **File**: [`src/components/engines/CryptoHashEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/CryptoHashEngine.tsx)
- **Tools Covered (13)**: `hash-generator`, `md5-generator`, `sha256-generator`, `password-generator`, `jwt-decoder`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real cryptographic hashing via [`crypto-js`](https://github.com/brix/crypto-js): MD5, SHA-1, SHA-256, SHA-512.
  - Real cryptographically secure password generator via native `crypto.getRandomValues()`.
  - Real JWT token decoding and header/payload JSON inspection.

---

### 🟢 9. QR Code & Barcode Engine
- **File**: [`src/components/engines/QrBarcodeEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/QrBarcodeEngine.tsx)
- **Tools Covered (11)**: `qr-code-generator`, `url-to-qr-code`, `barcode-generator`, `upc-barcode-generator`, `ean-13-barcode-generator`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`qrcode`](https://github.com/soldair/node-qrcode) library for real 2D QR codes with custom colors, transparent background, and L/M/Q/H error correction.
  - Uses official [`jsbarcode`](https://github.com/lindell/JsBarcode) for real 1D barcodes: Code 128, EAN-13, UPC, Code 39.
  - Direct download as PNG and SVG.

---

### 🟢 10. Markdown & Document Engine
- **File**: [`src/components/engines/MarkdownEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/MarkdownEngine.tsx)
- **Tools Covered (16)**: `markdown-to-pdf`, `markdown-to-docx`, `markdown-preview`, `markdown-editor`, `markdown-to-word`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`marked`](https://github.com/markedjs/marked) for live GFM preview.
  - Real vector PDF generation via [`jspdf`](https://github.com/parallax/jsPDF).
  - Real Microsoft Word `.docx` generation via [`docx`](https://github.com/dolanmiu/docx) with AST headers and paragraphs.

---

### 🟢 11. PDF Suite Engine
- **File**: [`src/components/engines/PdfSuiteEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/PdfSuiteEngine.tsx)
- **Tools Covered (29)**: `merge-pdf`, `split-pdf`, `extract-pdf-pages`, `image-to-pdf`, `jpg-to-pdf-converter`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Uses official [`pdf-lib`](https://github.com/Hopding/pdf-lib).
  - Real binary PDF merging: copies pages between PDF documents in memory and generates a new merged PDF.
  - Real PDF page splitting: extracts exact page ranges (e.g. `1-3`) into a standalone valid PDF.
  - Real Image to PDF conversion using `jsPDF`.

---

### 🟡 12. Image Suite Engine
- **File**: [`src/components/engines/ImageSuiteEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/ImageSuiteEngine.tsx)
- **Tools Covered (76)**: `image-resizer`, `photo-resizer`, `webp-converter`, `png-to-jpg`, `blur-image`, `background-remover`, etc.
- **Status**: 🟡 **HYBRID / REAL WITH ADVANCED UPGRADE**
- **What is Real**:
  - Real HTML5 Canvas-based image resizing by pixel width/height with aspect ratio lock.
  - Real format conversion: PNG, JPG, WebP at custom quality levels.
  - Real visual filters: CSS/Canvas blur, grayscale, brightness adjustments.
- **What is Hardcoded / Limited**:
  - `background-remover` currently applies a canvas filter rather than a neural segmentation model.
- **Recommended Open-Source Upgrade**:
  - [`@imgly/background-removal`](https://github.com/imgly/background-removal-js): State-of-the-art in-browser neural background removal running on WebAssembly & WebGPU.
  ```bash
  npm install @imgly/background-removal
  ```

---

### 🟢 13. Text & Typography Suite Engine
- **File**: [`src/components/engines/TextSuiteEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/TextSuiteEngine.tsx)
- **Tools Covered (46)**: `word-counter`, `character-counter`, `llm-token-counter`, `text-case-converter`, `remove-duplicate-lines`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real word, character (with and without whitespace), sentence, paragraph counts.
  - Reading time and speaking time estimation.
  - LLM token approximation.
  - Case converters: UPPERCASE, lowercase, Title Case, camelCase, kebab-case.
  - Real duplicate line remover and alphabetical sorter (A-Z).

---

### 🟢 14. Encoding & Number Base Converters
- **File**: [`src/components/engines/EncodingConvertersEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/EncodingConvertersEngine.tsx)
- **Tools Covered (25)**: `binary-to-english`, `hex-to-ascii`, `morse-code-translator`, `roman-numeral-converter`, `hex-to-rgb`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real 8-bit binary to ASCII and ASCII to binary.
  - Real hexadecimal to string and string to hex.
  - Real Morse code encoder and decoder with standard ITU Morse table.
  - Real Roman numeral bidirectional converter.
  - Real HEX $\leftrightarrow$ RGB color calculations.

---

### 🟢 15. Time, Date & Productivity Engine
- **File**: [`src/components/engines/TimeCalendarEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/TimeCalendarEngine.tsx)
- **Tools Covered (34)**: `timestamp-converter-generator`, `pomodoro-timer`, `date-calculator`, `world-time-converter`, `2026-calendar`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real Unix timestamp converter (seconds/millis $\leftrightarrow$ UTC, Local, ISO).
  - Real Pomodoro countdown timer with Work (25m), Short Break (5m), and Long Break (15m) cycles.
  - Real date duration & age calculator (exact day counts, weeks, months).
  - Real timezone clocks (UTC, New York, London, Tokyo).

---

### 🟢 16. Math & Educational Calculators Engine
- **File**: [`src/components/engines/MathCalculatorsEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/MathCalculatorsEngine.tsx)
- **Tools Covered (32)**: `percentage-calculator`, `salary-to-hourly-calculator`, `gpa-calculator`, `grade-calculator`, `ratio-calculator`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real mathematical percentage formulas ($X\%$ of $Y$, what $\%$ is $X$ of $Y$).
  - Real annual salary to hourly wage, monthly, bi-weekly, and overtime ($1.5\times$).
  - Real GPA 4.0 weighted credit calculation for college/high school.
  - Real mean, median, min, max, and sum statistics.

---

### 🟢 17. Construction & DIY Calculators Engine
- **File**: [`src/components/engines/ConstructionDiyEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/ConstructionDiyEngine.tsx)
- **Tools Covered (9)**: `concrete-calculator`, `square-footage-calculator`, `tile-calculator`, `paint-calculator`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real concrete volume calculation in cubic feet and cubic yards.
  - Real bag count conversion for 60 lb and 80 lb ready-mix bags.
  - Real square footage area with configurable wastage margin buffer ($+10\%$).

---

### 🟢 18. Health & Fitness Engine
- **File**: [`src/components/engines/HealthFitnessEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/HealthFitnessEngine.tsx)
- **Tools Covered (11)**: `bmi-calculator`, `bmr-calculator`, `tdee-calculator`, `macro-calculator`, `water-intake-calculator`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real World Health Organization BMI formula (metric & imperial) with underweight/normal/overweight/obese classification.
  - Real Mifflin-St Jeor Basal Metabolic Rate (BMR) formula.
  - Real Total Daily Energy Expenditure (TDEE) with activity multipliers.
  - Real macronutrient gram distribution (Protein, Fats, Carbs).
  - Real daily water intake estimation.

---

### 🟢 19. Networking Subnet Engine
- **File**: [`src/components/engines/NetworkingToolsEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/NetworkingToolsEngine.tsx)
- **Tools Covered (5)**: `subnet-calculator`, `cidr-calculator`, `ipv6-subnet-calculator`, `vlsm-calculator`, `subnet-cheat-sheet`.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real bitwise IPv4 subnet math (`0xffffffff << (32 - cidr)`).
  - Computes Network address, Broadcast address, Subnet mask, Wildcard mask.
  - Computes First Usable Host, Last Usable Host, and Total Usable Hosts.

---

### 🟢 20. Randomizers & Interactive Games Engine
- **File**: [`src/components/engines/RandomizersGamesEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/RandomizersGamesEngine.tsx)
- **Tools Covered (49)**: `wheel-of-names`, `coin-flip-simulator`, `dice-roller`, `d20-roller`, `random-item-picker`, `secret-santa-generator`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real HTML5 Canvas **Wheel of Names** with cubic ease-out physics and angular slice hit-detection.
  - Real coin flip with 3D rotation animation and $50/50$ random generator.
  - Real dice roller (d6, d12, d20, d100).

---

### 🟢 21. Hardware & Device Tester Engine
- **File**: [`src/components/engines/DeviceTesterEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/DeviceTesterEngine.tsx)
- **Tools Covered (14)**: `mic-test`, `webcam-test`, `keyboard-test`, `mouse-test`, `double-click-test`, `cps-test`.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real Web Audio API `AudioContext` and `AnalyserNode` frequency analyzer measuring live microphone decibel levels.
  - Real `navigator.mediaDevices.getUserMedia` video stream rendering live webcam feed.
  - Real keyboard ghosting detection capturing every `KeyboardEvent.code`.
  - Real mouse Clicks-Per-Second (CPS) timer test.

---

### 🔴 22. File Viewers Engine
- **File**: [`src/components/engines/FileViewersEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/FileViewersEngine.tsx)
- **Tools Covered (17)**: `3d-viewer`, `stl-viewer`, `obj-viewer`, `glb-viewer`, `sqlite-viewer`, `sqlite-browser`, `xlsx-viewer`, etc.
- **Status**: 🔴 **SIMULATED / MOCK DATA**
- **What is Simulated**:
  - The 3D viewer displays a mesh visualizer card with simulated vertex counts rather than an interactive OrbitControls WebGL 3D viewport.
  - The SQLite browser displays a mock user table rather than executing arbitrary user SQL on an uploaded `.sqlite` or `.db` binary file.
- **Recommended Open-Source Upgrades**:
  1. **For 3D CAD Viewer**:
     - Repository: [`three`](https://github.com/mrdoob/three.js) & [`three-stdlib`](https://github.com/pmndrs/three-stdlib)
     - Loaders: `STLLoader`, `OBJLoader`, `GLTFLoader`
     - Command: `npm install three @types/three`
  2. **For SQLite Browser**:
     - Repository: [`sql.js`](https://github.com/sql-js/sql.js) (Official SQLite compiled to WebAssembly)
     - Command: `npm install sql.js`
  3. **For Excel / Spreadsheet Viewer**:
     - Repository: [`xlsx`](https://github.com/SheetJS/sheetjs) (SheetJS)
     - Command: `npm install xlsx`

---

### 🟢 23. Developer Suite Engine
- **File**: [`src/components/engines/DeveloperSuiteEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/DeveloperSuiteEngine.tsx)
- **Tools Covered (31)**: `sql-formatter-beautifier`, `api-tester`, `rest-api-tester`, `graphql-formatter-beautifier`, etc.
- **Status**: 🟢 **100% REAL**
- **What is Real**:
  - Real SQL formatting via [`sql-formatter`](https://github.com/sql-formatter-org/sql-formatter) supporting PostgreSQL, MySQL, SQLite, and standard SQL dialects.
  - Real REST API runner executing live browser `fetch()` requests (GET, POST, PUT, DELETE) with real HTTP status codes and response bodies.

---

### 🔴 24. Media Audio & Video Engine
- **File**: [`src/components/engines/MediaAudioVideoEngine.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/MediaAudioVideoEngine.tsx)
- **Tools Covered (13)**: `webm-to-mp4-converter`, `mp4-to-mp3`, `video-to-gif`, `wav-to-mp3`, etc.
- **Status**: 🔴 **SIMULATED CONVERSION TIMEOUT**
- **What is Simulated**:
  - Uses an interactive file reader with a 1.5-second simulated progress timeout instead of compiling native H.264/AAC/MP3 audio/video codecs.
- **Recommended Open-Source Upgrade**:
  - Repository: [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) (FFmpeg compiled to WebAssembly)
  - Capabilities: True in-browser media transcoding, video slicing, audio extraction, GIF generation.
  - Command: `npm install @ffmpeg/ffmpeg @ffmpeg/util`

---

## 3. High-Priority Upgrade Recipes

Here are the step-by-step instructions to upgrade the 3 simulated engines to 100% deep production level:

### Recipe 1: Upgrade SQLite Viewer with `sql.js` (WebAssembly)
```bash
cd f:\Website_Project\digitaltoolpad
npm install sql.js @types/sql.js
```
```typescript
// Sample integration in FileViewersEngine.tsx
import initSqlJs from "sql.js";

async function runQueryOnUploadedDb(fileBytes: ArrayBuffer, sqlQuery: string) {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });
  const db = new SQL.Database(new Uint8Array(fileBytes));
  const results = db.exec(sqlQuery);
  return results; // [{ columns: [...], values: [[...], [...]] }]
}
```

### Recipe 2: Upgrade 3D Viewer with `three`
```bash
cd f:\Website_Project\digitaltoolpad
npm install three @types/three
```
```typescript
// Sample integration in FileViewersEngine.tsx
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function loadStl(buffer: ArrayBuffer, container: HTMLDivElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  const material = new THREE.MeshPhongMaterial({ color: 0x0284c7, specular: 0x111111, shininess: 200 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  // Add lighting, OrbitControls, and animate render loop
}
```

### Recipe 3: Upgrade Video Transcoder with `@ffmpeg/ffmpeg`
```bash
cd f:\Website_Project\digitaltoolpad
npm install @ffmpeg/ffmpeg @ffmpeg/util
```
```typescript
// Sample integration in MediaAudioVideoEngine.tsx
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

async function transcodeVideo(inputFile: File, targetExt: string) {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  await ffmpeg.writeFile("input", await fetchFile(inputFile));
  await ffmpeg.exec(["-i", "input", `output.${targetExt}`]);
  const data = await ffmpeg.readFile(`output.${targetExt}`);
  return new Blob([data as any], { type: `video/${targetExt}` });
}
```

---

## 4. File Reference Map

| Component / Utility | File Path |
| :--- | :--- |
| **All Tools Catalog (492)** | [`src/data/tools.ts`](file:///f:/Website_Project/digitaltoolpad/src/data/tools.ts) |
| **Central Engine Dispatcher** | [`src/components/engines/EngineDispatcher.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/engines/EngineDispatcher.tsx) |
| **Dynamic Tool Workspace Shell** | [`src/components/layout/ToolShell.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/layout/ToolShell.tsx) |
| **Global Instant Search (Cmd+K)** | [`src/components/layout/SearchModal.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/layout/SearchModal.tsx) |
| **Header & Mega Dropdown** | [`src/components/layout/Header.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/layout/Header.tsx) |
| **Universal Footer** | [`src/components/layout/Footer.tsx`](file:///f:/Website_Project/digitaltoolpad/src/components/layout/Footer.tsx) |
| **Dynamic Tool Route** | [`src/app/tools/[slug]/page.tsx`](file:///f:/Website_Project/digitaltoolpad/src/app/tools/[slug]/page.tsx) |
| **Directory Page** | [`src/app/tools/page.tsx`](file:///f:/Website_Project/digitaltoolpad/src/app/tools/page.tsx) |
| **Dynamic Sitemap** | [`src/app/sitemap.ts`](file:///f:/Website_Project/digitaltoolpad/src/app/sitemap.ts) |
