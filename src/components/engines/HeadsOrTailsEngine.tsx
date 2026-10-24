"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  History,
  BarChart3,
  Flame,
  CheckCircle2,
  HelpCircle,
  Dices,
  RefreshCw
} from "lucide-react";

type CoinSide = "HEADS" | "TAILS";
type SeriesMode = "single" | "bo3" | "bo5" | "bo7";

interface FlipRecord {
  id: number;
  result: CoinSide;
  timestamp: string;
}

export function HeadsOrTailsEngine({ slug = "heads-or-tails" }: { slug?: string }) {
  const tUi = useTranslations("ui.engines.HeadsOrTailsEngine");
  // Coin state
  const [currentFace, setCurrentFace] = useState<CoinSide>("HEADS");
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [lastLanded, setLastLanded] = useState<CoinSide | null>(null);

  // Sound & Accessibility
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [announcement, setAnnouncement] = useState<string>(tUi("readyToFlipPressSpaceEnterOrClickTheCoin"));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Statistics
  const [headsCount, setHeadsCount] = useState<number>(0);
  const [tailsCount, setTailsCount] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<{ side: CoinSide; count: number } | null>(null);
  const [history, setHistory] = useState<FlipRecord[]>([]);

  // Series mode state (Best of 3, 5, 7)
  const [mode, setMode] = useState<SeriesMode>("single");
  const [chosenSide, setChosenSide] = useState<CoinSide>("HEADS");
  const [seriesHeadsWins, setSeriesHeadsWins] = useState<number>(0);
  const [seriesTailsWins, setSeriesTailsWins] = useState<number>(0);
  const [seriesRounds, setSeriesRounds] = useState<CoinSide[]>([]);
  const [seriesWinner, setSeriesWinner] = useState<CoinSide | null>(null);

  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const totalFlips = headsCount + tailsCount;

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  /**
   * Generates a 50/50 cryptographic coin flip using window.crypto.getRandomValues
   */
  const getCryptoRandomSide = (): CoinSide => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] & 1) === 0 ? "HEADS" : "TAILS";
  };

  /**
   * Synthesize realistic metallic coin sounds via Web Audio API
   */
  const playCoinSound = useCallback((type: "flip" | "land") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === "flip") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      /* ignore audio context restrictions */
    }
  }, [soundEnabled]);

  /**
   * Determine winning threshold for series mode
   */
  const getTargetWins = (m: SeriesMode): number => {
    if (m === "bo3") return 2;
    if (m === "bo5") return 3;
    if (m === "bo7") return 4;
    return 1;
  };

  /**
   * Execute coin flip
   */
  const flipCoin = useCallback(() => {
    if (isFlipping) return;
    if (mode !== "single" && seriesWinner) return;

    setIsFlipping(true);
    setLastLanded(null);
    setAnnouncement(tUi("flippingCoin"));
    playCoinSound("flip");

    // Cryptographic independent 50/50 roll
    const outcome = getCryptoRandomSide();

    // Rotation calculation:
    // HEADS face rests at 0 deg (mod 360)
    // TAILS face rests at 180 deg (mod 360)
    // Always rotate forward by at least 5-6 full turns (1800° to 2160°)
    const spinCount = prefersReducedMotion ? 1 : 6;
    let targetAngle = rotationDeg + spinCount * 360;

    if (outcome === "HEADS") {
      const remainder = targetAngle % 360;
      targetAngle += (360 - remainder) % 360;
    } else {
      const remainder = targetAngle % 360;
      targetAngle += (180 - remainder + 360) % 360;
    }

    setRotationDeg(targetAngle);

    const animationDuration = prefersReducedMotion ? 300 : 1700;

    flipTimeoutRef.current = setTimeout(() => {
      setIsFlipping(false);
      setCurrentFace(outcome);
      setLastLanded(outcome);
      playCoinSound("land");

      // Update counters
      if (outcome === "HEADS") {
        setHeadsCount((c) => c + 1);
        setCurrentStreak((prev) =>
          prev && prev.side === "HEADS" ? { side: "HEADS", count: prev.count + 1 } : { side: "HEADS", count: 1 }
        );
      } else {
        setTailsCount((c) => c + 1);
        setCurrentStreak((prev) =>
          prev && prev.side === "TAILS" ? { side: "TAILS", count: prev.count + 1 } : { side: "TAILS", count: 1 }
        );
      }

      // Add to history
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setHistory((prev) => [
        { id: Date.now(), result: outcome, timestamp: timeStr },
        ...prev.slice(0, 24),
      ]);

      // Handle Series Mode logic
      const sideLabel = outcome === "HEADS" ? tUi("heads2") : tUi("tails2");
      if (mode !== "single") {
        const newRounds = [...seriesRounds, outcome];
        setSeriesRounds(newRounds);

        let newH = seriesHeadsWins;
        let newT = seriesTailsWins;
        if (outcome === "HEADS") newH += 1;
        else newT += 1;

        setSeriesHeadsWins(newH);
        setSeriesTailsWins(newT);

        const needed = getTargetWins(mode);
        if (newH >= needed) {
          setSeriesWinner("HEADS");
          setAnnouncement(tUi("headsWinsTheSeries", { heads: newH, tails: newT }));
        } else if (newT >= needed) {
          setSeriesWinner("TAILS");
          setAnnouncement(tUi("tailsWinsTheSeries", { tails: newT, heads: newH }));
        } else {
          setAnnouncement(
            tUi("landedOnSeriesScore", { side: sideLabel, heads: newH, tails: newT })
          );
        }
      } else {
        setAnnouncement(tUi("landedOn", { side: sideLabel }));
      }
    }, animationDuration);
  }, [
    isFlipping,
    mode,
    seriesWinner,
    playCoinSound,
    prefersReducedMotion,
    rotationDeg,
    seriesRounds,
    seriesHeadsWins,
    seriesTailsWins,
  ]);

  // Reset all stats & series
  const handleReset = () => {
    if (isFlipping) return;
    setHeadsCount(0);
    setTailsCount(0);
    setCurrentStreak(null);
    setHistory([]);
    setSeriesHeadsWins(0);
    setSeriesTailsWins(0);
    setSeriesRounds([]);
    setSeriesWinner(null);
    setLastLanded(null);
    setAnnouncement(tUi("scoresAndStatisticsResetToZero"));
  };

  // Switch game mode
  const handleModeChange = (newMode: SeriesMode) => {
    if (isFlipping) return;
    setMode(newMode);
    setSeriesHeadsWins(0);
    setSeriesTailsWins(0);
    setSeriesRounds([]);
    setSeriesWinner(null);
    setLastLanded(null);
  };

  // Keyboard navigation on coin
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flipCoin();
    }
  };

  const headsPercent = totalFlips > 0 ? ((headsCount / totalFlips) * 100).toFixed(1) : "0.0";
  const tailsPercent = totalFlips > 0 ? ((tailsCount / totalFlips) * 100).toFixed(1) : "0.0";
  const targetWins = getTargetWins(mode);

  return (
    <div className="w-full text-slate-800 dark:text-slate-200">
      {/* Screen reader live announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Top Controls: Mode Switcher & Sound Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange("single")}
              disabled={isFlipping}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                mode === "single"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tUi("singleFlip")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("bo3")}
              disabled={isFlipping}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                mode === "bo3"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tUi("bestOf3")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("bo5")}
              disabled={isFlipping}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                mode === "bo5"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tUi("bestOf5")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("bo7")}
              disabled={isFlipping}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                mode === "bo7"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tUi("bestOf7")}
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title={soundEnabled ? tUi("muteSound") : tUi("enableSound")}
              aria-label={soundEnabled ? tUi("muteSound") : tUi("enableSound")}
            >
              {soundEnabled ? <Volume2 className="size-4 text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="size-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isFlipping || totalFlips === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title={tUi("resetCountersAndSeries")}
            >
              <RotateCcw className="size-3.5" />
              <span>{tUi("reset")}</span>
            </button>
          </div>
        </div>

        {/* Series Scoreboard (When Best of 3/5/7 is selected) */}
        {mode !== "single" && (
          <div className="border-b border-indigo-100 bg-gradient-to-r from-amber-50/80 via-indigo-50/50 to-sky-50/80 p-4 dark:border-slate-800 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
            <div className="mx-auto flex max-w-xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  {mode.toUpperCase()} {tUi("seriesFirstTo", { count: targetWins })}
                </span>
                <div className="mt-1 flex items-center justify-center gap-3 sm:justify-start">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-700 dark:text-amber-400">{tUi("heads2")}:</span>
                    <span className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
                      {seriesHeadsWins}
                    </span>
                  </div>
                  <span className="text-slate-400">—</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sky-700 dark:text-sky-400">{tUi("tails2")}:</span>
                    <span className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
                      {seriesTailsWins}
                    </span>
                  </div>
                </div>
              </div>

              {/* Your Pick Choice */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">{tUi("yourCall")}</span>
                <div className="inline-flex rounded-xl bg-white/80 p-0.5 shadow-2xs dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setChosenSide("HEADS")}
                    disabled={isFlipping || seriesRounds.length > 0}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      chosenSide === "HEADS"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {tUi("heads2")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChosenSide("TAILS")}
                    disabled={isFlipping || seriesRounds.length > 0}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      chosenSide === "TAILS"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {tUi("tails2")}
                  </button>
                </div>
              </div>
            </div>

            {/* Winner Banner */}
            {seriesWinner && (
              <div className="mx-auto mt-3 max-w-md animate-bounce rounded-2xl border border-emerald-300 bg-emerald-100/90 p-3 text-center shadow-sm dark:border-emerald-800 dark:bg-emerald-950/80">
                <div className="flex items-center justify-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                  <Trophy className="size-5 text-amber-500" />
                  <span>
                    🏆 {seriesWinner === "HEADS" ? tUi("heads2") : tUi("tails2")} {tUi("winsTheSeries")}{Math.max(seriesHeadsWins, seriesTailsWins)} - {Math.min(seriesHeadsWins, seriesTailsWins)})!
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                  {seriesWinner === chosenSide ? tUi("congratulationsYouWonYourPrediction") : tUi("betterLuckNextTime")}
                </p>
                <button
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 dark:bg-emerald-600"
                >
                  <RefreshCw className="size-3.5" />
                  <span>{tUi("playNewSeries")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3D Coin Arena */}
        <div className="relative flex flex-col items-center justify-center py-12 px-4 sm:py-16">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 dark:opacity-20">
            <div className="size-80 rounded-full bg-gradient-to-tr from-amber-400/30 to-indigo-500/30 blur-3xl" />
          </div>

          {/* 3D Perspective Scene */}
          <div className="relative flex flex-col items-center justify-center" style={{ perspective: "1000px" }}>
            {/* Coin Container with Lift & Drop Animation */}
            <div
              className={`relative ${
                isFlipping && !prefersReducedMotion ? "animate-[coinLift_1.7s_cubic-bezier(0.25,1,0.5,1)]" : ""
              }`}
            >
              {/* Interactive Coin Element */}
              <button
                type="button"
                onClick={flipCoin}
                onKeyDown={handleKeyDown}
                disabled={isFlipping || (mode !== "single" && seriesWinner !== null)}
                aria-label={tUi("coinShowingFaceClickToFlip", {
                  face: currentFace === "HEADS" ? tUi("heads2") : tUi("tails2"),
                })}
                className="group relative size-44 cursor-pointer outline-none transition-transform sm:size-52 disabled:cursor-not-allowed"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${rotationDeg}deg)`,
                  transition: prefersReducedMotion
                    ? "transform 0.3s ease-out"
                    : "transform 1.7s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                {/* HEADS FACE (Front: 0 deg) */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-between rounded-full border-4 border-amber-600 p-4 text-center select-none shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(0deg) translateZ(4px)",
                    background:
                      "radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 55%, #b45309 85%, #78350f 100%)",
                    boxShadow:
                      "inset 0 0 14px rgba(255, 255, 255, 0.8), inset 0 0 24px rgba(120, 53, 15, 0.8), 0 12px 24px -6px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* Dentil beaded rim */}
                  <div className="pointer-events-none absolute inset-1 rounded-full border-2 border-dashed border-amber-300/70" />

                  {/* Top Text */}
                  <div className="pt-1 font-mono text-[11px] font-extrabold tracking-widest text-amber-950 uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                    ★ LIBERTY ★
                  </div>

                  {/* Center Classical Profile Bust */}
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      viewBox="0 0 100 100"
                      className="size-20 drop-shadow-[0_2px_4px_rgba(120,53,15,0.6)] sm:size-24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="50" cy="50" r="46" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />
                      {/* Classical profile head silhouette */}
                      <path
                        d="M48 20C42 20 37 24 35 29C33 34 32 40 33 44C30 46 28 50 30 54C32 58 35 59 38 60C38 65 41 72 47 75C53 78 61 77 66 73C64 69 63 65 64 61C68 59 70 54 69 49C68 45 65 43 62 42C62 36 61 29 57 24C54 21 51 20 48 20Z"
                        fill="#78350f"
                      />
                      <path
                        d="M49 22C44 22 39 25 37 30C35 35 34 40 35 44C33 46 31 49 32 53C34 57 37 58 40 59C40 64 43 70 48 73C54 76 61 75 65 71C63 67 62 64 63 60C67 58 68 53 67 49C66 45 64 43 61 42C61 37 60 30 56 25C54 23 51 22 49 22Z"
                        fill="#fbbf24"
                      />
                      {/* Laurel Wreath */}
                      <path
                        d="M38 32C41 30 45 31 46 34C48 31 52 32 53 35C55 33 59 35 59 38"
                        stroke="#78350f"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="mt-1 font-mono text-sm font-black tracking-wider text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                      HEADS
                    </span>
                  </div>

                  {/* Bottom Year & Motto */}
                  <div className="pb-1 font-mono text-[10px] font-bold text-amber-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    2026 • 50/50
                  </div>
                </div>

                {/* TAILS FACE (Back: 180 deg) */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-between rounded-full border-4 border-amber-600 p-4 text-center select-none shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg) translateZ(4px)",
                    background:
                      "radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 55%, #b45309 85%, #78350f 100%)",
                    boxShadow:
                      "inset 0 0 14px rgba(255, 255, 255, 0.8), inset 0 0 24px rgba(120, 53, 15, 0.8), 0 12px 24px -6px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* Dentil beaded rim */}
                  <div className="pointer-events-none absolute inset-1 rounded-full border-2 border-dashed border-amber-300/70" />

                  {/* Top Text */}
                  <div className="pt-1 font-mono text-[11px] font-extrabold tracking-widest text-amber-950 uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                    ★ UNITED WE STAND ★
                  </div>

                  {/* Center Heraldic Eagle Emblem */}
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      viewBox="0 0 100 100"
                      className="size-20 drop-shadow-[0_2px_4px_rgba(120,53,15,0.6)] sm:size-24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="50" cy="50" r="46" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />
                      {/* Shield */}
                      <path
                        d="M50 35L62 39V53C62 61 57 68 50 71C43 68 38 61 38 53V39L50 35Z"
                        fill="#78350f"
                        stroke="#fef08a"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M50 37L60 40V52C60 59 56 65 50 68C44 65 40 59 40 52V40L50 37Z"
                        fill="#fbbf24"
                      />
                      {/* Eagle Wings */}
                      <path
                        d="M38 42C30 38 20 40 14 46C20 49 28 48 35 48M62 42C70 38 80 40 86 46C80 49 72 48 65 48"
                        stroke="#78350f"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Star cluster */}
                      <circle cx="50" cy="46" r="2" fill="#78350f" />
                      <circle cx="45" cy="52" r="2" fill="#78350f" />
                      <circle cx="55" cy="52" r="2" fill="#78350f" />
                    </svg>
                    <span className="mt-1 font-mono text-sm font-black tracking-wider text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                      TAILS
                    </span>
                  </div>

                  {/* Bottom Unit */}
                  <div className="pb-1 font-mono text-[10px] font-bold text-amber-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    {tUi("ePLURIBUSUNUM")}
                  </div>
                </div>
              </button>
            </div>

            {/* Dynamic Floor Shadow beneath the coin */}
            <div
              className={`mt-4 h-3.5 w-36 rounded-full bg-slate-900/40 dark:bg-black/60 blur-xs transition-all ${
                isFlipping && !prefersReducedMotion ? "animate-[shadowPulse_1.7s_cubic-bezier(0.25,1,0.5,1)]" : ""
              }`}
            />
          </div>

          {/* Action Button */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={flipCoin}
              disabled={isFlipping || (mode !== "single" && seriesWinner !== null)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:from-amber-600 hover:to-amber-800 focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50 disabled:hover:scale-100 dark:from-amber-600 dark:to-amber-800"
            >
              <Sparkles className="size-5" />
              <span>{isFlipping ? tUi("flipping") : tUi("flipCoinSpaceEnter")}</span>
            </button>

            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {tUi("clickCoinOrPress")} <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">{tUi("space")}</kbd> / <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">{tUi("enter")}</kbd>
            </span>
          </div>

          {/* Prominent Landed Result Banner */}
          {lastLanded && !isFlipping && (
            <div className="mt-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div
                className={`flex items-center gap-2 rounded-2xl px-6 py-2.5 shadow-md ${
                  lastLanded === "HEADS"
                    ? "border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    : "border border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
                }`}
              >
                <CheckCircle2 className="size-5" />
                <span className="text-xl font-extrabold tracking-tight">
                  {lastLanded === "HEADS" ? tUi("heads") : tUi("tails")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Statistics & Insights Grid */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Flips */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">{tUi("totalFlips")}</span>
                <BarChart3 className="size-4" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                {totalFlips}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {tUi("independent5050Trials")}
              </p>
            </div>

            {/* Heads Count */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-xs font-semibold uppercase tracking-wider">{tUi("heads2")}</span>
                <span className="font-mono text-xs font-bold">{headsPercent}%</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-amber-900 dark:text-amber-300">
                {headsCount}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-950">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${headsPercent}%` }}
                />
              </div>
            </div>

            {/* Tails Count */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-2xs dark:border-sky-900/40 dark:bg-sky-950/20">
              <div className="flex items-center justify-between text-sky-700 dark:text-sky-400">
                <span className="text-xs font-semibold uppercase tracking-wider">{tUi("tails2")}</span>
                <span className="font-mono text-xs font-bold">{tailsPercent}%</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-sky-900 dark:text-sky-300">
                {tailsCount}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-950">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${tailsPercent}%` }}
                />
              </div>
            </div>

            {/* Current Streak */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">{tUi("streak")}</span>
                <Flame className="size-4 text-orange-500" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                {currentStreak ? `${currentStreak.count}x` : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {currentStreak
                  ? tUi("streakInARow", {
                      side: currentStreak.side === "HEADS" ? tUi("heads2") : tUi("tails2"),
                    })
                  : tUi("noStreakYet")}
              </p>
            </div>
          </div>

          {/* Recent Flips History Strip */}
          {history.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <History className="size-3.5" />
                  <span>{tUi("recentFlipsLast")} {history.length})</span>
                </div>
                <span className="text-[11px] text-slate-400">{tUi("mostRecentFirst")}</span>
              </div>

              <div className="mt-2.5 flex gap-2 overflow-x-auto pb-2">
                {history.map((h, idx) => (
                  <div
                    key={h.id}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      h.result === "HEADS"
                        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                        : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                    }`}
                  >
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-white font-mono text-[10px] font-extrabold shadow-2xs dark:bg-slate-800">
                      {h.result === "HEADS" ? "H" : "T"}
                    </span>
                    <span>{h.result === "HEADS" ? tUi("heads2") : tUi("tails2")}</span>
                    <span className="text-[10px] font-normal text-slate-400">#{totalFlips - idx}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide, Rules & Cryptographic Proof Section */}
      <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {tUi("aboutTheHeadsOrTailsCoinFlip")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              {tUi("isThisOnlineCoinFlipTruly5050")}
            </h4>
            <p className="mt-1">
              {tUi("yesUnlikePseudoRandomGeneratorsThatRepeatPatternsThisToolUses")}
              <code className="mx-1 rounded bg-slate-200 px-1 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                crypto.getRandomValues()
              </code>
              , {tUi("poweredByYourHardwareOperatingSystemEntropy")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              {tUi("howDoesTheBestOfSeriesModeWork")}
            </h4>
            <p className="mt-1">
              {tUi("bestOfSeriesModeExplanation")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              {tUi("keyboardAccessibilitySupport")}
            </h4>
            <p className="mt-1">
              {tUi("flipQuicklyUsingThe")} <kbd className="rounded border bg-white px-1 font-mono text-[10px] dark:bg-slate-800">{tUi("spacebar")}</kbd> {tUi("or")} <kbd className="rounded border bg-white px-1 font-mono text-[10px] dark:bg-slate-800">{tUi("enter")}</kbd>{tUi("keySuffix")}{" "}
              {tUi("fullScreenReaderAnnouncementsReportResultsViaLiveAriaRegions")}{" "}
              {tUi("usersWith")} <code className="text-[11px]">prefers-reduced-motion</code> {tUi("enjoyAnInstantAccessibleFlipWithout3DCameraShakes")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              {tUi("100ClientSidePrivacy")}
            </h4>
            <p className="mt-1">
              {tUi("allCoinPhysicsAnimationsRandomRollsAndGameScoresRunInYourBrowserSandbox")}{" "}
              {tUi("noCookiesAnalyticsTrackersOrNetworkCallsAreMade")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
