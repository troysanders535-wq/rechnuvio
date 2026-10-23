"use client";

import dynamic from "next/dynamic";

/**
 * PDF workspace entry point.
 *
 * The whole PDF implementation (pdf-lib, PDF.js, Tesseract, barcode renderer)
 * is loaded on demand so that only the PDF tools pay for it — the rest of the
 * site never downloads the PDF bundle.
 */
const PdfVariantHost = dynamic(
  () => import("@/components/pdf/PdfVariantHost").then((m) => m.PdfVariantHost),
  {
    ssr: true,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    ),
  },
);

export function PdfSuiteEngine({ slug }: { slug: string }) {
  return <PdfVariantHost slug={slug} />;
}
