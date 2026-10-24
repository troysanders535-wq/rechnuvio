"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Scale } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  SelectField,
  Table,
  num,
  round,
} from "./shared";
import {
  ageBetween,
  businessDaysBetween,
  differenceBetween,
  dogAge,
  holidaysForYear,
  parseDate,
  shiftDate,
  toISODate,
  type HolidaySet,
} from "./calc";

export function DateTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.DateTools");
  // Number formatting must be pinned to the app locale: without it the
  // server and the browser format the same number differently ("11,000" vs
  // "11.000"), which breaks hydration on the German pages.
  const locale = useLocale();
  const [birth, setBirth] = useState("1995-06-15");
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-12-31");
  const [today, setToday] = useState(toISODate(new Date()));
  const [includeEnd, setIncludeEnd] = useState(false);
  const [holidaySet, setHolidaySet] = useState<HolidaySet>("none");
  const [customDaysOff, setCustomDaysOff] = useState("");
  const [unit, setUnit] = useState<"days" | "weeks" | "months" | "years">("days");
  const [amount, setAmount] = useState("30");
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [dogYears, setDogYears] = useState("3");
  const [dogSize, setDogSize] = useState<"small" | "medium" | "large" | "giant">("medium");

  const birthDate = parseDate(birth);
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const todayDate = parseDate(today);

  if (variant === "age") {
    if (!birthDate || !todayDate) {
      return (
        <CalcPanel title={tUi("ageCalculator")} icon={<CalendarDays className="size-5 text-sky-700" />}>
          <p className="text-sm text-slate-600">{tUi("enterAValidDateYYYYMMDD")}</p>
        </CalcPanel>
      );
    }
    const age = ageBetween(birthDate, todayDate);
    return (
      <CalcPanel
        title={tUi("ageCalculator")}
        subtitle={tUi("exactAgeInYearsMonthsAndDaysPlusTheCountdownToTheNextBirthday")}
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("dateOfBirth")} value={birth} onChange={setBirth} hint={tUi("yYYYMMDD")} />
          <NumberField label={tUi("ageOn")} value={today} onChange={setToday} hint={tUi("yYYYMMDD")} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("age")}
            value={`${age.years}y ${age.months}m ${age.days}d`}
            tone="emerald"
          />
          <ResultCard label={tUi("totalDaysLived")} value={age.totalDays.toLocaleString(locale)} tone="sky" />
          <ResultCard label={tUi("totalMonths")} value={age.totalMonths} tone="slate" />
          <ResultCard label={tUi("totalWeeks")} value={age.totalWeeks.toLocaleString(locale)} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("nextBirthday")} value={toISODate(age.nextBirthday)} tone="amber" />
          <ResultCard label={tUi("daysToBirthday")} value={age.daysToBirthday} tone="amber" />
          <ResultCard
            label={tUi("dayOfBirth")}
            value={birthDate.toLocaleDateString("en-US", { weekday: "long" })}
            tone="slate"
          />
          <ResultCard
            label={tUi("zodiac")}
            value={zodiacOf(birthDate.getMonth() + 1, birthDate.getDate())}
            tone="slate"
          />
        </ResultGrid>
      </CalcPanel>
    );
  }

  if (variant === "dog-age") {
    const result = dogAge(num(dogYears), dogSize);
    const stageLabel = (stage: string) =>
      stage === "Puppy"
        ? tUi("stagePuppy")
        : stage === "Adolescent"
          ? tUi("stageAdolescent")
          : stage === "Adult"
            ? tUi("stageAdult")
            : tUi("stageSenior");
    return (
      <CalcPanel
        title={tUi("dogAgeCalculator")}
        subtitle={tUi("convertDogYearsToHumanYearsBySizeWithTheNewerEpigeneticFormula")}
        icon={<Scale className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("dogAgeInYears")} value={dogYears} onChange={setDogYears} />
          <SelectField
            label={tUi("size")}
            value={dogSize}
            onChange={setDogSize}
            options={[
              { value: "small", label: tUi("smallUpTo20Lb") },
              { value: "medium", label: tUi("medium2150Lb") },
              { value: "large", label: tUi("large5190Lb") },
              { value: "giant", label: tUi("giantOver90Lb") },
            ]}
          />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("humanAgeAVMA")}
            value={`${result.avma} ${tUi("yearsUnit")}`}
            tone="emerald"
          />
          <ResultCard
            label={tUi("humanAgeEpigenetic")}
            value={`${result.epigenetic} ${tUi("yearsUnit")}`}
            tone="sky"
          />
          <ResultCard label={tUi("lifeStage")} value={stageLabel(result.stage)} tone="amber" />
          <ResultCard label={tUi("inDogYears")} value={result.dogYearsEquivalent} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("avmaAndEpigeneticDogAgeFormula")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "date") {
    const base = parseDate(start);
    const shifted = base ? shiftDate(base, { [unit]: num(amount) }, direction === "add" ? 1 : -1) : null;
    const difference = startDate && endDate ? differenceBetween(startDate, endDate, includeEnd) : null;
    return (
      <CalcPanel
        title={tUi("dateCalculator")}
        subtitle={tUi("addOrSubtractDaysWeeksMonthsOrYearsAndFindTheTimeBetweenTwoDates")}
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("startDate")} value={start} onChange={setStart} hint={tUi("yYYYMMDD")} />
          <NumberField label={tUi("endDate")} value={end} onChange={setEnd} hint={tUi("yYYYMMDD")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("amount")} value={amount} onChange={setAmount} />
          <SelectField
            label={tUi("unit")}
            value={unit}
            onChange={setUnit}
            options={[
              { value: "days", label: tUi("days") },
              { value: "weeks", label: tUi("weeks") },
              { value: "months", label: tUi("months") },
              { value: "years", label: tUi("years") },
            ]}
          />
          <SelectField
            label={tUi("direction")}
            value={direction}
            onChange={setDirection}
            options={[
              { value: "add", label: tUi("add") },
              { value: "subtract", label: tUi("subtract") },
            ]}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeEnd}
                onChange={(e) => setIncludeEnd(e.target.checked)}
                className="size-4 rounded border-slate-300 text-sky-600"
              />
              {tUi("includeEndDate")}
            </label>
          </div>
        </div>
        <ResultGrid>
          <ResultCard
            label={direction === "add" ? tUi("dateAfterAdding") : tUi("dateAfterSubtracting")}
            value={shifted ? toISODate(shifted) : "—"}
            tone="emerald"
          />
          <ResultCard label={tUi("daysBetween")} value={difference ? difference.days : 0} tone="sky" />
          <ResultCard label={tUi("weeksBetween")} value={difference ? difference.weeks : 0} tone="slate" />
          <ResultCard label={tUi("weekdayOfEndDate")} value={difference ? difference.weekday : "—"} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("monthsBetween"), value: difference ? difference.months : 0 },
            { label: tUi("yearsBetween"), value: difference ? difference.years : 0 },
            { label: tUi("includeEndDate"), value: includeEnd ? tUi("yes") : tUi("no") },
          ]}
        />
      </CalcPanel>
    );
  }

  if (variant === "days-between") {
    const difference = startDate && endDate ? differenceBetween(startDate, endDate, includeEnd) : null;
    return (
      <CalcPanel
        title={tUi("daysBetweenDatesCalculator")}
        subtitle={tUi("countTheDaysBetweenTwoDatesInYearsMonthsWeeksAndWeekdays")}
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("fromDate")} value={start} onChange={setStart} hint={tUi("yYYYMMDD")} />
          <NumberField label={tUi("toDate")} value={end} onChange={setEnd} hint={tUi("yYYYMMDD")} />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeEnd}
            onChange={(e) => setIncludeEnd(e.target.checked)}
            className="size-4 rounded border-slate-300 text-sky-600"
          />
          {tUi("includeTheEndDate")}
        </label>
        <ResultGrid>
          <ResultCard label={tUi("totalDays")} value={difference ? difference.days : 0} tone="emerald" />
          <ResultCard label={tUi("weeks")} value={difference ? difference.weeks : 0} tone="sky" />
          <ResultCard label={tUi("months")} value={difference ? difference.months : 0} tone="slate" />
          <ResultCard label={tUi("years")} value={difference ? difference.years : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("daysAreCountedInTheLocalCalendar")}</FormulaNote>
      </CalcPanel>
    );
  }

  // business-days
  const year = startDate ? startDate.getFullYear() : new Date().getFullYear();
  const holidays = holidaysForYear(year, holidaySet);
  const extraDays = customDaysOff
    .split(/[\s,;]+/)
    .map((d) => d.trim())
    .filter(Boolean);
  const allHolidays = [...holidays, ...extraDays];
  const business = startDate && endDate ? businessDaysBetween(startDate, endDate, allHolidays) : null;
  return (
    <CalcPanel
      title={tUi("businessDaysCalculator")}
        subtitle={tUi("workingDaysBetweenTwoDatesSkippingWeekendsAndHolidays")}
      icon={<CalendarDays className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label={tUi("fromDate")} value={start} onChange={setStart} hint={tUi("yYYYMMDD")} />
        <NumberField label={tUi("toDate")} value={end} onChange={setEnd} hint={tUi("yYYYMMDD")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={tUi("holidayCalendar")}
          value={holidaySet}
          onChange={setHolidaySet}
          options={[
            { value: "none", label: tUi("noHolidays") },
            { value: "us", label: tUi("uSFederalHolidays") },
            { value: "uk", label: tUi("uKBankHolidays") },
          ]}
        />
        <NumberField
          label={tUi("yourOwnDaysOff")}
          value={customDaysOff}
          onChange={setCustomDaysOff}
          hint={tUi("yYYYMMDDSeparatedByCommas")}
        />
      </div>
      <ResultGrid>
        <ResultCard label={tUi("businessDays")} value={business ? business.businessDays : 0} tone="emerald" />
        <ResultCard label={tUi("weekendDays")} value={business ? business.weekendDays : 0} tone="slate" />
        <ResultCard label={tUi("holidaysSkipped")} value={business ? business.holidaysSkipped : 0} tone="amber" />
        <ResultCard label={tUi("totalDays")} value={business ? business.totalDays : 0} tone="slate" />
      </ResultGrid>
      {holidays.length ? (
        <Table
          headers={[tUi("holidaysInRange")]}
          rows={holidays.map((h) => [h])}
        />
      ) : null}
      <FormulaNote>{tUi("businessDayRule")}</FormulaNote>
    </CalcPanel>
  );
}

function zodiacOf(month: number, day: number): string {
  const signs = [
    "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
    "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn",
  ];
  const boundaries = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
  const index = day < boundaries[month - 1] ? month - 1 : month;
  return signs[index];
}
