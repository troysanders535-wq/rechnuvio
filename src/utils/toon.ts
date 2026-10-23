/**
 * Token-Oriented Object Notation (TOON) Encoder & Decoder
 * Designed for LLM context compression (30-60% token reduction).
 */

export interface ToonEncodeOptions {
  indentSpaces?: number;
}

/**
 * Checks if value needs quotes in TOON
 */
function needsQuotes(str: string): boolean {
  if (str === "" || str === "true" || str === "false" || str === "null") return true;
  if (!isNaN(Number(str))) return true;
  return /[\n\r,:[\]{}"\\]/.test(str) || str.trim() !== str;
}

function escapeString(str: string): string {
  if (needsQuotes(str)) {
    return JSON.stringify(str);
  }
  return str;
}

function unescapeString(str: string): string {
  str = str.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    try {
      return JSON.parse(str);
    } catch {
      return str.slice(1, -1);
    }
  }
  return str;
}

/**
 * Checks if array consists of uniform objects suitable for tabular format
 */
function isTabularArray(arr: any[]): boolean {
  if (arr.length === 0) return false;
  if (!arr.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
    return false;
  }
  const keys = Object.keys(arr[0]);
  if (keys.length === 0) return false;
  const keySet = new Set(keys);
  return arr.every((item) => {
    const itemKeys = Object.keys(item);
    return itemKeys.length === keySet.size && itemKeys.every((k) => keySet.has(k));
  });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === quoteChar) {
        if (i + 1 < line.length && line[i + 1] === quoteChar) {
          current += char;
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ",") {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());
  return values;
}

function parsePrimitive(str: string): any {
  const trimmed = str.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !isNaN(Number(trimmed)) && !trimmed.startsWith("+")) {
    return Number(trimmed);
  }
  return unescapeString(trimmed);
}

/**
 * Encode arbitrary JavaScript/JSON value to TOON
 */
export function jsonToToon(value: any, indentLevel = 0, options: ToonEncodeOptions = {}): string {
  const indentSize = options.indentSpaces ?? 2;
  const indent = " ".repeat(indentLevel * indentSize);
  const childIndent = " ".repeat((indentLevel + 1) * indentSize);

  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return escapeString(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    // Tabular representation for uniform objects
    if (isTabularArray(value)) {
      const keys = Object.keys(value[0]);
      const headerLine = `${childIndent}${keys.join(", ")}`;
      const rowLines = value.map((item) => {
        const rowVals = keys.map((k) => {
          const val = item[k];
          if (val === null) return "null";
          if (typeof val === "boolean") return val ? "true" : "false";
          if (typeof val === "number") return String(val);
          if (typeof val === "string") return escapeString(val);
          return JSON.stringify(val);
        });
        return `${childIndent}${rowVals.join(", ")}`;
      });
      return `\n${headerLine}\n${rowLines.join("\n")}`;
    }

    // Primitives array
    if (value.every((v) => typeof v !== "object" || v === null)) {
      const formatted = value.map((v) => {
        if (v === null) return "null";
        if (typeof v === "boolean") return v ? "true" : "false";
        if (typeof v === "number") return String(v);
        return escapeString(String(v));
      });
      return `\n${childIndent}${formatted.join(", ")}`;
    }

    // General array of mixed or complex items
    const items = value.map((item) => {
      if (typeof item === "object" && item !== null) {
        return `${childIndent}- ${jsonToToon(item, indentLevel + 1, options).trimStart()}`;
      }
      return `${childIndent}- ${jsonToToon(item, indentLevel + 1, options)}`;
    });
    return `\n${items.join("\n")}`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";

    const lines: string[] = [];
    for (const key of keys) {
      const safeKey = /^[a-zA-Z0-9_.-]+$/.test(key) ? key : JSON.stringify(key);
      const val = value[key];

      if (val === null || typeof val !== "object") {
        lines.push(`${indent}${safeKey}: ${jsonToToon(val, 0, options)}`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`${indent}${safeKey}: []`);
        } else if (isTabularArray(val)) {
          lines.push(`${indent}${safeKey}[${val.length}]:${jsonToToon(val, indentLevel, options)}`);
        } else {
          lines.push(`${indent}${safeKey}[${val.length}]:${jsonToToon(val, indentLevel, options)}`);
        }
      } else {
        lines.push(`${indent}${safeKey}:\n${jsonToToon(val, indentLevel + 1, options)}`);
      }
    }
    return lines.join("\n");
  }

  return String(value);
}

/**
 * Decode TOON back to JSON object / array
 */
export function toonToJson(toonStr: string): any {
  const trimmed = toonStr.trim();
  if (!trimmed) return null;

  // Handle single primitive
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (!isNaN(Number(trimmed)) && !trimmed.startsWith("+")) return Number(trimmed);
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  const lines = toonStr.split(/\r?\n/);
  let lineIdx = 0;

  function getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  function parseObject(currentIndent: number): Record<string, any> {
    const result: Record<string, any> = {};

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (!line.trim()) {
        lineIdx++;
        continue;
      }

      const indent = getIndent(line);
      if (indent < currentIndent) {
        break;
      }

      const trimmedLine = line.trim();

      // Check array with length: key[3]:
      const arrayHeaderMatch = trimmedLine.match(/^([a-zA-Z0-9_.-]+|"[^"]+")\[(\d+)\]:\s*(.*)$/);
      if (arrayHeaderMatch) {
        let key = arrayHeaderMatch[1];
        if (key.startsWith('"')) key = JSON.parse(key);
        const inlineRest = arrayHeaderMatch[3].trim();
        lineIdx++;

        if (inlineRest) {
          result[key] = parseCsvLine(inlineRest).map(parsePrimitive);
          continue;
        }

        // Look at next lines to determine tabular array or list
        if (lineIdx < lines.length) {
          const nextLine = lines[lineIdx];
          const nextTrim = nextLine.trim();
          if (nextTrim.startsWith("- ")) {
            result[key] = parseListArray(indent + 1);
          } else {
            // Tabular array
            result[key] = parseTabularArray(indent + 1);
          }
        } else {
          result[key] = [];
        }
        continue;
      }

      // Check key: value
      const colonIdx = trimmedLine.indexOf(":");
      if (colonIdx !== -1) {
        let key = trimmedLine.slice(0, colonIdx).trim();
        if (key.startsWith('"')) {
          try {
            key = JSON.parse(key);
          } catch {}
        }
        const valStr = trimmedLine.slice(colonIdx + 1).trim();
        lineIdx++;

        if (valStr) {
          if (valStr === "[]") {
            result[key] = [];
          } else if (valStr === "{}") {
            result[key] = {};
          } else {
            result[key] = parsePrimitive(valStr);
          }
        } else {
          // Nested object or list
          if (lineIdx < lines.length) {
            const nextLine = lines[lineIdx];
            const nextTrim = nextLine.trim();
            if (nextTrim.startsWith("- ")) {
              result[key] = parseListArray(indent + 1);
            } else {
              result[key] = parseObject(indent + 1);
            }
          } else {
            result[key] = {};
          }
        }
        continue;
      }

      // Fallback advance
      lineIdx++;
    }

    return result;
  }

  function parseTabularArray(minIndent: number): any[] {
    if (lineIdx >= lines.length) return [];
    const headerLine = lines[lineIdx].trim();
    lineIdx++;

    const headers = parseCsvLine(headerLine);
    const rows: any[] = [];

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (!line.trim()) {
        lineIdx++;
        continue;
      }
      const indent = getIndent(line);
      if (indent < minIndent) break;

      const trimmedLine = line.trim();
      const vals = parseCsvLine(trimmedLine);
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = idx < vals.length ? parsePrimitive(vals[idx]) : null;
      });
      rows.push(obj);
      lineIdx++;
    }

    return rows;
  }

  function parseListArray(minIndent: number): any[] {
    const list: any[] = [];
    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (!line.trim()) {
        lineIdx++;
        continue;
      }
      const indent = getIndent(line);
      if (indent < minIndent) break;

      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("- ")) {
        const itemVal = trimmedLine.slice(2).trim();
        list.push(parsePrimitive(itemVal));
        lineIdx++;
      } else {
        break;
      }
    }
    return list;
  }

  // If starts with tabular array or root object
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }

  return parseObject(0);
}

/**
 * Token estimator (BPE approximation)
 * For english/json: ~3.8 characters per token, plus tokens for delimiters/syntax
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count words, punctuation, and whitespaces
  const words = text.match(/\b\w+\b/g)?.length || 0;
  const punctuation = text.match(/[^\w\s]/g)?.length || 0;
  return Math.ceil(words * 1.1 + punctuation * 0.9);
}
