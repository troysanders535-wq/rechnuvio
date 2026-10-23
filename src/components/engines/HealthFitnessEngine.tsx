"use client";

import React, { useState } from "react";
import { Activity, Heart, Droplets, Dumbbell, Sparkles } from "lucide-react";

interface HealthFitnessEngineProps {
  slug: string;
}

export function HealthFitnessEngine({ slug }: HealthFitnessEngineProps) {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState(28);
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(178);
  const [weightLbs, setWeightLbs] = useState(165);
  const [heightIn, setHeightIn] = useState(70);
  const [activity, setActivity] = useState(1.55); // Moderate activity

  // BMI calculation
  let bmi = 0;
  if (unit === "metric") {
    const hM = heightCm / 100;
    bmi = hM > 0 ? weightKg / (hM * hM) : 0;
  } else {
    bmi = heightIn > 0 ? (weightLbs / (heightIn * heightIn)) * 703 : 0;
  }

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: "Underweight", color: "text-amber-500" };
    if (val < 25) return { label: "Normal Weight (Healthy)", color: "text-emerald-500" };
    if (val < 30) return { label: "Overweight", color: "text-amber-600" };
    return { label: "Obese", color: "text-rose-500" };
  };

  const bmiCat = getBmiCategory(bmi);

  // BMR calculation (Mifflin-St Jeor)
  const actualWeightKg = unit === "metric" ? weightKg : weightLbs * 0.453592;
  const actualHeightCm = unit === "metric" ? heightCm : heightIn * 2.54;
  let bmr = 10 * actualWeightKg + 6.25 * actualHeightCm - 5 * age;
  bmr = gender === "male" ? bmr + 5 : bmr - 161;
  const tdee = Math.round(bmr * activity);

  // Macros
  const proteinG = Math.round(actualWeightKg * 2.0);
  const fatG = Math.round((tdee * 0.25) / 9);
  const carbG = Math.max(0, Math.round((tdee - (proteinG * 4 + fatG * 9)) / 4));
  const waterLiters = (actualWeightKg * 0.035).toFixed(1);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="size-5 text-sky-700" />
          Body Composition & Calorie Suite
        </h3>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setUnit("metric")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              unit === "metric" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Metric (kg/cm)
          </button>
          <button
            onClick={() => setUnit("imperial")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              unit === "imperial" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Imperial (lbs/in)
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Biological Sex
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Weight ({unit === "metric" ? "kg" : "lbs"})
          </label>
          <input
            type="number"
            value={unit === "metric" ? weightKg : weightLbs}
            onChange={(e) =>
              unit === "metric"
                ? setWeightKg(Number(e.target.value))
                : setWeightLbs(Number(e.target.value))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Height ({unit === "metric" ? "cm" : "inches"})
          </label>
          <input
            type="number"
            value={unit === "metric" ? heightCm : heightIn}
            onChange={(e) =>
              unit === "metric"
                ? setHeightCm(Number(e.target.value))
                : setHeightIn(Number(e.target.value))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40">
          <span className="text-3xl font-extrabold text-sky-800 dark:text-sky-300">
            {bmi.toFixed(1)}
          </span>
          <p className={`mt-1 text-xs font-bold ${bmiCat.color}`}>{bmiCat.label}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {tdee}
          </span>
          <p className="mt-1 text-xs text-slate-500">TDEE Calories/day</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {proteinG}g
          </span>
          <p className="mt-1 text-xs text-slate-500">Target Protein</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {waterLiters} L
          </span>
          <p className="mt-1 text-xs text-slate-500">Water / Day</p>
        </div>
      </div>
    </div>
  );
}
