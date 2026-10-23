"use client";

import React, { useState } from "react";
import { Hammer, Ruler, Layers, Sparkles } from "lucide-react";

interface ConstructionDiyEngineProps {
  slug: string;
}

export function ConstructionDiyEngine({ slug }: ConstructionDiyEngineProps) {
  const isConcrete = slug.includes("concrete") || slug.includes("gravel") || slug.includes("mulch");
  const isTile = slug.includes("tile");
  const isPaint = slug.includes("paint");

  // Concrete state
  const [lengthFt, setLengthFt] = useState(10);
  const [widthFt, setWidthFt] = useState(10);
  const [depthIn, setDepthIn] = useState(4);

  // Tile state
  const [roomLength, setRoomLength] = useState(12);
  const [roomWidth, setRoomWidth] = useState(15);
  const [wasteMargin, setWasteMargin] = useState(10);

  // Concrete calculations
  const cubicFeet = lengthFt * widthFt * (depthIn / 12);
  const cubicYards = (cubicFeet / 27).toFixed(2);
  const bags60 = Math.ceil(cubicFeet / 0.45);
  const bags80 = Math.ceil(cubicFeet / 0.6);

  // Tile calculations
  const baseSqFt = roomLength * roomWidth;
  const totalSqFtWithWaste = Math.ceil(baseSqFt * (1 + wasteMargin / 100));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Hammer className="size-5 text-sky-700" />
        {isConcrete ? "Concrete & Slab Volume Calculator" : "Square Footage & Tile Estimator"}
      </h3>

      {isConcrete ? (
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Length (Feet)
              </label>
              <input
                type="number"
                value={lengthFt}
                onChange={(e) => setLengthFt(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Width (Feet)
              </label>
              <input
                type="number"
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thickness / Depth (Inches)
              </label>
              <input
                type="number"
                value={depthIn}
                onChange={(e) => setDepthIn(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-950/40">
              <span className="text-3xl font-extrabold text-sky-800 dark:text-sky-300">
                {cubicYards}
              </span>
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                Cubic Yards (Ready-Mix)
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {bags60}
              </span>
              <p className="mt-1 text-xs text-slate-500">60 lb Pre-Mix Bags</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {bags80}
              </span>
              <p className="mt-1 text-xs text-slate-500">80 lb Pre-Mix Bags</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Room Length (Feet)
              </label>
              <input
                type="number"
                value={roomLength}
                onChange={(e) => setRoomLength(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Room Width (Feet)
              </label>
              <input
                type="number"
                value={roomWidth}
                onChange={(e) => setRoomWidth(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wastage Margin (%)
              </label>
              <input
                type="number"
                value={wasteMargin}
                onChange={(e) => setWasteMargin(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {baseSqFt} sq ft
              </span>
              <p className="mt-1 text-xs text-slate-500">Exact Floor Area</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
              <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {totalSqFtWithWaste} sq ft
              </span>
              <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Recommended to Purchase (+{wasteMargin}% Waste)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
