/**
 * Write a markdown document into a PDF.
 *
 * The markdown is parsed into blocks first and every block is drawn with the
 * text API of jsPDF, so the resulting file carries the rendered document: the
 * words of the document, the headings, the lists and the code blocks - never
 * the markdown syntax itself.
 */

import jsPDF from "jspdf";

import { parseMarkdown } from "./converters";

const MARGIN = 15;

export function buildPdfFromMarkdown(markdown: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN * 2;
  let y = MARGIN + 12;

  const newPage = () => {
    doc.addPage();
    y = MARGIN + 12;
  };

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) newPage();
  };

  const draw = (text: string, size: number, style: "normal" | "bold" | "italic") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || " ", maxWidth) as string[];
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
  };

  for (const block of parseMarkdown(markdown)) {
    if (block.kind === "heading") {
      const size = block.level <= 1 ? 18 : block.level === 2 ? 15 : 13;
      y += 6;
      draw(block.text, size, "bold");
      y += 4;
      continue;
    }

    if (block.kind === "paragraph") {
      draw(block.text, 11, "normal");
      y += 6;
      continue;
    }

    if (block.kind === "list") {
      block.items.forEach((item, position) => {
        const marker = block.ordered ? `${position + 1}.` : "•";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(item, maxWidth - 16) as string[];
        lines.forEach((line, lineIndex) => {
          ensureRoom(11 * 1.35);
          if (lineIndex === 0) doc.text(marker, MARGIN, y);
          doc.text(line, MARGIN + 16, y);
          y += 11 * 1.35;
        });
      });
      y += 6;
      continue;
    }

    if (block.kind === "quote") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(block.text, maxWidth - 14) as string[];
      for (const line of lines) {
        ensureRoom(11 * 1.35);
        doc.setDrawColor(148, 163, 184);
        doc.line(MARGIN, y - 9, MARGIN, y + 3);
        doc.text(line, MARGIN + 14, y);
        y += 11 * 1.35;
      }
      y += 6;
      continue;
    }

    if (block.kind === "code") {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      for (const line of block.lines) {
        ensureRoom(10 * 1.3);
        doc.text(line || " ", MARGIN, y);
        y += 10 * 1.3;
      }
      y += 6;
      continue;
    }

    if (block.kind === "rule") {
      ensureRoom(12);
      doc.setDrawColor(203, 213, 225);
      doc.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 12;
    }
  }

  doc.setFont("helvetica", "normal");
  return doc;
}
