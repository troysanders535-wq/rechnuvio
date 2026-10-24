"use client";

/**
 * Workspace for the d20 roller of the text suite.
 *
 * The dice are rolled with Math.random() inside the browser - no request, no
 * server call and nothing is written to storage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  CopyButton,
  Field,
  Note,
  NumberInput,
  Panel,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

/* ==== helpers-start ==== */

/** One entry of the roll history. */
interface DiceRoll {
  id: number;
  dice: number[];
  kept: number;
  modifier: number;
  mode: string;
  total: number;
}

/** Roll a single d20 - the result is between 1 and 20. */
function rollDie(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** The die that is kept: the higher one with advantage, the lower one with disadvantage. */
function keptValue(dice: number[], mode: string): number {
  if (mode === "advantage") return Math.max(...dice);
  if (mode === "disadvantage") return Math.min(...dice);
  return dice[0];
}

/** Position of the kept die inside the rolled dice. */
function keptIndex(dice: number[], mode: string): number {
  if (dice.length < 2) return 0;
  const index = dice.indexOf(keptValue(dice, mode));
  return index < 0 ? 0 : index;
}

/** The modifier with an explicit sign. */
function formatModifier(modifier: number): string {
  return modifier >= 0 ? "+" + modifier : String(modifier);
}

/** The total of a roll: the kept die plus the modifier. */
function totalFor(kept: number, modifier: number): number {
  return kept + modifier;
}

/** The text that is copied for a roll, for example "d20 (17 + 3) = 20". */
function formatRoll(roll: DiceRoll): string {
  const sign = roll.modifier >= 0 ? "+ " + roll.modifier : "- " + Math.abs(roll.modifier);
  return "d20 (" + roll.kept + " " + sign + ") = " + roll.total;
}

/* ==== helpers-end ==== */

/* -------------------------------------------------------------- component -- */

export function TextDiceWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextDiceWorkspace");
  const [mode, setMode] = useState("normal");
  const [modifier, setModifier] = useState(0);
  const [history, setHistory] = useState<DiceRoll[]>([]);
  const [spinning, setSpinning] = useState(false);
  const nextId = useRef(1);
  const timer = useRef<number | null>(null);

  const modeLabels: Record<string, string> = {
    normal: tUi("normal"),
    advantage: tUi("advantage"),
    disadvantage: tUi("disadvantage"),
  };

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const onRoll = useCallback(() => {
    const dice = mode === "normal" ? [rollDie()] : [rollDie(), rollDie()];
    const kept = keptValue(dice, mode);
    const entry: DiceRoll = {
      id: nextId.current,
      dice,
      kept,
      modifier,
      mode,
      total: totalFor(kept, modifier),
    };
    nextId.current += 1;
    setHistory((prev) => [entry, ...prev].slice(0, 10));

    setSpinning(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSpinning(false), 180);
  }, [mode, modifier]);

  const onClear = useCallback(() => {
    setHistory([]);
  }, []);

  const onModifier = useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      setModifier(0);
      return;
    }
    setModifier(Math.max(-100, Math.min(100, value)));
  }, []);

  const last = history[0];

  return (
    <div className="space-y-4" data-slug={slug}>
      <Panel>
        <Toolbar>
          <SectionTitle>{tUi("d20Roller")}</SectionTitle>
          <ButtonGroup>
            <ActionButton variant="primary" onClick={onRoll}>
              {tUi("rollD20")}
            </ActionButton>
            <ActionButton onClick={onClear} disabled={history.length === 0}>
              {tUi("clearHistory")}
            </ActionButton>
          </ButtonGroup>
        </Toolbar>
        <StatGrid>
          <StatCard value={last ? last.kept : "-"} label={tUi("keptDie")} tone="good" />
          <StatCard value={formatModifier(modifier)} label={tUi("modifier")} />
          <StatCard value={last ? last.total : "-"} label={tUi("total")} />
          <StatCard value={history.length} label={tUi("rolls")} />
        </StatGrid>
        <TwoColumn>
          <div className="space-y-3">
            <SectionTitle>{tUi("dice")}</SectionTitle>
            <div
              className={`flex items-end justify-center gap-6 py-6 transition-transform duration-150 motion-reduce:transition-none ${
                spinning ? "rotate-6 scale-95 motion-reduce:rotate-0" : ""
              }`}
            >
              {last
                ? last.dice.map((value, index) => {
                    const keep = index === keptIndex(last.dice, last.mode);
                    const discarded = last.dice.length > 1 && !keep;
                    return (
                      <div key={index} className="flex flex-col items-center gap-1.5">
                        <div
                          className={`flex size-20 items-center justify-center rounded-2xl border-2 text-3xl font-extrabold tabular-nums transition-colors duration-150 ${
                            keep
                              ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-300"
                              : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                          } ${discarded ? "opacity-60" : ""}`}
                        >
                          {value}
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {discarded ? tUi("discarded") : keep ? tUi("kept") : tUi("result")}
                        </span>
                      </div>
                    );
                  })
                : (
                  <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-2xl font-extrabold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                    ?
                  </div>
                )}
            </div>
            {last && (
              <div className="flex justify-center">
                <CopyButton
                  value={formatRoll(last)}
                  label={tUi("copy")}
                  title={tUi("copyTheResultOfTheLastRoll")}
                />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <SectionTitle>{tUi("settings")}</SectionTitle>
            <Field label={tUi("modifier")} htmlFor="dice-modifier">
              <NumberInput
                id="dice-modifier"
                value={modifier}
                onChange={onModifier}
                min={-100}
                max={100}
                step={1}
              />
            </Field>
            <Field label={tUi("mode")} htmlFor="dice-mode">
              <SelectInput
                id="dice-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "normal", label: tUi("normal") },
                  { value: "advantage", label: tUi("advantage") },
                  { value: "disadvantage", label: tUi("disadvantage") },
                ]}
              />
            </Field>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {tUi("advantageAndDisadvantageNote")}
            </p>
          </div>
        </TwoColumn>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <SectionTitle>{tUi("history")}</SectionTitle>
          {history.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {tUi("noRollsYetPressRollD20ToStart")}
            </p>
          ) : (
            <ul className="mt-2">
              {history.map((roll) => (
                <li
                  key={roll.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-2 py-2 text-xs last:border-b-0 dark:border-slate-800/60"
                >
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {roll.dice.join(" / ")}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {tUi("kept")} {roll.kept}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatModifier(roll.modifier)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {modeLabels[roll.mode] ?? roll.mode}
                  </span>
                  <span className="ml-auto font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {roll.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Note>{tUi("diceAreRolledInYourBrowser")}</Note>
      </Panel>
    </div>
  );
}
