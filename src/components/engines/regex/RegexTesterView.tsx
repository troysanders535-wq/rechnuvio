"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  RegexFlagToggles,
  RegexMatchReport,
  RegexPatternInput,
  RegexStatusLine,
  RegexTestText,
  useRegexRunner,
} from "./RegexWorkbench";

/**
 * The plain regular expression tester. It is the workspace of the tester, of
 * the checker and of the JavaScript tester.
 */
export function RegexTesterView() {
  const tUi = useTranslations("ui.engines.RegexEngine");
  const [pattern, setPattern] = useState(
    "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",
  );
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState(
    "Contact support at hallo@rechnuvio.de or admin@company.org for assistance.",
  );
  const { matches, isValid, errorMessage } = useRegexRunner(pattern, flags, testText);

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

      {/* Test String Textarea */}
      <RegexTestText value={testText} onChange={setTestText} />

      {/* Matches Breakdown */}
      <RegexMatchReport matches={matches} isValid={isValid} errorMessage={errorMessage} />
    </div>
  );
}
