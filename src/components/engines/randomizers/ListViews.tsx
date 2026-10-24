"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ListOrdered, Shuffle, Users } from "lucide-react";
import {
  RandPanel,
  cryptoShuffle,
  csvCell,
  downloadCsv,
  findDuplicateNames,
  randAreaClass,
  randGhostButtonClass,
  randInputClass,
  randPrimaryButtonClass,
  randSelectClass,
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

/** How the size of the teams is chosen. */
type Sizing = "count" | "perTeam";

/** The group and the team generator. */
export function SplitWorkspace({
  mode,
}: {
  mode: "group" | "team";
}) {
  const t = useTranslations("ui.engines.randomizers");

  const [text, setText] = useState("");
  const [amount, setAmount] = useState(2);
  const [sizing, setSizing] = useState<Sizing>("count");
  const [perTeam, setPerTeam] = useState(3);
  const [groups, setGroups] = useState<string[][] | null>(null);

  const names = readLines(text);
  const duplicates = findDuplicateNames(names);

  // In the "players per team" mode the number of teams follows the number of
  // names: as many teams as it takes to hold everybody.
  const derivedTeams = Math.max(1, Math.ceil(names.length / Math.max(1, perTeam)));

  const split = () => {
    const list = cryptoShuffle(names);
    if (list.length === 0) return;
    const count =
      mode === "team" && sizing === "perTeam"
        ? Math.max(1, Math.ceil(list.length / Math.max(1, perTeam)))
        : Math.min(Math.max(amount, 2), Math.max(list.length, 2));
    const buckets: string[][] = Array.from({ length: count }, () => []);
    list.forEach((entry, index) => {
      buckets[index % count].push(entry);
    });
    setGroups(buckets);
  };

  /** The assignments as a CSV file: one row per name, sorted by group. */
  const exportCsv = () => {
    if (!groups) return;
    const rows = [mode === "group" ? "group,name" : "team,name"];
    groups.forEach((bucket, index) => {
      const label = mode === "group" ? String(index + 1) : teamLetter(index);
      bucket.forEach((name) => {
        rows.push(`${csvCell(label)},${csvCell(name)}`);
      });
    });
    downloadCsv(mode === "group" ? "groups.csv" : "teams.csv", rows);
  };

  const titleKey = mode === "group" ? "lists.groups.title" : "lists.teams.title";
  const subtitleKey = mode === "group" ? "lists.groups.subtitle" : "lists.teams.subtitle";

  // The groups are sized by their number, the teams either by their number
  // or by the number of players that play in one team.
  const perPlayer = mode === "team" && sizing === "perTeam";
  const sizeValue = perPlayer ? perTeam : amount;
  const sizeMin = perPlayer ? 1 : 2;
  const sizeMax = perPlayer ? 100 : 32;
  const sizeLabel =
    mode === "group"
      ? t("lists.amount")
      : perPlayer
        ? t("lists.teams.playersPerTeam")
        : t("lists.teams.amount");

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
              {mode === "group" ? t("lists.hint") : t("lists.teams.hint")}
            </span>
          </label>

          {duplicates.length > 0 ? (
            <p
              data-testid="split-duplicate-warning"
              data-count={duplicates.length}
              data-names={duplicates.join(",")}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
            >
              {t("lists.duplicatesWarning", {
                count: duplicates.length,
                names: duplicates.join(", "),
              })}
            </p>
          ) : null}

          {mode === "team" ? (
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("lists.teams.sizeLabel")}
              <select
                value={sizing}
                data-testid="split-sizing-mode"
                onChange={(event) =>
                  setSizing(event.target.value === "perTeam" ? "perTeam" : "count")
                }
                className={`${randSelectClass} mt-1.5 w-full`}
              >
                <option value="count">{t("lists.teams.sizeByCount")}</option>
                <option value="perTeam">{t("lists.teams.sizeByPerTeam")}</option>
              </select>
            </label>
          ) : null}

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {sizeLabel}
            <input
              type="number"
              min={sizeMin}
              max={sizeMax}
              data-testid="split-amount"
              data-mode={perPlayer ? "perTeam" : "count"}
              value={sizeValue}
              onChange={(event) => {
                const value = Math.min(
                  Math.max(Number(event.target.value) || sizeMin, sizeMin),
                  sizeMax,
                );
                if (perPlayer) setPerTeam(value);
                else setAmount(value);
              }}
              className={`${randInputClass} w-24`}
            />
          </label>

          {perPlayer && names.length > 0 ? (
            <p
              data-testid="split-derived-teams"
              data-count={derivedTeams}
              className="text-[11px] text-slate-500 dark:text-slate-400"
            >
              {t("lists.teams.derivedTeams", {
                people: names.length,
                teams: derivedTeams,
              })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {groups ? (
              <p
                data-testid="split-summary"
                data-count={groups.length}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {mode === "group"
                  ? t("lists.groups.summary", { count: groups.length })
                  : t("lists.teams.summary", { count: groups.length })}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("lists.empty")}</p>
            )}
            {groups ? (
              <button
                type="button"
                onClick={exportCsv}
                data-testid={mode === "group" ? "group-export-csv" : "team-export-csv"}
                className={randGhostButtonClass}
              >
                <Download className="size-3.5" />
                <span>{t("lists.exportCsv")}</span>
              </button>
            ) : null}
          </div>

          {groups ? (
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
          ) : null}
        </div>
      </div>
    </RandPanel>
  );
}
