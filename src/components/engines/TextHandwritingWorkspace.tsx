"use client";

/**
 * Dedicated workspace for the two handwriting tools.
 *
 * Slugs: handwriting-generator, text-to-handwriting.
 *
 * Typed text is rendered onto a paper canvas with a handwriting font, a
 * seeded letter variation and optional ruled or grid lines. The canvas is
 * exported as a PNG image or embedded into a PDF page. The generator variant
 * additionally offers a freehand drawing pad.
 *
 * Everything happens in the browser: no upload, no server call.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  CopyButton,
  Field,
  Note,
  NumberInput,
  Panel,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

/* ------------------------------------------------------------------ *
 * Pure helpers and data. They contain no user visible interface text,
 * so the i18n codemod never has to touch them.
 * ------------------------------------------------------------------ */

/** Paper size in CSS pixels. */
const PAPER_WIDTH = 1200;
const PAPER_HEIGHT = 1600;

/** Backing store multiplier, so the export stays crisp. */
const SCALE = 2;

/** Page margin in CSS pixels. */
const MARGIN = 80;

/** Freehand pad size in CSS pixels. */
const PAD_WIDTH = 900;
const PAD_HEIGHT = 1200;

/** Shared look of the native colour inputs. */
const COLOUR_INPUT =
  "h-9 w-20 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950";

/**
 * Handwriting and cursive fonts that resolve on a normal desktop without
 * downloading anything. Every stack ends in a generic family, so the
 * browser always has a fallback.
 */
const HANDWRITING_FONTS: { value: string; label: string; stack: string }[] = [
  {
    value: "segoe-script",
    label: "Segoe Script",
    stack: '"Segoe Script", "Bradley Hand", "Brush Script MT", cursive',
  },
  {
    value: "comic-sans",
    label: "Comic Sans MS",
    stack: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
  },
  {
    value: "brush-script",
    label: "Brush Script MT",
    stack: '"Brush Script MT", "Segoe Script", "Brush Script Std", cursive',
  },
  {
    value: "bradley-hand",
    label: "Bradley Hand",
    stack: '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
  },
  {
    value: "segoe-print",
    label: "Segoe Print",
    stack: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  },
  {
    value: "lucida-handwriting",
    label: "Lucida Handwriting",
    stack: '"Lucida Handwriting", "Segoe Script", "Lucida Sans", cursive',
  },
  {
    value: "mv-boli",
    label: "MV Boli",
    stack: '"MV Boli", "Comic Sans MS", "Segoe Print", cursive',
  },
  {
    value: "monotype-corsiva",
    label: "Monotype Corsiva",
    stack: '"Monotype Corsiva", "Palace Script MT", "Times New Roman", cursive',
  },
  {
    value: "palace-script",
    label: "Palace Script MT",
    stack: '"Palace Script MT", "Monotype Corsiva", "Brush Script MT", cursive',
  },
  {
    value: "ink-free",
    label: "Ink Free",
    stack: '"Ink Free", "Segoe Print", "Comic Sans MS", cursive',
  },
  {
    value: "gabriola",
    label: "Gabriola",
    stack: '"Gabriola", "Segoe Script", "Calligraffitti", cursive',
  },
  {
    value: "cursive",
    label: "Cursive",
    stack: '"Comic Sans MS", "Segoe Script", "Brush Script MT", cursive',
  },
];

/**
 * Tiny linear congruential generator. The same seed always produces the
 * same sequence, so the same text always renders the same way.
 */
function createRandom(seed: number): () => number {
  let state = Math.abs(Math.floor(seed)) % 2147483648;
  if (state === 0) state = 1;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** Stable hash of a string, used as the render seed. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Wraps text to the available width. A word that cannot fit on one line is
 * broken at character level, so long words never overflow the paper.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const measure = (value: string) => ctx.measureText(value).width;

  const splitWord = (word: string): string[] => {
    if (measure(word) <= maxWidth) return [word];
    const chunks: string[] = [];
    let chunk = "";
    for (const char of word) {
      if (chunk && measure(chunk + char) > maxWidth) {
        chunks.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      for (const part of splitWord(word)) {
        const candidate = line ? `${line} ${part}` : part;
        if (line && measure(candidate) > maxWidth) {
          lines.push(line);
          line = part;
        } else {
          line = candidate;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

type HandwritingOptions = {
  text: string;
  stack: string;
  size: number;
  spacing: number;
  ink: string;
  paper: string;
  paperType: string;
  seed: number;
};

/** Draws the ruled or grid paper lines. */
function drawPaperLines(
  ctx: CanvasRenderingContext2D,
  options: HandwritingOptions,
): void {
  if (options.paperType === "plain") return;
  ctx.save();
  ctx.strokeStyle = "rgba(120, 160, 210, 0.38)";
  ctx.lineWidth = 1;
  if (options.paperType === "ruled") {
    const step = options.size * 1.7;
    for (let y = MARGIN + options.size; y < PAPER_HEIGHT - 20; y += step) {
      ctx.beginPath();
      ctx.moveTo(30, y + 6);
      ctx.lineTo(PAPER_WIDTH - 30, y + 6);
      ctx.stroke();
    }
  } else {
    for (let y = MARGIN; y < PAPER_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PAPER_WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x < PAPER_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PAPER_HEIGHT);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Renders the text onto the paper canvas. */
function renderHandwriting(
  canvas: HTMLCanvasElement,
  options: HandwritingOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = options.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(SCALE, SCALE);
  drawPaperLines(ctx, options);

  ctx.font = `${options.size}px ${options.stack}`;
  ctx.fillStyle = options.ink;
  ctx.textBaseline = "alphabetic";

  const lines = wrapText(ctx, options.text, PAPER_WIDTH - MARGIN * 2);
  const random = createRandom(options.seed);
  const lineHeight = options.size * 1.7;
  let y = MARGIN + options.size;

  for (const line of lines) {
    let x = MARGIN;
    for (const char of line) {
      const rotation = (random() - 0.5) * 0.08;
      const offsetY = (random() - 0.5) * 6;
      ctx.save();
      ctx.translate(x, y + offsetY);
      ctx.rotate(rotation);
      ctx.fillText(char, 0, 0);
      ctx.restore();
      x += ctx.measureText(char).width + options.spacing;
    }
    y += lineHeight;
  }
}

/** Saves a canvas as a PNG download. */
function saveCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** Saves a canvas as a single page PDF. */
function saveCanvasPdf(
  canvas: HTMLCanvasElement,
  format: "a4" | "letter",
  filename: string,
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format });
  const dataUrl = canvas.toDataURL("image/png");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  doc.addImage(
    dataUrl,
    "PNG",
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
  );
  doc.save(filename);
}

/** Fills a canvas with one colour and resets its transform. */
function clearCanvas(canvas: HTMLCanvasElement, colour: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Sizes the paper canvas and draws the current text onto it. */
function paintPaper(canvas: HTMLCanvasElement, options: HandwritingOptions): void {
  canvas.width = PAPER_WIDTH * SCALE;
  canvas.height = PAPER_HEIGHT * SCALE;
  renderHandwriting(canvas, options);
}

/** Sizes the freehand pad and fills it with the paper colour. */
function paintPad(canvas: HTMLCanvasElement, colour: string): void {
  canvas.width = PAD_WIDTH * SCALE;
  canvas.height = PAD_HEIGHT * SCALE;
  clearCanvas(canvas, colour);
}

type PadPoint = { x: number; y: number };

/** Maps a pointer event to canvas pixel coordinates. */
function padPoint(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>,
): PadPoint | null {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

/** Draws one segment of a freehand stroke. */
function strokeSegment(
  ctx: CanvasRenderingContext2D,
  from: PadPoint,
  to: PadPoint,
  ink: string,
  width: number,
): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/** Character, word and line counts of the input. */
function textStats(value: string): {
  characters: number;
  words: number;
  lines: number;
} {
  const trimmed = value.trim();
  return {
    characters: value.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: value ? value.split("\n").length : 0,
  };
}

/* ------------------------------------------------------------------ */

export function TextHandwritingWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextHandwritingWorkspace");
  const isGenerator = slug === "handwriting-generator";

  const [text, setText] = useState("");
  const [font, setFont] = useState("segoe-script");
  const [ink, setInk] = useState("#1f2937");
  const [paper, setPaper] = useState("#ffffff");
  const [paperType, setPaperType] = useState(isGenerator ? "plain" : "ruled");
  const [size, setSize] = useState(34);
  const [spacing, setSpacing] = useState(6);
  const [pageSize, setPageSize] = useState("a4");
  const [variation, setVariation] = useState(0);
  const [brush, setBrush] = useState(6);
  const [brushInk, setBrushInk] = useState("#1f2937");
  const [padOpen, setPadOpen] = useState(isGenerator);

  const paperRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const stack =
    HANDWRITING_FONTS.find((entry) => entry.value === font)?.stack ??
    HANDWRITING_FONTS[0].stack;

  const seed = (hashString(text) + variation * 7919) >>> 0;

  /* Render the paper whenever the inputs change. */
  useEffect(() => {
    const canvas = paperRef.current;
    if (!canvas) return;
    paintPaper(canvas, {
      text,
      stack,
      size,
      spacing,
      ink,
      paper,
      paperType,
      seed,
    });
  }, [text, stack, size, spacing, ink, paper, paperType, seed]);

  /* Prepare the freehand pad. */
  useEffect(() => {
    const canvas = padRef.current;
    if (!canvas) return;
    paintPad(canvas, paper);
  }, [paper, padOpen]);

  const startStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = padRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const point = padPoint(canvas, event);
      if (!point) return;
      drawingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      strokeSegment(
        ctx,
        point,
        { x: point.x + 0.01, y: point.y },
        brushInk,
        brush * SCALE,
      );
    },
    [brush, brushInk],
  );

  const moveStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = padRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const point = padPoint(canvas, event);
      if (!point) return;
      strokeSegment(ctx, point, point, brushInk, brush * SCALE);
    },
    [brush, brushInk],
  );

  const stats = useMemo(() => textStats(text), [text]);

  const fontOptions = HANDWRITING_FONTS.map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));

  const paperOptions = [
    { value: "plain", label: tUi("plain") },
    { value: "ruled", label: tUi("ruled") },
    { value: "grid", label: tUi("grid") },
  ];

  const pageOptions = [
    { value: "a4", label: "A4" },
    { value: "letter", label: tUi("letter") },
  ];

    return (
    <Panel>
      <Toolbar>
        <SectionTitle>
          {isGenerator ? tUi("handwritingGenerator") : tUi("textToHandwriting")}
        </SectionTitle>
        <ButtonGroup>
          <ActionButton onClick={() => setVariation((value) => value + 1)}>
            {tUi("newVariation")}
          </ActionButton>
          <CopyButton value={text} label={tUi("copyText")} />
          <ActionButton onClick={() => setText("")}>{tUi("clear")}</ActionButton>
        </ButtonGroup>
      </Toolbar>

      <div className="space-y-4 p-4">
        <Field label={tUi("textToWriteByHand")} htmlFor="hw-text">
          <TextArea
            id="hw-text"
            value={text}
            onChange={setText}
            rows={6}
            mono={false}
            placeholder={tUi("typeTheTextToWriteByHand")}
          />
        </Field>

        <TwoColumn>
          <Field label={tUi("handwritingFont")} htmlFor="hw-font">
            <SelectInput
              id="hw-font"
              value={font}
              onChange={setFont}
              options={fontOptions}
            />
          </Field>
          <Field label={tUi("inkColour")} htmlFor="hw-ink">
            <input
              id="hw-ink"
              type="color"
              value={ink}
              onChange={(event) => setInk(event.target.value)}
              className={COLOUR_INPUT}
            />
          </Field>
        </TwoColumn>

        <TwoColumn>
          <Field label={tUi("paperColour")} htmlFor="hw-paper">
            <input
              id="hw-paper"
              type="color"
              value={paper}
              onChange={(event) => setPaper(event.target.value)}
              className={COLOUR_INPUT}
            />
          </Field>
          <Field label={tUi("paperType")} htmlFor="hw-paper-type">
            <SelectInput
              id="hw-paper-type"
              value={paperType}
              onChange={setPaperType}
              options={paperOptions}
            />
          </Field>
        </TwoColumn>

        <TwoColumn>
          <Field label={tUi("letterSize")} htmlFor="hw-size">
            <NumberInput
              id="hw-size"
              value={size}
              onChange={setSize}
              min={12}
              max={96}
            />
          </Field>
          <Field label={tUi("letterSpacing")} htmlFor="hw-spacing">
            <NumberInput
              id="hw-spacing"
              value={spacing}
              onChange={setSpacing}
              min={0}
              max={40}
            />
          </Field>
        </TwoColumn>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label={tUi("pageSize")} htmlFor="hw-page">
              <SelectInput
                id="hw-page"
                value={pageSize}
                onChange={setPageSize}
                options={pageOptions}
              />
            </Field>
          </div>
          <ButtonGroup>
            <ActionButton
              onClick={() => {
                const canvas = paperRef.current;
                if (canvas) saveCanvasPng(canvas, "handwriting.png");
              }}
              variant="primary"
            >
              {tUi("downloadPNG")}
            </ActionButton>
            <ActionButton
              onClick={() => {
                const canvas = paperRef.current;
                if (!canvas) return;
                saveCanvasPdf(
                  canvas,
                  pageSize === "letter" ? "letter" : "a4",
                  "handwriting.pdf",
                );
              }}
            >
              {tUi("downloadPDF")}
            </ActionButton>
          </ButtonGroup>
        </div>
      </div>

      <StatGrid>
        <StatCard value={stats.characters} label={tUi("characters")} />
        <StatCard value={stats.words} label={tUi("words")} />
        <StatCard value={stats.lines} label={tUi("lines")} />
        <StatCard value={paperType} label={tUi("paper")} tone="good" />
      </StatGrid>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <SectionTitle>{tUi("preview")}</SectionTitle>
        <canvas
          ref={paperRef}
          width={PAPER_WIDTH * SCALE}
          height={PAPER_HEIGHT * SCALE}
          className="mt-2 w-full max-w-lg rounded-xl border border-slate-200 bg-white dark:border-slate-800"
        />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <Toolbar>
          <SectionTitle>{tUi("freehandPad")}</SectionTitle>
          <ButtonGroup>
            <ActionButton
              onClick={() => {
                const canvas = padRef.current;
                if (canvas) saveCanvasPng(canvas, "handwriting-drawing.png");
              }}
            >
              {tUi("saveAsPNG")}
            </ActionButton>
            <ActionButton
              onClick={() => {
                const canvas = padRef.current;
                if (canvas) clearCanvas(canvas, paper);
              }}
            >
              {tUi("clear")}
            </ActionButton>
            {!isGenerator && (
              <ActionButton
                onClick={() => setPadOpen((value) => !value)}
                variant={padOpen ? "primary" : "default"}
              >
                {padOpen ? tUi("hidePad") : tUi("showPad")}
              </ActionButton>
            )}
          </ButtonGroup>
        </Toolbar>
        {(isGenerator || padOpen) && (
          <div className="p-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div className="w-32">
                <Field label={tUi("brushSize")} htmlFor="hw-brush">
                  <NumberInput
                    id="hw-brush"
                    value={brush}
                    onChange={setBrush}
                    min={1}
                    max={60}
                  />
                </Field>
              </div>
              <Field label={tUi("penColour")} htmlFor="hw-brush-ink">
                <input
                  id="hw-brush-ink"
                  type="color"
                  value={brushInk}
                  onChange={(event) => setBrushInk(event.target.value)}
                  className={COLOUR_INPUT}
                />
              </Field>
            </div>
            <canvas
              ref={padRef}
              width={PAD_WIDTH * SCALE}
              height={PAD_HEIGHT * SCALE}
              onPointerDown={startStroke}
              onPointerMove={moveStroke}
              onPointerUp={() => {
                drawingRef.current = false;
              }}
              onPointerLeave={() => {
                drawingRef.current = false;
              }}
              onPointerCancel={() => {
                drawingRef.current = false;
              }}
              style={{ cursor: "crosshair", touchAction: "none" }}
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white dark:border-slate-800"
            />
          </div>
        )}
      </div>

      <Note>{tUi("pageDrawnInBrowserNote")}</Note>
      {isGenerator ? (
        <Note>{tUi("generatorHintNote")}</Note>
      ) : (
        <Note>{tUi("converterHintNote")}</Note>
      )}
    </Panel>
  );
}
