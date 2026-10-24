"use client";

import React, { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarHeart, Info } from "lucide-react";
import { TimePanel, formatLongDate, timeButtonClass, timeGhostButtonClass } from "./kit";
import { usFederalHolidays, ukBankHolidays, type HolidayEntry } from "./holidays";

/**
 * The holiday calendar of a year.
 *
 * The federal holidays of the United States and the bank holidays of the
 * United Kingdom are listed with the day they fall on and, when the day is a
 * weekend, with the day they are observed on.
 */
export function HolidayCalendar2027() {
  const t = useTranslations("ui.engines.time");
  const locale = useLocale();
  const [year, setYear] = useState(2027);
  const [region, setRegion] = useState<"us" | "uk">("us");

  const holidays = useMemo(
    () => (region === "us" ? usFederalHolidays(year) : ukBankHolidays(year)),
    [region, year],
  );

  return (
    <TimePanel
      title={t("holidays.title", { year })}
      subtitle={t("holidays.subtitle")}
      toolbar={
        <>
          <label className="sr-only" htmlFor="holiday-year">
            {t("holidays.year")}
          </label>
          <input
            id="holiday-year"
            type="number"
            min={1}
            max={9999}
            value={year}
            onChange={(event) => {
              const next = parseInt(event.target.value, 10);
              setYear(Number.isNaN(next) ? year : next);
            }}
            className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-bold tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setRegion("us")}
            className={region === "us" ? timeButtonClass : timeGhostButtonClass}
          >
            {t("holidays.unitedStates")}
          </button>
          <button
            type="button"
            onClick={() => setRegion("uk")}
            className={region === "uk" ? timeButtonClass : timeGhostButtonClass}
          >
            {t("holidays.unitedKingdom")}
          </button>
        </>
      }
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <CalendarHeart className="size-4 text-sky-700" />
        {t("holidays.count", { count: holidays.length })}
      </p>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        {holidays.map((holiday: HolidayEntry) => (
          <li
            key={`${holiday.region}-${holiday.id}`}
            className="flex flex-wrap items-baseline justify-between gap-2 bg-white px-4 py-3 text-sm dark:bg-slate-900"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {t(`holidays.${holiday.region}.${holiday.id}`)}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {formatLongDate(holiday.date, locale)}
            </span>
            {holiday.observed ? (
              <span className="w-full text-[11px] text-amber-700 dark:text-amber-300">
                {t("holidays.observedOn", { date: formatLongDate(holiday.observed, locale) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        {region === "us"
          ? t("holidays.unitedStatesNote")
          : t("holidays.unitedKingdomNote")}
      </p>
    </TimePanel>
  );
}
