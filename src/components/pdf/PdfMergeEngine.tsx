"use client";

import { useRef, useState } from "react";
import type { PDFDocument } from "@cantoo/pdf-lib";
import {
  ActionButton,
  DropZone,
  Status,
  Workspace,
  downloadBytes,
} from "./shared";
import { PasswordRequiredError, createPdfDoc, loadPdfDoc } from "./pdfLib";
import { useTranslations } from "next-intl";

/**
 * The two editors of the merge tool.
 *
 * "files" moves whole documents around, "pages" moves single pages of the
 * documents around.
 */
export type PdfMergeMode = "files" | "pages";

/** One document of the merge. */
type MergeFile = {
  id: string;
  file: File;
  /** the number of pages of the document, null while it is being read */
  pageCount: number | null;
};

/** One page of the merge: a page of one of the documents. */
type MergePage = {
  id: string;
  fileId: string;
  /** the page inside the document, counted from zero */
  index: number;
};

type MergeState = {
  files: MergeFile[];
  pages: MergePage[];
};

/**
 * Puts the pages back into the order of the documents.
 *
 * A document that moves up or down takes its pages with it, so the page list
 * never contradicts the list of documents.
 */
function groupPagesByFile(pages: MergePage[], files: MergeFile[]): MergePage[] {
  const byFile = new Map<string, MergePage[]>();
  for (const page of pages) {
    const list = byFile.get(page.fileId);
    if (list) list.push(page);
    else byFile.set(page.fileId, [page]);
  }

  const out: MergePage[] = [];
  for (const file of files) {
    const list = byFile.get(file.id);
    if (list) out.push(...list);
  }
  return out;
}

export function PdfMergeEngine({ mode = "files" }: { mode?: PdfMergeMode }) {
  const tUi = useTranslations("ui.pdf.PdfMergeEngine");
  const [state, setState] = useState<MergeState>({ files: [], pages: [] });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const counter = useRef(0);

  function nextFileId(): string {
    counter.current += 1;
    return `f${counter.current}`;
  }

  /**
   * Adds documents to the merge.
   *
   * In the page editor the pages of every document are read right away, so
   * the list of pages can be shown before anything is merged.
   */
  async function addFiles(list: File[]) {
    setError(null);
    setInfo(null);

    if (mode === "files") {
      const added: MergeFile[] = list.map((file) => ({
        id: nextFileId(),
        file,
        pageCount: null,
      }));
      setState((prev) => ({ ...prev, files: [...prev.files, ...added] }));
      return;
    }

    setBusy(true);
    const files: MergeFile[] = [];
    const pages: MergePage[] = [];
    for (const file of list) {
      try {
        const doc = await loadPdfDoc(await file.arrayBuffer(), password || undefined);
        const id = nextFileId();
        const count = doc.getPageCount();
        files.push({ id, file, pageCount: count });
        for (let index = 0; index < count; index += 1) {
          pages.push({ id: `${id}-${index}`, fileId: id, index });
        }
      } catch (err) {
        if (err instanceof PasswordRequiredError) {
          setShowPassword(true);
          setError(tUi("thisPDFIsPasswordProtectedEnterThePasswordAndTryAgain"));
        } else {
          setError(err instanceof Error ? err.message : tUi("couldNotMergeTheFiles"));
        }
      }
    }
    setState((prev) => ({
      files: [...prev.files, ...files],
      pages: [...prev.pages, ...pages],
    }));
    setBusy(false);
  }

  function moveFile(index: number, delta: number) {
    setState((prev) => {
      const files = [...prev.files];
      const target = index + delta;
      if (target < 0 || target >= files.length) return prev;
      const [moved] = files.splice(index, 1);
      files.splice(target, 0, moved);
      return { files, pages: groupPagesByFile(prev.pages, files) };
    });
  }

  function removeFile(index: number) {
    setState((prev) => {
      const files = prev.files.filter((_, i) => i !== index);
      const removedId = prev.files[index]?.id;
      const pages = prev.pages.filter((page) => page.fileId !== removedId);
      return { files, pages };
    });
  }

  function movePage(index: number, delta: number) {
    setState((prev) => {
      const pages = [...prev.pages];
      const target = index + delta;
      if (target < 0 || target >= pages.length) return prev;
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { ...prev, pages };
    });
  }

  function removePage(index: number) {
    setState((prev) => ({
      ...prev,
      pages: prev.pages.filter((_, i) => i !== index),
    }));
  }

  async function handleMerge() {
    if (!state.files.length) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const merged = await createPdfDoc();
      let total = 0;

      if (mode === "pages") {
        // Every document is read once, then the pages that are left are
        // copied one by one, in the order the list shows them.
        const sources = new Map<string, PDFDocument>();
        for (const page of state.pages) {
          const entry = state.files.find((file) => file.id === page.fileId);
          if (!entry) continue;
          let src = sources.get(entry.id);
          if (!src) {
            src = await loadPdfDoc(
              await entry.file.arrayBuffer(),
              password || undefined,
            );
            sources.set(entry.id, src);
          }
          const [copied] = await merged.copyPages(src, [page.index]);
          merged.addPage(copied);
          total += 1;
        }
      } else {
        for (const entry of state.files) {
          const src = await loadPdfDoc(
            await entry.file.arrayBuffer(),
            password || undefined,
          );
          const indices = src.getPageIndices();
          const pages = await merged.copyPages(src, indices);
          pages.forEach((page) => merged.addPage(page));
          total += indices.length;
        }
      }

      if (!total) throw new Error(tUi("theSelectedFilesContainNoPages"));

      const bytes = await merged.save();
      downloadBytes(bytes, "merged-document.pdf");
      setInfo(
        mode === "pages"
          ? tUi("mergedPagesIntoOneDocument", { count: total })
          : tUi("mergedFilesIntoOneDocument", {
              files: state.files.length,
              pages: total,
            }),
      );
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setShowPassword(true);
        setError(tUi("thisPDFIsPasswordProtectedEnterThePasswordAndTryAgain"));
      } else {
        setError(err instanceof Error ? err.message : tUi("couldNotMergeTheFiles"));
      }
    } finally {
      setBusy(false);
    }
  }

  const { files, pages } = state;

  return (
    <Workspace
      title={tUi("mergePDFFiles")}
      description={tUi("combineSeveralPDFsIntoOneDocumentInTheOrderYouSet")}
    >
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        label={tUi("choosePDFFiles")}
        hint={tUi("addTwoOrMorePdfFilesEverythingRunsInYourBrowser")}
        onFiles={(list) => void addFiles(list)}
        disabled={busy}
      />

      {files.length ? (
        <>
          <ul className="mt-4 space-y-2">
            {files.map((entry, i) => (
              <li
                key={entry.id}
                data-testid="merge-file-item"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  <span className="mr-2 text-slate-400 dark:text-slate-500">
                    {i + 1}.
                  </span>
                  {entry.file.name}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    data-testid="merge-file-up"
                    aria-label={`Move ${entry.file.name} up`}
                    onClick={() => moveFile(i, -1)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    data-testid="merge-file-down"
                    aria-label={`Move ${entry.file.name} down`}
                    onClick={() => moveFile(i, 1)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                    disabled={i === files.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    data-testid="merge-file-remove"
                    onClick={() => removeFile(i)}
                    className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    {tUi("remove")}
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {mode === "pages" ? (
            <div className="mt-5" data-testid="merge-page-list">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {tUi("pages")}: {pages.length}
              </p>
              <ul className="mt-2 space-y-2">
                {pages.map((page, i) => {
                  const entry = files.find((file) => file.id === page.fileId);
                  const name = entry?.file.name ?? "";
                  return (
                    <li
                      key={page.id}
                      data-testid="merge-page-item"
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        <span className="mr-2 text-slate-400 dark:text-slate-500">
                          {i + 1}.
                        </span>
                        {tUi("pageOfFile", { page: page.index + 1, file: name })}
                      </span>
                      <span className="ml-3 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          data-testid="merge-page-up"
                          aria-label={tUi("movePageUp", {
                            page: page.index + 1,
                            file: name,
                          })}
                          onClick={() => movePage(i, -1)}
                          className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                          disabled={i === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          data-testid="merge-page-down"
                          aria-label={tUi("movePageDown", {
                            page: page.index + 1,
                            file: name,
                          })}
                          onClick={() => movePage(i, 1)}
                          className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                          disabled={i === pages.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          data-testid="merge-page-remove"
                          aria-label={tUi("removePage", {
                            page: page.index + 1,
                            file: name,
                          })}
                          onClick={() => removePage(i)}
                          className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        >
                          {tUi("remove")}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {showPassword ? (
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {tUi("pDFPassword")}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tUi("passwordForTheProtectedFile")}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <ActionButton onClick={handleMerge} busy={busy} disabled={files.length < 2}>
              {tUi("merge")} {files.length} PDF{files.length === 1 ? "" : "s"}
              {mode === "pages"
                ? ` (${tUi("pageCount", { count: pages.length })})`
                : ""}
            </ActionButton>
            <button
              type="button"
              onClick={() => {
                setState({ files: [], pages: [] });
                setError(null);
                setInfo(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {tUi("clear")}
            </button>
          </div>
        </>
      ) : null}

      <Status error={error} info={info} />
    </Workspace>
  );
}
