/**
 * Functional specs for the 11 tools of the qr-barcode engine.
 *
 * Every spec drives the real UI in Chrome and then decodes what the tool
 * really rendered:
 *
 * - a QR code is decoded from the picture itself (ISO/IEC 18004: finder
 *   pattern, timing pattern, data masking, byte / numeric / alphanumeric
 *   segments), so the spec proves the symbol carries the typed payload and
 *   not just that a picture appeared;
 * - a barcode is decoded from the bars of the exported SVG (EAN-13 and UPC-A
 *   use the ISO/IEC 15420 digit patterns and the modulo 10 check digit, Code
 *   128 uses the 107 published patterns and its modulo 103 check character,
 *   Code 39 uses the published 9 element character patterns).
 *
 * The expected values come from those published tables and algorithms, never
 * from this site's own code.
 */

import assert from "node:assert";

import {
  spec,
  fillPrimary,
  fillInput,
  selectOption,
  clickButton,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- barcode -- */

/** The 107 published Code 128 patterns, as the six element widths. */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232",
];

/** The published Code 39 character patterns (1 = wide element). */
const CODE39_PATTERNS = {
  "000110100": "0", "100100001": "1", "001100001": "2", "101100000": "3",
  "000110001": "4", "100110000": "5", "001110000": "6", "000100101": "7",
  "100100100": "8", "001100100": "9", "100001001": "A", "001001001": "B",
  "101001000": "C", "000011001": "D", "100011000": "E", "001011000": "F",
  "000001101": "G", "100001100": "H", "001001100": "I", "000011100": "J",
  "100000011": "K", "001000011": "L", "101000010": "M", "000010011": "N",
  "100010010": "O", "001010010": "P", "000000111": "Q", "100000110": "R",
  "001000110": "S", "000010110": "T", "110000001": "U", "011000001": "V",
  "111000000": "W", "010010001": "X", "110010000": "Y", "011010000": "Z",
  "010000101": "-", "110000100": ".", "011000100": " ", "010101000": "$",
  "010100010": "/", "010001010": "+", "000101010": "%", "010010100": "*",
};

/** The EAN-13 left hand (L) digit patterns. */
const EAN_L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];

/** The EAN-13 right hand (R) digit patterns. */
const EAN_R = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];

/** The EAN-13 right hand (G) patterns are the R patterns read backwards. */
const EAN_G = EAN_R.map((p) => p.split("").reverse().join(""));

/** The parity of the six left hand digits for each first digit. */
const EAN_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

/** The ISO/IEC 15420 modulo 10 check digit of a 12 digit EAN number. */
function eanCheckDigit(digits) {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/** Split a module string into the widths of its alternating elements. */
function elementWidths(modules) {
  const widths = [];
  let i = 0;
  while (i < modules.length) {
    let j = i;
    while (j < modules.length && modules[j] === modules[i]) j += 1;
    widths.push(j - i);
    i = j;
  }
  return widths;
}

/** Decode an EAN-13 symbol from its 95 module string. */
export function decodeEan13(modules) {
  if (modules.length !== 95) {
    return { error: `an EAN-13 symbol has 95 modules, this one has ${modules.length}` };
  }
  if (modules.slice(0, 3) !== "101") return { error: "the start guard is missing" };
  if (modules.slice(45, 50) !== "01010") return { error: "the middle guard is missing" };
  if (modules.slice(92) !== "101") return { error: "the end guard is missing" };
  const left = modules.slice(3, 45);
  const right = modules.slice(50, 92);
  for (let first = 0; first <= 9; first += 1) {
    const parity = EAN_PARITY[first];
    const digits = [first];
    let ok = true;
    for (let i = 0; i < 6; i += 1) {
      const segment = left.slice(i * 7, i * 7 + 7);
      const table = parity[i] === "G" ? EAN_G : EAN_L;
      const digit = table.indexOf(segment);
      if (digit < 0) {
        ok = false;
        break;
      }
      digits.push(digit);
    }
    if (!ok) continue;
    for (let i = 0; i < 6; i += 1) {
      const digit = EAN_R.indexOf(right.slice(i * 7, i * 7 + 7));
      if (digit < 0) {
        ok = false;
        break;
      }
      digits.push(digit);
    }
    if (!ok) continue;
    const value = digits.join("");
    return { value, check: eanCheckDigit(value.slice(0, 12)) };
  }
  return { error: "no digit set matches the bars" };
}

/** Decode a Code 128 symbol from its module string. */
export function decodeCode128(modules) {
  const widths = elementWidths(modules);
  // every character of a Code 128 symbol has six elements, the stop character
  // has seven, so the symbol carries (elements - 7) / 6 characters.
  if (widths.length < 13 || (widths.length - 7) % 6 !== 0) {
    return { error: `a Code 128 symbol cannot have ${widths.length} elements` };
  }
  const count = (widths.length - 7) / 6;
  const characters = [];
  for (let i = 0; i < count; i += 1) {
    const key = widths.slice(i * 6, i * 6 + 6).join("");
    const value = CODE128_PATTERNS.indexOf(key);
    if (value < 0) return { error: `unknown Code 128 pattern ${key}` };
    characters.push(value);
  }
  const stop = widths.slice(count * 6).join("");
  if (stop !== "2331112") {
    return { error: `the stop pattern must be 2331112, found ${stop}` };
  }
  if (characters.length < 3) return { error: "the symbol is too short" };
  const start = characters[0];
  if (start < 103 || start > 105) return { error: `unknown start character ${start}` };
  const data = characters.slice(1, -1);
  const check = characters[characters.length - 1];
  let sum = start;
  data.forEach((value, i) => {
    sum += value * (i + 1);
  });
  const expected = sum % 103;
  let text = "";
  let set = start === 105 ? "C" : start === 104 ? "B" : "A";
  for (const value of data) {
    if (set === "C") {
      if (value < 100) {
        text += String(value).padStart(2, "0");
      } else if (value === 100) {
        set = "B";
      } else if (value === 101) {
        set = "A";
      } else {
        return { error: `unexpected Code 128 value ${value} in code set C` };
      }
    } else if (set === "B") {
      if (value <= 95) {
        text += String.fromCharCode(value + 32);
      } else if (value === 100) {
        set = "A";
      } else if (value === 101) {
        set = "C";
      } else {
        return { error: `unexpected Code 128 value ${value} in code set B` };
      }
    } else {
      if (value <= 63) {
        text += String.fromCharCode(value + 32);
      } else if (value === 99) {
        set = "B";
      } else if (value === 100) {
        set = "C";
      } else {
        return { error: `unexpected Code 128 value ${value} in code set A` };
      }
    }
  }
  return { value: text, check, expectedCheck: expected, start };
}

/** Decode a Code 39 symbol from its module string. */
export function decodeCode39(modules) {
  const widths = elementWidths(modules);
  const narrow = Math.min(...widths);
  let text = "";
  let p = 0;
  while (p + 9 <= widths.length) {
    const key = widths
      .slice(p, p + 9)
      .map((w) => (w > narrow ? "1" : "0"))
      .join("");
    const character = CODE39_PATTERNS[key];
    if (!character) return { error: `unknown Code 39 pattern ${key}` };
    text += character;
    p += 9;
    if (p < widths.length) {
      if (widths[p] !== narrow) {
        return { error: `the gap between characters must be narrow, found ${widths[p]}` };
      }
      p += 1;
    }
  }
  return { value: text };
}

/* ------------------------------------------------------------------- QR -- */

/**
 * Decode the QR code the page shows.
 *
 * The symbol is read from the rendered picture: the finder pattern gives the
 * module size, the top right finder gives the symbol size, the function
 * patterns are skipped and the data modules are read in the zigzag order of
 * ISO/IEC 18004.  Every one of the eight data masks is tried, so the decode
 * does not depend on which mask the encoder picked.
 */
export async function decodeQr(page) {
  const result = await page.evaluate(() => {
    const img =
      document.querySelector('main img[alt="Generated QR Code"]') ||
      document.querySelector('main img[src^="data:"]');
    if (!img) return { error: "no QR code image is rendered" };
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const w = canvas.width;
    const h = canvas.height;
    const px = ctx.getImageData(0, 0, w, h).data;
    const dark = (x, y) => {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 128) return false;
      return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114 < 128;
    };

    let x0 = -1;
    let y0 = -1;
    for (let y = 0; y < h && y0 < 0; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (dark(x, y)) {
          x0 = x;
          y0 = y;
          break;
        }
      }
    }
    if (x0 < 0) return { error: "the picture has no dark module" };
    // the last dark pixel of the top row is the right edge of the top right
    // finder pattern, so the seven modules of that finder give the module
    // size and the symbol size follows from the distance of the two finders.
    let xr = -1;
    for (let x = w - 1; x >= 0; x -= 1) {
      if (dark(x, y0)) {
        xr = x;
        break;
      }
    }
    let xRight = xr;
    while (xRight - 1 > x0 && dark(xRight - 1, y0)) xRight -= 1;
    const scale = (xr + 1 - xRight) / 7;
    const size = Math.round((xr + 1 - x0) / scale);
    if (size < 21 || (size - 17) % 4 !== 0) {
      return { error: `${size} is not a valid QR symbol size` };
    }
    const version = (size - 17) / 4;

    const matrix = [];
    for (let r = 0; r < size; r += 1) {
      const row = [];
      for (let c = 0; c < size; c += 1) {
        const x = Math.round(x0 + (c + 0.5) * scale);
        const y = Math.round(y0 + (r + 0.5) * scale);
        row.push(dark(x, y) ? 1 : 0);
      }
      matrix.push(row);
    }

    const centres = [];
    if (version >= 2) {
      const alignCount = Math.floor(version / 7) + 2;
      const step =
        version === 32
          ? 26
          : Math.ceil((version * 4 + 4) / (alignCount * 2 - 2)) * 2;
      const coords = [6];
      let position = size - 7;
      for (let i = 0; i < alignCount - 1; i += 1) {
        coords.unshift(position);
        position -= step;
      }
      for (const r of coords) {
        for (const c of coords) {
          // an alignment pattern never overlaps a finder pattern
          const hitsFinder =
            (Math.abs(r - 6) <= 2 && Math.abs(c - 6) <= 2) ||
            (Math.abs(r - 6) <= 2 && Math.abs(c - (size - 7)) <= 2) ||
            (Math.abs(r - (size - 7)) <= 2 && Math.abs(c - 6) <= 2);
          if (!hitsFinder) centres.push([r, c]);
        }
      }
    }

    const isFunction = (r, c) => {
      if (r < 9 && c < 9) return true;
      if (r < 9 && c >= size - 8) return true;
      if (r >= size - 8 && c < 9) return true;
      if (r === 6 || c === 6) return true;
      for (const [ar, ac] of centres) {
        if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
      }
      return false;
    };

    const cells = [];
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      for (let i = 0; i < size; i += 1) {
        const row = upward ? size - 1 - i : i;
        for (const c of [col, col - 1]) {
          if (!isFunction(row, c)) cells.push({ r: row, c, v: matrix[row][c] });
        }
      }
      upward = !upward;
    }

    const maskBit = (m, r, c) => {
      switch (m) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
        case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
    };

    const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
    const payloads = [];
    for (let mask = 0; mask < 8; mask += 1) {
      const bits = cells.map((cell) =>
        cell.v ^ (maskBit(mask, cell.r, cell.c) ? 1 : 0),
      );
      let p = 0;
      const take = (n) => {
        let v = 0;
        for (let i = 0; i < n; i += 1) {
          if (p >= bits.length) return null;
          v = (v << 1) | bits[p];
          p += 1;
        }
        return v;
      };
      // a symbol can hold more than one segment, so the mode indicator is
      // read again after every segment until the terminator
      let text = "";
      let firstMode = null;
      for (;;) {
        const mode = take(4);
        if (mode === null || mode === 0) break;
        if (firstMode === null) firstMode = mode;
        if (mode === 0b0100) {
          const count = take(version < 10 ? 8 : 16);
          if (count === null) break;
          const bytes = [];
          for (let i = 0; i < count; i += 1) {
            const b = take(8);
            if (b === null) break;
            bytes.push(b);
          }
          if (bytes.length !== count) break;
          text += new TextDecoder("utf-8").decode(new Uint8Array(bytes));
        } else if (mode === 0b0001) {
          const count = take(version < 10 ? 10 : 12);
          if (count === null) break;
          let digits = "";
          let left = count;
          while (left >= 3) {
            const v = take(10);
            if (v === null) break;
            digits += String(v).padStart(3, "0");
            left -= 3;
          }
          if (left === 2) {
            const v = take(7);
            if (v === null) break;
            digits += String(v).padStart(2, "0");
          } else if (left === 1) {
            const v = take(4);
            if (v === null) break;
            digits += String(v);
          }
          if (digits.length !== count) break;
          text += digits;
        } else if (mode === 0b0010) {
          const count = take(version < 10 ? 9 : 11);
          if (count === null) break;
          let letters = "";
          let left = count;
          while (left >= 2) {
            const v = take(11);
            if (v === null) break;
            letters += ALPHANUMERIC[Math.floor(v / 45)] + ALPHANUMERIC[v % 45];
            left -= 2;
          }
          if (left === 1) {
            const v = take(6);
            if (v === null) break;
            letters += ALPHANUMERIC[v];
          }
          if (letters.length !== count) break;
          text += letters;
        } else {
          break;
        }
      }
      if (text) payloads.push({ mask, mode: firstMode, text });
    }
    return { size, version, payloads };
  });
  return result;
}

/* -------------------------------------------------------------- helpers -- */

/** Read the bars of the barcode the page rendered, as a module string. */
export async function renderedBars(page) {
  return page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll("main svg"));
    const svg = svgs.find((s) => s.querySelector("g rect")) || svgs[svgs.length - 1];
    if (!svg) return { error: "no barcode is rendered" };
    const bars = [];
    svg.querySelectorAll("g").forEach((group) => {
      const transform = group.getAttribute("transform") || "";
      const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(transform);
      const offset = m ? parseFloat(m[1]) : 0;
      group.querySelectorAll("rect").forEach((rect) => {
        if (rect.getAttribute("fill")) return;
        bars.push([offset + Number(rect.getAttribute("x")), Number(rect.getAttribute("width"))]);
      });
    });
    if (!bars.length) {
      svg.querySelectorAll("rect").forEach((rect) => {
        if (rect.getAttribute("fill")) return;
        bars.push([Number(rect.getAttribute("x")), Number(rect.getAttribute("width"))]);
      });
    }
    if (!bars.length) return { error: "the barcode has no bars" };
    bars.sort((a, b) => a[0] - b[0]);
    const left = bars[0][0];
    const unit = Math.min(...bars.map((b) => b[1]));
    let modules = "";
    let previous = left;
    for (const [x, width] of bars) {
      if (x > previous) modules += "0".repeat(Math.round((x - previous) / unit));
      modules += "1".repeat(Math.round(width / unit));
      previous = x + width;
    }
    return { modules, texts: Array.from(svg.querySelectorAll("text")).map((t) => (t.textContent || "").trim()) };
  });
}

/** Read the bars of the exported barcode file, as a module string. */
async function downloadedBars(page) {
  const pending = page.waitForEvent("download", { timeout: 20000 });
  await clickButton(page, "Download Barcode SVG");
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const svgText = Buffer.concat(chunks).toString("utf8");
  const bars = await page.evaluate((text) => {
    const holder = document.createElement("div");
    holder.innerHTML = text;
    const svg = holder.querySelector("svg");
    if (!svg) return { error: "the downloaded file is not an SVG" };
    const found = [];
    svg.querySelectorAll("g").forEach((group) => {
      const transform = group.getAttribute("transform") || "";
      const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(transform);
      const offset = m ? parseFloat(m[1]) : 0;
      group.querySelectorAll("rect").forEach((rect) => {
        if (rect.getAttribute("fill")) return;
        found.push([offset + Number(rect.getAttribute("x")), Number(rect.getAttribute("width"))]);
      });
    });
    if (!found.length) {
      svg.querySelectorAll("rect").forEach((rect) => {
        if (rect.getAttribute("fill")) return;
        found.push([Number(rect.getAttribute("x")), Number(rect.getAttribute("width"))]);
      });
    }
    found.sort((a, b) => a[0] - b[0]);
    const left = found[0][0];
    const unit = Math.min(...found.map((b) => b[1]));
    let modules = "";
    let previous = left;
    for (const [x, width] of found) {
      if (x > previous) modules += "0".repeat(Math.round((x - previous) / unit));
      modules += "1".repeat(Math.round(width / unit));
      previous = x + width;
    }
    return { modules, name: "barcode.svg" };
  }, svgText);
  return { ...bars, svgText };
}

/** Type a value into the barcode field. */
async function setBarcodeValue(page, value) {
  await fillInput(page, value, 0, "text");
}

/** Pick a barcode format in the format list. */
async function setBarcodeFormat(page, format) {
  await selectOption(page, format, 0);
  await sleep(400);
}

/* ---------------------------------------------------------------- specs -- */

export function register() {
  /* ---- QR codes ---- */

  spec("qr-code-generator", "encodes the typed URL into a decodable QR symbol", async (page) => {
    const payload = "https://example.com/tp";
    await fillPrimary(page, payload);
    await sleep(900);
    const qr = await decodeQr(page);
    assert(!qr.error, `the QR code should be readable, ${qr.error}`);
    assert.ok(
      qr.payloads.some((p) => p.text === payload),
      `the QR symbol must carry ${JSON.stringify(payload)}, decoded ${JSON.stringify(qr.payloads)}`,
    );
    assert.equal(
      qr.size,
      25,
      "21 bytes at error correction level M need QR version 2, a 25 by 25 module symbol",
    );
  });

  spec("url-to-qr-code", "encodes a web address into a QR symbol", async (page) => {
    const payload = "https://example.com/tools";
    await fillPrimary(page, payload);
    await sleep(900);
    const qr = await decodeQr(page);
    assert(!qr.error, `the QR code should be readable, ${qr.error}`);
    assert.ok(
      qr.payloads.some((p) => p.text === payload),
      `the QR symbol must carry ${JSON.stringify(payload)}, decoded ${JSON.stringify(qr.payloads)}`,
    );
    assert.equal(
      qr.size,
      25,
      "24 bytes at error correction level M need QR version 2, a 25 by 25 module symbol",
    );
  });

  spec("wifi-qr-code-generator", "encodes the Wi-Fi network as a WIFI payload", async (page) => {
    const payload = "WIFI:T:WPA;S:ToolPad;P:secret123;;";
    await fillPrimary(page, payload);
    await sleep(900);
    const qr = await decodeQr(page);
    assert(!qr.error, `the QR code should be readable, ${qr.error}`);
    assert.ok(
      qr.payloads.some((p) => p.text === payload),
      `the QR symbol must carry the WIFI payload, decoded ${JSON.stringify(qr.payloads)}`,
    );
  });

  spec("transparent-qr-code-generator", "exports a QR code with a transparent background", async (page) => {
    const payload = "https://example.com/transparent";
    await fillPrimary(page, payload);
    await sleep(700);
    await page.locator('main input[type="checkbox"]').check();
    await sleep(700);
    const qr = await decodeQr(page);
    assert(!qr.error, `the QR code should be readable, ${qr.error}`);
    assert.ok(
      qr.payloads.some((p) => p.text === payload),
      `the QR symbol must carry ${JSON.stringify(payload)}, decoded ${JSON.stringify(qr.payloads)}`,
    );
    const pending = page.waitForEvent("download", { timeout: 20000 });
    await clickButton(page, "Download PNG Image");
    const download = await pending;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    assert.deepEqual(
      Array.from(bytes.subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "a PNG file starts with the 8 byte PNG signature",
    );
    const alpha = await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      return { corner: data[3], centre: data[((img.height >> 1) * img.width + (img.width >> 1)) * 4 + 3] };
    }, `data:image/png;base64,${bytes.toString("base64")}`);
    assert.equal(
      alpha.corner,
      0,
      `the quiet zone of the QR code must be transparent, got alpha ${alpha.corner}`,
    );
    assert.equal(
      alpha.centre,
      255,
      `the modules of the QR code must stay opaque, got alpha ${alpha.centre}`,
    );
  });

  /* ---- barcodes ---- */

  spec("ean-13-barcode-generator", "encodes an EAN-13 number with its check digit", async (page) => {
    await setBarcodeFormat(page, "EAN13");
    await setBarcodeValue(page, "590123412345");
    await sleep(700);
    const bars = await downloadedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeEan13(bars.modules);
    assert(!decoded.error, `the bars should decode as EAN-13, ${decoded.error}`);
    assert.equal(
      decoded.value,
      "5901234123457",
      "the check digit of 590123412345 is 7 (ISO/IEC 15420 modulo 10)",
    );
    assert.equal(
      decoded.check,
      7,
      "the check digit computed from the decoded digits must be 7",
    );
  });

  spec("upc-barcode-generator", "encodes a UPC-A number with its check digit", async (page) => {
    await setBarcodeFormat(page, "UPC");
    await setBarcodeValue(page, "03600029145");
    await sleep(700);
    const bars = await downloadedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeEan13(bars.modules);
    assert(!decoded.error, `the bars should decode as a UPC-A symbol, ${decoded.error}`);
    assert.equal(
      decoded.value.slice(1),
      "036000291452",
      "the check digit of 03600029145 is 2 (ISO/IEC 15420 modulo 10)",
    );
  });

  spec("code-128-barcode-generator", "encodes a Code 128 symbol with its check character", async (page) => {
    await setBarcodeFormat(page, "CODE128");
    await setBarcodeValue(page, "12345678");
    await sleep(700);
    const bars = await downloadedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeCode128(bars.modules);
    assert(!decoded.error, `the bars should decode as Code 128, ${decoded.error}`);
    assert.equal(decoded.value, "12345678", "the symbol must carry the typed value");
    assert.equal(
      decoded.check,
      decoded.expectedCheck,
      "the Code 128 check character must match the modulo 103 formula",
    );
    assert.equal(
      bars.modules.length,
      11 * (1 + 4 + 1) + 13,
      "a Code 128 symbol of four digit pairs is 68 modules wide",
    );
  });

  spec("code-39-barcode-generator", "encodes a Code 39 symbol", async (page) => {
    await setBarcodeFormat(page, "CODE39");
    await setBarcodeValue(page, "ABC-123");
    await sleep(700);
    const bars = await downloadedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeCode39(bars.modules);
    assert(!decoded.error, `the bars should decode as Code 39, ${decoded.error}`);
    assert.equal(
      decoded.value,
      "*ABC-123*",
      "a Code 39 symbol starts and stops with the * character",
    );
  });

  spec("barcode-generator", "encodes the typed value as a barcode", async (page) => {
    await setBarcodeFormat(page, "EAN13");
    await setBarcodeValue(page, "4006381333931");
    await sleep(700);
    const bars = await renderedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeEan13(bars.modules);
    assert(!decoded.error, `the bars should decode as EAN-13, ${decoded.error}`);
    assert.equal(decoded.value, "4006381333931", "the symbol must carry the typed number");
    assert.ok(
      bars.texts.join("").includes("4006381333931"),
      `the human readable line must show the number, found ${JSON.stringify(bars.texts)}`,
    );
  });

  spec("isbn-barcode-generator", "encodes an ISBN as an EAN-13 symbol", async (page) => {
    await setBarcodeFormat(page, "EAN13");
    await setBarcodeValue(page, "9780306406157");
    await sleep(700);
    const bars = await downloadedBars(page);
    assert(!bars.error, `the barcode should be readable, ${bars.error}`);
    const decoded = decodeEan13(bars.modules);
    assert(!decoded.error, `the bars should decode as EAN-13, ${decoded.error}`);
    assert.equal(decoded.value, "9780306406157", "the symbol must carry the ISBN-13");

    await setBarcodeValue(page, "0306406152");
    await sleep(700);
    const converted = await renderedBars(page);
    const convertedEan = decodeEan13(converted.modules);
    assert(
      !convertedEan.error,
      `the ISBN-10 0306406152 must be encoded as the EAN-13 9780306406157, but the bars decode as ${convertedEan.error}`,
    );
    assert.equal(
      convertedEan.value,
      "9780306406157",
      "the ISBN-10 0306406152 must be converted to the ISBN-13 9780306406157",
    );
  });

  spec("bulk-barcode-generator", "renders one barcode for every value of a list", async (page) => {
    await setBarcodeValue(page, "590123412345,4006381333931");
    await sleep(900);
    const symbols = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main svg text"))
        .map((t) => (t.textContent || "").trim())
        .filter((t) => t.length > 0).length,
    );
    assert.equal(
      symbols,
      2,
      "a list of two numbers must produce two barcode symbols",
    );
  });
}
