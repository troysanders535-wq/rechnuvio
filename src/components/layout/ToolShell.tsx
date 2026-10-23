"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Breadcrumbs } from "./Breadcrumbs";
import { ToolItem, getToolsByCategory } from "@/data/tools";
import { getLocalizedTool, translateCategory } from "@/utils/localizedTools";
import {
  ShieldCheck,
  Share2,
  Check,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ArrowRight,
  AlertCircle
} from "lucide-react";

interface ToolShellProps {
  tool: ToolItem;
  children: React.ReactNode;
}

export function ToolShell({ tool, children }: ToolShellProps) {
  const tShell = useTranslations("toolShell");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const localizedTool = getLocalizedTool(tool, locale);

  const [copied, setCopied] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const isJurisdictionSensitive =
    tool.category.toLowerCase().includes("calc") ||
    tool.category.toLowerCase().includes("holiday") ||
    tool.slug.includes("tax") ||
    tool.slug.includes("salary") ||
    tool.slug.includes("paycheck") ||
    tool.slug.includes("wage") ||
    tool.slug.includes("calendar");

  /**
   * The number base and roman numeral converters read digits in another
   * notation, so the "decimal numbers are accepted" hint would be wrong.
   */
  const usesDecimalInput = ![
    "binary-calculator",
    "hex-calculator",
    "roman-numeral-converter",
    "roman-numeral-date-converter",
  ].includes(tool.slug);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const relatedTools = getToolsByCategory(tool.category)
    .filter((t) => t.slug !== tool.slug)
    .slice(0, 4);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: localizedTool.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: localizedTool.category, href: `/tools?category=${encodeURIComponent(tool.category)}` },
            { label: localizedTool.name },
          ]}
        />

        {/* Tool Header Section */}
        {tool.slug !== "2026-calendar" && (
          <div className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {localizedTool.category}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {tShell("runsInBrowser")}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {localizedTool.name}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {localizedTool.description}
              </p>
            </div>

            {/* Share Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span>{tShell("linkCopied")}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5 text-slate-500" />
                    <span>{tShell("shareTool")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Regional Jurisdiction & Decimal Comma Notice */}
        {isJurisdictionSensitive && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold leading-relaxed">{tCommon("jurisdictionNotice")}</p>
                {usesDecimalInput ? (
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    {tCommon("decimalNotice")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Primary Interactive Workspace */}
        <div className="mt-6">{children}</div>

        {/* SEO, Features, FAQ, and Related Tools */}
        {tool.slug !== "2026-calendar" && (
          <div className="mt-16 space-y-12 border-t border-slate-200 pt-12 dark:border-slate-800">
            {/* Key Features Section */}
            <section>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-sky-700 dark:text-sky-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {tShell("keyFeatures", { name: localizedTool.name })}
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {localizedTool.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {feature}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive FAQ Section */}
            <section>
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5 text-sky-700 dark:text-sky-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {tShell("faqHeading")}
                </h2>
              </div>
              <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {localizedTool.faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="p-4 sm:p-5">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between gap-4 text-left font-semibold text-sm text-slate-900 dark:text-white"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-slate-400 transition-transform ${
                            isOpen ? "rotate-180 text-sky-700 dark:text-sky-400" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Related Tools Grid */}
            {relatedTools.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {tShell("relatedTools", { category: localizedTool.category })}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedTools.map((rel) => {
                    const locRel = getLocalizedTool(rel, locale);
                    return (
                      <Link
                        key={rel.slug}
                        href={`/tools/${rel.slug}`}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500"
                      >
                        <div>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {locRel.category}
                          </span>
                          <h3 className="mt-2 font-bold text-sm text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                            {locRel.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {locRel.description}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                          <span>{tShell("openTool")}</span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
