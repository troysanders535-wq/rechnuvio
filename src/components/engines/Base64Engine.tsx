"use client";

import React, { useState } from "react";
import { Copy, Download, Trash2, Upload, Sparkles, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface Base64EngineProps {
  slug: string;
}

/**
 * The result of decoding an input field.
 *
 * A base64 payload is binary data, so it must never be pushed through a
 * percent-decoder: `decodeURIComponent` throws a `URIError` ("URI malformed")
 * for the percent sequences and the invalid UTF-8 byte sequences that a PNG or
 * JPEG payload contains. The payload is base64-decoded into bytes first; the
 * percent-decoder is only used for the `data:<mime>,<percent-encoded>` form.
 */
type DecodedPayload =
  | { kind: "text"; text: string }
  | { kind: "image"; mime: string; bytes: number; dataUrl: string };

/** Strip the whitespace that a wrapped base64 payload may contain. */
function cleanBase64(payload: string): string {
  return payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
}

/** Decode a base64 payload into its bytes. Throws for an invalid payload. */
function base64ToBytes(payload: string): Uint8Array {
  const cleaned = cleanBase64(payload);
  if (cleaned.length === 0) return new Uint8Array(0);
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode bytes back into a base64 payload (chunked, so big payloads work). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

/** Read the bytes as UTF-8 text; invalid sequences become the replacement char. */
function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

/** Detect the image type of a decoded payload from its magic bytes. */
function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "image/x-icon";
  }
  const head = bytesToText(bytes.subarray(0, 256)).trim().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * Decode the input field: a `data:` URI keeps its declared media type, a bare
 * base64 payload is sniffed for an image type and otherwise read as text.
 */
function decodePayload(raw: string): DecodedPayload {
  const trimmed = raw.trim();
  const dataUrl = /^data:([^,]*),([\s\S]*)$/i.exec(trimmed);

  if (dataUrl) {
    const meta = dataUrl[1];
    const payload = dataUrl[2];
    if (/;base64/i.test(meta)) {
      const mime = (meta.split(";")[0] || "text/plain").trim().toLowerCase() || "text/plain";
      const bytes = base64ToBytes(payload);
      if (mime.startsWith("image/")) {
        return {
          kind: "image",
          mime,
          bytes: bytes.length,
          dataUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
        };
      }
      return { kind: "text", text: bytesToText(bytes) };
    }
    // A percent-encoded data URI is the only form that needs a URI decoder.
    return { kind: "text", text: decodeURIComponent(payload) };
  }

  const bytes = base64ToBytes(trimmed);
  const mime = detectImageMime(bytes);
  if (mime) {
    return {
      kind: "image",
      mime,
      bytes: bytes.length,
      dataUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
    };
  }
  return { kind: "text", text: bytesToText(bytes) };
}

export function Base64Engine({ slug }: Base64EngineProps) {
  const tUi = useTranslations("ui.engines.Base64Engine");
  const [textInput, setTextInput] = useState(tUi("helloFromDigitalToolPad100ClientSidePrivacy"));
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(textInput)));
      setOutput(encoded);
      setImagePreview(null);
      setImageInfo(null);
    } catch (err: any) {
      setOutput(tUi("encodeError", { message: err?.message ?? "" }));
      setImagePreview(null);
      setImageInfo(null);
    }
  };

  const handleDecode = () => {
    try {
      const decoded = decodePayload(textInput);
      if (decoded.kind === "image") {
        setOutput(
          `${tUi("decodedImageSummary", { mime: decoded.mime, bytes: decoded.bytes })}\n${decoded.dataUrl}`,
        );
        setImagePreview(decoded.dataUrl);
        setImageInfo(`${decoded.mime} • ${decoded.bytes} bytes`);
      } else {
        setOutput(decoded.text);
        setImagePreview(null);
        setImageInfo(null);
      }
    } catch (err: any) {
      setOutput(tUi("decodeError", { message: err?.message ?? "" }));
      setImagePreview(null);
      setImageInfo(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOutput(result);
        if (file.type.startsWith("image/")) {
          setImagePreview(result);
          setImageInfo(file.type);
        } else {
          setImageInfo(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "base64-result.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    handleEncode();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEncode}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <Sparkles className="size-3.5" />
            <span>{tUi("encodeToBase64")}</span>
          </button>
          <button
            type="button"
            onClick={handleDecode}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>{tUi("decodeBase64")}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">{tUi("fileToBase64")}</span>
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copied") : tUi("copy")}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{tUi("download")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTextInput("");
              setOutput("");
              setImagePreview(null);
              setImageInfo(null);
            }}
            className="rounded p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("inputTextOrBase64")}
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={12}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("output")}
          </div>
          <textarea
            value={output}
            readOnly
            rows={12}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-emerald-400 outline-none break-all"
          />

          {imagePreview && (
            <div className="border-t border-slate-800 p-4">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                <ImageIcon className="size-3.5 text-sky-400" /> {tUi("imagePreview")}
                {imageInfo ? (
                  <span className="font-mono text-[11px] font-normal text-slate-500">
                    {imageInfo}
                  </span>
                ) : null}
              </span>
              <img
                src={imagePreview}
                alt={tUi("decodedBase64Preview")}
                className="max-h-48 rounded-lg border border-slate-800 object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
