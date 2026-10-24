/**
 * Read an Outlook message (.msg) out of its OLE compound document.
 *
 * A .msg file keeps every part of the message in its own stream, named after
 * the property it holds:
 *
 *   __substg1.0_0037001F   the subject, as a unicode string
 *   __substg1.0_007D001F   the transport headers, as a unicode string
 *   __substg1.0_1000001F   the body, as a unicode string
 *   __attach_version1.0_#00000000
 *       __substg1.0_3707001F   the name of the attachment
 *       __substg1.0_37010102   the bytes of the attachment
 *
 * The property id and the type are both written in hexadecimal, so the four
 * digits after the underscore name the type (001F is a unicode string, 0102 is
 * binary, 0040 is a date).
 */

import { readOle } from "./ole";

/** The property ids that the viewer shows. */
const PROPERTY = {
  subject: 0x0037,
  normalizedSubject: 0x0e1d,
  senderName: 0x0c1a,
  senderEmail: 0x0c1f,
  displayTo: 0x0e04,
  displayCc: 0x0e03,
  transportHeaders: 0x007d,
  body: 0x1000,
  bodyHtml: 0x1009,
  deliveryTime: 0x0e06,
  submitTime: 0x0039,
  displayName: 0x3001,
  addressType: 0x0c15,
  emailAddress: 0x39fe,
  attachFileName: 0x3707,
  attachMimeTag: 0x370e,
  attachData: 0x3701,
  attachSize: 0x0e20,
} as const;

const TYPE = {
  unicode: 0x001f,
  ansi: 0x001e,
  binary: 0x0102,
  fileTime: 0x0040,
  int32: 0x0002,
  int64: 0x0003,
} as const;

export interface MsgAttachment {
  /** The file name of the attachment. */
  name: string;
  /** The size of the attachment in bytes. */
  size: number;
  /** The mime type the message declares. */
  mime: string;
  /** The bytes of the attachment. */
  data: Uint8Array;
}

export interface MsgMessage {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  /** The raw transport headers, one per line. */
  headers: string[];
  /** The body as plain text. */
  body: string;
  attachments: MsgAttachment[];
  /** Every header of the message, by its lower case name. */
  headerMap: Record<string, string>;
}

const hex = (value: number) => (value & 0xffff).toString(16).padStart(4, "0").toUpperCase();

/** The path of the stream that holds a property of the given type. */
const streamOf = (id: number, type: number) => `__substg1.0_${hex(id)}${hex(type)}`;

/** A file time is a count of 100 nanosecond steps since 1601. */
const fileTimeToIso = (value: number): string => {
  if (!value) return "";
  const ms = value / 10000 - 11644473600000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
};

/** Remove the markup of an HTML body and keep its text. */
export const htmlToText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Turn the control words of an RTF body into readable text. */
export const rtfToText = (rtf: string): string => {
  let out = rtf;
  // The groups that hold the font table, the colour table and the styles.
  out = out.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|\\\*)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, " ");
  out = out.replace(/\\par[d]?\b/g, "\n");
  out = out.replace(/\\line\b/g, "\n");
  out = out.replace(/\\tab\b/g, "\t");
  out = out.replace(/\\'[0-9a-fA-F]{2}/g, "");
  out = out.replace(/\\[a-zA-Z]+-?\d*\s?/g, "");
  out = out.replace(/[{}]/g, "");
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
};

export function readMsg(buffer: ArrayBuffer): MsgMessage {
  const doc = readOle(buffer);

  const text = (id: number, type = TYPE.unicode): string => {
    const value = doc.readText(streamOf(id, type));
    return value ? value.trim() : "";
  };

  const subject = text(PROPERTY.subject) || text(PROPERTY.normalizedSubject);
  const from = text(PROPERTY.senderName) || text(PROPERTY.senderEmail);
  const to = text(PROPERTY.displayTo);
  const cc = text(PROPERTY.displayCc);

  const rawHeaders = text(PROPERTY.transportHeaders);
  const headers = rawHeaders
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerMap: Record<string, string> = {};
  for (const line of headers) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    const name = line.slice(0, at).trim().toLowerCase();
    if (!headerMap[name]) headerMap[name] = line.slice(at + 1).trim();
  }

  let date = "";
  const delivery = doc.read(streamOf(PROPERTY.deliveryTime, TYPE.fileTime));
  if (delivery && delivery.length >= 8) {
    const low = delivery[0] | (delivery[1] << 8) | (delivery[2] << 16) | (delivery[3] << 24);
    const high = delivery[4] | (delivery[5] << 8) | (delivery[6] << 16) | (delivery[7] << 24);
    date = fileTimeToIso(high * 0x100000000 + low);
  }
  if (!date && headerMap.date) date = headerMap.date;

  const rawBody = text(PROPERTY.body);
  const rawHtml = text(PROPERTY.bodyHtml);
  let body = "";
  if (rawBody.startsWith("{\\rtf")) body = rtfToText(rawBody);
  else if (rawBody) body = rawBody;
  else if (rawHtml) body = htmlToText(rawHtml);

  const attachments: MsgAttachment[] = [];
  const attachRoot = "__attach_version1.0_#00000000";
  for (const path of doc.list(`${attachRoot}/`)) {
    const tail = path.slice(attachRoot.length + 1);
    if (!tail.startsWith("__substg1.0_")) continue;
    const id = Number.parseInt(tail.slice(12, 16), 16);
    if (!Number.isFinite(id)) continue;
    if (id !== PROPERTY.attachFileName) continue;
    const name = doc.readText(path)?.trim() || "";
    if (!name) continue;

    const folder = path.slice(0, path.lastIndexOf("/"));
    const data = doc.read(`${folder}/__substg1.0_${hex(PROPERTY.attachData)}${hex(TYPE.binary)}`);
    const mime =
      doc.readText(`${folder}/__substg1.0_${hex(PROPERTY.attachMimeTag)}${hex(TYPE.unicode)}`)?.trim() || "";
    const sizeBytes = doc.read(`${folder}/__substg1.0_${hex(PROPERTY.attachSize)}${hex(TYPE.int32)}`);
    let size = data ? data.length : 0;
    if (sizeBytes && sizeBytes.length >= 4) {
      size = sizeBytes[0] | (sizeBytes[1] << 8) | (sizeBytes[2] << 16) | (sizeBytes[3] << 24);
    }
    attachments.push({ name, size, mime, data: data || new Uint8Array(0) });
  }
  attachments.sort((a, b) => a.name.localeCompare(b.name));

  return { subject, from, to, cc, date, headers, body, attachments, headerMap };
}
