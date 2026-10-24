"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MonitorSmartphone, RefreshCw, Timer } from "lucide-react";
import { DevicePanel, DeviceStat, deviceButtonClass } from "./kit";

interface Measurement {
  hz: number;
  min: number;
  max: number;
  frames: number;
  seconds: number;
}

const FRAMES = 240;

/**
 * The test of the refresh rate.
 *
 * The panel counts the frames of the display over a few seconds and reports
 * the estimated refresh rate.
 */
export function RefreshRateTest() {
  const t = useTranslations("ui.engines.device");
  const frameRef = useRef<number | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setRunning(true);
    setMeasurement(null);
    const stamps: number[] = [];
    let frame = 0;

    const tick = (stamp: number) => {
      stamps.push(stamp);
      if (stamps.length < FRAMES) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      const gaps: number[] = [];
      for (let index = 1; index < stamps.length; index += 1) {
        const gap = stamps[index] - stamps[index - 1];
        if (gap > 0) gaps.push(gap);
      }
      if (!gaps.length) {
        setRunning(false);
        return;
      }
      const total = gaps.reduce((sum, gap) => sum + gap, 0);
      const average = total / gaps.length;
      setMeasurement({
        hz: Math.round((1000 / average) * 10) / 10,
        min: Math.round((1000 / Math.max(...gaps)) * 10) / 10,
        max: Math.round((1000 / Math.min(...gaps)) * 10) / 10,
        frames: stamps.length,
        seconds: Math.round((stamps[stamps.length - 1] - stamps[0]) / 100) / 10,
      });
      setRunning(false);
    };

    frame = window.requestAnimationFrame(tick);
    frameRef.current = frame;
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [runId]);

  return (
    <DevicePanel
      title={t("refresh.title")}
      subtitle={t("refresh.subtitle")}
      toolbar={
        <button
          type="button"
          onClick={() => setRunId((value) => value + 1)}
          className={deviceButtonClass}
        >
          <RefreshCw className="size-3.5" />
          {t("refresh.measureAgain")}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DeviceStat
          label={t("refresh.estimatedRate")}
          value={measurement ? `${measurement.hz} Hz` : running ? "..." : "-"}
        />
        <DeviceStat
          label={t("refresh.lowestRate")}
          value={measurement ? `${measurement.min} Hz` : "-"}
        />
        <DeviceStat
          label={t("refresh.highestRate")}
          value={measurement ? `${measurement.max} Hz` : "-"}
        />
        <DeviceStat
          label={t("refresh.frames")}
          value={measurement ? `${measurement.frames}` : "-"}
          hint={measurement ? t("refresh.seconds", { seconds: measurement.seconds }) : undefined}
        />
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <MonitorSmartphone className="size-4" />
        {running ? t("refresh.measuring") : t("refresh.done")}
      </p>
      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Timer className="size-4" />
        {t("refresh.hint")}
      </p>
    </DevicePanel>
  );
}
