"use client";

import React, { useState } from "react";
import { Activity, Heart, Droplets, Dumbbell, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface HealthFitnessEngineProps {
  slug: string;
}

/**
 * Every slug of the health-fitness engine is served by one workspace, but the
 * workspace now shows exactly the figure the tool is named after: the body
 * mass index for the BMI tools, the basal metabolic rate for the BMR tool, the
 * maintenance calories for the TDEE tools, the protein target for the protein
 * tool, the carbohydrate target for the carbohydrate tool and the three macro
 * targets for the macro tool.
 */
type Mode = "bmi" | "bmr" | "tdee" | "protein" | "carb" | "macro";

const MODE_BY_SLUG: Record<string, Mode> = {
  "bmi-calculator": "bmi",
  "adult-bmi-calculator": "bmi",
  "bmi-calculator-for-women": "bmi",
  "bmr-calculator": "bmr",
  "tdee-calculator": "tdee",
  "maintenance-calorie-calculator": "tdee",
  "protein-calculator": "protein",
  "carb-calculator": "carb",
  "macro-calculator": "macro",
};

/** The activity levels of the Mifflin-St Jeor / Harris-Benedict activity factor. */
const ACTIVITY_LEVELS = [
  { id: "sedentary", factor: 1.2 },
  { id: "light", factor: 1.375 },
  { id: "moderate", factor: 1.55 },
  { id: "active", factor: 1.725 },
  { id: "veryActive", factor: 1.9 },
] as const;

export function HealthFitnessEngine({ slug }: HealthFitnessEngineProps) {
  const tUi = useTranslations("ui.engines.HealthFitnessEngine");
  const mode: Mode = MODE_BY_SLUG[slug] ?? "bmi";

  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState(28);
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(178);
  const [weightLbs, setWeightLbs] = useState(165);
  const [heightIn, setHeightIn] = useState(70);
  const [activityId, setActivityId] = useState<string>("moderate");

  const activity =
    ACTIVITY_LEVELS.find((level) => level.id === activityId) ?? ACTIVITY_LEVELS[2];

  // BMI calculation (WHO): weight in kg / height in m squared.
  let bmi = 0;
  if (unit === "metric") {
    const hM = heightCm / 100;
    bmi = hM > 0 ? weightKg / (hM * hM) : 0;
  } else {
    bmi = heightIn > 0 ? (weightLbs / (heightIn * heightIn)) * 703 : 0;
  }

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: tUi("underweight"), color: "text-amber-500" };
    if (val < 25) return { label: tUi("normalWeightHealthy"), color: "text-emerald-500" };
    if (val < 30) return { label: tUi("overweight"), color: "text-amber-600" };
    return { label: tUi("obese"), color: "text-rose-500" };
  };

  const bmiCat = getBmiCategory(bmi);

  // Mifflin-St Jeor (Am. J. Clin. Nutr. 52, 1990).
  const actualWeightKg = unit === "metric" ? weightKg : weightLbs * 0.453592;
  const actualHeightCm = unit === "metric" ? heightCm : heightIn * 2.54;
  let bmr = 10 * actualWeightKg + 6.25 * actualHeightCm - 5 * age;
  bmr = gender === "male" ? bmr + 5 : bmr - 161;
  const bmrRounded = Math.round(bmr);
  const tdee = Math.round(bmr * activity.factor);

  // Macro split: 2 g of protein per kg of body weight, 25 % of the calories as
  // fat, the rest as carbohydrates.
  const proteinG = Math.round(actualWeightKg * 2.0);
  const fatG = Math.round((tdee * 0.25) / 9);
  const carbG = Math.max(0, Math.round((tdee - (proteinG * 4 + fatG * 9)) / 4));
  const waterLiters = (actualWeightKg * 0.035).toFixed(1);

  const show = (what: Mode) => mode === what;

  const cards: React.ReactNode[] = [];

  if (show("bmi")) {
    cards.push(
      <div
        key="bmi"
        className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40"
      >
        <span className="text-3xl font-extrabold text-sky-800 dark:text-sky-300">
          {bmi.toFixed(1)}
        </span>
        <p className={`mt-1 text-xs font-bold ${bmiCat.color}`}>{bmiCat.label}</p>
      </div>,
    );
  }

  if (show("bmr")) {
    cards.push(
      <div key="bmr" className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {bmrRounded}
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("bmrCaloriesDay")}</p>
      </div>,
    );
  }

  if (show("tdee")) {
    cards.push(
      <div key="tdee" className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {tdee}
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("tDEECaloriesDay")}</p>
      </div>,
    );
  }

  if (show("protein")) {
    cards.push(
      <div
        key="protein"
        className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"
      >
        <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
          {proteinG}g
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("targetProtein")}</p>
      </div>,
    );
  }

  if (show("carb")) {
    cards.push(
      <div key="carb" className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
        <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
          {carbG}g
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("targetCarbs")}</p>
      </div>,
    );
  }

  if (show("macro")) {
    cards.push(
      <div
        key="macro-protein"
        className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"
      >
        <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
          {proteinG}g
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("targetProtein")}</p>
      </div>,
      <div key="macro-carb" className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
        <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
          {carbG}g
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("targetCarbs")}</p>
      </div>,
      <div key="macro-fat" className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
        <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
          {fatG}g
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("targetFat")}</p>
      </div>,
    );
  }

  const showActivity = mode === "tdee" || mode === "bmr" || mode === "macro" || mode === "carb";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="size-5 text-sky-700" />
          {tUi("bodyCompositionCalorieSuite")}
        </h3>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setUnit("metric")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              unit === "metric" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {tUi("metricKgCm")}
          </button>
          <button
            onClick={() => setUnit("imperial")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              unit === "imperial" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {tUi("imperialLbsIn")}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("biologicalSex")}
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="male">{tUi("male")}</option>
            <option value="female">{tUi("female")}</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tUi("age")}</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("weight")}{unit === "metric" ? "kg" : "lbs"}
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
            {tUi("height")}{unit === "metric" ? "cm" : tUi("inches")}
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

      {showActivity ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("activityLevel")}
            </label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {tUi(`activity_${level.id}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {/* Results Dashboard */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">{cards}</div>
    </div>
  );
}
