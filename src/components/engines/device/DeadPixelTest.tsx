"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize2, ScanSearch } from "lucide-react";
import { DevicePanel, deviceButtonClass, deviceGhostButtonClass } from "./kit";

const COLOURS = ["black", "white", "red", "green", "blue"] as const;

const RGB: Record<(typeof COLOURS)[number], string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
};

const GRID = 16;

/**
 * The size of the loupe in pixels.
 *
 * The loupe draws the grid of the colour field. The zoom magnifies the
 * pixels of that grid: the loupe is drawn in the resolution of the zoom, so
 * the magnified pixels stay sharp instead of being stretched.
 */
const loupeSize = (zoom: number) => 20 * zoom;

/**
 * The test of a dead pixel.
 *
 * The panel shows the five colour fields a display is tested with and a
 * loupe that magnifies the pixels under the pointer.
 */
export function DeadPixelTest() {
  const t = useTranslations("ui.engines.device");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const [colour, setColour] = useState<(typeof COLOURS)[number]>("black");
  const [zoom, setZoom] = useState(8);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const size = loupeSize(zoom);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const cell = size / GRID;
    context.fillStyle = RGB[colour];
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgba(148, 163, 184, 0.45)";
    context.lineWidth = 1;
    for (let index = 0; index <= GRID; index += 1) {
      context.beginPath();
      context.moveTo(index * cell, 0);
      context.lineTo(index * cell, size);
      context.stroke();
      context.beginPath();
      context.moveTo(0, index * cell);
      context.lineTo(size, index * cell);
      context.stroke();
    }

    if (pointer) {
      const column = Math.min(GRID - 1, Math.floor((pointer.x / 100) * GRID));
      const row = Math.min(GRID - 1, Math.floor((pointer.y / 100) * GRID));
      context.strokeStyle = "#f97316";
      context.lineWidth = 2;
      context.strokeRect(column * cell, row * cell, cell, cell);
    }
  }, [colour, zoom, pointer]);

  const toggleFullscreen = () => {
    const area = areaRef.current;
    if (!area) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    area.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <DevicePanel title={t("deadPixel.title")} subtitle={t("deadPixel.subtitle")}>
      <div className="flex flex-wrap gap-2">
        {COLOURS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setColour(name)}
            aria-label={t(`deadPixel.colours.${name}`)}
            className={`${deviceGhostButtonClass} ${
              colour === name ? "ring-2 ring-sky-500" : ""
            }`}
          >
            <span
              className="size-4 rounded border border-slate-300"
              style={{ backgroundColor: RGB[name] }}
            />
            {t(`deadPixel.colours.${name}`)}
          </button>
        ))}
        <button type="button" onClick={toggleFullscreen} className={deviceButtonClass}>
          <Maximize2 className="size-3.5" />
          {t("deadPixel.fullscreen")}
        </button>
      </div>

      <div
        ref={areaRef}
        className="flex h-64 items-center justify-center rounded-2xl border border-slate-200"
        style={{ backgroundColor: RGB[colour] }}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setPointer({
            x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
          });
        }}
        onMouseLeave={() => setPointer(null)}
      >
        <span
          className="rounded-lg px-3 py-1 font-mono text-xs font-bold"
          style={{ color: colour === "white" ? "#0f172a" : "#f8fafc" }}
        >
          {t("deadPixel.currentColour", { colour: t(`deadPixel.colours.${colour}`) })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("deadPixel.zoom")} {zoom}x
        </label>
        <input
          id="dead-pixel-zoom"
          type="range"
          min={2}
          max={16}
          step={1}
          value={zoom}
          onChange={(event) => setZoom(parseInt(event.target.value, 10) || 8)}
          className="w-48"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          style={{ width: `${loupeSize(zoom)}px`, height: `${loupeSize(zoom)}px` }}
          className="shrink-0 rounded-xl border border-slate-300"
        />
        <p className="flex max-w-sm items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <ScanSearch className="mt-0.5 size-4 shrink-0" />
          {t("deadPixel.hint")}
        </p>
      </div>
    </DevicePanel>
  );
}
