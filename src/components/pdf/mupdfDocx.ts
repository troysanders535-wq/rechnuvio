/**
 * PDF -> DOCX with MuPDF (WebAssembly, runs in the browser, nothing is
 * uploaded). MuPDF reports every text line with its position, font, weight and
 * size, which lets us rebuild bold/italic text, side-by-side blocks as table
 * columns, real tables, and embed figures such as barcodes as images.
 *
 * The result is an editable approximation of the PDF, not a pixel copy.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  type ISectionOptions,
  Packer,
  Paragraph as DocxParagraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  bodySize,
  buildBlocks,
  buildParagraphs,
  clusterRows,
  isListItem,
  mergeRowFragments,
  type Block,
  type Fragment,
  type Run,
} from "./pdfLayout";

type Mupdf = typeof import("mupdf");

export interface PdfToDocxResult {
  blob: Blob;
  pages: number;
  /** 1-based numbers of pages without a text layer (scans); they are left empty. */
  emptyPages: number[];
  tables: number;
  figures: number;
}

const FONT: Record<string, string> = {
  "sans-serif": "Arial",
  serif: "Times New Roman",
  monospace: "Courier New",
};

interface JsonLine {
  text: string;
  font: { family?: string; weight?: string; style?: string; size?: number };
  bbox: { x: number; y: number; w: number; h: number };
}
interface JsonBlock {
  type: string;
  bbox: { x: number; y: number; w: number; h: number };
  lines?: JsonLine[];
}

function textFragments(blocks: JsonBlock[]): Fragment[] {
  const out: Fragment[] = [];
  for (const block of blocks) {
    if (block.type !== "text") continue;
    for (const line of block.lines ?? []) {
      if (!line.text.trim()) continue;
      const run: Run = {
        text: line.text,
        bold: line.font.weight === "bold",
        italic: line.font.style === "italic",
        size: Math.round((line.font.size ?? 10) * 2) / 2,
        family: line.font.family ?? "sans-serif",
      };
      out.push({
        x0: line.bbox.x,
        y0: line.bbox.y,
        x1: line.bbox.x + line.bbox.w,
        y1: line.bbox.y + line.bbox.h,
        kind: "text",
        runs: [run],
      });
    }
  }
  return out;
}

/** Finds figures drawn as many small vector shapes, such as barcodes. */
function vectorFigures(mupdf: Mupdf, page: InstanceType<Mupdf["PDFPage"]>): number[][] {
  const stroke = new mupdf.StrokeState({
    lineCap: "Butt",
    lineJoin: "Miter",
    lineWidth: 1,
    miterLimit: 10,
  });
  const bars: number[][] = [];
  const device = new mupdf.Device({
    fillPath(path, _evenOdd, ctm) {
      const [x0, y0, x1, y1] = path.getBounds(stroke, ctm);
      if (x1 - x0 < 4 && y1 - y0 > 8 && y1 - y0 < 200) bars.push([x0, y0, x1, y1]);
    },
  });
  page.run(device, mupdf.Matrix.identity);
  device.close();

  // Cluster neighbouring bars; a cluster of many bars is a barcode.
  bars.sort((a, b) => a[0] - b[0]);
  const clusters: number[][][] = [];
  for (const bar of bars) {
    const last = clusters[clusters.length - 1];
    const lastBar = last?.[last.length - 1];
    if (
      lastBar &&
      bar[0] - lastBar[2] < 8 &&
      Math.min(bar[3], lastBar[3]) - Math.max(bar[1], lastBar[1]) > 0
    ) {
      last.push(bar);
    } else {
      clusters.push([bar]);
    }
  }
  return clusters
    .filter((c) => c.length >= 15)
    .map((c) => [
      Math.min(...c.map((b) => b[0])) - 2,
      Math.min(...c.map((b) => b[1])) - 2,
      Math.max(...c.map((b) => b[2])) + 2,
      Math.max(...c.map((b) => b[3])) + 2,
    ]);
}

function renderRegion(
  mupdf: Mupdf,
  page: InstanceType<Mupdf["PDFPage"]>,
  [x0, y0, x1, y1]: number[],
  scale = 3,
): Uint8Array {
  const width = Math.max(1, Math.ceil((x1 - x0) * scale));
  const heightPx = Math.max(1, Math.ceil((y1 - y0) * scale));
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, heightPx], false);
  pixmap.clear(255);
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
  page.run(device, [scale, 0, 0, scale, -x0 * scale, -y0 * scale]);
  device.close();
  return pixmap.asPNG();
}

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
} as const;
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

const twips = (points: number) => Math.round(points * 20);

function textRuns(runs: Run[], forceBold = false): TextRun[] {
  // Adjacent runs with identical formatting become one run.
  const merged: Run[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.bold === run.bold &&
      last.italic === run.italic &&
      last.size === run.size &&
      last.family === run.family
    ) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: forceBold || run.bold,
        italics: run.italic,
        size: Math.round(run.size * 2),
        font: FONT[run.family] ?? FONT["sans-serif"],
      }),
  );
}

interface PageContext {
  mupdf: Mupdf;
  page: InstanceType<Mupdf["PDFPage"]>;
  figures: number[][];
  body: number;
  contentWidth: number;
}

function cellChildren(fragments: Fragment[], context: PageContext): DocxParagraph[] {
  const children: DocxParagraph[] = [];
  for (const f of fragments) {
    if (f.kind === "figure" && f.figure !== undefined) {
      const box = context.figures[f.figure];
      const data = renderRegion(context.mupdf, context.page, box);
      children.push(
        new DocxParagraph({
          children: [
            new ImageRun({
              type: "png",
              data,
              transformation: {
                width: Math.round(((box[2] - box[0]) * 96) / 72),
                height: Math.round(((box[3] - box[1]) * 96) / 72),
              },
            }),
          ],
        }),
      );
    } else {
      children.push(
        new DocxParagraph({
          children: textRuns(f.runs),
          spacing: { after: 20 },
        }),
      );
    }
  }
  return children.length ? children : [new DocxParagraph("")];
}

function tableFromBlock(block: Block, context: PageContext): Table {
  // Column widths run from one column's left edge to the next one's.
  const order = block.columns.map((c, index) => ({ c, index })).sort((a, b) => a.c.x0 - b.c.x0);
  const widths: number[] = new Array(block.columns.length).fill(0);
  order.forEach(({ c, index }, position) => {
    const next = order[position + 1]?.c.x0;
    widths[index] = twips(Math.max(18, (next ?? c.x1 + 4) - c.x0));
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const limit = twips(context.contentWidth);
  const factor = total > limit ? limit / total : 1;
  const finalWidths = widths.map((w) => Math.floor(w * factor));

  const columnOrder = order.map((o) => o.index);

  return new Table({
    width: { size: finalWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: columnOrder.map((i) => finalWidths[i]),
    borders: NO_BORDERS,
    rows: block.rows.map(
      (cells) =>
        new TableRow({
          cantSplit: true,
          children: columnOrder.map(
            (columnIndex) =>
              new TableCell({
                width: { size: finalWidths[columnIndex], type: WidthType.DXA },
                borders: NO_BORDERS,
                margins: { top: 20, bottom: 20, left: 60, right: 60 },
                children: cellChildren(cells[columnIndex] ?? [], context),
              }),
          ),
        }),
    ),
  });
}

function headingLevel(size: number, body: number) {
  if (size >= body * 1.8) return HeadingLevel.HEADING_1;
  if (size >= body * 1.4) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

function paragraphsFromBlock(block: Block, body: number): DocxParagraph[] {
  return buildParagraphs(block).map((p) => {
    const text = p.runs.map((r) => r.text).join("");
    const isHeading = p.size >= body * 1.25 && text.length < 160;
    if (isHeading) {
      return new DocxParagraph({
        heading: headingLevel(p.size, body),
        children: textRuns(p.runs, true),
        spacing: { before: twips(Math.min(p.gapBefore, 24)) },
      });
    }
    const list = isListItem(text);
    return new DocxParagraph({
      children: textRuns(
        list
          ? p.runs.map((r, i) => (i === 0 ? { ...r, text: r.text.replace(/^\s*([-*•·▪◦‣])\s+/, "") } : r))
          : p.runs,
      ),
      bullet: list && /^\s*([-*•·▪◦‣])\s/.test(text) ? { level: 0 } : undefined,
      spacing: { before: twips(Math.min(p.gapBefore, 24)), after: 40 },
      alignment: AlignmentType.LEFT,
    });
  });
}

export async function convertPdfToDocx(
  mupdf: Mupdf,
  source: Uint8Array,
  password?: string,
): Promise<PdfToDocxResult> {
  const document = mupdf.Document.openDocument(source, "application/pdf");
  if (document.needsPassword()) {
    if (!password || !document.authenticatePassword(password)) {
      throw new Error("PDF is password protected");
    }
  }

  const pageCount = document.countPages();
  const sections: ISectionOptions[] = [];
  const emptyPages: number[] = [];
  let tableCount = 0;
  let figureCount = 0;

  for (let index = 0; index < pageCount; index += 1) {
    const page = document.loadPage(index) as InstanceType<Mupdf["PDFPage"]>;
    const [px0, py0, px1, py1] = page.getBounds();
    const pageWidth = px1 - px0;
    const pageHeight = py1 - py0;

    const json = JSON.parse(
      page.toStructuredText("preserve-images").asJSON(),
    ) as { blocks: JsonBlock[] };

    let fragments = textFragments(json.blocks);
    const figures: number[][] = vectorFigures(mupdf, page);
    for (const b of json.blocks) {
      if (b.type === "image") {
        figures.push([b.bbox.x, b.bbox.y, b.bbox.x + b.bbox.w, b.bbox.y + b.bbox.h]);
      }
    }

    if (!fragments.length) emptyPages.push(index + 1);

    // Text rows first; figures then join the row they overlap the most.
    const rows = clusterRows(fragments).map(mergeRowFragments);
    fragments = rows.flat();
    figures.forEach((box, figure) => {
      const [x0, y0, x1, y1] = box;
      let best = -1;
      let bestOverlap = 0;
      rows.forEach((row, r) => {
        const ry0 = Math.min(...row.map((f) => f.y0));
        const ry1 = Math.max(...row.map((f) => f.y1));
        const overlap = Math.min(ry1, y1) - Math.max(ry0, y0);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = r;
        }
      });
      const fragment: Fragment = { x0, y0, x1, y1, kind: "figure", runs: [], figure };
      if (best >= 0) {
        rows[best].push(fragment);
        rows[best].sort((a, b) => a.x0 - b.x0);
      } else {
        rows.push([fragment]);
        rows.sort((a, b) => Math.min(...a.map((f) => f.y0)) - Math.min(...b.map((f) => f.y0)));
      }
      figureCount += 1;
    });

    const blocks = buildBlocks(rows);
    const margin = {
      left: Math.max(18, Math.min(72, Math.min(...(fragments.length ? fragments.map((f) => f.x0) : [36])))),
      right: Math.max(18, Math.min(72, pageWidth - Math.max(...(fragments.length ? fragments.map((f) => f.x1) : [pageWidth - 36])))),
      top: Math.max(18, Math.min(72, Math.min(...(fragments.length ? fragments.map((f) => f.y0) : [36])))),
      bottom: 36,
    };
    const context: PageContext = {
      mupdf,
      page,
      figures,
      body: bodySize(fragments),
      contentWidth: pageWidth - margin.left - margin.right,
    };

    const children: (DocxParagraph | Table)[] = [];
    let previousBottom: number | null = null;
    for (const block of blocks) {
      const gap = previousBottom === null ? 0 : Math.max(0, block.y0 - previousBottom);
      if (block.columns.length >= 2) {
        if (gap > 6) {
          children.push(new DocxParagraph({ spacing: { before: 0, after: 0, line: twips(Math.min(gap, 30)), lineRule: LineRuleType.EXACT }, children: [] }));
        }
        children.push(tableFromBlock(block, context));
        tableCount += 1;
      } else {
        const paragraphs = paragraphsFromBlock(block, context.body);
        if (gap > 6 && paragraphs.length === 0) continue;
        children.push(...paragraphs);
      }
      previousBottom = block.y1;
    }
    if (!children.length) children.push(new DocxParagraph(""));

    sections.push({
      properties: {
        page: {
          size: { width: twips(pageWidth), height: twips(pageHeight) },
          margin: {
            left: twips(margin.left),
            right: twips(margin.right),
            top: twips(margin.top),
            bottom: twips(margin.bottom),
          },
        },
      },
      children,
    });
  }

  const doc = new Document({
    creator: "Rechnuvio",
    title: "PDF to DOCX",
    sections,
  });
  return {
    blob: await Packer.toBlob(doc),
    pages: pageCount,
    emptyPages,
    tables: tableCount,
    figures: figureCount,
  };
}

