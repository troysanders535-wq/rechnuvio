/**
 * Functional specs for the 14 tools of the markdown-docs engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real textarea,
 * presses the real button, opens the real file picker and reads the real
 * rendered result. The expected values come from CommonMark - a heading is
 * rendered as <h1>, emphasis as <strong> / <em>, a link as <a> - and from the
 * file formats themselves (a PDF starts with "%PDF-", a .docx is a zip that
 * holds word/document.xml).
 *
 * Where a tool cannot do what its name promises - the shared workspace is a
 * markdown editor with a live preview, it never converts HTML into markdown -
 * the spec asserts the promised behaviour anyway, so the defect shows up in
 * the audit evidence instead of being hidden.
 */

import assert from "node:assert";
import zlib from "node:zlib";

import {
  spec,
  fillArea,
  clickButton,
  workspaceText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The rendered preview of the workspace. */
async function preview(page) {
  return page.evaluate(() => {
    const el = document.querySelector("main div.prose");
    if (!el) return null;
    return {
      html: el.innerHTML,
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      h1: Array.from(el.querySelectorAll("h1")).map((n) => n.textContent.trim()),
      strong: Array.from(el.querySelectorAll("strong")).map((n) => n.textContent.trim()),
      em: Array.from(el.querySelectorAll("em")).map((n) => n.textContent.trim()),
      links: Array.from(el.querySelectorAll("a")).map((n) => ({
        href: n.getAttribute("href"),
        text: (n.textContent || "").trim(),
      })),
      items: Array.from(el.querySelectorAll("li")).map((n) => n.textContent.trim()),
    };
  });
}

/** Every label and caption of the engine panel. */
async function panelLabels(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const parts = [];
    root
      .querySelectorAll("button, label, span, div, p, h3")
      .forEach((el) => {
        const s = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (s && s.length < 80) parts.push(s);
      });
    root
      .querySelectorAll("input, textarea, select")
      .forEach((el) =>
        parts.push(el.getAttribute("placeholder") || el.getAttribute("aria-label") || ""),
      );
    return parts;
  });
}

/** The editable panes of the workspace with their caption. */
async function inputPanes(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("textarea, input[type=text]")).map((el) => {
      const pane = el.parentElement;
      const caption =
        pane && pane.previousElementSibling
          ? (pane.previousElementSibling.textContent || "").replace(/\s+/g, " ").trim()
          : "";
      return {
        tag: el.tagName.toLowerCase(),
        caption,
        placeholder: el.getAttribute("placeholder") || "",
        aria: el.getAttribute("aria-label") || "",
      };
    });
  });
}

/** The pane whose caption or placeholder matches the keyword. */
async function paneByName(page, keyword) {
  const panes = await inputPanes(page);
  return panes.find((p) =>
    `${p.caption} ${p.placeholder} ${p.aria}`.toLowerCase().includes(keyword.toLowerCase()),
  );
}

/** Put a text file into the file input of the workspace. */
async function uploadText(page, name, type, text) {
  await page.evaluate(
    ({ name, type, text }) => {
      const file = new File([text], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, text },
  );
}

/** Press a download button and return the bytes the browser received. */
async function downloadBytes(page, buttonLabel, timeout = 20000) {
  const pending = page.waitForEvent("download", { timeout });
  await clickButton(page, buttonLabel);
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { bytes: Buffer.concat(chunks), name: download.suggestedFilename() };
}

/**
 * The word/document.xml of a .docx package.
 *
 * A .docx is a zip archive; the member "word/document.xml" holds the body of
 * the document. The archive is read in memory, nothing is written to disk.
 */
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
  const xml = method === 0 ? raw : zlib.inflateRawSync(raw);
  return xml.toString("utf8");
}

/* --------------------------------------------------------------- samples -- */

const MD_SAMPLE = [
  "# Heading One",
  "",
  "Some **bold** and *italic* text with a [link](https://example.com).",
  "",
  "- first",
  "- second",
].join("\n");

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("markdown-editor", "edits markdown and renders the preview", async (page) => {
    await fillArea(page, MD_SAMPLE, 0);
    await sleep(500);
    const view = await preview(page);
    assert(view, "the workspace must render a preview");
    assertEqual(view.h1[0], "Heading One", "an ATX heading is rendered as a first level heading");
    assert(view.strong.includes("bold"), "a strong emphasis is rendered as <strong>");
    assert(view.em.includes("italic"), "an emphasis is rendered as <em>");
    assert(
      view.links.some((l) => l.href === "https://example.com" && l.text === "link"),
      "an inline link is rendered as an anchor with its target",
    );
    assert(view.items.includes("first"), "a bullet list is rendered as list items");
  });

  spec("online-markdown-editor", "keeps the typed markdown in the editor", async (page) => {
    const text = "# Online\n\nEdit me.";
    await fillArea(page, text, 0);
    await sleep(500);
    assertEqual(
      await page.locator("main textarea").first().inputValue(),
      text,
      "the editor must hold exactly the markdown that was typed",
    );
    const view = await preview(page);
    assertEqual(view.h1[0], "Online", "the preview must follow the editor");
  });

  spec("markdown-preview", "renders the markdown as HTML", async (page) => {
    await fillArea(page, MD_SAMPLE, 0);
    await sleep(500);
    const view = await preview(page);
    assert(view, "the workspace must render a preview");
    assert(view.html.includes("<h1"), "the preview must contain the rendered heading");
    assert(view.html.includes("<strong>bold</strong>"), "the preview must contain the rendered strong text");
    assert(view.html.includes("<li>first</li>"), "the preview must contain the rendered list items");
  });

  spec("markdown-viewer", "shows the rendered document", async (page) => {
    await fillArea(page, "# Viewer\n\nRendered body.", 0);
    await sleep(500);
    const view = await preview(page);
    assertEqual(view.h1[0], "Viewer", "the viewer must render the heading");
    assert(view.text.includes("Rendered body."), "the viewer must render the body text");
  });

  spec("markdown-wysiwyg-editor", "lets the user format the rendered text", async (page) => {
    await fillArea(page, MD_SAMPLE, 0);
    await sleep(500);
    const editor = await page.evaluate(() => {
      const prose = document.querySelector("main div.prose");
      return {
        editable: prose ? prose.getAttribute("contenteditable") : null,
        bold: Boolean(
          document.querySelector(
            'main button[title*="bold" i], main button[aria-label*="bold" i]',
          ),
        ),
      };
    });
    assert(
      editor.editable === "true" || editor.bold,
      "a WYSIWYG editor must let the user format the rendered text directly",
    );
  });

  spec("markdown-file-viewer", "opens a markdown file and renders it", async (page) => {
    await uploadText(page, "notes.md", "text/markdown", MD_SAMPLE);
    await sleep(700);
    assertEqual(
      await page.locator("main textarea").first().inputValue(),
      MD_SAMPLE,
      "the opened file must be loaded into the source pane",
    );
    const view = await preview(page);
    assertEqual(view.h1[0], "Heading One", "the opened file must be rendered");
  });

  spec("html-to-markdown", "converts HTML into markdown", async (page) => {
    // The panes are addressed by their own label, not by their position: the
    // workspace carries a read-only output box next to the input, and a
    // positional index would address the wrong one.
    const input = page.locator('main textarea[aria-label="HTML input"]');
    assert(
      (await input.count()) === 1,
      "an HTML to markdown tool must offer exactly one pane that takes HTML, the workspace only offers a markdown source pane",
    );
    const output = page.locator('main textarea[aria-label="Markdown output"]');
    assert(
      (await output.count()) === 1,
      "an HTML to markdown tool must offer exactly one pane that shows the markdown",
    );

    await input.fill("<h1>Title</h1>\n<p>Some <strong>bold</strong> text</p>");
    await sleep(600);
    const out = await output.inputValue();
    assertIncludes(out, "# Title", "an HTML heading must become a markdown heading");
    assertIncludes(out, "**bold**", "an HTML strong element must become markdown emphasis");
  });

  spec("html-table-to-markdown", "converts an HTML table into a markdown table", async (page) => {
    const input = page.locator('main textarea[aria-label="HTML input"]');
    assert(
      (await input.count()) === 1,
      "an HTML table to markdown tool must offer exactly one pane that takes HTML, the workspace only offers a markdown source pane",
    );
    const output = page.locator('main textarea[aria-label="Markdown output"]');
    assert(
      (await output.count()) === 1,
      "an HTML table to markdown tool must offer exactly one pane that shows the markdown",
    );

    await input.fill("<table><tr><th>Name</th></tr><tr><td>Ann</td></tr></table>");
    await sleep(600);
    const out = await output.inputValue();
    assert(
      out.split("\n").some((line) => line.trim().startsWith("|")),
      `an HTML table must become a markdown table, got ${JSON.stringify(out)}`,
    );
    assertIncludes(out, "Ann", "the cell content must be kept");
  });

  spec("markdown-to-pdf", "exports the document as a PDF", async (page) => {
    await fillArea(page, MD_SAMPLE, 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to PDF");
    assert(name.endsWith(".pdf"), `the download must be a PDF, got ${name}`);
    assertEqual(
      bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must start with the PDF signature",
    );
    assert(bytes.length > 400, `the PDF must carry the document, it is only ${bytes.length} bytes`);
    const content = bytes.toString("latin1");
    assertIncludes(content, "Heading One", "the PDF must carry the text of the document");
    assertNotIncludes(
      content,
      "# Heading One",
      "the PDF must carry the rendered document, not the markdown source",
    );
  });

  spec("md-to-pdf", "exports the document as a PDF", async (page) => {
    await fillArea(page, "# Md To Pdf\n\nBody text.", 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to PDF");
    assert(name.endsWith(".pdf"), `the download must be a PDF, got ${name}`);
    assertEqual(
      bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must start with the PDF signature",
    );
    assertIncludes(bytes.toString("latin1"), "Md To Pdf", "the PDF must carry the text of the document");
  });

  spec("markdown-to-pdf-converter", "exports the document as a PDF", async (page) => {
    await fillArea(page, "# Converter\n\nBody text.", 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to PDF");
    assert(name.endsWith(".pdf"), `the download must be a PDF, got ${name}`);
    assertEqual(
      bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must start with the PDF signature",
    );
    assertIncludes(
      bytes.toString("latin1"),
      "Converter",
      "the PDF must carry the text of the document",
    );
  });

  spec("markdown-to-docx", "exports the document as a Word file", async (page) => {
    await fillArea(page, MD_SAMPLE, 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to Word (.docx)");
    assert(name.endsWith(".docx"), `the download must be a Word document, got ${name}`);
    assertEqual(
      bytes.subarray(0, 2).toString("latin1"),
      "PK",
      "a .docx is a zip archive and must start with the zip signature",
    );
    const xml = docxDocumentXml(bytes);
    assert(xml, "the Word document must hold a word/document.xml part");
    assertIncludes(xml, "Heading One", "the Word document must carry the text of the document");
    assertIncludes(xml, "Heading1", "a markdown heading must become a Word heading");
  });

  spec("md-to-docx", "exports the document as a Word file", async (page) => {
    await fillArea(page, "# Md To Docx\n\nBody text.", 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to Word (.docx)");
    assert(name.endsWith(".docx"), `the download must be a Word document, got ${name}`);
    const xml = docxDocumentXml(bytes);
    assert(xml, "the Word document must hold a word/document.xml part");
    assertIncludes(xml, "Md To Docx", "the Word document must carry the text of the document");
  });

  spec("markdown-to-word", "exports the document as a Word file", async (page) => {
    await fillArea(page, "# Markdown To Word\n\nBody text.", 0);
    await sleep(400);
    const { bytes, name } = await downloadBytes(page, "Export to Word (.docx)");
    assert(name.endsWith(".docx"), `the download must be a Word document, got ${name}`);
    const xml = docxDocumentXml(bytes);
    assert(xml, "the Word document must hold a word/document.xml part");
    assertIncludes(xml, "Markdown To Word", "the Word document must carry the text of the document");
  });
}
