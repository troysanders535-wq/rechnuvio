"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Search, X, ArrowRight } from "lucide-react";
import { searchTools, ToolItem } from "@/data/tools";
import { getLocalizedTool } from "@/utils/localizedTools";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const isGerman = locale.startsWith("de");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ToolItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setResults(searchTools(query).slice(0, 8));
    }
  }, [isOpen]);

  useEffect(() => {
    const res = searchTools(query).slice(0, 8);
    setResults(res);
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? results.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        window.location.href = `/tools/${results[selectedIndex].slug}`;
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <Search className="size-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchModalPlaceholder")}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("searchNoResults")}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((tool, idx) => {
                const isSelected = idx === selectedIndex;
                const locTool = getLocalizedTool(tool, locale);
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    onClick={onClose}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors ${
                      isSelected
                        ? "bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                        : "hover:bg-slate-50 text-slate-700 dark:hover:bg-slate-900/50 dark:text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{locTool.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {locTool.category}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {locTool.description}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                ↑
              </kbd>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                ↓
              </kbd>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                ↵
              </kbd>
            </span>
          </div>
          <span>{isGerman ? "492 Tools im Browser" : "492 Tools"}</span>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
