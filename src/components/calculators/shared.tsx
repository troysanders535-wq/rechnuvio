"use client";

import React, { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { parseLocaleNumber } from "@/utils/numberFormat";
import { parseDate } from "./calc";

/**
 * Parses a user typed number, accepting both "12.5" and "12,5".
 */
export function num(value: string | number): number {
  return parseLocaleNumber(value);
}

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const selectClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function CalcPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            {icon}
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-6 p-5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  step = "any",
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  step?: string;
  id?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

/**
 * A date input that can be typed ("2026-10-24" or "24.10.2026") or picked from
 * the calendar of the browser. The typed text is kept as is while the user
 * edits it; callers parse it with parseDate().
 */
export function DateField({
  label,
  value,
  onChange,
  hint,
  id,
  calendarLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  id?: string;
  calendarLabel: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const parsed = parseDate(value);
  const isoValue = parsed
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
    : "";
  const invalid = value.trim() !== "" && !parsed;

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-11 ${invalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/30" : ""}`}
        />
        <button
          type="button"
          aria-label={calendarLabel}
          title={calendarLabel}
          onClick={() => {
            const input = picker.current;
            if (!input) return;
            if (typeof input.showPicker === "function") input.showPicker();
            else input.click();
          }}
          className="absolute bottom-1.5 right-1.5 flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-800"
        >
          <CalendarDays className="size-4" />
        </button>
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={isoValue}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        />
      </div>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  id?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  id,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  id?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={selectClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function NumberListField({
  label,
  value,
  onChange,
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  id?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        rows={4}
        placeholder="12, 15, 23, 27, 34"
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-mono text-sm`}
      />
    </Field>
  );
}

/** Parses a comma / whitespace separated list of numbers. */
export function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseLocaleNumber(part))
    .filter((n) => Number.isFinite(n));
}

export function ResultCard({
  label,
  value,
  unit,
  tone = "sky",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "sky" | "emerald" | "amber" | "slate";
  hint?: string;
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
    emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    slate: "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white",
  } as const;

  return (
    <div className={`rounded-xl p-4 text-center ${tones[tone]}`}>
      <span className="block text-2xl font-extrabold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold">{unit}</span> : null}
      </span>
      <span className="mt-1 block text-xs font-medium opacity-80">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] opacity-70">{hint}</span> : null}
    </div>
  );
}

export function ResultGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function FormulaNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:bg-slate-950 dark:text-slate-400">
      {children}
    </p>
  );
}

export function DetailList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {item.label}
          </dt>
          <dd className="text-right font-mono text-xs font-semibold text-slate-900 dark:text-white">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Rounds for display without trailing floating point noise. */
export function round(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
