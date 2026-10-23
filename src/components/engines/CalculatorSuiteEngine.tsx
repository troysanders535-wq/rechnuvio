"use client";

import React from "react";
import { Calculator } from "lucide-react";
import {
  CALCULATOR_VARIANT_LABELS,
  getCalculatorVariant,
  type CalculatorVariant,
} from "@/data/calculatorTools";
import { PercentTools } from "@/components/calculators/PercentTools";
import { MoneyTools } from "@/components/calculators/MoneyTools";
import { GradeTools } from "@/components/calculators/GradeTools";
import { StatsTools } from "@/components/calculators/StatsTools";
import { FractionTools } from "@/components/calculators/FractionTools";
import { RatioTools } from "@/components/calculators/RatioTools";
import { DateTools } from "@/components/calculators/DateTools";
import { TimeTools } from "@/components/calculators/TimeTools";
import { NumberBaseTools } from "@/components/calculators/NumberBaseTools";
import { ConstructionTools } from "@/components/calculators/ConstructionTools";
import { FitnessTools } from "@/components/calculators/FitnessTools";

const PERCENT_VARIANTS: CalculatorVariant[] = [
  "percent",
  "percent-change",
  "percent-increase",
  "percent-decrease",
  "percent-difference",
];

const MONEY_VARIANTS: CalculatorVariant[] = [
  "discount",
  "margin",
  "markup",
  "salary-hourly",
  "hourly-salary",
  "overtime",
  "electricity-cost",
];

const GRADE_VARIANTS: CalculatorVariant[] = [
  "gpa",
  "college-gpa",
  "high-school-gpa",
  "middle-school-gpa",
  "weighted-gpa",
  "cumulative-gpa",
  "raise-gpa",
  "grade",
  "weighted-grade",
  "final-grade",
  "test-grade",
  "easy-grader",
];

const STATS_VARIANTS: CalculatorVariant[] = [
  "average",
  "std-dev",
  "sample-std-dev",
  "population-std-dev",
  "variance",
  "mad",
  "z-score",
  "quartile",
];

const FRACTION_VARIANTS: CalculatorVariant[] = [
  "fraction",
  "simplify-fraction",
  "mixed-number",
  "common-denominator",
  "decimal-to-fraction",
  "fraction-to-decimal",
];

const DATE_VARIANTS: CalculatorVariant[] = [
  "age",
  "dog-age",
  "date",
  "days-between",
  "business-days",
];

const TIME_VARIANTS: CalculatorVariant[] = ["hours", "time", "time-card", "military-time"];

const BASE_VARIANTS: CalculatorVariant[] = ["binary", "hex", "roman", "roman-date"];

const CONSTRUCTION_VARIANTS: CalculatorVariant[] = [
  "square-footage",
  "concrete",
  "gravel",
  "mulch",
  "tile",
  "paint",
  "roofing",
  "btu",
];

const FITNESS_VARIANTS: CalculatorVariant[] = ["one-rep-max", "water-intake"];

function includes(list: CalculatorVariant[], variant: CalculatorVariant): boolean {
  return list.includes(variant);
}

/**
 * Routes a calculator tool to its workspace using an exact slug match.
 * A slug that is not in the map renders an explicit notice instead of
 * silently falling back to an unrelated calculator.
 */
export function CalculatorSuiteEngine({ slug }: { slug: string }) {
  const variant = getCalculatorVariant(slug);

  if (!variant) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-semibold">This calculator is not wired up yet.</p>
        <p className="mt-1 text-xs opacity-80">
          No workspace is registered for <code>{slug}</code>. Add it to the calculator variant map
          to enable it.
        </p>
      </div>
    );
  }

  if (includes(PERCENT_VARIANTS, variant)) return <PercentTools variant={variant} />;
  if (includes(MONEY_VARIANTS, variant)) return <MoneyTools variant={variant} />;
  if (includes(GRADE_VARIANTS, variant)) return <GradeTools variant={variant} />;
  if (includes(STATS_VARIANTS, variant)) return <StatsTools variant={variant} />;
  if (includes(FRACTION_VARIANTS, variant)) return <FractionTools variant={variant} />;
  if (variant === "ratio") return <RatioTools variant={variant} />;
  if (includes(DATE_VARIANTS, variant)) return <DateTools variant={variant} />;
  if (includes(TIME_VARIANTS, variant)) return <TimeTools variant={variant} />;
  if (includes(BASE_VARIANTS, variant)) return <NumberBaseTools variant={variant} />;
  if (includes(CONSTRUCTION_VARIANTS, variant)) return <ConstructionTools variant={variant} />;
  if (includes(FITNESS_VARIANTS, variant)) return <FitnessTools variant={variant} />;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="font-semibold">This calculator is not wired up yet.</p>
      <p className="mt-1 text-xs opacity-80">
        The variant <code>{variant}</code> has no workspace component.
      </p>
    </div>
  );
}

export { CALCULATOR_VARIANT_LABELS };
