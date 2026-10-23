"use client";

import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
  Table,
  Code2,
  Copy,
  Download,
  Trash2,
  Upload,
  ArrowRightLeft,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface CsvDataEngineProps {
  slug: string;
}

function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const prop = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, prop));
    } else if (Array.isArray(val)) {
      result[prop] = JSON.stringify(val);
    } else {
      result[prop] = val;
    }
  }
  return result;
}

export function CsvDataEngine({ slug }: CsvDataEngineProps) {
  const isJsonToCsvMode = slug === "json-to-csv-converter";
  const isTsvMode = slug === "tsv-to-json";

  const sampleCsv = `id,name,role,department,salary
1,Jane Doe,Lead Architect,Engineering,145000
2,John Smith,Product Designer,Design,118000
3,Alice Johnson,Security Engineer,Infrastructure,135000
4,Bob Wilson,Frontend Engineer,Engineering,110000
5,Carol Martinez,Data Scientist,Analytics,140000`;

  const sampleTsv = `id\tname\trole\tdepartment\tsalary
1\tJane Doe\tLead Architect\tEngineering\t145000
2\tJohn Smith\tProduct Designer\tDesign\t118000
3\tAlice Johnson\tSecurity Engineer\tInfrastructure\t135000
4\tBob Wilson\tFrontend Engineer\tEngineering\t110000
5\tCarol Martinez\tData Scientist\tAnalytics\t140000`;

  const sampleJsonArr = JSON.stringify(
    [
      { id: 1, name: "Jane Doe", role: "Lead Architect", department: "Engineering", salary: 145000 },
      { id: 2, name: "John Smith", role: "Product Designer", department: "Design", salary: 118000 },
      { id: 3, name: "Alice Johnson", role: "Security Engineer", department: "Infrastructure", salary: 135000 },
      { id: 4, name: "Bob Wilson", role: "Frontend Engineer", department: "Engineering", salary: 110000 },
      { id: 5, name: "Carol Martinez", role: "Data Scientist", department: "Analytics", salary: 140000 }
    ],
    null,
    2
  );

  const initialDirection = isJsonToCsvMode ? "json-to-csv" : "csv-to-json";
  const initialInput = isJsonToCsvMode
    ? sampleJsonArr
    : isTsvMode
    ? sampleTsv
    : sampleCsv;

  const [direction, setDirection] = useState<"csv-to-json" | "json-to-csv">(initialDirection);
  const [input, setInput] = useState(initialInput);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [dynamicTyping, setDynamicTyping] = useState(true);
  const [delimiter, setDelimiter] = useState<string>(isTsvMode ? "\t" : ",");
  const [activeTab, setActiveTab] = useState<"json" | "table">("json");
  const [copied, setCopied] = useState(false);

  // Conversion result
  const conversion = useMemo(() => {
    if (!input.trim()) {
      return { output: "", parsedTable: [], error: "" };
    }

    if (direction === "csv-to-json") {
      try {
        const config: Papa.ParseConfig = {
          header: hasHeaders,
          dynamicTyping,
          skipEmptyLines: true,
        };
        if (delimiter !== "auto") {
          config.delimiter = delimiter;
        }

        const result = Papa.parse(input.trim(), config);
        if (result.errors && result.errors.length > 0) {
          const firstErr = result.errors[0];
          // Non-fatal parse warning
          if (!result.data || result.data.length === 0) {
            return { output: "", parsedTable: [], error: `CSV Error on row ${firstErr.row}: ${firstErr.message}` };
          }
        }

        const jsonStr = JSON.stringify(result.data, null, 2);
        return {
          output: jsonStr,
          parsedTable: Array.isArray(result.data) ? result.data : [],
          error: "",
        };
      } catch (err: any) {
        return { output: "", parsedTable: [], error: err.message || "CSV parse error" };
      }
    } else {
      // JSON to CSV
      try {
        const parsed = JSON.parse(input);
        let dataToUnparse: any[] = [];

        if (Array.isArray(parsed)) {
          dataToUnparse = parsed.map((item) =>
            typeof item === "object" && item !== null ? flattenObject(item) : { value: item }
          );
        } else if (typeof parsed === "object" && parsed !== null) {
          dataToUnparse = [flattenObject(parsed)];
        } else {
          dataToUnparse = [{ value: parsed }];
        }

        const csvStr = Papa.unparse(dataToUnparse, {
          delimiter: delimiter === "auto" ? "," : delimiter,
          header: hasHeaders,
        });

        return {
          output: csvStr,
          parsedTable: dataToUnparse,
          error: "",
        };
      } catch (err: any) {
        return {
          output: "",
          parsedTable: [],
          error: err.message || "Invalid JSON array/object to convert to CSV",
        };
      }
    }
  }, [input, direction, hasHeaders, dynamicTyping, delimiter]);

  const handleSwitchDirection = () => {
    if (conversion.output && !conversion.error) {
      setInput(conversion.output);
    }
    setDirection((d) => (d === "csv-to-json" ? "json-to-csv" : "csv-to-json"));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(conversion.output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isOutputJson = direction === "csv-to-json";
    const extension = isOutputJson ? ".json" : delimiter === "\t" ? ".tsv" : ".csv";
    const mimeType = isOutputJson ? "application/json" : "text/csv";

    const blob = new Blob([conversion.output || input], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted${extension}`;
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchDirection}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>
              {direction === "csv-to-json"
                ? isTsvMode
                  ? "TSV → JSON"
                  : "CSV → JSON"
                : isTsvMode
                ? "JSON → TSV"
                : "JSON → CSV"}
            </span>
          </button>

          {/* Delimiter Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Delimiter:</span>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value=",">Comma (,)</option>
              <option value="&#9;">Tab (\t)</option>
              <option value=";">Semicolon (;)</option>
              <option value="|">Pipe (|)</option>
              <option value="auto">Auto-detect</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>Headers row</span>
          </label>

          {direction === "csv-to-json" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dynamicTyping}
                onChange={(e) => setDynamicTyping(e.target.checked)}
                className="rounded border-slate-300 accent-sky-700"
              />
              <span>Parse numbers/booleans</span>
            </label>
          )}
        </div>

        {/* Right I/O Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                activeTab === "json"
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              <Code2 className="size-3.5" />
              <span>{direction === "csv-to-json" ? "JSON Output" : "CSV Output"}</span>
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                activeTab === "table"
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              <Table className="size-3.5" />
              <span>Table</span>
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Open file</span>
            <input
              type="file"
              accept=".csv,.tsv,.json,.txt"
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
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900"
            title="Clear"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {conversion.error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{conversion.error}</span>
        </div>
      )}

      {/* Main Split Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {direction === "csv-to-json"
              ? isTsvMode
                ? "TSV Input"
                : "CSV Input"
              : "JSON Input"}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === "csv-to-json"
                ? "Paste CSV or TSV data here..."
                : "Paste JSON array or object here..."
            }
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {direction === "csv-to-json" ? "Converted JSON" : "Converted CSV"}
          </div>

          {activeTab === "json" ? (
            <textarea
              value={conversion.output}
              readOnly
              placeholder="Converted output will appear here..."
              rows={16}
              spellCheck={false}
              className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
            />
          ) : (
            <div className="max-h-[440px] overflow-auto p-4">
              {conversion.parsedTable.length > 0 ? (
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900">
                    <tr>
                      <th className="p-2 text-slate-500">#</th>
                      {Object.keys(conversion.parsedTable[0] || {}).map((col) => (
                        <th key={col} className="p-2 font-semibold text-sky-400">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {conversion.parsedTable.map((row: any, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2 text-slate-600 select-none">{i + 1}</td>
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-2 max-w-xs truncate">
                            {typeof val === "object" && val !== null
                              ? JSON.stringify(val)
                              : String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Data is empty or could not be formatted into a table.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
