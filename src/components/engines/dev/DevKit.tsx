"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Copy, Trash2 } from "lucide-react";

/**
 * The shared chrome of every developer-suite workspace.
 *
 * Each tool gets its own panel, its own controls and its own result, so the
 * workspace always belongs to the tool that was opened.
 */

export const devInputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const devButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-700 dark:hover:bg-sky-600";

export const devGhostButtonClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

/** The frame of a developer tool: a title, a toolbar and a body. */
export function DevPanel({
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

/** The editor of a developer tool: a monospaced text area. */
export function DevEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 14,
  readOnly,
  inputRef,
}: {
  id?: string;
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      id={id}
      ref={inputRef}
      value={value}
      readOnly={readOnly}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      spellCheck={false}
      className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-sky-300 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
    />
  );
}

/** The result area of a developer tool. */
export function DevOutput({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      ) : null}
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {children}
      </pre>
    </div>
  );
}

/** A green "this worked" message. */
export function DevOk({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** A red "this did not work" message. */
export function DevError({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span className="whitespace-pre-wrap">{children}</span>
    </p>
  );
}

/** A copy-to-clipboard button that confirms the copy. */
export function DevCopyButton({
  value,
  label,
}: {
  value: string;
  label: { copy: string; copied: string };
}) {
  const [copied, setCopied] = React.useState(false);
  return (
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
      className={devGhostButtonClass}
    >
      <Copy className="size-3.5" />
      {copied ? label.copied : label.copy}
    </button>
  );
}

/** A button that empties the editor. */
export function DevClearButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} className={devGhostButtonClass}>
      <Trash2 className="size-3.5" />
      {label}
    </button>
  );
}

/** A labelled control row. */
export function DevField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      {children}
    </label>
  );
}

/** A small select control. */
export function DevSelect({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={
        className ??
        "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
