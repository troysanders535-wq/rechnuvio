"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Hash, RefreshCw, Type } from "lucide-react";
import {
  RandPanel,
  cryptoRandomInt,
  cryptoShuffle,
  randAreaClass,
  randInputClass,
  randPrimaryButtonClass,
  randSelectClass,
  useMounted,
} from "./shared";

/**
 * The remaining randomizers of the family: the numbers, the letters, the
 * Secret Santa pairs and the order of the White Elephant turns.
 */

/* ------------------------------------------------------ the numbers --- */

/**
 * The random number generator: draws numbers out of a range.
 *
 * The catalogue promises a lottery pick, decimals, a draw without repeats,
 * exclusions, sorting and a history, so all six are real controls here.
 */

/** A float in [0, 1) drawn from the browser's cryptographic randomness. */
function cryptoRandomFloat(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 4294967296;
}

export function RandomNumberGeneratorView() {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();

  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [amount, setAmount] = useState(1);
  const [decimals, setDecimals] = useState(0);
  const [unique, setUnique] = useState(false);
  const [excludedText, setExcludedText] = useState("");
  const [sorted, setSorted] = useState(false);
  const [values, setValues] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([]);
  const [notice, setNotice] = useState("");

  /** The numbers the user has ruled out, parsed from the free text field. */
  const excluded = new Set(
    excludedText
      .split(/[\s,;]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part))
      .filter((n) => Number.isFinite(n)),
  );

  const draw = () => {
    setNotice("");
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    const count = Math.min(Math.max(amount, 1), 100);

    // Whole numbers: the pool is walked without replacement when the draw has
    // to come out without a repeat. Decimals cannot be drawn without a
    // repeat, so the promise only applies to whole numbers.
    if (decimals === 0) {
      const pool: number[] = [];
      for (let n = low; n <= high && pool.length < 100000; n += 1) {
        if (!excluded.has(n)) pool.push(n);
      }
      if (pool.length === 0) {
        setNotice(t("misc.number.nothingLeft"));
        setValues([]);
        return;
      }
      if (unique) {
        if (pool.length < count) {
          setNotice(t("misc.number.tooFewForUnique"));
          return;
        }
        const taken = pool.slice();
        const next: number[] = [];
        for (let i = 0; i < count; i += 1) {
          next.push(taken.splice(cryptoRandomInt(taken.length), 1)[0]);
        }
        setValues(sorted ? next.slice().sort((a, b) => a - b) : next);
        setHistory((prev) => [next, ...prev].slice(0, 8));
        return;
      }
      const next = Array.from({ length: count }, () => pool[cryptoRandomInt(pool.length)]);
      setValues(sorted ? next.slice().sort((a, b) => a - b) : next);
      setHistory((prev) => [next, ...prev].slice(0, 8));
      return;
    }

    if (unique) {
      setNotice(t("misc.number.uniqueNeedsWholeNumbers"));
      return;
    }

    const factor = 10 ** decimals;
    const next = Array.from({ length: count }, () => {
      const raw = low + cryptoRandomFloat() * (high - low);
      return Math.round(raw * factor) / factor;
    });
    setValues(sorted ? next.slice().sort((a, b) => a - b) : next);
    setHistory((prev) => [next, ...prev].slice(0, 8));
  };

  return (
    <RandPanel
      title={t("misc.number.title")}
      subtitle={t("misc.number.subtitle")}
      toolbar={
        <button type="button" onClick={draw} className={randPrimaryButtonClass}>
          <Hash className="size-4" />
          <span>{t("misc.number.draw")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.min")}
            <input
              type="number"
              data-testid="number-min"
              value={min}
              onChange={(event) => setMin(Number(event.target.value) || 0)}
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.max")}
            <input
              type="number"
              data-testid="number-max"
              value={max}
              onChange={(event) => setMax(Number(event.target.value) || 0)}
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.amount")}
            <input
              type="number"
              min={1}
              max={100}
              data-testid="number-amount"
              value={amount}
              onChange={(event) =>
                setAmount(Math.min(Math.max(Number(event.target.value) || 1, 1), 100))
              }
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.decimals")}
            <select
              data-testid="number-decimals"
              value={decimals}
              onChange={(event) => setDecimals(Number(event.target.value) || 0)}
              className={`${randSelectClass} mt-1.5`}
            >
              <option value={0}>{t("misc.number.wholeNumbers")}</option>
              <option value={1}>{t("misc.number.oneDecimal")}</option>
              <option value={2}>{t("misc.number.twoDecimals")}</option>
              <option value={3}>{t("misc.number.threeDecimals")}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.exclude")}
            <input
              type="text"
              data-testid="number-exclude"
              value={excludedText}
              onChange={(event) => setExcludedText(event.target.value)}
              placeholder={t("misc.number.excludePlaceholder")}
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              data-testid="number-unique"
              checked={unique}
              onChange={(event) => setUnique(event.target.checked)}
            />
            <span>{t("misc.number.unique")}</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              data-testid="number-sorted"
              checked={sorted}
              onChange={(event) => setSorted(event.target.checked)}
            />
            <span>{t("misc.number.sorted")}</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("misc.number.hint")}</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.number.result")}
          </p>
          {notice ? (
            <p data-testid="number-notice" className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {notice}
            </p>
          ) : null}
          {!mounted || values.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("misc.number.empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  data-testid="number-value"
                  data-value={value}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-mono text-xl font-extrabold text-emerald-400"
                >
                  {`${value} `}
                </span>
              ))}
            </div>
          )}
          {history.length > 0 ? (
            <div data-testid="number-history">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("misc.number.history")}
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {history.map((entry, index) => (
                  <li key={`${entry.join("-")}-${index}`} data-testid="number-history-row">
                    {entry.join(", ")}
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

/* ------------------------------------------------------- the letters --- */

/** The random letter generator: draws random letters. */
export function RandomLetterGeneratorView() {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();

  const [amount, setAmount] = useState(6);
  const [mode, setMode] = useState("mixed");
  const [letters, setLetters] = useState<string[]>([]);

  const draw = () => {
    const count = Math.min(Math.max(amount, 1), 26);
    const next = Array.from({ length: count }, () => {
      const code = 65 + cryptoRandomInt(26);
      const letter = String.fromCharCode(code);
      if (mode === "lower") return letter.toLowerCase();
      if (mode === "upper") return letter;
      return cryptoRandomInt(2) === 0 ? letter : letter.toLowerCase();
    });
    setLetters(next);
  };

  return (
    <RandPanel
      title={t("misc.letter.title")}
      subtitle={t("misc.letter.subtitle")}
      toolbar={
        <button type="button" onClick={draw} className={randPrimaryButtonClass}>
          <Type className="size-4" />
          <span>{t("misc.letter.draw")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.letter.amount")}
            <input
              type="number"
              min={1}
              max={26}
              data-testid="letter-amount"
              value={amount}
              onChange={(event) =>
                setAmount(Math.min(Math.max(Number(event.target.value) || 1, 1), 26))
              }
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.letter.case")}
            <select
              value={mode}
              data-testid="letter-case"
              onChange={(event) => setMode(event.target.value)}
              className={`${randSelectClass} mt-1.5 w-full`}
            >
              <option value="mixed">{t("misc.letter.mixed")}</option>
              <option value="upper">{t("misc.letter.upper")}</option>
              <option value="lower">{t("misc.letter.lower")}</option>
            </select>
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.letter.result")}
          </p>
          {!mounted || letters.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("misc.letter.empty")}</p>
          ) : (
            <p
              data-testid="letter-result"
              className="rounded-xl bg-slate-900 px-4 py-3 font-mono text-2xl font-extrabold tracking-widest text-emerald-400"
            >
              {letters.map((letter, index) => (
                <span key={`${letter}-${index}`} data-testid="letter-value" data-value={letter}>
                  {`${letter} `}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </RandPanel>
  );
}

/* ---------------------------------------------------- the Secret Santa --- */

/**
 * An order in which nobody draws their own name.
 *
 * The order is shuffled again until it has no fixed point, so every name is
 * given to somebody else.
 */
function derangement(count: number): number[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const order = cryptoShuffle(Array.from({ length: count }, (_, index) => index));
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = 0; index < count; index += 1) {
        if (order[index] === index) {
          const other = (index + 1) % count;
          const swap = order[index];
          order[index] = order[other];
          order[other] = swap;
          changed = true;
        }
      }
    }
    if (!order.some((value, index) => value === index)) return order;
  }
  return Array.from({ length: count }, (_, index) => (index + 1) % count);
}

/** The Secret Santa generator: pairs every name with another name. */
export function SecretSantaGeneratorView() {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();

  const [text, setText] = useState("");
  const [pairs, setPairs] = useState<{ giver: string; receiver: string }[] | null>(null);

  const assign = () => {
    const names = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 60);
    if (names.length < 2) return;
    const order = derangement(names.length);
    setPairs(names.map((name, index) => ({ giver: name, receiver: names[order[index]] })));
  };

  return (
    <RandPanel
      title={t("misc.secretSanta.title")}
      subtitle={t("misc.secretSanta.subtitle")}
      toolbar={
        <button type="button" onClick={assign} className={randPrimaryButtonClass}>
          <Gift className="size-4" />
          <span>{t("misc.secretSanta.assign")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("misc.secretSanta.names")}
          <textarea
            value={text}
            data-testid="santa-names"
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className={`${randAreaClass} mt-1.5`}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {t("misc.secretSanta.hint")}
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.secretSanta.assignment")}
          </p>
          {!mounted || !pairs ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("misc.secretSanta.empty")}</p>
          ) : (
            <ul className="space-y-1">
              {pairs.map((pair) => (
                <li
                  key={pair.giver}
                  data-testid="santa-pair"
                  data-giver={pair.giver}
                  data-receiver={pair.receiver}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                >
                  {t("misc.secretSanta.pair", {
                    giver: `${pair.giver} `,
                    receiver: `${pair.receiver} `,
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RandPanel>
  );
}

/* -------------------------------------------------- the White Elephant --- */

/** The White Elephant generator: draws the order of the turns. */
export function WhiteElephantGeneratorView() {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();

  const [text, setText] = useState("");
  const [order, setOrder] = useState<string[] | null>(null);

  const draw = () => {
    const names = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 60);
    if (names.length === 0) return;
    setOrder(cryptoShuffle(names));
  };

  return (
    <RandPanel
      title={t("misc.whiteElephant.title")}
      subtitle={t("misc.whiteElephant.subtitle")}
      toolbar={
        <button type="button" onClick={draw} className={randPrimaryButtonClass}>
          <RefreshCw className="size-4" />
          <span>{t("misc.whiteElephant.draw")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("misc.whiteElephant.names")}
          <textarea
            value={text}
            data-testid="elephant-names"
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className={`${randAreaClass} mt-1.5`}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {t("misc.whiteElephant.hint")}
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("misc.whiteElephant.turnOrder")}
          </p>
          {!mounted || !order ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("misc.whiteElephant.empty")}</p>
          ) : (
            <ol className="space-y-1">
              {order.map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  data-testid="elephant-turn"
                  data-name={name}
                  data-turn={index + 1}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                >
                  {t("misc.whiteElephant.turn", { number: index + 1, name: `${name} ` })}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </RandPanel>
  );
}
