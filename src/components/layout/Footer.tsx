"use client";

import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Wrench, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { hasImpressum } from "@/lib/brand";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isGerman = locale.startsWith("de");

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950">
      {/* Privacy & Speed Value Props */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("valPropPrivacyTitle")}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("valPropPrivacyDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Zap className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("valPropSpeedTitle")}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("valPropSpeedDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("valPropFreeTitle")}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("valPropFreeDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand Info & Language Switcher */}
          <div className="col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center transition-opacity hover:opacity-90"
              aria-label="Rechnuvio"
            >
              <NextImage
                src="/rechnuvio-logo.svg"
                alt="Rechnuvio"
                width={147}
                height={32}
                unoptimized
                className="h-8 w-auto object-contain dark:hidden"
              />
              <NextImage
                src="/rechnuvio-logo-dark.svg"
                alt="Rechnuvio"
                width={147}
                height={32}
                unoptimized
                className="hidden h-8 w-auto object-contain dark:block"
              />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t("aboutDesc")}
            </p>

            {/* Language Switcher */}
            <div className="pt-2">
              <LanguageSwitcher />
            </div>

            <p className="text-[11px] text-slate-400">
              {t("copyright")}
            </p>
            <p className="text-[10px] text-slate-400 italic">
              {tCommon("editorialReviewNotice")}
            </p>
          </div>

          {/* Column: Core Tools */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t("colDataCode")}
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/tools/json-formatter" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "JSON-Formatierer & Validator" : "JSON Formatter & Validator"}
                </Link>
              </li>
              <li>
                <Link href="/tools/yaml-editor-validator" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "YAML-Validator & Editor" : "YAML Validator & Editor"}
                </Link>
              </li>
              <li>
                <Link href="/tools/csv-to-json-converter" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "CSV zu JSON Konverter" : "CSV to JSON Converter"}
                </Link>
              </li>
              <li>
                <Link href="/tools/diff-checker" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "Diff Checker & Textvergleich" : "Diff Checker & Text Compare"}
                </Link>
              </li>
              <li>
                <Link href="/tools/regex-tester" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "Regex-Tester & Prüfung" : "Regex Tester & Explainer"}
                </Link>
              </li>
              <li>
                <Link href="/tools/sql-formatter-beautifier" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "SQL-Formatierer & Beautifier" : "SQL Formatter & Beautifier"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Media & Documents */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t("colMediaPdf")}
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/tools/image-resizer" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "Bilder skalieren & zuschneiden" : "Powerful Image Resizer"}
                </Link>
              </li>
              <li>
                <Link href="/tools/background-remover" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "KI-Hintergrundentferner" : "AI Background Remover"}
                </Link>
              </li>
              <li>
                <Link href="/tools/qr-code-generator" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "QR-Code-Generator" : "QR Code Generator"}
                </Link>
              </li>
              <li>
                <Link href="/tools/markdown-to-pdf" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "Markdown zu PDF Konverter" : "Markdown to PDF Converter"}
                </Link>
              </li>
              <li>
                <Link href="/tools/merge-pdf" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "PDF-Dateien zusammenführen" : "Merge PDF Documents"}
                </Link>
              </li>
              <li>
                <Link href="/tools/split-pdf" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {isGerman ? "PDF teilen & Seiten trennen" : "Split PDF & Extract Pages"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Platform & Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t("colPlatform")}
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/tools" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {t("allToolsDirectory")}
                </Link>
              </li>
              <li>
                <Link href="/productivity-suite" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {tNav("productivitySuite")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {tNav("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {t("contactUs")}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-sky-700 dark:hover:text-sky-300">
                  {t("termsOfService")}
                </Link>
              </li>
              {hasImpressum() && (
                <li>
                  <Link href="/impressum" className="hover:text-sky-700 dark:hover:text-sky-300">
                    {t("impressum")}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
