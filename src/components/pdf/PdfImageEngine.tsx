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
  formatBytes,
  inputClass,
  selectClass,
} from "./shared";
import { createPdfDoc, imageSize, imageToEmbeddable } from "./pdfLib";
import { closePdf, openPdf } from "./pdfjs";
import { useTranslations } from "next-intl";

/* ------------------------------------------------------------------ */
/* Images -> PDF                                                       */
/* ------------------------------------------------------------------ */

type PageFit = "fit" | "a4" | "letter";

const PAGE_SIZES: Record<Exclude<PageFit, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export function PdfImageToPdfEngine() {
  const tUi = useTranslations("ui.pdf.PdfImageEngine");
  const [files, setFiles] = useState<File[]>([]);
  const [fit, setFit] = useState<PageFit>("fit");
  const [margin, setMargin] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleConvert() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const doc = await createPdfDoc();

      for (const file of files) {
        const { bytes, type } = await imageToEmbeddable(file);
        const image = type === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const { width, height } = await imageSize(file);

        let pageWidth: number;
        let pageHeight: number;
        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (fit === "fit") {
          // Page matches the image aspect ratio at 72 DPI.
          pageWidth = width;
          pageHeight = height;
          drawWidth = width;
          drawHeight = height;
          drawX = 0;
          drawY = 0;
        } else {
          const [pw, ph] = PAGE_SIZES[fit];
          pageWidth = pw;
          pageHeight = ph;
          const usableW = pw - margin * 2;
          const usableH = ph - margin * 2;
          const ratio = Math.min(usableW / width, usableH / height);
          drawWidth = width * ratio;
          drawHeight = height * ratio;
          drawX = (pw - drawWidth) / 2;
          drawY = (ph - drawHeight) / 2;
        }

        const page = doc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
      }

      const bytes = await doc.save();
      downloadBytes(bytes, "images.pdf");
      setInfo(tUi("createdAPdfWithPages", { count: files.length }));
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotBuildThePDF"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title={tUi("imageToPDFConverter")}
      description={tUi("turnJPGPNGWebPOrGIFImagesIntoASinglePDFDocument")}
    >
      <DropZone
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
        multiple
        label={tUi("chooseImages")}
        hint={tUi("oneImagePerPageInTheOrderYouAddThem")}
        onFiles={(list) => {
          setFiles((prev) => [...prev, ...list]);
          setError(null);
        }}
        disabled={busy}
      />

      {files.length ? (
        <>
          <ul className="mt-4 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  <span className="mr-2 text-slate-400 dark:text-slate-500">{i + 1}.</span>
                  {file.name}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    {tUi("remove")}
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={tUi("pageSize")}>
              <select
                value={fit}
                onChange={(e) => setFit(e.target.value as PageFit)}
                className={selectClass}
              >
                <option value="fit">{tUi("matchImageSize")}</option>
                <option value="a4">{tUi("a4210297Mm")}</option>
                <option value="letter">{tUi("uSLetter8511In")}</option>
              </select>
            </Field>
            {fit !== "fit" ? (
              <Field label={tUi("marginPt")}>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={margin}
                  onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
                  className={inputClass}
                />
              </Field>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <ActionButton onClick={handleConvert} busy={busy}>
              {tUi("createPdfWithPages", { count: files.length })}
            </ActionButton>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {tUi("clear")}
            </button>
          </div>
        </>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}

/* ------------------------------------------------------------------ */
/* PDF -> Images                                                       */
/* ------------------------------------------------------------------ */

type ImageFormat = "png" | "jpeg";

export function PdfToImageEngine() {
  const tUi = useTranslations("ui.pdf.PdfImageEngine");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.92);
  const [pages, setPages] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleConvert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setPreview(null);

    try {
      const open = await openPdf(new Uint8Array(await file.arrayBuffer()));
      const doc = open.doc;
      const total = doc.numPages;

      let indices: number[];
      if (pages.trim()) {
        const { parsePageRanges } = await import("./shared");
        const parsed = parsePageRanges(pages, total);
        if (!parsed) throw new Error(tUi("invalidPageRange", { count: total }));
        indices = parsed;
      } else {
        indices = Array.from({ length: total }, (_, i) => i);
      }

      const stem = baseName(file.name);
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const ext = format === "png" ? "png" : "jpg";
      const outputs: { name: string; blob: Blob }[] = [];

      for (const idx of indices) {
        const page = await doc.getPage(idx + 1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error(tUi("couldNotCreateARenderingCanvas"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mime, format === "jpeg" ? quality : undefined),
        );
        if (!blob) throw new Error(tUi("couldNotEncodeThePage", { page: idx + 1 }));

        const name = `${stem}-page-${String(idx + 1).padStart(3, "0")}.${ext}`;
        outputs.push({ name, blob });

        if (idx === indices[0]) setPreview(URL.createObjectURL(blob));
      }

      await closePdf(open);

      if (outputs.length === 1) {
        downloadBlob(outputs[0].blob, outputs[0].name);
      } else {
        const zip = new JSZip();
        outputs.forEach((o) => zip.file(o.name, o.blob));
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `${stem}-images.zip`);
      }

      setInfo(
        outputs.length === 1
          ? tUi("exportedPage", { page: indices[0] + 1 })
          : tUi("exportedPageImages", { count: outputs.length }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotExportTheImages"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title={tUi("pDFToImageConverter")}
      description={tUi("renderEveryPageOfAPDFToAHighResolutionPNGOrJPG")}
    >
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? tUi("replacePDF") : tUi("chooseAPDF")}
        hint={tUi("onePdfFileRenderingHappensLocallyInYourBrowser")}
        onFiles={(list) => {
          setFile(list[0] ?? null);
          setError(null);
          setInfo(null);
          setPreview(null);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={tUi("format")}>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className={selectClass}
              >
                <option value="png">{tUi("pNGLossless")}</option>
                <option value="jpeg">{tUi("jPGSmaller")}</option>
              </select>
            </Field>
            <Field label={tUi("resolution")} hint={`${Math.round(scale * 72)} DPI`}>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </Field>
            {format === "jpeg" ? (
              <Field label={tUi("jPGQuality")}>
                <input
                  type="range"
                  min={0.4}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </Field>
            ) : null}
          </div>

          <Field label={tUi("pages")} hint={tUi("pageRangeHint", { range: "1-3, 5" })}>
            <input
              type="text"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder={tUi("allPages")}
              className={inputClass}
            />
          </Field>

          <div className="flex items-center gap-3">
            <ActionButton onClick={handleConvert} busy={busy}>
              {tUi("exportImages")}
            </ActionButton>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {tUi("clear")}
            </button>
          </div>

          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={tUi("firstExportedPagePreview")}
              className="mt-4 max-h-96 w-auto rounded-lg border border-slate-200 dark:border-slate-700"
            />
          ) : null}
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
