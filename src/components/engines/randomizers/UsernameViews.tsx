"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, ShieldCheck, Star, Copy, Check } from "lucide-react";
import { USERNAME_ADJECTIVES, USERNAME_NOUNS } from "@/data/randomizerUsernames";
import {
  RandPanel,
  cryptoPick,
  cryptoRandomInt,
  randPrimaryButtonClass,
  useMounted,
} from "./shared";

/**
 * The username generators.
 *
 * Every generator builds the usernames from the same word lists, but every
 * one of them obeys the rules of its own platform: the length of the name
 * and the characters that are allowed in it.
 *
 * The user can add a word of their own, pick the style of the separator,
 * copy a name and keep a shortlist of the names that are worth a second
 * look. The shortlist lives in the memory of the page only: it is never
 * written to the device.
 */

export interface UsernamePlatform {
  titleKey: string;
  subtitleKey: string;
  /** The shortest name the platform allows. */
  min: number;
  /** The longest name the platform allows. */
  max: number;
  /** The characters the platform allows. */
  pattern: RegExp;
  /** The rules that are shown next to the results. */
  ruleKeys: string[];
  /** The separators that may be used between the words. */
  separators: readonly string[];
}

/** Keep only the characters the platform allows. */
function sanitizeWord(word: string, platform: UsernamePlatform): string {
  return word
    .split("")
    .filter((char) => platform.pattern.test(char))
    .join("")
    .slice(0, platform.max);
}

/** Build a name that the platform accepts. */
function buildUsername(
  platform: UsernamePlatform,
  ownWord: string,
  separator: string,
): string {
  const custom = ownWord ? sanitizeWord(ownWord, platform) : "";
  for (let attempt = 0; attempt < 80; attempt += 1) {
    // The word of the user replaces the first part of the name.
    const adjective = custom || cryptoPick(USERNAME_ADJECTIVES) || "Quiet";
    const noun = cryptoPick(USERNAME_NOUNS) || "Otter";
    const gap = separator || cryptoPick(platform.separators) || "_";
    const number = cryptoRandomInt(1000);
    const suffix = cryptoRandomInt(2) === 0 ? `${number}` : "";
    const candidate = `${adjective}${gap}${noun}${suffix}`;
    if (
      candidate.length >= platform.min &&
      candidate.length <= platform.max &&
      platform.pattern.test(candidate)
    ) {
      return candidate;
    }
  }
  // The fallback keeps the promise of the tool even in the unlikely case
  // that no combination passes the rules.
  const fallback = `user${cryptoRandomInt(100000)}`;
  return fallback.slice(0, platform.max);
}

/** The username generator of one platform. */
export function UsernameView({ platform }: { platform: UsernamePlatform }) {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();
  const [seed, setSeed] = useState(0);
  const [ownWord, setOwnWord] = useState("");
  const [style, setStyle] = useState(platform.separators[0]);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const names = useMemo(() => {
    if (!mounted) return [];
    const drawn = Array.from({ length: 12 }, () => buildUsername(platform, ownWord, style));
    // Every click shows another ten names of the drawn pool.
    const start = (seed * 5) % drawn.length;
    return drawn.slice(start).concat(drawn.slice(0, start)).slice(0, 10);
  }, [mounted, seed, platform, ownWord, style]);

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      window.setTimeout(() => setCopied((current) => (current === name ? null : current)), 1600);
    } catch {
      // The browser refused the write. The name stays readable on the page.
      setCopied(null);
    }
  };

  const toggleShortlist = (name: string) => {
    setShortlist((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  return (
    <RandPanel
      title={t(platform.titleKey)}
      subtitle={t(platform.subtitleKey)}
      toolbar={
        <>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span>{t("usernames.yourWord")}</span>
            <input
              type="text"
              value={ownWord}
              onChange={(event) => setOwnWord(event.target.value)}
              placeholder={t("usernames.yourWordPlaceholder")}
              aria-label={t("usernames.yourWord")}
              className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium normal-case text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span>{t("usernames.style")}</span>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              aria-label={t("usernames.style")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium normal-case text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {platform.separators.map((separator, index) => (
                <option key={`${separator}-${index}`} value={separator}>
                  {separator || t("usernames.styleNone")}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSeed((value) => value + 1)}
            className={randPrimaryButtonClass}
          >
            <RefreshCw className="size-4" />
            <span>{t("usernames.generate")}</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("usernames.results")}
          </p>
          {names.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("usernames.loading")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {names.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="inline-flex items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    data-testid="username"
                    data-name={name}
                    onClick={() => copy(name)}
                    title={t("usernames.copy")}
                    className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 transition hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    data-testid="username-save"
                    data-name={name}
                    onClick={() => toggleShortlist(name)}
                    aria-label={t("usernames.save")}
                    aria-pressed={shortlist.includes(name)}
                    className="border-l border-slate-200 px-1.5 py-1.5 text-amber-500 transition hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <Star
                      className={`size-3.5 ${shortlist.includes(name) ? "fill-current" : ""}`}
                    />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("usernames.hint")}</p>
          {ownWord ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("usernames.yourWordHint")}
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Star className="size-4 text-amber-500" />
              {t("usernames.shortlist")}
            </p>
            {shortlist.length === 0 ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {t("usernames.shortlistEmpty")}
              </p>
            ) : (
              <>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {shortlist.map((name) => (
                    <li
                      key={name}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <button
                        type="button"
                        data-testid="shortlist-name"
                        onClick={() => copy(name)}
                        className="hover:text-sky-700 dark:hover:text-sky-300"
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        data-testid="shortlist-remove"
                        onClick={() => toggleShortlist(name)}
                        aria-label={t("usernames.remove")}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    data-testid="shortlist-copy-all"
                    onClick={() => copy(shortlist.join("\n"))}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline dark:text-sky-300"
                  >
                    {copied === shortlist.join("\n") ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied === shortlist.join("\n")
                      ? t("usernames.copied")
                      : t("usernames.copyAll")}
                  </button>
                  <button
                    type="button"
                    data-testid="shortlist-clear"
                    onClick={() => setShortlist([])}
                    className="text-[11px] font-semibold text-slate-500 hover:underline dark:text-slate-400"
                  >
                    {t("usernames.clearShortlist")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            {t("usernames.rulesTitle")}
          </p>
          <ul data-testid="username-rules" className="space-y-1.5">
            {platform.ruleKeys.map((key) => (
              <li
                key={key}
                data-testid="username-rule"
                className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300"
              >
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RandPanel>
  );
}
