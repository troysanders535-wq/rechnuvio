"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, Pause, RotateCcw, Calendar, Globe, Sparkles } from "lucide-react";
import { Calendar2026Engine } from "./Calendar2026Engine";

interface TimeCalendarEngineProps {
  slug: string;
}

export function TimeCalendarEngine({ slug }: TimeCalendarEngineProps) {
  if (slug.includes("calendar")) {
    return <Calendar2026Engine slug={slug} />;
  }

  const isPomodoro = slug.includes("pomodoro") || slug.includes("timer");
  const isTimestamp = slug.includes("timestamp") || slug.includes("epoch");
  const isDateDiff = slug.includes("date") || slug.includes("age") || slug.includes("days");
  const isCalendar = slug.includes("calendar") || slug.includes("holiday") || slug.includes("countdown");

  // Pomodoro state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "shortBreak" | "longBreak">("work");

  // Timestamp state
  const [epochInput, setEpochInput] = useState("1735689600");
  const [dateOutput, setDateOutput] = useState("");
  const [worldTimes, setWorldTimes] = useState<Record<string, string>>({
    UTC: "12:00:00 PM",
    "America/New_York": "07:00:00 AM",
    "Europe/London": "12:00:00 PM",
    "Asia/Tokyo": "09:00:00 PM",
  });

  // Date diff state
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [diffDays, setDiffDays] = useState(0);

  // Pomodoro effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerSeconds]);

  useEffect(() => {
    setEpochInput(Math.floor(Date.now() / 1000).toString());
    const times: Record<string, string> = {};
    [
      { city: "UTC / GMT", zone: "UTC" },
      { city: "New York", zone: "America/New_York" },
      { city: "London", zone: "Europe/London" },
      { city: "Tokyo", zone: "Asia/Tokyo" },
    ].forEach((item) => {
      try {
        times[item.zone] = new Date().toLocaleTimeString("en-US", { timeZone: item.zone });
      } catch {}
    });
    setWorldTimes(times);
  }, []);

  // Timestamp converter
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

  // Date diff
  useEffect(() => {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (!isNaN(d1) && !isNaN(d2)) {
      setDiffDays(Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));
    }
  }, [startDate, endDate]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isPomodoro) {
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
            Work (25m)
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
            Short Break (5m)
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
            Long Break (15m)
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
            <span>{isRunning ? "Pause" : "Start Focus"}</span>
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setTimerSeconds(mode === "work" ? 25 * 60 : mode === "shortBreak" ? 5 * 60 : 15 * 60);
            }}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Reset timer"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (isDateDiff) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="size-5 text-sky-700" />
          Date & Duration Calculator
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Start Date
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
              End Date
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
            {diffDays} Days
          </span>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Equivalent to {(diffDays / 7).toFixed(1)} weeks or {(diffDays / 30.4).toFixed(1)} months
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Clock className="size-5 text-sky-700" />
        Unix Timestamp Converter & Timezone Clocks
      </h3>

      <div className="mt-4">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Unix Timestamp (seconds or milliseconds)
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
            Current Time
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 whitespace-pre-line">
        {dateOutput}
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
          <Globe className="size-4 text-sky-700" /> World Timezones
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { city: "UTC / GMT", zone: "UTC" },
            { city: "New York", zone: "America/New_York" },
            { city: "London", zone: "Europe/London" },
            { city: "Tokyo", zone: "Asia/Tokyo" },
          ].map((item) => (
            <div key={item.city} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500">{item.city}</span>
              <p className="mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                {worldTimes[item.zone] || "12:00:00 PM"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
