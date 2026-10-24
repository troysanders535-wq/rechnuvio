import fs from "node:fs";
fs.mkdirSync(".tmp-test", { recursive: true });
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as mupdf from "mupdf";
import { compressPdfWithMupdf, setMupdfModule } from "../src/components/pdf/mupdfCompress.ts";

setMupdfModule(mupdf);
// Build a PDF with real text and a large noisy photo-like image.
const w = 3000, h = 2000;
const px = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false);
const data = px.getPixels();
let seed = 1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  const i = (y * w + x) * 3;
  data[i] = (x / 12 + (seed >> 16 & 31)) & 255;
  data[i + 1] = (y / 8 + (seed >> 12 & 31)) & 255;
  data[i + 2] = ((x + y) / 20 + (seed >> 8 & 31)) & 255;
}
const jpg = px.asJPEG(95, false);
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const page = pdf.addPage([595, 842]);
page.drawText("Rechnuvio Kompressionstest: Dieser Text muss auswählbar bleiben.", { x: 40, y: 800, size: 12, font });
page.drawImage(await pdf.embedJpg(jpg), { x: 40, y: 300, width: 500, height: 333 });
const src = await pdf.save();
fs.writeFileSync(".tmp-test/in.pdf", src);

for (const [name, opts] of [["screen", { maxImageDimension: 1000, jpegQuality: 50 }], ["balanced", { maxImageDimension: 1600, jpegQuality: 70 }], ["print", { maxImageDimension: 2400, jpegQuality: 85 }]]) {
  const t = Date.now();
  const r = await compressPdfWithMupdf(src, opts);
  fs.writeFileSync(`.tmp-test/out-${name}.pdf`, r.bytes);
  const doc = mupdf.Document.openDocument(r.bytes, "application/pdf");
  const text = doc.loadPage(0).toStructuredText().asText();
  console.log(name, src.length, "->", r.bytes.length, `${Math.round(100 - r.bytes.length / src.length * 100)}% smaller`, `images ${r.imagesRecompressed}/${r.imagesTotal}`, `${Date.now() - t}ms`, "text kept:", text.includes("auswählbar bleiben"));
}
