"use client";

import { getPdfVariant } from "@/data/pdfTools";
import { PdfMergeEngine } from "./PdfMergeEngine";
import { PdfSplitEngine } from "./PdfSplitEngine";
import { PdfImageToPdfEngine, PdfToImageEngine } from "./PdfImageEngine";
import { PdfMetadataEngine } from "./PdfMetaEngine";
import { PdfCompressEngine } from "./PdfCompressEngine";
import { PdfRedactEngine } from "./PdfRedactEngine";
import { PdfTextEngine } from "./PdfTextEngine";
import { PdfBase64Engine } from "./PdfBase64Engine";
import { PdfEmailEngine } from "./PdfEmailEngine";
import { PdfTextToPdfEngine } from "./PdfTextToPdfEngine";
import { Pdf417Engine } from "./Pdf417Engine";
import { useTranslations } from "next-intl";

/**
 * Renders the workspace for a PDF tool.
 *
 * The variant is resolved with an exact slug lookup (see `@/data/pdfTools`).
 * A slug that is not wired up renders an explicit notice instead of silently
 * falling back to an unrelated tool.
 */
export function PdfVariantHost({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.pdf.PdfVariantHost");
  const variant = getPdfVariant(slug);

  switch (variant) {
    case "merge":
      return <PdfMergeEngine />;
    case "split":
      return <PdfSplitEngine />;
    case "img2pdf":
      return <PdfImageToPdfEngine />;
    case "toImage":
      return <PdfToImageEngine />;
    case "metaView":
      return <PdfMetadataEngine mode="view" />;
    case "metaEdit":
      return <PdfMetadataEngine mode="edit" />;
    case "metaRemove":
      return <PdfMetadataEngine mode="remove" />;
    case "compress":
      return <PdfCompressEngine />;
    case "redact":
      return <PdfRedactEngine mode="redact" />;
    case "blackout":
      return <PdfRedactEngine mode="blackout" />;
    case "toDocx":
      return <PdfTextEngine mode="docx" />;
    case "toMarkdown":
      return <PdfTextEngine mode="markdown" />;
    case "base64":
      return <PdfBase64Engine />;
    case "email":
      return <PdfEmailEngine />;
    case "html":
      return <PdfTextToPdfEngine />;
    case "pdf417":
      return <Pdf417Engine />;
    default:
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/40">
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            {tUi("thisPDFToolIsNotWiredUpYet")}
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/60">
              {slug}
            </code>{" "}
            is missing from the PDF routing map. Add it to{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/60">
              src/data/pdfTools.ts
            </code>{" "}
            to give it a workspace.
          </p>
        </div>
      );
  }
}
