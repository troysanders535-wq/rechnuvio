"use client";

import React, { useState } from "react";
import { Copy, Trash2, Sparkles, Sliders, Type, ListOrdered } from "lucide-react";
import { HeadsOrTailsEngine } from "./HeadsOrTailsEngine";

interface TextSuiteEngineProps {
  slug: string;
}

export function TextSuiteEngine({ slug }: TextSuiteEngineProps) {
  if (slug === "heads-or-tails" || slug.includes("heads") || slug.includes("coin")) {
    return <HeadsOrTailsEngine slug={slug} />;
  }

  const [text, setText] = useState(
    "Digital ToolPad is a suite of free, high-performance web utilities that run 100% in your browser. All your data stays strictly on your device with zero server tracking."
  );
  const [copied, setCopied] = useState(false);

  // Stats calculation
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charsWithSpaces = text.length;
  const charsNoSpaces = text.replace(/\s+/g, "").length;
  const sentences = text.trim() ? (text.match(/[.!?]+(?:\s+|$)/g) || []).length : 0;
  const paragraphs = text.trim() ? text.split(/\n+/).filter(Boolean).length : 0;
  const readingTimeMin = Math.ceil(words / 200);
  const speakingTimeMin = Math.ceil(words / 130);
  const approxTokens = Math.ceil(charsWithSpaces / 4);

  // Case Conversion functions
  const toUpperCase = () => setText(text.toUpperCase());
  const toLowerCase = () => setText(text.toLowerCase());
  const toTitleCase = () =>
    setText(
      text.replace(
        /\w\S*/g,
        (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()
      )
    );
  const toCamelCase = () =>
    setText(
      text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, "")
    );
  const toKebabCase = () =>
    setText(
      text
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase()
    );

  const removeDuplicates = () => {
    const lines = text.split("\n");
    const unique = Array.from(new Set(lines));
    setText(unique.join("\n"));
  };

  const sortAlphabetical = (asc = true) => {
    const lines = text.split("\n");
    lines.sort((a, b) => (asc ? a.localeCompare(b) : b.localeCompare(a)));
    setText(lines.join("\n"));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-slate-200 border-b border-slate-200 bg-slate-50 text-center dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
        <div className="p-3">
          <span className="text-xl font-extrabold text-sky-800 dark:text-sky-400">{words}</span>
          <p className="text-[11px] font-medium text-slate-500">Words</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            {charsWithSpaces}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Characters</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            {charsNoSpaces}
          </span>
          <p className="text-[11px] font-medium text-slate-500">No Spaces</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            {sentences}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Sentences</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            {paragraphs}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Paragraphs</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ~{approxTokens}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Tokens</p>
        </div>
        <div className="p-3">
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            {readingTimeMin}m
          </span>
          <p className="text-[11px] font-medium text-slate-500">Reading Time</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={toUpperCase}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            UPPERCASE
          </button>
          <button
            onClick={toLowerCase}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            lowercase
          </button>
          <button
            onClick={toTitleCase}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Title Case
          </button>
          <button
            onClick={toCamelCase}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            camelCase
          </button>
          <button
            onClick={toKebabCase}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            kebab-case
          </button>

          <span className="hidden sm:inline-block h-4 w-px bg-slate-300 dark:bg-slate-700" />

          <button
            onClick={removeDuplicates}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Remove Duplicates
          </button>
          <button
            onClick={() => sortAlphabetical(true)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sort A to Z
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={() => setText("")}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
            title="Clear"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Type, write, or paste your text here..."
        className="w-full resize-y bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
      />
    </div>
  );
}
