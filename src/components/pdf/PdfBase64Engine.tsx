"use client";

import { useState } from "react";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  downloadBytes,
  textareaClass,
} from "./shared";
import { createPdfDoc, imageToEmbeddable } from "./pdfLib";

type Detected = {
  kind: "pdf" | "png" | "jpeg" | "unknown";
  label: string;
  bytes: Uint8Array;
};

function detect(bytes: Uint8Array): Detected {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, i) => bytes[i] === byte);

  if (bytes.length > 4 && startsWith(0x25, 0x50, 0x44, 0x46)) {
    return { kind: "pdf", label: "PDF document", bytes };
  }
  if (bytes.length > 8 && startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { kind: "png", label: "PNG image", bytes };
  }
  if (bytes.length > 3 && startsWith(0xff, 0xd8, 0xff)) {
    return { kind: "jpeg", label: "JPEG image", bytes };
  }
  return { kind: "unknown", label: "Unrecognised data", bytes };
}

function toBytes(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, "");
  try {
    const binary = atob(clean);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    throw new Error("That is not valid Base64. Check for stray characters or a truncated payload.");
  }
}

/**
 * Builds the download name for the decoded file.
 * `statement.pdf.b64` must not become `statement.pdf.pdf`.
 */
function outputName(name: string): string {
  const stem = name
    .replace(/\.(b64|base64|txt|text|dat)$/i, "")
    .replace(/\.(pdf|png|jpe?g)$/i, "");
  return `${stem || "document"}.pdf`;
}

export function PdfBase64Engine() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("document");
  const [detected, setDetected] = useState<Detected | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleInspect() {
    setError(null);
    setInfo(null);
    try {
      const bytes = toBytes(input);
      if (!bytes.length) throw new Error("Paste a Base64 payload first.");
      const found = detect(bytes);
      setDetected(found);
      setInfo(
        found.kind === "unknown"
          ? "The payload decoded, but it is not a PDF, PNG or JPEG."
          : `Decoded ${bytes.length} bytes — ${found.label}.`,
      );
    } catch (err) {
      setDetected(null);
      setError(err instanceof Error ? err.message : "Could not decode the payload.");
    }
  }

  async function handleConvert() {
    setError(null);
    setInfo(null);

    try {
      const bytes = toBytes(input);
      if (!bytes.length) throw new Error("Paste a Base64 payload first.");
      const found = detect(bytes);

      if (found.kind === "pdf") {
        downloadBytes(bytes, outputName(fileName));
        setInfo("The payload was already a PDF and was downloaded unchanged.");
        return;
      }

      if (found.kind !== "png" && found.kind !== "jpeg") {
        throw new Error(
          "Only PDF, PNG and JPEG payloads can be turned into a PDF. This one is not recognised.",
        );
      }

      setBusy(true);
      const doc = await createPdfDoc();
      const image =
        found.kind === "png"
          ? await doc.embedPng(found.bytes)
          : await doc.embedJpg(found.bytes);
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      const out = await doc.save();
      downloadBytes(out, outputName(fileName));
      setInfo(`Converted the ${found.label} into a PDF.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(list: File[]) {
    const file = list[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setInfo(null);
    try {
      const text = await file.text();
      setInput(text.trim());
      const bytes = toBytes(text);
      const found = detect(bytes);
      setDetected(found);
      setInfo(`Loaded ${file.name} — ${found.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    }
  }

  return (
    <Workspace
      title="Base64 to PDF"
      description="Decode a Base64 payload and turn it into a PDF, or download the original file."
    >
      <DropZone
        accept=".txt,.b64,.base64,.pdf,.png,.jpg,.jpeg,text/plain,application/pdf,image/png,image/jpeg"
        label="Choose a .b64 file"
        hint="Or paste the Base64 payload below."
        onFiles={(list) => void handleFile(list)}
        disabled={busy}
      />

      <div className="mt-4">
        <Field label="Base64 payload">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setDetected(null);
            }}
            placeholder="JVBERi0xLjQKJ..."
            spellCheck={false}
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleInspect}
          disabled={busy || !input.trim()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Inspect payload
        </button>
        <ActionButton onClick={handleConvert} busy={busy} disabled={!input.trim()}>
          Convert to PDF
        </ActionButton>
        {detected ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Detected: {detected.label}
          </span>
        ) : null}
      </div>

      <Status error={error} info={info} />
    </Workspace>
  );
}
