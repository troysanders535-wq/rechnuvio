// Lets Node resolve extensionless relative imports to .ts files (tests only).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const ext of [".ts", ".tsx"]) {
      if (fs.existsSync(fileURLToPath(base) + ext)) {
        return nextResolve(base.href + ext, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
