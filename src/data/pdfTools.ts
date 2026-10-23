/**
 * PDF tool routing map.
 *
 * Every PDF-related tool resolves to exactly one variant through an EXACT slug
 * lookup. The previous implementation matched on `slug.includes("...")`
 * substrings, which sent calculators to the age calculator, quarterlies to the
 * tile estimator and every calendar to the Unix timestamp converter.
 *
 * Keep this map exhaustive: `PdfSuiteEngine` renders a "tool not wired" state
 * for any slug that is missing here, so a new catalog entry can never silently
 * fall back to an unrelated UI.
 */

export type PdfVariant =
  /** Combine several PDFs into one document. */
  | "merge"
  /** Split a PDF by page ranges / fixed-size chunks. */
  | "split"
  /** Build a PDF from one or more images. */
  | "img2pdf"
  /** Render PDF pages to PNG / JPG images. */
  | "toImage"
  /** Read the document information dictionary. */
  | "metaView"
  /** Write the document information dictionary. */
  | "metaEdit"
  /** Strip the document information dictionary and XMP metadata. */
  | "metaRemove"
  /** Re-encode pages to shrink the file. */
  | "compress"
  /** Burn redaction rectangles into the rendered pixels. */
  | "redact"
  /** Black out every occurrence of a search term. */
  | "blackout"
  /** Rebuild the text layer as an editable DOCX. */
  | "toDocx"
  /** Rebuild the text layer as Markdown. */
  | "toMarkdown"
  /** Decode a Base64 payload back into a PDF. */
  | "base64"
  /** Convert an .eml / .msg email into a PDF. */
  | "email"
  /** Convert Markdown / plain text into a PDF. */
  | "html"
  /** Render a PDF417 barcode into a PDF. */
  | "pdf417";

export const PDF_VARIANTS: Record<string, PdfVariant> = {
  // --- Organise -----------------------------------------------------------
  "merge-pdf": "merge",
  "pdf-merger": "merge",
  "combine-pdf": "merge",

  "split-pdf": "split",
  "pdf-splitter": "split",
  "extract-pdf-pages": "split",

  // --- Convert ------------------------------------------------------------
  "image-to-pdf": "img2pdf",
  "jpg-to-pdf-converter": "img2pdf",
  "png-to-pdf": "img2pdf",

  "pdf-to-image-converter": "toImage",
  "pdf-to-jpg-converter": "toImage",
  "pdf-to-png-converter": "toImage",

  "pdf-to-docx": "toDocx",
  "pdf-to-word": "toDocx",
  "pdf-to-word-converter": "toDocx",

  "pdf-to-markdown": "toMarkdown",
  "pdf-to-markdown-for-claude": "toMarkdown",
  "pdf-to-md": "toMarkdown",

  "base64-to-pdf": "base64",
  "base64-to-pdf-converter": "base64",
  "base64-to-pdf-decoder": "base64",

  "eml-to-pdf": "email",
  "msg-to-pdf": "email",

  "ai-to-pdf": "html",

  "pdf417-generator": "pdf417",

  // --- Inspect ------------------------------------------------------------
  "pdf-metadata-viewer": "metaView",
  "pdf-metadata-editor": "metaEdit",
  "pdf-metadata-remover": "metaRemove",

  // --- Optimise / secure --------------------------------------------------
  "compress-pdf": "compress",
  "pdf-compressor": "compress",
  "reduce-pdf-size": "compress",

  "pdf-redaction-tool": "redact",
  "redact-pdf": "redact",
  "redact-bank-statement": "redact",

  "black-out-text-in-pdf": "blackout",
};

/** Exact-match lookup. Returns null when a slug has no PDF variant. */
export function getPdfVariant(slug: string): PdfVariant | null {
  return Object.prototype.hasOwnProperty.call(PDF_VARIANTS, slug)
    ? PDF_VARIANTS[slug]
    : null;
}

/** Human readable label used in the workspace heading. */
export const PDF_VARIANT_LABELS: Record<PdfVariant, string> = {
  merge: "Merge PDF Files",
  split: "Split PDF",
  img2pdf: "Image to PDF Converter",
  toImage: "PDF to Image Converter",
  metaView: "PDF Metadata Viewer",
  metaEdit: "PDF Metadata Editor",
  metaRemove: "PDF Metadata Remover",
  compress: "Compress PDF",
  redact: "PDF Redaction Tool",
  blackout: "Black Out Text in PDF",
  toDocx: "PDF to DOCX Converter",
  toMarkdown: "PDF to Markdown Converter",
  base64: "Base64 to PDF",
  email: "Email to PDF Converter",
  html: "Markdown to PDF",
  pdf417: "PDF417 Barcode Generator",
};
