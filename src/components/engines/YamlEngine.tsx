"use client";

import React, { useState, useMemo } from "react";
import * as yaml from "js-yaml";
import {
  Sparkles,
  Copy,
  Download,
  Trash2,
  Upload,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface YamlEngineProps {
  slug: string;
}

export function YamlEngine({ slug }: YamlEngineProps) {
  const isJsonToYamlMode = slug.includes("json-to-yaml") || slug.includes("json-yaml");

  const defaultYaml = `name: Digital ToolPad
version: 2.0.0
services:
  web:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
features:
  - client-side-privacy
  - zero-telemetry
  - 492-tools`;

  const defaultJson = JSON.stringify(
    {
      name: "Digital ToolPad",
      version: "2.0.0",
      services: {
        web: {
          image: "node:20-alpine",
          ports: ["3000:3000"],
          environment: {
            NODE_ENV: "production",
            PORT: 3000,
          },
        },
      },
      features: ["client-side-privacy", "zero-telemetry", "492-tools"],
    },
    null,
    2
  );

  const [direction, setDirection] = useState<"yaml-to-json" | "json-to-yaml">(
    isJsonToYamlMode ? "json-to-yaml" : "yaml-to-json"
  );
  const [input, setInput] = useState(isJsonToYamlMode ? defaultJson : defaultYaml);
  const [indent, setIndent] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  // Live conversion
  const conversion = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", isValid: true };
    }

    if (direction === "yaml-to-json") {
      try {
        const parsed = yaml.load(input);
        const jsonStr = JSON.stringify(parsed, null, indent);
        return { output: jsonStr, error: "", isValid: true };
      } catch (err: any) {
        return { output: "", error: err.message || "Invalid YAML syntax", isValid: false };
      }
    } else {
      try {
        const parsed = JSON.parse(input);
        const yamlStr = yaml.dump(parsed, { indent });
        return { output: yamlStr, error: "", isValid: true };
      } catch (err: any) {
        return { output: "", error: err.message || "Invalid JSON syntax", isValid: false };
      }
    }
  }, [input, direction, indent]);

  const handleSwitchDirection = () => {
    if (conversion.output && !conversion.error) {
      setInput(conversion.output);
    }
    setDirection((d) => (d === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json"));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(conversion.output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isOutputJson = direction === "yaml-to-json";
    const filename = isOutputJson ? "converted.json" : "converted.yaml";
    const mimeType = isOutputJson ? "application/json" : "text/yaml";

    const blob = new Blob([conversion.output || input], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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
          <button
            type="button"
            onClick={handleSwitchDirection}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>
              {direction === "yaml-to-json" ? "YAML → JSON" : "JSON → YAML"}
            </span>
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Indent:</span>
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Open file</span>
            <input
              type="file"
              accept=".yaml,.yml,.json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!conversion.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!conversion.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download</span>
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

      {/* Status indicator */}
      <div className="border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800">
        {conversion.isValid ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-4" />
            <span>
              Valid {direction === "yaml-to-json" ? "YAML Input" : "JSON Input"} — Live Converted
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="size-4 flex-shrink-0" />
            <span>{conversion.error}</span>
          </div>
        )}
      </div>

      {/* Dual Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {direction === "yaml-to-json" ? "YAML / YML Input" : "JSON Input"}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste input here..."
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {direction === "yaml-to-json" ? "Converted JSON Output" : "Converted YAML Output"}
          </div>
          <textarea
            value={conversion.output}
            readOnly
            placeholder="Converted output will appear here..."
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
