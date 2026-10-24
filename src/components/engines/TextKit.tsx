"use client";

/**
 * Shared presentational primitives for the text-suite tool workspaces.
 *
 * IMPORTANT: this file intentionally contains no user-visible literal text.
 * Every label is passed in as a prop so that the i18n codemod
 * (scripts/audit/apply-ui-i18n.mjs) can own the strings per workspace file.
 */

import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

const PANEL =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${PANEL} ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h3>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

export function ButtonGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 bg-slate-50 text-center sm:grid-cols-3 sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function StatCard({
  value,
  label,
  tone = "default",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="p-3">
      <span className={`text-xl font-extrabold ${toneClass}`}>{value}</span>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 12,
  placeholder,
  readOnly = false,
  mono = true,
}: {
  id?: string;
  value: string;
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      readOnly={readOnly}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value, e)}
      className={`w-full resize-y bg-slate-950 p-4 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600 ${
        mono ? "font-mono" : "font-sans"
      }`}
    />
  );
}

export function ResultBox({
  id,
  value,
  rows = 10,
}: {
  id?: string;
  value: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      readOnly
      rows={rows}
      className="w-full resize-y bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
    />
  );
}

export function ActionButton({
  children,
  onClick,
  title,
  variant = "default",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: "default" | "primary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    variant === "primary"
      ? "inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
  return (
    <button type={type} onClick={onClick} title={title} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  title,
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  title?: string;
}) {
  const t = useTranslations("ui.engines.TextKit");
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);
  return (
    <ActionButton onClick={onCopy} title={title}>
      {copied ? (copiedLabel ?? t("copied")) : label}
    </ActionButton>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT}
    />
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      id={id}
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={INPUT}
    />
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
      />
      {label}
    </label>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      {children}
    </p>
  );
}

export function TwoColumn({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 p-4 md:grid-cols-2">{children}</div>;
}

export function FilePicker({
  id,
  accept,
  onFile,
  label,
}: {
  id?: string;
  accept: string;
  onFile: (file: File) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function DownloadButton({
  filename,
  content,
  mime,
  label,
}: {
  filename: string;
  content: BlobPart;
  mime: string;
  label: string;
}) {
  const onDownload = () => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return <ActionButton onClick={onDownload}>{label}</ActionButton>;
}
