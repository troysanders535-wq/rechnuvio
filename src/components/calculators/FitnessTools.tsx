"use client";

import React, { useState } from "react";
import { Dumbbell, Droplets } from "lucide-react";
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
import { oneRepMax, waterIntake, type OneRepMaxFormula } from "./calc";

export function FitnessTools({ variant }: { variant: CalculatorVariant }) {
  const [weight, setWeight] = useState("100");
  const [reps, setReps] = useState("5");
  const [formula, setFormula] = useState<OneRepMaxFormula>("epley");
  const [bodyWeight, setBodyWeight] = useState("75");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [exercise, setExercise] = useState("30");
  const [climate, setClimate] = useState<"temperate" | "hot" | "very-hot">("temperate");

  if (variant === "one-rep-max") {
    const value = num(weight);
    const repCount = num(reps);
    const epley = oneRepMax(value, repCount, "epley");
    const brzycki = oneRepMax(value, repCount, "brzycki");
    const lombardi = oneRepMax(value, repCount, "lombardi");
    const selected = oneRepMax(value, repCount, formula);
    const chart = Array.from({ length: 10 }, (_, i) => i + 1).map((r) => ({
      reps: r,
      percent: r === 1 ? 100 : Math.round((r / repCount) * 100),
      weight: round(oneRepMax(value, r, "epley"), 1),
    }));
    return (
      <CalcPanel
        title="One Rep Max Calculator"
        subtitle="Estimate your 1RM from any set of 1–15 reps with the Epley, Brzycki and Lombardi formulas."
        icon={<Dumbbell className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Weight lifted" value={weight} onChange={setWeight} hint="lb or kg" />
          <NumberField label="Reps performed" value={reps} onChange={setReps} hint="1 to 15" />
          <SelectField
            label="Formula"
            value={formula}
            onChange={setFormula}
            options={[
              { value: "epley", label: "Epley (most common)" },
              { value: "brzycki", label: "Brzycki" },
              { value: "lombardi", label: "Lombardi" },
            ]}
          />
        </div>
        <ResultGrid>
          <ResultCard label="Your estimated 1RM" value={round(selected, 2)} tone="emerald" />
          <ResultCard label="Epley" value={round(epley, 2)} tone="sky" />
          <ResultCard label="Brzycki" value={round(brzycki, 2)} tone="slate" />
          <ResultCard label="Lombardi" value={round(lombardi, 2)} tone="slate" />
        </ResultGrid>
        <Table
          headers={["Reps", "% of 1RM", "Weight for that %"]}
          rows={chart.map((row) => [row.reps, `${row.percent}%`, row.weight])}
        />
        <FormulaNote>
          Epley: weight × (1 + reps ÷ 30) · Brzycki: weight × 36 ÷ (37 − reps) · Lombardi: weight ×
          reps^0.1. Epley and Brzycki are the most accurate for sets of 10 reps or fewer.
        </FormulaNote>
      </CalcPanel>
    );
  }

  // water-intake
  const kg = unit === "kg" ? num(bodyWeight) : (num(bodyWeight)) * 0.453592;
  const result = waterIntake(kg, num(exercise), climate);
  return (
    <CalcPanel
      title="Water Intake Calculator"
      subtitle="How much water to drink a day from your weight, exercise and climate."
      icon={<Droplets className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <NumberField label="Body weight" value={bodyWeight} onChange={setBodyWeight} hint="kg or lb" />
        <SelectField
          label="Unit"
          value={unit}
          onChange={setUnit}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lb" },
          ]}
        />
        <NumberField label="Exercise (min/day)" value={exercise} onChange={setExercise} />
        <SelectField
          label="Climate"
          value={climate}
          onChange={setClimate}
          options={[
            { value: "temperate", label: "Temperate" },
            { value: "hot", label: "Hot" },
            { value: "very-hot", label: "Very hot" },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label="Water per day" value={result.litres} unit="L" tone="emerald" />
        <ResultCard label="Fluid ounces" value={result.ounces} unit="oz" tone="sky" />
        <ResultCard label="Cups (8 oz)" value={result.cups} tone="slate" />
        <ResultCard label="Bottles (16.9 oz)" value={result.bottles} tone="slate" />
      </ResultGrid>
      <DetailList
        items={[
          { label: "Base (33 ml per kg)", value: `${round(kg * 0.033, 2)} L` },
          { label: "Exercise top-up", value: `${round(((num(exercise)) / 30) * 0.35, 2)} L` },
          { label: "Climate top-up", value: climate === "temperate" ? "0 L" : climate === "hot" ? "0.5 L" : "1 L" },
        ]}
      />
      <FormulaNote>
        Daily water = (weight in kg × 33 ml) + 350 ml per 30 minutes of exercise + a climate
        allowance of 0.5–1 L in hot weather.
      </FormulaNote>
    </CalcPanel>
  );
}
