"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Database, Play } from "lucide-react";

import { runSelect, type SqlRow, type SqlTable } from "./sql";

/**
 * The in-browser database viewer.
 *
 * The query the user types really runs against the table, so the WHERE
 * clause, the ORDER BY and the LIMIT all change the rows that are shown.
 */
export function SqlBrowser({
  table,
  title,
}: {
  table: SqlTable;
  title: string;
}) {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  const [query, setQuery] = React.useState("SELECT * FROM users ORDER BY id ASC;");
  const [rows, setRows] = React.useState<SqlRow[]>(table.rows);
  const [error, setError] = React.useState("");

  const execute = () => {
    const result = runSelect(table, query, tUi);
    setError(result.error);
    setRows(result.error ? [] : result.rows);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Database className="size-5 text-sky-700" />
          {title}
        </h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            spellCheck={false}
            aria-label={tUi("sqlQueryLabel")}
            className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={execute}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <Play className="size-3.5" />
            {tUi("executeSQL")}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {tUi("sqlTableHint")} {table.name} ({table.rows.length} {tUi("sqlRowsLabel")})
        </p>
        {error ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </div>

      <div className="overflow-auto bg-slate-950 p-4">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              {table.columns.map((column) => (
                <th key={column} className="p-2">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-slate-900/40">
                {table.columns.map((column, cellIndex) => (
                  <td
                    key={column}
                    className={
                      cellIndex === 0
                        ? "p-2 text-sky-400"
                        : cellIndex === 1
                          ? "p-2 font-medium"
                          : "p-2 text-slate-300"
                    }
                  >
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td
                  className="p-3 text-slate-500"
                  colSpan={table.columns.length}
                >
                  {tUi("sqlNoRows")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
