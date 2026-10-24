"use client";

import React, { useState } from "react";
import { format as formatSql } from "sql-formatter";
import { Terminal, Send, Sparkles, Copy, Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CodeScreenshotTool } from "./dev/CodeScreenshotTool";
import { GraphqlTool } from "./dev/GraphqlTools";
import { HtmlTool } from "./dev/HtmlTools";
import { LocalAiChatTool } from "./dev/LocalAiChatTool";
import { MathTool } from "./dev/MathTools";
import { OpenApiTool } from "./dev/OpenApiTools";
import { XmlTool } from "./dev/XmlTools";

interface DeveloperSuiteEngineProps {
  slug: string;
}

/**
 * The developer tools.
 *
 * Every slug is mapped to its own workspace explicitly. Dispatching with
 * `slug.includes(...)` is what made 26 of these tools render the SQL
 * formatter, so the map is the contract: a new tool has to be added here.
 */
const XML_SLUGS = new Set([
  "xml-formatter",
  "xml-validator",
  "xml-viewer",
  "xsd-editor",
  "xsd-schema-viewer",
  "xsd-viewer",
]);

const GRAPHQL_SLUGS = new Set([
  "graphql-formatter-beautifier",
  "graphql-minifier",
  "graphql-validator",
  "graphql-schema-explorer",
  "graphql-schema-validator",
  "graphql-schema-viewer-validator",
]);

const HTML_SLUGS = new Set(["html-beautifier", "html-formatter", "html-minifier"]);

const OPENAPI_SLUGS = new Set(["openapi-viewer", "openapi-editor", "swagger-viewer"]);

const AI_CHAT_SLUGS = new Set([
  "local-ai-chat",
  "offline-ai-chat",
  "private-ai-chatbot",
]);

const CODE_SCREENSHOT_SLUGS = new Set(["code-screenshot-generator", "code-snippet-screenshot"]);

const SQL_SLUGS = new Set([
  "sql-formatter",
  "sql-beautifier",
  "sql-formatter-beautifier",
]);

const API_TESTER_SLUGS = new Set(["api-tester", "http-request-tester", "rest-api-tester"]);

export function DeveloperSuiteEngine({ slug }: DeveloperSuiteEngineProps) {
  const tUi = useTranslations("ui.engines.DeveloperSuiteEngine");

  const defaultSql =
    "SELECT u.id, u.username, o.total_amount, o.created_at FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.status = 'completed' AND o.total_amount > 100 ORDER BY o.created_at DESC LIMIT 50;";
  const [sqlInput, setSqlInput] = useState(defaultSql);
  const [sqlDialect, setSqlDialect] = useState<"sql" | "postgresql" | "mysql" | "sqlite">(
    "postgresql",
  );

  const [apiUrl, setApiUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiResponse, setApiResponse] = useState("");
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const handleFormatSql = () => {
    try {
      const formatted = formatSql(sqlInput, { language: sqlDialect, tabWidth: 2 });
      setSqlInput(formatted);
    } catch {}
  };

  const handleTestApi = async () => {
    setApiLoading(true);
    setApiResponse(tUi("fetchingResponse"));
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

  /* ------------------------------------------------ the tool workspaces -- */

  if (XML_SLUGS.has(slug)) {
    const variant =
      slug === "xml-formatter"
        ? "format"
        : slug === "xml-validator"
          ? "validate"
          : slug === "xml-viewer"
            ? "view"
            : slug === "xsd-editor"
              ? "xsd-editor"
              : slug === "xsd-schema-viewer"
                ? "xsd-schema"
                : "xsd-elements";
    return <XmlTool variant={variant} />;
  }

  if (GRAPHQL_SLUGS.has(slug)) {
    const variant =
      slug === "graphql-formatter-beautifier"
        ? "format"
        : slug === "graphql-minifier"
          ? "minify"
          : slug === "graphql-validator"
            ? "validate"
            : slug === "graphql-schema-explorer"
              ? "schema-explorer"
              : slug === "graphql-schema-validator"
                ? "schema-validate"
                : "schema-viewer";
    return <GraphqlTool variant={variant} />;
  }

  if (HTML_SLUGS.has(slug)) {
    const variant =
      slug === "html-minifier" ? "minify" : slug === "html-beautifier" ? "beautify" : "format";
    return <HtmlTool variant={variant} />;
  }

  if (OPENAPI_SLUGS.has(slug)) {
    const variant =
      slug === "swagger-viewer"
        ? "swagger-viewer"
        : slug === "openapi-editor"
          ? "openapi-editor"
          : "openapi-viewer";
    return <OpenApiTool variant={variant} />;
  }

  if (AI_CHAT_SLUGS.has(slug)) {
    return <LocalAiChatTool variant={slug as "local-ai-chat" | "offline-ai-chat" | "private-ai-chatbot"} />;
  }

  if (CODE_SCREENSHOT_SLUGS.has(slug)) {
    return <CodeScreenshotTool variant={slug as "code-screenshot-generator" | "code-snippet-screenshot"} />;
  }

  if (slug === "latex-equation-editor") {
    return <MathTool variant="latex" />;
  }

  if (slug === "math-editor") {
    return <MathTool variant="math" />;
  }

  /* ---------------------------------------------------- the API tester -- */

  if (API_TESTER_SLUGS.has(slug)) {
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
            <span>{apiLoading ? "Sending..." : tUi("sendRequest")}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{tUi("responsePayload")}</span>
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
            {apiResponse || tUi("clickSendRequestToTestTheEndpoint")}
          </pre>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------ SQL formatter -- */

  if (SQL_SLUGS.has(slug)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormatSql}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
            >
              <Sparkles className="size-3.5" />
              <span>{tUi("formatSQL")}</span>
            </button>
            <select
              value={sqlDialect}
              onChange={(e) => setSqlDialect(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="postgresql">{tUi("postgreSQL")}</option>
              <option value="mysql">{tUi("mySQL")}</option>
              <option value="sqlite">{tUi("sQLite")}</option>
              <option value="sql">{tUi("standardSQL")}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigator.clipboard.writeText(sqlInput)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Copy className="size-3.5" />
              <span>{tUi("copy")}</span>
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
          placeholder={tUi("pasteSQLQueryHere")}
          className="w-full resize-y bg-slate-950 p-4 font-mono text-sm leading-relaxed text-sky-300 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <span className="inline-flex items-center gap-2">
        <Terminal className="size-4" />
        {tUi("noWorkspaceForSlug", { slug })}
      </span>
    </div>
  );
}
