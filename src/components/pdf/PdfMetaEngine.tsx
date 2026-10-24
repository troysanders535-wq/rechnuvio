"use client";

import React, { useState } from "react";
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
import {
  ExtendedMetadata,
  PasswordRequiredError,
  RemovedMetadata,
  formatDate,
  loadPdfDoc,
  readExtendedMetadata,
  readMetadata,
  stripMetadata,
} from "./pdfLib";
import { useTranslations } from "next-intl";

export type PdfMetaMode = "view" | "edit" | "remove";

type MetaRecord = Awaited<ReturnType<typeof readMetadata>>;

/** The metadata fields the tool reads and edits; the labels come from the catalogue. */
function ROWS(tUi: (key: string) => string): { key: keyof MetaRecord; label: string }[] {
  return [
    { key: "title", label: tUi("title") },
    { key: "author", label: tUi("author") },
    { key: "subject", label: tUi("subject") },
    { key: "keywords", label: tUi("keywords") },
    { key: "producer", label: tUi("producer") },
    { key: "creator", label: tUi("creator") },
  ];
}

/** One row of the metadata table. */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="col-span-2 break-words text-slate-800 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

/**
 * The table of everything the document carries.
 *
 * A row only shows a value that was really read from the file; a value the
 * file does not carry is named as missing instead of being shown as an empty
 * line that could be mistaken for a value.
 */
function MetaTable({
  meta,
  extra,
  fileSize,
}: {
  meta: MetaRecord;
  extra: ExtendedMetadata | null;
  fileSize: number;
}) {
  const tUi = useTranslations("ui.pdf.PdfMetaEngine");

  const history = extra?.versions.filter((entry) => entry.source === "history") ?? [];
  const earlier = extra?.versions.filter((entry) => entry.source === "versions") ?? [];
  const missing = (
    <span className="text-slate-400 dark:text-slate-500">
      {tUi("notPresentInThisFile")}
    </span>
  );
  const unreadable = (
    <span className="text-slate-400 dark:text-slate-500">{tUi("notAvailable")}</span>
  );

  function versionList(entries: typeof history) {
    return (
      <ul className="space-y-1">
        {entries.map((entry, index) => (
          <li key={`${entry.source}-${entry.instanceId ?? index}`}>
            {entry.action
              ? tUi("versionEntry", {
                  index: index + 1,
                  date: entry.modified ?? tUi("unknownDate"),
                  action: entry.action,
                })
              : tUi("versionEntryWithoutAction", {
                  index: index + 1,
                  date: entry.modified ?? tUi("unknownDate"),
                })}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
      data-testid="pdf-meta-table"
    >
      <dl className="divide-y divide-slate-200 dark:divide-slate-700">
        {ROWS(tUi).map((row) => (
          <MetaRow key={row.key} label={row.label}>
            {(meta[row.key] as string) || (
              <span className="text-slate-400 dark:text-slate-500">
                {tUi("emptyValue")}
              </span>
            )}
          </MetaRow>
        ))}
        <MetaRow label={tUi("created")}>{formatDate(meta.creationDate)}</MetaRow>
        <MetaRow label={tUi("modified")}>
          {formatDate(meta.modificationDate)}
        </MetaRow>
        <MetaRow label={tUi("pages")}>{meta.pageCount}</MetaRow>
        <MetaRow label={tUi("fileSize")}>{formatBytes(fileSize)}</MetaRow>

        <MetaRow label={tUi("documentId")}>
          {extra?.documentId ? (
            <span className="font-mono text-xs">{extra.documentId}</span>
          ) : (
            missing
          )}
        </MetaRow>

        <MetaRow label={tUi("xmpPacket")}>
          {extra?.readable === false ? (
            unreadable
          ) : extra?.hasXmp ? (
            tUi("present")
          ) : (
            missing
          )}
        </MetaRow>

        <MetaRow label={tUi("xmpEditHistory")}>
          {extra?.readable === false ? (
            unreadable
          ) : history.length ? (
            versionList(history)
          ) : (
            missing
          )}
        </MetaRow>

        <MetaRow label={tUi("earlierVersions")}>
          {extra?.readable === false ? (
            unreadable
          ) : earlier.length ? (
            versionList(earlier)
          ) : (
            missing
          )}
        </MetaRow>

        <MetaRow label={tUi("photoGps")}>
          {extra?.readable === false ? (
            unreadable
          ) : extra?.gps ? (
            <>
              <span className="font-mono text-xs">{extra.gps.raw}</span>
              {extra.gps.latitude !== null && extra.gps.longitude !== null ? (
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  {`${extra.gps.latitude.toFixed(6)}, ${extra.gps.longitude.toFixed(6)}`}
                </span>
              ) : null}
            </>
          ) : (
            missing
          )}
        </MetaRow>

        <MetaRow label={tUi("attachments")}>
          {extra?.readable === false ? (
            unreadable
          ) : extra?.attachments.length ? (
            <ul className="space-y-1">
              {extra.attachments.map((attachment) => (
                <li key={attachment.name}>
                  <span className="font-medium">{attachment.name}</span>
                  {attachment.size !== null ? (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatBytes(attachment.size)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            missing
          )}
        </MetaRow>
      </dl>
    </div>
  );
}

export function PdfMetadataEngine({ mode }: { mode: PdfMetaMode }) {
  const tUi = useTranslations("ui.pdf.PdfMetaEngine");
  const rows = ROWS(tUi);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [meta, setMeta] = useState<MetaRecord | null>(null);
  const [extra, setExtra] = useState<ExtendedMetadata | null>(null);
  const [removed, setRemoved] = useState<RemovedMetadata | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const titles: Record<PdfMetaMode, { title: string; description: string; action: string }> = {
    view: {
      title: tUi("pDFMetadataViewer"),
      description: tUi("inspectTheDocumentInformationStoredInsideAPDF"),
      action: tUi("readMetadata"),
    },
    edit: {
      title: tUi("pDFMetadataEditor"),
      description: tUi("changeTheTitleAuthorSubjectKeywordsAndProducerOfAPDF"),
      action: tUi("saveMetadata"),
    },
    remove: {
      title: tUi("pDFMetadataRemover"),
      description: tUi("stripAuthorProducerSoftwareDatesAndXMPPacketsFromAPDF"),
      action: tUi("removeMetadata"),
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
      const bytes = await targetFile.arrayBuffer();
      const doc = await loadPdfDoc(bytes, password || undefined);
      const record = await readMetadata(doc);
      // The XMP packet, the identifier of the document and the embedded files
      // do not live in the information dictionary, so they are read separately.
      const extended = await readExtendedMetadata(doc, bytes, password || undefined);
      setMeta(record);
      setExtra(extended);
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
        setError(tUi("thisPDFIsPasswordProtectedEnterThePasswordAndTryAgain"));
      } else {
        setError(err instanceof Error ? err.message : tUi("couldNotReadTheFile"));
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
        // The information dictionary, the XMP packet with its edit history and
        // its GPS coordinates and the embedded files are removed together.
        setRemoved(stripMetadata(doc));
      }

      const bytes = await doc.save();
      downloadBytes(bytes, `${baseName(file.name)}-clean.pdf`);
      setInfo(
        mode === "edit"
          ? tUi("metadataUpdatedAndTheNewPDFWasDownloaded")
          : tUi("metadataStrippedAndTheNewPDFWasDownloaded"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotWriteTheFile"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace title={copy.title} description={copy.description}>
      <DropZone
        accept="application/pdf,.pdf"
        label={file ? tUi("replacePDF") : tUi("chooseAPDF")}
        hint={tUi("onePdfFileEverythingRunsInYourBrowser")}
        onFiles={(list) => {
          const chosen = list[0] ?? null;
          setFile(chosen);
          setMeta(null);
          setExtra(null);
          setRemoved(null);
          setError(null);
          setInfo(null);
          // The editor has to show the current values, otherwise saving would
          // overwrite every field the user did not touch with an empty string.
          // The remover shows them as well: the user sees what is inside the
          // file before it is taken out of it.
          if (chosen && mode !== "view") void load(chosen);
        }}
        disabled={busy}
      />

      {file ? (
        <div className="mt-5 space-y-4">
          {showPassword ? (
            <Field label={tUi("pDFPassword")}>
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

          {meta && (mode === "view" || mode === "remove") ? (
            <div className="space-y-2">
              {mode === "remove" ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {tUi("thisIsWhatIsInsideTheFile")}
                </p>
              ) : null}
              <MetaTable meta={meta} extra={extra} fileSize={file.size} />
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((row) => (
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
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ActionButton onClick={handleSave} busy={busy}>
                  {copy.action}
                </ActionButton>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {tUi("producesANewFileTheOriginalIsUntouched")}
                </span>
              </div>

              {removed ? (
                <ul
                  className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  data-testid="pdf-meta-removed"
                >
                  {removed.documentInformation ? (
                    <li>{tUi("removedDocumentInformation")}</li>
                  ) : null}
                  {removed.xmp ? <li>{tUi("removedXmpPacket")}</li> : null}
                  {removed.gps ? <li>{tUi("removedGps")}</li> : null}
                  {removed.attachments ? (
                    <li>{tUi("removedAttachments", { count: removed.attachments })}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
