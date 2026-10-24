"use client";

/**
 * Rasterising a piece of markup into a canvas.
 *
 * The browser draws the markup inside an SVG foreign object and the canvas
 * takes the picture from there. Everything stays in the browser: no picture is
 * uploaded anywhere.
 */

import { loadImage } from "./kit";
import { makeCanvas } from "./fx";

export async function rasterizeHtml(
  html: string,
  width: number,
  height: number,
  scale: number,
  options: { fontSize?: number; color?: string; background?: string } = {},
): Promise<HTMLCanvasElement | null> {
  const fontSize = options.fontSize ?? 42;
  const color = options.color ?? "#0f172a";
  const background = options.background ?? "#ffffff";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject x="0" y="0" width="${width}" height="${height}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;background:${background};color:${color};font-size:${fontSize}px;font-family:Georgia, 'Times New Roman', serif;">`,
    html,
    "</div></foreignObject></svg>",
  ].join("");

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch {
    return null;
  }

  const canvas = makeCanvas(width * scale, height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // A foreign object that the browser refused to draw leaves an empty canvas.
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return canvas;
  }
  return null;
}
