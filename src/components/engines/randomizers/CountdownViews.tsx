"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Gift, PartyPopper, RefreshCw } from "lucide-react";
import { RandPanel, randGhostButtonClass } from "./shared";

/**
 * The countdowns of the family.
 *
 * A countdown states the number of whole days that are left until the next
 * holiday. The day is taken from the clock of the browser, so the number is
 * the same for everybody who opens the tool on the same day.
 */

/** The whole days that are left until the given month and day. */
function daysUntil(now: Date, month: number, day: number): number {
  const target = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setFullYear(now.getFullYear() + 1);
  }
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export interface CountdownConfig {
  titleKey: string;
  subtitleKey: string;
  month: number;
  day: number;
  icon: "gift" | "party";
}

/** The countdown to a holiday. */
export function CountdownView({ config }: { config: CountdownConfig }) {
  const t = useTranslations("ui.engines.randomizers");
  const locale = useLocale();

  // The clock of the browser is only read after the page has mounted: the
  // server and the browser would count different days.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);

  const days = now ? daysUntil(now, config.month, config.day) : null;
  const target = now
    ? (() => {
        const date = new Date(now.getFullYear(), config.month, config.day, 0, 0, 0, 0);
        if (date.getTime() <= now.getTime()) date.setFullYear(now.getFullYear() + 1);
        return date;
      })()
    : null;
  const hours = target && now ? Math.floor((target.getTime() - now.getTime()) / 3600000) % 24 : null;
  const minutes =
    target && now ? Math.floor((target.getTime() - now.getTime()) / 60000) % 60 : null;

  const Icon = config.icon === "gift" ? Gift : PartyPopper;

  return (
    <RandPanel
      title={t(config.titleKey)}
      subtitle={t(config.subtitleKey)}
      toolbar={
        <button type="button" onClick={() => setNow(new Date())} className={randGhostButtonClass}>
          <RefreshCw className="size-3.5" />
          <span>{t("countdown.countAgain")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
          <Icon className="size-7 text-rose-500" />
          <p
            data-testid="countdown-days"
            data-value={days === null ? "" : String(days)}
            className="mt-3 font-mono text-6xl font-extrabold text-slate-900 dark:text-white"
          >
            {days === null ? "--" : ` ${days} `}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("countdown.daysLeft")}
          </p>
        </div>

        <div className="space-y-3">
          <p
            data-testid="countdown-date"
            data-year={target ? String(target.getFullYear()) : ""}
            data-month={target ? String(target.getMonth() + 1) : ""}
            data-day={target ? String(target.getDate()) : ""}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <CalendarDays className="size-4 text-sky-700 dark:text-sky-400" />
            {target
              ? target.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : t("countdown.loading")}
          </p>
          {hours !== null && minutes !== null ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("countdown.untilMidnight", { hours: `${hours} `, minutes: `${minutes} ` })}
            </p>
          ) : null}
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("countdown.hint")}</p>
        </div>
      </div>
    </RandPanel>
  );
}
