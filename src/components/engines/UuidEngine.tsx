"use client";

import React, { useState } from "react";
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5, v7 as uuidv7 } from "uuid";
import { Sparkles, Copy, Download, RefreshCw, Trash2 } from "lucide-react";

interface UuidEngineProps {
  slug: string;
}

export function UuidEngine({ slug }: UuidEngineProps) {
  const [version, setVersion] = useState<"v1" | "v4" | "v5" | "v7">("v4");
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<"standard" | "compact" | "braces" | "urn">("standard");
  const [uppercase, setUppercase] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generateSingleUuid = (ver: string): string => {
    let id = "";
    if (ver === "v1") id = uuidv1();
    else if (ver === "v7") id = uuidv7();
    else if (ver === "v5") id = uuidv5("digitaltoolpad.com", uuidv5.DNS);
    else id = uuidv4();

    if (format === "compact") id = id.replace(/-/g, "");
    else if (format === "braces") id = `{${id}}`;
    else if (format === "urn") id = `urn:uuid:${id}`;

    return uppercase ? id.toUpperCase() : id.toLowerCase();
  };

  const handleGenerate = () => {
    const generated: string[] = [];
    const limit = Math.min(Math.max(1, count), 500);
    for (let i = 0; i < limit; i++) {
      generated.push(generateSingleUuid(version));
    }
    setUuids(generated);
  };

  React.useEffect(() => {
    handleGenerate();
  }, [version, count, format, uppercase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(uuids.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([uuids.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids-${version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Options Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* UUID Version Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Version
            </label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="v4">Version 4 (Random)</option>
              <option value="v7">Version 7 (Time-Ordered)</option>
              <option value="v1">Version 1 (Timestamp & MAC)</option>
              <option value="v5">Version 5 (Name-based SHA1)</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Quantity (1 - 500)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="standard">Standard (with hyphens)</option>
              <option value="compact">Compact (no hyphens)</option>
              <option value="braces">Braces ({`{...}`})</option>
              <option value="urn">URN (urn:uuid:...)</option>
            </select>
          </div>

          {/* Uppercase toggle */}
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="rounded border-slate-300 accent-sky-700"
              />
              <span>Uppercase (A-Z)</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
            >
              <RefreshCw className="size-3.5" />
              <span>Generate New UUIDs</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Copy className="size-3.5" />
              <span>{copied ? "Copied All!" : "Copy All"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="size-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated List */}
      <div className="bg-slate-950 p-4">
        <div className="max-h-96 space-y-1.5 overflow-auto font-mono text-xs">
          {uuids.map((id, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-sky-300 hover:border-slate-700"
            >
              <span className="select-all">{id}</span>
              <button
                onClick={() => navigator.clipboard.writeText(id)}
                className="text-slate-500 hover:text-white"
                title="Copy single UUID"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
