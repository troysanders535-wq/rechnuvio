const http = require("http");
const fs = require("fs");

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

function findPdfOffset(bytes) {
  const limit = Math.min(bytes.length - 4, 1024 * 1024);
  for (let i = 0; i < limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return i;
    }
  }
  return -1;
}

async function runAudit() {
  console.log("=================================================");
  console.log("ADOBE ILLUSTRATOR (.AI) VIEWER AUDIT & TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Verify /tools/ai-viewer HTTP response
  try {
    const res = await fetchUrl("http://localhost:3100/tools/ai-viewer");
    assert(res.status === 200, "HTTP 200 on /tools/ai-viewer");
    assert(res.body.includes("Adobe Illustrator (.ai) File Viewer"), "Page Title contains 'Adobe Illustrator (.ai) File Viewer'");
    assert(res.body.includes("Upload Adobe Illustrator File"), "Page contains Heading 'Upload Adobe Illustrator File'");
    assert(res.body.includes("Choose AI File"), "Page contains Button 'Choose AI File'");
    assert(res.body.includes("Preview PDF-compatible .ai files directly in your browser. Your files stay on your device."), "Page contains exact helper text");
    assert(res.body.includes("Preview PDF-compatible Adobe Illustrator files in your browser. Zoom, browse available pages, and export previews as PNG or JPG. Files stay on your device."), "Metadata contains exact required description");
    assert(!res.body.includes("SELECT * FROM users"), "Zero SQLite queries on /tools/ai-viewer");
    assert(!res.body.includes("SQLite Database Online Browser"), "Zero SQLite headers on /tools/ai-viewer");
  } catch (err) {
    assert(false, "HTTP Request to /tools/ai-viewer", err.message);
  }

  // 2. Verify SQLite tool is preserved on /tools/sqlite-browser
  try {
    const resSql = await fetchUrl("http://localhost:3100/tools/sqlite-browser");
    assert(resSql.status === 200, "HTTP 200 on /tools/sqlite-browser");
    assert(resSql.body.includes("SQLite Database Online Browser"), "SQLite tool preserved on /tools/sqlite-browser");
    assert(resSql.body.includes("SELECT * FROM users"), "SQLite query sample preserved on /tools/sqlite-browser");
  } catch (err) {
    assert(false, "HTTP Request to /tools/sqlite-browser", err.message);
  }

  // 3. Verify PDF compatibility detection & fixtures
  try {
    const validSingle = fs.readFileSync("test-fixtures/valid-single.ai");
    const validMulti = fs.readFileSync("test-fixtures/valid-multipage.ai");
    const legacyNoPdf = fs.readFileSync("test-fixtures/legacy-no-pdf.ai");
    const corruptAi = fs.readFileSync("test-fixtures/corrupted.ai");

    assert(findPdfOffset(validSingle) === 0, "Valid AI fixture detects PDF stream at offset 0");
    assert(findPdfOffset(validMulti) === 0, "Multipage AI fixture detects PDF stream at offset 0");
    assert(findPdfOffset(legacyNoPdf) === -1, "Legacy PostScript AI fixture has no PDF stream (offset -1)");
    assert(findPdfOffset(corruptAi) === -1, "Corrupted AI fixture has no PDF stream (offset -1)");

    // Test PDF.js loading valid single and multi fixtures
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task1 = pdfjs.getDocument({ data: new Uint8Array(validSingle) });
    const doc1 = await task1.promise;
    assert(doc1.numPages === 1, "PDF.js parsed valid-single.ai with 1 page");
    const page1 = await doc1.getPage(1);
    const vp1 = page1.getViewport({ scale: 1.0 });
    assert(vp1.width === 500 && vp1.height === 400, "Page 1 has correct dimensions (500x400 pt)");
    await doc1.cleanup();
    await task1.destroy();

    const task2 = pdfjs.getDocument({ data: new Uint8Array(validMulti) });
    const doc2 = await task2.promise;
    assert(doc2.numPages === 3, "PDF.js parsed valid-multipage.ai with 3 pages");
    await doc2.cleanup();
    await task2.destroy();

    // Verify exact required message string for non-compatible AI
    const requiredErrorMsg = "This Illustrator file has no readable PDF-compatible preview. Re-save it in Adobe Illustrator with ‘Create PDF Compatible File’ enabled, or export it as PDF.";
    const appSource = fs.readFileSync("src/components/engines/AiViewerEngine.tsx", "utf8");
    assert(appSource.includes(requiredErrorMsg), "AiViewerEngine contains exact required error message for non-compatible files");

    // Verify required export formats (PNG, JPG, PDF) and resolution
    assert(appSource.includes("image/png") && appSource.includes("image/jpeg"), "AiViewerEngine supports both PNG (transparent) and JPG (white background)");
    assert(appSource.includes("4.167") || appSource.includes("300 DPI"), "AiViewerEngine includes 300 DPI print quality option");
  } catch (err) {
    assert(false, "PDF.js fixture validation", err.message);
  }

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log("-------------------------------------------------");

  process.exit(failed > 0 ? 1 : 0);
}

runAudit();
