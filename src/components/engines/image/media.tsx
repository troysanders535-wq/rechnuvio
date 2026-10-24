"use client";

/**
 * The workspaces of the tools that write a container format: icons, favicons,
 * animated pictures and video.
 *
 * The icon file is a real ICO container, the animation is a real GIF89a file
 * and the MP4 file is a real ISO base media file.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
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
  downloadBytes,
  fileToDataUrl,
  loadImage,
  useImageT,
} from "./kit";
import { buildIco, buildIcoBmpPayload, encodeGif, buildMp4Container, type GifFrame } from "./formats";
import { makeCanvas } from "./fx";

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const FAVICON_SIZES = [16, 32, 48, 180];

/* --------------------------------------------------------------------- ICO -- */

export function IcoView({
  title,
  subtitle,
  accept,
  note,
}: {
  title: string;
  subtitle: string;
  accept: string;
  note: string;
}) {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("icon");
  const [sizes, setSizes] = useState<number[]>([16, 32, 48]);
  const [payload, setPayload] = useState<"png" | "bmp">("png");
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const toggleSize = (size: number) => {
    setSizes((current) =>
      current.includes(size)
        ? current.filter((entry) => entry !== size)
        : [...current, size].sort((a, b) => a - b),
    );
  };

  const handleDownload = async () => {
    const img = imageRef.current;
    if (!img || !sizes.length) return;
    setError(null);
    try {
      const entries = [];
      for (const size of sizes) {
        const canvas = makeCanvas(size, size);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(img, 0, 0, size, size);
        if (payload === "png") {
          const blob = await canvasToBlob(canvas, "image/png");
          entries.push({
            size,
            payload: new Uint8Array(await blob.arrayBuffer()),
          });
        } else {
          const data = ctx.getImageData(0, 0, size, size).data;
          entries.push({ size, payload: buildIcoBmpPayload(size, size, data) });
        }
      }
      if (!entries.length) return;
      const ico = buildIco(entries);
      downloadBytes(ico, `${fileName || "icon"}.ico`, "image/x-icon");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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
          <Note>{note}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("icoSizes")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ICO_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      sizes.includes(size)
                        ? "border-sky-600 bg-sky-800 text-white"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <Field label={t("icoTargetFormat")}>
              <Select
                value={payload}
                onChange={(next) => setPayload(next as "png" | "bmp")}
                options={[
                  { value: "png", label: t("icoPngPayload") },
                  { value: "bmp", label: t("icoBmpPayload") },
                ]}
                ariaLabel={t("icoTargetFormat")}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>

          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={src}
              alt={t("livePreview")}
              className="max-h-[320px] max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-md dark:border-slate-700"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- favicons -- */

export function FaviconGeneratorView() {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("favicon");
  const [sizes, setSizes] = useState<number[]>([16, 32, 48, 180]);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const renderSize = async (size: number) => {
    const img = imageRef.current;
    if (!img) return null;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas;
  };

  const downloadPng = async (size: number) => {
    const canvas = await renderSize(size);
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, `${fileName}-${size}.png`);
  };

  const downloadIco = async () => {
    const entries = [];
    for (const size of sizes) {
      const canvas = await renderSize(size);
      if (!canvas) continue;
      const blob = await canvasToBlob(canvas, "image/png");
      entries.push({ size, payload: new Uint8Array(await blob.arrayBuffer()) });
    }
    if (!entries.length) return;
    downloadBytes(buildIco(entries), `${fileName}.ico`, "image/x-icon");
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const size of sizes) {
      const canvas = await renderSize(size);
      if (!canvas) continue;
      const blob = await canvasToBlob(canvas, "image/png");
      zip.file(`${fileName}-${size}.png`, blob);
    }
    const archive = await zip.generateAsync({ type: "blob" });
    downloadBlob(archive, `${fileName}-favicons.zip`);
  };

  return (
    <Panel title={t("faviconTitle")} subtitle={t("faviconSubtitle")}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept="image/*"
            label={t("choosePicture")}
            hint={t("pictureHint")}
            onFile={handleFile}
          />
          <Note>{t("faviconNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("faviconSizes")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FAVICON_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setSizes((current) =>
                        current.includes(size)
                          ? current.filter((entry) => entry !== size)
                          : [...current, size].sort((a, b) => a - b),
                      )
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      sizes.includes(size)
                        ? "border-sky-600 bg-sky-800 text-white"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    }`}
                  >
                    {size} × {size}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t("faviconSizeHint")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={downloadIco} label={t("downloadIco")} />
              <DownloadButton onClick={downloadZip} label={t("downloadZip")} />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>

          <div className="col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={src}
                alt={t("livePreview")}
                className="max-h-[220px] max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-md dark:border-slate-700"
              />
              <div className="flex flex-wrap items-end gap-3">
                {sizes.map((size) => (
                  <div key={size} className="text-center">
                    <canvas
                      width={size}
                      height={size}
                      ref={(node) => {
                        if (!node) return;
                        const ctx = node.getContext("2d");
                        const img = imageRef.current;
                        if (!ctx || !img) return;
                        ctx.clearRect(0, 0, size, size);
                        ctx.drawImage(img, 0, 0, size, size);
                      }}
                      className="rounded border border-slate-200 bg-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">{size} × {size}</p>
                    <button
                      type="button"
                      onClick={() => downloadPng(size)}
                      className="mt-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      PNG
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <Note>{t("faviconNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------- GIF -- */

/** Capture the frames of a picture that is drawn on a canvas. */
async function captureFrames(
  source: CanvasImageSource,
  width: number,
  height: number,
  count: number,
  interval: number,
): Promise<{ jpeg: Uint8Array; rgba: Uint8ClampedArray }[]> {
  const frames: { jpeg: Uint8Array; rgba: Uint8ClampedArray }[] = [];
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return frames;
  for (let index = 0; index < count; index += 1) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
    frames.push({
      jpeg: new Uint8Array(await blob.arrayBuffer()),
      rgba: data,
    });
    if (index < count - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, interval));
    }
  }
  return frames;
}

export function GifFromPictureView({
  title,
  subtitle,
  note,
  frames: wanted,
}: {
  title: string;
  subtitle: string;
  note: string;
  frames: number;
}) {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("animation");
  const [frameCount, setFrameCount] = useState(wanted);
  const [delay, setDelay] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLImageElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const handleDownload = async () => {
    const img = previewRef.current ?? imageRef.current;
    if (!img) return;
    setError(null);
    try {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const captured = await captureFrames(img, width, height, frameCount, delay);
      const gifFrames: GifFrame[] = captured.map((frame) => ({
        width,
        height,
        rgba: frame.rgba,
        delayMs: delay,
      }));
      const gif = encodeGif(gifFrames);
      downloadBytes(gif, `${fileName}.gif`, "image/gif");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept="image/*"
            label={t("choosePicture")}
            hint={t("pictureHint")}
            onFile={handleFile}
          />
          <Note>{note}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameCount")}</span>
                <span>{frameCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={frameCount}
                onChange={(event) => setFrameCount(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameDelay")}</span>
                <span>{delay}ms</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={delay}
                onChange={(event) => setDelay(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              ref={previewRef}
              src={src}
              alt={t("livePreview")}
              className="max-h-[320px] max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-md dark:border-slate-700"
            />
            <p className="font-mono text-xs text-slate-500">{t("gifOutputLabel")}</p>
            <Note>{note}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------- MP4 -- */

export function GifToMp4View() {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("animation");
  const [frameCount, setFrameCount] = useState(8);
  const [delay, setDelay] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLImageElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const handleDownload = async () => {
    const img = previewRef.current ?? imageRef.current;
    if (!img) return;
    setError(null);
    try {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const captured = await captureFrames(img, width, height, frameCount, delay);
      const mp4 = buildMp4Container(captured.map((frame) => frame.jpeg));
      downloadBytes(mp4, `${fileName}.mp4`, "video/mp4");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadGif = async () => {
    const img = previewRef.current ?? imageRef.current;
    if (!img) return;
    try {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const captured = await captureFrames(img, width, height, frameCount, delay);
      const gif = encodeGif(
        captured.map((frame) => ({
          width,
          height,
          rgba: frame.rgba,
          delayMs: delay,
        })),
      );
      downloadBytes(gif, `${fileName}.gif`, "image/gif");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Panel title={t("gifToMp4Title")} subtitle={t("gifToMp4Subtitle")}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept="image/gif,image/*"
            label={t("chooseAnimation")}
            hint={t("animationHint")}
            onFile={handleFile}
          />
          <Note>{t("mp4Note")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameCount")}</span>
                <span>{frameCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={frameCount}
                onChange={(event) => setFrameCount(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameDelay")}</span>
                <span>{delay}ms</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={delay}
                onChange={(event) => setDelay(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
              <DownloadButton onClick={downloadGif} label={t("downloadGifInstead")} />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              ref={previewRef}
              src={src}
              alt={t("livePreview")}
              className="max-h-[300px] max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-md dark:border-slate-700"
            />
            <p className="font-mono text-xs text-slate-500">{t("mp4OutputLabel")}</p>
            <Note>{t("mp4Note")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------------- video -- */

export function VideoToGifView() {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("clip");
  const [frameCount, setFrameCount] = useState(8);
  const [fps, setFps] = useState(10);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [width, setWidth] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrl = useRef<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setStatus(t("readingClip"));
      try {
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        const url = URL.createObjectURL(file);
        objectUrl.current = url;
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error(t("cannotReadThisVideo")));
        });
        videoRef.current = video;
        const total = Number.isFinite(video.duration) ? video.duration : 0;
        setDuration(total);
        setTrimStart(0);
        setTrimEnd(total);
        setWidth(video.videoWidth || 0);
        setSrc(url);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
        setStatus("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("");
      }
    },
    [t],
  );

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const handleDownload = async () => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setStatus(t("readingFrames"));
    try {
      const sourceWidth = video.videoWidth || 320;
      const sourceHeight = video.videoHeight || 240;
      const targetWidth = width > 0 ? Math.min(width, sourceWidth) : sourceWidth;
      const targetHeight = Math.max(
        1,
        Math.round((targetWidth * sourceHeight) / sourceWidth),
      );
      const canvas = makeCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const frames: GifFrame[] = [];
      const total = Number.isFinite(video.duration) ? video.duration : 0;
      const from = Math.min(trimStart, total);
      const to = Math.max(from + 0.05, Math.min(trimEnd, total));
      const span = to - from;
      const delay = Math.max(20, Math.round(1000 / Math.max(1, fps)));
      for (let index = 0; index < frameCount; index += 1) {
        const time = from + (span * index) / frameCount;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = Math.min(time, Math.max(0, to - 0.05));
        });
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        frames.push({
          width: targetWidth,
          height: targetHeight,
          rgba: ctx.getImageData(0, 0, targetWidth, targetHeight).data,
          delayMs: delay,
        });
      }
      const gif = encodeGif(frames);
      downloadBytes(gif, `${fileName}.gif`, "image/gif");
      setStatus("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("");
    }
  };

  return (
    <Panel title={t("videoToGifTitle")} subtitle={t("videoToGifSubtitle")}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept="video/*"
            label={t("chooseVideo")}
            hint={t("videoHint")}
            onFile={handleFile}
          />
          <Note>{t("videoNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameCount")}</span>
                <span>{frameCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={frameCount}
                onChange={(event) => setFrameCount(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameRate")}</span>
                <span>{fps}</span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("trimStart")}</span>
                <span>{trimStart.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.1}
                value={Math.min(trimStart, duration)}
                onChange={(event) =>
                  setTrimStart(Math.min(Number(event.target.value), trimEnd - 0.1))
                }
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("trimEnd")}</span>
                <span>{trimEnd.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.1}
                value={Math.min(trimEnd, duration)}
                onChange={(event) =>
                  setTrimEnd(Math.max(Number(event.target.value), trimStart + 0.1))
                }
                className="w-full accent-sky-700"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t("trimHint")}
              </p>
            </div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("outputWidth")}
              <input
                type="number"
                min={16}
                max={1920}
                value={width || ""}
                placeholder={t("outputWidthOriginal")}
                onChange={(event) =>
                  setWidth(Math.min(Math.max(Number(event.target.value) || 0, 0), 1920))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            {status ? <p className="text-xs text-slate-500">{status}</p> : null}
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <video
              ref={videoRef}
              src={src}
              muted
              playsInline
              className="max-h-[300px] max-w-full rounded-xl border border-slate-200 bg-black shadow-md dark:border-slate-700"
            />
            <p className="font-mono text-xs text-slate-500">{t("gifOutputLabel")}</p>
            <Note>{t("videoNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}
