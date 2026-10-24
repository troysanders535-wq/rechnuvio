"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  DevClearButton,
  DevCopyButton,
  DevEditor,
  DevError,
  DevOutput,
  DevPanel,
  devButtonClass,
} from "./DevKit";

type HtmlVariant = "beautify" | "format" | "minify";

const SAMPLE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Example</title></head><body><main class="wrap"><h1>Hello</h1><p>Some text.</p><ul><li>One</li><li>Two</li></ul></main></body></html>`;

/** Elements whose content must stay on one line. */
const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "code",
  "em",
  "i",
  "img",
  "input",
  "label",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
]);

/** Elements whose content must not be re-indented. */
const PRE_TAGS = new Set(["pre", "textarea", "script", "style"]);

/**
 * Minify a CSS block: drop the comments, collapse the whitespace, and take
 * the space away around the punctuation that does not need it.
 */
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>~+])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/**
 * Minify a JSON-LD block: the browser parses it anyway, so the spacing
 * between the tokens is not needed.
 */
function minifyJsonLd(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json));
  } catch {
    // A JSON-LD block that does not parse is left alone: rewriting it would
    // change what the page says.
    return json.replace(/\s+/g, " ").trim();
  }
}

/**
 * Drop the quotes around an attribute value when it is safe to do so: the
 * value may not hold a space, a quote, an equals sign, a slash or a closing
 * angle bracket.
 */
function canDropQuotes(value: string): boolean {
  return value.length > 0 && !/[\s"'`=<>/]/.test(value);
}

/** Indent an HTML document, keeping its text content. */
export function formatHtml(source: string, indent = "  "): string {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, "text/html");
  } catch {
    return source;
  }

  const lines: string[] = [];

  const render = (node: Node, depth: number) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const text = (child.textContent || "").replace(/\s+/g, " ");
        if (text.trim()) {
          lines.push(`${indent.repeat(depth)}${text.trim()}`);
        }
        continue;
      }
      if (child.nodeType === 8) continue;
      if (child.nodeType !== 1) continue;

      const element = child as Element;
      const name = element.nodeName.toLowerCase();
      const attrs = Array.from(element.attributes)
        .map((a) => ` ${a.name}="${a.value}"`)
        .join("");

      if (PRE_TAGS.has(name)) {
        lines.push(`${indent.repeat(depth)}<${name}${attrs}>${element.textContent || ""}</${name}>`);
        continue;
      }

      const children = Array.from(element.childNodes).filter(
        (c) =>
          !(c.nodeType === 3 && !(c.textContent || "").trim()) &&
          !(c.nodeType === 8),
      );

      if (!children.length) {
        lines.push(`${indent.repeat(depth)}<${name}${attrs}></${name}>`);
        continue;
      }

      if (INLINE_TAGS.has(name)) {
        const inner = Array.from(element.childNodes)
          .map((c) => (c.nodeType === 3 ? (c.textContent || "").replace(/\s+/g, " ") : ""))
          .join("")
          .trim();
        lines.push(`${indent.repeat(depth)}<${name}${attrs}>${inner}</${name}>`);
        continue;
      }

      lines.push(`${indent.repeat(depth)}<${name}${attrs}>`);
      render(element, depth + 1);
      lines.push(`${indent.repeat(depth)}</${name}>`);
    }
  };

  render(doc.body, 0);
  const head = doc.head ? doc.head.innerHTML.trim() : "";
  const doctype = source.trimStart().toLowerCase().startsWith("<!doctype")
    ? "<!doctype html>\n"
    : "";

  const parts: string[] = [];
  if (doctype) parts.push(doctype.trim());
  if (head) parts.push(head);
  parts.push(lines.join("\n"));
  return parts.filter(Boolean).join("\n");
}

/** The options the minifier offers. */
export interface MinifyOptions {
  /** Compress the CSS in the style blocks and the JSON in the JSON-LD blocks. */
  inline: boolean;
  /** Drop the quotes around the attribute values that do not need them. */
  dropQuotes: boolean;
}

/**
 * Collapse an HTML document into a single line.
 *
 * The comments and the whitespace that carries no meaning are removed. The
 * optional inline pass also compresses the CSS of the style blocks and the
 * JSON of the JSON-LD blocks, and the optional quote pass takes the quotes
 * away from the attribute values that do not need them.
 */
export function minifyHtml(source: string, options: MinifyOptions = { inline: true, dropQuotes: true }): string {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, "text/html");
  } catch {
    return source.replace(/\s+/g, " ").trim();
  }

  const writeAttrs = (element: Element): string =>
    Array.from(element.attributes)
      .map((a) => {
        if (options.dropQuotes && canDropQuotes(a.value)) return ` ${a.name}=${a.value}`;
        return ` ${a.name}="${a.value}"`;
      })
      .join("");

  const walk = (node: Node): string => {
    let out = "";
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const text = child.textContent || "";
        const parent = child.parentElement;
        const isPre = parent && PRE_TAGS.has(parent.nodeName.toLowerCase());
        if (isPre) {
          out += text;
        } else if (text.trim()) {
          // The whitespace between two tags carries no meaning and is dropped.
          out += text.replace(/\s+/g, " ");
        }
        continue;
      }
      if (child.nodeType === 8) continue;
      if (child.nodeType !== 1) continue;

      const element = child as Element;
      const name = element.nodeName.toLowerCase();
      const attrs = writeAttrs(element);
      if (PRE_TAGS.has(name)) {
        // A style block holds CSS and a JSON-LD block holds JSON. Both are
        // compressed when the inline pass is on.
        let content = element.textContent || "";
        if (options.inline && name === "style") {
          content = minifyCss(content);
        } else if (
          options.inline &&
          name === "script" &&
          (element.getAttribute("type") || "").toLowerCase() === "application/ld+json"
        ) {
          content = minifyJsonLd(content);
        }
        out += `<${name}${attrs}>${content}</${name}>`;
        continue;
      }
      out += `<${name}${attrs}>${walk(element)}</${name}>`;
    }
    return out;
  };

  const doctype = source.trimStart().toLowerCase().startsWith("<!doctype")
    ? "<!doctype html>"
    : "";
  // The head is walked as well, so a style block or a JSON-LD block that
  // sits in the head is compressed too.
  const head = doc.head ? walk(doc.head) : "";
  const body = walk(doc.body);
  return `${doctype}${head}${body}`.trim();
}

export function HtmlTool({ variant }: { variant: HtmlVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");
  const [compressInline, setCompressInline] = React.useState(true);
  const [dropQuotes, setDropQuotes] = React.useState(false);

  const title =
    variant === "beautify" ? tUi("htmlBeautifierTitle") : variant === "format" ? tUi("htmlFormatterTitle") : tUi("htmlMinifierTitle");
  const subtitle =
    variant === "beautify"
      ? tUi("htmlBeautifierSubtitle")
      : variant === "format"
        ? tUi("htmlFormatterSubtitle")
        : tUi("htmlMinifierSubtitle");
  const actionLabel =
    variant === "minify" ? tUi("minifyHtml") : tUi("formatHtml");

  const run = () => {
    setError("");
    if (!text.trim()) {
      setResult("");
      setError(tUi("emptyInput"));
      return;
    }
    setResult(
      variant === "minify"
        ? minifyHtml(text, { inline: compressInline, dropQuotes })
        : formatHtml(text),
    );
  };

  // The size that the minifier saved, counted in the bytes of the document.
  const saved =
    variant === "minify" && result
      ? Math.max(0, new TextEncoder().encode(text).length - new TextEncoder().encode(result).length)
      : 0;

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button type="button" onClick={run} className={devButtonClass}>
            {actionLabel}
          </button>
          <DevCopyButton value={result} label={{ copy: tUi("copy"), copied: tUi("copied") }} />
          <DevClearButton
            onClick={() => {
              setText("");
              setResult("");
              setError("");
            }}
            label={tUi("clear")}
          />
          <button
            type="button"
            onClick={() => setText(SAMPLE_HTML)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("loadExample")}
          </button>
        </>
      }
    >
      {variant === "minify" ? (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              data-testid="html-minify-inline"
              checked={compressInline}
              onChange={(event) => setCompressInline(event.target.checked)}
            />
            <span>{tUi("minifyCompressInline")}</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              data-testid="html-minify-quotes"
              checked={dropQuotes}
              onChange={(event) => setDropQuotes(event.target.checked)}
            />
            <span>{tUi("minifyDropQuotes")}</span>
          </label>
        </div>
      ) : null}

      <DevEditor value={text} onChange={setText} placeholder={tUi("pasteHtmlHere")} />

      {error ? <DevError>{error}</DevError> : null}
      {variant === "minify" && result ? (
        <p data-testid="html-minify-saved" className="text-xs text-slate-500 dark:text-slate-400">
          {tUi("minifyBytesSaved", { saved, bytes: new TextEncoder().encode(result).length })}
        </p>
      ) : null}
      {result ? <DevOutput label={tUi("result")}>{result}</DevOutput> : null}
    </DevPanel>
  );
}
