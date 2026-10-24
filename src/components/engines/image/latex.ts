/**
 * A small LaTeX to MathML converter.
 *
 * The browser renders MathML itself, so the formula editor needs no rendering
 * library. The converter covers the everyday notation and reports the macros
 * it does not know instead of dropping them silently.
 */

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ",
  eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ",
  upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const OPERATORS: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
  approx: "≈", equiv: "≡", sim: "∼", simeq: "≃", cong: "≅",
  ll: "≪", gg: "≫", propto: "∝", infty: "∞", partial: "∂",
  nabla: "∇", forall: "∀", exists: "∃", in: "∈", notin: "∉",
  ni: "∋", subset: "⊂", supset: "⊃", subseteq: "⊆", supseteq: "⊇",
  cup: "∪", cap: "∩", land: "∧", lor: "∨", neg: "¬", lnot: "¬",
  sum: "∑", prod: "∏", int: "∫", iint: "∬", oint: "∮",
  to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔",
  mapsto: "↦", implies: "⇒", iff: "⇔",
  ldots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱",
  prime: "′", deg: "°", angle: "∠", perp: "⊥", parallel: "∥",
  therefore: "∴", because: "∵", star: "⋆", bullet: "∙", circ: "∘",
};

const FUNCTIONS = [
  "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh", "log", "ln", "exp", "lim", "max", "min",
  "det", "gcd", "arg", "deg", "dim", "ker",
];

export interface LatexResult {
  mathml: string;
  unsupported: string[];
}

type Piece =
  | { kind: "command"; name: string }
  | { kind: "open" }
  | { kind: "close" }
  | { kind: "sup" }
  | { kind: "sub" };

function scan(source: string): Piece[] {
  const pieces: Piece[] = [];
  let at = 0;
  while (at < source.length) {
    const character = source[at];
    if (character === "\\") {
      const match = /^\\([A-Za-z]+|.)/.exec(source.slice(at));
      if (!match) {
        at += 1;
        continue;
      }
      pieces.push({ kind: "command", name: match[1] });
      at += match[0].length;
      continue;
    }
    if (character === "{") {
      pieces.push({ kind: "open" });
      at += 1;
      continue;
    }
    if (character === "}") {
      pieces.push({ kind: "close" });
      at += 1;
      continue;
    }
    if (character === "^") {
      pieces.push({ kind: "sup" });
      at += 1;
      continue;
    }
    if (character === "_") {
      pieces.push({ kind: "sub" });
      at += 1;
      continue;
    }
    if (character === " ") {
      at += 1;
      continue;
    }
    let end = at;
    while (end < source.length && !/[\\{}^_\s]/.test(source[end])) end += 1;
    pieces.push({ kind: "command", name: source.slice(at, end) });
    at = end;
  }
  return pieces;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert a LaTeX expression into MathML. */
export function latexToMathml(source: string): LatexResult {
  const pieces = scan(source);
  const unsupported: string[] = [];
  let position = 0;

  function parseSequence(stopAtClose: boolean): string[] {
    const nodes: string[] = [];
    while (position < pieces.length) {
      const piece = pieces[position];
      if (piece.kind === "close") {
        position += 1;
        if (stopAtClose) return nodes;
        continue;
      }
      if (piece.kind === "open") {
        position += 1;
        nodes.push(`<mrow>${parseSequence(true).join("")}</mrow>`);
        continue;
      }
      if (piece.kind === "sup" || piece.kind === "sub") {
        position += 1;
        const argument = parseArgument();
        const base = nodes.pop() || "<mi></mi>";
        nodes.push(
          piece.kind === "sup"
            ? `<msup>${base}${argument}</msup>`
            : `<msub>${base}${argument}</msub>`,
        );
        continue;
      }
      position += 1;
      const node = renderCommand(piece.name);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  function parseArgument(): string {
    if (position >= pieces.length) return "<mi></mi>";
    const piece = pieces[position];
    if (piece.kind === "open") {
      position += 1;
      return `<mrow>${parseSequence(true).join("")}</mrow>`;
    }
    if (piece.kind === "close") return "<mi></mi>";
    position += 1;
    if (piece.kind === "sup" || piece.kind === "sub") {
      const argument = parseArgument();
      const base = "<mi></mi>";
      return piece.kind === "sup"
        ? `<msup>${base}${argument}</msup>`
        : `<msub>${base}${argument}</msub>`;
    }
    return renderCommand(piece.name) || "<mi></mi>";
  }

  function renderCommand(name: string): string {
    if (name === "frac") {
      const numerator = parseArgument();
      const denominator = parseArgument();
      return `<mfrac>${numerator}${denominator}</mfrac>`;
    }
    if (name === "sqrt") {
      const saved = position;
      const first = parseArgument();
      const plain = first.replace(/<[^>]+>/g, "");
      if (/^\[.*\]$/.test(plain)) {
        const degree = plain.replace(/^\[|\]$/g, "");
        const radicand = parseArgument();
        return `<mroot>${radicand}<mn>${escapeXml(degree)}</mn></mroot>`;
      }
      position = saved;
      const radicand = parseArgument();
      return `<msqrt>${radicand}</msqrt>`;
    }
    if (name === "text" || name === "mathrm" || name === "mathbf" || name === "mathit") {
      const argument = parseArgument();
      const plain = argument.replace(/<[^>]+>/g, "");
      return `<mtext>${escapeXml(plain)}</mtext>`;
    }
    if (name === "left" || name === "right") {
      const argument = parseArgument();
      return argument.replace(/^<mi>|<\/mi>$/g, "");
    }
    if (name === "begin" || name === "end") {
      parseArgument();
      return "";
    }
    if (name === "quad") return '<mspace width="1em"/>';
    if (name === ",") return '<mspace width="0.2em"/>';
    if (name === ";") return '<mspace width="0.3em"/>';
    if (name === "!" || name === '"') return "";
    if (GREEK[name]) return `<mi>${GREEK[name]}</mi>`;
    if (OPERATORS[name]) return `<mo>${OPERATORS[name]}</mo>`;
    if (FUNCTIONS.indexOf(name) >= 0) return `<mi>${name}</mi>`;
    if (/^[0-9.]+$/.test(name)) return `<mn>${escapeXml(name)}</mn>`;
    if (/^[A-Za-z]+$/.test(name)) return `<mi>${escapeXml(name)}</mi>`;
    unsupported.push(`\\${name}`);
    return "";
  }

  const body = parseSequence(false).join("");
  return {
    mathml: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${body}</mrow></math>`,
    unsupported,
  };
}
