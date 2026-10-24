/**
 * A small GraphQL language toolkit.
 *
 * It covers what the developer tools need without pulling in a GraphQL
 * library: a tokenizer, a pretty printer, a minifier, a structural validator
 * and a schema reader. The rules follow the GraphQL specification's lexical
 * and syntactic grammar.
 */

export type TokenType = "name" | "punct" | "string" | "number" | "comment";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const PUNCT = "{}()[]:=!|@$&,...";

/** Split a GraphQL document into tokens, keeping the line of every token. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r" || ch === ",") {
      i += 1;
      continue;
    }
    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === '"') {
      // A block string runs until the closing triple quote.
      if (source.startsWith('"""', i)) {
        const end = source.indexOf('"""', i + 3);
        const stop = end === -1 ? source.length : end + 3;
        const raw = source.slice(i, stop);
        tokens.push({ type: "string", value: raw, line });
        line += (raw.match(/\n/g) || []).length;
        i = stop;
        continue;
      }
      let j = i + 1;
      let value = '"';
      while (j < source.length && source[j] !== '"') {
        if (source[j] === "\\") {
          value += source[j] + (source[j + 1] || "");
          j += 2;
          continue;
        }
        if (source[j] === "\n") break;
        value += source[j];
        j += 1;
      }
      value += '"';
      tokens.push({ type: "string", value, line });
      i = j + 1;
      continue;
    }
    if (/[-0-9]/.test(ch)) {
      let j = i;
      while (j < source.length && /[-+0-9.eE]/.test(source[j])) j += 1;
      tokens.push({ type: "number", value: source.slice(i, j), line });
      i = j;
      continue;
    }
    if (/[_A-Za-z]/.test(ch)) {
      let j = i;
      while (j < source.length && /[_0-9A-Za-z]/.test(source[j])) j += 1;
      tokens.push({ type: "name", value: source.slice(i, j), line });
      i = j;
      continue;
    }
    if (PUNCT.includes(ch)) {
      let punct = ch;
      if (ch === "." && source.startsWith("...", i)) punct = "...";
      tokens.push({ type: "punct", value: punct, line });
      i += punct.length;
      continue;
    }
    // Anything else is not part of the GraphQL grammar.
    tokens.push({ type: "punct", value: ch, line });
    i += 1;
  }

  return tokens;
}

const DEFINITION_KEYWORDS = new Set([
  "query",
  "mutation",
  "subscription",
  "fragment",
  "type",
  "interface",
  "input",
  "enum",
  "union",
  "scalar",
  "schema",
  "extend",
  "directive",
]);

/** Pretty print a GraphQL document. */
export function formatGraphql(source: string): string {
  const tokens = tokenize(source);
  const out: string[] = [];
  let line = "";
  let depth = 0;
  let cont = false;

  const indent = () => "  ".repeat(depth);

  const flush = () => {
    const trimmed = line.replace(/\s+$/, "");
    if (trimmed.trim()) out.push(trimmed);
    line = "";
  };

  const push = (text: string) => {
    if (!line) line = indent();
    line += text;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === "punct") {
      if (token.value === "{") {
        push(" {");
        flush();
        depth += 1;
        cont = false;
        continue;
      }
      if (token.value === "}") {
        flush();
        depth = Math.max(0, depth - 1);
        out.push(`${indent()}}`);
        cont = false;
        continue;
      }
      if (token.value === "(") {
        let group = "(";
        let j = i + 1;
        while (j < tokens.length && tokens[j].value !== ")") {
          group += tokens[j].value;
          j += 1;
        }
        group += ")";
        push(group);
        i = j;
        cont = false;
        continue;
      }
      if (token.value === "[") {
        let group = "[";
        let j = i + 1;
        while (j < tokens.length && tokens[j].value !== "]") {
          group += tokens[j].value;
          j += 1;
        }
        group += "]";
        push(group);
        i = j;
        cont = false;
        continue;
      }
      if (token.value === ":") {
        push(": ");
        cont = true;
        continue;
      }
      if (token.value === "=") {
        push(" = ");
        cont = true;
        continue;
      }
      if (token.value === "|" || token.value === "&") {
        push(` ${token.value} `);
        cont = true;
        continue;
      }
      if (token.value === "@") {
        push(" @");
        cont = true;
        continue;
      }
      if (token.value === "...") {
        push("...");
        cont = true;
        continue;
      }
      if (token.value === "$") {
        push("$");
        cont = true;
        continue;
      }
      if (token.value === "!") {
        push("!");
        cont = false;
        continue;
      }
      push(token.value);
      cont = false;
      continue;
    }

    if (token.type === "name") {
      if (depth === 0 && DEFINITION_KEYWORDS.has(token.value)) {
        flush();
        if (out.length && out[out.length - 1] !== "") out.push("");
      } else if (depth > 0 && !cont && line.trim()) {
        flush();
      }
      push(token.value);
      cont = false;
      continue;
    }

    if (!cont && depth > 0 && line.trim()) flush();
    push(token.value);
    cont = false;
  }

  flush();
  return out.join("\n");
}

/** Collapse a GraphQL document into a single line. */
export function minifyGraphql(source: string): string {
  const tokens = tokenize(source);
  let out = "";
  let previous: Token | null = null;

  for (const token of tokens) {
    const needsSpace =
      previous &&
      (previous.type === "name" || previous.type === "number") &&
      (token.type === "name" || token.type === "number");
    if (needsSpace) out += " ";
    out += token.value;
    previous = token;
  }
  return out.trim();
}

export interface GraphqlIssue {
  message: string;
  line: number;
}

/**
 * A translator that resolves a catalogue key to a localized string.
 *
 * This module is a plain toolkit without a React hook, so the caller passes the
 * translator of the namespace it renders the issues in.
 */
export type GraphqlTranslate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Read a type reference: a name, optionally wrapped in lists and non-null marks.
 *
 * The GraphQL grammar allows `ID!`, `[Item!]!` and `[String]`, so the reader
 * has to take the whole reference and not only the first name.
 */
function readTypeReference(tokens: Token[], start: number): { text: string; next: number } {
  let i = start;
  let text = "";

  if (tokens[i] && tokens[i].type === "punct" && tokens[i].value === "[") {
    text += "[";
    i += 1;
    const inner = readTypeReference(tokens, i);
    text += inner.text;
    i = inner.next;
    if (tokens[i] && tokens[i].type === "punct" && tokens[i].value === "]") {
      text += "]";
      i += 1;
    }
  } else if (tokens[i] && tokens[i].type === "name") {
    text += tokens[i].value;
    i += 1;
  }

  if (tokens[i] && tokens[i].type === "punct" && tokens[i].value === "!") {
    text += "!";
    i += 1;
  }

  return { text, next: i };
}

/** The type names a type reference mentions. */
function typeReferenceNames(text: string): string[] {
  return text.match(/[_A-Za-z][_0-9A-Za-z]*/g) || [];
}

/**
 * Check a GraphQL document.
 *
 * The checks are the ones a developer actually hits: unbalanced delimiters, an
 * empty document, an operation without a selection set and a type that is used
 * but never defined.
 */
export function validateGraphql(source: string, t: GraphqlTranslate): GraphqlIssue[] {
  const issues: GraphqlIssue[] = [];
  const tokens = tokenize(source);

  if (!tokens.length) {
    issues.push({ message: t("graphqlDocumentIsEmpty"), line: 1 });
    return issues;
  }

  const stack: { value: string; line: number }[] = [];
  const pairs: Record<string, string> = { "}": "{", ")": "(", "]": "[" };
  for (const token of tokens) {
    if (token.type !== "punct") continue;
    if (token.value === "{" || token.value === "(" || token.value === "[") {
      stack.push({ value: token.value, line: token.line });
      continue;
    }
    if (pairs[token.value]) {
      const open = stack.pop();
      if (!open) {
        issues.push({
          message: t("graphqlUnexpectedToken", { token: token.value }),
          line: token.line,
        });
      } else if (open.value !== pairs[token.value]) {
        issues.push({
          message: t("graphqlUnexpectedClose", {
            token: token.value,
            open: open.value,
            line: String(open.line),
          }),
          line: token.line,
        });
      }
    }
  }
  for (const open of stack) {
    issues.push({ message: t("graphqlNeverClosed", { token: open.value }), line: open.line });
  }
  if (issues.length) return issues;

  // An operation has to select something.
  const first = tokens[0];
  if (first.type === "name" && ["query", "mutation", "subscription"].includes(first.value)) {
    const hasSelection = tokens.some(
      (token, index) => token.type === "punct" && token.value === "{" && index > 0,
    );
    if (!hasSelection) {
      issues.push({
        message: t("graphqlNoSelectionSet", { operation: first.value }),
        line: first.line,
      });
    }
  }

  // Every type that is used has to be defined.
  const defined = new Set<string>();
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "name") continue;
    if (!["type", "interface", "input", "enum", "union", "scalar"].includes(token.value)) continue;
    const name = tokens[i + 1];
    if (name && name.type === "name") {
      defined.add(name.value);
      i += 1;
    }
  }

  if (defined.size) {
    const used = new Map<string, number>();
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      // Only a field type is a type reference. A default value ("=") may hold
      // an enum value, and an enum value is not a type.
      if (token.type === "punct" && token.value === ":") {
        const ref = readTypeReference(tokens, i + 1);
        for (const name of typeReferenceNames(ref.text)) {
          if (!used.has(name)) used.set(name, token.line);
        }
        i = ref.next - 1;
      }
    }
    for (const [name, line] of used) {
      if (defined.has(name)) continue;
      if (["String", "Int", "Float", "Boolean", "ID"].includes(name)) continue;
      issues.push({
        message: t("graphqlUndefinedType", { name }),
        line,
      });
    }
  }

  return issues;
}

export interface GraphqlType {
  kind: string;
  name: string;
  fields: { name: string; type: string }[];
}

/** The definitions that carry a body of fields. */
const BODY_KINDS = new Set(["type", "interface", "input", "enum"]);

/** The definitions a schema can declare. */
const DEFINITION_KINDS = new Set([
  "type",
  "interface",
  "input",
  "enum",
  "union",
  "scalar",
]);

/** Read the types a GraphQL schema defines. */
export function readSchema(source: string): GraphqlType[] {
  const tokens = tokenize(source);
  const types: GraphqlType[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "name") continue;
    if (!DEFINITION_KINDS.has(token.value)) continue;

    const nameToken = tokens[i + 1];
    if (!nameToken || nameToken.type !== "name") continue;
    const kind = token.value;
    const name = nameToken.value;
    i += 1;

    const fields: { name: string; type: string }[] = [];

    // A union and a scalar have no body of fields.
    if (BODY_KINDS.has(kind)) {
      let j = i + 1;
      // Skip "implements A & B" up to the body.
      while (j < tokens.length && !(tokens[j].type === "punct" && tokens[j].value === "{")) {
        j += 1;
      }
      if (j < tokens.length) {
        j += 1;
        let depth = 1;
        let pendingName = "";
        while (j < tokens.length && depth > 0) {
          const current = tokens[j];
          if (current.type === "punct" && current.value === "{") {
            depth += 1;
            j += 1;
            continue;
          }
          if (current.type === "punct" && current.value === "}") {
            depth -= 1;
            j += 1;
            continue;
          }
          if (current.type === "punct" && current.value === "(") {
            // Skip the argument list of the field.
            let inner = 1;
            j += 1;
            while (j < tokens.length && inner > 0) {
              const at = tokens[j];
              if (at.type === "punct" && at.value === "(") inner += 1;
              else if (at.type === "punct" && at.value === ")") inner -= 1;
              j += 1;
            }
            continue;
          }
          if (current.type === "punct" && current.value === "=") {
            // Skip the default value of the field.
            j += 2;
            pendingName = "";
            continue;
          }
          if (current.type === "name" && !pendingName) {
            pendingName = current.value;
            j += 1;
            continue;
          }
          if (current.type === "punct" && current.value === ":") {
            const ref = readTypeReference(tokens, j + 1);
            if (pendingName) {
              fields.push({ name: pendingName, type: ref.text });
              pendingName = "";
            }
            j = ref.next;
            continue;
          }
          j += 1;
        }
        i = j - 1;
      }
    }

    types.push({ kind, name, fields });
  }

  return types;
}
