"use client";

import React from "react";

/**
 * The shared chrome of every device-tester workspace.
 *
 * Each tool gets its own panel, its own controls and its own result, so the
 * workspace always belongs to the tool that was opened.
 */

export const deviceInputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const deviceSelectClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const deviceButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 dark:bg-sky-700 dark:hover:bg-sky-600";

export const deviceGhostButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

export const deviceFieldLabelClass =
  "block text-xs font-semibold text-slate-700 dark:text-slate-300";

export const deviceStatClass =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60";

/** The frame of a device tool: a title, a toolbar and a body. */
export function DevicePanel({
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

/** A labelled control. */
export function DeviceField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={deviceFieldLabelClass} htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}

/** One measured value with its label. */
export function DeviceStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={deviceStatClass}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
