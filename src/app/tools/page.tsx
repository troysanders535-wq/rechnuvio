"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, ArrowRight, ShieldCheck, Filter } from "lucide-react";
import { TOOLS_CATALOG, CATEGORIES_LIST } from "@/data/tools";
import { translateCategory, getLocalizedTool } from "@/utils/localizedTools";

function ToolsDirectoryContent() {
  const tTools = useTranslations("toolsPage");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("category") || "All";

  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [query, setQuery] = useState("");

  const isGerman = locale.startsWith("de");

  const filtered = TOOLS_CATALOG.filter((t) => {
    const matchesCat =
      selectedCat === "All" ||
      t.category.toLowerCase() === selectedCat.toLowerCase();
    const matchesQuery =
      !query.trim() ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      t.slug.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  });

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
              onChange={(e) => setQuery(e.target.value)}
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
                onClick={() => setSelectedCat(c)}
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
            ? `${filtered.length} von ${TOOLS_CATALOG.length} Browser-Tools werden angezeigt`
            : `Showing ${filtered.length} of ${TOOLS_CATALOG.length} browser utilities`}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700">
            {tTools("noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((tool) => {
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
      </div>
    </div>
  );
}

export default function ToolsDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading tools directory...</div>}>
      <ToolsDirectoryContent />
    </Suspense>
  );
}
