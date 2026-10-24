/**
 * Copies the PDF.js worker out of node_modules into `public/` so that
 * `pdfjs.ts` always has a working worker URL, regardless of what the bundler
 * does with `new URL(..., import.meta.url)`.
 *
 * Runs automatically via the `predev` and `prebuild` npm scripts.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// MuPDF.js is loaded at runtime from /mupdf/ (see components/pdf/mupdfCompress.ts):
// its Node-only branches cannot go through the bundler.
const mupdfDist = join(root, "node_modules", "mupdf", "dist");
const sources = [
  join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
  join(mupdfDist, "mupdf.js"),
  join(mupdfDist, "mupdf-wasm.js"),
  join(mupdfDist, "mupdf-wasm.wasm"),
];
const targets = [
  join(root, "public", "pdf.worker.min.mjs"),
  join(root, "public", "mupdf", "mupdf.js"),
  join(root, "public", "mupdf", "mupdf-wasm.js"),
  join(root, "public", "mupdf", "mupdf-wasm.wasm"),
];

async function main() {
  for (let i = 0; i < sources.length; i += 1) {
    const src = sources[i];
    const dest = targets[i];
    try {
      const info = await stat(src);
      const existing = await stat(dest).catch(() => null);
      if (existing && existing.size === info.size) continue;
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
      console.log(
        `[pdf-worker] copied ${dest} (${Math.round(info.size / 1024)} KB)`,
      );
    } catch {
      console.warn(
        `[pdf-worker] worker not found at ${src}; PDF raster features will fall back to the bundler asset.`,
      );
    }
  }
}

main();
