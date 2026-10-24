"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calculator, Percent, Sparkles, DollarSign, BookOpen } from "lucide-react";
import { parseLocaleNumber, formatLocaleNumber, formatLocaleCurrency } from "@/utils/numberFormat";

interface MathCalculatorsEngineProps {
  slug: string;
}

export function MathCalculatorsEngine({ slug }: MathCalculatorsEngineProps) {
  const tUi = useTranslations("ui.engines.MathCalculatorsEngine");
  const locale = useLocale();

  const isPercent = slug.includes("percent") || slug.includes("discount") || slug.includes("margin") || slug.includes("markup");
  const isGpa = slug.includes("gpa") || slug.includes("grade");
  const isSalary = slug.includes("salary") || slug.includes("hourly") || slug.includes("overtime");
  const isStats = slug.includes("average") || slug.includes("deviation") || slug.includes("variance");

  // Percentage states (as strings to allow comma typing)
  const [valAInput, setValAInput] = useState("15");
  const [valBInput, setValBInput] = useState("250");

  const valA = parseLocaleNumber(valAInput);
  const valB = parseLocaleNumber(valBInput);

  // Salary states
  const [salaryAnnualInput, setSalaryAnnualInput] = useState("85000");
  const [hoursPerWeekInput, setHoursPerWeekInput] = useState("40");

  const salaryAnnual = parseLocaleNumber(salaryAnnualInput);
  const hoursPerWeek = parseLocaleNumber(hoursPerWeekInput) || 40;

  // Stats states
  const [statsInput, setStatsInput] = useState("12, 15, 23, 27, 34, 45, 52, 60");

  // GPA states
  const [gpaCourses, setGpaCourses] = useState([
    { name: tUi("computerScience"), credits: 4, grade: "A" },
    { name: tUi("calculusIII"), credits: 4, grade: tUi("b") },
    { name: tUi("physics"), credits: 3, grade: tUi("a") },
    { name: tUi("technicalWriting"), credits: 3, grade: "A" },
  ]);

  const gradePoints: Record<string, number> = {
    "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7, D: 1.0, F: 0.0,
  };

  const calculateGpa = () => {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const c of gpaCourses) {
      const pts = gradePoints[c.grade] ?? 4.0;
      totalPoints += pts * c.credits;
      totalCredits += c.credits;
    }
    const gpaNum = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return formatLocaleNumber(gpaNum, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isSalary) {
    const hourly = salaryAnnual / (hoursPerWeek * 52);
    const monthly = salaryAnnual / 12;
    const biweekly = salaryAnnual / 26;
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign className="size-5 text-emerald-600" />
          {tUi("salaryToHourlyWageConverterUSDBaseline")}
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("annualBaseSalary")}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={salaryAnnualInput}
              onChange={(e) => setSalaryAnnualInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("hoursPerWeek")}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={hoursPerWeekInput}
              onChange={(e) => setHoursPerWeekInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {formatLocaleCurrency(hourly, "USD", locale)}
            </span>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {tUi("perHour")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatLocaleCurrency(biweekly, "USD", locale)}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              {tUi("biWeekly")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatLocaleCurrency(monthly, "USD", locale)}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              {tUi("monthly")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatLocaleCurrency(hourly * 1.5, "USD", locale)}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              {tUi("overtime15x")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isGpa) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="size-5 text-sky-700" />
            {tUi("gPAFinalGradeCalculator")}
          </h3>
          <div className="rounded-xl bg-sky-100 px-4 py-2 font-mono text-xl font-extrabold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            GPA: {calculateGpa()}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {gpaCourses.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                value={c.name}
                onChange={(e) => {
                  const copy = [...gpaCourses];
                  copy[i].name = e.target.value;
                  setGpaCourses(copy);
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="number"
                min={1}
                max={6}
                value={c.credits}
                onChange={(e) => {
                  const copy = [...gpaCourses];
                  copy[i].credits = Number(e.target.value);
                  setGpaCourses(copy);
                }}
                className="w-20 rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <select
                value={c.grade}
                onChange={(e) => {
                  const copy = [...gpaCourses];
                  copy[i].grade = e.target.value;
                  setGpaCourses(copy);
                }}
                className="w-24 rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {Object.keys(gradePoints).map((g) => (
                  <option key={g} value={g}>
                    {g} ({gradePoints[g]})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Percentage & Math default
  const resultPercentNum = (valA / 100) * valB;
  const whatPercentNum = valB > 0 ? (valA / valB) * 100 : 0;

  const formattedResultPercent = formatLocaleNumber(resultPercentNum, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedWhatPercent = formatLocaleNumber(whatPercentNum, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Percent className="size-5 text-sky-700" />
        {tUi("percentageCalculatorSuite")}
      </h3>

      <div className="mt-6 space-y-6">
        {/* Calculation 1: What is X% of Y? */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <span className="text-xs font-semibold text-slate-500">
            {tUi("calculateValue")}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
            <span>{tUi("whatIs")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={valAInput}
              onChange={(e) => setValAInput(e.target.value)}
              className="w-20 rounded-lg border border-slate-300 bg-white p-1 text-center text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span>{tUi("percentOf")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={valBInput}
              onChange={(e) => setValBInput(e.target.value)}
              className="w-24 rounded-lg border border-slate-300 bg-white p-1 text-center text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span>=</span>
            <span className="rounded-lg bg-emerald-100 px-3 py-1 font-mono text-base font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              {formattedResultPercent}
            </span>
          </div>
        </div>

        {/* Calculation 2: What % is X of Y? */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <span className="text-xs font-semibold text-slate-500">
            {tUi("calculatePercentage")}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="font-bold">{valAInput}</span>
            <span>{tUi("isWhatPercentOf")}</span>
            <span className="font-bold">{valBInput}</span>
            <span>=</span>
            <span className="rounded-lg bg-sky-100 px-3 py-1 font-mono text-base font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              {formattedWhatPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
