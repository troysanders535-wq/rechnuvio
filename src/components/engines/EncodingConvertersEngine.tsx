"use client";

import React, { useState } from "react";
import { ArrowRightLeft, Copy, Trash2, Sparkles, Hash } from "lucide-react";

interface EncodingConvertersEngineProps {
  slug: string;
}

export function EncodingConvertersEngine({ slug }: EncodingConvertersEngineProps) {
  const isBinary = slug.includes("binary");
  const isHex = slug.includes("hex") && !slug.includes("rgb");
  const isMorse = slug.includes("morse");
  const isRoman = slug.includes("roman");
  const isColor = slug.includes("rgb") || slug.includes("hex-to-rgb");
  const isUrl = slug.includes("url");

  // State
  const [input, setInput] = useState("Hello World 2026");
  const [output, setOutput] = useState("");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  // Morse map
  const morseMap: Record<string, string> = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
    I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
    Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
    6: "-....", 7: "--...", 8: "---..", 9: "----.", 0: "-----", " ": "/"
  };
  const reverseMorse: Record<string, string> = Object.fromEntries(
    Object.entries(morseMap).map(([k, v]) => [v, k])
  );

  const romanToInt = (s: string) => {
    const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const cur = map[s[i].toUpperCase()] || 0;
      const next = map[s[i + 1]?.toUpperCase()] || 0;
      if (cur < next) total -= cur;
      else total += cur;
    }
    return total;
  };

  const intToRoman = (num: number) => {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
    let res = "";
    for (let i = 0; i < vals.length; i++) {
      while (num >= vals[i]) {
        num -= vals[i];
        res += syms[i];
      }
    }
    return res;
  };

  const runConversion = () => {
    if (!input.trim()) {
      setOutput("");
      return;
    }

    try {
      if (isMorse) {
        if (direction === "encode") {
          setOutput(
            input
              .toUpperCase()
              .split("")
              .map((c) => morseMap[c] || c)
              .join(" ")
          );
        } else {
          setOutput(
            input
              .split(" ")
              .map((c) => reverseMorse[c] || c)
              .join("")
          );
        }
      } else if (isRoman) {
        if (direction === "encode") {
          const n = parseInt(input, 10);
          setOutput(isNaN(n) ? "Please enter a valid number" : intToRoman(n));
        } else {
          setOutput(romanToInt(input).toString());
        }
      } else if (isHex) {
        if (direction === "encode") {
          setOutput(
            Array.from(input)
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join(" ")
          );
        } else {
          const clean = input.replace(/\s+/g, "");
          let str = "";
          for (let i = 0; i < clean.length; i += 2) {
            str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
          }
          setOutput(str);
        }
      } else if (isUrl) {
        setOutput(
          direction === "encode"
            ? encodeURIComponent(input)
            : decodeURIComponent(input)
        );
      } else if (isColor) {
        if (input.startsWith("#")) {
          // HEX to RGB
          const hex = input.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) || 0;
          const g = parseInt(hex.substring(2, 4), 16) || 0;
          const b = parseInt(hex.substring(4, 6), 16) || 0;
          setOutput(`rgb(${r}, ${g}, ${b})`);
        } else {
          // RGB to HEX
          const nums = input.match(/\d+/g);
          if (nums && nums.length >= 3) {
            const hex = nums
              .slice(0, 3)
              .map((x) => parseInt(x).toString(16).padStart(2, "0"))
              .join("");
            setOutput(`#${hex.toUpperCase()}`);
          }
        }
      } else {
        // Binary default
        if (direction === "encode") {
          setOutput(
            Array.from(input)
              .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
              .join(" ")
          );
        } else {
          const bytes = input.trim().split(/\s+/);
          setOutput(
            bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join("")
          );
        }
      }
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
  };

  React.useEffect(() => {
    runConversion();
  }, [input, direction]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDirection(direction === "encode" ? "decode" : "encode")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>Switch Direction ({direction === "encode" ? "Forward" : "Reverse"})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(output);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
            }}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Input ({direction === "encode" ? "Human Readable" : "Encoded"})
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Output ({direction === "encode" ? "Converted / Encoded" : "Human Readable"})
          </div>
          <textarea
            value={output}
            readOnly
            rows={10}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-emerald-400 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
