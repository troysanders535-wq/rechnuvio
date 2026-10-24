"use client";

/**
 * The workspace of the media tools.
 *
 * The user picks a file, picks a target format and presses "Convert now".
 * The file is really converted in the browser: the audio path decodes the
 * source with the Web Audio API and writes the target itself, the video path
 * records the decoded picture with MediaRecorder. When the browser cannot
 * read the source or cannot write the target, the workspace says so and
 * offers no download at all.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Music,
  Upload,
  Video,
} from "lucide-react";
import {
  MediaConversionError,
  convertFile,
  formatBytes,
  type ConversionOutput,
  type MediaFailure,
  type MediaTarget,
} from "./converters";

/** The target format every media tool writes. */
const TARGET_BY_SLUG: Record<string, MediaTarget> = {
  "flac-to-mp3": "mp3",
  "m4a-to-mp3": "mp3",
  "ogg-to-mp3": "mp3",
  "wav-to-mp3": "mp3",
  "mp4-to-mp3": "mp3",
  "mp3-to-wav": "wav",
  "avi-to-mp4": "mp4",
  "mkv-to-mp4": "mp4",
  "mov-to-mp4": "mp4",
  "webm-to-mp4": "mp4",
  "webm-to-mp4-converter": "mp4",
  "webm-converter": "mp4",
};

const TARGETS: MediaTarget[] = ["mp3", "mp4", "wav", "webm", "gif"];

export function MediaConverterWorkspace({ slug }: { slug: string }) {
  const t = useTranslations("ui.engines.media");

  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<MediaTarget>(TARGET_BY_SLUG[slug] ?? "mp4");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<ConversionOutput | null>(null);
  const [failure, setFailure] = useState<MediaFailure | null>(null);
  const [detail, setDetail] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const runId = useRef(0);

  /* The download link points at a blob URL of the converted file. */
  useEffect(() => {
    if (!output) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(output.blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setOutput(null);
    setFailure(null);
    setDetail("");
    event.target.value = "";
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setOutput(null);
    setFailure(null);
    setDetail("");
  }, []);

  /**
   * Run one conversion.
   *
   * The run number keeps a slow conversion from overwriting the result of a
   * newer one: when the target format changes while a conversion is running,
   * only the newer result is shown.
   */
  const start = useCallback((source: File, format: MediaTarget) => {
    const run = runId.current + 1;
    runId.current = run;
    setBusy(true);
    setOutput(null);
    setFailure(null);
    setDetail("");
    void (async () => {
      try {
        const result = await convertFile(source, format);
        if (runId.current !== run) return;
        setOutput(result);
      } catch (error) {
        if (runId.current !== run) return;
        if (error instanceof MediaConversionError) {
          setFailure(error.failure);
          setDetail(error.message);
        } else {
          setFailure("unknown");
          setDetail(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (runId.current === run) setBusy(false);
      }
    })();
  }, []);

  /**
   * The conversion starts as soon as there is a file to convert, and again
   * whenever the target format changes. The button repeats the conversion.
   */
  useEffect(() => {
    if (!file) return;
    start(file, target);
  }, [file, start, target]);

  const handleConvert = useCallback(() => {
    if (!file) return;
    start(file, target);
  }, [file, start, target]);

  const failureMessage = useMemo(() => {
    switch (failure) {
      case "cannot-decode-avi":
        return t("errorCannotDecodeAvi");
      case "cannot-decode-file":
        return t("errorCannotDecodeFile");
      case "no-video-track":
        return t("errorNoVideoTrack");
      case "no-mp4-writer":
        return t("errorNoMp4Writer");
      case "no-webm-writer":
        return t("errorNoWebmWriter");
      case "gif-unsupported":
        return t("errorGifUnsupported");
      case "unknown":
        return t("errorUnknown", { reason: detail || failure });
      default:
        return null;
    }
  }, [detail, failure, t]);

  const targetLabel = (value: MediaTarget): string => {
    switch (value) {
      case "mp3":
        return t("formatMp3");
      case "mp4":
        return t("formatMp4");
      case "wav":
        return t("formatWav");
      case "webm":
        return t("formatWebm");
      case "gif":
        return t("formatGif");
      default:
        return value;
    }
  };

  const isVideoTarget = target === "mp4" || target === "webm" || target === "gif";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            {isVideoTarget ? (
              <Video className="size-5 text-sky-700 dark:text-sky-400" />
            ) : (
              <Music className="size-5 text-sky-700 dark:text-sky-400" />
            )}
            {t("workspaceTitle")}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("workspaceSubtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/60">
          <Upload className="mx-auto size-8 text-sky-700 dark:text-sky-400" />
          <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t("filePickerLabel")}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("filePickerHint")}
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700">
            <Upload className="size-4" />
            <span>{t("filePickerLabel")}</span>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>

        {file ? (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("loadedFile")}
            </span>
            <p className="text-sm font-bold break-all text-slate-900 dark:text-white">
              {file.name}
            </p>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("convertTo")}
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as MediaTarget)}
              className="mt-1.5 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {TARGETS.map((value) => (
                <option key={value} value={value}>
                  {targetLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleConvert}
            disabled={!file || busy}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" />
            {busy ? t("converting") : t("convertNow")}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {t("clear")}
          </button>
        </div>

        {failureMessage ? (
          <p
            data-testid="media-error"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{failureMessage}</span>
          </p>
        ) : null}

        {output && downloadUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              {t("conversionComplete")}
            </span>
            <a
              href={downloadUrl}
              download={`converted.${output.extension}`}
              data-testid="media-download"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Download className="size-3.5" />
              <span>{t("downloadResult")}</span>
            </a>
          </div>
        ) : null}

        {output?.warning === "mp4-fallback" ? (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{t("mp4FallbackWarning")}</span>
          </p>
        ) : null}

        <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{t("localNote")}</span>
        </p>
      </div>
    </div>
  );
}
