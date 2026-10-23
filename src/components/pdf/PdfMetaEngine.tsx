"use client";

import { useState } from "react";
import { PDFName } from "@cantoo/pdf-lib";
import {
  ActionButton,
  DropZone,
  Field,
  Status,
  Workspace,
  baseName,
  downloadBytes,
  formatBytes,
  inputClass,
} from "./shared";
import { PasswordRequiredError, formatDate, loadPdfDoc, readMetadata } from "./pdfLib";

export type PdfMetaMode = "view" | "edit" | "remove";

type MetaRecord = Awaited<ReturnType<typeof readMetadata>>;

const ROWS: { key: keyof MetaRecord; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords" },
  { key: "producer", label: "Producer" },
  { key: "creator", label: "Creator" },
];

export function PdfMetadataEngine({ mode }: { mode: PdfMetaMode }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [meta, setMeta] = useState<MetaRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const titles: Record<PdfMetaMode, { title: string; description: string; action: string }> = {
    view: {
      title: "PDF Metadata Viewer",
      description: "Inspect the document information stored inside a PDF.",
      action: "Read metadata",
    },
    edit: {
      title: "PDF Metadata Editor",
      description: "Change the title, author, subject, keywords and producer of a PDF.",
      action: "Save metadata",
    },
    remove: {
      title: "PDF Metadata Remover",
      description: "Strip author, producer, software, dates and XMP packets from a PDF.",
      action: "Remove metadata",
    },
  };
  const copy = titles[mode];

  async function load(target?: File) {
    const targetFile = target ?? file;
    if (!targetFile) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const doc = await loadPdfDoc(await targetFile.arrayBuffer(), password || undefined);
      const record = await readMetadata(doc);
      setMeta(record);
      setForm({
        title: record.title,
        author: record.author,
        subject: record.subject,
        keywords: record.keywords,
        producer: record.producer,
        creator: record.creator,
      });
      if (mode === "view") setInfo(null);
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError("This PDF is password protected. Enter the password and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not read the file.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const doc = await loadPdfDoc(await file.arrayBuffer(), password || undefined);

      if (mode === "edit") {
        doc.setTitle(form.title ?? "");
        doc.setAuthor(form.author ?? "");
        doc.setSubject(form.subject ?? "");
        doc.setKeywords(
          (form.keywords ?? "")
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        );
        doc.setProducer(form.producer ?? "");
        doc.setCreator(form.creator ?? "");
      }

      if (mode === "remove") {
        doc.setTitle("");
        doc.setAuthor("");
        doc.setSubject("");
        doc.setKeywords([]);
        doc.setProducer("");
        doc.setCreator("");
        doc.setCreationDate(new Date(0));
        doc.setModificationDate(new Date(0));
        // Drop the XMP packet stored on the catalog.
        try {
          doc.catalog.delete(PDFName.of("Metadata"));
        } catch {
          /* older documents may not expose an XMP packet */
        }
      }

      const bytes = await doc.save();
      downloadBytes(bytes, `${baseName(file.name)}-clean.pdf`);
      setInfo(
        mode === "edit"
          ? "Metadata updated and the new PDF was downloaded."
          : "Metadata stripped and the new PDF was downloaded.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace title={copy.title} description={copy.description}>
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? "Replace PDF" : "Choose a PDF"}
        hint="One .pdf file. Everything runs in your browser."
        onFiles={(list) => {
          const chosen = list[0] ?? null;
          setFile(chosen);
          setMeta(null);
          setError(null);
          setInfo(null);
          // The editor has to show the current values, otherwise saving would
          // overwrite every field the user did not touch with an empty string.
          if (chosen && mode === "edit") void load(chosen);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          {showPassword ? (
            <Field label="PDF password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : null}

          {mode === "view" ? (
            <ActionButton onClick={() => void load()} busy={busy}>
              {copy.action}
            </ActionButton>
          ) : null}

          {meta && mode === "view" ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                {ROWS.map((row) => (
                  <div key={row.key} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                    <dt className="font-medium text-slate-500 dark:text-slate-400">
                      {row.label}
                    </dt>
                    <dd className="col-span-2 break-words text-slate-800 dark:text-slate-200">
                      {(meta[row.key] as string) || (
                        <span className="text-slate-400 dark:text-slate-500">— empty —</span>
                      )}
                    </dd>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">
                    Created
                  </dt>
                  <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                    {formatDate(meta.creationDate)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">
                    Modified
                  </dt>
                  <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                    {formatDate(meta.modificationDate)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">Pages</dt>
                  <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                    {meta.pageCount}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">
                    File size
                  </dt>
                  <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                    {formatBytes(file.size)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {ROWS.map((row) => (
                <Field key={row.key} label={row.label}>
                  <input
                    type="text"
                    value={form[row.key] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [row.key]: e.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
              ))}
              <div className="sm:col-span-2">
                <ActionButton onClick={handleSave} busy={busy}>
                  {copy.action}
                </ActionButton>
              </div>
            </div>
          ) : null}

          {mode === "remove" ? (
            <div className="flex items-center gap-3">
              <ActionButton onClick={handleSave} busy={busy}>
                {copy.action}
              </ActionButton>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Produces a new file; the original is untouched.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
