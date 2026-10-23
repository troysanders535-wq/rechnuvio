"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Video, Keyboard, Gamepad, Mouse, Monitor, Sparkles } from "lucide-react";

interface DeviceTesterEngineProps {
  slug: string;
}

export function DeviceTesterEngine({ slug }: DeviceTesterEngineProps) {
  const isMic = slug.includes("mic");
  const isWebcam = slug.includes("webcam");
  const isKeyboard = slug.includes("keyboard");
  const isGamepad = slug.includes("gamepad") || slug.includes("drift");
  const isMouse = slug.includes("mouse") || slug.includes("cps") || slug.includes("click");

  // Mic state
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Webcam state
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keyboard state
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  // Mouse CPS state
  const [cpsClicks, setCpsClicks] = useState(0);
  const [cpsStartTime, setCpsStartTime] = useState<number | null>(null);
  const [cpsScore, setCpsScore] = useState("0.0");

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      setMicActive(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e: any) {
      alert(`Could not access microphone: ${e.message}`);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setWebcamActive(true);
      }
    } catch (e: any) {
      alert(`Could not access webcam: ${e.message}`);
    }
  };

  useEffect(() => {
    if (isKeyboard) {
      const handleKeyDown = (e: KeyboardEvent) => {
        setPressedKeys((prev) => Array.from(new Set([...prev, e.code])));
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isKeyboard]);

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

  if (isMic) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Mic className="mx-auto size-12 text-sky-700 dark:text-sky-400" />
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Microphone Input & Decibel Test
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Speak into your microphone to verify volume levels and input clarity.
        </p>

        {!micActive ? (
          <button
            onClick={startMic}
            className="mt-6 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Enable Microphone Test
          </button>
        ) : (
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Input Level</span>
              <span>{audioLevel}%</span>
            </div>
            <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Microphone is working! Audio signal detected.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isWebcam) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Video className="mx-auto size-12 text-sky-700 dark:text-sky-400" />
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Webcam Video Test
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Test camera resolution, latency, and mirror mode safely on your device.
        </p>

        {!webcamActive ? (
          <button
            onClick={startWebcam}
            className="mt-6 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Start Camera Test
          </button>
        ) : (
          <div className="mt-6 flex flex-col items-center">
            <video
              ref={videoRef}
              className="max-h-80 rounded-2xl border border-slate-300 shadow-md dark:border-slate-700"
            />
            <span className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Webcam is online and streaming locally.
            </span>
          </div>
        )}
      </div>
    );
  }

  if (isKeyboard) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Keyboard className="size-5 text-sky-700" />
          Keyboard Ghosting & Key Detection Test
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Press any key on your keyboard to test responsiveness and detect ghosting.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-6 min-h-36">
          <div className="flex flex-wrap gap-2">
            {pressedKeys.length === 0 ? (
              <span className="text-xs text-slate-600">Press any key on your keyboard...</span>
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
          Reset Key History
        </button>
      </div>
    );
  }

  // Mouse CPS
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
        <Mouse className="size-5 text-sky-700" /> Mouse CPS & Click Speed Test
      </h3>

      <div className="my-6">
        <span className="font-mono text-5xl font-extrabold text-sky-800 dark:text-sky-300">
          {cpsScore} CPS
        </span>
        <p className="mt-1 text-xs text-slate-500">Clicks: {cpsClicks}</p>
      </div>

      <button
        onClick={handleCpsClick}
        className="w-full max-w-md h-32 rounded-2xl bg-sky-800 text-white font-bold text-lg shadow-lg hover:bg-sky-700 active:scale-95 transition-transform"
      >
        CLICK HERE RAPIDLY!
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
          Reset Score
        </button>
      </div>
    </div>
  );
}
