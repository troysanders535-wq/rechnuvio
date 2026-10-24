"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, Printer, Trash2 } from "lucide-react";
import {
  RandPanel,
  printPage,
  randGhostButtonClass,
  randInputClass,
  randPrimaryButtonClass,
} from "./shared";

/**
 * The Christmas lists and the Christmas budget.
 *
 * The list maker collects the gifts for the people of the family, the wish
 * list collects the gifts the user would like to receive, and the budget
 * planner keeps the planned spending of the season inside the planned
 * budget.
 */

/** One row of a Christmas list. */
interface ListRow {
  id: number;
  title: string;
  person: string;
  note: string;
  done: boolean;
}

/* ---------------------------------------------------- the list maker --- */

/** The Christmas list maker: the gifts for everybody else. */
export function ChristmasListMakerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("");
  const [counter, setCounter] = useState(0);

  const add = () => {
    const name = title.trim();
    if (!name) return;
    setCounter((value) => value + 1);
    setRows((previous) => [
      ...previous,
      { id: counter + 1, title: name, person: person.trim(), note: "", done: false },
    ]);
    setTitle("");
    setPerson("");
  };

  const open = rows.filter((row) => !row.done).length;

  return (
    <RandPanel
      title={t("seasonal.listMaker.title")}
      subtitle={t("seasonal.listMaker.subtitle")}
      toolbar={
        <button type="button" onClick={printPage} className={randGhostButtonClass}>
          <Printer className="size-3.5" />
          <span>{t("seasonal.listMaker.print")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("seasonal.listMaker.gift")}
              <input
                type="text"
                value={title}
                data-testid="list-gift"
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") add();
                }}
                className={`${randInputClass} mt-1.5`}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("seasonal.listMaker.person")}
              <input
                type="text"
                value={person}
                data-testid="list-person"
                onChange={(event) => setPerson(event.target.value)}
                className={`${randInputClass} mt-1.5`}
              />
            </label>
            <button
              type="button"
              onClick={add}
              className={`${randPrimaryButtonClass} mt-5 h-9 justify-center self-start`}
            >
              <Plus className="size-4" />
              <span>{t("seasonal.listMaker.add")}</span>
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.listMaker.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  data-testid="list-row"
                  data-title={row.title}
                  data-person={row.person}
                  data-done={row.done ? "true" : "false"}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  <button
                    type="button"
                    data-testid="list-toggle"
                    onClick={() =>
                      setRows((previous) =>
                        previous.map((entry) =>
                          entry.id === row.id ? { ...entry, done: !entry.done } : entry,
                        ),
                      )
                    }
                    aria-label={t("seasonal.listMaker.markDone")}
                    className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                      row.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 text-transparent dark:border-slate-600"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      row.done
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {`${row.title} `}
                  </span>
                  {row.person ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {`${row.person} `}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setRows((previous) => previous.filter((entry) => entry.id !== row.id))}
                    aria-label={t("seasonal.listMaker.remove")}
                    className="ml-auto text-slate-400 transition hover:text-rose-600 dark:text-slate-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <p
            data-testid="list-summary"
            data-total={rows.length}
            data-open={open}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("seasonal.listMaker.summary", { total: rows.length, open })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.listMaker.hint")}</p>
        </div>
      </div>
    </RandPanel>
  );
}

/* -------------------------------------------------- the wish list --- */

/** The Christmas wish list maker: the gifts the user would like to receive. */
export function ChristmasWishListMakerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [wishes, setWishes] = useState<string[]>([]);
  const [wish, setWish] = useState("");

  const add = () => {
    const name = wish.trim();
    if (!name) return;
    setWishes((previous) => [...previous, name]);
    setWish("");
  };

  return (
    <RandPanel
      title={t("seasonal.wishList.title")}
      subtitle={t("seasonal.wishList.subtitle")}
      toolbar={
        <button type="button" onClick={printPage} className={randGhostButtonClass}>
          <Printer className="size-3.5" />
          <span>{t("seasonal.wishList.print")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block min-w-48 flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("seasonal.wishList.wish")}
              <input
                type="text"
                value={wish}
                data-testid="wish-input"
                onChange={(event) => setWish(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") add();
                }}
                className={`${randInputClass} mt-1.5`}
              />
            </label>
            <button type="button" onClick={add} className={randPrimaryButtonClass}>
              <Plus className="size-4" />
              <span>{t("seasonal.wishList.add")}</span>
            </button>
          </div>

          {wishes.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.wishList.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {wishes.map((entry, index) => (
                <li
                  key={`${entry}-${index}`}
                  data-testid="wish-row"
                  data-name={entry}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {`${entry} `}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setWishes((previous) => previous.filter((_, at) => at !== index))
                    }
                    aria-label={t("seasonal.wishList.remove")}
                    className="ml-auto text-slate-400 transition hover:text-rose-600 dark:text-slate-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <p
            data-testid="wish-summary"
            data-total={wishes.length}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("seasonal.wishList.summary", { total: wishes.length })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.wishList.hint")}</p>
        </div>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------ the budget --- */

/** The categories of the Christmas budget. */
const BUDGET_CATEGORIES = [
  "seasonal.budget.categories.0",
  "seasonal.budget.categories.1",
  "seasonal.budget.categories.2",
  "seasonal.budget.categories.3",
  "seasonal.budget.categories.4",
  "seasonal.budget.categories.5",
  "seasonal.budget.categories.6",
];

/** The Christmas budget planner. */
export function ChristmasBudgetPlannerView() {
  const t = useTranslations("ui.engines.randomizers");

  const [budget, setBudget] = useState(500);
  const [amounts, setAmounts] = useState<number[]>(
    BUDGET_CATEGORIES.map(() => 0),
  );

  const spent = amounts.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const left = budget - spent;

  return (
    <RandPanel
      title={t("seasonal.budget.title")}
      subtitle={t("seasonal.budget.subtitle")}
      toolbar={
        <button type="button" onClick={printPage} className={randGhostButtonClass}>
          <Printer className="size-3.5" />
          <span>{t("seasonal.budget.print")}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("seasonal.budget.total")}
            <input
              type="number"
              min={0}
              data-testid="budget-total"
              value={budget}
              onChange={(event) => setBudget(Math.max(Number(event.target.value) || 0, 0))}
              className={`${randInputClass} mt-1.5`}
            />
          </label>
          <p data-testid="budget-spent" data-amount={spent} className="text-xs text-slate-600 dark:text-slate-300">
            {t("seasonal.budget.spent", { amount: `${spent} ` })}
          </p>
          <p
            data-testid="budget-left"
            data-amount={left}
            className={`text-xs font-bold ${
              left < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {t("seasonal.budget.left", { amount: `${left} ` })}
          </p>
        </div>

        <ul className="space-y-2">
          {BUDGET_CATEGORIES.map((key, index) => (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="min-w-40 flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t(key)}
              </span>
              <input
                type="number"
                min={0}
                data-testid="budget-amount"
                data-index={index}
                value={amounts[index]}
                onChange={(event) =>
                  setAmounts((previous) => {
                    const next = previous.slice();
                    next[index] = Math.max(Number(event.target.value) || 0, 0);
                    return next;
                  })
                }
                className={`${randInputClass} w-32`}
              />
            </li>
          ))}
        </ul>
      </div>
    </RandPanel>
  );
}
