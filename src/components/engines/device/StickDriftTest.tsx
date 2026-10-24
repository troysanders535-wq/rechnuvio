"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Crosshair, Gamepad2, Target } from "lucide-react";
import {
  DevicePanel,
  DeviceStat,
  deviceButtonClass,
  deviceFieldLabelClass,
  deviceGhostButtonClass,
  deviceInputClass,
} from "./kit";

const AXIS_NAMES = ["Left stick X", "Left stick Y", "Right stick X", "Right stick Y"];

/**
 * The test of the drift of a stick.
 *
 * The panel reads the axes of the controller and compares them with the
 * neutral position that was measured before.
 */
export function StickDriftTest() {
  const t = useTranslations("ui.engines.device");
  const timerRef = useRef<number | null>(null);

  const [axes, setAxes] = useState<number[]>([]);
  const [neutral, setNeutral] = useState<number[] | null>(null);
  const [threshold, setThreshold] = useState(5);
  const [listening, setListening] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const poll = () => {
      const raw =
        typeof navigator !== "undefined" && typeof navigator.getGamepads === "function"
          ? navigator.getGamepads()
          : [];
      const pad = raw.find((entry) => entry);
      setConnected(Boolean(pad));
      setAxes(pad ? Array.from(pad.axes) : []);
      timerRef.current = window.setTimeout(poll, 100);
    };
    poll();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [listening]);

  const drifts = axes.map((value, index) =>
    neutral && neutral[index] !== undefined ? value - neutral[index] : 0,
  );

  const maxDrift = drifts.reduce(
    (worst, value) => Math.max(worst, Math.abs(value)),
    0,
  );

  const driftPercent = Math.round((maxDrift / 0.5) * 100);
  const faulty = maxDrift * 100 > threshold;

  return (
    <DevicePanel
      title={t("stickDrift.title")}
      subtitle={t("stickDrift.subtitle")}
      toolbar={
        <>
          <button
            type="button"
            onClick={() => setListening((value) => !value)}
            className={listening ? deviceGhostButtonClass : deviceButtonClass}
          >
            <Gamepad2 className="size-3.5" />
            {listening ? t("stickDrift.stop") : t("stickDrift.start")}
          </button>
          <button
            type="button"
            onClick={() => setNeutral(axes.length ? [...axes] : null)}
            className={deviceGhostButtonClass}
          >
            <Target className="size-3.5" />
            {t("stickDrift.calibrate")}
          </button>
        </>
      }
    >
      <div className="max-w-xs">
        <label className={deviceFieldLabelClass} htmlFor="stick-drift-threshold">
          {t("stickDrift.threshold")}
        </label>
        <input
          id="stick-drift-threshold"
          type="number"
          min={1}
          max={50}
          step={1}
          value={threshold}
          onChange={(event) => setThreshold(parseInt(event.target.value, 10) || 5)}
          className={deviceInputClass}
        />
      </div>

      {!connected ? (
        <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <Gamepad2 className="size-4" />
          {listening ? t("stickDrift.noGamepad") : t("stickDrift.startHint")}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {axes.slice(0, 4).map((value, index) => (
          <DeviceStat
            key={`axis-${index}`}
            label={AXIS_NAMES[index]}
            value={value.toFixed(3)}
            hint={t("stickDrift.drift", { drift: drifts[index].toFixed(3) })}
          />
        ))}
        <DeviceStat
          label={t("stickDrift.maxDrift")}
          value={`${(maxDrift * 100).toFixed(1)} %`}
          hint={t("stickDrift.driftPercent", { percent: driftPercent })}
        />
      </div>

      {neutral ? (
        <p
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            faulty
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {faulty ? t("stickDrift.faulty") : t("stickDrift.healthy")}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Crosshair className="size-4" />
          {t("stickDrift.calibrateHint")}
        </p>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("stickDrift.hint")}</p>
    </DevicePanel>
  );
}
