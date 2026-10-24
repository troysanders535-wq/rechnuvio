"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Note,
  NumberInput,
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
 * Transformation data and pure helpers. No interface text in this block.
 * -------------------------------------------------------------------------- */

/** Vertical mirror counterparts. Everything else passes through untouched. */
const MIRROR_MAP: Record<string, string> = {
  b: "d",
  d: "b",
  p: "q",
  q: "p",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "/": "\\",
  A: "A",
  H: "H",
  I: "I",
  M: "W",
  W: "M",
  O: "O",
  T: "T",
  U: "U",
  V: "V",
  X: "X",
  Y: "Y",
  m: "m",
};

type InvisibleHit = {
  index: number;
  code: number;
  char: string;
  name: string;
};

/** Reverse every character, keeping code points (emoji) intact. */
function reverseChars(text: string): string {
  return [...text].reverse().join("");
}

/** Reverse the order of the words while keeping the separators in place. */
function reverseWordOrder(text: string): string {
  const parts = text.split(/(\s+)/);
  const words = parts.filter((part) => part.trim() !== "");
  words.reverse();
  let cursor = 0;
  return parts
    .map((part) => (part.trim() === "" ? part : words[cursor++]))
    .join("");
}

/** Reverse the characters of every word, keeping the word order. */
function reverseEachWord(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => (part.trim() === "" ? part : reverseChars(part)))
    .join("");
}

/** Mirror every character, then reverse the string. */
function mirrorText(text: string): string {
  return reverseChars(
    [...text].map((char) => MIRROR_MAP[char] ?? char).join(""),
  );
}

/** Repeat text, optionally numbering every repetition. */
function repeatText(
  text: string,
  count: number,
  separator: string,
  numbered: boolean,
  maxLength: number,
): string {
  const items: string[] = [];
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const piece = numbered ? `${i + 1}. ${text}` : text;
    total += piece.length + separator.length;
    if (total > maxLength) break;
    items.push(piece);
  }
  return items.join(separator);
}

/** Build blank text from a repeated invisible character. */
function buildBlankText(code: number, count: number, lines: number): string {
  const char = String.fromCodePoint(code);
  return char.repeat(Math.max(count, 0)) + "\n".repeat(Math.max(lines, 0));
}

/** Code point in the U+XXXX form. */
function formatCodePoint(code: number): string {
  return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Find every invisible character in the text and describe where it is. */
function detectInvisible(
  text: string,
  nameFor: (code: number) => string | null,
): InvisibleHit[] {
  const hits: InvisibleHit[] = [];
  let index = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const name = nameFor(code);
    if (name) hits.push({ index, code, char, name });
    index += 1;
  }
  return hits;
}

/* -------------------------------------------------------------------------- *
 * Workspace.
 * -------------------------------------------------------------------------- */

export function TextTransformWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextTransformWorkspace");
  const [text, setText] = useState(tUi("helloWorld"));
  const [mode, setMode] = useState("all");
  const [count, setCount] = useState(5);
  const [separatorId, setSeparatorId] = useState("space");
  const [customSeparator, setCustomSeparator] = useState(" ");
  const [numbered, setNumbered] = useState(false);
  const [charCount, setCharCount] = useState(10);
  const [lineCount, setLineCount] = useState(0);
  const [blankTypeId, setBlankTypeId] = useState("hangul");
  const [scanText, setScanText] = useState("");

  const blankTypes = [
    { id: "zwsp", label: tUi("zeroWidthSpaceU200B"), code: 0x200b },
    { id: "braille", label: tUi("brailleBlankU2800"), code: 0x2800 },
    { id: "hangul", label: tUi("hangulFillerU3164"), code: 0x3164 },
    { id: "wordjoiner", label: tUi("wordJoinerU2060"), code: 0x2060 },
    { id: "zwnj", label: tUi("invisibleCharacterU200C"), code: 0x200c },
  ];

  const invisibleItems = [
    { code: 0x200b, name: tUi("zeroWidthSpace") },
    { code: 0x200c, name: tUi("zeroWidthNonJoiner") },
    { code: 0x200d, name: tUi("zeroWidthJoiner") },
    { code: 0x2060, name: tUi("wordJoiner") },
    { code: 0xfeff, name: tUi("zeroWidthNoBreakSpace") },
    { code: 0x00ad, name: tUi("softHyphen") },
    { code: 0x2800, name: tUi("brailleBlank") },
    { code: 0x3164, name: tUi("hangulFiller") },
    { code: 0x034f, name: tUi("combiningGraphemeJoiner") },
    { code: 0x180e, name: tUi("mongolianVowelSeparator") },
  ];

  const combiningItem = { code: 0x0300, name: tUi("combiningDiacriticalMark") };

  const backwards =
    mode === "all"
      ? reverseChars(text)
      : mode === "words"
        ? reverseWordOrder(text)
        : mode === "each"
          ? reverseEachWord(text)
          : mirrorText(text);

  const baseSeparator =
    separatorId === "none"
      ? ""
      : separatorId === "space"
        ? " "
        : separatorId === "newline"
          ? "\n"
          : separatorId === "comma"
            ? ","
            : customSeparator;

  const separator = numbered ? "\n" : baseSeparator;
  const estimatedLength = count * (text.length + 8);
  const tooLarge = estimatedLength > 200000;
  const repeated = useMemo(
    () => repeatText(text, count, separator, numbered, 200000),
    [text, count, separator, numbered],
  );

  const blankType = blankTypes.find((entry) => entry.id === blankTypeId);
  const blank = buildBlankText(blankType?.code ?? 0x3164, charCount, lineCount);

  const hits = detectInvisible(scanText, (code) => {
    const item = invisibleItems.find((entry) => entry.code === code);
    if (item) return item.name;
    if (code >= 0x0300 && code <= 0x036f) return combiningItem.name;
    return null;
  });

  const emojiCount = [...text].filter((char) => (char.codePointAt(0) ?? 0) > 0xffff).length;

  return (
    <div className="space-y-4">
      {slug === "backwards-text-generator" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("backwardsText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={backwards} label={tUi("copy")} />
              <DownloadButton
                filename="backwards-text.txt"
                content={backwards}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="backwards-text">
              <TextArea
                id="backwards-text"
                value={text}
                onChange={setText}
                rows={6}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("mode")} htmlFor="backwards-mode">
                <SelectInput
                  id="backwards-mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "all", label: tUi("reverseAllCharacters") },
                    { value: "words", label: tUi("reverseWordOrder") },
                    { value: "each", label: tUi("reverseEachWord") },
                    { value: "mirror", label: tUi("mirrorUpsideDownMirror") },
                  ]}
                />
              </Field>
              <StatGrid>
                <StatCard value={text.length} label={tUi("characters")} />
                <StatCard value={backwards.length} label={tUi("outputCharacters")} />
                <StatCard
                  value={text.split(/\s+/).filter(Boolean).length}
                  label={tUi("words")}
                />
                <StatCard value={emojiCount} label={tUi("emojiKept")} tone="good" />
              </StatGrid>
            </div>
          </TwoColumn>
          <div className="px-4 pb-4">
            <Field label={tUi("result")} htmlFor="backwards-result">
              <ResultBox id="backwards-result" value={backwards} rows={6} />
            </Field>
          </div>
          <Note>
            <span>{tUi("emojiAndAccentedLettersStayIntact")}</span>{" "}
            <span>{tUi("mirrorFlipsTheCharactersAndThenReversesTheString")}</span>
          </Note>
        </Panel>
      )}

      {slug === "text-repeater" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("repeatedText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={repeated} label={tUi("copy")} />
              <DownloadButton
                filename="repeated-text.txt"
                content={repeated}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <Field label={tUi("yourText")} htmlFor="repeat-text">
              <TextArea
                id="repeat-text"
                value={text}
                onChange={setText}
                rows={4}
                placeholder={tUi("typeYourTextHere")}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label={tUi("repeatCount")} htmlFor="repeat-count">
                <NumberInput
                  id="repeat-count"
                  value={count}
                  onChange={setCount}
                  min={1}
                  max={10000}
                />
              </Field>
              <Field label={tUi("separator")} htmlFor="repeat-separator">
                <SelectInput
                  id="repeat-separator"
                  value={separatorId}
                  onChange={setSeparatorId}
                  options={[
                    { value: "none", label: tUi("none") },
                    { value: "space", label: tUi("space") },
                    { value: "newline", label: tUi("newLine") },
                    { value: "comma", label: tUi("comma") },
                    { value: "custom", label: tUi("custom") },
                  ]}
                />
              </Field>
              {separatorId === "custom" && (
                <Field label={tUi("customSeparator")} htmlFor="repeat-custom">
                  <TextInput
                    id="repeat-custom"
                    value={customSeparator}
                    onChange={setCustomSeparator}
                    placeholder={tUi("typeASeparator")}
                  />
                </Field>
              )}
              <Checkbox
                id="repeat-numbered"
                checked={numbered}
                onChange={setNumbered}
                label={tUi("numberEachRepetition")}
              />
            </div>
          </TwoColumn>
          {tooLarge && (
            <div className="border-t border-slate-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-300">
              {tUi("thisOutputIsVeryLargeThePreviewStopsEarly")}
            </div>
          )}
          <div className="px-4 pb-4">
            <Field label={tUi("result")} htmlFor="repeat-result">
              <ResultBox id="repeat-result" value={repeated} rows={8} />
            </Field>
          </div>
          <Note>
            <span>{tUi("numberedRepetitionsAreAlwaysPlacedOnSeparateLines")}</span>{" "}
            <span>{tUi("useACustomSeparatorForSymbolsSuchAsOr")}</span>
          </Note>
        </Panel>
      )}

      {slug === "blank-text-generator" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("blankText")}</SectionTitle>
            <ButtonGroup>
              <CopyButton value={blank} label={tUi("copy")} />
              <DownloadButton
                filename="blank-text.txt"
                content={blank}
                mime="text/plain"
                label={tUi("download")}
              />
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <div className="flex flex-col gap-3">
              <Field label={tUi("characterCount")} htmlFor="blank-count">
                <NumberInput
                  id="blank-count"
                  value={charCount}
                  onChange={setCharCount}
                  min={0}
                  max={5000}
                />
              </Field>
              <Field label={tUi("blankLines")} htmlFor="blank-lines">
                <NumberInput
                  id="blank-lines"
                  value={lineCount}
                  onChange={setLineCount}
                  min={0}
                  max={200}
                />
              </Field>
              <Field label={tUi("codePoint")} htmlFor="blank-code">
                <p
                  id="blank-code"
                  className="rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 dark:border-slate-700"
                >
                  {formatCodePoint(blankType?.code ?? 0x3164)}
                </p>
              </Field>
            </div>
            <Field label={tUi("characterType")} htmlFor="blank-type">
              <SelectInput
                id="blank-type"
                value={blankTypeId}
                onChange={setBlankTypeId}
                options={blankTypes.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                }))}
              />
            </Field>
          </TwoColumn>
          <div className="px-4 pb-4">
            <Field label={tUi("result")} htmlFor="blank-result">
              <ResultBox id="blank-result" value={blank} rows={6} />
            </Field>
          </div>
          <Note>
            <span>{tUi("theResultLooksEmptyBecauseTheCharactersAreInvisible")}</span>{" "}
            <span>{tUi("copyTheCodePointToPasteTheSameCharacterYourself")}</span>
          </Note>
        </Panel>
      )}

      {slug === "invisible-character" && (
        <div className="space-y-4">
          <Panel>
            <Toolbar>
              <SectionTitle>{tUi("invisibleCharacters")}</SectionTitle>
            </Toolbar>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {invisibleItems.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 font-mono text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {String.fromCodePoint(item.code)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {item.name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {formatCodePoint(item.code)}
                    </p>
                  </div>
                  <CopyButton
                    value={String.fromCodePoint(item.code)}
                    label={tUi("copy")}
                  />
                </div>
              ))}
            </div>
            <Note>
              <span>{tUi("theseCharactersTakeUpNoVisibleSpaceWhenPasted")}</span>{" "}
              <span>{tUi("useThemForEmptyNamesBiosAndMessages")}</span>
            </Note>
          </Panel>
          <Panel>
            <Toolbar>
              <SectionTitle>{tUi("hiddenCharacterDetector")}</SectionTitle>
            </Toolbar>
            <TwoColumn>
              <Field label={tUi("pasteTextToScan")} htmlFor="invisible-scan">
                <TextArea
                  id="invisible-scan"
                  value={scanText}
                  onChange={setScanText}
                  rows={6}
                  placeholder={tUi("pasteTextHere")}
                />
              </Field>
              <div className="flex flex-col gap-3">
                <StatGrid>
                  <StatCard
                    value={hits.length}
                    label={tUi("invisibleCharacters")}
                    tone={hits.length > 0 ? "warn" : "good"}
                  />
                </StatGrid>
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {hits.map((hit) => (
                    <li
                      key={`${hit.index}-${hit.code}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {`Index ${hit.index}`}
                      </span>
                      <span className="font-mono text-slate-500">
                        {formatCodePoint(hit.code)}
                      </span>
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {hit.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </TwoColumn>
            <Note>
              <span>
                {tUi("theScannerLooksForZeroWidthCharactersAndCombiningMarks")}
              </span>
            </Note>
          </Panel>
        </div>
      )}
    </div>
  );
}
