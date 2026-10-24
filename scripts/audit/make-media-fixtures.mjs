/**
 * Build the real media fixtures of the functional specs.
 *
 * The media specs used to hand the tool a file of zeroes with a plausible file
 * header. A real converter cannot read such a file, and a tool that pretends
 * otherwise is exactly the defect the audit has to catch.
 *
 * This script writes genuine media files into scripts/audit/fixtures/ with
 * ffmpeg: a 440 Hz sine wave for the audio formats and a short test pattern
 * with that tone for the video formats.
 *
 * Usage: node scripts/audit/make-media-fixtures.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "fixtures");

const TONE = "sine=frequency=440:duration=1:sample_rate=44100";
const PICTURE = "testsrc=size=160x120:rate=25:duration=1";

/** The audio fixtures: one second of a 440 Hz sine wave. */
const AUDIO = [
  { file: "sample.wav", codec: ["-c:a", "pcm_s16le"] },
  { file: "sample.mp3", codec: ["-c:a", "libmp3lame", "-b:a", "128k"] },
  { file: "sample.flac", codec: ["-c:a", "flac"] },
  { file: "sample.ogg", codec: ["-c:a", "libvorbis"] },
  { file: "sample.m4a", codec: ["-c:a", "aac", "-b:a", "128k"] },
];

/** The video fixtures: one second of a test pattern with the tone. */
const VIDEO = [
  { file: "sample.mp4", codec: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] },
  { file: "sample.webm", codec: ["-c:v", "libvpx", "-b:v", "200k", "-c:a", "libvorbis"] },
  { file: "sample.mkv", codec: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] },
  { file: "sample.mov", codec: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] },
  { file: "sample.avi", codec: ["-c:v", "mpeg4", "-c:a", "libmp3lame", "-b:a", "128k"] },
];

function run(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "ignore", "pipe"],
  });
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const item of AUDIO) {
  const out = join(outDir, item.file);
  run(["-f", "lavfi", "-i", TONE, ...item.codec, out]);
  console.log(`${item.file.padEnd(14)} ${(statSync(out).size / 1024).toFixed(1)} kB`);
}

for (const item of VIDEO) {
  const out = join(outDir, item.file);
  run([
    "-f",
    "lavfi",
    "-i",
    PICTURE,
    "-f",
    "lavfi",
    "-i",
    TONE,
    "-shortest",
    ...item.codec,
    out,
  ]);
  console.log(`${item.file.padEnd(14)} ${(statSync(out).size / 1024).toFixed(1)} kB`);
}

console.log(`\nThe fixtures are written to ${outDir}.`);
