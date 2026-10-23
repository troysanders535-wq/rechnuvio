"use client";

/**
 * Lazy, browser-only loader for PDF.js (mozilla/pdf.js).
 *
 * PDF.js is ~450 KB gzipped and is only needed by the PDF tools that actually
 * rasterise a page (image export, compression, redaction, text extraction).
 * It is therefore imported dynamically so the rest of the site never pays for
 * it.
 *
 * The worker script is resolved in two ways:
 *   1. The bundler-emitted asset URL (preferred, no extra file on disk).
 *   2. `/pdf.worker.min.mjs`, which `scripts/copy-pdf-worker.mjs` copies out of
 *      node_modules during `predev` / `prebuild` as a guaranteed fallback.
 */

type PdfJsModule = typeof import("pdfjs-dist");

let cached: Promise<PdfJsModule> | null = null;

function resolveWorkerSrc(): string {
  try {
    // Bundlers that understand `new URL(..., import.meta.url)` emit the worker
    // as a hashed asset and give us the correct public path.
    const url = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    if (url && !url.startsWith("pdfjs-dist/")) return url;
  } catch {
    /* fall through to the public copy */
  }
  return "/pdf.worker.min.mjs";
}

export async function getPdfJs(): Promise<PdfJsModule> {
  if (!cached) {
    cached = (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = resolveWorkerSrc();
      }
      return pdfjs;
    })().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

export type { PdfJsModule };

type LoadingTask = ReturnType<PdfJsModule["getDocument"]>;

export type OpenPdf = {
  pdfjs: PdfJsModule;
  /** The loading task owns the worker; call `destroy()` when finished. */
  task: LoadingTask;
  doc: Awaited<LoadingTask["promise"]>;
};

/**
 * Opens a PDF with PDF.js.
 *
 * Note that PDF.js takes ownership of the buffer it is given, so callers
 * should pass a copy if the bytes are needed afterwards.
 */
export async function openPdf(
  data: Uint8Array,
  password?: string,
): Promise<OpenPdf> {
  const pdfjs = await getPdfJs();
  const task = pdfjs.getDocument(password ? { data, password } : { data });
  const doc = await task.promise;
  return { pdfjs, task, doc };
}

/** Releases the PDF.js worker for a document. */
export async function closePdf(open: OpenPdf): Promise<void> {
  try {
    await open.doc.cleanup();
  } catch {
    /* the document may already be torn down */
  }
  try {
    await open.task.destroy();
  } catch {
    /* the worker may already be gone */
  }
}
