/** Shared lazy loader for MuPDF.js (AGPL-3.0, same license as this project). */

export type Mupdf = typeof import("mupdf");

let cached: Promise<Mupdf> | null = null;

/**
 * Loads the (large) WASM module only when a PDF tool needs it. It is served as
 * a static file from /mupdf/ (copied by scripts/copy-pdf-worker.mjs) instead of
 * being bundled, because the package contains Node-only branches that webpack
 * cannot resolve.
 */
export function loadMupdf(): Promise<Mupdf> {
  const url: string = "/mupdf/mupdf.js";
  cached ??= import(/* webpackIgnore: true */ url) as Promise<Mupdf>;
  return cached;
}

/** Test hook: lets Node tests supply the module instead of the browser URL. */
export function setMupdfModule(module: Mupdf): void {
  cached = Promise.resolve(module);
}

