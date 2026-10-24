/**
 * The markdown conversions of the markdown-docs engine.
 *
 * Two directions are covered:
 *
 * - `htmlToMarkdown` turns a pasted HTML fragment into markdown, including
 *   headings, emphasis, links, images, lists, block quotes, code and tables.
 * - `parseMarkdown` splits a markdown document into the blocks that the PDF
 *   and the Word export write out, and `inlineText` strips the inline markup
 *   so that the exported document carries the rendered words and not the
 *   markdown syntax.
 *
 * Everything runs in the browser on the string it is given; nothing is sent
 * anywhere.
 */

/* ------------------------------------------------------------------ html -> markdown -- */

function inline(node: Node): string {
  if (node.nodeType === 3 /* TEXT_NODE */) return node.textContent || "";
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return "";

  const el = node as HTMLElement;
  const kids = () => Array.from(el.childNodes).map(inline).join("");

  switch (el.tagName) {
    case "STRONG":
    case "B":
      return `**${kids().trim()}**`;
    case "EM":
    case "I":
      return `*${kids().trim()}*`;
    case "DEL":
    case "S":
    case "STRIKE":
      return `~~${kids().trim()}~~`;
    case "CODE":
      return `\`${(el.textContent || "").trim()}\``;
    case "A": {
      const href = (el.getAttribute("href") || "").trim();
      const label = kids().trim();
      if (!href) return label;
      return `[${label || href}](${href})`;
    }
    case "IMG": {
      const alt = (el.getAttribute("alt") || "").trim();
      const src = (el.getAttribute("src") || "").trim();
      return src ? `![${alt}](${src})` : alt;
    }
    case "BR":
      return "\n";
    case "HR":
      return "---";
    default:
      return kids();
  }
}

function tableToMarkdown(el: Element): string {
  const rows = Array.from(el.querySelectorAll("tr")).filter((row) =>
    Array.from(row.children).some(
      (cell) => cell.tagName === "TD" || cell.tagName === "TH",
    ),
  );
  if (rows.length === 0) return "";

  const readRow = (row: Element) =>
    Array.from(row.children)
      .filter((cell) => cell.tagName === "TD" || cell.tagName === "TH")
      .map((cell) => inline(cell).replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim());

  const lines: string[] = [];
  let headerWritten = false;

  for (const row of rows) {
    const values = readRow(row);
    if (values.length === 0) continue;
    const isHeader =
      !headerWritten &&
      Array.from(row.children).some((cell) => cell.tagName === "TH");
    if (isHeader) {
      lines.push(`| ${values.join(" | ")} |`);
      lines.push(`| ${values.map(() => "---").join(" | ")} |`);
      headerWritten = true;
    } else {
      if (!headerWritten) {
        // A table without a header row still needs one in markdown: the first
        // row becomes the header so that the column count stays correct.
        lines.push(`| ${values.join(" | ")} |`);
        lines.push(`| ${values.map(() => "---").join(" | ")} |`);
        headerWritten = true;
      } else {
        lines.push(`| ${values.join(" | ")} |`);
      }
    }
  }

  return lines.join("\n");
}

function block(el: Element): string {
  switch (el.tagName) {
    case "H1":
      return `# ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "H2":
      return `## ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "H3":
      return `### ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "H4":
      return `#### ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "H5":
      return `##### ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "H6":
      return `###### ${inline(el).replace(/\s*\n\s*/g, " ").trim()}\n\n`;
    case "P":
      return `${inline(el).trim()}\n\n`;
    case "BLOCKQUOTE":
      return `${inline(el)
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    case "PRE":
      return `\`\`\`\n${(el.textContent || "").replace(/\n+$/, "")}\n\`\`\`\n\n`;
    case "UL":
    case "OL": {
      const ordered = el.tagName === "OL";
      const items = Array.from(el.children)
        .filter((child) => child.tagName === "LI")
        .map((li, index) => {
          const marker = ordered ? `${index + 1}.` : "-";
          return `${marker} ${inline(li).replace(/\s*\n\s*/g, " ").trim()}`;
        });
      return items.length ? `${items.join("\n")}\n\n` : "";
    }
    case "TABLE":
      return `${tableToMarkdown(el)}\n\n`;
    case "HR":
      return "---\n\n";
    default: {
      const parts = Array.from(el.childNodes).map((child) => {
        if (child.nodeType === 3) return (child.textContent || "").trim();
        if (child.nodeType === 1) return block(child as Element);
        return "";
      });
      return parts.join("");
    }
  }
}

/**
 * Convert an HTML fragment into markdown.
 *
 * The fragment is parsed with the browser's own parser, so malformed markup
 * is repaired the same way a browser would repair it.
 */
export function htmlToMarkdown(html: string): string {
  const text = html || "";
  if (!text.trim()) return "";

  const doc = new DOMParser().parseFromString(
    `<div id="__md_root__">${text}</div>`,
    "text/html",
  );
  const root = doc.getElementById("__md_root__");
  if (!root) return "";

  const out = Array.from(root.childNodes)
    .map((child) => {
      if (child.nodeType === 3) return (child.textContent || "").trim();
      if (child.nodeType === 1) return block(child as Element);
      return "";
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out ? `${out}\n` : "";
}

/* ------------------------------------------------------------------ markdown -> blocks -- */

export type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; lines: string[] }
  | { kind: "rule" };

/**
 * Strip the inline markup of a markdown line.
 *
 * `Some **bold** and *italic* text with a [link](https://example.com)` becomes
 * `Some bold and italic text with a link`, so an exported document carries the
 * rendered words and never the markdown syntax.
 */
export function inlineText(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Split a markdown document into the blocks the exports write out. */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = (markdown || "").split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // A fenced code block.
    const fence = /^\s*```/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // the closing fence
      blocks.push({ kind: "code", lines: body });
      continue;
    }

    // A heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: inlineText(heading[2]),
      });
      index += 1;
      continue;
    }

    // A horizontal rule.
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    // A block quote.
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", text: inlineText(body.join(" ")) });
      continue;
    }

    // A list.
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (
        index < lines.length &&
        /^\s*([-*+]|\d+[.)])\s+/.test(lines[index])
      ) {
        items.push(inlineText(lines[index].replace(/^\s*([-*+]|\d+[.)])\s+/, "")));
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // A paragraph: every line until an empty line.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*>/.test(lines[index]) &&
      !/^\s*([-*+]|\d+[.)])\s+/.test(lines[index]) &&
      !/^\s*```/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: inlineText(paragraph.join(" ")) });
  }

  return blocks;
}
