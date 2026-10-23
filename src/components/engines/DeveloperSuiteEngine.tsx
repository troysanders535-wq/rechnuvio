"use client";

import React, { useState } from "react";
import { format as formatSql } from "sql-formatter";
import { Terminal, Send, Sparkles, Copy, Download, Trash2 } from "lucide-react";

interface DeveloperSuiteEngineProps {
  slug: string;
}

export function DeveloperSuiteEngine({ slug }: DeveloperSuiteEngineProps) {
  const isSql = slug.includes("sql");
  const isApiTester = slug.includes("api") || slug.includes("http");
  const isXml = slug.includes("xml") || slug.includes("xsd");
  const isGraphql = slug.includes("graphql");

  // SQL state
  const defaultSql = "SELECT u.id, u.username, o.total_amount, o.created_at FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.status = 'completed' AND o.total_amount > 100 ORDER BY o.created_at DESC LIMIT 50;";
  const [sqlInput, setSqlInput] = useState(defaultSql);
  const [sqlDialect, setSqlDialect] = useState<"sql" | "postgresql" | "mysql" | "sqlite">("postgresql");

  // API tester state
  const [apiUrl, setApiUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiResponse, setApiResponse] = useState("");
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // XML state
  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><genre>Computer</genre><price>44.95</price><publish_date>2000-10-01</publish_date><description>An in-depth look at creating applications with XML.</description></book></catalog>`;
  const [xmlInput, setXmlInput] = useState(defaultXml);

  const handleFormatSql = () => {
    try {
      const formatted = formatSql(sqlInput, { language: sqlDialect, tabWidth: 2 });
      setSqlInput(formatted);
    } catch {}
  };

  const handleTestApi = async () => {
    setApiLoading(true);
    setApiResponse("Fetching response...");
    try {
      const res = await fetch(apiUrl, { method: apiMethod });
      setApiStatus(res.status);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setApiResponse(`Error executing request: ${e.message}`);
      setApiStatus(500);
    } finally {
      setApiLoading(false);
    }
  };

  if (isApiTester) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex flex-wrap gap-2">
          <select
            value={apiMethod}
            onChange={(e) => setApiMethod(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            onClick={handleTestApi}
            disabled={apiLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <Send className="size-3.5" />
            <span>{apiLoading ? "Sending..." : "Send Request"}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Response Payload</span>
            {apiStatus && (
              <span
                className={`font-mono font-bold ${
                  apiStatus < 300 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Status: {apiStatus}
              </span>
            )}
          </div>
          <pre className="max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4 font-mono text-xs text-emerald-400">
            {apiResponse || "Click 'Send Request' to test the endpoint."}
          </pre>
        </div>
      </div>
    );
  }

  // SQL Formatter default
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={handleFormatSql}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <Sparkles className="size-3.5" />
            <span>Format SQL</span>
          </button>
          <select
            value={sqlDialect}
            onChange={(e) => setSqlDialect(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
            <option value="sql">Standard SQL</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigator.clipboard.writeText(sqlInput)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>Copy</span>
          </button>
          <button
            onClick={() => setSqlInput("")}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={sqlInput}
        onChange={(e) => setSqlInput(e.target.value)}
        rows={14}
        placeholder="Paste SQL query here..."
        className="w-full resize-y bg-slate-950 p-4 font-mono text-sm leading-relaxed text-sky-300 outline-none"
      />
    </div>
  );
}
