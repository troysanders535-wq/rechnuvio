"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Search,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  Wrench,
  FileCode,
  FileText,
  Image,
  Calculator,
  Terminal,
  Clock
} from "lucide-react";
import { SearchModal } from "./SearchModal";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const tCat = useTranslations("categories");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = [
    { name: tCat("jsonTools"), href: "/json-tools", icon: FileCode },
    { name: tCat("pdfTools"), href: "/pdf-tools", icon: FileText },
    { name: tCat("imageTools"), href: "/image-tools", icon: Image },
    { name: tCat("textTools"), href: "/text-tools", icon: FileText },
    { name: tCat("calculatorTools"), href: "/calculator-tools", icon: Calculator },
    { name: tCat("developerTools"), href: "/developer-tools", icon: Terminal },
    { name: tCat("productivityTools"), href: "/productivity-tools", icon: Clock },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center group transition-opacity hover:opacity-90"
              aria-label="Rechnuvio"
            >
              <NextImage
                src="/rechnuvio-logo.svg"
                alt="Rechnuvio"
                width={147}
                height={32}
                unoptimized
                priority
                className="h-8 w-auto object-contain dark:hidden"
              />
              <NextImage
                src="/rechnuvio-logo-dark.svg"
                alt="Rechnuvio"
                width={147}
                height={32}
                unoptimized
                priority
                className="hidden h-8 w-auto object-contain dark:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/tools"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {t("allTools")}
              </Link>

              {/* Categories Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsCategoryOpen(true)}
                onMouseLeave={() => setIsCategoryOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {t("categories")}
                  <ChevronDown className="size-4" />
                </button>

                {isCategoryOpen && (
                  <div className="absolute left-0 top-full w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setIsCategoryOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                        >
                          <Icon className="size-4 text-sky-700 dark:text-sky-400" />
                          <span>{cat.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link
                href="/productivity-suite"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {t("productivitySuite")}
              </Link>
              <Link
                href="/about"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {t("about")}
              </Link>
            </nav>
          </div>

          {/* Right: Search, Language Switcher, Theme Toggle, Mobile Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">{t("searchPlaceholder")}</span>
              <kbd className="inline-flex items-center gap-0.5 rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Language Switcher in Header */}
            <LanguageSwitcher compact className="hidden sm:inline-flex" />

            {/* Dark Mode Toggle */}
            {mounted && (
              <button
                type="button"
                aria-label={t("toggleTheme")}
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4 text-amber-400" />
                ) : (
                  <Moon className="size-4 text-slate-700" />
                )}
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label={t("toggleNav")}
            >
              {isMobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top-2 duration-150">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <LanguageSwitcher className="w-full justify-between" />
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                href="/tools"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {t("allTools")}
              </Link>
              <div className="py-2">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("popularCategories")}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {categories.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-900 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                href="/productivity-suite"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {t("productivitySuite")}
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {t("about")}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Instant Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
