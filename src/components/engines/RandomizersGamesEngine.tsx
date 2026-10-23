"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Dices, Disc, RefreshCw, Trophy } from "lucide-react";

interface RandomizersGamesEngineProps {
  slug: string;
}

export function RandomizersGamesEngine({ slug }: RandomizersGamesEngineProps) {
  const isCoin = slug.includes("coin") || slug.includes("heads");
  const isDice = slug.includes("dice") || slug.includes("d20");

  // Wheel state
  const [names, setNames] = useState([
    "Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona", "George"
  ]);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentAngleRef = useRef(0);

  // Coin state
  const [coinResult, setCoinResult] = useState<"HEADS" | "TAILS" | null>("HEADS");
  const [isFlipping, setIsFlipping] = useState(false);

  // Dice state
  const [diceVal, setDiceVal] = useState(6);
  const [diceSides, setDiceSides] = useState(6);

  // Draw wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numSlices = names.length;
    if (numSlices === 0) return;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = [
      "#0284c7", "#0ea5e9", "#38bdf8", "#0369a1", "#075985",
      "#0d9488", "#14b8a6", "#2dd4bf", "#6366f1", "#8b5cf6"
    ];

    for (let i = 0; i < numSlices; i++) {
      const start = angle + i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(names[i], radius - 20, 5);
      ctx.restore();
    }

    // Center pin
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top indicator needle
    ctx.beginPath();
    ctx.moveTo(centerX, 2);
    ctx.lineTo(centerX - 10, 22);
    ctx.lineTo(centerX + 10, 22);
    ctx.closePath();
    ctx.fillStyle = "#f43f5e";
    ctx.fill();
  };

  useEffect(() => {
    if (!isCoin && !isDice) {
      drawWheel(currentAngleRef.current);
    }
  }, [names, isCoin, isDice]);

  const spinWheel = () => {
    if (isSpinning || names.length === 0) return;
    setIsSpinning(true);
    setSelectedWinner(null);

    const extraSpins = 5 + Math.random() * 5;
    const spinDuration = 3500;
    const startTime = performance.now();
    const startAngle = currentAngleRef.current;
    const totalRotation = extraSpins * 2 * Math.PI + Math.random() * 2 * Math.PI;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const angle = startAngle + totalRotation * ease;
      currentAngleRef.current = angle;
      drawWheel(angle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Determine winner
        const normalized = (2 * Math.PI - (angle % (2 * Math.PI))) % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / names.length;
        // Needle points to top (3*PI / 2)
        const needleAngle = (3 * Math.PI / 2) % (2 * Math.PI);
        const target = (needleAngle - (angle % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI);
        const winnerIdx = Math.floor(target / sliceAngle) % names.length;
        setSelectedWinner(names[winnerIdx]);
      }
    };
    requestAnimationFrame(animate);
  };

  const flipCoin = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setCoinResult(Math.random() > 0.5 ? "HEADS" : "TAILS");
      setIsFlipping(false);
    }, 600);
  };

  const rollDice = () => {
    setDiceVal(Math.floor(Math.random() * diceSides) + 1);
  };

  if (isCoin) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Coin Flip Simulator (Heads or Tails)
        </h3>
        <div className="my-8 flex justify-center">
          <div
            className={`grid size-36 place-items-center rounded-full border-4 border-amber-500 bg-amber-400 font-extrabold text-2xl text-amber-950 shadow-xl transition-transform ${
              isFlipping ? "animate-spin" : ""
            }`}
          >
            {coinResult}
          </div>
        </div>
        <button
          onClick={flipCoin}
          disabled={isFlipping}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          <span>Flip Coin Again</span>
        </button>
      </div>
    );
  }

  if (isDice) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <Dices className="size-5 text-sky-700" /> Dice Roller (d6 & d20)
        </h3>
        <div className="mt-4 flex justify-center gap-2">
          {[6, 12, 20, 100].map((sides) => (
            <button
              key={sides}
              onClick={() => {
                setDiceSides(sides);
                setDiceVal(Math.floor(Math.random() * sides) + 1);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                diceSides === sides
                  ? "bg-sky-800 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              d{sides}
            </button>
          ))}
        </div>
        <div className="my-8 flex justify-center">
          <div className="grid size-28 place-items-center rounded-2xl border-2 border-slate-700 bg-slate-950 font-mono text-5xl font-extrabold text-emerald-400 shadow-xl">
            {diceVal}
          </div>
        </div>
        <button
          onClick={rollDice}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <RefreshCw className="size-4" />
          <span>Roll Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Disc className="size-5 text-sky-700" />
        Wheel of Names & Random Winner Picker
      </h3>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="rounded-full shadow-lg"
          />
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-800 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            <span>{isSpinning ? "Spinning..." : "SPIN THE WHEEL!"}</span>
          </button>

          {selectedWinner && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-bounce">
              <Trophy className="size-4 text-amber-500" />
              <span>Winner: {selectedWinner}!</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Names / Items (one per line)
          </label>
          <textarea
            value={names.join("\n")}
            onChange={(e) =>
              setNames(
                e.target.value
                  .split("\n")
                  .map((n) => n.trim())
                  .filter(Boolean)
              )
            }
            rows={10}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">
            {names.length} candidate(s) loaded into wheel.
          </p>
        </div>
      </div>
    </div>
  );
}
