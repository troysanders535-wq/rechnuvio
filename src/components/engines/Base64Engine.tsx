"use client";

import React, { useState } from "react";
import { Copy, Download, Trash2, Upload, Sparkles, Image as ImageIcon } from "lucide-react";

interface Base64EngineProps {
  slug: string;
}

export function Base64Engine({ slug }: Base64EngineProps) {
  const [textInput, setTextInput] = useState("Hello from Digital ToolPad! 100% Client-Side Privacy.");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(textInput)));
      setOutput(encoded);
      setImagePreview(null);
    } catch (err: any) {
      setOutput(`Error encoding: ${err.message}`);
    }
  };

  const handleDecode = () => {
    try {
      const clean = textInput.trim().replace(/^data:image\/[a-z]+;base64,/, "");
      const decoded = decodeURIComponent(escape(atob(clean)));
      setOutput(decoded);
      // Check if it's an image
      if (textInput.includes("image/") || clean.startsWith("/9j/") || clean.startsWith("iVBOR")) {
        setImagePreview(textInput.startsWith("data:") ? textInput : `data:image/png;base64,${clean}`);
      }
    } catch (err: any) {
      setOutput(`Error decoding: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOutput(result);
        if (file.type.startsWith("image/")) {
          setImagePreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "base64-result.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    handleEncode();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEncode}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <Sparkles className="size-3.5" />
            <span>Encode to Base64</span>
          </button>
          <button
            type="button"
            onClick={handleDecode}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>Decode Base64</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">File to Base64</span>
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTextInput("");
              setOutput("");
              setImagePreview(null);
            }}
            className="rounded p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Input Text or Base64
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={12}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Output
          </div>
          <textarea
            value={output}
            readOnly
            rows={12}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs text-emerald-400 outline-none break-all"
          />

          {imagePreview && (
            <div className="border-t border-slate-800 p-4">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                <ImageIcon className="size-3.5 text-sky-400" /> Image Preview
              </span>
              <img
                src={imagePreview}
                alt="Decoded base64 preview"
                className="max-h-48 rounded-lg border border-slate-800 object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
