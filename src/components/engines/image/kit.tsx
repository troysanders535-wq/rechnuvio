"use client";

/**
 * The shared parts of every image-suite workspace.
 *
 * The kit holds the chrome (panel, field, button, note) and the browser
 * helpers (canvas, file, download). It holds no behaviour of its own: every
 * tool configures it for its own purpose.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Trash2,
  Upload,
} from "lucide-react";

/** The translator of the image-suite namespace. */
export const useImageT = () => useTranslations("ui.engines.image");

export type ImageT = ReturnType<typeof useImageT>;

/* ------------------------------------------------------------------ chrome -- */

export function Panel({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {toolbar ? (
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        ) : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      {hint ? (
        <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const monoInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {children}
    </button>
  );
}

export function Note({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "ok";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
    warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  } as const;
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : Info;
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${tones[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="whitespace-pre-wrap">{children}</span>
    </p>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span className="whitespace-pre-wrap">{children}</span>
    </p>
  );
}

/** A labelled list of values. */
export function DataList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words font-mono text-xs text-slate-800 dark:text-slate-200">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A preformatted output with a copy button. */
export function CodeBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const t = useImageT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              },
              () => setCopied(false),
            );
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Copy className="size-3" />
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-200">
        {value}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ inputs -- */

/** The file input of a tool. The accept attribute is part of the contract. */
export function FilePicker({
  accept,
  onFile,
  label,
  hint,
}: {
  accept: string;
  onFile: (file: File) => void;
  label: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/60">
      <Upload className="mx-auto size-8 text-sky-700 dark:text-sky-400" />
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700">
        <Upload className="size-4" />
        <span>{label}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
          className="hidden"
        />
      </label>
    </div>
  );
}

/** The download button of a tool. */
export function DownloadButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="size-4" />
      {label}
    </button>
  );
}

/** A small chip that shows the size of a picture. */
export function SizeBadge({
  width,
  height,
  extra,
}: {
  width: number;
  height: number;
  extra?: string;
}) {
  return (
    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
      {width} × {height} px{extra ? ` • ${extra}` : ""}
    </span>
  );
}

/* --------------------------------------------------------------- utilities -- */

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Download raw bytes. */
export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime: string,
): void {
  downloadBlob(
    new Blob([bytes.buffer as ArrayBuffer], { type: mime }),
    filename,
  );
}

/** Encode a canvas, falling back to PNG when the browser refuses the type. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned no data"));
        },
        type,
        quality,
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Load an image element from a URL. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("the browser cannot decode this file"));
    img.src = src;
  });
}

/** Read a file as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("the file could not be read"));
    reader.readAsDataURL(file);
  });
}

/** Read a file as bytes. */
export function fileToBytes(file: File): Promise<Uint8Array> {
  return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

/** A human readable file size. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
