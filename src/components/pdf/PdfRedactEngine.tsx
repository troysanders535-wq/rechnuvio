"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  baseName,
  downloadBytes,
  inputClass,
} from "./shared";
import { closePdf, openPdf } from "./pdfjs";
import { createPdfDoc, loadPdfDoc } from "./pdfLib";
import { useTranslations } from "next-intl";

export type PdfRedactMode = "redact" | "blackout";

/** A rectangle stored in normalised (0..1) page coordinates. */
type NormRect = { x: number; y: number; w: number; h: number };

type PageRects = Record<number, NormRect[]>;

const PREVIEW_SCALE = 1.4;
const EXPORT_SCALE = 2.4;

type CharBox = { x: number; w: number; h: number; y: number };

/**
 * Groups the text layer of a page into visual lines so that a search term
 * which is split across several text items can still be located.
 */
function buildLines(
  items: unknown[],
  viewport: { transform: number[]; scale: number },
  transform: (m1: number[], m2: number[]) => number[],
): { text: string; chars: CharBox[] }[] {
  type Piece = { str: string; x: number; y: number; w: number; h: number };
  const pieces: Piece[] = [];

  for (const item of items as {
    str?: string;
    transform?: number[];
    width?: number;
  }[]) {
    if (typeof item?.str !== "string" || !item.str) continue;
    if (!Array.isArray(item.transform)) continue;

    const tx = transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || 10;
    pieces.push({
      str: item.str,
      x: tx[4],
      y: tx[5] - fontHeight,
      w: (item.width ?? 0) * viewport.scale,
      h: fontHeight,
    });
  }

  // Group into lines by baseline proximity.
  const lines: Piece[][] = [];
  for (const piece of pieces) {
    const line = lines.find(
      (candidate) =>
        Math.abs(candidate[0].y + candidate[0].h / 2 - (piece.y + piece.h / 2)) <
        Math.max(3, piece.h * 0.5),
    );
    if (line) line.push(piece);
    else lines.push([piece]);
  }

  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x);
    let text = "";
    const chars: CharBox[] = [];
    for (const piece of line) {
      const perChar = piece.str.length ? piece.w / piece.str.length : 0;
      for (const ch of piece.str) {
        text += ch;
        chars.push({ x: piece.x, w: perChar, h: piece.h, y: piece.y });
      }
      piece.x += piece.w;
    }
    return { text, chars };
  });
}

export function PdfRedactEngine({ mode }: { mode: PdfRedactMode }) {
  const tUi = useTranslations("ui.pdf.PdfRedactEngine");
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [terms, setTerms] = useState("");
  const [rects, setRects] = useState<PageRects>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const openRef = useRef<Awaited<ReturnType<typeof openPdf>> | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [dragBox, setDragBox] = useState<NormRect | null>(null);

  const copy =
    mode === "blackout"
      ? {
          title: tUi("blackOutTextInPDF"),
          description:
            tUi("findEveryOccurrenceOfAWordOrNumberAndPermanentlyRemoveItFromThePage"),
          action: tUi("blackOutMatches"),
        }
      : {
          title: tUi("pDFRedactionTool"),
          description:
            tUi("markTheAreasToRemoveRedactedContentIsBurnedIntoThePagePixelsItCannotBeUnHidden"),
          action: tUi("applyRedaction"),
        };

  /* ---------------------------------------------------------------- */
  /* Rendering                                                        */
  /* ---------------------------------------------------------------- */

  const renderPage = useCallback(async (pageNumber: number) => {
    const open = openRef.current;
    const canvas = canvasRef.current;
    if (!open || !canvas) return;

    setRendering(true);
    try {
      const pdfPage = await open.doc.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: PREVIEW_SCALE });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvas, canvasContext: ctx, viewport }).promise;

      // Paint the existing redaction markers so the user sees what is selected.
      const marks = rects[pageNumber] ?? [];
      ctx.fillStyle = "rgba(220, 38, 38, 0.45)";
      ctx.strokeStyle = "rgb(220, 38, 38)";
      ctx.lineWidth = 2;
      for (const r of marks) {
        const x = r.x * canvas.width;
        const y = r.y * canvas.height;
        const w = r.w * canvas.width;
        const h = r.h * canvas.height;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
    } catch {
      /* the page could not be previewed */
    } finally {
      setRendering(false);
    }
  }, [rects]);

  useEffect(() => {
    if (openRef.current && pageCount > 0) {
      void renderPage(page);
    }
  }, [page, pageCount, renderPage]);

  /* ---------------------------------------------------------------- */
  /* Loading                                                          */
  /* ---------------------------------------------------------------- */

  async function handleFile(list: File[]) {
    const chosen = list[0];
    if (!chosen) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setRects({});

    try {
      const open = await openPdf(new Uint8Array(await chosen.arrayBuffer()));
      openRef.current = open;
      setFile(chosen);
      setPageCount(open.doc.numPages);
      setPage(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tUi("couldNotOpenThisPDF"),
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (openRef.current) void closePdf(openRef.current);
      openRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Manual selection                                                 */
  /* ---------------------------------------------------------------- */

  function toCanvasPoint(event: React.PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (mode === "blackout") return;
    const point = toCanvasPoint(event);
    if (!point) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragStart.current = point;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const point = toCanvasPoint(event);
    if (!point) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const start = dragStart.current;
    setDragBox({
      x: Math.min(start.x, point.x) / canvas.width,
      y: Math.min(start.y, point.y) / canvas.height,
      w: Math.abs(point.x - start.x) / canvas.width,
      h: Math.abs(point.y - start.y) / canvas.height,
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const box = dragBox;
    dragStart.current = null;
    setDragBox(null);
    if (!box) return;
    const point = toCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!point || !canvas) return;
    if (box.w < 0.004 || box.h < 0.004) return;
    setRects((prev) => ({
      ...prev,
      [page]: [...(prev[page] ?? []), box],
    }));
  }

  /* ---------------------------------------------------------------- */
  /* Search                                                           */
  /* ---------------------------------------------------------------- */

  async function findTerms() {
    const open = openRef.current;
    if (!open) return;
    const needle = terms.trim().toLowerCase();
    if (!needle) {
      setError(tUi("enterAtLeastOneWordOrNumberToSearchFor"));
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const found: PageRects = { ...rects };
      let hits = 0;

      for (let n = 1; n <= open.doc.numPages; n += 1) {
        const pdfPage = await open.doc.getPage(n);
        const viewport = pdfPage.getViewport({ scale: PREVIEW_SCALE });
        const content = await pdfPage.getTextContent();
        const lines = buildLines(
          content.items,
          viewport,
          open.pdfjs.Util.transform,
        );

        const pageRects: NormRect[] = [];
        for (const line of lines) {
          const haystack = line.text.toLowerCase();
          let from = 0;
          for (;;) {
            const at = haystack.indexOf(needle, from);
            if (at === -1) break;
            const end = at + needle.length;
            const first = line.chars[at];
            const last = line.chars[end - 1];
            if (first && last) {
              const x = first.x;
              const right = last.x + last.w;
              const y = Math.min(first.y, last.y);
              const h = Math.max(first.h, last.h);
              pageRects.push({
                x: x / viewport.width,
                y: y / viewport.height,
                w: (right - x) / viewport.width,
                h: h / viewport.height,
              });
              hits += 1;
            }
            from = at + needle.length;
          }
        }

        if (pageRects.length) {
          found[n] = [...(found[n] ?? []), ...pageRects];
        }
      }

      setRects(found);
      setInfo(
        hits
          ? tUi("foundMatchesToReview", { hits })
          : tUi("noMatchesWereFoundInTheTextLayerOfThisPDF"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("theSearchFailed"));
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Export                                                           */
  /* ---------------------------------------------------------------- */

  async function handleApply() {
    const open = openRef.current;
    if (!file || !open) return;

    const totalMarks = Object.values(rects).reduce((sum, list) => sum + list.length, 0);
    if (!totalMarks) {
      setError(
        mode === "blackout"
          ? tUi("searchForATermFirstSoTheMatchesCanBeBlackedOut")
          : tUi("dragOverThePageToMarkTheAreasYouWantRemoved"),
      );
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const out = await createPdfDoc();
      const source = await loadPdfDoc(await file.arrayBuffer());

      for (let n = 1; n <= open.doc.numPages; n += 1) {
        const marks = rects[n] ?? [];

        if (!marks.length) {
          // Untouched page: keep the original page objects so the text stays
          // selectable and the quality is untouched.
          const copied = await out.copyPages(source, [n - 1]);
          copied.forEach((p) => out.addPage(p));
          continue;
        }

        const pdfPage = await open.doc.getPage(n);
        const viewport = pdfPage.getViewport({ scale: EXPORT_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error(tUi("couldNotCreateARenderingCanvas"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvas, canvasContext: ctx, viewport }).promise;

        // Burn the redactions into the pixels. The original text layer is
        // never copied, so the content is genuinely gone.
        ctx.fillStyle = "#000000";
        for (const r of marks) {
          ctx.fillRect(
            r.x * canvas.width,
            r.y * canvas.height,
            r.w * canvas.width,
            r.h * canvas.height,
          );
        }

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) throw new Error(tUi("couldNotEncodeThePage", { page: n }));

        const png = await out.embedPng(new Uint8Array(await blob.arrayBuffer()));
        const newPage = out.addPage([canvas.width, canvas.height]);
        newPage.drawImage(png, {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
        });
      }

      const bytes = await out.save();
      downloadBytes(bytes, `${baseName(file.name)}-redacted.pdf`);
      setInfo(
        tUi("redactedAreasRemovedFromTheFile", {
          areas: totalMarks,
          pages: Object.values(rects).filter((l) => l.length).length,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotWriteTheRedactedFile"));
    } finally {
      setBusy(false);
    }
  }

  const pageMarks = rects[page] ?? [];
  const totalMarks = Object.values(rects).reduce((sum, list) => sum + list.length, 0);

  return (
    <Workspace title={copy.title} description={copy.description}>
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? tUi("replacePDF") : tUi("chooseAPDF")}
        hint={tUi("onePdfFileTheDocumentNeverLeavesYourDevice")}
        onFiles={(list) => void handleFile(list)}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <Field
            label={tUi("textToFind")}
            hint={tUi("separateMultipleTermsWithACommaMatchesAreLocatedInThePDFTextLayer")}
          >
            <input
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={tUi("textToFindPlaceholder")}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={findTerms}
              disabled={busy || !terms.trim()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tUi("findMatches")}
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {tUi("markedAreasCount", { count: totalMarks })}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tUi("pageOfTotal", { page, total: pageCount })}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  {tUi("previous")}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  {tUi("next")}
                </button>
              </span>
            </div>

            <div className="relative flex justify-center bg-slate-100 p-3 dark:bg-slate-950/50">
              <div
                className="relative"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ touchAction: "none", cursor: mode === "blackout" ? "default" : "crosshair" }}
              >
                <canvas
                  ref={canvasRef}
                  className="block max-w-full rounded shadow-sm"
                  style={{ width: "100%", height: "auto" }}
                />
                {dragBox ? (
                  <div
                    className="pointer-events-none absolute border-2 border-red-600 bg-red-600/30"
                    style={{
                      left: `${dragBox.x * 100}%`,
                      top: `${dragBox.y * 100}%`,
                      width: `${dragBox.w * 100}%`,
                      height: `${dragBox.h * 100}%`,
                    }}
                  />
                ) : null}
              </div>
            </div>

            {mode === "redact" ? (
              <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {tUi("dragAcrossThePageToMarkAnAreaToRemove")}
              </p>
            ) : null}
          </div>

          {pageMarks.length ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tUi("markedAreasOnPage")} {page}
              </p>
              <ul className="space-y-1">
                {pageMarks.map((r, i) => (
                  <li
                    key={`${r.x}-${r.y}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      x {Math.round(r.x * 100)}% · y {Math.round(r.y * 100)}% · w{" "}
                      {Math.round(r.w * 100)}% · h {Math.round(r.h * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRects((prev) => ({
                          ...prev,
                          [page]: (prev[page] ?? []).filter((_, x) => x !== i),
                        }))
                      }
                      className="font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      {tUi("remove")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <ActionButton onClick={handleApply} busy={busy} tone="success">
              {copy.action}
            </ActionButton>
            <button
              type="button"
              onClick={() => setRects({})}
              disabled={busy || !totalMarks}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {tUi("clearMarks")}
            </button>
          </div>

          {rendering ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tUi("renderingPreview")}
            </p>
          ) : null}
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
