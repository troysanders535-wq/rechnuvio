"use client";

import { useState } from "react";

import {
  ActionButton,
  Field,
  Status,
  Workspace,
  downloadBlob,
  downloadBytes,
  inputClass,
} from "./shared";
import { createPdfDoc } from "./pdfLib";

export function Pdf417Engine() {
  const [text, setText] = useState("");
  const [scale, setScale] = useState(3);
  const [includeText, setIncludeText] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function render() {
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const bwipjs = await import("bwip-js/browser");
      const canvas = document.createElement("canvas");
      await bwipjs.toCanvas(canvas, {
        bcid: "pdf417",
        text: text.trim(),
        scale,
        includetext: includeText,
        textxalign: "center",
        textyalign: "below",
        padding: 8,
      });

      if (preview) URL.revokeObjectURL(preview);
      setPreview(canvas.toDataURL("image/png"));

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not encode the barcode.");

      const doc = await createPdfDoc();
      const png = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()));

      // A4 with the barcode centred.
      const page = doc.addPage([595.28, 841.89]);
      const maxWidth = 515;
      const maxHeight = 700;
      const ratio = Math.min(maxWidth / png.width, maxHeight / png.height);
      const width = png.width * ratio;
      const height = png.height * ratio;
      page.drawImage(png, {
        x: (595.28 - width) / 2,
        y: (841.89 - height) / 2,
        width,
        height,
      });

      const bytes = await doc.save();
      downloadBytes(bytes, "pdf417-barcode.pdf");
      downloadBlob(blob, "pdf417-barcode.png");
      setInfo("Downloaded the barcode as a PDF and a PNG.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the barcode.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title="PDF417 Barcode Generator"
      description="Create a scannable PDF417 barcode and download it as a PDF or a PNG."
    >
      <Field label="Barcode content" hint="Up to a few thousand characters of data.">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the data to encode"
          spellCheck={false}
          className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={`Scale — ${scale}×`}>
          <input
            type="range"
            min={1}
            max={6}
            step={0.5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </Field>
        <label className="flex items-center gap-2.5 pt-6 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={includeText}
            onChange={(e) => setIncludeText(e.target.checked)}
            className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Print the data underneath
        </label>
      </div>

      <div className="mt-5">
        <ActionButton onClick={render} busy={busy} disabled={!text.trim()}>
          Generate barcode
        </ActionButton>
      </div>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Generated PDF417 barcode preview"
          className="mt-5 max-w-full rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700"
        />
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
