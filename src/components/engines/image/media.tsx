"use client";

/**
 * The workspaces of the tools that write a container format: icons, favicons,
 * animated pictures and video.
 *
 * The icon file is a real ICO container, the animation is a real GIF89a file
 * and the video is a real MP4 file that the browser records while the
 * animation plays.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fileToBytes,
  fileToDataUrl,
  formatBytes,
  loadImage,
  useImageT,
} from "./kit";
import {
  MP4_RECORD_TYPES,
  buildIco,
  buildIcoBmpPayload,
  decodeGif,
  encodeGif,
  parseWebP,
  pickRecorderMimeType,
  recordCanvas,
  type DecodedFrame,
  type GifFrame,
} from "./formats";
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
): Promise<Uint8ClampedArray[]> {
  const frames: Uint8ClampedArray[] = [];
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return frames;
  for (let index = 0; index < count; index += 1) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    frames.push(ctx.getImageData(0, 0, width, height).data);
    if (index < count - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, interval));
    }
  }
  return frames;
}

/**
 * Capture the frames of an animation with the timing of the source.
 *
 * The picture is drawn into a canvas and read back at the moment every frame
 * of the source is shown, so the animation keeps the delays of the file it
 * came from instead of one delay for every frame.
 */
async function captureTimedFrames(
  source: CanvasImageSource,
  width: number,
  height: number,
  delays: number[],
): Promise<GifFrame[]> {
  const frames: GifFrame[] = [];
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return frames;
  for (let index = 0; index < delays.length; index += 1) {
    if (index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delays[index - 1]));
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    frames.push({
      width,
      height,
      rgba: ctx.getImageData(0, 0, width, height).data,
      delayMs: delays[index],
    });
  }
  return frames;
}

/**
 * Write a picture as a PNG or as a JPEG.
 *
 * A JPEG has no transparency, so the transparent parts of the picture are
 * filled with white before the file is written.
 */
async function pictureFile(
  image: HTMLImageElement,
  format: "image/png" | "image/jpeg",
): Promise<Blob> {
  const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("the browser cannot draw into a canvas");
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0);
  return canvasToBlob(canvas, format, 0.92);
}

/** Write a frame of an animation as a PNG or as a JPEG. */
async function frameFile(
  frame: DecodedFrame,
  format: "image/png" | "image/jpeg",
): Promise<Blob> {
  const canvas = makeCanvas(frame.width, frame.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("the browser cannot draw into a canvas");
  if (format === "image/jpeg") {
    // A JPEG has no transparency, so the transparent parts become white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.putImageData(new ImageData(frame.rgba, frame.width, frame.height), 0, 0);
  return canvasToBlob(canvas, format, 0.92);
}

/**
 * The frames of an animation, when the browser can read them.
 *
 * The ImageDecoder of the browser reads the frames of an animated picture one
 * by one, with the frames composed as the file shows them. A browser without
 * it cannot read the frames, and the caller falls back to the picture the
 * browser shows.
 */
async function decodeAnimation(
  bytes: Uint8Array,
  type: string,
): Promise<DecodedFrame[] | null> {
  if (typeof ImageDecoder === "undefined") return null;
  try {
    const decoder = new ImageDecoder({ data: bytes, type });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    if (!track) {
      decoder.close();
      return null;
    }
    const frames: DecodedFrame[] = [];
    for (let index = 0; index < track.frameCount; index += 1) {
      const { image } = await decoder.decode({ frameIndex: index });
      const canvas = makeCanvas(image.displayWidth, image.displayHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(image, 0, 0);
      frames.push({
        width: canvas.width,
        height: canvas.height,
        rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        delayMs: 0,
      });
      image.close();
    }
    decoder.close();
    return frames.length ? frames : null;
  } catch {
    return null;
  }
}

/** The picture of an image element as one frame. */
async function pictureFrame(image: HTMLImageElement): Promise<DecodedFrame> {
  const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("the browser cannot draw into a canvas");
  ctx.drawImage(image, 0, 0);
  return {
    width: canvas.width,
    height: canvas.height,
    rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    delayMs: 0,
  };
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
  const [delays, setDelays] = useState<number[]>([]);
  const [frames, setFrames] = useState<DecodedFrame[]>([]);
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
        // An animated WebP keeps the delay of every frame in its container, so
        // the file itself is read to find the real timing of the animation.
        const bytes = await fileToBytes(file);
        const info = parseWebP(bytes);
        const timing = info.animated ? info.frameDelaysMs : [];
        setDelays(timing);
        // The frames of the animation, when the browser can read them.
        const decoded = timing.length ? await decodeAnimation(bytes, "image/webp") : null;
        setFrames(
          decoded
            ? decoded.map((frame, index) => ({
                ...frame,
                delayMs: timing[index] ?? frame.delayMs,
              }))
            : [],
        );
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const reset = () => {
    setSrc(null);
    setDelays([]);
    setFrames([]);
    setError(null);
  };

  const handleDownload = async () => {
    if (!src) return;
    setError(null);
    try {
      if (frames.length) {
        // The frames of the source, with the timing of the source.
        const gifFrames: GifFrame[] = frames.map((frame) => ({
          width: frame.width,
          height: frame.height,
          rgba: frame.rgba,
          delayMs: frame.delayMs,
        }));
        downloadBytes(encodeGif(gifFrames), `${fileName}.gif`, "image/gif");
        return;
      }
      // A fresh picture element, so an animation starts at its first frame.
      const img = await loadImage(src);
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (delays.length) {
        const timed = await captureTimedFrames(img, width, height, delays);
        downloadBytes(encodeGif(timed), `${fileName}.gif`, "image/gif");
        return;
      }
      const captured = await captureFrames(img, width, height, frameCount, delay);
      const gifFrames: GifFrame[] = captured.map((rgba) => ({
        width,
        height,
        rgba,
        delayMs: delay,
      }));
      downloadBytes(encodeGif(gifFrames), `${fileName}.gif`, "image/gif");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadPicture = async (format: "image/png" | "image/jpeg") => {
    if (!src) return;
    setError(null);
    try {
      // The first frame of the animation, or the picture of a still file.
      const frame = frames[0];
      const blob = await (frame
        ? frameFile(frame, format)
        : pictureFile(await loadImage(src), format));
      const extension = format === "image/png" ? "png" : "jpg";
      downloadBlob(blob, `${fileName}.${extension}`);
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
                <span>{delays.length ? delays.length : frameCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={frameCount}
                disabled={delays.length > 0}
                onChange={(event) => setFrameCount(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameDelay")}</span>
                <span>{delays.length ? t("timingFromSource") : `${delay}ms`}</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={delay}
                disabled={delays.length > 0}
                onChange={(event) => setDelay(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={handleDownload} label={t("downloadGif")} />
              <DownloadButton
                onClick={() => downloadPicture("image/png")}
                label={delays.length ? t("downloadPngFirstFrame") : t("downloadPng")}
              />
              <DownloadButton
                onClick={() => downloadPicture("image/jpeg")}
                label={delays.length ? t("downloadJpgFirstFrame") : t("downloadJpg")}
              />
              <GhostButton onClick={reset}>{t("newPicture")}</GhostButton>
            </div>
            {delays.length ? (
              <Note>{t("gifTimingFromSource", { frames: delays.length })}</Note>
            ) : null}
            {delays.length && !frames.length ? (
              <Note tone="warn">{t("webpFramesUnavailable")}</Note>
            ) : null}
            {delays.length ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("webpFirstFrameNote")}
              </p>
            ) : null}
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
  const [sourceSize, setSourceSize] = useState(0);
  const [frameCount, setFrameCount] = useState(8);
  const [delay, setDelay] = useState(120);
  const [frames, setFrames] = useState<DecodedFrame[]>([]);
  const [fps, setFps] = useState(15);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sizes, setSizes] = useState<{ gif: number; mp4: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLImageElement | null>(null);
  const cancelRef = useRef(false);

  // The browser writes the MP4 itself. A browser that cannot record one gets
  // no video file at all, and the tool says so instead of handing out a file
  // that no player can open.
  const mp4Type = useMemo(() => pickRecorderMimeType(MP4_RECORD_TYPES), []);
  const lengthMs = frames.reduce((sum, frame) => sum + frame.delayMs, 0);
  const animated = frames.length > 1;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSizes(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        imageRef.current = img;
        // The frames of the animation are read out of the file, with the delay
        // every frame is shown for, so the recording shows the animation and
        // is as long as the animation really is.
        const bytes = await fileToBytes(file);
        const decoded = decodeGif(bytes);
        setFrames(decoded.length ? decoded : [await pictureFrame(img)]);
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
        setSourceSize(file.size);
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const reset = () => {
    setSrc(null);
    setFrames([]);
    setSizes(null);
    setError(null);
  };

  const handleDownload = async () => {
    if (!src || !mp4Type || !frames.length) return;
    setError(null);
    setSizes(null);
    setProgress(0);
    cancelRef.current = false;
    setRecording(true);
    try {
      const canvas = makeCanvas(frames[0].width, frames[0].height);
      const recorded = await recordCanvas({
        canvas,
        frames,
        durationMs: Math.max(lengthMs, 1000),
        fps,
        mimeType: mp4Type,
        onProgress: setProgress,
        isCancelled: () => cancelRef.current,
      });
      if (!recorded.completed) {
        setError(t("mp4Cancelled"));
        return;
      }
      downloadBlob(recorded.blob, `${fileName}.mp4`);
      setSizes({ gif: sourceSize, mp4: recorded.blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRecording(false);
    }
  };

  const downloadGif = async () => {
    if (!src) return;
    setError(null);
    try {
      if (animated) {
        // The frames of the source, with the timing of the source.
        const gif = encodeGif(
          frames.map((frame) => ({
            width: frame.width,
            height: frame.height,
            rgba: frame.rgba,
            delayMs: frame.delayMs,
          })),
        );
        downloadBytes(gif, `${fileName}.gif`, "image/gif");
        return;
      }
      const img = await loadImage(src);
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const captured = await captureFrames(img, width, height, frameCount, delay);
      const gif = encodeGif(
        captured.map((rgba) => ({
          width,
          height,
          rgba,
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
                <span>{t("frameRate")}</span>
                <span>{fps}</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            {mp4Type ? (
              <div className="flex flex-wrap items-center gap-2">
                <DownloadButton
                  onClick={handleDownload}
                  label={t("downloadMp4")}
                  disabled={recording}
                />
                {recording ? (
                  <GhostButton onClick={() => (cancelRef.current = true)}>
                    {t("mp4Cancel")}
                  </GhostButton>
                ) : null}
              </div>
            ) : null}
            {recording ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("mp4Progress", { percent: Math.round(progress * 100) })}
              </p>
            ) : null}
            {sizes ? (
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {sizes.mp4 < sizes.gif
                  ? t("mp4SizeComparison", {
                      gif: formatBytes(sizes.gif),
                      mp4: formatBytes(sizes.mp4),
                      percent: Math.round((1 - sizes.mp4 / sizes.gif) * 100),
                    })
                  : t("mp4SizeBigger", {
                      gif: formatBytes(sizes.gif),
                      mp4: formatBytes(sizes.mp4),
                    })}
              </p>
            ) : null}
            {!mp4Type ? <Note tone="warn">{t("mp4NotSupported")}</Note> : null}

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameCount")}</span>
                <span>{animated ? frames.length : frameCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={frameCount}
                disabled={animated}
                onChange={(event) => setFrameCount(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("frameDelay")}</span>
                <span>{animated ? t("timingFromSource") : `${delay}ms`}</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={delay}
                disabled={animated}
                onChange={(event) => setDelay(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={downloadGif} label={t("downloadGifInstead")} />
              <GhostButton onClick={reset}>{t("newPicture")}</GhostButton>
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
            {animated ? (
              <Note>
                {t("gifSourceTiming", {
                  frames: frames.length,
                  seconds: (lengthMs / 1000).toFixed(1),
                })}
              </Note>
            ) : (
              <Note>{t("mp4StillGif")}</Note>
            )}
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
              controls
              muted
              playsInline
              preload="metadata"
              className="max-h-[300px] max-w-full rounded-xl border border-slate-200 bg-black shadow-md dark:border-slate-700"
            />
            <p className="font-mono text-xs text-slate-500">{t("gifOutputLabel")}</p>
            <Note>{t("videoPreviewNote")}</Note>
            <Note>{t("videoNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}
