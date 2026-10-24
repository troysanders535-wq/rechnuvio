/**
 * PDF compression with MuPDF (WebAssembly, runs in the browser - nothing is
 * uploaded). Unlike re-rendering every page to a JPEG, this keeps text,
 * vectors and fonts intact: it downsamples and re-encodes only the embedded
 * images, then rewrites the file with deduplicated objects and compressed
 * streams.
 *
 * MuPDF.js is AGPL-3.0; this project is published under the AGPL-3.0 too.
 */

export interface MupdfCompressOptions {
  /** Longest image side in pixels; larger images are scaled down. */
  maxImageDimension: number;
  /** JPEG quality, 0-100. */
  jpegQuality: number;
  /** Password for encrypted files. */
  password?: string;
  onProgress?: (done: number, total: number) => void;
}

export interface MupdfCompressResult {
  bytes: Uint8Array;
  imagesRecompressed: number;
  imagesTotal: number;
}

export class MupdfPasswordError extends Error {
  constructor() {
    super("PDF is password protected");
    this.name = "MupdfPasswordError";
  }
}

import { loadMupdf, setMupdfModule } from "./mupdfLoader";

export { setMupdfModule };

export async function compressPdfWithMupdf(
  source: Uint8Array,
  options: MupdfCompressOptions,
): Promise<MupdfCompressResult> {
  const mupdf = await loadMupdf();
  const document = mupdf.Document.openDocument(source, "application/pdf");
  if (!(document instanceof mupdf.PDFDocument)) {
    throw new Error("Not a PDF document");
  }

  if (document.needsPassword()) {
    if (!options.password || !document.authenticatePassword(options.password)) {
      throw new MupdfPasswordError();
    }
  }

  const total = document.countObjects();
  let imagesTotal = 0;
  let imagesRecompressed = 0;

  for (let num = 1; num < total; num += 1) {
    options.onProgress?.(num, total);

    const ref = document.newIndirect(num);
    const object = ref;
    if (!object.isStream()) continue;
    if (object.get("Subtype").asName() !== "Image") continue;
    imagesTotal += 1;

    // Soft-masked, stencil and already-JPEG-small images are left untouched:
    // re-encoding them either loses transparency or gains nothing.
    if (object.get("SMask").isIndirect() || object.get("Mask").isIndirect()) continue;
    if (object.get("ImageMask").asBoolean()) continue;

    const originalSize = object.readRawStream().asUint8Array().byteLength;
    if (originalSize < 20_000) continue;

    try {
      const image = document.loadImage(ref);
      const width = image.getWidth();
      const height = image.getHeight();
      const factor = Math.min(1, options.maxImageDimension / Math.max(width, height));
      const newWidth = Math.max(1, Math.round(width * factor));
      const newHeight = Math.max(1, Math.round(height * factor));

      const pixmap = new mupdf.Pixmap(
        mupdf.ColorSpace.DeviceRGB,
        [0, 0, newWidth, newHeight],
        false,
      );
      pixmap.clear(255);
      const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
      device.fillImage(image, mupdf.Matrix.scale(newWidth, newHeight), 1);
      device.close();

      const jpeg = pixmap.asJPEG(options.jpegQuality, false);
      if (jpeg.byteLength >= originalSize * 0.9) continue;

      object.put("Width", newWidth);
      object.put("Height", newHeight);
      object.put("ColorSpace", document.newName("DeviceRGB"));
      object.put("BitsPerComponent", 8);
      object.put("Filter", document.newName("DCTDecode"));
      object.delete("DecodeParms");
      object.delete("Decode");
      object.writeRawStream(jpeg);
      imagesRecompressed += 1;
    } catch {
      // An image MuPDF cannot decode keeps its original encoding.
    }
  }

  const output = document.saveToBuffer(
    "garbage=deduplicate,compress=yes,compress-fonts=yes,objstms=yes",
  );
  return {
    bytes: new Uint8Array(output.asUint8Array()),
    imagesRecompressed,
    imagesTotal,
  };
}
