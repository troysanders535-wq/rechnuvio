"use client";

import React, { useState } from "react";
import { Clock } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
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
  isOvernightShift,
  militaryToStandard,
  minutesBetween,
  parseTime,
  standardToMilitary,
  sumTimes,
  timeCardTotals,
  type TimeCardRow,
} from "./calc";

export function TimeTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.TimeTools");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [rate, setRate] = useState("22");
  const [overtimeAfter, setOvertimeAfter] = useState("8");
  const [multiplier, setMultiplier] = useState("1.5");
  const [entries, setEntries] = useState("09:00-17:30, 09:00-17:30, 09:00-17:30, 09:00-17:30, 09:00-17:30");
  const [military, setMilitary] = useState("1730");
  const [standard, setStandard] = useState(tUi("530PM"));
  const [times, setTimes] = useState("01:30, 00:45, 02:15");
  const [hours, setHours] = useState("8");
  const [minutes, setMinutes] = useState("30");

  if (variant === "hours") {
    const minutes = minutesBetween(start, end);
    const net = minutes === null ? null : Math.max(0, minutes - (num(breakMinutes)));
    return (
      <CalcPanel
        title={tUi("hoursCalculator")}
        subtitle={tUi("hoursAndMinutesBetweenTwoTimesWithBreaksAndOvernightShifts")}
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("startTime")} value={start} onChange={setStart} hint="HH:MM" />
          <NumberField label={tUi("endTime")} value={end} onChange={setEnd} hint="HH:MM" />
          <NumberField label={tUi("breakMinutes")} value={breakMinutes} onChange={setBreakMinutes} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("totalTime")}
            value={net === null ? "—" : formatHoursMinutes(net)}
            tone="emerald"
          />
          <ResultCard
            label={tUi("decimalHours")}
            value={net === null ? "—" : round(decimalHours(net), 4)}
            tone="sky"
          />
          <ResultCard
            label={tUi("hours")}
            value={net === null ? "—" : Math.floor(net / 60)}
            tone="slate"
          />
          <ResultCard label={tUi("minutes")} value={net === null ? "—" : net % 60} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("payAtRate"), value: net === null ? "—" : round((net / 60) * (num(rate)), 2) },
            {
              label: tUi("overnightShift"),
              value: minutes === null ? "—" : isOvernightShift(start, end) ? tUi("yes") : tUi("no"),
            },
            { label: tUi("rawDifference"), value: minutes === null ? "—" : `${minutes} minutes` },
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
        title={tUi("timeCalculator")}
        subtitle={tUi("addAndSubtractTimesTotalAListOfTimesOrAddADurationToAClockTime")}
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("timesToTotal")} value={times} onChange={setTimes} hint="HH:MM, HH:MM" />
          <NumberField label={tUi("addHours")} value={hours} onChange={setHours} />
          <NumberField label={tUi("addMinutes")} value={minutes} onChange={setMinutes} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("totalOfTheList")}
            value={total === null ? "—" : formatHoursMinutes(total)}
            tone="emerald"
          />
          <ResultCard
            label={tUi("decimalHours")}
            value={total === null ? "—" : round(decimalHours(total), 4)}
            tone="sky"
          />
          <ResultCard
            label={tUi("startDuration")}
            value={formatClock((parseTime(start) ?? 0) + addMinutes)}
            tone="amber"
          />
          <ResultCard
            label={tUi("startDuration2")}
            value={formatClock((parseTime(start) ?? 0) - addMinutes)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          {tUi("allTimesAreHandledOnA24HourClockSoAddingPastMidnightWrapsToTheNextDay")}
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
        title={tUi("timeCardCalculator")}
        subtitle={tUi("clockInAndClockOutTimesWithBreaksOvertimeAndPay")}
        icon={<Clock className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label={tUi("shiftsInOut")}
            value={entries}
            onChange={setEntries}
            hint="09:00-17:30, 09:00-17:30"
          />
          <NumberField label={tUi("hourlyRate")} value={rate} onChange={setRate} />
          <NumberField label={tUi("overtimeAfterHDay")} value={overtimeAfter} onChange={setOvertimeAfter} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("totalHours")} value={round(totals.totalHours, 2)} unit="h" tone="emerald" />
          <ResultCard label={tUi("overtimeHours")} value={round(totals.overtimeHours, 2)} unit="h" tone="amber" />
          <ResultCard label={tUi("regularPay")} value={round(totals.regularPay, 2)} tone="sky" />
          <ResultCard label={tUi("totalPay")} value={round(totals.totalPay, 2)} tone="emerald" />
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
        <FormulaNote>{tUi("timeCardShiftFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  // military-time
  const standardValue = militaryToStandard(military);
  const militaryValue = standardToMilitary(standard);
  return (
    <CalcPanel
      title={tUi("militaryTimeConverter")}
      subtitle={tUi("convertMilitaryTimeToStandardTimeAndBack1730Becomes530PM")}
      icon={<Clock className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label={tUi("militaryTime")} value={military} onChange={setMilitary} hint={tUi("1730Or173000")} />
        <NumberField label={tUi("standardTime")} value={standard} onChange={setStandard} hint={tUi("530PM")} />
      </div>
      <ResultGrid>
        <ResultCard
          label={tUi("1730InStandardTime")}
          value={standardValue ?? "—"}
          tone="emerald"
        />
        <ResultCard
          label={`${standard} ${tUi("inMilitaryTime")}`}
          value={militaryValue ?? "—"}
          tone="sky"
        />
        <ResultCard
          label={tUi("spoken")}
          value={
            standardValue
              ? `${standardValue.replace(":", " ")} ${standardValue.endsWith("PM") ? tUi("inTheAfternoon") : tUi("inTheMorning")}`
              : "—"
          }
          tone="slate"
        />
        <ResultCard
          label={tUi("currentMilitaryTime")}
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
