"use client";

import React from "react";
import { useTranslations } from "next-intl";
import JSZip from "jszip";
import { FileText, Mail, Upload } from "lucide-react";

import { readMsg, type MsgAttachment, type MsgMessage } from "./msg";

/**
 * The document viewers.
 *
 * Every file is read in the browser: a .docx is a ZIP archive, an .eml is a
 * plain text message, a .msg is an OLE compound file and a .psd carries its
 * geometry in a fixed header. Nothing is uploaded.
 */

function useFileInput(
  accept: string,
  label: string,
  onFile: (buffer: ArrayBuffer, file: File) => void | Promise<void>,
) {
  const [fileName, setFileName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      await onFile(buffer, file);
    },
    [onFile],
  );

  return { accept, label, fileName, inputRef, onChange };
}

/* --------------------------------------------------------------- docx ---- */

interface DocxContent {
  text: string;
  paragraphs: string[];
  author: string;
  title: string;
}

/** Read the text and the core properties of a .docx file. */
export async function readDocx(buffer: ArrayBuffer): Promise<DocxContent> {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  const paragraphs: string[] = [];
  let text = "";

  if (documentFile) {
    const xml = await documentFile.async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphsNodes = Array.from(doc.getElementsByTagName("*")).filter(
      (node) => node.localName === "p",
    );
    for (const paragraph of paragraphsNodes) {
      const words = Array.from(paragraph.getElementsByTagName("*"))
        .filter((node) => node.localName === "t")
        .map((node) => node.textContent || "")
        .join("");
      paragraphs.push(words);
      text += `${words}\n`;
    }
  }

  let author = "";
  let title = "";
  const core = zip.file("docProps/core.xml");
  if (core) {
    const xml = await core.async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    for (const node of Array.from(doc.getElementsByTagName("*"))) {
      if (node.localName === "creator") author = node.textContent || "";
      if (node.localName === "title") title = node.textContent || "";
    }
  }

  return { text: text.trim(), paragraphs, author, title };
}

export function DocxViewer() {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  const [content, setContent] = React.useState<DocxContent | null>(null);
  const [error, setError] = React.useState("");

  const onFile = async (buffer: ArrayBuffer) => {
    setError("");
    try {
      const result = await readDocx(buffer);
      setContent(result);
    } catch (err) {
      setContent(null);
      setError(String((err as Error)?.message || err));
    }
  };

  const { accept, label, fileName, inputRef, onChange } = useFileInput(
    ".docx",
    tUi("openWordDocument"),
    onFile,
  );

  return (
    <DocumentFrame
      title={tUi("wordDocumentViewerTitle")}
      icon={<FileText className="size-5 text-sky-700" />}
      accept={accept}
      label={label}
      fileName={fileName}
      inputRef={inputRef}
      onChange={onChange}
      error={error}
    >
      {content ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tUi("authorLabel")}: {content.author || "-"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tUi("titleLabel")}: {content.title || "-"}
            </p>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {content.text || tUi("emptyDocument")}
          </pre>
        </div>
      ) : null}
    </DocumentFrame>
  );
}

/* ---------------------------------------------------------------- eml ---- */

interface MailContent {
  headers: { name: string; value: string }[];
  body: string;
}

/** Read the headers and the body of a plain text e-mail. */
export function readEml(text: string): MailContent {
  const headers: { name: string; value: string }[] = [];
  const lines = text.split(/\r?\n/);
  let index = 0;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      break;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.push({
      name: line.slice(0, separator).trim(),
      value: line.slice(separator + 1).trim(),
    });
  }
  return { headers, body: lines.slice(index).join("\n").trim() };
}

export function EmlViewer() {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  const [content, setContent] = React.useState<MailContent | null>(null);
  const [error, setError] = React.useState("");

  const onFile = async (buffer: ArrayBuffer) => {
    setError("");
    try {
      const text = new TextDecoder().decode(buffer);
      setContent(readEml(text));
    } catch (err) {
      setContent(null);
      setError(String((err as Error)?.message || err));
    }
  };

  const { accept, label, fileName, inputRef, onChange } = useFileInput(
    ".eml",
    tUi("openEmailMessage"),
    onFile,
  );

  return (
    <DocumentFrame
      title={tUi("emailMessageViewerTitle")}
      icon={<Mail className="size-5 text-sky-700" />}
      accept={accept}
      label={label}
      fileName={fileName}
      inputRef={inputRef}
      onChange={onChange}
      error={error}
    >
      {content ? (
        <div className="space-y-3">
          <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-950">
            {content.headers.map((header) => (
              <div key={header.name} className="flex gap-3 px-3 py-2 text-xs">
                <dt className="w-32 shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                  {header.name}
                </dt>
                <dd className="min-w-0 flex-1 break-all text-slate-800 dark:text-slate-200">
                  {header.value}
                </dd>
              </div>
            ))}
          </dl>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {content.body}
          </pre>
        </div>
      ) : null}
    </DocumentFrame>
  );
}

/* ---------------------------------------------------------------- msg ---- */

/**
 * The header of the message, as a list of name and value pairs.
 */
function MsgHeaderRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="break-words text-sm text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

export function MsgViewer() {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  const [message, setMessage] = React.useState<MsgMessage | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const onFile = async (buffer: ArrayBuffer) => {
    setError("");
    try {
      setMessage(readMsg(buffer));
    } catch (err) {
      setMessage(null);
      setError(String((err as Error)?.message || err));
    }
  };

  /** Hand the bytes of an attachment to the browser as a download. */
  const downloadAttachment = (attachment: MsgAttachment) => {
    const blob = new Blob([attachment.data as BlobPart], {
      type: attachment.mime || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // The download has to be finished before the url is released.
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  /** Write the message into a PDF. */
  const saveAsPdf = async () => {
    if (!message) return;
    setBusy(true);
    setError("");
    try {
      const { buildPdfFromMarkdown } = await import("../markdown/markdownToPdf");
      const lines: string[] = [];
      if (message.subject) lines.push(`# ${message.subject}`);
      if (message.from) lines.push(`**${tUi("msgFrom")}:** ${message.from}`);
      if (message.to) lines.push(`**${tUi("msgTo")}:** ${message.to}`);
      if (message.cc) lines.push(`**${tUi("msgCc")}:** ${message.cc}`);
      if (message.date) lines.push(`**${tUi("msgDate")}:** ${message.date}`);
      lines.push("");
      lines.push(message.body || "");
      const doc = buildPdfFromMarkdown(lines.join("\n"));
      doc.save(`${message.subject || "message"}.pdf`.replace(/[\\/:*?"<>|]/g, "-"));
    } catch (err) {
      setError(String((err as Error)?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const { accept, label, fileName, inputRef, onChange } = useFileInput(
    ".msg",
    tUi("openOutlookMessage"),
    onFile,
  );

  return (
    <DocumentFrame
      title={tUi("outlookMessageViewerTitle")}
      icon={<Mail className="size-5 text-sky-700" />}
      accept={accept}
      label={label}
      fileName={fileName}
      inputRef={inputRef}
      onChange={onChange}
      error={error}
    >
      {message ? (
        <div className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <MsgHeaderRow label={tUi("msgSubject")} value={message.subject} />
            <MsgHeaderRow label={tUi("msgFrom")} value={message.from} />
            <MsgHeaderRow label={tUi("msgTo")} value={message.to} />
            <MsgHeaderRow label={tUi("msgCc")} value={message.cc} />
            <MsgHeaderRow label={tUi("msgDate")} value={message.date} />
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {tUi("msgBody")}
            </h4>
            {message.body ? (
              <pre
                data-testid="msg-body"
                className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 font-sans text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {message.body}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">{tUi("msgNoBody")}</p>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {tUi("msgAttachments")}
            </h4>
            {message.attachments.length ? (
              <ul className="space-y-1.5">
                {message.attachments.map((attachment) => (
                  <li
                    key={attachment.name}
                    data-testid="msg-attachment"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <span className="min-w-0 break-all text-xs">
                      {attachment.name}
                      <span className="ml-2 text-slate-500 dark:text-slate-400">
                        {attachment.size} bytes
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(attachment)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {tUi("msgDownloadAttachment")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">{tUi("msgNoAttachments")}</p>
            )}
          </div>

          {message.headers.length ? (
            <details open className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {tUi("msgHeaders")}
              </summary>
              <pre
                data-testid="msg-headers"
                className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300"
              >
                {message.headers.join("\n")}
              </pre>
            </details>
          ) : null}

          <button
            type="button"
            onClick={saveAsPdf}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("msgSaveAsPdf")}
          </button>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {tUi("msgViewerNote")}
          </p>
        </div>
      ) : null}
    </DocumentFrame>
  );
}

/* ---------------------------------------------------------------- psd ---- */

interface PsdInfo {
  width: number;
  height: number;
  channels: number;
  depth: number;
  colorMode: string;
  layers: number;
}

/** Read the header and the layer section of a Photoshop document. */
export function readPsd(buffer: ArrayBuffer): PsdInfo {
  const view = new DataView(buffer);
  const signature = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (signature !== "8BPS") {
    throw new Error("this is not a Photoshop document");
  }

  const channels = view.getUint16(12, false);
  const height = view.getUint32(14, false);
  const width = view.getUint32(18, false);
  const depth = view.getUint16(22, false);
  const colorModeCode = view.getUint16(24, false);
  const colorModes: Record<number, string> = {
    0: "Bitmap",
    1: "Grayscale",
    2: "Indexed",
    3: "RGB",
    4: "CMYK",
    7: "Multichannel",
    8: "Duotone",
    9: "Lab",
  };

  // The color mode data block comes first, then the image resources and the
  // layer and mask information.
  let offset = 26;
  const readBlock = () => {
    if (offset + 4 > view.byteLength) return;
    const length = view.getUint32(offset, false);
    offset += 4 + length + (length % 2);
  };
  readBlock(); // colour mode data
  readBlock(); // image resources

  let layers = 0;
  if (offset + 4 <= view.byteLength) {
    const length = view.getUint32(offset, false);
    if (offset + 4 + length <= view.byteLength && length > 0) {
      const info = new DataView(buffer, offset + 4, length);
      // The layer count is a signed 16 bit value at the start of the block.
      layers = info.getInt16(0, false);
      if (layers < 0) layers = 0;
    }
  }

  return {
    width,
    height,
    channels,
    depth,
    colorMode: colorModes[colorModeCode] || `Mode ${colorModeCode}`,
    layers,
  };
}

export function PsdViewer() {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  const [info, setInfo] = React.useState<PsdInfo | null>(null);
  const [error, setError] = React.useState("");

  const onFile = async (buffer: ArrayBuffer) => {
    setError("");
    try {
      setInfo(readPsd(buffer));
    } catch (err) {
      setInfo(null);
      setError(String((err as Error)?.message || err));
    }
  };

  const { accept, label, fileName, inputRef, onChange } = useFileInput(
    ".psd",
    tUi("openPhotoshopDocument"),
    onFile,
  );

  return (
    <DocumentFrame
      title={tUi("photoshopViewerTitle")}
      icon={<FileText className="size-5 text-sky-700" />}
      accept={accept}
      label={label}
      fileName={fileName}
      inputRef={inputRef}
      onChange={onChange}
      error={error}
    >
      {info ? (
        <dl className="grid grid-cols-2 gap-3 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-3">
          <p>
            <span className="font-semibold">{tUi("widthLabel")}:</span> {info.width} px
          </p>
          <p>
            <span className="font-semibold">{tUi("heightLabel")}:</span> {info.height} px
          </p>
          <p>
            <span className="font-semibold">{tUi("channelsLabel")}:</span> {info.channels}
          </p>
          <p>
            <span className="font-semibold">{tUi("bitDepthLabel")}:</span> {info.depth} bit
          </p>
          <p>
            <span className="font-semibold">{tUi("colorModeLabel")}:</span> {info.colorMode}
          </p>
          <p>
            <span className="font-semibold">{tUi("layersLabel")}:</span> {info.layers}
          </p>
        </dl>
      ) : null}
    </DocumentFrame>
  );
}

/* --------------------------------------------------------------- frame ---- */

/** The frame every document viewer uses: a title, a file input and a body. */
function DocumentFrame({
  title,
  icon,
  accept,
  label,
  fileName,
  inputRef,
  onChange,
  error,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accept: string;
  label: string;
  fileName: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error: string;
  children: React.ReactNode;
}) {
  const tUi = useTranslations("ui.engines.FileViewersEngine");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          {icon}
          {title}
        </h3>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Upload className="size-3.5" />
          {label}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onChange}
            className="hidden"
          />
        </label>
        {fileName ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{fileName}</p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
