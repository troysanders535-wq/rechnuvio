"use client";

/**
 * The workspaces that draw a new picture: quote cards, code images, formula
 * images and social share cards.
 *
 * Every one of them draws on a canvas and exports that canvas as a PNG.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadButton,
  ErrorNote,
  Field,
  GhostButton,
  Note,
  Panel,
  Select,
  canvasToBlob,
  downloadBlob,
  useImageT,
} from "./kit";
import { makeCanvas } from "./fx";
import { latexToMathml } from "./latex";
import { rasterizeHtml } from "./raster";

/* ------------------------------------------------------------------ quote -- */

/**
 * The quote templates. The theme names are translated, the values are not.
 */
function quoteTemplates(t: (key: string) => string) {
  return [
    { value: "midnight", label: t("themeMidnight") },
    { value: "paper", label: t("themePaper") },
    { value: "accent", label: t("themeAccent") },
  ];
}

/**
 * The quote fonts. The font name in brackets stays as it is.
 */
function quoteFonts(t: (key: string) => string) {
  return [
    { value: "Georgia, 'Times New Roman', serif", label: t("quoteFontSerif") },
    { value: "Arial, Helvetica, sans-serif", label: t("quoteFontSansSerif") },
    { value: "'Courier New', monospace", label: t("quoteFontMonospace") },
    { value: "Impact, 'Arial Black', sans-serif", label: t("quoteFontPoster") },
  ];
}

/** Draw a text that wraps at the given width. */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let cursor = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      cursor += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += lineHeight;
  }
  return cursor;
}

export function QuoteView({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useImageT();
  const templates = quoteTemplates(t);
  const fonts = quoteFonts(t);
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [template, setTemplate] = useState("midnight");
  const [font, setFont] = useState(fonts[0].value);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (template === "paper") {
      ctx.fillStyle = "#f8f5ef";
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#1f2937";
    } else if (template === "accent") {
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      gradient.addColorStop(0, "#312e81");
      gradient.addColorStop(1, "#0f766e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#ffffff";
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#f8fafc";
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `600 92px ${font}`;

    if (template === "accent") {
      ctx.fillStyle = "#99f6e4";
      ctx.fillRect(90, 150, 120, 10);
    } else if (template === "midnight") {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(90, 150, 120, 10);
    } else {
      ctx.fillStyle = "#b45309";
      ctx.fillRect(90, 150, 120, 10);
    }

    const body = quote.trim() || t("quotePlaceholder");
    const maxWidth = 900;
    ctx.fillStyle = template === "paper" ? "#111827" : template === "accent" ? "#ffffff" : "#f8fafc";
    ctx.font = `600 92px ${font}`;
    const used = drawWrappedText(ctx, body, 90, 240, maxWidth, 118);

    if (author.trim()) {
      ctx.font = `400 44px ${font}`;
      ctx.fillStyle = template === "paper" ? "#4b5563" : "#cbd5f5";
      ctx.fillText(`— ${author.trim()}`, 90, Math.min(used + 40, 900));
    }
  }, [quote, author, template, font, t]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, "quote.png");
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("quoteText")}>
            <textarea
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              rows={5}
              placeholder={t("quotePlaceholder")}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("quoteAuthor")}>
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder={t("quoteAuthorPlaceholder")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("quoteTemplate")}>
            <Select
              value={template}
              onChange={setTemplate}
              options={templates.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
              ariaLabel={t("quoteTemplate")}
            />
          </Field>
          <Field label={t("quoteFont")}>
            <Select
              value={font}
              onChange={setFont}
              options={fonts}
              ariaLabel={t("quoteFont")}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton
              onClick={() => {
                setQuote("");
                setAuthor("");
              }}
            >
              {t("clear")}
            </GhostButton>
          </div>
          <Note>{t("quoteNote")}</Note>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <canvas
            ref={canvasRef}
            className="max-h-[420px] max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
          />
          <p className="mt-2 font-mono text-xs text-slate-500">1080 × 1080 px</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------- code -- */

const CODE_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "shell", label: "Shell" },
];

/**
 * The code themes. The theme names are translated, the values are not.
 */
function codeThemes(t: (key: string) => string) {
  return [
    { value: "midnight", label: t("themeMidnight") },
    { value: "paper", label: t("themePaper") },
  ];
}

const KEYWORDS: Record<string, string[]> = {
  javascript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "extends", "new", "import", "export", "from", "async", "await",
    "try", "catch", "finally", "throw", "typeof", "instanceof", "this",
    "switch", "case", "break", "continue", "default", "delete", "in", "of",
  ],
  typescript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "extends", "implements", "interface", "type", "new", "import",
    "export", "from", "async", "await", "try", "catch", "finally", "throw",
    "typeof", "public", "private", "readonly", "enum", "as",
  ],
  python: [
    "def", "return", "if", "elif", "else", "for", "while", "class", "import",
    "from", "as", "with", "try", "except", "finally", "raise", "lambda", "None",
    "True", "False", "and", "or", "not", "in", "is", "pass", "yield", "global",
  ],
  html: ["html", "head", "body", "div", "span", "p", "a", "img", "meta", "link", "script", "style"],
  css: ["color", "background", "border", "margin", "padding", "display", "font", "width", "height"],
  json: ["true", "false", "null"],
  shell: ["if", "then", "else", "fi", "for", "do", "done", "while", "echo", "export"],
};

const TOKEN_PATTERN =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*|\s+|.)/g;

interface CodeTheme {
  background: string;
  plain: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
}

const THEMES: Record<string, CodeTheme> = {
  midnight: {
    background: "#0f172a",
    plain: "#e2e8f0",
    keyword: "#7dd3fc",
    string: "#fca5a5",
    number: "#fcd34d",
    comment: "#64748b",
  },
  paper: {
    background: "#f8fafc",
    plain: "#0f172a",
    keyword: "#0369a1",
    string: "#b91c1c",
    number: "#a16207",
    comment: "#64748b",
  },
};

export function CodeView() {
  const t = useImageT();
  const themes = codeThemes(t);
  const [code, setCode] = useState("const answer = 42;\nconsole.log(answer);");
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("midnight");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const palette = THEMES[theme] || THEMES.midnight;
    const keywords = KEYWORDS[language] || KEYWORDS.javascript;

    const lines = code.split("\n");
    const lineHeight = 26;
    const padding = 40;
    const font = "20px 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) return;
    measure.font = font;

    let widest = 0;
    for (const line of lines) {
      const width = measure.measureText(line).width;
      if (width > widest) widest = width;
    }

    canvas.width = Math.max(320, Math.ceil(widest + padding * 2));
    canvas.height = Math.max(120, lines.length * lineHeight + padding * 2);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // The title bar of the picture.
    ctx.fillStyle = theme === "paper" ? "#e2e8f0" : "#1e293b";
    ctx.fillRect(0, 0, canvas.width, 36);
    ctx.fillStyle = theme === "paper" ? "#475569" : "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(language, padding, 24);

    ctx.font = font;
    ctx.textBaseline = "top";
    lines.forEach((line, index) => {
      let x = padding;
      const y = 56 + index * lineHeight;
      const matches = line.match(TOKEN_PATTERN);
      if (!matches) return;
      for (const token of matches) {
        let colour = palette.plain;
        if (/^(\/\*|\/\/|#)/.test(token)) colour = palette.comment;
        else if (/^["'`]/.test(token)) colour = palette.string;
        else if (/^\d/.test(token)) colour = palette.number;
        else if (keywords.indexOf(token) >= 0) colour = palette.keyword;
        ctx.fillStyle = colour;
        ctx.fillText(token, x, y);
        x += measure.measureText(token).width;
      }
    });
  }, [code, language, theme]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!cancelled) await draw();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, "code.png");
  };

  return (
    <Panel title={t("codeTitle")} subtitle={t("codeSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("codeText")}>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-sky-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("codeLanguage")}>
              <Select
                value={language}
                onChange={setLanguage}
                options={CODE_LANGUAGES}
                ariaLabel={t("codeLanguage")}
              />
            </Field>
            <Field label={t("codeTheme")}>
              <Select
                value={theme}
                onChange={setTheme}
                options={themes}
                ariaLabel={t("codeTheme")}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setCode("")}>{t("clear")}</GhostButton>
          </div>
          <Note>{t("codeNote")}</Note>
        </div>
        <div className="flex flex-col items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
          />
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ latex -- */

const LATEX_RESOLUTIONS = [
  { value: "1", label: "1x (600 × 200 px)" },
  { value: "2", label: "2x (1200 × 400 px)" },
  { value: "3", label: "3x (1800 × 600 px)" },
];

export function LatexView() {
  const t = useImageT();
  const [source, setSource] = useState("\\frac{a}{b}");
  const [resolution, setResolution] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const result = useMemo(() => latexToMathml(source), [source]);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = Number(resolution) || 1;
    const width = 600;
    const height = 200;
    const raster = await rasterizeHtml(result.mathml, width, height, scale, {
      fontSize: 44,
    });
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (raster) {
      ctx.drawImage(raster, 0, 0);
      setError(null);
      return;
    }
    // The browser refused to draw the formula: the source is shown instead.
    ctx.fillStyle = "#0f172a";
    ctx.font = "28px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(source || " ", 24, canvas.height / 2);
    setError(t("latexRasterFallback"));
  }, [result, resolution, source, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!cancelled) await draw();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [draw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, "formula.png");
  };

  return (
    <Panel title={t("latexTitle")} subtitle={t("latexSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("latexText")}>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-sky-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
            />
          </Field>
          <Field label={t("latexResolution")}>
            <Select
              value={resolution}
              onChange={setResolution}
              options={LATEX_RESOLUTIONS}
              ariaLabel={t("latexResolution")}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton onClick={() => setSource("")}>{t("clear")}</GhostButton>
          </div>
          {result.unsupported.length ? (
            <ErrorNote>{`${t("latexUnsupported")}: ${result.unsupported.join(", ")}`}</ErrorNote>
          ) : null}
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Note>{t("latexNote")}</Note>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950">
            <div
              className="text-2xl"
              dangerouslySetInnerHTML={{ __html: result.mathml }}
            />
          </div>
          <div className="flex flex-col items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- share card -- */

/**
 * The share card templates. The template names are translated.
 */
function ogTemplates(t: (key: string) => string) {
  return [
    { value: "minimal", label: t("ogTemplateMinimal") },
    { value: "gradient", label: t("ogTemplateGradient") },
    { value: "split", label: t("ogTemplateSplit") },
  ];
}

export function OgImageView({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const t = useImageT();
  const templates = ogTemplates(t);
  const [headline, setHeadline] = useState("A headline for your link");
  const [subline, setSubline] = useState("The subtitle that explains it");
  const [template, setTemplate] = useState("minimal");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (template === "gradient") {
      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(1, "#1d4ed8");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = "#ffffff";
    } else if (template === "split") {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 160, 630);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(60, 260, 40, 110);
      ctx.fillStyle = "#0f172a";
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(80, 90, 90, 8);
    }

    const textX = template === "split" ? 220 : 80;
    const textWidth = template === "split" ? 900 : 1040;

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "700 64px Arial, Helvetica, sans-serif";
    drawWrappedText(ctx, headline || " ", textX, 200, textWidth, 78);

    ctx.font = "400 34px Arial, Helvetica, sans-serif";
    ctx.fillStyle = template === "minimal" ? "#cbd5f5" : template === "gradient" ? "#dbeafe" : "#475569";
    drawWrappedText(ctx, subline || " ", textX, 420, textWidth, 44);

    ctx.font = "500 24px Arial, Helvetica, sans-serif";
    ctx.fillStyle = template === "minimal" ? "#64748b" : "#94a3b8";
    ctx.fillText("digitaltoolpad.com", textX, 560);
  }, [headline, subline, template]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, "open-graph-image.png");
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("ogTitle")}>
            <input
              type="text"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("ogSubtitle")}>
            <input
              type="text"
              value={subline}
              onChange={(event) => setSubline(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("ogTemplate")}>
            <Select
              value={template}
              onChange={setTemplate}
              options={templates}
              ariaLabel={t("ogTemplate")}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton onClick={handleDownload} label={t("downloadImage")} />
            <GhostButton
              onClick={() => {
                setHeadline("");
                setSubline("");
              }}
            >
              {t("clear")}
            </GhostButton>
          </div>
          <Note>{t("ogNote")}</Note>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <canvas
            ref={canvasRef}
            className="max-h-[360px] max-w-full rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
          />
          <p className="mt-2 font-mono text-xs text-slate-500">{t("ogSize")}</p>
        </div>
      </div>
    </Panel>
  );
}
