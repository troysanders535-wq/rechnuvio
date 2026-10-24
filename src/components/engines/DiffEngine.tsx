"use client";

import React, { useState } from "react";
import * as Diff from "diff";
import { Copy, Sparkles, Trash2, GitCompare } from "lucide-react";
import { JsonCompareView } from "./json/JsonCompareView";
import { useTranslations } from "next-intl";

interface DiffEngineProps {
  slug: string;
}

export function DiffEngine({ slug }: DiffEngineProps) {
  const tUi = useTranslations("ui.engines.DiffEngine");
  // If semantic compare, render dedicated semantic compare engine
  if (slug === "json-diff-compare") {
    return <JsonCompareView />;
  }

  const sampleOriginal = `{\n  "name": "Digital ToolPad",\n  "version": "1.0.0",\n  "offlineMode": false,\n  "tools": 100\n}`;
  const sampleModified = `{\n  "name": "Digital ToolPad Pro",\n  "version": "2.0.0",\n  "offlineMode": true,\n  "tools": 492,\n  "privacy": "100% Client-Side"\n}`;

  const [textA, setTextA] = useState(sampleOriginal);
  const [textB, setTextB] = useState(sampleModified);
  const [diffResult, setDiffResult] = useState<Diff.Change[]>([]);
  const [diffMode, setDiffMode] = useState<"lines" | "words">("lines");

  const runDiff = () => {
    if (diffMode === "lines") {
      const diff = Diff.diffLines(textA, textB);
      setDiffResult(diff);
    } else {
      const diff = Diff.diffWords(textA, textB);
      setDiffResult(diff);
    }
  };

  React.useEffect(() => {
    runDiff();
  }, [textA, textB, diffMode]);

  const handleBeautifyBoth = () => {
    try {
      const parsedA = JSON.parse(textA);
      setTextA(JSON.stringify(parsedA, null, 2));
    } catch {}
    try {
      const parsedB = JSON.parse(textB);
      setTextB(JSON.stringify(parsedB, null, 2));
    } catch {}
  };

  const addedCount = diffResult.filter((d) => d.added).length;
  const removedCount = diffResult.filter((d) => d.removed).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runDiff}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <GitCompare className="size-3.5" />
            <span>{tUi("compareDiffs")}</span>
          </button>

          <button
            type="button"
            onClick={handleBeautifyBoth}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Sparkles className="size-3.5" />
            <span>{tUi("beautifyBoth")}</span>
          </button>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setDiffMode("lines")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                diffMode === "lines"
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {tUi("lineDiff")}
            </button>
            <button
              onClick={() => setDiffMode("words")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                diffMode === "words"
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {tUi("wordDiff")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="size-2 rounded-full bg-emerald-500" />
            +{addedCount} additions
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
            <span className="size-2 rounded-full bg-rose-500" />
            -{removedCount} deletions
          </span>
          <button
            type="button"
            onClick={() => {
              setTextA("");
              setTextB("");
            }}
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title={tUi("clearAll")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Input Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("originalJSONText")}
          </div>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            rows={8}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-slate-200 outline-none"
          />
        </div>
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("modifiedJSONText")}
          </div>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            rows={8}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-slate-200 outline-none"
          />
        </div>
      </div>

      {/* Live Diff Output */}
      <div className="border-t border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed">
        <div className="mb-2 text-xs font-semibold text-slate-400">
          {tUi("diffVisualizer")}
        </div>
        <div className="max-h-96 overflow-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          {diffResult.map((part, index) => {
            const colorClass = part.added
              ? "bg-emerald-950/80 text-emerald-300 border-l-2 border-emerald-500 px-1 inline-block w-full"
              : part.removed
              ? "bg-rose-950/80 text-rose-300 border-l-2 border-rose-500 line-through px-1 inline-block w-full"
              : "text-slate-400 inline-block w-full";
            return (
              <span key={index} className={colorClass}>
                {part.value}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
