"use client";

import React, { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Sigma, SquareFunction } from "lucide-react";
import {
  TimePanel,
  timeButtonClass,
  timeFieldLabelClass,
  timeGhostButtonClass,
  timeOutputClass,
} from "./kit";
import { latexToMathML } from "./latex";

const DEFAULT_FORMULA = "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";

const SYMBOLS: { label: string; snippet: string }[] = [
  { label: "x²", snippet: "^2" },
  { label: "xⁿ", snippet: "^n" },
  { label: "xᵢ", snippet: "_i" },
  { label: "a/b", snippet: "\\frac{a}{b}" },
  { label: "√", snippet: "\\sqrt{x}" },
  { label: "∑", snippet: "\\sum_{i=1}^{n}" },
  { label: "∫", snippet: "\\int_{a}^{b}" },
  { label: "π", snippet: "\\pi" },
  { label: "α", snippet: "\\alpha" },
  { label: "β", snippet: "\\beta" },
  { label: "×", snippet: "\\times" },
  { label: "÷", snippet: "\\div" },
  { label: "±", snippet: "\\pm" },
  { label: "≤", snippet: "\\leq" },
  { label: "≥", snippet: "\\geq" },
  { label: "≠", snippet: "\\neq" },
  { label: "≈", snippet: "\\approx" },
  { label: "∞", snippet: "\\infty" },
  { label: "∂", snippet: "\\partial" },
  { label: "·", snippet: "\\cdot" },
];

/**
 * The editor of a formula.
 *
 * The formula is written in LaTeX and rendered as MathML, which the browser
 * draws without any library.
 */
export function EquationEditor() {
  const t = useTranslations("ui.engines.time");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [source, setSource] = useState(DEFAULT_FORMULA);
  const [copied, setCopied] = useState(false);

  const mathml = useMemo(() => latexToMathML(source), [source]);

  const insert = (snippet: string) => {
    const field = textareaRef.current;
    if (!field) {
      setSource((current) => `${current}${snippet}`);
      return;
    }
    const start = field.selectionStart ?? source.length;
    const end = field.selectionEnd ?? source.length;
    const next = `${source.slice(0, start)}${snippet}${source.slice(end)}`;
    setSource(next);
    const caret = start + snippet.length;
    window.requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  };

  const copyMathml = () => {
    navigator.clipboard?.writeText(mathml).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  };

  return (
    <TimePanel title={t("equation.title")} subtitle={t("equation.subtitle")}>
      <div>
        <label className={timeFieldLabelClass} htmlFor="equation-formula">
          {t("equation.latexLabel")}
        </label>
        <textarea
          id="equation-formula"
          ref={textareaRef}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={4}
          spellCheck={false}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-sky-300 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
        />
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <SquareFunction className="size-4 text-sky-700" />
          {t("equation.preview")}
        </p>
        <div
          className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white"
          dangerouslySetInnerHTML={{ __html: mathml }}
        />
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Sigma className="size-4 text-sky-700" />
          {t("equation.symbols")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol.snippet}
              type="button"
              onClick={() => insert(symbol.snippet)}
              title={symbol.snippet}
              className={timeGhostButtonClass}
            >
              {symbol.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className={timeFieldLabelClass}>{t("equation.mathmlSource")}</p>
          <button type="button" onClick={copyMathml} className={timeGhostButtonClass}>
            <Copy className="size-3.5" />
            {copied ? t("equation.copied") : t("equation.copy")}
          </button>
        </div>
        <pre className={timeOutputClass}>{mathml}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSource(DEFAULT_FORMULA)}
          className={timeButtonClass}
        >
          {t("equation.loadExample")}
        </button>
        <button type="button" onClick={() => setSource("")} className={timeGhostButtonClass}>
          {t("equation.clear")}
        </button>
      </div>
    </TimePanel>
  );
}
