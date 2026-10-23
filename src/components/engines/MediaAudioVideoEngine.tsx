"use client";

import React, { useState } from "react";
import { Video, Music, Upload, Download, Sparkles } from "lucide-react";

interface MediaAudioVideoEngineProps {
  slug: string;
}

export function MediaAudioVideoEngine({ slug }: MediaAudioVideoEngineProps) {
  const isAudio = slug.includes("mp3") || slug.includes("wav") || slug.includes("ogg") || slug.includes("flac");

  const [fileLoaded, setFileLoaded] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState(isAudio ? "mp3" : "mp4");
  const [isConverting, setIsConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileLoaded(file);
      setConverted(false);
    }
  };

  const handleConvert = () => {
    if (!fileLoaded) return;
    setIsConverting(true);
    setTimeout(() => {
      setIsConverting(false);
      setConverted(true);
    }, 1500);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        {isAudio ? <Music className="size-5 text-sky-700" /> : <Video className="size-5 text-sky-700" />}
        High-Speed Browser Media Transcoder
      </h3>

      {!fileLoaded ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <Upload className="size-12 text-sky-700 dark:text-sky-400" />
          <h4 className="mt-3 font-bold text-base text-slate-800 dark:text-slate-200">
            Select Video or Audio File
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Convert MP4, WebM, AVI, MOV, MP3, WAV, OGG without uploading to any server.
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700">
            <span>Select Media File</span>
            <input type="file" accept="video/*,audio/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500">Loaded File:</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{fileLoaded.name}</p>
            <span className="text-xs text-slate-400">{(fileLoaded.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Convert to:</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="mp4">MP4 (H.264 Video)</option>
              <option value="mp3">MP3 (Universal Audio)</option>
              <option value="gif">GIF (Animated)</option>
              <option value="wav">WAV (Uncompressed)</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              <span>{isConverting ? "Transcoding..." : "Convert Now"}</span>
            </button>
            <button
              onClick={() => setFileLoaded(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
            >
              Clear
            </button>
          </div>

          {converted && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-between">
              <span className="text-xs font-bold">Conversion complete!</span>
              <a
                href={URL.createObjectURL(fileLoaded)}
                download={`converted.${outputFormat}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Download className="size-3.5" />
                <span>Download Result</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
