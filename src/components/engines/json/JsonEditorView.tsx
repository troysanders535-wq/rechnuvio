"use client";

import React, { useState, useMemo } from "react";
import {
  Code2,
  FolderTree,
  Sparkles,
  Minimize2,
  Copy,
  Download,
  Upload,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { JsonTreeViewer } from "./JsonTreeViewer";
import { deepSortKeys } from "@/utils/jsonDiffCompare";

export function JsonEditorView() {
  const defaultSample = JSON.stringify(
    {
      appName: "Digital ToolPad",
      version: "2.0.0",
      editor: {
        syntaxTheme: "dark-emerald",
        liveValidation: true,
        treeInspector: true,
      },
      toolsCatalog: [
        { id: 1, name: "JSON Formatter", category: "Data Formats" },
        { id: 2, name: "JSON Validator", category: "Data Formats" },
        { id: 3, name: "JSON Viewer", category: "Data Formats" }
      ],
      privacy: {
        telemetry: false,
        clientSide: true
      }
    },
    null,
    2
  );

  const [input, setInput] = useState(defaultSample);
  const [activeTab, setActiveTab] = useState<"code" | "tree">("code");
  const [indent, setIndent] = useState<number | "tab">(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);

  const parsedData = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      return { isValid: true, data: parsed, error: "" };
    } catch (err: any) {
      return { isValid: false, data: null, error: err.message || "Invalid JSON syntax" };
    }
  }, [input]);

  const handleFormat = () => {
    try {
      let parsed = JSON.parse(input);
      if (sortKeys) parsed = deepSortKeys(parsed);
      const spacer = indent === "tab" ? "\t" : indent;
      setInput(JSON.stringify(parsed, null, spacer));
    } catch {}
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch {}
  };

  const handleReplace = () => {
    if (!findText) return;
    setInput((prev) => prev.replaceAll(findText, replaceText));
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
    a.download = "edited.json";
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
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "code"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Code2 className="size-3.5" />
              <span>Code Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tree")}
              disabled={!parsedData.isValid}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                activeTab === "tree"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FolderTree className="size-3.5" />
              <span>Tree View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFormat}
            disabled={!parsedData.isValid}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700 disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            <span>Format</span>
          </button>

          <button
            type="button"
            onClick={handleMinify}
            disabled={!parsedData.isValid}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Minimize2 className="size-3.5" />
            <span>Minify</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFindReplace(!showFindReplace)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Search className="size-3.5" />
            <span>Find & Replace</span>
          </button>

          <select
            value={indent}
            onChange={(e) => setIndent(e.target.value === "tab" ? "tab" : Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
            <option value="tab">Tabs</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Open file</span>
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
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
            title="Clear"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100/80 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950">
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find text..."
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleReplace}
            className="rounded-lg bg-sky-700 px-3 py-1 font-semibold text-white hover:bg-sky-800"
          >
            Replace All
          </button>
        </div>
      )}

      {/* Validation Status */}
      <div className="border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800">
        {parsedData.isValid ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-4" />
            <span>Valid JSON Syntax</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="size-4 flex-shrink-0" />
            <span>{parsedData.error}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === "code" ? (
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or write JSON here..."
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600 selection:bg-sky-900 selection:text-white"
          />
        </div>
      ) : (
        <div className="p-4 bg-slate-950">
          {parsedData.data && <JsonTreeViewer data={parsedData.data} />}
        </div>
      )}
    </div>
  );
}
