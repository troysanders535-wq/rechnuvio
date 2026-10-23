"use client";

import React, { useState } from "react";
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
        <CalcPanel title="Age Calculator" icon={<CalendarDays className="size-5 text-sky-700" />}>
          <p className="text-sm text-slate-600">Enter a valid date (YYYY-MM-DD).</p>
        </CalcPanel>
      );
    }
    const age = ageBetween(birthDate, todayDate);
    return (
      <CalcPanel
        title="Age Calculator"
        subtitle="Exact age in years, months and days, plus the countdown to the next birthday."
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Date of birth" value={birth} onChange={setBirth} hint="YYYY-MM-DD" />
          <NumberField label="Age on" value={today} onChange={setToday} hint="YYYY-MM-DD" />
        </div>
        <ResultGrid>
          <ResultCard
            label="Age"
            value={`${age.years}y ${age.months}m ${age.days}d`}
            tone="emerald"
          />
          <ResultCard label="Total days lived" value={age.totalDays.toLocaleString()} tone="sky" />
          <ResultCard label="Total months" value={age.totalMonths} tone="slate" />
          <ResultCard label="Total weeks" value={age.totalWeeks.toLocaleString()} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="Next birthday" value={toISODate(age.nextBirthday)} tone="amber" />
          <ResultCard label="Days to birthday" value={age.daysToBirthday} tone="amber" />
          <ResultCard
            label="Day of birth"
            value={birthDate.toLocaleDateString("en-US", { weekday: "long" })}
            tone="slate"
          />
          <ResultCard
            label="Zodiac"
            value={zodiacOf(birthDate.getMonth() + 1, birthDate.getDate())}
            tone="slate"
          />
        </ResultGrid>
      </CalcPanel>
    );
  }

  if (variant === "dog-age") {
    const result = dogAge(num(dogYears), dogSize);
    return (
      <CalcPanel
        title="Dog Age Calculator"
        subtitle="Convert dog years to human years by size, with the newer epigenetic formula."
        icon={<Scale className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Dog's age in years" value={dogYears} onChange={setDogYears} />
          <SelectField
            label="Size"
            value={dogSize}
            onChange={setDogSize}
            options={[
              { value: "small", label: "Small (up to 20 lb)" },
              { value: "medium", label: "Medium (21 – 50 lb)" },
              { value: "large", label: "Large (51 – 90 lb)" },
              { value: "giant", label: "Giant (over 90 lb)" },
            ]}
          />
        </div>
        <ResultGrid>
          <ResultCard label="Human age (AVMA)" value={`${result.avma} years`} tone="emerald" />
          <ResultCard label="Human age (epigenetic)" value={`${result.epigenetic} years`} tone="sky" />
          <ResultCard label="Life stage" value={result.stage} tone="amber" />
          <ResultCard label="In dog years" value={result.dogYearsEquivalent} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          AVMA: the first two years count as 10.5 human years each, then size decides how fast
          they age. Epigenetic (2021 study): human years = 10 × log₁₀(dog years) + 10.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "date") {
    const base = parseDate(start);
    const shifted = base ? shiftDate(base, { [unit]: num(amount) }, direction === "add" ? 1 : -1) : null;
    const difference = startDate && endDate ? differenceBetween(startDate, endDate, includeEnd) : null;
    return (
      <CalcPanel
        title="Date Calculator"
        subtitle="Add or subtract days, weeks, months or years — and find the time between two dates."
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Start date" value={start} onChange={setStart} hint="YYYY-MM-DD" />
          <NumberField label="End date" value={end} onChange={setEnd} hint="YYYY-MM-DD" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Amount" value={amount} onChange={setAmount} />
          <SelectField
            label="Unit"
            value={unit}
            onChange={setUnit}
            options={[
              { value: "days", label: "Days" },
              { value: "weeks", label: "Weeks" },
              { value: "months", label: "Months" },
              { value: "years", label: "Years" },
            ]}
          />
          <SelectField
            label="Direction"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "add", label: "Add" },
              { value: "subtract", label: "Subtract" },
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
              Include end date
            </label>
          </div>
        </div>
        <ResultGrid>
          <ResultCard
            label={direction === "add" ? "Date after adding" : "Date after subtracting"}
            value={shifted ? toISODate(shifted) : "—"}
            tone="emerald"
          />
          <ResultCard label="Days between" value={difference ? difference.days : 0} tone="sky" />
          <ResultCard label="Weeks between" value={difference ? difference.weeks : 0} tone="slate" />
          <ResultCard label="Weekday of end date" value={difference ? difference.weekday : "—"} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Months between", value: difference ? difference.months : 0 },
            { label: "Years between", value: difference ? difference.years : 0 },
            { label: "Include end date", value: includeEnd ? "Yes" : "No" },
          ]}
        />
      </CalcPanel>
    );
  }

  if (variant === "days-between") {
    const difference = startDate && endDate ? differenceBetween(startDate, endDate, includeEnd) : null;
    return (
      <CalcPanel
        title="Days Between Dates Calculator"
        subtitle="Count the days between two dates in years, months, weeks and weekdays."
        icon={<CalendarDays className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="From date" value={start} onChange={setStart} hint="YYYY-MM-DD" />
          <NumberField label="To date" value={end} onChange={setEnd} hint="YYYY-MM-DD" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeEnd}
            onChange={(e) => setIncludeEnd(e.target.checked)}
            className="size-4 rounded border-slate-300 text-sky-600"
          />
          Include the end date
        </label>
        <ResultGrid>
          <ResultCard label="Total days" value={difference ? difference.days : 0} tone="emerald" />
          <ResultCard label="Weeks" value={difference ? difference.weeks : 0} tone="sky" />
          <ResultCard label="Months" value={difference ? difference.months : 0} tone="slate" />
          <ResultCard label="Years" value={difference ? difference.years : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Days are counted in the local calendar, so a leap day is included automatically. The end
          date is optional.
        </FormulaNote>
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
      title="Business Days Calculator"
        subtitle="Working days between two dates, skipping weekends and holidays."
      icon={<CalendarDays className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="From date" value={start} onChange={setStart} hint="YYYY-MM-DD" />
        <NumberField label="To date" value={end} onChange={setEnd} hint="YYYY-MM-DD" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Holiday calendar"
          value={holidaySet}
          onChange={setHolidaySet}
          options={[
            { value: "none", label: "No holidays" },
            { value: "us", label: "US federal holidays" },
            { value: "uk", label: "UK bank holidays" },
          ]}
        />
        <NumberField
          label="Your own days off"
          value={customDaysOff}
          onChange={setCustomDaysOff}
          hint="YYYY-MM-DD, separated by commas"
        />
      </div>
      <ResultGrid>
        <ResultCard label="Business days" value={business ? business.businessDays : 0} tone="emerald" />
        <ResultCard label="Weekend days" value={business ? business.weekendDays : 0} tone="slate" />
        <ResultCard label="Holidays skipped" value={business ? business.holidaysSkipped : 0} tone="amber" />
        <ResultCard label="Total days" value={business ? business.totalDays : 0} tone="slate" />
      </ResultGrid>
      {holidays.length ? (
        <Table
          headers={["Holidays in range"]}
          rows={holidays.map((h) => [h])}
        />
      ) : null}
      <FormulaNote>
        Monday to Friday counts as a business day; Saturdays, Sundays and the selected holidays
        are skipped.
      </FormulaNote>
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
