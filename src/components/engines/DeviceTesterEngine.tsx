"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Video, Keyboard, Mouse } from "lucide-react";
import { useTranslations } from "next-intl";
import { MouseTest } from "./device/MouseTest";
import { DoubleClickTest } from "./device/DoubleClickTest";
import { DeadPixelTest } from "./device/DeadPixelTest";
import { GamepadTester } from "./device/GamepadTester";
import { HeadphoneTest } from "./device/HeadphoneTest";
import { RefreshRateTest } from "./device/RefreshRateTest";
import { SoundTest } from "./device/SoundTest";
import { StickDriftTest } from "./device/StickDriftTest";
import { ToneGenerator } from "./device/ToneGenerator";
import { MathKeyboard } from "./device/MathKeyboard";

interface DeviceTesterEngineProps {
  slug: string;
}

/* ------------------------------------------------------- the shared panels -- */

/** The microphone test of the family. */
function MicPanel() {
  const tUi = useTranslations("ui.engines.DeviceTesterEngine");
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  // The microphone is released when the panel goes away: a stream that keeps
  // running would leave the recording indicator of the operating system on.
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  const startMic = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      streamRef.current = stream;
      setMicActive(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        frameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // The browser refused the permission or there is no microphone. The
      // reason is shown in the page, in the language of the page.
      setError(tUi("microphoneUnavailable"));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Mic className="mx-auto size-12 text-sky-700 dark:text-sky-400" />
      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
        {tUi("microphoneInputDecibelTest")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {tUi("speakIntoYourMicrophoneToVerifyVolumeLevelsAndInputClarity")}
      </p>

      {!micActive ? (
        <button
          onClick={startMic}
          className="mt-6 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          {tUi("enableMicrophoneTest")}
        </button>
      ) : (
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{tUi("inputLevel")}</span>
            <span>{audioLevel}%</span>
          </div>
          <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-75"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {tUi("microphoneIsWorkingAudioSignalDetected")}
          </p>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          data-testid="device-permission-error"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The webcam test of the family. */
function WebcamPanel() {
  const tUi = useTranslations("ui.engines.DeviceTesterEngine");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startWebcam = async () => {
    setError(null);
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: true }));
    } catch {
      // The browser refused the permission or there is no camera. The reason
      // is shown in the page, in the language of the page.
      setError(tUi("cameraUnavailable"));
    }
  };

  // The video element only exists once the stream is there, so the stream is
  // attached in an effect. The camera is released when the panel goes away.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => {
      stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Video className="mx-auto size-12 text-sky-700 dark:text-sky-400" />
      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
        {tUi("webcamVideoTest")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {tUi("testCameraResolutionLatencyAndMirrorModeSafelyOnYourDevice")}
      </p>

      {!stream ? (
        <button
          onClick={startWebcam}
          className="mt-6 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          {tUi("startCameraTest")}
        </button>
      ) : (
        <div className="mt-6 flex flex-col items-center">
          <video
            ref={videoRef}
            data-testid="device-camera-preview"
            className="max-h-80 rounded-2xl border border-slate-300 shadow-md dark:border-slate-700"
          />
          <span className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {tUi("webcamIsOnlineAndStreamingLocally")}
          </span>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          data-testid="device-permission-error"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The keyboard test of the family. */
function KeyboardPanel() {
  const tUi = useTranslations("ui.engines.DeviceTesterEngine");
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => Array.from(new Set([...prev, e.code])));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Keyboard className="size-5 text-sky-700" />
        {tUi("keyboardGhostingKeyDetectionTest")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {tUi("pressAnyKeyOnYourKeyboardToTestResponsivenessAndDetectGhosting")}
      </p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-6 min-h-36">
        <div className="flex flex-wrap gap-2">
          {pressedKeys.length === 0 ? (
            <span className="text-xs text-slate-600">{tUi("pressAnyKeyOnYourKeyboard")}</span>
          ) : (
            pressedKeys.map((k) => (
              <span
                key={k}
                className="rounded-lg border border-sky-500 bg-sky-950/80 px-3 py-1 font-mono text-xs font-bold text-sky-300"
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setPressedKeys([])}
        className="mt-4 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
      >
        {tUi("resetKeyHistory")}
      </button>
    </div>
  );
}

/** The click speed test of the family. */
function CpsPanel() {
  const tUi = useTranslations("ui.engines.DeviceTesterEngine");
  const [cpsClicks, setCpsClicks] = useState(0);
  const [cpsStartTime, setCpsStartTime] = useState<number | null>(null);
  const [cpsScore, setCpsScore] = useState("0.0");

  const handleCpsClick = () => {
    if (!cpsStartTime) {
      setCpsStartTime(Date.now());
      setCpsClicks(1);
    } else {
      const elapsedSec = (Date.now() - cpsStartTime) / 1000;
      const newClicks = cpsClicks + 1;
      setCpsClicks(newClicks);
      if (elapsedSec > 0) {
        setCpsScore((newClicks / elapsedSec).toFixed(1));
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
        <Mouse className="size-5 text-sky-700" /> {tUi("mouseCPSClickSpeedTest")}
      </h3>

      <div className="my-6">
        <span className="font-mono text-5xl font-extrabold text-sky-800 dark:text-sky-300">
          {cpsScore} CPS
        </span>
        <p className="mt-1 text-xs text-slate-500">{tUi("clicks", { count: cpsClicks })}</p>
      </div>

      <button
        onClick={handleCpsClick}
        className="w-full max-w-md h-32 rounded-2xl bg-sky-800 text-white font-bold text-lg shadow-lg hover:bg-sky-700 active:scale-95 transition-transform"
      >
        {tUi("cLICKHERERAPIDLY")}
      </button>

      <div className="mt-4">
        <button
          onClick={() => {
            setCpsClicks(0);
            setCpsStartTime(null);
            setCpsScore("0.0");
          }}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
        >
          {tUi("resetScore")}
        </button>
      </div>
    </div>
  );
}

/** The panel of a tool that is not wired up. */
function DeviceToolFallback() {
  const t = useTranslations("ui.engines.device");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Mouse className="mx-auto size-10 text-sky-700" />
      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
        {t("fallback.title")}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fallback.body")}</p>
    </div>
  );
}

/* -------------------------------------------------------------- the dispatch -- */

/**
 * The workspace of every tool of the family.
 *
 * The map holds one entry per slug, so a tool always renders the workspace
 * that belongs to it.
 */
const VIEW_BY_SLUG: Record<string, React.ComponentType<{ slug?: string }>> = {
  "mic-test": MicPanel,
  "webcam-test": WebcamPanel,
  "keyboard-test": KeyboardPanel,
  "cps-test": CpsPanel,
  "mouse-test": MouseTest,
  "double-click-test": DoubleClickTest,
  "dead-pixel-test": DeadPixelTest,
  "gamepad-tester": GamepadTester,
  "headphone-test": HeadphoneTest,
  "refresh-rate-test": RefreshRateTest,
  "sound-test": SoundTest,
  "stick-drift-test": StickDriftTest,
  "tone-generator": ToneGenerator,
  "math-keyboard": MathKeyboard,
};

export function DeviceTesterEngine({ slug }: DeviceTesterEngineProps) {
  const View = VIEW_BY_SLUG[slug];
  if (!View) {
    return <DeviceToolFallback />;
  }
  return <View slug={slug} />;
}
