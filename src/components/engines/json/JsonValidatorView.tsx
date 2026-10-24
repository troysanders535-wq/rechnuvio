"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  Copy,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Minimize2
} from "lucide-react";
import { validateJson, autoRepairJson } from "@/utils/jsonValidator";
import { useTranslations } from "next-intl";

export function JsonValidatorView() {
  const tUi = useTranslations("ui.engines.json.JsonValidatorView");
  const defaultSample = JSON.stringify(
    {
      name: tUi("digitalToolPad"),
      version: "2.0.0",
      valid: true,
      settings: {
        theme: "system",
        privacy: tUi("100ClientSide"),
      },
      tags: ["json", "validation", "client-side"],
    },
    null,
    2
  );

  const [input, setInput] = useState(defaultSample);
  const [copied, setCopied] = useState(false);
  const [repairedSuccess, setRepairedSuccess] = useState(false);

  const validation = useMemo(() => {
    return validateJson(input);
  }, [input]);

  const handleAutoRepair = () => {
    const repaired = autoRepairJson(input);
    try {
      const parsed = JSON.parse(repaired);
      setInput(JSON.stringify(parsed, null, 2));
      setRepairedSuccess(true);
      setTimeout(() => setRepairedSuccess(false), 3000);
    } catch {
      setInput(repaired);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {}
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([input], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "validated.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInput(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            disabled={!validation.isValid}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700 disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            <span>{tUi("format")}</span>
          </button>
          <button
            type="button"
            onClick={handleMinify}
            disabled={!validation.isValid}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Minimize2 className="size-3.5" />
            <span>{tUi("minify")}</span>
          </button>

          {!validation.isValid && (
            <button
              type="button"
              onClick={handleAutoRepair}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition animate-pulse"
            >
              <Wrench className="size-3.5" />
              <span>{tUi("autoRepairSyntax")}</span>
            </button>
          )}

          {repairedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {tUi("repairedFormatted")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">{tUi("openFile")}</span>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{tUi("download")}</span>
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
            title={tUi("clear")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Validation Status Banner */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        {validation.isValid ? (
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="size-5" />
              <span>{tUi("validJSONSyntax")}</span>
            </div>
            {validation.stats && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("size")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.bytes} {tUi("bytes")}</div>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("lines")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.lines}</div>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("keys")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.keysCount}</div>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("arrays")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.arraysCount}</div>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("depth")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.depth}</div>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">{tUi("characters")}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{validation.stats.characters}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="size-5 flex-shrink-0" />
              <span>{tUi("invalidJSONSyntaxErrorOnLine")} {validation.error?.line}, Column {validation.error?.column}</span>
            </div>
            <p className="mt-1 text-xs text-rose-500 font-mono">
              {validation.error?.message}
            </p>

            {validation.error?.contextSnippet !== undefined && (
              <div className="mt-2 rounded-lg bg-slate-900 p-2.5 font-mono text-xs text-slate-200 border border-rose-900/50">
                <div className="text-[10px] text-slate-500 mb-1">Error Location:</div>
                <div className="text-rose-300 whitespace-pre">{validation.error.contextSnippet}</div>
                <div className="text-rose-500 font-bold whitespace-pre">{validation.error.pointer}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tUi("pasteJSONToValidate")}
          rows={16}
          spellCheck={false}
          className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600 selection:bg-sky-900 selection:text-white"
        />
      </div>
    </div>
  );
}
