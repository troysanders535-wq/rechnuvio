/**
 * A reader for the OLE compound file format (CFB, "structured storage").
 *
 * An Outlook message (.msg) is such a container: the header, the body and
 * every attachment live in their own stream inside a compound file, so a
 * viewer that wants to show a message has to read the container first.
 *
 * The format is read directly from the bytes, so no library is needed and
 * nothing leaves the browser.
 *
 * Layout of the file:
 *
 *   - the header (512 bytes) names the sector size, the directory chain and
 *     the FAT (file allocation table) sectors,
 *   - the FAT is a table of 32 bit values, one per sector, that chains the
 *     sectors of every stream,
 *   - the directory is a tree of 128 byte entries, one per stream or
 *     storage, with the name, the type and the first sector of the data,
 *   - streams that are smaller than 4096 bytes live in the mini stream, a
 *     stream of its own that is cut into 64 byte mini sectors and chained by
 *     the mini FAT.
 */

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const TYPE_EMPTY = 0;
const TYPE_STORAGE = 1;
const TYPE_STREAM = 2;
const TYPE_ROOT = 5;

const NOSTREAM = 0xffffffff;

export interface OleEntry {
  /** The name of the entry without the path. */
  name: string;
  /** 1 storage, 2 stream, 5 root. */
  type: number;
  /** The first sector of the data. */
  start: number;
  /** The size of the data in bytes. */
  size: number;
  /** The path from the root, for example "__substg1.0_0037001F". */
  path: string;
}

export interface OleDocument {
  /** Every entry of the container, by its path from the root. */
  entries: Map<string, OleEntry>;
  /** The bytes of a stream, or null when the path is not a stream. */
  read(path: string): Uint8Array | null;
  /** The stream of a path, decoded as UTF-16LE or as Latin-1. */
  readText(path: string): string | null;
  /** The paths of the streams that start with the given prefix. */
  list(prefix: string): string[];
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

const utf16le = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code === 0) continue;
    out += String.fromCharCode(code);
  }
  return out;
};

const latin1 = (bytes: Uint8Array): string => {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
};

/** A property string ends with a null byte that is not part of the value. */
const trimNull = (text: string) => text.replace(/\u0000+$/, "");

export function readOle(buffer: ArrayBuffer): OleDocument {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 512) throw new Error("the file is too short to be a compound document");
  for (let i = 0; i < SIGNATURE.length; i += 1) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error("this is not an Outlook message");
  }

  const view = new DataView(buffer);
  const sectorShift = view.getUint16(30, true);
  const miniSectorShift = view.getUint16(32, true);
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << miniSectorShift;
  const miniCutoff = view.getUint32(56, true);
  const fatSectorCount = view.getUint32(44, true);
  const firstDirSector = view.getUint32(48, true);
  const firstMiniFatSector = view.getUint32(60, true);
  const miniFatSectorCount = view.getUint32(64, true);
  const firstDifatSector = view.getUint32(68, true);
  const difatSectorCount = view.getUint32(72, true);

  const sectorOffset = (id: number) => (id + 1) * sectorSize;
  const sector = (id: number): Uint8Array => {
    const start = sectorOffset(id);
    if (id < 0 || start + sectorSize > bytes.length) {
      throw new Error("the compound document points outside the file");
    }
    return bytes.subarray(start, start + sectorSize);
  };

  /* --------------------------------------------------------- the FAT --- */

  const difat: number[] = [];
  for (let i = 0; i < 109; i += 1) {
    const value = view.getUint32(76 + i * 4, true);
    if (value === NOSTREAM) break;
    difat.push(value);
  }
  let difatSector = firstDifatSector;
  let difatLeft = difatSectorCount;
  while (difatSector !== NOSTREAM && difatLeft > 0) {
    const block = sector(difatSector);
    const blockView = new DataView(block.buffer, block.byteOffset, block.byteLength);
    const perSector = sectorSize / 4 - 1;
    for (let i = 0; i < perSector; i += 1) {
      const value = blockView.getUint32(i * 4, true);
      if (value !== NOSTREAM) difat.push(value);
    }
    difatSector = blockView.getUint32(perSector * 4, true);
    difatLeft -= 1;
  }

  const fatValues: number[] = [];
  for (const id of difat.slice(0, fatSectorCount)) {
    const block = sector(id);
    const blockView = new DataView(block.buffer, block.byteOffset, block.byteLength);
    for (let i = 0; i < sectorSize / 4; i += 1) {
      fatValues.push(blockView.getUint32(i * 4, true));
    }
  }
  const fat = new Uint32Array(fatValues);

  /** The sectors of a chain, without the end marker. */
  const chain = (start: number, limit = 1 << 22): number[] => {
    const out: number[] = [];
    let id = start;
    const seen = new Set<number>();
    while (id !== NOSTREAM && id !== 0xfffffffe && out.length < limit) {
      if (seen.has(id)) break;
      seen.add(id);
      out.push(id);
      id = fat[id] ?? NOSTREAM;
    }
    return out;
  };

  /* ------------------------------------------------------ the directory --- */

  const dirSectors = chain(firstDirSector);
  const dirBytes = concat(dirSectors.map((id) => sector(id)));

  interface RawEntry {
    name: string;
    type: number;
    left: number;
    right: number;
    child: number;
    start: number;
    size: number;
  }

  const raw: RawEntry[] = [];
  for (let at = 0; at + 128 <= dirBytes.length; at += 128) {
    const entryView = new DataView(dirBytes.buffer, dirBytes.byteOffset + at, 128);
    let nameLength = entryView.getUint16(64, true);
    if (nameLength > 64) nameLength = 64;
    const name = utf16le(dirBytes.subarray(at, at + Math.max(0, nameLength - 2)));
    const type = dirBytes[at + 66];
    const sizeLow = entryView.getUint32(120, true);
    const sizeHigh = entryView.getUint32(124, true);
    raw.push({
      name,
      type,
      left: entryView.getUint32(68, true),
      right: entryView.getUint32(72, true),
      child: entryView.getUint32(76, true),
      start: entryView.getUint32(116, true),
      size: sizeHigh > 0 ? sizeHigh * 0x100000000 + sizeLow : sizeLow,
    });
  }

  const entries = new Map<string, OleEntry>();
  const root = raw[0];

  const visit = (id: number, parentPath: string) => {
    if (id === NOSTREAM || id >= raw.length) return;
    const entry = raw[id];
    const path = entry.name ? (parentPath ? `${parentPath}/${entry.name}` : entry.name) : parentPath;
    if (entry.type === TYPE_STORAGE || entry.type === TYPE_ROOT) {
      entries.set(path, { ...entry, path });
      if (entry.child !== NOSTREAM) visit(entry.child, path);
    } else if (entry.type === TYPE_STREAM) {
      entries.set(path, { ...entry, path });
    }
    if (entry.left !== NOSTREAM) visit(entry.left, parentPath);
    if (entry.right !== NOSTREAM) visit(entry.right, parentPath);
  };

  if (root) visit(root.child, "");

  /* ---------------------------------------------------- the mini stream --- */

  let miniStream: Uint8Array | null = null;
  if (root && root.type === TYPE_ROOT && root.size > 0) {
    const miniSectors = chain(root.start);
    miniStream = concat(miniSectors.map((id) => sector(id))).subarray(0, root.size);
  }

  const miniFatValues: number[] = [];
  if (miniFatSectorCount > 0 && firstMiniFatSector !== NOSTREAM) {
    const miniFatSectors = chain(firstMiniFatSector, miniFatSectorCount);
    for (const id of miniFatSectors) {
      const block = sector(id);
      const blockView = new DataView(block.buffer, block.byteOffset, block.byteLength);
      for (let i = 0; i < sectorSize / 4; i += 1) {
        miniFatValues.push(blockView.getUint32(i * 4, true));
      }
    }
  }
  const miniFat = new Uint32Array(miniFatValues);

  /* --------------------------------------------------------- reading --- */

  const readStream = (entry: OleEntry): Uint8Array => {
    if (entry.size === 0) return new Uint8Array(0);
    if (entry.size >= miniCutoff) {
      const sectors = chain(entry.start);
      const parts = sectors.map((id) => sector(id));
      return concat(parts).subarray(0, entry.size);
    }
    if (!miniStream) return new Uint8Array(0);
    const parts: Uint8Array[] = [];
    let id = entry.start;
    const seen = new Set<number>();
    let read = 0;
    while (id !== NOSTREAM && id !== 0xfffffffe && read < entry.size) {
      if (seen.has(id)) break;
      seen.add(id);
      const at = id * miniSectorSize;
      if (at + miniSectorSize > miniStream.length) break;
      parts.push(miniStream.subarray(at, at + miniSectorSize));
      read += miniSectorSize;
      id = miniFat[id] ?? NOSTREAM;
    }
    return concat(parts).subarray(0, entry.size);
  };

  return {
    entries,
    read(path: string) {
      const entry = entries.get(path);
      if (!entry || entry.type !== TYPE_STREAM) return null;
      return readStream(entry);
    },
    readText(path: string) {
      const data = this.read(path);
      if (!data) return null;
      // The type is written into the name of the stream: 001F is a unicode
      // string, 001E is an ANSI string, and both end with a null byte.
      const type = path.slice(-4).toUpperCase();
      if (type === "001E") return trimNull(latin1(data));
      if (type === "001F" || type === "001D") return trimNull(utf16le(data));
      // Without a type in the name, a unicode string is the common case.
      if (data.length >= 2 && data.length % 2 === 0) {
        const wide = utf16le(data);
        if (!wide.includes("\uFFFD")) return trimNull(wide);
      }
      return trimNull(latin1(data));
    },
    list(prefix: string) {
      return [...entries.keys()].filter(
        (path) => path.startsWith(prefix) && entries.get(path)?.type === TYPE_STREAM,
      );
    },
  };
}
