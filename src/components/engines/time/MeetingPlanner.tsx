"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, Clock, Users } from "lucide-react";
import {
  TimePanel,
  timeButtonClass,
  timeFieldLabelClass,
  timeGhostButtonClass,
  timeInputClass,
  timeOutputClass,
} from "./kit";

interface Slot {
  start: number;
  end: number;
}

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * The planner of a meeting.
 *
 * The panel holds the participants, the duration, the agenda and the busy
 * slots, and it proposes the first slot of the working day that is free for
 * everybody.
 */
export function MeetingPlanner() {
  const t = useTranslations("ui.engines.time");

  const [participants, setParticipants] = useState("Alice Meyer\nBob Schmidt\nCarol Novak");
  const [agenda, setAgenda] = useState("Welcome\nReview of the figures\nNext steps");
  const [busySlots, setBusySlots] = useState("09:00-10:30");
  const [duration, setDuration] = useState(60);
  const [dayStart, setDayStart] = useState(9);
  const [dayEnd, setDayEnd] = useState(17);
  const [date, setDate] = useState("");

  useEffect(() => {
    const stamp = new Date();
    const month = `${stamp.getMonth() + 1}`.padStart(2, "0");
    const day = `${stamp.getDate()}`.padStart(2, "0");
    setDate(`${stamp.getFullYear()}-${month}-${day}`);
  }, []);

  const participantList = useMemo(
    () =>
      participants
        .split(/[\n,;]/)
        .map((name) => name.trim())
        .filter(Boolean),
    [participants],
  );

  const agendaList = useMemo(
    () =>
      agenda
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [agenda],
  );

  const busy = useMemo(() => {
    const slots: Slot[] = [];
    busySlots.split("\n").forEach((line) => {
      const parts = line.split("-");
      if (parts.length !== 2) return;
      const start = parseClock(parts[0]);
      const end = parseClock(parts[1]);
      if (start === null || end === null || end <= start) return;
      slots.push({ start, end });
    });
    return slots.sort((a, b) => a.start - b.start);
  }, [busySlots]);

  const freeSlots = useMemo(() => {
    const window: Slot = { start: dayStart * 60, end: dayEnd * 60 };
    const slots: Slot[] = [];
    let cursor = window.start;
    busy.forEach((slot) => {
      if (slot.start > cursor) {
        slots.push({ start: cursor, end: Math.min(slot.start, window.end) });
      }
      cursor = Math.max(cursor, slot.end);
    });
    if (cursor < window.end) {
      slots.push({ start: cursor, end: window.end });
    }
    return slots.filter((slot) => slot.end > slot.start);
  }, [busy, dayStart, dayEnd]);

  const proposal = useMemo(() => {
    const found = freeSlots.find((slot) => slot.end - slot.start >= duration);
    return found || null;
  }, [freeSlots, duration]);

  const agendaSlots = useMemo(() => {
    if (!proposal || !agendaList.length) return [];
    const share = Math.floor(duration / agendaList.length);
    return agendaList.map((item, index) => ({
      item,
      start: proposal.start + index * share,
      end:
        index === agendaList.length - 1
          ? proposal.start + duration
          : proposal.start + (index + 1) * share,
    }));
  }, [agendaList, proposal, duration]);

  return (
    <TimePanel title={t("meeting.title")} subtitle={t("meeting.subtitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-participants">
            {t("meeting.participants")}
          </label>
          <textarea
            id="meeting-participants"
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            rows={5}
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t("meeting.participantCount", { count: participantList.length })}
          </p>
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-agenda">
            {t("meeting.agenda")}
          </label>
          <textarea
            id="meeting-agenda"
            value={agenda}
            onChange={(event) => setAgenda(event.target.value)}
            rows={5}
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t("meeting.agendaCount", { count: agendaList.length })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-date">
            {t("meeting.date")}
          </label>
          <input
            id="meeting-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-duration">
            {t("meeting.duration")}
          </label>
          <input
            id="meeting-duration"
            type="number"
            min={5}
            max={600}
            step={5}
            value={duration}
            onChange={(event) => setDuration(parseInt(event.target.value, 10) || 60)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-day-start">
            {t("meeting.dayStart")}
          </label>
          <input
            id="meeting-day-start"
            type="number"
            min={0}
            max={23}
            value={dayStart}
            onChange={(event) => setDayStart(parseInt(event.target.value, 10) || 0)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="meeting-day-end">
            {t("meeting.dayEnd")}
          </label>
          <input
            id="meeting-day-end"
            type="number"
            min={1}
            max={24}
            value={dayEnd}
            onChange={(event) => setDayEnd(parseInt(event.target.value, 10) || 24)}
            className={timeInputClass}
          />
        </div>
      </div>

      <div>
        <label className={timeFieldLabelClass} htmlFor="meeting-busy-slots">
          {t("meeting.busySlots")}
        </label>
        <textarea
          id="meeting-busy-slots"
          value={busySlots}
          onChange={(event) => setBusySlots(event.target.value)}
          rows={4}
          spellCheck={false}
          placeholder={t("meeting.busySlotsPlaceholder")}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-300 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
        />
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/40">
        <p className="flex items-center gap-2 text-xs font-semibold text-sky-900 dark:text-sky-200">
          <CalendarCheck className="size-4" />
          {t("meeting.proposal")}
        </p>
        {proposal ? (
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-sky-900 dark:text-sky-200">
            {formatMinutes(proposal.start)} - {formatMinutes(proposal.end)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-sky-900/80 dark:text-sky-200/80">
            {t("meeting.noSlot")}
          </p>
        )}
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Clock className="size-4 text-sky-700" />
          {t("meeting.plan")}
        </p>
        {agendaSlots.length ? (
          <ul className="mt-2 space-y-1">
            {agendaSlots.map((slot) => (
              <li
                key={`${slot.start}-${slot.item}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-950/60"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {slot.item}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {formatMinutes(slot.start)} - {formatMinutes(slot.end)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t("meeting.noAgenda")}
          </p>
        )}
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Users className="size-4 text-sky-700" />
          {t("meeting.freeSlots")}
        </p>
        <pre className={timeOutputClass}>
          {freeSlots.length
            ? freeSlots
                .map((slot) => `${formatMinutes(slot.start)} - ${formatMinutes(slot.end)}`)
                .join("\n")
            : t("meeting.noFreeSlot")}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setParticipants("Alice Meyer\nBob Schmidt\nCarol Novak");
            setAgenda("Welcome\nReview of the figures\nNext steps");
            setBusySlots("09:00-10:30");
            setDuration(60);
            setDayStart(9);
            setDayEnd(17);
          }}
          className={timeButtonClass}
        >
          {t("meeting.loadExample")}
        </button>
        <button
          type="button"
          onClick={() => {
            setParticipants("");
            setAgenda("");
            setBusySlots("");
          }}
          className={timeGhostButtonClass}
        >
          {t("meeting.clear")}
        </button>
      </div>
    </TimePanel>
  );
}
