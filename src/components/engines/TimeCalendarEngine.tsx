"use client";

import React, { useEffect, useState } from "react";
import { Clock, Play, Pause, RotateCcw, Calendar, Globe } from "lucide-react";
import { Calendar2026Engine } from "./Calendar2026Engine";
import { useTranslations } from "next-intl";
import { YearCalendar2027 } from "./time/YearCalendar2027";
import { HolidayCalendar2027 } from "./time/HolidayCalendar2027";
import { NewYearCountdown, ThanksgivingCountdown } from "./time/Countdowns";
import { TimeZoneConverter } from "./time/TimeZoneConverter";
import { CronGenerator, CronParser, CrontabGenerator } from "./time/CronTools";
import { EmailHeaderAnalyzer } from "./time/EmailHeaderAnalyzer";
import { EquationEditor } from "./time/EquationEditor";
import { MeetingPlanner } from "./time/MeetingPlanner";
import { RoundRobinGenerator } from "./time/RoundRobin";

interface TimeCalendarEngineProps {
  slug: string;
}

/* ------------------------------------------------------- the shared panels -- */

/** The pomodoro timer of the family. */
function TimerPanel() {
  const tUi = useTranslations("ui.engines.TimeCalendarEngine");

  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isRunning, timerSeconds]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => {
            setMode("work");
            setTimerSeconds(25 * 60);
            setIsRunning(false);
          }}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
            mode === "work" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {tUi("work25m")}
        </button>
        <button
          onClick={() => {
            setMode("shortBreak");
            setTimerSeconds(5 * 60);
            setIsRunning(false);
          }}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
            mode === "shortBreak" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {tUi("shortBreak5m")}
        </button>
        <button
          onClick={() => {
            setMode("longBreak");
            setTimerSeconds(15 * 60);
            setIsRunning(false);
          }}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
            mode === "longBreak" ? "bg-sky-800 text-white" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {tUi("longBreak15m")}
        </button>
      </div>

      <div className="my-8 font-mono text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {formatTimer(timerSeconds)}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-800 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-700"
        >
          {isRunning ? <Pause className="size-5" /> : <Play className="size-5" />}
          <span>{isRunning ? tUi("pause") : tUi("startFocus")}</span>
        </button>
        <button
          onClick={() => {
            setIsRunning(false);
            setTimerSeconds(
              mode === "work" ? 25 * 60 : mode === "shortBreak" ? 5 * 60 : 15 * 60,
            );
          }}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          title={tUi("resetTimer")}
        >
          <RotateCcw className="size-5" />
        </button>
      </div>
    </div>
  );
}

/** The unix timestamp converter with the world clocks. */
function TimestampPanel() {
  const tUi = useTranslations("ui.engines.TimeCalendarEngine");

  const [epochInput, setEpochInput] = useState("1735689600");
  const [dateOutput, setDateOutput] = useState("");
  const [worldTimes, setWorldTimes] = useState<Record<string, string>>({
    UTC: tUi("120000PM"),
    "America/New_York": tUi("070000AM"),
    "Europe/London": tUi("120000PM"),
    "Asia/Tokyo": tUi("090000PM"),
  });

  useEffect(() => {
    setEpochInput(Math.floor(Date.now() / 1000).toString());
    const times: Record<string, string> = {};
    [
      { city: tUi("uTCGMT"), zone: "UTC" },
      { city: tUi("newYork"), zone: tUi("americaNewYork") },
      { city: tUi("london"), zone: tUi("europeLondon") },
      { city: tUi("tokyo"), zone: tUi("asiaTokyo") },
    ].forEach((item) => {
      try {
        times[item.zone] = new Date().toLocaleTimeString("en-US", { timeZone: item.zone });
      } catch {}
    });
    setWorldTimes(times);
  }, []);

  useEffect(() => {
    try {
      const num = parseInt(epochInput, 10);
      if (!isNaN(num)) {
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        setDateOutput(
          `UTC: ${d.toUTCString()}\nLocal: ${d.toLocaleString()}\nISO: ${d.toISOString()}`
        );
      }
    } catch {}
  }, [epochInput]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Clock className="size-5 text-sky-700" />
        {tUi("unixTimestampConverterTimezoneClocks")}
      </h3>

      <div className="mt-4">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("unixTimestampSecondsOrMilliseconds")}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={epochInput}
            onChange={(e) => setEpochInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            onClick={() => setEpochInput(Math.floor(Date.now() / 1000).toString())}
            className="rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            {tUi("currentTime")}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 whitespace-pre-line">
        {dateOutput}
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
          <Globe className="size-4 text-sky-700" /> {tUi("worldTimezones")}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { city: tUi("uTCGMT"), zone: "UTC" },
            { city: tUi("newYork"), zone: tUi("americaNewYork") },
            { city: tUi("london"), zone: tUi("europeLondon") },
            { city: tUi("tokyo"), zone: tUi("asiaTokyo") },
          ].map((item) => (
            <div key={item.city} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500">{item.city}</span>
              <p className="mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                {worldTimes[item.zone] || tUi("120000PM")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The difference between two dates. */
function DateDurationPanel() {
  const tUi = useTranslations("ui.engines.TimeCalendarEngine");

  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [diffDays, setDiffDays] = useState(0);

  useEffect(() => {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (!isNaN(d1) && !isNaN(d2)) {
      setDiffDays(Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));
    }
  }, [startDate, endDate]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Calendar className="size-5 text-sky-700" />
        {tUi("dateDurationCalculator")}
      </h3>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("startDate")}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("endDate")}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-sky-50 p-6 text-center dark:bg-sky-950/40">
        <span className="text-4xl font-extrabold text-sky-800 dark:text-sky-300">
          {diffDays} {tUi("days")}
        </span>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {tUi("equivalentTo")} {(diffDays / 7).toFixed(1)} weeks or {(diffDays / 30.4).toFixed(1)} months
        </p>
      </div>
    </div>
  );
}

/** The printable calendar of the family. */
function CalendarPanel({ slug }: { slug?: string }) {
  return <Calendar2026Engine slug={slug} />;
}

/** The panel of a tool that is not wired up. */
function TimeToolFallback() {
  const t = useTranslations("ui.engines.time");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Clock className="mx-auto size-10 text-sky-700" />
      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
        {t("fallback.title")}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fallback.body")}</p>
    </div>
  );
}

/* -------------------------------------------------------------- the dispatch -- */

/**
 * The workspace of every tool of the family.
 *
 * The map holds one entry per slug, so a tool always renders the workspace
 * that belongs to it.
 */
const VIEW_BY_SLUG: Record<string, React.ComponentType<{ slug?: string }>> = {
  "2026-calendar": CalendarPanel,
  "printable-calendar": CalendarPanel,
  "2027-calendar": YearCalendar2027,
  "2027-holidays": HolidayCalendar2027,
  "countdown-to-date": DateDurationPanel,
  "epoch-converter": TimestampPanel,
  "unix-timestamp-converter": TimestampPanel,
  "timestamp-converter-generator": TimestampPanel,
  "pomodoro-timer": TimerPanel,
  "focus-timer": TimerPanel,
  "study-timer": TimerPanel,
  "cron-expression-generator": CronGenerator,
  "cron-expression-parser": CronParser,
  "crontab-generator": CrontabGenerator,
  "email-header-analyzer": EmailHeaderAnalyzer,
  "equation-editor": EquationEditor,
  "meeting-planner": MeetingPlanner,
  "new-year-countdown": NewYearCountdown,
  "round-robin-generator": RoundRobinGenerator,
  "thanksgiving-countdown": ThanksgivingCountdown,
  "time-zone-converter": () => <TimeZoneConverter variant="zone" />,
  "world-time-converter": () => <TimeZoneConverter variant="world" />,
};

export function TimeCalendarEngine({ slug }: TimeCalendarEngineProps) {
  const View = VIEW_BY_SLUG[slug];
  if (!View) {
    return <TimeToolFallback />;
  }
  return <View slug={slug} />;
}
