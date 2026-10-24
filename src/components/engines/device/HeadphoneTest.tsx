"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Ear, Music4, Waves } from "lucide-react";
import { DevicePanel, deviceButtonClass, deviceGhostButtonClass } from "./kit";
import { playSweep, playTone, type Tone } from "./audio";

/**
 * The test of a headphone.
 *
 * The panel plays a test tone in the left ear, in the right ear and in both
 * ears, and it sweeps a sine wave from 20 Hz to 20 kHz.
 */
export function HeadphoneTest() {
  const t = useTranslations("ui.engines.device");
  const toneRef = useRef<Tone | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const stop = () => {
    toneRef.current?.stop();
    toneRef.current = null;
    setPlaying(null);
  };

  const start = (
    key: string,
    build: (onEnd: () => void) => Tone | null,
  ) => {
    stop();
    const tone = build(() => {
      toneRef.current = null;
      setPlaying(null);
    });
    if (!tone) {
      setMessage(t("headphone.noAudio"));
      return;
    }
    toneRef.current = tone;
    setPlaying(key);
    setMessage(t("headphone.playing"));
  };

  const playChannel = (pan: number, key: string, label: string) => {
    start(key, (onEnd) =>
      playTone({
        frequency: 1000,
        duration: 3,
        volume: 0.25,
        pan,
        onEnd,
      }),
    );
    setMessage(label);
  };

  return (
    <DevicePanel title={t("headphone.title")} subtitle={t("headphone.subtitle")}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => playChannel(-1, "left", t("headphone.leftChannel"))}
          className={playing === "left" ? deviceButtonClass : deviceGhostButtonClass}
        >
          <Ear className="size-3.5" />
          {t("headphone.leftChannel")}
        </button>
        <button
          type="button"
          onClick={() => playChannel(1, "right", t("headphone.rightChannel"))}
          className={playing === "right" ? deviceButtonClass : deviceGhostButtonClass}
        >
          <Ear className="size-3.5" />
          {t("headphone.rightChannel")}
        </button>
        <button
          type="button"
          onClick={() => playChannel(0, "both", t("headphone.bothChannels"))}
          className={playing === "both" ? deviceButtonClass : deviceGhostButtonClass}
        >
          <Music4 className="size-3.5" />
          {t("headphone.bothChannels")}
        </button>
        <button
          type="button"
          onClick={() =>
            start("sweep", (onEnd) =>
              playSweep({ from: 20, to: 20000, duration: 10, volume: 0.2, onEnd }),
            )
          }
          className={playing === "sweep" ? deviceButtonClass : deviceGhostButtonClass}
        >
          <Waves className="size-3.5" />
          {t("headphone.sweep")}
        </button>
        <button type="button" onClick={stop} className={deviceGhostButtonClass}>
          {t("headphone.stop")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {message || t("headphone.ready")}
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
          <li>{t("headphone.stepLeft")}</li>
          <li>{t("headphone.stepRight")}</li>
          <li>{t("headphone.stepSweep")}</li>
        </ul>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("headphone.hint")}</p>
    </DevicePanel>
  );
}
