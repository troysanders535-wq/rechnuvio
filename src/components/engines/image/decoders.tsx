"use client";

/**
 * The workspaces that read a file format the browser cannot open itself.
 *
 * The Photoshop and the TIFF file are decoded here, in the browser. The HEIC
 * file cannot be decoded by the browsers this site runs in: the tool says so,
 * shows what the container holds and offers no file, because a notice is not
 * a photo. The Illustrator file is a PDF in disguise and is rendered with
 * PDF.js.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  DataList,
  DownloadButton,
  ErrorNote,
  Field,
  FilePicker,
  GhostButton,
  Note,
  Panel,
  Select,
  canvasToBlob,
  downloadBlob,
  fileToBytes,
  useImageT,
} from "./kit";
import { parseHeif, parsePsd, parseTiff, type DecodedPicture } from "./formats";
import { makeCanvas } from "./fx";
import { openPdf, closePdf } from "@/components/pdf/pdfjs";
import type { OutputFormat } from "./basic";
import { FORMAT_EXTENSIONS } from "./basic";

/** A canvas that holds a decoded picture. */
function pictureToCanvas(picture: DecodedPicture): HTMLCanvasElement {
  const canvas = makeCanvas(picture.width, picture.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const image = ctx.createImageData(picture.width, picture.height);
  image.data.set(picture.rgba);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/* --------------------------------------------------------------------- PSD -- */

export function PsdView({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useImageT();
  const [preview, setPreview] = useState<string | null>(null);
  const [picture, setPicture] = useState<DecodedPicture | null>(null);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = await fileToBytes(file);
        const decoded = parsePsd(bytes);
        setPicture(decoded);
        setPreview(pictureToCanvas(decoded).toDataURL("image/png"));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPreview(null);
        setPicture(null);
      }
    },
    [],
  );

  const handleDownload = async () => {
    if (!picture) return;
    const canvas = pictureToCanvas(picture);
    const ctx = canvas.getContext("2d");
    if (ctx && format === "image/jpeg") {
      const filled = makeCanvas(canvas.width, canvas.height);
      const fillCtx = filled.getContext("2d");
      if (fillCtx) {
        fillCtx.fillStyle = "#ffffff";
        fillCtx.fillRect(0, 0, filled.width, filled.height);
        fillCtx.drawImage(canvas, 0, 0);
        const blob = await canvasToBlob(filled, format, 0.92);
        downloadBlob(blob, `artwork.${FORMAT_EXTENSIONS[format]}`);
        return;
      }
    }
    const blob = await canvasToBlob(canvas, format, 0.92);
    downloadBlob(blob, `artwork.${FORMAT_EXTENSIONS[format]}`);
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      {!preview ? (
        <div className="space-y-3">
          <FilePicker
            accept=".psd,image/vnd.adobe.photoshop"
            label={t("choosePsd")}
            hint={t("psdHint")}
            onFile={handleFile}
          />
          <Note>{t("psdNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Field label={t("targetFormat")}>
              <Select
                value={format}
                onChange={(next) => setFormat(next as OutputFormat)}
                options={[
                  { value: "image/png", label: t("formatPng") },
                  { value: "image/jpeg", label: t("formatJpeg") },
                  { value: "image/webp", label: t("formatWebp") },
                ]}
                ariaLabel={t("targetFormat")}
              />
            </Field>
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setPreview(null)}>{t("newPicture")}</GhostButton>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={preview}
              alt={t("livePreview")}
              className="max-h-[360px] max-w-full rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700"
            />
            {picture ? (
              <p className="font-mono text-xs text-slate-500">
                {picture.width} × {picture.height} px
              </p>
            ) : null}
            <Note>{t("psdNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------- TIFF -- */

export function TiffView({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useImageT();
  const [preview, setPreview] = useState<string | null>(null);
  const [picture, setPicture] = useState<DecodedPicture | null>(null);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = await fileToBytes(file);
        const decoded = parseTiff(bytes);
        setPicture(decoded);
        setPreview(pictureToCanvas(decoded).toDataURL("image/png"));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPreview(null);
        setPicture(null);
      }
    },
    [],
  );

  const handleDownload = async () => {
    if (!picture) return;
    const canvas = pictureToCanvas(picture);
    const ctx = canvas.getContext("2d");
    if (ctx && format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(pictureToCanvas(picture), 0, 0);
    }
    const blob = await canvasToBlob(canvas, format, 0.92);
    downloadBlob(blob, `scan.${FORMAT_EXTENSIONS[format]}`);
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      {!preview ? (
        <div className="space-y-3">
          <FilePicker
            accept=".tif,.tiff,image/tiff"
            label={t("chooseTiff")}
            hint={t("tiffHint")}
            onFile={handleFile}
          />
          <Note>{t("tiffNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Field label={t("targetFormat")}>
              <Select
                value={format}
                onChange={(next) => setFormat(next as OutputFormat)}
                options={[
                  { value: "image/png", label: t("formatPng") },
                  { value: "image/jpeg", label: t("formatJpeg") },
                  { value: "image/webp", label: t("formatWebp") },
                ]}
                ariaLabel={t("targetFormat")}
              />
            </Field>
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setPreview(null)}>{t("newPicture")}</GhostButton>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={preview}
              alt={t("livePreview")}
              className="max-h-[360px] max-w-full rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700"
            />
            {picture ? (
              <p className="font-mono text-xs text-slate-500">
                {picture.width} × {picture.height} px
              </p>
            ) : null}
            <Note>{t("tiffNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------- HEIC -- */

export function HeicView() {
  const t = useImageT();
  const [preview, setPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [brand, setBrand] = useState("");
  const [compatible, setCompatible] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [decoded, setDecoded] = useState(false);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setDecoded(false);
      setPreview(null);
      try {
        const bytes = await fileToBytes(file);
        const info = parseHeif(bytes);
        setBrand(info.brand);
        setCompatible(info.compatibleBrands);
        setSize({ width: info.width || 0, height: info.height || 0 });
        setLoaded(true);

        // The browser may still be able to show the picture.
        const url = URL.createObjectURL(file);
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("heic"));
            img.src = url;
          });
          const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            setPreview(canvas.toDataURL("image/png"));
            setDecoded(true);
          }
        } catch {
          /*
           * The browser cannot decode HEIC. There is no picture to export
           * then, and a notice is not a photo: the tool says so instead of
           * handing out a file that only shows the message.
           */
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (err) {
        setLoaded(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const reset = () => {
    setLoaded(false);
    setPreview(null);
    setDecoded(false);
    setBrand("");
    setCompatible([]);
    setSize({ width: 0, height: 0 });
    setError(null);
  };

  const handleDownload = async () => {
    if (!decoded || !preview) return;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("preview"));
      img.src = preview;
    });
    const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, format, 1);
    downloadBlob(blob, `heic-photo.${FORMAT_EXTENSIONS[format]}`);
  };

  return (
    <Panel title={t("heicTitle")} subtitle={t("heicSubtitle")}>
      {!loaded ? (
        <div className="space-y-3">
          <FilePicker
            accept=".heic,.heif,image/heic,image/heif"
            label={t("chooseHeic")}
            hint={t("heicHint")}
            onFile={handleFile}
          />
          <Note>{t("heicNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            {decoded ? (
              <Field label={t("targetFormat")}>
                <Select
                  value={format}
                  onChange={(next) => setFormat(next as OutputFormat)}
                  options={[
                    { value: "image/jpeg", label: t("formatJpeg") },
                    { value: "image/png", label: t("formatPng") },
                    { value: "image/webp", label: t("formatWebp") },
                  ]}
                  ariaLabel={t("targetFormat")}
                />
              </Field>
            ) : null}
            <DataList
              items={[
                { label: t("heicBrand"), value: brand || "—" },
                {
                  label: t("heicCompatible"),
                  value: compatible.join(", ") || "—",
                },
                {
                  label: t("heicSize"),
                  value: size.width ? `${size.width} × ${size.height} px` : "—",
                },
              ]}
            />
            {decoded ? (
              <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            ) : null}
            <GhostButton onClick={reset}>{t("newPicture")}</GhostButton>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            {preview ? (
              <img
                src={preview}
                alt={t("livePreview")}
                className="max-h-[360px] max-w-full rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700"
              />
            ) : null}
            {decoded ? (
              <Note tone="ok">{t("heicDecoded")}</Note>
            ) : (
              <Note tone="warn">{t("heicCannotDecode")}</Note>
            )}
            {decoded ? null : <Note>{t("heicConvertFirst")}</Note>}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------------- AI -- */

export function AiView() {
  const t = useImageT();
  const [preview, setPreview] = useState<string | null>(null);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = await fileToBytes(file);
        const open = await openPdf(bytes);
        try {
          const page = await open.doc.getPage(1);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = makeCanvas(
            Math.ceil(viewport.width),
            Math.ceil(viewport.height),
          );
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error(t("noCanvas"));
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          setPreview(canvas.toDataURL("image/png"));
          setPages(open.doc.numPages);
        } finally {
          await closePdf(open);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPreview(null);
      }
    },
    [t],
  );

  const handleDownload = async () => {
    if (!preview) return;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("preview"));
      img.src = preview;
    });
    const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, format, 0.92);
    downloadBlob(blob, `artwork.${FORMAT_EXTENSIONS[format]}`);
  };

  return (
    <Panel title={t("aiTitle")} subtitle={t("aiSubtitle")}>
      {!preview ? (
        <div className="space-y-3">
          <FilePicker
            accept=".ai,application/illustrator,application/pdf"
            label={t("chooseAi")}
            hint={t("aiHint")}
            onFile={handleFile}
          />
          <Note>{t("aiNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Field label={t("targetFormat")}>
              <Select
                value={format}
                onChange={(next) => setFormat(next as OutputFormat)}
                options={[
                  { value: "image/png", label: t("formatPng") },
                  { value: "image/jpeg", label: t("formatJpeg") },
                  { value: "image/webp", label: t("formatWebp") },
                ]}
                ariaLabel={t("targetFormat")}
              />
            </Field>
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setPreview(null)}>{t("newPicture")}</GhostButton>
            {pages ? (
              <p className="text-xs text-slate-500">
                {t("aiPages", { count: String(pages) })}
              </p>
            ) : null}
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={preview}
              alt={t("livePreview")}
              className="max-h-[360px] max-w-full rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700"
            />
            <Note>{t("aiNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}
