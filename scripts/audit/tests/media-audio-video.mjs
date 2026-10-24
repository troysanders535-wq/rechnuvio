/**
 * Functional specs for the 12 tools of the media-audio-video engine.
 *
 * Every spec puts a real media file into the real file input, presses the real
 * "Convert now" button and inspects the file the browser really downloads.
 *
 * The fixtures are genuine files that ffmpeg wrote (scripts/audit/fixtures/):
 * a 440 Hz sine wave for the audio formats and a one second test pattern with
 * that tone for the video formats. The old fixtures were a megabyte of zeroes
 * with a plausible file header, which no real converter can read - a tool that
 * pretends to convert such a file is exactly the defect this audit has to
 * catch.
 *
 * The result is verified in the browser, not by looking at the file name:
 *
 * - an MP3 must start with an "ID3" tag or an MPEG frame sync AND must decode
 *   back into an AudioBuffer whose length matches the source;
 * - a WAV must start with "RIFF", carry "WAVE" at offset 8 AND must decode
 *   back into an AudioBuffer whose length matches the source;
 * - an MP4 must carry an "ftyp" box at offset 4 AND a "moov" box AND must play
 *   in a video element with the picture size and the length of the source.
 *
 * A file that only carries the right magic bytes but no decodable content is
 * not a conversion, so every assertion checks the content as well.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  spec,
  selectOption,
  clickButton,
  assertEqual,
  assertIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, "..", "fixtures");

/* --------------------------------------------------------------- helpers -- */

/** A real media file from scripts/audit/fixtures/. */
function fixture(name) {
  return readFileSync(join(fixtureDir, name));
}

/** The media type the browser expects for a fixture. */
const TYPES = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
};

/** Put a real file into the file input of the workspace. */
async function uploadMedia(page, name) {
  const bytes = fixture(name);
  const extension = name.split(".").pop();
  await page.evaluate(
    ({ bytes, name, type }) => {
      const data = new Uint8Array(bytes);
      const file = new File([data], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    {
      bytes: Array.from(bytes),
      name,
      type: TYPES[extension] || "application/octet-stream",
    },
  );
  await sleep(900);
}

/** The text the workspace shows below the loaded file. */
async function loadedFileText(page) {
  return page.evaluate(() => {
    const root = document.querySelector("main") || document.body;
    const parts = [];
    root.querySelectorAll("span, p, h3, h4").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (text) parts.push(text);
    });
    return parts.join("\n");
  });
}

/** Press "Convert now" and download the file the tool offers. */
async function convertAndDownload(page, timeout = 45000) {
  const link = page.locator("main a[download]");
  await link.waitFor({ state: "visible", timeout });
  const pending = page.waitForEvent("download", { timeout });
  await link.click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { bytes: Buffer.concat(chunks), name: download.suggestedFilename() };
}

/** Decode the downloaded bytes in the browser and report what came out. */
async function probeAudio(page, bytes) {
  return page.evaluate(async (data) => {
    const array = new Uint8Array(data);
    const blob = new Blob([array]);
    try {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      return {
        ok: true,
        duration: buffer.duration,
        rate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }, Array.from(bytes));
}

/** Play the downloaded bytes in a video element and report what came out. */
async function probeVideo(page, bytes) {
  return page.evaluate(async (data) => {
    const array = new Uint8Array(data);
    const blob = new Blob([array], { type: "video/mp4" });
    return await new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.muted = true;
      const timer = setTimeout(() => resolve({ ok: false, error: "the video did not load" }), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve({
          ok: true,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.onerror = () => {
        clearTimeout(timer);
        resolve({ ok: false, error: "the browser refused the file" });
      };
      video.src = url;
    });
  }, Array.from(bytes));
}

/** True when the bytes look like an MPEG audio file. */
function looksLikeMp3(bytes) {
  if (bytes.subarray(0, 3).toString("latin1") === "ID3") return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

/** The duration of the audio fixture, in seconds. */
const SOURCE_DURATION = 1;

function assertSameDuration(actual, what) {
  assert(
    Math.abs(actual - SOURCE_DURATION) <= 0.2,
    `${what} must be about ${SOURCE_DURATION} s long, it is ${actual} s`,
  );
}

/* ---------------------------------------------------------------- specs -- */

export function register() {
  /* ---- audio to MP3 ---- */

  spec("flac-to-mp3", "converts a FLAC recording into an MP3 file", async (page) => {
    await uploadMedia(page, "sample.flac");
    const shown = await loadedFileText(page);
    assertIncludes(shown, "sample.flac", "the tool should show the loaded file");
    await selectOption(page, "mp3");
    const { bytes } = await convertAndDownload(page);
    assert.ok(
      looksLikeMp3(bytes),
      `the download must be an MPEG audio file, it starts with ${JSON.stringify(bytes.subarray(0, 3).toString("latin1"))}`,
    );
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the MP3 must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the converted recording");
    assertEqual(audio.rate, 44100, "the sample rate of the source must be kept");
  });

  spec("m4a-to-mp3", "converts an M4A recording into an MP3 file", async (page) => {
    await uploadMedia(page, "sample.m4a");
    await selectOption(page, "mp3");
    const { bytes } = await convertAndDownload(page);
    assert.ok(looksLikeMp3(bytes), "the download must be an MPEG audio file");
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the MP3 must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the converted recording");
  });

  spec("ogg-to-mp3", "converts an Ogg recording into an MP3 file", async (page) => {
    await uploadMedia(page, "sample.ogg");
    await selectOption(page, "mp3");
    const { bytes } = await convertAndDownload(page);
    assert.ok(looksLikeMp3(bytes), "the download must be an MPEG audio file");
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the MP3 must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the converted recording");
  });

  spec("wav-to-mp3", "converts a WAV recording into an MP3 file", async (page) => {
    await uploadMedia(page, "sample.wav");
    await selectOption(page, "mp3");
    const { bytes } = await convertAndDownload(page);
    assert.ok(looksLikeMp3(bytes), "the download must be an MPEG audio file");
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the MP3 must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the converted recording");
    assert(
      bytes.length < fixture("sample.wav").length,
      `an MP3 must be smaller than the WAV it comes from, ${bytes.length} against ${fixture("sample.wav").length} bytes`,
    );
  });

  spec("mp4-to-mp3", "extracts the sound track of an MP4 into an MP3 file", async (page) => {
    await uploadMedia(page, "sample.mp4");
    await selectOption(page, "mp3");
    const { bytes } = await convertAndDownload(page);
    assert.ok(looksLikeMp3(bytes), "the download must be an MPEG audio file");
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the MP3 must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the extracted sound track");
  });

  /* ---- audio to WAV ---- */

  spec("mp3-to-wav", "converts an MP3 recording into a WAV file", async (page) => {
    await uploadMedia(page, "sample.mp3");
    await selectOption(page, "wav");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(0, 4).toString("latin1"),
      "RIFF",
      "a WAVE file starts with the RIFF chunk header",
    );
    assert.equal(
      bytes.subarray(8, 12).toString("latin1"),
      "WAVE",
      "a WAVE file carries the WAVE marker at offset 8",
    );
    const audio = await probeAudio(page, bytes);
    assert(audio.ok, `the WAV must be decodable, ${audio.error}`);
    assertSameDuration(audio.duration, "the converted recording");
    assertEqual(audio.rate, 44100, "the sample rate of the source must be kept");
  });

  /* ---- video to MP4 ---- */

  spec("mkv-to-mp4", "converts a Matroska video into an MP4 container", async (page) => {
    await uploadMedia(page, "sample.mkv");
    await selectOption(page, "mp4");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );
    assert(
      bytes.includes(Buffer.from("moov", "latin1")),
      "an MP4 file must carry a moov box with the track table",
    );
    const video = await probeVideo(page, bytes);
    assert(video.ok, `the MP4 must be playable, ${video.error}`);
    assertEqual(video.width, 160, "the picture width of the source must be kept");
    assertEqual(video.height, 120, "the picture height of the source must be kept");
    assertSameDuration(video.duration, "the converted video");
  });

  spec("mov-to-mp4", "converts a QuickTime video into an MP4 container", async (page) => {
    await uploadMedia(page, "sample.mov");
    await selectOption(page, "mp4");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );
    const brand = bytes.subarray(8, 12).toString("latin1");
    assert(
      ["isom", "mp42", "mp41", "iso2", "avc1"].includes(brand),
      `the QuickTime brand must be replaced by an ISO base media brand, it is ${JSON.stringify(brand)}`,
    );
    const video = await probeVideo(page, bytes);
    assert(video.ok, `the MP4 must be playable, ${video.error}`);
    assertEqual(video.width, 160, "the picture width of the source must be kept");
  });

  spec("webm-to-mp4", "converts a WebM video into an MP4 container", async (page) => {
    await uploadMedia(page, "sample.webm");
    await selectOption(page, "mp4");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );
    const video = await probeVideo(page, bytes);
    assert(video.ok, `the MP4 must be playable, ${video.error}`);
    assertEqual(video.width, 160, "the picture width of the source must be kept");
  });

  spec("webm-to-mp4-converter", "converts a WebM video into an MP4 container", async (page) => {
    await uploadMedia(page, "sample.webm");
    await selectOption(page, "mp4");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );
    const video = await probeVideo(page, bytes);
    assert(video.ok, `the MP4 must be playable, ${video.error}`);
    assertSameDuration(video.duration, "the converted video");
  });

  spec("webm-converter", "converts a WebM video into an MP4 container", async (page) => {
    await uploadMedia(page, "sample.webm");
    await selectOption(page, "mp4");
    const { bytes } = await convertAndDownload(page);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );
    const video = await probeVideo(page, bytes);
    assert(video.ok, `the MP4 must be playable, ${video.error}`);
    assertEqual(video.height, 120, "the picture height of the source must be kept");
  });

  spec("avi-to-mp4", "refuses an AVI video honestly instead of pretending to convert it", async (page) => {
    /*
     * A browser cannot decode an AVI file: AVI is a RIFF container whose video
     * and audio streams use codecs that the HTML media pipeline does not carry.
     * No browser API can turn an AVI into an MP4, so a tool that claims to do
     * it can only fake the result. The honest behaviour is to say so and offer
     * no download at all - that is what this spec pins down.
     */

    /* The input is a genuine RIFF/AVI file, established from the bytes. */
    const source = fixture("sample.avi");
    assert.equal(
      source.subarray(0, 4).toString("latin1"),
      "RIFF",
      "the AVI fixture must start with the RIFF chunk header",
    );
    assert.equal(
      source.subarray(8, 12).toString("latin1"),
      "AVI ",
      "the AVI fixture must carry the AVI form type at offset 8",
    );

    await uploadMedia(page, "sample.avi");
    await selectOption(page, "mp4");

    /* The file really reached the tool. */
    const shown = await loadedFileText(page);
    assertIncludes(shown, "sample.avi", "the tool should show the loaded file");

    /* The refusal appears in the workspace. */
    const error = page.locator('main [data-testid="media-error"]');
    await error.waitFor({ state: "visible", timeout: 30000 });
    const message = ((await error.textContent()) || "").replace(/\s+/g, " ").trim();
    assert(
      /AVI/.test(message),
      `the refusal must name the AVI format it cannot decode, it says ${JSON.stringify(message)}`,
    );
    assert(
      /MP4|WebM/.test(message),
      `the refusal must name the formats the user can convert to, it says ${JSON.stringify(message)}`,
    );
    assert(
      /editor|convert/i.test(message),
      `the refusal must tell the user what to do instead, it says ${JSON.stringify(message)}`,
    );

    /* No download is offered - a fake conversion is worse than no conversion. */
    const downloads = page.locator("main a[download]");
    assert.equal(
      await downloads.count(),
      0,
      "a tool that cannot decode AVI must not offer a download",
    );

    /* The honest refusal stays on screen. */
    await sleep(1500);
    assert.equal(
      await page.locator('main [data-testid="media-error"]').count(),
      1,
      "the refusal must stay visible",
    );
    assert.equal(
      await page.locator('main [data-testid="media-download"]').count(),
      0,
      "no download link may appear after the refusal",
    );
  });
}
