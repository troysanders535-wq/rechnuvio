"use client";

import React, { useState } from "react";
import { marked } from "marked";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { useTranslations } from "next-intl";
import {
  FileText,
  Download,
  Copy,
  Trash2,
  Upload,
  Bold,
  Italic,
  List,
  Heading2,
} from "lucide-react";

import { htmlToMarkdown } from "./markdown/converters";
import { buildPdfFromMarkdown } from "./markdown/markdownToPdf";

interface MarkdownEngineProps {
  slug: string;
}

/**
 * The markdown engine serves fourteen tools. They share one workspace but not
 * one behaviour: the editor tools show a markdown source pane and a live
 * preview, the WYSIWYG tool lets the user format the rendered text directly
 * and the two HTML tools take an HTML fragment and write out markdown.
 */
type Mode = "source" | "wysiwyg" | "html";

const MODE_BY_SLUG: Record<string, Mode> = {
  "markdown-editor": "source",
  "online-markdown-editor": "source",
  "markdown-preview": "source",
  "markdown-viewer": "source",
  "markdown-file-viewer": "source",
  "markdown-to-pdf": "source",
  "md-to-pdf": "source",
  "markdown-to-pdf-converter": "source",
  "markdown-to-docx": "source",
  "md-to-docx": "source",
  "markdown-to-word": "source",
  "markdown-wysiwyg-editor": "wysiwyg",
  "html-to-markdown": "html",
  "html-table-to-markdown": "html",
};

const SAMPLE_HTML = `<h1>Title</h1>
<p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>
<ul>
  <li>first</li>
  <li>second</li>
</ul>`;

/**
 * Split a markdown line into the runs of a Word document, so that a bold or
 * an italic span keeps its formatting in the exported file.
 */
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push(new TextRun(text.slice(last, match.index)));
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith("`")) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: "Courier New" }));
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    }
    last = match.index + token.length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length ? runs : [new TextRun("")];
}

export function MarkdownEngine({ slug }: MarkdownEngineProps) {
  const tUi = useTranslations("ui.engines.MarkdownEngine");
  const mode: Mode = MODE_BY_SLUG[slug] ?? "source";

  const [markdown, setMarkdown] = useState(mode === "html" ? "" : tUi("sampleMarkdown"));
  const [htmlInput, setHtmlInput] = useState(mode === "html" ? SAMPLE_HTML : "");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [wysiwygHtml, setWysiwygHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // The HTML to markdown conversion needs the browser's own parser, which the
  // server does not have. It therefore runs in an effect, so the server and
  // the first client render agree on an empty result and the conversion
  // follows once the page is live.
  const [markdownFromHtml, setMarkdownFromHtml] = useState("");

  const previewRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (typeof DOMParser === "undefined") return;
    setMarkdownFromHtml(htmlToMarkdown(htmlInput));
  }, [htmlInput]);

  const previewSource = mode === "html" ? markdownFromHtml : markdown;

  React.useEffect(() => {
    const html = marked.parse(previewSource) as string;
    setRenderedHtml(html);
  }, [previewSource]);

  // The preview is written into the DOM by hand: in the WYSIWYG mode the
  // element belongs to the user, and re-rendering it from React would throw
  // the cursor away on every keystroke.
  React.useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const next = mode === "wysiwyg" ? (wysiwygHtml ?? renderedHtml) : renderedHtml;
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [mode, renderedHtml, wysiwygHtml]);

  const handleExportPdf = () => {
    const doc = buildPdfFromMarkdown(markdown);
    doc.save("document.pdf");
  };

  const handleExportDocx = async () => {
    const lines = markdown.split(/\r?\n/);
    const docChildren: Paragraph[] = [];

    for (const line of lines) {
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        const level = Math.min(6, heading[1].length);
        const headingLevel = [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6,
        ][level - 1];
        docChildren.push(
          new Paragraph({ children: inlineRuns(heading[2]), heading: headingLevel }),
        );
        continue;
      }

      const bullet = /^\s*([-*+])\s+(.*)$/.exec(line);
      if (bullet) {
        docChildren.push(
          new Paragraph({ children: inlineRuns(bullet[2]), bullet: { level: 0 } }),
        );
        continue;
      }

      docChildren.push(new Paragraph({ children: inlineRuns(line) }));
    }

    const doc = new Document({ sections: [{ children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mode === "html" ? markdownFromHtml : renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      if (mode === "html") {
        setHtmlInput(text);
      } else {
        setMarkdown(text);
        setWysiwygHtml(null);
      }
    };
    reader.readAsText(file);
  };

  /* ------------------------------------------------------- WYSIWYG helpers -- */

  const syncWysiwyg = () => {
    const el = previewRef.current;
    if (!el) return;
    const html = el.innerHTML;
    setWysiwygHtml(html);
    setMarkdown(htmlToMarkdown(html));
  };

  const runCommand = (command: string, value?: string) => {
    const el = previewRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    syncWysiwyg();
  };

  const handleWysiwygInput = () => {
    if (mode !== "wysiwyg") return;
    syncWysiwyg();
  };

  /* -------------------------------------------------------------- render -- */

  const toolbarButton =
    "inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          {mode !== "html" ? (
            <>
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
              >
                <Download className="size-3.5" />
                <span>{tUi("exportToPDF")}</span>
              </button>
              <button
                type="button"
                onClick={handleExportDocx}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <FileText className="size-3.5" />
                <span>{tUi("exportToWordDocx")}</span>
              </button>
            </>
          ) : null}

          {mode === "wysiwyg" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                title={tUi("formatBold")}
                aria-label={tUi("formatBold")}
                onClick={() => runCommand("bold")}
                className={toolbarButton}
              >
                <Bold className="size-3.5" />
                <span>{tUi("formatBold")}</span>
              </button>
              <button
                type="button"
                title={tUi("formatItalic")}
                aria-label={tUi("formatItalic")}
                onClick={() => runCommand("italic")}
                className={toolbarButton}
              >
                <Italic className="size-3.5" />
                <span>{tUi("formatItalic")}</span>
              </button>
              <button
                type="button"
                title={tUi("formatHeading")}
                aria-label={tUi("formatHeading")}
                onClick={() => runCommand("formatBlock", "h2")}
                className={toolbarButton}
              >
                <Heading2 className="size-3.5" />
                <span>{tUi("formatHeading")}</span>
              </button>
              <button
                type="button"
                title={tUi("formatList")}
                aria-label={tUi("formatList")}
                onClick={() => runCommand("insertUnorderedList")}
                className={toolbarButton}
              >
                <List className="size-3.5" />
                <span>{tUi("formatList")}</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">{tUi("openFile")}</span>
            <input
              type="file"
              accept={mode === "html" ? ".html,.htm" : ".md,.markdown,.txt"}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>
              {copied
                ? tUi("hTMLCopied")
                : mode === "html"
                  ? tUi("copyMarkdown")
                  : tUi("copyHTML")}
            </span>
          </button>
          <button
            type="button"
            title={tUi("clearEditor")}
            aria-label={tUi("clearEditor")}
            onClick={() => {
              if (mode === "html") setHtmlInput("");
              else {
                setMarkdown("");
                setWysiwygHtml(null);
              }
            }}
            className="rounded p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Split source pane and live preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {mode === "html" ? tUi("htmlInput") : tUi("markdownSource")}
          </div>
          {mode === "html" ? (
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              aria-label={tUi("htmlInput")}
              rows={18}
              className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
            />
          ) : (
            <textarea
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                setWysiwygHtml(null);
              }}
              aria-label={tUi("markdownSource")}
              rows={18}
              className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
            />
          )}
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {mode === "html" ? tUi("markdownOutput") : tUi("liveFormattedPreview")}
          </div>
          {mode === "html" ? (
            <textarea
              value={markdownFromHtml}
              readOnly
              aria-label={tUi("markdownOutput")}
              rows={18}
              className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
            />
          ) : (
            <div
              ref={previewRef}
              className="prose prose-invert prose-sm max-h-[500px] overflow-auto p-6 max-w-none leading-relaxed text-slate-300"
              contentEditable={mode === "wysiwyg" ? true : undefined}
              suppressContentEditableWarning
              onInput={handleWysiwygInput}
            />
          )}
        </div>
      </div>

      {mode === "html" ? (
        <div className="border-t border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            {tUi("liveFormattedPreview")}
          </div>
          <div
            ref={previewRef}
            className="prose prose-invert prose-sm max-h-[420px] overflow-auto p-6 max-w-none leading-relaxed text-slate-300"
          />
        </div>
      ) : null}
    </div>
  );
}
