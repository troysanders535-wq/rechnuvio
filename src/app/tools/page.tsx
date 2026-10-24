"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, ArrowRight, ShieldCheck, Filter } from "lucide-react";
import { TOOLS_CATALOG, CATEGORIES_LIST } from "@/data/tools";
import { translateCategory, getLocalizedTool } from "@/utils/localizedTools";

const PAGE_SIZE = 60;

function ToolsDirectoryContent() {
  const tTools = useTranslations("toolsPage");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("category") || "All";

  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [query, setQuery] = useState("");
  // Rendering all ~490 cards makes this page ~875 KB of HTML; show a page of
  // them and let the visitor expand the rest (every tool stays in the sitemap).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isGerman = locale.startsWith("de");

  const needle = query.trim().toLowerCase();
  const filtered = TOOLS_CATALOG.filter((t) => {
    const matchesCat =
      selectedCat === "All" ||
      t.category.toLowerCase() === selectedCat.toLowerCase();
    if (!matchesCat) return false;
    if (!needle) return true;
    // Search the text the visitor sees (the localized name and description),
    // not only the English catalog entry.
    const loc = getLocalizedTool(t, locale);
    return (
      loc.name.toLowerCase().includes(needle) ||
      loc.description.toLowerCase().includes(needle) ||
      loc.category.toLowerCase().includes(needle) ||
      t.name.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle) ||
      t.slug.toLowerCase().includes(needle)
    );
  });
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {tTools("title", { count: TOOLS_CATALOG.length })}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {tTools("subtitle")}
        </p>

        {/* Search bar & Category filter */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={tTools("searchPlaceholder")}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORIES_LIST.map((c) => {
            const isSelected = selectedCat.toLowerCase() === c.toLowerCase();
            const label = translateCategory(c, locale);
            return (
              <button
                key={c}
                onClick={() => {
                  setSelectedCat(c);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-sky-800 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Tools */}
      <div className="mt-8">
        <div className="mb-4 text-xs font-medium text-slate-500">
          {isGerman
            ? `${visible.length} von ${filtered.length} Browser-Tools werden angezeigt`
            : `Showing ${visible.length} of ${filtered.length} browser utilities`}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700">
            {tTools("noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((tool) => {
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
                        {tHome("badgeBrowser")}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                      {locTool.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {locTool.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700 dark:border-slate-800/80 dark:text-sky-400">
                    <span>{tHome("launchTool")}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {filtered.length > visible.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isGerman
                ? `Weitere Tools anzeigen (${filtered.length - visible.length} übrig)`
                : `Show more tools (${filtered.length - visible.length} left)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolsDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Werkzeuge werden geladen …</div>}>
      <ToolsDirectoryContent />
    </Suspense>
  );
}
