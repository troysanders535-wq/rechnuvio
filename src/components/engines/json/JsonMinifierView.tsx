"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Minimize2,
  Copy,
  Download,
  Trash2,
  AlertCircle,
  Zap
} from "lucide-react";

export function JsonMinifierView() {
  const tUi = useTranslations("ui.engines.json.JsonMinifierView");
  const sampleJson = JSON.stringify(
    {
      appName: tUi("digitalToolPad"),
      version: "2.0.0",
      description: tUi("fastSecureClientSideDeveloperUtilitySuite"),
      features: [
        tUi("clientSideProcessing"),
        tUi("zeroServerUploads"),
        tUi("zeroTelemetry"),
        tUi("subMillisecondExecution")
      ],
      stats: {
        totalTools: 492,
        monthlyUsers: 150000,
        averageLatencyMs: 0
      },
      tags: ["developer", "json", "minifier", "offline", "privacy"]
    },
    null,
    2
  );

  const [input, setInput] = useState(sampleJson);
  const [copied, setCopied] = useState(false);

  const minification = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", originalBytes: 0, minifiedBytes: 0, savedBytes: 0, savedPct: 0 };
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      const origBytes = new Blob([input]).size;
      const minBytes = new Blob([minified]).size;
      const saved = Math.max(0, origBytes - minBytes);
      const pct = origBytes > 0 ? Math.round((saved / origBytes) * 100) : 0;

      return {
        output: minified,
        error: "",
        originalBytes: origBytes,
        minifiedBytes: minBytes,
        savedBytes: saved,
        savedPct: pct,
      };
    } catch (err: any) {
      return {
        output: "",
        error: err.message || tUi("invalidJSONSyntax"),
        originalBytes: new Blob([input]).size,
        minifiedBytes: 0,
        savedBytes: 0,
        savedPct: 0,
      };
    }
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(minification.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([minification.output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.min.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white">
            <Minimize2 className="size-3.5" />
            <span>{tUi("instantMinifier")}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!minification.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copiedMinifiedJSON") : tUi("copyMinifiedJSON")}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!minification.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{tUi("downloadMinJson")}</span>
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

      {/* Savings Metric Banner */}
      {minification.savedPct > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="size-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600" />
            <span>Compression: Reduced file size by {minification.savedPct}%!</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Original: {minification.originalBytes} B</span>
            <span>→</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              Minified: {minification.minifiedBytes} B
            </span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              {tUi("saved")} {minification.savedBytes} B
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {minification.error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{minification.error}</span>
        </div>
      )}

      {/* Dual Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {tUi("formattedInput")}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tUi("pasteJSONHere")}
            rows={14}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {tUi("minifiedOutputSingleLine")}
          </div>
          <textarea
            value={minification.output}
            readOnly
            placeholder={tUi("minifiedJSONWillAppearHere")}
            rows={14}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-400 outline-none placeholder:text-slate-600 break-all"
          />
        </div>
      </div>
    </div>
  );
}
