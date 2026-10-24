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
import { useTranslations } from "next-intl";

export function FitnessTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.FitnessTools");
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
    // Every row lists the 1RM implied by lifting the same weight for that many
    // reps, and that weight as a percentage of the estimated 1RM.
    const chart = Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
      const chartWeight = round(oneRepMax(value, r, formula), 1);
      return {
        reps: r,
        percent: selected > 0 ? round((chartWeight / selected) * 100, 1) : 0,
        weight: chartWeight,
      };
    });
    return (
      <CalcPanel
        title={tUi("oneRepMaxCalculator")}
        subtitle={tUi("estimateYour1RMFromAnySetOf115RepsWithTheEpleyBrzyckiAndLombardiFormulas")}
        icon={<Dumbbell className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("weightLifted")} value={weight} onChange={setWeight} hint={tUi("lbOrKg")} />
          <NumberField label={tUi("repsPerformed")} value={reps} onChange={setReps} hint={tUi("1To15")} />
          <SelectField
            label={tUi("formula")}
            value={formula}
            onChange={setFormula}
            options={[
              { value: "epley", label: tUi("epleyMostCommon") },
              { value: "brzycki", label: tUi("brzycki") },
              { value: "lombardi", label: tUi("lombardi") },
            ]}
          />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("yourEstimated1RM")} value={round(selected, 2)} tone="emerald" />
          <ResultCard label={tUi("epley")} value={round(epley, 2)} tone="sky" />
          <ResultCard label={tUi("brzycki")} value={round(brzycki, 2)} tone="slate" />
          <ResultCard label={tUi("lombardi")} value={round(lombardi, 2)} tone="slate" />
        </ResultGrid>
        <Table
          headers={[tUi("reps"), tUi("percentOf1RM"), tUi("weightForThat")]}
          rows={chart.map((row) => [row.reps, `${row.percent}%`, row.weight])}
        />
        <FormulaNote>{tUi("epleyBrzyckiAndLombardiFormulas")}</FormulaNote>
      </CalcPanel>
    );
  }

  // water-intake
  const kg = unit === "kg" ? num(bodyWeight) : (num(bodyWeight)) * 0.453592;
  const result = waterIntake(kg, num(exercise), climate);
  return (
    <CalcPanel
      title={tUi("waterIntakeCalculator")}
      subtitle={tUi("howMuchWaterToDrinkADayFromYourWeightExerciseAndClimate")}
      icon={<Droplets className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <NumberField label={tUi("bodyWeight")} value={bodyWeight} onChange={setBodyWeight} hint={tUi("kgOrLb")} />
        <SelectField
          label={tUi("unit")}
          value={unit}
          onChange={setUnit}
          options={[
            { value: "kg", label: tUi("unitKg") },
            { value: "lb", label: tUi("unitLb") },
          ]}
        />
        <NumberField label={tUi("exerciseMinDay")} value={exercise} onChange={setExercise} />
        <SelectField
          label={tUi("climate")}
          value={climate}
          onChange={setClimate}
          options={[
            { value: "temperate", label: tUi("temperate") },
            { value: "hot", label: tUi("hot") },
            { value: "very-hot", label: tUi("veryHot") },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label={tUi("waterPerDay")} value={result.litres} unit="L" tone="emerald" />
        <ResultCard label={tUi("fluidOunces")} value={result.ounces} unit="oz" tone="sky" />
        <ResultCard label={tUi("cups8Oz")} value={result.cups} tone="slate" />
        <ResultCard label={tUi("bottles169Oz")} value={result.bottles} tone="slate" />
      </ResultGrid>
      <DetailList
        items={[
          { label: tUi("baseWater", { amount: 33 }), value: `${round(kg * 0.033, 2)} L` },
          { label: tUi("exerciseTopUp"), value: `${round(((num(exercise)) / 30) * 0.35, 2)} L` },
          {
            label: tUi("climateTopUp"),
            value: climate === "temperate" ? tUi("0L") : climate === "hot" ? tUi("05L") : tUi("1L"),
          },
        ]}
      />
      <FormulaNote>{tUi("dailyWaterFormula")}</FormulaNote>
    </CalcPanel>
  );
}
