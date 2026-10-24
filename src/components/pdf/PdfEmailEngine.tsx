"use client";

import { useState } from "react";
import {
  ActionButton,
  DropZone,
  Status,
  Workspace,
  baseName,
  downloadBlob,
} from "./shared";
import { htmlToText, parseEml, type EmlMessage } from "./eml";
import { useTranslations } from "next-intl";
import {
  MARGIN,
  PAGE_H,
  PAGE_W,
  createDoc,
  drawKeyValue,
  drawParagraph,
  drawRule,
  drawHeading,
  readImageSize,
} from "./jsPdfKit";

type Loaded = {
  fileName: string;
  kind: "eml" | "msg";
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  attachments: { filename: string; mimeType: string; size: number }[];
  raw: EmlMessage | null;
  msgAttachments: { filename: string; mimeType: string; bytes: Uint8Array }[];
};

/** Minimal extension -> mime type map for Outlook attachments. */
function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    json: "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}

export function PdfEmailEngine() {
  const tUi = useTranslations("ui.pdf.PdfEmailEngine");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleFile(list: File[]) {
    const file = list[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const buffer = await file.arrayBuffer();
      const isMsg = /\.msg$/i.test(file.name) || file.type.includes("x-msg");

      if (isMsg) {
        const { default: MsgReader } = await import("@kenjiuno/msgreader");
        const reader = new MsgReader(buffer);
        const fields = reader.getFileData();

        const attachmentFields = fields.attachments ?? [];
        const attachments = attachmentFields.map((attachment, index) => {
          const data = reader.getAttachment(index);
          const filename = data?.fileName ?? attachment.fileName ?? "attachment";
          return {
            filename,
            mimeType: guessMimeType(filename),
            bytes: data?.content ?? new Uint8Array(0),
          };
        });

        const body = fields.body?.trim()
          ? fields.body
          : fields.bodyHtml
            ? htmlToText(fields.bodyHtml)
            : "";

        setLoaded({
          fileName: file.name,
          kind: "msg",
          subject: fields.subject ?? "",
          from: fields.senderName ?? fields.senderEmail ?? "",
          to: (fields.recipients ?? [])
            .map((r) => r.email ?? r.name ?? "")
            .filter(Boolean)
            .join(", "),
          date: fields.clientSubmitTime ?? fields.messageDeliveryTime ?? "",
          body,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.bytes.length,
          })),
          raw: null,
          msgAttachments: attachments,
        });
        setInfo(tUi("outlookMessageParsed"));
        return;
      }

      const parsed = parseEml(buffer);
      setLoaded({
        fileName: file.name,
        kind: "eml",
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
        body: parsed.text || htmlToText(parsed.html),
        attachments: parsed.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.bytes.length,
        })),
        raw: parsed,
        msgAttachments: [],
      });
      setInfo(tUi("emailParsed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotReadTheEmail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    if (!loaded) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const doc = createDoc(loaded.subject || tUi("emailFallbackTitle"));
      let y = MARGIN + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      y = drawHeading(doc, loaded.subject || tUi("noSubject"), 1, y);
      y = drawRule(doc, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (loaded.from) y = drawKeyValue(doc, tUi("from"), loaded.from, y);
      if (loaded.to) y = drawKeyValue(doc, tUi("to"), loaded.to, y);
      if (loaded.date) y = drawKeyValue(doc, tUi("date"), loaded.date, y);
      y = drawRule(doc, y);

      const body = loaded.body?.trim();
      if (body) {
        for (const paragraph of body.split(/\n{2,}/)) {
          const trimmed = paragraph.trim();
          if (!trimmed) continue;
          y = drawParagraph(doc, trimmed, y);
        }
      } else {
        y = drawParagraph(doc, tUi("thisMessageHasNoReadableBodyText"), y);
      }

      if (loaded.attachments.length) {
        y = drawRule(doc, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        y = drawHeading(doc, tUi("attachmentsHeading", { count: loaded.attachments.length }), 2, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const attachment of loaded.attachments) {
          y = drawParagraph(
            doc,
            tUi("attachmentDetails", {
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: attachment.size,
            }),
            y,
          );
        }
      }

      // Attach any image attachments as extra pages.
      const images = loaded.msgAttachments.filter((a) => a.mimeType.startsWith("image/"));
      for (const image of images) {
        try {
          const blob = new Blob([image.bytes.slice()], { type: image.mimeType });
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });

          const format = image.mimeType.includes("png") ? "PNG" : "JPEG";
          const size = await readImageSize(dataUrl);
          const maxW = PAGE_W - MARGIN * 2;
          const maxH = PAGE_H - MARGIN * 2;
          const ratio = Math.min(maxW / size.width, maxH / size.height);
          const width = size.width * ratio;
          const height = size.height * ratio;

          doc.addPage();
          doc.addImage(
            dataUrl,
            format,
            (PAGE_W - width) / 2,
            (PAGE_H - height) / 2,
            width,
            height,
          );
        } catch {
          /* skip attachments that cannot be embedded */
        }
      }

      const blob = doc.output("blob");
      downloadBlob(blob, `${baseName(loaded.fileName)}.pdf`);
      setInfo(tUi("emailConvertedToPDF"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("couldNotBuildThePDF"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title={tUi("emailToPDFConverter")}
      description={tUi("turnAnEmlOrMsgEmailIntoAReadablePDFIncludingItsHeadersAndAttachmentList")}
    >
      <DropZone
        accept=".eml,.msg,message/rfc822"
        label={loaded ? tUi("replaceEmail") : tUi("chooseAnEmailFile")}
        hint={tUi("anEmlFileExportedFromAMailClientOrAnOutlookMsgFile")}
        onFiles={(list) => void handleFile(list)}
        disabled={busy}
      />

      {loaded ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <dl className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <div className="grid grid-cols-3 gap-3 px-4 py-2.5">
                <dt className="font-medium text-slate-500 dark:text-slate-400">{tUi("subject")}</dt>
                <dd className="col-span-2 break-words text-slate-800 dark:text-slate-200">
                  {loaded.subject || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-3 px-4 py-2.5">
                <dt className="font-medium text-slate-500 dark:text-slate-400">{tUi("from")}</dt>
                <dd className="col-span-2 break-words text-slate-800 dark:text-slate-200">
                  {loaded.from || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-3 px-4 py-2.5">
                <dt className="font-medium text-slate-500 dark:text-slate-400">{tUi("date")}</dt>
                <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                  {loaded.date || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-3 px-4 py-2.5">
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  {tUi("attachments")}
                </dt>
                <dd className="col-span-2 text-slate-800 dark:text-slate-200">
                  {loaded.attachments.length
                    ? loaded.attachments.map((a) => a.filename).join(", ")
                    : tUi("none")}
                </dd>
              </div>
            </dl>
          </div>

          <ActionButton onClick={handleConvert} busy={busy}>
            {tUi("convertToPDF")}
          </ActionButton>
        </div>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
