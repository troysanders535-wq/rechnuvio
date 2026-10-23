/**
 * Deep Semantic JSON Compare & Diff Engine
 * Recursively compares JSON values semantically, ignoring key order and formatting differences.
 */

export type DiffType = "ADDED" | "REMOVED" | "MODIFIED" | "TYPE_MISMATCH";

export interface DiffEntry {
  path: string;
  type: DiffType;
  oldValue: any;
  newValue: any;
}

export interface DiffMetrics {
  added: number;
  removed: number;
  modified: number;
  typeMismatch: number;
  totalDifferences: number;
  areIdentical: boolean;
}

export interface SemanticCompareResult {
  metrics: DiffMetrics;
  differences: DiffEntry[];
}

export function deepSortKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  }
  if (typeof obj === "object" && obj !== null) {
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key: string) => {
        acc[key] = deepSortKeys(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function semanticCompare(
  docA: any,
  docB: any,
  options: { ignoreKeyOrder?: boolean } = { ignoreKeyOrder: true }
): SemanticCompareResult {
  const differences: DiffEntry[] = [];

  function compareRecursive(a: any, b: any, currentPath: string) {
    // Both identical primitives or exact references
    if (a === b) return;

    // Type mismatch
    const typeA = a === null ? "null" : Array.isArray(a) ? "array" : typeof a;
    const typeB = b === null ? "null" : Array.isArray(b) ? "array" : typeof b;

    if (typeA !== typeB) {
      differences.push({
        path: currentPath || "root",
        type: "TYPE_MISMATCH",
        oldValue: a,
        newValue: b,
      });
      return;
    }

    // Primitives with differing values
    if (typeA !== "object" && typeA !== "array") {
      differences.push({
        path: currentPath || "root",
        type: "MODIFIED",
        oldValue: a,
        newValue: b,
      });
      return;
    }

    // Compare arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${currentPath}[${i}]`;
        if (i >= a.length) {
          differences.push({
            path: itemPath,
            type: "ADDED",
            oldValue: undefined,
            newValue: b[i],
          });
        } else if (i >= b.length) {
          differences.push({
            path: itemPath,
            type: "REMOVED",
            oldValue: a[i],
            newValue: undefined,
          });
        } else {
          compareRecursive(a[i], b[i], itemPath);
        }
      }
      return;
    }

    // Compare objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const allKeys = Array.from(new Set([...keysA, ...keysB]));
    if (options.ignoreKeyOrder !== false) {
      allKeys.sort();
    }

    for (const key of allKeys) {
      const propPath = currentPath ? `${currentPath}.${key}` : key;
      const hasA = key in a;
      const hasB = key in b;

      if (!hasA && hasB) {
        differences.push({
          path: propPath,
          type: "ADDED",
          oldValue: undefined,
          newValue: b[key],
        });
      } else if (hasA && !hasB) {
        differences.push({
          path: propPath,
          type: "REMOVED",
          oldValue: a[key],
          newValue: undefined,
        });
      } else {
        compareRecursive(a[key], b[key], propPath);
      }
    }
  }

  compareRecursive(docA, docB, "");

  let added = 0;
  let removed = 0;
  let modified = 0;
  let typeMismatch = 0;

  for (const diff of differences) {
    if (diff.type === "ADDED") added++;
    else if (diff.type === "REMOVED") removed++;
    else if (diff.type === "MODIFIED") modified++;
    else if (diff.type === "TYPE_MISMATCH") typeMismatch++;
  }

  return {
    metrics: {
      added,
      removed,
      modified,
      typeMismatch,
      totalDifferences: differences.length,
      areIdentical: differences.length === 0,
    },
    differences,
  };
}
