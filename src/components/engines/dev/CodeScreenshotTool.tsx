"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

import {
  DevClearButton,
  DevEditor,
  DevError,
  DevOk,
  DevPanel,
  DevSelect,
  devButtonClass,
} from "./DevKit";

type CodeVariant = "code-screenshot-generator" | "code-snippet-screenshot";

const SAMPLE_CODE = `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`;

const THEMES = {
  dark: { bg: "#0f172a", fg: "#e2e8f0", accent: "#38bdf8" },
  light: { bg: "#ffffff", fg: "#0f172a", accent: "#0369a1" },
  midnight: { bg: "#111827", fg: "#d1d5db", accent: "#a78bfa" },
  solarized: { bg: "#fdf6e3", fg: "#586e75", accent: "#b58900" },
};

const KEYWORDS: Record<string, string[]> = {
  javascript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "extends", "new", "await", "async", "import", "export", "from",
    "try", "catch", "finally", "throw", "typeof", "instanceof", "this", "null",
    "undefined", "true", "false", "interface", "type", "enum", "implements",
  ],
  typescript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "extends", "implements", "new", "await", "async", "import", "export",
    "from", "try", "catch", "finally", "throw", "typeof", "interface", "type",
    "enum", "public", "private", "protected", "readonly", "null", "undefined",
    "true", "false", "string", "number", "boolean", "any",
  ],
  python: [
    "def", "class", "return", "if", "elif", "else", "for", "while", "in", "not",
    "and", "or", "import", "from", "as", "with", "try", "except", "finally",
    "raise", "lambda", "yield", "pass", "break", "continue", "True", "False",
    "None", "self",
  ],
  html: ["<!doctype", "html", "head", "body", "div", "span", "main", "meta", "title"],
  css: ["body", "div", "class", "color", "background", "margin", "padding", "display", "flex"],
  json: ["true", "false", "null"],
};

/**
 * The code screenshot tools.
 *
 * The snippet is drawn onto a canvas in the browser and exported as a PNG, so
 * nothing is uploaded and the image is generated on the device.
 */
export function CodeScreenshotTool({ variant }: { variant: CodeVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [code, setCode] = React.useState("");
  const [theme, setTheme] = React.useState("dark");
  const [language, setLanguage] = React.useState("typescript");
  const [padding, setPadding] = React.useState(32);
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);
  const [error, setError] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = React.useState("");

  const title =
    variant === "code-screenshot-generator"
      ? tUi("codeScreenshotTitle")
      : tUi("codeSnippetScreenshotTitle");
  const subtitle =
    variant === "code-screenshot-generator"
      ? tUi("codeScreenshotSubtitle")
      : tUi("codeSnippetScreenshotSubtitle");

  const draw = React.useCallback(
    (source: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const colours = THEMES[theme as keyof typeof THEMES] || THEMES.dark;
      const fontSize = 15;
      const lineHeight = 22;
      const gutter = showLineNumbers ? 46 : 0;

      const context = canvas.getContext("2d");
      if (!context) return;

      const lines = source.split("\n");
      const measure = context;
      measure.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      let widest = 0;
      for (const line of lines) {
        const width = measure.measureText(line).width;
        if (width > widest) widest = width;
      }

      const width = Math.max(320, Math.ceil(widest + padding * 2 + gutter));
      const height = Math.max(120, Math.ceil(lines.length * lineHeight + padding * 2));

      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = colours.bg;
      ctx.fillRect(0, 0, width, height);

      const keywords = KEYWORDS[language] || [];
      const isComment = (line: string) => /^\s*(\/\/|#|\*)/.test(line);

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const y = padding + index * lineHeight + fontSize;
        if (showLineNumbers) {
          ctx.fillStyle = colours.fg;
          ctx.globalAlpha = 0.4;
          ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.textAlign = "right";
          ctx.fillText(String(index + 1), gutter + padding - 12, y);
          ctx.textAlign = "left";
          ctx.globalAlpha = 1;
        }
        ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        if (isComment(line)) {
          ctx.fillStyle = colours.fg;
          ctx.globalAlpha = 0.55;
          ctx.fillText(line, gutter + padding, y);
          ctx.globalAlpha = 1;
          continue;
        }
        // Colour the leading keyword, then the rest of the line.
        const match = /^(\s*)([A-Za-z_$][\w$]*)/.exec(line);
        if (match && keywords.includes(match[2])) {
          ctx.fillStyle = colours.accent;
          ctx.fillText(match[1] + match[2], gutter + padding, y);
          ctx.fillStyle = colours.fg;
          ctx.fillText(line.slice(match[1].length + match[2].length), gutter + padding + ctx.measureText(match[1] + match[2]).width, y);
          continue;
        }
        ctx.fillStyle = colours.fg;
        ctx.fillText(line, gutter + padding, y);
      }

      setDataUrl(canvas.toDataURL("image/png"));
      setReady(true);
    },
    [theme, language, padding, showLineNumbers],
  );

  React.useEffect(() => {
    if (code.trim()) draw(code);
  }, [code, draw]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "code-screenshot.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button
            type="button"
            onClick={() => draw(code)}
            className={devButtonClass}
          >
            {tUi("renderScreenshot")}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!ready}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="size-3.5" />
            {tUi("downloadPng")}
          </button>
          <DevClearButton
            onClick={() => {
              setCode("");
              setDataUrl("");
              setReady(false);
              setError("");
            }}
            label={tUi("clear")}
          />
          <button
            type="button"
            onClick={() => setCode(SAMPLE_CODE)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("loadExample")}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("theme")}
          <DevSelect
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "midnight", label: "Midnight" },
              { value: "solarized", label: "Solarized" },
            ]}
          />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("language")}
          <DevSelect
            value={language}
            onChange={setLanguage}
            options={[
              { value: "typescript", label: "TypeScript" },
              { value: "javascript", label: "JavaScript" },
              { value: "python", label: "Python" },
              { value: "html", label: "HTML" },
              { value: "css", label: "CSS" },
              { value: "json", label: "JSON" },
            ]}
          />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("padding")} ({padding}px)
          <input
            type="range"
            min={8}
            max={96}
            step={4}
            value={padding}
            onChange={(event) => setPadding(Number(event.target.value))}
            className="mt-1.5 block w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showLineNumbers}
            onChange={(event) => setShowLineNumbers(event.target.checked)}
          />
          {tUi("lineNumbers")}
        </label>
      </div>

      <DevEditor
        value={code}
        onChange={setCode}
        placeholder={tUi("pasteCodeHere")}
        rows={10}
      />

      {error ? <DevError>{error}</DevError> : null}
      {ready ? <DevOk>{tUi("screenshotReady")}</DevOk> : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("preview")}
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
          <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
        </div>
      </div>

      {dataUrl ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{tUi("pngReady")}</p>
      ) : null}
    </DevPanel>
  );
}
