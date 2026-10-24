"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Clock3, Copy, Globe } from "lucide-react";
import {
  TimePanel,
  formatClockInZone,
  formatDateTimeInZone,
  timeFieldLabelClass,
  timeGhostButtonClass,
  timeInputClass,
  timeSelectClass,
} from "./kit";
import {
  wallClockToInstant,
  zoneAbbreviation,
  zoneOffsetLabel,
  zoneOffsetMs,
} from "./zones";

const ZONES: { id: string; key: string }[] = [
  { id: "UTC", key: "UTC" },
  { id: "Europe/London", key: "Europe_London" },
  { id: "Europe/Berlin", key: "Europe_Berlin" },
  { id: "Europe/Paris", key: "Europe_Paris" },
  { id: "America/New_York", key: "America_New_York" },
  { id: "America/Chicago", key: "America_Chicago" },
  { id: "America/Los_Angeles", key: "America_Los_Angeles" },
  { id: "America/Sao_Paulo", key: "America_Sao_Paulo" },
  { id: "Africa/Cairo", key: "Africa_Cairo" },
  { id: "Asia/Kolkata", key: "Asia_Kolkata" },
  { id: "Asia/Shanghai", key: "Asia_Shanghai" },
  { id: "Asia/Tokyo", key: "Asia_Tokyo" },
  { id: "Australia/Sydney", key: "Australia_Sydney" },
  { id: "Pacific/Auckland", key: "Pacific_Auckland" },
];

/**
 * The converter between two time zones.
 *
 * The panel holds a source zone and a target zone, the wall clock time of the
 * source zone and the live clock of both zones. The conversion runs while the
 * user types, so a time can be read in the other zone at once.
 */
export function TimeZoneConverter({ variant }: { variant: "world" | "zone" }) {
  const t = useTranslations("ui.engines.time");
  const locale = useLocale();

  const [fromZone, setFromZone] = useState<string>("Europe/Berlin");
  const [toZone, setToZone] = useState<string>("America/New_York");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stamp = new Date();
    const month = `${stamp.getMonth() + 1}`.padStart(2, "0");
    const day = `${stamp.getDate()}`.padStart(2, "0");
    const hours = `${stamp.getHours()}`.padStart(2, "0");
    const minutes = `${stamp.getMinutes()}`.padStart(2, "0");
    setDate(`${stamp.getFullYear()}-${month}-${day}`);
    setTime(`${hours}:${minutes}`);
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const instant = useMemo(
    () => (date && time ? wallClockToInstant(date, time, fromZone) : null),
    [date, time, fromZone],
  );

  const fromLabel = t(`zones.${ZONES.find((zone) => zone.id === fromZone)?.key ?? "UTC"}`);
  const toLabel = t(`zones.${ZONES.find((zone) => zone.id === toZone)?.key ?? "UTC"}`);

  const difference = useMemo(() => {
    if (instant === null) return "";
    const from = zoneOffsetMs(instant, fromZone);
    const to = zoneOffsetMs(instant, toZone);
    const hours = (to - from) / 3600000;
    const sign = hours > 0 ? "+" : hours < 0 ? "-" : "";
    const absolute = Math.abs(hours);
    const whole = Math.floor(absolute);
    const minutes = Math.round((absolute - whole) * 60);
    return minutes ? `${sign}${whole} h ${minutes} min` : `${sign}${whole} h`;
  }, [instant, fromZone, toZone]);

  const title =
    variant === "world" ? t("timezone.worldTitle") : t("timezone.zoneTitle");

  const copyResult = () => {
    if (instant === null) return;
    const text = formatDateTimeInZone(new Date(instant), locale, toZone);
    navigator.clipboard
      ?.writeText(text)
      .then(
        () => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        },
        () => setCopied(false),
      );
  };

  return (
    <TimePanel title={title} subtitle={t("timezone.subtitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={timeFieldLabelClass} htmlFor="from-zone">
            {t("timezone.fromZone")}
          </label>
          <select
            id="from-zone"
            value={fromZone}
            onChange={(event) => setFromZone(event.target.value)}
            className={timeSelectClass}
          >
            {ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {t(`zones.${zone.key}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="to-zone">
            {t("timezone.toZone")}
          </label>
          <select
            id="to-zone"
            value={toZone}
            onChange={(event) => setToZone(event.target.value)}
            className={timeSelectClass}
          >
            {ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {t(`zones.${zone.key}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="zone-date">
            {t("timezone.date")}
          </label>
          <input
            id="zone-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="zone-time">
            {t("timezone.time")}
          </label>
          <input
            id="zone-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={timeInputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Globe className="size-3.5" />
            {fromLabel}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {now === null
              ? "--:--:--"
              : formatClockInZone(new Date(now), locale, fromZone)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {now === null ? "" : zoneOffsetLabel(now, fromZone)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Globe className="size-3.5" />
            {toLabel}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {now === null
              ? "--:--:--"
              : formatClockInZone(new Date(now), locale, toZone)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {now === null ? "" : zoneOffsetLabel(now, toZone)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-sky-900 dark:text-sky-200">
            <Clock3 className="size-4" />
            {t("timezone.result")}
          </p>
          <button type="button" onClick={copyResult} className={timeGhostButtonClass}>
            <Copy className="size-3.5" />
            {copied ? t("timezone.copied") : t("timezone.copyResult")}
          </button>
        </div>
        {instant === null ? (
          <p className="mt-2 text-xs text-sky-900/80 dark:text-sky-200/80">
            {t("timezone.enterTime")}
          </p>
        ) : (
          <>
            <p className="mt-2 font-mono text-xl font-bold tabular-nums text-sky-900 dark:text-sky-200">
              {formatDateTimeInZone(new Date(instant), locale, toZone)}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-sky-900/80 dark:text-sky-200/80">
              <ArrowRight className="size-3.5" />
              {t("timezone.convertedFrom", { from: fromLabel, to: toLabel })}
            </p>
            <p className="mt-1 text-[11px] text-sky-900/80 dark:text-sky-200/80">
              {t("timezone.difference", { difference })}{" "}
              {zoneAbbreviation(instant, toZone, locale)}
            </p>
          </>
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("timezone.hint")}</p>
    </TimePanel>
  );
}
