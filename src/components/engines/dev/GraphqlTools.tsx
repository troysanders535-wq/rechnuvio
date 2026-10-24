"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  DevClearButton,
  DevCopyButton,
  DevEditor,
  DevError,
  DevOk,
  DevOutput,
  DevPanel,
  devButtonClass,
} from "./DevKit";
import {
  formatGraphql,
  minifyGraphql,
  readSchema,
  validateGraphql,
  type GraphqlIssue,
  type GraphqlType,
} from "./graphqlLang";

type GraphqlVariant =
  | "format"
  | "minify"
  | "validate"
  | "schema-explorer"
  | "schema-validate"
  | "schema-viewer";

const SAMPLE_QUERY = `query GetUser($id: ID!) { user(id: $id) { id name email posts { id title createdAt } } }`;

const SAMPLE_SCHEMA = `type User implements Node { id: ID! name: String email: String posts(first: Int): [Post!]! }
type Post { id: ID! title: String! body: String author: User }
interface Node { id: ID! }
enum Role { ADMIN EDITOR VIEWER }`;

export function GraphqlTool({ variant }: { variant: GraphqlVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState("");
  const [issues, setIssues] = React.useState<GraphqlIssue[]>([]);
  const [types, setTypes] = React.useState<GraphqlType[]>([]);

  const isSchemaTool =
    variant === "schema-explorer" || variant === "schema-validate" || variant === "schema-viewer";
  const sample = isSchemaTool ? SAMPLE_SCHEMA : SAMPLE_QUERY;

  const title =
    variant === "format"
      ? tUi("graphqlFormatterTitle")
      : variant === "minify"
        ? tUi("graphqlMinifierTitle")
        : variant === "validate"
          ? tUi("graphqlValidatorTitle")
          : variant === "schema-explorer"
            ? tUi("graphqlSchemaExplorerTitle")
            : variant === "schema-validate"
              ? tUi("graphqlSchemaValidatorTitle")
              : tUi("graphqlSchemaViewerTitle");

  const subtitle =
    variant === "format"
      ? tUi("graphqlFormatterSubtitle")
      : variant === "minify"
        ? tUi("graphqlMinifierSubtitle")
        : variant === "validate"
          ? tUi("graphqlValidatorSubtitle")
          : variant === "schema-explorer"
            ? tUi("graphqlSchemaExplorerSubtitle")
            : variant === "schema-validate"
              ? tUi("graphqlSchemaValidatorSubtitle")
              : tUi("graphqlSchemaViewerSubtitle");

  const actionLabel =
    variant === "format"
      ? tUi("formatGraphql")
      : variant === "minify"
        ? tUi("minifyGraphql")
        : variant === "validate"
          ? tUi("validateGraphql")
          : variant === "schema-explorer"
            ? tUi("readSchema")
            : variant === "schema-validate"
              ? tUi("validateSchema")
              : tUi("showSchema");

  const run = () => {
    setIssues([]);
    setTypes([]);
    setResult("");

    if (!text.trim()) {
      setIssues([{ message: tUi("emptyInput"), line: 1 }]);
      return;
    }

    if (variant === "format") {
      setResult(formatGraphql(text));
      return;
    }
    if (variant === "minify") {
      setResult(minifyGraphql(text));
      return;
    }
    if (variant === "validate") {
      const found = validateGraphql(text, tUi);
      setIssues(found);
      if (!found.length) setResult(tUi("graphqlIsValid"));
      return;
    }

    // The schema tools.
    const found = validateGraphql(text, tUi);
    const schema = readSchema(text);
    setTypes(schema);

    if (variant === "schema-validate") {
      // Every issue counts here: the tool promises to check the schema for
      // undefined types, and an undefined type is exactly such an issue.
      setIssues(found);
      if (!found.length) setResult(tUi("schemaIsValid"));
      return;
    }

    setIssues(found);
    if (!schema.length) {
      setResult(tUi("noSchemaTypes"));
      return;
    }
    if (variant === "schema-explorer") {
      setResult(schema.map((type) => `${type.kind} ${type.name}`).join("\n"));
      return;
    }
    // schema-viewer: the types and their fields.
    setResult(
      schema
        .map((type) => {
          const fields = type.fields.length
            ? type.fields.map((field) => `  ${field.name}: ${field.type}`).join("\n")
            : "  (no fields)";
          return `${type.kind} ${type.name}\n${fields}`;
        })
        .join("\n\n"),
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
              setIssues([]);
              setTypes([]);
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
        placeholder={isSchemaTool ? tUi("pasteGraphqlSchema") : tUi("pasteGraphqlDocument")}
      />

      {issues.length ? (
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <DevError key={`${issue.line}-${index}`}>
              {tUi("line")} {issue.line}: {issue.message}
            </DevError>
          ))}
        </div>
      ) : null}

      {!issues.length && result ? <DevOk>{result}</DevOk> : null}

      {issues.length && result ? (
        <DevOutput label={tUi("result")}>{result}</DevOutput>
      ) : null}

      {types.length && variant === "schema-viewer" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("declaredTypes")}
          </p>
          <ul className="space-y-2">
            {types.map((type) => (
              <li key={type.name} className="font-mono text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold">
                  {type.kind} {type.name}
                </span>
                {type.fields.length ? (
                  <ul className="ml-4 list-disc">
                    {type.fields.map((field) => (
                      <li key={field.name}>
                        {field.name}: {field.type}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DevPanel>
  );
}
