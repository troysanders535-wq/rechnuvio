"use client";

import { useState } from "react";
import {
  ActionButton,
  Field,
  Status,
  Workspace,
  downloadBlob,
} from "./shared";
import {
  MARGIN,
  PAGE_H,
  PAGE_W,
  createDoc,
  drawBullet,
  drawHeading,
  drawParagraph,
  drawRule,
  wrap,
} from "./jsPdfKit";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "ordered"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "rule" };

/** Parses the common subset of Markdown that a text-to-PDF tool can honour. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushCode = () => {
    if (code.length) {
      blocks.push({ type: "code", text: code.join("\n") });
      code = [];
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) flushCode();
      else flushParagraph();
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "rule" });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({ type: "bullet", text: bullet[1].trim() });
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      blocks.push({ type: "ordered", text: ordered[1].trim() });
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ type: "quote", text: quote[1].trim() });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushCode();
  flushParagraph();
  return blocks;
}

export function PdfTextToPdfEngine() {
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleConvert() {
    if (!source.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const blocks = parseMarkdown(source);
      const doc = createDoc(title.trim() || "Document");
      let y = MARGIN + 6;

      if (title.trim()) {
        y = drawHeading(doc, title.trim(), 1, y);
        y = drawRule(doc, y);
      }

      let orderedIndex = 0;
      for (const block of blocks) {
        switch (block.type) {
          case "heading":
            y = drawHeading(doc, block.text, block.level, y);
            break;
          case "paragraph":
            y = drawParagraph(doc, block.text, y);
            break;
          case "bullet":
            y = drawBullet(doc, `•  ${block.text}`, y);
            break;
          case "ordered":
            orderedIndex += 1;
            y = drawBullet(doc, `${orderedIndex}.  ${block.text}`, y);
            break;
          case "quote":
            doc.setFont("helvetica", "italic");
            y = drawParagraph(doc, block.text, y);
            doc.setFont("helvetica", "normal");
            break;
          case "code":
            doc.setFont("courier", "normal");
            doc.setFontSize(9.5);
            for (const codeLine of block.text.split("\n")) {
              const lines = wrap(doc, codeLine || " ", PAGE_W - MARGIN * 2 - 12);
              for (const l of lines) {
                if (y > PAGE_H - MARGIN) {
                  doc.addPage();
                  y = MARGIN;
                }
                doc.text(l, MARGIN + 8, y);
                y += 12;
              }
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            y += 6;
            break;
          case "rule":
            y = drawRule(doc, y);
            break;
        }
      }

      const blob = doc.output("blob");
      const name = (title.trim() || "document")
        .replace(/[^\w\-. ]+/g, "")
        .trim()
        .replace(/\s+/g, "-");
      downloadBlob(blob, `${name || "document"}.pdf`);
      setInfo(`Created a PDF with ${blocks.length} block(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title="Markdown to PDF"
      description="Turn Markdown or plain text into a clean, printable PDF. Headings, lists, quotes and code blocks are preserved."
    >
      <Field label="Document title" hint="Optional — shown as the top-level heading.">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My document"
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </Field>

      <div className="mt-4">
        <Field label="Content" hint="Markdown is supported: # headings, - bullets, > quotes and ``` code blocks.">
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="# Report&#10;&#10;Write or paste your content here."
            spellCheck={false}
            className="mt-1.5 min-h-64 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </Field>
      </div>

      <div className="mt-5">
        <ActionButton onClick={handleConvert} busy={busy} disabled={!source.trim()}>
          Generate PDF
        </ActionButton>
      </div>

      <Status error={error} info={info} />
    </Workspace>
  );
}
