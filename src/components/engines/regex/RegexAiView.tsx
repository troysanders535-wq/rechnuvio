"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  RegexFlagToggles,
  RegexMatchReport,
  RegexStatusLine,
  RegexTestText,
  RegexTokenList,
  useRegexRunner,
} from "./RegexWorkbench";
import { PATTERN_PRESETS, presetById, resolvePattern, tokenizePattern } from "./regexTokens";

/**
 * The pattern assistant of the "regex-ai" tool.
 *
 * The tool does not call a remote model: it is a deterministic helper that
 * builds a well formed regular expression from a preset and the keywords of
 * the description, explains every token of it and tests it live. The copy of
 * the workspace says exactly that.
 */
export function RegexAiView() {
  const tUi = useTranslations("ui.engines.RegexEngine");
  const [presetId, setPresetId] = useState("auto");
  const [description, setDescription] = useState("a date in YYYY-MM-DD form");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState("today is 2026-10-23");

  const resolved = React.useMemo(
    () => resolvePattern(description, presetId),
    [description, presetId],
  );
  const preset = presetById(resolved.presetId);
  const { matches, isValid, errorMessage } = useRegexRunner(resolved.pattern, flags, testText);
  const tokens = React.useMemo(() => tokenizePattern(resolved.pattern), [resolved.pattern]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Assistant Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tUi("patternAssistantTitle")}</h3>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {tUi("patternAssistantOffline")}
        </p>

        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {tUi("kindOfPattern")}
            </label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="mt-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {PATTERN_PRESETS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {tUi(entry.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 flex-col">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {tUi("describeThePattern")}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tUi("describeThePatternPlaceholder")}
              className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col justify-end">
            <RegexFlagToggles flags={flags} onChange={setFlags} />
          </div>
        </div>
      </div>

      {/* Generated Pattern */}
      <div className="border-b border-slate-800 bg-slate-950 p-4">
        <h4 className="text-xs font-semibold text-slate-400">{tUi("generatedPattern")}</h4>
        <code className="mt-2 block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 font-mono text-xs text-sky-300">
          /{resolved.pattern}/{flags}
        </code>
        {preset ? (
          <p className="mt-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">{tUi(preset.labelKey)}:</span>{" "}
            {tUi(preset.hintKey)}
          </p>
        ) : null}

        <h4 className="mt-4 text-xs font-semibold text-slate-400">{tUi("patternBreakdown")}</h4>
        <p className="mt-1 text-[11px] text-slate-500">{tUi("patternBreakdownHint")}</p>
        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <RegexTokenList tokens={tokens} />
        </div>
      </div>

      {/* Test String Textarea */}
      <RegexTestText value={testText} onChange={setTestText} />

      {/* Status and matches */}
      <div className="border-t border-slate-800 px-4 pt-3">
        <RegexStatusLine
          isValid={isValid}
          errorMessage={errorMessage}
          matchCount={matches.length}
        />
      </div>
      <RegexMatchReport matches={matches} isValid={isValid} errorMessage={errorMessage} />
    </div>
  );
}
