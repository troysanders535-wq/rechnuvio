/**
 * The picture effects of the editing tools.
 *
 * Every function works on a canvas and returns a new canvas, so the preview
 * and the export always show the same result.
 */

/** A copy of a canvas. */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return copy;
}

/** A canvas of the given size. */
export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/**
 * Keep only the painted part of a canvas.
 *
 * The mask is white where the region is and transparent everywhere else, so
 * the effect is drawn through the mask.
 */
export function keepMaskedPart(
  effect: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): HTMLCanvasElement {
  const ctx = effect.getContext("2d");
  if (!ctx) return effect;
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  return effect;
}

/** Draw the effect canvas over the source, but only inside the mask. */
export function compositeMasked(
  source: HTMLCanvasElement,
  effect: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): HTMLCanvasElement {
  const out = cloneCanvas(source);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.drawImage(keepMaskedPart(effect, mask), 0, 0);
  return out;
}

/** The picture as a mosaic of blocks of the given size. */
export function pixelate(
  source: HTMLCanvasElement,
  blockSize: number,
): HTMLCanvasElement {
  const block = Math.max(1, Math.round(blockSize));
  const small = makeCanvas(
    Math.max(1, Math.ceil(source.width / block)),
    Math.max(1, Math.ceil(source.height / block)),
  );
  const smallCtx = small.getContext("2d");
  if (!smallCtx) return cloneCanvas(source);
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(source, 0, 0, small.width, small.height);

  const out = makeCanvas(source.width, source.height);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

/** The picture, blurred. */
export function blur(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = makeCanvas(source.width, source.height);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.filter = `blur(${Math.max(0, radius)}px)`;
  ctx.drawImage(source, 0, 0);
  ctx.filter = "none";
  return out;
}

/** The picture, darkened and pixelated: the classic censor bar. */
export function censorBar(
  source: HTMLCanvasElement,
  blockSize: number,
): HTMLCanvasElement {
  const out = pixelate(source, blockSize);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalAlpha = 1;
  return out;
}

/** The average colour of the pixels that touch the painted region. */
export function surroundingColour(
  source: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): [number, number, number] {
  const width = source.width;
  const height = source.height;
  const sourceCtx = source.getContext("2d");
  const maskCtx = mask.getContext("2d");
  if (!sourceCtx || !maskCtx) return [255, 255, 255];

  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const painted = maskCtx.getImageData(0, 0, width, height).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (painted[index + 3] > 8) continue;
      const left = x > 0 ? index - 4 : -1;
      const right = x < width - 1 ? index + 4 : -1;
      const up = y > 0 ? index - width * 4 : -1;
      const down = y < height - 1 ? index + width * 4 : -1;
      const touches =
        (left >= 0 && painted[left + 3] > 8) ||
        (right >= 0 && painted[right + 3] > 8) ||
        (up >= 0 && painted[up + 3] > 8) ||
        (down >= 0 && painted[down + 3] > 8);
      if (!touches) continue;
      r += pixels[index];
      g += pixels[index + 1];
      b += pixels[index + 2];
      count += 1;
    }
  }
  if (!count) return [255, 255, 255];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/**
 * Fill the painted region with the colour of its surroundings.
 *
 * This is a plain colour fill, not a reconstruction of what was behind the
 * region: nothing in this page guesses the hidden picture.
 */
export function fillWithSurroundingColour(
  source: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): HTMLCanvasElement {
  const out = cloneCanvas(source);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  const [r, g, b] = surroundingColour(source, mask);
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return out;

  const painted = maskCtx.getImageData(0, 0, mask.width, mask.height);
  const data = painted.data;
  const colour: [number, number, number] = [r, g, b];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 8) {
      data[i] = colour[0];
      data[i + 1] = colour[1];
      data[i + 2] = colour[2];
      data[i + 3] = 255;
    }
  }
  const paintedCanvas = makeCanvas(mask.width, mask.height);
  const paintedCtx = paintedCanvas.getContext("2d");
  if (!paintedCtx) return out;
  paintedCtx.putImageData(painted, 0, 0);
  ctx.drawImage(paintedCanvas, 0, 0);
  return out;
}

/** The colour of the border of a picture. */
export function borderColour(
  source: HTMLCanvasElement,
): [number, number, number] {
  const ctx = source.getContext("2d");
  if (!ctx) return [255, 255, 255];
  const { width, height } = source;
  const points: [number, number][] = [];
  for (let x = 0; x < width; x += 1) {
    points.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += 1) {
    points.push([0, y], [width - 1, y]);
  }
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    r += pixel[0];
    g += pixel[1];
    b += pixel[2];
  }
  const count = points.length || 1;
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/**
 * Remove the background colour of a picture.
 *
 * The colour of the border is the background, and every pixel that is close
 * to it becomes transparent.
 */
export function removeBackground(
  source: HTMLCanvasElement,
  tolerance: number,
): HTMLCanvasElement {
  const out = cloneCanvas(source);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  const image = ctx.getImageData(0, 0, out.width, out.height);
  const data = image.data;
  const [br, bg, bb] = borderColour(source);
  const limit = Math.max(0, tolerance) * 4.4;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance <= limit) data[i + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

/** Draw a rectangle into a mask. */
export function paintRectangle(
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const ctx = mask.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);
}

/** Draw an ellipse into a mask. */
export function paintEllipse(
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const ctx = mask.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height / 2,
    Math.abs(width / 2),
    Math.abs(height / 2),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/** Draw a soft brush stroke into a mask. */
export function paintBrush(
  mask: HTMLCanvasElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
): void {
  const ctx = mask.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, radius * 2);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}
