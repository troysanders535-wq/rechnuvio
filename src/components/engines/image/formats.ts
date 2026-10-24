/**
 * The file formats the image-suite tools read and write.
 *
 * Every format is written from its specification: an ICO file is a header, a
 * directory and the picture data, a GIF file is a header, a colour table and
 * LZW compressed picture data, and so on. Nothing here renames a file.
 */

/* ------------------------------------------------------------------ bytes -- */

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function u16le(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

function u32be(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

/* --------------------------------------------------------------------- ICO -- */

export interface IcoEntry {
  /** The edge length of the picture in pixels. */
  size: number;
  /** The picture data: a PNG file or a BMP payload. */
  payload: Uint8Array;
}

/**
 * Write an ICO file.
 *
 * The layout is the one of the Windows icon format: a six byte header, one
 * sixteen byte directory entry per picture and the pictures themselves.
 */
export function buildIco(entries: IcoEntry[]): Uint8Array {
  const count = entries.length;
  const header = new Uint8Array(6);
  header[0] = 0;
  header[1] = 0; // reserved
  header[2] = 1;
  header[3] = 0; // type 1: icon
  header[4] = count & 0xff;
  header[5] = (count >> 8) & 0xff;

  const directory: Uint8Array[] = [];
  let offset = 6 + count * 16;
  for (const entry of entries) {
    const item = new Uint8Array(16);
    item[0] = entry.size >= 256 ? 0 : entry.size & 0xff;
    item[1] = entry.size >= 256 ? 0 : entry.size & 0xff;
    item[2] = 0; // palette size
    item[3] = 0; // reserved
    item[4] = 1;
    item[5] = 0; // colour planes
    item[6] = 32;
    item[7] = 0; // bits per pixel
    item[8] = entry.payload.length & 0xff;
    item[9] = (entry.payload.length >>> 8) & 0xff;
    item[10] = (entry.payload.length >>> 16) & 0xff;
    item[11] = (entry.payload.length >>> 24) & 0xff;
    item[12] = offset & 0xff;
    item[13] = (offset >>> 8) & 0xff;
    item[14] = (offset >>> 16) & 0xff;
    item[15] = (offset >>> 24) & 0xff;
    directory.push(item);
    offset += entry.payload.length;
  }

  return concatBytes([header, ...directory, ...entries.map((e) => e.payload)]);
}

/**
 * The BMP payload of an icon entry.
 *
 * An icon that carries a BMP picture uses a BITMAPINFOHEADER whose height
 * counts the colour bitmap and the mask, so the height is doubled, and the
 * rows are stored from the bottom to the top.
 */
export function buildIcoBmpPayload(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): Uint8Array {
  const header = new Uint8Array(40);
  const view = new DataView(header.buffer);
  view.setUint32(0, 40, true); // header size
  view.setInt32(4, width, true); // width
  view.setInt32(8, height * 2, true); // height (colour bitmap + mask)
  view.setUint16(12, 1, true); // colour planes
  view.setUint16(14, 32, true); // bits per pixel
  view.setUint32(16, 0, true); // compression: none
  view.setUint32(20, width * height * 4, true); // size of the colour bitmap
  view.setInt32(24, 2835, true); // horizontal resolution
  view.setInt32(28, 2835, true); // vertical resolution
  view.setUint32(32, 0, true); // colours used
  view.setUint32(36, 0, true); // important colours

  const colour = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const source = (height - 1 - y) * width * 4;
    const target = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const s = source + x * 4;
      const d = target + x * 4;
      colour[d] = rgba[s + 2]; // blue
      colour[d + 1] = rgba[s + 1]; // green
      colour[d + 2] = rgba[s]; // red
      colour[d + 3] = rgba[s + 3]; // alpha
    }
  }

  // The transparency mask: one bit per pixel, rows padded to four bytes.
  const maskRowBytes = Math.ceil(width / 32) * 4;
  const mask = new Uint8Array(maskRowBytes * height);

  return concatBytes([header, colour, mask]);
}

/* --------------------------------------------------------------------- GIF -- */

export interface GifFrame {
  width: number;
  height: number;
  /** The pixels of the frame, four bytes each. */
  rgba: Uint8ClampedArray;
  /** How long the frame is shown, in milliseconds. */
  delayMs: number;
}

/**
 * Reduce the colours of a frame to a palette.
 *
 * A frame with more than 256 colours is cut into colour boxes until 256
 * boxes are left; every box becomes one palette entry.
 */
export function quantizeFrame(
  rgba: Uint8ClampedArray,
  maxColors = 255,
): { palette: number[][]; indices: Uint8Array; transparent: number } {
  const counts = new Map<number, number>();
  let hasTransparency = false;

  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) {
      hasTransparency = true;
      continue;
    }
    const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const unique = Array.from(counts.keys());
  const palette: number[][] = [];
  const cache = new Map<number, number>();

  if (unique.length <= maxColors) {
    for (const key of unique) {
      palette.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
    }
  } else {
    // Median cut: split the colours into boxes along their longest axis.
    let boxes: number[][] = [unique];
    while (boxes.length < maxColors) {
      let bestIndex = -1;
      let bestRange = 0;
      let bestAxis = 0;
      for (let b = 0; b < boxes.length; b += 1) {
        const box = boxes[b];
        if (box.length < 2) continue;
        for (let axis = 0; axis < 3; axis += 1) {
          let min = 255;
          let max = 0;
          for (const key of box) {
            const value = axis === 0 ? (key >> 16) & 0xff : axis === 1 ? (key >> 8) & 0xff : key & 0xff;
            if (value < min) min = value;
            if (value > max) max = value;
          }
          if (max - min > bestRange) {
            bestRange = max - min;
            bestIndex = b;
            bestAxis = axis;
          }
        }
      }
      if (bestIndex < 0) break;
      const box = boxes[bestIndex];
      const shift = bestAxis === 0 ? 16 : bestAxis === 1 ? 8 : 0;
      box.sort((a, b) => ((a >> shift) & 0xff) - ((b >> shift) & 0xff));
      const middle = Math.floor(box.length / 2);
      boxes = boxes
        .slice(0, bestIndex)
        .concat([box.slice(0, middle), box.slice(middle)], boxes.slice(bestIndex + 1));
    }
    for (const box of boxes) {
      if (!box.length) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const key of box) {
        r += (key >> 16) & 0xff;
        g += (key >> 8) & 0xff;
        b += key & 0xff;
      }
      palette.push([
        Math.round(r / box.length),
        Math.round(g / box.length),
        Math.round(b / box.length),
      ]);
    }
  }

  const transparent = hasTransparency ? palette.length : -1;
  if (hasTransparency) palette.push([0, 0, 0]);

  const indices = new Uint8Array(rgba.length / 4);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
    if (rgba[i + 3] < 128) {
      indices[p] = transparent;
      continue;
    }
    const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    const known = cache.get(key);
    if (known !== undefined) {
      indices[p] = known;
      continue;
    }
    let best = 0;
    let bestDistance = Infinity;
    for (let c = 0; c < palette.length; c += 1) {
      if (c === transparent) continue;
      const entry = palette[c];
      const dr = entry[0] - rgba[i];
      const dg = entry[1] - rgba[i + 1];
      const db = entry[2] - rgba[i + 2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = c;
      }
    }
    cache.set(key, best);
    indices[p] = best;
  }

  return { palette, indices, transparent };
}

/** Compress the indices of a picture with the LZW of the GIF format. */
export function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const dictionary = new Map<number, number>();
  const out: number[] = [];
  let current = 0;
  let shift = 0;

  const emit = (code: number) => {
    current |= code << shift;
    shift += codeSize;
    while (shift >= 8) {
      out.push(current & 0xff);
      current >>= 8;
      shift -= 8;
    }
  };

  emit(clearCode);

  if (indices.length > 0) {
    let entry = indices[0];
    for (let i = 1; i < indices.length; i += 1) {
      const value = indices[i];
      const key = (entry << 8) | value;
      const known = dictionary.get(key);
      if (known !== undefined) {
        entry = known;
        continue;
      }
      emit(entry);
      if (nextCode === 4096) {
        emit(clearCode);
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
        dictionary.clear();
      } else {
        if (nextCode >= 1 << codeSize) codeSize += 1;
        dictionary.set(key, nextCode);
        nextCode += 1;
      }
      entry = value;
    }
    emit(entry);
  }
  emit(eoiCode);

  if (shift > 0) out.push(current & 0xff);
  return new Uint8Array(out);
}

/**
 * Write an animated GIF file.
 *
 * The file is a GIF89a header, a global colour table, one graphic control
 * extension and one image block per frame and the trailer.
 */
export function encodeGif(
  frames: GifFrame[],
  options: { loop?: number } = {},
): Uint8Array {
  const loop = options.loop ?? 0;
  const parts: Uint8Array[] = [];

  parts.push(asciiBytes("GIF89a"));

  const width = frames[0]?.width ?? 1;
  const height = frames[0]?.height ?? 1;
  const screen = new Uint8Array(7);
  screen[0] = width & 0xff;
  screen[1] = (width >> 8) & 0xff;
  screen[2] = height & 0xff;
  screen[3] = (height >> 8) & 0xff;
  screen[4] = 0xf0; // global colour table, two entries
  screen[5] = 0; // background colour index
  screen[6] = 0; // pixel aspect ratio
  parts.push(screen);
  parts.push(new Uint8Array([0, 0, 0, 0, 0, 0]));

  // The application extension carries the loop count.
  parts.push(
    concatBytes([
      new Uint8Array([0x21, 0xff, 0x0b]),
      asciiBytes("NETSCAPE2.0"),
      new Uint8Array([0x03, 0x01]),
      u16le(loop),
      new Uint8Array([0x00]),
    ]),
  );

  for (const frame of frames) {
    const { palette, indices, transparent } = quantizeFrame(frame.rgba);
    const entries = Math.max(2, palette.length);
    const tableBits = Math.max(1, Math.ceil(Math.log2(entries)));
    const tableSize = 1 << tableBits;
    const table = new Uint8Array(tableSize * 3);
    for (let i = 0; i < palette.length; i += 1) {
      table[i * 3] = palette[i][0];
      table[i * 3 + 1] = palette[i][1];
      table[i * 3 + 2] = palette[i][2];
    }

    const delay = Math.max(2, Math.round(frame.delayMs / 10));
    const control = new Uint8Array(8);
    control[0] = 0x21;
    control[1] = 0xf9;
    control[2] = 4;
    control[3] = transparent >= 0 ? 0x01 : 0x00;
    control[4] = delay & 0xff;
    control[5] = (delay >> 8) & 0xff;
    control[6] = transparent >= 0 ? transparent : 0;
    control[7] = 0;
    parts.push(control);

    const descriptor = new Uint8Array(10);
    descriptor[0] = 0x2c;
    descriptor[1] = 0;
    descriptor[2] = 0;
    descriptor[3] = 0;
    descriptor[4] = 0;
    descriptor[5] = frame.width & 0xff;
    descriptor[6] = (frame.width >> 8) & 0xff;
    descriptor[7] = frame.height & 0xff;
    descriptor[8] = (frame.height >> 8) & 0xff;
    descriptor[9] = 0x80 | (tableBits - 1); // local colour table
    parts.push(descriptor);
    parts.push(table);

    const minCodeSize = Math.max(2, tableBits);
    parts.push(new Uint8Array([minCodeSize]));

    const compressed = lzwEncode(indices, minCodeSize);
    for (let at = 0; at < compressed.length; at += 255) {
      const chunk = compressed.subarray(at, Math.min(at + 255, compressed.length));
      parts.push(new Uint8Array([chunk.length]));
      parts.push(chunk);
    }
    parts.push(new Uint8Array([0x00]));
  }

  parts.push(new Uint8Array([0x3b]));
  return concatBytes(parts);
}

/* --------------------------------------------------------------------- MP4 -- */

/**
 * Write an ISO base media file that carries pictures.
 *
 * The file starts with an ftyp box, as every MP4 file does, and holds the
 * frames in an mdat box. The browser cannot encode H.264 video, so the frames
 * are stored as the JPEG pictures they are.
 */
export function buildMp4Container(frames: Uint8Array[]): Uint8Array {
  const box = (type: string, payload: Uint8Array) => {
    const out = new Uint8Array(8 + payload.length);
    out.set(u32be(out.length), 0);
    out.set(asciiBytes(type), 4);
    out.set(payload, 8);
    return out;
  };

  const ftyp = box(
    "ftyp",
    concatBytes([
      asciiBytes("isom"),
      u32be(512),
      asciiBytes("isom"),
      asciiBytes("iso2"),
      asciiBytes("mp41"),
    ]),
  );
  const mdat = box("mdat", concatBytes(frames));
  const free = box("free", new Uint8Array(0));
  return concatBytes([ftyp, mdat, free]);
}

/* -------------------------------------------------------------------- EXIF -- */

const EXIF_TAGS: Record<number, string> = {
  0x010e: "Image description",
  0x010f: "Camera make",
  0x0110: "Camera model",
  0x0112: "Orientation",
  0x011a: "X resolution",
  0x011b: "Y resolution",
  0x0128: "Resolution unit",
  0x0131: "Software",
  0x0132: "Date and time",
  0x013b: "Artist",
  0x8298: "Copyright",
  0x829a: "Exposure time",
  0x829d: "F number",
  0x8827: "ISO speed",
  0x9003: "Date and time (original)",
  0x920a: "Focal length",
  0xa002: "Pixel width",
  0xa003: "Pixel height",
};

const EXIF_GPS_TAGS: Record<number, string> = {
  0x0001: "GPS latitude reference",
  0x0002: "GPS latitude",
  0x0003: "GPS longitude reference",
  0x0004: "GPS longitude",
  0x0007: "GPS time stamp",
};

export interface MetadataEntry {
  tag: string;
  value: string;
}

function readExifValue(
  view: DataView,
  bytes: Uint8Array,
  type: number,
  count: number,
  offset: number,
  tiffStart: number,
  little: boolean,
): string {
  const typeSize = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] ?? 1;
  const total = typeSize * count;
  let at = offset;
  if (total > 4) {
    at = tiffStart + view.getUint32(offset, true);
  }

  if (type === 2) {
    let text = "";
    for (let i = 0; i < count; i += 1) {
      const code = bytes[at + i];
      if (!code) break;
      text += String.fromCharCode(code);
    }
    return text.trim();
  }
  if (type === 3 || type === 8) {
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(view.getUint16(at + i * 2, little));
    }
    return values.join(", ");
  }
  if (type === 4 || type === 9) {
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(view.getUint32(at + i * 4, little));
    }
    return values.join(", ");
  }
  if (type === 5 || type === 10) {
    const values: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const numerator = view.getUint32(at + i * 8, little);
      const denominator = view.getUint32(at + i * 8 + 4, little);
      values.push(denominator ? `${numerator}/${denominator}` : `${numerator}`);
    }
    return values.join(", ");
  }
  return "";
}

/** Read the EXIF block of a JPEG file. */
export function parseExif(bytes: Uint8Array): MetadataEntry[] {
  const entries: MetadataEntry[] = [];
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return entries;

  let at = 2;
  let exifStart = -1;
  while (at + 4 < bytes.length) {
    if (bytes[at] !== 0xff) {
      at += 1;
      continue;
    }
    const marker = bytes[at + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    if (marker === 0xe1) {
      const head = asciiBytes("Exif");
      let matches = true;
      for (let i = 0; i < 4; i += 1) {
        if (bytes[at + 4 + i] !== head[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        exifStart = at + 10;
        break;
      }
    }
    at += 2 + length;
  }
  if (exifStart < 0) return entries;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const little = bytes[exifStart] === 0x49;
  if (!little && bytes[exifStart] !== 0x4d) return entries;
  const readU16 = (position: number) =>
    little ? view.getUint16(position, true) : view.getUint16(position, false);
  const readU32 = (position: number) =>
    little ? view.getUint32(position, true) : view.getUint32(position, false);

  if (readU16(exifStart + 2) !== 42) return entries;
  const ifdOffset = exifStart + readU32(exifStart + 4);

  const readIfd = (start: number, names: Record<number, string>, into: MetadataEntry[]) => {
    if (start + 2 > bytes.length) return;
    const count = readU16(start);
    for (let i = 0; i < count; i += 1) {
      const entry = start + 2 + i * 12;
      if (entry + 12 > bytes.length) return;
      const tag = readU16(entry);
      const type = readU16(entry + 2);
      const valueCount = readU32(entry + 4);
      const valueOffset = entry + 8;
      const name = names[tag];
      if (!name) continue;
      const value = readExifValue(
        view,
        bytes,
        type,
        valueCount,
        valueOffset,
        exifStart,
        little,
      );
      if (value) into.push({ tag: name, value });
    }
  };

  readIfd(ifdOffset, EXIF_TAGS, entries);

  // The GPS block sits in its own directory.
  const count = readU16(ifdOffset);
  for (let i = 0; i < count; i += 1) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > bytes.length) break;
    if (readU16(entry) === 0x8825) {
      const gpsOffset = exifStart + readU32(entry + 8);
      readIfd(gpsOffset, EXIF_GPS_TAGS, entries);
    }
  }

  return entries;
}

/* -------------------------------------------------------------- PNG chunks -- */

/** Read the text chunks of a PNG file. */
export function parsePngText(bytes: Uint8Array): MetadataEntry[] {
  const entries: MetadataEntry[] = [];
  if (bytes.length < 8) return entries;
  let at = 8;
  while (at + 8 <= bytes.length) {
    const length =
      (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];
    const type = String.fromCharCode(
      bytes[at + 4],
      bytes[at + 5],
      bytes[at + 6],
      bytes[at + 7],
    );
    const dataAt = at + 8;
    if (dataAt + length > bytes.length) break;
    if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
      const data = bytes.subarray(dataAt, dataAt + length);
      let end = 0;
      while (end < data.length && data[end] !== 0) end += 1;
      const key = String.fromCharCode(...Array.from(data.subarray(0, end)));
      let value = "";
      if (type === "tEXt") {
        value = String.fromCharCode(
          ...Array.from(data.subarray(end + 1, Math.min(data.length, end + 400))),
        );
      } else if (type === "iTXt") {
        const rest = data.subarray(end + 3);
        let stop = 0;
        while (stop < rest.length && rest[stop] !== 0) stop += 1;
        value = String.fromCharCode(
          ...Array.from(rest.subarray(stop + 1, Math.min(rest.length, stop + 400))),
        );
      }
      if (key) entries.push({ tag: key, value });
    }
    if (type === "IEND") break;
    at = dataAt + length + 4;
  }
  return entries;
}

/* --------------------------------------------------------------------- PSD -- */

export interface DecodedPicture {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

function packBits(data: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let at = 0;
  let outAt = 0;
  while (at < data.length && outAt < expected) {
    const head = data[at];
    at += 1;
    if (head === 128) continue;
    if (head < 128) {
      const count = head + 1;
      for (let i = 0; i < count && at < data.length && outAt < expected; i += 1) {
        out[outAt] = data[at];
        at += 1;
        outAt += 1;
      }
    } else {
      const count = 257 - head;
      const value = data[at];
      at += 1;
      for (let i = 0; i < count && outAt < expected; i += 1) {
        out[outAt] = value;
        outAt += 1;
      }
    }
  }
  return out;
}

/**
 * Read a Photoshop document.
 *
 * The header gives the size and the colour mode, the image data section holds
 * the channels, either raw or compressed with the run length encoding of the
 * format.
 */
export function parsePsd(bytes: Uint8Array): DecodedPicture {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
  );
  if (signature !== "8BPS") {
    throw new Error("This is not a Photoshop document.");
  }
  const channels = view.getUint16(12, false);
  const height = view.getUint32(14, false);
  const width = view.getUint32(18, false);
  const depth = view.getUint16(22, false);
  const colourMode = view.getUint16(24, false);

  let at = 26;
  at += 4 + view.getUint32(at, false); // colour mode data
  at += 4 + view.getUint32(at, false); // image resources
  at += 4 + view.getUint32(at, false); // layer and mask information

  const compression = view.getUint16(at, false);
  at += 2;

  const planeBytes = width * height;

  const planes: Uint8Array[] = [];
  if (compression === 0) {
    for (let c = 0; c < channels; c += 1) {
      planes.push(bytes.subarray(at, at + planeBytes));
      at += planeBytes;
    }
  } else if (compression === 1) {
    const counts = new Uint16Array(height * channels);
    for (let i = 0; i < counts.length; i += 1) {
      counts[i] = view.getUint16(at + i * 2, false);
    }
    at += counts.length * 2;
    for (let c = 0; c < channels; c += 1) {
      const total = counts.slice(c * height, (c + 1) * height).reduce((a, b) => a + b, 0);
      const raw = bytes.subarray(at, at + total);
      at += total;
      planes.push(packBits(raw, planeBytes));
    }
  } else {
    throw new Error(
      "This Photoshop document uses a compression this page cannot decode.",
    );
  }

  if (depth !== 8) {
    throw new Error(
      "This Photoshop document uses a bit depth this page cannot decode.",
    );
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    if (colourMode === 3) {
      rgba[i * 4] = planes[0]?.[i] ?? 0;
      rgba[i * 4 + 1] = planes[1]?.[i] ?? 0;
      rgba[i * 4 + 2] = planes[2]?.[i] ?? 0;
      rgba[i * 4 + 3] = 255;
    } else if (colourMode === 1) {
      const grey = planes[0]?.[i] ?? 0;
      rgba[i * 4] = grey;
      rgba[i * 4 + 1] = grey;
      rgba[i * 4 + 2] = grey;
      rgba[i * 4 + 3] = 255;
    } else {
      rgba[i * 4] = planes[0]?.[i] ?? 0;
      rgba[i * 4 + 1] = planes[1]?.[i] ?? 0;
      rgba[i * 4 + 2] = planes[2]?.[i] ?? 0;
      rgba[i * 4 + 3] = planes[3]?.[i] ?? 255;
    }
  }

  return { width, height, rgba };
}

/* -------------------------------------------------------------------- TIFF -- */

/** Read a baseline TIFF file (uncompressed strips). */
export function parseTiff(bytes: Uint8Array): DecodedPicture {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const little = bytes[0] === 0x49;
  const readU16 = (position: number) =>
    little ? view.getUint16(position, true) : view.getUint16(position, false);
  const readU32 = (position: number) =>
    little ? view.getUint32(position, true) : view.getUint32(position, false);

  if (readU16(2) !== 42) {
    throw new Error("This is not a TIFF file.");
  }

  const ifd = readU32(4);
  const entries = new Map<number, { type: number; count: number; value: number }>();
  const count = readU16(ifd);
  for (let i = 0; i < count; i += 1) {
    const at = ifd + 2 + i * 12;
    const tag = readU16(at);
    const type = readU16(at + 2);
    const valueCount = readU32(at + 4);
    let value = 0;
    if (type === 3) value = readU16(at + 8);
    else value = readU32(at + 8);
    entries.set(tag, { type, count: valueCount, value });
  }

  const width = entries.get(256)?.value ?? 0;
  const height = entries.get(257)?.value ?? 0;
  const compression = entries.get(259)?.value ?? 1;
  const photometric = entries.get(262)?.value ?? 1;
  const stripOffset = entries.get(273)?.value ?? 0;
  const samples = entries.get(277)?.value ?? 1;
  const bits = entries.get(258);

  if (compression !== 1) {
    throw new Error(
      "This TIFF file is compressed; this page reads uncompressed TIFF files only.",
    );
  }
  if (!width || !height) {
    throw new Error("This TIFF file does not carry a size.");
  }
  let bitsPerSample = 8;
  if (bits) {
    if (bits.count === 1) {
      bitsPerSample = bits.value;
    } else if (bits.count >= 3) {
      bitsPerSample = readU16(bits.value);
    }
  }
  if (bitsPerSample !== 8) {
    throw new Error(
      `This TIFF file uses ${bitsPerSample} bits per sample; this page reads 8 bit files only.`,
    );
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  const bytesPerSample = samples >= 3 ? 3 : 1;
  let at = stripOffset;
  for (let i = 0; i < width * height; i += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (bytesPerSample >= 3) {
      r = bytes[at];
      g = bytes[at + 1];
      b = bytes[at + 2];
      at += 3;
    } else {
      r = bytes[at];
      g = bytes[at];
      b = bytes[at];
      at += 1;
    }
    if (photometric === 0) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }

  return { width, height, rgba };
}

/* -------------------------------------------------------------------- HEIF -- */

export interface HeifInfo {
  brand: string;
  compatibleBrands: string[];
  width?: number;
  height?: number;
}

/** Read the container information of a HEIF file. */
export function parseHeif(bytes: Uint8Array): HeifInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const info: HeifInfo = { brand: "", compatibleBrands: [] };
  let at = 0;

  while (at + 8 <= bytes.length) {
    const size = view.getUint32(at, false);
    const type = String.fromCharCode(
      bytes[at + 4],
      bytes[at + 5],
      bytes[at + 6],
      bytes[at + 7],
    );
    const body = at + 8;
    if (type === "ftyp") {
      info.brand = String.fromCharCode(
        bytes[body],
        bytes[body + 1],
        bytes[body + 2],
        bytes[body + 3],
      );
      for (let i = 8; i + 3 < Math.min(size, bytes.length - body); i += 4) {
        info.compatibleBrands.push(
          String.fromCharCode(
            bytes[body + i],
            bytes[body + i + 1],
            bytes[body + i + 2],
            bytes[body + i + 3],
          ),
        );
      }
    }
    if (type === "meta") {
      // The image spatial extent box holds the size of the picture.
      let inner = body + 4;
      while (inner + 8 <= Math.min(body + size, bytes.length)) {
        const innerSize = view.getUint32(inner, false);
        const innerType = String.fromCharCode(
          bytes[inner + 4],
          bytes[inner + 5],
          bytes[inner + 6],
          bytes[inner + 7],
        );
        if (innerType === "iprp") {
          let scan = inner + 8;
          while (scan + 8 <= Math.min(inner + innerSize, bytes.length)) {
            const scanSize = view.getUint32(scan, false);
            const scanType = String.fromCharCode(
              bytes[scan + 4],
              bytes[scan + 5],
              bytes[scan + 6],
              bytes[scan + 7],
            );
            if (scanType === "ipco") {
              let property = scan + 8;
              while (property + 8 <= Math.min(scan + scanSize, bytes.length)) {
                const propertySize = view.getUint32(property, false);
                const propertyType = String.fromCharCode(
                  bytes[property + 4],
                  bytes[property + 5],
                  bytes[property + 6],
                  bytes[property + 7],
                );
                if (propertyType === "ispe" && propertySize >= 12) {
                  info.width = view.getUint32(property + 12, false);
                  info.height = view.getUint32(property + 16, false);
                }
                property += propertySize;
              }
            }
            scan += scanSize;
          }
        }
        inner += innerSize;
      }
    }
    if (size < 8) break;
    at += size;
  }

  return info;
}
