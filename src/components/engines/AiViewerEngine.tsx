"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileUp,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Image as ImageIcon,
  Info,
  Check,
  Layers,
  Sparkles,
  X
} from "lucide-react";
import { openPdf, closePdf, OpenPdf } from "@/components/pdf/pdfjs";

type ExportResolution = "1" | "2" | "3" | "4.167";

interface PageDimensions {
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
  widthIn: number;
  heightIn: number;
}

export function AiViewerEngine({ slug = "ai-viewer" }: { slug?: string }) {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  // PDF.js document state
  const openPdfRef = useRef<OpenPdf | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dimensions, setDimensions] = useState<PageDimensions | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // View state
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isUnsupportedAi, setIsUnsupportedAi] = useState<boolean>(false);
  const [exportRes, setExportRes] = useState<ExportResolution>("2");
  const [exporting, setExporting] = useState<boolean>(false);

  // Canvas & Render refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Scans buffer for the '%PDF-' header marker.
   * Modern PDF-compatible AI files begin with '%PDF-' or embed it near the start.
   */
  const findPdfOffset = (bytes: Uint8Array): number => {
    const limit = Math.min(bytes.length - 4, 1024 * 1024);
    for (let i = 0; i < limit; i++) {
      if (
        bytes[i] === 0x25 && // %
        bytes[i + 1] === 0x50 && // P
        bytes[i + 2] === 0x44 && // D
        bytes[i + 3] === 0x46 && // F
        bytes[i + 4] === 0x2d // -
      ) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Release current PDF document, worker task, and rendered thumbnails.
   */
  const cleanupCurrentDoc = useCallback(async () => {
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        /* ignore */
      }
      activeRenderTaskRef.current = null;
    }
    if (openPdfRef.current) {
      try {
        await closePdf(openPdfRef.current);
      } catch {
        /* ignore */
      }
      openPdfRef.current = null;
    }
    setThumbnails([]);
    setDimensions(null);
    setNumPages(0);
    setCurrentPage(1);
    setPdfData(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCurrentDoc();
    };
  }, [cleanupCurrentDoc]);

  /**
   * Processes chosen local file.
   */
  const processFile = async (selectedFile: File) => {
    setError(null);
    setIsUnsupportedAi(false);
    setLoading(true);
    setLoadingMessage("Reading file bytes...");

    try {
      await cleanupCurrentDoc();

      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);

      if (selectedFile.size === 0) {
        throw new Error("The selected file is empty (0 bytes).");
      }

      // Read binary buffer
      const buffer = await selectedFile.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);

      // Inspect content for PDF compatibility
      const pdfOffset = findPdfOffset(rawBytes);

      if (pdfOffset === -1) {
        setIsUnsupportedAi(true);
        throw new Error(
          "This Illustrator file has no readable PDF-compatible preview. Re-save it in Adobe Illustrator with ‘Create PDF Compatible File’ enabled, or export it as PDF."
        );
      }

      setLoadingMessage("Parsing PDF-compatible stream with PDF.js...");
      const pdfBytes = pdfOffset === 0 ? rawBytes : rawBytes.subarray(pdfOffset);
      setPdfData(pdfBytes);

      // Open via PDF.js worker
      const open = await openPdf(pdfBytes);
      openPdfRef.current = open;

      const total = open.doc.numPages;
      setNumPages(total);
      setCurrentPage(1);
      setFile(selectedFile);
      setZoom(1.0);

      // Generate thumbnails for multi-page documents
      if (total > 1) {
        generateThumbnails(open.doc, total);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("PDF-compatible")) {
        setIsUnsupportedAi(true);
        setError(err.message);
      } else {
        setError(
          err.message ||
            "Unable to parse this file. It may be corrupted or not a valid PDF-compatible Illustrator document."
        );
      }
      setFile(null);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  /**
   * Generates low-resolution thumbnail previews for multi-page documents.
   */
  const generateThumbnails = async (doc: any, count: number) => {
    const thumbs: string[] = [];
    try {
      for (let i = 1; i <= Math.min(count, 12); i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.2 });
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = Math.floor(vp.width);
        thumbCanvas.height = Math.floor(vp.height);
        const ctx = thumbCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
          await page.render({ canvas: thumbCanvas, canvasContext: ctx, viewport: vp }).promise;
          thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.7));
        }
      }
      setThumbnails(thumbs);
    } catch {
      /* non-fatal */
    }
  };

  /**
   * Render the current page onto the primary display canvas.
   */
  const renderCurrentPage = useCallback(async () => {
    if (!openPdfRef.current || !canvasRef.current) return;

    // Cancel any in-flight rendering task
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        /* ignore */
      }
      activeRenderTaskRef.current = null;
    }

    try {
      const doc = openPdfRef.current.doc;
      const page = await doc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Save page dimensions with explicit units
      const widthPt = baseViewport.width;
      const heightPt = baseViewport.height;
      setDimensions({
        widthPt,
        heightPt,
        widthMm: (widthPt * 25.4) / 72,
        heightMm: (heightPt * 25.4) / 72,
        widthIn: widthPt / 72,
        heightIn: heightPt / 72,
      });

      // Scaled viewport for current zoom
      const viewport = page.getViewport({ scale: zoom * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvas: canvas,
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      activeRenderTaskRef.current = task;
      await task.promise;
      activeRenderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name === "RenderingCancelledException") {
        // Expected cancellation when zooming or changing pages quickly
        return;
      }
      console.error("Canvas render error:", err);
    }
  }, [currentPage, zoom]);

  // Trigger render when page or zoom changes
  useEffect(() => {
    if (file && openPdfRef.current) {
      renderCurrentPage();
    }
  }, [file, currentPage, zoom, renderCurrentPage]);

  // Zoom helpers
  const handleZoomIn = () => setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))));
  const handleZoomReset = () => setZoom(1.0);

  const handleFitToWidth = () => {
    if (!containerRef.current || !dimensions) return;
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    if (containerWidth > 100 && dimensions.widthPt > 0) {
      const newZoom = Number((containerWidth / dimensions.widthPt).toFixed(2));
      setZoom(Math.max(0.25, Math.min(3.0, newZoom)));
    }
  };

  // Reset all
  const handleClear = async () => {
    await cleanupCurrentDoc();
    setFile(null);
    setFileName("");
    setFileSize(0);
    setError(null);
    setIsUnsupportedAi(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Export the selected page as PNG or JPG at chosen resolution.
   */
  const handleExportImage = async (format: "png" | "jpg") => {
    if (!openPdfRef.current) return;
    setExporting(true);

    try {
      const doc = openPdfRef.current.doc;
      const page = await doc.getPage(currentPage);
      const scaleMultiplier = parseFloat(exportRes);

      const exportViewport = page.getViewport({ scale: scaleMultiplier });
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = Math.floor(exportViewport.width);
      offscreenCanvas.height = Math.floor(exportViewport.height);

      const ctx = offscreenCanvas.getContext("2d", { alpha: format === "png" });
      if (!ctx) throw new Error("Could not initialize offscreen export canvas.");

      if (format === "jpg") {
        // Solid white background for JPG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      } else {
        // Transparent background for PNG
        ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      }

      await page.render({
        canvas: offscreenCanvas,
        canvasContext: ctx,
        viewport: exportViewport,
      }).promise;

      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.95 : undefined;

      offscreenCanvas.toBlob(
        (blob) => {
          if (!blob) {
            setExporting(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const baseName = fileName.replace(/\.[^/.]+$/, "");
          const pageSuffix = numPages > 1 ? `-page-${currentPage}` : "";
          const resSuffix = scaleMultiplier > 1 ? `@${exportRes}x` : "";
          a.href = url;
          a.download = `${baseName}${pageSuffix}${resSuffix}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setExporting(false);
        },
        mimeType,
        quality
      );
    } catch (err: any) {
      console.error("Export failed:", err);
      setError(`Export failed: ${err.message || "Unknown error"}`);
      setExporting(false);
    }
  };

  /**
   * Download the underlying PDF-compatible stream as a .pdf file.
   */
  const handleDownloadPdf = () => {
    if (!pdfData) return;
    const blob = new Blob([pdfData as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    a.href = url;
    a.download = `${baseName}-preview.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full text-slate-800 dark:text-slate-200">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ai,.pdf,application/pdf,application/illustrator,application/postscript"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
          }
        }}
      />

      {/* Main Container */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Upload State */}
        {!file && (
          <div className="p-6 sm:p-12">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragOver
                  ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/20"
                  : "border-slate-300 bg-slate-50/50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/40"
              }`}
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-950 dark:text-indigo-300">
                <FileUp className="size-8" />
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Upload Adobe Illustrator File
              </h2>

              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
                Preview PDF-compatible .ai files directly in your browser. Your files stay on your device.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline-2 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <Upload className="size-4" />
                  <span>Choose AI File</span>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  .AI
                </span>
                <span>or</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  .PDF
                </span>
                <span>files supported (100% Client-Side)</span>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-xs font-semibold text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                <div className="size-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                <span>{loadingMessage || "Processing Illustrator file..."}</span>
              </div>
            )}

            {/* Error Message Display */}
            {error && (
              <div
                role="alert"
                className={`mt-6 rounded-2xl border p-5 text-xs leading-relaxed ${
                  isUnsupportedAi
                    ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-2">
                    <p className="font-bold text-sm">
                      {isUnsupportedAi ? "Non-PDF-Compatible Illustrator File" : "Error Opening File"}
                    </p>
                    <p>{error}</p>
                    {isUnsupportedAi && (
                      <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                        <p className="font-semibold">Why does this happen?</p>
                        <p className="mt-0.5">
                          Adobe Illustrator saves files with an embedded PDF preview stream when the
                          &quot;Create PDF Compatible File&quot; checkbox is turned on (Illustrator default).
                          Files saved without this option contain only proprietary PostScript/Illustrator
                          vectors that require the native Adobe Illustrator desktop app to decode.
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 dark:bg-amber-600"
                    >
                      <Upload className="size-3.5" />
                      <span>Choose another .ai file</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Compatibility & Format Clarification Card (Requirement 5) */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Format Compatibility Notice
                  </h3>
                  <p>
                    This browser viewer utilizes <strong>Mozilla PDF.js</strong> to render the
                    PDF-compatible stream embedded inside modern Adobe Illustrator (.ai) artwork.
                  </p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px]">
                    <li>
                      <strong>PDF-Compatible AI:</strong> Supported. View, zoom, navigate pages, and
                      export to PNG/JPG.
                    </li>
                    <li>
                      <strong>Illustrator Editing &amp; Native Layers:</strong> Not supported. PDF.js is
                      a high-fidelity document renderer, not an Illustrator vector editor.
                    </li>
                    <li>
                      <strong>Multi-page Artboards:</strong> When saved with PDF compatibility, available
                      PDF pages in the stream correspond to exported artboards.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loaded Document Viewer State */}
        {file && (
          <div className="flex flex-col">
            {/* Top Toolbar: File info, Navigation, Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
              {/* File Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <FileCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white" title={fileName}>
                    {fileName}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{(fileSize / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Page {currentPage} of {numPages} (PDF stream)
                    </span>
                  </div>
                </div>
              </div>

              {/* Page Navigator */}
              {numPages > 1 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="px-2 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {currentPage} / {numPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons: Replace & Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Replace File</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  title="Clear file and reset view"
                >
                  <X className="size-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Secondary Toolbar: Zoom Controls & Dimensions & Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.25}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="w-14 text-center font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 4.0}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={handleFitToWidth}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Fit to width"
                >
                  <Maximize2 className="size-3" />
                  <span>Fit</span>
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Reset to 100%"
                >
                  <RotateCcw className="size-3" />
                  <span>100%</span>
                </button>
              </div>

              {/* Explicit Dimensions Badge (Requirement 6) */}
              {dimensions && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Dimensions:</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {dimensions.widthPt.toFixed(1)} × {dimensions.heightPt.toFixed(1)} pt
                  </span>
                  <span>({dimensions.widthMm.toFixed(1)} × {dimensions.heightMm.toFixed(1)} mm)</span>
                  <span>/</span>
                  <span>({dimensions.widthIn.toFixed(2)} × {dimensions.heightIn.toFixed(2)} in)</span>
                </div>
              )}

              {/* Export Controls (Requirement 7) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Res:</span>
                  <select
                    value={exportRes}
                    onChange={(e) => setExportRes(e.target.value as ExportResolution)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="1">1x (72 DPI - Standard)</option>
                    <option value="2">2x (144 DPI - High Res)</option>
                    <option value="3">3x (216 DPI - Retina)</option>
                    <option value="4.167">4x (300 DPI - Print)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportImage("png")}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
                  title="Export page as transparent PNG"
                >
                  <Download className="size-3.5" />
                  <span>PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportImage("jpg")}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Export page as JPG with white background"
                >
                  <Download className="size-3.5" />
                  <span>JPG</span>
                </button>

                {pdfData && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    title="Download original PDF preview stream"
                  >
                    <Download className="size-3.5" />
                    <span>PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Viewport: Transparent Checkerboard Background */}
            <div
              ref={containerRef}
              className="relative flex min-h-[480px] max-h-[780px] items-center justify-center overflow-auto p-8 bg-slate-200/70 dark:bg-slate-950"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              }}
            >
              <div className="relative shadow-2xl rounded-sm transition-all duration-150">
                <canvas ref={canvasRef} className="block rounded-sm bg-white" />
              </div>
            </div>

            {/* Multi-page Thumbnails Drawer */}
            {numPages > 1 && thumbnails.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    PDF Pages / Exported Artboards ({numPages})
                  </span>
                  <span className="text-[11px] text-slate-400">Click to switch page</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {thumbnails.map((thumb, idx) => {
                    const pageNum = idx + 1;
                    const isSelected = currentPage === pageNum;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`group relative flex shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-950/40"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={`Page ${pageNum}`}
                          className="h-20 w-auto rounded border border-slate-100 object-contain shadow-xs dark:border-slate-800"
                        />
                        <span
                          className={`text-[10px] font-bold ${
                            isSelected
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Page {pageNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technical FAQ & Guide Section */}
      <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Adobe Illustrator (.ai) File Viewer Guide
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              How does this viewer open .ai files?
            </h4>
            <p className="mt-1">
              When saving in Adobe Illustrator, the &quot;Create PDF Compatible File&quot; option is
              enabled by default. This bundles a complete PDF vector preview stream inside the .ai
              container. Our viewer parses this stream 100% locally using Mozilla PDF.js.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              Why do some .ai files say &quot;No readable preview&quot;?
            </h4>
            <p className="mt-1">
              If an Illustrator file was saved with &quot;Create PDF Compatible File&quot; disabled or
              in legacy Illustrator 8 format, it contains only proprietary PostScript code and no PDF
              data. Simply re-save the file in Illustrator with PDF compatibility enabled.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              Can I export high-resolution PNG or JPG?
            </h4>
            <p className="mt-1">
              Yes. You can select 1x (72 DPI), 2x (144 DPI), 3x (216 DPI), or 4x (300 DPI print quality)
              from the resolution dropdown. PNG exports preserve vector transparency, while JPG exports
              include a solid white background.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              Is my artwork uploaded to any server?
            </h4>
            <p className="mt-1">
              Never. File decoding, vector rasterization, and image generation run entirely within your
              browser&apos;s Web Worker sandbox. No file data is ever transmitted across the internet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
