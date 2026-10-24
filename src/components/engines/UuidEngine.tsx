"use client";

import React, { useState } from "react";
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { Sparkles, Copy, Download, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface UuidEngineProps {
  slug: string;
}

type UuidVersion = "v1" | "v4" | "v5" | "v7";

/**
 * The version a tool starts with. The "UUID v7 Generator" has to emit v7
 * UUIDs right away, every other UUID tool starts with the random v4.
 */
const DEFAULT_VERSION_BY_SLUG: Record<string, UuidVersion> = {
  "uuid-v7-generator": "v7",
};

interface GeneratedUuid {
  id: string;
  /** The Unix timestamp in milliseconds that a v7 UUID embeds. */
  timestamp: number | null;
}

/**
 * The monotonic state of the v7 counter: the timestamp of the last UUID and
 * the counter that was used inside it. RFC 9562 section 6.2 method 1 keeps
 * the counter in the 12 bit `rand_a` field, so UUIDs that are created inside
 * the same millisecond still sort in the order they were created.
 */
let lastV7Timestamp = 0;
let lastV7Counter = -1;

/**
 * Build a RFC 9562 version 7 UUID: 48 bit big-endian Unix timestamp in
 * milliseconds, the version nibble 7, the variant bits 10xx and 74 random
 * bits. `crypto.randomUUID()` cannot be used - it only produces version 4.
 */
function createUuidV7(): GeneratedUuid {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);

  const now = Date.now();
  let timestamp = now;
  let counter: number;

  if (now > lastV7Timestamp) {
    counter = 0;
  } else {
    counter = (lastV7Counter + 1) & 0xfff;
    timestamp = counter === 0 ? lastV7Timestamp + 1 : lastV7Timestamp;
  }
  lastV7Timestamp = timestamp;
  lastV7Counter = counter;

  const bytes = new Uint8Array(16);
  // 48 bit Unix timestamp, big endian: six bytes.
  bytes[0] = Math.floor(timestamp / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(timestamp / 0x100000000) & 0xff;
  bytes[2] = Math.floor(timestamp / 0x1000000) & 0xff;
  bytes[3] = Math.floor(timestamp / 0x10000) & 0xff;
  bytes[4] = Math.floor(timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;
  // Version 7 in the high nibble, 4 counter bits in the low nibble.
  bytes[6] = 0x70 | ((counter >> 8) & 0x0f);
  bytes[7] = counter & 0xff;
  // Variant bits 10xx and 62 random bits.
  bytes[8] = (random[8] & 0x3f) | 0x80;
  for (let i = 9; i < 16; i += 1) bytes[i] = random[i];

  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) hex.push(bytes[i].toString(16).padStart(2, "0"));

  const id = [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");

  return { id, timestamp };
}

/** The RFC 9562 version nibble of a UUID. */
function versionOf(id: string): number {
  return parseInt(id.charAt(14), 16);
}

export function UuidEngine({ slug }: UuidEngineProps) {
  const tUi = useTranslations("ui.engines.UuidEngine");
  const [version, setVersion] = useState<UuidVersion>(
    DEFAULT_VERSION_BY_SLUG[slug] ?? "v4",
  );
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<"standard" | "compact" | "braces" | "urn">("standard");
  const [uppercase, setUppercase] = useState(false);
  const [uuids, setUuids] = useState<GeneratedUuid[]>([]);
  const [copied, setCopied] = useState(false);

  const generateSingleUuid = (ver: UuidVersion, index: number): GeneratedUuid => {
    if (ver === "v1") return { id: uuidv1(), timestamp: null };
    // The name is made unique per row, otherwise every name based UUID of a
    // batch would carry the same value.
    if (ver === "v5") {
      return { id: uuidv5(`digitaltoolpad.com/${index}`, uuidv5.DNS), timestamp: null };
    }
    if (ver === "v7") return createUuidV7();
    return { id: uuidv4(), timestamp: null };
  };

  const applyFormat = (id: string): string => {
    let out = id;
    if (format === "compact") out = out.replace(/-/g, "");
    else if (format === "braces") out = `{${out}}`;
    else if (format === "urn") out = `urn:uuid:${out}`;
    return uppercase ? out.toUpperCase() : out.toLowerCase();
  };

  const handleGenerate = () => {
    const generated: GeneratedUuid[] = [];
    const limit = Math.min(Math.max(1, count), 500);
    for (let i = 0; i < limit; i++) {
      generated.push(generateSingleUuid(version, i));
    }
    setUuids(generated);
  };

  React.useEffect(() => {
    handleGenerate();
  }, [version, count, format, uppercase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(uuids.map((u) => applyFormat(u.id)).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([uuids.map((u) => applyFormat(u.id)).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids-${version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const first = uuids[0];
  const versionLabel =
    version === "v7"
      ? tUi("version7TimeOrdered")
      : version === "v1"
      ? tUi("version1TimestampMAC")
      : version === "v5"
      ? tUi("version5NameBasedSHA1")
      : tUi("version4Random");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Options Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* UUID Version Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("version")}
            </label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as UuidVersion)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="v4">{tUi("version4Random")}</option>
              <option value="v7">{tUi("version7TimeOrdered")}</option>
              <option value="v1">{tUi("version1TimestampMAC")}</option>
              <option value="v5">{tUi("version5NameBasedSHA1")}</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("quantity1500")}
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("format")}
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="standard">{tUi("standardWithHyphens")}</option>
              <option value="compact">{tUi("compactNoHyphens")}</option>
              <option value="braces">{tUi("braces")}{`{...}`})</option>
              <option value="urn">URN (urn:uuid:...)</option>
            </select>
          </div>

          {/* Uppercase toggle */}
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="rounded border-slate-300 accent-sky-700"
              />
              <span>{tUi("uppercaseAZ")}</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
            >
              <RefreshCw className="size-3.5" />
              <span>{tUi("generateNewUUIDs")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Copy className="size-3.5" />
              <span>{copied ? tUi("copiedAll") : tUi("copyAll")}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="size-3.5" />
              <span>{tUi("download")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Version and timestamp summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {tUi("version")}: {versionLabel}
        </span>
        {first ? (
          <span>
            {tUi("timestamp")}:{" "}
            <span className="font-mono text-slate-700 dark:text-slate-200">
              {first.timestamp !== null ? new Date(first.timestamp).toISOString() : "-"}
            </span>
          </span>
        ) : null}
        {version === "v7" ? (
          <span className="text-slate-400 dark:text-slate-500">{tUi("uuidV7Info")}</span>
        ) : null}
      </div>

      {/* Generated List */}
      <div className="bg-slate-950 p-4">
        <div className="max-h-96 space-y-1.5 overflow-auto font-mono text-xs">
          {uuids.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-sky-300 hover:border-slate-700"
            >
              <span className="select-all">{applyFormat(entry.id)}</span>
              <span className="shrink-0 text-[10px] text-slate-500">
                v{versionOf(entry.id)}
                {entry.timestamp !== null
                  ? ` • ${new Date(entry.timestamp).toISOString()}`
                  : ""}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(applyFormat(entry.id))}
                className="shrink-0 text-slate-500 hover:text-white"
                title={tUi("copySingleUUID")}
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
