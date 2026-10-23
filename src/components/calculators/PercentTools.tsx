"use client";

import React, { useState } from "react";
import { Percent } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  num,
  round,
} from "./shared";
import {
  percentChange,
  percentDifference,
  percentOf,
  whatPercent,
  wholeFromPart,
} from "./calc";

export function PercentTools({ variant }: { variant: CalculatorVariant }) {
  const [a, setA] = useState("15");
  const [b, setB] = useState("250");
  const [c, setC] = useState("40");

  const numA = num(a);
  const numB = num(b);
  const numC = num(c);

  if (variant === "percent") {
    return (
      <CalcPanel
        title="Percentage Calculator"
        subtitle="X% of Y, what percent X is of Y, percentage change and the whole from a part."
        icon={<Percent className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Percent (%)" value={a} onChange={setA} />
          <NumberField label="Value" value={b} onChange={setB} />
          <NumberField label="Target percent (%)" value={c} onChange={setC} />
        </div>

        <ResultGrid>
          <ResultCard
            label={`${a}% of ${b}`}
            value={round(percentOf(numA, numB), 4)}
            tone="emerald"
          />
          <ResultCard
            label={`${a} is what % of ${b}`}
            value={round(whatPercent(numA, numB), 4)}
            unit="%"
          />
          <ResultCard
            label={`${a} is what % of ${c}`}
            value={round(whatPercent(numA, numC), 4)}
            unit="%"
          />
          <ResultCard
            label={`Whole from ${a}% of ${numB}`}
            value={round(wholeFromPart(numB, numA), 4)}
            tone="slate"
          />
        </ResultGrid>

        <DetailList
          items={[
            { label: "Change from A to B", value: `${round(percentChange(numA, numB), 4)}%` },
            { label: "Excel formula", value: "=A/100*B" },
            { label: "What percent", value: "=A/B*100" },
          ]}
        />

        <FormulaNote>
          percent of = (percent ÷ 100) × value · what percent = (part ÷ whole) × 100 · whole
          from part = (part ÷ percent) × 100
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-change") {
    const change = percentChange(numA, numB);
    const points = numB - numA;
    return (
      <CalcPanel
        title="Percentage Change Calculator"
        subtitle="Percentage change between an old and a new value."
        icon={<Percent className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Old value" value={a} onChange={setA} />
          <NumberField label="New value" value={b} onChange={setB} />
        </div>
        <ResultGrid>
          <ResultCard label="Percentage change" value={round(change, 4)} unit="%" tone="emerald" />
          <ResultCard label="Direction" value={change > 0 ? "Increase" : change < 0 ? "Decrease" : "No change"} tone="slate" />
          <ResultCard label="Difference" value={round(points, 4)} tone="slate" />
          <ResultCard label="Percentage points" value={round(points, 4)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Working", value: `((${b} − ${a}) ÷ |${a}|) × 100 = ${round(change, 4)}%` },
            { label: "Excel formula", value: "=(B2-A2)/ABS(A2)" },
          ]}
        />
        <FormulaNote>
          Percentage change compares two values relative to the starting value. Percentage points
          compare two percentages directly ({round(points, 4)} points here).
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-increase") {
    const increase = percentChange(numA, numB);
    return (
      <CalcPanel
        title="Percentage Increase Calculator"
        subtitle="Increase a number by a percent, or find the original value."
        icon={<Percent className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Original value" value={a} onChange={setA} />
          <NumberField label="New value" value={b} onChange={setB} />
        </div>
        <ResultGrid>
          <ResultCard label="Percentage increase" value={round(increase, 4)} unit="%" tone="emerald" />
          <ResultCard label="Amount added" value={round(numB - numA, 4)} tone="slate" />
          <ResultCard
            label={`${a} + ${c}%`}
            value={round(numA * (1 + numC / 100), 4)}
            tone="sky"
          />
          <ResultCard
            label="Original from new"
            value={round(wholeFromPart(numB, numA === 0 ? 0 : numA + increase), 4)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          percentage increase = ((new − old) ÷ old) × 100 · increased value = old × (1 + percent ÷
          100)
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-decrease") {
    const decrease = percentChange(numB, numA);
    return (
      <CalcPanel
        title="Percentage Decrease Calculator"
        subtitle="Reduce a number by a percent, or find the value before a decrease."
        icon={<Percent className="size-5 text-rose-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Value before decrease" value={a} onChange={setA} />
          <NumberField label="Value after decrease" value={b} onChange={setB} />
        </div>
        <ResultGrid>
          <ResultCard label="Percentage decrease" value={round(decrease, 4)} unit="%" tone="amber" />
          <ResultCard label="Amount removed" value={round(numA - numB, 4)} tone="slate" />
          <ResultCard
            label={`${a} − ${c}%`}
            value={round(numA * (1 - numC / 100), 4)}
            tone="sky"
          />
          <ResultCard
            label="Value before the decrease"
            value={round(numB / (1 - decrease / 100 || 1), 4)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          percentage decrease = ((before − after) ÷ before) × 100 · reduced value = before × (1 −
          percent ÷ 100)
        </FormulaNote>
      </CalcPanel>
    );
  }

  // percent-difference
  return (
    <CalcPanel
      title="Percentage Difference Calculator"
      subtitle="Uses the average of the two numbers as the reference — ideal for comparing unlike values."
      icon={<Percent className="size-5 text-violet-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Value A" value={a} onChange={setA} />
        <NumberField label="Value B" value={b} onChange={setB} />
      </div>
      <ResultGrid>
        <ResultCard
          label="Percentage difference"
          value={round(percentDifference(numA, numB), 4)}
          unit="%"
          tone="emerald"
        />
        <ResultCard label="Absolute difference" value={round(Math.abs(numA - numB), 4)} tone="slate" />
        <ResultCard label="Average of A and B" value={round((numA + numB) / 2, 4)} tone="slate" />
        <ResultCard
          label="Percentage change (A → B)"
          value={round(percentChange(numA, numB), 4)}
          unit="%"
          tone="slate"
        />
      </ResultGrid>
      <DetailList
        items={[
          {
            label: "Working",
            value: `(|${a} − ${b}| ÷ ((${a} + ${b}) ÷ 2)) × 100`,
          },
          { label: "Excel formula", value: "=ABS(A2-B2)/((A2+B2)/2)" },
        ]}
      />
      <FormulaNote>
        Use percentage difference when the two numbers have no meaningful order (percentages of two
        different populations). Use percentage change when one value is the starting point.
      </FormulaNote>
    </CalcPanel>
  );
}
