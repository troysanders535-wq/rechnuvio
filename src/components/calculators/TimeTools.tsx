"use client";

import React, { useState } from "react";
import { Clock } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  Table,
  num,
  round,
} from "./shared";
import {
  decimalHours,
  formatClock,
  formatHoursMinutes,
  militaryToStandard,
  minutesBetween,
  parseTime,
  standardToMilitary,
  sumTimes,
  timeCardTotals,
  type TimeCardRow,
} from "./calc";

export function TimeTools({ variant }: { variant: CalculatorVariant }) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [rate, setRate] = useState("22");
  const [overtimeAfter, setOvertimeAfter] = useState("8");
  const [multiplier, setMultiplier] = useState("1.5");
  const [entries, setEntries] = useState("09:00-17:30, 09:00-17:30, 09:00-17:30, 09:00-17:30, 09:00-17:30");
  const [military, setMilitary] = useState("1730");
  const [standard, setStandard] = useState("5:30 PM");
  const [times, setTimes] = useState("01:30, 00:45, 02:15");
  const [hours, setHours] = useState("8");
  const [minutes, setMinutes] = useState("30");

  if (variant === "hours") {
    const minutes = minutesBetween(start, end);
    const net = minutes === null ? null : Math.max(0, minutes - (num(breakMinutes)));
    return (
      <CalcPanel
        title="Hours Calculator"
        subtitle="Hours and minutes between two times, with breaks and overnight shifts."
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Start time" value={start} onChange={setStart} hint="HH:MM" />
          <NumberField label="End time" value={end} onChange={setEnd} hint="HH:MM" />
          <NumberField label="Break (minutes)" value={breakMinutes} onChange={setBreakMinutes} />
        </div>
        <ResultGrid>
          <ResultCard
            label="Total time"
            value={net === null ? "—" : formatHoursMinutes(net)}
            tone="emerald"
          />
          <ResultCard
            label="Decimal hours"
            value={net === null ? "—" : round(decimalHours(net), 4)}
            tone="sky"
          />
          <ResultCard
            label="Hours"
            value={net === null ? "—" : Math.floor(net / 60)}
            tone="slate"
          />
          <ResultCard label="Minutes" value={net === null ? "—" : net % 60} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Pay at rate", value: net === null ? "—" : round((net / 60) * (num(rate)), 2) },
            { label: "Overnight shift", value: minutes !== null && minutes < 0 ? "Yes" : "No" },
            { label: "Raw difference", value: minutes === null ? "—" : `${minutes} minutes` },
          ]}
        />
      </CalcPanel>
    );
  }

  if (variant === "time") {
    const total = sumTimes(times.split(",").map((t) => t.trim()).filter(Boolean));
    const addMinutes = (num(hours)) * 60 + (num(minutes));
    return (
      <CalcPanel
        title="Time Calculator"
        subtitle="Add and subtract times, total a list of times or add a duration to a clock time."
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Times to total" value={times} onChange={setTimes} hint="HH:MM, HH:MM" />
          <NumberField label="Add hours" value={hours} onChange={setHours} />
          <NumberField label="Add minutes" value={minutes} onChange={setMinutes} />
        </div>
        <ResultGrid>
          <ResultCard
            label="Total of the list"
            value={total === null ? "—" : formatHoursMinutes(total)}
            tone="emerald"
          />
          <ResultCard
            label="Decimal hours"
            value={total === null ? "—" : round(decimalHours(total), 4)}
            tone="sky"
          />
          <ResultCard
            label="Start + duration"
            value={formatClock((parseTime(start) ?? 0) + addMinutes)}
            tone="amber"
          />
          <ResultCard
            label="Start − duration"
            value={formatClock((parseTime(start) ?? 0) - addMinutes)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          All times are handled on a 24 hour clock, so adding past midnight wraps to the next day.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "time-card") {
    const rows: TimeCardRow[] = entries
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [inTime, outTime] = entry.split("-").map((p) => p.trim());
        return { in: inTime ?? "", out: outTime ?? "", breakMinutes: 0 };
      });
    const totals = timeCardTotals(
      rows,
      num(rate),
      num(overtimeAfter),
      num(multiplier),
    );
    return (
      <CalcPanel
        title="Time Card Calculator"
        subtitle="Clock-in and clock-out times with breaks, overtime and pay."
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Shifts (in-out)"
            value={entries}
            onChange={setEntries}
            hint="09:00-17:30, 09:00-17:30"
          />
          <NumberField label="Hourly rate" value={rate} onChange={setRate} />
          <NumberField label="Overtime after (h/day)" value={overtimeAfter} onChange={setOvertimeAfter} />
        </div>
        <ResultGrid>
          <ResultCard label="Total hours" value={round(totals.totalHours, 2)} unit="h" tone="emerald" />
          <ResultCard label="Overtime hours" value={round(totals.overtimeHours, 2)} unit="h" tone="amber" />
          <ResultCard label="Regular pay" value={round(totals.regularPay, 2)} tone="sky" />
          <ResultCard label="Total pay" value={round(totals.totalPay, 2)} tone="emerald" />
        </ResultGrid>
        <Table
          headers={["Day", "In", "Out", "Hours"]}
          rows={rows.map((row, index) => [
            index + 1,
            row.in,
            row.out,
            round(totals.dailyHours[index] ?? 0, 2),
          ])}
        />
        <FormulaNote>
          Each shift is the difference between the clock-out and clock-in time. Shifts that cross
          midnight are counted as an overnight shift.
        </FormulaNote>
      </CalcPanel>
    );
  }

  // military-time
  const standardValue = militaryToStandard(military);
  const militaryValue = standardToMilitary(standard);
  return (
    <CalcPanel
      title="Military Time Converter"
      subtitle="Convert military time to standard time and back — 1730 becomes 5:30 PM."
      icon={<Clock className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Military time" value={military} onChange={setMilitary} hint="1730 or 173000" />
        <NumberField label="Standard time" value={standard} onChange={setStandard} hint="5:30 PM" />
      </div>
      <ResultGrid>
        <ResultCard
          label="1730 in standard time"
          value={standardValue ?? "—"}
          tone="emerald"
        />
        <ResultCard
          label="5:30 PM in military time"
          value={militaryValue ?? "—"}
          tone="sky"
        />
        <ResultCard
          label="Spoken"
          value={
            standardValue
              ? `${standardValue.replace(":", " ")} ${standardValue.endsWith("PM") ? "in the afternoon" : "in the morning"}`
              : "—"
          }
          tone="slate"
        />
        <ResultCard
          label="Current military time"
          value={formatClock(new Date().getHours() * 60 + new Date().getMinutes())}
          tone="amber"
        />
      </ResultGrid>
      <Table
        headers={["Military", "Standard"]}
        rows={[
          ["0000", "12:00 AM"],
          ["0530", "5:30 AM"],
          ["1200", "12:00 PM"],
          ["1730", "5:30 PM"],
          ["2359", "11:59 PM"],
        ]}
      />
    </CalcPanel>
  );
}
