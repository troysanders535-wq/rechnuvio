/**
 * End-to-end gate for scripts/audit/apply-ui-i18n.mjs.
 *
 * The codemod rewrites 50+ engine files in place, so it is first run against
 * a COPY of the source tree. The copy is then verified:
 *
 *   1. every rewritten file still parses;
 *   2. every tUi() call sits inside a function that declares the hook;
 *   3. no literal that carried meaning was rewritten;
 *   4. the message files contain every namespace as a nested path, and the
 *      namespace really resolves through next-intl.
 *
 * The repository is never modified by this script.
 *
 * Usage: node scripts/audit/check-codemod-safety.mjs
 */

import { readFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { transform, parse } from "@swc/core";
import { createTranslator } from "use-intl";

import { parseTsx, collectFunctionBodies, findInvalidHookCalls } from "./lib/ast-tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const tmpRoot = join(root, ".tmp-codemod-check");

/** Read a nested namespace out of a message tree. */
function readNs(messages, dottedPath) {
  let node = messages;
  for (const part of dottedPath.split(".")) {
    node = node?.[part];
    if (!node) return {};
  }
  return node;
}

/* ------------------------------------------------------------- helpers --- */

/** Every tUi() call must sit inside a function that declares the hook. */
async function tUiInScope(src) {
  const ast = await parseTsx(src);
  const bodies = collectFunctionBodies(ast, src);
  const declRe = /const\s+tUi\s*=\s*useTranslations\(/;
  const uses = [];
  const re = /\btUi\(/g;
  let m;
  while ((m = re.exec(src))) uses.push(m.index);
  for (const at of uses) {
    const host = bodies.find((b) => at > b.start && at < b.end);
    if (!host) return `a tUi() call at offset ${at} is not inside any function`;
    if (!declRe.test(src.slice(host.start, host.end))) {
      return `a tUi() call at offset ${at} has no hook in scope`;
    }
  }
  return null;
}

/* --------------------------------------------------------------- setup --- */

if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
cpSync(join(root, "src"), join(tmpRoot, "src"), { recursive: true });
cpSync(join(here, "data"), join(tmpRoot, "data"), { recursive: true });
// the codemod expects the messages next to src
cpSync(join(root, "src", "messages"), join(tmpRoot, "src", "messages"), { recursive: true });

const before = new Map();
for (const rel of walkFiles(join(tmpRoot, "src"))) {
  before.set(rel, readFileSync(join(tmpRoot, "src", rel), "utf8"));
}

function walkFiles(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) acc.push(relative(join(tmpRoot, "src"), p).replace(/\\/g, "/"));
  }
  return acc;
}

/* --------------------------------------------------------------- run ----- */

process.env.UI_I18N_ROOT = tmpRoot;
const { execFileSync } = await import("node:child_process");
let codemodOut = "";
try {
  codemodOut = execFileSync(process.execPath, [join(here, "apply-ui-i18n.mjs"), "--apply"], {
    encoding: "utf8",
    env: { ...process.env, UI_I18N_ROOT: tmpRoot },
  });
} catch (err) {
  console.log("codemod failed:\n" + String(err.stdout || "") + String(err.stderr || ""));
  process.exit(1);
}
console.log(codemodOut.trim().split("\n").slice(0, 3).join("\n"));

/* ----------------------------------------------------------- verify ------ */

const problems = [];
let changed = 0;

for (const rel of before.keys()) {
  const abs = join(tmpRoot, "src", rel);
  const now = readFileSync(abs, "utf8");
  const was = before.get(rel);
  if (now === was) continue;
  changed += 1;

  // 1. parses
  try {
    await transform(now, { filename: abs, jsc: { parser: { syntax: "typescript", tsx: true } } });
  } catch (err) {
    problems.push(`${rel}: does not parse after the rewrite - ${String(err.message).slice(0, 140)}`);
    continue;
  }

  // 2. hook scope
  const scope = await tUiInScope(now);
  if (scope) problems.push(`${rel}: ${scope}`);

  // 3. logic literals that survived as tUi() calls
  const ast = await parse(now, { syntax: "typescript", tsx: true });
  const logic = [];
  const visit = (node, parent) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, parent);
      return;
    }
    if (node.type === "CallExpression") {
      const callee = node.callee;
      const isTUi =
        callee?.type === "Identifier" && callee.value === "tUi";
      if (isTUi && parent) {
        const isComparison =
          parent.type === "BinaryExpression" &&
          ["===", "!==", "==", "!="].includes(parent.operator);
        if (isComparison || parent.type === "SwitchCase") {
          logic.push(`${rel}: a label was rewritten inside a comparison`);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "span" || key === "type") continue;
      const child = node[key];
      if (child && typeof child === "object") visit(child, node);
    }
  };
  visit(ast, null);
  problems.push(...logic);

  // 4. every useTranslations() call must sit in a component or a custom hook
  const badHooks = await findInvalidHookCalls(now);
  for (const b of badHooks) problems.push(`${rel}: ${b}`);
}

// 4. the message files must resolve through next-intl
const enPath = join(tmpRoot, "src", "messages", "en.json");
const dePath = join(tmpRoot, "src", "messages", "de.json");
if (!existsSync(enPath) || !existsSync(dePath)) {
  problems.push("the message files were not written");
} else {
  const en = JSON.parse(readFileSync(enPath, "utf8"));
  const de = JSON.parse(readFileSync(dePath, "utf8"));

  // walk the tree for every namespace under "ui"
  const namespaces = [];
  const walk = (node, prefix) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (!value || typeof value !== "object") continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (path.startsWith("ui.") && Object.values(value).every((v) => typeof v === "string")) {
        namespaces.push(path);
      } else {
        walk(value, path);
      }
    }
  };
  walk(en, "");

  let resolved = 0;
  const broken = [];
  for (const ns of namespaces) {
    try {
      const t = createTranslator({ locale: "de", messages: de, namespace: ns });
      const key = Object.keys(readNs(de, ns))[0];
      if (!key) {
        broken.push(`${ns}: no German entry`);
        continue;
      }
      const value = t(key);
      if (typeof value === "string" && !value.includes(ns)) resolved += 1;
      else broken.push(`${ns}.${key} -> ${value}`);
    } catch (err) {
      broken.push(`${ns}: ${String(err.message).slice(0, 90)}`);
    }
  }
  console.log(`namespaces in en.json: ${namespaces.length}, resolved through next-intl: ${resolved}`);
  if (broken.length) problems.push(`namespaces that do not resolve:\n      ${broken.slice(0, 8).join("\n      ")}`);
}

console.log("");
console.log(`files rewritten in the copy: ${changed}`);
console.log(`problems: ${problems.length}`);
for (const p of problems) console.log("  - " + p);

rmSync(tmpRoot, { recursive: true, force: true });
process.exit(problems.length ? 1 : 0);
