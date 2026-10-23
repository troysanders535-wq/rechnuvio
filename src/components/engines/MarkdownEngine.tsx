"use client";

import React, { useState } from "react";
import { marked } from "marked";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import {
  FileText,
  Download,
  Copy,
  Trash2,
  Upload,
  Sparkles,
  FileCode
} from "lucide-react";

interface MarkdownEngineProps {
  slug: string;
}

export function MarkdownEngine({ slug }: MarkdownEngineProps) {
  const sampleMd = `# Digital ToolPad Productivity Document

## Welcome to the Offline Document Workspace
All your markdown editing, PDF generation, and Word docx conversions run **100% in your browser** without sending data to servers.

### Key Capabilities
- **Real-time Live Preview**: Renders GitHub Flavored Markdown instantly
- **Direct PDF Export**: Generates printable PDF documents locally
- **Word (.docx) Export**: Converts headers, bullet points, and text into valid Word documents

### Sample Code Block
\`\`\`typescript
const privacy = "100% Client-Side";
console.log("Safe and Private:", privacy);
\`\`\`

> Privacy is not an afterthought; it is our fundamental architecture.

- [x] Zero cloud uploads
- [x] High performance
- [x] Free forever`;

  const [markdown, setMarkdown] = useState(sampleMd);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const html = marked.parse(markdown) as string;
    setRenderedHtml(html);
  }, [markdown]);

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(markdown, 180);
    doc.text(splitText, 15, 20);
    doc.save("document.pdf");
  };

  const handleExportDocx = async () => {
    const lines = markdown.split("\n");
    const docChildren: Paragraph[] = [];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        docChildren.push(
          new Paragraph({
            text: line.replace("# ", ""),
            heading: HeadingLevel.HEADING_1,
          })
        );
      } else if (line.startsWith("## ")) {
        docChildren.push(
          new Paragraph({
            text: line.replace("## ", ""),
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else if (line.startsWith("### ")) {
        docChildren.push(
          new Paragraph({
            text: line.replace("### ", ""),
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [new TextRun(line)],
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          children: docChildren,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMarkdown(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            <Download className="size-3.5" />
            <span>Export to PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportDocx}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileText className="size-3.5" />
            <span>Export to Word (.docx)</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Open file</span>
            <input
              type="file"
              accept=".md,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleCopyHtml}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Copy className="size-3.5" />
            <span>{copied ? "HTML Copied!" : "Copy HTML"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarkdown("")}
            className="rounded p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Split Markdown Editor & Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Markdown Source
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={18}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-400">
            Live Formatted Preview
          </div>
          <div
            className="prose prose-invert prose-sm max-h-[500px] overflow-auto p-6 max-w-none leading-relaxed text-slate-300"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
    </div>
  );
}
