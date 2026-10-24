"use client";

import React, { useState, useMemo } from "react";
import {
  Code2,
  Copy,
  Download,
  Trash2,
  Sparkles,
  AlertCircle,
  FileCode
} from "lucide-react";
import { jsonToTypeScript } from "@/utils/jsonToTs";
import { useTranslations } from "next-intl";

export function JsonToTsView() {
  const tUi = useTranslations("ui.engines.json.JsonToTsView");
  const sampleJson = JSON.stringify(
    {
      id: 1,
      name: tUi("leanneGraham"),
      username: "Bret",
      email: "Sincere@april.biz",
      address: {
        street: tUi("kulasLight"),
        suite: tUi("apt556"),
        city: "Gwenborough",
        zipcode: "92998-3874",
        geo: {
          lat: "-37.3159",
          lng: "81.1496",
        },
      },
      phone: tUi("17707368031X56442"),
      website: "hildegard.org",
      company: {
        name: "Romaguera-Crona",
        catchPhrase: tUi("multiLayeredClientServerNeuralNet"),
        bs: "harness real-time e-markets",
      },
      roles: ["admin", "super-admin"],
      active: true,
    },
    null,
    2
  );

  const [input, setInput] = useState(sampleJson);
  const [rootName, setRootName] = useState("UserResponse");
  const [declarationType, setDeclarationType] = useState<"interface" | "type">("interface");
  const [exportDeclarations, setExportDeclarations] = useState(true);
  const [optionalProperties, setOptionalProperties] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { code: "", error: "" };
    try {
      const parsed = JSON.parse(input);
      const tsCode = jsonToTypeScript(parsed, {
        rootName,
        declarationType,
        exportDeclarations,
        optionalProperties,
      });
      return { code: tsCode, error: "" };
    } catch (err: any) {
      return { code: "", error: err.message || tUi("invalidJSONSyntax") };
    }
  }, [input, rootName, declarationType, exportDeclarations, optionalProperties]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rootName.toLowerCase() || "types"}.d.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Options Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{tUi("rootName")}</span>
            <input
              type="text"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none w-32"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{tUi("kind")}</span>
            <select
              value={declarationType}
              onChange={(e) => setDeclarationType(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="interface">interface</option>
              <option value="type">{tUi("typeAlias")}</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={exportDeclarations}
              onChange={(e) => setExportDeclarations(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>{tUi("export")}</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={optionalProperties}
              onChange={(e) => setOptionalProperties(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>{tUi("optionalNulls")}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result.code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copiedTS") : tUi("copyTypeScript")}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!result.code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{tUi("downloadDTs")}</span>
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

      {result.error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Dual Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {tUi("jSONInputSample")}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tUi("pasteYourJSONHereToGenerateTypeScriptTypes")}
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <span>{tUi("generatedTypeScriptDeclarations")}</span>
            <FileCode className="size-3.5 text-sky-500" />
          </div>
          <textarea
            value={result.code}
            readOnly
            placeholder={tUi("typeScriptInterfaceCodeWillGenerateHereAutomatically")}
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-400 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
