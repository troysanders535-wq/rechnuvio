"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Disc, Sparkles, Trophy } from "lucide-react";
import {
  RandPanel,
  cryptoRandomInt,
  randAreaClass,
  randGhostButtonClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The spinner wheel of the wheel family.
 *
 * The five wheel tools (wheel of names, winner picker, name picker, item
 * picker and the yes or no wheel) all draw their entries on a wheel, so they
 * share this component - but every one of them configures it for its own
 * purpose: its own heading, its own wording and its own default entries.
 *
 * The winner is drawn from the browser's cryptographic random source and the
 * wheel turns to the slice that was drawn, so the announced name is always
 * one of the loaded entries.
 */

export interface WheelConfig {
  /** The translation key of the panel heading. */
  titleKey: string;
  /** The translation key of the panel subtitle. */
  subtitleKey: string;
  /** The translation key of the label of the entries field. */
  entriesLabelKey: string;
  /** The translation key of the hint below the entries field. */
  entriesHintKey: string;
  /** The translation key of the label of the extra control column. */
  extraLabelKey?: string;
  /** The entries the wheel starts with. */
  defaultEntries: string[];
  /** A tool specific control that sits next to the entries. */
  extraControl?: React.ReactNode;
  /** The accent colour of the wheel slices. */
  accent: string;
}

const SLICE_COLOURS = [
  "#0284c7",
  "#0ea5e9",
  "#38bdf8",
  "#0369a1",
  "#075985",
  "#0d9488",
  "#14b8a6",
  "#2dd4bf",
  "#6366f1",
  "#8b5cf6",
];

const CANVAS_SIZE = 320;
const SPIN_DURATION = 2600;
const FULL_TURNS = 5;

/**
 * The configuration of the five wheel tools.
 *
 * Every tool of the wheel family gets its own heading, its own wording and
 * its own default entries, so the workspace of a tool always talks about
 * the tool and not about the family.
 */
export const WHEEL_CONFIGS: Record<string, WheelConfig> = {
  "wheel-of-names": {
    titleKey: "wheel.names.title",
    subtitleKey: "wheel.names.subtitle",
    entriesLabelKey: "wheel.names.entriesLabel",
    entriesHintKey: "wheel.names.entriesHint",
    defaultEntries: ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona"],
    accent: "#0284c7",
  },
  "random-winner-picker": {
    titleKey: "wheel.winner.title",
    subtitleKey: "wheel.winner.subtitle",
    entriesLabelKey: "wheel.winner.entriesLabel",
    entriesHintKey: "wheel.winner.entriesHint",
    defaultEntries: ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona"],
    accent: "#7c3aed",
  },
  "random-name-picker": {
    titleKey: "wheel.picker.title",
    subtitleKey: "wheel.picker.subtitle",
    entriesLabelKey: "wheel.picker.entriesLabel",
    entriesHintKey: "wheel.picker.entriesHint",
    defaultEntries: ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona"],
    accent: "#0d9488",
  },
  "random-item-picker": {
    titleKey: "wheel.item.title",
    subtitleKey: "wheel.item.subtitle",
    entriesLabelKey: "wheel.item.entriesLabel",
    entriesHintKey: "wheel.item.entriesHint",
    defaultEntries: ["Coffee", "Books", "Plants", "Chocolate", "Bingo"],
    accent: "#b45309",
  },
  "yes-or-no-wheel": {
    titleKey: "wheel.yesNo.title",
    subtitleKey: "wheel.yesNo.subtitle",
    entriesLabelKey: "wheel.yesNo.entriesLabel",
    entriesHintKey: "wheel.yesNo.entriesHint",
    defaultEntries: ["Yes", "No"],
    accent: "#be123c",
  },
};

export function WheelView({ config }: { config: WheelConfig }) {
  const t = useTranslations("ui.engines.randomizers");

  const [text, setText] = useState(config.defaultEntries.join("\n"));
  const [entries, setEntries] = useState(config.defaultEntries);
  const [winner, setWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const winnerIndexRef = useRef<number | null>(null);

  const drawWheel = useCallback(
    (rotation: number, labels: string[], accent: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (labels.length === 0) return;

      const sliceAngle = (2 * Math.PI) / labels.length;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = centerX - 10;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < labels.length; i++) {
        const start = rotation + i * sliceAngle;
        const end = start + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.closePath();
        ctx.fillStyle =
          i % 2 === 0 ? accent : SLICE_COLOURS[(i + 3) % SLICE_COLOURS.length];
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(start + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        const label = labels[i].length > 16 ? `${labels[i].slice(0, 15)}…` : labels[i];
        ctx.fillText(label, radius - 16, 5);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, 2);
      ctx.lineTo(centerX - 10, 22);
      ctx.lineTo(centerX + 10, 22);
      ctx.closePath();
      ctx.fillStyle = "#f43f5e";
      ctx.fill();
    },
    [],
  );

  useEffect(() => {
    drawWheel(rotationRef.current, entries, config.accent);
  }, [entries, config.accent, drawWheel]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const onEntriesChange = (next: string) => {
    setText(next);
    const list = next
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    setEntries(list);
    setWinner(null);
  };

  const spin = () => {
    if (isSpinning || entries.length === 0) return;

    const count = entries.length;
    // The winner is drawn from the cryptographic random source. A draw never
    // repeats the previous winner as long as there is a second entry, so a
    // second spin always shows a new result.
    const previous = winnerIndexRef.current;
    let index = cryptoRandomInt(count);
    if (count > 1 && previous !== null && index === previous) {
      index = (index + 1 + cryptoRandomInt(count - 1)) % count;
    }
    winnerIndexRef.current = index;

    setIsSpinning(true);
    setWinner(null);

    const sliceAngle = (2 * Math.PI) / count;
    // The needle sits at the top of the wheel, which is 3/4 of a turn.
    const needleAngle = (3 * Math.PI) / 2;
    const desired = (needleAngle - (index + 0.5) * sliceAngle) % (2 * Math.PI);
    const current = rotationRef.current % (2 * Math.PI);
    let delta = (desired - current) % (2 * Math.PI);
    if (delta < 0) delta += 2 * Math.PI;
    const total = delta + 2 * Math.PI * FULL_TURNS;

    const startedAt = performance.now();
    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / SPIN_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const rotation = rotationRef.current + total * eased;
      rotationRef.current = rotation;
      drawWheel(rotation, entries, config.accent);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      frameRef.current = null;
      setIsSpinning(false);
      const picked = entries[index];
      setWinner(picked);
      setHistory((prev) => [picked, ...prev].slice(0, 8));
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  return (
    <RandPanel
      title={t(config.titleKey)}
      subtitle={t(config.subtitleKey)}
      toolbar={
        <>
          <button
            type="button"
            onClick={spin}
            disabled={isSpinning || entries.length === 0}
            className={randPrimaryButtonClass}
          >
            <Sparkles className="size-4" />
            <span>{isSpinning ? t("wheel.spinning") : t("wheel.spinTheWheel")}</span>
          </button>
          {config.extraControl}
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-full shadow-lg"
            aria-hidden="true"
          />
          {winner ? (
            <div
              data-testid="wheel-winner"
              data-name={winner}
              className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            >
              <Trophy className="size-4 text-amber-500" />
              <span>{t("wheel.winnerIs", { name: winner })}</span>
            </div>
          ) : null}
          {history.length > 0 ? (
            <p data-testid="wheel-history" className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("wheel.recentResults")}: {history.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t(config.entriesLabelKey)}
            <textarea
              value={text}
              data-testid="wheel-entries"
              onChange={(event) => onEntriesChange(event.target.value)}
              rows={10}
              spellCheck={false}
              className={randAreaClass}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t(config.entriesHintKey)}
            </span>
          </label>

          <p data-testid="wheel-count" data-count={entries.length} className="text-xs text-slate-500 dark:text-slate-400">
            {t("wheel.entriesLoaded", { count: entries.length })}
          </p>

          {entries.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setText(config.defaultEntries.join("\n"));
                setEntries(config.defaultEntries);
                setWinner(null);
                setHistory([]);
              }}
              className={randGhostButtonClass}
            >
              <Disc className="size-3.5" />
              <span>{t("wheel.resetEntries")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </RandPanel>
  );
}
