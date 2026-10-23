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

const sources = [
  join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
];
const targets = [join(root, "public", "pdf.worker.min.mjs")];

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
        `[pdf-worker] copied pdf.worker.min.mjs (${Math.round(info.size / 1024)} KB) -> public/`,
      );
    } catch {
      console.warn(
        `[pdf-worker] worker not found at ${src}; PDF raster features will fall back to the bundler asset.`,
      );
    }
  }
}

main();
