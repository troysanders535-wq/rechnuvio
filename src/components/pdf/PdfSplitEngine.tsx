"use client";

import { useState } from "react";
import JSZip from "jszip";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  baseName,
  downloadBlob,
  downloadBytes,
  inputClass,
  parsePageRanges,
  selectClass,
} from "./shared";
import { PasswordRequiredError, createPdfDoc, loadPdfDoc } from "./pdfLib";

type Mode = "extract" | "each" | "chunks";

export function PdfSplitEngine() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("extract");
  const [ranges, setRanges] = useState("");
  const [chunkSize, setChunkSize] = useState(1);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSplit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const doc = await loadPdfDoc(await file.arrayBuffer(), password || undefined);
      const pageCount = doc.getPageCount();
      const stem = baseName(file.name);

      if (mode === "extract") {
        const indices = parsePageRanges(ranges, pageCount);
        if (!indices) {
          throw new Error(
            `Enter a valid page range such as "1-3, 5, 8-10" (document has ${pageCount} pages).`,
          );
        }
        const out = await createPdfDoc();
        const pages = await out.copyPages(doc, indices);
        pages.forEach((page) => out.addPage(page));
        const bytes = await out.save();
        downloadBytes(bytes, `${stem}-pages.pdf`);
        setInfo(`Extracted ${indices.length} page(s) into ${stem}-pages.pdf.`);
        return;
      }

      const size = Math.max(1, Math.min(chunkSize, pageCount));
      const zip = new JSZip();
      let count = 0;

      for (let start = 0; start < pageCount; start += size) {
        const end = Math.min(start + size, pageCount);
        const out = await createPdfDoc();
        const indices: number[] = [];
        for (let p = start; p < end; p += 1) indices.push(p);
        const pages = await out.copyPages(doc, indices);
        pages.forEach((page) => out.addPage(page));
        const bytes = await out.save();
        zip.file(`${stem}-part-${String(count + 1).padStart(2, "0")}.pdf`, bytes);
        count += 1;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${stem}-split.zip`);
      setInfo(`Split into ${count} file(s), packaged as a ZIP.`);
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError("This PDF is password protected. Enter the password and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not split the file.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title="Split PDF"
      description="Extract a page range, split into single pages, or cut into fixed-size chunks."
    >
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? "Replace PDF" : "Choose a PDF"}
        hint="One .pdf file. Everything runs in your browser."
        onFiles={(list) => {
          setFile(list[0] ?? null);
          setError(null);
          setInfo(null);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <Field label="Mode">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className={selectClass}
            >
              <option value="extract">Extract selected pages into one PDF</option>
              <option value="each">Split into single pages</option>
              <option value="chunks">Split into fixed-size chunks</option>
            </select>
          </Field>

          {mode === "extract" ? (
            <Field
              label="Page range"
              hint="Use 1-based page numbers, e.g. 1-3, 5, 8-10"
            >
              <input
                type="text"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5, 8-10"
                className={inputClass}
              />
            </Field>
          ) : null}

          {mode === "chunks" ? (
            <Field label="Pages per file">
              <input
                type="number"
                min={1}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </Field>
          ) : null}

          {showPassword ? (
            <Field label="PDF password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : null}

          <div className="flex items-center gap-3">
            <ActionButton onClick={handleSplit} busy={busy}>
              {mode === "extract" ? "Extract pages" : "Split PDF"}
            </ActionButton>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError(null);
                setInfo(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
