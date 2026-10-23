/**
 * Advanced JSON Syntax Validator and Auto-Repair Utility
 */

export interface JsonErrorDetail {
  line: number;
  column: number;
  offset: number;
  message: string;
  contextSnippet: string;
  pointer: string;
}

export interface JsonValidationResult {
  isValid: boolean;
  error?: JsonErrorDetail;
  stats?: {
    bytes: number;
    lines: number;
    characters: number;
    depth: number;
    keysCount: number;
    arraysCount: number;
  };
}

export function validateJson(raw: string): JsonValidationResult {
  const bytes = new Blob([raw]).size;
  const lines = raw.split(/\r?\n/);
  const characters = raw.length;

  if (!raw.trim()) {
    return {
      isValid: false,
      error: {
        line: 1,
        column: 1,
        offset: 0,
        message: "Input is empty",
        contextSnippet: "",
        pointer: "^",
      },
    };
  }

  try {
    const parsed = JSON.parse(raw);

    let keysCount = 0;
    let arraysCount = 0;

    const countNodes = (obj: any, currentDepth = 1): number => {
      if (typeof obj !== "object" || obj === null) return currentDepth;
      if (Array.isArray(obj)) {
        arraysCount++;
        const depths = obj.map((item) => countNodes(item, currentDepth + 1));
        return depths.length > 0 ? Math.max(...depths) : currentDepth;
      }
      const keys = Object.keys(obj);
      keysCount += keys.length;
      const depths = Object.values(obj).map((val) => countNodes(val, currentDepth + 1));
      return depths.length > 0 ? Math.max(...depths) : currentDepth;
    };

    const depth = countNodes(parsed, 1);

    return {
      isValid: true,
      stats: {
        bytes,
        lines: lines.length,
        characters,
        depth,
        keysCount,
        arraysCount,
      },
    };
  } catch (err: any) {
    const errMsg = err.message || "Invalid JSON syntax";

    // Extract position from standard browser error messages
    // Examples: "at position 42", "at line 2 column 5", "Unexpected token 'x' in JSON at position 10"
    let line = 1;
    let column = 1;
    let offset = 0;

    const posMatch = errMsg.match(/position\s+(\d+)/i);
    const lineColMatch = errMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);

    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
      // calculate offset
      let currentOffset = 0;
      for (let i = 0; i < line - 1; i++) {
        currentOffset += lines[i].length + 1;
      }
      offset = currentOffset + (column - 1);
    } else if (posMatch) {
      offset = parseInt(posMatch[1], 10);
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // +1 for newline
        if (count + lineLen > offset) {
          line = i + 1;
          column = offset - count + 1;
          break;
        }
        count += lineLen;
      }
    }

    const offendingLine = lines[line - 1] ?? "";
    const pointer = " ".repeat(Math.max(0, column - 1)) + "^";

    return {
      isValid: false,
      error: {
        line,
        column,
        offset,
        message: errMsg,
        contextSnippet: offendingLine,
        pointer,
      },
    };
  }
}

/**
 * Auto-repairs common malformed JSON errors:
 * - Trailing commas
 * - Single quotes instead of double quotes
 * - Unquoted object keys
 * - JS-style comments (single line and block)
 * - Smart/curly quotes (“ ” ‘ ’)
 */
export function autoRepairJson(input: string): string {
  let cleaned = input;

  // Replace smart quotes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");

  // Remove single line comments // ...
  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, "");

  // Remove multi-line comments /* ... */
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // Replace single quotes surrounding strings with double quotes
  // We carefully replace 'value' with "value"
  cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => {
    return JSON.stringify(inner);
  });

  // Quote unquoted object keys: { name: "val" } -> { "name": "val" }
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  return cleaned;
}
