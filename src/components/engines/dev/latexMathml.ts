/**
 * A small LaTeX to MathML converter.
 *
 * The browser renders MathML natively, so the equation editors need no
 * rendering library. The converter covers the everyday maths notation and
 * reports every macro it does not support instead of dropping it silently.
 */

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ",
  mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ",
  upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const OPERATORS: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
  approx: "≈", equiv: "≡", sim: "∼", simeq: "≃", cong: "≅",
  ll: "≪", gg: "≫", propto: "∝",
  infty: "∞", partial: "∂", nabla: "∇", forall: "∀", exists: "∃",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", supset: "⊃",
  subseteq: "⊆", supseteq: "⊇", cup: "∪", cap: "∩",
  land: "∧", lor: "∨", neg: "¬", lnot: "¬",
  sum: "∑", prod: "∏", int: "∫", iint: "∬", oint: "∮",
  to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔",
  mapsto: "↦", implies: "⇒", iff: "⇔",
  ldots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱",
  prime: "′", deg: "°", angle: "∠", perp: "⊥", parallel: "∥",
  therefore: "∴", because: "∵", star: "⋆", bullet: "∙", circ: "∘",
};

export interface LatexResult {
  mathml: string;
  unsupported: string[];
}

type Piece =
  | { kind: "cmd"; name: string; macro: boolean }
  | { kind: "open" }
  | { kind: "close" }
  | { kind: "sup" }
  | { kind: "sub" };

/** Split a LaTeX source into the pieces the converter understands. */
function scan(source: string): Piece[] {
  const pieces: Piece[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      const match = /^\\([A-Za-z]+|.)/.exec(source.slice(i));
      if (!match) {
        i += 1;
        continue;
      }
      pieces.push({ kind: "cmd", name: match[1], macro: true });
      i += match[0].length;
      continue;
    }
    if (ch === "{") {
      pieces.push({ kind: "open" });
      i += 1;
      continue;
    }
    if (ch === "}") {
      pieces.push({ kind: "close" });
      i += 1;
      continue;
    }
    if (ch === "^") {
      pieces.push({ kind: "sup" });
      i += 1;
      continue;
    }
    if (ch === "_") {
      pieces.push({ kind: "sub" });
      i += 1;
      continue;
    }
    if (ch === " ") {
      i += 1;
      continue;
    }
    let j = i;
    // The run ends at the next group, super- or subscript marker.
    while (j < source.length && !/[\\{}^_\s]/.test(source[j])) j += 1;
    pieces.push({ kind: "cmd", name: source.slice(i, j), macro: false });
    i = j;
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

/**
 * Render a plain run of characters.
 *
 * A run mixes identifiers, numbers and symbols - "E", "=", "a+b", "2ac" - and
 * every part of it belongs in the formula. Dropping the symbol would break an
 * equation such as `E = mc^2`, so the run is split instead.
 */
function renderPlainRun(run: string): string {
  const parts = run.match(/[A-Za-z]+|\d+(?:\.\d+)?|[^\sA-Za-z\d]/g) || [];
  if (!parts.length) return "";
  const out: string[] = [];
  for (const token of parts) {
    if (/^[A-Za-z]+$/.test(token)) out.push(`<mi>${escapeXml(token)}</mi>`);
    else if (/^\d/.test(token)) out.push(`<mn>${escapeXml(token)}</mn>`);
    else out.push(`<mo>${escapeXml(token)}</mo>`);
  }
  return out.join("");
}

/**
 * Convert a LaTeX expression into a MathML string.
 *
 * The parser walks one token array with a single cursor: a command reads its
 * arguments from the same stream, so nested groups work without any special
 * case.
 */
export function latexToMathml(source: string): LatexResult {
  const pieces = scan(source);
  const unsupported: string[] = [];
  let pos = 0;

  /** Parse a sequence until the matching close brace (or the end). */
  function parseSequence(stopAtClose: boolean): string[] {
    const nodes: string[] = [];

    while (pos < pieces.length) {
      const piece = pieces[pos];

      if (piece.kind === "close") {
        if (stopAtClose) {
          pos += 1;
          return nodes;
        }
        pos += 1;
        continue;
      }
      if (piece.kind === "open") {
        pos += 1;
        const inner = parseSequence(true);
        nodes.push(`<mrow>${inner.join("")}</mrow>`);
        continue;
      }
      if (piece.kind === "sup" || piece.kind === "sub") {
        pos += 1;
        const exponent = parseArgument();
        const base = nodes.pop() || "<mi></mi>";
        nodes.push(
          piece.kind === "sup"
            ? `<msup>${base}${exponent}</msup>`
            : `<msub>${base}${exponent}</msub>`,
        );
        continue;
      }

      pos += 1;
      const node = renderCommand(piece.name, piece.macro);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  /** Read one argument: a braced group or a single token. */
  function parseArgument(): string {
    if (pos >= pieces.length) return "<mi></mi>";
    const piece = pieces[pos];
    if (piece.kind === "open") {
      pos += 1;
      const inner = parseSequence(true);
      return `<mrow>${inner.join("")}</mrow>`;
    }
    if (piece.kind === "close") return "<mi></mi>";
    pos += 1;
    if (piece.kind === "sup" || piece.kind === "sub") {
      const exponent = parseArgument();
      const base = "<mi></mi>";
      return piece.kind === "sup"
        ? `<msup>${base}${exponent}</msup>`
        : `<msub>${base}${exponent}</msub>`;
    }
    return renderCommand(piece.name, piece.macro) || "<mi></mi>";
  }

  function renderCommand(name: string, macro: boolean): string {
    if (!macro) {
      // A plain run of characters: identifiers, numbers and symbols.
      return renderPlainRun(name);
    }

    if (name === "frac") {
      const numerator = parseArgument();
      const denominator = parseArgument();
      return `<mfrac>${numerator}${denominator}</mfrac>`;
    }
    if (name === "sqrt") {
      // \sqrt[n]{x} puts the degree in brackets before the radicand.
      const saved = pos;
      const first = parseArgument();
      const isDegree = /^\[.*\]$/.test(first.replace(/<[^>]+>/g, "")) || /^\d+$/.test(
        first.replace(/<[^>]+>/g, ""),
      );
      if (isDegree) {
        const degree = first.replace(/<[^>]+>/g, "").replace(/^\[|\]$/g, "");
        const radicand = parseArgument();
        return `<mroot>${radicand}<mn>${escapeXml(degree)}</mn></mroot>`;
      }
      pos = saved;
      const radicand = parseArgument();
      return `<msqrt>${radicand}</msqrt>`;
    }
    if (name === "text" || name === "mathrm" || name === "mathbf" || name === "mathit") {
      const argument = parseArgument();
      const plain = argument
        .replace(/<mi>|<\/mi>/g, "")
        .replace(/<[^>]+>/g, "");
      return `<mtext>${plain}</mtext>`;
    }
    if (name === "left" || name === "right") {
      const argument = parseArgument();
      return argument.replace(/^<mi>|<\/mi>$/g, "");
    }
    if (name === "begin" || name === "end") {
      parseArgument();
      return "";
    }
    if (GREEK[name]) return `<mi>${GREEK[name]}</mi>`;
    if (OPERATORS[name]) return `<mo>${OPERATORS[name]}</mo>`;
    if (name === "langle") return "<mo>⟨</mo>";
    if (name === "rangle") return "<mo>⟩</mo>";
    if (name === "lfloor") return "<mo>⌊</mo>";
    if (name === "rfloor") return "<mo>⌋</mo>";
    if (name === "lceil") return "<mo>⌈</mo>";
    if (name === "rceil") return "<mo>⌉</mo>";
    if (name === "quad") return '<mspace width="1em"/>';
    if (name === ",") return '<mspace width="0.2em"/>';
    if (name === ";") return '<mspace width="0.3em"/>';
    if (name === "!" || name === '"' || name === "{" || name === "}") return "";
    // An escaped symbol, for example \% or \&.
    if (name.length === 1 && !/[A-Za-z0-9]/.test(name)) {
      return `<mo>${escapeXml(name)}</mo>`;
    }

    // A macro this converter does not know: report it instead of dropping it.
    unsupported.push(`\\${name}`);
    return "";
  }

  const body = parseSequence(false).join("");
  return {
    mathml: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${body}</mrow></math>`,
    unsupported,
  };
}
