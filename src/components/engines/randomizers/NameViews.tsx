"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Shuffle, Sparkles } from "lucide-react";
import {
  BABY_NAMES,
  BABY_NAME_LENGTHS,
  BABY_NAME_ORIGINS,
  BABY_NAME_STYLES,
  type BabyNameEntry,
} from "@/data/randomizerNames";
import {
  RandPanel,
  cryptoShuffle,
  randGhostButtonClass,
  randPrimaryButtonClass,
  randSelectClass,
  useMounted,
} from "./shared";

/**
 * The baby name generators.
 *
 * The generators suggest names out of the list that ships with the app. The
 * list carries the origin, the style and the length of every name, so the
 * filters can narrow it down. The suggestion is drawn from the cryptographic
 * random source, so every click gives a new name.
 */

/** The length bucket of a name. */
function lengthOf(name: string): string {
  if (name.length <= 5) return "short";
  if (name.length <= 7) return "medium";
  return "long";
}

export interface BabyNameConfig {
  titleKey: string;
  subtitleKey: string;
  /** The genders the generator suggests. */
  genders: string[];
  /** Whether the gender can be chosen. */
  chooseGender: boolean;
}

/** The baby name generator. */
export function BabyNameView({ config }: { config: BabyNameConfig }) {
  const t = useTranslations("ui.engines.randomizers");
  const mounted = useMounted();

  const [gender, setGender] = useState(config.chooseGender ? "any" : config.genders[0]);
  const [origin, setOrigin] = useState("any");
  const [style, setStyle] = useState("any");
  const [length, setLength] = useState("any");
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState<BabyNameEntry | null>(null);

  const matches = useMemo(
    () =>
      BABY_NAMES.filter((entry) => {
        // A generator that offers a chosen gender uses that choice, the other
        // ones offer the genders of their own family.
        if (config.chooseGender) {
          if (gender !== "any" && entry.gender !== gender) return false;
        } else if (!config.genders.includes(entry.gender)) {
          return false;
        }
        if (origin !== "any" && entry.origin !== origin) return false;
        if (style !== "any" && entry.style !== style) return false;
        if (length !== "any" && lengthOf(entry.name) !== length) return false;
        return true;
      }),
    [gender, origin, style, length, config.chooseGender, config.genders],
  );

  const results = useMemo(() => {
    if (!mounted || matches.length === 0) return [];
    const shuffled = cryptoShuffle(matches);
    // Every click starts at another place of the shuffled list, so the
    // suggestions really change.
    const start = (seed * 7) % shuffled.length;
    return shuffled.slice(start).concat(shuffled.slice(0, start)).slice(0, 8);
  }, [mounted, matches, seed]);

  const shown = picked && results.some((entry) => entry.name === picked.name) ? picked : results[0];

  const drawAgain = () => {
    setSeed((value) => value + 1);
    setPicked(null);
  };

  const surprise = () => {
    setGender(config.chooseGender ? "any" : config.genders[0]);
    setOrigin("any");
    setStyle("any");
    setLength("any");
    setSeed((value) => value + 1);
    setPicked(null);
  };

  return (
    <RandPanel
      title={t(config.titleKey)}
      subtitle={t(config.subtitleKey)}
      toolbar={
        <>
          <button type="button" onClick={drawAgain} className={randPrimaryButtonClass}>
            <RefreshCw className="size-4" />
            <span>{t("names.another")}</span>
          </button>
          <button type="button" onClick={surprise} className={randGhostButtonClass}>
            <Shuffle className="size-3.5" />
            <span>{t("names.surprise")}</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-2xl border border-sky-200 bg-sky-50/70 px-6 py-7 text-center dark:border-sky-900 dark:bg-sky-950/40">
            <Sparkles className="size-6 text-sky-600 dark:text-sky-400" />
            <p
              data-testid="name-selected"
              data-name={shown?.name ?? ""}
              data-origin={shown?.origin ?? ""}
              data-style={shown?.style ?? ""}
              data-length={shown ? lengthOf(shown.name) : ""}
              className="mt-2 font-mono text-4xl font-extrabold text-slate-900 dark:text-white"
            >
              {shown ? `${shown.name} ` : "--"}
            </p>
            {shown ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("names.details", {
                  origin: t(`names.origin.${shown.origin}`),
                  style: t(`names.style.${shown.style}`),
                  length: t(`names.length.${lengthOf(shown.name)}`),
                })}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("names.noMatch")}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("names.suggestions")}
            </p>
            {results.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("names.noMatch")}</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {results.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    data-testid="name-suggestion"
                    data-name={entry.name}
                    data-origin={entry.origin}
                    data-style={entry.style}
                    data-length={lengthOf(entry.name)}
                    data-gender={entry.gender}
                    onClick={() => setPicked(entry)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      shown && shown.name === entry.name
                        ? "bg-sky-800 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-sky-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {`${entry.name} `}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t("names.suggestionHint")}</p>
          </div>
        </div>

        <div className="space-y-3">
          {config.chooseGender ? (
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("names.genderLabel")}
              <select
                value={gender}
                data-testid="name-gender-filter"
                onChange={(event) => setGender(event.target.value)}
                className={`${randSelectClass} mt-1.5 w-full`}
              >
                <option value="any">{t("names.any")}</option>
                <option value="boy">{t("names.gender.boy")}</option>
                <option value="girl">{t("names.gender.girl")}</option>
                <option value="unisex">{t("names.gender.unisex")}</option>
              </select>
            </label>
          ) : null}

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("names.originLabel")}
            <select
              value={origin}
              data-testid="name-origin-filter"
              onChange={(event) => setOrigin(event.target.value)}
              className={`${randSelectClass} mt-1.5 w-full`}
            >
              <option value="any">{t("names.any")}</option>
              {BABY_NAME_ORIGINS.map((entry) => (
                <option key={entry} value={entry}>
                  {t(`names.origin.${entry}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("names.styleLabel")}
            <select
              value={style}
              data-testid="name-style-filter"
              onChange={(event) => setStyle(event.target.value)}
              className={`${randSelectClass} mt-1.5 w-full`}
            >
              <option value="any">{t("names.any")}</option>
              {BABY_NAME_STYLES.map((entry) => (
                <option key={entry} value={entry}>
                  {t(`names.style.${entry}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("names.lengthLabel")}
            <select
              value={length}
              data-testid="name-length-filter"
              onChange={(event) => setLength(event.target.value)}
              className={`${randSelectClass} mt-1.5 w-full`}
            >
              <option value="any">{t("names.any")}</option>
              {BABY_NAME_LENGTHS.map((entry) => (
                <option key={entry} value={entry}>
                  {t(`names.length.${entry}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </RandPanel>
  );
}
