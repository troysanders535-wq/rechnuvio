/**
 * Functional specs for the 35 tools of the pdf-suite engine.
 *
 * Every spec drives the real UI in Chrome: it opens the real file picker,
 * presses the real button and reads the real downloaded bytes. The fixtures
 * are built in the browser - a PDF is written byte by byte, an image is drawn
 * on a canvas - so no file is ever read from or written to disk.
 *
 * The expected values follow the PDF specification (ISO 32000): a file starts
 * with the bytes "%PDF-", a page object carries "/Type /Page", the document
 * information dictionary holds /Title and /Author, and a .docx is a zip
 * archive that contains word/document.xml.
 */

import assert from "node:assert";
import zlib from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  spec,
  fillArea,
  fillInput,
  selectOption,
  clickButton,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertMatches,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

/**
 * Write a small but valid PDF with one page per label.
 *
 * The file follows ISO 32000: a header, the catalog, the page tree, one
 * page object and one content stream per page, the font, and a cross
 * reference table with a trailer. A label is either a string or a list of
 * [text, font size] lines.
 *
 * The third argument adds the parts a real document can carry and the
 * information dictionary does not: an XMP packet with an edit history and the
 * GPS coordinates of a photo, the identifier of the document in the trailer
 * and an embedded file.
 */
function makePdf(labels, meta, extras = {}) {
  const enc = (s) => Buffer.from(s, "latin1");
  const chunks = [];
  let offset = 0;
  const push = (buf) => {
    chunks.push(buf);
    offset += buf.length;
  };
  const objects = [];
  const fontObj = 3 + labels.length * 2;
  let last = fontObj;

  let infoObj = 0;
  if (meta) {
    infoObj = fontObj + 1;
    last = infoObj;
  }
  let metaObj = 0;
  if (extras.xmp) {
    metaObj = last + 1;
    last = metaObj;
  }
  let treeObj = 0;
  let specObj = 0;
  let fileObj = 0;
  if (extras.attachment) {
    treeObj = last + 1;
    specObj = last + 2;
    fileObj = last + 3;
    last = fileObj;
  }

  let catalog = "<< /Type /Catalog /Pages 2 0 R";
  if (metaObj) catalog += ` /Metadata ${metaObj} 0 R`;
  if (treeObj) catalog += ` /Names << /EmbeddedFiles ${treeObj} 0 R >>`;
  catalog += " >>";
  objects[1] = catalog;
  objects[2] = `<< /Type /Pages /Kids [${labels
    .map((_, i) => `${3 + i * 2} 0 R`)
    .join(" ")}] /Count ${labels.length} >>`;
  labels.forEach((label, i) => {
    const pageObj = 3 + i * 2;
    objects[pageObj] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${pageObj + 1} 0 R >>`;
    const lines = Array.isArray(label) ? label : [[label, 24]];
    let y = 240;
    let stream = "";
    for (const [text, size] of lines) {
      stream += `BT /F1 ${size} Tf 20 ${y} Td (${text}) Tj ET\n`;
      y -= size + 12;
    }
    objects[pageObj + 1] = { dict: `<< /Length ${stream.length} >>`, stream };
  });
  objects[fontObj] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  if (infoObj) {
    objects[infoObj] =
      `<< /Title (${meta.title}) /Author (${meta.author}) /Subject (${meta.subject}) ` +
      `/Creator (${meta.creator}) /Producer (${meta.producer}) >>`;
  }
  if (metaObj) {
    objects[metaObj] = {
      dict: `<< /Type /Metadata /Subtype /XML /Length ${extras.xmp.length} >>`,
      stream: extras.xmp,
    };
  }
  if (treeObj) {
    objects[treeObj] = `<< /Names [(${extras.attachment}) ${specObj} 0 R] >>`;
    objects[specObj] =
      `<< /Type /Filespec /F (${extras.attachment}) /UF (${extras.attachment}) ` +
      `/EF << /F ${fileObj} 0 R >> >>`;
    objects[fileObj] = {
      dict: `<< /Type /EmbeddedFile /Subtype /text#2Fplain /Length ${extras.attachmentBody.length} >>`,
      stream: extras.attachmentBody,
    };
  }

  push(enc("%PDF-1.7\n"));
  const offsets = [];
  for (let i = 1; i <= last; i += 1) {
    offsets[i] = offset;
    const obj = objects[i];
    if (typeof obj === "string") push(enc(`${i} 0 obj\n${obj}\nendobj\n`));
    else push(enc(`${i} 0 obj\n${obj.dict}\nstream\n${obj.stream}endstream\nendobj\n`));
  }
  const xrefStart = offset;
  let xref = `xref\n0 ${last + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= last; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref +=
    `trailer\n<< /Size ${last + 1} /Root 1 0 R` +
    `${infoObj ? ` /Info ${infoObj} 0 R` : ""}` +
    `${extras.id ? ` /ID [<${extras.id}> <${extras.id}>]` : ""} >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;
  push(enc(xref));
  return Buffer.concat(chunks);
}

/** The text of the engine panel only. */
async function panel(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/** Put a file into the file input of the workspace. */
async function upload(page, name, type, bytes) {
  await page.evaluate(
    ({ name, type, data }) => {
      const file = new File([new Uint8Array(data)], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, data: Array.from(bytes) },
  );
  await sleep(900);
}

/** Draw a small PNG in the page and hand it to the file input. */
async function uploadPng(page, name = "shot.png") {
  await page.evaluate(async (fileName) => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3366cc";
    ctx.fillRect(0, 0, 40, 30);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], fileName, { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector("main input[type=file]");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, name);
  await sleep(900);
}

/**
 * Press a button and return every file the browser downloaded.
 *
 * The bytes are read in memory, nothing is written to disk.
 */
async function downloadAfter(page, action, timeout = 25000) {
  const downloads = [];
  const onDownload = (d) => downloads.push(d);
  page.on("download", onDownload);
  try {
    await action();
    const started = Date.now();
    while (downloads.length === 0 && Date.now() - started < timeout) await sleep(150);
    await sleep(1500);
    const files = [];
    for (const d of downloads) {
      const stream = await d.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      files.push({ name: d.suggestedFilename(), bytes: Buffer.concat(chunks) });
    }
    return files;
  } finally {
    page.off("download", onDownload);
  }
}

/** Press a button and return the first downloaded file. */
async function downloadOne(page, buttonLabel) {
  const files = await downloadAfter(page, () => clickButton(page, buttonLabel));
  assert(files.length > 0, `the button ${JSON.stringify(buttonLabel)} must download a file`);
  return files[0];
}

/** The number of page objects in a PDF. */
function pdfPageCount(bytes) {
  // A writer may pack the page objects into a compressed object stream
  // (MuPDF writes "objstms=yes"), so the raw bytes alone do not show them.
  // The inflated object streams are counted as well.
  const raw = bytes.toString("latin1").match(/\/Type\s*\/Page(?![s])/g);
  if (raw && raw.length) return raw.length;
  const inflated = inflatedText(bytes).match(/\/Type\s*\/Page(?![s])/g);
  return inflated ? inflated.length : 0;
}

/**
 * The text of every deflated stream of a PDF.
 *
 * A writer may pack the document information dictionary into a compressed
 * object stream, so the raw bytes alone do not show the metadata.
 */
function inflatedText(bytes) {
  const text = bytes.toString("latin1");
  const parts = [];
  let index = 0;
  for (;;) {
    const at = text.indexOf("stream", index);
    if (at < 0) break;
    let start = at + 6;
    if (text[start] === "\r") start += 1;
    if (text[start] === "\n") start += 1;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    try {
      parts.push(zlib.inflateSync(bytes.subarray(start, end)).toString("latin1"));
    } catch {
      /* not a deflated stream */
    }
    index = end + 9;
  }
  return parts.join("\n");
}

/**
 * The value of a field of the document information dictionary.
 *
 * A writer may store the value as a literal string or as a UTF-16BE hex
 * string, and it may pack the dictionary into a compressed object stream.
 */
function pdfInfoValue(bytes, key) {
  const text = `${bytes.toString("latin1")}\n${inflatedText(bytes)}`;
  const hex = new RegExp(`/${key}\\s*<([0-9A-Fa-f]+)>`).exec(text);
  if (hex) {
    const raw = Buffer.from(hex[1], "hex");
    const swapped = Buffer.from(raw);
    swapped.swap16();
    return swapped.toString("utf16le").replace(/^\uFEFF/, "");
  }
  const literal = new RegExp(`/${key}\\s*\\(([^)]*)\\)`).exec(text);
  return literal ? literal[1] : null;
}

/**
 * The text of every page of a PDF, in the order the pages have.
 *
 * The order is what a reader sees, so it is the order the merged document
 * really has - not the order the objects happen to sit in the file.
 */
async function pdfPageTexts(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: `${join(root, "node_modules", "pdfjs-dist", "standard_fonts")}/`,
  });
  const doc = await task.promise;
  const texts = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item) => item.str).join(" "));
  }
  await doc.cleanup();
  await task.destroy();
  return texts;
}

/** Wait until the metadata table of the workspace is on the page. */
async function waitForMetaTable(page, timeout = 30000) {
  await page.waitForSelector('main [data-testid="pdf-meta-table"]', { timeout });
}

/** The number of rows in the page list of the merge editor. */
async function mergePageCount(page) {
  return page.locator('main [data-testid="merge-page-item"]').count();
}

/** Click a control of the page list of the merge editor. */
async function clickMergePageControl(page, testid, index) {
  await page.locator(`main [data-testid="${testid}"]`).nth(index).click();
  await sleep(300);
}

/** The number of members in a zip archive. */
function zipEntryCount(bytes) {
  const matches = bytes.toString("latin1").match(/PK\x03\x04/g);
  return matches ? matches.length : 0;
}

/** The word/document.xml of a .docx package. */
function docxDocumentXml(bytes) {
  const marker = Buffer.from("word/document.xml", "utf8");
  const at = bytes.indexOf(marker);
  if (at < 30) return null;
  const header = at - 30;
  if (bytes.readUInt32LE(header) !== 0x04034b50) return null;
  const method = bytes.readUInt16LE(header + 8);
  const compressedSize = bytes.readUInt32LE(header + 18);
  const nameLength = bytes.readUInt16LE(header + 26);
  const extraLength = bytes.readUInt16LE(header + 28);
  const start = header + 30 + nameLength + extraLength;
  const raw = bytes.subarray(start, start + compressedSize);
  return (method === 0 ? raw : zlib.inflateRawSync(raw)).toString("utf8");
}

/* --------------------------------------------------------------- fixtures -- */

const META = {
  title: "Audit Sample Title",
  author: "Audit Sample Author",
  subject: "Audit Sample Subject",
  creator: "Audit Sample Creator",
  producer: "Audit Sample Producer",
};

/**
 * An XMP packet with an edit history, an earlier version and the GPS
 * coordinates of a photo - the parts of a document the information
 * dictionary does not carry.
 */
const XMP = [
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
  '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.0-c060">',
  '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
  '<rdf:Description rdf:about="" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"',
  ' xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#"',
  ' xmlns:exif="http://ns.adobe.com/exif/1.0/">',
  "<xmpMM:History><rdf:Seq>",
  '<rdf:li rdf:parseType="Resource"><stEvt:action>created</stEvt:action>',
  "<stEvt:changed>2024-03-04T09:15:00Z</stEvt:changed>",
  "<stEvt:instanceID>xmp.iid.1111</stEvt:instanceID></rdf:li>",
  '<rdf:li rdf:parseType="Resource"><stEvt:action>modified</stEvt:action>',
  "<stEvt:changed>2024-05-06T11:45:00Z</stEvt:changed>",
  "<stEvt:instanceID>xmp.iid.2222</stEvt:instanceID></rdf:li>",
  "</rdf:Seq></xmpMM:History>",
  "<xmpMM:Versions><rdf:Seq>",
  '<rdf:li rdf:parseType="Resource"><stEvt:action>created</stEvt:action>',
  "<stEvt:changed>2023-11-02T08:00:00Z</stEvt:changed></rdf:li>",
  "</rdf:Seq></xmpMM:Versions>",
  "<exif:GPSLatitude>48,51.5N</exif:GPSLatitude>",
  "<exif:GPSLongitude>2,17.6E</exif:GPSLongitude>",
  "</rdf:Description></rdf:RDF></x:xmpmeta>",
  '<?xpacket end="w"?>',
].join("\n");

/** The parts of a document that the information dictionary does not carry. */
const EXTRAS = {
  xmp: XMP,
  id: "A1B2C3D4E5F60718",
  attachment: "notes.txt",
  attachmentBody: "the attached notes",
};

const EML = [
  "From: alice@example.com",
  "To: bob@example.com",
  "Subject: Quarterly Statement",
  "Date: Mon, 12 Nov 2023 10:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hello Bob,",
  "The statement is attached.",
  "",
].join("\n");

/* --------------------------------------------------------------- specs ---- */

export function register() {
  /* ------------------------------------------------------------ merge -- */

  spec("merge-pdf", "merges two documents into one", async (page) => {
    await upload(page, "one.pdf", "application/pdf", makePdf(["Page One"]));
    await upload(page, "two.pdf", "application/pdf", makePdf(["Page Two", "Page Three"]));
    const file = await downloadOne(page, "Merge 2 PDFs");
    assertEqual(pdfPageCount(file.bytes), 3, "the merged document must have three pages");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the merged document must be a PDF",
    );
    assertIncludes(await panel(page), "3", "the workspace must report the number of pages");

    // The pages of the documents can be moved and removed one by one.
    await page.waitForSelector('main [data-testid="merge-page-item"]', { timeout: 20000 });
    assertEqual(
      await mergePageCount(page),
      3,
      "the editor must list the page of every document",
    );

    // "Page Two" is dropped, "Page Three" moves in front of "Page One".
    await clickMergePageControl(page, "merge-page-remove", 1);
    await clickMergePageControl(page, "merge-page-up", 1);
    assertEqual(
      await mergePageCount(page),
      2,
      "the removed page must disappear from the list",
    );

    const edited = await downloadOne(page, "Merge 2 PDFs");
    assertEqual(pdfPageCount(edited.bytes), 2, "only the pages that are left are merged");
    assertEqual(
      (await pdfPageTexts(edited.bytes)).join(","),
      "Page Three,Page One",
      "the merged document must have the pages in the order of the list",
    );
  });

  spec("pdf-merger", "merges two documents into one", async (page) => {
    await upload(page, "a.pdf", "application/pdf", makePdf(["A1", "A2"]));
    await upload(page, "b.pdf", "application/pdf", makePdf(["B1", "B2"]));
    const file = await downloadOne(page, "Merge 2 PDFs");
    assertEqual(pdfPageCount(file.bytes), 4, "the merged document must have four pages");

    // The documents themselves can still be reordered.
    await page.locator('main [data-testid="merge-file-up"]').nth(1).click();
    await sleep(300);
    const reordered = await downloadOne(page, "Merge 2 PDFs");
    assertEqual(
      (await pdfPageTexts(reordered.bytes)).join(","),
      "B1,B2,A1,A2",
      "the documents must be merged in the order they are listed",
    );
  });

  spec("combine-pdf", "combines two documents into one", async (page) => {
    await upload(page, "first.pdf", "application/pdf", makePdf(["First"]));
    await upload(page, "second.pdf", "application/pdf", makePdf(["Second", "Third"]));
    const file = await downloadOne(page, "Merge 2 PDFs");
    assertEqual(pdfPageCount(file.bytes), 3, "the combined document must have three pages");
    assertIncludes(
      file.bytes.toString("latin1"),
      "(First)",
      "the combined document must keep the text of the first file",
    );
    assertIncludes(
      file.bytes.toString("latin1"),
      "(Third)",
      "the combined document must keep the text of the second file",
    );
  });

  /* ------------------------------------------------------------ split -- */

  spec("split-pdf", "extracts a page range into a new document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2", "P3"]));
    await page.locator('main input[type="text"]').first().fill("1-2");
    await sleep(300);
    const file = await downloadOne(page, "Extract pages");
    assertEqual(pdfPageCount(file.bytes), 2, "the extracted document must have two pages");
    assertNotIncludes(file.bytes.toString("latin1"), "(P3)", "the third page must be left out");
  });

  spec("pdf-splitter", "splits a document into single pages", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2", "P3"]));
    await selectOption(page, "each", 0);
    await sleep(300);
    const file = await downloadOne(page, "Split PDF");
    assert(
      file.name.endsWith(".zip"),
      `the splitter must deliver a zip archive, got ${file.name}`,
    );
    assertEqual(zipEntryCount(file.bytes), 3, "the archive must hold one file per page");
  });

  spec("extract-pdf-pages", "extracts the selected pages", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2", "P3", "P4"]));
    await page.locator('main input[type="text"]').first().fill("2,4");
    await sleep(300);
    const file = await downloadOne(page, "Extract pages");
    assertEqual(pdfPageCount(file.bytes), 2, "the extracted document must have two pages");
    assertIncludes(file.bytes.toString("latin1"), "(P2)", "the second page must be kept");
    assertIncludes(file.bytes.toString("latin1"), "(P4)", "the fourth page must be kept");
  });

  /* ---------------------------------------------------------- img2pdf -- */

  spec("image-to-pdf", "puts an image into a PDF", async (page) => {
    await uploadPng(page, "picture.png");
    const file = await downloadOne(page, "Create PDF (1 page)");
    assertEqual(pdfPageCount(file.bytes), 1, "the PDF must have one page");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must be a PDF",
    );
  });

  spec("jpg-to-pdf-converter", "puts a picture into a PDF", async (page) => {
    await uploadPng(page, "picture.png");
    const file = await downloadOne(page, "Create PDF (1 page)");
    assertEqual(pdfPageCount(file.bytes), 1, "the PDF must have one page");
    assert(file.bytes.length > 400, "the PDF must carry the picture");
  });

  spec("png-to-pdf", "puts a PNG into a PDF", async (page) => {
    await uploadPng(page, "picture.png");
    await uploadPng(page, "second.png");
    const file = await downloadOne(page, "Create PDF (2 pages)");
    assertEqual(pdfPageCount(file.bytes), 2, "the PDF must have one page per picture");
  });

  /* ---------------------------------------------------------- toImage -- */

  spec("pdf-to-image-converter", "renders every page as a picture", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2"]));
    const file = await downloadOne(page, "Export images");
    assert(
      file.name.endsWith(".zip"),
      `the exporter must deliver a zip archive, got ${file.name}`,
    );
    assertEqual(zipEntryCount(file.bytes), 2, "the archive must hold one picture per page");
  });

  spec("pdf-to-png-converter", "renders the pages as PNG", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1"]));
    const file = await downloadOne(page, "Export images");
    assertEqual(
      file.bytes.subarray(0, 8).toString("hex"),
      "89504e470d0a1a0a",
      "the exported file must be a PNG",
    );
  });

  spec("pdf-to-jpg-converter", "renders the pages as JPG", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1"]));
    await selectOption(page, "jpeg", 0);
    await sleep(300);
    const file = await downloadOne(page, "Export images");
    assertEqual(
      file.bytes.subarray(0, 3).toString("hex"),
      "ffd8ff",
      "the exported file must be a JPEG",
    );
  });

  /* --------------------------------------------------------- metadata -- */

  spec("pdf-metadata-viewer", "reads the document information", async (page) => {
    await upload(
      page,
      "doc.pdf",
      "application/pdf",
      makePdf(["P1"], META, EXTRAS),
    );
    await clickButton(page, "Read metadata");
    await waitForMetaTable(page);
    const text = await panel(page);
    assertIncludes(text, "Audit Sample Title", "the viewer must show the title");
    assertIncludes(text, "Audit Sample Author", "the viewer must show the author");
    assertIncludes(text, "Audit Sample Producer", "the viewer must show the producer");
    // The parts of the document the information dictionary does not carry.
    assertIncludes(
      text,
      "2024-03-04T09:15:00Z",
      "the viewer must show the edit history of the XMP packet",
    );
    assertIncludes(
      text,
      "2024-05-06T11:45:00Z",
      "the viewer must show every entry of the edit history",
    );
    assertIncludes(
      text,
      "2023-11-02T08:00:00Z",
      "the viewer must show the earlier versions of the document",
    );
    assertIncludes(
      text,
      "48,51.5N",
      "the viewer must show the GPS coordinates of the photo",
    );
    assertIncludes(
      text,
      "A1B2C3D4E5F60718",
      "the viewer must show the identifier of the document",
    );
    assertIncludes(text, "notes.txt", "the viewer must list the attachments");
  });

  spec("pdf-metadata-editor", "writes a new title into the document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1"], META));
    await clickButton(page, "Save metadata");
    await sleep(600);
    const fields = page.locator('main input[type="text"]');
    await fields.nth(0).fill("Changed Title");
    const file = await downloadOne(page, "Save metadata");
    assertEqual(
      pdfInfoValue(file.bytes, "Title"),
      "Changed Title",
      "the saved document must carry the new title",
    );
  });

  spec("pdf-metadata-remover", "strips the document information", async (page) => {
    await upload(
      page,
      "doc.pdf",
      "application/pdf",
      makePdf(["P1"], META, EXTRAS),
    );

    // The remover shows what is inside the file before it takes it out.
    await waitForMetaTable(page);
    const before = await panel(page);
    assertIncludes(
      before,
      "Audit Sample Title",
      "the remover must show the title before it is removed",
    );
    assertIncludes(
      before,
      "2024-03-04T09:15:00Z",
      "the remover must show the edit history before it is removed",
    );
    assertIncludes(
      before,
      "48,51.5N",
      "the remover must show the GPS coordinates before they are removed",
    );
    assertIncludes(
      before,
      "notes.txt",
      "the remover must show the attachments before they are removed",
    );

    const file = await downloadOne(page, "Remove metadata");
    const raw = file.bytes.toString("latin1") + inflatedText(file.bytes);
    assertNotIncludes(raw, "Audit Sample Title", "the title must be removed");
    assertNotIncludes(raw, "Audit Sample Author", "the author must be removed");
    assertNotIncludes(raw, "Audit Sample Producer", "the producer must be removed");
    assertNotIncludes(
      String(pdfInfoValue(file.bytes, "Title")),
      "Audit Sample",
      "the title of the document information dictionary must be gone",
    );
    assertNotIncludes(
      raw,
      "xmpMM:History",
      "the XMP packet with the edit history must be removed",
    );
    assertNotIncludes(
      raw,
      "GPSLatitude",
      "the GPS coordinates must be removed with the XMP packet",
    );
    assertNotIncludes(raw, "notes.txt", "the attachment must be removed");
    assertNotIncludes(
      raw,
      "the attached notes",
      "the bytes of the attachment must be removed",
    );
    assertIncludes(file.bytes.toString("latin1"), "%PDF-", "the cleaned file must still be a PDF");

    // The report names the groups that were taken out of the file.
    assertEqual(
      await page.locator('main [data-testid="pdf-meta-removed"] li').count(),
      4,
      "the report must name the document information, the XMP packet, the GPS coordinates and the attachments",
    );
  });

  /* ---------------------------------------------------------- compress -- */

  spec("compress-pdf", "compresses a document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2"]));
    const file = await downloadOne(page, "Compress PDF");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the compressed file must still be a PDF",
    );
    assertEqual(pdfPageCount(file.bytes), 2, "the compressed file must keep both pages");
    assertMatches(
      await panel(page),
      /\d+\s*B\s*(→|->)\s*\d+\s*B/,
      "the workspace must report the size before and after the compression",
    );
  });

  spec("pdf-compressor", "compresses a document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2", "P3"]));
    const file = await downloadOne(page, "Compress PDF");
    assertEqual(pdfPageCount(file.bytes), 3, "the compressed file must keep all three pages");
  });

  spec("reduce-pdf-size", "rewrites a document with a smaller structure", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["P1", "P2"]));
    const file = await downloadOne(page, "Optimise (keep text selectable)");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the optimised file must still be a PDF",
    );
    assertEqual(pdfPageCount(file.bytes), 2, "the optimised file must keep both pages");
    assertIncludes(
      file.bytes.toString("latin1"),
      "(P1)",
      "the optimised file must keep the text selectable",
    );
  });

  /* ----------------------------------------------------------- redact -- */

  spec("pdf-redaction-tool", "removes the marked text from the document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Secret One", "Public Two"]));
    await page.locator('main input[type="text"]').first().fill("Secret One");
    await clickButton(page, "Find matches");
    await sleep(900);
    assertIncludes(await panel(page), "1 area(s) marked", "the tool must find the text");
    const file = await downloadOne(page, "Apply redaction");
    assertNotIncludes(
      file.bytes.toString("latin1"),
      "Secret One",
      "the redacted text must be gone from the file",
    );
    assertEqual(pdfPageCount(file.bytes), 2, "the redacted document must keep both pages");
  });

  spec("redact-pdf", "removes the marked text from the document", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Secret One", "Public Two"]));
    await page.locator('main input[type="text"]').first().fill("Secret One");
    await clickButton(page, "Find matches");
    await sleep(900);
    const file = await downloadOne(page, "Apply redaction");
    assertNotIncludes(
      file.bytes.toString("latin1"),
      "Secret One",
      "the redacted text must be gone from the file",
    );
  });

  spec("redact-bank-statement", "removes the account number from a statement", async (page) => {
    await upload(
      page,
      "statement.pdf",
      "application/pdf",
      makePdf(["Account 123456789", "Balance 500"]),
    );
    await page.locator('main input[type="text"]').first().fill("123456789");
    await clickButton(page, "Find matches");
    await sleep(900);
    const file = await downloadOne(page, "Apply redaction");
    assertNotIncludes(
      file.bytes.toString("latin1"),
      "123456789",
      "the account number must be gone from the file",
    );
  });

  spec("black-out-text-in-pdf", "blacks out every occurrence of a word", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Secret One", "Public Two"]));
    await page.locator('main input[type="text"]').first().fill("Secret One");
    await clickButton(page, "Find matches");
    await sleep(900);
    const file = await downloadOne(page, "Black out matches");
    assertNotIncludes(
      file.bytes.toString("latin1"),
      "Secret One",
      "the blacked out text must be gone from the file",
    );
  });

  /* ------------------------------------------------------------ toDocx -- */

  spec("pdf-to-docx", "rebuilds a document as a Word file", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Hello Document"]));
    const file = await downloadOne(page, "Convert to DOCX");
    assert(file.name.endsWith(".docx"), `the download must be a .docx, got ${file.name}`);
    const xml = docxDocumentXml(file.bytes);
    assert(xml, "the Word document must hold a word/document.xml part");
    assertIncludes(xml, "Hello Document", "the Word document must carry the text of the PDF");
  });

  spec("pdf-to-word", "rebuilds a document as a Word file", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Word Export"]));
    const file = await downloadOne(page, "Convert to DOCX");
    const xml = docxDocumentXml(file.bytes);
    assert(xml, "the Word document must hold a word/document.xml part");
    assertIncludes(xml, "Word Export", "the Word document must carry the text of the PDF");
  });

  spec("pdf-to-word-converter", "rebuilds a document as a Word file", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Converter Export"]));
    const file = await downloadOne(page, "Convert to DOCX");
    assert(file.name.endsWith(".docx"), `the download must be a .docx, got ${file.name}`);
    const xml = docxDocumentXml(file.bytes);
    assertIncludes(xml, "Converter Export", "the Word document must carry the text of the PDF");
  });

  /* --------------------------------------------------------- toMarkdown -- */

  spec("pdf-to-markdown", "turns the text layer into markdown", async (page) => {
    await upload(
      page,
      "doc.pdf",
      "application/pdf",
      makePdf([[["Audit Heading", 30], ["The body of the report.", 12]]]),
    );
    await clickButton(page, "Convert to Markdown");
    await sleep(1200);
    const out = await page.locator("main textarea").first().inputValue();
    assertIncludes(out, "# Audit Heading", "the markdown must use a heading");
    assertIncludes(out, "The body of the report.", "the markdown must carry the body text");
  });

  spec("pdf-to-markdown-for-claude", "turns the text layer into markdown", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Claude Line"]));
    await clickButton(page, "Convert to Markdown");
    await sleep(900);
    const out = await page.locator("main textarea").first().inputValue();
    assertIncludes(out, "Claude Line", "the markdown must carry the text of the PDF");
  });

  spec("pdf-to-md", "turns the text layer into markdown", async (page) => {
    await upload(page, "doc.pdf", "application/pdf", makePdf(["Short Line"]));
    await clickButton(page, "Convert to Markdown");
    await sleep(900);
    const out = await page.locator("main textarea").first().inputValue();
    assertIncludes(out, "Short Line", "the markdown must carry the text of the PDF");
  });

  /* ----------------------------------------------------------- base64 -- */

  spec("base64-to-pdf", "decodes a base64 payload into a PDF", async (page) => {
    const original = makePdf(["Base64 Page"]);
    await fillArea(page, original.toString("base64"), 0);
    await clickButton(page, "Inspect payload");
    await sleep(600);
    assertIncludes(
      await panel(page),
      `Decoded ${original.length} bytes`,
      "the tool must report how many bytes it decoded",
    );
    const file = await downloadOne(page, "Convert to PDF");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the decoded file must be a PDF",
    );
    assertEqual(pdfPageCount(file.bytes), 1, "the decoded document must have one page");
  });

  spec("base64-to-pdf-converter", "decodes a base64 payload into a PDF", async (page) => {
    const original = makePdf(["Converter Page"]);
    await fillArea(page, original.toString("base64"), 0);
    await clickButton(page, "Inspect payload");
    await sleep(600);
    assertMatches(
      await panel(page),
      /pdf document/i,
      "the tool must recognise the payload as a PDF",
    );
    const file = await downloadOne(page, "Convert to PDF");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the decoded file must be a PDF",
    );
  });

  spec("base64-to-pdf-decoder", "decodes a base64 payload into a PDF", async (page) => {
    const original = makePdf(["Decoder Page"]);
    await fillArea(page, original.toString("base64"), 0);
    await clickButton(page, "Inspect payload");
    await sleep(600);
    assertMatches(
      await panel(page),
      /pdf document/i,
      "the tool must recognise the payload as a PDF",
    );
    const file = await downloadOne(page, "Convert to PDF");
    assertEqual(pdfPageCount(file.bytes), 1, "the decoded document must have one page");
  });

  /* ------------------------------------------------------------ email -- */

  spec("eml-to-pdf", "turns an email into a PDF", async (page) => {
    await upload(page, "mail.eml", "message/rfc822", Buffer.from(EML, "utf8"));
    await sleep(800);
    const text = await panel(page);
    assertIncludes(text, "Quarterly Statement", "the tool must show the subject of the email");
    assertIncludes(text, "alice@example.com", "the tool must show the sender of the email");
    const file = await downloadOne(page, "Convert to PDF");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must be a PDF",
    );
    assertIncludes(
      file.bytes.toString("latin1"),
      "Quarterly Statement",
      "the PDF must carry the subject of the email",
    );
  });

  spec("msg-to-pdf", "turns an Outlook message into a PDF", async (page) => {
    const accept = await page.evaluate(() => {
      const input = document.querySelector("main input[type=file]");
      return input ? input.getAttribute("accept") || "" : "";
    });
    assert(
      accept.toLowerCase().includes(".msg"),
      `the tool must accept Outlook messages, the file input accepts ${JSON.stringify(accept)}`,
    );
    // a file that is not a real Outlook message must be reported, not crash
    await upload(page, "mail.msg", "application/vnd.ms-outlook", Buffer.from(EML, "utf8"));
    await sleep(1200);
    const text = await panel(page);
    assert(
      text.length > 0,
      "the tool must answer after a message was chosen",
    );
  });

  /* ------------------------------------------------------------- html -- */

  spec("ai-to-pdf", "turns a document into a PDF", async (page) => {
    await page.locator('main input[type="text"]').first().fill("Audit Heading");
    await fillArea(page, "# Audit Heading\n\nThe body of the report.", 0);
    const file = await downloadOne(page, "Generate PDF");
    assertEqual(
      file.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must be a PDF",
    );
    assertIncludes(
      file.bytes.toString("latin1"),
      "Audit Heading",
      "the PDF must carry the heading of the document",
    );
    assertEqual(pdfPageCount(file.bytes), 1, "the PDF must have one page");
  });

  /* ----------------------------------------------------------- pdf417 -- */

  spec("pdf417-generator", "renders a PDF417 barcode", async (page) => {
    await fillArea(page, "TOOLPAD-417", 0);
    const files = await downloadAfter(page, () => clickButton(page, "Generate barcode"));
    const pdf = files.find((f) => f.name.endsWith(".pdf"));
    const png = files.find((f) => f.name.endsWith(".png"));
    assert(pdf, `a PDF must be downloaded, got ${files.map((f) => f.name).join(", ")}`);
    assert(png, `a PNG must be downloaded, got ${files.map((f) => f.name).join(", ")}`);
    assertEqual(
      pdf.bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must be a PDF",
    );
    assertEqual(
      png.bytes.subarray(0, 8).toString("hex"),
      "89504e470d0a1a0a",
      "the preview must be a PNG",
    );
    assert(png.bytes.length > 500, "the barcode picture must carry the encoded data");
    assertEqual(pdfPageCount(pdf.bytes), 1, "the barcode PDF must have one page");
  });
}
