"use client";

/**
 * The workspaces of the tools that work on one picture.
 *
 * Every tool configures the workbench for its own purpose: the converter
 * tools offer the target format, the resizers offer the size, the blur tool
 * offers the filters and the background tools offer the tolerance.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SizeBadge,
  canvasToBlob,
  downloadBlob,
  fileToBytes,
  fileToDataUrl,
  loadImage,
  useImageT,
} from "./kit";
import { parseExif, parsePngText, type MetadataEntry } from "./formats";
import { removeBackground } from "./fx";

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface BasicImageViewProps {
  title: string;
  subtitle?: string;
  accept?: string;
  /** The formats the tool writes. */
  formats?: OutputFormat[];
  defaultFormat?: OutputFormat;
  /** The tool offers a width and a height. */
  dimensions?: boolean;
  /** The tool offers the brightness, blur and grayscale filters. */
  filters?: boolean;
  /** The tool removes the background colour of the picture. */
  background?: boolean;
  /** The tool reads the metadata of the picture. */
  metadata?: boolean;
  note?: string;
}

export function BasicImageView({
  title,
  subtitle,
  accept = "image/*",
  formats = ["image/png", "image/jpeg", "image/webp"],
  defaultFormat = "image/png",
  dimensions = false,
  filters = false,
  background = false,
  metadata = false,
  note,
}: BasicImageViewProps) {
  const t = useImageT();
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lock, setLock] = useState(true);
  const [format, setFormat] = useState<OutputFormat>(defaultFormat);
  const [quality, setQuality] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [blurRadius, setBlurRadius] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [tolerance, setTolerance] = useState(24);
  const [entries, setEntries] = useState<MetadataEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const filterString = `blur(${blurRadius}px) brightness(${brightness}%) grayscale(${grayscale}%)`;

  /** The picture as it will be written, shown in the preview. */
  const buildPreview = useCallback(
    (img: HTMLImageElement, limit: number): string => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.drawImage(img, 0, 0);
      if (!background) return canvas.toDataURL("image/png");
      return removeBackground(canvas, limit).toDataURL("image/png");
    },
    [background],
  );

  const handleFile = useCallback(
    async (next: File) => {
      setError(null);
      setFile(next);
      setEntries([]);
      try {
        const dataUrl = await fileToDataUrl(next);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        setSrc(dataUrl);
        setPreviewSrc(buildPreview(img, tolerance));
        setNatural({ width: img.naturalWidth, height: img.naturalHeight });
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      } catch {
        setError(t("cannotDecodeThisFile"));
        setSrc(null);
      }
      if (metadata) {
        try {
          const bytes = await fileToBytes(next);
          const exif = parseExif(bytes);
          const png = parsePngText(bytes);
          setEntries([...exif, ...png]);
        } catch {
          setEntries([]);
        }
      }
    },
    [metadata, t, buildPreview, tolerance],
  );

  const changeWidth = (value: number) => {
    setWidth(value);
    if (lock && natural.width > 0) {
      setHeight(Math.round((value * natural.height) / natural.width));
    }
  };

  const changeHeight = (value: number) => {
    setHeight(value);
    if (lock && natural.height > 0) {
      setWidth(Math.round((value * natural.width) / natural.height));
    }
  };

  const handleDownload = async () => {
    const img = imageRef.current;
    if (!img || !width || !height) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (filters) {
        ctx.filter = filterString;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      let output = canvas;
      if (background) {
        output = removeBackground(canvas, tolerance);
      }

      const blob = await canvasToBlob(output, format, quality / 100);
      const name = file ? file.name.replace(/\.[^.]+$/, "") : "image";
      downloadBlob(blob, `${name}.${FORMAT_EXTENSIONS[format]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const formatOptions = useMemo(
    () =>
      formats.map((value) => ({
        value,
        label:
          value === "image/png"
            ? t("formatPng")
            : value === "image/jpeg"
              ? t("formatJpeg")
              : t("formatWebp"),
      })),
    [formats, t],
  );

  return (
    <Panel title={title} subtitle={subtitle}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept={accept}
            label={t("choosePicture")}
            hint={t("pictureHint")}
            onFile={handleFile}
          />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {note ? <Note>{note}</Note> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            {dimensions ? (
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t("dimensions")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Field label={t("widthPx")}>
                    <input
                      type="number"
                      min={1}
                      value={width}
                      onChange={(event) =>
                        changeWidth(Number(event.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                  <Field label={t("heightPx")}>
                    <input
                      type="number"
                      min={1}
                      value={height}
                      onChange={(event) =>
                        changeHeight(Number(event.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={lock}
                    onChange={(event) => setLock(event.target.checked)}
                    className="rounded accent-sky-700"
                  />
                  <span>{t("lockAspectRatio")}</span>
                </label>
              </div>
            ) : null}

            <Field label={t("targetFormat")}>
              <Select
                value={format}
                onChange={(next) => setFormat(next as OutputFormat)}
                options={formatOptions}
                ariaLabel={t("targetFormat")}
              />
            </Field>

            {filters ? (
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t("visualFilters")}
                </p>
                <div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("brightness")}</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={brightness}
                    onChange={(event) => setBrightness(Number(event.target.value))}
                    className="w-full accent-sky-700"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("blur")}</span>
                    <span>{blurRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={blurRadius}
                    onChange={(event) => setBlurRadius(Number(event.target.value))}
                    className="w-full accent-sky-700"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("grayscale")}</span>
                    <span>{grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={grayscale}
                    onChange={(event) => setGrayscale(Number(event.target.value))}
                    className="w-full accent-sky-700"
                  />
                </div>
              </div>
            ) : null}

            {background ? (
              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{t("tolerance")}</span>
                  <span>{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={tolerance}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTolerance(value);
                    const img = imageRef.current;
                    if (img) setPreviewSrc(buildPreview(img, value));
                  }}
                  className="w-full accent-sky-700"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("backgroundToleranceHint")}
                </p>
              </div>
            ) : null}

            {format !== "image/png" ? (
              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{t("quality")}</span>
                  <span>{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-full accent-sky-700"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("qualityHint")}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <DownloadButton
                onClick={handleDownload}
                label={t("downloadImage")}
                disabled={busy}
              />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>

          <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={previewSrc || src}
              alt={t("livePreview")}
              style={{
                filter: filters ? filterString : undefined,
                maxHeight: "380px",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              className="rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
            <span className="mt-3 font-mono text-xs text-slate-500">
              {t("outputLabel")} {width} × {height} px • {t("formatLabel")}{" "}
              {format.replace("image/", "").toUpperCase()}
            </span>
            {note ? <Note>{note}</Note> : null}
          </div>

          {metadata ? (
            <div className="col-span-3 space-y-2">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("metadataTitle")}
              </p>
              <MetadataPanel entries={entries} />
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------- format choices -- */

/**
 * The metadata of a picture.
 *
 * The fields every picture may carry are listed first, so an empty file shows
 * which information is missing instead of an empty panel.
 */
export function MetadataPanel({ entries }: { entries: MetadataEntry[] }) {
  const t = useImageT();
  const find = (...needles: string[]) => {
    const hit = entries.find((entry) =>
      needles.some((needle) => entry.tag.toLowerCase().includes(needle.toLowerCase())),
    );
    return hit ? hit.value : t("notPresent");
  };

  const rows = [
    { label: t("camera"), value: find("Camera make", "Camera model") },
    { label: t("dateTaken"), value: find("Date and time") },
    { label: t("gps"), value: find("GPS") },
    { label: t("author"), value: find("Artist", "Author", "Creator") },
    { label: t("comment"), value: find("description", "Comment") },
    { label: t("software"), value: find("Software") },
  ];

  const extra = entries.filter(
    (entry) =>
      !rows.some((row) =>
        row.value.toLowerCase().includes(entry.value.toLowerCase()),
      ),
  );

  return (
    <div className="space-y-2">
      <DataList items={rows} />
      {extra.length ? (
        <DataList
          items={extra.map((entry) => ({ label: entry.tag, value: entry.value }))}
        />
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {entries.length ? t("metadataEnd") : t("noMetadataFound")}
        </p>
      )}
    </div>
  );
}
