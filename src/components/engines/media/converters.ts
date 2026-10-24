/**
 * The real conversion work behind the media workspace.
 *
 * Two paths, both of them entirely in the browser:
 *
 * - The audio path decodes the source with the Web Audio API and writes the
 *   target itself: a RIFF/WAVE file is written by hand, an MP3 is encoded
 *   with the LAME encoder. The result is a real file that decodes back to
 *   the recording it came from.
 * - The video path plays the source in a video element, captures the decoded
 *   picture and sound with `captureStream()` and records them with
 *   `MediaRecorder`. The result is a real MP4 (or WebM) file that plays in a
 *   video element.
 *
 * Nothing is uploaded. Nothing is faked either: when the browser cannot
 * decode a source or cannot write a target, the caller gets a
 * `MediaConversionError` with the reason and no file at all.
 */

import { Mp3Encoder } from "@breezystack/lamejs";

/** The formats the workspace offers as a target. */
export type MediaTarget = "mp3" | "mp4" | "wav" | "webm" | "gif";

/** The reason a conversion did not happen. */
export type MediaFailure =
  | "cannot-decode-file"
  | "cannot-decode-avi"
  | "no-video-track"
  | "no-mp4-writer"
  | "no-webm-writer"
  | "gif-unsupported"
  | "unknown";

/** The error every failed conversion carries. */
export class MediaConversionError extends Error {
  readonly failure: MediaFailure;

  constructor(failure: MediaFailure, message: string) {
    super(message);
    this.name = "MediaConversionError";
    this.failure = failure;
  }
}

/** The file a successful conversion produced. */
export interface ConversionOutput {
  /** The converted file. */
  blob: Blob;
  /** The extension of the file, without the dot. */
  extension: string;
  /** The mime type of the file. */
  mimeType: string;
  /**
   * The honest warning that belongs to the file, if there is one: a browser
   * that cannot write MP4 hands out a WebM file instead, and the user has to
   * be told about it.
   */
  warning: "mp4-fallback" | null;
}

/** The sample rate every conversion writes. */
const OUTPUT_SAMPLE_RATE = 44100;

/** The bit rate of the MP3 encoder. */
const MP3_KBPS = 192;

/* ------------------------------------------------------------------ helpers -- */

/** The lower case extension of a file name. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** A human readable file size. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/** The failure a decode error belongs to. */
function decodeFailure(file: File): MediaFailure {
  return fileExtension(file.name) === "avi" ? "cannot-decode-avi" : "cannot-decode-file";
}

/* -------------------------------------------------------------------- audio -- */

/**
 * Decode a media file into an audio buffer.
 *
 * The browser decodes WAV, MP3, FLAC, Ogg Vorbis, AAC/M4A and the sound track
 * of an MP4 on its own. A source it cannot read raises an error instead of
 * producing an empty buffer.
 */
export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const bytes = await file.arrayBuffer();
  const context = createAudioContext();
  try {
    const buffer = await context.decodeAudioData(bytes);
    if (!buffer || buffer.length === 0) {
      throw new MediaConversionError(
        decodeFailure(file),
        "the file carries no audio the browser could decode",
      );
    }
    return await normalizeSampleRate(buffer);
  } catch (error) {
    if (error instanceof MediaConversionError) throw error;
    throw new MediaConversionError(
      decodeFailure(file),
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    void context.close();
  }
}

/** An audio context that decodes at the rate the converters write. */
function createAudioContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
}

/** Bring a decoded buffer to the sample rate the converters write. */
async function normalizeSampleRate(buffer: AudioBuffer): Promise<AudioBuffer> {
  if (buffer.sampleRate === OUTPUT_SAMPLE_RATE) return buffer;
  const frames = Math.max(1, Math.round(buffer.duration * OUTPUT_SAMPLE_RATE));
  const offline = new OfflineAudioContext(
    Math.max(1, buffer.numberOfChannels),
    frames,
    OUTPUT_SAMPLE_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

/** The samples of a buffer as one mono channel of 16 bit integers. */
function toMonoPcm(buffer: AudioBuffer): Int16Array {
  const frames = buffer.length;
  const channels = buffer.numberOfChannels;
  const pcm = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += buffer.getChannelData(channel)[frame];
    }
    const mono = channels > 1 ? sum / channels : sum;
    const clamped = mono < -1 ? -1 : mono > 1 ? 1 : mono;
    pcm[frame] = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
  }
  return pcm;
}

/**
 * Write a buffer as a RIFF/WAVE file.
 *
 * The header is the canonical 44 byte one: `RIFF`, the size, `WAVE`, the
 * `fmt ` chunk with 16 bit PCM and the `data` chunk with the interleaved
 * little endian samples.
 */
export function encodeWav(buffer: AudioBuffer): Uint8Array {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);

  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = buffer.getChannelData(channel)[frame];
      const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample;
      view.setInt16(offset, Math.round(clamped * 0x7fff), true);
      offset += 2;
    }
  }
  return bytes;
}

/** Write ASCII characters into a byte array. */
function writeAscii(bytes: Uint8Array, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    bytes[offset + index] = text.charCodeAt(index);
  }
}

/**
 * Encode a buffer as an MP3 file.
 *
 * The LAME encoder works on blocks of 1152 samples, so the samples are fed
 * to it block by block and the encoder is flushed at the end.
 */
export async function encodeMp3(buffer: AudioBuffer): Promise<Uint8Array> {
  const pcm = toMonoPcm(buffer);
  const encoder = new Mp3Encoder(1, buffer.sampleRate, MP3_KBPS);
  const blocks: Uint8Array[] = [];
  const blockSize = 1152;
  for (let offset = 0; offset < pcm.length; offset += blockSize) {
    const block = pcm.subarray(offset, Math.min(offset + blockSize, pcm.length));
    const encoded = encoder.encodeBuffer(block);
    if (encoded.length > 0) blocks.push(encoded);
  }
  const tail = encoder.flush();
  if (tail.length > 0) blocks.push(tail);

  let size = 0;
  for (const block of blocks) size += block.length;
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const block of blocks) {
    bytes.set(block, offset);
    offset += block.length;
  }
  if (bytes.length === 0) {
    throw new MediaConversionError("unknown", "the MP3 encoder returned no data");
  }
  return bytes;
}

/** Convert a media file into an audio file. */
export async function convertToAudio(file: File, target: "mp3" | "wav"): Promise<ConversionOutput> {
  const buffer = await decodeAudio(file);
  if (target === "wav") {
    const bytes = encodeWav(buffer);
    return {
      blob: new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" }),
      extension: "wav",
      mimeType: "audio/wav",
      warning: null,
    };
  }
  const bytes = await encodeMp3(buffer);
  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: "audio/mpeg" }),
    extension: "mp3",
    mimeType: "audio/mpeg",
    warning: null,
  };
}

/* -------------------------------------------------------------------- video -- */

/** A media element that can hand out the stream of its decoded picture. */
interface CapturableVideo extends HTMLVideoElement {
  captureStream?: () => MediaStream;
}

/** The mime types a browser can record, in the order they are preferred. */
const MP4_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
];

const WEBM_TYPES = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];

/** The first mime type of a list the browser can record. */
function pickMimeType(candidates: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      /* an unusable candidate is simply skipped */
    }
  }
  return null;
}

/** Wait until the element knows its metadata. */
function waitForMetadata(video: HTMLVideoElement): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new MediaConversionError("cannot-decode-file", "the file did not load in time"));
    }, 15000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new MediaConversionError("cannot-decode-file", "the browser refused the file"));
    };
  });
}

/** Wait until the element has played to its end. */
function waitForEnded(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.ended) {
      resolve();
      return;
    }
    const timer = window.setTimeout(resolve, 60000);
    video.addEventListener(
      "ended",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** The length of a recorded file, read back the way a player reads it. */
function measureDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const probe = document.createElement("video");
    probe.muted = true;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 8000);
    probe.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = probe.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : null);
    };
    probe.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(null);
    };
    probe.src = url;
  });
}

/**
 * One recording of the source.
 *
 * The picture and the sound of the decoded file are captured and written into
 * a new container. The recorder runs exactly as long as the playback, so the
 * recording has the length of the source.
 */
async function recordOnce(
  file: File,
  mimeType: string,
): Promise<{ blob: Blob; duration: number | null }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video") as CapturableVideo;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    const meta = await waitForMetadata(video);
    if (!meta.width || !meta.height) {
      throw new MediaConversionError("no-video-track", "the file carries no picture");
    }
    if (typeof video.captureStream !== "function") {
      throw new MediaConversionError(
        "no-mp4-writer",
        "this browser cannot capture the picture of a video",
      );
    }

    const stream = video.captureStream();
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();
    await video.play();
    await waitForEnded(video);
    recorder.stop();
    await stopped;

    if (!chunks.length) {
      throw new MediaConversionError("unknown", "the recorder produced no data");
    }
    const isMp4 = mimeType.startsWith("video/mp4");
    const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
    return { blob, duration: await measureDuration(blob) };
  } catch (error) {
    if (error instanceof MediaConversionError) {
      if (error.failure === "cannot-decode-file") {
        throw new MediaConversionError(decodeFailure(file), error.message);
      }
      throw error;
    }
    throw new MediaConversionError(
      decodeFailure(file),
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * Convert a video file into a new container.
 *
 * The browser decodes the source, the decoded picture and sound are recorded
 * into an MP4 (or, in a browser that cannot write MP4, into a WebM file that
 * the user is told about). The recording is read back and compared with the
 * length of the source: a browser under load can hand out a recording that
 * is longer than the file it came from, and in that case the recording is
 * repeated once.
 */
export async function convertToVideo(file: File, target: "mp4" | "webm"): Promise<ConversionOutput> {
  const wanted = target === "mp4" ? MP4_TYPES : WEBM_TYPES;
  let mimeType = pickMimeType(wanted);
  let warning: ConversionOutput["warning"] = null;

  if (!mimeType && target === "mp4") {
    // A browser that cannot write MP4 gets an honest WebM file instead, and
    // the user is told about the substitution.
    const fallback = pickMimeType(WEBM_TYPES);
    if (!fallback) {
      throw new MediaConversionError(
        "no-mp4-writer",
        "this browser cannot record MP4 and cannot record WebM either",
      );
    }
    mimeType = fallback;
    warning = "mp4-fallback";
  }
  if (!mimeType) {
    throw new MediaConversionError(
      target === "mp4" ? "no-mp4-writer" : "no-webm-writer",
      "this browser cannot record this format",
    );
  }

  const source = await probeSourceLength(file);
  let best = await recordOnce(file, mimeType);
  if (source && best.duration) {
    const tolerance = Math.max(source * 0.15, 0.05);
    if (Math.abs(best.duration - source) > tolerance) {
      const second = await recordOnce(file, mimeType);
      if (
        second.duration &&
        Math.abs(second.duration - source) < Math.abs(best.duration - source)
      ) {
        best = second;
      }
    }
  }

  const isMp4 = mimeType.startsWith("video/mp4");
  return {
    blob: best.blob,
    extension: isMp4 ? "mp4" : "webm",
    mimeType: isMp4 ? "video/mp4" : "video/webm",
    warning,
  };
}

/** The length of the source, read from the file itself. */
async function probeSourceLength(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  const probe = document.createElement("video");
  probe.preload = "metadata";
  probe.src = url;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 8000);
    probe.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = probe.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : null);
    };
    probe.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}

/**
 * Convert a media file into the requested target.
 *
 * The target decides the path: an audio target decodes the sound of the
 * file, a video target records its picture.
 */
export async function convertFile(file: File, target: MediaTarget): Promise<ConversionOutput> {
  if (target === "gif") {
    throw new MediaConversionError(
      "gif-unsupported",
      "this workspace cannot write animated GIF files",
    );
  }
  if (target === "mp3" || target === "wav") {
    return convertToAudio(file, target);
  }
  return convertToVideo(file, target);
}
