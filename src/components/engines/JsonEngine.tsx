"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  Copy,
  Download,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Sparkles
} from "lucide-react";
import { JsonCompareView } from "./json/JsonCompareView";
import { JsonValidatorView } from "./json/JsonValidatorView";
import { JsonEditorView } from "./json/JsonEditorView";
import { JsonMinifierView } from "./json/JsonMinifierView";
import { JsonToonView } from "./json/JsonToonView";
import { JsonToTsView } from "./json/JsonToTsView";
import { JsonTreeViewer } from "./json/JsonTreeViewer";
import { deepSortKeys } from "@/utils/jsonDiffCompare";

interface JsonEngineProps {
  slug: string;
}

export function JsonEngine({ slug }: JsonEngineProps) {
  // Route to specialized views based on slug
  if (slug === "json-compare") {
    return <JsonCompareView />;
  }

  if (slug === "json-validator") {
    return <JsonValidatorView />;
  }

  if (slug === "json-editor") {
    return <JsonEditorView />;
  }

  if (slug === "json-minifier") {
    return <JsonMinifierView />;
  }

  if (
    slug === "json-to-toon" ||
    slug === "json-to-toon-converter" ||
    slug === "toon-to-json"
  ) {
    return <JsonToonView slug={slug} />;
  }

  if (
    slug === "json-to-ts" ||
    slug === "json-to-typescript" ||
    slug === "json-to-typescript-interface"
  ) {
    return <JsonToTsView />;
  }

  if (slug === "json-viewer") {
    return <JsonViewerStandaloneView />;
  }

  // Default: json-formatter, json-pretty-print, and general json tools
  return <JsonFormatterDefaultView slug={slug} />;
}

function JsonViewerStandaloneView() {
  const defaultSample = JSON.stringify(
    {
      company: "Digital ToolPad",
      established: 2026,
      mission: "100% Client-Side Private Web Utilities",
      categories: ["Data Formats", "PDF Suite", "Converters", "Developer Tools"],
      sampleUsers: [
        { id: 1, name: "Alice Johnson", role: "Frontend Lead", email: "alice@example.com" },
        { id: 2, name: "Bob Smith", role: "Security Engineer", email: "bob@example.com" },
        { id: 3, name: "Carol Davis", role: "Data Scientist", email: "carol@example.com" }
      ],
      metrics: {
        totalTools: 492,
        activeMonthlyUsers: 150000,
        privacyRating: "A+"
      }
    },
    null,
    2
  );

  const [input, setInput] = useState(defaultSample);
  const [parsed, setParsed] = useState<any>(() => JSON.parse(defaultSample));
  const [error, setError] = useState("");

  const handleInputChange = (val: string) => {
    setInput(val);
    try {
      const p = JSON.parse(val);
      setParsed(p);
      setError("");
    } catch (err: any) {
      setError(err.message || "Invalid JSON syntax");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Interactive Collapsible Tree & Table Viewer
        </span>
        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span>Open JSON file</span>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Source Textarea */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            JSON Source
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste JSON to view in tree..."
            rows={18}
            spellCheck={false}
            className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
          {error && (
            <div className="p-2.5 bg-rose-950 text-rose-300 text-xs font-mono border-t border-rose-900">
              {error}
            </div>
          )}
        </div>

        {/* Tree & Table Viewer */}
        <div className="lg:col-span-7 p-4 bg-slate-950">
          {parsed ? (
            <JsonTreeViewer data={parsed} />
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              Provide valid JSON in the source editor to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JsonFormatterDefaultView({ slug }: { slug: string }) {
  const isPrettyPrint = slug === "json-pretty-print";

  const defaultJson = JSON.stringify(
    {
      appName: "Digital ToolPad",
      version: "2.0.0",
      features: ["Client-Side Processing", "Zero Server Uploads", "Fast & Secure"],
      stats: {
        totalTools: 492,
        activeUsers: 150000,
        privacyScore: 100
      },
      settings: {
        darkMode: true,
        autoSave: false
      }
    },
    null,
    2
  );

  const [input, setInput] = useState(defaultJson);
  const [indent, setIndent] = useState<number | "tab">(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ bytes: 0, lines: 0, depth: 0 });

  const calculateStats = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const getDepth = (obj: any): number => {
        if (typeof obj !== "object" || obj === null) return 0;
        const depths = Object.values(obj).map(getDepth);
        return 1 + (depths.length > 0 ? Math.max(...depths) : 0);
      };

      setStats({
        bytes: new Blob([jsonStr]).size,
        lines: jsonStr.split("\n").length,
        depth: getDepth(parsed)
      });
      setIsValid(true);
      setErrorMessage("");
    } catch (err: any) {
      setIsValid(false);
      setErrorMessage(err.message || "Invalid JSON syntax");
      setStats({
        bytes: new Blob([jsonStr]).size,
        lines: jsonStr.split("\n").length,
        depth: 0
      });
    }
  };

  useEffect(() => {
    calculateStats(input);
  }, [input]);

  const handleFormat = () => {
    try {
      let parsed = JSON.parse(input);
      if (sortKeys) {
        parsed = deepSortKeys(parsed);
      }
      const spacer = indent === "tab" ? "\t" : indent;
      const formatted = JSON.stringify(parsed, null, spacer);
      setInput(formatted);
      calculateStats(formatted);
    } catch (err: any) {
      setIsValid(false);
      setErrorMessage(err.message);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setInput(minified);
      calculateStats(minified);
    } catch (err: any) {
      setIsValid(false);
      setErrorMessage(err.message);
    }
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
    a.download = isPrettyPrint ? "pretty.json" : "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInput(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            <Sparkles className="size-3.5" />
            <span>{isPrettyPrint ? "Pretty Print" : "Format JSON"}</span>
          </button>
          <button
            type="button"
            onClick={handleMinify}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Minimize2 className="size-3.5" />
            <span>Minify</span>
          </button>

          <span className="hidden h-5 w-px bg-slate-300 sm:block dark:bg-slate-700" />

          {/* Indent Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Indent:</span>
            <select
              value={indent}
              onChange={(e) =>
                setIndent(e.target.value === "tab" ? "tab" : Number(e.target.value))
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>

          {/* Sort Keys Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>Sort keys A-Z</span>
          </label>
        </div>

        {/* Right I/O Controls */}
        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Open file</span>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            title="Clear editor"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Validation Status Indicator */}
      <div className="border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800">
        {isValid ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-4" />
            <span>Valid JSON</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="size-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Code Textarea / Editor */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or write your JSON here..."
          rows={16}
          spellCheck={false}
          className="w-full resize-y bg-slate-950 p-4 font-mono text-sm leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600 selection:bg-sky-900 selection:text-white"
        />
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>{stats.bytes} Bytes</span>
          <span>{stats.lines} Lines</span>
          <span>Depth: {stats.depth}</span>
        </div>
        <span className="font-medium text-sky-700 dark:text-sky-400">
          Processed locally in your browser
        </span>
      </div>
    </div>
  );
}
