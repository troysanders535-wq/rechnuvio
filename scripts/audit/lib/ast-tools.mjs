/**
 * AST helpers shared by the i18n codemod and its safety gate.
 *
 * The rewriter works on the parsed AST rather than on the raw text: a regex
 * would happily rewrite a literal that happens to sit inside another string
 * (a Word export template such as "<title>Citations</title>") and break the
 * file, and it cannot tell a label from a value that carries meaning.
 */

import { parse } from "@swc/core";

/**
 * swc reports spans as 1-based byte offsets. JavaScript string indices are
 * UTF-16 code units, so the two only agree for ASCII-only files, and even
 * then the base is off by one.
 */
export function byteOffsetsToCharIndices(src, swcOffsets) {
  const wanted = [...new Set(swcOffsets.map((o) => o - 1))].sort((a, b) => a - b);
  const map = new Map();
  let byte = 0;
  let index = 0;
  let w = 0;
  for (const ch of src) {
    while (w < wanted.length && wanted[w] === byte) {
      map.set(byte, index);
      w += 1;
    }
    byte += Buffer.byteLength(ch, "utf8");
    index += ch.length;
  }
  while (w < wanted.length) {
    map.set(wanted[w], index);
    w += 1;
  }
  return map;
}

/** Parse a TSX file and return its AST. */
export async function parseTsx(src) {
  return parse(src, { syntax: "typescript", tsx: true });
}

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "ClassMethod",
  "Constructor",
  "PrivateMethod",
  "GetterProperty",
  "SetterProperty",
]);

/** The node types that hold a function body. */
const BODY_TYPES = new Set(["FunctionBody", "BlockStatement"]);

const COMPARISON_OPERATORS = new Set(["===", "!==", "==", "!="]);
const STRING_METHODS = new Set([
  "includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "split", "replace",
]);

/**
 * A short, all-caps token that is used as a code rather than as a label.
 *
 * "A", "B+" and "A-" are grade codes that are looked up in a table of grade
 * points; translating them would silently change the computed result, so a
 * value like that is never rewritten.
 */
const CODE_LIKE_VALUE = /^[A-Z][A-Z0-9]{0,5}[+-]?$/;

/**
 * Does this string literal carry meaning rather than being a label?
 *
 * A literal used as a comparison operand, a switch case, an object key or an
 * argument to a string helper is part of the program logic - rewriting it
 * into a tUi() call would break the code.
 */
export function isLogicLiteral(node, parent) {
  if (!parent) return false;
  if (parent.type === "BinaryExpression" && COMPARISON_OPERATORS.has(parent.operator)) return true;
  if (parent.type === "SwitchCase") return true;
  if (parent.type === "NewExpression" && parent.callee?.value === "RegExp") return true;
  if (
    (parent.type === "Property" ||
      parent.type === "KeyValueProperty" ||
      parent.type === "ShorthandProperty") &&
    parent.key === node
  ) {
    return true;
  }
  if (
    (parent.type === "Property" || parent.type === "KeyValueProperty") &&
    parent.value === node &&
    typeof node.value === "string" &&
    CODE_LIKE_VALUE.test(node.value)
  ) {
    // a code such as a grade point that is looked up in a table
    return true;
  }
  if (parent.type === "MemberExpression" && parent.property === node) return true;
  if (parent.type === "CallExpression") {
    const callee = parent.callee;
    if (callee?.type === "MemberExpression" && callee.property?.value) {
      if (STRING_METHODS.has(callee.property.value)) return true;
    }
    if (callee?.type === "Identifier" && callee.value === "RegExp") return true;
  }
  return false;
}

/**
 * Collect every replaceable literal in the file.
 *
 * Returns a list of { start, end, text } spans:
 *   - JSX text children          -> replaced with {tUi("key")}
 *   - JSX attribute string values -> replaced with {tUi("key")}
 *   - standalone string literals inside a function -> replaced with tUi("key")
 *
 * A literal is only collectable when it sits inside a React component or a
 * custom hook, because that is the only place where the translation hook can
 * legally live. A literal in a module-level helper or in a module-level
 * constant cannot be rewritten without breaking the hook rules, so it is
 * reported as skipped instead.
 */
export function collectLiterals(ast, src) {
  const raw = [];
  const skipped = [];

  const visit = (node, inFunction, parent, chain) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, inFunction, parent, chain);
      return;
    }

    const type = node.type;
    const isFn = FUNCTION_TYPES.has(type);
    const nextChain = isFn ? [...chain, functionName(node, parent)] : chain;
    const nextInFunction = inFunction || isFn;

    // the nearest enclosing function that may hold the hook
    let hookSite = null;
    for (let i = nextChain.length - 1; i >= 0; i -= 1) {
      if (isHookSite(nextChain[i])) {
        hookSite = nextChain[i];
        break;
      }
    }

    if (type === "JSXText") {
      const text = (node.value ?? "").trim();
      if (text) {
        if (hookSite) raw.push({ start: node.span.start, end: node.span.end, text });
        else skipped.push({ text, reason: "JSX outside a component" });
      }
      return;
    }

    if (type === "JSXAttribute") {
      const value = node.value;
      if (value && value.type === "StringLiteral" && value.value) {
        // swc reports the attribute name as an Identifier (JSXIdentifier in
        // other parsers), so both spellings are accepted.
        const attrName =
          node.name?.type === "JSXIdentifier" || node.name?.type === "Identifier"
            ? node.name.value
            : null;
        if (hookSite) {
          raw.push({
            start: value.span.start,
            end: value.span.end,
            text: value.value,
            attribute: true,
            attr: attrName,
          });
        } else {
          skipped.push({ text: value.value, reason: "attribute outside a component" });
        }
      }
      return;
    }

    if (type === "StringLiteral") {
      if (node.value && nextInFunction && !isLogicLiteral(node, parent)) {
        if (hookSite) {
          raw.push({
            start: node.span.start,
            end: node.span.end,
            text: node.value,
            literal: true,
          });
        } else {
          skipped.push({ text: node.value, reason: "literal outside a component" });
        }
      }
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === "span" || key === "type") continue;
      const child = node[key];
      if (child && typeof child === "object") visit(child, nextInFunction, node, nextChain);
    }
  };
  visit(ast, false, null, []);

  const offsets = [];
  for (const item of raw) offsets.push(item.start, item.end);
  if (offsets.length) {
    const map = byteOffsetsToCharIndices(src, offsets);
    for (const item of raw) {
      item.start = map.get(item.start - 1) ?? item.start;
      item.end = map.get(item.end - 1) ?? item.end;
    }
  }
  raw.skipped = skipped;
  return raw;
}

/**
 * The name a function is known by, so it can be classified.
 *
 * A component is a capitalised function; a custom hook is a `useXxx` function.
 * Both are legal places to call a React hook.
 */
function functionName(node, parent) {
  if (node.type === "FunctionDeclaration") return node.identifier?.value || null;
  if (node.type === "ClassMethod" || node.type === "PrivateMethod") return null;
  if (!parent) return null;
  switch (parent.type) {
    case "VariableDeclarator":
      return parent.id?.type === "Identifier" ? parent.id.value : null;
    case "AssignmentExpression":
      if (parent.left?.type === "Identifier") return parent.left.value;
      if (parent.left?.type === "MemberExpression") return parent.left.property?.value || null;
      return null;
    case "Property":
    case "KeyValueProperty":
      return parent.computed ? null : parent.key?.value || parent.key?.name || null;
    case "ExportDefaultDeclaration":
      return "default";
    default:
      return null;
  }
}

/**
 * Is this function a legal place to call a React hook?
 *
 * Only a React component (capitalised) or a custom hook (`useXxx`) may call
 * `useTranslations`. Injecting the hook into a `useEffect` callback or into a
 * `.map()` callback produces "Invalid hook call" at runtime and breaks the
 * server/client render, so the distinction matters.
 */
export function isHookSite(name) {
  if (!name) return false;
  if (name === "default") return false;
  return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
}

/**
 * The body of every function in the file, as string indices.
 *
 * The body of a BlockStmt spans from its opening brace to its closing brace;
 * the returned start points just after the opening brace, which is where the
 * hook is inserted. Each entry also carries the function's name and the span
 * of the function that lexically encloses it, so a caller can tell a
 * component apart from a nested callback.
 */
export function collectFunctionBodies(ast, src) {
  const raw = [];
  const visit = (node, parent, parentFn) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, parent, parentFn);
      return;
    }
    if (FUNCTION_TYPES.has(node.type) && node.body && BODY_TYPES.has(node.body.type)) {
      const entry = {
        start: node.body.span.start,
        end: node.body.span.end,
        name: functionName(node, parent),
        type: node.type,
        parentFn,
      };
      raw.push(entry);
      for (const key of Object.keys(node)) {
        if (key === "span" || key === "type") continue;
        const child = node[key];
        if (child && typeof child === "object") visit(child, node, entry);
      }
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === "span" || key === "type") continue;
      const child = node[key];
      if (child && typeof child === "object") visit(child, node, parentFn);
    }
  };
  visit(ast, null, null);

  const offsets = [];
  for (const item of raw) offsets.push(item.start, item.end);
  if (offsets.length) {
    const map = byteOffsetsToCharIndices(src, offsets);
    for (const item of raw) {
      item.start = map.get(item.start - 1) ?? item.start;
      item.end = map.get(item.end - 1) ?? item.end;
    }
  }
  // start points just after the opening brace
  const mapped = raw.map((b) => ({ ...b, start: b.start + 1, end: b.end }));
  // The parent link has to point at the mapped entry, not at the raw one: the
  // mapped entry is the one that carries the shifted position.
  for (let i = 0; i < mapped.length; i += 1) {
    if (!raw[i].parentFn) continue;
    const at = raw.indexOf(raw[i].parentFn);
    mapped[i].parentFn = at >= 0 ? mapped[at] : null;
  }
  return mapped;
}

/**
 * The nearest enclosing function that may legally call a hook.
 *
 * A `tUi()` call inside a `useEffect` callback or a `.map()` callback is
 * covered by the component's own binding - the callback closes over it - so
 * the hook belongs in the component, not in the callback.
 *
 * The search starts at the function itself: a call that sits directly in a
 * component is covered by that component.
 */
function nearestHookSite(fns, fn) {
  let current = fn;
  while (current) {
    if (isHookSite(current.name)) return current;
    current = current.parentFn;
  }
  return null;
}

/**
 * Inject `const tUi = useTranslations("<ns>")` into every function that uses
 * tUi() and does not already declare it.
 *
 * The declaration only ever goes into a component or a custom hook, never
 * into a callback. A declaration that a previous run put into a callback is
 * removed again - the enclosing component already provides the binding, and
 * the duplicate declaration is an invalid hook call.
 */
export async function injectHook(src, ns) {
  const decl = `const tUi = useTranslations("${ns}");`;
  const ast = await parseTsx(src);
  const fns = collectFunctionBodies(ast, src);

  // 1. remove declarations that sit in a place where a hook may not be called
  let out = src;
  let removed = 0;
  const declPattern = /^[ \t]*const tUi = useTranslations\("[^"]*"\);[ \t]*\r?\n/gm;
  let match;
  const removals = [];
  while ((match = declPattern.exec(src)) !== null) {
    const at = match.index;
    // the enclosing function is the one whose body span contains the match
    let owner = null;
    for (const fn of fns) {
      if (at >= fn.start && at <= fn.end) {
        if (!owner || fn.start > owner.start) owner = fn;
      }
    }
    if (owner && !isHookSite(owner.name)) {
      // The declaration may only be removed when the calls it serves are
      // covered by an enclosing component. A module-level helper has no such
      // component, so its declaration has to stay until the helper is fixed
      // by hand.
      if (nearestHookSite(fns, owner)) {
        removals.push({ start: at, end: at + match[0].length });
      }
    }
  }
  for (const r of removals.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, r.start) + out.slice(r.end);
    removed += 1;
  }

  // 2. inject into every hook site whose body uses tUi() and has no declaration
  //    The tree is parsed again: removing a declaration shifts every span
  //    that follows it, so the old positions can no longer be used.
  const current = await parseTsx(out);
  const currentFns = collectFunctionBodies(current, out);
  const targets = new Set();
  for (const fn of currentFns) {
    const body = out.slice(fn.start, fn.end);
    if (!body.includes("tUi(")) continue;
    const site = nearestHookSite(currentFns, fn);
    if (!site) continue; // module-level helper: reported by the gate
    targets.add(site);
  }

  let injected = 0;
  const inserts = [];
  for (const site of targets) {
    const body = out.slice(site.start, site.end);
    if (body.includes(decl)) continue;
    inserts.push(site.start);
  }
  inserts.sort((a, b) => b - a);
  for (const at of inserts) {
    out = out.slice(0, at) + `\n  ${decl}` + out.slice(at);
    injected += 1;
  }

  return { src: out, injected, removed };
}

/**
 * Report every useTranslations() call that does not sit directly in a
 * component or a custom hook.
 *
 * A hook call inside a useEffect callback or inside a .map() callback is an
 * "Invalid hook call" at runtime and breaks the server/client render, so it
 * has to be caught before the code ships.
 */
export async function findInvalidHookCalls(src) {
  const ast = await parseTsx(src);
  const fns = collectFunctionBodies(ast, src);
  const invalid = [];
  const re = /useTranslations\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const at = m.index;
    let owner = null;
    for (const fn of fns) {
      if (at >= fn.start && at <= fn.end) {
        if (!owner || fn.start > owner.start) owner = fn;
      }
    }
    if (!owner) {
      invalid.push("useTranslations() is not inside a function");
      continue;
    }
    if (!isHookSite(owner.name)) {
      invalid.push(
        `useTranslations() sits in ${
          owner.name ? `the function "${owner.name}"` : "an anonymous callback"
        } - a hook may only be called in a component or a custom hook`,
      );
    }
  }
  return invalid;
}

/** Add the next-intl import if the file does not have it yet. */
export function ensureImport(src) {
  if (/from\s+["']next-intl["']/.test(src)) {
    if (/import\s*\{[^}]*useTranslations[^}]*\}/.test(src)) return src;
    return src.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']next-intl["']/,
      (m, names) => `import {${names.trim() ? ` ${names.trim()},` : ""} useTranslations } from "next-intl"`,
    );
  }
  const importLines = [...src.matchAll(/^import .*?;$/gm)];
  const last = importLines[importLines.length - 1];
  if (!last) return src;
  const at = last.index + last[0].length;
  return src.slice(0, at) + `\nimport { useTranslations } from "next-intl";` + src.slice(at);
}
