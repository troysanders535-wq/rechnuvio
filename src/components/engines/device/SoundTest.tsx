"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AudioLines, Speaker, Square } from "lucide-react";
import { DevicePanel, deviceGhostButtonClass } from "./kit";
import { createAudioContext } from "./audio";

const FREQUENCIES = [125, 440, 1000, 4000, 8000];

/**
 * The test of the speakers.
 *
 * The panel plays the test frequencies of the audio range and shows the level
 * of the output while a sound is playing.
 */
export function SoundTest() {
  const t = useTranslations("ui.engines.device");
  const frameRef = useRef<number | null>(null);
  const [level, setLevel] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const stop = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setLevel(0);
    setPlaying(null);
  };

  useEffect(() => stop, []);

  const playFrequency = (frequency: number, pan: number, key: string) => {
    stop();
    const context = createAudioContext();
    if (!context) {
      setMessage(t("sound.noAudio"));
      return;
    }

    try {
      if (context.state === "suspended") {
        context.resume().catch(() => undefined);
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const analyser = context.createAnalyser();
      const panner = context.createStereoPanner
        ? context.createStereoPanner()
        : null;

      analyser.fftSize = 256;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.03);
      gain.gain.setValueAtTime(0.3, context.currentTime + 2);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 2.2);

      if (panner) {
        panner.pan.value = pan;
        oscillator.connect(gain);
        gain.connect(panner);
        panner.connect(analyser);
      } else {
        oscillator.connect(gain);
        gain.connect(analyser);
      }
      analyser.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 2.3);

      const data = new Uint8Array(analyser.fftSize);
      const read = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let index = 0; index < data.length; index += 1) {
          const value = Math.abs(data[index] - 128) / 128;
          if (value > peak) peak = value;
        }
        setLevel(Math.round(Math.min(1, peak) * 100));
        frameRef.current = window.requestAnimationFrame(read);
      };
      frameRef.current = window.requestAnimationFrame(read);

      window.setTimeout(() => {
        stop();
        try {
          void context.close();
        } catch {
          /* the context has already been closed */
        }
      }, 2400);

      setPlaying(key);
      setMessage(t("sound.playingFrequency", { frequency }));
    } catch {
      setMessage(t("sound.noAudio"));
    }
  };

  return (
    <DevicePanel title={t("sound.title")} subtitle={t("sound.subtitle")}>
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map((frequency) => (
          <button
            key={frequency}
            type="button"
            onClick={() => playFrequency(frequency, 0, `tone-${frequency}`)}
            className={deviceGhostButtonClass}
          >
            <AudioLines className="size-3.5" />
            {frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => playFrequency(1000, -1, "left")}
          className={deviceGhostButtonClass}
        >
          <Speaker className="size-3.5" />
          {t("sound.leftSpeaker")}
        </button>
        <button
          type="button"
          onClick={() => playFrequency(1000, 1, "right")}
          className={deviceGhostButtonClass}
        >
          <Speaker className="size-3.5" />
          {t("sound.rightSpeaker")}
        </button>
        <button type="button" onClick={stop} className={deviceGhostButtonClass}>
          <Square className="size-3.5" />
          {t("sound.stop")}
        </button>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("sound.levelMeter")}
        </p>
        <div className="mt-2 h-6 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-75"
            style={{ width: `${level}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">{level} %</p>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {message || t("sound.ready")}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("sound.hint")}</p>
    </DevicePanel>
  );
}
