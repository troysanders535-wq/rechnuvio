/**
 * A small LaTeX to MathML converter.
 *
 * The converter covers the parts of LaTeX a formula of a calculator needs:
 * fractions, roots, powers, indices, the big operators, the greek letters,
 * the relations and the functions. The result is MathML, which every browser
 * renders on its own.
 */

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
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
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const OPERATORS: Record<string, string> = {
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  cdot: "⋅",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "∼",
  propto: "∝",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  supset: "⊃",
  subseteq: "⊆",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  land: "∧",
  lor: "∨",
  rightarrow: "→",
  to: "→",
  Rightarrow: "⇒",
  leftarrow: "←",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  infty: "∞",
  partial: "∂",
  nabla: "∇",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  prime: "′",
  deg: "°",
  ell: "…",
  aleph: "ℵ",
  hbar: "ℏ",
  Re: "ℜ",
  Im: "ℑ",
  surd: "√",
  angle: "∠",
  therefore: "∴",
  because: "∵",
  star: "⋆",
  bullet: "∙",
  circ: "∘",
  oplus: "⊕",
  otimes: "⊗",
  perp: "⊥",
  parallel: "∥",
};

const FUNCTIONS = [
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "lim",
  "max",
  "min",
  "det",
  "gcd",
  "deg",
  "dim",
  "hom",
  "ker",
  "arg",
  "Pr",
];

const BIG_OPERATORS: Record<string, string> = {
  sum: "∑",
  prod: "∏",
  coprod: "∐",
  int: "∫",
  iint: "∬",
  iiint: "∭",
  oint: "∮",
  bigcup: "⋃",
  bigcap: "⋂",
  bigoplus: "⨁",
  bigotimes: "⨂",
};

const DELIMITERS: Record<string, string> = {
  "(": "(",
  ")": ")",
  "[": "[",
  "]": "]",
  "\\{": "{",
  "\\}": "}",
  "|": "|",
  "\\|": "‖",
  "\\langle": "⟨",
  "\\rangle": "⟩",
};

type Node =
  | { kind: "row"; children: Node[] }
  | { kind: "frac"; numerator: Node[]; denominator: Node[] }
  | { kind: "sqrt"; body: Node[] }
  | { kind: "root"; body: Node[]; index: Node[] }
  | { kind: "sup"; base: Node; exponent: Node[] }
  | { kind: "sub"; base: Node; subscript: Node[] }
  | { kind: "subsup"; base: Node; subscript: Node[]; exponent: Node[] }
  | { kind: "operator"; value: string; stretchy?: boolean }
  | { kind: "identifier"; value: string; upright?: boolean }
  | { kind: "number"; value: string }
  | { kind: "text"; value: string };

interface Token {
  kind: "command" | "symbol" | "number" | "letter" | "space";
  value: string;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    if (rest.startsWith("\\")) {
      const match = /^\\([a-zA-Z]+|.)/.exec(rest);
      if (match) {
        tokens.push({ kind: "command", value: match[1] });
        index += match[0].length;
        continue;
      }
      index += 1;
      continue;
    }
    const char = rest[0];
    if (/\s/.test(char)) {
      tokens.push({ kind: "space", value: char });
      index += 1;
      continue;
    }
    if (/[0-9]/.test(char)) {
      const match = /^[0-9]+(\.[0-9]+)?/.exec(rest);
      const number = match ? match[0] : char;
      tokens.push({ kind: "number", value: number });
      index += number.length;
      continue;
    }
    if (/[a-zA-Z]/.test(char)) {
      tokens.push({ kind: "letter", value: char });
      index += 1;
      continue;
    }
    tokens.push({ kind: "symbol", value: char });
    index += 1;
  }
  return tokens;
}

class Parser {
  private position = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private next(): Token | undefined {
    const token = this.tokens[this.position];
    this.position += 1;
    return token;
  }

  /** The nodes of a group, up to the closing brace. */
  parseGroup(): Node[] {
    const children: Node[] = [];
    for (;;) {
      const token = this.peek();
      if (!token) break;
      if (token.kind === "symbol" && token.value === "}") {
        this.next();
        break;
      }

      // a group of its own: the braces are read here, so the group of the
      // formula is closed by its own closing brace
      if (token.kind === "symbol" && token.value === "{") {
        this.next();
        const group = this.parseGroup();
        children.push({ kind: "row", children: group });
        continue;
      }

      // a power or an index belongs to the node before it
      if (token.kind === "symbol" && (token.value === "^" || token.value === "_")) {        this.next();
        const argument = this.parseArgument();
        const base = children.pop();
        if (!base) {
          children.push({ kind: "operator", value: token.value });
          continue;
        }
        if (token.value === "^") {
          if (base.kind === "sub") {
            children.push({
              kind: "subsup",
              base: base.base,
              subscript: base.subscript,
              exponent: argument,
            });
          } else if (base.kind === "sup") {
            children.push({
              kind: "subsup",
              base: base.base,
              subscript: argument,
              exponent: base.exponent,
            });
          } else {
            children.push({ kind: "sup", base, exponent: argument });
          }
        } else if (base.kind === "sup") {
          children.push({
            kind: "subsup",
            base: base.base,
            subscript: argument,
            exponent: base.exponent,
          });
        } else {
          children.push({ kind: "sub", base, subscript: argument });
        }
        continue;
      }

      const node = this.parseNode();
      if (!node) continue;
      children.push(node);
    }
    return children;
  }

  /** The argument of a power or an index: a group or a single node. */
  private parseArgument(): Node[] {
    const token = this.peek();
    if (token && token.kind === "symbol" && token.value === "{") {
      this.next();
      return this.parseGroup();
    }
    const node = this.parseNode();
    return node ? [node] : [];
  }

  /**
   * The argument of a command: a group of its own, so the braces of the
   * command are read together with its content.
   */
  private parseBracedGroup(): Node[] {
    const token = this.peek();
    if (token && token.kind === "symbol" && token.value === "{") {
      this.next();
      return this.parseGroup();
    }
    return this.parseArgument();
  }

  /** A single node with its powers and indices. */
  private parseNode(): Node | null {
    const token = this.next();
    if (!token) return null;

    if (token.kind === "space") return null;

    if (token.kind === "command") {
      const command = token.value;

      if (command === "frac" || command === "dfrac" || command === "tfrac") {
        const numerator = this.parseBracedGroup();
        const denominator = this.parseBracedGroup();
        return { kind: "frac", numerator, denominator };
      }
      if (command === "sqrt") {
        let index: Node[] = [];
        const next = this.peek();
        if (next && next.kind === "symbol" && next.value === "[") {
          this.next();
          index = this.parseGroup();
        }
        const body = this.parseBracedGroup();
        return index.length
          ? { kind: "root", body, index }
          : { kind: "sqrt", body };
      }
      if (command === "text" || command === "mathrm" || command === "mathbf") {
        const body = this.parseBracedGroup();
        return { kind: "text", value: textOf(body) };
      }
      if (command === "left" || command === "right") {
        const next = this.next();
        const value = next ? DELIMITERS[`\\${next.value}`] ?? next.value : "";
        return { kind: "operator", value, stretchy: true };
      }
      if (command === "begin" || command === "end") {
        // the environment name is skipped, its content is rendered as it is
        this.parseGroup();
        return null;
      }
      if (command in BIG_OPERATORS) {
        return { kind: "operator", value: BIG_OPERATORS[command] };
      }
      if (command in GREEK) {
        return { kind: "identifier", value: GREEK[command] };
      }
      if (command in OPERATORS) {
        return { kind: "operator", value: OPERATORS[command] };
      }
      if (FUNCTIONS.includes(command)) {
        return { kind: "identifier", value: command, upright: true };
      }
      if (command === ",") {
        return { kind: "operator", value: " " };
      }
      if (command === "%" || command === "&" || command === "#") {
        return { kind: "operator", value: " " };
      }
      return { kind: "identifier", value: command };
    }

    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }

    if (token.kind === "letter") {
      return { kind: "identifier", value: token.value };
    }

    if (token.kind === "symbol") {
      return { kind: "operator", value: token.value };
    }

    return null;
  }
}

/** The plain text of a group of nodes. */
function textOf(nodes: Node[]): string {
  return nodes
    .map((node) => {
      if (node.kind === "identifier" || node.kind === "number" || node.kind === "text") {
        return node.value;
      }
      if (node.kind === "row") return textOf(node.children);
      return "";
    })
    .join("");
}

function escapeXml(text: string): string {  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeNodes(nodes: Node[]): string {
  return nodes.map(serializeNode).join("");
}

function serializeNode(node: Node): string {
  switch (node.kind) {
    case "row":
      return `<mrow>${serializeNodes(node.children)}</mrow>`;
    case "frac":
      return `<mfrac><mrow>${serializeNodes(node.numerator)}</mrow><mrow>${serializeNodes(
        node.denominator,
      )}</mrow></mfrac>`;
    case "sqrt":
      return `<msqrt><mrow>${serializeNodes(node.body)}</mrow></msqrt>`;
    case "root":
      return `<mroot><mrow>${serializeNodes(node.body)}</mrow><mrow>${serializeNodes(
        node.index,
      )}</mrow></mroot>`;
    case "sup":
      return `<msup><mrow>${serializeNode(node.base)}</mrow><mrow>${serializeNodes(
        node.exponent,
      )}</mrow></msup>`;
    case "sub":
      return `<msub><mrow>${serializeNode(node.base)}</mrow><mrow>${serializeNodes(
        node.subscript,
      )}</mrow></msub>`;
    case "subsup":
      return `<msubsup><mrow>${serializeNode(node.base)}</mrow><mrow>${serializeNodes(
        node.subscript,
      )}</mrow><mrow>${serializeNodes(node.exponent)}</mrow></msubsup>`;
    case "operator":
      return `<mo${node.stretchy ? ' stretchy="true"' : ""}>${escapeXml(node.value)}</mo>`;
    case "identifier":
      return `<mi${node.upright ? ' mathvariant="normal"' : ""}>${escapeXml(node.value)}</mi>`;
    case "number":
      return `<mn>${escapeXml(node.value)}</mn>`;
    case "text":
      return `<mtext>${escapeXml(node.value)}</mtext>`;
    default:
      return "";
  }
}

/** The MathML of a LaTeX formula. */
export function latexToMathML(source: string): string {
  const parser = new Parser(tokenize(source));
  const nodes = parser.parseGroup();
  const body = serializeNodes(nodes);
  return `<math display="block">${body}</math>`;
}
