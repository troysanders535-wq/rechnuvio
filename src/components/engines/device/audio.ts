"use client";

/**
 * The audio helpers of the device tester.
 *
 * The Web Audio API is a browser API, so every sound is generated in the
 * browser itself and nothing is sent anywhere.
 */

type AudioContextConstructor = new () => AudioContext;

/** A new audio context, or null when the browser has no Web Audio support. */
export function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Constructor = scope.AudioContext || scope.webkitAudioContext;
  if (!Constructor) return null;
  try {
    return new Constructor();
  } catch {
    return null;
  }
}

/** The waveform types the generators offer. */
export const WAVEFORMS: OscillatorType[] = ["sine", "square", "sawtooth", "triangle"];

/** A tone that can be played, stopped and panned to one channel. */
export interface Tone {
  context: AudioContext;
  oscillator: OscillatorNode;
  gain: GainNode;
  stop: () => void;
}

/** Play a tone of a frequency in one channel. */
export function playTone(options: {
  frequency: number;
  duration: number;
  volume?: number;
  pan?: number;
  type?: OscillatorType;
  onEnd?: () => void;
}): Tone | null {
  const context = createAudioContext();
  if (!context) return null;

  try {
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner
      ? context.createStereoPanner()
      : null;

    oscillator.type = options.type || "sine";
    oscillator.frequency.value = options.frequency;

    const peak = options.volume ?? 0.25;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), context.currentTime + 0.02);
    gain.gain.setValueAtTime(Math.max(0.0001, peak), context.currentTime + options.duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + options.duration + 0.08);

    if (panner) {
      panner.pan.value = options.pan ?? 0;
      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(context.destination);
    } else {
      oscillator.connect(gain);
      gain.connect(context.destination);
    }

    oscillator.start();
    oscillator.stop(context.currentTime + options.duration + 0.12);

    const stop = () => {
      try {
        oscillator.stop();
      } catch {
        /* the tone has already ended */
      }
      try {
        void context.close();
      } catch {
        /* the context has already been closed */
      }
    };

    if (options.onEnd) {
      window.setTimeout(options.onEnd, options.duration * 1000 + 150);
    }

    return { context, oscillator, gain, stop };
  } catch {
    return null;
  }
}

/** A sine sweep from one frequency to another. */
export function playSweep(options: {
  from: number;
  to: number;
  duration: number;
  volume?: number;
  onEnd?: () => void;
}): Tone | null {
  const context = createAudioContext();
  if (!context) return null;

  try {
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const peak = options.volume ?? 0.2;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(options.from, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(options.to, context.currentTime + options.duration);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), context.currentTime + 0.05);
    gain.gain.setValueAtTime(Math.max(0.0001, peak), context.currentTime + options.duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + options.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + options.duration + 0.05);

    const stop = () => {
      try {
        oscillator.stop();
      } catch {
        /* the sweep has already ended */
      }
      try {
        void context.close();
      } catch {
        /* the context has already been closed */
      }
    };

    if (options.onEnd) {
      window.setTimeout(options.onEnd, options.duration * 1000 + 150);
    }

    return { context, oscillator, gain, stop };
  } catch {
    return null;
  }
}
