import { Metadata } from "next";
import { pageAlternates } from "@/lib/brand";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCode,
  FileText,
  Clock,
  Image
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("productivitySuitePage");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates("/productivity-suite"),
  };
}

export default async function ProductivitySuitePage() {
  const t = await getTranslations("productivitySuitePage");
  const tShell = await getTranslations("toolShell");
  const locale = await getLocale();
  const isGerman = locale.startsWith("de");

  const suites = [
    {
      title: isGerman ? "Entwickler- & Datenformat-Suite" : "Developer & Data Format Suite",
      description: isGerman
        ? "Formatieren, validieren und vergleichen Sie JSON, YAML, CSV, SQL und GraphQL mit sofortiger Schema-Visualisierung."
        : "Format, validate, and compare JSON, YAML, CSV, SQL, and GraphQL with instant schema visualization.",
      icon: FileCode,
      tools: [
        { name: "JSON Formatter & Validator", slug: "json-formatter" },
        { name: "YAML Validator & Editor", slug: "yaml-editor-validator" },
        { name: "CSV to JSON Converter", slug: "csv-to-json-converter" },
        { name: "SQL Beautifier", slug: "sql-formatter-beautifier" },
        { name: "Diff Checker", slug: "diff-checker" },
      ],
    },
    {
      title: isGerman ? "Dokumenten- & PDF-Suite" : "Document & PDF Manipulation Suite",
      description: isGerman
        ? "Bearbeiten Sie Markdown-Dokumente, exportieren Sie nach PDF und Word, fügen Sie Seiten zusammen und teilen Sie sie direkt in Ihrem Browser."
        : "Work with markdown documents, export to PDF and Word, merge and split pages directly in your browser.",
      icon: FileText,
      tools: [
        { name: "Markdown to PDF Converter", slug: "markdown-to-pdf" },
        { name: "Markdown to Word (.docx)", slug: "markdown-to-docx" },
        { name: "Merge PDF Documents", slug: "merge-pdf" },
        { name: "Split PDF Pages", slug: "split-pdf" },
        { name: "Word Counter & Stats", slug: "word-counter" },
      ],
    },
    {
      title: isGerman ? "Design- & Medienerstellungs-Suite" : "Design & Media Creator Suite",
      description: isGerman
        ? "Fotos skalieren, QR-Codes und Barcodes generieren, zwischen Bildformaten konvertieren und Exif-Metadaten entfernen."
        : "Resize photos, generate QR codes and barcodes, convert between image formats, and strip Exif metadata.",
      icon: Image,
      tools: [
        { name: "Powerful Image Resizer", slug: "image-resizer" },
        { name: "Custom QR Code Generator", slug: "qr-code-generator" },
        { name: "Barcode Generator", slug: "barcode-generator" },
        { name: "Base64 Image Decoder", slug: "base64-image-decoder" },
        { name: "AI Background Remover", slug: "background-remover" },
      ],
    },
    {
      title: isGerman ? "Zeit-, Fokus- & Planungs-Suite" : "Time, Focus & Planning Suite",
      description: isGerman
        ? "Pomodoro-Fokuszyklen, Weltzeitzonen-Besprechungsplaner, Unix-Zeitstempel-Konverter und druckbare Kalender."
        : "Pomodoro focus cycles, world timezone meeting planners, Unix timestamp converters, and printable calendars.",
      icon: Clock,
      tools: [
        { name: "Pomodoro Focus Timer", slug: "pomodoro-timer" },
        { name: "Unix Timestamp Converter", slug: "timestamp-converter-generator" },
        { name: "2026/2027 Calendar Suite", slug: "2026-calendar" },
        { name: "Date & Age Calculator", slug: "date-calculator" },
        { name: "World Time Converter", slug: "world-time-converter" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          <Sparkles className="size-3.5" />
          <span>{t("badge")}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {suites.map((suite, idx) => {
          const Icon = suite.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {suite.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {suite.description}
                </p>

                <div className="mt-6 space-y-2">
                  {suite.tools.map((tItem) => (
                    <Link
                      key={tItem.slug}
                      href={`/tools/${tItem.slug}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span>{tItem.name}</span>
                      <ArrowRight className="size-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  {tShell("runsInBrowser")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
