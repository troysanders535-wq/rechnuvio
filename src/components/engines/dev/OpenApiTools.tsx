"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { load as yamlLoad } from "js-yaml";

import {
  DevClearButton,
  DevCopyButton,
  DevEditor,
  DevError,
  DevOutput,
  DevPanel,
  devButtonClass,
} from "./DevKit";

type OpenApiVariant = "openapi-viewer" | "openapi-editor" | "swagger-viewer";

const SAMPLE_OPENAPI = `openapi: 3.0.3
info:
  title: Example API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      tags: [users]
      responses:
        '200':
          description: A list of users
    post:
      summary: Create a user
      tags: [users]
      responses:
        '201':
          description: Created
  /users/{id}:
    get:
      summary: Get one user
      tags: [users]
      parameters:
        - name: id
          in: path
          required: true
      responses:
        '200':
          description: One user`;

const SAMPLE_SWAGGER = `{
  "swagger": "2.0",
  "info": { "title": "Example API", "version": "1.0.0" },
  "paths": {
    "/users": {
      "get": { "summary": "List users", "tags": ["users"] },
      "post": { "summary": "Create a user", "tags": ["users"] }
    },
    "/users/{id}": {
      "get": { "summary": "Get one user", "tags": ["users"] }
    }
  }
}`;

interface Operation {
  method: string;
  path: string;
  summary: string;
  tags: string[];
}

/** Read the operations of an OpenAPI 3 or Swagger 2 document. */
export function readOperations(doc: unknown): Operation[] {
  const operations: Operation[] = [];
  if (!doc || typeof doc !== "object") return operations;
  const paths = (doc as { paths?: Record<string, Record<string, unknown>> }).paths;
  if (!paths || typeof paths !== "object") return operations;

  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue;
    for (const [method, operation] of Object.entries(item as Record<string, unknown>)) {
      if (!["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method)) {
        continue;
      }
      const record = (operation || {}) as {
        summary?: string;
        operationId?: string;
        tags?: string[];
      };
      operations.push({
        method: method.toUpperCase(),
        path,
        summary: record.summary || record.operationId || "",
        tags: Array.isArray(record.tags) ? record.tags : [],
      });
    }
  }
  return operations;
}

/** Parse an OpenAPI or Swagger document, JSON or YAML. */
export function parseApiDocument(text: string): { doc: unknown; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { doc: null, error: "" };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return { doc: JSON.parse(trimmed), error: "" };
    } catch (err) {
      return { doc: null, error: String((err as Error)?.message || err) };
    }
  }
  try {
    const doc = yamlLoad(trimmed);
    return { doc, error: "" };
  } catch (err) {
    return { doc: null, error: String((err as Error)?.message || err) };
  }
}

export function OpenApiTool({ variant }: { variant: OpenApiVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");
  const [operations, setOperations] = React.useState<Operation[]>([]);

  const sample = variant === "swagger-viewer" ? SAMPLE_SWAGGER : SAMPLE_OPENAPI;
  const title =
    variant === "openapi-viewer"
      ? tUi("openapiViewerTitle")
      : variant === "openapi-editor"
        ? tUi("openapiEditorTitle")
        : tUi("swaggerViewerTitle");
  const subtitle =
    variant === "openapi-viewer"
      ? tUi("openapiViewerSubtitle")
      : variant === "openapi-editor"
        ? tUi("openapiEditorSubtitle")
        : tUi("swaggerViewerSubtitle");
  const actionLabel =
    variant === "openapi-editor" ? tUi("parseSpecification") : tUi("listOperations");

  const run = () => {
    setError("");
    setOperations([]);
    setResult("");

    if (!text.trim()) {
      setError(tUi("emptyInput"));
      return;
    }

    const { doc, error: parseError } = parseApiDocument(text);
    if (parseError) {
      setError(parseError);
      return;
    }
    if (!doc) {
      setError(tUi("emptyInput"));
      return;
    }

    const found = readOperations(doc);
    setOperations(found);
    if (!found.length) {
      setResult(tUi("noOperationsFound"));
      return;
    }
    setResult(
      found
        .map((operation) => {
          const tags = operation.tags.length ? ` [${operation.tags.join(", ")}]` : "";
          return `${operation.method.padEnd(6)} ${operation.path}${tags}${
            operation.summary ? ` - ${operation.summary}` : ""
          }`;
        })
        .join("\n"),
    );
  };

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button type="button" onClick={run} className={devButtonClass}>
            {actionLabel}
          </button>
          <DevCopyButton value={result} label={{ copy: tUi("copy"), copied: tUi("copied") }} />
          <DevClearButton
            onClick={() => {
              setText("");
              setResult("");
              setError("");
              setOperations([]);
            }}
            label={tUi("clear")}
          />
          <button
            type="button"
            onClick={() => setText(sample)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("loadExample")}
          </button>
        </>
      }
    >
      <DevEditor
        value={text}
        onChange={setText}
        placeholder={tUi("pasteSpecificationHere")}
        rows={16}
      />

      {error ? <DevError>{error}</DevError> : null}
      {result ? <DevOutput label={tUi("operations")}>{result}</DevOutput> : null}

      {operations.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-semibold">{tUi("method")}</th>
                <th className="px-3 py-2 font-semibold">{tUi("path")}</th>
                <th className="px-3 py-2 font-semibold">{tUi("summary")}</th>
                <th className="px-3 py-2 font-semibold">{tUi("tags")}</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => (
                <tr
                  key={`${operation.method} ${operation.path}`}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="px-3 py-2 font-mono font-bold text-sky-700 dark:text-sky-300">
                    {operation.method}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                    {operation.path}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {operation.summary}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {operation.tags.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </DevPanel>
  );
}
