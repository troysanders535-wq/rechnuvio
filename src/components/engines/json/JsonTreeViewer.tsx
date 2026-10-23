"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  Table as TableIcon,
  FolderTree,
  Code2,
  Maximize2,
  Minimize2
} from "lucide-react";

interface JsonTreeViewerProps {
  data: any;
  defaultExpandedDepth?: number;
}

export function JsonTreeViewer({ data, defaultExpandedDepth = 2 }: JsonTreeViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tree" | "table" | "raw">("tree");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandAllKey, setExpandAllKey] = useState(0);
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

  const handleCopy = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  // Check if root or child is an array of objects for table view
  const tabularData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
      return data;
    }
    // Search one level deep for first array of objects
    if (typeof data === "object" && data !== null) {
      for (const val of Object.values(data)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
          return val;
        }
      }
    }
    return null;
  }, [data]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-950 font-mono text-xs text-slate-200 dark:border-slate-800">
      {/* Viewer Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("tree")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                activeTab === "tree"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderTree className="size-3.5" />
              <span>Tree</span>
            </button>
            {tabularData && (
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === "table"
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TableIcon className="size-3.5" />
                <span>Table</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                activeTab === "raw"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="size-3.5" />
              <span>Raw</span>
            </button>
          </div>

          {activeTab === "tree" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setAllExpanded(true);
                  setExpandAllKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Expand All"
              >
                <Maximize2 className="size-3" />
                <span className="hidden sm:inline">Expand All</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllExpanded(false);
                  setExpandAllKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Collapse All"
              >
                <Minimize2 className="size-3" />
                <span className="hidden sm:inline">Collapse All</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Search */}
        <div className="relative min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys / values..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1 pl-8 pr-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Viewer Content */}
      <div className="max-h-[560px] overflow-auto p-4">
        {activeTab === "tree" && (
          <TreeNode
            key={expandAllKey}
            data={data}
            path="$"
            depth={0}
            defaultExpandedDepth={defaultExpandedDepth}
            searchQuery={searchQuery.toLowerCase().trim()}
            copiedPath={copiedPath}
            onCopy={handleCopy}
            forcedExpanded={allExpanded}
          />
        )}

        {activeTab === "table" && tabularData && (
          <TableView
            data={tabularData}
            searchQuery={searchQuery.toLowerCase().trim()}
            onCopy={handleCopy}
            copiedPath={copiedPath}
          />
        )}

        {activeTab === "raw" && (
          <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  data: any;
  path: string;
  depth: number;
  label?: string;
  defaultExpandedDepth: number;
  searchQuery: string;
  copiedPath: string | null;
  onCopy: (text: string, path: string) => void;
  forcedExpanded: boolean | null;
}

function TreeNode({
  data,
  path,
  depth,
  label,
  defaultExpandedDepth,
  searchQuery,
  copiedPath,
  onCopy,
  forcedExpanded,
}: TreeNodeProps) {
  const isObject = typeof data === "object" && data !== null;
  const isArray = Array.isArray(data);

  const initialExpanded =
    forcedExpanded !== null
      ? forcedExpanded
      : depth < defaultExpandedDepth;

  const [expanded, setExpanded] = useState(initialExpanded);

  // Sync forced expansion
  React.useEffect(() => {
    if (forcedExpanded !== null) {
      setExpanded(forcedExpanded);
    }
  }, [forcedExpanded]);

  if (!isObject) {
    const valueStr = String(data);
    const matches =
      searchQuery &&
      ((label && label.toLowerCase().includes(searchQuery)) ||
        valueStr.toLowerCase().includes(searchQuery));

    let typeColor = "text-emerald-400"; // string
    if (typeof data === "number") typeColor = "text-sky-400";
    else if (typeof data === "boolean") typeColor = "text-purple-400";
    else if (data === null) typeColor = "text-rose-400";

    return (
      <div
        className={`group flex items-center gap-1.5 py-0.5 hover:bg-slate-900/60 rounded px-1.5 ${
          matches ? "bg-amber-950/60 ring-1 ring-amber-500/50" : ""
        }`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {label !== undefined && (
          <span className="text-slate-400 font-semibold select-all">
            {label}:
          </span>
        )}
        <span className={`${typeColor} select-all`}>
          {typeof data === "string" ? `"${data}"` : String(data)}
        </span>
        <button
          type="button"
          onClick={() => onCopy(path, path)}
          title={`Copy path: ${path}`}
          className="opacity-0 group-hover:opacity-100 ml-2 text-slate-500 hover:text-sky-400 transition"
        >
          {copiedPath === path ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        </button>
      </div>
    );
  }

  const entries = isArray
    ? data.map((item, idx) => ({ key: String(idx), label: `[${idx}]`, val: item, childPath: `${path}[${idx}]` }))
    : Object.keys(data).map((key) => ({ key, label: key, val: data[key], childPath: `${path}.${key}` }));

  const count = entries.length;
  const summary = isArray ? `[${count} items]` : `{${count} keys}`;

  return (
    <div style={{ paddingLeft: depth > 0 ? "16px" : "0" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="group flex cursor-pointer select-none items-center gap-1.5 py-1 text-slate-300 hover:bg-slate-900/60 rounded px-1.5"
      >
        <span className="text-slate-500 transition-transform">
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>

        {label !== undefined && (
          <span className="font-semibold text-slate-200">{label}: </span>
        )}

        <span className="text-slate-500 text-[11px]">{summary}</span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(path, path);
          }}
          title={`Copy path: ${path}`}
          className="opacity-0 group-hover:opacity-100 ml-2 text-slate-500 hover:text-sky-400 transition"
        >
          {copiedPath === path ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        </button>
      </div>

      {expanded && (
        <div className="border-l border-slate-800/80 ml-2">
          {entries.map(({ key, label: childLabel, val, childPath }) => (
            <TreeNode
              key={key}
              data={val}
              path={childPath}
              depth={depth + 1}
              label={childLabel}
              defaultExpandedDepth={defaultExpandedDepth}
              searchQuery={searchQuery}
              copiedPath={copiedPath}
              onCopy={onCopy}
              forcedExpanded={forcedExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TableViewProps {
  data: any[];
  searchQuery: string;
  onCopy: (text: string, path: string) => void;
  copiedPath: string | null;
}

function TableView({ data, searchQuery, onCopy, copiedPath }: TableViewProps) {
  const headers = useMemo(() => {
    const keySet = new Set<string>();
    data.forEach((row) => {
      if (typeof row === "object" && row !== null) {
        Object.keys(row).forEach((k) => keySet.add(k));
      }
    });
    return Array.from(keySet);
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter((row) => {
      return Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchQuery)
      );
    });
  }, [data, searchQuery]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-semibold">
            <th className="p-2 text-slate-500">#</th>
            {headers.map((h) => (
              <th key={h} className="p-2 whitespace-nowrap text-sky-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {filteredRows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-900/40">
              <td className="p-2 text-slate-600 select-none">{idx + 1}</td>
              {headers.map((h) => {
                const val = row[h];
                const display = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "");
                const cellPath = `$[${idx}].${h}`;
                return (
                  <td
                    key={h}
                    onClick={() => onCopy(display, cellPath)}
                    className="p-2 font-mono whitespace-nowrap cursor-pointer hover:bg-slate-800/60 group text-slate-300"
                    title={`Click to copy: ${display}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate max-w-xs">{display}</span>
                      {copiedPath === cellPath ? (
                        <Check className="size-3 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Copy className="size-3 text-slate-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
