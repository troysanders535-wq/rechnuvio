"use client";

/**
 * A small, dependency-free MIME (.eml) reader.
 *
 * It works on a latin1 string so that every character maps to exactly one
 * byte, which keeps binary attachments intact while still allowing header and
 * boundary parsing with regular expressions.
 */

export type EmlAttachment = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type EmlMessage = {
  headers: Record<string, string>;
  subject: string;
  from: string;
  to: string;
  date: string;
  text: string;
  html: string;
  attachments: EmlAttachment[];
};

function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  // Unfold continuation lines (a header continued with leading whitespace).
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    const key = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();
    headers[key] = value;
  }
  return headers;
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, "");
  try {
    const binary = atob(clean);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

function decodeBody(body: string, encoding: string | undefined): Uint8Array {
  const enc = (encoding ?? "").toLowerCase();
  if (enc === "base64") return decodeBase64(body);
  if (enc === "quoted-printable") return encodeLatin1(decodeQuotedPrintable(body));
  return encodeLatin1(body);
}

function headerParam(value: string | undefined, name: string): string | undefined {
  if (!value) return undefined;
  const quoted = value.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (quoted) return quoted[1];
  const bare = value.match(new RegExp(`${name}\\s*=\\s*([^;\\s]+)`, "i"));
  return bare ? bare[1] : undefined;
}

type RawPart = {
  headers: Record<string, string>;
  body: string;
};

function splitParts(raw: string, boundary: string): RawPart[] {
  const delimiter = `--${boundary}`;
  const chunks = raw.split(delimiter);
  const parts: RawPart[] = [];

  for (const chunk of chunks) {
    if (chunk.startsWith("--")) break; // closing delimiter
    const trimmed = chunk.replace(/^\r?\n/, "");
    const split = trimmed.search(/\r?\n\r?\n/);
    if (split === -1) continue;
    const headerBlock = trimmed.slice(0, split);
    const body = trimmed.slice(split).replace(/^\r?\n\r?\n/, "");
    parts.push({ headers: parseHeaders(headerBlock), body });
  }

  return parts;
}

export function parseEml(buffer: ArrayBuffer): EmlMessage {
  const raw = decodeLatin1(new Uint8Array(buffer));
  const separator = raw.search(/\r?\n\r?\n/);
  const headerBlock = separator === -1 ? raw : raw.slice(0, separator);
  const bodyRaw = separator === -1 ? "" : raw.slice(separator).replace(/^\r?\n\r?\n/, "");

  const headers = parseHeaders(headerBlock);
  const message: EmlMessage = {
    headers,
    subject: headers.subject ?? "",
    from: headers.from ?? "",
    to: headers.to ?? "",
    date: headers.date ?? "",
    text: "",
    html: "",
    attachments: [],
  };

  const contentType = headers["content-type"] ?? "text/plain";

  if (/multipart/i.test(contentType)) {
    const boundary = headerParam(contentType, "boundary");
    if (boundary) {
      for (const part of splitParts(bodyRaw, boundary)) {
        const partType = part.headers["content-type"] ?? "text/plain";
        const disposition = part.headers["content-disposition"] ?? "";
        const filename = headerParam(part.headers["content-disposition"], "filename");

        if (/multipart/i.test(partType)) {
          const nestedBoundary = headerParam(partType, "boundary");
          if (nestedBoundary) {
            for (const nested of splitParts(part.body, nestedBoundary)) {
              collectPart(message, nested, "");
            }
          }
          continue;
        }

        collectPart(message, part, filename ?? "");
      }
    }
  } else {
    collectPart(message, { headers, body: bodyRaw }, "");
  }

  return message;
}

function collectPart(message: EmlMessage, part: RawPart, filename: string) {
  const contentType = part.headers["content-type"] ?? "text/plain";
  const encoding = part.headers["content-transfer-encoding"];
  const disposition = part.headers["content-disposition"] ?? "";
  const name = filename || headerParam(part.headers["content-disposition"], "filename") || "";

  if (name || /attachment/i.test(disposition)) {
    const bytes = decodeBody(part.body, encoding);
    if (bytes.length) {
      message.attachments.push({
        filename: name || "attachment",
        mimeType: contentType.split(";")[0].trim(),
        bytes,
      });
    }
    return;
  }

  if (/text\/plain/i.test(contentType)) {
    const text = new TextDecoder().decode(decodeBody(part.body, encoding));
    if (!message.text) message.text = text;
    return;
  }

  if (/text\/html/i.test(contentType)) {
    const html = new TextDecoder().decode(decodeBody(part.body, encoding));
    if (!message.html) message.html = html;
  }
}

/** Strips tags so the plain text of an HTML mail can be laid out in a PDF. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|tr|li|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
