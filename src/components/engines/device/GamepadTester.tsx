"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2, PlugZap } from "lucide-react";
import { DevicePanel, DeviceStat, deviceButtonClass } from "./kit";

interface PadState {
  index: number;
  id: string;
  mapping: string;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
  lastButton: string | null;
}

/** The name of a button of the standard gamepad mapping. */
const BUTTON_NAMES = [
  "A / Cross",
  "B / Circle",
  "X / Square",
  "Y / Triangle",
  "Left bumper",
  "Right bumper",
  "Left trigger",
  "Right trigger",
  "Select",
  "Start",
  "Left stick",
  "Right stick",
  "D-pad up",
  "D-pad down",
  "D-pad left",
  "D-pad right",
  "Home",
];

const AXIS_NAMES = ["Left stick X", "Left stick Y", "Right stick X", "Right stick Y"];

/**
 * The test of a gamepad.
 *
 * The panel lists the connected controllers and shows their axes and their
 * buttons while they are used.
 */
export function GamepadTester() {
  const t = useTranslations("ui.engines.device");
  const [pads, setPads] = useState<PadState[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    let frame = 0;
    let previous: PadState[] = [];

    const poll = () => {
      const raw =
        typeof navigator !== "undefined" && typeof navigator.getGamepads === "function"
          ? navigator.getGamepads()
          : [];
      const next: PadState[] = [];
      for (const pad of raw) {
        if (!pad) continue;
        const old = previous.find((entry) => entry.index === pad.index);
        let lastButton = old ? old.lastButton : null;
        pad.buttons.forEach((button, index) => {
          if (button.pressed && (!old || !old.buttons[index] || !old.buttons[index].pressed)) {
            lastButton = BUTTON_NAMES[index] || `Button ${index}`;
          }
        });
        next.push({
          index: pad.index,
          id: pad.id,
          mapping: pad.mapping,
          axes: Array.from(pad.axes),
          buttons: pad.buttons.map((button) => ({
            pressed: button.pressed,
            value: button.value,
          })),
          lastButton,
        });
      }
      previous = next;
      setPads(next);
      frame = window.requestAnimationFrame(poll);
    };

    frame = window.requestAnimationFrame(poll);
    return () => window.cancelAnimationFrame(frame);
  }, [listening]);

  return (
    <DevicePanel
      title={t("gamepad.title")}
      subtitle={t("gamepad.subtitle")}
      toolbar={
        <button
          type="button"
          onClick={() => setListening((value) => !value)}
          className={deviceButtonClass}
        >
          <PlugZap className="size-3.5" />
          {listening ? t("gamepad.stop") : t("gamepad.start")}
        </button>
      }
    >
      {pads.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <Gamepad2 className="size-4" />
          {listening ? t("gamepad.noGamepad") : t("gamepad.startHint")}
        </p>
      ) : (
        pads.map((pad) => (
          <section
            key={pad.index}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              {t("gamepad.controller", { index: pad.index })}
            </h4>
            <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {pad.id}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("gamepad.mapping", { mapping: pad.mapping || "standard" })}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {t("gamepad.axes")}
                </p>
                <ul className="mt-1 space-y-1">
                  {pad.axes.map((value, index) => (
                    <li
                      key={`axis-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] dark:bg-slate-900"
                    >
                      <span className="text-slate-600 dark:text-slate-300">
                        {AXIS_NAMES[index] || `Axis ${index}`}
                      </span>
                      <span className="text-slate-900 dark:text-white">{value.toFixed(3)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {t("gamepad.buttons")}
                </p>
                <ul className="mt-1 grid grid-cols-2 gap-1">
                  {pad.buttons.map((button, index) => (
                    <li
                      key={`button-${index}`}
                      className={`rounded-lg px-2 py-1 text-[10px] ${
                        button.pressed
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                      }`}
                    >
                      {BUTTON_NAMES[index] || `Button ${index}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3">
              <DeviceStat
                label={t("gamepad.lastButton")}
                value={pad.lastButton ?? "-"}
              />
            </div>
          </section>
        ))
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("gamepad.hint")}</p>
    </DevicePanel>
  );
}
