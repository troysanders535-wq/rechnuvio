"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ListOrdered, Shuffle, Users } from "lucide-react";
import {
  RandPanel,
  cryptoShuffle,
  randAreaClass,
  randInputClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The list, group and team generators.
 *
 * The list randomizer shuffles a whole list, the group generator splits a
 * list into groups and the team generator splits it into named teams. All
 * three use the cryptographic random source, so a new result is never the
 * result of the last round.
 */

/** The lines of a text area. */
function readLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------ the list --- */

/** The list randomizer: shuffles the whole list. */
export function ListRandomizerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [text, setText] = useState("");
  const [shuffled, setShuffled] = useState<string[] | null>(null);

  const shuffle = () => {
    const list = readLines(text);
    if (list.length === 0) return;
    setShuffled(cryptoShuffle(list));
  };

  return (
    <RandPanel
      title={t("lists.randomizer.title")}
      subtitle={t("lists.randomizer.subtitle")}
      toolbar={
        <button type="button" onClick={shuffle} className={randPrimaryButtonClass}>
          <Shuffle className="size-4" />
          <span>{t("lists.randomizer.shuffle")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("lists.randomizer.source")}
          <textarea
            value={text}
            data-testid="list-source"
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className={`${randAreaClass} mt-1.5`}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {t("lists.randomizer.hint")}
          </span>
        </label>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <ListOrdered className="size-4 text-sky-700 dark:text-sky-400" />
            {t("lists.randomizer.result")}
          </p>
          {!shuffled ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("lists.randomizer.empty")}</p>
          ) : (
            <ol className="space-y-1">
              {shuffled.map((entry, index) => (
                <li
                  key={`${entry}-${index}`}
                  data-testid="list-result"
                  data-name={entry}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                >
                  {`${index + 1}. ${entry} `}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </RandPanel>
  );
}

/* -------------------------------------------------- groups and teams --- */

/** The letter of the n-th team. */
function teamLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** The group and the team generator. */
export function SplitWorkspace({
  mode,
}: {
  mode: "group" | "team";
}) {
  const t = useTranslations("ui.engines.randomizers");

  const [text, setText] = useState("");
  const [amount, setAmount] = useState(2);
  const [groups, setGroups] = useState<string[][] | null>(null);

  const split = () => {
    const list = cryptoShuffle(readLines(text));
    if (list.length === 0) return;
    const count = Math.min(Math.max(amount, 2), Math.max(list.length, 2));
    const buckets: string[][] = Array.from({ length: count }, () => []);
    list.forEach((entry, index) => {
      buckets[index % count].push(entry);
    });
    setGroups(buckets);
  };

  const titleKey = mode === "group" ? "lists.groups.title" : "lists.teams.title";
  const subtitleKey = mode === "group" ? "lists.groups.subtitle" : "lists.teams.subtitle";

  return (
    <RandPanel
      title={t(titleKey)}
      subtitle={t(subtitleKey)}
      toolbar={
        <button type="button" onClick={split} className={randPrimaryButtonClass}>
          {mode === "group" ? (
            <Users className="size-4" />
          ) : (
            <Shuffle className="size-4" />
          )}
          <span>
            {mode === "group" ? t("lists.groups.create") : t("lists.teams.create")}
          </span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("lists.source")}
            <textarea
              value={text}
              data-testid="split-source"
              onChange={(event) => setText(event.target.value)}
              rows={10}
              className={`${randAreaClass} mt-1.5`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("lists.hint")}
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("lists.amount")}
            <input
              type="number"
              min={2}
              max={32}
              data-testid="split-amount"
              value={amount}
              onChange={(event) => setAmount(Math.min(Math.max(Number(event.target.value) || 2, 2), 32))}
              className={`${randInputClass} w-24`}
            />
          </label>
        </div>

        <div className="space-y-2">
          {!groups ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("lists.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {groups.map((bucket, index) => (
                <div
                  key={`${bucket.join("-")}-${index}`}
                  data-testid="split-group"
                  data-index={index}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {mode === "group"
                      ? t("lists.groups.groupName", { number: index + 1 })
                      : t("lists.teams.teamName", { letter: teamLetter(index) })}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {bucket.map((entry, at) => (
                      <li
                        key={`${entry}-${at}`}
                        data-testid="split-item"
                        data-name={entry}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      >
                        {`${entry} `}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RandPanel>
  );
}
