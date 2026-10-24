"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Printer, ScrollText } from "lucide-react";
import { RandPanel, printPage, randGhostButtonClass, randPrimaryButtonClass } from "./shared";

/**
 * The rules and the templates of the family.
 *
 * The three rule pages spell out how the gift games are played, so nobody has
 * to explain the rules at the table. The two templates are written to be
 * printed or copied: the letter to Santa and the Christmas list.
 */

/* ------------------------------------------------------------ the rules --- */

/** A page with the rules of a gift game. */
function RulesPanel({
  titleKey,
  subtitleKey,
  introKey,
  ruleKeys,
}: {
  titleKey: string;
  subtitleKey: string;
  introKey: string;
  ruleKeys: string[];
}) {
  const t = useTranslations("ui.engines.randomizers");

  return (
    <RandPanel title={t(titleKey)} subtitle={t(subtitleKey)}>
      <div className="space-y-4">
        <p data-testid="rules-intro" className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {t(introKey)}
        </p>
        <ol data-testid="rules-list" className="space-y-2">
          {ruleKeys.map((key, index) => (
            <li
              key={key}
              data-testid="rule"
              className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60"
            >
              <span
                data-testid="rule-number"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300"
              >
                {index + 1}
              </span>
              <span data-testid="rule-text" className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                {t(key)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </RandPanel>
  );
}

const DIRTY_SANTA_RULES = [
  "seasonal.dirtySanta.rules.0",
  "seasonal.dirtySanta.rules.1",
  "seasonal.dirtySanta.rules.2",
  "seasonal.dirtySanta.rules.3",
  "seasonal.dirtySanta.rules.4",
  "seasonal.dirtySanta.rules.5",
];

const WHITE_ELEPHANT_RULES = [
  "seasonal.whiteElephant.rules.0",
  "seasonal.whiteElephant.rules.1",
  "seasonal.whiteElephant.rules.2",
  "seasonal.whiteElephant.rules.3",
  "seasonal.whiteElephant.rules.4",
  "seasonal.whiteElephant.rules.5",
];

const YANKEE_SWAP_RULES = [
  "seasonal.yankeeSwap.rules.0",
  "seasonal.yankeeSwap.rules.1",
  "seasonal.yankeeSwap.rules.2",
  "seasonal.yankeeSwap.rules.3",
  "seasonal.yankeeSwap.rules.4",
  "seasonal.yankeeSwap.rules.5",
];

/** The rules of Dirty Santa. */
export function DirtySantaRulesView() {
  return (
    <RulesPanel
      titleKey="seasonal.dirtySanta.title"
      subtitleKey="seasonal.dirtySanta.subtitle"
      introKey="seasonal.dirtySanta.intro"
      ruleKeys={DIRTY_SANTA_RULES}
    />
  );
}

/** The rules of White Elephant. */
export function WhiteElephantRulesView() {
  return (
    <RulesPanel
      titleKey="seasonal.whiteElephant.title"
      subtitleKey="seasonal.whiteElephant.subtitle"
      introKey="seasonal.whiteElephant.intro"
      ruleKeys={WHITE_ELEPHANT_RULES}
    />
  );
}

/** The rules of Yankee Swap. */
export function YankeeSwapRulesView() {
  return (
    <RulesPanel
      titleKey="seasonal.yankeeSwap.title"
      subtitleKey="seasonal.yankeeSwap.subtitle"
      introKey="seasonal.yankeeSwap.intro"
      ruleKeys={YANKEE_SWAP_RULES}
    />
  );
}

/* ------------------------------------------------------ the letter --- */

/** The letter to Santa, ready to be filled in and printed. */
export function LetterToSantaTemplateView() {
  const t = useTranslations("ui.engines.randomizers");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(t("seasonal.letter.body")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <RandPanel
      title={t("seasonal.letter.title")}
      subtitle={t("seasonal.letter.subtitle")}
      toolbar={
        <>
          <button type="button" onClick={copy} className={randPrimaryButtonClass}>
            <Copy className="size-4" />
            <span>{copied ? t("seasonal.letter.copied") : t("seasonal.letter.copy")}</span>
          </button>
          <button type="button" onClick={printPage} className={randGhostButtonClass}>
            <Printer className="size-3.5" />
            <span>{t("seasonal.letter.print")}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.letter.hint")}</p>
        <div
          data-testid="letter-body"
          className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {t("seasonal.letter.body")}
        </div>
      </div>
    </RandPanel>
  );
}

/* ------------------------------------------------------ the list --- */

/** The categories of the Christmas list template. */
const LIST_TEMPLATE_ROWS = [
  "seasonal.listTemplate.rows.0",
  "seasonal.listTemplate.rows.1",
  "seasonal.listTemplate.rows.2",
  "seasonal.listTemplate.rows.3",
  "seasonal.listTemplate.rows.4",
  "seasonal.listTemplate.rows.5",
  "seasonal.listTemplate.rows.6",
  "seasonal.listTemplate.rows.7",
];

/** The Christmas list template, ready to be filled in and printed. */
export function ChristmasListTemplateView() {
  const t = useTranslations("ui.engines.randomizers");

  return (
    <RandPanel
      title={t("seasonal.listTemplate.title")}
      subtitle={t("seasonal.listTemplate.subtitle")}
      toolbar={
        <button type="button" onClick={printPage} className={randPrimaryButtonClass}>
          <ScrollText className="size-4" />
          <span>{t("seasonal.listTemplate.print")}</span>
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("seasonal.listTemplate.hint")}</p>
        <ul className="space-y-2">
          {LIST_TEMPLATE_ROWS.map((key, index) => (
            <li
              key={key}
              data-testid="list-template-row"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/60"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {index + 1}
              </span>
              <span data-testid="list-template-category" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t(key)}
              </span>
              <span className="ml-auto h-4 w-32 border-b border-dashed border-slate-300 dark:border-slate-600" />
            </li>
          ))}
        </ul>
      </div>
    </RandPanel>
  );
}
