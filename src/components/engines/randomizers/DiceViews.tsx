"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dices, Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  RandPanel,
  cryptoRandomInt,
  downloadCsv,
  randGhostButtonClass,
  randInputClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The dice of the family: the single die, the polyhedral set of the tabletop
 * game and the pair of dice with their sum.
 */

/** The dice sizes every die roller offers. */
const DIE_SIZES = [4, 6, 8, 10, 12, 20, 100];

/** The range of the die with a number of sides that is not one of the presets. */
const CUSTOM_SIDES_MIN = 2;
const CUSTOM_SIDES_MAX = 1000;

/**
 * The chances of every sum of two six-sided dice.
 *
 * With 36 equally likely outcomes the counts run 1, 2, 3, 4, 5, 6, 5, 4, 3,
 * 2 and 1, which is the classic guide for the sum of two dice.
 */
const TWO_DICE_CHANCES = (() => {
  const rows: { sum: number; combinations: number; percent: string }[] = [];
  for (let sum = 2; sum <= 12; sum += 1) {
    const combinations = 6 - Math.abs(7 - sum);
    rows.push({
      sum,
      combinations,
      percent: `${((combinations / 36) * 100).toFixed(2)}%`,
    });
  }
  return rows;
})();

/** A fair die roll between 1 and the given number of sides. */
function rollDie(sides: number): number {
  if (sides < 2) return 1;
  return cryptoRandomInt(sides) + 1;
}

/* ------------------------------------------------------------ the die --- */

/** The dice roller: one die, a choice of sides and a history of the rolls. */
export function DiceRollerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [sides, setSides] = useState(20);
  const [customSides, setCustomSides] = useState(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rolls, setRolls] = useState<number[]>([1]);
  const [history, setHistory] = useState<number[][]>([]);

  // The first roll is drawn after the page has mounted, so the markup of the
  // server and of the browser stay identical.
  useEffect(() => {
    const timer = setTimeout(() => setRolls([rollDie(20)]), 0);
    return () => clearTimeout(timer);
  }, []);

  /** Roll the given number of dice and keep the roll in the history. */
  const rollWith = (dieSides: number) => {
    const amount = Math.min(Math.max(count, 1), 100);
    const next = Array.from({ length: amount }, () => rollDie(dieSides));
    setRolls(next);
    setHistory((prev) => [next, ...prev].slice(0, 6));
  };

  const roll = () => {
    rollWith(sides);
  };

  /**
   * Use the die with the typed number of sides.
   *
   * The number is clamped like the other inputs of the roller, and the die is
   * rolled right away, so the typed sides are the sides of the shown roll.
   */
  const rollCustomSides = (value: number) => {
    const die = Math.min(
      Math.max(Number(value) || CUSTOM_SIDES_MIN, CUSTOM_SIDES_MIN),
      CUSTOM_SIDES_MAX,
    );
    setCustomSides(die);
    setSides(die);
    rollWith(die);
  };

  const total = rolls.reduce((sum, value) => sum + value + modifier, 0);

  return (
    <RandPanel
      title={t("dice.rollerTitle")}
      subtitle={t("dice.rollerSubtitle")}
      toolbar={
        <button type="button" onClick={roll} className={randPrimaryButtonClass}>
          <RefreshCw className="size-4" />
          <span>{t("dice.rollAgain")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <div
            data-testid="dice-face"
            data-value={rolls[0]}
            data-sides={sides}
            className="grid size-28 place-items-center rounded-2xl border-2 border-slate-700 bg-slate-950 font-mono text-5xl font-extrabold text-emerald-400 shadow-xl"
          >
            {rolls[0]}
          </div>
          {rolls.length > 1 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {rolls.slice(1).map((value, index) => (
                <span
                  key={`${index}-${value}`}
                  data-testid="dice-value"
                  data-value={value}
                  className="grid size-14 place-items-center rounded-xl border border-slate-300 bg-slate-900 font-mono text-xl font-bold text-emerald-300 dark:border-slate-700"
                >
                  {value}
                </span>
              ))}
            </div>
          ) : null}
          <p
            data-testid="dice-total"
            data-total={total}
            data-modifier={modifier}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("dice.totalWithModifier", {
              total,
              modifier,
            })}
          </p>
        </div>

        <div className="space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("dice.chooseSides")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  data-testid="dice-die"
                  data-sides={size}
                  onClick={() => {
                    setSides(size);
                    setCustomSides(size);
                    rollWith(size);
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    sides === size
                      ? "bg-sky-800 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {` d${size} `}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {t("dice.availableDice")}
            </p>
          </fieldset>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("dice.customSides")}
            <input
              type="number"
              min={CUSTOM_SIDES_MIN}
              max={CUSTOM_SIDES_MAX}
              data-testid="dice-custom-sides"
              data-sides={customSides}
              value={customSides}
              onChange={(event) => rollCustomSides(Number(event.target.value))}
              className={`${randInputClass} mt-1.5`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("dice.customSidesHint")}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("dice.numberOfDice")}
              <input
                type="number"
                min={1}
                max={100}
                data-testid="dice-count"
                value={count}
                onChange={(event) =>
                  setCount(Math.min(Math.max(Number(event.target.value) || 1, 1), 100))
                }
                className={`${randInputClass} mt-1.5`}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("dice.modifier")}
              <input
                type="number"
                value={modifier}
                onChange={(event) => setModifier(Number(event.target.value) || 0)}
                className={`${randInputClass} mt-1.5`}
              />
            </label>
          </div>

          {history.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("dice.rollHistory")}
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {history.map((entry, index) => (
                  <li key={`${index}-${entry.join("-")}`} data-testid="dice-history-row" data-count={entry.length}>
                    {t("dice.historyRow", { values: entry.join(" + ") })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </RandPanel>
  );
}

/* -------------------------------------------------- the polyhedral set --- */

/** The tabletop dice set: several dice types at once, each with its roll. */
export function DndDiceRollerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [selected, setSelected] = useState<number[]>([20]);
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState<{ sides: number; value: number }[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const toggle = (size: number) => {
    setSelected((prev) =>
      prev.includes(size) ? prev.filter((entry) => entry !== size) : [...prev, size].sort((a, b) => a - b),
    );
  };

  const rollAll = () => {
    if (selected.length === 0) return;
    const next = selected.map((size) => ({ sides: size, value: rollDie(size) }));
    setResults(next);
    setHistory((prev) =>
      [next.map((entry) => `d${entry.sides}: ${entry.value}`).join(" + "), ...prev].slice(0, 6),
    );
  };

  const total = results.reduce((sum, entry) => sum + entry.value, 0) + modifier * results.length;

  return (
    <RandPanel
      title={t("dice.dndTitle")}
      subtitle={t("dice.dndSubtitle")}
      toolbar={
        <button
          type="button"
          onClick={rollAll}
          disabled={selected.length === 0}
          className={randPrimaryButtonClass}
        >
          <Dices className="size-4" />
          <span>{t("dice.rollAllDice")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("dice.chooseDiceTypes")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIE_SIZES.map((size) => {
                const active = selected.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    data-testid="dnd-die"
                    data-sides={size}
                    onClick={() => toggle(size)}
                    aria-pressed={active}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                      active
                        ? "bg-indigo-700 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {` d${size} `}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {t("dice.availableDice")}
            </p>
          </fieldset>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("dice.modifier")}
            <input
              type="number"
              value={modifier}
              onChange={(event) => setModifier(Number(event.target.value) || 0)}
              className={`${randInputClass} mt-1.5`}
            />
          </label>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("dice.selectedDice", { list: selected.map((size) => `d${size}`).join(", ") })}
          </p>
        </div>

        <div className="space-y-3">
          {results.length > 0 ? (
            <>
              <ul className="space-y-2">
                {results.map((entry, index) => (
                  <li
                    key={`${entry.sides}-${index}`}
                    data-testid="dnd-result"
                    data-sides={entry.sides}
                    data-value={entry.value}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {`d${entry.sides}`}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                data-testid="dnd-total"
                data-total={total}
                data-modifier={modifier}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t("dice.totalWithModifier", { total, modifier })}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dice.noRollsYet")}
            </p>
          )}

          {history.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("dice.rollHistory")}
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {history.map((row, index) => (
                  <li key={`${index}-${row}`} data-testid="dnd-history-row">
                    {row}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------- the two dice --- */

/** The two dice with their sum, a CSV export and the probability guide. */
export function RollTwoDiceView() {
  const t = useTranslations("ui.engines.randomizers");

  const [dice, setDice] = useState<[number, number]>([1, 2]);
  const [history, setHistory] = useState<[number, number][]>([]);

  const roll = () => {
    const next: [number, number] = [rollDie(6), rollDie(6)];
    setDice(next);
    setHistory((prev) => [next, ...prev].slice(0, 20));
  };

  const sum = dice[0] + dice[1];

  /** The rolls as a CSV file, newest roll first. */
  const exportCsv = () => {
    if (history.length === 0) return;
    const rows = ["roll,dice_1,dice_2,sum"];
    history.forEach((entry, index) => {
      rows.push(`${index + 1},${entry[0]},${entry[1]},${entry[0] + entry[1]}`);
    });
    downloadCsv("two-dice-rolls.csv", rows);
  };

  return (
    <RandPanel
      title={t("dice.twoTitle")}
      subtitle={t("dice.twoSubtitle")}
      toolbar={
        <button type="button" onClick={roll} className={randPrimaryButtonClass}>
          <RefreshCw className="size-4" />
          <span>{t("dice.rollTwoDice")}</span>
        </button>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-6">
          <div
            data-testid="dice-value"
            data-value={dice[0]}
            className="grid size-28 place-items-center rounded-2xl border-2 border-slate-700 bg-slate-950 font-mono text-5xl font-extrabold text-emerald-400 shadow-xl"
          >
            {dice[0]}
          </div>
          <div
            data-testid="dice-value"
            data-value={dice[1]}
            className="grid size-28 place-items-center rounded-2xl border-2 border-slate-700 bg-slate-950 font-mono text-5xl font-extrabold text-emerald-400 shadow-xl"
          >
            {dice[1]}
          </div>
        </div>

        <p
          data-testid="dice-sum"
          data-sum={sum}
          className="rounded-xl bg-sky-50 px-5 py-2 text-sm font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-200"
        >
          {t("dice.sumIs", { sum })}
        </p>

        {history.length > 0 ? (
          <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("dice.rollHistory")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  data-testid="dice-export-csv"
                  className={randGhostButtonClass}
                >
                  <Download className="size-3.5" />
                  <span>{t("dice.exportCsv")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  data-testid="dice-clear-history"
                  className={randGhostButtonClass}
                >
                  <Trash2 className="size-3.5" />
                  <span>{t("dice.clearHistory")}</span>
                </button>
              </div>
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {history.map((entry, index) => (
                <li key={`${index}-${entry.join("-")}`} data-testid="dice-history-row">
                  {`${entry[0]} + ${entry[1]}`}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("dice.csvEmpty")}</p>
        )}

        <section
          data-testid="dice-probability-guide"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t("dice.probabilityGuide")}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {t("dice.probabilityIntro")}
          </p>
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-3 font-semibold">{t("dice.sumHeader")}</th>
                <th className="py-1 pr-3 font-semibold">{t("dice.combinationsHeader")}</th>
                <th className="py-1 font-semibold">{t("dice.chanceHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {TWO_DICE_CHANCES.map((row) => (
                <tr
                  key={row.sum}
                  data-testid="dice-probability-row"
                  data-sum={row.sum}
                  data-combinations={row.combinations}
                  data-percent={row.percent}
                  className="border-t border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <td className="py-1 pr-3 font-mono">{row.sum}</td>
                  <td className="py-1 pr-3 font-mono">{row.combinations}</td>
                  <td className="py-1 font-mono">{row.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------------- helpers --- */

/** A button that clears a list, used by the workspaces of the family. */
export function ClearListButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={randGhostButtonClass}>
      <Trash2 className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

/** A button that adds one entry, used by the checklists of the family. */
export function AddEntryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={randPrimaryButtonClass}>
      <Plus className="size-4" />
      <span>{label}</span>
    </button>
  );
}
