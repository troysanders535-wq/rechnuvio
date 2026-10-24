"use client";

import { jsPDF } from "jspdf";

export const PAGE_W = 595.28; // A4 width in points
export const PAGE_H = 841.89;
export const MARGIN = 56;

export function createDoc(title?: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  // Identify the file as ours instead of advertising the PDF library.
  (doc.setProperties as any)({
    title: title ?? "",
    producer: "Rechnuvio",
    creator: "Rechnuvio",
  });
  return doc;
}

/** Wraps text to the printable width. */
export function wrap(doc: jsPDF, text: string, width = PAGE_W - MARGIN * 2): string[] {
  const lines = doc.splitTextToSize(text, width) as string[];
  return lines.length ? lines : [""];
}

/**
 * Draws a block of text starting at `y` and returns the new y position.
 * Creates a new page when the content no longer fits.
 */
export function drawBlock(
  doc: jsPDF,
  lines: string[],
  y: number,
  options: { lineHeight?: number; indent?: number; gapAfter?: number } = {},
): number {
  const lineHeight = options.lineHeight ?? 14;
  const indent = options.indent ?? 0;
  const gapAfter = options.gapAfter ?? 6;

  let cursor = y;
  for (const line of lines) {
    if (cursor > PAGE_H - MARGIN) {
      doc.addPage();
      cursor = MARGIN;
    }
    doc.text(line, MARGIN + indent, cursor);
    cursor += lineHeight;
  }
  return cursor + gapAfter;
}

export function drawHeading(doc: jsPDF, text: string, level: 1 | 2 | 3, y: number): number {
  const size = level === 1 ? 18 : level === 2 ? 15 : 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  const lines = wrap(doc, text);
  let cursor = drawBlock(doc, lines, y, { lineHeight: size + 4, gapAfter: 4 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  return cursor;
}

export function drawParagraph(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  return drawBlock(doc, wrap(doc, text), y, { lineHeight: 14 });
}

export function drawBullet(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = wrap(doc, text, PAGE_W - MARGIN * 2 - 14);
  return drawBlock(doc, lines, y, { lineHeight: 14, indent: 14, gapAfter: 2 });
}

export function drawKeyValue(doc: jsPDF, key: string, value: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${key}:`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = wrap(doc, value, PAGE_W - MARGIN * 2 - 120);
  let cursor = y;
  for (const line of lines) {
    if (cursor > PAGE_H - MARGIN) {
      doc.addPage();
      cursor = MARGIN;
    }
    doc.text(line, MARGIN + 110, cursor);
    cursor += 13;
  }
  return cursor + 4;
}

export function drawRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(210);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineWidth(0.2);
  return y + 14;
}

/** Reads the natural pixel size of an image from a data URL. */
export function readImageSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Could not read the image."));
    image.src = dataUrl;
  });
}
