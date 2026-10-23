"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Download, Sparkles, Copy, QrCode, Barcode } from "lucide-react";

interface QrBarcodeEngineProps {
  slug: string;
}

export function QrBarcodeEngine({ slug }: QrBarcodeEngineProps) {
  const isBarcodeTool = slug.includes("barcode");

  // QR state
  const [qrText, setQrText] = useState("https://www.digitaltoolpad.com");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Barcode state
  const [barcodeText, setBarcodeText] = useState("123456789012");
  const [barcodeFormat, setBarcodeFormat] = useState<"CODE128" | "EAN13" | "UPC" | "CODE39">("CODE128");
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isBarcodeTool) {
      QRCode.toDataURL(qrText || " ", {
        color: {
          dark: fgColor,
          light: transparentBg ? "#00000000" : bgColor,
        },
        errorCorrectionLevel: errorLevel,
        width: 320,
        margin: 2,
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [qrText, fgColor, bgColor, transparentBg, errorLevel, isBarcodeTool]);

  useEffect(() => {
    if (isBarcodeTool && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeText || "123456789", {
          format: barcodeFormat,
          lineColor: "#000000",
          width: 2,
          height: 80,
          displayValue: true,
        });
      } catch (e) {
        // Fallback to code128 if input is invalid for EAN/UPC
        try {
          JsBarcode(barcodeSvgRef.current, barcodeText || "123456789", {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
          });
        } catch {}
      }
    }
  }, [barcodeText, barcodeFormat, isBarcodeTool]);

  const handleDownloadQr = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "qrcode.png";
    a.click();
  };

  const handleDownloadBarcode = () => {
    if (barcodeSvgRef.current) {
      const xml = new XMLSerializer().serializeToString(barcodeSvgRef.current);
      const blob = new Blob([xml], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "barcode.svg";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isBarcodeTool) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Barcode Value / Digits
              </label>
              <input
                type="text"
                value={barcodeText}
                onChange={(e) => setBarcodeText(e.target.value)}
                placeholder="Enter numbers or text..."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Barcode Format
              </label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="CODE128">Code 128 (Universal)</option>
                <option value="EAN13">EAN-13 (13 digits)</option>
                <option value="UPC">UPC (12 digits)</option>
                <option value="CODE39">Code 39 (Alphanumeric)</option>
              </select>
            </div>

            <button
              onClick={handleDownloadBarcode}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Download className="size-3.5" />
              <span>Download Barcode SVG</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800">
            <svg ref={barcodeSvgRef} className="max-w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              QR Code Content (URL, Text, or Wi-Fi)
            </label>
            <textarea
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              rows={4}
              placeholder="https://yourwebsite.com or text..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                QR Code Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="size-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-xs">{fgColor}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Background Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  disabled={transparentBg}
                  className="size-8 rounded border border-slate-300 cursor-pointer disabled:opacity-50"
                />
                <span className="font-mono text-xs">{bgColor}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>Transparent Background</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Error Correction Level
            </label>
            <div className="mt-1 flex gap-2">
              {(["L", "M", "Q", "H"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setErrorLevel(lvl)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    errorLevel === lvl
                      ? "bg-sky-800 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {lvl} ({lvl === "L" ? "7%" : lvl === "M" ? "15%" : lvl === "Q" ? "25%" : "30%"})
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownloadQr}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 shadow-sm"
          >
            <Download className="size-4" />
            <span>Download PNG Image</span>
          </button>
        </div>

        {/* QR Code Preview */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-950">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Generated QR Code"
              className="size-64 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700"
            />
          )}
          <span className="mt-4 text-xs font-medium text-slate-500">
            Scan with any camera or scanner app
          </span>
        </div>
      </div>
    </div>
  );
}
