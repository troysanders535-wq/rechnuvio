"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Printer, RefreshCw, Shuffle, Trophy } from "lucide-react";
import {
  RandPanel,
  cryptoShuffle,
  printPage,
  randAreaClass,
  randGhostButtonClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The tournament brackets of the family.
 *
 * A bracket is built from the list of names: the list is padded to a power of
 * two, so a field of five teams plays against a bye. Every match is played by
 * clicking the name that wins it, and the winner of a match moves into the
 * next round. The last round decides the champion of the tournament.
 *
 * The double elimination bracket gives every team a second chance: the team
 * that loses a match waits in the losers bracket and plays there. The team
 * that loses a losers match is out of the tournament. When only one team is
 * left in the losers bracket, the grand final decides between that team and
 * the champion of the winners bracket - and if the losers team wins the
 * grand final, the bracket is reset and played once more.
 */

/** The translation function of a workspace, handed to the helpers. */
type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The names a bracket starts with. */
const DEFAULT_TEAMS = [
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
];

/** A match of the losers bracket. */
interface LosersMatch {
  a: string;
  b: string;
  winner: string | null;
}

/* ------------------------------------------------------------- helpers --- */

/** The slots of a bracket: the names padded to a power of two. */
function toSlots(names: string[]): (string | null)[] {
  const count = Math.min(Math.max(names.length, 2), 16);
  let size = 2;
  while (size < count) size *= 2;
  const slots: (string | null)[] = new Array(size).fill(null);
  names.slice(0, size).forEach((name, index) => {
    slots[index] = name;
  });
  return slots;
}

/** The label of a round of the bracket. */
function roundLabel(t: Translate, round: number, total: number): string {
  if (round === total) return t("bracket.workspace.final");
  if (round === total - 1) return t("bracket.workspace.semi");
  if (round === total - 2) return t("bracket.workspace.quarter");
  return t("bracket.workspace.round", { round });
}

/* ------------------------------------------------------------ the match --- */

/** One match of a bracket with the two names that can win it. */
function MatchBox({
  a,
  b,
  winner,
  onPick,
  round,
  match,
  kind,
}: {
  a: string | null;
  b: string | null;
  winner: string | null;
  onPick: (name: string) => void;
  round?: number;
  match?: number;
  kind?: "winners" | "losers" | "final";
}) {
  const t = useTranslations("ui.engines.randomizers");

  const entry = (name: string | null, side: number) => (
    <button
      type="button"
      disabled={!name}
      data-testid="bracket-entrant"
      data-name={name ?? ""}
      data-side={side}
      data-round={round ?? ""}
      data-match={match ?? ""}
      data-kind={kind ?? "winners"}
      data-winner={winner && name === winner ? "true" : "false"}
      onClick={() => name && onPick(name)}
      className={`w-full truncate rounded-md px-2 py-1 text-left text-xs font-semibold transition ${
        !name
          ? "text-slate-300 dark:text-slate-600"
          : winner === name
            ? "bg-emerald-600 text-white"
            : "bg-white text-slate-700 hover:bg-sky-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {name ? `${name} ` : t("bracket.workspace.emptySlot")}
    </button>
  );

  return (
    <div
      data-testid="bracket-match"
      data-round={round ?? ""}
      data-match={match ?? ""}
      data-kind={kind ?? "winners"}
      className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 dark:border-slate-700 dark:bg-slate-950/60"
    >
      {entry(a, 0)}
      {entry(b, 1)}
    </div>
  );
}

/* -------------------------------------------------------- the workspace --- */

export interface BracketConfig {
  titleKey: string;
  subtitleKey: string;
  mode: "single" | "double";
  showShuffle: boolean;
  showPrint: boolean;
  defaultTeams: number;
}

/** The bracket workspace, shared by the five bracket tools. */
export function BracketWorkspace({ config }: { config: BracketConfig }) {
  const t = useTranslations("ui.engines.randomizers");

  const [names, setNames] = useState(DEFAULT_TEAMS.slice(0, config.defaultTeams).join("\n"));
  const [slots, setSlots] = useState<(string | null)[]>(
    toSlots(DEFAULT_TEAMS.slice(0, config.defaultTeams)),
  );
  const [winners, setWinners] = useState<Record<string, string>>({});
  const [losersPlayed, setLosersPlayed] = useState<LosersMatch[]>([]);
  const [grandFinal, setGrandFinal] = useState<{ a: string; b: string; winner: string | null } | null>(
    null,
  );
  const [resetWinner, setResetWinner] = useState<string | null>(null);

  const size = slots.length;
  const totalRounds = Math.log2(size);

  /** The two names that play the given match of the given round. */
  const entrants = (round: number, match: number): [string | null, string | null] => {
    if (round === 1) return [slots[match * 2], slots[match * 2 + 1]];
    return [
      winnerOf(round - 1, match * 2),
      winnerOf(round - 1, match * 2 + 1),
    ];
  };

  /**
   * The team that won the given match.
   *
   * A match that only has one team - because the field was padded with a bye -
   * is won by that team without a click, so the bye advances on its own.
   */
  const winnerOf = (round: number, match: number): string | null => {
    const played = winners[`${round}-${match}`];
    if (played) return played;
    const [a, b] =
      round === 1
        ? [slots[match * 2], slots[match * 2 + 1]]
        : [winnerOf(round - 1, match * 2), winnerOf(round - 1, match * 2 + 1)];
    if (a && !b) return a;
    if (b && !a) return b;
    return null;
  };

  const pickWinner = (round: number, match: number, name: string) => {
    setWinners((previous) => {
      const next = { ...previous, [`${round}-${match}`]: name };
      // A changed result invalidates the matches that were played with it.
      let parent = match;
      for (let step = round + 1; step <= totalRounds; step += 1) {
        parent = Math.floor(parent / 2);
        delete next[`${step}-${parent}`];
      }
      return next;
    });
  };

  /** The teams that lost a match of the winners bracket, in the order they lost. */
  const losersInOrder = useMemo(() => {
    const list: string[] = [];
    for (let round = 1; round <= totalRounds; round += 1) {
      const matches = size / 2 ** round;
      for (let match = 0; match < matches; match += 1) {
        const winner = winnerOf(round, match);
        if (!winner) continue;
        const [a, b] =
          round === 1
            ? [slots[match * 2], slots[match * 2 + 1]]
            : [
                winnerOf(round - 1, match * 2),
                winnerOf(round - 1, match * 2 + 1),
              ];
        const loser = [a, b].find((entry) => entry && entry !== winner);
        if (loser) list.push(loser);
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners, slots, totalRounds, size]);

  /** The teams that are out of the tournament after a second loss. */
  const eliminated = useMemo(
    () =>
      losersPlayed
        .filter((match) => match.winner !== null)
        .map((match) => (match.winner === match.a ? match.b : match.a)),
    [losersPlayed],
  );

  /** The teams that wait for their match in the losers bracket. */
  const waiting = useMemo(() => {
    const locked: string[] = [];
    losersPlayed.forEach((match) => {
      if (match.winner === null) locked.push(match.a, match.b);
    });
    return losersInOrder.filter(
      (team) => !eliminated.includes(team) && !locked.includes(team),
    );
  }, [losersInOrder, eliminated, losersPlayed]);

  const champion = winnerOf(totalRounds, 0);
  const readyForGrandFinal =
    config.mode === "double" &&
    champion !== null &&
    waiting.length === 1 &&
    losersPlayed.every((match) => match.winner !== null);

  const playLosersMatch = () => {
    if (waiting.length < 2) return;
    setLosersPlayed((previous) => [
      ...previous,
      { a: waiting[0], b: waiting[1], winner: null },
    ]);
  };

  const pickLosersWinner = (index: number, name: string) => {
    setLosersPlayed((previous) =>
      previous.map((match, at) => (at === index ? { ...match, winner: name } : match)),
    );
  };

  /** The names of the bracket as they are typed. */
  const readNames = (source: string): string[] =>
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 16);

  const resetBracket = (ordered: string[]) => {
    setSlots(toSlots(ordered));
    setWinners({});
    setLosersPlayed([]);
    setGrandFinal(null);
    setResetWinner(null);
  };

  const regenerate = (shuffle: boolean) => {
    resetBracket(shuffle ? cryptoShuffle(readNames(names)) : readNames(names));
  };

  const shuffleSeeds = () => {
    const ordered = cryptoShuffle(readNames(names));
    setNames(ordered.join("\n"));
    resetBracket(ordered);
  };

  return (
    <RandPanel
      title={t(config.titleKey)}
      subtitle={t(config.subtitleKey)}
      toolbar={
        <>
          <button type="button" onClick={() => regenerate(false)} className={randPrimaryButtonClass}>
            <Trophy className="size-4" />
            <span>{t("bracket.workspace.generate")}</span>
          </button>
          {config.showShuffle ? (
            <button type="button" onClick={shuffleSeeds} className={randGhostButtonClass}>
              <Shuffle className="size-3.5" />
              <span>{t("bracket.workspace.shuffle")}</span>
            </button>
          ) : null}
          {config.showPrint ? (
            <button type="button" onClick={printPage} className={randGhostButtonClass}>
              <Printer className="size-3.5" />
              <span>{t("bracket.workspace.print")}</span>
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("bracket.workspace.names")}
            <textarea
              value={names}
              data-testid="bracket-names"
              onChange={(event) => setNames(event.target.value)}
              rows={9}
              className={`${randAreaClass} mt-1.5`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("bracket.workspace.namesHint")}
            </span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("bracket.workspace.pickWinner")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: totalRounds }, (_, index) => {
              const round = index + 1;
              const matches = size / 2 ** round;
              return (
                <div key={round} data-testid="bracket-round" data-round={round} className="flex min-w-36 flex-1 flex-col gap-2">
                  <p className="text-center text-[11px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    {roundLabel(t, round, totalRounds)}
                  </p>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {Array.from({ length: matches }, (_, match) => {
                      const [a, b] = entrants(round, match);
                      return (
                        <MatchBox
                          key={`${round}-${match}`}
                          round={round}
                          match={match}
                          a={a}
                          b={b}
                          winner={winnerOf(round, match)}
                          onPick={(name) => pickWinner(round, match, name)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex min-w-32 flex-col gap-2">
              <p className="text-center text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t("bracket.workspace.champion")}
              </p>
              <div className="flex flex-1 flex-col justify-center">
                <div
                  data-testid="bracket-champion"
                  data-name={champion ?? ""}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-center text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {champion ? `${champion} ` : t("bracket.workspace.noWinner")}
                </div>
              </div>
            </div>
          </div>

          {config.mode === "double" ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  {t("bracket.workspace.losers")}
                </p>
                <button
                  type="button"
                  onClick={playLosersMatch}
                  disabled={waiting.length < 2}
                  data-testid="bracket-losers-play"
                  className={randGhostButtonClass}
                >
                  <RefreshCw className="size-3.5" />
                  <span>{t("bracket.workspace.playLosersMatch")}</span>
                </button>
              </div>

              {losersPlayed.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("bracket.workspace.noLosersMatch")}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {losersPlayed.map((match, index) => (
                    <MatchBox
                      key={`${match.a}-${match.b}-${index}`}
                      kind="losers"
                      match={index}
                      a={match.a}
                      b={match.b}
                      winner={match.winner}
                      onPick={(name) => pickLosersWinner(index, name)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span data-testid="bracket-waiting" data-waiting={waiting.join(",")}>
                  {t("bracket.workspace.waiting")}: {waiting.map((team) => `${team} `).join("")}
                </span>
                <span data-testid="bracket-eliminated" data-eliminated={eliminated.join(",")}>
                  {t("bracket.workspace.eliminated")}: {eliminated.map((team) => `${team} `).join("")}
                </span>
              </div>

              {readyForGrandFinal ? (
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {t("bracket.workspace.grandFinal")}
                  </p>
                  <MatchBox
                    kind="final"
                    a={champion}
                    b={waiting[0]}
                    winner={grandFinal?.winner ?? null}
                    onPick={(name) =>
                      setGrandFinal({
                        a: champion as string,
                        b: waiting[0],
                        winner: name,
                      })
                    }
                  />
                  {grandFinal && grandFinal.winner && grandFinal.winner !== champion ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {t("bracket.workspace.resetHint")}
                      </p>
                      <MatchBox
                        kind="final"
                        a={champion}
                        b={grandFinal.winner}
                        winner={resetWinner}
                        onPick={(name) => setResetWinner(name)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </RandPanel>
  );
}
