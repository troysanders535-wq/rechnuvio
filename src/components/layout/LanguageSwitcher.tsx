"use client";

import React, { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLocale } from "next-intl";
import { getTargetUrlForLocale, AppLocale } from "@/i18n/domains";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const currentLocale = useLocale() as AppLocale;
  const [mounted, setMounted] = useState(false);
  const [currentHost, setCurrentHost] = useState("");
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCurrentHost(window.location.host);
      setCurrentPath(window.location.pathname + window.location.search);
    }
  }, []);

  const handleSwitch = (targetLocale: AppLocale) => {
    if (targetLocale === currentLocale) return;

    if (typeof window !== "undefined") {
      // Set cookie for seamless fallback on localhost
      document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;

      const targetUrl = getTargetUrlForLocale(
        targetLocale,
        window.location.host,
        window.location.pathname + window.location.search
      );

      // If on standard localhost without subdomains, append ?locale= if host cannot be resolved
      if (
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
        !window.location.hostname.includes("de.") &&
        !window.location.hostname.includes("en.")
      ) {
        // Toggle query param
        const url = new URL(window.location.href);
        url.searchParams.set("locale", targetLocale === "de-DE" ? "de" : "en");
        window.location.href = url.toString();
        return;
      }

      window.location.href = targetUrl;
    }
  };

  const isGerman = currentLocale === "de-DE";

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <Globe className="size-3.5 text-slate-400" />
        <span>{isGerman ? "Deutsch" : "English"}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 ${className}`}>
        <button
          type="button"
          onClick={() => handleSwitch("en")}
          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
            !isGerman
              ? "bg-white text-sky-800 shadow-xs dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Switch to English website (www.digitaltoolpad.com / en.localhost)"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleSwitch("de-DE")}
          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
            isGerman
              ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Zur deutschen Webseite wechseln (de.digitaltoolpad.com / de.localhost)"
        >
          DE
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex items-center gap-1.5 px-2 text-slate-500 dark:text-slate-400">
        <Globe className="size-3.5" />
        <span className="font-semibold">{isGerman ? "Sprache" : "Language"}:</span>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => handleSwitch("en")}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
            !isGerman
              ? "bg-white text-sky-800 shadow-xs dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <span>🇺🇸 English</span>
          {!isGerman && <Check className="size-3 text-sky-600 dark:text-sky-400" />}
        </button>
        <button
          type="button"
          onClick={() => handleSwitch("de-DE")}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
            isGerman
              ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <span>🇩🇪 Deutsch</span>
          {isGerman && <Check className="size-3 text-indigo-600 dark:text-indigo-400" />}
        </button>
      </div>
    </div>
  );
}
