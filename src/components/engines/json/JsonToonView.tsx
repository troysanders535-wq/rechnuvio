"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowRightLeft,
  Sparkles,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react";
import { jsonToToon, toonToJson, estimateTokens } from "@/utils/toon";
import { useTranslations } from "next-intl";

interface JsonToonViewProps {
  slug: string;
}

export function JsonToonView({ slug }: JsonToonViewProps) {
  const tUi = useTranslations("ui.engines.json.JsonToonView");
  const isToonToJsonMode = slug === "toon-to-json";

  const sampleJsonObj = {
    appName: tUi("digitalToolPad"),
    version: "2.0.0",
    features: [tUi("zeroServerUploads"), "Private", "Fast"],
    users: [
      { id: 1, name: "Alice", role: "admin", department: "Engineering" },
      { id: 2, name: "Bob", role: "developer", department: "Engineering" },
      { id: 3, name: "Charlie", role: "designer", department: "Product" },
    ],
  };

  const sampleJsonStr = JSON.stringify(sampleJsonObj, null, 2);
  const sampleToonStr = jsonToToon(sampleJsonObj);

  const [mode, setMode] = useState<"json-to-toon" | "toon-to-json">(
    isToonToJsonMode ? "toon-to-json" : "json-to-toon"
  );

  const [input, setInput] = useState(
    isToonToJsonMode ? sampleToonStr : sampleJsonStr
  );
  const [copied, setCopied] = useState(false);

  // Conversion logic
  const conversion = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", tokensInput: 0, tokensOutput: 0, savingsPct: 0 };
    }

    try {
      if (mode === "json-to-toon") {
        const parsed = JSON.parse(input);
        const toon = jsonToToon(parsed);
        const tokensIn = estimateTokens(input);
        const tokensOut = estimateTokens(toon);
        const diff = tokensIn - tokensOut;
        const pct = tokensIn > 0 ? Math.round((diff / tokensIn) * 100) : 0;
        return {
          output: toon,
          error: "",
          tokensInput: tokensIn,
          tokensOutput: tokensOut,
          savingsPct: pct,
        };
      } else {
        const decoded = toonToJson(input);
        const jsonStr = JSON.stringify(decoded, null, 2);
        const tokensIn = estimateTokens(input);
        const tokensOut = estimateTokens(jsonStr);
        return {
          output: jsonStr,
          error: "",
          tokensInput: tokensIn,
          tokensOutput: tokensOut,
          savingsPct: 0,
        };
      }
    } catch (err: any) {
      return {
        output: "",
        error: err.message || tUi("conversionError"),
        tokensInput: 0,
        tokensOutput: 0,
        savingsPct: 0,
      };
    }
  }, [input, mode]);

  const handleSwitchMode = () => {
    if (conversion.output && !conversion.error) {
      setInput(conversion.output);
    }
    setMode((m) => (m === "json-to-toon" ? "toon-to-json" : "json-to-toon"));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(conversion.output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isToon = mode === "json-to-toon";
    const filename = isToon ? "output.toon" : "output.json";
    const blob = new Blob([conversion.output || input], {
      type: isToon ? "text/plain" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchMode}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>
              {mode === "json-to-toon"
                ? tUi("modeJSONTOON")
                : tUi("modeTOONJSON")}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!conversion.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copied") : tUi("copyOutput")}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!conversion.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
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

      {/* Token Savings Banner */}
      {mode === "json-to-toon" && conversion.savingsPct > 0 && (
        <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="size-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600" />
            <span>{tUi("tokenReduction", { saved: conversion.savingsPct })}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>{tUi("tokensJson", { count: conversion.tokensInput })}</span>
            <span>→</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {tUi("tokensToon", { count: conversion.tokensOutput })}
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {conversion.error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{conversion.error}</span>
        </div>
      )}

      {/* Dual Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {mode === "json-to-toon" ? tUi("jSONInput") : tUi("tOONInput")}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "json-to-toon"
                ? tUi("pasteJsonHere")
                : tUi("pasteToonNotationHere")
            }
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {mode === "json-to-toon" ? tUi("tOONOutputCompact") : tUi("jSONOutput")}
          </div>
          <textarea
            value={conversion.output}
            readOnly
            placeholder={tUi("convertedResultWillAppearHere")}
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-400 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
