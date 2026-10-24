"use client";

import React, { useSyncExternalStore } from "react";

/**
 * The shared chrome of every randomizer and games workspace.
 *
 * The family owns 50 tools and every one of them gets its own panel: this
 * module only carries the frame (title, toolbar, body), the form controls and
 * the unbiased random source that all of them share.
 */

/* --------------------------------------------------------------- classes --- */

export const randInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const randAreaClass = `${randInputClass} min-h-32 resize-y`;

export const randSelectClass =
  "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

export const randPrimaryButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600";

export const randGhostButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

/* ---------------------------------------------------------------- panel --- */

/** The frame of a randomizer workspace: a title, a toolbar and a body. */
export function RandPanel({
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
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

/** A labelled control row. */
export function RandField({
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
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** A small read-only result line. */
export function RandResult({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- helpers --- */

/**
 * True once the component has mounted in the browser.
 *
 * The workspaces that draw random content must not draw it while the page is
 * still being rendered on the server: the server and the browser would draw
 * two different results and React would report a hydration mismatch. The
 * random content is therefore rendered after the mount.
 *
 * The flag is read from the store of React itself, so the component does not
 * need an effect that would cause a second render.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/** The mounted flag never changes, so the subscription does nothing. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * A uniformly distributed integer in [0, maxExclusive).
 *
 * The value comes from the browser's cryptographic random source, and the
 * modulo bias is removed by rejecting the values that fall outside the last
 * complete range.
 */
export function cryptoRandomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
  const range = 4294967296;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % maxExclusive;
}

/** A shuffled copy of the given items. */
export function cryptoShuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = cryptoRandomInt(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** One random item of the list, or null when the list is empty. */
export function cryptoPick<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[cryptoRandomInt(items.length)];
}

/** The non-empty lines of a textarea. */
export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The names that occur more than once in a list.
 *
 * The list generators never drop a repeated name: every line the user typed
 * is dealt once. They only tell the user which names stand in the list more
 * than once, so a typo is found before the split is used.
 */
export function findDuplicateNames(names: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
}

/**
 * One cell of a CSV file.
 *
 * A value that holds a comma, a quote or a line break has to be quoted, or
 * the columns of the file would break apart.
 */
export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Offer a CSV file to the browser.
 *
 * The family exports its lists the same way everywhere: the rows are joined
 * with line breaks, the file is handed over to a temporary link and the
 * object URL is revoked right after the click.
 */
export function downloadCsv(filename: string, rows: readonly string[]): void {
  const blob = new Blob([`${rows.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Open the browser print dialog, which can also save the page as a PDF. */
export function printPage(): void {
  if (typeof window === "undefined") return;
  window.print();
}
