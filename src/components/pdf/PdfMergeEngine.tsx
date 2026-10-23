"use client";

import { useState } from "react";
import {
  ActionButton,
  DropZone,
  FileList,
  Status,
  Workspace,
  baseName,
  downloadBytes,
} from "./shared";
import { PasswordRequiredError, createPdfDoc, loadPdfDoc } from "./pdfLib";

export function PdfMergeEngine() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function move(index: number, delta: number) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleMerge() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const merged = await createPdfDoc();
      let total = 0;

      for (const file of files) {
        const src = await loadPdfDoc(await file.arrayBuffer(), password || undefined);
        const indices = src.getPageIndices();
        const pages = await merged.copyPages(src, indices);
        pages.forEach((page) => merged.addPage(page));
        total += indices.length;
      }

      if (!total) throw new Error("The selected files contain no pages.");

      const bytes = await merged.save();
      downloadBytes(bytes, "merged-document.pdf");
      setInfo(`Merged ${files.length} file(s) into ${total} pages.`);
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError("This PDF is password protected. Enter the password and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Could not merge the files.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      title="Merge PDF Files"
      description="Combine several PDFs into one document, in the order you set."
    >
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        label="Choose PDF files"
        hint="Add two or more .pdf files. Everything runs in your browser."
        onFiles={(list) => {
          setFiles((prev) => [...prev, ...list]);
          setError(null);
        }}
        disabled={busy}
      />

      {files.length ? (
        <>
          <ul className="mt-4 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  <span className="mr-2 text-slate-400 dark:text-slate-500">
                    {i + 1}.
                  </span>
                  {file.name}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${file.name} up`}
                    onClick={() => move(i, -1)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${file.name} down`}
                    onClick={() => move(i, 1)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                    disabled={i === files.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                    className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {showPassword ? (
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                PDF password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password for the protected file"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <ActionButton onClick={handleMerge} busy={busy} disabled={files.length < 2}>
              Merge {files.length} PDF{files.length === 1 ? "" : "s"}
            </ActionButton>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setError(null);
                setInfo(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
        </>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
