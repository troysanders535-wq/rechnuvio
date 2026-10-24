"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  DevClearButton,
  DevCopyButton,
  DevEditor,
  DevError,
  DevPanel,
  devButtonClass,
} from "./DevKit";
import { latexToMathml } from "./latexMathml";

type MathVariant = "latex" | "math";

const SAMPLES: Record<MathVariant, string> = {
  latex: String.raw`E = mc^2 \quad \frac{a+b}{c} = \sqrt{x^2 + y^2} \sum_{i=1}^{n} i`,
  math: String.raw`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \leq \infty \times \alpha`,
};

/**
 * The symbols the palette offers.
 *
 * Every entry is a LaTeX macro the converter understands, so a symbol that is
 * inserted always renders.
 */
const SYMBOLS: { label: string; code: string }[] = [
  { label: "frac", code: "\\frac{a}{b}" },
  { label: "sqrt", code: "\\sqrt{x}" },
  { label: "sum", code: "\\sum_{i=1}^{n}" },
  { label: "int", code: "\\int_{a}^{b}" },
  { label: "prod", code: "\\prod_{i=1}^{n}" },
  { label: "alpha", code: "\\alpha" },
  { label: "beta", code: "\\beta" },
  { label: "gamma", code: "\\gamma" },
  { label: "delta", code: "\\delta" },
  { label: "theta", code: "\\theta" },
  { label: "lambda", code: "\\lambda" },
  { label: "mu", code: "\\mu" },
  { label: "pi", code: "\\pi" },
  { label: "sigma", code: "\\sigma" },
  { label: "phi", code: "\\phi" },
  { label: "omega", code: "\\omega" },
  { label: "Gamma", code: "\\Gamma" },
  { label: "Delta", code: "\\Delta" },
  { label: "Sigma", code: "\\Sigma" },
  { label: "Omega", code: "\\Omega" },
  { label: "times", code: "\\times" },
  { label: "cdot", code: "\\cdot" },
  { label: "div", code: "\\div" },
  { label: "pm", code: "\\pm" },
  { label: "leq", code: "\\leq" },
  { label: "geq", code: "\\geq" },
  { label: "neq", code: "\\neq" },
  { label: "approx", code: "\\approx" },
  { label: "equiv", code: "\\equiv" },
  { label: "infty", code: "\\infty" },
  { label: "partial", code: "\\partial" },
  { label: "to", code: "\\to" },
  { label: "rightarrow", code: "\\rightarrow" },
  { label: "Rightarrow", code: "\\Rightarrow" },
  { label: "in", code: "\\in" },
  { label: "notin", code: "\\notin" },
  { label: "subset", code: "\\subset" },
  { label: "subseteq", code: "\\subseteq" },
  { label: "cup", code: "\\cup" },
  { label: "cap", code: "\\cap" },
  { label: "land", code: "\\land" },
  { label: "lor", code: "\\lor" },
  { label: "neg", code: "\\neg" },
  { label: "ldots", code: "\\ldots" },
  { label: "prime", code: "\\prime" },
  { label: "deg", code: "\\deg" },
  { label: "angle", code: "\\angle" },
  { label: "perp", code: "\\perp" },
  { label: "therefore", code: "\\therefore" },
  { label: "because", code: "\\because" },
  { label: "text", code: "\\text{text}" },
  { label: "mathrm", code: "\\mathrm{text}" },
  { label: "langle", code: "\\langle" },
  { label: "rangle", code: "\\rangle" },
  { label: "lfloor", code: "\\lfloor" },
  { label: "rfloor", code: "\\rfloor" },
  { label: "lceil", code: "\\lceil" },
  { label: "rceil", code: "\\rceil" },
];

/**
 * The equation editors.
 *
 * The formula is translated to MathML and rendered by the browser itself, so
 * the preview is real and needs no rendering library.
 */
export function MathTool({ variant }: { variant: MathVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [source, setSource] = React.useState("");
  const [mathml, setMathml] = React.useState("");
  const [unsupported, setUnsupported] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);

  const title = variant === "latex" ? tUi("latexEditorTitle") : tUi("mathEditorTitle");
  const subtitle =
    variant === "latex" ? tUi("latexEditorSubtitle") : tUi("mathEditorSubtitle");

  const render = React.useCallback(
    (next: string) => {
      setSource(next);
      setError("");
      if (!next.trim()) {
        setMathml("");
        setUnsupported([]);
        return;
      }
      try {
        const result = latexToMathml(next);
        setMathml(result.mathml);
        setUnsupported(result.unsupported);
      } catch (err) {
        setMathml("");
        setUnsupported([]);
        setError(String((err as Error)?.message || err));
      }
    },
    [],
  );

  /** Insert a symbol at the caret, or at the end of the formula. */
  const insert = React.useCallback(
    (snippet: string) => {
      const element = editorRef.current;
      const start = element ? element.selectionStart ?? source.length : source.length;
      const end = element ? element.selectionEnd ?? start : start;
      const next = `${source.slice(0, start)}${snippet}${source.slice(end)}`;
      render(next);
      window.requestAnimationFrame(() => {
        element?.focus();
        const caret = start + snippet.length;
        element?.setSelectionRange(caret, caret);
      });
    },
    [render, source],
  );

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button
            type="button"
            onClick={() => render(source)}
            className={devButtonClass}
          >
            {tUi("renderEquation")}
          </button>
          <DevCopyButton
            value={mathml}
            label={{ copy: tUi("copyMathml"), copied: tUi("copied") }}
          />
          <DevClearButton
            onClick={() => render("")}
            label={tUi("clear")}
          />
          <button
            type="button"
            onClick={() => render(SAMPLES[variant])}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("loadExample")}
          </button>
        </>
      }
    >
      <DevEditor
        value={source}
        onChange={render}
        placeholder={tUi("pasteEquationHere")}
        rows={8}
        inputRef={editorRef}
      />

      {error ? <DevError>{error}</DevError> : null}

      {unsupported.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {tUi("unsupportedMacros")}: {unsupported.map((macro) => `\\${macro}`).join(", ")}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("renderedEquation")}
        </p>
        <div className="min-h-24 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          {mathml ? (
            <span
              className="text-lg text-slate-900 dark:text-white"
              dangerouslySetInnerHTML={{ __html: mathml }}
            />
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {tUi("noEquationYet")}
            </span>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("symbolPalette")}
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol.label}
              type="button"
              onClick={() => insert(symbol.code)}
              title={symbol.code}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {symbol.label}
            </button>
          ))}
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("supportedSymbols")}
        </summary>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-400">
          <li>{"\\frac, \\sqrt, \\sum, \\int"}</li>
          <li>{tUi("superscriptHint")}</li>
          <li>{"\\alpha … \\omega, \\Gamma … \\Omega"}</li>
          <li>{"\\times, \\cdot, \\pm, \\leq, \\geq, \\neq"}</li>
          <li>{"\\infty, \\partial, \\to, \\Rightarrow"}</li>
          <li>{"\\left( … \\right), \\text{…}"}</li>
        </ul>
      </details>
    </DevPanel>
  );
}
