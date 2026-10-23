"use client";

import type { OpenPdf } from "./pdfjs";

export type PdfBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string };

type Line = {
  text: string;
  /** Baseline y in viewport space (grows downwards). */
  baseline: number;
  /** Height of the tallest run on the line. */
  height: number;
  mono: boolean;
};

const LIST_MARKER = /^\s*([-*•·▪◦‣*]|[-–—]|\d+[.)]|[a-z][.)])\s+/i;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Groups the text items of one page into visual lines. */
function collectLines(
  items: unknown[],
  viewport: { transform: number[]; scale: number },
  transform: (m1: number[], m2: number[]) => number[],
  styles: Record<string, { fontFamily?: string }>,
): Line[] {
  type Piece = { str: string; x: number; baseline: number; height: number; mono: boolean };
  const pieces: Piece[] = [];

  for (const item of items as {
    str?: string;
    transform?: number[];
    width?: number;
    fontName?: string;
  }[]) {
    if (typeof item?.str !== "string" || !item.str.trim()) continue;
    if (!Array.isArray(item.transform)) continue;

    const tx = transform(viewport.transform, item.transform);
    const height = Math.hypot(tx[2], tx[3]) || 10;
    const family = styles[item.fontName ?? ""]?.fontFamily ?? "";
    pieces.push({
      str: item.str,
      x: tx[4],
      baseline: tx[5],
      height,
      mono: /mono|code|courier|consol/i.test(family) || /mono/i.test(item.fontName ?? ""),
    });
  }

  if (!pieces.length) return [];

  pieces.sort((a, b) => (Math.abs(a.baseline - b.baseline) < 2 ? a.x - b.x : a.baseline - b.baseline));

  const lines: Line[] = [];
  let current: { pieces: Piece[]; baseline: number } | null = null;

  for (const piece of pieces) {
    if (current && Math.abs(piece.baseline - current.baseline) < Math.max(2, piece.height * 0.4)) {
      current.pieces.push(piece);
      current.baseline = (current.baseline + piece.baseline) / 2;
    } else {
      if (current) lines.push(finishLine(current.pieces));
      current = { pieces: [piece], baseline: piece.baseline };
    }
  }
  if (current) lines.push(finishLine(current.pieces));

  return lines;

  function finishLine(group: Piece[]): Line {
    group.sort((a, b) => a.x - b.x);
    const text = group.map((p) => p.str).join("").replace(/\s+/g, " ").trim();
    return {
      text,
      baseline: group[0].baseline,
      height: Math.max(...group.map((p) => p.height)),
      mono: group.some((p) => p.mono),
    };
  }
}

/**
 * Extracts a structured representation of a PDF: headings, paragraphs, lists
 * and code blocks. Uses the PDF text layer only — no OCR.
 */
export async function extractBlocks(
  open: OpenPdf,
  pageNumbers?: number[],
): Promise<{ blocks: PdfBlock[]; emptyPages: number[] }> {
  const pages = pageNumbers ?? Array.from({ length: open.doc.numPages }, (_, i) => i + 1);
  const blocks: PdfBlock[] = [];
  const emptyPages: number[] = [];

  for (const pageNumber of pages) {
    const page = await open.doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines = collectLines(
      content.items,
      viewport,
      open.pdfjs.Util.transform,
      (content.styles ?? {}) as Record<string, { fontFamily?: string }>,
    );

    if (!lines.length) {
      emptyPages.push(pageNumber);
      continue;
    }

    const bodyHeight = median(lines.map((l) => l.height)) || 10;
    let paragraph: { text: string } | null = null;
    let list: { ordered: boolean; items: string[] } | null = null;
    let codeText = "";
    let previousBottom: number | null = null;

    const flushParagraph = () => {
      if (paragraph?.text.trim()) blocks.push({ type: "paragraph", text: paragraph.text.trim() });
      paragraph = null;
    };
    const flushList = () => {
      if (list?.items.length) blocks.push({ type: "list", ...list });
      list = null;
    };
    const flushCode = () => {
      if (codeText.trim()) blocks.push({ type: "code", text: codeText });
      codeText = "";
    };
    const flushAll = () => {
      flushParagraph();
      flushList();
      flushCode();
    };

    for (const line of lines) {
      if (!line.text) {
        previousBottom = null;
        continue;
      }

      const top = line.baseline - line.height;
      const gap = previousBottom === null ? 0 : top - previousBottom;

      if (line.mono) {
        flushParagraph();
        flushList();
        codeText += `${line.text}\n`;
        previousBottom = line.baseline;
        continue;
      }
      flushCode();

      const listMatch = line.text.match(LIST_MARKER);
      if (listMatch) {
        flushParagraph();
        const ordered = /\d/.test(listMatch[1]);
        const itemText = line.text.slice(listMatch[0].length).trim();
        if (!list || list.ordered !== ordered) {
          flushList();
          list = { ordered, items: [] };
        }
        list.items.push(itemText);
        previousBottom = line.baseline;
        continue;
      }
      flushList();

      const ratio = line.height / bodyHeight;
      if (ratio > 1.15 && line.text.length < 140 && !/[.!?]$/.test(line.text)) {
        flushParagraph();
        const level: 1 | 2 | 3 = ratio > 1.7 ? 1 : ratio > 1.38 ? 2 : 3;
        blocks.push({ type: "heading", level, text: line.text });
        previousBottom = line.baseline;
        continue;
      }

      if (gap > bodyHeight * 0.85) {
        flushParagraph();
        paragraph = { text: line.text };
      } else if (paragraph) {
        // Re-join words that were split across a line break.
        const separator = paragraph.text.endsWith("-") ? "" : " ";
        paragraph.text += separator + line.text;
      } else {
        paragraph = { text: line.text };
      }

      previousBottom = line.baseline;
    }

    flushAll();
  }

  return { blocks, emptyPages };
}

/** Renders the extracted blocks as Markdown. */
export function blocksToMarkdown(blocks: PdfBlock[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(`${"#".repeat(block.level)} ${block.text}`, "");
        break;
      case "paragraph":
        out.push(block.text, "");
        break;
      case "list":
        block.items.forEach((item, i) => {
          out.push(`${block.ordered ? `${i + 1}.` : "-"} ${item}`);
        });
        out.push("");
        break;
      case "code":
        out.push("```", block.text.replace(/\n$/, ""), "```", "");
        break;
    }
  }
  return out.join("\n").trim() + "\n";
}
