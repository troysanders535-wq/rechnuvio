"use client";

import { PDFDocument } from "@cantoo/pdf-lib";

export class PasswordRequiredError extends Error {
  constructor() {
    super("This PDF is password protected.");
    this.name = "PasswordRequiredError";
  }
}

function looksEncrypted(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /encrypt|password/i.test(message);
}

/** Producer / Creator stamped on the PDFs that our own tools generate. */
export const APP_PRODUCER = "Digital ToolPad";

/**
 * Loads a PDF, transparently handling encrypted documents.
 *
 * `updateMetadata: false` is essential here: with pdf-lib's default the
 * Producer field of the loaded document is silently overwritten with
 * "pdf-lib (https://github.com/Hopding/pdf-lib)". That would make the
 * metadata viewer show a wrong value, let the metadata editor stamp a
 * third-party name into the user's file and stop the metadata remover from
 * ever removing the Producer.
 *
 * @throws {PasswordRequiredError} when the document is encrypted and the
 * supplied password is missing or wrong.
 */
export async function loadPdfDoc(
  bytes: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<PDFDocument> {
  const options = { password, updateMetadata: false };
  try {
    return await PDFDocument.load(bytes, options);
  } catch (err) {
    if (looksEncrypted(err)) throw new PasswordRequiredError();
    throw err;
  }
}

/**
 * Creates a new document that identifies itself as a Digital ToolPad file
 * instead of advertising the PDF library that produced it.
 */
export async function createPdfDoc(title?: string): Promise<PDFDocument> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  if (title) doc.setTitle(title);
  doc.setProducer(APP_PRODUCER);
  doc.setCreator(APP_PRODUCER);
  return doc;
}

/** Parses the document information dictionary into a flat record. */
export async function readMetadata(doc: PDFDocument) {
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    producer: doc.getProducer() ?? "",
    creator: doc.getCreator() ?? "",
    creationDate: doc.getCreationDate() ?? null,
    modificationDate: doc.getModificationDate() ?? null,
    pageCount: doc.getPageCount(),
  };
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

/**
 * Converts a browser image file into bytes that pdf-lib can embed.
 * Anything that is not already PNG/JPEG is re-encoded through a canvas.
 */
export async function imageToEmbeddable(
  file: File,
): Promise<{ bytes: Uint8Array; type: "png" | "jpg" }> {
  const lower = file.type.toLowerCase();
  if (lower === "image/png") {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: "png" };
  }
  if (lower === "image/jpeg" || lower === "image/jpg") {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: "jpg" };
  }

  // WebP / GIF / BMP / SVG -> PNG via canvas.
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas to convert this image.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error(`Could not convert ${file.name} to PNG.`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: "png" };
}

/** Reads the pixel dimensions of an image file. */
export async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return size;
}
