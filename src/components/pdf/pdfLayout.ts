/**
 * Layout analysis for PDF -> DOCX: turns positioned text fragments into rows,
 * tables and paragraphs. Pure functions, no PDF or DOCX library involved, so it
 * can be tested in Node.
 *
 * Coordinates are PDF points with the origin at the top-left of the page.
 */

export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  /** Font size in points. */
  size: number;
  /** "sans-serif" | "serif" | "monospace" */
  family: string;
}

export interface Fragment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  kind: "text" | "figure";
  runs: Run[];
  /** Index into the page's figure list, for kind "figure". */
  figure?: number;
}

export interface Column {
  x0: number;
  x1: number;
}

export interface Block {
  columns: Column[];
  /** rows[r][c] holds the fragments of cell (r, c), top to bottom. */
  rows: Fragment[][][];
  y0: number;
  y1: number;
}

const ALIGN_TOLERANCE = 10;
const LEFT_TOLERANCE = 4;
/** Largest vertical gap (as a multiple of the line height) that keeps rows in one block. */
const MAX_GAP_FACTOR = 1.5;

export const fragmentText = (f: Fragment): string => f.runs.map((r) => r.text).join("");
export const fragmentSize = (f: Fragment): number =>
  Math.max(0, ...f.runs.map((r) => r.size)) || 10;
const height = (f: { y0: number; y1: number }) => Math.max(1, f.y1 - f.y0);

function overlapY(a: { y0: number; y1: number }, b: { y0: number; y1: number }): number {
  return Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
}

/** Groups fragments whose vertical extents overlap into visual rows. */
export function clusterRows(fragments: Fragment[]): Fragment[][] {
  const sorted = [...fragments].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows: { y0: number; y1: number; frags: Fragment[] }[] = [];
  for (const f of sorted) {
    const row = rows[rows.length - 1];
    if (row && overlapY(row, f) >= 0.5 * Math.min(height(row), height(f))) {
      row.frags.push(f);
      row.y0 = Math.min(row.y0, f.y0);
      row.y1 = Math.max(row.y1, f.y1);
    } else {
      rows.push({ y0: f.y0, y1: f.y1, frags: [f] });
    }
  }
  return rows.map((r) => r.frags.sort((a, b) => a.x0 - b.x0));
}

/** Joins neighbouring fragments of a row that are really one run of text. */
export function mergeRowFragments(row: Fragment[]): Fragment[] {
  const out: Fragment[] = [];
  for (const f of row) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === "text" && f.kind === "text") {
      const gap = f.x0 - prev.x1;
      const size = Math.min(fragmentSize(prev), fragmentSize(f));
      if (gap < size * 0.4) {
        const needsSpace =
          gap > size * 0.12 && !/\s$/.test(fragmentText(prev)) && !/^\s/.test(fragmentText(f));
        prev.runs = [
          ...prev.runs,
          ...(needsSpace ? [{ ...f.runs[0], text: " " }] : []),
          ...f.runs,
        ];
        prev.x1 = Math.max(prev.x1, f.x1);
        prev.y0 = Math.min(prev.y0, f.y0);
        prev.y1 = Math.max(prev.y1, f.y1);
        continue;
      }
    }
    out.push({ ...f, runs: [...f.runs] });
  }
  return out;
}

function aligned(f: Fragment, c: Column, tolerance: number): boolean {
  return (
    Math.abs(f.x0 - c.x0) <= tolerance ||
    Math.abs(f.x1 - c.x1) <= tolerance ||
    Math.abs((f.x0 + f.x1) / 2 - (c.x0 + c.x1) / 2) <= tolerance
  );
}

function overlapsX(f: Fragment, c: Column): boolean {
  return Math.min(f.x1, c.x1) - Math.max(f.x0, c.x0) > 0;
}

/**
 * Tries to place a row into the block's column grid. Returns the column index
 * for each fragment (new columns are appended), or null if it does not fit.
 */
function placeRow(block: Block, row: Fragment[]): number[] | null {
  const taken = new Set<number>();
  const assignment: number[] = [];
  const extra: Column[] = [];

  for (const f of row) {
    const hits: number[] = [];
    block.columns.forEach((c, index) => {
      if (overlapsX(f, c)) hits.push(index);
    });
    if (hits.length > 1) return null; // spans several columns
    if (hits.length === 1) {
      const index = hits[0];
      const tolerance = row.length === 1 ? LEFT_TOLERANCE : ALIGN_TOLERANCE;
      const ok =
        row.length === 1
          ? Math.abs(f.x0 - block.columns[index].x0) <= tolerance
          : aligned(f, block.columns[index], tolerance);
      if (!ok || taken.has(index)) return null;
      taken.add(index);
      assignment.push(index);
    } else {
      // A fragment outside every known column starts a new one, but only
      // next to a fragment that already fits the grid.
      if (row.length === 1) return null;
      extra.push({ x0: f.x0, x1: f.x1 });
      assignment.push(block.columns.length + extra.length - 1);
    }
  }

  if (extra.length && taken.size === 0) return null;
  block.columns.push(...extra);
  return assignment;
}

/** Splits the page's rows into blocks that share one column grid. */
export function buildBlocks(rows: Fragment[][]): Block[] {
  const blocks: Block[] = [];

  for (const row of rows) {
    const y0 = Math.min(...row.map((f) => f.y0));
    const y1 = Math.max(...row.map((f) => f.y1));
    const current = blocks[blocks.length - 1];

    if (current) {
      const lineHeight = Math.max(y1 - y0, 6);
      const gap = y0 - current.y1;
      if (gap <= lineHeight * MAX_GAP_FACTOR) {
        // Work on a copy of the grid so a failed placement leaves it untouched.
        // A multi-column row never joins a block of plain single-column lines
        // (paragraphs, lists); it starts the table itself.
        if (current.columns.length === 1 && row.length > 1) {
          blocks.push({
            columns: row.map((f) => ({ x0: f.x0, x1: f.x1 })),
            rows: [row.map((f) => [f])],
            y0,
            y1,
          });
          continue;
        }
        const trial: Block = { ...current, columns: current.columns.map((c) => ({ ...c })) };
        const assignment = placeRow(trial, row);
        if (assignment) {
          current.columns = trial.columns;
          const cells: Fragment[][] = current.columns.map(() => []);
          row.forEach((f, i) => cells[assignment[i]].push(f));
          // Rows added earlier may have fewer cells now that a column was added.
          for (const earlier of current.rows) {
            while (earlier.length < current.columns.length) earlier.push([]);
          }
          current.rows.push(cells);
          current.y1 = Math.max(current.y1, y1);
          continue;
        }
      }
    }

    blocks.push({
      columns: row.map((f) => ({ x0: f.x0, x1: f.x1 })),
      rows: [row.map((f) => [f])],
      y0,
      y1,
    });
  }

  // Rows that continue a cell (a single fragment under the same column) are
  // stored as their own row; fold them into the cell above them.
  for (const block of blocks) {
    if (block.columns.length < 2) continue;
    const folded: Fragment[][][] = [];
    for (const cells of block.rows) {
      const filled = cells.map((c, i) => (c.length ? i : -1)).filter((i) => i >= 0);
      const previous = folded[folded.length - 1];
      if (previous && filled.length === 1 && previous[filled[0]]?.length) {
        const prevRowFilled = previous.filter((c) => c.length).length;
        if (prevRowFilled >= 1 && cells[filled[0]].every((f) => f.kind === "text")) {
          previous[filled[0]].push(...cells[filled[0]]);
          continue;
        }
      }
      folded.push(cells);
    }
    block.rows = folded;
  }

  return blocks;
}

export interface Paragraph {
  runs: Run[];
  size: number;
  bold: boolean;
  /** Vertical gap above, in points. */
  gapBefore: number;
  x0: number;
}

const LIST_MARKER = /^\s*([-*•·▪◦‣]|\d{1,3}[.)]|[a-z][.)])\s+/i;
export const isListItem = (text: string): boolean => LIST_MARKER.test(text);

/** Merges the lines of a single-column block into paragraphs. */
export function buildParagraphs(block: Block): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let previous: Fragment | null = null;

  for (const cells of block.rows) {
    const fragment = cells[0]?.[0];
    if (!fragment || fragment.kind !== "text") continue;
    const text = fragmentText(fragment);
    const size = fragmentSize(fragment);
    const bold = fragment.runs.every((r) => r.bold || !r.text.trim());
    const last = paragraphs[paragraphs.length - 1];

    const gap = previous ? fragment.y0 - previous.y1 : 0;
    const startsNew =
      !last ||
      !previous ||
      gap > size * 0.55 ||
      Math.abs(size - last.size) > 1 ||
      bold !== last.bold ||
      isListItem(text) ||
      /[.!?:]\s*$/.test(last.runs.map((r) => r.text).join("")) && fragment.x0 - last.x0 > size;

    if (startsNew) {
      paragraphs.push({
        runs: [...fragment.runs],
        size,
        bold,
        gapBefore: previous ? Math.max(0, gap) : 0,
        x0: fragment.x0,
      });
    } else {
      const lastText = last.runs.map((r) => r.text).join("");
      const joiner = /-\s*$/.test(lastText) ? "" : " ";
      last.runs.push({ ...fragment.runs[0], text: joiner }, ...fragment.runs);
    }
    previous = fragment;
  }
  return paragraphs;
}

/** Median font size weighted by characters: the body text size of a page. */
export function bodySize(fragments: Fragment[]): number {
  const samples: number[] = [];
  for (const f of fragments) {
    if (f.kind !== "text") continue;
    for (const run of f.runs) {
      for (let i = 0; i < Math.min(run.text.length, 200); i += 1) samples.push(run.size);
    }
  }
  if (!samples.length) return 10;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}
