"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  Table,
  num,
  round,
} from "./shared";
import {
  addFractions,
  commonDenominator,
  decimalToFraction,
  divideFractions,
  gcd,
  improperToMixed,
  lcm,
  mixedToImproper,
  multiplyFractions,
  repeatingPeriod,
  simplifyFraction,
  subtractFractions,
  unsimplifiedFraction,
  type Fraction,
} from "./calc";

/**
 * The operation buttons are rendered from this module level list, so they hold
 * the message key instead of the label itself: the label is resolved with
 * `tUi` inside the component.
 */
const OPERATIONS = [
  { value: "add", labelKey: "add" },
  { value: "subtract", labelKey: "subtract" },
  { value: "multiply", labelKey: "multiply" },
  { value: "divide", labelKey: "divide" },
] as const;

type Operation = (typeof OPERATIONS)[number]["value"];

function fractionText(fraction: Fraction): string {
  if (fraction.denominator === 0) return "undefined";
  return `${fraction.numerator}/${fraction.denominator}`;
}

export function FractionTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.FractionTools");
  const [numA, setNumA] = useState("3");
  const [denA, setDenA] = useState("4");
  const [numB, setNumB] = useState("5");
  const [denB, setDenB] = useState("6");
  const [wholeA, setWholeA] = useState("2");
  const [wholeB, setWholeB] = useState("1");
  const [operation, setOperation] = useState<Operation>("add");
  const [decimal, setDecimal] = useState("0.375");
  const [extra, setExtra] = useState("0.5");
  const [count, setCount] = useState("3");
  const [cdNumA, setCdNumA] = useState("1");
  const [cdDenA, setCdDenA] = useState("6");
  const [cdNumB, setCdNumB] = useState("3");
  const [cdDenB, setCdDenB] = useState("6");

  const a: Fraction = { numerator: num(numA), denominator: num(denA) };
  const b: Fraction = { numerator: num(numB), denominator: num(denB) };

  const applyOperation = (x: Fraction, y: Fraction): Fraction => {
    if (operation === "add") return addFractions(x, y);
    if (operation === "subtract") return subtractFractions(x, y);
    if (operation === "multiply") return multiplyFractions(x, y);
    return divideFractions(x, y);
  };

  if (variant === "fraction") {
    const result = applyOperation(a, b);
    const raw = unsimplifiedFraction(operation, a, b);
    const mixed = improperToMixed(result.numerator, result.denominator);
    return (
      <CalcPanel
        title={tUi("fractionCalculator")}
        subtitle={tUi("addSubtractMultiplyAndDivideFractionsMixedNumbersAndWholeNumbers")}
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={tUi("numeratorA")} value={numA} onChange={setNumA} />
            <NumberField label={tUi("denominatorA")} value={denA} onChange={setDenA} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={tUi("numeratorB")} value={numB} onChange={setNumB} />
            <NumberField label={tUi("denominatorB")} value={denB} onChange={setDenB} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => setOperation(op.value)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                operation === op.value
                  ? "bg-sky-800 text-white"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {tUi(op.labelKey)}
            </button>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label={tUi("answer")} value={fractionText(result)} tone="emerald" />
          <ResultCard label={tUi("mixedNumber")} value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label={tUi("decimal")} value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard label={tUi("percent")} value={round(mixed.decimal * 100, 4)} unit="%" tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("crossMultiply"), value: `${numA}×${denB} ${operation === "subtract" ? "−" : operation === "add" ? "+" : "×"} ${numB}×${denA}` },
            { label: tUi("gcd"), value: gcd(result.numerator, result.denominator) },
            { label: tUi("beforeSimplifying"), value: `${raw.numerator} / ${raw.denominator}` },
          ]}
        />
      </CalcPanel>
    );
  }

  if (variant === "simplify-fraction") {
    // The whole number is part of the fraction: 2 3/4 = (2 x 4 + 3) / 4 = 11/4.
    const whole = num(wholeA);
    const denominator = num(denA);
    const improperNumerator = whole * denominator + num(numA);
    const simplified = simplifyFraction(improperNumerator, denominator);
    const mixed = improperToMixed(simplified.numerator, simplified.denominator);
    return (
      <CalcPanel
        title={tUi("simplifyFractionsCalculator")}
        subtitle={tUi("reduceAnyFractionOrMixedNumberToLowestTerms")}
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("numerator")} value={numA} onChange={setNumA} />
          <NumberField label={tUi("denominator")} value={denA} onChange={setDenA} />
          <NumberField label={tUi("wholeNumber")} value={wholeA} onChange={setWholeA} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("inLowestTerms")} value={fractionText(simplified)} tone="emerald" />
          <ResultCard label={tUi("asAMixedNumber")} value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label={tUi("decimal")} value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard
            label={tUi("greatestCommonFactor")}
            value={denominator === 0 ? 0 : gcd(improperNumerator, denominator)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          {tUi("simplifyByGreatestCommonDivisor", {
            mixed: `${wholeA} ${numA}/${denA}`,
            result: fractionText(mixedToImproper(num(wholeA), num(numA), num(denA))),
          })}
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "mixed-number") {
    const aMixed = mixedToImproper(num(wholeA), num(numA), num(denA));
    const bMixed = mixedToImproper(num(wholeB), num(numB), num(denB));
    const result = applyOperation(aMixed, bMixed);
    const mixed = improperToMixed(result.numerator, result.denominator);
    return (
      <CalcPanel
        title={tUi("mixedNumberCalculator")}
        subtitle={tUi("workWithMixedNumbersImproperFractionsAndWholeNumbers")}
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label={tUi("wholeA")} value={wholeA} onChange={setWholeA} />
            <NumberField label={tUi("numA")} value={numA} onChange={setNumA} />
            <NumberField label={tUi("denA")} value={denA} onChange={setDenA} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label={tUi("wholeB")} value={wholeB} onChange={setWholeB} />
            <NumberField label={tUi("numB")} value={numB} onChange={setNumB} />
            <NumberField label={tUi("denB")} value={denB} onChange={setDenB} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => setOperation(op.value)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                operation === op.value
                  ? "bg-sky-800 text-white"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {tUi(op.labelKey)}
            </button>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label={tUi("answer")} value={fractionText(result)} tone="emerald" />
          <ResultCard label={tUi("mixedNumber")} value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label={tUi("decimal")} value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard label={tUi("aAsImproper")} value={fractionText(aMixed)} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("mixedToImproperFormula")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "common-denominator") {
    const n = Math.max(2, Math.min(10, Math.round(num(count) || 3)));
    const firstNumerator = num(cdNumA);
    const firstDenominator = num(cdDenA) || 1;
    const lastNumerator = num(cdNumB);
    const lastDenominator = num(cdDenB) || 1;
    // The list runs from the first fraction to the second one: the fractions in
    // between step the numerator up and keep the denominator of the first one.
    const run: Fraction[] = Array.from({ length: n - 1 }, (_, i) =>
      simplifyFraction(firstNumerator + i, firstDenominator),
    );
    const fractions: Fraction[] = [
      ...run,
      simplifyFraction(lastNumerator, lastDenominator),
    ];
    const lcd = commonDenominator(fractions);
    const equivalents = fractions.map((f) => ({
      original: fractionText(f),
      equivalent: `${(f.numerator * lcd) / f.denominator}/${lcd}`,
      value: round(f.numerator / f.denominator, 4),
    }));
    const sorted = [...fractions].sort((x, y) => x.numerator / x.denominator - y.numerator / y.denominator);
    return (
      <CalcPanel
        title={tUi("commonDenominatorCalculator")}
        subtitle={tUi("findTheLeastCommonDenominatorOf2To10FractionsAndRewriteThem")}
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("numeratorA")} value={cdNumA} onChange={setCdNumA} />
          <NumberField label={tUi("denominatorA")} value={cdDenA} onChange={setCdDenA} />
          <NumberField label={tUi("howManyFractions")} value={count} onChange={setCount} hint={tUi("2To10")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("numeratorB")} value={cdNumB} onChange={setCdNumB} />
          <NumberField label={tUi("denominatorB")} value={cdDenB} onChange={setCdDenB} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("leastCommonDenominator")} value={lcd} tone="emerald" />
          <ResultCard label={tUi("fractions")} value={fractions.length} tone="slate" />
          <ResultCard label={tUi("lCMOfDenominators")} value={fractions.reduce((acc, f) => lcm(acc, f.denominator), 1)} tone="sky" />
          <ResultCard label={tUi("smallestValue")} value={round(sorted[0] ? sorted[0].numerator / sorted[0].denominator : 0, 4)} tone="slate" />
        </ResultGrid>
        <Table
          headers={[tUi("fraction"), tUi("withLCD"), tUi("decimal")]}
          rows={equivalents.map((e) => [e.original, e.equivalent, e.value])}
        />
        <p className="text-xs font-semibold text-slate-500">{tUi("orderedFromLeastToGreatest")}</p>
        <p className="font-mono text-xs text-slate-700 dark:text-slate-200">
          {sorted.map((f) => fractionText(f)).join("  <  ")}
        </p>
        <FormulaNote>{tUi("fractionsFromAToBAndLCD")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "decimal-to-fraction") {
    const fraction = decimalToFraction(decimal);
    const mixed = improperToMixed(fraction.numerator, fraction.denominator);
    return (
      <CalcPanel
        title={tUi("decimalToFractionCalculator")}
        subtitle={tUi("convertAnyDecimalIncludingRepeatingOnesIntoAFractionInSimplestForm")}
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <NumberField
          label={tUi("decimal")}
          value={decimal}
          onChange={setDecimal}
          hint={tUi("repeatingDecimalsHint")}
        />
        <ResultGrid>
          <ResultCard label={tUi("fraction")} value={fractionText(fraction)} tone="emerald" />
          <ResultCard label={tUi("mixedNumber")} value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label={tUi("percent")} value={round(mixed.decimal * 100, 4)} unit="%" tone="slate" />
          <ResultCard label={tUi("gcd")} value={gcd(fraction.numerator, fraction.denominator)} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("decimalToFractionByPowersOfTen")}</FormulaNote>
      </CalcPanel>
    );
  }

  // fraction-to-decimal
  const numerator = num(numA);
  const denominator = num(denA);
  const value = denominator === 0 ? 0 : numerator / denominator;
  const period = repeatingPeriod(numerator, denominator);
  const mixed = improperToMixed(numerator, denominator);
  return (
    <CalcPanel
      title={tUi("fractionToDecimalCalculator")}
      subtitle={tUi("convertFractionsAndMixedNumbersToDecimalsAndPercentages")}
      icon={<Calculator className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label={tUi("numerator")} value={numA} onChange={setNumA} />
        <NumberField label={tUi("denominator")} value={denA} onChange={setDenA} />
        <NumberField label={tUi("compareWith")} value={extra} onChange={setExtra} />
      </div>
      <ResultGrid>
        <ResultCard
          label={tUi("decimal")}
          value={period ? `${round(value, 6).toString()}…` : round(value, 8)}
          tone="emerald"
        />
        <ResultCard label={tUi("percent")} value={round(value * 100, 4)} unit="%" tone="sky" />
        <ResultCard label={tUi("mixedNumber")} value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="slate" />
        <ResultCard label={tUi("repeating")} value={period ? tUi("yes") : tUi("no")} tone="slate" />
      </ResultGrid>
      <DetailList
        items={[
          {
            label: tUi("repeatingPeriodLabel"),
            value: period ? tUi("repeatingPeriodValue", { period }) : tUi("terminatingDecimal"),
          },
          { label: tUi("equivalentDecimal"), value: round(num(extra), 4) },
          { label: tUi("difference"), value: round(value - (num(extra)), 6) },
        ]}
      />
      <FormulaNote>{tUi("repeatingDecimalRule")}</FormulaNote>
    </CalcPanel>
  );
}
