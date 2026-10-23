"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
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
  type Fraction,
} from "./calc";

const OPERATIONS = [
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "multiply", label: "Multiply" },
  { value: "divide", label: "Divide" },
] as const;

type Operation = (typeof OPERATIONS)[number]["value"];

function fractionText(fraction: Fraction): string {
  if (fraction.denominator === 0) return "undefined";
  return `${fraction.numerator}/${fraction.denominator}`;
}

export function FractionTools({ variant }: { variant: CalculatorVariant }) {
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
    const mixed = improperToMixed(result.numerator, result.denominator);
    return (
      <CalcPanel
        title="Fraction Calculator"
        subtitle="Add, subtract, multiply and divide fractions, mixed numbers and whole numbers."
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Numerator A" value={numA} onChange={setNumA} />
            <NumberField label="Denominator A" value={denA} onChange={setDenA} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Numerator B" value={numB} onChange={setNumB} />
            <NumberField label="Denominator B" value={denB} onChange={setDenB} />
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
              {op.label}
            </button>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label="Answer" value={fractionText(result)} tone="emerald" />
          <ResultCard label="Mixed number" value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label="Decimal" value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard label="Percent" value={round(mixed.decimal * 100, 4)} unit="%" tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Cross multiply", value: `${numA}×${denB} ${operation === "subtract" ? "−" : operation === "add" ? "+" : "×"} ${numB}×${denA}` },
            { label: "GCD", value: gcd(result.numerator, result.denominator) },
            { label: "Before simplifying", value: `${a.numerator * b.denominator} / ${a.denominator * b.numerator}` },
          ]}
        />
      </CalcPanel>
    );
  }

  if (variant === "simplify-fraction") {
    const simplified = simplifyFraction(num(numA), num(denA));
    const mixed = improperToMixed(simplified.numerator, simplified.denominator);
    return (
      <CalcPanel
        title="Simplify Fractions Calculator"
        subtitle="Reduce any fraction or mixed number to lowest terms."
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Numerator" value={numA} onChange={setNumA} />
          <NumberField label="Denominator" value={denA} onChange={setDenA} />
          <NumberField label="Whole number" value={wholeA} onChange={setWholeA} />
        </div>
        <ResultGrid>
          <ResultCard label="In lowest terms" value={fractionText(simplified)} tone="emerald" />
          <ResultCard label="As a mixed number" value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label="Decimal" value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard
            label="Greatest common factor"
            value={gcd(simplified.numerator * gcd(num(numA), num(denA)), simplified.denominator)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          divide numerator and denominator by their greatest common divisor (GCD). A mixed number
          is first converted to an improper fraction: {wholeA} {numA}/{denA} ={" "}
          {fractionText(mixedToImproper(num(wholeA), num(numA), num(denA)))}
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
        title="Mixed Number Calculator"
        subtitle="Work with mixed numbers, improper fractions and whole numbers."
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Whole A" value={wholeA} onChange={setWholeA} />
            <NumberField label="Num A" value={numA} onChange={setNumA} />
            <NumberField label="Den A" value={denA} onChange={setDenA} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Whole B" value={wholeB} onChange={setWholeB} />
            <NumberField label="Num B" value={numB} onChange={setNumB} />
            <NumberField label="Den B" value={denB} onChange={setDenB} />
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
              {op.label}
            </button>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label="Answer" value={fractionText(result)} tone="emerald" />
          <ResultCard label="Mixed number" value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label="Decimal" value={round(mixed.decimal, 6)} tone="slate" />
          <ResultCard label="A as improper" value={fractionText(aMixed)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          mixed to improper: (whole × denominator + numerator) ÷ denominator
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "common-denominator") {
    const n = Math.max(2, Math.min(10, Math.round(num(count) || 3)));
    const fractions: Fraction[] = Array.from({ length: n }, (_, i) => {
      const denominator = num(denA);
      const offset = i === 0 ? num(numA) : (num(numA)) + i;
      return simplifyFraction(offset, denominator);
    });
    const lcd = commonDenominator(fractions);
    const equivalents = fractions.map((f) => ({
      original: fractionText(f),
      equivalent: `${(f.numerator * lcd) / f.denominator}/${lcd}`,
      value: round(f.numerator / f.denominator, 4),
    }));
    const sorted = [...fractions].sort((x, y) => x.numerator / x.denominator - y.numerator / y.denominator);
    return (
      <CalcPanel
        title="Common Denominator Calculator"
        subtitle="Find the least common denominator of 2 to 10 fractions and rewrite them."
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="First numerator" value={numA} onChange={setNumA} />
          <NumberField label="Common denominator" value={denA} onChange={setDenA} />
          <NumberField label="How many fractions" value={count} onChange={setCount} hint="2 to 10" />
        </div>
        <ResultGrid>
          <ResultCard label="Least common denominator" value={lcd} tone="emerald" />
          <ResultCard label="Fractions" value={fractions.length} tone="slate" />
          <ResultCard label="LCM of denominators" value={fractions.reduce((acc, f) => lcm(acc, f.denominator), 1)} tone="sky" />
          <ResultCard label="Smallest value" value={round(sorted[0] ? sorted[0].numerator / sorted[0].denominator : 0, 4)} tone="slate" />
        </ResultGrid>
        <Table
          headers={["Fraction", "With LCD", "Decimal"]}
          rows={equivalents.map((e) => [e.original, e.equivalent, e.value])}
        />
        <p className="text-xs font-semibold text-slate-500">Ordered from least to greatest</p>
        <p className="font-mono text-xs text-slate-700 dark:text-slate-200">
          {sorted.map((f) => fractionText(f)).join("  <  ")}
        </p>
      </CalcPanel>
    );
  }

  if (variant === "decimal-to-fraction") {
    const fraction = decimalToFraction(decimal);
    const mixed = improperToMixed(fraction.numerator, fraction.denominator);
    return (
      <CalcPanel
        title="Decimal to Fraction Calculator"
        subtitle="Convert any decimal — including repeating ones — into a fraction in simplest form."
        icon={<Calculator className="size-5 text-sky-700" />}
      >
        <NumberField
          label="Decimal"
          value={decimal}
          onChange={setDecimal}
          hint="Repeating decimals: 0.333... or 0.3(3)"
        />
        <ResultGrid>
          <ResultCard label="Fraction" value={fractionText(fraction)} tone="emerald" />
          <ResultCard label="Mixed number" value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="sky" />
          <ResultCard label="Percent" value={round(mixed.decimal * 100, 4)} unit="%" tone="slate" />
          <ResultCard label="GCD" value={gcd(fraction.numerator, fraction.denominator)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Multiply by powers of ten until the decimal is whole, then simplify. 0.375 = 375/1000 =
          3/8.
        </FormulaNote>
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
      title="Fraction to Decimal Calculator"
      subtitle="Convert fractions and mixed numbers to decimals and percentages."
      icon={<Calculator className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Numerator" value={numA} onChange={setNumA} />
        <NumberField label="Denominator" value={denA} onChange={setDenA} />
        <NumberField label="Compare with" value={extra} onChange={setExtra} />
      </div>
      <ResultGrid>
        <ResultCard
          label="Decimal"
          value={period ? `${round(value, 6).toString()}…` : round(value, 8)}
          tone="emerald"
        />
        <ResultCard label="Percent" value={round(value * 100, 4)} unit="%" tone="sky" />
        <ResultCard label="Mixed number" value={`${mixed.whole} ${mixed.numerator}/${mixed.denominator}`} tone="slate" />
        <ResultCard label="Repeating?" value={period ? "Yes" : "No"} tone="slate" />
      </ResultGrid>
      <DetailList
        items={[
          { label: "Repeating period", value: period ? `over the ${period}` : "terminating decimal" },
          { label: "Equivalent decimal", value: round(num(extra), 4) },
          { label: "Difference", value: round(value - (num(extra)), 6) },
        ]}
      />
      <FormulaNote>
        decimal = numerator ÷ denominator. A fraction has a repeating decimal when the denominator
        has prime factors other than 2 and 5.
      </FormulaNote>
    </CalcPanel>
  );
}
