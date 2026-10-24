"use client";

import React, { useState } from "react";
import { Percent } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
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
  const tUi = useTranslations("ui.calculators.PercentTools");
  const [a, setA] = useState("15");
  const [b, setB] = useState("250");
  const [c, setC] = useState("40");

  const numA = num(a);
  const numB = num(b);
  const numC = num(c);

  if (variant === "percent") {
    return (
      <CalcPanel
        title={tUi("percentageCalculator")}
        subtitle={tUi("xOfYWhatPercentXIsOfYPercentageChangeAndTheWholeFromAPart")}
        icon={<Percent className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("percent")} value={a} onChange={setA} />
          <NumberField label={tUi("value")} value={b} onChange={setB} />
          <NumberField label={tUi("targetPercent")} value={c} onChange={setC} />
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
            label={tUi("wholeFromPercentOf", { percent: a, value: numB })}
            value={round(wholeFromPart(numB, numA), 4)}
            tone="slate"
          />
        </ResultGrid>

        <DetailList
          items={[
            { label: tUi("changeFromAToB"), value: `${round(percentChange(numA, numB), 4)}%` },
            { label: tUi("excelFormula"), value: "=A/100*B" },
            { label: tUi("whatPercent"), value: "=A/B*100" },
          ]}
        />

        <FormulaNote>{tUi("percentOfWhatPercentAndWholeFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-change") {
    const change = percentChange(numA, numB);
    const points = numB - numA;
    return (
      <CalcPanel
        title={tUi("percentageChangeCalculator")}
        subtitle={tUi("percentageChangeBetweenAnOldAndANewValue")}
        icon={<Percent className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("oldValue")} value={a} onChange={setA} />
          <NumberField label={tUi("newValue")} value={b} onChange={setB} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("percentageChange")} value={round(change, 4)} unit="%" tone="emerald" />
          <ResultCard
          label={tUi("direction")}
          value={change > 0 ? tUi("increase") : change < 0 ? tUi("decrease") : tUi("noChange")}
          tone="slate"
        />
          <ResultCard label={tUi("difference")} value={round(points, 4)} tone="slate" />
          <ResultCard label={tUi("percentagePoints")} value={round(points, 4)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("working"), value: `((${b} − ${a}) ÷ |${a}|) × 100 = ${round(change, 4)}%` },
            { label: tUi("excelFormula"), value: "=(B2-A2)/ABS(A2)" },
          ]}
        />
        <FormulaNote>
          {tUi("percentageChangeAndPointsFormulaNote", { points: String(round(points, 4)) })}
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-increase") {
    const increase = percentChange(numA, numB);
    return (
      <CalcPanel
        title={tUi("percentageIncreaseCalculator")}
        subtitle={tUi("increaseANumberByAPercentOrFindTheOriginalValue")}
        icon={<Percent className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("originalValue")} value={a} onChange={setA} />
          <NumberField label={tUi("newValue")} value={b} onChange={setB} />
          <NumberField label={tUi("percent")} value={c} onChange={setC} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("percentageIncrease")} value={round(increase, 4)} unit="%" tone="emerald" />
          <ResultCard label={tUi("amountAdded")} value={round(numB - numA, 4)} tone="slate" />
          <ResultCard
            label={`${a} + ${c}%`}
            value={round(numA * (1 + numC / 100), 4)}
            tone="sky"
          />
          <ResultCard
            label={tUi("originalFromNew")}
            value={round(numB / (1 + increase / 100 || 1), 4)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("percentageIncreaseFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "percent-decrease") {
    // The decrease is measured against the value BEFORE the decrease.
    const decrease = numA === 0 ? 0 : ((numA - numB) / Math.abs(numA)) * 100;
    return (
      <CalcPanel
        title={tUi("percentageDecreaseCalculator")}
        subtitle={tUi("reduceANumberByAPercentOrFindTheValueBeforeADecrease")}
        icon={<Percent className="size-5 text-rose-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("valueBeforeDecrease")} value={a} onChange={setA} />
          <NumberField label={tUi("valueAfterDecrease")} value={b} onChange={setB} />
          <NumberField label={tUi("percent")} value={c} onChange={setC} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("percentageDecrease")} value={round(decrease, 4)} unit="%" tone="amber" />
          <ResultCard label={tUi("amountRemoved")} value={round(numA - numB, 4)} tone="slate" />
          <ResultCard
            label={`${a} − ${c}%`}
            value={round(numA * (1 - numC / 100), 4)}
            tone="sky"
          />
          <ResultCard
            label={tUi("valueBeforeTheDecrease")}
            value={round(numB / (1 - decrease / 100 || 1), 4)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("percentageDecreaseFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  // percent-difference
  return (
    <CalcPanel
      title={tUi("percentageDifferenceCalculator")}
      subtitle={tUi("usesTheAverageOfTheTwoNumbersAsTheReferenceIdealForComparingUnlikeValues")}
      icon={<Percent className="size-5 text-violet-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label={tUi("valueA")} value={a} onChange={setA} />
        <NumberField label={tUi("valueB")} value={b} onChange={setB} />
      </div>
      <ResultGrid>
        <ResultCard
          label={tUi("percentageDifference")}
          value={round(percentDifference(numA, numB), 4)}
          unit="%"
          tone="emerald"
        />
        <ResultCard label={tUi("absoluteDifference")} value={round(Math.abs(numA - numB), 4)} tone="slate" />
        <ResultCard label={tUi("averageOfAAndB")} value={round((numA + numB) / 2, 4)} tone="slate" />
        <ResultCard
          label={tUi("percentageChangeAB")}
          value={round(percentChange(numA, numB), 4)}
          unit="%"
          tone="slate"
        />
      </ResultGrid>
      <DetailList
        items={[
          {
            label: tUi("working"),
            value: `(|${a} − ${b}| ÷ ((${a} + ${b}) ÷ 2)) × 100`,
          },
          { label: tUi("excelFormula"), value: "=ABS(A2-B2)/((A2+B2)/2)" },
        ]}
      />
      <FormulaNote>{tUi("percentageDifferenceVersusChangeFormulaNote")}</FormulaNote>
    </CalcPanel>
  );
}
