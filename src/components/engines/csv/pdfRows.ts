"use client";

/**
 * The text of a PDF, read as rows.
 *
 * The PDF suite already reads documents with PDF.js, so the same loader is
 * used here: no second copy of the library and no upload of the document.
 *
 * A bank statement is a table in a text layer, so the lines of every page are
 * grouped by their baseline and every line is cut into its columns: a run of
 * two or more spaces inside a text run and a wide gap between two text runs
 * both start a new column.
 */

import { closePdf, openPdf } from "../../pdf/pdfjs";

export interface PdfRows {
  /** The rows of the document, line by line. */
  rows: string[][];
  /** How many pages the document has. */
  pageCount: number;
  /** How many pages carried a text layer. */
  pagesWithText: number;
}

interface Piece {
  str: string;
  /** The left edge of the piece in page coordinates. */
  x: number;
  /** The width of the piece in page coordinates. */
  width: number;
  /** The baseline of the piece. */
  baseline: number;
  /** The height of the piece. */
  height: number;
}

interface TextItem {
  str?: string;
  transform?: number[];
  width?: number;
}

/** Groups the text items of a page into visual lines. */
function groupLines(
  items: TextItem[],
  viewportTransform: number[],
  transform: (m1: number[], m2: number[]) => number[],
): Piece[][] {
  const pieces: Piece[] = [];

  for (const item of items) {
    if (typeof item?.str !== "string" || !item.str.trim()) continue;
    if (!Array.isArray(item.transform)) continue;
    const tx = transform(viewportTransform, item.transform);
    const height = Math.hypot(tx[2], tx[3]) || 10;
    pieces.push({
      str: item.str,
      x: tx[4],
      width: typeof item.width === "number" ? item.width : 0,
      baseline: tx[5],
      height,
    });
  }

  if (!pieces.length) return [];

  pieces.sort((a, b) =>
    Math.abs(a.baseline - b.baseline) < 2 ? a.x - b.x : a.baseline - b.baseline,
  );

  const lines: Piece[][] = [];
  let current: Piece[] = [];
  let baseline = 0;

  for (const piece of pieces) {
    if (current.length && Math.abs(piece.baseline - baseline) < Math.max(2, piece.height * 0.4)) {
      current.push(piece);
      baseline = (baseline + piece.baseline) / 2;
    } else {
      if (current.length) lines.push(current);
      current = [piece];
      baseline = piece.baseline;
    }
  }
  if (current.length) lines.push(current);

  return lines;
}

/** Cuts one line into its columns. */
function lineToRow(pieces: Piece[]): string[] {
  const sorted = [...pieces].sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let cell = "";
  let previousEnd: number | null = null;
  let previousHeight = 10;
  let afterSpace = false;

  const flush = () => {
    const value = cell.trim();
    if (value) cells.push(value);
    cell = "";
  };

  for (const piece of sorted) {
    const text = piece.str.trim();

    if (!text) {
      /* A run of spaces is the separator between two columns. */
      afterSpace = true;
      continue;
    }

    const fields = piece.str
      .split(/\s{2,}/)
      .map((field) => field.trim())
      .filter((field) => field.length);
    if (!fields.length) continue;

    const gap = previousEnd === null ? 0 : piece.x - previousEnd;
    const threshold = Math.max(6, previousHeight * 0.75);

    for (let i = 0; i < fields.length; i += 1) {
      if (i > 0) {
        /* A run of spaces inside the text always starts a new column. */
        flush();
      } else if (cell !== "" && (afterSpace || gap >= threshold)) {
        /* A run of spaces or a wide gap before the text starts a new column. */
        flush();
      }
      cell = cell === "" ? fields[i] : `${cell} ${fields[i]}`;
    }

    afterSpace = false;
    previousEnd = piece.x + (piece.width || 0);
    previousHeight = piece.height;
  }

  flush();
  return cells;
}

/**
 * Reads the rows of a PDF.
 *
 * A document without a text layer (a scan) carries no rows at all; the
 * caller reports that instead of pretending the document was empty.
 */
export async function readPdfRows(data: Uint8Array): Promise<PdfRows> {
  const open = await openPdf(data);
  try {
    const rows: string[][] = [];
    let pagesWithText = 0;

    for (let number = 1; number <= open.doc.numPages; number += 1) {
      const page = await open.doc.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const lines = groupLines(
        content.items as unknown as TextItem[],
        viewport.transform,
        open.pdfjs.Util.transform,
      );
      if (!lines.length) continue;
      pagesWithText += 1;
      for (const line of lines) {
        const row = lineToRow(line);
        if (row.length) rows.push(row);
      }
    }

    return { rows, pageCount: open.doc.numPages, pagesWithText };
  } finally {
    await closePdf(open);
  }
}
