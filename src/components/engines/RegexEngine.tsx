"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Copy, Sparkles, Trash2 } from "lucide-react";

interface RegexEngineProps {
  slug: string;
}

export function RegexEngine({ slug }: RegexEngineProps) {
  const [pattern, setPattern] = useState("([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState(
    "Contact support at hello@digitaltoolpad.com or admin@company.org for assistance."
  );
  const [matches, setMatches] = useState<any[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const runRegex = () => {
    try {
      if (!pattern) {
        setMatches([]);
        setIsValid(true);
        return;
      }
      const regex = new RegExp(pattern, flags);
      setIsValid(true);
      setErrorMessage("");

      const found: any[] = [];
      if (flags.includes("g")) {
        let m;
        while ((m = regex.exec(testText)) !== null) {
          if (m.index === regex.lastIndex) regex.lastIndex++;
          found.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
        }
      } else {
        const m = regex.exec(testText);
        if (m) {
          found.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
        }
      }
      setMatches(found);
    } catch (err: any) {
      setIsValid(false);
      setErrorMessage(err.message);
      setMatches([]);
    }
  };

  React.useEffect(() => {
    runRegex();
  }, [pattern, flags, testText]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.replace(flag, "") : prev + flag
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Pattern Input Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex flex-1 items-center rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <span className="font-mono text-base font-bold text-slate-400">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Insert regex pattern..."
              className="flex-1 bg-transparent px-2 font-mono text-sm text-slate-900 outline-none dark:text-white"
            />
            <span className="font-mono text-base font-bold text-slate-400">/{flags}</span>
          </div>

          {/* Flags Toggles */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
            {["g", "i", "m", "s"].map((f) => {
              const active = flags.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(f)}
                  className={`rounded px-2.5 py-1 font-mono font-semibold transition ${
                    active
                      ? "bg-sky-800 text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                  title={`Toggle ${f} flag`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation Info */}
        <div className="mt-2 text-xs">
          {isValid ? (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Valid Regular Expression • {matches.length} matches found
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-3.5" />
              {errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* Test String Textarea */}
      <div className="p-4 bg-slate-950">
        <label className="text-xs font-semibold text-slate-400">Test String</label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          rows={6}
          placeholder="Paste or write text to test..."
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 font-mono text-sm text-slate-200 outline-none"
        />
      </div>

      {/* Matches Breakdown */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <h4 className="text-xs font-semibold text-slate-400">Capture Matches ({matches.length})</h4>
        <div className="mt-3 space-y-2 max-h-60 overflow-auto">
          {matches.length === 0 ? (
            <p className="text-xs text-slate-500">No matches found.</p>
          ) : (
            matches.map((m, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-sky-400">
                  <span className="font-semibold">Match #{idx + 1}: &quot;{m.match}&quot;</span>
                  <span className="text-[10px] text-slate-500">Index {m.index}</span>
                </div>
                {m.groups.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2 text-slate-400">
                    {m.groups.map((grp: string, gIdx: number) => (
                      <span
                        key={gIdx}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]"
                      >
                        Group {gIdx + 1}: &quot;{grp}&quot;
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
