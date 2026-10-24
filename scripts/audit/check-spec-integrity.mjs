/**
 * Integrity check for the functional spec suite.
 *
 * The suite is only worth its PASS count if every spec asserts the behaviour
 * the tool promises. A spec that merely checks "the word 'cron' appears on
 * the page" passes against a stub whose heading happens to contain that word,
 * so such a spec cannot fail for the right reason.
 *
 * Every spec body is classified into one of three tiers:
 *
 *   A  value assertion against an independently established expectation
 *      (a decoded artefact, a value computed in the spec file, a value taken
 *      from a fixture the spec builds itself)
 *   B  value assertion against a literal expectation
 *      (the result is compared, but the expectation is written out by hand
 *      instead of being derived)
 *   C  presence-only assertion
 *      (a string, a label, a control or an accept attribute is checked for
 *      existence - the promised behaviour is never observed)
 *
 * Tier C is a defect: those specs cannot distinguish a working tool from a
 * stub. The script reports them so they can be strengthened, never weakened.
 *
 * The spec bodies are read from the module source, not from the registry,
 * because a family registers some tools through a thin wrapper
 * (`toolSpec(slug, name, fn)`) and the registry would only expose the wrapper.
 *
 * Usage:  node scripts/audit/check-spec-integrity.mjs [--json] [--tier=C]
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = path.join(HERE, "tests");

/* ------------------------------------------------------------- helpers --- */

/** The assertion helpers that only check presence, never a value. */
const PRESENCE_HELPERS = [
  "requireFileType",
  "requireSubject",
  "requireControl",
  "requireControlCount",
  "assertOwnWorkspace",
];

/** The assertion helpers that compare a value against an expectation. */
const VALUE_HELPERS = ["assertEqual", "assertIncludes", "assertNotIncludes", "assertMatches"];

/**
 * Extract a balanced block from `source` starting at the `{` at `start`.
 *
 * String literals, template literals and comments are skipped, so a brace
 * inside a message string does not end the block early.
 */
function blockAt(source, start) {
  let depth = 0;
  let i = start;
  let mode = null; // 'line', 'block', '"', "'", '`'
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === "line") {
      if (c === "\n") mode = null;
    } else if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = null;
        i += 1;
      }
    } else if (mode) {
      if (c === "\\") i += 1;
      else if (c === mode) mode = null;
    } else if (c === "/" && n === "/") {
      mode = "line";
      i += 1;
    } else if (c === "/" && n === "*") {
      mode = "block";
      i += 1;
    } else if (c === '"' || c === "'" || c === "`") {
      mode = c;
    } else if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
    i += 1;
  }
  return source.slice(start);
}

/**
 * The argument list of a call at `idx`, split at the top level.
 *
 * Commas inside a string, a template literal or a nested bracket never end an
 * argument: a tool name such as "counts the presses, the scrolls and the
 * movement" is one argument, not two.
 */
function callArgs(source, idx) {
  const open = source.indexOf("(", idx);
  if (open < 0) return null;
  let depth = 0;
  let mode = null;
  let i = open;
  for (; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === "line") {
      if (c === "\n") mode = null;
    } else if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = null;
        i += 1;
      }
    } else if (mode) {
      if (c === "\\") i += 1;
      else if (c === mode) mode = null;
    } else if (c === "/" && n === "/") {
      mode = "line";
      i += 1;
    } else if (c === "/" && n === "*") {
      mode = "block";
      i += 1;
    } else if (c === '"' || c === "'" || c === "`") {
      mode = c;
    } else if (c === "(") depth += 1;
    else if (c === ")") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const inner = source.slice(open + 1, i);
  const args = [];
  let d = 0;
  let m = null;
  let cur = "";
  for (let j = 0; j < inner.length; j += 1) {
    const c = inner[j];
    const n = inner[j + 1];
    if (m) {
      if (m === "line") {
        if (c === "\n") {
          m = null;
          cur += c;
        }
        continue;
      }
      if (m === "block") {
        if (c === "*" && n === "/") {
          m = null;
          j += 1;
        }
        continue;
      }
      if (c === "\\") {
        cur += c + (inner[j + 1] || "");
        j += 1;
        continue;
      }
      cur += c;
      if (c === m) m = null;
      continue;
    }
    if (c === "/" && n === "/") {
      m = "line";
      continue;
    }
    if (c === "/" && n === "*") {
      m = "block";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      m = c;
      cur += c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") d += 1;
    else if (c === ")" || c === "]" || c === "}") d -= 1;
    if (c === "," && d === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/** Is this argument text a literal (string, number, regex, true/false/null)? */
function isLiteral(text) {
  const t = (text || "").trim();
  if (!t) return true;
  if (/^(["'`])[\s\S]*\1$/s.test(t)) return true;
  if (/^\/[\s\S]*\/[a-z]*$/s.test(t)) return true;
  if (/^-?\d+(\.\d+)?$/.test(t)) return true;
  if (/^(true|false|null|undefined)$/.test(t)) return true;
  return false;
}

/**
 * The expectation argument of an assertion, or null when the helper has no
 * value argument.
 */
function expectedArg(helper, args) {
  if (helper === "assertEqual") return args[1];
  if (helper === "assertIncludes") return args[1];
  if (helper === "assertNotIncludes") return args[1];
  if (helper === "assertMatches") return args[1];
  return null;
}

/** The index of the `)` that closes the `(` at `open`, or -1. */
function matchParen(source, open) {
  let depth = 0;
  let mode = null;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === "line") {
      if (c === "\n") mode = null;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = null;
        i += 1;
      }
      continue;
    }
    if (mode) {
      if (c === "\\") i += 1;
      else if (c === mode) mode = null;
      continue;
    }
    if (c === "/" && n === "/") {
      mode = "line";
      i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      mode = "block";
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      mode = c;
      continue;
    }
    if (c === "(") depth += 1;
    else if (c === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * The local helper functions and arrow constants of a module, so a spec that
 * delegates to a shared helper is judged on the helper, not on the wrapper.
 */
function localHelpers(source) {
  const found = new Map();

  const collect = (name, paren) => {
    const close = matchParen(source, paren);
    if (close < 0) return;
    const brace = source.indexOf("{", close);
    if (brace < 0) return;
    found.set(name, blockAt(source, brace));
  };

  const fnPattern = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = fnPattern.exec(source)) !== null) {
    const name = m[1];
    if (found.has(name)) continue;
    const paren = source.indexOf("(", m.index + m[0].length - 1);
    if (paren < 0) continue;
    collect(name, paren);
  }

  const arrowPattern = /(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g;
  while ((m = arrowPattern.exec(source)) !== null) {
    const name = m[1];
    if (found.has(name)) continue;
    const paren = source.indexOf("(", m.index + m[0].length - 1);
    if (paren < 0) continue;
    const close = matchParen(source, paren);
    if (close < 0) continue;
    const after = source.indexOf("=>", close);
    if (after < 0) continue;
    const brace = source.indexOf("{", after);
    if (brace < 0) continue;
    found.set(name, blockAt(source, brace));
  }

  return found;
}

/** The body of a function expression, given as source text. */
function bodyOfExpression(expr, helpers) {
  const t = expr.trim();
  if (!t) return null;

  if (/^(async\s+)?function\b/.test(t)) {
    const brace = t.indexOf("{");
    return brace < 0 ? null : blockAt(t, brace);
  }
  if (/^(async\s*)?\(/.test(t)) {
    const arrow = t.indexOf("=>");
    if (arrow < 0) return null;
    const brace = t.indexOf("{", arrow);
    if (brace < 0) return null;
    return blockAt(t, brace);
  }
  // A bare identifier: resolve it against the local helpers.
  if (/^[A-Za-z_$][\w$]*$/.test(t) && helpers.has(t)) return helpers.get(t);
  return null;
}

/* ------------------------------------------------------------ analysis --- */

/**
 * Mask the comments and the string bodies of a source text.
 *
 * String literals keep their quotes (so a literal expectation is still
 * recognisable) and template literals keep their interpolations (so an
 * expectation built from a computed value is still recognisable).
 */
function codeOnly(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === "/" && n === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out += quote;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\\") i += 1;
        i += 1;
      }
      out += quote;
      i += 1;
      continue;
    }
    if (c === "`") {
      out += "`";
      i += 1;
      while (i < text.length && text[i] !== "`") {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === "$" && text[i + 1] === "{") {
          let depth = 1;
          i += 2;
          const start = i;
          while (i < text.length && depth > 0) {
            if (text[i] === "{") depth += 1;
            else if (text[i] === "}") depth -= 1;
            if (depth > 0) i += 1;
          }
          out += "${" + text.slice(start, i) + "}";
          i += 1;
          continue;
        }
        i += 1;
      }
      out += "`";
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * The comparison inside a condition, or null when there is none.
 *
 * `assert(a === b)` carries its expectation in the comparison, while a plain
 * `assert(a)` only checks that something is there.
 */
function comparison(expr) {
  const t = expr.trim();
  const ops = ["===", "!==", "==", "!=", ">=", "<=", ">", "<"];
  const scan = (depthAware) => {
    let depth = 0;
    let mode = null;
    for (let i = 0; i < t.length; i += 1) {
      const c = t[i];
      if (mode) {
        if (c === "\\") i += 1;
        else if (c === mode) mode = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        mode = c;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") depth += 1;
      else if (c === ")" || c === "]" || c === "}") depth -= 1;
      else if (!depthAware || depth === 0) {
        for (const op of ops) {
          if (t.startsWith(op, i)) {
            return { op, left: t.slice(0, i), right: t.slice(i + op.length) };
          }
        }
      }
    }
    return null;
  };

  // A comparison at the top level is the clearest expectation; a comparison
  // inside a callback (".some((p) => p.text === payload)") is still one.
  const direct = scan(true);
  if (direct) return direct;

  const nested = scan(false);
  if (nested) return nested;

  const method = /\.(includes|startsWith|endsWith|match|test)\s*\(/.exec(t);
  if (method) {
    const open = t.indexOf("(", method.index);
    const args = callArgs(t, open);
    if (args && args.length) {
      return { op: `.${method[1]}`, left: t.slice(0, method.index), right: args[0] };
    }
  }
  return null;
}

function analyse(body) {
  const code = codeOnly(body);
  const tiers = { A: 0, B: 0, C: 0 };
  const notes = [];

  for (const helper of PRESENCE_HELPERS) {
    const re = new RegExp(`\\b${helper}\\s*\\(`, "g");
    let m;
    while ((m = re.exec(code)) !== null) {
      tiers.C += 1;
      notes.push(helper);
    }
  }

  for (const helper of VALUE_HELPERS) {
    const re = new RegExp(`\\b${helper}\\s*\\(`, "g");
    let m;
    while ((m = re.exec(code)) !== null) {
      const args = callArgs(code, m.index) || [];
      const expected = expectedArg(helper, args);
      if (expected === null || expected === undefined) {
        tiers.C += 1;
        notes.push(helper);
      } else if (isLiteral(expected)) {
        tiers.B += 1;
      } else {
        tiers.A += 1;
      }
    }
  }

  // node:assert - the condition or the second argument carries the expectation.
  const assertPattern = /\bassert(\.\w+)?\s*\(/g;
  let m;
  while ((m = assertPattern.exec(code)) !== null) {
    const method = (m[1] || "").replace(/^\./, "");
    const args = callArgs(code, m.index) || [];

    if (["equal", "notEqual", "strictEqual", "notStrictEqual", "deepEqual", "deepStrictEqual"].includes(method)) {
      const expected = args[1];
      if (expected === undefined) {
        tiers.C += 1;
        notes.push(`assert.${method}`);
      } else if (isLiteral(expected)) tiers.B += 1;
      else tiers.A += 1;
      continue;
    }
    if (method === "match" || method === "doesNotMatch") {
      const expected = args[1];
      if (expected === undefined) {
        tiers.C += 1;
        notes.push(`assert.${method}`);
      } else if (isLiteral(expected)) tiers.B += 1;
      else tiers.A += 1;
      continue;
    }
    if (method === "throws" || method === "rejects") {
      // The behaviour is observed, but no value is compared.
      tiers.B += 1;
      notes.push(`assert.${method}`);
      continue;
    }
    if (method === "fail") {
      tiers.C += 1;
      notes.push("assert.fail");
      continue;
    }

    const condition = args[0];
    if (condition === undefined) {
      tiers.C += 1;
      notes.push("assert");
      continue;
    }
    const cmp = comparison(condition);
    if (!cmp) {
      tiers.C += 1;
      notes.push(method ? `assert.${method}(truthy)` : "assert(truthy)");
      continue;
    }
    if (isLiteral(cmp.right) || isLiteral(cmp.left)) tiers.B += 1;
    else tiers.A += 1;
  }

  if (tiers.A > 0) return { tier: "A", tiers, notes };
  if (tiers.B > 0) return { tier: "B", tiers, notes };
  if (tiers.C > 0) return { tier: "C", tiers, notes };
  return { tier: "none", tiers, notes };
}

/* --------------------------------------------------------------- main --- */

const files = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith(".mjs") && f !== "index.mjs")
  .map((f) => path.join(TESTS_DIR, f))
  .concat([path.join(HERE, "functional-tests.mjs")]);

const results = [];
const seen = new Map();

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const helpers = localHelpers(source);
  const label = path.basename(file);

  const callPattern = /(?:^|[\s(;])(spec|toolSpec)\s*\(/g;
  let m;
  while ((m = callPattern.exec(source)) !== null) {
    const args = callArgs(source, m.index + m[0].length - 1);
    if (!args || args.length < 3) continue;
    const slug = (args[0] || "").trim().replace(/^["'`]|["'`]$/g, "");
    if (!/^[a-z0-9-]+$/.test(slug)) continue;

    let body = bodyOfExpression(args[2], helpers);
    if (!body) continue;

    // Resolve one level of delegation to a shared local helper.
    for (const [helperName, helperBody] of helpers) {
      if (helperName === "spec" || helperName === "toolSpec") continue;
      if (!new RegExp(`\\b${helperName}\\s*\\(`).test(codeOnly(body))) continue;
      if (new RegExp(`\\b${helperName}\\s*\\(`).test(codeOnly(helperBody))) continue;
      body += "\n" + helperBody;
    }

    const verdict = analyse(body);
    seen.set(slug, { slug, file: label, ...verdict });
  }
}

// The registry decides the winner when a slug is registered twice.
const { specs } = await import("./lib/test-helpers.mjs");
const { FAMILIES } = await import("./tests/index.mjs");
for (const family of FAMILIES) if (typeof family.register === "function") family.register();

const ordered = specs.map((s) => {
  const row = seen.get(s.slug);
  if (row) return row;
  // Fall back to the registry function when the source scan missed it.
  return { slug: s.slug, file: "(registry)", ...analyse(s.fn.toString()) };
});

const counts = ordered.reduce((acc, r) => {
  acc[r.tier] = (acc[r.tier] || 0) + 1;
  return acc;
}, {});

const payload = {
  total: ordered.length,
  tiers: {
    A: counts.A || 0,
    B: counts.B || 0,
    C: counts.C || 0,
    none: counts.none || 0,
  },
  tierC: ordered.filter((r) => r.tier === "C").map((r) => ({ slug: r.slug, file: r.file, notes: [...new Set(r.notes)] })),
  tierB: ordered.filter((r) => r.tier === "B").map((r) => ({ slug: r.slug, file: r.file, notes: [...new Set(r.notes)] })),
  tierNone: ordered.filter((r) => r.tier === "none").map((r) => ({ slug: r.slug, file: r.file })),
};

const args = process.argv.slice(2);
if (args.includes("--json")) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const outArg = args.find((a) => a.startsWith("--out="));
if (outArg) {
  const out = outArg.slice("--out=".length);
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  console.log(`integrity report written to ${out}`);
}

console.log(`specs analysed: ${payload.total}`);
console.log(`  A  value assertion vs an independent expectation : ${payload.tiers.A}`);
console.log(`  B  value assertion vs a literal expectation      : ${payload.tiers.B}`);
console.log(`  C  presence-only assertion (defect)              : ${payload.tiers.C}`);
console.log(`  -  no assertion found                            : ${payload.tiers.none}`);

const tierFilter = (args.find((a) => a.startsWith("--tier=")) || "").split("=")[1];
if (tierFilter) {
  const list = payload[`tier${tierFilter.toUpperCase()}`] || [];
  console.log(`\ntier ${tierFilter} (${list.length}):`);
  for (const row of list) {
    console.log(`  ${row.slug}  [${(row.notes || []).join(", ") || row.file}]`);
  }
}

if (payload.tiers.C > 0) process.exitCode = 1;
