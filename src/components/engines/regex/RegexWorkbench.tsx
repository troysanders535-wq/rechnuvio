"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RegexToken } from "./regexTokens";

/** One match of a regular expression. */
export interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
}

/**
 * Run a regular expression over a text. The result is computed while
 * rendering, so the report is always in sync with the inputs.
 */
export function useRegexRunner(pattern: string, flags: string, testText: string) {
  return React.useMemo(() => {
    const empty = { matches: [] as RegexMatch[], isValid: true, errorMessage: "" };
    if (!pattern) return empty;

    try {
      const regex = new RegExp(pattern, flags);
      const found: RegexMatch[] = [];

      if (flags.includes("g")) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(testText)) !== null) {
          if (m.index === regex.lastIndex) regex.lastIndex += 1;
          found.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (found.length >= 500) break;
        }
      } else {
        const m = regex.exec(testText);
        if (m) found.push({ match: m[0], index: m.index, groups: m.slice(1) });
      }

      return { matches: found, isValid: true, errorMessage: "" };
    } catch (err: any) {
      return {
        matches: [] as RegexMatch[],
        isValid: false,
        errorMessage: err?.message ?? "",
      };
    }
  }, [pattern, flags, testText]);
}

/** The flag buttons of the tester. */
export function RegexFlagToggles({
  flags,
  onChange,
}: {
  flags: string;
  onChange: (flags: string) => void;
}) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  const toggleFlag = (flag: string) => {
    onChange(flags.includes(flag) ? flags.replace(flag, "") : flags + flag);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
      {["g", "i", "m", "s"].map((f) => {
        const active = flags.includes(f);
        return (
          <button
            key={f}
            type="button"
            onClick={() => toggleFlag(f)}
            className={`rounded px-2.5 py-1 font-mono font-semibold transition ${
              active
                ? "bg-sky-800 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
            title={tUi("toggleFlag", { flag: f })}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

/** The pattern field of the tester, framed by the two slashes. */
export function RegexPatternInput({
  value,
  flags,
  onChange,
}: {
  value: string;
  flags: string;
  onChange: (value: string) => void;
}) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  return (
    <div className="flex flex-1 items-center rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <span className="font-mono text-base font-bold text-slate-400">/</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tUi("insertRegexPattern")}
        className="flex-1 bg-transparent px-2 font-mono text-sm text-slate-900 outline-none dark:text-white"
      />
      <span className="font-mono text-base font-bold text-slate-400">/{flags}</span>
    </div>
  );
}

/** The validation line of the tester. */
export function RegexStatusLine({
  isValid,
  errorMessage,
  matchCount,
}: {
  isValid: boolean;
  errorMessage: string;
  matchCount: number;
}) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  return (
    <div className="mt-2 text-xs">
      {isValid ? (
        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {tUi("validRegularExpression")} {tUi("matchesFound", { count: matchCount })}
        </span>
      ) : (
        <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3.5" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}

/** The test text field of the tester. */
export function RegexTestText({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  return (
    <div className="p-4 bg-slate-950">
      <label className="text-xs font-semibold text-slate-400">{tUi("testString")}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={tUi("pasteOrWriteTextToTest")}
        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 font-mono text-sm text-slate-200 outline-none"
      />
    </div>
  );
}

/** The report of the matches of a regular expression. */
export function RegexMatchReport({
  matches,
  isValid,
  errorMessage,
}: {
  matches: RegexMatch[];
  isValid: boolean;
  errorMessage: string;
}) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  return (
    <div className="border-t border-slate-800 bg-slate-950 p-4">
      <h4 className="text-xs font-semibold text-slate-400">
        {tUi("captureMatches")}
        {matches.length})
      </h4>
      <div className="mt-3 space-y-2 max-h-60 overflow-auto">
        {matches.length === 0 ? (
          <p className="text-xs text-slate-500">{tUi("noMatchesFound")}</p>
        ) : (
          matches.map((m, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-xs font-mono"
            >
              <div className="flex items-center justify-between text-sky-400">
                <span className="font-semibold">
                  Match #{idx + 1}: &quot;{m.match}&quot;
                </span>
                <span className="text-[10px] text-slate-500">
                  {tUi("index")} {m.index}
                </span>
              </div>
              {m.groups.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-slate-400">
                  {m.groups.map((grp, gIdx) => (
                    <span
                      key={gIdx}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]"
                    >
                      {tUi("group")} {gIdx + 1}: &quot;{grp}&quot;
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {!isValid && errorMessage ? (
        <p className="mt-2 text-[11px] text-rose-400">{errorMessage}</p>
      ) : null}
    </div>
  );
}

/** One row of the token breakdown, with the tokens of a group below it. */
function RegexTokenNode({ token }: { token: RegexToken }) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300">
          {token.text}
        </code>
        <span className="text-[11px] leading-relaxed text-slate-400">
          {tUi(token.meaningKey, token.values)}
        </span>
      </div>
      {token.children && token.children.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l border-slate-800 pl-3">
          {token.children.map((child, childIdx) => (
            <RegexTokenNode key={`${child.text}-${childIdx}`} token={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** The token by token breakdown of a regular expression. */
export function RegexTokenList({ tokens }: { tokens: RegexToken[] }) {
  const tUi = useTranslations("ui.engines.RegexEngine");

  if (tokens.length === 0) {
    return <p className="text-xs text-slate-500">{tUi("noTokensToExplain")}</p>;
  }

  return (
    <ul className="space-y-2">
      {tokens.map((token, idx) => (
        <RegexTokenNode key={`${token.text}-${idx}`} token={token} />
      ))}
    </ul>
  );
}
