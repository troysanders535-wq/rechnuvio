"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Gauge, RotateCcw, TimerReset } from "lucide-react";
import { DevicePanel, DeviceStat, deviceButtonClass, deviceFieldLabelClass, deviceInputClass } from "./kit";

/**
 * The test of a double click.
 *
 * The panel measures the time between two clicks and counts how many of the
 * pairs were fast enough for the operating system to read them as a double
 * click.
 */
export function DoubleClickTest() {
  const t = useTranslations("ui.engines.device");
  const lastClickRef = useRef<number | null>(null);

  const [threshold, setThreshold] = useState(500);
  const [measured, setMeasured] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  const handleClick = () => {
    const now = Date.now();
    const previous = lastClickRef.current;
    lastClickRef.current = now;

    if (previous === null) {
      setAttempts((value) => value + 1);
      setMeasured(null);
      return;
    }

    const measured = now - previous;
    setMeasured(measured);
    setAttempts((value) => value + 1);
    if (measured <= threshold) {
      setSuccesses((value) => value + 1);
    }
    if (best === null || measured < best) {
      setBest(measured);
    }
  };

  const successRate = attempts > 0 ? Math.round((successes / attempts) * 100) : 0;

  const reset = () => {
    lastClickRef.current = null;
    setMeasured(null);
    setAttempts(0);
    setSuccesses(0);
    setBest(null);
  };

  return (
    <DevicePanel title={t("doubleClick.title")} subtitle={t("doubleClick.subtitle")}>
      <div
        onClick={handleClick}
        className="flex h-40 cursor-pointer select-none items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
      >
        {t("doubleClick.clickHere")}
      </div>

      <div className="max-w-xs">
        <label className={deviceFieldLabelClass} htmlFor="double-click-threshold">
          {t("doubleClick.threshold")}
        </label>
        <input
          id="double-click-threshold"
          type="number"
          min={50}
          max={2000}
          step={10}
          value={threshold}
          onChange={(event) => setThreshold(parseInt(event.target.value, 10) || 500)}
          className={deviceInputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DeviceStat
          label={t("doubleClick.lastInterval")}
          value={measured === null ? "-- ms" : `${measured} ms`}
        />
        <DeviceStat
          label={t("doubleClick.bestInterval")}
          value={best === null ? "-- ms" : `${best} ms`}
        />
        <DeviceStat label={t("doubleClick.attempts")} value={String(attempts)} />
        <DeviceStat
          label={t("doubleClick.successRate")}
          value={`${successRate} %`}
          hint={t("doubleClick.successHint", { count: successes })}
        />
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <TimerReset className="size-4" />
        {t("doubleClick.hint")}
      </p>
      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Gauge className="size-4" />
        {t("doubleClick.thresholdHint", { threshold })}
      </p>

      <div>
        <button type="button" onClick={reset} className={deviceButtonClass}>
          <RotateCcw className="size-3.5" />
          {t("doubleClick.reset")}
        </button>
      </div>
    </DevicePanel>
  );
}
