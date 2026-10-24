/**
 * Functional specs for the 76 tools of the image-suite engine.
 *
 * Every spec drives the real UI in Chrome: it puts a real image file into the
 * real file input, presses the real button and reads the real rendered
 * result.  The expected values come from the file-format specifications (PNG
 * signature and IHDR, JPEG SOI marker, WebP RIFF/WEBP container, the BMP and
 * GIF headers, the GIF/PNG colour tables) and from arithmetic (an aspect ratio
 * is a ratio), never from this site's own code.
 *
 * Where a tool cannot do what its name promises, the spec asserts the
 * promised behaviour anyway, so the spec fails and the defect shows up in the
 * audit evidence instead of being hidden.
 */

import assert from "node:assert";

import JSZip from "jszip";

import {
  spec,
  fillNumber,
  selectOption,
  clickButton,
  assertIncludes,
  assertMatches,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The workspace of the tool (the engine panel), without the page chrome. */
async function workspace(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/** Every label the workspace shows, used to look for a promised control. */
async function workspaceLabels(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const t = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const parts = [];
    root.querySelectorAll("button, label, option, h1, h2, h3, h4, p, span, td").forEach(
      (el) => {
        const s = t(el);
        if (s && s.length < 140) parts.push(s);
      },
    );
    root.querySelectorAll("input, select, textarea").forEach((el) => {
      parts.push(el.getAttribute("accept") || "");
      parts.push(el.getAttribute("placeholder") || "");
      parts.push(el.getAttribute("aria-label") || "");
    });
    return parts;
  });
}

/**
 * Assert that the workspace really offers the control the tool promises.
 *
 * A tool that is only an image uploader does not offer a grid splitter, a
 * brush, a URL field or a face picker, and that missing control is the defect
 * this assertion reports.
 */
async function requireControl(page, keywords, what) {
  const labels = await workspaceLabels(page);
  const haystack = labels.join(" | ").toLowerCase();
  const found = keywords.some((k) => haystack.includes(k.toLowerCase()));
  assert(
    found,
    `the tool offers no ${what} control (looked for ${keywords.join(", ")}; workspace shows: ${labels
      .slice(0, 30)
      .join(" | ")
      .slice(0, 400)})`,
  );
}

/** Type into the tool's text entry, or fail when the tool has none. */
async function typeText(page, value) {
  const area = page.locator("main textarea");
  if (await area.count()) {
    await area.first().fill(value);
    await sleep(600);
    return;
  }
  const input = page.locator('main input[type="text"]');
  if (await input.count()) {
    await input.first().fill(value);
    await sleep(600);
    return;
  }
  throw new Error("the tool offers no text entry control");
}

/** Put a file into the tool's file input and fire the real change event. */
async function uploadBytes(page, name, type, bytes) {
  await page.evaluate(
    ({ name, type, bytes }) => {
      const data = new Uint8Array(bytes);
      const file = new File([data], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, bytes: Array.from(bytes) },
  );
}

/** Put a base64 encoded file into the tool's file input. */
async function uploadBase64(page, name, type, base64) {
  await page.evaluate(
    ({ name, type, base64 }) => {
      const bin = atob(base64);
      const data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) data[i] = bin.charCodeAt(i);
      const file = new File([data], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, base64 },
  );
}

/** Build an image in the page and hand it to the tool's file input. */
async function uploadCanvasImage(page, options) {
  await page.evaluate(async (opts) => {
    const canvas = document.createElement("canvas");
    canvas.width = opts.width;
    canvas.height = opts.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = opts.color;
    ctx.fillRect(0, 0, opts.width, opts.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, opts.mime, 0.95),
    );
    const file = new File([blob], opts.name, { type: opts.mime });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector("main input[type=file]");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, options);
}

/** Wait until the workspace shows the uploaded picture. */
async function waitForPreview(page, timeout = 8000) {
  const started = Date.now();
  for (;;) {
    const shown = await page.evaluate(() => {
      const img = document.querySelector('main img[src^="data:"]');
      return img ? { w: img.naturalWidth, h: img.naturalHeight } : null;
    });
    if (shown) return shown;
    if (Date.now() - started > timeout) {
      throw new Error(
        "the tool never displayed the uploaded file (no picture was rendered)",
      );
    }
    await sleep(200);
  }
}

/** Wait until the workspace shows the given text. */
async function waitForWorkspaceText(page, needle, timeout = 15000) {
  const started = Date.now();
  for (;;) {
    const text = await workspace(page);
    if (text.includes(needle)) return text;
    if (Date.now() - started > timeout) {
      throw new Error(
        `the workspace never showed ${JSON.stringify(needle)}, it shows ${JSON.stringify(text.slice(0, 300))}`,
      );
    }
    await sleep(200);
  }
}

/** Press the download button and return the bytes the browser received. */
async function downloadBuffer(page, timeout = 20000) {
  const pending = page.waitForEvent("download", { timeout });
  await clickButton(page, "Download Image");
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { bytes: Buffer.concat(chunks), name: download.suggestedFilename() };
}

/** Decode the downloaded picture in the browser and read its pixels. */
async function decodePicture(page, bytes, mime) {
  return page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const at = (x, y) => {
      const i = (y * img.width + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    return {
      width: img.width,
      height: img.height,
      corner: at(0, 0),
      far: at(img.width - 1, 0),
      edge: at(0, Math.floor(img.height / 2)),
      center: at(Math.floor(img.width / 2), Math.floor(img.height / 2)),
    };
  }, `data:${mime};base64,${bytes.toString("base64")}`);
}

/* -------------------------------------------------------------- fixtures -- */

/** A 4x3 uncompressed 24-bit BMP (Microsoft BMP file header + BITMAPINFOHEADER). */
function bmpFixture(width = 4, height = 3) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixels = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = y * rowSize + x * 3;
      pixels[o] = 0x33;
      pixels[o + 1] = 0x66;
      pixels[o + 2] = 0xcc;
    }
  }
  const head = Buffer.alloc(54);
  head.write("BM", 0, "ascii");
  head.writeUInt32LE(54 + pixels.length, 2);
  head.writeUInt32LE(54, 10);
  head.writeUInt32LE(40, 14);
  head.writeInt32LE(width, 18);
  head.writeInt32LE(height, 22);
  head.writeUInt16LE(1, 26);
  head.writeUInt16LE(24, 28);
  head.writeUInt32LE(pixels.length, 34);
  head.writeInt32LE(2835, 38);
  head.writeInt32LE(2835, 42);
  return Buffer.concat([head, pixels]);
}

/** A 2x1 GIF89a with a two entry global colour table (GIF89a specification). */
function gifFixture() {
  return Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
    0x02, 0x00, 0x01, 0x00, 0xf0, 0x00, 0x00, // logical screen descriptor
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff, // global colour table
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, // image descriptor
    0x02, 0x02, 0x44, 0x0a, 0x00, // LZW minimum code size + data block
    0x3b, // trailer
  ]);
}

/**
 * An animated GIF89a with the given frame delays in milliseconds.
 *
 * The file follows the GIF89a specification: a header, a logical screen
 * descriptor, a global colour table and, for every frame, a graphic control
 * extension that carries the delay and an image block with the LZW data.
 * Every pixel is written after a clear code, so the stream stays valid
 * whatever the dictionary of the decoder does.
 */
function animatedGifFixture(delays, options = {}) {
  const width = options.width || 32;
  const height = options.height || 32;
  const parts = [Buffer.from("GIF89a", "ascii")];

  const screen = Buffer.alloc(7);
  screen.writeUInt16LE(width, 0);
  screen.writeUInt16LE(height, 2);
  screen[4] = 0xf0; // a global colour table with two entries
  parts.push(screen);
  parts.push(Buffer.from([0x00, 0x00, 0x00, 0xff, 0xff, 0xff])); // black and white

  delays.forEach((delay, index) => {
    const control = Buffer.alloc(8);
    control[0] = 0x21; // the graphic control extension
    control[1] = 0xf9;
    control[2] = 4; // the size of the block
    control.writeUInt16LE(Math.round(delay / 10), 4); // hundredths of a second
    parts.push(control);

    const descriptor = Buffer.alloc(10);
    descriptor[0] = 0x2c; // the image descriptor
    descriptor.writeUInt16LE(width, 5);
    descriptor.writeUInt16LE(height, 7);
    parts.push(descriptor);

    parts.push(Buffer.from([0x02])); // the minimum code size of the LZW stream
    // Every pixel is written after a clear code, so the stream stays valid
    // whatever the dictionary of the decoder does. The codes are packed into
    // the bytes with the first code in the lowest bits.
    const codes = [];
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      codes.push(0x04, index % 2); // the clear code, then the pixel
    }
    codes.push(0x05); // the end of the information
    let current = 0;
    let shift = 0;
    const data = [];
    for (const code of codes) {
      current |= code << shift;
      shift += 3;
      while (shift >= 8) {
        data.push(current & 0xff);
        current >>= 8;
        shift -= 8;
      }
    }
    if (shift > 0) data.push(current & 0xff);
    const bytes = Buffer.from(data);
    for (let at = 0; at < bytes.length; at += 255) {
      const block = bytes.subarray(at, at + 255);
      parts.push(Buffer.from([block.length]));
      parts.push(block);
    }
    parts.push(Buffer.from([0x00])); // the end of the data blocks
  });

  parts.push(Buffer.from([0x3b])); // the trailer
  return Buffer.concat(parts);
}

/** The chunks of a RIFF container, such as a WebP file. */
function riffChunks(bytes) {
  const chunks = [];
  let at = 12;
  while (at + 8 <= bytes.length) {
    const type = bytes.subarray(at, at + 4).toString("latin1");
    const size = bytes.readUInt32LE(at + 4);
    chunks.push({ type, payload: bytes.subarray(at + 8, at + 8 + size) });
    at += 8 + size + (size % 2);
  }
  return chunks;
}

/** One chunk of a RIFF container, padded to an even number of bytes. */
function riffChunk(type, payload) {
  const head = Buffer.alloc(8);
  head.write(type, 0, "ascii");
  head.writeUInt32LE(payload.length, 4);
  const pad = payload.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([head, payload, pad]);
}

/**
 * An animated WebP with the given frame delays in milliseconds.
 *
 * The picture chunk of every still file is placed into a frame chunk of an
 * animated WebP: the "VP8X" chunk carries the animation flag, the "ANIM"
 * chunk the loop count and every "ANMF" chunk one frame with its delay as
 * the three byte number at the twelfth byte of the chunk.
 */
function animatedWebpFixture(stills, delays, width, height) {
  const extended = Buffer.alloc(10);
  extended[0] = 0x02; // the animation flag of the extended format
  extended.writeUIntLE(width - 1, 4, 3);
  extended.writeUIntLE(height - 1, 7, 3);

  const anim = Buffer.alloc(6);
  anim.writeUInt16LE(0, 4); // the animation repeats for ever

  const body = [riffChunk("VP8X", extended), riffChunk("ANIM", anim)];
  delays.forEach((delay, index) => {
    const still = riffChunks(stills[index % stills.length]).find(
      (chunk) => chunk.type === "VP8 " || chunk.type === "VP8L",
    );
    assert.ok(still, "the still WebP must carry a picture chunk");
    const header = Buffer.alloc(16);
    header.writeUIntLE(width - 1, 6, 3);
    header.writeUIntLE(height - 1, 9, 3);
    header.writeUIntLE(delay, 12, 3);
    body.push(
      riffChunk(
        "ANMF",
        Buffer.concat([header, riffChunk(still.type, still.payload)]),
      ),
    );
  });

  const payload = Buffer.concat([Buffer.from("WEBP", "ascii"), ...body]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length, 0);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), size, payload]);
}

/** A 4x3 uncompressed RGB TIFF (TIFF 6.0 baseline, little endian). */
function tiffFixture(width = 4, height = 3) {
  const entries = [];
  const typeShort = 3;
  const typeLong = 4;
  const rationalOffset = 8 + 2 + 10 * 12 + 4;
  const bitsOffset = rationalOffset + 16;
  const stripOffset = bitsOffset + 6;
  const pixelBytes = width * height * 3;
  const push = (tag, type, count, value) => entries.push({ tag, type, count, value });
  push(256, typeLong, 1, width);
  push(257, typeLong, 1, height);
  push(258, typeShort, 3, bitsOffset);
  push(259, typeShort, 1, 1); // no compression
  push(262, typeShort, 1, 2); // RGB
  push(273, typeLong, 1, stripOffset);
  push(277, typeShort, 1, 3);
  push(278, typeLong, 1, height);
  push(279, typeLong, 1, pixelBytes);
  push(282, typeShort, 1, rationalOffset);
  push(283, typeShort, 1, rationalOffset + 8);
  push(296, typeShort, 1, 2);
  const body = Buffer.alloc(stripOffset + pixelBytes);
  body.write("II", 0, "ascii");
  body.writeUInt16LE(42, 2);
  body.writeUInt32LE(8, 4);
  body.writeUInt16LE(entries.length, 8);
  entries.forEach((e, i) => {
    const o = 10 + i * 12;
    body.writeUInt16LE(e.tag, o);
    body.writeUInt16LE(e.type, o + 2);
    body.writeUInt32LE(e.count, o + 4);
    if (e.type === typeShort && e.count === 1) {
      body.writeUInt16LE(e.value, o + 8);
    } else {
      body.writeUInt32LE(e.value, o + 8);
    }
  });
  body.writeUInt32LE(0, 10 + entries.length * 12);
  body.writeUInt32LE(72, rationalOffset);
  body.writeUInt32LE(1, rationalOffset + 4);
  body.writeUInt32LE(72, rationalOffset + 8);
  body.writeUInt32LE(1, rationalOffset + 12);
  body.writeUInt16LE(8, bitsOffset);
  body.writeUInt16LE(8, bitsOffset + 2);
  body.writeUInt16LE(8, bitsOffset + 4);
  for (let i = 0; i < pixelBytes; i += 3) {
    body[stripOffset + i] = 0x33;
    body[stripOffset + i + 1] = 0x66;
    body[stripOffset + i + 2] = 0xcc;
  }
  return body;
}

/** A 4x4 RGB Photoshop document (Photoshop PSD file format, version 1). */
function psdFixture(width = 4, height = 4) {
  const head = Buffer.alloc(26);
  head.write("8BPS", 0, "ascii");
  head.writeUInt16BE(1, 4);
  head.writeUInt16BE(3, 12); // channels
  head.writeUInt32BE(height, 14);
  head.writeUInt32BE(width, 18);
  head.writeUInt16BE(8, 22); // bits per channel
  head.writeUInt16BE(3, 24); // RGB
  const lengths = Buffer.alloc(12);
  lengths.writeUInt32BE(0, 0); // colour mode data
  lengths.writeUInt32BE(0, 4); // image resources
  lengths.writeUInt32BE(0, 8); // layer and mask info
  const data = Buffer.alloc(2 + width * height * 3);
  data.writeUInt16BE(0, 0); // raw compression
  return Buffer.concat([head, lengths, data]);
}

/** An ISO base media file with the "heic" brand (HEIF container header). */
function heicFixture() {
  const body = Buffer.from([
    0x66, 0x74, 0x79, 0x70, // "ftyp"
    0x68, 0x65, 0x69, 0x63, // major brand "heic"
    0x00, 0x00, 0x00, 0x00, // minor version
    0x6d, 0x69, 0x66, 0x31, // compatible brand "mif1"
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(body.length + 4, 0);
  return Buffer.concat([size, body]);
}

/** A minimal PDF 1.4 document with one page and one line of text. */
function pdfFixture() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null, // the content stream, filled in below
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 18 Tf 20 40 Td (ToolPad Illustrator Preview) Tj ET";
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** An SVG document with an intrinsic size of 40x20 pixels. */
function svgFixture() {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#3366cc"/></svg>`,
    "utf8",
  );
}

/**
 * A real AVIF picture of 11x6 pixels (ISO base media file, AV1 still image).
 *
 * A canvas cannot encode AVIF, so the fixture is a genuine AVIF file that the
 * page under test has to decode with the browser image decoder.
 */
const AVIF_FIXTURE =
  "AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACcAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAsAAAAGAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAvbWRhdBIACgg4DKq0gIaDSDIZE8JjJoAA8IAAAABYy6xHDbir2u7WNUTtcA==";

/** The CRC-32 of a buffer, as the ZIP format defines it. */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A ZIP archive with stored (uncompressed) entries, as the format defines. */
function zipFixture(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralBytes, end]);
}

/** A minimal Word document that carries an author in its core properties. */
function docxFixture() {
  return zipFixture([
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    ],
    [
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>ToolPad Contract</w:t></w:r></w:p></w:body></w:document>`,
    ],
    [
      "docProps/core.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>ToolPad Author</dc:creator><dc:title>ToolPad Contract</dc:title></cp:coreProperties>`,
    ],
  ]);
}

/* ------------------------------------------- decoders written for this suite -- */
/*
 * The parsers below read the file formats from their own specifications (PNG
 * 1.2, the Microsoft icon format, GIF89a, ISO base media files, TIFF 6.0 and
 * the Exif 2.3 standard).  They never call the code of the site under test, so
 * a spec that uses them compares the product with the format and not with
 * itself.
 */

/** The size of a PNG picture, read from its IHDR chunk. */
function pngSize(bytes) {
  assert.equal(
    bytes.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    "a PNG file starts with the 8 byte PNG signature",
  );
  assert.equal(
    bytes.subarray(12, 16).toString("latin1"),
    "IHDR",
    "the first chunk of a PNG file is the IHDR chunk",
  );
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The directory of an icon file, read from its header. */
function icoDirectory(bytes) {
  assert.ok(bytes.length >= 6, "an icon file is at least 6 bytes long");
  assert.equal(
    bytes.readUInt16LE(0),
    0,
    "the first two bytes of an icon file are reserved and zero",
  );
  assert.equal(
    bytes.readUInt16LE(2),
    1,
    "the type of an icon file is 1 (icon)",
  );
  const count = bytes.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const at = 6 + i * 16;
    const size = bytes[at] === 0 ? 256 : bytes[at];
    const length = bytes.readUInt32LE(at + 8);
    const offset = bytes.readUInt32LE(at + 12);
    entries.push({
      size,
      length,
      offset,
      payload: bytes.subarray(offset, offset + length),
    });
  }
  return { count, entries };
}

/** The size of the picture that an icon entry carries. */
function icoEntrySize(entry) {
  const payload = entry.payload;
  if (payload.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return {
      kind: "png",
      width: payload.readUInt32BE(16),
      height: payload.readUInt32BE(20),
    };
  }
  assert.equal(
    payload.readUInt32LE(0),
    40,
    "a bitmap icon entry starts with a 40 byte BITMAPINFOHEADER",
  );
  return {
    kind: "bmp",
    width: payload.readInt32LE(4),
    // The height of a bitmap icon counts the colour bitmap and the mask.
    height: Math.abs(payload.readInt32LE(8)) / 2,
  };
}

/** The structure of a GIF file: its size, its frames and their delays. */
function gifStructure(bytes) {
  const signature = bytes.subarray(0, 6).toString("latin1");
  assert.match(
    signature,
    /^GIF8[79]a$/,
    `a GIF file starts with GIF87a or GIF89a, got ${JSON.stringify(signature)}`,
  );
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  const packed = bytes[10];
  const tableSize = (packed & 0x80) !== 0 ? 2 ** ((packed & 0x07) + 1) : 0;
  let at = 13 + tableSize * 3;
  const frames = [];
  let pendingDelay = null;
  let loop = null;
  while (at < bytes.length) {
    const marker = bytes[at];
    if (marker === 0x3b) break; // the trailer ends the file
    if (marker === 0x21) {
      const label = bytes[at + 1];
      at += 2;
      if (label === 0xf9) {
        // The graphic control extension carries the delay of the next frame.
        const size = bytes[at];
        pendingDelay = bytes.readUInt16LE(at + 2);
        at += 1 + size;
      } else if (label === 0xff) {
        const size = bytes[at];
        const name = bytes.subarray(at + 1, at + 1 + size).toString("latin1");
        at += 1 + size;
        if (name.startsWith("NETSCAPE")) {
          const blockSize = bytes[at];
          // The sub block is [size][0x01][loop low][loop high].
          loop = bytes.readUInt16LE(at + 2);
          at += blockSize;
        }
      }
      while (at < bytes.length && bytes[at] !== 0) at += bytes[at] + 1;
      at += 1;
      continue;
    }
    if (marker === 0x2c) {
      const frameWidth = bytes.readUInt16LE(at + 5);
      const frameHeight = bytes.readUInt16LE(at + 7);
      const framePacked = bytes[at + 9];
      const localTable =
        (framePacked & 0x80) !== 0 ? 2 ** ((framePacked & 0x07) + 1) : 0;
      at += 10 + localTable * 3;
      at += 1; // the minimum code size of the LZW stream
      while (at < bytes.length && bytes[at] !== 0) at += bytes[at] + 1;
      at += 1;
      frames.push({
        width: frameWidth,
        height: frameHeight,
        delay: pendingDelay === null ? 0 : pendingDelay,
      });
      pendingDelay = null;
      continue;
    }
    at += 1;
  }
  return { signature, width, height, frames, loop };
}

/** The boxes of an ISO base media file. */
function mp4Structure(bytes) {
  const boxes = [];
  let at = 0;
  while (at + 8 <= bytes.length) {
    const size = bytes.readUInt32BE(at);
    const type = bytes.subarray(at + 4, at + 8).toString("latin1");
    if (size < 8 || at + size > bytes.length) break;
    boxes.push({ type, size, payload: bytes.subarray(at + 8, at + size) });
    at += size;
  }
  return boxes;
}

/**
 * Build an Exif APP1 segment with the given values.
 *
 * The layout follows TIFF 6.0: a byte order mark, the magic number 42, the
 * offset of the first directory, the directory entries (twelve bytes each) and
 * the values that do not fit into the four bytes of an entry.
 */
function exifApp1(options) {
  const ascii = (text) => Buffer.from(`${text}\0`, "latin1");
  const rationals = (values) => {
    const out = Buffer.alloc(values.length * 8);
    values.forEach((value, index) => {
      out.writeUInt32LE(value[0], index * 8);
      out.writeUInt32LE(value[1], index * 8 + 4);
    });
    return out;
  };

  const ifd0 = [];
  const gps = [];
  if (options.make) ifd0.push({ tag: 0x010f, type: 2, buffer: ascii(options.make) });
  if (options.model) ifd0.push({ tag: 0x0110, type: 2, buffer: ascii(options.model) });
  if (options.software) ifd0.push({ tag: 0x0131, type: 2, buffer: ascii(options.software) });
  if (options.dateTime) ifd0.push({ tag: 0x0132, type: 2, buffer: ascii(options.dateTime) });
  if (options.artist) ifd0.push({ tag: 0x013b, type: 2, buffer: ascii(options.artist) });
  if (options.gps) {
    gps.push({ tag: 0x0001, type: 2, buffer: ascii(options.gps.latRef) });
    gps.push({ tag: 0x0002, type: 5, buffer: rationals(options.gps.lat) });
    gps.push({ tag: 0x0003, type: 2, buffer: ascii(options.gps.lonRef) });
    gps.push({ tag: 0x0004, type: 5, buffer: rationals(options.gps.lon) });
  }

  const records = [];
  ifd0.forEach((entry, index) => records.push({ key: `ifd0:${index}`, buffer: entry.buffer }));
  gps.forEach((entry, index) => records.push({ key: `gps:${index}`, buffer: entry.buffer }));

  const ifd0Length = 2 + (ifd0.length + (gps.length ? 1 : 0)) * 12 + 4;
  const gpsLength = gps.length ? 2 + gps.length * 12 + 4 : 0;
  const dataStart = 8 + ifd0Length + gpsLength;

  let cursor = dataStart;
  const offsets = new Map();
  for (const record of records) {
    offsets.set(record.key, cursor);
    cursor += record.buffer.length;
  }

  const tiff = Buffer.alloc(cursor);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);

  tiff.writeUInt16LE(ifd0.length + (gps.length ? 1 : 0), 8);
  let at = 10;
  ifd0.forEach((entry, index) => {
    tiff.writeUInt16LE(entry.tag, at);
    tiff.writeUInt16LE(entry.type, at + 2);
    tiff.writeUInt32LE(entry.buffer.length, at + 4);
    if (entry.buffer.length <= 4) {
      entry.buffer.copy(tiff, at + 8);
    } else {
      tiff.writeUInt32LE(offsets.get(`ifd0:${index}`), at + 8);
    }
    at += 12;
  });
  if (gps.length) {
    tiff.writeUInt16LE(0x8825, at);
    tiff.writeUInt16LE(4, at + 2);
    tiff.writeUInt32LE(1, at + 4);
    tiff.writeUInt32LE(8 + ifd0Length, at + 8);
    at += 12;
  }
  tiff.writeUInt32LE(0, at);

  if (gps.length) {
    const gpsAt = 8 + ifd0Length;
    tiff.writeUInt16LE(gps.length, gpsAt);
    let g = gpsAt + 2;
    gps.forEach((entry, index) => {
      tiff.writeUInt16LE(entry.tag, g);
      tiff.writeUInt16LE(entry.type, g + 2);
      tiff.writeUInt32LE(entry.type === 2 ? entry.buffer.length : 3, g + 4);
      if (entry.buffer.length <= 4) {
        entry.buffer.copy(tiff, g + 8);
      } else {
        tiff.writeUInt32LE(offsets.get(`gps:${index}`), g + 8);
      }
      g += 12;
    });
    tiff.writeUInt32LE(0, g);
  }

  for (const record of records) {
    record.buffer.copy(tiff, offsets.get(record.key));
  }

  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.alloc(4 + payload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  // The length of an APP1 segment counts its own two length bytes.
  app1.writeUInt16BE(payload.length + 2, 2);
  payload.copy(app1, 4);
  return app1;
}

/** Put an Exif APP1 segment into a JPEG file, right behind the SOI marker. */
function jpegWithExif(jpeg, app1) {
  assert.equal(jpeg[0], 0xff, "a JPEG file starts with the SOI marker");
  assert.equal(jpeg[1], 0xd8, "a JPEG file starts with the SOI marker");
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

/** Read the Exif values of a JPEG file, without the parser of the product. */
function readExifValues(jpeg) {
  const values = {};
  let at = 2;
  let tiffAt = -1;
  while (at + 4 < jpeg.length) {
    if (jpeg[at] !== 0xff) {
      at += 1;
      continue;
    }
    const marker = jpeg[at + 1];
    if (marker === 0xda || marker === 0xd9) break;
    if (
      marker === 0xe1 &&
      jpeg.subarray(at + 4, at + 8).toString("latin1") === "Exif"
    ) {
      tiffAt = at + 10;
      break;
    }
    at += 2 + jpeg.readUInt16BE(at + 2);
  }
  if (tiffAt < 0) return values;

  const little = jpeg[tiffAt] === 0x49;
  const u16 = (position) =>
    little ? jpeg.readUInt16LE(position) : jpeg.readUInt16BE(position);
  const u32 = (position) =>
    little ? jpeg.readUInt32LE(position) : jpeg.readUInt32BE(position);
  const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

  const readDirectory = (start, into) => {
    const count = u16(start);
    for (let i = 0; i < count; i += 1) {
      const entry = start + 2 + i * 12;
      if (entry + 12 > jpeg.length) return;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const amount = u32(entry + 4);
      let valueAt = entry + 8;
      if ((sizes[type] ?? 1) * amount > 4) valueAt = tiffAt + u32(entry + 8);
      if (type === 2) {
        let text = "";
        for (let k = 0; k < amount; k += 1) {
          const code = jpeg[valueAt + k];
          if (!code) break;
          text += String.fromCharCode(code);
        }
        into[tag] = text;
      } else if (type === 5) {
        const parts = [];
        for (let k = 0; k < amount; k += 1) {
          parts.push(`${u32(valueAt + k * 8)}/${u32(valueAt + k * 8 + 4)}`);
        }
        into[tag] = parts.join(",");
      }
    }
  };

  readDirectory(tiffAt + u32(tiffAt + 4), values);
  const ifd0 = tiffAt + u32(tiffAt + 4);
  const count = u16(ifd0);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > jpeg.length) break;
    if (u16(entry) === 0x8825) readDirectory(tiffAt + u32(entry + 8), values);
  }
  return values;
}

/** Add a text chunk with the given key and value to a PNG file. */
function pngWithText(png, key, value) {
  assert.equal(
    png.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    "a PNG file starts with the 8 byte PNG signature",
  );
  const data = Buffer.concat([
    Buffer.from(key, "latin1"),
    Buffer.from([0]),
    Buffer.from(value, "latin1"),
  ]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write("tEXt", 4, "latin1");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  // The text chunk goes right behind the header chunk.
  const at = 8 + 12 + png.readUInt32BE(8);
  return Buffer.concat([png.subarray(0, at), chunk, png.subarray(at)]);
}

/** Read the text chunks of a PNG file, without the parser of the product. */
function readPngText(png) {
  const values = {};
  let at = 8;
  while (at + 8 <= png.length) {
    const length = png.readUInt32BE(at);
    const type = png.subarray(at + 4, at + 8).toString("latin1");
    if (type === "tEXt") {
      const data = png.subarray(at + 8, at + 8 + length);
      const split = data.indexOf(0);
      values[data.subarray(0, split).toString("latin1")] = data
        .subarray(split + 1)
        .toString("latin1");
    }
    if (type === "IEND") break;
    at += 12 + length;
  }
  return values;
}

/* ---------------------------------------------- pictures the browser draws -- */

/**
 * Draw a picture in the page and return its bytes.
 *
 * The patterns are the fixtures of this suite: a colour ramp that changes in
 * both directions, black and white columns and a green frame around a blue
 * field.
 */
async function canvasPicture(page, width, height, pattern, mime = "image/png") {
  const base64 = await page.evaluate(
    async (opts) => {
      const canvas = document.createElement("canvas");
      canvas.width = opts.width;
      canvas.height = opts.height;
      const ctx = canvas.getContext("2d");
      const image = ctx.createImageData(opts.width, opts.height);
      const data = image.data;
      const put = (x, y, r, g, b) => {
        const i = (y * opts.width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      };
      for (let y = 0; y < opts.height; y += 1) {
        for (let x = 0; x < opts.width; x += 1) {
          if (opts.pattern === "ramp") {
            put(
              x,
              y,
              Math.round((x * 255) / (opts.width - 1)),
              Math.round((y * 255) / (opts.height - 1)),
              128,
            );
          } else if (opts.pattern === "columns") {
            if (Math.floor(x / 4) % 2) put(x, y, 255, 255, 255);
            else put(x, y, 0, 0, 0);
          } else if (opts.pattern === "frame") {
            const border = 4;
            const onBorder =
              x < border ||
              y < border ||
              x >= opts.width - border ||
              y >= opts.height - border;
            if (onBorder) put(x, y, 0, 255, 0);
            else put(x, y, 0, 0, 255);
          } else {
            put(x, y, 51, 102, 204);
          }
        }
      }
      ctx.putImageData(image, 0, 0);
      if (opts.mime === "image/jpeg") {
        const filled = document.createElement("canvas");
        filled.width = opts.width;
        filled.height = opts.height;
        const filledCtx = filled.getContext("2d");
        filledCtx.fillStyle = "#ffffff";
        filledCtx.fillRect(0, 0, opts.width, opts.height);
        filledCtx.drawImage(canvas, 0, 0);
        return filled.toDataURL("image/jpeg", 0.95).split(",")[1];
      }
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { width, height, pattern, mime },
  );
  return Buffer.from(base64, "base64");
}

/** The colour of the "columns" fixture at the given position. */
function columnColour(x) {
  return Math.floor(x / 4) % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255];
}

/** A photo that really carries an Exif block with camera, date and GPS. */
async function photoWithExif(page) {
  const plain = await canvasPicture(page, 20, 20, "solid", "image/jpeg");
  return jpegWithExif(
    plain,
    exifApp1({
      make: "ToolPadCam",
      model: "TP-X1",
      dateTime: "2021:03:04 05:06:07",
      software: "ToolPad Spec",
      gps: {
        latRef: "N",
        lat: [
          [52, 1],
          [30, 1],
          [0, 1],
        ],
        lonRef: "E",
        lon: [
          [13, 1],
          [24, 1],
          [0, 1],
        ],
      },
    }),
  );
}

/** Record a short clip of a canvas in the page and return its bytes. */
async function recordClip(page, width, height, frames) {
  const base64 = await page.evaluate(
    async (opts) => {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("this browser cannot record a clip with MediaRecorder");
      }
      const canvas = document.createElement("canvas");
      canvas.width = opts.width;
      canvas.height = opts.height;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      recorder.start(100);
      for (let index = 0; index < opts.frames; index += 1) {
        ctx.fillStyle = index % 2 ? "#ff0000" : "#00ff00";
        ctx.fillRect(0, 0, opts.width, opts.height);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      recorder.stop();
      await stopped;
      const buffer = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      return btoa(binary);
    },
    { width, height, frames },
  );
  return Buffer.from(base64, "base64");
}

/**
 * The body of the specs that cut a photo into tiles.
 *
 * The picture carries a colour ramp, so every tile can be checked against the
 * corner of the picture it was cut from.
 */
async function splitPhotoIntoTiles(page) {
  const source = await canvasPicture(page, 90, 90, "ramp");
  await uploadBytes(page, "photo.png", "image/png", source);
  await waitForPreview(page);
  await requireControl(
    page,
    ["3x3", "3 x 3", "grid", "tiles", "rows", "columns"],
    "grid control",
  );
  await fillNumber(page, 3, 0);
  await fillNumber(page, 3, 1);
  const { bytes, name } = await downloadFrom(page, "Download the tiles (.zip)");
  assert.match(name, /\.zip$/, `the download should be a zip file, got ${name}`);

  const archive = await JSZip.loadAsync(bytes);
  const names = Object.keys(archive.files).filter(
    (entry) => !archive.files[entry].dir,
  );
  const expected = [];
  for (let row = 1; row <= 3; row += 1) {
    for (let column = 1; column <= 3; column += 1) {
      expected.push(`tile-${row}-${column}.png`);
    }
  }
  assert.equal(names.length, 9, `the archive must hold nine tiles, it holds ${names.length}`);
  assert.deepEqual(
    names.slice().sort(),
    expected.slice().sort(),
    "the archive holds the nine tiles of the grid",
  );

  for (const entry of expected) {
    const tile = await archive.files[entry].async("nodebuffer");
    const size = pngSize(tile);
    assert.equal(size.width, 30, `the tile ${entry} is 30 pixels wide`);
    assert.equal(size.height, 30, `the tile ${entry} is 30 pixels high`);
  }

  const first = await readPixels(
    page,
    await archive.files["tile-1-1.png"].async("nodebuffer"),
    "image/png",
  );
  assert.deepEqual(
    pixelAt(first, 0, 0),
    [0, 0, 128, 255],
    "the first tile starts at the top left corner of the picture",
  );
  const last = await readPixels(
    page,
    await archive.files["tile-3-3.png"].async("nodebuffer"),
    "image/png",
  );
  assert.deepEqual(
    pixelAt(last, 0, 0),
    [172, 172, 128, 255],
    "the last tile starts at the bottom right corner of the picture",
  );
}

/** The colours a part of a picture uses. */
function regionColours(picture, x0, y0, x1, y1) {
  const colours = new Set();
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const [r, g, b, a] = pixelAt(picture, x, y);
      colours.add(`${r},${g},${b},${a}`);
    }
  }
  return Array.from(colours).sort();
}

/** The box that the dark pixels of a picture fill. */
function darkBox(picture) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  let count = 0;
  for (let y = 0; y < picture.height; y += 1) {
    for (let x = 0; x < picture.width; x += 1) {
      const [r, g, b, a] = pixelAt(picture, x, y);
      if (a < 128) continue;
      if (r + g + b >= 3 * 128) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      count += 1;
    }
  }
  return { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1, count };
}

/** The pictures an icon file carries, with their real size. */
function icoPictures(bytes) {
  const { count, entries } = icoDirectory(bytes);
  return {
    count,
    pictures: entries.map((entry) => {
      const size = icoEntrySize(entry);
      return {
        size: entry.size,
        length: entry.length,
        kind: size.kind,
        width: size.width,
        height: size.height,
      };
    }),
  };
}

/** Decode a picture in the browser and return every one of its pixels. */
async function readPixels(page, bytes, mime) {
  return page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    return { width: img.width, height: img.height, data: Array.from(data) };
  }, `data:${mime};base64,${bytes.toString("base64")}`);
}

/**
 * The colour of the first pixel of every frame of an animation.
 *
 * The ImageDecoder of the browser reads the frames of an animation one by
 * one. A browser without it cannot read them, and the helper returns null.
 */
async function animationColours(page, bytes) {
  return page.evaluate(async (url) => {
    if (typeof ImageDecoder === "undefined") return null;
    const response = await fetch(url);
    const data = new Uint8Array(await response.arrayBuffer());
    const decoder = new ImageDecoder({ data, type: "image/gif" });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const colours = [];
    for (let index = 0; index < track.frameCount; index += 1) {
      const { image } = await decoder.decode({ frameIndex: index });
      const canvas = document.createElement("canvas");
      canvas.width = image.displayWidth;
      canvas.height = image.displayHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      colours.push([pixel[0], pixel[1], pixel[2]]);
      image.close();
    }
    decoder.close();
    return colours;
  }, `data:image/gif;base64,${bytes.toString("base64")}`);
}

/** One pixel of a picture that readPixels returned. */function pixelAt(picture, x, y) {
  const at = (y * picture.width + x) * 4;
  return [
    picture.data[at],
    picture.data[at + 1],
    picture.data[at + 2],
    picture.data[at + 3],
  ];
}

/** The number of different colours a picture uses. */
function colourCount(picture) {
  const colours = new Set();
  for (let at = 0; at < picture.data.length; at += 4) {
    colours.add(
      `${picture.data[at]},${picture.data[at + 1]},${picture.data[at + 2]},${picture.data[at + 3]}`,
    );
  }
  return colours.size;
}

/** Press a button and return the bytes the browser received. */
async function downloadFrom(page, label, timeout = 20000) {
  const pending = page.waitForEvent("download", { timeout });
  await clickButton(page, label);
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { bytes: Buffer.concat(chunks), name: download.suggestedFilename() };
}

/** Set the value of a range input and let the tool react to it. */
async function setRange(page, index, value) {
  await page.evaluate(
    ({ index, value }) => {
      const input = document.querySelectorAll('main input[type="range"]')[index];
      if (!input) throw new Error(`the tool has no range input ${index}`);
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { index, value },
  );
  await sleep(400);
}

/** The label and value pairs of the list the tool shows. */
async function dataList(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll("main dl > div").forEach((row) => {
      const label = row.querySelector("dt");
      const value = row.querySelector("dd");
      if (!label || !value) return;
      rows.push({
        label: (label.textContent || "").replace(/\s+/g, " ").trim(),
        value: (value.textContent || "").replace(/\s+/g, " ").trim(),
      });
    });
    return rows;
  });
}

/** The text of the code block the tool shows. */
async function codeBlock(page) {
  return page.evaluate(() => {
    const pre = document.querySelector("main pre");
    return pre ? pre.textContent || "" : "";
  });
}

/** The value of a label of the list the tool shows. */
async function dataValue(page, label) {
  const rows = await dataList(page);
  const hit = rows.find((row) => row.label === label);
  return hit ? hit.value : null;
}

/* ---------------------------------------------------------------- specs -- */
export function register() {
  /* ---- format conversion ---- */

  spec("png-to-webp-converter", "writes a WebP container for a PNG source", async (page) => {
    await uploadCanvasImage(page, {
      width: 8,
      height: 6,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    await selectOption(page, "image/webp");
    const { bytes, name } = await downloadBuffer(page);
    assert.equal(
      bytes.subarray(0, 4).toString("latin1"),
      "RIFF",
      "a WebP file starts with the RIFF chunk header",
    );
    assert.equal(
      bytes.subarray(8, 12).toString("latin1"),
      "WEBP",
      "the RIFF form type of a WebP file is WEBP",
    );
    assert.match(name, /\.webp$/, `the download should be named .webp, got ${name}`);
    const pic = await decodePicture(page, bytes, "image/webp");
    assert.equal(pic.width, 8, "the WebP keeps the source width");
    assert.equal(pic.height, 6, "the WebP keeps the source height");
  });

  spec("jpg-to-png-converter", "writes a PNG for a JPEG source", async (page) => {
    await uploadCanvasImage(page, {
      width: 9,
      height: 5,
      color: "#3366cc",
      mime: "image/jpeg",
      name: "source.jpg",
    });
    await waitForPreview(page);
    await selectOption(page, "image/png");
    const { bytes, name } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 9, "the PNG keeps the source width");
    assert.equal(pic.height, 5, "the PNG keeps the source height");
  });

  spec("png-to-jpg-converter", "writes a JPEG and flattens transparency onto white", async (page) => {
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 6;
      canvas.height = 6;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 6, 6);
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(2, 2, 2, 2);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "alpha.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const pic = await decodePicture(page, bytes, "image/jpeg");
    assert.deepEqual(
      pic.corner,
      [255, 255, 255, 255],
      `the transparent area must be flattened onto white, got ${JSON.stringify(pic.corner)}`,
    );
  });

  spec("jpg-to-webp-converter", "writes a WebP for a JPEG source", async (page) => {
    await uploadCanvasImage(page, {
      width: 7,
      height: 7,
      color: "#3366cc",
      mime: "image/jpeg",
      name: "source.jpg",
    });
    await waitForPreview(page);
    await selectOption(page, "image/webp");
    const { bytes } = await downloadBuffer(page);
    assert.equal(
      bytes.subarray(8, 12).toString("latin1"),
      "WEBP",
      "the RIFF form type of a WebP file is WEBP",
    );
    const pic = await decodePicture(page, bytes, "image/webp");
    assert.equal(pic.width, 7, "the WebP keeps the source width");
    assert.equal(pic.height, 7, "the WebP keeps the source height");
  });

  spec("webp-to-png-converter", "writes a PNG for a WebP source", async (page) => {
    await uploadCanvasImage(page, {
      width: 5,
      height: 9,
      color: "#3366cc",
      mime: "image/webp",
      name: "source.webp",
    });
    await waitForPreview(page);
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 5, "the PNG keeps the source width");
    assert.equal(pic.height, 9, "the PNG keeps the source height");
  });

  spec("webp-to-jpg-converter", "writes a JPEG for a WebP source", async (page) => {
    await uploadCanvasImage(page, {
      width: 5,
      height: 9,
      color: "#3366cc",
      mime: "image/webp",
      name: "source.webp",
    });
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const pic = await decodePicture(page, bytes, "image/jpeg");
    assert.equal(pic.width, 5, "the JPEG keeps the source width");
    assert.equal(pic.height, 9, "the JPEG keeps the source height");
  });

  spec("webp-converter", "converts a picture to WebP in the browser", async (page) => {
    await uploadCanvasImage(page, {
      width: 10,
      height: 4,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    await selectOption(page, "image/webp");
    const { bytes } = await downloadBuffer(page);
    assert.equal(
      bytes.subarray(8, 12).toString("latin1"),
      "WEBP",
      "the RIFF form type of a WebP file is WEBP",
    );
    const pic = await decodePicture(page, bytes, "image/webp");
    assert.equal(pic.width, 10, "the WebP keeps the source width");
    assert.equal(pic.height, 4, "the WebP keeps the source height");
  });

  spec("bmp-to-jpg", "reads a BMP bitmap and writes a JPEG", async (page) => {
    await uploadBytes(page, "bitmap.bmp", "image/bmp", bmpFixture());
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 4, "the BMP width comes from the file header");
    assert.equal(shown.h, 3, "the BMP height comes from the file header");
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const pic = await decodePicture(page, bytes, "image/jpeg");
    assert.equal(pic.width, 4, "the JPEG keeps the bitmap width");
    assert.equal(pic.height, 3, "the JPEG keeps the bitmap height");
  });

  spec("gif-to-png", "reads a GIF and writes a PNG", async (page) => {
    await uploadBytes(page, "picture.gif", "image/gif", gifFixture());
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 2, "the GIF width comes from the logical screen descriptor");
    assert.equal(shown.h, 1, "the GIF height comes from the logical screen descriptor");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 2, "the PNG keeps the GIF width");
    assert.equal(pic.height, 1, "the PNG keeps the GIF height");
  });

  spec("jfif-to-jpg", "reads a JFIF picture and writes a JPEG", async (page) => {
    const jfif = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 12;
      canvas.height = 8;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(0, 0, 12, 8);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg"));
      const raw = new Uint8Array(await blob.arrayBuffer());
      const app0 = new Uint8Array([
        0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      ]);
      const out = new Uint8Array(raw.length + app0.length);
      out.set(raw.subarray(0, 2), 0);
      out.set(app0, 2);
      out.set(raw.subarray(2), 2 + app0.length);
      const file = new File([out], "photo.jpg", { type: "image/jpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    assert(jfif, "the JFIF picture should be handed to the file input");
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 12, "the JFIF width comes from the picture");
    assert.equal(shown.h, 8, "the JFIF height comes from the picture");
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
  });

  spec("ico-to-png", "reads an ICO icon and writes a PNG", async (page) => {
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(0, 0, 32, 32);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const png = new Uint8Array(await blob.arrayBuffer());
      const out = new Uint8Array(6 + 16 + png.length);
      out.set([0x00, 0x00, 0x01, 0x00, 0x01, 0x00], 0); // ICONDIR, one image
      out.set([32, 32, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00], 6); // 32x32 entry
      out.set(
        [
          png.length & 0xff,
          (png.length >> 8) & 0xff,
          (png.length >> 16) & 0xff,
          (png.length >>> 24) & 0xff,
          22,
          0,
          0,
          0,
        ],
        14,
      );
      out.set(png, 22);
      const file = new File([out], "icon.ico", { type: "image/x-icon" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 32, "the ICO width comes from the icon directory");
    assert.equal(shown.h, 32, "the ICO height comes from the icon directory");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 32, "the PNG keeps the icon width");
    assert.equal(pic.height, 32, "the PNG keeps the icon height");
  });

  spec("svg-to-png", "renders an SVG into a PNG", async (page) => {
    await uploadBytes(page, "logo.svg", "image/svg+xml", svgFixture());
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 40, "the SVG width comes from its own attributes");
    assert.equal(shown.h, 20, "the SVG height comes from its own attributes");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 40, "the PNG keeps the SVG width");
    assert.equal(pic.height, 20, "the PNG keeps the SVG height");
  });

  spec("svg-to-jpg", "renders an SVG into a JPEG", async (page) => {
    await uploadBytes(page, "logo.svg", "image/svg+xml", svgFixture());
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const pic = await decodePicture(page, bytes, "image/jpeg");
    assert.equal(pic.width, 40, "the JPEG keeps the SVG width");
    assert.equal(pic.height, 20, "the JPEG keeps the SVG height");
  });

  spec("avif-to-png", "writes a PNG for an AVIF source", async (page) => {
    await uploadBase64(page, "source.avif", "image/avif", AVIF_FIXTURE);
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 11, "the AVIF width comes from the picture");
    assert.equal(shown.h, 6, "the AVIF height comes from the picture");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 11, "the PNG keeps the AVIF width");
    assert.equal(pic.height, 6, "the PNG keeps the AVIF height");
  });

  spec("avif-to-jpg", "writes a JPEG for an AVIF source", async (page) => {
    await uploadBase64(page, "source.avif", "image/avif", AVIF_FIXTURE);
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const pic = await decodePicture(page, bytes, "image/jpeg");
    assert.equal(pic.width, 11, "the JPEG keeps the AVIF width");
    assert.equal(pic.height, 6, "the JPEG keeps the AVIF height");
  });

  /* ---- resize ---- */

  spec("image-resizer", "resizes a picture and keeps the aspect ratio", async (page) => {
    await uploadCanvasImage(page, {
      width: 120,
      height: 80,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    assert.equal(
      await page.locator('main input[type="number"]').nth(0).inputValue(),
      "120",
      "the width field shows the width of the uploaded picture",
    );
    assert.equal(
      await page.locator('main input[type="number"]').nth(1).inputValue(),
      "80",
      "the height field shows the height of the uploaded picture",
    );
    await fillNumber(page, 300, 0);
    assert.equal(
      await page.locator('main input[type="number"]').nth(1).inputValue(),
      "200",
      "120x80 is a 3:2 picture, so a width of 300 means a height of 200",
    );
    const caption = await workspace(page);
    assertMatches(caption, /300\s*×\s*200/, "the preview caption shows the new size");
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 300, "the exported picture is 300 pixels wide");
    assert.equal(pic.height, 200, "the exported picture is 200 pixels tall");
  });

  spec("photo-resizer", "resizes a photo to the requested pixel size", async (page) => {
    await uploadCanvasImage(page, {
      width: 60,
      height: 40,
      color: "#3366cc",
      mime: "image/jpeg",
      name: "photo.jpg",
    });
    await waitForPreview(page);
    await fillNumber(page, 150, 0);
    assert.equal(
      await page.locator('main input[type="number"]').nth(1).inputValue(),
      "100",
      "60x40 is a 3:2 photo, so a width of 150 means a height of 100",
    );
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 150, "the exported photo is 150 pixels wide");
    assert.equal(pic.height, 100, "the exported photo is 100 pixels tall");
  });

  spec("resize-png", "resizes a PNG and keeps the transparency", async (page) => {
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 20;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 40, 20);
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(0, 0, 20, 20);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "alpha.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitForPreview(page);
    await fillNumber(page, 80, 0);
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(pic.width, 80, "the exported PNG is 80 pixels wide");
    assert.equal(pic.height, 40, "the exported PNG is 40 pixels tall");
    assert.equal(
      pic.far[3],
      0,
      `the transparent half of the PNG must stay transparent, got alpha ${pic.far[3]}`,
    );
  });

  /* ---- filters ---- */

  spec("blur-image", "blurs the whole picture", async (page) => {
    await uploadCanvasImage(page, {
      width: 60,
      height: 60,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    await page.locator('main input[type="range"]').nth(1).fill("10");
    await sleep(600);
    const filter = await page.evaluate(() => {
      const img = document.querySelector('main img[src^="data:"]');
      return img ? getComputedStyle(img).filter : "";
    });
    assertMatches(filter, /blur\(10px\)/, "the preview applies the requested blur");
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(
      pic.center[3],
      255,
      "the middle of the blurred picture stays opaque",
    );
    assert(
      pic.corner[3] < 255,
      `the blurred edge must fade into the background, got alpha ${pic.corner[3]}`,
    );
  });

  spec("pixelate-image", "pixelates the picture with a mosaic of blocks", async (page) => {
    // A picture that changes in both directions: a mosaic has to flatten it
    // into blocks, and the blocks have to be as large as the chosen size.
    const source = await canvasPicture(page, 40, 40, "ramp");
    await uploadBytes(page, "source.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["pixel", "mosaic", "block size"], "pixel size");

    await setRange(page, 0, 8);
    const { bytes } = await downloadBuffer(page);
    const mosaic = await readPixels(page, bytes, "image/png");
    assert.equal(mosaic.width, 40, "the mosaic keeps the width of the picture");
    assert.equal(mosaic.height, 40, "the mosaic keeps the height of the picture");

    const sourcePicture = await readPixels(page, source, "image/png");
    assert.ok(
      colourCount(sourcePicture) > 100,
      `the fixture must have many colours, it has ${colourCount(sourcePicture)}`,
    );
    assert.ok(
      colourCount(mosaic) <= 25,
      `a mosaic of 8 pixel blocks of a 40x40 picture has at most 25 colours, it has ${colourCount(mosaic)}`,
    );

    // Every block of 8x8 pixels carries one single colour.
    for (let y = 0; y < 40; y += 1) {
      for (let x = 0; x < 40; x += 1) {
        const block = pixelAt(mosaic, x - (x % 8), y - (y % 8));
        const here = pixelAt(mosaic, x, y);
        assert.deepEqual(
          here,
          block,
          `the pixel ${x}/${y} does not carry the colour of its 8x8 block`,
        );
      }
    }

    // A bigger block size has to change the picture.
    await setRange(page, 0, 20);
    const bigger = await downloadBuffer(page);
    assert.notDeepEqual(
      Array.from(bigger.bytes),
      Array.from(bytes),
      "a mosaic of 20 pixel blocks must differ from a mosaic of 8 pixel blocks",
    );
  });

  spec("censor-image", "censors a region of the picture", async (page) => {
    // A picture of black and white columns: a mosaic has to mix them inside
    // the marked area and leave the rest of the picture alone.
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(
      page,
      ["rectangle", "ellipse", "brush", "bar", "censor"],
      "censor shape",
    );
    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    assert.equal(result.width, 40, "the censored picture keeps its width");
    assert.notDeepEqual(
      pixelAt(result, 16, 16),
      columnColour(16),
      "the censored area must not keep the colour of the source",
    );
    for (const [x, y] of [
      [2, 2],
      [36, 36],
      [16, 2],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the marked area and must not change`,
      );
    }
  });

  /* ---- background removal ---- */

  spec("background-remover", "removes the background of a photo", async (page) => {
    // A green frame around a blue field: the frame is the background and the
    // blue field is the subject that has to survive.
    const source = await canvasPicture(page, 40, 40, "frame");
    await uploadBytes(page, "subject.png", "image/png", source);
    await waitForPreview(page);
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(
      pic.corner[3],
      0,
      `the background must be transparent after the cut out, got alpha ${pic.corner[3]}`,
    );

    const picture = await readPixels(page, bytes, "image/png");
    assert.equal(picture.width, 40, "the cut out keeps the width of the source");
    let transparent = 0;
    for (let at = 3; at < picture.data.length; at += 4) {
      if (picture.data[at] === 0) transparent += 1;
    }
    assert.equal(
      transparent,
      40 * 40 - 32 * 32,
      `the green frame of 4 pixels must be the only transparent part, ${transparent} pixels are transparent`,
    );
    assert.deepEqual(
      pixelAt(picture, 20, 20),
      [0, 0, 255, 255],
      "the blue subject in the middle must keep its colour",
    );
  });

  spec("png-background-remover", "saves a PNG cut out with a transparent background", async (page) => {
    // A green frame around a blue field: the frame is the background and the
    // blue field is the subject that has to survive.
    const source = await canvasPicture(page, 40, 40, "frame");
    await uploadBytes(page, "subject.png", "image/png", source);
    await waitForPreview(page);
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(
      pic.corner[3],
      0,
      `the background must be transparent after the cut out, got alpha ${pic.corner[3]}`,
    );
    const picture = await readPixels(page, bytes, "image/png");
    let transparent = 0;
    for (let at = 3; at < picture.data.length; at += 4) {
      if (picture.data[at] === 0) transparent += 1;
    }
    assert.equal(
      transparent,
      40 * 40 - 32 * 32,
      `the green frame of 4 pixels must be the only transparent part, ${transparent} pixels are transparent`,
    );
    assert.deepEqual(
      pixelAt(picture, 20, 20),
      [0, 0, 255, 255],
      "the blue subject in the middle must keep its colour",
    );
  });

  spec("transparent-background-maker", "exports a picture with a transparent background", async (page) => {
    // A green frame around a blue field: the frame is the background and the
    // blue field is the subject that has to survive.
    const source = await canvasPicture(page, 40, 40, "frame");
    await uploadBytes(page, "subject.png", "image/png", source);
    await waitForPreview(page);
    const { bytes } = await downloadBuffer(page);
    const pic = await decodePicture(page, bytes, "image/png");
    assert.equal(
      pic.corner[3],
      0,
      `the exported background must be transparent, got alpha ${pic.corner[3]}`,
    );
    const picture = await readPixels(page, bytes, "image/png");
    let transparent = 0;
    for (let at = 3; at < picture.data.length; at += 4) {
      if (picture.data[at] === 0) transparent += 1;
    }
    assert.equal(
      transparent,
      40 * 40 - 32 * 32,
      `the green frame of 4 pixels must be the only transparent part, ${transparent} pixels are transparent`,
    );
    assert.deepEqual(
      pixelAt(picture, 20, 20),
      [0, 0, 255, 255],
      "the blue subject in the middle must keep its colour",
    );
  });

  /* ---- metadata ---- */

  spec("exif-remover", "strips the EXIF block out of the exported photo", async (page) => {
    // The photo that goes in really carries the Exif block.
    const photo = await photoWithExif(page);
    const values = readExifValues(photo);
    assert.equal(values[0x010f], "ToolPadCam", "the fixture must carry the camera make");
    await uploadBytes(page, "photo.jpg", "image/jpeg", photo);
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");

    const { bytes } = await downloadBuffer(page);
    const hasExif = bytes.includes(Buffer.from("Exif", "latin1"));
    assert(
      !hasExif,
      "the exported JPEG must not carry an EXIF APP1 segment any more",
    );
    assert.ok(
      !bytes.includes(Buffer.from("ToolPadCam", "latin1")),
      "the exported JPEG must not carry the camera make any more",
    );
    const picture = await readPixels(page, bytes, "image/jpeg");
    assert.equal(picture.width, 20, "the exported photo keeps the width of the source");
    assert.equal(picture.height, 20, "the exported photo keeps the height of the source");
  });

  spec("photo-metadata-remover", "strips the EXIF block out of the exported photo", async (page) => {
    const photo = await photoWithExif(page);
    assert.equal(
      readExifValues(photo)[0x0110],
      "TP-X1",
      "the fixture must carry the camera model",
    );
    await uploadBytes(page, "photo.jpg", "image/jpeg", photo);
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");

    const { bytes } = await downloadBuffer(page);
    assert(
      !bytes.includes(Buffer.from("Exif", "latin1")),
      "the exported JPEG must not carry an EXIF APP1 segment any more",
    );
    assert.ok(
      !bytes.includes(Buffer.from("TP-X1", "latin1")),
      "the exported JPEG must not carry the camera model any more",
    );
    const picture = await readPixels(page, bytes, "image/jpeg");
    assert.equal(picture.width, 20, "the exported photo keeps the width of the source");
  });

  spec("remove-photo-location", "removes the GPS data of the exported photo", async (page) => {
    const photo = await photoWithExif(page);
    assert.equal(
      readExifValues(photo)[0x0002],
      "52/1,30/1,0/1",
      "the fixture must carry the GPS latitude",
    );
    await uploadBytes(page, "photo.jpg", "image/jpeg", photo);
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");

    const { bytes } = await downloadBuffer(page);
    assert(
      !bytes.includes(Buffer.from("Exif", "latin1")),
      "the exported JPEG must not carry an EXIF APP1 segment with GPS data",
    );
    assert.ok(
      !bytes.includes(Buffer.from("52/1", "latin1")),
      "the exported JPEG must not carry the GPS latitude any more",
    );
    const picture = await readPixels(page, bytes, "image/jpeg");
    assert.equal(picture.width, 20, "the exported photo keeps the width of the source");
  });

  spec("exif-viewer", "shows the EXIF data of the photo", async (page) => {
    // A photo that really carries the Exif block the spec builds.
    const plain = await canvasPicture(page, 20, 20, "solid", "image/jpeg");
    const photo = jpegWithExif(
      plain,
      exifApp1({
        make: "ToolPadCam",
        model: "TP-X1",
        dateTime: "2021:03:04 05:06:07",
        software: "ToolPad Spec",
        artist: "ToolPad Tester",
        gps: {
          latRef: "N",
          lat: [
            [52, 1],
            [30, 1],
            [0, 1],
          ],
          lonRef: "E",
          lon: [
            [13, 1],
            [24, 1],
            [0, 1],
          ],
        },
      }),
    );
    const values = readExifValues(photo);
    assert.equal(values[0x010f], "ToolPadCam", "the fixture must carry the camera make");
    assert.equal(values[0x0110], "TP-X1", "the fixture must carry the camera model");
    assert.equal(
      values[0x0132],
      "2021:03:04 05:06:07",
      "the fixture must carry the date and time",
    );
    assert.equal(values[0x0002], "52/1,30/1,0/1", "the fixture must carry the GPS latitude");

    await uploadBytes(page, "photo.jpg", "image/jpeg", photo);
    await waitForPreview(page);
    await requireControl(page, ["exif", "camera", "gps", "metadata"], "EXIF reader");
    const text = await workspace(page);
    assertIncludes(text, "ToolPadCam", "the tool must show the camera make of the file");
    assertIncludes(text, "TP-X1", "the tool must show the camera model of the file");
    assertIncludes(
      text,
      "2021:03:04 05:06:07",
      "the tool must show the date and time of the file",
    );
    assertIncludes(text, "ToolPad Spec", "the tool must show the software of the file");
    assertIncludes(text, "ToolPad Tester", "the tool must show the author of the file");
    assertIncludes(text, "52/1, 30/1, 0/1", "the tool must show the GPS position of the file");
    const gps = await dataValue(page, "GPS position");
    assert.ok(
      gps && gps !== "not present",
      `the tool must report the GPS position of the file, it shows ${JSON.stringify(gps)}`,
    );
  });

  spec("image-metadata-viewer", "shows the metadata of the picture", async (page) => {
    // A PNG that really carries two text chunks.
    const plain = await canvasPicture(page, 20, 20, "solid");
    const tagged = pngWithText(
      pngWithText(plain, "Software", "ToolPad PNG Tag"),
      "Comment",
      "ToolPad comment",
    );
    const values = readPngText(tagged);
    assert.equal(values.Software, "ToolPad PNG Tag", "the fixture must carry the software tag");
    assert.equal(values.Comment, "ToolPad comment", "the fixture must carry the comment tag");

    await uploadBytes(page, "tagged.png", "image/png", tagged);
    await waitForPreview(page);
    await requireControl(page, ["metadata", "author", "comment", "exif"], "metadata reader");
    assert.equal(
      await dataValue(page, "Software"),
      "ToolPad PNG Tag",
      "the tool must show the software text chunk of the file",
    );
    assert.equal(
      await dataValue(page, "Comment"),
      "ToolPad comment",
      "the tool must show the comment text chunk of the file",
    );
    assert.equal(
      await dataValue(page, "Camera"),
      "not present",
      "a file without Exif data must report the camera as missing",
    );
  });

  spec("photo-metadata-viewer", "shows the EXIF data of the photo", async (page) => {
    const plain = await canvasPicture(page, 20, 20, "solid", "image/jpeg");
    const photo = jpegWithExif(
      plain,
      exifApp1({
        make: "ToolPadCam",
        model: "TP-X1",
        dateTime: "2021:03:04 05:06:07",
        software: "ToolPad Spec",
      }),
    );
    await uploadBytes(page, "photo.jpg", "image/jpeg", photo);
    await waitForPreview(page);
    await requireControl(page, ["exif", "camera", "gps", "metadata"], "EXIF reader");
    const text = await workspace(page);
    assertIncludes(text, "ToolPadCam", "the tool must show the camera make of the file");
    assertIncludes(text, "TP-X1", "the tool must show the camera model of the file");
    assertIncludes(
      text,
      "2021:03:04 05:06:07",
      "the tool must show the date and time of the file",
    );
    assertIncludes(text, "ToolPad Spec", "the tool must show the software of the file");
  });

  /* ---- formats the browser cannot open ---- */

  spec("psd-to-png", "opens a Photoshop document and writes a PNG", async (page) => {
    await uploadBytes(page, "artwork.psd", "image/vnd.adobe.photoshop", psdFixture());
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 4, "the PSD width comes from the file header");
    assert.equal(shown.h, 4, "the PSD height comes from the file header");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const size = pngSize(bytes);
    assert.equal(size.width, 4, "the PNG keeps the width of the document");
    assert.equal(size.height, 4, "the PNG keeps the height of the document");

    // The fixture carries a black image, so every pixel of the PNG is black.
    const picture = await readPixels(page, bytes, "image/png");
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        assert.deepEqual(
          pixelAt(picture, x, y),
          [0, 0, 0, 255],
          `the pixel ${x}/${y} of the document must be black`,
        );
      }
    }
  });

  spec("psd-to-jpg", "opens a Photoshop document and writes a JPEG", async (page) => {
    await uploadBytes(page, "artwork.psd", "image/vnd.adobe.photoshop", psdFixture());
    await waitForPreview(page);
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const picture = await readPixels(page, bytes, "image/jpeg");
    assert.equal(picture.width, 4, "the JPEG keeps the width of the document");
    assert.equal(picture.height, 4, "the JPEG keeps the height of the document");
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const [r, g, b] = pixelAt(picture, x, y);
        assert.ok(
          r <= 4 && g <= 4 && b <= 4,
          `the pixel ${x}/${y} of the document must stay black, it is ${r}/${g}/${b}`,
        );
      }
    }
  });

  spec(
    "heic-to-jpg-converter",
    "reports that this browser cannot decode a HEIC photo and exports no picture",
    async (page) => {
      await uploadBytes(page, "iphone.heic", "image/heic", heicFixture());

      // The brand of the container is read out of the file.
      const text = await waitForWorkspaceText(page, "mif1");
      assertIncludes(text, "heic", "the tool must show the brand of the HEIC container");
      assertIncludes(
        text,
        "mif1",
        "the tool must show the compatible brands of the HEIC container",
      );

      // The tool has to say plainly that no JPEG can be produced here.
      assertMatches(
        text,
        /cannot decode HEIC/i,
        "the tool must say that this browser cannot decode HEIC",
      );
      assertMatches(
        text,
        /no JPEG can be produced/i,
        "the tool must say that no JPEG can be produced here",
      );
      assertMatches(
        text,
        /JPG first/i,
        "the tool must point at converting the photo to JPG first",
      );

      // The notice must not be handed out as a photo.
      const offered = await page.evaluate(() => ({
        buttons: Array.from(document.querySelectorAll("main button")).map((button) => ({
          label: (button.textContent || "").trim(),
          disabled: button.disabled,
        })),
        pictures: document.querySelectorAll('main img[src^="data:"]').length,
      }));
      const downloads = offered.buttons.filter((button) =>
        /download/i.test(button.label),
      );
      assert.ok(
        downloads.length === 0 || downloads.every((button) => button.disabled),
        `the tool must not offer a download of the notice, it offers ${JSON.stringify(downloads)}`,
      );
      assert.equal(
        offered.pictures,
        0,
        "the tool must not show the notice as a picture",
      );
    },
  );

  spec("tiff-to-jpg", "decodes a TIFF scan and writes a JPEG", async (page) => {
    await uploadBytes(page, "scan.tif", "image/tiff", tiffFixture());
    const shown = await waitForPreview(page);
    assert.equal(shown.w, 4, "the TIFF width comes from the file header");
    assert.equal(shown.h, 3, "the TIFF height comes from the file header");
    await selectOption(page, "image/jpeg");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 3)),
      [0xff, 0xd8, 0xff],
      "a JPEG file starts with the SOI marker",
    );
    const picture = await readPixels(page, bytes, "image/jpeg");
    assert.equal(picture.width, 4, "the JPEG keeps the width of the scan");
    assert.equal(picture.height, 3, "the JPEG keeps the height of the scan");

    // The fixture carries the colour 0x3366cc, so the scan has to keep it.
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const [r, g, b] = pixelAt(picture, x, y);
        assert.ok(
          Math.abs(r - 0x33) <= 12 &&
            Math.abs(g - 0x66) <= 12 &&
            Math.abs(b - 0xcc) <= 12,
          `the pixel ${x}/${y} must keep the colour of the scan, it is ${r}/${g}/${b}`,
        );
      }
    }
  });

  spec("ai-to-png", "opens an Adobe Illustrator file and writes a PNG", async (page) => {
    await uploadBytes(page, "artwork.ai", "application/illustrator", pdfFixture());
    const shown = await waitForPreview(page);
    assert.ok(shown.w > 0, "the artwork should be rendered at its own size");
    await selectOption(page, "image/png");
    const { bytes } = await downloadBuffer(page);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const size = pngSize(bytes);
    // The page of the fixture measures 200 by 100 points.
    assert.equal(
      size.width / size.height,
      2,
      `the picture must have the 2:1 shape of the page, it is ${size.width}x${size.height}`,
    );

    // The page of the fixture carries a line of text, so the picture has ink.
    const picture = await readPixels(page, bytes, "image/png");
    let ink = 0;
    for (let y = 0; y < size.height; y += 1) {
      for (let x = 0; x < size.width; x += 1) {
        const [r, g, b] = pixelAt(picture, x, y);
        if (r < 200 || g < 200 || b < 200) ink += 1;
      }
    }
    assert.ok(ink > 20, `the picture of the page must carry the text, it has ${ink} dark pixels`);
  });

  /* ---- ICO output the tool cannot produce ---- */

  spec("jpg-to-ico", "packs the JPG into an ICO icon", async (page) => {
    await uploadCanvasImage(page, {
      width: 32,
      height: 32,
      color: "#3366cc",
      mime: "image/jpeg",
      name: "source.jpg",
    });
    await waitForPreview(page);
    await requireControl(page, ["ico"], "ICO target format");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.ico$/, `the download should be named .ico, got ${name}`);
    const icon = icoPictures(bytes);
    assert.equal(icon.count, 3, "the icon carries the three sizes the tool offers");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48],
      "the icon carries the sizes 16, 32 and 48",
    );
    for (const picture of icon.pictures) {
      assert.equal(
        picture.width,
        picture.size,
        `the picture ${picture.size} is ${picture.width} pixels wide`,
      );
      assert.equal(
        picture.height,
        picture.size,
        `the picture ${picture.size} is ${picture.height} pixels high`,
      );
    }
  });

  spec("png-to-ico", "packs the PNG into an ICO icon", async (page) => {
    await uploadCanvasImage(page, {
      width: 32,
      height: 32,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    await requireControl(page, ["ico"], "ICO target format");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.ico$/, `the download should be named .ico, got ${name}`);
    const icon = icoPictures(bytes);
    assert.equal(icon.count, 3, "the icon carries the three sizes the tool offers");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48],
      "the icon carries the sizes 16, 32 and 48",
    );
    for (const picture of icon.pictures) {
      assert.equal(picture.kind, "png", "the icon carries PNG pictures by default");
      assert.equal(
        picture.width,
        picture.size,
        `the picture ${picture.size} is ${picture.width} pixels wide`,
      );
      assert.equal(
        picture.height,
        picture.size,
        `the picture ${picture.size} is ${picture.height} pixels high`,
      );
    }
  });

  spec("svg-to-ico", "packs the SVG into an ICO icon", async (page) => {
    await uploadBytes(page, "logo.svg", "image/svg+xml", svgFixture());
    await waitForPreview(page);
    await requireControl(page, ["ico"], "ICO target format");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.ico$/, `the download should be named .ico, got ${name}`);
    const icon = icoPictures(bytes);
    assert.equal(icon.count, 3, "the icon carries the three sizes the tool offers");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48],
      "the icon carries the sizes 16, 32 and 48",
    );
    for (const picture of icon.pictures) {
      assert.equal(
        picture.width,
        picture.size,
        `the picture ${picture.size} is ${picture.width} pixels wide`,
      );
    }
  });

  spec("webp-to-ico", "packs the WebP into an ICO icon", async (page) => {
    await uploadCanvasImage(page, {
      width: 32,
      height: 32,
      color: "#3366cc",
      mime: "image/webp",
      name: "source.webp",
    });
    await waitForPreview(page);
    await requireControl(page, ["ico"], "ICO target format");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.ico$/, `the download should be named .ico, got ${name}`);
    const icon = icoPictures(bytes);
    assert.equal(icon.count, 3, "the icon carries the three sizes the tool offers");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48],
      "the icon carries the sizes 16, 32 and 48",
    );
  });

  spec("ico-converter", "converts a picture into a multi size ICO icon", async (page) => {
    await uploadCanvasImage(page, {
      width: 32,
      height: 32,
      color: "#3366cc",
      mime: "image/png",
      name: "source.png",
    });
    await waitForPreview(page);
    await requireControl(page, ["ico"], "ICO target format");

    const first = await downloadBuffer(page);
    const icon = icoPictures(first.bytes);
    assert.equal(icon.count, 3, "the icon carries the three sizes the tool offers");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48],
      "the icon carries the sizes 16, 32 and 48",
    );

    // A fourth size has to show up in the directory of the icon.
    await clickButton(page, "64");
    const second = await downloadBuffer(page);
    const bigger = icoPictures(second.bytes);
    assert.equal(bigger.count, 4, "the icon carries four sizes after 64 was chosen");
    assert.deepEqual(
      bigger.pictures.map((picture) => picture.size),
      [16, 32, 48, 64],
      "the icon carries the sizes 16, 32, 48 and 64",
    );
    const big = bigger.pictures[3];
    assert.equal(big.width, 64, "the picture of 64 is 64 pixels wide");
    assert.equal(big.height, 64, "the picture of 64 is 64 pixels high");
  });

  /* ---- animated and video formats ---- */

  spec("gif-to-mp4", "records an animated GIF into a real MP4 video", async (page) => {
    await uploadBytes(
      page,
      "picture.gif",
      "image/gif",
      animatedGifFixture([400, 600]),
    );
    await waitForPreview(page);

    // The tool reads the timing of the animation out of the file itself.
    const text = await workspace(page);
    assertMatches(
      text,
      /2 frames/i,
      "the tool must state the number of frames of the source",
    );
    assertMatches(
      text,
      /1\.0 seconds/i,
      "the tool must state the length of the source",
    );

    // A browser that cannot record MP4 must say so and offer no file at all.
    const canRecord = await page.evaluate(() => {
      if (typeof MediaRecorder === "undefined") return false;
      return [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
      ].some((type) => MediaRecorder.isTypeSupported(type));
    });
    if (!canRecord) {
      assertMatches(
        text,
        /cannot record MP4/i,
        "the tool must say that this browser cannot record MP4",
      );
      const offered = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main button"))
          .filter((button) => !button.disabled)
          .map((button) => (button.textContent || "").trim()),
      );
      assert.ok(
        !offered.some((label) => /mp4/i.test(label)),
        `the tool must not offer an MP4 download, it offers ${JSON.stringify(offered)}`,
      );
      return;
    }

    // The first slider is the frame rate of the recording.
    await setRange(page, 0, 15);
    const { bytes, name } = await downloadFrom(page, "Download MP4", 60000);
    assert.match(name, /\.mp4$/, `the download should be named .mp4, got ${name}`);
    assert.equal(
      bytes.subarray(4, 8).toString("latin1"),
      "ftyp",
      "an MP4 file carries an ftyp box at offset 4",
    );

    // A real MP4 carries the movie box; the hand made file of before did not.
    const boxes = mp4Structure(bytes);
    const types = boxes.map((box) => box.type);
    assert.ok(types.includes("ftyp"), `the file must carry an ftyp box, it has ${types.join(", ")}`);
    assert.ok(types.includes("moov"), `the file must carry a moov box, it has ${types.join(", ")}`);
    assert.ok(
      types.includes("mdat") || types.includes("moof"),
      `the file must carry the picture data, it has ${types.join(", ")}`,
    );

    // The file must play: the browser has to read it as a video.
    const played = await page.evaluate(async (url) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = url;
      const ready = await new Promise((resolve) => {
        video.onloadeddata = () => resolve(true);
        video.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 20000);
      });
      if (!ready) return null;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      const sample = async (time) => {
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = time;
          setTimeout(resolve, 5000);
        });
        ctx.drawImage(video, 0, 0);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return [data[0], data[1], data[2]];
      };
      return {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        // The animation shows a black picture first and a white one after.
        first: await sample(0.05),
        later: await sample(0.8),
      };
    }, `data:video/mp4;base64,${bytes.toString("base64")}`);
    assert.ok(played, "the recorded MP4 must be readable as a video");
    assert.equal(played.width, 32, "the video keeps the width of the animation");
    assert.equal(played.height, 32, "the video keeps the height of the animation");
    assert.ok(played.duration > 0, "the video must have a length");
    assert.ok(
      played.duration < 5,
      `the video must be as long as the animation, it is ${played.duration} seconds long`,
    );
    assert.deepEqual(
      played.first,
      [0, 0, 0],
      `the video must start with the first picture of the animation, it shows ${played.first.join("/")}`,
    );
    assert.deepEqual(
      played.later,
      [255, 255, 255],
      `the video must show the second picture of the animation, it shows ${played.later.join("/")}`,
    );

    // The tool shows the sizes it measured, so no size claim is made up.
    const after = await workspace(page);
    assertMatches(
      after,
      /GIF\s+[\d.,]+\s*(B|KB|MB)/i,
      "the tool must show the measured size of the GIF",
    );
    assertMatches(
      after,
      /MP4\s+[\d.,]+\s*(B|KB|MB)/i,
      "the tool must show the measured size of the MP4",
    );

    // The GIF export keeps the frames and the timing of the source.
    const gif = await downloadFrom(page, "Download GIF instead");
    const animation = gifStructure(gif.bytes);
    assert.equal(
      animation.frames.length,
      2,
      `the GIF carries the two frames of the source, it has ${animation.frames.length}`,
    );
    assert.deepEqual(
      animation.frames.map((frame) => frame.delay),
      [40, 60],
      "the GIF keeps the delays of the source",
    );
  });

  spec(
    "webp-to-gif",
    "converts a WebP picture into a GIF animation and keeps the timing of an animated WebP",
    async (page) => {
      // --- a still WebP ---
      await uploadCanvasImage(page, {
        width: 16,
        height: 16,
        color: "#3366cc",
        mime: "image/webp",
        name: "source.webp",
      });
      await waitForPreview(page);
      await setRange(page, 0, 3);
      await setRange(page, 1, 200);
      const { bytes, name } = await downloadFrom(page, "Download GIF");
      assert.equal(
        bytes.subarray(0, 3).toString("latin1"),
        "GIF",
        "a GIF file starts with the GIF87a or GIF89a signature",
      );
      assert.match(name, /\.gif$/, `the download should be named .gif, got ${name}`);

      const gif = gifStructure(bytes);
      assert.equal(gif.signature, "GIF89a", "the animation is written as GIF89a");
      assert.equal(gif.width, 16, "the animation keeps the width of the source");
      assert.equal(gif.height, 16, "the animation keeps the height of the source");
      assert.equal(gif.frames.length, 3, `the animation has three frames, it has ${gif.frames.length}`);
      for (const frame of gif.frames) {
        assert.equal(frame.width, 16, "every frame is as wide as the source");
        assert.equal(frame.height, 16, "every frame is as high as the source");
        // A GIF stores the delay in hundredths of a second.
        assert.equal(frame.delay, 20, `a delay of 200 ms is 20 hundredths, the frame has ${frame.delay}`);
      }
      assert.equal(gif.loop, 0, "the animation repeats itself for ever");

      // The still picture can also be written as a PNG and as a JPG.
      const png = await downloadFrom(page, "Download PNG");
      assert.equal(
        png.bytes.subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
        "a PNG file starts with the PNG signature",
      );
      assert.equal(
        png.bytes.readUInt32BE(16),
        16,
        "the PNG keeps the width of the source",
      );
      assert.equal(
        png.bytes.readUInt32BE(20),
        16,
        "the PNG keeps the height of the source",
      );
      const pngPicture = await readPixels(page, png.bytes, "image/png");
      const [red, green, blue] = pixelAt(pngPicture, 8, 8);
      assert.ok(
        Math.abs(red - 0x33) <= 12 &&
          Math.abs(green - 0x66) <= 12 &&
          Math.abs(blue - 0xcc) <= 12,
        `the PNG keeps the colour of the source, it has ${red}/${green}/${blue}`,
      );

      const jpg = await downloadFrom(page, "Download JPG");
      assert.deepEqual(
        Array.from(jpg.bytes.subarray(0, 3)),
        [0xff, 0xd8, 0xff],
        "a JPEG file starts with the SOI marker",
      );
      const jpgPicture = await readPixels(page, jpg.bytes, "image/jpeg");
      assert.equal(jpgPicture.width, 16, "the JPG keeps the width of the source");
      assert.equal(jpgPicture.height, 16, "the JPG keeps the height of the source");
      const [jpgRed, jpgGreen, jpgBlue] = pixelAt(jpgPicture, 8, 8);
      assert.ok(
        Math.abs(jpgRed - 0x33) <= 12 &&
          Math.abs(jpgGreen - 0x66) <= 12 &&
          Math.abs(jpgBlue - 0xcc) <= 12,
        `the JPG keeps the colour of the source, it has ${jpgRed}/${jpgGreen}/${jpgBlue}`,
      );

      // --- an animated WebP ---
      const colours = [
        [0x33, 0x66, 0xcc],
        [0xcc, 0x33, 0x66],
        [0x33, 0xcc, 0x66],
      ];
      const stills = [];
      for (const colour of colours) {
        const still = await page.evaluate(async (rgb) => {
          const canvas = document.createElement("canvas");
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          ctx.fillRect(0, 0, 16, 16);
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.95),
          );
          return Array.from(new Uint8Array(await blob.arrayBuffer()));
        }, colour);
        stills.push(Buffer.from(still));
      }
      await clickButton(page, "New picture");
      await uploadBytes(
        page,
        "animated.webp",
        "image/webp",
        animatedWebpFixture(stills, [80, 140, 260], 16, 16),
      );
      await waitForPreview(page);

      const text = await workspace(page);
      assertMatches(
        text,
        /3 frames/i,
        "the tool must state the number of frames of the animated WebP",
      );

      // The GIF keeps the delays of the source instead of one delay for all.
      const animated = await downloadFrom(page, "Download GIF");
      const animatedGif = gifStructure(animated.bytes);
      assert.equal(
        animatedGif.frames.length,
        3,
        `the GIF carries the three frames of the source, it has ${animatedGif.frames.length}`,
      );
      assert.deepEqual(
        animatedGif.frames.map((frame) => frame.delay),
        [8, 14, 26],
        "the GIF keeps the delays of the source",
      );

      // The frames of the GIF hold the pictures of the source, when the
      // browser can read the frames of an animation.
      const gifColours = await animationColours(page, animated.bytes);
      if (gifColours) {
        assert.equal(
          gifColours.length,
          3,
          `the GIF holds three frames, it holds ${gifColours.length}`,
        );
        gifColours.forEach((colour, index) => {
          const wanted = colours[index];
          assert.ok(
            Math.abs(colour[0] - wanted[0]) <= 12 &&
              Math.abs(colour[1] - wanted[1]) <= 12 &&
              Math.abs(colour[2] - wanted[2]) <= 12,
            `the frame ${index} must hold the picture of the source, it holds ${colour.join("/")}`,
          );
        });
      }

      // The PNG and the JPG name the frame they hold.
      assertMatches(
        text,
        /first frame/i,
        "the tool must name the frame the PNG and the JPG hold",
      );
      const firstFrame = await downloadFrom(page, "Download PNG (first frame)");
      assert.equal(
        firstFrame.bytes.subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
        "a PNG file starts with the PNG signature",
      );
      assert.equal(
        firstFrame.bytes.readUInt32BE(16),
        16,
        "the PNG of the first frame keeps the width of the source",
      );
    },
  );

  spec("video-to-gif", "converts a video clip into a GIF animation", async (page) => {
    const accepts = await page.evaluate(() => {
      const input = document.querySelector("main input[type=file]");
      return input ? input.getAttribute("accept") || "" : "";
    });
    assert(
      /video/i.test(accepts),
      `the tool must accept a video file, its file input accepts ${JSON.stringify(accepts)}`,
    );

    // A real clip: the browser records a canvas into a WebM file.
    const clip = await recordClip(page, 32, 32, 24);
    assert.ok(clip.length > 1000, "the browser must be able to record a short clip");
    await uploadBytes(page, "clip.webm", "video/webm", clip);
    // The tool shows the clip in a video element, not in a picture.
    await page.waitForSelector("main video", { state: "attached", timeout: 20000 });
    const shown = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const video = document.querySelector("main video");
          if (!video) {
            resolve(false);
            return;
          }
          if (video.readyState >= 1) {
            resolve(video.videoWidth > 0);
            return;
          }
          video.onloadeddata = () => resolve(video.videoWidth > 0);
          video.onerror = () => resolve(false);
          setTimeout(() => resolve(video.videoWidth > 0), 10000);
        }),
    );
    assert.ok(shown, "the tool must show the recorded clip in the video element");

    // The clip must be previewable: the video element offers the playback
    // controls and the playhead can be moved before the export.
    const preview = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const video = document.querySelector("main video");
          if (!video) {
            resolve(null);
            return;
          }
          const target = Math.min(0.4, (video.duration || 1) / 2);
          const done = () =>
            resolve({
              controls: video.controls,
              currentTime: video.currentTime,
              target,
              width: video.videoWidth,
            });
          video.onseeked = done;
          video.onerror = () => resolve(null);
          try {
            video.currentTime = target;
          } catch {
            resolve(null);
          }
          setTimeout(done, 8000);
        }),
    );
    assert.ok(preview, "the clip must be previewable in the video element");
    assert.ok(
      preview.controls,
      "the video element must offer the playback controls",
    );
    assert.ok(
      Math.abs(preview.currentTime - preview.target) < 0.5,
      `the playhead must move, it stands at ${preview.currentTime} instead of ${preview.target}`,
    );

    // The workspace offers the frame count, the frame rate, the trim range
    // and the output width.
    const controls = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return null;
      return {
        ranges: main.querySelectorAll('input[type="range"]').length,
        numbers: main.querySelectorAll('input[type="number"]').length,
        labels: Array.from(main.querySelectorAll("span,label")).map((n) =>
          (n.textContent || "").trim(),
        ),
      };
    });
    assert.ok(controls, "the workspace must be readable");
    assert.ok(
      controls.ranges >= 4,
      `the tool offers a frame count, a frame rate and two trim markers, it has ${controls.ranges} sliders`,
    );
    assert.ok(
      controls.numbers >= 1,
      `the tool offers an output width, it has ${controls.numbers} number fields`,
    );
    const controlText = controls.labels.join(" ");
    assertMatches(controlText, /rate/i, "the tool names the frame rate");
    assertMatches(controlText, /trim/i, "the tool names the trim range");
    assertMatches(controlText, /width/i, "the tool names the output width");

    await setRange(page, 0, 3);
    await setRange(page, 1, 10);
    const { bytes, name } = await downloadBuffer(page);
    assert.equal(
      bytes.subarray(0, 3).toString("latin1"),
      "GIF",
      "a GIF file starts with the GIF87a or GIF89a signature",
    );
    assert.match(name, /\.gif$/, `the download should be named .gif, got ${name}`);

    const gif = gifStructure(bytes);
    assert.equal(gif.signature, "GIF89a", "the animation is written as GIF89a");
    assert.equal(gif.frames.length, 3, `the animation has three frames, it has ${gif.frames.length}`);
    for (const frame of gif.frames) {
      // A GIF stores the delay in hundredths of a second.
      assert.equal(frame.delay, 10, `a delay of 100 ms is 10 hundredths, the frame has ${frame.delay}`);
    }
    assert.equal(gif.width, 32, `the GIF keeps the width of the clip, it has ${gif.width}`);

    // A narrower output width is honoured: the frames are scaled down.
    await page.evaluate(() => {
      const input = document.querySelector('main input[type="number"]');
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "16");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await sleep(200);
    const scaled = await downloadBuffer(page);
    const scaledGif = gifStructure(scaled.bytes);
    assert.equal(
      scaledGif.width,
      16,
      `the GIF uses the chosen output width, it is ${scaledGif.width} pixels wide`,
    );
  });

  /* ---- tools that need a feature the engine does not have ---- */

  spec("blur-face", "blurs the faces it finds in the photo", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["face", "detect"], "face detection");
    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(result, 16, 16),
      columnColour(16),
      "the blurred area must not keep the colour of the source",
    );
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the blurred area and must not change`,
      );
    }
  });

  spec("censor-face", "censors the faces it finds in the photo", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["face", "detect"], "face detection");
    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(result, 16, 16),
      columnColour(16),
      "the censored area must not keep the colour of the source",
    );
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the censored area and must not change`,
      );
    }
  });

  spec("face-pixelator", "pixelates the faces it finds in the photo", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["face", "detect"], "face detection");
    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(result, 16, 16),
      columnColour(16),
      "the pixelated area must not keep the colour of the source",
    );
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the pixelated area and must not change`,
      );
    }
  });

  spec("blur-text-in-image", "blurs a text region of the screenshot", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["region", "brush", "rectangle", "area"], "region selection");

    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(result, 16, 16),
      columnColour(16),
      "the blurred text must not keep the colour of the source",
    );
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the blurred area and must not change`,
      );
    }
  });

  spec("remove-text-from-image", "brushes over the text to remove it", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["brush", "erase", "paint"], "brush tool");

    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");

    // The removed area is covered with one single colour.
    const first = pixelAt(result, 8, 8);
    for (let y = 8; y < 24; y += 1) {
      for (let x = 8; x < 24; x += 1) {
        assert.deepEqual(
          pixelAt(result, x, y),
          first,
          `the pixel ${x}/${y} of the removed area does not carry the same colour`,
        );
      }
    }
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the removed area and must not change`,
      );
    }
  });

  spec("remove-object-from-photo", "brushes over the object to remove it", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["brush", "erase", "paint", "object"], "brush tool");

    await selectOption(page, "rect");
    await fillNumber(page, 8, 0);
    await fillNumber(page, 8, 1);
    await fillNumber(page, 16, 2);
    await fillNumber(page, 16, 3);
    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");

    const first = pixelAt(result, 8, 8);
    for (let y = 8; y < 24; y += 1) {
      for (let x = 8; x < 24; x += 1) {
        assert.deepEqual(
          pixelAt(result, x, y),
          first,
          `the pixel ${x}/${y} of the removed area does not carry the same colour`,
        );
      }
    }
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the removed area and must not change`,
      );
    }
  });

  spec("magic-eraser", "erases the object the user brushes over", async (page) => {
    const source = await canvasPicture(page, 40, 40, "columns");
    await uploadBytes(page, "columns.png", "image/png", source);
    await waitForPreview(page);
    await requireControl(page, ["brush", "erase", "paint", "eraser"], "brush tool");

    // The magic eraser only offers the brush, so the spec paints with the
    // mouse on the canvas of the tool.  The tool draws the picture into the
    // top left corner of its canvas, so the stroke has to start there.
    const canvas = page.locator("main canvas").first();
    const box = await canvas.boundingBox();
    assert.ok(box, "the tool must show the picture on a canvas to paint on");
    const size = await page.evaluate(() => {
      const element = document.querySelector("main canvas");
      return element ? { w: element.width, h: element.height } : null;
    });
    assert.ok(size, "the tool must show the picture on a canvas to paint on");
    const scale = box.width / size.w;
    await page.mouse.move(box.x + 20 * scale, box.y + 20 * scale);
    await page.mouse.down();
    await page.mouse.move(box.x + 26 * scale, box.y + 20 * scale, { steps: 6 });
    await page.mouse.up();
    await sleep(500);

    const { bytes } = await downloadBuffer(page);
    const result = await readPixels(page, bytes, "image/png");
    const centre = pixelAt(result, 20, 20);
    assert.notDeepEqual(
      centre,
      columnColour(20),
      "the erased area must not keep the colour of the source",
    );
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      assert.deepEqual(
        pixelAt(result, 20 + dx, 20 + dy),
        centre,
        "the erased area around the brush stroke must carry one single colour",
      );
    }
    for (const [x, y] of [
      [2, 2],
      [36, 36],
    ]) {
      assert.deepEqual(
        pixelAt(result, x, y),
        columnColour(x),
        `the pixel ${x}/${y} lies outside the brush stroke and must not change`,
      );
    }
  });

  spec("instagram-image-splitter", "splits a picture into a 3x3 grid of tiles", async (page) => {
    await splitPhotoIntoTiles(page);
  });

  spec("instagram-grid-maker", "cuts a photo into a grid for Instagram", async (page) => {
    await splitPhotoIntoTiles(page);
  });

  spec("instagram-photo-splitter", "divides a photo into coordinated tiles", async (page) => {
    await splitPhotoIntoTiles(page);
  });

  spec("instagram-fonts", "lists the fonts Instagram accepts", async (page) => {
    await requireControl(page, ["font", "instagram"], "font list");

    const fonts = await page.evaluate(() => {
      const select = document.querySelector("main select");
      if (!select) return [];
      return Array.from(select.options).map((option) => ({
        name: option.textContent || "",
        value: option.value || "",
      }));
    });
    assert.equal(fonts.length, 8, `the list must offer eight fonts, it offers ${fonts.length}`);
    const families = fonts.map((font) => font.value);
    for (const family of ["Georgia", "Arial", "Courier New", "Impact"]) {
      assert.ok(
        families.some((value) => value.includes(family)),
        `the list must offer a font of ${family}, it offers ${families.join(", ")}`,
      );
    }

    // The preview has to use the font that was chosen.
    const previewFont = () =>
      page.evaluate(() => {
        const holder = Array.from(
          document.querySelectorAll("main div[style*='font-family']"),
        ).find((element) => (element.textContent || "").includes("Save the date"));
        return holder ? getComputedStyle(holder).fontFamily : "";
      });
    const before = await previewFont();
    await selectOption(page, "Impact, 'Arial Black', sans-serif");
    const after = await previewFont();
    assert.ok(
      after.includes("Impact"),
      `the preview must use the chosen font, it uses ${after}`,
    );
    assert.notEqual(before, after, "the preview must change with the font");
  });

  spec("quote-maker", "builds a quote card from the typed text", async (page) => {
    await typeText(page, "Hello world");
    await requireControl(page, ["quote", "attribution", "author", "font"], "quote editor");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const size = pngSize(bytes);
    assert.equal(size.width, 1080, "the quote card is 1080 pixels wide");
    assert.equal(size.height, 1080, "the quote card is 1080 pixels high");
    const card = await readPixels(page, bytes, "image/png");
    assert.deepEqual(
      pixelAt(card, 5, 5),
      [15, 23, 42, 255],
      "the card of the template midnight starts with the dark background",
    );
    assert.deepEqual(
      pixelAt(card, 100, 155),
      [56, 189, 248, 255],
      "the card of the template midnight carries the blue rule",
    );

    // The quote has to be written on the card.
    let ink = 0;
    for (let y = 240; y < 340; y += 1) {
      for (let x = 90; x < 990; x += 1) {
        const [r, g, b] = pixelAt(card, x, y);
        if (r > 180 && g > 180 && b > 180) ink += 1;
      }
    }
    assert.ok(ink > 50, `the quote must be written on the card, it has ${ink} light pixels`);

    // Another template has to change the card.
    await selectOption(page, "paper");
    const other = await downloadBuffer(page);
    const paper = await readPixels(page, other.bytes, "image/png");
    assert.deepEqual(
      pixelAt(paper, 5, 5),
      [248, 245, 239, 255],
      "the card of the template paper starts with the light background",
    );
  });

  spec("quote-image-generator", "builds a quote image from the typed text", async (page) => {
    await typeText(page, "Hello world");
    await requireControl(page, ["quote", "attribution", "font", "template"], "quote editor");

    const { bytes } = await downloadBuffer(page);
    const size = pngSize(bytes);
    assert.equal(size.width, 1080, "the quote image is 1080 pixels wide");
    assert.equal(size.height, 1080, "the quote image is 1080 pixels high");
    const card = await readPixels(page, bytes, "image/png");
    assert.deepEqual(
      pixelAt(card, 100, 155),
      [56, 189, 248, 255],
      "the quote image carries the blue rule of the template",
    );
  });

  spec("quote-image-maker", "builds a quote image from the typed text", async (page) => {
    await typeText(page, "Hello world");
    await requireControl(page, ["quote", "attribution", "font", "template"], "quote editor");

    const { bytes } = await downloadBuffer(page);
    const size = pngSize(bytes);
    assert.equal(size.width, 1080, "the quote image is 1080 pixels wide");
    assert.equal(size.height, 1080, "the quote image is 1080 pixels high");

    // The author is written below the quote.
    await page.locator('main input[type="text"]').first().fill("ToolPad Author");
    await sleep(600);
    const withAuthor = await downloadBuffer(page);
    const card = await readPixels(page, withAuthor.bytes, "image/png");
    let ink = 0;
    for (let y = 340; y < 420; y += 1) {
      for (let x = 90; x < 990; x += 1) {
        const [r, g, b] = pixelAt(card, x, y);
        if (r > 150 && g > 150 && b > 180) ink += 1;
      }
    }
    assert.ok(
      ink > 20,
      `the author must be written on the quote image, it has ${ink} light pixels`,
    );
  });

  spec("code-to-image", "renders a code snippet as a picture", async (page) => {
    await typeText(page, "const a = 1;");
    await requireControl(page, ["code", "syntax", "theme", "language"], "code editor");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const picture = await readPixels(page, bytes, "image/png");
    assert.ok(picture.width > 0 && picture.height > 0, "the picture must have a size");
    const bar = pixelAt(picture, 2, 2);
    const body = pixelAt(picture, 2, picture.height - 2);
    assert.notDeepEqual(
      bar,
      body,
      "the picture must have a title bar that differs from the body",
    );

    // The code has to be written on the picture.
    let ink = 0;
    for (let y = 40; y < picture.height; y += 1) {
      for (let x = 0; x < picture.width; x += 1) {
        if (pixelAt(picture, x, y).join(",") !== body.join(",")) ink += 1;
      }
    }
    assert.ok(ink > 20, `the code must be written on the picture, it has ${ink} other pixels`);

    // Another theme has to change the picture.
    await selectOption(page, "paper", 1);
    const light = await downloadBuffer(page);
    const lightPicture = await readPixels(page, light.bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(lightPicture, 2, lightPicture.height - 2),
      body,
      "the theme paper must change the background of the picture",
    );

    // Another language has to change the title bar.
    await selectOption(page, "midnight", 1);
    await selectOption(page, "python", 0);
    const python = await downloadBuffer(page);
    const pythonPicture = await readPixels(page, python.bytes, "image/png");
    assert.notDeepEqual(
      regionColours(pythonPicture, 0, 0, pythonPicture.width - 1, 35),
      regionColours(picture, 0, 0, picture.width - 1, 35),
      "the title bar must show the chosen language",
    );
  });

  spec("latex-to-image", "renders a LaTeX formula as a picture", async (page) => {
    await typeText(page, "\\frac{a}{b}");
    await requireControl(page, ["latex", "formula", "equation", "resolution"], "formula editor");

    const first = await downloadBuffer(page);
    assert.match(first.name, /\.png$/, `the download should be named .png, got ${first.name}`);
    const small = pngSize(first.bytes);
    assert.equal(small.width, 1200, "the formula at 2x is 1200 pixels wide");
    assert.equal(small.height, 400, "the formula at 2x is 400 pixels high");

    await selectOption(page, "1");
    const one = await downloadBuffer(page);
    const size = pngSize(one.bytes);
    assert.equal(size.width, 600, "the formula at 1x is 600 pixels wide");
    assert.equal(size.height, 200, "the formula at 1x is 200 pixels high");

    // The formula has to be drawn on the white paper.
    const picture = await readPixels(page, one.bytes, "image/png");
    let ink = 0;
    for (let y = 0; y < size.height; y += 1) {
      for (let x = 0; x < size.width; x += 1) {
        const [r, g, b] = pixelAt(picture, x, y);
        if (r < 200 || g < 200 || b < 200) ink += 1;
      }
    }
    assert.ok(ink > 50, `the formula must be drawn on the picture, it has ${ink} dark pixels`);
  });

  spec("data-matrix-generator", "encodes the text into a Data Matrix symbol", async (page) => {
    await typeText(page, "12345678");
    await requireControl(page, ["data matrix", "datamatrix"], "Data Matrix output");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const size = pngSize(bytes);
    assert.equal(
      size.width,
      size.height,
      `the picture of the symbol must be square, it is ${size.width}x${size.height}`,
    );
    assert.ok(
      size.width >= 100,
      `the picture of the symbol must carry the modules, it is ${size.width} pixels wide`,
    );
    const symbol = await readPixels(page, bytes, "image/png");
    const box = darkBox(symbol);
    assert.ok(box.count > 100, `the symbol must carry modules, it has ${box.count} dark pixels`);
    assert.ok(
      Math.abs(box.width - box.height) <= 1,
      `the symbol of Data Matrix is square, it is ${box.width}x${box.height}`,
    );

    // The finder pattern of ECC200: a solid left column and a solid bottom row.
    for (let y = box.y0; y <= box.y1; y += 1) {
      const [r, g, b] = pixelAt(symbol, box.x0, y);
      assert.ok(
        r + g + b < 3 * 128,
        `the left column of the symbol must be dark, the pixel at ${box.x0}/${y} is not`,
      );
    }
    for (let x = box.x0; x <= box.x1; x += 1) {
      const [r, g, b] = pixelAt(symbol, x, box.y1);
      assert.ok(
        r + g + b < 3 * 128,
        `the bottom row of the symbol must be dark, the pixel at ${x}/${box.y1} is not`,
      );
    }

    // Another text has to give another symbol.
    await typeText(page, "87654321");
    const other = await downloadBuffer(page);
    const otherSymbol = await readPixels(page, other.bytes, "image/png");
    assert.notDeepEqual(
      darkBox(otherSymbol),
      box,
      "another text must give another symbol",
    );
    assert.notDeepEqual(
      Array.from(other.bytes),
      Array.from(bytes),
      "another text must give another picture",
    );
  });

  spec("svg-viewer", "shows the size, viewBox and colours of an SVG", async (page) => {
    await typeText(page, "<svg width='10' height='10'></svg>");
    await requireControl(page, ["viewbox", "svg", "width", "height"], "SVG inspector");

    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#3366cc"/></svg>';
    await typeText(page, source);
    assert.equal(await dataValue(page, "Width"), "40", "the inspector must show the width");
    assert.equal(await dataValue(page, "Height"), "20", "the inspector must show the height");
    assert.equal(
      await dataValue(page, "viewBox"),
      "0 0 40 20",
      "the inspector must show the viewBox",
    );
    assert.equal(
      await dataValue(page, "Elements"),
      "1",
      "the inspector must count the elements of the file",
    );
    assert.equal(
      await dataValue(page, "Colours"),
      "#3366cc",
      "the inspector must list the colour of the file",
    );

    // The attributes of an SVG may be written with single quotes as well.
    await typeText(
      page,
      "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'><rect width='40' height='20' fill='#3366cc'/></svg>",
    );
    assert.equal(
      await dataValue(page, "Colours"),
      "#3366cc",
      "the inspector must list a colour that is written with single quotes",
    );
  });

  spec("svg-to-css", "turns an SVG into a CSS background or mask rule", async (page) => {
    await typeText(page, "<svg width='10' height='10'></svg>");
    await requireControl(page, ["css", "background-image", "mask"], "CSS output");

    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#3366cc"/></svg>';
    await typeText(page, source);
    await page.locator('main input[type="text"]').first().fill("toolpad");
    await sleep(600);

    const css = await codeBlock(page);
    assert.ok(css.includes(".toolpad {"), `the rule must use the chosen class, the CSS is ${css}`);
    assert.ok(
      css.includes("background-image: url(\"data:image/svg+xml;charset=utf-8,"),
      "the rule must carry the picture as a background",
    );
    assert.ok(css.includes(".toolpad-mask {"), "the rule must offer a mask as well");
    assert.ok(css.includes("mask-image: url("), "the mask rule must carry the picture");
    const encoded = /url\("data:image\/svg\+xml;charset=utf-8,([^"]*)"\)/.exec(css);
    assert.ok(encoded, "the rule must carry a data address of the picture");
    const decoded = decodeURIComponent(encoded[1]);
    assert.ok(
      decoded.includes("#3366cc"),
      `the data address must carry the source of the picture, it carries ${decoded}`,
    );
    assert.ok(
      decoded.includes('viewBox="0 0 40 20"'),
      "the data address must carry the viewBox of the picture",
    );
  });

  spec("favicon-generator", "builds favicons in the usual icon sizes", async (page) => {
    await uploadCanvasImage(page, {
      width: 64,
      height: 64,
      color: "#3366cc",
      mime: "image/png",
      name: "logo.png",
    });
    await waitForPreview(page);
    await requireControl(page, ["16", "32", "48", "180", "size"], "favicon size list");

    // The icon file carries the four sizes the tool offers.
    const ico = await downloadFrom(page, "Download .ico");
    assert.match(ico.name, /\.ico$/, `the download should be named .ico, got ${ico.name}`);
    const icon = icoPictures(ico.bytes);
    assert.equal(icon.count, 4, "the icon carries the four favicon sizes");
    assert.deepEqual(
      icon.pictures.map((picture) => picture.size),
      [16, 32, 48, 180],
      "the icon carries the sizes 16, 32, 48 and 180",
    );
    for (const picture of icon.pictures) {
      assert.equal(
        picture.width,
        picture.size,
        `the picture ${picture.size} is ${picture.width} pixels wide`,
      );
    }

    // The archive carries one picture per size.
    const zip = await downloadFrom(page, "Download all (.zip)");
    assert.match(zip.name, /\.zip$/, `the download should be a zip file, got ${zip.name}`);
    const archive = await JSZip.loadAsync(zip.bytes);
    const names = Object.keys(archive.files).filter(
      (entry) => !archive.files[entry].dir,
    );
    assert.equal(names.length, 4, `the archive must hold four pictures, it holds ${names.length}`);
    for (const size of [16, 32, 48, 180]) {
      const entry = `logo-${size}.png`;
      assert.ok(names.includes(entry), `the archive must hold ${entry}, it holds ${names.join(", ")}`);
      const picture = pngSize(await archive.files[entry].async("nodebuffer"));
      assert.equal(picture.width, size, `the picture ${entry} is ${size} pixels wide`);
      assert.equal(picture.height, size, `the picture ${entry} is ${size} pixels high`);
    }
  });

  spec("favicon-maker", "builds a tab icon from a symbol library", async (page) => {
    await requireControl(page, ["icon", "symbol", "shape", "font"], "icon picker");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const size = pngSize(bytes);
    assert.equal(size.width, 32, "the icon of the default size is 32 pixels wide");
    assert.equal(size.height, 32, "the icon of the default size is 32 pixels high");

    // The symbol has to be drawn on the icon.
    const icon = await readPixels(page, bytes, "image/png");
    let ink = 0;
    for (let y = 0; y < size.height; y += 1) {
      for (let x = 0; x < size.width; x += 1) {
        if (pixelAt(icon, x, y)[3] > 0) ink += 1;
      }
    }
    assert.ok(ink > 20, `the symbol must be drawn on the icon, it has ${ink} pixels`);

    // Another size has to change the icon.
    await selectOption(page, "64");
    const bigger = await downloadBuffer(page);
    const biggerSize = pngSize(bigger.bytes);
    assert.equal(biggerSize.width, 64, "the icon of 64 pixels is 64 pixels wide");
    assert.equal(biggerSize.height, 64, "the icon of 64 pixels is 64 pixels high");
  });

  spec("svg-favicon-generator", "builds an SVG favicon from a symbol library", async (page) => {
    await requireControl(page, ["symbol", "icon library", "shape", "stroke"], "icon picker");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.svg$/, `the download should be named .svg, got ${name}`);
    const svg = bytes.toString("utf8");
    assert.ok(svg.startsWith("<svg"), `the file must be an SVG, it starts with ${svg.slice(0, 40)}`);
    assert.ok(
      svg.includes('viewBox="0 0 24 24"'),
      `the icon must use the viewBox of the library, it is ${svg}`,
    );
    assert.ok(svg.includes('width="32"'), `the icon must have its size, it is ${svg}`);
    assert.ok(svg.includes('height="32"'), `the icon must have its size, it is ${svg}`);
    assert.ok(
      /<path d="[^"]+"/.test(svg),
      `the icon must carry the path of the symbol, it is ${svg}`,
    );
  });

  spec("christmas-gift-tracker", "keeps a list of the gifts to buy", async (page) => {
    await requireControl(page, ["gift", "present", "budget", "wishlist"], "gift list");

    // The list lives in the memory of the tab, so it starts empty.
    await clickButton(page, "Clear the list");
    await page.locator('main input[type="text"]').first().fill("ToolPad Lamp");
    await fillNumber(page, 25.5, 0);
    await clickButton(page, "Add gift");
    await page.locator('main input[type="text"]').first().fill("ToolPad Kettle");
    await fillNumber(page, 10.25, 0);
    await clickButton(page, "Add gift");

    const text = await workspace(page);
    assertIncludes(text, "ToolPad Lamp", "the list must show the gift that was added");
    assertIncludes(text, "ToolPad Kettle", "the list must show the second gift");
    assertIncludes(text, "25.50", "the list must show the budget of the gift");
    assertIncludes(text, "10.25", "the list must show the budget of the second gift");
    assertIncludes(
      text,
      "35.75",
      "the total budget must be the sum of the two budgets",
    );

    // The gift list must not be written to the browser storage.
    const stored = await page.evaluate(() => Object.keys(window.localStorage));
    assert.equal(
      stored.length,
      0,
      `the gift list must stay in the memory, the storage holds ${JSON.stringify(stored)}`,
    );
  });

  spec("gift-exchange-generator", "draws the names for a gift exchange", async (page) => {
    await requireControl(page, ["name", "draw", "participant", "exclude"], "name pool");

    await page
      .locator("main textarea")
      .first()
      .fill("ToolPad Alex\nToolPad Blanca\nToolPad Cem");
    await page.locator('main input[type="text"]').first().fill("ToolPad Cem");
    await clickButton(page, "Draw");

    const text = await workspace(page);
    assertIncludes(text, "ToolPad Alex", "the draw must show the first name");
    assertIncludes(text, "ToolPad Blanca", "the draw must show the second name");
    assert.ok(
      !text.includes("ToolPad Cem"),
      "the excluded name must not be part of the draw",
    );

    // The draw must show every name of the pool exactly once.
    const drawn = await page.evaluate(() => {
      const lists = Array.from(document.querySelectorAll("main ol"));
      const list = lists.find((candidate) =>
        Array.from(candidate.querySelectorAll("li")).some((item) =>
          (item.textContent || "").includes("ToolPad"),
        ),
      );
      if (!list) return [];
      return Array.from(list.querySelectorAll("li")).map((item) =>
        (item.textContent || "").replace(/\s+/g, " ").trim(),
      );
    });
    assert.equal(drawn.length, 2, `the draw must hold two names, it holds ${drawn.length}`);
    const names = drawn.map((entry) => entry.replace(/^\d+\.\s*/, ""));
    assert.deepEqual(
      names.slice().sort(),
      ["ToolPad Alex", "ToolPad Blanca"],
      "the draw must hold every name of the pool once",
    );
  });

  spec("og-image-generator", "builds a social share image from a template", async (page) => {
    await requireControl(page, ["title", "template", "1200", "630"], "share card editor");

    const { bytes, name } = await downloadBuffer(page);
    assert.match(name, /\.png$/, `the download should be named .png, got ${name}`);
    const size = pngSize(bytes);
    assert.equal(size.width, 1200, "the share image is 1200 pixels wide");
    assert.equal(size.height, 630, "the share image is 630 pixels high");

    const card = await readPixels(page, bytes, "image/png");
    assert.deepEqual(
      pixelAt(card, 5, 5),
      [15, 23, 42, 255],
      "the card of the template minimal starts with the dark background",
    );

    // Another template has to change the card.
    await selectOption(page, "gradient");
    const other = await downloadBuffer(page);
    const gradient = await readPixels(page, other.bytes, "image/png");
    assert.notDeepEqual(
      pixelAt(gradient, 5, 5),
      pixelAt(card, 5, 5),
      "the template gradient must change the background of the card",
    );
  });

  spec("og-image-maker", "builds an OG share card with a title and subtitle", async (page) => {
    await requireControl(page, ["title", "subtitle", "template", "1200", "630"], "share card editor");

    await page.locator('main input[type="text"]').nth(0).fill("ToolPad headline");
    await page.locator('main input[type="text"]').nth(1).fill("ToolPad subtitle");
    await sleep(600);
    const { bytes } = await downloadBuffer(page);
    const size = pngSize(bytes);
    assert.equal(size.width, 1200, "the share card is 1200 pixels wide");
    assert.equal(size.height, 630, "the share card is 630 pixels high");

    // The title and the subtitle have to be written on the card.
    const card = await readPixels(page, bytes, "image/png");
    let ink = 0;
    for (let y = 180; y < 300; y += 1) {
      for (let x = 60; x < 1140; x += 1) {
        const [r, g, b] = pixelAt(card, x, y);
        if (r > 200 && g > 200 && b > 200) ink += 1;
      }
    }
    assert.ok(ink > 50, `the title must be written on the card, it has ${ink} light pixels`);
  });

  spec("open-graph-image-generator", "builds a 1200x630 Open Graph image", async (page) => {
    await requireControl(page, ["title", "template", "1200", "630"], "share card editor");

    const { bytes } = await downloadBuffer(page);
    const size = pngSize(bytes);
    assert.equal(size.width, 1200, "the Open Graph image is 1200 pixels wide");
    assert.equal(size.height, 630, "the Open Graph image is 630 pixels high");
    const card = await readPixels(page, bytes, "image/png");
    assert.deepEqual(
      pixelAt(card, 100, 94),
      [255, 255, 255, 255],
      "the card of the template minimal carries the white rule",
    );
  });

  spec("open-graph-checker", "reads the Open Graph tags of a page", async (page) => {
    await requireControl(page, ["url", "open graph", "og:", "preview"], "URL field");

    await page
      .locator("main textarea")
      .first()
      .fill(
        '<html><head><meta property="og:title" content="ToolPad title"><meta property="og:description" content="ToolPad description"><meta property="og:image" content="https://example.com/og.png"><meta name="viewport" content="width=device-width"></head><body></body></html>',
      );
    await clickButton(page, "Read the tags");

    const rows = await dataList(page);
    const titles = rows.filter((row) => row.label.startsWith("og:"));
    assert.equal(titles.length, 3, `the tool must list the three og tags, it lists ${titles.length}`);
    const values = rows.map((row) => row.value);
    assert.ok(values.includes("ToolPad title"), "the tool must show the title of the page");
    assert.ok(
      values.includes("ToolPad description"),
      "the tool must show the description of the page",
    );
    assert.ok(
      values.includes("https://example.com/og.png"),
      "the tool must show the picture of the page",
    );
    assert.ok(
      !values.includes("width=device-width"),
      "the tool must not list a tag that is not an Open Graph tag",
    );
  });

  spec("open-graph-preview", "previews the Open Graph tags of a link", async (page) => {
    await requireControl(page, ["url", "open graph", "og:", "preview"], "URL field");

    await page
      .locator('main input[type="text"]')
      .first()
      .fill("https://example.com/page");
    await page
      .locator("main textarea")
      .first()
      .fill('<meta property="og:title" content="ToolPad preview">');
    await clickButton(page, "Read the tags");
    const rows = await dataList(page);
    const hit = rows.find((row) => row.label === "og:title");
    assert.ok(hit, "the tool must list the og:title tag");
    assert.equal(hit.value, "ToolPad preview", "the tool must show the content of the tag");
  });

  spec("social-media-preview", "previews how a link looks when it is shared", async (page) => {
    await requireControl(page, ["url", "facebook", "twitter", "linkedin", "preview"], "URL field");

    await page
      .locator('main input[type="text"]')
      .first()
      .fill("https://example.com/social");
    await sleep(500);
    const css = await codeBlock(page);
    assert.ok(
      css.includes("https://example.com/social"),
      `the tool must show the link, it shows ${css}`,
    );
  });

  spec("youtube-thumbnail-downloader", "fetches the thumbnails of a YouTube link", async (page) => {
    await requireControl(page, ["youtube", "video", "url", "link", "thumbnail"], "link field");

    const id = "dQw4w9WgXcQ";
    await page
      .locator('main input[type="text"]')
      .first()
      .fill(`https://www.youtube.com/watch?v=${id}`);
    await sleep(500);
    const text = await workspace(page);
    assertIncludes(text, id, "the tool must show the video id of the link");
    for (const name of [
      "maxresdefault",
      "sddefault",
      "hqdefault",
      "mqdefault",
      "default",
    ]) {
      assertIncludes(
        text,
        `https://i.ytimg.com/vi/${id}/${name}.jpg`,
        `the tool must offer the picture ${name} of the video`,
      );
    }
  });

  spec("youtube-thumbnail-grabber", "fetches the thumbnails of many YouTube links", async (page) => {
    await requireControl(page, ["youtube", "video", "url", "link", "thumbnail"], "link field");

    const id = "dQw4w9WgXcQ";
    await page.locator('main input[type="text"]').first().fill(`https://youtu.be/${id}`);
    await sleep(500);
    const text = await workspace(page);
    assertIncludes(
      text,
      id,
      "the tool must read the video id out of a short link",
    );
    assertIncludes(
      text,
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      "the tool must offer the biggest picture of the video",
    );
  });

  spec("remove-metadata-from-word", "removes the author and company from a Word file", async (page) => {
    await uploadBytes(
      page,
      "contract.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docxFixture(),
    );
    await sleep(1500);
    const text = await workspace(page);
    assertIncludes(
      text,
      "ToolPad Author",
      "the tool should report the author of the Word document",
    );
    assertIncludes(
      text,
      "ToolPad Contract",
      "the tool should report the title of the Word document",
    );

    // The document without the metadata keeps its text and loses its author.
    const { bytes, name } = await downloadFrom(page, "Download without metadata");
    assert.match(name, /\.docx$/, `the download should be a docx file, got ${name}`);
    const archive = await JSZip.loadAsync(bytes);
    const entries = Object.keys(archive.files);
    assert.ok(
      !entries.includes("docProps/core.xml"),
      `the document must not carry the author any more, it holds ${entries.join(", ")}`,
    );
    assert.ok(
      !entries.includes("docProps/app.xml"),
      `the document must not carry the company any more, it holds ${entries.join(", ")}`,
    );
    assert.ok(
      entries.includes("word/document.xml"),
      `the document must keep its text, it holds ${entries.join(", ")}`,
    );
    const document = await archive.files["word/document.xml"].async("string");
    assertIncludes(document, "ToolPad Contract", "the document must keep its text");
  });
}
