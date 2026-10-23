"use client";

import { useState } from "react";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  baseName,
  downloadBytes,
  formatBytes,
  selectClass,
} from "./shared";
import { PasswordRequiredError, createPdfDoc, loadPdfDoc } from "./pdfLib";
import { closePdf, openPdf } from "./pdfjs";

type Preset = "screen" | "balanced" | "print" | "custom";

const PRESETS: Record<
  Exclude<Preset, "custom">,
  { label: string; scale: number; quality: number }
> = {
  screen: { label: "Screen — smallest file", scale: 1, quality: 0.5 },
  balanced: { label: "Balanced — recommended", scale: 1.6, quality: 0.7 },
  print: { label: "Print — highest quality", scale: 2.4, quality: 0.85 },
};

export function PdfCompressEngine() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [scale, setScale] = useState(1.6);
  const [quality, setQuality] = useState(0.7);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: number; after: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleCompress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setNote(null);
    setProgress("Loading PDF…");

    try {
      const effectiveScale = preset === "custom" ? scale : PRESETS[preset].scale;
      const effectiveQuality = preset === "custom" ? quality : PRESETS[preset].quality;

      const open = await openPdf(new Uint8Array(await file.arrayBuffer()));
      const doc = open.doc;
      const out = await createPdfDoc();

      for (let n = 1; n <= doc.numPages; n += 1) {
        setProgress(`Compressing page ${n} of ${doc.numPages}…`);

        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: effectiveScale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create a rendering canvas.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", effectiveQuality),
        );
        if (!blob) throw new Error(`Could not encode page ${n}.`);

        const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const newPage = out.addPage([canvas.width, canvas.height]);
        newPage.drawImage(jpg, {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
        });
      }

      await closePdf(open);

      const raster = await out.save();

      // Re-encoding every page as a JPEG can easily make a small vector PDF
      // bigger than it was. Compare the result against a pure structure
      // rewrite and always keep the smaller of the two.
      let best = raster;
      let strategy = "re-encoded pages";
      try {
        const source = await loadPdfDoc(await file.arrayBuffer(), password || undefined);
        const lossless = await source.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });
        if (lossless.byteLength < best.byteLength) {
          best = lossless;
          strategy = "the document structure";
        }
      } catch {
        /* the structure rewrite is only a fallback */
      }

      downloadBytes(best, `${baseName(file.name)}-compressed.pdf`);
      setResult({ before: file.size, after: best.byteLength });
      setNote(
        best.byteLength >= file.size
          ? "This PDF is already optimised — no smaller version is possible."
          : `Kept the smaller result (${strategy}).`,
      );
      setProgress(null);
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError("This PDF is password protected. Enter the password and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not compress the file.");
      }
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleLossless() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setNote(null);
    setProgress("Rewriting document structure…");

    try {
      const doc = await loadPdfDoc(await file.arrayBuffer(), password || undefined);
      const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      downloadBytes(bytes, `${baseName(file.name)}-optimised.pdf`);
      setResult({ before: file.size, after: bytes.byteLength });
      setNote("The pages were kept as vector data, so the text stays selectable.");
      setProgress(null);
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError("This PDF is password protected. Enter the password and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not optimise the file.");
      }
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  const reduction = result
    ? Math.max(0, Math.round((1 - result.after / Math.max(result.before, 1)) * 100))
    : 0;

  return (
    <Workspace
      title="Compress PDF"
      description="Shrink a PDF by re-encoding its pages, or rewrite its structure without touching the text."
    >
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? "Replace PDF" : "Choose a PDF"}
        hint="One .pdf file. Everything runs in your browser."
        onFiles={(list) => {
          setFile(list[0] ?? null);
          setError(null);
          setResult(null);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          <Field label="Compression preset">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className={selectClass}
            >
              <option value="screen">{PRESETS.screen.label}</option>
              <option value="balanced">{PRESETS.balanced.label}</option>
              <option value="print">{PRESETS.print.label}</option>
              <option value="custom">Custom</option>
            </select>
          </Field>

          {preset === "custom" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Resolution — ${Math.round(scale * 72)} DPI`}>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </Field>
              <Field label={`JPG quality — ${Math.round(quality * 100)}%`}>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </Field>
            </div>
          ) : null}

          {showPassword ? (
            <Field label="PDF password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </Field>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton onClick={handleCompress} busy={busy}>
              Compress PDF
            </ActionButton>
            <button
              type="button"
              onClick={handleLossless}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Optimise (keep text selectable)
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>Compress</strong> re-encodes every page as a JPEG — the biggest
            savings, but the text is no longer selectable. <strong>Optimise</strong>{" "}
            keeps the text layer intact and only rewrites the document structure.
          </p>

          {progress ? (
            <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
              {progress}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Reduced by {reduction}% — {formatBytes(result.before)} →{" "}
                {formatBytes(result.after)}
              </p>
              {note ? (
                <p className="mt-1 text-emerald-700 dark:text-emerald-400">{note}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Status error={error} />
    </Workspace>
  );
}
