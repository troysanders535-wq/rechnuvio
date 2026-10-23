"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { TOOLS_CATALOG, CATEGORIES_LIST } from "@/data/tools";
import { SearchModal } from "@/components/layout/SearchModal";
import { translateCategory, getLocalizedTool } from "@/utils/localizedTools";

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();
  const isGerman = locale.startsWith("de");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Filter tools
  const filteredTools = TOOLS_CATALOG.filter((tool) => {
    const matchesCat =
      selectedCategory === "All" ||
      tool.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery =
      !searchQuery.trim() ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const featuredPills = [
    { name: isGerman ? "JSON-Formatierer" : "JSON Formatter", slug: "json-formatter" },
    { name: isGerman ? "QR-Code-Generator" : "QR Code Generator", slug: "qr-code-generator" },
    { name: isGerman ? "Bilder skalieren" : "Image Resizer", slug: "image-resizer" },
    { name: isGerman ? "Wortzähler" : "Word Counter", slug: "word-counter" },
    { name: isGerman ? "Diff Checker" : "Diff Checker", slug: "diff-checker" },
    { name: isGerman ? "UUID-Generator" : "UUID Generator", slug: "uuid-generator" },
    { name: isGerman ? "Markdown zu PDF" : "Markdown to PDF", slug: "markdown-to-pdf" },
    { name: isGerman ? "Kalender 2026" : "2026 Calendar", slug: "2026-calendar" },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-sky-50/50 via-white to-white py-16 sm:py-24 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/60 dark:text-sky-300">
            <ShieldCheck className="size-4 text-sky-600 dark:text-sky-400" />
            <span>{t("trustBadge")}</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
            {t("heroTitleLine1")} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-sky-700 to-indigo-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-300">
              {t("heroTitleLine2")}
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
            {t("heroSubtitle")}
          </p>

          {/* Search Trigger Input */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-3.5 shadow-lg shadow-sky-950/5 transition hover:border-sky-500 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            >
              <Search className="size-5 text-slate-400 shrink-0 ml-1" />
              <span className="flex-1 text-left text-sm text-slate-400">
                {t("searchTriggerPlaceholder")}
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                ⌘K
              </kbd>
            </div>

            {/* Quick Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold text-slate-400">{t("popular")}</span>
              {featuredPills.map((pill) => (
                <Link
                  key={pill.slug}
                  href={`/tools/${pill.slug}`}
                  className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {pill.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Explorer Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("catalogTitle")} ({filteredTools.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("catalogSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filterPlaceholder")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Pills Horizontal Scroll */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES_LIST.map((cat) => {
            const isSelected = selectedCategory === cat;
            const label = translateCategory(cat, locale);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-sky-800 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tools Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.slice(0, 60).map((tool) => {
            const locTool = getLocalizedTool(tool, locale);
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {locTool.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {t("badgeBrowser")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                    {locTool.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {locTool.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700 dark:border-slate-800/80 dark:text-sky-400">
                  <span>{t("launchTool")}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Button */}
        {filteredTools.length > 60 && (
          <div className="mt-12 text-center">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-800 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-700"
            >
              <span>{t("viewAllTools")}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
