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
import { simplifyRatio, solveRatio, splitByRatio } from "./calc";

export function RatioTools({ variant }: { variant: CalculatorVariant }) {
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
  const scale = numA === 0 ? 0 : (num(width)) / numA;

  return (
    <CalcPanel
      title="Ratio Calculator"
      subtitle="Simplify ratios, solve A : B = C : ?, split a total and resize while keeping the aspect ratio."
      icon={<Scale className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="A" value={a} onChange={setA} />
        <NumberField label="B" value={b} onChange={setB} />
        <NumberField label="C (for A : B = C : ?)" value={c} onChange={setC} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Total to split" value={total} onChange={setTotal} />
        <NumberField label="Original width" value={width} onChange={setWidth} />
        <NumberField label="Original height" value={height} onChange={setHeight} />
      </div>

      <ResultGrid>
        <ResultCard label="Simplified ratio" value={`${simplified.a} : ${simplified.b}`} tone="emerald" />
        <ResultCard label="Common factor" value={simplified.factor} tone="sky" />
        <ResultCard label="Solve A:B = C:?" value={round(solved, 6)} tone="amber" />
        <ResultCard label="Ratio as decimal" value={round(numB === 0 ? 0 : numA / numB, 6)} tone="slate" />
      </ResultGrid>

      <ResultGrid>
        <ResultCard label={`${numA} part`} value={round(split.first, 4)} tone="slate" />
        <ResultCard label={`${numB} part`} value={round(split.second, 4)} tone="slate" />
        <ResultCard
          label="Resized width"
          value={round((num(width)) * scale, 2)}
          tone="sky"
        />
        <ResultCard
          label="Resized height"
          value={round((num(height)) * scale, 2)}
          tone="sky"
        />
      </ResultGrid>

      <DetailList
        items={[
          { label: "Working", value: `${a} : ${b} ÷ ${simplified.factor} = ${simplified.a} : ${simplified.b}` },
          { label: "Solve", value: `? = (${b} × ${c}) ÷ ${a}` },
          { label: "Split", value: `${total} × ${numA}/${numA + numB} and ${total} × ${numB}/${numA + numB}` },
        ]}
      />

      <FormulaNote>
        Simplify: divide both sides by the GCD. Solve: ? = (B × C) ÷ A. Split: total × A/(A+B).
      </FormulaNote>
    </CalcPanel>
  );
}
