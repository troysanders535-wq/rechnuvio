"use client";

import React from "react";

/**
 * The shared chrome of every time-calendar workspace.
 *
 * Each tool gets its own panel, its own controls and its own result, so the
 * workspace always belongs to the tool that was opened.
 */

export const timeInputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const timeSelectClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const timeButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 dark:bg-sky-700 dark:hover:bg-sky-600";

export const timeGhostButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

export const timeFieldLabelClass =
  "block text-xs font-semibold text-slate-700 dark:text-slate-300";

export const timeOutputClass =
  "max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

/** The frame of a time tool: a title, a toolbar and a body. */
export function TimePanel({
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
export function TimeField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={timeFieldLabelClass} htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}

/* ------------------------------------------------------------- date helpers -- */

const LOCALE_TAG: Record<string, string> = { en: "en-US", de: "de-DE" };

/** The locale tag of the page. */
export function localeTag(locale: string): string {
  return LOCALE_TAG[locale] || (locale.startsWith("de") ? "de-DE" : "en-US");
}

/** A long date, for example "Friday, 1 January 2027". */
export function formatLongDate(date: Date, locale: string): string {
  return date.toLocaleDateString(localeTag(locale), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** A date and a time, for example "1 January 2027, 09:30". */
export function formatDateTime(date: Date, locale: string): string {
  return date.toLocaleString(localeTag(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A clock, for example "09:30:15". */
export function formatClock(date: Date, locale: string): string {
  return date.toLocaleTimeString(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

/** The clock of a time zone, for example "09:30:15" in Berlin. */
export function formatClockInZone(date: Date, locale: string, timeZone: string): string {
  return date.toLocaleTimeString(localeTag(locale), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

/** A date and a time of a time zone, for example "1 January 2027, 09:30" in Berlin. */
export function formatDateTimeInZone(date: Date, locale: string, timeZone: string): string {
  return date.toLocaleString(localeTag(locale), {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** The ISO date of a day, used for the date inputs. */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The nth weekday of a month, for example the 4th Thursday of November. */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

/** The last weekday of a month, for example the last Monday of May. */
export function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}
