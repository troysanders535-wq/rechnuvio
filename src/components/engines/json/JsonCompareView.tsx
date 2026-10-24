"use client";

import React, { useState, useMemo } from "react";
import {
  GitCompare,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Sparkles,
  Info
} from "lucide-react";
import { semanticCompare, DiffEntry } from "@/utils/jsonDiffCompare";
import { useTranslations } from "next-intl";

export function JsonCompareView() {
  const tUi = useTranslations("ui.engines.json.JsonCompareView");
  const sampleA = JSON.stringify(
    {
      appName: tUi("digitalToolPad"),
      version: "1.0.0",
      isProduction: false,
      toolsCount: 100,
      settings: {
        darkMode: true,
        autoSave: false,
      },
      tags: ["privacy", "offline"],
    },
    null,
    2
  );

  const sampleB = JSON.stringify(
    {
      version: "2.0.0",
      appName: tUi("digitalToolPad"),
      isProduction: true,
      toolsCount: 492,
      settings: {
        darkMode: true,
        autoSave: true,
        clientSide: true,
      },
      tags: ["privacy", "offline", "fast"],
    },
    null,
    2
  );

  const [inputA, setInputA] = useState(sampleA);
  const [inputB, setInputB] = useState(sampleB);
  const [ignoreKeyOrder, setIgnoreKeyOrder] = useState(true);
  const [copied, setCopied] = useState(false);

  // Parse and compare
  const comparison = useMemo(() => {
    let parsedA: any = null;
    let parsedB: any = null;
    let errorA = "";
    let errorB = "";

    try {
      parsedA = JSON.parse(inputA);
    } catch (err: any) {
      errorA = err.message || tUi("invalidJSONInDocumentA");
    }

    try {
      parsedB = JSON.parse(inputB);
    } catch (err: any) {
      errorB = err.message || tUi("invalidJSONInDocumentB");
    }

    if (errorA || errorB) {
      return {
        isValid: false,
        errorA,
        errorB,
        result: null,
      };
    }

    const result = semanticCompare(parsedA, parsedB, { ignoreKeyOrder });
    return {
      isValid: true,
      errorA: "",
      errorB: "",
      result,
    };
  }, [inputA, inputB, ignoreKeyOrder]);

  const handleSwap = () => {
    const temp = inputA;
    setInputA(inputB);
    setInputB(temp);
  };

  const handleCopyReport = () => {
    if (!comparison.result) return;
    const { metrics, differences } = comparison.result;
    const lines = [
      `JSON Comparison Report`,
      `======================`,
      `Status: ${metrics.areIdentical ? "Identical" : tUi("differencesDetected")}`,
      `Total Differences: ${metrics.totalDifferences}`,
      `Added: +${metrics.added}`,
      `Removed: -${metrics.removed}`,
      `Modified: ~${metrics.modified}`,
      `Type Mismatches: ${metrics.typeMismatch}`,
      ``,
      `Detailed Differences:`,
      ...differences.map(
        (d) =>
          `[${d.type}] ${d.path}: ${JSON.stringify(d.oldValue)} -> ${JSON.stringify(d.newValue)}`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>{tUi("swapAB")}</span>
          </button>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={ignoreKeyOrder}
              onChange={(e) => setIgnoreKeyOrder(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>{tUi("ignoreKeyOrder")}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            disabled={!comparison.isValid}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copiedReport") : tUi("copyReport")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInputA("");
              setInputB("");
            }}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            title={tUi("clearBothInputs")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        {!comparison.isValid ? (
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="size-4 flex-shrink-0" />
            <span>
              {comparison.errorA ? `Document A Error: ${comparison.errorA}` : ""}
              {comparison.errorA && comparison.errorB ? " | " : ""}
              {comparison.errorB ? `Document B Error: ${comparison.errorB}` : ""}
            </span>
          </div>
        ) : comparison.result?.metrics.areIdentical ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="size-4" />
            <span>{tUi("100SemanticallyIdenticalZeroDifferencesFoundBetweenDocumentAAndDocumentB")}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <AlertCircle className="size-4" />
              {comparison.result?.metrics.totalDifferences} {tUi("differencesDetected")}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              +{comparison.result?.metrics.added} {tUi("added")}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              -{comparison.result?.metrics.removed} {tUi("removed")}
            </span>
            <span className="text-sky-600 dark:text-sky-400">
              ~{comparison.result?.metrics.modified} {tUi("modified")}
            </span>
            {comparison.result?.metrics.typeMismatch ? (
              <span className="text-purple-600 dark:text-purple-400">
                !{comparison.result?.metrics.typeMismatch} {tUi("typeMismatch")}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Dual Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {tUi("documentAOriginal")}
          </div>
          <textarea
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder={tUi("pasteFirstJSONDocument")}
            rows={12}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-3 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            {tUi("documentBModifiedCompared")}
          </div>
          <textarea
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            placeholder={tUi("pasteSecondJSONDocument")}
            rows={12}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-3 font-mono text-xs leading-relaxed text-sky-400 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Differences Table */}
      {comparison.isValid && comparison.result && comparison.result.differences.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            {tUi("structuralDifferences")}{comparison.result.differences.length})
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="p-2.5">{tUi("type")}</th>
                  <th className="p-2.5">{tUi("path")}</th>
                  <th className="p-2.5">{tUi("documentA")}</th>
                  <th className="p-2.5">{tUi("documentB")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {comparison.result.differences.map((diff, idx) => {
                  let badgeColor = "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";
                  if (diff.type === "ADDED") badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                  else if (diff.type === "REMOVED") badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                  else if (diff.type === "TYPE_MISMATCH") badgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                          {diff.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {diff.path}
                      </td>
                      <td className="p-2.5 text-rose-600 dark:text-rose-400 max-w-xs truncate">
                        {diff.oldValue === undefined ? (
                          <span className="text-slate-400 italic">{tUi("none")}</span>
                        ) : (
                          JSON.stringify(diff.oldValue)
                        )}
                      </td>
                      <td className="p-2.5 text-emerald-600 dark:text-emerald-400 max-w-xs truncate">
                        {diff.newValue === undefined ? (
                          <span className="text-slate-400 italic">{tUi("none")}</span>
                        ) : (
                          JSON.stringify(diff.newValue)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
