"use client";

/**
 * The workspaces that work with SVG source code, with a small icon library
 * and with the Data Matrix code.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CodeBlock,
  DataList,
  DownloadButton,
  ErrorNote,
  Field,
  GhostButton,
  Note,
  Panel,
  Select,
  canvasToBlob,
  downloadBlob,
  useImageT,
} from "./kit";
import { makeCanvas } from "./fx";

const SVG_SAMPLE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#3366cc"/></svg>';

/* ------------------------------------------------------------- svg viewer -- */

/** What the inspector of an SVG file can show. */
interface SvgFacts {
  width: string;
  height: string;
  viewBox: string;
  elements: number;
  colours: string[];
}

/** The value of an attribute, with or without quotes. */
function attribute(tag: string, name: string): string {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  if (quoted) return quoted[1];
  const single = new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i").exec(tag);
  if (single) return single[1];
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i").exec(tag);
  return bare ? bare[1] : "";
}

/**
 * Read the facts of an SVG source.
 *
 * The source is read with plain patterns, so the server and the browser see
 * the same result and the page stays free of hydration errors.
 */
function readSvg(source: string): { facts: SvgFacts; error: boolean } {
  const facts: SvgFacts = {
    width: "",
    height: "",
    viewBox: "",
    elements: 0,
    colours: [],
  };
  const trimmed = source.trim();
  if (!trimmed) return { facts, error: false };

  const root = /<svg\b[^>]*>/i.exec(trimmed);
  if (!root) return { facts, error: true };

  facts.width = attribute(root[0], "width");
  facts.height = attribute(root[0], "height");
  facts.viewBox = attribute(root[0], "viewBox");

  const tags = trimmed.match(/<[a-zA-Z][^>]*>/g) || [];
  facts.elements = Math.max(0, tags.length - 1);

  const colours = new Set<string>();
  // A colour may be written with double quotes, with single quotes or bare.
  const pattern = /\b(?:fill|stroke)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let hit = pattern.exec(trimmed);
  while (hit) {
    const value = hit[1] ?? hit[2] ?? hit[3] ?? "";
    if (value && value !== "none") colours.add(value);
    hit = pattern.exec(trimmed);
  }
  facts.colours = Array.from(colours).slice(0, 12);

  return { facts, error: !/<\/svg\s*>/i.test(trimmed) };
}

export function SvgViewerView() {
  const t = useImageT();
  const [source, setSource] = useState(SVG_SAMPLE);
  const { facts, error } = useMemo(() => readSvg(source), [source]);

  const preview = useMemo(
    () =>
      source.trim()
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
        : "",
    [source],
  );

  return (
    <Panel title={t("svgViewerTitle")} subtitle={t("svgViewerSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("svgSource")}>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-sky-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton onClick={() => setSource(SVG_SAMPLE)}>{t("resetExample")}</GhostButton>
            <GhostButton onClick={() => setSource("")}>{t("clear")}</GhostButton>
          </div>
          {error ? <ErrorNote>{t("svgParseError")}</ErrorNote> : null}
          <Note>{t("svgNote")}</Note>
        </div>
        <div className="space-y-4">
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            {preview ? (
              <img
                src={preview}
                alt={t("svgPreview")}
                className="max-h-[240px] max-w-full"
              />
            ) : (
              <span className="text-xs text-slate-500">{t("svgNoPreview")}</span>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("svgInspector")}
            </p>
            <DataList
              items={[
                { label: t("svgWidth"), value: facts.width || "—" },
                { label: t("svgHeight"), value: facts.height || "—" },
                { label: t("svgViewBox"), value: facts.viewBox || "—" },
                { label: t("svgElements"), value: String(facts.elements) },
                { label: t("svgColours"), value: facts.colours.join(", ") || "—" },
              ]}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------- svg to css -- */

export function SvgToCssView() {
  const t = useImageT();
  const [source, setSource] = useState(SVG_SAMPLE);
  const [className, setClassName] = useState("icon");
  const { error } = useMemo(() => readSvg(source), [source]);

  const css = useMemo(() => {
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    const quoted = encoded.replace(/"/g, "%22");
    return [
      `.${className} {`,
      `  display: inline-block;`,
      `  width: 1em;`,
      `  height: 1em;`,
      `  background-image: url("${quoted}");`,
      `  background-size: contain;`,
      `  background-repeat: no-repeat;`,
      `}`,
      ``,
      `.${className}-mask {`,
      `  display: inline-block;`,
      `  width: 1em;`,
      `  height: 1em;`,
      `  background-color: currentColor;`,
      `  -webkit-mask-image: url("${quoted}");`,
      `  mask-image: url("${quoted}");`,
      `  -webkit-mask-size: contain;`,
      `  mask-size: contain;`,
      `  -webkit-mask-repeat: no-repeat;`,
      `  mask-repeat: no-repeat;`,
      `}`,
    ].join("\n");
  }, [source, className]);

  return (
    <Panel title={t("svgCssTitle")} subtitle={t("svgCssSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("svgSource")}>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-sky-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
            />
          </Field>
          <Field label={t("cssClassName")}>
            <input
              type="text"
              value={className}
              onChange={(event) => setClassName(event.target.value.replace(/\s+/g, ""))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          {error ? <ErrorNote>{t("svgParseError")}</ErrorNote> : null}
          <Note>{t("svgCssNote")}</Note>
        </div>
        <div className="space-y-4">
          <CodeBlock label={t("cssOutput")} value={css} />
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ icon picker -- */

interface IconEntry {
  id: string;
  path: string;
}

const ICONS: IconEntry[] = [
  { id: "star", path: "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" },
  { id: "heart", path: "M12 21s-7.5-4.7-9.3-9.1C1.2 8.1 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.8 3.6 4.3 7.4C19.5 16.3 12 21 12 21z" },
  { id: "bolt", path: "M13 2L4 14h6l-1 8 9-12h-6z" },
  { id: "check", path: "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" },
  { id: "home", path: "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" },
  { id: "user", path: "M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z" },
  { id: "gear", path: "M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 4a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 00-2-1.2L16.5 3h-4l-.4 2.6a7.5 7.5 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 002 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" },
  { id: "camera", path: "M9 4l-1.5 2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.5L15 4zm3 5a5 5 0 110 10 5 5 0 010-10z" },
  { id: "clock", path: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.6V6h-2v7l5 3 1-1.7z" },
  { id: "search", path: "M10 3a7 7 0 015.2 11.8l5 5-1.4 1.4-5-5A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z" },
  { id: "lock", path: "M12 2a5 5 0 015 5v3h2v12H5V10h2V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3zm0 9a2 2 0 00-1 3.7V19h2v-2.3A2 2 0 0012 13z" },
  { id: "bell", path: "M12 2a6 6 0 016 6v5l2 3v1H4v-1l2-3V8a6 6 0 016-6zm-2 17h4a2 2 0 11-4 0z" },
  { id: "cloud", path: "M6.5 19a4.5 4.5 0 01-.6-9A6 6 0 0117.7 9 4.5 4.5 0 0117 19z" },
  { id: "tag", path: "M3 3h8l10 10-8 8L3 11zM7.5 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" },
  { id: "arrow", path: "M13 3l7 7h-5v11h-4V10H6z" },
];

export function IconPickerView({
  title,
  subtitle,
  mode,
}: {
  title: string;
  subtitle: string;
  mode: "png" | "svg";
}) {
  const t = useImageT();
  const [icon, setIcon] = useState<IconEntry>(ICONS[0]);
  const [size, setSize] = useState(32);
  const [stroke, setStroke] = useState(2);
  const [colour, setColour] = useState("#0f172a");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const svgMarkup = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${colour}" stroke="none"><path d="${icon.path}"/></svg>`,
    [icon, size, colour],
  );

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("svg"));
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          svgMarkup.replace('stroke="none"', `stroke="${colour}" stroke-width="${stroke}" stroke-linejoin="round"`),
        )}`;
      });
      ctx.drawImage(img, 0, 0, size, size);
    } catch {
      ctx.fillStyle = colour;
      ctx.font = `${Math.round(size / 2)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon.id.slice(0, 1).toUpperCase(), size / 2, size / 2);
    }
  }, [svgMarkup, size, colour, stroke, icon]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!cancelled) await draw();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const handleDownload = async () => {
    if (mode === "svg") {
      downloadBlob(
        new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
        `${icon.id}-favicon.svg`,
      );
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, `${icon.id}-${size}.png`);
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("iconLibrary")}
            </p>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {ICONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={entry.id}
                  onClick={() => setIcon(entry)}
                  className={`flex aspect-square items-center justify-center rounded-lg border p-2 ${
                    icon.id === entry.id
                      ? "border-sky-600 bg-sky-50 dark:bg-sky-950"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="size-6 fill-slate-700 dark:fill-slate-200">
                    <path d={entry.path} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("iconSize")}>
              <Select
                value={String(size)}
                onChange={(next) => setSize(Number(next))}
                options={[
                  { value: "16", label: "16 × 16" },
                  { value: "32", label: "32 × 32" },
                  { value: "48", label: "48 × 48" },
                  { value: "64", label: "64 × 64" },
                ]}
                ariaLabel={t("iconSize")}
              />
            </Field>
            <Field label={t("iconColour")}>
              <input
                type="text"
                value={colour}
                onChange={(event) => setColour(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </Field>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t("iconStroke")}</span>
              <span>{stroke}</span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={stroke}
              onChange={(event) => setStroke(Number(event.target.value))}
              className="w-full accent-sky-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setIcon(ICONS[0])}>{t("resetIcon")}</GhostButton>
          </div>
          <Note>{t("iconNote")}</Note>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
          <canvas
            ref={canvasRef}
            className="rounded-lg border border-slate-200 bg-white dark:border-slate-700"
          />
          <p className="font-mono text-xs text-slate-500">
            {icon.id} • {size} × {size}
          </p>
          {mode === "svg" ? (
            <CodeBlock label={t("svgOutput")} value={svgMarkup} />
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ data matrix -- */

export function DataMatrixView() {
  const t = useImageT();
  const [text, setText] = useState("12345678");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!text.trim()) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    try {
      const bwip = await import("bwip-js/browser");
      const api = (bwip as unknown as {
        toCanvas?: (
          canvas: HTMLCanvasElement,
          options: Record<string, unknown>,
        ) => HTMLCanvasElement;
        default?: {
          toCanvas: (
            canvas: HTMLCanvasElement,
            options: Record<string, unknown>,
          ) => HTMLCanvasElement;
        };
      });
      const toCanvas = api.toCanvas ?? api.default?.toCanvas;
      if (!toCanvas) throw new Error(t("dataMatrixUnavailable"));
      canvas.width = 320;
      canvas.height = 320;
      toCanvas(canvas, {
        bcid: "datamatrix",
        text,
        scale: 4,
        paddingwidth: 12,
        paddingheight: 12,
        backgroundcolor: "FFFFFF",
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [text, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!cancelled) await draw();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, "data-matrix.png");
  };

  return (
    <Panel title={t("dataMatrixTitle")} subtitle={t("dataMatrixSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("dataMatrixText")}>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Note>{t("dataMatrixNote")}</Note>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
          <canvas ref={canvasRef} className="max-w-full rounded-lg bg-white" />
          <p className="mt-2 text-xs text-slate-500">{t("dataMatrixOutput")}</p>
        </div>
      </div>
    </Panel>
  );
}
