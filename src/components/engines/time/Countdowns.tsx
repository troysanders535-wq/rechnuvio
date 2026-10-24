"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PartyPopper, Timer } from "lucide-react";
import { TimePanel, formatDateTime, nthWeekdayOfMonth } from "./kit";

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

const EMPTY: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0, done: false };

function splitRemaining(milliseconds: number): Remaining {
  if (milliseconds <= 0) return { ...EMPTY, done: true };
  const totalSeconds = Math.floor(milliseconds / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

/**
 * A countdown to a fixed day.
 *
 * The target is resolved after the page has been mounted, so the rendered
 * page never mixes two different moments.
 */
function CountdownPanel({
  title,
  subtitle,
  icon,
  target,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  target: Date | null;
}) {
  const t = useTranslations("ui.engines.time");
  const locale = useLocale();
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!target) return;
    const tick = () => setRemaining(splitRemaining(target.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells = [
    { label: t("countdown.days"), value: remaining ? remaining.days : null },
    { label: t("countdown.hours"), value: remaining ? remaining.hours : null },
    { label: t("countdown.minutes"), value: remaining ? remaining.minutes : null },
    { label: t("countdown.seconds"), value: remaining ? remaining.seconds : null },
  ];

  return (
    <TimePanel title={title} subtitle={subtitle}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {icon}
        {target ? (
          <span>
            {t("countdown.target")} {formatDateTime(target, locale)}
          </span>
        ) : (
          <span>{t("countdown.calculating")}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 py-5 text-center dark:border-slate-800 dark:bg-slate-950/60"
          >
            <span className="block font-mono text-4xl font-extrabold tabular-nums text-sky-800 dark:text-sky-300">
              {cell.value === null ? "--" : String(cell.value).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {cell.label}
            </span>
          </div>
        ))}
      </div>

      {remaining?.done ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t("countdown.reached")}
        </p>
      ) : null}
    </TimePanel>
  );
}

/** The countdown to the new year. */
export function NewYearCountdown() {
  const t = useTranslations("ui.engines.time");
  const [target, setTarget] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setTarget(new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0));
  }, []);

  return (
    <CountdownPanel
      title={t("countdown.newYearTitle")}
      subtitle={t("countdown.newYearSubtitle")}
      icon={<PartyPopper className="size-4 text-sky-700" />}
      target={target}
    />
  );
}

/** The countdown to Thanksgiving, the fourth Thursday of November. */
export function ThanksgivingCountdown() {
  const t = useTranslations("ui.engines.time");
  const [target, setTarget] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    let thanksgiving = nthWeekdayOfMonth(now.getFullYear(), 10, 4, 4);
    if (thanksgiving.getTime() < now.getTime()) {
      thanksgiving = nthWeekdayOfMonth(now.getFullYear() + 1, 10, 4, 4);
    }
    setTarget(thanksgiving);
  }, []);

  return (
    <CountdownPanel
      title={t("countdown.thanksgivingTitle")}
      subtitle={t("countdown.thanksgivingSubtitle")}
      icon={<Timer className="size-4 text-sky-700" />}
      target={target}
    />
  );
}
