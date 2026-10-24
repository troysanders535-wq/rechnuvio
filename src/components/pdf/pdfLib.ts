"use client";

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFString,
  decodePDFRawStream,
} from "@cantoo/pdf-lib";
import { closePdf, openPdf } from "./pdfjs";

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
export const APP_PRODUCER = "Rechnuvio";

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
 * Creates a new document that identifies itself as a Rechnuvio file
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

/* ------------------------------------------------------------------ */
/* XMP packet, document id and attachments                             */
/* ------------------------------------------------------------------ */

/** One entry of the XMP edit history or of the list of earlier versions. */
export type XmpVersion = {
  /** the XMP structure the entry was read from */
  source: "history" | "versions";
  /** the moment the version was written */
  modified: string | null;
  /** what the version changed */
  action: string | null;
  /** the identifier of that version */
  instanceId: string | null;
};

/** The GPS position that the XMP packet stores for the photo. */
export type XmpGps = {
  /** the latitude in decimal degrees, null when the packet uses another format */
  latitude: number | null;
  /** the longitude in decimal degrees, null when the packet uses another format */
  longitude: number | null;
  /** the values exactly as they are written in the packet */
  raw: string;
};

/** One embedded file of the document. */
export type PdfAttachment = {
  /** the name of the attachment */
  name: string;
  /** the size of the file in bytes, null when it could not be read */
  size: number | null;
  /** the description the document gives the file */
  description: string;
};

/** Everything the metadata table shows besides the information dictionary. */
export type ExtendedMetadata = {
  /** the identifier the producer gave the document */
  documentId: string | null;
  /** whether the document carries an XMP packet */
  hasXmp: boolean;
  /** the edit history and the earlier versions of the XMP packet */
  versions: XmpVersion[];
  /** the GPS coordinates of the photo inside the XMP packet */
  gps: XmpGps | null;
  /** the embedded files of the document */
  attachments: PdfAttachment[];
  /** false when the file could not be opened with PDF.js */
  readable: boolean;
};

/**
 * The inner XML of the first element with the given name.
 *
 * The XMP packet is machine written XML, so a targeted regular expression is
 * enough - and it works in the browser as well as on the server, where no
 * DOMParser is available.
 */
function readXmlBlock(xml: string, name: string): string | null {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return match ? match[1] : null;
}

/** The text of the first element with the given name. */
function readXmlText(xml: string, name: string): string | null {
  const block = readXmlBlock(xml, name);
  if (block === null) return null;
  const text = block.replace(/<[^>]*>/g, "").trim();
  return text || null;
}

/**
 * Reads the edit history and the earlier versions of an XMP packet.
 *
 * Both are lists of events: the media management schema stores the history
 * of a document in xmpMM:History, the versions a document had live in
 * xmpMM:Versions.
 */
export function parseXmpVersions(xmp: string): XmpVersion[] {
  const versions: XmpVersion[] = [];
  const structures: { source: XmpVersion["source"]; tag: string }[] = [
    { source: "history", tag: "xmpMM:History" },
    { source: "versions", tag: "xmpMM:Versions" },
  ];

  for (const structure of structures) {
    const block = readXmlBlock(xmp, structure.tag);
    if (!block) continue;
    const items = block.match(/<rdf:li\b[\s\S]*?<\/rdf:li>/g);
    if (!items) continue;
    for (const item of items) {
      versions.push({
        source: structure.source,
        modified: readXmlText(item, "stEvt:changed"),
        action: readXmlText(item, "stEvt:action"),
        instanceId: readXmlText(item, "stEvt:instanceID"),
      });
    }
  }

  return versions;
}

/**
 * Converts an XMP coordinate into decimal degrees.
 *
 * Three notations are in use: "48,51.5N" (degrees and minutes with a
 * hemisphere), "48/1 51/1 30/1" (degrees, minutes and seconds as fractions)
 * and a plain decimal number.
 */
function parseXmpCoordinate(value: string): number | null {
  const text = value.trim();
  if (!text) return null;

  if (text.indexOf("/") >= 0) {
    const parts = text.split(/\s+/).map((part) => {
      const [numerator, denominator] = part.split("/");
      const top = Number(numerator);
      const bottom = denominator === undefined ? 1 : Number(denominator);
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) {
        return NaN;
      }
      return top / bottom;
    });
    if (parts.some((part) => !Number.isFinite(part))) return null;
    const degrees = parts[0];
    const minutes = parts.length > 1 ? parts[1] : 0;
    const seconds = parts.length > 2 ? parts[2] : 0;
    const sign = degrees < 0 ? -1 : 1;
    return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
  }

  const match =
    /^(-?\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?(?:\s*,\s*(\d+(?:\.\d+)?))?\s*([NSEW])?$/i.exec(
      text,
    );
  if (!match) {
    const plain = Number(text);
    return Number.isFinite(plain) ? plain : null;
  }

  const degrees = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const seconds = match[3] ? Number(match[3]) : 0;
  const hemisphere = (match[4] || "").toUpperCase();
  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  if (degrees < 0) decimal = -decimal;
  if (hemisphere === "S" || hemisphere === "W") decimal = -decimal;
  return decimal;
}

/**
 * Reads the GPS coordinates of the photo from an XMP packet.
 *
 * The coordinates live in exif:GPSLatitude / exif:GPSLongitude; some writers
 * use the tiff: prefix for the same properties.
 */
export function parseXmpGps(xmp: string): XmpGps | null {
  const latitude =
    readXmlText(xmp, "exif:GPSLatitude") ?? readXmlText(xmp, "tiff:GPSLatitude");
  const longitude =
    readXmlText(xmp, "exif:GPSLongitude") ?? readXmlText(xmp, "tiff:GPSLongitude");
  if (!latitude || !longitude) return null;

  return {
    latitude: parseXmpCoordinate(latitude),
    longitude: parseXmpCoordinate(longitude),
    raw: `${latitude}, ${longitude}`,
  };
}

/**
 * Reads an object of a document, whatever its type is.
 *
 * The typed lookups of pdf-lib only accept one type at a time, so the types
 * that a trailer or a name tree can hold are tried one after another.
 */
function readObject(
  doc: PDFDocument,
  value: PDFObject | undefined,
): PDFObject | undefined {
  if (!value) return undefined;
  if (!(value instanceof PDFRef)) return value;

  const lookupMaybe = doc.context.lookupMaybe as unknown as (
    ref: PDFRef,
    type: unknown,
  ) => PDFObject | undefined;
  const types = [PDFArray, PDFDict, PDFHexString, PDFString, PDFName, PDFRawStream];
  for (const type of types) {
    try {
      const found = lookupMaybe.call(doc.context, value, type);
      if (found) return found;
    } catch {
      /* the object has another type - try the next one */
    }
  }
  return undefined;
}

/**
 * Reads the identifier of the document from the trailer.
 *
 * PDF.js does not expose the document id, so it is read from the trailer
 * dictionary, where the producer stores the /ID array.
 */
export function readDocumentId(doc: PDFDocument): string | null {
  try {
    const raw = doc.context.trailerInfo.ID;
    if (!raw) return null;
    const id = readObject(doc, raw);
    if (!(id instanceof PDFArray)) return null;
    const first = readObject(doc, id.get(0));
    if (first instanceof PDFHexString) return first.asString().toUpperCase();
    if (first instanceof PDFString) return first.asString();
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads the XMP packet and the embedded files of a document with PDF.js.
 *
 * PDF.js is the only reader in the browser that hands out the raw XMP packet
 * and the embedded files, so it is used for the parts that the document
 * information dictionary does not carry.
 */
export async function readPdfJsMetadata(
  bytes: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<{ xmp: string | null; attachments: PdfAttachment[]; readable: boolean }> {
  // PDF.js takes the buffer over, so it gets a copy of its own.
  const data =
    bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));

  let open: Awaited<ReturnType<typeof openPdf>> | null = null;
  try {
    open = await openPdf(data, password);
    const metadata = await open.doc.getMetadata();
    const raw = metadata.metadata ? String(metadata.metadata.getRaw() ?? "") : "";

    const attachments: PdfAttachment[] = [];
    const map = await open.doc.getAttachments();
    if (map) {
      for (const [name, entry] of map) {
        let size: number | null = null;
        try {
          const content = await open.doc.getAttachmentContent(name);
          size = content ? content.length : null;
        } catch {
          size = null;
        }
        attachments.push({
          name,
          size,
          description: entry.description || "",
        });
      }
    }

    return { xmp: raw.trim() ? raw : null, attachments, readable: true };
  } catch {
    // The file could not be opened - the table then says so instead of
    // pretending that the file carries no metadata.
    return { xmp: null, attachments: [], readable: false };
  } finally {
    if (open) await closePdf(open);
  }
}

/**
 * Reads everything the metadata table shows besides the information
 * dictionary: the XMP packet with its edit history and GPS coordinates, the
 * identifier of the document and the embedded files.
 */
export async function readExtendedMetadata(
  doc: PDFDocument,
  bytes: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<ExtendedMetadata> {
  const documentId = readDocumentId(doc);
  const { xmp, attachments, readable } = await readPdfJsMetadata(bytes, password);

  return {
    documentId,
    hasXmp: Boolean(xmp),
    versions: xmp ? parseXmpVersions(xmp) : [],
    gps: xmp ? parseXmpGps(xmp) : null,
    attachments,
    readable,
  };
}

/* ------------------------------------------------------------------ */
/* Removing the metadata                                               */
/* ------------------------------------------------------------------ */

/** What a metadata clean removed from a document. */
export type RemovedMetadata = {
  /** the document information dictionary held values */
  documentInformation: boolean;
  /** the XMP packet was deleted */
  xmp: boolean;
  /** the GPS coordinates were inside the XMP packet */
  gps: boolean;
  /** the number of removed embedded files */
  attachments: number;
};

/** Resolves a value of a dictionary to a dictionary, if it is one. */
function lookupDict(doc: PDFDocument, value: PDFObject | undefined): PDFDict | undefined {
  const resolved = readObject(doc, value);
  return resolved instanceof PDFDict ? resolved : undefined;
}

/**
 * Deletes the XMP packet of a document.
 *
 * Returns what the packet held: whether there was one at all and whether it
 * carried the GPS coordinates of the photo.
 */
function removeXmpPacket(doc: PDFDocument): { removed: boolean; gps: boolean } {
  const catalog = doc.catalog;
  const entry = catalog.get(PDFName.of("Metadata"));
  if (!entry) return { removed: false, gps: false };

  // The packet is read before it is dropped: the report has to name the
  // groups that were really in the file.
  let gps = false;
  const stream = readObject(doc, entry);
  if (stream instanceof PDFRawStream) {
    try {
      const text = new TextDecoder().decode(decodePDFRawStream(stream).decode());
      gps = Boolean(parseXmpGps(text));
    } catch {
      /* an unreadable packet is removed as well */
    }
  }

  catalog.delete(PDFName.of("Metadata"));
  // Removing the entry of the catalog is not enough: the packet stays in the
  // file as an orphaned object and its bytes can still be read.
  if (entry instanceof PDFRef) doc.context.delete(entry);
  return { removed: true, gps };
}

/** Collects the files of an embedded files name tree. */
function collectNameTreeValues(
  doc: PDFDocument,
  node: PDFDict,
  out: PDFRef[],
): void {
  const names = node.get(PDFName.of("Names"));
  if (names instanceof PDFArray) {
    for (let i = 1; i < names.size(); i += 2) {
      const value = names.get(i);
      if (value instanceof PDFRef) out.push(value);
    }
  }
  const kids = node.get(PDFName.of("Kids"));
  if (kids instanceof PDFArray) {
    for (let i = 0; i < kids.size(); i += 1) {
      const kid = lookupDict(doc, kids.get(i));
      if (kid) collectNameTreeValues(doc, kid, out);
    }
  }
}

/**
 * Removes one file of the embedded files tree.
 *
 * The value of a name tree is a file specification; it points at the stream
 * with the bytes of the file through its /EF entry.
 */
function removeFileSpec(doc: PDFDocument, ref: PDFRef): void {
  const spec = lookupDict(doc, ref);
  if (!spec) {
    doc.context.delete(ref);
    return;
  }
  const embedded = lookupDict(doc, spec.get(PDFName.of("EF")));
  if (embedded) {
    for (const key of embedded.keys()) {
      const stream = embedded.get(key);
      if (stream instanceof PDFRef) doc.context.delete(stream);
    }
  }
  doc.context.delete(ref);
}

/**
 * Drops the annotations that carried an embedded file.
 *
 * A file attachment annotation points at a file specification; when the file
 * is removed, the annotation would point at nothing.
 */
function removeAttachmentAnnotations(doc: PDFDocument): number {
  let removed = 0;
  try {
    for (const page of doc.getPages()) {
      const annots = page.node.Annots();
      if (!annots) continue;
      for (let i = annots.size() - 1; i >= 0; i -= 1) {
        const entry = annots.get(i);
        const annotation = lookupDict(doc, entry);
        if (!annotation) continue;
        const file = annotation.get(PDFName.of("FS"));
        if (!file) continue;
        annots.remove(i);
        if (entry instanceof PDFRef) doc.context.delete(entry);
        if (file instanceof PDFRef) removeFileSpec(doc, file);
        removed += 1;
      }
    }
  } catch {
    /* a broken annotation must not stop the clean */
  }
  return removed;
}

/**
 * Removes the embedded files of a document.
 *
 * The files live in the /EmbeddedFiles name tree of the catalog; the tree and
 * the file streams are removed with it.
 *
 * Returns the number of removed files.
 */
function removeAttachments(doc: PDFDocument): number {
  const catalog = doc.catalog;
  const names = lookupDict(doc, catalog.get(PDFName.of("Names")));
  if (!names) return 0;

  const embedded = names.get(PDFName.of("EmbeddedFiles"));
  if (!embedded) return 0;

  const tree = lookupDict(doc, embedded);
  const files: PDFRef[] = [];
  if (tree) collectNameTreeValues(doc, tree, files);
  for (const file of files) removeFileSpec(doc, file);

  names.delete(PDFName.of("EmbeddedFiles"));
  if (embedded instanceof PDFRef) doc.context.delete(embedded);
  if (names.keys().length === 0) {
    catalog.delete(PDFName.of("Names"));
    const namesRef = doc.context.getRef(names);
    if (namesRef) doc.context.delete(namesRef);
  }

  return files.length + removeAttachmentAnnotations(doc);
}

/**
 * Removes the metadata of a document.
 *
 * The document information dictionary is emptied, the XMP packet is deleted
 * with its edit history, its earlier versions and the GPS coordinates, and the
 * embedded files are dropped.
 */
export function stripMetadata(doc: PDFDocument): RemovedMetadata {
  const documentInformation = Boolean(
    doc.getTitle() ||
      doc.getAuthor() ||
      doc.getSubject() ||
      (doc.getKeywords() ?? []).length ||
      doc.getProducer() ||
      doc.getCreator() ||
      doc.getCreationDate() ||
      doc.getModificationDate(),
  );

  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  const xmp = removeXmpPacket(doc);
  const attachments = removeAttachments(doc);

  return { documentInformation, xmp: xmp.removed, gps: xmp.gps, attachments };
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
