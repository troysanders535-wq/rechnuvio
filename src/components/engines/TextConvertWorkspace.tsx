"use client";

/**
 * Workspace for the text-suite conversion tools:
 * text-to-binary, binary-to-text, text-to-hex, html-to-md and
 * latex-to-word-equation.
 *
 * One shared component; the slug decides which panel is rendered.
 * Everything runs in the browser - no network calls, no storage writes.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Note,
  Panel,
  ResultBox,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

/* ------------------------------------------------------------------ data -- */

/** Separator used between the byte groups of the binary output. */
const BINARY_SEPARATORS: Record<string, string> = {
  space: " ",
  comma: ", ",
  none: "",
};

/** LaTeX command -> UnicodeMath symbol. This table is data, not interface text. */
const LATEX_SYMBOLS: Record<string, string | undefined> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  varpi: "ϖ",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "ϕ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  times: "×",
  cdot: "·",
  div: "÷",
  pm: "±",
  mp: "∓",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  propto: "∝",
  sim: "∼",
  infty: "∞",
  partial: "∂",
  nabla: "∇",
  sum: "∑",
  prod: "∏",
  int: "∫",
  iint: "∬",
  oint: "∮",
  bigcup: "⋃",
  bigcap: "⋂",
  bigoplus: "⊕",
  bigotimes: "⊗",
  in: "∈",
  notin: "∉",
  ni: "∋",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  forall: "∀",
  exists: "∃",
  nexists: "∄",
  land: "∧",
  wedge: "∧",
  lor: "∨",
  vee: "∨",
  neg: "¬",
  lnot: "¬",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  gets: "←",
  leftrightarrow: "↔",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  mapsto: "↦",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  cot: "cot",
  sec: "sec",
  csc: "csc",
  arcsin: "arcsin",
  arccos: "arccos",
  arctan: "arctan",
  log: "log",
  ln: "ln",
  lg: "lg",
  lim: "lim",
  limsup: "lim sup",
  liminf: "lim inf",
  exp: "exp",
  max: "max",
  min: "min",
  sup: "sup",
  inf: "inf",
  deg: "deg",
  celsius: "°C",
  ast: "∗",
  star: "⋆",
  oplus: "⊕",
  otimes: "⊗",
  perp: "⊥",
  parallel: "∥",
  angle: "∠",
  therefore: "∴",
  because: "∵",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  prime: "′",
  circ: "∘",
  bullet: "∙",
  dagger: "†",
  ell: "ℓ",
  hbar: "ℏ",
  Re: "ℜ",
  Im: "ℑ",
  aleph: "ℵ",
  wp: "℘",
  colon: ":",
  hyphen: "-",
};

/** Cheat-sheet chips: [symbol, LaTeX that gets appended to the input]. */
const CHEAT_SYMBOLS: [string, string][] = [
  ["√", "\\sqrt{}"],
  ["∛", "\\sqrt[3]{}"],
  ["∜", "\\sqrt[4]{}"],
  ["α", "\\alpha"],
  ["β", "\\beta"],
  ["θ", "\\theta"],
  ["λ", "\\lambda"],
  ["μ", "\\mu"],
  ["π", "\\pi"],
  ["σ", "\\sigma"],
  ["φ", "\\phi"],
  ["ω", "\\omega"],
  ["×", "\\times"],
  ["÷", "\\div"],
  ["±", "\\pm"],
  ["≤", "\\le"],
  ["≥", "\\ge"],
  ["≠", "\\ne"],
  ["≈", "\\approx"],
  ["∞", "\\infty"],
  ["∑", "\\sum"],
  ["∏", "\\prod"],
  ["∫", "\\int"],
  ["∈", "\\in"],
  ["⊂", "\\subset"],
  ["∪", "\\cup"],
  ["∩", "\\cap"],
  ["∀", "\\forall"],
  ["∃", "\\exists"],
  ["¬", "\\neg"],
  ["→", "\\to"],
  ["⇒", "\\Rightarrow"],
  ["↔", "\\leftrightarrow"],
];

/* --------------------------------------------------------------- helpers -- */

function bytesToBits(bytes: Uint8Array): string[] {
  return Array.from(bytes).map((b) => b.toString(2).padStart(8, "0"));
}

function bytesToHexParts(bytes: Uint8Array): string[] {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
}

interface CharRow {
  ch: string;
  codePoint: string;
  hex: string;
  binary: string;
}

/** One row per code point: character, code point, UTF-8 hex and UTF-8 bits. */
function charRows(text: string): CharRow[] {
  const codePointPrefix = "U+";
  return Array.from(text).map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    const bytes = new TextEncoder().encode(ch);
    const hexParts = bytesToHexParts(bytes);
    const bitParts = bytesToBits(bytes);
    const row: CharRow = {
      ch,
      codePoint: codePointPrefix + cp.toString(16).toUpperCase().padStart(4, "0"),
      hex: hexParts.join(" "),
      binary: bitParts.join(" "),
    };
    return row;
  });
}

interface DecodeResult {
  text: string;
  error: string;
}

/**
 * A translator that resolves a catalogue key to a localized string.
 */
type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Decode a binary string into text.
 *
 * Every character that is not 0 or 1 is treated as a separator. The remaining
 * bits must form whole bytes; a leftover run of bits is reported as an error
 * instead of being silently dropped. The byte array is decoded as strict UTF-8
 * so that broken sequences produce a readable error rather than mojibake.
 */
function decodeBinary(input: string, t: Translate): DecodeResult {
  const bits = input.replace(/[^01]/g, "");
  if (!bits.length) {
    const empty: DecodeResult = { text: "", error: "" };
    return empty;
  }
  if (bits.length % 8 !== 0) {
    const stray = bits.length % 8;
    const message =
      stray === 1
        ? t("invalidBinaryLength", { bits: String(bits.length), stray: String(stray) })
        : t("invalidBinaryLengthPlural", { bits: String(bits.length), stray: String(stray) });
    const broken: DecodeResult = { text: "", error: message };
    return broken;
  }
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const good: DecodeResult = { text, error: "" };
    return good;
  } catch {
    const message = t("invalidUTF8ByteSequence");
    const broken: DecodeResult = { text: "", error: message };
    return broken;
  }
}

/**
 * Convert a LaTeX expression into the UnicodeMath linear format that Word
 * turns into a formatted equation when it is pasted into an equation field.
 */
function latexToUnicodeMath(input: string): string {
  const s = input;
  let out = "";
  let i = 0;

  /** Read a {...} group, returning its raw content and the position after it. */
  function readGroup(pos: number): { content: string; next: number } {
    if (s[pos] !== "{") {
      const none = { content: "", next: pos };
      return none;
    }
    let depth = 1;
    let j = pos + 1;
    let content = "";
    while (j < s.length) {
      const c = s[j];
      if (c === "\\") {
        content += c + (s[j + 1] ?? "");
        j += 2;
        continue;
      }
      if (c === "{") {
        depth += 1;
        content += c;
        j += 1;
        continue;
      }
      if (c === "}") {
        depth -= 1;
        if (depth === 0) break;
        content += c;
        j += 1;
        continue;
      }
      content += c;
      j += 1;
    }
    return { content, next: Math.min(j + 1, s.length) };
  }

  /** Read one argument: a {...} group, a command or a single character. */
  function readArgument(pos: number): { content: string; next: number } {
    if (s[pos] === "{") {
      const g = readGroup(pos);
      return { content: latexToUnicodeMath(g.content), next: g.next };
    }
    if (s[pos] === "\\") {
      const m = /^\\([A-Za-z]+|.)/.exec(s.slice(pos));
      if (m) {
        const sym = LATEX_SYMBOLS[m[1]];
        return { content: sym !== undefined ? sym : m[1], next: pos + m[0].length };
      }
    }
    if (pos < s.length) {
      return { content: s[pos], next: pos + 1 };
    }
    return { content: "", next: pos };
  }

  while (i < s.length) {
    const ch = s[i];

    if (ch === "\\") {
      const rest = s.slice(i);
      const word = /^\\([A-Za-z]+)/.exec(rest);

      if (word) {
        const cmd = word[1];
        i += word[0].length;

        if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
          const numerator = readArgument(i);
          const denominator = readArgument(numerator.next);
          out += "(" + numerator.content + ")/(" + denominator.content + ")";
          i = denominator.next;
          continue;
        }

        if (cmd === "sqrt") {
          let j = i;
          let root = "";
          if (s[j] === "[") {
            const close = s.indexOf("]", j);
            if (close > -1) {
              root = s.slice(j + 1, close).trim();
              j = close + 1;
            }
          }
          const argument = readArgument(j);
          const sign = root === "3" ? "∛" : root === "4" ? "∜" : "√";
          out += sign + "(" + argument.content + ")";
          i = argument.next;
          continue;
        }

        if (cmd === "left" || cmd === "right") {
          /* The command itself is dropped, the delimiter behind it is kept. */
          continue;
        }

        if (
          cmd === "text" ||
          cmd === "mathrm" ||
          cmd === "mathbf" ||
          cmd === "mathit" ||
          cmd === "textbf" ||
          cmd === "textit" ||
          cmd === "mathsf" ||
          cmd === "mathtt"
        ) {
          const g = readGroup(i);
          out += g.content;
          i = g.next;
          continue;
        }

        if (cmd === "quad") {
          out += " ";
          continue;
        }
        if (cmd === "qquad") {
          out += "  ";
          continue;
        }
        if (cmd === "newline") {
          out += "\n";
          continue;
        }
        if (cmd === "begin" || cmd === "end") {
          const g = readGroup(i);
          i = g.next;
          continue;
        }

        const sym = LATEX_SYMBOLS[cmd];
        if (sym !== undefined) {
          out += sym;
          continue;
        }
        out += cmd;
        continue;
      }

      const escaped = /^\\([^\nA-Za-z])/.exec(rest);
      if (escaped) {
        const c = escaped[1];
        i += escaped[0].length;
        if (c === "\\") {
          out += "\n";
          continue;
        }
        if (c === "{" || c === "}") {
          out += c;
          continue;
        }
        if (c === "," || c === ";" || c === ":" || c === "!") {
          out += " ";
          continue;
        }
        out += c;
        continue;
      }

      out += ch;
      i += 1;
      continue;
    }

    if (ch === "^" || ch === "_") {
      if (s[i + 1] === "{") {
        const g = readGroup(i + 1);
        out += ch + "(" + latexToUnicodeMath(g.content) + ")";
        i = g.next;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Convert an HTML fragment into Markdown.
 *
 * The document is parsed with the browser DOMParser - the tree is walked
 * element by element, the HTML source is never matched with regular
 * expressions - and the result is normalised afterwards.
 */
function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const skipped = ["script", "style", "noscript", "template", "head", "meta", "link", "title"];

  function isSkipped(tag: string): boolean {
    return skipped.indexOf(tag) >= 0;
  }

  /** Render a single inline element. */
  function renderInlineElement(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (isSkipped(tag)) return "";
    if (tag === "strong" || tag === "b") {
      const inner = renderInline(el).trim();
      return inner ? "**" + inner + "**" : "";
    }
    if (tag === "em" || tag === "i") {
      const inner = renderInline(el).trim();
      return inner ? "*" + inner + "*" : "";
    }
    if (tag === "code") {
      const inner = (el.textContent ?? "").trim();
      return inner ? "`" + inner + "`" : "";
    }
    if (tag === "del" || tag === "s" || tag === "strike") {
      const inner = renderInline(el).trim();
      return inner ? "~~" + inner + "~~" : "";
    }
    if (tag === "a") {
      const href = el.getAttribute("href") ?? "";
      const inner = renderInline(el).trim();
      return "[" + (inner || href) + "](" + href + ")";
    }
    if (tag === "img") {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return "![" + alt + "](" + src + ")";
    }
    if (tag === "br") return "  \n";
    return renderInline(el);
  }

  /** Render the children of a node as inline Markdown. */
  function renderInline(node: Node): string {
    let out = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        out += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== 1) return;
      out += renderInlineElement(child as Element);
    });
    return out;
  }

  /** Render a <pre> block as a fenced code block. */
  function codeBlock(pre: Element): string {
    const codeEl = pre.querySelector("code");
    const source = codeEl ? codeEl.textContent ?? "" : pre.textContent ?? "";
    let lang = "";
    if (codeEl) {
      const cls = codeEl.getAttribute("class") ?? "";
      const m = /language-([\w+#.-]+)/.exec(cls);
      if (m) lang = m[1];
    }
    const trimmed = source.replace(/\s+$/, "");
    return "```" + lang + "\n" + trimmed + "\n```";
  }

  /** Render a list (and its nested lists) as Markdown list items. */
  function listItems(list: Element, depth: number): string[] {
    const items: string[] = [];
    const ordered = list.tagName.toLowerCase() === "ol";
    const indent = "  ".repeat(depth);
    let index = 1;
    Array.from(list.children).forEach((child) => {
      if (child.tagName.toLowerCase() !== "li") return;
      const nested: string[] = [];
      const parts: string[] = [];
      Array.from(child.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          parts.push(n.textContent ?? "");
          return;
        }
        if (n.nodeType !== 1) return;
        const nestedEl = n as Element;
        const tag = nestedEl.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          const sub = listItems(nestedEl, depth + 1);
          nested.push(...sub);
          return;
        }
        parts.push(renderInlineElement(nestedEl));
      });
      const text = parts.join("").trim();
      const marker = ordered ? index + ". " : "- ";
      if (text) items.push(indent + marker + text);
      index += 1;
      items.push(...nested);
    });
    return items;
  }

  /** Render a table as a GitHub flavoured Markdown table. */
  function renderTable(table: Element): string {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return "";
    const cellText = (cell: Element): string =>
      renderInline(cell)
        .replace(/\|/g, "\\|")
        .replace(/\s+/g, " ")
        .trim();
    const parsed = rows.map((row) =>
      Array.from(row.querySelectorAll("th,td")).map((cell) => cellText(cell)),
    );
    const width = parsed.reduce((max, row) => (row.length > max ? row.length : max), 0);
    if (!width) return "";
    const pad = (row: string[]): string[] => {
      const copy = row.slice(0, width);
      while (copy.length < width) copy.push("");
      return copy;
    };
    const head = pad(parsed[0]);
    const lines: string[] = [];
    lines.push("| " + head.join(" | ") + " |");
    lines.push("| " + head.map(() => "---").join(" | ") + " |");
    parsed.slice(1).forEach((row) => {
      lines.push("| " + pad(row).join(" | ") + " |");
    });
    return lines.join("\n");
  }

  /** Render the block level children of a node, separated by blank lines. */
  function renderBlocks(node: Node): string {
    const blocks: string[] = [];
    let buffer = "";

    const flush = () => {
      const text = buffer.trim();
      if (text) blocks.push(text);
      buffer = "";
    };

    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        buffer += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (isSkipped(tag)) return;

      if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
        flush();
        const text = renderInline(el).trim();
        if (text) blocks.push("#".repeat(parseInt(tag.slice(1), 10)) + " " + text);
        return;
      }
      if (tag === "p") {
        flush();
        const text = renderInline(el).trim();
        if (text) blocks.push(text);
        return;
      }
      if (tag === "pre") {
        flush();
        blocks.push(codeBlock(el));
        return;
      }
      if (tag === "blockquote") {
        flush();
        const text = renderBlocks(el).trim();
        if (text) {
          blocks.push(
            text
              .split("\n")
              .map((line) => (line ? "> " + line : ">"))
              .join("\n"),
          );
        }
        return;
      }
      if (tag === "hr") {
        flush();
        blocks.push("---");
        return;
      }
      if (tag === "ul" || tag === "ol") {
        flush();
        const items = listItems(el, 0);
        if (items.length) blocks.push(items.join("\n"));
        return;
      }
      if (tag === "table") {
        flush();
        const table = renderTable(el);
        if (table) blocks.push(table);
        return;
      }
      if (
        tag === "div" ||
        tag === "section" ||
        tag === "article" ||
        tag === "main" ||
        tag === "header" ||
        tag === "footer" ||
        tag === "aside" ||
        tag === "nav" ||
        tag === "figure" ||
        tag === "figcaption" ||
        tag === "form" ||
        tag === "details" ||
        tag === "summary"
      ) {
        flush();
        const inner = renderBlocks(el);
        if (inner) blocks.push(inner);
        return;
      }
      buffer += renderInlineElement(el);
    });

    flush();
    return blocks.join("\n\n");
  }

  const raw = renderBlocks(doc.body);
  return raw
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------- component -- */

export function TextConvertWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextConvertWorkspace");
  const [binText, setBinText] = useState(tUi("hello"));
  const [binSep, setBinSep] = useState("space");
  const [decText, setDecText] = useState("01001000 01101001");
  const [hexText, setHexText] = useState(tUi("hello"));
  const [hexFormat, setHexFormat] = useState("spaced");
  const [hexUpper, setHexUpper] = useState(false);
  const [htmlText, setHtmlText] = useState("<h1>Hello</h1>");
  const [showPreview, setShowPreview] = useState(false);
  const [texText, setTexText] = useState("\\frac{a}{b} = \\sqrt{x}");

  const binBytes = new TextEncoder().encode(binText);
  const binParts = bytesToBits(binBytes);
  const binOutput = binParts.join(BINARY_SEPARATORS[binSep] ?? " ");
  const binRows = charRows(binText);
  const decoded = decodeBinary(decText, tUi);
  const hexBytes = new TextEncoder().encode(hexText);
  const hexParts = bytesToHexParts(hexBytes).map((p) => (hexUpper ? p.toUpperCase() : p));
  const hexOutput = hexFormat === "none" ? hexParts.join("") : hexFormat === "0x" ? hexParts.map((p) => "0x" + p).join(" ") : hexParts.join(" ");
  const hexRows = charRows(hexText);
  const texOutput = latexToUnicodeMath(texText);

  /**
   * The Markdown is built in the browser only - DOMParser does not exist on
   * the server - so the panel starts empty and fills up after the mount.
   */
  const [mdOutput, setMdOutput] = useState("");
  useEffect(() => {
    if (typeof DOMParser === "undefined") return;
    setMdOutput(htmlToMarkdown(htmlText));
  }, [htmlText]);

  return (
    <div className="space-y-4">
      {slug === "text-to-binary" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("textToBinary")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={binOutput} label={tUi("copy")} />
              <DownloadButton
                filename="text-binary.txt"
                content={binOutput}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <StatGrid>
            <StatCard value={binRows.length} label={tUi("charactersIn")} />
            <StatCard value={binBytes.length} label={tUi("bytesOut")} />
            <StatCard value={binBytes.length * 8} label={tUi("bitsOut")} />
          </StatGrid>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("textToEncode")} htmlFor="binary-text">
                <TextArea
                  id="binary-text"
                  value={binText}
                  onChange={setBinText}
                  rows={10}
                  placeholder={tUi("typeOrPasteYourText")}
                />
              </Field>
              <Field label={tUi("separator")} htmlFor="binary-separator">
                <SelectInput
                  id="binary-separator"
                  value={binSep}
                  onChange={setBinSep}
                  options={[
                    { value: "space", label: tUi("space") },
                    { value: "comma", label: tUi("comma") },
                    { value: "none", label: tUi("none") },
                  ]}
                />
              </Field>
            </div>
            <div className="space-y-3">
              <Field label={tUi("binaryOutput")} htmlFor="binary-output">
                <ResultBox id="binary-output" value={binOutput} rows={8} />
              </Field>
              <div>
                <SectionTitle>{tUi("characterTable")}</SectionTitle>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60">
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {tUi("character")}
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {tUi("codePoint")}
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Hex
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Binary
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {binRows.map((row, index) => (
                        <tr
                          key={index + "-" + row.codePoint + row.ch}
                          className="border-b border-slate-100 dark:border-slate-800/60"
                        >
                          <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-200">
                            {row.ch}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.codePoint}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.hex}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.binary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TwoColumn>
          <Note>
            {tUi("everyCharacterIsEncodedAsUTF8")}
          </Note>
        </Panel>
      )}

      {slug === "binary-to-text" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("binaryToText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={decoded.text} label={tUi("copy")} />
              <DownloadButton
                filename="binary-text.txt"
                content={decoded.text}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <StatGrid>
            <StatCard value={decText.replace(/[^01]/g, "").length} label={tUi("bitsIn")} />
            <StatCard
              value={Math.floor(decText.replace(/[^01]/g, "").length / 8)}
              label={tUi("bytesDecoded")}
            />
            <StatCard value={Array.from(decoded.text).length} label={tUi("charactersOut")} />
          </StatGrid>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("binaryToDecode")} htmlFor="binary-input">
                <TextArea
                  id="binary-input"
                  value={decText}
                  onChange={setDecText}
                  rows={10}
                  placeholder="01001000 01101001"
                />
              </Field>
            </div>
            <div className="space-y-3">
              {decoded.error && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  {decoded.error}
                </div>
              )}
              <Field label={tUi("decodedText")} htmlFor="binary-decoded">
                <ResultBox id="binary-decoded" value={decoded.text} rows={10} />
              </Field>
            </div>
          </TwoColumn>
          <Note>
            {tUi("spacesCommasDashesAndLineBreaksAreIgnored")}
          </Note>
        </Panel>
      )}

      {slug === "text-to-hex" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("textToHex")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={hexOutput} label={tUi("copy")} />
              <DownloadButton
                filename="text-hex.txt"
                content={hexOutput}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <StatGrid>
            <StatCard value={hexRows.length} label={tUi("charactersIn")} />
            <StatCard value={hexBytes.length} label={tUi("bytesOut")} />
            <StatCard value={hexOutput.length} label={tUi("hexCharacters")} />
          </StatGrid>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("textToEncode")} htmlFor="hex-text">
                <TextArea
                  id="hex-text"
                  value={hexText}
                  onChange={setHexText}
                  rows={10}
                  placeholder={tUi("typeOrPasteYourText")}
                />
              </Field>
              <Field label={tUi("format")} htmlFor="hex-format">
                <SelectInput
                  id="hex-format"
                  value={hexFormat}
                  onChange={setHexFormat}
                  options={[
                    { value: "spaced", label: tUi("spaced") },
                    { value: "none", label: tUi("noSeparator") },
                    { value: "0x", label: tUi("0xPrefix") },
                  ]}
                />
              </Field>
              <ButtonGroup>
                <ActionButton
                  onClick={() => setHexUpper(true)}
                  variant={hexUpper ? "primary" : "default"}
                >
                  {tUi("uppercase")}
                </ActionButton>
                <ActionButton
                  onClick={() => setHexUpper(false)}
                  variant={hexUpper ? "default" : "primary"}
                >
                  {tUi("lowercase")}
                </ActionButton>
              </ButtonGroup>
            </div>
            <div className="space-y-3">
              <Field label={tUi("hexOutput")} htmlFor="hex-output">
                <ResultBox id="hex-output" value={hexOutput} rows={8} />
              </Field>
              <div>
                <SectionTitle>{tUi("characterTable")}</SectionTitle>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60">
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {tUi("character")}
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {tUi("codePoint")}
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Hex
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Binary
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hexRows.map((row, index) => (
                        <tr
                          key={index + "-" + row.codePoint + row.ch}
                          className="border-b border-slate-100 dark:border-slate-800/60"
                        >
                          <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-200">
                            {row.ch}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.codePoint}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.hex}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                            {row.binary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TwoColumn>
          <Note>{tUi("hexOutputIsTheUTF8ByteSequenceOfTheInputText")}</Note>
        </Panel>
      )}

      {slug === "html-to-md" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("hTMLToMarkdown")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={mdOutput} label={tUi("copy")} />
              <DownloadButton
                filename="converted.md"
                content={mdOutput}
                mime="text/markdown"
                label={tUi("downloadMd")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("hTMLSource")} htmlFor="html-source">
                <TextArea
                  id="html-source"
                  value={htmlText}
                  onChange={setHtmlText}
                  rows={12}
                  placeholder="<h1>Title</h1>"
                />
              </Field>
              <Checkbox
                id="html-preview"
                checked={showPreview}
                onChange={setShowPreview}
                label={tUi("hTMLMarkdownPreview")}
              />
            </div>
            <div className="space-y-3">
              <Field label={tUi("markdownOutput")} htmlFor="markdown-output">
                <ResultBox id="markdown-output" value={mdOutput} rows={12} />
              </Field>
              {showPreview && (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 dark:border-slate-800">
                  {mdOutput}
                </pre>
              )}
            </div>
          </TwoColumn>
          <Note>
            {tUi("theHTMLIsParsedWithTheBrowserDOMParser")}
          </Note>
        </Panel>
      )}

      {slug === "latex-to-word-equation" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("laTeXToWordEquation")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={texOutput} label={tUi("copyForWord")} />
              <DownloadButton
                filename="equation.txt"
                content={texOutput}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("laTeXExpression")} htmlFor="latex-input">
                <TextArea
                  id="latex-input"
                  value={texText}
                  onChange={setTexText}
                  rows={10}
                  placeholder="\\frac{a}{b} = \\sqrt{x}"
                />
              </Field>
              <div>
                <SectionTitle>{tUi("commonSymbols")}</SectionTitle>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CHEAT_SYMBOLS.map((entry) => (
                    <ActionButton
                      key={entry[1]}
                      title={entry[1]}
                      onClick={() => setTexText((prev) => prev + entry[1])}
                    >
                      {entry[0]}
                    </ActionButton>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Field label={tUi("wordUnicodeMathOutput")} htmlFor="latex-output">
                <ResultBox id="latex-output" value={texOutput} rows={10} />
              </Field>
            </div>
          </TwoColumn>
          <Note>
            {tUi("inWordPressAltEqualsAndPaste")}
          </Note>
        </Panel>
      )}
    </div>
  );
}
