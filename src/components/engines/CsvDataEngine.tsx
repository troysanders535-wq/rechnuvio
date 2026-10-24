"use client";

import React, { useState, useMemo } from "react";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import {
  Table,
  Code2,
  Copy,
  Download,
  Trash2,
  Upload,
  ArrowRightLeft,
  AlertCircle,
  Info
} from "lucide-react";

import { readXlsx, rowsToCsv, type XlsxWorkbook } from "./csv/xlsx";
import { readPdfRows } from "./csv/pdfRows";

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

/**
 * The file types each tool of this engine really reads.
 *
 * The accept attribute is the contract the user sees in the file dialog, so
 * a tool that reads a workbook or a bank statement has to say so - and a
 * tool that cannot read a format may not offer it.
 *
 * - .xlsx is read for real: the archive is unpacked and every cell of every
 *   sheet is read.
 * - .pdf is read for real: the text layer of every page becomes a row.
 * - .xls is the legacy binary format and is NOT read here.
 * - .parquet is not read at all: a browser has no Parquet reader, so the
 *   format is not offered and the panel says so.
 */
const ACCEPT_BY_SLUG: Record<string, string> = {
  "bank-statement-converter": ".pdf,.csv,.tsv,.json,.txt",
  "bank-statement-to-csv": ".pdf,.csv,.tsv,.json,.txt",
  "bank-statement-to-excel": ".pdf,.csv,.tsv,.json,.txt",
  "excel-to-csv": ".xlsx,.csv,.tsv,.json,.txt",
  "excel-viewer": ".xlsx,.csv,.tsv,.json,.txt",
  "xlsx-to-csv": ".xlsx,.csv,.tsv,.json,.txt",
  "xlsx-viewer": ".xlsx,.csv,.tsv,.json,.txt",
  "parquet-to-csv": ".csv,.tsv,.json,.txt",
  "parquet-viewer": ".csv,.tsv,.json,.txt",
};

export function CsvDataEngine({ slug }: CsvDataEngineProps) {
  const tUi = useTranslations("ui.engines.CsvDataEngine");
  const isJsonToCsvMode = slug === "json-to-csv-converter";
  const isTsvMode = slug === "tsv-to-json";
  const isParquetTool = slug === "parquet-to-csv" || slug === "parquet-viewer";
  const accept = ACCEPT_BY_SLUG[slug] || ".csv,.tsv,.json,.txt";

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
      { id: 1, name: tUi("janeDoe"), role: tUi("leadArchitect"), department: tUi("engineering"), salary: 145000 },
      { id: 2, name: tUi("johnSmith"), role: tUi("productDesigner"), department: tUi("design"), salary: 118000 },
      { id: 3, name: "Alice Johnson", role: "Security Engineer", department: tUi("infrastructure"), salary: 135000 },
      { id: 4, name: tUi("bobWilson"), role: tUi("frontendEngineer"), department: tUi("engineering"), salary: 110000 },
      { id: 5, name: tUi("carolMartinez"), role: "Data Scientist", department: tUi("analytics"), salary: 140000 }
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAscending, setSortAscending] = useState(true);

  /* What the last opened file brought into the workspace. */
  const [workbook, setWorkbook] = useState<XlsxWorkbook | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

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
        return { output: "", parsedTable: [], error: err.message || tUi("cSVParseError") };
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
          error: err.message || tUi("invalidJSONArrayObjectToConvertToCSV"),
        };
      }
    }
  }, [input, direction, hasHeaders, dynamicTyping, delimiter]);

  /* The table view can be sorted by any column, the way a spreadsheet is. */
  const sortedTable = useMemo(() => {
    const rows = conversion.parsedTable as Record<string, unknown>[];
    if (!sortColumn) return rows;
    const sorted = [...rows].sort((a, b) => {
      const left = a?.[sortColumn];
      const right = b?.[sortColumn];
      const leftNumber = typeof left === "number" ? left : Number(left);
      const rightNumber = typeof right === "number" ? right : Number(right);
      if (typeof left === "number" || typeof right === "number") {
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
          return leftNumber - rightNumber;
        }
      }
      return String(left ?? "").localeCompare(String(right ?? ""));
    });
    return sortAscending ? sorted : sorted.reverse();
  }, [conversion.parsedTable, sortColumn, sortAscending]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortAscending((value) => !value);
      return;
    }
    setSortColumn(column);
    setSortAscending(true);
  };

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

  /** Shows another sheet of the workbook that was opened last. */
  const selectSheet = (index: number) => {
    if (!workbook) return;
    const sheet = workbook.sheets[index];
    if (!sheet) return;
    setActiveSheet(index);
    setInput(rowsToCsv(sheet.rows));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    setBusy(true);
    setStatus("");
    setNotice("");
    setWorkbook(null);

    try {
      if (name.endsWith(".xlsx")) {
        const book = await readXlsx(await file.arrayBuffer());
        setWorkbook(book);
        setActiveSheet(0);
        setInput(rowsToCsv(book.sheets[0].rows));
        setStatus(
          tUi("workbookRead", {
            name: file.name,
            sheets: book.sheets.length,
            sheet: book.sheets[0].name,
            rows: book.sheets[0].rows.length,
            dates: book.formattedDates,
            percentages: book.formattedPercentages,
          }),
        );
      } else if (name.endsWith(".pdf")) {
        const read = await readPdfRows(new Uint8Array(await file.arrayBuffer()));
        if (!read.rows.length) {
          setInput("");
          setNotice(tUi("pdfWithoutTextLayer", { pages: read.pageCount }));
        } else {
          /* The lines of a statement carry the notation of the statement, so
             the values are kept exactly as they are printed. */
          setDynamicTyping(false);
          setInput(rowsToCsv(read.rows));
          setStatus(
            tUi("pdfRead", {
              name: file.name,
              pages: read.pagesWithText,
              rows: read.rows.length,
            }),
          );
        }
      } else if (name.endsWith(".xls")) {
        setNotice(tUi("xlsNotSupported"));
      } else {
        setInput(await file.text());
        setStatus(tUi("textFileRead", { name: file.name }));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (reason === "not-a-zip" || reason === "no-workbook" || reason === "no-sheets") {
        setNotice(tUi("fileNotAWorkbook", { name: file.name }));
      } else {
        setNotice(tUi("fileNotReadable", { name: file.name, message: reason }));
      }
    } finally {
      setBusy(false);
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
                  ? tUi("tSVJSON")
                  : tUi("cSVJSON")
                : isTsvMode
                ? tUi("jSONTSV")
                : tUi("jSONCSV")}
            </span>
          </button>

          {/* Delimiter Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{tUi("delimiter")}</span>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value=",">{tUi("comma")}</option>
              <option value="&#9;">{tUi("tabDelimiter")}</option>
              <option value=";">{tUi("semicolon")}</option>
              <option value="|">{tUi("pipeDelimiter")}</option>
              <option value="auto">{tUi("autoDetect")}</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="rounded border-slate-300 accent-sky-700"
            />
            <span>{tUi("headersRow")}</span>
          </label>

          {direction === "csv-to-json" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dynamicTyping}
                onChange={(e) => setDynamicTyping(e.target.checked)}
                className="rounded border-slate-300 accent-sky-700"
              />
              <span>{tUi("parseNumbersBooleans")}</span>
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
              <span>{direction === "csv-to-json" ? tUi("jSONOutput") : tUi("cSVOutput")}</span>
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
              <span>{tUi("table")}</span>
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">{busy ? tUi("readingFile") : tUi("openFile")}</span>
            <input
              type="file"
              accept={accept}
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
            <span>{copied ? tUi("copied") : tUi("copy")}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!conversion.output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{tUi("download")}</span>
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900"
            title={tUi("clear")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {isParquetTool ? (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{tUi("parquetNotSupported")}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      {status ? (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          {status}
        </div>
      ) : null}

      {workbook && workbook.sheets.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {tUi("sheets")}
          </span>
          {workbook.sheets.map((sheet, index) => (
            <button
              key={`${sheet.name}-${index}`}
              type="button"
              onClick={() => selectSheet(index)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                index === activeSheet
                  ? "bg-sky-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}

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
                ? tUi("tSVInput")
                : tUi("cSVInput")
              : tUi("jSONInput")}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === "csv-to-json"
                ? tUi("pasteCsvOrTsvHere")
                : tUi("pasteJsonArrayOrObjectHere")
            }
            rows={16}
            spellCheck={false}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {direction === "csv-to-json" ? tUi("convertedJSON") : tUi("convertedCSV")}
          </div>

          {activeTab === "json" ? (
            <textarea
              value={conversion.output}
              readOnly
              placeholder={tUi("convertedOutputWillAppearHere")}
              rows={16}
              spellCheck={false}
              className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-emerald-400 outline-none placeholder:text-slate-600"
            />
          ) : (
            <div className="max-h-[440px] overflow-auto p-4">
              {sortedTable.length > 0 ? (
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900">
                    <tr>
                      <th className="p-2 text-slate-500">#</th>
                      {Object.keys(conversion.parsedTable[0] || {}).map((col) => (
                        <th
                          key={col}
                          role="columnheader"
                          aria-sort={
                            sortColumn === col
                              ? sortAscending
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          tabIndex={0}
                          onClick={() => toggleSort(col)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleSort(col);
                            }
                          }}
                          className="cursor-pointer select-none p-2 font-semibold text-sky-400"
                        >
                          <span className="inline-flex items-center gap-1">
                            <span>{col}</span>
                            {sortColumn === col ? (
                              <span aria-hidden="true">{sortAscending ? "▲" : "▼"}</span>
                            ) : null}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortedTable.map((row: any, i) => (
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
                  {tUi("dataIsEmptyOrCouldNotBeFormattedIntoATable")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
