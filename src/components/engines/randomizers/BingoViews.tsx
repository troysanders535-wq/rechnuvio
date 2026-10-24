"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Printer, RefreshCw, Volume2 } from "lucide-react";
import {
  RandPanel,
  cryptoRandomInt,
  cryptoShuffle,
  printPage,
  randAreaClass,
  randGhostButtonClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The bingo cards of the family.
 *
 * Every bingo tool of the family draws a real American bingo card: the
 * columns B to O hold the numbers 1 to 75 and the middle square of the N
 * column is the free space. The cards are filled from the cryptographic
 * random source, so a new card is never the card of the last round.
 *
 * The themed bingo cards add the picture prompts of their season next to
 * the numbered card, so the host can call the pictures instead of the
 * numbers.
 */

/** The five columns of an American bingo card with their number range. */
const BINGO_COLUMNS = [
  { letter: "B", min: 1, max: 15 },
  { letter: "I", min: 16, max: 30 },
  { letter: "N", min: 31, max: 45 },
  { letter: "G", min: 46, max: 60 },
  { letter: "O", min: 61, max: 75 },
];

const BINGO_ROWS = 5;

/** The squares of a card: one array per column, one value per row. */
type BingoGrid = (number | null)[][];

/** A freshly shuffled card. */
function makeBingoGrid(): BingoGrid {
  const columns: (number | null)[][] = BINGO_COLUMNS.map((column) => {
    const pool: number[] = [];
    for (let value = column.min; value <= column.max; value += 1) pool.push(value);
    return cryptoShuffle(pool).slice(0, BINGO_ROWS);
  });
  // The middle square of the N column is the free space.
  columns[2][2] = null;
  return columns;
}

/* ----------------------------------------------------------------- card --- */

/** The table of a bingo card. */
function BingoCardTable({
  grid,
  labels,
  squares,
  blank,
}: {
  grid: BingoGrid | null;
  labels: { freeSpace: string };
  squares?: string[];
  blank?: boolean;
}) {
  if (!grid) {
    return (
      <div className="grid h-64 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
        {labels.freeSpace}
      </div>
    );
  }

  return (
    <table data-testid="bingo-card" className="w-full table-fixed border-collapse text-center text-sm">
      <thead>
        <tr>
          {BINGO_COLUMNS.map((column) => (
            <th
              key={column.letter}
              data-testid="bingo-card-column"
              data-letter={column.letter}
              className="rounded-t-lg border border-slate-300 bg-sky-800 py-1.5 text-xs font-extrabold tracking-wider text-white dark:border-slate-700"
            >
              {` ${column.letter} `}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: BINGO_ROWS }, (_, row) => (
          <tr key={row}>
            {BINGO_COLUMNS.map((column, columnIndex) => {
              const value = grid[columnIndex][row];
              // The middle square of the N column stays the free space, so a
              // custom word never covers it.
              const isMiddle = columnIndex === 2 && row === 2;
              const custom = squares && !isMiddle ? squares[columnIndex * BINGO_ROWS + row] : undefined;
              // Only the middle square of the N column is the free space.
              const isFreeSpace = value === null && !blank;
              const kind = custom
                ? "custom"
                : isFreeSpace || isMiddle
                  ? "free"
                  : blank
                    ? "empty"
                    : "number";
              return (
                <td
                  key={column.letter}
                  data-testid="bingo-card-cell"
                  data-column={column.letter}
                  data-row={row}
                  data-kind={kind}
                  data-value={kind === "number" ? String(value) : custom ? custom : ""}
                  className="h-11 border border-slate-300 bg-white px-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {custom ? (
                    <span className="break-words">{`${custom} `}</span>
                  ) : isFreeSpace ? (
                    <span className="text-amber-500">{labels.freeSpace}</span>
                  ) : blank && !isMiddle ? (
                    <span>&nbsp;</span>
                  ) : isMiddle ? (
                    <span className="text-amber-500">{labels.freeSpace}</span>
                  ) : (
                    <span>{`${value} `}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* -------------------------------------------------------------- the card --- */

/** The bingo card generator: one card that can be replaced at any time. */
export function BingoCardGeneratorView() {
  const t = useTranslations("ui.engines.randomizers");
  const [grid, setGrid] = useState<BingoGrid | null>(null);

  // The first card is drawn after the page has mounted, so the markup of the
  // server and of the browser stay identical.
  useEffect(() => {
    const timer = setTimeout(() => setGrid(makeBingoGrid()), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RandPanel
      title={t("bingo.generator.title")}
      subtitle={t("bingo.generator.subtitle")}
      toolbar={
        <button type="button" onClick={() => setGrid(makeBingoGrid())} className={randPrimaryButtonClass}>
          <RefreshCw className="size-4" />
          <span>{t("bingo.card.newCard")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <BingoCardTable grid={grid} labels={{ freeSpace: t("bingo.card.freeSpace") }} />
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.hint")}</p>
        </div>
      </div>
    </RandPanel>
  );
}

/* -------------------------------------------------------- the blank card --- */

/** The blank bingo card: an empty card to fill in by hand. */
export function BlankBingoCardView() {
  const t = useTranslations("ui.engines.randomizers");

  const emptyGrid = useMemo<BingoGrid>(
    () => BINGO_COLUMNS.map(() => Array.from({ length: BINGO_ROWS }, () => null)),
    [],
  );

  return (
    <RandPanel
      title={t("bingo.blank.title")}
      subtitle={t("bingo.blank.subtitle")}
      toolbar={
        <button type="button" onClick={printPage} className={randPrimaryButtonClass}>
          <Printer className="size-4" />
          <span>{t("bingo.card.print")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <BingoCardTable
          grid={emptyGrid}
          labels={{ freeSpace: t("bingo.card.freeSpace") }}
          blank
        />
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.blank.hint")}</p>
        </div>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------ the printable set --- */

/** The printable bingo cards: several cards on one page. */
export function PrintableBingoCardsView() {
  const t = useTranslations("ui.engines.randomizers");
  const [amount, setAmount] = useState(4);
  const [cards, setCards] = useState<BingoGrid[]>([]);

  useEffect(() => {
    const timer = setTimeout(
      () => setCards(Array.from({ length: amount }, () => makeBingoGrid())),
      0,
    );
    return () => clearTimeout(timer);
  }, [amount]);

  return (
    <RandPanel
      title={t("bingo.printable.title")}
      subtitle={t("bingo.printable.subtitle")}
      toolbar={
        <>
          <button type="button" onClick={printPage} className={randPrimaryButtonClass}>
            <Printer className="size-4" />
            <span>{t("bingo.card.print")}</span>
          </button>
          <button
            type="button"
            onClick={() => setCards(Array.from({ length: amount }, () => makeBingoGrid()))}
            className={randGhostButtonClass}
          >
            <RefreshCw className="size-3.5" />
            <span>{t("bingo.card.newCards")}</span>
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("bingo.card.amount")}
          <input
            type="number"
            min={1}
            max={12}
            data-testid="bingo-card-amount"
            value={amount}
            onChange={(event) => setAmount(Math.min(Math.max(Number(event.target.value) || 1, 1), 12))}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {cards.map((grid, index) => (
          <div key={index} data-testid="bingo-card-slot" className="space-y-2">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t("bingo.card.cardNumber", { number: index + 1 })}
            </p>
            <BingoCardTable grid={grid} labels={{ freeSpace: t("bingo.card.freeSpace") }} />
          </div>
        ))}
      </div>
    </RandPanel>
  );
}

/* --------------------------------------------------------- the custom one --- */

/** The custom bingo card maker: your own words in the squares of the card. */
export function CustomBingoCardMakerView() {
  const t = useTranslations("ui.engines.randomizers");
  const [text, setText] = useState("");
  const [squares, setSquares] = useState<string[]>([]);
  const [grid, setGrid] = useState<BingoGrid | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setGrid(makeBingoGrid()), 0);
    return () => clearTimeout(timer);
  }, []);

  const apply = () => {
    const words = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, BINGO_ROWS * 5 - 1);
    // The squares are filled column by column, the free space in the middle
    // of the N column stays empty.
    const cells: string[] = new Array(BINGO_ROWS * 5).fill("");
    let at = 0;
    for (let column = 0; column < 5; column += 1) {
      for (let row = 0; row < BINGO_ROWS; row += 1) {
        if (column === 2 && row === 2) continue;
        cells[column * BINGO_ROWS + row] = words[at] ?? "";
        at += 1;
      }
    }
    setSquares(cells);
  };

  return (
    <RandPanel
      title={t("bingo.custom.title")}
      subtitle={t("bingo.custom.subtitle")}
      toolbar={
        <button type="button" onClick={apply} className={randPrimaryButtonClass}>
          <Gift className="size-4" />
          <span>{t("bingo.custom.apply")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <BingoCardTable
          grid={grid}
          labels={{ freeSpace: t("bingo.card.freeSpace") }}
          squares={squares}
        />
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("bingo.custom.squares")}
            <textarea
              value={text}
              data-testid="bingo-custom-squares"
              onChange={(event) => setText(event.target.value)}
              rows={8}
              className={`${randAreaClass} mt-1.5`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("bingo.custom.squaresHint")}
            </span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
        </div>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------------- the caller --- */

/** The bingo caller: calls the numbers of the game. */
export function BingoCallerView() {
  const t = useTranslations("ui.engines.randomizers");
  const [called, setCalled] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [grid, setGrid] = useState<BingoGrid | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setGrid(makeBingoGrid()), 0);
    return () => clearTimeout(timer);
  }, []);

  const callNext = () => {
    const remaining: number[] = [];
    for (let value = 1; value <= 75; value += 1) {
      if (!called.includes(value)) remaining.push(value);
    }
    if (remaining.length === 0) return;
    const picked = remaining[cryptoRandomInt(remaining.length)];
    setCurrent(picked);
    setCalled((previous) => [...previous, picked]);
  };

  return (
    <RandPanel
      title={t("bingo.caller.title")}
      subtitle={t("bingo.caller.subtitle")}
      toolbar={
        <>
          <button type="button" onClick={callNext} className={randPrimaryButtonClass}>
            <Volume2 className="size-4" />
            <span>{t("bingo.caller.callNext")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCalled([]);
              setCurrent(null);
              setGrid(makeBingoGrid());
            }}
            className={randGhostButtonClass}
          >
            <RefreshCw className="size-3.5" />
            <span>{t("bingo.caller.reset")}</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div
            data-testid="bingo-current"
            data-value={current === null ? "" : String(current)}
            className="grid h-28 place-items-center rounded-2xl border-2 border-sky-800 bg-slate-950 font-mono text-5xl font-extrabold text-emerald-400"
          >
            {current ?? "--"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("bingo.caller.called")}</p>
            <p data-testid="bingo-called" className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
              {called.length > 0 ? (
                called.map((value) => (
                  <span key={value} data-testid="bingo-called-number" data-value={value}>
                    {`${value} `}
                  </span>
                ))
              ) : (
                <span>{t("bingo.caller.noCalls")}</span>
              )}
            </p>
          </div>
        </div>
        <BingoCardTable grid={grid} labels={{ freeSpace: t("bingo.card.freeSpace") }} />
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------------ the themes --- */

/** The picture prompts of a themed bingo card. */
const THEME_WORDS: Record<string, string[]> = {
  christmas: [
    "bingo.words.christmas.0",
    "bingo.words.christmas.1",
    "bingo.words.christmas.2",
    "bingo.words.christmas.3",
    "bingo.words.christmas.4",
    "bingo.words.christmas.5",
    "bingo.words.christmas.6",
    "bingo.words.christmas.7",
    "bingo.words.christmas.8",
    "bingo.words.christmas.9",
    "bingo.words.christmas.10",
    "bingo.words.christmas.11",
  ],
  newYears: [
    "bingo.words.newYears.0",
    "bingo.words.newYears.1",
    "bingo.words.newYears.2",
    "bingo.words.newYears.3",
    "bingo.words.newYears.4",
    "bingo.words.newYears.5",
    "bingo.words.newYears.6",
    "bingo.words.newYears.7",
    "bingo.words.newYears.8",
    "bingo.words.newYears.9",
    "bingo.words.newYears.10",
    "bingo.words.newYears.11",
  ],
  thanksgiving: [
    "bingo.words.thanksgiving.0",
    "bingo.words.thanksgiving.1",
    "bingo.words.thanksgiving.2",
    "bingo.words.thanksgiving.3",
    "bingo.words.thanksgiving.4",
    "bingo.words.thanksgiving.5",
    "bingo.words.thanksgiving.6",
    "bingo.words.thanksgiving.7",
    "bingo.words.thanksgiving.8",
    "bingo.words.thanksgiving.9",
    "bingo.words.thanksgiving.10",
    "bingo.words.thanksgiving.11",
  ],
  babyShower: [
    "bingo.words.babyShower.0",
    "bingo.words.babyShower.1",
    "bingo.words.babyShower.2",
    "bingo.words.babyShower.3",
    "bingo.words.babyShower.4",
    "bingo.words.babyShower.5",
    "bingo.words.babyShower.6",
    "bingo.words.babyShower.7",
    "bingo.words.babyShower.8",
    "bingo.words.babyShower.9",
    "bingo.words.babyShower.10",
    "bingo.words.babyShower.11",
  ],
};

export type BingoTheme = "christmas" | "newYears" | "thanksgiving" | "babyShower";

/** The themed bingo card: the picture prompts next to a numbered card. */
export function ThemedBingoView({ theme }: { theme: BingoTheme }) {
  const t = useTranslations("ui.engines.randomizers");
  const [grid, setGrid] = useState<BingoGrid | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setGrid(makeBingoGrid()), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RandPanel
      title={t(`bingo.themed.${theme}.title`)}
      subtitle={t(`bingo.themed.${theme}.subtitle`)}
      toolbar={
        <button type="button" onClick={() => setGrid(makeBingoGrid())} className={randPrimaryButtonClass}>
          <RefreshCw className="size-4" />
          <span>{t("bingo.card.newCard")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <BingoCardTable grid={grid} labels={{ freeSpace: t(`bingo.themed.${theme}.freeSpace`) }} />
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("bingo.themed.prompts")}</p>
          <ul className="grid grid-cols-2 gap-1.5">
            {THEME_WORDS[theme].map((key) => (
              <li
                key={key}
                data-testid="bingo-prompt"
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {`${t(key)} `}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("bingo.card.legend")}</p>
        </div>
      </div>
    </RandPanel>
  );
}
