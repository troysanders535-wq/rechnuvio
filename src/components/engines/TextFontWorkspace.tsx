"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Note,
  Panel,
  ResultBox,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextArea,
  TextInput,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

/* -------------------------------------------------------------------------- *
 * Unicode code-point tables.
 *
 * This block is DATA, never interface text. Every code point was verified
 * against the Unicode Character Database. Where the Mathematical
 * Alphanumeric Symbols block has holes, the official stand-in letter is
 * used (italic h -> U+210E, fraktur C -> U+212D, and so on).
 * -------------------------------------------------------------------------- */

type CharMap = Record<string, string>;

/** ASCII A-Z / a-z to a mathematical style block. */
function alphaMap(
  upperBase: number,
  lowerBase: number,
  holes?: Record<string, number>,
): CharMap {
  const map: CharMap = {};
  for (let i = 0; i < 26; i += 1) {
    const upper = String.fromCharCode(65 + i);
    const lower = String.fromCharCode(97 + i);
    map[upper] = String.fromCodePoint(holes?.[upper] ?? upperBase + i);
    map[lower] = String.fromCodePoint(holes?.[lower] ?? lowerBase + i);
  }
  return map;
}

/** ASCII 0-9 to a mathematical digit block. */
function digitMap(base: number): CharMap {
  const map: CharMap = {};
  for (let i = 0; i < 10; i += 1) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(base + i);
  }
  return map;
}

const MATH_BOLD: CharMap = {
  ...alphaMap(0x1d400, 0x1d41a),
  ...digitMap(0x1d7ce),
};
const MATH_ITALIC: CharMap = alphaMap(0x1d434, 0x1d44e, { h: 0x210e });
const MATH_BOLD_ITALIC: CharMap = alphaMap(0x1d468, 0x1d482);
const MATH_SCRIPT: CharMap = alphaMap(0x1d49c, 0x1d4b6, {
  B: 0x212c,
  E: 0x2130,
  F: 0x2131,
  H: 0x210b,
  I: 0x2110,
  L: 0x2112,
  M: 0x2133,
  R: 0x211b,
  e: 0x212f,
  g: 0x210a,
  o: 0x2134,
});
const MATH_BOLD_SCRIPT: CharMap = alphaMap(0x1d4d0, 0x1d4ea);
const MATH_FRAKTUR: CharMap = alphaMap(0x1d504, 0x1d51e, {
  C: 0x212d,
  H: 0x210c,
  I: 0x2111,
  R: 0x211c,
  Z: 0x2128,
});
const MATH_DOUBLE: CharMap = {
  ...alphaMap(0x1d538, 0x1d552, {
    C: 0x2102,
    H: 0x210d,
    N: 0x2115,
    P: 0x2119,
    Q: 0x211a,
    R: 0x211d,
    Z: 0x2124,
  }),
  ...digitMap(0x1d7d8),
};

/** Fullwidth forms: the monospace-looking variant Unicode actually ships. */
const FULLWIDTH: CharMap = (() => {
  const map: CharMap = {};
  map[String.fromCharCode(32)] = "\u3000";
  for (let cp = 0x21; cp <= 0x7e; cp += 1) {
    map[String.fromCharCode(cp)] = String.fromCharCode(cp + 0xfee0);
  }
  return map;
})();

const CIRCLED: CharMap = (() => {
  const map: CharMap = {};
  for (let i = 0; i < 26; i += 1) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(0x24b6 + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(0x24d0 + i);
  }
  for (let i = 0; i < 10; i += 1) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(0x24ea + i);
  }
  return map;
})();

/** Squared Latin capitals only - Unicode has no squared small letters. */
const SQUARED: CharMap = (() => {
  const map: CharMap = {};
  for (let i = 0; i < 26; i += 1) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1f130 + i);
  }
  return map;
})();

/** Small capitals - only the letters Unicode actually provides. */
const SMALL_CAPS: CharMap = (() => {
  const letters: Record<string, number> = {
    A: 0x1d00,
    B: 0x1d03,
    C: 0x1d04,
    D: 0x1d05,
    E: 0x1d07,
    J: 0x1d0a,
    K: 0x1d0b,
    M: 0x1d0d,
    O: 0x1d0f,
    P: 0x1d18,
    T: 0x1d1b,
    U: 0x1d1c,
    V: 0x1d20,
    W: 0x1d21,
    Z: 0x1d22,
  };
  const map: CharMap = {};
  for (const [letter, cp] of Object.entries(letters)) {
    map[letter] = String.fromCodePoint(cp);
    map[letter.toLowerCase()] = String.fromCodePoint(cp);
  }
  return map;
})();

/**
 * Superscript digits and punctuation plus the modifier letters Unicode
 * ships for lower case input. Upper case input has no superscript form
 * in this table and is therefore left untouched.
 */
const SUPERSCRIPT: CharMap = (() => {
  const map: CharMap = {};
  const digits = [
    0x2070, 0x00b9, 0x00b2, 0x00b3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079,
  ];
  for (let i = 0; i < 10; i += 1) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(digits[i]);
  }
  map["+"] = "\u207a";
  map["-"] = "\u207b";
  map["="] = "\u207c";
  map["("] = "\u207d";
  map[")"] = "\u207e";
  const letters: Record<string, number> = {
    a: 0x1d2c,
    b: 0x1d2e,
    d: 0x1d30,
    e: 0x1d31,
    g: 0x1d33,
    h: 0x1d34,
    i: 0x1d35,
    j: 0x1d36,
    k: 0x1d37,
    l: 0x1d38,
    m: 0x1d39,
    n: 0x1d3a,
    o: 0x1d3c,
    p: 0x1d3e,
    r: 0x1d3f,
    t: 0x1d40,
    u: 0x1d41,
    v: 0x2c7d,
    w: 0x1d42,
    y: 0x02b8,
    z: 0x1dbb,
  };
  for (const [letter, cp] of Object.entries(letters)) {
    map[letter] = String.fromCodePoint(cp);
  }
  return map;
})();

const SUBSCRIPT: CharMap = (() => {
  const map: CharMap = {};
  for (let i = 0; i < 10; i += 1) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(0x2080 + i);
  }
  map["+"] = "\u208a";
  map["-"] = "\u208b";
  const letters: Record<string, number> = {
    a: 0x2090,
    e: 0x2091,
    h: 0x2095,
    i: 0x1d62,
    j: 0x2c7c,
    k: 0x2096,
    l: 0x2097,
    m: 0x2098,
    n: 0x2099,
    o: 0x2092,
    p: 0x209a,
    r: 0x1d63,
    s: 0x209b,
    t: 0x209c,
    u: 0x1d64,
    v: 0x1d65,
    x: 0x2093,
  };
  for (const [letter, cp] of Object.entries(letters)) {
    map[letter] = String.fromCodePoint(cp);
  }
  return map;
})();

const MARK_STRIKETHROUGH = "\u0336";
const MARK_UNDERLINE = "\u0332";
const MARK_OVERLINE = "\u0305";
const MARK_SLASH = "\u0338";

/** Style id -> character map. */
const STYLE_MAPS: Record<string, CharMap> = {
  bold: MATH_BOLD,
  italic: MATH_ITALIC,
  "bold-italic": MATH_BOLD_ITALIC,
  script: MATH_SCRIPT,
  "bold-script": MATH_BOLD_SCRIPT,
  fraktur: MATH_FRAKTUR,
  "double-struck": MATH_DOUBLE,
  monospace: FULLWIDTH,
  fullwidth: FULLWIDTH,
  circled: CIRCLED,
  squared: SQUARED,
  "small-caps": SMALL_CAPS,
  superscript: SUPERSCRIPT,
  subscript: SUBSCRIPT,
};

/** Style id -> combining mark appended to every character. */
const STYLE_MARKS: Record<string, string> = {
  strikethrough: MARK_STRIKETHROUGH,
  underline: MARK_UNDERLINE,
  overline: MARK_OVERLINE,
  slash: MARK_SLASH,
};

/** Styles built from the Mathematical Alphanumeric Symbols block. */
const MATH_BLOCK_STYLES = new Set([
  "bold",
  "italic",
  "bold-italic",
  "script",
  "bold-script",
  "fraktur",
  "double-struck",
]);

/** Upside down rotation table (180 degree look). */
const ROTATION_MAP: CharMap = {
  a: "\u0250",
  b: "q",
  c: "\u0254",
  d: "p",
  e: "\u01dd",
  g: "\u0183",
  i: "\u0131",
  l: "l",
  o: "o",
  p: "d",
  q: "b",
  r: "\u0279",
  s: "s",
  t: "\u0287",
  u: "u",
  v: "\u028c",
  w: "\u028d",
  y: "\u028e",
  z: "z",
  A: "\u2200",
  B: "\u15fa",
  C: "\u0186",
  D: "\u15e1",
  E: "\u018e",
  F: "\u2132",
  G: "\u05e4",
  H: "H",
  I: "I",
  J: "\u017f",
  K: "\u029e",
  L: "\u02e5",
  M: "W",
  N: "N",
  O: "O",
  P: "\u0500",
  Q: "\u038c",
  R: "\u1d1a",
  S: "S",
  T: "\u22a5",
  U: "\u2229",
  V: "\u039b",
  W: "M",
  X: "X",
  Y: "\u2144",
  Z: "Z",
  "0": "0",
  "1": "\u0196",
  "2": "\u1105",
  "3": "\u0190",
  "4": "\u3123",
  "5": "\u03db",
  "6": "9",
  "7": "\u3125",
  "8": "8",
  "9": "6",
  ".": "\u02d9",
  ",": ",",
  "'": ",",
  '"': "\u201e",
  "?": "\u00bf",
  "!": "\u00a1",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "&": "\u214b",
  "_": "\u203e",
  ";": "\u061b",
};

/** Reverse of the rotation table, used to restore flipped text. */
const INVERSE_ROTATION: CharMap = (() => {
  const inverse: CharMap = {};
  for (const key of Object.keys(ROTATION_MAP)) {
    const target = ROTATION_MAP[key];
    if (!(target in inverse)) inverse[target] = key;
  }
  return inverse;
})();

const GLITCH_BLOCK = "\u2591\u2592\u2593\u2588\u2593\u2592\u2591";
const GLITCH_LEET = "!<>*_+-=[]{}0O1lI|";
const GLITCH_MARKS = ["\u0301", "\u0300", "\u0304", "\u0332", "\u0335"];
const GLITCH_LEVELS: Record<string, number> = { light: 1, medium: 2, heavy: 3 };

const ZALGO_ABOVE = [
  "\u0300",
  "\u0301",
  "\u0302",
  "\u0303",
  "\u0304",
  "\u0307",
  "\u0309",
  "\u030c",
  "\u0311",
];
const ZALGO_BELOW = [
  "\u0326",
  "\u0327",
  "\u0328",
  "\u0329",
  "\u032d",
  "\u032e",
  "\u0330",
  "\u0331",
  "\u0338",
];
const ZALGO_LEVELS: Record<string, number> = {
  off: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  extreme: 5,
};

/** Slug -> workspace mode. */
const MODE_BY_SLUG: Record<string, string> = {
  "font-generator": "gallery",
  "fancy-text-generator": "gallery",
  "bold-text-generator": "single",
  "cursive-text-generator": "single",
  "small-text-generator": "single",
  "strikethrough-text-generator": "single",
  "upside-down-text-generator": "upside",
  "glitch-text-generator": "glitch",
  "zalgo-text-generator": "zalgo",
};

/** Slug -> default style id. */
const DEFAULT_STYLE_BY_SLUG: Record<string, string> = {
  "font-generator": "bold",
  "fancy-text-generator": "bold",
  "bold-text-generator": "bold",
  "cursive-text-generator": "script",
  "small-text-generator": "small-caps",
  "strikethrough-text-generator": "strikethrough",
};

/** Slug -> the styles that slug offers. */
const STYLE_IDS_BY_SLUG: Record<string, string[]> = {
  "bold-text-generator": ["bold", "bold-italic"],
  "cursive-text-generator": ["script", "bold-script", "fraktur"],
  "small-text-generator": ["small-caps", "small-text", "superscript", "subscript"],
  "strikethrough-text-generator": ["strikethrough", "underline", "overline", "slash"],
};

/* -------------------------------------------------------------------------- *
 * Pure helpers.
 * -------------------------------------------------------------------------- */

function applyMap(text: string, map: CharMap): string {
  let out = "";
  for (const char of text) out += map[char] ?? char;
  return out;
}

function applyMark(text: string, mark: string): string {
  let out = "";
  for (const char of text) out += char + mark;
  return out;
}

function renderStyle(text: string, styleId: string): string {
  if (styleId === "small-text") {
    return applyMark(applyMap(text, SMALL_CAPS), MARK_UNDERLINE);
  }
  const mark = STYLE_MARKS[styleId];
  if (mark) return applyMark(text, mark);
  const map = STYLE_MAPS[styleId];
  if (map) return applyMap(text, map);
  return text;
}

function supportsStyle(styleId: string, platformId: string): boolean {
  if (!MATH_BLOCK_STYLES.has(styleId)) return true;
  return (
    platformId !== "instagram" && platformId !== "tiktok" && platformId !== "whatsapp"
  );
}

function rotateChars(text: string): string {
  let out = "";
  for (const char of text) out += ROTATION_MAP[char] ?? char;
  return out;
}

function flipText(text: string, keepWordOrder: boolean): string {
  if (!keepWordOrder) return [...rotateChars(text)].reverse().join("");
  return text
    .split(/(\s+)/)
    .map((part) =>
      part.trim() === "" ? part : [...rotateChars(part)].reverse().join(""),
    )
    .join("");
}

function restoreFlipped(text: string): string {
  let out = "";
  for (const char of text) out += INVERSE_ROTATION[char] ?? char;
  return [...out].reverse().join("");
}

/** Deterministic PRNG so a re-render never reshuffles the output. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glitchText(text: string, level: number, rand: () => number): string {
  const pool = GLITCH_BLOCK + GLITCH_LEET;
  const replaceChance = level === 1 ? 0.2 : level === 2 ? 0.4 : 0.7;
  const markChance = level === 1 ? 0.12 : level === 2 ? 0.22 : 0.35;
  let out = "";
  for (const char of text) {
    if (char.trim() === "") {
      out += char;
      continue;
    }
    if (rand() < replaceChance) {
      out += pool[Math.floor(rand() * pool.length)];
    } else {
      out += char;
    }
    if (rand() < markChance) {
      out += GLITCH_MARKS[Math.floor(rand() * GLITCH_MARKS.length)];
    }
  }
  return out;
}

function shuffleChars(text: string, rand: () => number): string {
  const chars = [...text];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join("");
}

function zalgoText(text: string, count: number, rand: () => number): string {
  let out = "";
  for (const char of text) {
    out += char;
    if (char.trim() === "" || count === 0) continue;
    const marks = count + (rand() < 0.5 ? 0 : 1);
    for (let i = 0; i < marks; i += 1) {
      const pool = rand() < 0.6 ? ZALGO_ABOVE : ZALGO_BELOW;
      out += pool[Math.floor(rand() * pool.length)];
    }
  }
  return out;
}

function cleanZalgo(text: string): string {
  return text.replace(/[\u0300-\u036f]/g, "");
}

/** Box frame built from box drawing code points. */
function boxFrame(text: string, chars: number[]): string {
  const inner = Math.max(text.length + 2, 6);
  const top =
    String.fromCodePoint(chars[0]) +
    String.fromCodePoint(chars[1]).repeat(inner) +
    String.fromCodePoint(chars[2]);
  const body =
    String.fromCodePoint(chars[3]) +
    " " +
    text.padEnd(inner - 2, " ") +
    " " +
    String.fromCodePoint(chars[4]);
  const bottom =
    String.fromCodePoint(chars[5]) +
    String.fromCodePoint(chars[6]).repeat(inner) +
    String.fromCodePoint(chars[7]);
  return `${top}\n${body}\n${bottom}`;
}

function starFrame(text: string): string {
  const inner = Math.max(text.length + 2, 6);
  const line =
    String.fromCodePoint(0x2605) +
    " " +
    String.fromCodePoint(0x2550).repeat(inner) +
    " " +
    String.fromCodePoint(0x2605);
  return `${line}\n${text}\n${line}`;
}

function diamondFrame(text: string): string {
  const inner = Math.max(text.length + 2, 6);
  const line =
    String.fromCodePoint(0x25c6) +
    " " +
    String.fromCodePoint(0x2501).repeat(inner) +
    " " +
    String.fromCodePoint(0x25c6);
  return `${line}\n${text}\n${line}`;
}

function chevronFrame(text: string): string {
  return (
    String.fromCodePoint(0x00bb) +
    String.fromCodePoint(0x00ab) +
    " " +
    text +
    " " +
    String.fromCodePoint(0x00bb) +
    String.fromCodePoint(0x00ab)
  );
}

/* -------------------------------------------------------------------------- *
 * Workspace.
 * -------------------------------------------------------------------------- */

/** Frame id -> frame builder. The frame names live in the component. */
const FRAME_BUILDERS: Record<string, (value: string) => string> = {
  none: (value) => value,
  double: (value) =>
    boxFrame(value, [0x2554, 0x2550, 0x2557, 0x2551, 0x2551, 0x255a, 0x2550, 0x2559]),
  rounded: (value) =>
    boxFrame(value, [0x256d, 0x2500, 0x256e, 0x2502, 0x2502, 0x2570, 0x2500, 0x256f]),
  single: (value) =>
    boxFrame(value, [0x250c, 0x2500, 0x2510, 0x2502, 0x2502, 0x2514, 0x2500, 0x2518]),
  heavy: (value) =>
    boxFrame(value, [0x259b, 0x2580, 0x259c, 0x258c, 0x2590, 0x2599, 0x2584, 0x259f]),
  stars: (value) => starFrame(value),
  diamonds: (value) => diamondFrame(value),
  chevrons: (value) => chevronFrame(value),
};

export function TextFontWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextFontWorkspace");
  const mode = MODE_BY_SLUG[slug] ?? "gallery";

  const [text, setText] = useState(tUi("fancyText"));
  const [styleId, setStyleId] = useState(DEFAULT_STYLE_BY_SLUG[slug] ?? "bold");
  const [search, setSearch] = useState("");
  const [frameId, setFrameId] = useState("none");
  const [keepWordOrder, setKeepWordOrder] = useState(false);
  const [glitchLevel, setGlitchLevel] = useState("medium");
  // The seeds start at a fixed value: a random initial value would differ
  // between the server render and the client render, which breaks hydration.
  // The Randomise button picks a new seed.
  const [glitchSeed, setGlitchSeed] = useState(1);
  const [zalgoLevel, setZalgoLevel] = useState("medium");
  const [zalgoSeed, setZalgoSeed] = useState(1);

  const styles = [
    { id: "bold", label: tUi("bold") },
    { id: "italic", label: tUi("italic") },
    { id: "bold-italic", label: tUi("boldItalic") },
    { id: "script", label: tUi("script") },
    { id: "bold-script", label: tUi("boldScript") },
    { id: "fraktur", label: tUi("fraktur") },
    { id: "double-struck", label: tUi("doubleStruck") },
    { id: "monospace", label: tUi("monospaceFullwidth") },
    { id: "fullwidth", label: tUi("fullwidth") },
    { id: "circled", label: tUi("circled") },
    { id: "squared", label: tUi("squared") },
    { id: "small-caps", label: tUi("smallCaps") },
    { id: "superscript", label: tUi("superscript") },
    { id: "subscript", label: tUi("subscript") },
    { id: "strikethrough", label: tUi("strikethrough") },
    { id: "underline", label: tUi("underline") },
    { id: "overline", label: tUi("overline") },
    { id: "slash", label: tUi("slash") },
    { id: "small-text", label: tUi("smallText") },
  ];

  const platforms = [
    { id: "instagram", name: tUi("instagram") },
    { id: "tiktok", name: tUi("tikTok") },
    { id: "x", name: tUi("xTwitter") },
    { id: "linkedin", name: tUi("linkedIn") },
    { id: "discord", name: tUi("discord") },
    { id: "whatsapp", name: tUi("whatsApp") },
  ];

  const frameOptions = [
    { id: "none", label: tUi("noFrame") },
    { id: "double", label: tUi("doubleLine") },
    { id: "rounded", label: tUi("roundedCorners") },
    { id: "single", label: tUi("singleLine") },
    { id: "heavy", label: tUi("heavyBlocks") },
    { id: "stars", label: tUi("stars") },
    { id: "diamonds", label: tUi("diamonds") },
    { id: "chevrons", label: tUi("chevrons") },
  ];

  const allowedIds = STYLE_IDS_BY_SLUG[slug];
  const visibleStyles = allowedIds
    ? styles.filter((entry) => allowedIds.includes(entry.id))
    : styles;

  const filteredStyles = visibleStyles.filter((entry) =>
    entry.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const styled = useMemo(() => renderStyle(text, styleId), [text, styleId]);
  const framed = (FRAME_BUILDERS[frameId] ?? FRAME_BUILDERS.none)(styled);

  const flipped = useMemo(
    () => flipText(text, keepWordOrder),
    [text, keepWordOrder],
  );
  const restored = useMemo(() => restoreFlipped(flipped), [flipped]);

  const glitched = useMemo(
    () => glitchText(text, GLITCH_LEVELS[glitchLevel] ?? 2, makeRandom(glitchSeed)),
    [text, glitchLevel, glitchSeed],
  );
  const zalgoed = useMemo(
    () => zalgoText(text, ZALGO_LEVELS[zalgoLevel] ?? 2, makeRandom(zalgoSeed)),
    [text, zalgoLevel, zalgoSeed],
  );

  const supportedCount = platforms.filter((entry) =>
    supportsStyle(styleId, entry.id),
  ).length;

  const galleryOutput = slug === "fancy-text-generator" ? framed : styled;

  return (
    <div className="space-y-4">
      {mode === "gallery" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("unicodeFonts")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={galleryOutput} label={tUi("copy")} />
              <DownloadButton
                filename="fancy-text.txt"
                content={galleryOutput}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="font-text">
              <TextArea
                id="font-text"
                value={text}
                onChange={setText}
                rows={5}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("featuredStyle")} htmlFor="font-style">
                <SelectInput
                  id="font-style"
                  value={styleId}
                  onChange={setStyleId}
                  options={visibleStyles.map((entry) => ({
                    value: entry.id,
                    label: entry.label,
                  }))}
                />
              </Field>
              {slug === "fancy-text-generator" && (
                <Field label={tUi("symbolFrame")} htmlFor="font-frame">
                  <SelectInput
                    id="font-frame"
                    value={frameId}
                    onChange={setFrameId}
                    options={frameOptions.map((entry) => ({
                      value: entry.id,
                      label: entry.label,
                    }))}
                  />
                </Field>
              )}
              <Field label={tUi("searchStyles")} htmlFor="font-search">
                <TextInput
                  id="font-search"
                  value={search}
                  onChange={setSearch}
                  placeholder={tUi("boldScriptCircled")}
                />
              </Field>
            </div>
          </TwoColumn>
          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <p className="whitespace-pre-wrap break-words text-3xl leading-relaxed text-slate-900 dark:text-white">
              {galleryOutput}
            </p>
          </div>
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
            {filteredStyles.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {entry.label}
                  </span>
                  <CopyButton
                    value={renderStyle(text, entry.id)}
                    label={tUi("copy")}
                  />
                </div>
                <p className="break-words text-xl leading-snug text-slate-900 dark:text-white">
                  {renderStyle(text, entry.id)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {platforms.map((entry2) => {
                    const ok = supportsStyle(entry.id, entry2.id);
                    return (
                      <span
                        key={entry2.id}
                        className={
                          ok
                            ? "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        }
                      >
                        {ok ? "✓" : "✕"} {entry2.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Note>
            <span>{tUi("plainUnicodeWorksInEveryPlainTextField")}</span>{" "}
            <span>
              {tUi("instagramTikTokAndWhatsAppDropTheMathematicalLetterBlock")}
            </span>{" "}
            <span>
              {tUi("markdownLikeBoldOnlyWorksWhereThePlatformSupportsIt")}
            </span>
          </Note>
        </Panel>
      )}

      {mode === "single" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("styledText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={styled} label={tUi("copy")} />
              <DownloadButton
                filename={`${slug}.txt`}
                content={styled}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="font-text">
              <TextArea
                id="font-text"
                value={text}
                onChange={setText}
                rows={5}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("style")} htmlFor="font-style">
                <SelectInput
                  id="font-style"
                  value={styleId}
                  onChange={setStyleId}
                  options={visibleStyles.map((entry) => ({
                    value: entry.id,
                    label: entry.label,
                  }))}
                />
              </Field>
              <StatGrid>
                <StatCard value={text.length} label={tUi("characters")} />
                <StatCard value={styled.length} label={tUi("outputCharacters")} />
                <StatCard value={visibleStyles.length} label={tUi("styles")} />
                <StatCard
                  value={supportedCount}
                  label={tUi("platformsSupported")}
                  tone="good"
                />
              </StatGrid>
            </div>
          </TwoColumn>
          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <p className="whitespace-pre-wrap break-words text-3xl leading-relaxed text-slate-900 dark:text-white">
              {styled}
            </p>
          </div>
          <div className="px-4 pb-4">
            <Field label={tUi("result")} htmlFor="font-result">
              <ResultBox id="font-result" value={styled} rows={6} />
            </Field>
          </div>
          <Note>
            <span>
              {tUi("thePreviewAboveShowsTheCharactersYourAudienceWillSee")}
            </span>{" "}
            <span>
              {tUi("plainUnicodeSurvivesACopyAndPasteIntoAnyTextField")}
            </span>
          </Note>
        </Panel>
      )}

      {mode === "upside" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("flippedText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={flipped} label={tUi("copy")} />
              <DownloadButton
                filename="upside-down-text.txt"
                content={flipped}
                mime="text/plain"
                label={tUi("download")}
              />
              <ActionButton
                onClick={() => setText(restoreFlipped(text))}
                title={tUi("turnFlippedTextBackIntoTheOriginal")}
              >
                {tUi("restoreFlippedText")}
              </ActionButton>
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="upside-text">
              <TextArea
                id="upside-text"
                value={text}
                onChange={setText}
                rows={5}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Checkbox
                id="upside-keep-order"
                checked={keepWordOrder}
                onChange={setKeepWordOrder}
                label={tUi("keepWordOrder")}
              />
              <StatGrid>
                <StatCard value={text.length} label={tUi("characters")} />
                <StatCard value={flipped.length} label={tUi("flippedCharacters")} />
                <StatCard value={text.split(/\s+/).filter(Boolean).length} label={tUi("words")} />
                <StatCard value={restored.length} label={tUi("restoredCharacters")} />
              </StatGrid>
            </div>
          </TwoColumn>
          <div className="px-4 pb-4">
            <Field label={tUi("flippedResult")} htmlFor="upside-result">
              <ResultBox id="upside-result" value={flipped} rows={6} />
            </Field>
          </div>
          <div className="border-t border-slate-200 px-4 pb-4 dark:border-slate-800">
            <Field label={tUi("restoredOriginal")} htmlFor="upside-restored">
              <ResultBox id="upside-restored" value={restored} rows={4} />
            </Field>
          </div>
          <Note>
            <span>{tUi("everyLetterIsRotated180DegreesAndTheOrderFlips")}</span>{" "}
            <span>{tUi("pasteFlippedTextBackInToRecoverTheOriginal")}</span>
          </Note>
        </Panel>
      )}

      {mode === "glitch" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("glitchText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={glitched} label={tUi("copy")} />
              <DownloadButton
                filename="glitch-text.txt"
                content={glitched}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="glitch-text">
              <TextArea
                id="glitch-text"
                value={text}
                onChange={setText}
                rows={5}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("intensity")} htmlFor="glitch-level">
                <SelectInput
                  id="glitch-level"
                  value={glitchLevel}
                  onChange={setGlitchLevel}
                  options={[
                    { value: "light", label: tUi("light") },
                    { value: "medium", label: tUi("medium") },
                    { value: "heavy", label: tUi("heavy") },
                  ]}
                />
              </Field>
              <ButtonGroup>
                <ActionButton
                  onClick={() =>
                    setText((prev) =>
                      shuffleChars(prev, makeRandom(Math.floor(Math.random() * 1e9))),
                    )
                  }
                >
                  {tUi("shuffle")}
                </ActionButton>
                <ActionButton
                  onClick={() => setGlitchSeed(Math.floor(Math.random() * 1e9))}
                >
                  {tUi("randomize")}
                </ActionButton>
              </ButtonGroup>
              <StatGrid>
                <StatCard value={text.length} label={tUi("characters")} />
                <StatCard value={glitched.length} label={tUi("glitchedCharacters")} />
                <StatCard value={glitchLevel} label={tUi("intensity")} tone="warn" />
                <StatCard value={glitchSeed % 9973} label={tUi("seed")} />
              </StatGrid>
            </div>
          </TwoColumn>
          <div className="px-4 pb-4">
            <Field label={tUi("glitchedResult")} htmlFor="glitch-result">
              <ResultBox id="glitch-result" value={glitched} rows={6} />
            </Field>
          </div>
          <Note>
            <span>{tUi("blockGlyphsAndLeetLettersReplacePartsOfYourText")}</span>{" "}
            <span>{tUi("randomizeRollsANewSeedShuffleReordersTheCharacters")}</span>
          </Note>
        </Panel>
      )}

      {mode === "zalgo" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("zalgoText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={zalgoed} label={tUi("copy")} />
              <DownloadButton
                filename="zalgo-text.txt"
                content={zalgoed}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="zalgo-text">
              <TextArea
                id="zalgo-text"
                value={text}
                onChange={setText}
                rows={5}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("intensity")} htmlFor="zalgo-level">
                <SelectInput
                  id="zalgo-level"
                  value={zalgoLevel}
                  onChange={setZalgoLevel}
                  options={[
                    { value: "off", label: tUi("off") },
                    { value: "light", label: tUi("light") },
                    { value: "medium", label: tUi("medium") },
                    { value: "heavy", label: tUi("heavy") },
                    { value: "extreme", label: tUi("extreme") },
                  ]}
                />
              </Field>
              <ButtonGroup>
                <ActionButton
                  onClick={() => setText((prev) => cleanZalgo(prev))}
                >
                  {tUi("cleanZalgoText")}
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    setText((prev) =>
                      shuffleChars(prev, makeRandom(Math.floor(Math.random() * 1e9))),
                    )
                  }
                >
                  {tUi("shuffle")}
                </ActionButton>
                <ActionButton
                  onClick={() => setZalgoSeed(Math.floor(Math.random() * 1e9))}
                >
                  {tUi("randomize")}
                </ActionButton>
              </ButtonGroup>
              <StatGrid>
                <StatCard value={text.length} label={tUi("characters")} />
                <StatCard value={zalgoed.length} label={tUi("zalgoCharacters")} />
                <StatCard value={zalgoLevel} label={tUi("intensity")} tone="warn" />
                <StatCard value={zalgoSeed % 9973} label={tUi("seed")} />
              </StatGrid>
            </div>
          </TwoColumn>
          <div className="px-4 pb-4">
            <Field label={tUi("zalgoResult")} htmlFor="zalgo-result">
              <ResultBox id="zalgo-result" value={zalgoed} rows={6} />
            </Field>
          </div>
          <Note>
            <span>{tUi("combiningMarksStackAboveAndBelowEveryCharacter")}</span>{" "}
            <span>{tUi("cleanZalgoTextRemovesTheMarksAgain")}</span>
          </Note>
        </Panel>
      )}
    </div>
  );
}
