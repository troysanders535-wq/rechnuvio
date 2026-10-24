"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Swords, Trophy } from "lucide-react";
import {
  TimePanel,
  timeButtonClass,
  timeFieldLabelClass,
  timeGhostButtonClass,
} from "./kit";

interface Pairing {
  home: string;
  away: string | null;
}

/** The rounds of a round robin, built with the circle method. */
function buildRounds(teams: string[]): Pairing[][] {
  if (teams.length < 2) return [];
  const rotation = teams.length % 2 === 0 ? [...teams] : [...teams, ""];
  const size = rotation.length;
  const rounds: Pairing[][] = [];

  for (let round = 0; round < size - 1; round += 1) {
    const pairs: Pairing[] = [];
    for (let index = 0; index < size / 2; index += 1) {
      const home = rotation[index];
      const away = rotation[size - 1 - index];
      if (home && away) {
        pairs.push({ home, away });
      } else {
        pairs.push({ home: home || away || "", away: null });
      }
    }
    rounds.push(pairs);
    // the circle method: the first team stays in its place and the last team
    // moves to the second place, so that every team meets every other team
    rotation.splice(1, 0, rotation.pop() as string);
  }

  return rounds;
}

/**
 * The generator of a round robin schedule.
 *
 * Every player meets every other player exactly once, an odd number of
 * players leaves one player resting in every round.
 */
export function RoundRobinGenerator() {
  const t = useTranslations("ui.engines.time");

  const [players, setPlayers] = useState("Alice\nBob\nCarol\nDavid\nEva");
  const [doubleRound, setDoubleRound] = useState(false);

  const teams = useMemo(
    () =>
      players
        .split(/[\n,;]/)
        .map((name) => name.trim())
        .filter(Boolean),
    [players],
  );

  const rounds = useMemo(() => {
    const first = buildRounds(teams);
    if (!doubleRound) return first;
    // the return legs: every match is played a second time the other way round
    const second = buildRounds(teams).map((round) =>
      round.map((pair) => ({
        home: pair.away ?? pair.home,
        away: pair.away ? pair.home : null,
      })),
    );
    return [...first, ...second];
  }, [teams, doubleRound]);

  const matchCount = rounds.reduce(
    (total, round) => total + round.filter((pair) => pair.away).length,
    0,
  );

  return (
    <TimePanel title={t("roundRobin.title")} subtitle={t("roundRobin.subtitle")}>
      <div>
        <label className={timeFieldLabelClass} htmlFor="round-robin-players">
          {t("roundRobin.players")}
        </label>
        <textarea
          id="round-robin-players"
          value={players}
          onChange={(event) => setPlayers(event.target.value)}
          rows={8}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {t("roundRobin.playerCount", { count: teams.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Trophy className="size-4 text-sky-700" />
          {t("roundRobin.summary", { rounds: rounds.length, matches: matchCount })}
        </span>
      </div>

      {rounds.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rounds.map((round, roundIndex) => (
            <section
              key={`round-${roundIndex}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                <Swords className="size-4 text-sky-700" />
                {t("roundRobin.round", { number: roundIndex + 1 })}
              </h4>
              <ul className="mt-2 space-y-1">
                {round.map((pair, pairIndex) => (
                  <li
                    key={`${pair.home}-${pairIndex}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-900"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {pair.home}
                    </span>
                    <span className="font-mono text-slate-400">vs</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {pair.away ?? t("roundRobin.bye")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {t("roundRobin.needTwoPlayers")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPlayers("Alice\nBob\nCarol\nDavid\nEva")}
          className={timeButtonClass}
        >
          {t("roundRobin.loadExample")}
        </button>
        <button type="button" onClick={() => setPlayers("")} className={timeGhostButtonClass}>
          {t("roundRobin.clear")}
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <input
          id="round-robin-double"
          type="checkbox"
          checked={doubleRound}
          onChange={(event) => setDoubleRound(event.target.checked)}
          className="size-4 rounded border-slate-300"
        />
        {t("roundRobin.doubleRound")}
      </label>
      {doubleRound ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {t("roundRobin.doubleRoundHint")}
        </p>
      ) : null}
    </TimePanel>
  );
}
