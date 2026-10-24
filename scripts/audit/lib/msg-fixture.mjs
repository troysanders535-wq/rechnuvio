/**
 * Build an Outlook message (.msg) as a real OLE compound document.
 *
 * The fixture is written by this file, byte for byte, in the format that
 * Outlook itself writes: a header, a directory tree, a mini FAT and the
 * property streams that carry the subject, the headers, the body and the
 * attachments.
 *
 * The content of the message is declared in MESSAGE, so the functional test
 * can state the expected values without reading them back out of the file
 * that was just built.
 */

const SECTOR = 512;
const MINI = 64;
const CUTOFF = 4096;

const ENDOFCHAIN = 0xfffffffe;
const FREESECT = 0xffffffff;
const FATSECT = 0xfffffffd;
const NOSTREAM = 0xffffffff;

const TYPE_STORAGE = 1;
const TYPE_STREAM = 2;
const TYPE_ROOT = 5;

/** The content of the fixture message. */
export const MESSAGE = {
  subject: "Quarterly audit report",
  from: "Alice Example",
  to: "Bob Example",
  cc: "Carol Example",
  date: "2026-01-12 09:30:00 UTC",
  body: [
    "Hello Bob,",
    "",
    "The quarterly audit is attached to this message.",
    "",
    "Regards,",
    "Alice",
  ].join("\r\n"),
  headers: [
    "From: Alice Example <alice@example.com>",
    "To: Bob Example <bob@example.com>",
    "Cc: Carol Example <carol@example.com>",
    "Subject: Quarterly audit report",
    "Date: Mon, 12 Jan 2026 09:30:00 +0000",
    "Message-ID: <20260112093000.audit@example.com>",
  ],
  attachment: {
    name: "audit-notes.txt",
    mime: "text/plain",
    text: "Nine findings, no blockers.\n",
  },
};

/** The bytes of the attachment. */
const attachmentBytes = new TextEncoder().encode(MESSAGE.attachment.text);

/** A unicode string, as the message stores it: UTF-16LE with a null byte. */
const unicode = (text) => {
  const out = new Uint8Array((text.length + 1) * 2);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = (code >> 8) & 0xff;
  }
  return out;
};

/** A date, as the message stores it: a file time. */
const fileTime = (iso) => {
  const ms = Date.parse(iso);
  const value = BigInt(Math.round((ms + 11644473600000) * 10000));
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
};

/** A 32 bit number, as the message stores a size. */
const int32 = (value) => new Uint8Array([value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff]);

const hex4 = (value) => (value & 0xffff).toString(16).padStart(4, "0").toUpperCase();

/** The name of the stream that carries a property. */
const prop = (id, type) => `__substg1.0_${hex4(id)}${hex4(type)}`;

/* ------------------------------------------------------------ the tree --- */

/**
 * The entries of the container.
 *
 * Every entry has a name, a type and, for a stream, the bytes it holds.
 */
function buildEntries() {
  const entries = [];
  const add = (name, type, data) => {
    entries.push({ name, type, data: data || null, children: [] });
    return entries.length - 1;
  };

  const root = add("Root Entry", TYPE_ROOT, null);
  const attach = add("__attach_version1.0_#00000000", TYPE_STORAGE, null);

  const streams = [
    [prop(0x0037, 0x001f), unicode(MESSAGE.subject)],
    [prop(0x0c1a, 0x001f), unicode(MESSAGE.from)],
    [prop(0x0e04, 0x001f), unicode(MESSAGE.to)],
    [prop(0x0e03, 0x001f), unicode(MESSAGE.cc)],
    [prop(0x007d, 0x001f), unicode(MESSAGE.headers.join("\r\n") + "\r\n")],
    [prop(0x1000, 0x001f), unicode(MESSAGE.body)],
    [prop(0x0e06, 0x0040), fileTime("2026-01-12T09:30:00Z")],
  ];
  const propertyStreams = streams.map(([name, data]) => add(name, TYPE_STREAM, data));

  const attachmentStreams = [
    add(prop(0x3707, 0x001f), TYPE_STREAM, unicode(MESSAGE.attachment.name)),
    add(prop(0x3701, 0x0102), TYPE_STREAM, attachmentBytes),
    add(prop(0x370e, 0x001f), TYPE_STREAM, unicode(MESSAGE.attachment.mime)),
    add(prop(0x0e20, 0x0002), TYPE_STREAM, int32(attachmentBytes.length)),
  ];

  entries[attach].children = attachmentStreams;
  entries[root].children = [attach, ...propertyStreams];
  return { entries, root, attach };
}

/**
 * Build the directory tree.
 *
 * The children of a storage are ordered by the length of their name and then
 * by the name itself, and the tree is balanced, so the file is a valid
 * compound document and not only readable by this repository.
 */
function linkTree(entries, children) {
  if (!children.length) return NOSTREAM;
  const sorted = [...children].sort((a, b) => {
    const nameA = entries[a].name;
    const nameB = entries[b].name;
    if (nameA.length !== nameB.length) return nameA.length - nameB.length;
    return nameA.toUpperCase() < nameB.toUpperCase() ? -1 : 1;
  });
  const build = (from, to) => {
    if (from > to) return NOSTREAM;
    const mid = (from + to) >> 1;
    entries[sorted[mid]].left = build(from, mid - 1);
    entries[sorted[mid]].right = build(mid + 1, to);
    return sorted[mid];
  };
  return build(0, sorted.length - 1);
}

/* -------------------------------------------------------------- writer --- */

export function buildMsgFixture() {
  const { entries, root, attach } = buildEntries();

  for (const entry of entries) {
    entry.left = NOSTREAM;
    entry.right = NOSTREAM;
    entry.child = NOSTREAM;
    entry.start = 0;
    entry.size = 0;
  }
  entries[root].child = linkTree(entries, entries[root].children);
  entries[attach].child = linkTree(entries, entries[attach].children);

  /* --- the mini stream: every stream of the message is smaller than 4096 --- */

  const miniParts = [];
  const miniFat = [];
  let miniSector = 0;
  for (const entry of entries) {
    if (entry.type !== TYPE_STREAM) continue;
    const data = entry.data;
    const sectors = Math.max(1, Math.ceil(data.length / MINI));
    entry.start = miniSector;
    entry.size = data.length;
    for (let i = 0; i < sectors; i += 1) {
      miniFat.push(i === sectors - 1 ? ENDOFCHAIN : miniSector + i + 1);
    }
    const padded = new Uint8Array(sectors * MINI);
    padded.set(data, 0);
    miniParts.push(padded);
    miniSector += sectors;
  }
  const miniStream = new Uint8Array(miniParts.reduce((sum, p) => sum + p.length, 0));
  {
    let at = 0;
    for (const part of miniParts) {
      miniStream.set(part, at);
      at += part.length;
    }
  }

  /* --- the sectors --- */

  const miniFatSectors = Math.max(1, Math.ceil((miniFat.length * 4) / SECTOR));
  const dirSectors = Math.max(1, Math.ceil((entries.length * 128) / SECTOR));
  const miniStreamSectors = Math.max(1, Math.ceil(miniStream.length / SECTOR));

  let fatSectors = 1;
  for (;;) {
    const total = fatSectors + dirSectors + miniFatSectors + miniStreamSectors;
    const needed = Math.max(1, Math.ceil(total / (SECTOR / 4)));
    if (needed === fatSectors) break;
    fatSectors = needed;
  }

  const totalSectors = fatSectors + dirSectors + miniFatSectors + miniStreamSectors;
  const dirStart = fatSectors;
  const miniFatStart = dirStart + dirSectors;
  const miniStreamStart = miniFatStart + miniFatSectors;

  const fat = new Uint32Array(totalSectors).fill(FREESECT);
  for (let i = 0; i < fatSectors; i += 1) fat[i] = FATSECT;
  const chain = (start, count) => {
    for (let i = 0; i < count; i += 1) {
      fat[start + i] = i === count - 1 ? ENDOFCHAIN : start + i + 1;
    }
  };
  chain(dirStart, dirSectors);
  chain(miniFatStart, miniFatSectors);
  chain(miniStreamStart, miniStreamSectors);

  /* --- the directory --- */

  const directory = new Uint8Array(dirSectors * SECTOR);
  const dirView = new DataView(directory.buffer);
  entries.forEach((entry, index) => {
    const at = index * 128;
    const name = unicode(entry.name);
    directory.set(name.subarray(0, 64), at);
    dirView.setUint16(at + 64, Math.min(64, name.length), true);
    directory[at + 66] = entry.type;
    directory[at + 67] = 1; // black
    dirView.setUint32(at + 68, entry.left, true);
    dirView.setUint32(at + 72, entry.right, true);
    dirView.setUint32(at + 76, entry.child, true);
    dirView.setUint32(at + 116, entry.start, true);
    dirView.setUint32(at + 120, entry.size, true);
    dirView.setUint32(at + 124, 0, true);
  });

  // The root owns the mini stream.
  dirView.setUint32(0 + 116, miniStreamStart, true);
  dirView.setUint32(0 + 120, miniStream.length, true);
  dirView.setUint32(0 + 124, 0, true);

  /* --- the mini FAT --- */

  const miniFatBytes = new Uint8Array(miniFatSectors * SECTOR);
  const miniFatView = new DataView(miniFatBytes.buffer);
  miniFat.forEach((value, index) => miniFatView.setUint32(index * 4, value, true));

  /* --- the header --- */

  const header = new Uint8Array(SECTOR);
  const headerView = new DataView(header.buffer);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
  headerView.setUint16(24, 0x003e, true); // minor version
  headerView.setUint16(26, 0x0003, true); // major version
  headerView.setUint16(28, 0xfffe, true); // byte order
  headerView.setUint16(30, 9, true); // sector shift, 512 bytes
  headerView.setUint16(32, 6, true); // mini sector shift, 64 bytes
  headerView.setUint32(40, 0, true); // number of directory sectors, none in v3
  headerView.setUint32(44, fatSectors, true);
  headerView.setUint32(48, dirStart, true);
  headerView.setUint32(56, CUTOFF, true);
  headerView.setUint32(60, miniFatStart, true);
  headerView.setUint32(64, miniFatSectors, true);
  headerView.setUint32(68, ENDOFCHAIN, true); // first DIFAT sector
  headerView.setUint32(72, 0, true); // number of DIFAT sectors
  for (let i = 0; i < 109; i += 1) {
    headerView.setUint32(76 + i * 4, i < fatSectors ? i : FREESECT, true);
  }

  /* --- the file --- */

  const file = new Uint8Array(SECTOR + totalSectors * SECTOR);
  file.set(header, 0);
  const sectorAt = (id) => SECTOR + id * SECTOR;
  const fatBytes = new Uint8Array(fatSectors * SECTOR);
  const fatView = new DataView(fatBytes.buffer);
  fat.forEach((value, index) => fatView.setUint32(index * 4, value, true));
  file.set(fatBytes, sectorAt(0));
  file.set(directory, sectorAt(dirStart));
  file.set(miniFatBytes, sectorAt(miniFatStart));
  file.set(miniStream, sectorAt(miniStreamStart));

  return { bytes: file, expected: MESSAGE };
}
