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
import { useTranslations } from "next-intl";

type Mode = "extract" | "each" | "chunks";

export function PdfSplitEngine() {
  const tUi = useTranslations("ui.pdf.PdfSplitEngine");
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
          throw new Error(tUi("invalidPageRange", { count: pageCount }));
        }
        const out = await createPdfDoc();
        const pages = await out.copyPages(doc, indices);
        pages.forEach((page) => out.addPage(page));
        const bytes = await out.save();
        downloadBytes(bytes, `${stem}-pages.pdf`);
        setInfo(
          tUi("extractedPagesIntoFile", {
            count: indices.length,
            file: `${stem}-pages.pdf`,
          }),
        );
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
      setInfo(tUi("splitIntoFilesAsZip", { count }));
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError(tUi("thisPDFIsPasswordProtectedEnterThePasswordAndTryAgain"));
      } else {
        setError(err instanceof Error ? err.message : tUi("couldNotSplitTheFile"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title={tUi("splitPDF")}
      description={tUi("extractAPageRangeSplitIntoSinglePagesOrCutIntoFixedSizeChunks")}
    >
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? tUi("replacePDF") : tUi("chooseAPDF")}
        hint={tUi("onePdfFileEverythingRunsInYourBrowser")}
        onFiles={(list) => {
          setFile(list[0] ?? null);
          setError(null);
          setInfo(null);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <Field label={tUi("mode")}>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className={selectClass}
            >
              <option value="extract">{tUi("extractSelectedPagesIntoOnePDF")}</option>
              <option value="each">{tUi("splitIntoSinglePages")}</option>
              <option value="chunks">{tUi("splitIntoFixedSizeChunks")}</option>
            </select>
          </Field>

          {mode === "extract" ? (
            <Field
              label={tUi("pageRange")}
              hint={tUi("use1BasedPageNumbersEG135810")}
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
            <Field label={tUi("pagesPerFile")}>
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
            <Field label={tUi("pDFPassword")}>
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
              {mode === "extract" ? tUi("extractPages") : tUi("splitPDF")}
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
              {tUi("clear")}
            </button>
          </div>
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
