/**
 * Report every misplaced `useTranslations` declaration in the tree.
 *
 * A hook may only be called in a React component or a custom hook. When the
 * declaration sits in a callback that is nested inside a component, removing
 * it is safe - the component's own binding covers the call. When it sits in
 * a module-level helper, the call has to be changed by hand: the helper
 * receives the translated string as an argument instead.
 *
 * Usage: node scripts/audit/report-misplaced-hooks.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseTsx, collectFunctionBodies, isHookSite } from "./lib/ast-tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const files = [
  "src/components/engines/AiViewerEngine.tsx",
  "src/components/engines/Calendar2026Engine.tsx",
  "src/components/engines/HealthFitnessEngine.tsx",
  "src/components/engines/TextDiceWorkspace.tsx",
  "src/components/engines/TextNotepadWorkspace.tsx",
  "src/components/engines/TimeCalendarEngine.tsx",
  "src/components/pdf/PdfEmailEngine.tsx",
];

for (const rel of files) {
  const src = readFileSync(join(root, rel), "utf8");
  const ast = await parseTsx(src);
  const fns = collectFunctionBodies(ast, src);
  const re = /const tUi = useTranslations\("[^"]*"\);/g;
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
      console.log(`${rel} :: declaration not inside a function`);
      continue;
    }
    if (isHookSite(owner.name)) continue;
    let anc = owner.parentFn;
    let site = null;
    while (anc) {
      if (isHookSite(anc.name)) {
        site = anc;
        break;
      }
      anc = anc.parentFn;
    }
    const where = owner.name ? `the function "${owner.name}"` : "an anonymous callback";
    console.log(
      site
        ? `${rel} :: ${where} -> covered by "${site.name}", safe to remove`
        : `${rel} :: ${where} -> NO COMPONENT, needs a hand fix`,
    );
  }
}
