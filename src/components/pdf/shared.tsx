"use client";

import React, { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/* ------------------------------------------------------------------ */
/* File helpers                                                        */
/* ------------------------------------------------------------------ */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadBytes(
  bytes: Uint8Array | ArrayBuffer,
  filename: string,
  mime = "application/pdf",
): void {
  const view =
    bytes instanceof Uint8Array
      ? bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer
      : bytes;
  downloadBlob(new Blob([view], { type: mime }), filename);
}

/** Strips the extension so we can build `name-merged.pdf` style filenames. */
export function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "");
}

/* ------------------------------------------------------------------ */
/* UI primitives                                                       */
/* ------------------------------------------------------------------ */

export function Workspace({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function DropZone({
  accept,
  multiple = false,
  label,
  hint,
  onFiles,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (list: FileList | null) => {
      if (!list || disabled) return;
      const files = Array.from(list).filter((f) => f.size > 0);
      if (files.length) onFiles(files);
    },
    [disabled, onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
        dragging
          ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
          : "border-slate-300 dark:border-slate-700"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {hint ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function FileList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove?: (index: number) => void;
}) {
  const tUi = useTranslations("ui.pdf.shared");
  if (!files.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60"
        >
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
            {file.name}
          </span>
          <span className="ml-3 flex shrink-0 items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatBytes(file.size)}
            </span>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                {tUi("remove")}
              </button>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "primary" | "success";
}) {
  const tUi = useTranslations("ui.pdf.shared");
  const base =
    "rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60";
  const skin =
    tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-sky-600 hover:bg-sky-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`${base} ${skin}`}
    >
      {busy ? tUi("working") : children}
    </button>
  );
}

export function Status({
  error,
  info,
}: {
  error?: string | null;
  info?: string | null;
}) {
  if (!error && !info) return null;
  if (error) {
    return (
      <p
        role="alert"
        className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {error}
      </p>
    );
  }
  return (
    <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
      {info}
    </p>
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
    <label className="block text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export const selectClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export const textareaClass = `${inputClass} min-h-32 font-mono`;

/* ------------------------------------------------------------------ */
/* Page range parsing                                                  */
/* ------------------------------------------------------------------ */

/**
 * Parses a human page range such as "1-3, 5, 8-10" into zero-based indices.
 * Returns null when the expression is malformed.
 */
export function parsePageRanges(
  input: string,
  pageCount: number,
): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const out: number[] = [];
  const seen = new Set<number>();

  for (const chunk of trimmed.split(",")) {
    const part = chunk.trim();
    if (!part) continue;

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = part.match(/^(\d+)$/);

    let from: number;
    let to: number;

    if (range) {
      from = Number(range[1]);
      to = Number(range[2]);
    } else if (single) {
      from = Number(single[1]);
      to = from;
    } else {
      return null;
    }

    if (from < 1 || to < from || to > pageCount) return null;

    for (let p = from; p <= to; p += 1) {
      const idx = p - 1;
      if (!seen.has(idx)) {
        seen.add(idx);
        out.push(idx);
      }
    }
  }

  return out.length ? out : null;
}
