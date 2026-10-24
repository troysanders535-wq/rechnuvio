"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  RegexFlagToggles,
  RegexMatchReport,
  RegexPatternInput,
  RegexStatusLine,
  RegexTestText,
  RegexTokenList,
  useRegexRunner,
} from "./RegexWorkbench";
import { tokenizePattern } from "./regexTokens";

/**
 * The regex explainer: it reads a pattern and explains every token of it in
 * plain language, from the literal text over the character classes up to the
 * groups, the anchors and the quantifiers.
 */
export function RegexExplainerView() {
  const tUi = useTranslations("ui.engines.RegexEngine");
  const [pattern, setPattern] = useState("\\d{4}-\\d{2}-\\d{2}");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState("2026-10-23 and 1995-06-15");

  const { matches, isValid, errorMessage } = useRegexRunner(pattern, flags, testText);
  const tokens = React.useMemo(() => tokenizePattern(pattern), [pattern]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Pattern Input Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <RegexPatternInput value={pattern} flags={flags} onChange={setPattern} />
          <RegexFlagToggles flags={flags} onChange={setFlags} />
        </div>

        <RegexStatusLine
          isValid={isValid}
          errorMessage={errorMessage}
          matchCount={matches.length}
        />
      </div>

      {/* Token Breakdown */}
      <div className="border-b border-slate-800 bg-slate-950 p-4">
        <h4 className="text-xs font-semibold text-slate-400">{tUi("patternBreakdown")}</h4>
        <p className="mt-1 text-[11px] text-slate-500">{tUi("patternBreakdownHint")}</p>
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <RegexTokenList tokens={tokens} />
        </div>
      </div>

      {/* Test String Textarea */}
      <RegexTestText value={testText} onChange={setTestText} />

      {/* Matches Breakdown */}
      <RegexMatchReport matches={matches} isValid={isValid} errorMessage={errorMessage} />
    </div>
  );
}
