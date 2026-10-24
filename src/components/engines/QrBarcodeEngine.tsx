"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Download, Copy, QrCode, Barcode } from "lucide-react";
import { useTranslations } from "next-intl";

interface QrBarcodeEngineProps {
  slug: string;
}

/**
 * The engine serves eleven tools. The dispatch is an explicit table: a slug
 * that merely contains the word "barcode" is not the same tool as the bulk
 * generator or as the ISBN generator.
 */
type Mode = "qr" | "single" | "bulk" | "isbn";

const MODE_BY_SLUG: Record<string, Mode> = {
  "qr-code-generator": "qr",
  "url-to-qr-code": "qr",
  "transparent-qr-code-generator": "qr",
  "wifi-qr-code-generator": "qr",
  "barcode-generator": "single",
  "ean-13-barcode-generator": "single",
  "upc-barcode-generator": "single",
  "code-128-barcode-generator": "single",
  "code-39-barcode-generator": "single",
  "isbn-barcode-generator": "isbn",
  "bulk-barcode-generator": "bulk",
};

type BarcodeFormat = "CODE128" | "EAN13" | "UPC" | "CODE39";

/**
 * Convert an ISBN-10 into its ISBN-13 form.
 *
 * The ISBN-10 check digit is verified first (the weighted sum of the ten
 * digits has to be a multiple of eleven). The body of the ISBN-13 is the
 * "978" prefix followed by the first nine digits, and the check digit follows
 * the modulo 10 rule of the ISBN / EAN-13 standard.
 *
 * Returns null when the input is not a valid ISBN-10.
 */
export function isbn10To13(value: string): string | null {
  const digits = (value || "").replace(/[^0-9Xx]/g, "");
  if (digits.length !== 10) return null;

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const char = digits[i];
    const digit = char === "X" || char === "x" ? 10 : Number(char);
    if (Number.isNaN(digit)) return null;
    sum += digit * (10 - i);
  }
  if (sum % 11 !== 0) return null;

  const body = `978${digits.slice(0, 9)}`;
  let weighted = 0;
  for (let i = 0; i < 12; i += 1) {
    weighted += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return `${body}${(10 - (weighted % 10)) % 10}`;
}

/** The check digit of an ISBN-13, or null when the number is not valid. */
function isbn13CheckDigit(value: string): number | null {
  const digits = (value || "").replace(/[^0-9]/g, "");
  if (digits.length !== 13) return null;
  let weighted = 0;
  for (let i = 0; i < 12; i += 1) {
    weighted += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (weighted % 10)) % 10;
}

export function QrBarcodeEngine({ slug }: QrBarcodeEngineProps) {
  const tUi = useTranslations("ui.engines.QrBarcodeEngine");
  const mode: Mode = MODE_BY_SLUG[slug] ?? "qr";
  const isBarcodeTool = mode !== "qr";

  // QR state
  const [qrText, setQrText] = useState("https://rechnuvio.de");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Barcode state
  const [barcodeText, setBarcodeText] = useState(
    mode === "isbn" ? "9780306406157" : "123456789012",
  );
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(
    mode === "isbn" ? "EAN13" : "CODE128",
  );
  const barcodeRefs = useRef<Array<SVGSVGElement | null>>([]);

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

  /* --------------------------------------------------------- barcode values -- */

  const rawValues = React.useMemo(() => {
    if (mode !== "bulk") return [barcodeText];
    return barcodeText
      .split(/[,;\n]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }, [mode, barcodeText]);

  /** The ISBN note of the ISBN tool: the converted number or the reason. */
  const isbnResult = React.useMemo(() => {
    if (mode !== "isbn") return null;
    const raw = (barcodeText || "").replace(/[^0-9Xx]/g, "");
    if (!raw) return { ok: false, reason: "empty" as const };
    if (raw.length === 10) {
      const converted = isbn10To13(raw);
      if (!converted) return { ok: false, reason: "invalid" as const };
      return { ok: true, value: converted };
    }
    if (raw.length === 13) {
      const expected = isbn13CheckDigit(raw);
      if (expected === null || expected !== Number(raw[12])) {
        return { ok: false, reason: "invalid" as const };
      }
      return { ok: true, value: raw };
    }
    return { ok: false, reason: "invalid" as const };
  }, [mode, barcodeText]);

  const encodedValues = React.useMemo(() => {
    if (mode !== "isbn") return rawValues;
    if (!isbnResult || !isbnResult.ok) return rawValues;
    return [isbnResult.value];
  }, [mode, rawValues, isbnResult]);

  useEffect(() => {
    encodedValues.forEach((value, index) => {
      const element = barcodeRefs.current[index];
      if (!element) return;
      const options = {
        format: barcodeFormat,
        lineColor: "#000000",
        width: 2,
        height: 80,
        displayValue: true,
      };
      try {
        JsBarcode(element, value || "0", options);
      } catch (err) {
        // A value that does not fit the chosen symbology is still worth
        // showing: it is drawn as a Code 128 symbol and the note below the
        // symbol explains what happened.
        try {
          JsBarcode(element, value || "0", { ...options, format: "CODE128" });
        } catch {}
      }
    });
  }, [encodedValues, barcodeFormat]);

  /* ------------------------------------------------------------------ actions -- */

  const handleDownloadQr = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "qrcode.png";
    a.click();
  };

  const handleDownloadBarcode = () => {
    const symbols = barcodeRefs.current.filter(Boolean) as SVGSVGElement[];
    if (!symbols.length) return;

    let xml: string;
    if (symbols.length === 1) {
      xml = new XMLSerializer().serializeToString(symbols[0]);
    } else {
      // Several symbols in one file: they are placed one under the other.
      const parts = symbols.map((symbol) => {
        const copy = symbol.cloneNode(true) as SVGSVGElement;
        copy.removeAttribute("style");
        copy.removeAttribute("class");
        return new XMLSerializer().serializeToString(copy);
      });
      const width = Math.max(...symbols.map((s) => Number(s.getAttribute("width")) || 0));
      const height = symbols.reduce(
        (sum, symbol) => sum + (Number(symbol.getAttribute("height")) || 0),
        0,
      );
      xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
    }

    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "barcode.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------------------------------------------ render -- */

  if (isBarcodeTool) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mode === "isbn"
                  ? tUi("isbnNumberLabel")
                  : mode === "bulk"
                    ? tUi("bulkValuesLabel")
                    : tUi("barcodeValueDigits")}
              </label>
              <input
                type="text"
                value={barcodeText}
                onChange={(e) => setBarcodeText(e.target.value)}
                placeholder={tUi("enterNumbersOrText")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {mode === "bulk" ? (
                <p className="mt-1 text-[11px] text-slate-500">{tUi("bulkHint")}</p>
              ) : null}
              {mode === "isbn" ? (
                <p
                  className={`mt-1 text-[11px] ${
                    isbnResult && isbnResult.ok
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isbnResult && isbnResult.ok
                    ? `${tUi("isbnConvertedTo")} ${isbnResult.value}`
                    : isbnResult && isbnResult.reason === "empty"
                      ? tUi("isbnEmpty")
                      : tUi("isbnInvalid")}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tUi("barcodeFormat")}
              </label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="CODE128">{tUi("code128Universal")}</option>
                <option value="EAN13">{tUi("eAN1313Digits")}</option>
                <option value="UPC">{tUi("uPC12Digits")}</option>
                <option value="CODE39">{tUi("code39Alphanumeric")}</option>
              </select>
            </div>

            <button
              onClick={handleDownloadBarcode}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Download className="size-3.5" />
              <span>{tUi("downloadBarcodeSVG")}</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800">
            {encodedValues.length === 0 ? (
              <p className="text-xs text-slate-500">{tUi("bulkNoValues")}</p>
            ) : (
              encodedValues.map((value, index) => (
                <svg
                  key={`${value}-${index}`}
                  ref={(element) => {
                    barcodeRefs.current[index] = element;
                  }}
                  className="max-w-full"
                />
              ))
            )}
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
              {tUi("qRCodeContentURLTextOrWiFi")}
            </label>
            <textarea
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              rows={4}
              placeholder={tUi("qrContentPlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tUi("qRCodeColor")}
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
                {tUi("backgroundColor")}
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
              <span>{tUi("transparentBackground")}</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("errorCorrectionLevel")}
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
            <span>{tUi("downloadPNGImage")}</span>
          </button>
        </div>

        {/* QR Code Preview */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-950">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={tUi("generatedQRCode")}
              className="size-64 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700"
            />
          )}
          <span className="mt-4 text-xs font-medium text-slate-500">
            {tUi("scanWithAnyCameraOrScannerApp")}
          </span>
        </div>
      </div>
    </div>
  );
}
