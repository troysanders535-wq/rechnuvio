/**
 * The token breakdown of a regular expression and the deterministic pattern
 * generator that the regex tools use.
 *
 * The module is free of React and of translation hooks on purpose: every
 * meaning is returned as an i18n key plus its interpolation values, so the
 * components can translate them with `useTranslations`.
 */

/** One part of a regular expression and the key of its explanation. */
export interface RegexToken {
  /** The source text of the token. */
  text: string;
  /** The key of the explanation inside `ui.engines.RegexEngine`. */
  meaningKey: string;
  /** The interpolation values of the explanation. */
  values?: Record<string, string | number>;
  /** The tokens of a group, listed below the group itself. */
  children?: RegexToken[];
}

/** The kinds of pattern the generator can produce. */
export interface PatternPreset {
  id: string;
  /** The key of the label inside `ui.engines.RegexEngine`. */
  labelKey: string;
  /** The key of the short description inside `ui.engines.RegexEngine`. */
  hintKey: string;
  /** The generated regular expression. */
  pattern: string;
}

/**
 * The pattern presets of the generator and of the pattern assistant. Every
 * preset is a complete, well formed ECMAScript regular expression.
 */
export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "auto",
    labelKey: "presetAuto",
    hintKey: "presetAutoHint",
    pattern: "",
  },
  {
    id: "email",
    labelKey: "presetEmail",
    hintKey: "presetEmailHint",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  },
  {
    id: "url",
    labelKey: "presetUrl",
    hintKey: "presetUrlHint",
    pattern: "https?:\\/\\/[^\\s/?#]+\\.[^\\s/?#]+[^\\s]*",
  },
  {
    id: "date",
    labelKey: "presetDate",
    hintKey: "presetDateHint",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
  },
  {
    id: "time",
    labelKey: "presetTime",
    hintKey: "presetTimeHint",
    pattern: "\\d{2}:\\d{2}(:\\d{2})?",
  },
  {
    id: "hexColor",
    labelKey: "presetHexColor",
    hintKey: "presetHexColorHint",
    pattern: "#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b",
  },
  {
    id: "number",
    labelKey: "presetNumber",
    hintKey: "presetNumberHint",
    pattern: "-?\\d+(\\.\\d+)?",
  },
  {
    id: "phone",
    labelKey: "presetPhone",
    hintKey: "presetPhoneHint",
    pattern: "\\+?[0-9][0-9 ()\\-]{7,}[0-9]",
  },
  {
    id: "ipv4",
    labelKey: "presetIpv4",
    hintKey: "presetIpv4Hint",
    pattern: "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b",
  },
  {
    id: "word",
    labelKey: "presetWord",
    hintKey: "presetWordHint",
    pattern: "[A-Za-z_][A-Za-z0-9_]*",
  },
];

/** The preset of a preset id. */
export function presetById(id: string): PatternPreset | undefined {
  return PATTERN_PRESETS.find((preset) => preset.id === id);
}

/**
 * Work out which pattern a description asks for. The detection is keyword
 * based and therefore deterministic - the same description always produces the
 * same regular expression.
 */
export function detectPattern(description: string): {
  presetId: string;
  pattern: string;
} {
  const text = description.toLowerCase();

  if (/e-?mail|mail address|mailadresse/.test(text)) {
    return { presetId: "email", pattern: presetById("email")!.pattern };
  }
  if (/\burl\b|\blink\b|website|web address/.test(text)) {
    return { presetId: "url", pattern: presetById("url")!.pattern };
  }
  if (/hex|colou?r|farbe/.test(text)) {
    return { presetId: "hexColor", pattern: presetById("hexColor")!.pattern };
  }
  if (/\bdate\b|yyyy|jjjj/.test(text)) {
    if (/yyyy-mm-dd|jjjj-mm-tt/.test(text)) {
      return { presetId: "date", pattern: "\\d{4}-\\d{2}-\\d{2}" };
    }
    if (/dd\/mm\/yyyy|tt\/mm\/jjjj/.test(text)) {
      return { presetId: "date", pattern: "\\d{2}\\/\\d{2}\\/\\d{4}" };
    }
    return { presetId: "date", pattern: "\\d{4}[-/]\\d{2}[-/]\\d{2}" };
  }
  if (/\btime\b|uhrzeit|hh:mm/.test(text)) {
    return { presetId: "time", pattern: presetById("time")!.pattern };
  }
  if (/phone|telephone|mobile|telefon/.test(text)) {
    return { presetId: "phone", pattern: presetById("phone")!.pattern };
  }
  if (/ip address|ipv4|ip-adresse/.test(text)) {
    return { presetId: "ipv4", pattern: presetById("ipv4")!.pattern };
  }
  if (/number|integer|numeric|digit|zahl/.test(text)) {
    return { presetId: "number", pattern: presetById("number")!.pattern };
  }
  if (/word|username|identifier|slug|wort/.test(text)) {
    return { presetId: "word", pattern: presetById("word")!.pattern };
  }
  return { presetId: "word", pattern: presetById("word")!.pattern };
}

/**
 * The pattern of a tool: the preset the user picked, refined by the words of
 * the description. The "auto" preset takes the pattern from the description.
 */
export function resolvePattern(
  description: string,
  presetId: string,
): { presetId: string; pattern: string } {
  const detected = detectPattern(description);
  if (presetId && presetId !== "auto") {
    const preset = presetById(presetId);
    if (!preset) return detected;
    // A date description may name its own format.
    if (presetId === "date" && detected.presetId === "date" && detected.pattern !== preset.pattern) {
      return { presetId: "date", pattern: detected.pattern };
    }
    return { presetId, pattern: preset.pattern };
  }
  return detected;
}

/** Find the closing parenthesis of the group that starts at `start`. */
function findGroupEnd(pattern: string, start: number): number {
  let depth = 0;
  let inClass = false;
  for (let i = start; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Find the closing bracket of the character class that starts at `start`. */
function findClassEnd(pattern: string, start: number): number {
  for (let i = start + 1; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "]") return i;
  }
  return -1;
}

/** The meaning of an escape sequence. */
function escapeToken(pattern: string, index: number): { token: RegexToken; next: number } {
  const next = pattern[index + 1];
  switch (next) {
    case "d":
      return { token: { text: "\\d", meaningKey: "tokenDigit" }, next: index + 2 };
    case "D":
      return { token: { text: "\\D", meaningKey: "tokenNotDigit" }, next: index + 2 };
    case "w":
      return { token: { text: "\\w", meaningKey: "tokenWord" }, next: index + 2 };
    case "W":
      return { token: { text: "\\W", meaningKey: "tokenNotWord" }, next: index + 2 };
    case "s":
      return { token: { text: "\\s", meaningKey: "tokenSpace" }, next: index + 2 };
    case "S":
      return { token: { text: "\\S", meaningKey: "tokenNotSpace" }, next: index + 2 };
    case "b":
      return { token: { text: "\\b", meaningKey: "tokenWordBoundary" }, next: index + 2 };
    case "B":
      return { token: { text: "\\B", meaningKey: "tokenNotWordBoundary" }, next: index + 2 };
    case "n":
      return { token: { text: "\\n", meaningKey: "tokenEscapeNewline" }, next: index + 2 };
    case "t":
      return { token: { text: "\\t", meaningKey: "tokenEscapeTab" }, next: index + 2 };
    case "r":
      return { token: { text: "\\r", meaningKey: "tokenEscapeCarriageReturn" }, next: index + 2 };
    case "x": {
      const hex = pattern.slice(index + 2, index + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        return {
          token: { text: `\\x${hex}`, meaningKey: "tokenHexEscape", values: { code: hex } },
          next: index + 4,
        };
      }
      break;
    }
    case "u": {
      const hex = pattern.slice(index + 2, index + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        return {
          token: { text: `\\u${hex}`, meaningKey: "tokenUnicodeEscape", values: { code: hex } },
          next: index + 6,
        };
      }
      break;
    }
    default:
      break;
  }

  if (next && /[1-9]/.test(next)) {
    let digits = "";
    let cursor = index + 1;
    while (cursor < pattern.length && /[0-9]/.test(pattern[cursor])) {
      digits += pattern[cursor];
      cursor += 1;
    }
    return {
      token: { text: `\\${digits}`, meaningKey: "tokenBackreference", values: { group: digits } },
      next: cursor,
    };
  }

  const escaped = next ?? "";
  return {
    token: { text: `\\${escaped}`, meaningKey: "tokenEscape", values: { char: escaped } },
    next: index + 2,
  };
}

/**
 * Split a regular expression into its tokens. Groups keep their content as
 * children, so a nested pattern is explained as well.
 */
export function tokenizePattern(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === "\\") {
      const { token, next } = escapeToken(pattern, i);
      tokens.push(token);
      i = next;
      continue;
    }

    if (ch === "[") {
      const end = findClassEnd(pattern, i);
      if (end === -1) {
        tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
        i += 1;
        continue;
      }
      const text = pattern.slice(i, end + 1);
      const negated = text.startsWith("[^");
      tokens.push({
        text,
        meaningKey: negated ? "tokenNegatedCharClass" : "tokenCharClass",
        values: { content: text.slice(negated ? 2 : 1, -1) },
      });
      i = end + 1;
      continue;
    }

    if (ch === "(") {
      const end = findGroupEnd(pattern, i);
      if (end === -1) {
        tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
        i += 1;
        continue;
      }
      const text = pattern.slice(i, end + 1);
      const inner = text.slice(1, -1);

      let meaningKey = "tokenGroup";
      let values: Record<string, string | number> = { content: inner };

      if (inner.startsWith("?")) {
        if (inner.startsWith("?<=")) {
          meaningKey = "tokenLookbehind";
          values = { content: inner.slice(3) };
        } else if (inner.startsWith("?<!")) {
          meaningKey = "tokenNegativeLookbehind";
          values = { content: inner.slice(3) };
        } else if (inner.startsWith("?=")) {
          meaningKey = "tokenLookahead";
          values = { content: inner.slice(2) };
        } else if (inner.startsWith("?!")) {
          meaningKey = "tokenNegativeLookahead";
          values = { content: inner.slice(2) };
        } else if (inner.startsWith("?<")) {
          const name = inner.slice(2).split(">")[0];
          meaningKey = "tokenNamedGroup";
          values = { content: inner.slice(inner.indexOf(">") + 1), name };
        } else if (inner.startsWith("?:")) {
          meaningKey = "tokenNonCapturingGroup";
          values = { content: inner.slice(2) };
        } else {
          meaningKey = "tokenGroupModifier";
          values = { content: inner.slice(1) };
        }
      }

      tokens.push({
        text,
        meaningKey,
        values,
        children: tokenizePattern(inner.replace(/^\?(?:[:=!]|<[=!]?)/, "")),
      });
      i = end + 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
      i += 1;
      continue;
    }

    if (ch === "{") {
      const match = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
      if (match) {
        const text = match[0];
        if (match[2] === undefined) {
          tokens.push({
            text,
            meaningKey: "tokenRepeatExact",
            values: { count: match[1] },
          });
        } else if (match[3] === "") {
          tokens.push({
            text,
            meaningKey: "tokenRepeatMin",
            values: { count: match[1] },
          });
        } else {
          tokens.push({
            text,
            meaningKey: "tokenRepeatRange",
            values: { count: match[1], max: match[3] },
          });
        }
        i += text.length;
        continue;
      }
      tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
      i += 1;
      continue;
    }

    if (ch === "*" || ch === "+" || ch === "?") {
      const lazy = pattern[i + 1] === "?";
      const text = lazy ? `${ch}?` : ch;
      const base =
        ch === "*" ? "tokenQuantifierStar" : ch === "+" ? "tokenQuantifierPlus" : "tokenQuantifierOptional";
      const meaningKey = lazy
        ? base === "tokenQuantifierStar"
          ? "tokenQuantifierStarLazy"
          : base === "tokenQuantifierPlus"
          ? "tokenQuantifierPlusLazy"
          : "tokenQuantifierOptionalLazy"
        : base;
      tokens.push({ text, meaningKey });
      i += text.length;
      continue;
    }

    if (ch === ".") {
      tokens.push({ text: ch, meaningKey: "tokenAnyChar" });
      i += 1;
      continue;
    }

    if (ch === "^") {
      tokens.push({ text: ch, meaningKey: "tokenStartAnchor" });
      i += 1;
      continue;
    }

    if (ch === "$") {
      tokens.push({ text: ch, meaningKey: "tokenEndAnchor" });
      i += 1;
      continue;
    }

    if (ch === "|") {
      tokens.push({ text: ch, meaningKey: "tokenAlternation" });
      i += 1;
      continue;
    }

    if (ch === "}" || ch === "]") {
      tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
      i += 1;
      continue;
    }

    tokens.push({ text: ch, meaningKey: "tokenLiteral", values: { char: ch } });
    i += 1;
  }

  return tokens;
}
