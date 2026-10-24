"use client";

import React, { useState, useMemo } from "react";
import { NextIntlClientProvider, createTranslator, useLocale, useTranslations } from "next-intl";
import enMessages from "@/messages/en.json";
import deMessages from "@/messages/de.json";
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  HelpCircle,
  Globe,
  Sparkles,
  MapPin,
  CalendarCheck,
  Sun,
  Flame,
  CheckCircle2,
  ListOrdered
} from "lucide-react";
import {
  GERMAN_STATES,
  GERMAN_HOLIDAYS_2026,
  GERMAN_BRIDGING_DAYS_2026,
  getIsoWeek,
  GermanHolidayItem,
} from "@/utils/germanCalendar";
import { getHowToSteps } from "@/data/howTo";

interface Calendar2026EngineProps {
  slug?: string;
}

export function Calendar2026Engine({ slug = "2026-calendar" }: Calendar2026EngineProps) {
  const currentLocale = useLocale();
  const defaultLocale: "de" | "en" = currentLocale.startsWith("de") ? "de" : "en";
  const [locale, setLocale] = useState<"de" | "en">(defaultLocale);

  const messages = locale === "de" ? deMessages : enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CalendarWorkspaceContent
        slug={slug}
        locale={locale}
        setLocale={setLocale}
      />
    </NextIntlClientProvider>
  );
}

function CalendarWorkspaceContent({
  slug,
  locale,
  setLocale,
}: {
  slug: string;
  locale: "de" | "en";
  setLocale: (loc: "de" | "en") => void;
}) {
  const tUi = useTranslations("ui.engines.Calendar2026Engine");
  const messages = locale === "de" ? deMessages : enMessages;
  const t = useMemo(() => createTranslator({ locale, messages }), [locale, messages]);
  const howToSteps = useMemo(
    () => getHowToSteps(slug, locale),
    [slug, locale],
  );

  // Calendar configuration state - defaults optimized for German calendar
  const [year, setYear] = useState<number>(2026);
  const [layout, setLayout] = useState<"wholeYear" | "twelveMonths">("wholeYear");
  const [weekStartsOn, setWeekStartsOn] = useState<"sunday" | "monday">("monday");
  const [holidayRegion, setHolidayRegion] = useState<"de" | "us" | "uk" | "none">(
    locale === "de" ? "de" : "de"
  );
  const [germanState, setGermanState] = useState<string>("all");
  const [includeObservances, setIncludeObservances] = useState<boolean>(true);
  const [showIsoWeeks, setShowIsoWeeks] = useState<boolean>(true);
  const [paper, setPaper] = useState<"usLetter" | "a4">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [selectedColor, setSelectedColor] = useState<string>("#4338ca"); // Indigo default
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [bottomTab, setBottomTab] = useState<"all" | "statutory" | "bridges" | "events">("all");

  const colors = [
    { id: "indigo", hex: "#4338ca", label: t("settings.colors.indigo") },
    { id: "slate", hex: "#1e293b", label: t("settings.colors.slate") },
    { id: "rose", hex: "#be123c", label: t("settings.colors.rose") },
    { id: "emerald", hex: "#047857", label: t("settings.colors.emerald") },
    { id: "amber", hex: "#b45309", label: t("settings.colors.amber") },
  ];

  // Month names list
  const monthNames = useMemo(
    () => [
      t("months.january"),
      t("months.february"),
      t("months.march"),
      t("months.april"),
      t("months.may"),
      t("months.june"),
      t("months.july"),
      t("months.august"),
      t("months.september"),
      t("months.october"),
      t("months.november"),
      t("months.december"),
    ],
    [t]
  );

  // Weekday column definitions
  const weekdayCols = useMemo(() => {
    if (weekStartsOn === "sunday") {
      return [
        { key: "su", label: t("weekdays.su"), full: t("weekdays.full.sunday") },
        { key: "mo", label: t("weekdays.mo"), full: t("weekdays.full.monday") },
        { key: "tu", label: t("weekdays.tu"), full: t("weekdays.full.tuesday") },
        { key: "we", label: t("weekdays.we"), full: t("weekdays.full.wednesday") },
        { key: "th", label: t("weekdays.th"), full: t("weekdays.full.thursday") },
        { key: "fr", label: t("weekdays.fr"), full: t("weekdays.full.friday") },
        { key: "sa", label: t("weekdays.sa"), full: t("weekdays.full.saturday") },
      ];
    }
    return [
      { key: "mo", label: t("weekdays.mo"), full: t("weekdays.full.monday") },
      { key: "tu", label: t("weekdays.tu"), full: t("weekdays.full.tuesday") },
      { key: "we", label: t("weekdays.we"), full: t("weekdays.full.wednesday") },
      { key: "th", label: t("weekdays.th"), full: t("weekdays.full.thursday") },
      { key: "fr", label: t("weekdays.fr"), full: t("weekdays.full.friday") },
      { key: "sa", label: t("weekdays.sa"), full: t("weekdays.full.saturday") },
      { key: "su", label: t("weekdays.su"), full: t("weekdays.full.sunday") },
    ];
  }, [weekStartsOn, t]);

  // Holiday calculation logic
  const holidaysMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; isFederal: boolean; isObservance: boolean; tip?: string; scope?: string }
    >();
    if (holidayRegion === "none") return map;

    const add = (
      m: number,
      d: number,
      name: string,
      isFederal: boolean,
      isObservance: boolean,
      tip?: string,
      scope?: string
    ) => {
      const key = `${m}-${d}`;
      map.set(key, { name, isFederal, isObservance, tip, scope });
    };

    if (holidayRegion === "de") {
      GERMAN_HOLIDAYS_2026.forEach((item) => {
        const name = locale === "de" ? item.nameDe : item.nameEn;
        const tip = locale === "de" ? item.tipDe : item.tipEn;
        const isNationwide = item.states.includes("all");
        const appliesToState = isNationwide || (germanState !== "all" && item.states.includes(germanState));

        if (item.isStatutory) {
          if (germanState === "all") {
            const scopeNote = isNationwide
              ? (locale === "de" ? "Bundesweit" : "Nationwide")
              : item.states.join(", ");
            add(item.month, item.day, isNationwide ? name : `${name} (${scopeNote})`, true, false, tip, scopeNote);
          } else {
            if (appliesToState) {
              add(item.month, item.day, name, true, false, tip, germanState);
            } else if (includeObservances) {
              const scopeNote = item.states.join(", ");
              add(item.month, item.day, `${name} (${scopeNote})`, false, true, tip, scopeNote);
            }
          }
        } else if (includeObservances) {
          add(item.month, item.day, name, false, true, tip);
        }
      });
    } else if (holidayRegion === "us") {
      add(0, 1, t("holidaysList.newYearsDay"), true, false);
      add(0, 19, t("holidaysList.mlkDay"), true, false);
      if (includeObservances) add(1, 14, t("holidaysList.valentinesDay"), false, true);
      add(1, 16, t("holidaysList.presidentsDay"), true, false);
      if (includeObservances) {
        add(2, 8, t("holidaysList.dstStarts"), false, true);
        add(2, 17, t("holidaysList.stPatricksDay"), false, true);
        add(3, 3, t("holidaysList.goodFriday"), false, true);
        add(3, 5, t("holidaysList.easterSunday"), false, true);
        add(4, 10, t("holidaysList.mothersDay"), false, true);
      }
      add(4, 25, t("holidaysList.memorialDay"), true, false);
      add(5, 19, t("holidaysList.juneteenth"), true, false);
      if (includeObservances) add(5, 21, t("holidaysList.fathersDay"), false, true);
      add(6, 3, t("holidaysList.independenceDay"), true, false);
      add(8, 7, t("holidaysList.laborDay"), true, false);
      add(9, 12, t("holidaysList.columbusDay"), true, false);
      if (includeObservances) {
        add(9, 31, t("holidaysList.halloween"), false, true);
        add(10, 1, t("holidaysList.dstEnds"), false, true);
      }
      add(10, 11, t("holidaysList.veteransDay"), true, false);
      add(10, 26, t("holidaysList.thanksgivingDay"), true, false);
      if (includeObservances) {
        add(10, 27, t("holidaysList.blackFriday"), false, true);
        add(11, 24, t("holidaysList.christmasEve"), false, true);
      }
      add(11, 25, t("holidaysList.christmasDay"), true, false);
      if (includeObservances) add(11, 31, t("holidaysList.newYearsEve"), false, true);
    } else if (holidayRegion === "uk") {
      add(0, 1, t("holidaysList.newYearsDay"), true, false);
      if (includeObservances) add(1, 14, t("holidaysList.valentinesDay"), false, true);
      add(3, 3, t("holidaysList.goodFriday"), true, false);
      add(3, 6, t("holidaysList.easterMonday"), true, false);
      add(4, 4, tUi("earlyMayBankHoliday"), true, false);
      add(4, 25, tUi("springBankHoliday"), true, false);
      add(7, 31, tUi("summerBankHoliday"), true, false);
      if (includeObservances) add(9, 31, t("holidaysList.halloween"), false, true);
      add(11, 25, t("holidaysList.christmasDay"), true, false);
      add(11, 26, t("holidaysList.boxingDay"), true, false);
      add(11, 28, tUi("boxingDaySubstituteDay"), true, false);
    }

    return map;
  }, [holidayRegion, germanState, includeObservances, locale, t]);

  // PDF Export using jsPDF
  const handleDownloadPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: orientation === "portrait" ? "p" : "l",
        unit: "mm",
        format: paper === "a4" ? "a4" : "letter",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(locale === "de" ? `Kalender ${year}` : `${year} Calendar`, 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const subInfo =
        holidayRegion === "de"
          ? locale === "de"
            ? `Gesetzliche Feiertage Deutschland (${germanState === "all" ? tUi("allGermanStates") : germanState}) · ISO-Wochen · DIN ${paper.toUpperCase()}`
            : `Public holidays Germany (${germanState}) · ISO weeks · Vector PDF`
          : `Vector Quality Calendar (${paper.toUpperCase()}, ${orientation})`;
      doc.text(subInfo, 14, 26);

      // Render 12 months in a 3x4 grid
      const startX = 14;
      const startY = 32;
      const colWidth = 58;
      const rowHeight = 50;

      for (let m = 0; m < 12; m++) {
        const colIdx = m % 3;
        const rowIdx = Math.floor(m / 3);
        const x = startX + colIdx * colWidth;
        const y = startY + rowIdx * rowHeight;

        // Month title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(67, 56, 202);
        doc.text(monthNames[m], x, y);

        // Days header
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        weekdayCols.forEach((d, idx) => {
          doc.text(d.label, x + idx * 7.5, y + 4.5);
        });

        // Days
        const firstDay = new Date(year, m, 1).getDay();
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const offset = weekStartsOn === "sunday" ? firstDay : (firstDay + 6) % 7;

        let cellX = offset;
        let cellY = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const px = x + cellX * 7.5;
          const py = y + 9.5 + cellY * 5.2;

          const h = holidaysMap.get(`${m}-${day}`);
          if (h && h.isFederal) {
            doc.setTextColor(220, 38, 38);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(30, 41, 59);
            doc.setFont("helvetica", "normal");
          }

          doc.text(day.toString(), px, py);

          cellX++;
          if (cellX > 6) {
            cellX = 0;
            cellY++;
          }
        }
      }

      // Legend in PDF footer
      if (holidayRegion === "de") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const legendText =
          locale === "de"
            ? "Gesetzliche Feiertage bundesweit: 01.01. Neujahr | 03.04. Karfreitag | 06.04. Ostermontag | 01.05. Tag der Arbeit | 14.05. Christi Himmelfahrt | 25.05. Pfingstmontag | 03.10. Tag der Dt. Einheit | 25./26.12. Weihnachten"
            : tUi("nationwidePublicHolidaysDEJan1Apr3Apr6May1May14May25Oct3Dec25Dec26");
        doc.text(legendText, 14, 246, { maxWidth: orientation === "portrait" ? 180 : 260 });
      }

      doc.save(`kalender-${year}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Helper date formatter for German calendar list
  const formatGermanDisplayDate = (m: number, d: number) => {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const monthStr = m + 1 < 10 ? `0${m + 1}` : `${m + 1}`;
    const dateObj = new Date(year, m, d);
    const weekdaysDe = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const weekdaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = locale === "de" ? weekdaysDe[dateObj.getDay()] : weekdaysEn[dateObj.getDay()];
    return `${dayName}, ${dayStr}.${monthStr}.${year}`;
  };

  // Filtered German holidays list for bottom section
  const filteredGermanHolidays = useMemo(() => {
    return GERMAN_HOLIDAYS_2026.filter((item) => {
      const isNationwide = item.states.includes("all");
      const appliesToState = isNationwide || (germanState !== "all" && item.states.includes(germanState));

      if (bottomTab === "statutory") {
        if (!item.isStatutory) return false;
        if (germanState !== "all" && !appliesToState) return false;
        return true;
      }
      if (bottomTab === "events") {
        return !item.isStatutory;
      }
      if (bottomTab === "all") {
        if (item.isStatutory && germanState !== "all" && !appliesToState) return false;
        return true;
      }
      return true;
    });
  }, [bottomTab, germanState]);

  return (
    <div className="w-full text-slate-800 dark:text-slate-200">
      {/* Top Banner with Language Switcher */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {t("header.title")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            🇩🇪 {tUi("germany2026")}
          </span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t("common.languageSwitcher")}:
          </span>
          <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setLocale("de")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                locale === "de"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              🇩🇪 {t("common.german")}
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                locale === "en"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              🇺🇸 {t("common.english")}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header Section */}
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100/90 to-slate-50/50 p-6 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:from-slate-800/80 dark:to-slate-900/60">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          {locale === "de" ? `Kalender ${year} mit Feiertagen & Brückentagen` : `${year} Calendar with Holidays & Bridge Days`}
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed font-medium text-slate-600 sm:text-lg dark:text-slate-300">
          {locale === "de"
            ? `Kostenlose druckbare PDF-Vorlage für das Jahr ${year} mit allen gesetzlichen Feiertagen in Deutschland, Brückentagen zur Urlaubsoptimierung, ISO-Kalenderwochen und Brauchtumstagen.`
            : `Free printable PDF template for ${year} featuring German statutory public holidays across all 16 federal states, bridging days, and ISO week numbers.`}
        </p>

        {/* Badges */}
        <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <li className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            🇩🇪 {tUi("16GermanStates")}
          </li>
          <li className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            🏖️ {tUi("bridgingDaysPlanner")}
          </li>
          <li className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            📅 {tUi("iSOWeekNumbers")}
          </li>
          <li className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            📄 {t("settings.a4")} &amp; {tUi("vectorPdf")}
          </li>
        </ul>
      </header>

      {/* Main Grid: Left Calendar / Right Sidebar */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: 12-Month Interactive Calendar Display */}
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {year} {tUi("calendar")}
              </h2>
              {holidayRegion === "de" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <MapPin className="size-3.5" />
                  {germanState === "all"
                    ? (locale === "de" ? "Bundesweit" : "Nationwide")
                    : (locale === "de"
                        ? GERMAN_STATES.find((s) => s.code === germanState)?.nameDe || germanState
                        : GERMAN_STATES.find((s) => s.code === germanState)?.nameEn || germanState)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {holidayRegion === "de"
                ? tUi("statutoryPublicHolidaysHighlightedInRed")
                : holidayRegion === "us"
                ? t("settings.usHolidays")
                : holidayRegion === "uk"
                ? t("settings.ukHolidays")
                : t("settings.noHolidays")}
            </span>
          </div>

          {/* Months Container */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, mIdx) => {
              const firstDay = new Date(year, mIdx, 1).getDay();
              const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
              const offset = weekStartsOn === "sunday" ? firstDay : (firstDay + 6) % 7;
              const numRows = Math.ceil((offset + daysInMonth) / 7);

              return (
                <section
                  key={mIdx}
                  aria-label={`${monthNames[mIdx]} ${year}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <h3
                    className="text-center text-sm font-bold uppercase tracking-wide"
                    style={{ color: selectedColor }}
                  >
                    {monthNames[mIdx]}
                  </h3>

                  <div role="table" className="mt-2 text-center text-xs">
                    {/* Weekday headers */}
                    <div
                      className={`grid gap-0.5 pb-1 ${
                        showIsoWeeks
                          ? "grid-cols-[22px_repeat(7,1fr)]"
                          : "grid-cols-7"
                      }`}
                    >
                      {showIsoWeeks && (
                        <span
                          className="py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500"
                          title={locale === "de" ? "Kalenderwoche" : "ISO Week"}
                        >
                          KW
                        </span>
                      )}
                      {weekdayCols.map((col) => (
                        <span
                          key={col.key}
                          role="columnheader"
                          className="py-1 font-semibold text-slate-400 dark:text-slate-500 text-[11px]"
                          title={col.full}
                        >
                          {col.label}
                        </span>
                      ))}
                    </div>

                    {/* Month Days arranged by Week Rows */}
                    <div className="space-y-0.5">
                      {Array.from({ length: numRows }).map((_, r) => {
                        // Compute representative Thursday of the row for ISO 8601 week number
                        const rowStartDay = r * 7 - offset + 1;
                        const thursdayDate = new Date(
                          year,
                          mIdx,
                          rowStartDay + (weekStartsOn === "monday" ? 3 : 4)
                        );
                        const kwNumber = getIsoWeek(thursdayDate);

                        return (
                          <div
                            key={`row-${r}`}
                            className={`grid gap-0.5 ${
                              showIsoWeeks
                                ? "grid-cols-[22px_repeat(7,1fr)]"
                                : "grid-cols-7"
                            }`}
                          >
                            {/* ISO Week Number Cell */}
                            {showIsoWeeks && (
                              <span
                                className="flex items-center justify-center py-1 text-[9.5px] font-mono font-medium text-slate-400 dark:text-slate-500"
                                title={`${locale === "de" ? "Kalenderwoche" : "Week"} ${kwNumber}`}
                              >
                                {kwNumber}
                              </span>
                            )}

                            {/* 7 Days in Week Row */}
                            {Array.from({ length: 7 }).map((_, c) => {
                              const cellIndex = r * 7 + c;
                              const day = cellIndex - offset + 1;

                              if (day < 1 || day > daysInMonth) {
                                return <span key={`empty-${c}`} role="cell" />;
                              }

                              const holiday = holidaysMap.get(`${mIdx}-${day}`);
                              const isFederal = holiday?.isFederal;
                              const isObservance = holiday && !holiday.isFederal;

                              // Weekend check
                              const dayOfWeek = new Date(year, mIdx, day).getDay();
                              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                              const hoverTitle = holiday
                                ? `${holiday.name}${holiday.tip ? ` (${holiday.tip})` : ""}`
                                : undefined;

                              return (
                                <span
                                  key={`day-${day}`}
                                  role="cell"
                                  title={hoverTitle}
                                  className={`relative rounded-md py-1 tabular-nums transition-colors cursor-default ${
                                    isFederal
                                      ? "bg-red-50 font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/50"
                                      : isWeekend
                                      ? "bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                                      : "text-slate-800 dark:text-slate-200 hover:bg-indigo-50/50"
                                  }`}
                                >
                                  {day}
                                  {isObservance && (
                                    <span
                                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                                      style={{ backgroundColor: selectedColor }}
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Right: Settings Sidebar */}
        <aside
          className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start"
          aria-label={t("settings.title")}
        >
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Year Selector */}
            <div>
              <label
                htmlFor="calendar-year"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                {t("settings.year")}
              </label>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label={t("settings.prevYear")}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <input
                  id="calendar-year"
                  type="number"
                  min="1"
                  max="9999"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-lg font-bold tabular-nums dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label={t("settings.nextYear")}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Holidays Region Select */}
            <div>
              <label
                htmlFor="calendar-region"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                {t("settings.holidays")}
              </label>
              <select
                id="calendar-region"
                value={holidayRegion}
                onChange={(e) => setHolidayRegion(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              >
                <option value="de">🇩🇪 {t("settings.deHolidays")}</option>
                <option value="us">🇺🇸 {t("settings.usHolidays")}</option>
                <option value="uk">🇬🇧 {t("settings.ukHolidays")}</option>
                <option value="none">{t("settings.noHolidays")}</option>
              </select>
            </div>

            {/* Germany Federal State Selector */}
            {holidayRegion === "de" && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <label
                  htmlFor="calendar-state"
                  className="block text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-300"
                >
                  {t("settings.federalState")}
                </label>
                <select
                  id="calendar-state"
                  value={germanState}
                  onChange={(e) => setGermanState(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-indigo-800 dark:bg-slate-950 dark:text-white"
                >
                  {GERMAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {locale === "de" ? s.nameDe : s.nameEn}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-indigo-700/80 dark:text-indigo-400">
                  {germanState === "all"
                    ? tUi("showsAllNationwideHolidaysAndRegionalDates")
                    : (locale === "de"
                        ? `Feiertage speziell angepasst für ${GERMAN_STATES.find((s) => s.code === germanState)?.nameDe}.`
                        : `Holidays tailored for ${GERMAN_STATES.find((s) => s.code === germanState)?.nameEn || germanState}.`)}
                </p>
              </div>
            )}

            {/* Week Starts On */}
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("settings.weekStartsOn")}
              </p>
              <div className="mt-1.5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setWeekStartsOn("monday")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    weekStartsOn === "monday"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {t("settings.monday")} (ISO)
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStartsOn("sunday")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    weekStartsOn === "sunday"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {t("settings.sunday")}
                </button>
              </div>
            </div>

            {/* Checkboxes: ISO Weeks & Observances */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showIsoWeeks}
                  onChange={(e) => setShowIsoWeeks(e.target.checked)}
                  className="size-4 rounded accent-indigo-600"
                />
                <span className="font-medium">{t("settings.isoWeekNumbers")} (KW)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeObservances}
                  onChange={(e) => setIncludeObservances(e.target.checked)}
                  className="size-4 rounded accent-indigo-600"
                />
                <span>
                  {tUi("observancesAndEventsCarnivalSummerTimeAdvent")}
                </span>
              </label>
            </div>

            {/* Paper Size */}
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("settings.paper")}
              </p>
              <div className="mt-1.5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPaper("a4")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    paper === "a4"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("settings.a4")} {tUi("dinStandard")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaper("usLetter")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    paper === "usLetter"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("settings.usLetter")}
                </button>
              </div>
            </div>

            {/* Orientation */}
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("settings.orientation")}
              </p>
              <div className="mt-1.5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    orientation === "portrait"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("settings.portrait")}
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    orientation === "landscape"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("settings.landscape")}
                </button>
              </div>
            </div>

            {/* Colour Selector */}
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("settings.colour")}
              </p>
              <div className="mt-1.5 flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    onClick={() => setSelectedColor(c.hex)}
                    className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      selectedColor === c.hex
                        ? "border-slate-900 ring-2 ring-indigo-500 ring-offset-2 dark:border-white"
                        : "border-white dark:border-slate-800"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline-2 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <Download className="size-4" />
                <span>{t("settings.downloadPdf")}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer className="size-4" />
                <span>{t("settings.print")}</span>
              </button>
            </div>
          </div>

          <p className="px-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t("settings.printNotice")}
          </p>
        </aside>
      </div>

      {/* Guide, Holidays Table & Bridging Days Section */}
      <div className="mt-16 space-y-12 border-t border-slate-200 pt-12 dark:border-slate-800">
        {/* Germany Holidays & Events Section */}
        {holidayRegion === "de" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {locale === "de"
                    ? `Feiertage & Ereignisse in Deutschland ${year}`
                    : `Holidays & Events in Germany ${year}`}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {locale === "de"
                    ? `Gesetzliche Feiertage aller 16 Bundesländer, Brückentage zur Urlaubsoptimierung und traditionelle Brauchtumstage.`
                    : `Statutory public holidays across all 16 federal states, bridging days, and cultural events.`}
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setBottomTab("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    bottomTab === "all"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {tUi("allEvents")}
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("statutory")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    bottomTab === "statutory"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {tUi("publicHolidays")}
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("bridges")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    bottomTab === "bridges"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="size-3 text-amber-500" />
                  <span>{tUi("bridgeDays")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("events")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    bottomTab === "events"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {tUi("observances")}
                </button>
              </div>
            </div>

            {/* Render Bridging Days Cards */}
            {bottomTab === "bridges" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    💡 {tUi("maximizeYour2026VacationDays")}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
                    {locale === "de"
                      ? tUi("nutzenSieBundesweiteFeiertageDieAufEinenDonnerstagFallenZBChristiHimmelfahrtOderFronleichnamFRBrCkentageAmFreitagMitNur1UrlaubstagErhaltenSie4FreieTageAmStCk")
                      : tUi("germanThursdayPublicHolidaysSuchAsAscensionDayOrCorpusChristiAllowYouToGain4ConsecutiveDaysOffWithJust1VacationDayOnFriday")}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {GERMAN_BRIDGING_DAYS_2026.map((bridge) => (
                    <div
                      key={bridge.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-indigo-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-850"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {bridge.holidayDateDe}
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {bridge.vacationDaysUsed === 0
                              ? (tUi("0Days3DaysOff"))
                              : locale === "de"
                              ? `${bridge.vacationDaysUsed} Tag = ${bridge.consecutiveDaysOff} Tage frei`
                              : `${bridge.vacationDaysUsed} day = ${bridge.consecutiveDaysOff} days off`}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                          {locale === "de" ? bridge.holidayNameDe : bridge.holidayNameEn}
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {locale === "de" ? "Brückentag: " : "Bridge day: "}
                          </span>
                          {locale === "de" ? bridge.bridgeDaysDe : bridge.bridgeDaysEn}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {locale === "de" ? bridge.tipDe : bridge.tipEn}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                        <span>{locale === "de" ? bridge.statesDe : bridge.statesEn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Render Filtered German Holidays List */
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="hidden grid-cols-[140px_1fr_180px_130px] gap-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
                  <span>{tUi("date")}</span>
                  <span>{tUi("holidayEvent")}</span>
                  <span>{tUi("regionScope")}</span>
                  <span className="text-right">{tUi("category")}</span>
                </div>

                {filteredGermanHolidays.map((item) => {
                  const displayDate = formatGermanDisplayDate(item.month, item.day);
                  const isNationwide = item.states.includes("all");
                  const scopeLabel = isNationwide
                    ? (tUi("nationwide16States"))
                    : item.states.join(", ");

                  return (
                    <div
                      key={item.id}
                      className="grid items-center gap-2 py-2.5 text-xs sm:grid-cols-[140px_1fr_180px_130px] sm:gap-4"
                    >
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {displayDate}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {locale === "de" ? item.nameDe : item.nameEn}
                        </div>
                        {item.tipDe && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {locale === "de" ? item.tipDe : item.tipEn}
                          </div>
                        )}
                      </div>

                      <div className="text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3 text-slate-400" />
                          <span>{scopeLabel}</span>
                        </span>
                      </div>

                      <div className="sm:text-right">
                        {item.isStatutory ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-950/70 dark:text-red-300">
                            {tUi("publicHoliday")}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {tUi("traditionEvent")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Fallback US Federal Holidays List (When US is selected) */}
        {holidayRegion === "us" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("holidaysList.heading", { year })}
            </h2>
            <ul className="mt-4 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {[
                { d: tUi("jan1"), t: t("holidaysList.newYearsDay") },
                { d: tUi("jan19"), t: t("holidaysList.mlkDay") },
                { d: tUi("feb14"), t: t("holidaysList.valentinesDay") },
                { d: tUi("feb16"), t: t("holidaysList.presidentsDay") },
                { d: tUi("mar8"), t: t("holidaysList.dstStarts") },
                { d: tUi("mar17"), t: t("holidaysList.stPatricksDay") },
                { d: tUi("apr3"), t: t("holidaysList.goodFriday") },
                { d: tUi("apr5"), t: t("holidaysList.easterSunday") },
                { d: tUi("may10"), t: t("holidaysList.mothersDay") },
                { d: tUi("may25"), t: t("holidaysList.memorialDay") },
                { d: tUi("jun19"), t: t("holidaysList.juneteenth") },
                { d: tUi("jun21"), t: t("holidaysList.fathersDay") },
                { d: tUi("jul3"), t: t("holidaysList.independenceDay") },
                { d: tUi("sep7"), t: t("holidaysList.laborDay") },
                { d: tUi("oct12"), t: t("holidaysList.columbusDay") },
                { d: tUi("oct31"), t: t("holidaysList.halloween") },
                { d: tUi("nov1"), t: t("holidaysList.dstEnds") },
                { d: tUi("nov11"), t: t("holidaysList.veteransDay") },
                { d: tUi("nov26"), t: t("holidaysList.thanksgivingDay") },
                { d: tUi("nov27"), t: t("holidaysList.blackFriday") },
                { d: tUi("dec24"), t: t("holidaysList.christmasEve") },
                { d: tUi("dec25"), t: t("holidaysList.christmasDay") },
                { d: tUi("dec31"), t: t("holidaysList.newYearsEve") },
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 py-1 border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span className="w-16 shrink-0 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {item.d}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{item.t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Article: A printable calendar, your way */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("guide.printableCalendarHeading", { year })}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {t("guide.printableCalendarDesc", { year })}
          </p>
        </section>

        {/* How to print a calendar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("guide.howToPrintHeading", { year })}
          </h2>
          <ol className="mt-4 list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <li>{t("guide.howToPrintStep1", { year })}</li>
            <li>{t("guide.howToPrintStep2")}</li>
            <li>{t("guide.howToPrintStep3")}</li>
            <li>{t("guide.howToPrintStep4")}</li>
          </ol>
        </section>

        {/* At a glance */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("guide.atAGlanceHeading", { year })}
          </h2>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{t("guide.atAGlancePoint1", { year })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{t("guide.atAGlancePoint2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{t("guide.atAGlancePoint3")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{t("guide.atAGlancePoint4")}</span>
            </li>
          </ul>
        </section>

        {/* Why use this calendar (Feature Cards) */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("guide.whyUseHeading", { year })}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("guide.whyUseVectorTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {t("guide.whyUseVectorDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("guide.whyUseHolidaysTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {t("guide.whyUseHolidaysDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("guide.whyUseLayoutTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {t("guide.whyUseLayoutDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("guide.whyUseNoSignupTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {t("guide.whyUseNoSignupDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Common Uses */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("guide.commonUsesHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("guide.usePlanningTitle")}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {t("guide.usePlanningDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("guide.useRemainingTitle")}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {t("guide.useRemainingDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("guide.useSchoolTitle")}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {t("guide.useSchoolDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("guide.useOfficeTitle")}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {t("guide.useOfficeDesc")}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">{t("guide.dateCalcDesc")}</p>
        </section>

        {/* How to use this tool */}
        {howToSteps.length > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <ListOrdered className="size-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("toolShell.howToHeading")}
              </h2>
            </div>
            <ol className="mt-4 space-y-2.5">
              {howToSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* FAQ Section */}
        <section>
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("faqs.heading", { year })}
            </h2>
          </div>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {[
              { q: t("faqs.q1", { year }), a: t("faqs.a1") },
              { q: t("faqs.q2", { year }), a: t("faqs.a2", { year }) },
              { q: t("faqs.q6", { year }), a: t("faqs.a6", { year }) },
              { q: t("faqs.q3", { year }), a: t("faqs.a3", { year }) },
              { q: t("faqs.q4"), a: t("faqs.a4") },
              { q: t("faqs.q5"), a: t("faqs.a5") },
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="p-4 sm:p-5">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 text-lg font-mono">
                      {isOpen ? "−" : "+"}
                    </span>
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
      </div>
    </div>
  );
}
