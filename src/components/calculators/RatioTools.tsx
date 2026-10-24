"use client";

import React, { useState } from "react";
import { Scale } from "lucide-react";
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
import { heightForRatioWidth, simplifyRatio, solveRatio, splitByRatio } from "./calc";
import { useTranslations } from "next-intl";

export function RatioTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.RatioTools");
  const [a, setA] = useState("24");
  const [b, setB] = useState("36");
  const [c, setC] = useState("8");
  const [total, setTotal] = useState("500");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");

  const numA = num(a);
  const numB = num(b);
  const numC = num(c);
  const simplified = simplifyRatio(numA, numB);
  const solved = solveRatio(numA, numB, numC);
  const split = splitByRatio(num(total), numA, numB);
  // Resizing keeps the ratio: the height follows the width.
  const resizedWidth = num(width);
  const resizedHeight = heightForRatioWidth(numA, numB, resizedWidth);
  const originalHeight = num(height);

  return (
    <CalcPanel
      title={tUi("ratioCalculator")}
      subtitle={tUi("simplifyRatiosSolveABCOrSplitATotalAndResizeWhileKeepingTheAspectRatio")}
      icon={<Scale className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="A" value={a} onChange={setA} />
        <NumberField label="B" value={b} onChange={setB} />
        <NumberField label={tUi("valueCForABC")} value={c} onChange={setC} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label={tUi("totalToSplit")} value={total} onChange={setTotal} />
        <NumberField label={tUi("originalWidth")} value={width} onChange={setWidth} />
        <NumberField label={tUi("originalHeight")} value={height} onChange={setHeight} />
      </div>

      <ResultGrid>
        <ResultCard label={tUi("simplifiedRatio")} value={`${simplified.a} : ${simplified.b}`} tone="emerald" />
        <ResultCard label={tUi("commonFactor")} value={simplified.factor} tone="sky" />
        <ResultCard label={tUi("solveLabel")} value={round(solved, 6)} tone="amber" />
        <ResultCard label={tUi("ratioAsDecimal")} value={round(numB === 0 ? 0 : numA / numB, 6)} tone="slate" />
      </ResultGrid>

      <ResultGrid>
        <ResultCard label={tUi("part", { count: numA })} value={round(split.first, 4)} tone="slate" />
        <ResultCard label={tUi("part", { count: numB })} value={round(split.second, 4)} tone="slate" />
        <ResultCard
          label={tUi("resizedWidth")}
          value={round(resizedWidth, 2)}
          tone="sky"
        />
        <ResultCard
          label={tUi("resizedHeight")}
          value={round(resizedHeight, 2)}
          tone="sky"
        />
      </ResultGrid>

      <DetailList
        items={[
          { label: tUi("working"), value: `${a} : ${b} ÷ ${simplified.factor} = ${simplified.a} : ${simplified.b}` },
          { label: tUi("solve"), value: `? = (${b} × ${c}) ÷ ${a}` },
          { label: tUi("split"), value: `${total} × ${numA}/${numA + numB} and ${total} × ${numB}/${numA + numB}` },
          { label: tUi("resize"), value: `${width} × (${b} ÷ ${a}) = ${round(resizedHeight, 2)}` },
          { label: tUi("heightChange"), value: round(resizedHeight - originalHeight, 2) },
        ]}
      />

      <FormulaNote>
        {tUi("simplifySolveSplitResizeFormulaNote")}
      </FormulaNote>
    </CalcPanel>
  );
}
