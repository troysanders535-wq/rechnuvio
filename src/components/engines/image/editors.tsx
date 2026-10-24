"use client";

/**
 * The editing workspaces: the tools that change a part of a picture.
 *
 * Each of them marks a region (a rectangle, an ellipse or a brush stroke) and
 * then applies its own effect to that region. The region is always chosen by
 * the user: this page has no face detection model and no inpainting model,
 * and the panels say so.
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
  fileToDataUrl,
  loadImage,
  useImageT,
} from "./kit";
import {
  blur,
  censorBar,
  compositeMasked,
  fillWithSurroundingColour,
  makeCanvas,
  paintBrush,
  paintEllipse,
  paintRectangle,
  pixelate,
} from "./fx";
import { FORMAT_EXTENSIONS, type OutputFormat } from "./basic";

export type RegionMode = "rect" | "ellipse" | "brush";
export type RegionEffect = "blur" | "censor" | "erase" | "pixelate";

export interface RegionEditorViewProps {
  title: string;
  subtitle?: string;
  effect: RegionEffect;
  modes: RegionMode[];
  /** The name of the region control, for example "Face regions". */
  regionLabel: string;
  /** The honest explanation of what the tool does. */
  note: string;
  /** The extra control of the effect, for example the blur radius. */
  censorStyle?: boolean;
}

/**
 * Mark a region of a picture and apply an effect to it.
 */
export function RegionEditorView({
  title,
  subtitle,
  effect,
  modes,
  regionLabel,
  note,
  censorStyle = false,
}: RegionEditorViewProps) {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image");
  const [mode, setMode] = useState<RegionMode>(modes[0]);
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [brush, setBrush] = useState(24);
  const [radius, setRadius] = useState(10);
  const [style, setStyle] = useState<"mosaic" | "bar">("mosaic");
  const [block, setBlock] = useState(10);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [painting, setPainting] = useState(false);

  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        const source = makeCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = source.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(img, 0, 0);
        sourceRef.current = source;
        maskRef.current = makeCanvas(source.width, source.height);
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
        setRect({
          x: Math.round(source.width * 0.25),
          y: Math.round(source.height * 0.25),
          w: Math.round(source.width * 0.5),
          h: Math.round(source.height * 0.5),
        });
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  /** The painted region, in the mask canvas. */
  const buildMask = useCallback(() => {
    const source = sourceRef.current;
    const mask = maskRef.current;
    if (!source || !mask) return null;
    if (mode === "brush") return mask;
    const ctx = mask.getContext("2d");
    if (!ctx) return mask;
    ctx.clearRect(0, 0, mask.width, mask.height);
    if (mode === "rect") {
      paintRectangle(mask, rect.x, rect.y, rect.w, rect.h);
    } else {
      paintEllipse(mask, rect.x, rect.y, rect.w, rect.h);
    }
    return mask;
  }, [mode, rect]);

  /** The picture with the effect applied to the marked region. */
  const buildResult = useCallback(() => {
    const source = sourceRef.current;
    const mask = buildMask();
    if (!source || !mask) return null;

    const effectCanvas = makeCanvas(source.width, source.height);
    const effectCtx = effectCanvas.getContext("2d");
    if (!effectCtx) return null;

    if (effect === "blur") {
      effectCtx.drawImage(blur(source, radius), 0, 0);
    } else if (effect === "pixelate") {
      effectCtx.drawImage(pixelate(source, block), 0, 0);
    } else if (effect === "censor") {
      const censored =
        style === "bar" ? censorBar(source, block) : pixelate(source, block);
      effectCtx.drawImage(censored, 0, 0);
    } else {
      effectCtx.drawImage(fillWithSurroundingColour(source, mask), 0, 0);
    }

    return compositeMasked(source, effectCanvas, mask);
  }, [buildMask, effect, radius, style, block]);

  const renderPreview = useCallback(() => {
    const display = displayRef.current;
    const source = sourceRef.current;
    const mask = maskRef.current;
    if (!display || !mask || !source) return;
    const result = buildResult();
    if (!result) return;
    // The canvas has to carry the size of the picture, otherwise it keeps the
    // HTML default of 300x150 and the picture is clipped into the corner.
    if (display.width !== source.width || display.height !== source.height) {
      display.width = source.width;
      display.height = source.height;
    }
    const ctx = display.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(result, 0, 0);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#38bdf8";
    ctx.drawImage(mask, 0, 0);
    ctx.globalAlpha = 1;
  }, [buildResult]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, rect, mode, brush, radius, style, block]);

  const pointFromEvent = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "brush") return;
    const mask = maskRef.current;
    if (!mask) return;
    const point = pointFromEvent(event);
    lastPoint.current = point;
    setPainting(true);
    paintBrush(mask, point, point, brush / 2);
    renderPreview();
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!painting || mode !== "brush") return;
    const mask = maskRef.current;
    if (!mask || !lastPoint.current) return;
    const point = pointFromEvent(event);
    paintBrush(mask, lastPoint.current, point, brush / 2);
    lastPoint.current = point;
    renderPreview();
  };

  const stopPainting = () => {
    setPainting(false);
    lastPoint.current = null;
  };

  const handleDownload = async () => {
    const result = buildResult();
    if (!result) return;
    try {
      const canvas = makeCanvas(result.width, result.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(result, 0, 0);
      const blob = await canvasToBlob(canvas, format, quality / 100);
      downloadBlob(blob, `${fileName}.${FORMAT_EXTENSIONS[format]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const modeOptions = modes.map((value) => ({
    value,
    label:
      value === "rect"
        ? t("shapeRectangle")
        : value === "ellipse"
          ? t("shapeEllipse")
          : t("shapeBrush"),
  }));

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
            <Field label={t("regionShape")}>
              <Select
                value={mode}
                onChange={(next) => setMode(next as RegionMode)}
                options={modeOptions}
                ariaLabel={t("regionShape")}
              />
            </Field>

            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {regionLabel}
              </p>
              {mode === "brush" ? (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("brushSize")}</span>
                    <span>{brush}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={120}
                    value={brush}
                    onChange={(event) => setBrush(Number(event.target.value))}
                    className="w-full accent-sky-700"
                  />
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label={t("regionX")}>
                    <input
                      type="number"
                      value={rect.x}
                      onChange={(event) =>
                        setRect({ ...rect, x: Number(event.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                  <Field label={t("regionY")}>
                    <input
                      type="number"
                      value={rect.y}
                      onChange={(event) =>
                        setRect({ ...rect, y: Number(event.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                  <Field label={t("regionWidth")}>
                    <input
                      type="number"
                      value={rect.w}
                      onChange={(event) =>
                        setRect({ ...rect, w: Number(event.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                  <Field label={t("regionHeight")}>
                    <input
                      type="number"
                      value={rect.h}
                      onChange={(event) =>
                        setRect({ ...rect, h: Number(event.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </Field>
                </div>
              )}
            </div>

            {effect === "blur" ? (
              <div className="space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{t("blurRadius")}</span>
                  <span>{radius}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="w-full accent-sky-700"
                />
              </div>
            ) : null}

            {effect === "censor" || effect === "pixelate" ? (
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                {effect === "censor" ? (
                  <Field label={t("censorStyle")}>
                    <Select
                      value={style}
                      onChange={(next) => setStyle(next as "mosaic" | "bar")}
                      options={[
                        { value: "mosaic", label: t("styleMosaic") },
                        { value: "bar", label: t("styleBar") },
                      ]}
                      ariaLabel={t("censorStyle")}
                    />
                  </Field>
                ) : null}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{t("blockSize")}</span>
                    <span>{block}px</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={60}
                    value={block}
                    onChange={(event) => setBlock(Number(event.target.value))}
                    className="w-full accent-sky-700"
                  />
                </div>
              </div>
            ) : null}

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

            {format !== "image/png" ? (
              <div className="space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800">
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
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>

          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <canvas
              ref={displayRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={stopPainting}
              onMouseLeave={stopPainting}
              className="max-h-[380px] max-w-full cursor-crosshair rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
            <div className="flex items-center gap-3">
              <img
                src={src}
                alt={t("sourcePicture")}
                className="size-16 rounded-lg border border-slate-200 object-contain dark:border-slate-700"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("markRegionHint")}
              </p>
            </div>
            <Note>{note}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- pixelate -- */

/** Draw a picture as a mosaic of blocks. */
export function PixelateView() {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image");
  const [block, setBlock] = useState(8);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        const source = makeCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = source.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(img, 0, 0);
        sourceRef.current = source;
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const renderPreview = useCallback(() => {
    const display = displayRef.current;
    const source = sourceRef.current;
    if (!display || !source) return;
    if (display.width !== source.width || display.height !== source.height) {
      display.width = source.width;
      display.height = source.height;
    }
    const ctx = display.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(pixelate(source, block), 0, 0);
  }, [block]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, src]);

  const handleDownload = async () => {
    const source = sourceRef.current;
    if (!source) return;
    const result = pixelate(source, block);
    const canvas = makeCanvas(result.width, result.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(result, 0, 0);
    const blob = await canvasToBlob(canvas, format, 0.92);
    downloadBlob(blob, `${fileName}.${FORMAT_EXTENSIONS[format]}`);
  };

  return (
    <Panel title={t("pixelateTitle")} subtitle={t("pixelateSubtitle")}>
      {!src ? (
        <div className="space-y-3">
          <FilePicker
            accept="image/*"
            label={t("choosePicture")}
            hint={t("pictureHint")}
            onFile={handleFile}
          />
          <Note>{t("pixelateNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("pixelSize")}</span>
                <span>{block}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                value={block}
                onChange={(event) => setBlock(Number(event.target.value))}
                className="w-full accent-sky-700"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t("pixelSizeHint")}
              </p>
            </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
              <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            </div>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <canvas
              ref={displayRef}
              className="max-h-[380px] max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
            <div className="flex items-center gap-3">
              <img
                src={src}
                alt={t("sourcePicture")}
                className="size-16 rounded-lg border border-slate-200 object-contain dark:border-slate-700"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("pixelSizeHint")}
              </p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------- instagram -- */

/** Cut a picture into a grid of tiles. */
export function SplitView({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useImageT();
  const [src, setSrc] = useState<string | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [fileName, setFileName] = useState("photo");
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(img, 0, 0);
        setSource(canvas);
        setSrc(dataUrl);
        setFileName(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setError(t("cannotDecodeThisFile"));
      }
    },
    [t],
  );

  const renderPreview = useCallback(() => {
    const display = displayRef.current;
    if (!display || !source) return;
    if (display.width !== source.width || display.height !== source.height) {
      display.width = source.width;
      display.height = source.height;
    }
    const ctx = display.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(source, 0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    for (let row = 1; row < rows; row += 1) {
      const y = (source.height / rows) * row;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(source.width, y);
      ctx.stroke();
    }
    for (let column = 1; column < columns; column += 1) {
      const x = (source.width / columns) * column;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, source.height);
      ctx.stroke();
    }
  }, [source, rows, columns]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, src]);

  /** The tiles of the picture. */
  const tiles = useMemo(() => {
    if (!source) return [];
    const tileWidth = Math.floor(source.width / columns);
    const tileHeight = Math.floor(source.height / rows);
    const list: { name: string; canvas: HTMLCanvasElement; url: string }[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const canvas = makeCanvas(tileWidth, tileHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(
          source,
          column * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight,
          0,
          0,
          tileWidth,
          tileHeight,
        );
        list.push({
          name: `tile-${row + 1}-${column + 1}.png`,
          canvas,
          url: canvas.toDataURL("image/png"),
        });
      }
    }
    return list;
  }, [source, rows, columns]);

  const downloadTiles = async () => {
    if (!tiles.length) return;
    try {
      const zip = new JSZip();
      for (const tile of tiles) {
        const blob = await canvasToBlob(tile.canvas, "image/png");
        zip.file(tile.name, blob);
      }
      const archive = await zip.generateAsync({ type: "blob" });
      downloadBlob(archive, `${fileName}-tiles.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadTile = async (name: string, canvas: HTMLCanvasElement) => {
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, name);
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
          <Note>{t("splitNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("gridRows")}>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={rows}
                  onChange={(event) => setRows(Math.max(1, Number(event.target.value) || 1))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </Field>
              <Field label={t("gridColumns")}>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={columns}
                  onChange={(event) =>
                    setColumns(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </Field>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("gridPresets")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { rows: 1, columns: 1 },
                  { rows: 3, columns: 3 },
                  { rows: 4, columns: 4 },
                ].map((preset) => (
                  <button
                    key={`${preset.rows}x${preset.columns}`}
                    type="button"
                    onClick={() => {
                      setRows(preset.rows);
                      setColumns(preset.columns);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {preset.rows}x{preset.columns}
                  </button>
                ))}
              </div>
            </div>
            <DownloadButton onClick={downloadTiles} label={t("downloadTilesZip")} />
            <GhostButton onClick={() => setSrc(null)}>{t("newPicture")}</GhostButton>
            {error ? <ErrorNote>{error}</ErrorNote> : null}
          </div>

          <div className="col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <canvas
              ref={displayRef}
              className="max-h-[380px] max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
            <div className="flex items-center gap-3">
              <img
                src={src}
                alt={t("sourcePicture")}
                className="size-16 rounded-lg border border-slate-200 object-contain dark:border-slate-700"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("gridHint")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {tiles.map((tile) => (
                <button
                  key={tile.name}
                  type="button"
                  onClick={() => downloadTile(tile.name, tile.canvas)}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-left hover:border-sky-500 dark:border-slate-700"
                >
                  <img
                    src={tile.url}
                    alt={tile.name}
                    className="h-16 w-full rounded object-cover"
                  />
                  <span className="block truncate px-1 text-[10px] text-slate-500">
                    {tile.name}
                  </span>
                </button>
              ))}
            </div>
            <Note>{t("splitNote")}</Note>
          </div>
        </div>
      )}
    </Panel>
  );
}
