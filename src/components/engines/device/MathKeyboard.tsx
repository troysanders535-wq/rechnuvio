"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Keyboard, Trash2 } from "lucide-react";
import { DevicePanel, deviceButtonClass, deviceFieldLabelClass, deviceGhostButtonClass, deviceInputClass } from "./kit";

const SYMBOLS = [
  "+",
  "−",
  "×",
  "÷",
  "±",
  "=",
  "≠",
  "≈",
  "≤",
  "≥",
  "√",
  "∛",
  "π",
  "τ",
  "φ",
  "θ",
  "∞",
  "∑",
  "∏",
  "∫",
  "∂",
  "∇",
  "∈",
  "∉",
  "⊂",
  "∪",
  "∩",
  "°",
  "′",
  "µ",
  "½",
  "¼",
  "¾",
  "x²",
  "x³",
  "xⁿ",
  "x⁻¹",
  "→",
  "⇒",
  "⋅",
  "…",
];

/**
 * The on screen keyboard of the mathematical symbols.
 *
 * Every key writes its symbol into the field at the place of the cursor.
 */
export function MathKeyboard() {
  const t = useTranslations("ui.engines.device");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("x = (−b ± √(b² − 4ac)) / (2a)");
  const [copied, setCopied] = useState(false);

  const insert = (symbol: string) => {
    const field = inputRef.current;
    if (!field) {
      setValue((current) => `${current}${symbol}`);
      return;
    }
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${symbol}${value.slice(end)}`;
    setValue(next);
    const caret = start + symbol.length;
    window.requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  };

  const copy = () => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  };

  return (
    <DevicePanel title={t("mathKeyboard.title")} subtitle={t("mathKeyboard.subtitle")}>
      <div>
        <label className={deviceFieldLabelClass} htmlFor="math-keyboard-target">
          {t("mathKeyboard.field")}
        </label>
        <input
          id="math-keyboard-target"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={deviceInputClass}
          spellCheck={false}
        />
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Keyboard className="size-4 text-sky-700" />
          {t("mathKeyboard.symbols")}
        </p>
        <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => insert(symbol)}
              aria-label={t("mathKeyboard.insert", { symbol })}
              className="rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:bg-sky-950"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={deviceButtonClass}>
          <Copy className="size-3.5" />
          {copied ? t("mathKeyboard.copied") : t("mathKeyboard.copy")}
        </button>
        <button type="button" onClick={() => setValue("")} className={deviceGhostButtonClass}>
          <Trash2 className="size-3.5" />
          {t("mathKeyboard.clear")}
        </button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mathKeyboard.hint")}</p>
    </DevicePanel>
  );
}
