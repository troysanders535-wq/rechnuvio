"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Copy, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface EncodingConvertersEngineProps {
  slug: string;
}

/**
 * Every tool this engine serves has an explicit conversion spec. The previous
 * implementation derived the behaviour from `slug.includes(...)`, so
 * "Binary to Decimal Converter" encoded text into binary and never produced a
 * decimal number, and one-way converters still offered a direction toggle.
 */
type Unit =
  | "binary"
  | "decimal"
  | "hex"
  | "octal"
  | "text"
  | "morse"
  | "roman"
  | "rgb"
  | "url"
  | "url-encoded";

type Kind = "number" | "bytes" | "morse" | "roman" | "color" | "url";

/**
 * One way the tool can run: the unit the user types in, the unit that comes
 * out, and for URL tools the operation to apply.
 */
interface Mode {
  from: Unit;
  to: Unit;
  op?: "encode" | "decode";
}

interface ConvSpec {
  kind: Kind;
  /** The first mode is the one that runs on load. */
  modes: Mode[];
  /** whether the user can switch to the other mode */
  bidirectional: boolean;
  /** show a base picker (number-base-converter) */
  basePicker?: boolean;
}

const SPECS: Record<string, ConvSpec> = {
  // number <-> number
  "binary-to-decimal": { kind: "number", modes: [{ from: "binary", to: "decimal" }], bidirectional: false },
  "binary-to-hex": { kind: "number", modes: [{ from: "binary", to: "hex" }], bidirectional: false },
  "decimal-to-binary": { kind: "number", modes: [{ from: "decimal", to: "binary" }], bidirectional: false },
  "decimal-to-hex": { kind: "number", modes: [{ from: "decimal", to: "hex" }], bidirectional: false },
  "hex-to-binary": { kind: "number", modes: [{ from: "hex", to: "binary" }], bidirectional: false },
  "hex-to-decimal": { kind: "number", modes: [{ from: "hex", to: "decimal" }], bidirectional: false },
  "number-base-converter": {
    kind: "number",
    modes: [{ from: "decimal", to: "binary" }],
    bidirectional: true,
    basePicker: true,
  },

  // text <-> byte encoding
  "binary-translator": {
    kind: "bytes",
    modes: [
      { from: "text", to: "binary" },
      { from: "binary", to: "text" },
    ],
    bidirectional: true,
  },
  "binary-to-text": { kind: "bytes", modes: [{ from: "binary", to: "text" }], bidirectional: false },
  "hex-to-ascii": { kind: "bytes", modes: [{ from: "hex", to: "text" }], bidirectional: false },

  // colour
  "hex-to-rgb": { kind: "color", modes: [{ from: "hex", to: "rgb" }], bidirectional: false },
  "hex-to-rgb-calculator": { kind: "color", modes: [{ from: "hex", to: "rgb" }], bidirectional: false },
  "hex-rgb-converter": { kind: "color", modes: [{ from: "hex", to: "rgb" }], bidirectional: false },
  "rgb-to-hex": { kind: "color", modes: [{ from: "rgb", to: "hex" }], bidirectional: false },
  "rgb-to-hex-calculator": { kind: "color", modes: [{ from: "rgb", to: "hex" }], bidirectional: false },
  "rgb-hex-converter": { kind: "color", modes: [{ from: "rgb", to: "hex" }], bidirectional: false },

  // morse
  "morse-code-translator": {
    kind: "morse",
    modes: [
      { from: "text", to: "morse" },
      { from: "morse", to: "text" },
    ],
    bidirectional: true,
  },

  // url
  "url-encoder": { kind: "url", modes: [{ from: "text", to: "url-encoded", op: "encode" }], bidirectional: false },
  "url-decoder": { kind: "url", modes: [{ from: "url-encoded", to: "text", op: "decode" }], bidirectional: false },
  "url-encoder-decoder": {
    kind: "url",
    modes: [
      { from: "text", to: "url-encoded", op: "encode" },
      { from: "url-encoded", to: "text", op: "decode" },
    ],
    bidirectional: true,
  },
};

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const REVERSE_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k]),
);

const ROMAN_VALUES: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const ROMAN_MAP: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};

/**
 * A translator that resolves a catalogue key to a localized string.
 */
type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The display labels of the units in the active locale.
 */
function unitLabels(t: Translate): Record<Unit, string> {
  return {
    binary: t("unitBinary"),
    decimal: t("unitDecimal"),
    hex: t("unitHexadecimal"),
    octal: t("unitOctal"),
    text: t("unitText"),
    morse: t("unitMorse"),
    roman: t("unitRomanNumeral"),
    rgb: t("unitRgb"),
    url: t("unitUrl"),
    "url-encoded": t("unitUrlEncoded"),
  };
}

const BASE_RADIX: Record<string, number> = { binary: 2, octal: 8, decimal: 10, hex: 16 };

function intToRoman(num: number, t: Translate): string {
  if (!Number.isFinite(num) || num <= 0 || num > 3999) {
    throw new Error(t("enterAWholeNumberBetween1And3999"));
  }
  let n = Math.floor(num);
  let out = "";
  for (const [value, symbol] of ROMAN_VALUES) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

function romanToInt(input: string, t: Translate): number {
  const s = input.trim().toUpperCase();
  if (!s) throw new Error(t("enterARomanNumeral"));
  if (!/^[MDCLXVI]+$/.test(s)) throw new Error(t("enterAValidRomanNumeral"));
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const cur = ROMAN_MAP[s[i]] ?? 0;
    const next = ROMAN_MAP[s[i + 1]] ?? 0;
    if (cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

/** Digits allowed in each base. */
const BASE_DIGITS: Record<number, string> = {
  2: "01",
  8: "01234567",
  10: "0123456789",
  16: "0123456789abcdef",
};

/** Parse an integer written in `base`. Throws a readable message on bad input. */
function parseInBase(raw: string, base: number, t: Translate): bigint {
  const s = raw.trim().replace(/[\s_]/g, "");
  if (!s) throw new Error(t("enterAValue"));
  const prefix = base === 16 ? "0x" : base === 2 ? "0b" : base === 8 ? "0o" : "";
  const body = s.toLowerCase().startsWith(prefix) ? s.slice(prefix.length) : s.toLowerCase();
  if (!body) throw new Error(t("enterAValue"));

  const allowed = BASE_DIGITS[base];
  if (!allowed) throw new Error(t("unsupportedBase"));
  const ok = body.split("").every((c) => allowed.includes(c));
  if (!ok) {
    const name =
      base === 16
        ? t("baseHexadecimal")
        : base === 2
          ? t("baseBinary")
          : base === 8
            ? t("baseOctal")
            : t("baseDecimal");
    throw new Error(t("isNotAValidValue", { value: raw.trim(), name }));
  }
  return BigInt(prefix + body);
}

function formatInBase(value: bigint, base: number): string {
  return value.toString(base).toUpperCase();
}

export function EncodingConvertersEngine({ slug }: EncodingConvertersEngineProps) {
  const tUi = useTranslations("ui.engines.EncodingConvertersEngine");
  const spec = SPECS[slug];

  const [input, setInput] = useState("Hello World 2026");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [modeIndex, setModeIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(2);

  const unitLabel = useMemo(() => unitLabels(tUi), [tUi]);

  // A one-way tool must not offer a direction toggle.
  useEffect(() => {
    setModeIndex(0);
  }, [spec]);

  const mode: Mode | null = useMemo(() => {
    if (!spec) return null;
    const m = spec.modes[Math.min(modeIndex, spec.modes.length - 1)];
    if (!spec.basePicker) return m;
    const from: Unit =
      fromBase === 2 ? "binary" : fromBase === 8 ? "octal" : fromBase === 16 ? "hex" : "decimal";
    const to: Unit =
      toBase === 2 ? "binary" : toBase === 8 ? "octal" : toBase === 16 ? "hex" : "decimal";
    return { ...m, from, to };
  }, [spec, modeIndex, fromBase, toBase]);

  useEffect(() => {
    if (!mode || !spec) return;
    if (!input.trim()) {
      setOutput("");
      setError("");
      return;
    }
    try {
      let result = "";
      const from = mode.from;
      const to = mode.to;

      if (spec.kind === "number") {
        const fromRadix = BASE_RADIX[from];
        const toRadix = BASE_RADIX[to];
        if (!fromRadix || !toRadix) throw new Error(tUi("unsupportedBase"));
        const value = parseInBase(input, fromRadix, tUi);
        result = formatInBase(value, toRadix);
      } else if (spec.kind === "bytes") {
        if (from === "text") {
          const bytes = Array.from(input).map((c) => c.charCodeAt(0));
          result =
            to === "binary"
              ? bytes.map((b) => b.toString(2).padStart(8, "0")).join(" ")
              : bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
        } else {
          // Byte sequences arrive either space separated or as one long run.
          const cleaned = input.trim().replace(/[\s,]+/g, "");
          const radix = from === "binary" ? 2 : 16;
          const width = radix === 2 ? 8 : 2;
          if (!cleaned) throw new Error(tUi("enterAValue"));
          if (cleaned.length % width !== 0) {
            throw new Error(
              from === "binary"
                ? tUi("enterCompleteBinaryBytes", { width: String(width) })
                : tUi("enterCompleteHexBytes", { width: String(width) }),
            );
          }
          const parts: string[] = [];
          for (let i = 0; i < cleaned.length; i += width) parts.push(cleaned.slice(i, i + width));
          result = parts
            .map((p) => {
              const n = parseInt(p, radix);
              if (Number.isNaN(n)) {
                throw new Error(
                  from === "binary"
                    ? tUi("isNotAValidBinaryValue", { value: p })
                    : tUi("isNotAValidHexValue", { value: p }),
                );
              }
              return String.fromCharCode(n);
            })
            .join("");
        }
      } else if (spec.kind === "morse") {
        if (from === "text") {
          result = input
            .toUpperCase()
            .split("")
            .map((c) => (c === " " ? "/" : MORSE[c] || c))
            .join(" ");
        } else {
          result = input
            .split(" ")
            .map((c) => REVERSE_MORSE[c] || c)
            .join("");
        }
      } else if (spec.kind === "roman") {
        result =
          from === "roman"
            ? String(romanToInt(input, tUi))
            : intToRoman(Number(input.replace(/[^\d.-]/g, "")), tUi);
      } else if (spec.kind === "color") {
        if (from === "hex") {
          const hex = input.trim().replace(/^#/, "");
          if (!/^[0-9a-f]{6}$/i.test(hex)) {
            throw new Error(tUi("enterA6DigitHexColourSuchAsFF0000"));
          }
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          result = `rgb(${r}, ${g}, ${b})`;
        } else {
          const nums = input.match(/\d+/g);
          if (!nums || nums.length < 3) {
            throw new Error(tUi("enterRedGreenAndBlueValuesSuchAs25500"));
          }
          const hex = nums
            .slice(0, 3)
            .map((x) => Math.max(0, Math.min(255, parseInt(x, 10))).toString(16).padStart(2, "0"))
            .join("");
          result = `#${hex.toUpperCase()}`;
        }
      } else if (spec.kind === "url") {
        result = mode.op === "decode" ? decodeURIComponent(input) : encodeURIComponent(input);
      } else {
        result = input;
      }

      setOutput(result);
      setError("");
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : tUi("couldNotConvertThisValue"));
    }
  }, [input, mode, spec]);

  if (!spec || !mode) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {tUi("thisConverterIsNotAvailable")}
      </div>
    );
  }

  const fromUnit = mode.from;
  const toUnit = mode.to;
  const canSwitch = spec.bidirectional;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          {canSwitch && (
            <button
              onClick={() =>
                setModeIndex((i) => (i + 1) % Math.max(1, spec.modes.length))
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
            >
              <ArrowRightLeft className="size-3.5" />
              <span>
                {tUi("switchDirection")}{modeIndex === 0 ? tUi("forward") : tUi("reverse")})
              </span>
            </button>
          )}

          {spec.basePicker && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                {tUi("from")}
                <select
                  value={fromBase}
                  onChange={(e) => setFromBase(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={2}>{tUi("binary2")}</option>
                  <option value={8}>{tUi("octal8")}</option>
                  <option value={10}>{tUi("decimal10")}</option>
                  <option value={16}>{tUi("hexadecimal16")}</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                {tUi("to")}
                <select
                  value={toBase}
                  onChange={(e) => setToBase(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={2}>{tUi("binary2")}</option>
                  <option value={8}>{tUi("octal8")}</option>
                  <option value={10}>{tUi("decimal10")}</option>
                  <option value={16}>{tUi("hexadecimal16")}</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(output);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? tUi("copied") : tUi("copy")}</span>
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
            }}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
            aria-label={tUi("clear")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-800 bg-slate-950 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("input")}{unitLabel[fromUnit]})
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            spellCheck={false}
            aria-label={`${tUi("input")}${unitLabel[fromUnit]})`}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("output")}{unitLabel[toUnit]})
          </div>
          <textarea
            value={output}
            readOnly
            rows={10}
            spellCheck={false}
            aria-label={`${tUi("output")}${unitLabel[toUnit]})`}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-emerald-400 outline-none"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border-t border-rose-500/40 bg-rose-950/60 px-4 py-3 text-xs font-medium text-rose-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}
