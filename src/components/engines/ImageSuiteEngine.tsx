"use client";

import React, { useState, useRef } from "react";
import { Download, Upload, Sparkles, Image as ImageIcon, Sliders } from "lucide-react";

interface ImageSuiteEngineProps {
  slug: string;
}

export function ImageSuiteEngine({ slug }: ImageSuiteEngineProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [quality, setQuality] = useState(90);
  const [blurVal, setBlurVal] = useState(0);
  const [brightnessVal, setBrightnessVal] = useState(100);
  const [grayscaleVal, setGrayscaleVal] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setOriginalDims({ width: img.width, height: img.height });
          setWidth(img.width);
          setHeight(img.height);
          setImageSrc(src);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (newW: number) => {
    setWidth(newW);
    if (lockAspect && originalDims.width > 0) {
      const ratio = originalDims.height / originalDims.width;
      setHeight(Math.round(newW * ratio));
    }
  };

  const handleHeightChange = (newH: number) => {
    setHeight(newH);
    if (lockAspect && originalDims.height > 0) {
      const ratio = originalDims.width / originalDims.height;
      setWidth(Math.round(newH * ratio));
    }
  };

  const handleDownload = () => {
    if (!imageSrc) return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = `blur(${blurVal}px) brightness(${brightnessVal}%) grayscale(${grayscaleVal}%)`;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
      const dataUrl = canvas.toDataURL(format, quality / 100);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `processed-image.${ext}`;
      a.click();
    };
    img.src = imageSrc;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
      {!imageSrc ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <ImageIcon className="size-12 text-sky-700 dark:text-sky-400" />
          <h4 className="mt-3 font-bold text-base text-slate-800 dark:text-slate-200">
            Upload an Image to Resize or Convert
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Supports PNG, JPG, WebP, AVIF, SVG, BMP, TIFF. Processed in your browser.
          </p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700">
            <Upload className="size-4" />
            <span>Choose Image</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="size-4 text-sky-700" /> Dimensions
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Width (px)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Height (px)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => setLockAspect(e.target.checked)}
                  className="rounded accent-sky-700"
                />
                <span>Lock aspect ratio</span>
              </label>
            </div>

            {/* Format & Quality */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="image/png">PNG (Lossless, Transparency)</option>
                <option value="image/jpeg">JPG / JPEG (Compact)</option>
                <option value="image/webp">WebP (Next-Gen High Compression)</option>
              </select>
            </div>

            {/* Filter Adjustments */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Visual Filters
              </span>
              <div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Brightness</span>
                  <span>{brightnessVal}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={brightnessVal}
                  onChange={(e) => setBrightnessVal(Number(e.target.value))}
                  className="w-full accent-sky-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Blur</span>
                  <span>{blurVal}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={blurVal}
                  onChange={(e) => setBlurVal(Number(e.target.value))}
                  className="w-full accent-sky-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Grayscale</span>
                  <span>{grayscaleVal}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={grayscaleVal}
                  onChange={(e) => setGrayscaleVal(Number(e.target.value))}
                  className="w-full accent-sky-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                <Download className="size-4" />
                <span>Download Image</span>
              </button>
              <button
                onClick={() => setImageSrc(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
              >
                New
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={imageSrc}
              alt="Live preview"
              style={{
                filter: `blur(${blurVal}px) brightness(${brightnessVal}%) grayscale(${grayscaleVal}%)`,
                maxHeight: "400px",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              className="rounded-xl border border-slate-200 shadow-md dark:border-slate-700"
            />
            <span className="mt-3 text-xs text-slate-500 font-mono">
              Output: {width} × {height} px • Format: {format.replace("image/", "").toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
