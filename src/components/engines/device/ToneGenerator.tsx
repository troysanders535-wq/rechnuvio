"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleStop, Play, Volume2 } from "lucide-react";
import {
  DevicePanel,
  deviceButtonClass,
  deviceFieldLabelClass,
  deviceGhostButtonClass,
  deviceInputClass,
  deviceSelectClass,
} from "./kit";
import { playTone, WAVEFORMS, type Tone } from "./audio";

/**
 * The generator of a tone.
 *
 * The panel generates a tone of the chosen frequency, waveform and duration
 * with the Web Audio API.
 */
export function ToneGenerator() {
  const t = useTranslations("ui.engines.device");
  const toneRef = useRef<Tone | null>(null);

  const [frequency, setFrequency] = useState(440);
  const [waveform, setWaveform] = useState<OscillatorType>("sine");
  const [duration, setDuration] = useState(5);
  const [volume, setVolume] = useState(30);
  const [playing, setPlaying] = useState(false);

  const stop = () => {
    toneRef.current?.stop();
    toneRef.current = null;
    setPlaying(false);
  };

  const play = () => {
    stop();
    const tone = playTone({
      frequency: Math.max(20, Math.min(20000, frequency)),
      duration: Math.max(0.5, Math.min(60, duration)),
      volume: Math.max(0, Math.min(1, volume / 100)) * 0.5,
      type: waveform,
      onEnd: () => {
        toneRef.current = null;
        setPlaying(false);
      },
    });
    if (!tone) {
      setPlaying(false);
      return;
    }
    toneRef.current = tone;
    setPlaying(true);
  };

  return (
    <DevicePanel title={t("tone.title")} subtitle={t("tone.subtitle")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={deviceFieldLabelClass} htmlFor="tone-frequency">
            {t("tone.frequency")}
          </label>
          <input
            id="tone-frequency"
            type="number"
            min={20}
            max={20000}
            step={1}
            value={frequency}
            onChange={(event) => setFrequency(parseInt(event.target.value, 10) || 440)}
            className={deviceInputClass}
          />
        </div>
        <div>
          <label className={deviceFieldLabelClass} htmlFor="tone-waveform">
            {t("tone.waveform")}
          </label>
          <select
            id="tone-waveform"
            value={waveform}
            onChange={(event) => setWaveform(event.target.value as OscillatorType)}
            className={deviceSelectClass}
          >
            {WAVEFORMS.map((wave) => (
              <option key={wave} value={wave}>
                {t(`tone.waveforms.${wave}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={deviceFieldLabelClass} htmlFor="tone-duration">
            {t("tone.duration")}
          </label>
          <input
            id="tone-duration"
            type="number"
            min={1}
            max={60}
            step={1}
            value={duration}
            onChange={(event) => setDuration(parseInt(event.target.value, 10) || 5)}
            className={deviceInputClass}
          />
        </div>
        <div>
          <label className={deviceFieldLabelClass} htmlFor="tone-volume">
            {t("tone.volume")} {volume} %
          </label>
          <input
            id="tone-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(event) => setVolume(parseInt(event.target.value, 10) || 0)}
            className="mt-3 w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={play} className={deviceButtonClass}>
          <Play className="size-3.5" />
          {playing ? t("tone.playing") : t("tone.play")}
        </button>
        <button type="button" onClick={stop} className={deviceGhostButtonClass}>
          <CircleStop className="size-3.5" />
          {t("tone.stop")}
        </button>
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Volume2 className="size-4" />
        {t("tone.hint")}
      </p>
    </DevicePanel>
  );
}
