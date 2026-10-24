"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import {
  TimePanel,
  timeButtonClass,
  timeGhostButtonClass,
  timeInputClass,
} from "./kit";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const WEEKDAY_KEYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;

/**
 * The printable year calendar.
 *
 * The year is a control of the panel, so the calendar of 2027 shows 2027 and
 * every month is a table of cells that a screen reader can read.
 */
export function YearCalendar2027() {
  const t = useTranslations("ui.engines.time");
  const [year, setYear] = useState(2027);

  const months = useMemo(
    () =>
      MONTH_KEYS.map((key, index) => {
        const firstDay = new Date(year, index, 1).getDay();
        const daysInMonth = new Date(year, index + 1, 0).getDate();
        // the calendar starts on Monday
        const offset = (firstDay + 6) % 7;
        const rows = Math.ceil((offset + daysInMonth) / 7);
        return { key, index, daysInMonth, offset, rows };
      }),
    [year],
  );

  const handleDownloadPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(`${year} Calendar`, 14, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Rechnuvio", 14, 21);

      const startX = 12;
      const startY = 28;
      const colWidth = 62;
      const rowHeight = 54;

      months.forEach((month) => {
        const colIdx = month.index % 3;
        const rowIdx = Math.floor(month.index / 3);
        const x = startX + colIdx * colWidth;
        const y = startY + rowIdx * rowHeight;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(t(`months.${month.key}`), x, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(120, 130, 145);
        WEEKDAY_KEYS.forEach((key, index) => {
          doc.text(t(`weekdays.${key}`), x + index * 7.4, y + 4);
        });
        doc.setTextColor(30, 41, 59);

        for (let row = 0; row < month.rows; row += 1) {
          for (let column = 0; column < 7; column += 1) {
            const day = row * 7 + column - month.offset + 1;
            if (day < 1 || day > month.daysInMonth) continue;
            doc.text(`${day}`, x + column * 7.4, y + 9 + row * 4.6);
          }
        }
      });

      doc.save(`calendar-${year}.pdf`);
    } catch {
      /* the download is optional, the panel still works without it */
    }
  };

  return (
    <TimePanel
      title={t("calendar2027.title", { year })}
      subtitle={t("calendar2027.subtitle")}
      toolbar={
        <>
          <button
            type="button"
            onClick={() => setYear((value) => value - 1)}
            className={timeGhostButtonClass}
            aria-label={t("calendar2027.previousYear")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <label className="sr-only" htmlFor="calendar-year">
            {t("calendar2027.year")}
          </label>
          <input
            id="calendar-year"
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
            onClick={() => setYear((value) => value + 1)}
            className={timeGhostButtonClass}
            aria-label={t("calendar2027.nextYear")}
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className={timeGhostButtonClass}
          >
            <Printer className="size-4" />
            {t("calendar2027.print")}
          </button>
          <button type="button" onClick={handleDownloadPdf} className={timeButtonClass}>
            <Download className="size-4" />
            {t("calendar2027.downloadPdf")}
          </button>
        </>
      }
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <CalendarDays className="size-4 text-sky-700" />
        {t("calendar2027.showingYear", { year })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {months.map((month) => (
          <section
            key={month.key}
            aria-label={`${t(`months.${month.key}`)} ${year}`}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
          >
            <h4 className="text-center text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              {t(`months.${month.key}`)}
            </h4>
            <div role="table" className="mt-2 text-center text-[11px]">
              <div className="grid grid-cols-7 gap-0.5 pb-1">
                {WEEKDAY_KEYS.map((key) => (
                  <span
                    key={key}
                    role="columnheader"
                    title={t(`weekdaysFull.${key}`)}
                    className="font-semibold text-slate-400"
                  >
                    {t(`weekdays.${key}`)}
                  </span>
                ))}
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: month.rows }).map((_, row) => (
                  <div key={`row-${row}`} className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 7 }).map((__, column) => {
                      const day = row * 7 + column - month.offset + 1;
                      if (day < 1 || day > month.daysInMonth) {
                        return <span key={`empty-${column}`} role="cell" className="py-0.5" />;
                      }
                      const weekday = new Date(year, month.index, day).getDay();
                      const weekend = weekday === 0 || weekday === 6;
                      return (
                        <span
                          key={`day-${day}`}
                          role="cell"
                          className={`rounded py-0.5 tabular-nums ${
                            weekend
                              ? "bg-slate-50 text-slate-500 dark:bg-slate-800/60"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </TimePanel>
  );
}
