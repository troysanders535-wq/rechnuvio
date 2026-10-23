"use client";

import { useState } from "react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  baseName,
  downloadBlob,
  downloadBytes,
  textareaClass,
} from "./shared";
import { blocksToMarkdown, extractBlocks, type PdfBlock } from "./pdfText";
import { closePdf, openPdf } from "./pdfjs";

export type PdfTextMode = "markdown" | "docx";

type OcrResult = { page: number; text: string };

export function PdfTextEngine({ mode }: { mode: PdfTextMode }) {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [blocks, setBlocks] = useState<PdfBlock[]>([]);
  const [useOcr, setUseOcr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy =
    mode === "markdown"
      ? {
          title: "PDF to Markdown Converter",
          description:
            "Turn the text layer of a PDF into clean, structured Markdown you can paste into any editor or AI assistant.",
          action: "Convert to Markdown",
        }
      : {
          title: "PDF to DOCX Converter",
          description:
            "Rebuild a PDF as an editable Word document with headings, lists and paragraphs preserved.",
          action: "Convert to DOCX",
        };

  async function runOcr(
    open: Awaited<ReturnType<typeof openPdf>>,
    pageNumbers: number[],
  ): Promise<OcrResult[]> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const results: OcrResult[] = [];

    try {
      for (const pageNumber of pageNumbers) {
        setStatus(`Running OCR on page ${pageNumber}…`);
        const page = await open.doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const recognised = await worker.recognize(canvas);
        const text = recognised.data?.text?.trim() ?? "";
        if (text) results.push({ page: pageNumber, text });
      }
    } finally {
      await worker.terminate();
    }

    return results;
  }

  async function handleConvert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus("Reading the PDF…");

    let open: Awaited<ReturnType<typeof openPdf>> | null = null;
    try {
      open = await openPdf(new Uint8Array(await file.arrayBuffer()));
      const { blocks: extracted, emptyPages } = await extractBlocks(open);

      let finalBlocks = extracted;
      let ocrNote = "";

      if (useOcr && emptyPages.length) {
        setStatus(`OCR on ${emptyPages.length} scanned page(s)…`);
        const ocrResults = await runOcr(open, emptyPages);
        if (ocrResults.length) {
          const extra: PdfBlock[] = ocrResults.map((r) => ({
            type: "paragraph",
            text: r.text,
          }));
          finalBlocks = [...extracted, ...extra];
          ocrNote = ` ${ocrResults.length} scanned page(s) were read with OCR.`;
        } else {
          ocrNote = " OCR did not find readable text on the scanned pages.";
        }
      } else if (useOcr) {
        ocrNote = " Every page already had a text layer, so OCR was not needed.";
      }

      setBlocks(finalBlocks);

      if (mode === "markdown") {
        const md = blocksToMarkdown(finalBlocks);
        setMarkdown(md);
        setStatus(
          `Converted ${finalBlocks.length} block(s).${ocrNote}`,
        );
      } else {
        setStatus(`Building the Word document…${ocrNote}`);
        const doc = buildDocx(finalBlocks);
        const blob = await Packer.toBlob(doc);
        downloadBlob(blob, `${baseName(file.name)}.docx`);
        setStatus(`Downloaded ${baseName(file.name)}.docx.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not convert the file.");
      setStatus(null);
    } finally {
      if (open) await closePdf(open);
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Your browser blocked clipboard access. Select the text and copy it manually.");
    }
  }

  function handleDownloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `${baseName(file?.name ?? "document")}.md`);
  }

  return (
    <Workspace title={copy.title} description={copy.description}>
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? "Replace PDF" : "Choose a PDF"}
        hint="One .pdf file. Everything runs in your browser."
        onFiles={(list) => {
          setFile(list[0] ?? null);
          setMarkdown("");
          setBlocks([]);
          setError(null);
          setStatus(null);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <label className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={useOcr}
              onChange={(e) => setUseOcr(e.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span>
              Use OCR for scanned pages
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                Pages without a text layer are rendered and read with Tesseract.js.
                The first run downloads the English language data.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton onClick={handleConvert} busy={busy}>
              {copy.action}
            </ActionButton>
            {mode === "markdown" && markdown ? (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {copied ? "Copied!" : "Copy Markdown"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Download .md
                </button>
              </>
            ) : null}
          </div>

          {status ? (
            <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
              {status}
            </p>
          ) : null}

          {mode === "markdown" && markdown ? (
            <>
              <Field label="Markdown output">
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  readOnly={false}
                  spellCheck={false}
                  className={textareaClass}
                />
              </Field>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {blocks.length} block(s) extracted. Edit the output before copying
                if you like.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <Status error={error} />
    </Workspace>
  );
}

/** Maps the extracted blocks onto Word paragraphs. */
function buildDocx(blocks: PdfBlock[]): Document {
  const children: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          text: block.text,
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
        }),
      );
    } else if (block.type === "paragraph") {
      children.push(new Paragraph({ text: block.text }));
    } else if (block.type === "list") {
      for (const item of block.items) {
        children.push(
          new Paragraph({
            text: item,
            bullet: block.ordered ? undefined : { level: 0 },
          }),
        );
      }
    } else {
      for (const line of block.text.split("\n")) {
        if (!line.trim()) continue;
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: line, font: "Courier New", size: 18 }),
            ],
          }),
        );
      }
    }
  }

  return new Document({
    sections: [{ properties: {}, children: children.length ? children : [new Paragraph("")] }],
  });
}
