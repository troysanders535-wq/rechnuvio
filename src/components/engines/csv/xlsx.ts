"use client";

/**
 * A reader for the SpreadsheetML format behind an .xlsx file.
 *
 * An .xlsx file is a ZIP archive (JSZip is already a dependency) that holds
 * `xl/workbook.xml` with the sheet names, `xl/_rels/workbook.xml.rels` with
 * the link from every sheet to its part, `xl/sharedStrings.xml` with the
 * shared string table and one `xl/worksheets/sheetN.xml` per sheet. The parts
 * are XML, so the browser parses them with DOMParser - no extra dependency
 * and no upload of the file.
 *
 * The legacy binary .xls format is a different container and is NOT read
 * here; the workspace says so instead of pretending.
 */

import JSZip from "jszip";

export interface XlsxSheet {
  /** The name of the sheet as it is shown on the tab. */
  name: string;
  /** The cells of the sheet, row by row. */
  rows: string[][];
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
  /** How many cells were read with a date or time number format. */
  formattedDates: number;
  /** How many cells were read with a percentage number format. */
  formattedPercentages: number;
}

/* ------------------------------------------------------------- xml helpers -- */

function parseXml(text: string): Document | null {
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (!doc) return null;
    const failure = doc.getElementsByTagName("parsererror");
    if (failure && failure.length) return null;
    return doc;
  } catch {
    return null;
  }
}

/** Every element with the given local name, no matter which namespace it is in. */
function elements(root: Document | Element, localName: string): Element[] {
  if (!root || typeof root.getElementsByTagNameNS !== "function") return [];
  const found = root.getElementsByTagNameNS("*", localName);
  const out: Element[] = [];
  for (let i = 0; i < found.length; i += 1) out.push(found[i]);
  return out;
}

/** The first element with the given local name. */
function first(root: Document | Element, localName: string): Element | null {
  const found = elements(root, localName);
  return found.length ? found[0] : null;
}

/** The text of an element and of all its children. */
function textOf(element: Element | null): string {
  if (!element) return "";
  return element.textContent || "";
}

/** The relationship id of a sheet, for example "rId1". */
function relationshipId(sheet: Element): string {
  const direct = sheet.getAttribute("r:id") || sheet.getAttribute("id") || "";
  if (direct) return direct;
  const namespaced = sheet.getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "id",
  );
  return namespaced || "";
}

/* ------------------------------------------------------------ cell helpers -- */

/** The zero based column of a cell reference such as "AB12". */
function columnIndex(reference: string): number {
  const match = /^([A-Za-z]+)/.exec(reference);
  if (!match) return -1;
  const letters = match[1].toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

/** The shared string table of the workbook. */
function readSharedStrings(doc: Document | null): string[] {
  if (!doc) return [];
  return elements(doc, "si").map((entry) =>
    elements(entry, "t")
      .map((part) => textOf(part))
      .join(""),
  );
}

/* ---------------------------------------------------------- number formats -- */

/** The format code behind the built in date and time formats. */
const BUILTIN_DATE_CODES: Record<number, string> = {
  14: "m/d/yy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yy h:mm",
  45: "mm:ss",
  46: "mm:ss",
  47: "mm:ss",
};

/**
 * Whether a number format shows a date or a time.
 *
 * The format code is cleaned first: quoted text and escaped characters are
 * literals, and a bracketed section carries a colour or an elapsed time
 * instruction, so none of them decide the answer.
 */
function isDateCode(formatCode: string | undefined): boolean {
  if (!formatCode) return false;
  const cleaned = formatCode
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/\[[^\]]*\]/g, "");
  if (/^\s*general\s*$/i.test(cleaned)) return false;
  return /[ymdhs]/i.test(cleaned);
}

/** Whether a number format shows a percentage. */
function isPercentFormat(formatCode: string | undefined): boolean {
  if (!formatCode) return false;
  return /%/.test(formatCode.replace(/"[^"]*"/g, ""));
}

/** The number of decimals a format code asks for. */
function decimalPlaces(formatCode: string): number {
  const match = /\.([0#]+)/.exec(formatCode);
  return match ? match[1].length : 0;
}

/* --------------------------------------------------------------- date parts -- */

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function pad(value: number, length: number): string {
  let text = String(Math.abs(value));
  while (text.length < length) text = `0${text}`;
  return value < 0 ? `-${text}` : text;
}

/**
 * The date of an Excel serial number.
 *
 * Excel counts the days from the 30th of December 1899 and pretends that
 * 1900 was a leap year, so the first 59 days need the other base.
 */
function serialToDate(serial: number): DateParts {
  const totalSeconds = Math.round(serial * 86400);
  const days = Math.floor(totalSeconds / 86400);
  const seconds = totalSeconds - days * 86400;
  const base = days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  const date = new Date(base + days * 86400000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60),
    second: seconds % 60,
  };
}

/**
 * Renders a date with the number format of the cell.
 *
 * Only the date and time tokens of the format code are honoured, which is
 * what a spreadsheet shows for a date cell. A format that cannot be read is
 * reported by the caller instead of being guessed.
 */
function renderDate(serial: number, formatCode: string): string {
  const parts = serialToDate(serial);
  const hasMeridiem = /am\/pm|a\/p/i.test(formatCode);
  let out = "";
  let index = 0;

  while (index < formatCode.length) {
    const char = formatCode[index];

    if (char === '"') {
      const end = formatCode.indexOf('"', index + 1);
      out += formatCode.slice(index + 1, end < 0 ? formatCode.length : end);
      index = end < 0 ? formatCode.length : end + 1;
      continue;
    }
    if (char === "\\") {
      out += formatCode[index + 1] || "";
      index += 2;
      continue;
    }
    if (char === "[") {
      const end = formatCode.indexOf("]", index);
      index = end < 0 ? formatCode.length : end + 1;
      continue;
    }
    if (char === ";" || char === "@") {
      index += 1;
      continue;
    }
    if (/^am\/pm/i.test(formatCode.slice(index))) {
      out += parts.hour < 12 ? "AM" : "PM";
      index += 5;
      continue;
    }
    if (/^a\/p/i.test(formatCode.slice(index))) {
      out += parts.hour < 12 ? "A" : "P";
      index += 3;
      continue;
    }

    const run = /^([yYdDhHsSmM]+)/.exec(formatCode.slice(index));
    if (run) {
      const token = run[1].toLowerCase();
      const count = run[1].length;
      if (token[0] === "y") {
        out += count > 2 ? String(parts.year) : pad(parts.year % 100, 2);
      } else if (token[0] === "d") {
        if (count >= 3) {
          const weekday = new Date(
            Date.UTC(parts.year, parts.month - 1, parts.day),
          ).getUTCDay();
          const name = count >= 4 ? DAY_NAMES[weekday] : DAY_NAMES[weekday].slice(0, 3);
          out += name;
        } else {
          out += pad(parts.day, count);
        }
      } else if (token[0] === "h") {
        const hour = hasMeridiem ? parts.hour % 12 || 12 : parts.hour;
        out += pad(hour, count);
      } else if (token[0] === "s") {
        out += pad(parts.second, count);
      } else {
        /* m is a month and, after an hour, a minute. */
        const isMinute = /h{1,2}[\s:]*m{1,2}/i.test(formatCode.slice(index - 4, index + 6));
        if (isMinute) {
          out += pad(parts.minute, count);
        } else if (count >= 3) {
          const name =
            count >= 4 ? MONTH_NAMES[parts.month - 1] : MONTH_NAMES[parts.month - 1].slice(0, 3);
          out += name;
        } else {
          out += pad(parts.month, count);
        }
      }
      index += run[1].length;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/* ------------------------------------------------------------------ styles -- */

/**
 * The number format of every cell style of the workbook.
 *
 * The result holds one entry per style: the format code of the style, or an
 * empty string when the style uses a plain number.
 */
function readStyles(doc: Document | null): string[] {
  if (!doc) return [];
  const formats = new Map<number, string>();
  for (const numFmt of elements(doc, "numFmt")) {
    const id = Number(numFmt.getAttribute("numFmtId"));
    const code = numFmt.getAttribute("formatCode") || "";
    if (!Number.isNaN(id)) formats.set(id, code);
  }
  const cellXfs = first(doc, "cellXfs");
  if (!cellXfs) return [];
  return elements(cellXfs, "xf").map((xf) => {
    const id = Number(xf.getAttribute("numFmtId") || "0");
    if (Number.isNaN(id)) return "";
    const code = formats.get(id);
    if (code !== undefined) return code;
    return BUILTIN_DATE_CODES[id] || "";
  });
}

/* ------------------------------------------------------------------- cells -- */

interface CellValue {
  value: string;
  isDate: boolean;
  isPercent: boolean;
}

function readCell(
  cell: Element,
  sharedStrings: string[],
  styleFormats: string[],
): CellValue {
  const type = cell.getAttribute("t") || "n";

  if (type === "inlineStr") {
    const inline = first(cell, "is");
    const value = elements(inline || cell, "t")
      .map((part) => textOf(part))
      .join("");
    return { value, isDate: false, isPercent: false };
  }

  const raw = textOf(first(cell, "v"));

  if (type === "s") {
    const index = Number(raw);
    const value = sharedStrings[index];
    return { value: value === undefined ? "" : value, isDate: false, isPercent: false };
  }
  if (type === "str" || type === "e") {
    return { value: raw, isDate: false, isPercent: false };
  }
  if (type === "b") {
    return { value: raw === "1" ? "TRUE" : "FALSE", isDate: false, isPercent: false };
  }

  if (raw === "") return { value: "", isDate: false, isPercent: false };
  const number = Number(raw);
  if (!Number.isFinite(number)) return { value: raw, isDate: false, isPercent: false };

  const styleIndex = Number(cell.getAttribute("s") || "-1");
  const formatCode =
    styleIndex >= 0 && styleIndex < styleFormats.length ? styleFormats[styleIndex] : "";

  if (formatCode && isDateCode(formatCode)) {
    return { value: renderDate(number, formatCode), isDate: true, isPercent: false };
  }
  if (formatCode && isPercentFormat(formatCode)) {
    const places = decimalPlaces(formatCode);
    return {
      value: `${(number * 100).toFixed(places)}%`,
      isDate: false,
      isPercent: true,
    };
  }

  return { value: raw, isDate: false, isPercent: false };
}

/** The cells of one sheet, row by row. */
function readSheet(
  doc: Document,
  sharedStrings: string[],
  styleFormats: string[],
): { rows: string[][]; dates: number; percentages: number } {
  const sheetData = first(doc, "sheetData");
  if (!sheetData) return { rows: [], dates: 0, percentages: 0 };

  const rows: string[][] = [];
  let dates = 0;
  let percentages = 0;
  let nextRow = 0;

  for (const row of elements(sheetData, "row")) {
    const rowAttribute = row.getAttribute("r");
    const rowIndex = rowAttribute ? Number(rowAttribute) - 1 : nextRow;
    nextRow = rowIndex + 1;

    const cells: string[] = [];
    let nextColumn = 0;

    for (const cell of elements(row, "c")) {
      const reference = cell.getAttribute("r") || "";
      const column = reference ? columnIndex(reference) : nextColumn;
      nextColumn = column + 1;

      const read = readCell(cell, sharedStrings, styleFormats);
      if (read.isDate) dates += 1;
      if (read.isPercent) percentages += 1;

      while (cells.length < column) cells.push("");
      cells[column] = read.value;
    }

    while (rows.length < rowIndex) rows.push([]);
    rows[rowIndex] = cells;
  }

  return { rows, dates, percentages };
}

/* ---------------------------------------------------------------- workbook -- */

/** The path of the part of a sheet inside the archive. */
function resolveTarget(target: string): string {
  const clean = target.replace(/^\.\//, "");
  if (clean.charAt(0) === "/") return clean.slice(1);
  return `xl/${clean}`;
}

/**
 * Reads a workbook.
 *
 * Throws an Error with a readable message when the bytes are not a workbook.
 */
export async function readXlsx(data: ArrayBuffer): Promise<XlsxWorkbook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error("not-a-zip");
  }

  const workbookFile = zip.file("xl/workbook.xml");
  if (!workbookFile) throw new Error("no-workbook");

  const workbookDoc = parseXml(await workbookFile.async("string"));
  if (!workbookDoc) throw new Error("no-workbook");

  const sharedStrings = readSharedStrings(
    zip.file("xl/sharedStrings.xml")
      ? parseXml(await zip.file("xl/sharedStrings.xml")!.async("string"))
      : null,
  );

  const styleFormats = readStyles(
    zip.file("xl/styles.xml")
      ? parseXml(await zip.file("xl/styles.xml")!.async("string"))
      : null,
  );

  /* The relationship part maps the id of a sheet onto its file. */
  const targets = new Map<string, string>();
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (relsFile) {
    const relsDoc = parseXml(await relsFile.async("string"));
    for (const relation of elements(relsDoc || workbookDoc, "Relationship")) {
      const id = relation.getAttribute("Id") || "";
      const target = relation.getAttribute("Target") || "";
      if (id && target) targets.set(id, resolveTarget(target));
    }
  }

  const sheets: XlsxSheet[] = [];
  let dates = 0;
  let percentages = 0;

  const sheetsNode = first(workbookDoc, "sheets");
  for (const sheet of elements(sheetsNode || workbookDoc, "sheet")) {
    const name = sheet.getAttribute("name") || "Sheet";
    const id = relationshipId(sheet);
    let path = targets.get(id) || "";
    if (!path) {
      /* A workbook without relationships still names its parts in order. */
      path = `xl/worksheets/sheet${sheets.length + 1}.xml`;
    }
    const file = zip.file(path);
    if (!file) continue;
    const doc = parseXml(await file.async("string"));
    if (!doc) continue;
    const read = readSheet(doc, sharedStrings, styleFormats);
    dates += read.dates;
    percentages += read.percentages;
    sheets.push({ name, rows: read.rows });
  }

  if (!sheets.length) throw new Error("no-sheets");

  return { sheets, formattedDates: dates, formattedPercentages: percentages };
}

/* -------------------------------------------------------------------- csv -- */

/** A field of a CSV document. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** The rows of a table as a CSV document. */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvField(cell ?? "")).join(",")).join("\n");
}
