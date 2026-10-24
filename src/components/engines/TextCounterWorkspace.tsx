"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  Field,
  Note,
  Panel,
  SectionTitle,
  StatCard,
  StatGrid,
  TextArea,
  TextInput,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

type CounterStats = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  uniqueWords: number;
  readingTime: number;
  speakingTime: number;
  estimatedTokens: number;
  utf8Bytes: number;
  graphemes: number;
};

type FrequencyRow = {
  key: string;
  display: string;
  count: number;
  percent: number;
};

function computeStats(text: string): CounterStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const sentences = trimmed ? (text.match(/[.!?]+(?:\s+|$)/g) || []).length : 0;
  const paragraphs = trimmed
    ? text.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length
    : 0;
  const lines = text ? text.split("\n").length : 0;
  const uniqueWords = new Set(words.map((word) => word.toLowerCase())).size;
  return {
    words: words.length,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    uniqueWords,
    readingTime: Math.ceil(words.length / 200),
    speakingTime: Math.ceil(words.length / 130),
    estimatedTokens: Math.ceil(characters / 4),
    utf8Bytes: new TextEncoder().encode(text).length,
    graphemes: Array.from(text).length,
  };
}

function computeFrequency(
  text: string,
  ignoreCommonWords: boolean,
  commonWords: string[]
): FrequencyRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const stopWords = ignoreCommonWords ? new Set(commonWords) : null;
  const groups = new Map<string, { count: number; variants: Map<string, number> }>();
  let totalWords = 0;
  for (const raw of trimmed.split(/\s+/)) {
    totalWords += 1;
    const key = raw.toLowerCase();
    if (stopWords && stopWords.has(key)) continue;
    let group = groups.get(key);
    if (!group) {
      group = { count: 0, variants: new Map<string, number>() };
      groups.set(key, group);
    }
    group.count += 1;
    group.variants.set(raw, (group.variants.get(raw) ?? 0) + 1);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([key, group]) => {
      let display = key;
      let best = 0;
      group.variants.forEach((count, variant) => {
        if (count > best) {
          best = count;
          display = variant;
        }
      });
      const percent =
        totalWords > 0 ? Math.round((group.count / totalWords) * 1000) / 10 : 0;
      return { key, display, count: group.count, percent };
    });
}

function buildSummary(stats: CounterStats, includeStringDetail: boolean): string {
  const lines = [
    `Words: ${stats.words}`,
    `Characters (with spaces): ${stats.characters}`,
    `Characters (without spaces): ${stats.charactersNoSpaces}`,
    `Sentences: ${stats.sentences}`,
    `Paragraphs: ${stats.paragraphs}`,
    `Lines: ${stats.lines}`,
    `Unique words: ${stats.uniqueWords}`,
    `Estimated tokens: ${stats.estimatedTokens}`,
    `Reading time: ${stats.readingTime} min`,
    `Speaking time: ${stats.speakingTime} min`,
  ];
  if (includeStringDetail) {
    lines.push(`UTF-8 bytes: ${stats.utf8Bytes}`, `Graphemes: ${stats.graphemes}`);
  }
  return lines.join("\n");
}

export function TextCounterWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextCounterWorkspace");
  const [text, setText] = useState("");
  const [ignoreCommonWords, setIgnoreCommonWords] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(
    null
  );

  const isWordCounter = slug === "word-counter";
  const isCharacterCounter = slug === "character-counter";
  const isStringLength = slug === "string-length-calculator";
  const showSeoChecks = isWordCounter || isCharacterCounter;
  // The slug decides which supporting panel leads the page.
  const seoOrder = isCharacterCounter ? "order-1" : "order-2";
  const frequencyOrder = isCharacterCounter ? "order-2" : "order-1";

  const commonWords = useMemo(
    () => [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "is",
      "are",
      "was",
      "were",
      "it",
      "this",
      "that",
      "as",
      "by",
      "from",
      "be",
      "has",
      "have",
      "not",
      "they",
      "you",
      "your",
      "we",
      "our",
    ],
    []
  );

  const stats = useMemo(() => computeStats(text), [text]);
  const frequency = useMemo(
    () => computeFrequency(text, ignoreCommonWords, commonWords),
    [text, ignoreCommonWords, commonWords]
  );
  const summary = useMemo(
    () => buildSummary(stats, isStringLength),
    [stats, isStringLength]
  );
  const metaTitleOk = metaTitle.length >= 50 && metaTitle.length <= 60;
  const metaDescriptionOk =
    metaDescription.length >= 150 && metaDescription.length <= 160;
  const maxLength = Math.max(stats.characters, stats.charactersNoSpaces, 1);
  const withSpacesPercent =
    Math.round((stats.characters / maxLength) * 1000) / 10;
  const withoutSpacesPercent =
    Math.round((stats.charactersNoSpaces / maxLength) * 1000) / 10;

  const readSelection = useCallback((event: React.SyntheticEvent) => {
    const target = event.target as HTMLTextAreaElement | null;
    if (
      !target ||
      typeof target.selectionStart !== "number" ||
      typeof target.selectionEnd !== "number"
    ) {
      return;
    }
    if (target.selectionEnd <= target.selectionStart) {
      setSelection(null);
      return;
    }
    setSelection({ start: target.selectionStart, end: target.selectionEnd });
  }, []);

  const selectionStats = useMemo(() => {
    if (!selection) return null;
    const slice = text.slice(selection.start, selection.end);
    const trimmed = slice.trim();
    return {
      characters: slice.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
    };
  }, [selection, text]);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <Toolbar>
          <ButtonGroup>
            <ActionButton onClick={() => setText("")} title={tUi("clearTheText")}>
              {tUi("clear")}
            </ActionButton>
          </ButtonGroup>
          <ButtonGroup>
            <CopyButton
              value={summary}
              label={tUi("copy")}
              title={tUi("copyTheStatisticsSummary")}
            />
          </ButtonGroup>
        </Toolbar>

        <div
          onMouseUp={readSelection}
          onKeyUp={readSelection}
          onSelect={readSelection}
        >
          <TextArea
            id="counter-text"
            value={text}
            onChange={setText}
            rows={10}
            placeholder={tUi("typeOrPasteYourTextHere")}
          />
        </div>

        <StatGrid>
          <StatCard value={stats.words} label={tUi("words")} />
          <StatCard value={stats.characters} label={tUi("charactersWithSpaces")} />
          <StatCard
            value={stats.charactersNoSpaces}
            label={tUi("charactersWithoutSpaces")}
          />
          <StatCard value={stats.sentences} label={tUi("sentences")} />
          <StatCard value={stats.paragraphs} label={tUi("paragraphs")} />
          <StatCard value={stats.lines} label={tUi("lines")} />
          <StatCard value={stats.uniqueWords} label={tUi("uniqueWords")} />
          <StatCard value={stats.estimatedTokens} label={tUi("estimatedTokens")} />
          <StatCard value={stats.readingTime} label={tUi("readingTimeMin")} />
          <StatCard value={stats.speakingTime} label={tUi("speakingTimeMin")} />
        </StatGrid>

        {selectionStats ? (
          <div className="border-b border-slate-200 bg-sky-50 px-4 py-2 text-xs text-sky-800 dark:border-slate-800 dark:bg-sky-950/40 dark:text-sky-300">
            <span className="font-semibold">{tUi("selectedText")}</span>
            <span className="ml-2">{selectionStats.words} words</span>
            <span className="ml-2">{selectionStats.characters} characters</span>
          </div>
        ) : null}

        <Note>{tUi("statisticsUpdateLiveAsYouType")}</Note>
      </Panel>

      {isStringLength ? (
        <Panel className="order-1">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SectionTitle>{tUi("stringLengthDetail")}</SectionTitle>
          </div>
          <StatGrid>
            <StatCard value={stats.utf8Bytes} label={tUi("uTF8Bytes")} />
            <StatCard value={stats.graphemes} label={tUi("graphemesCodePoints")} />
            <StatCard
              value={stats.characters - stats.charactersNoSpaces}
              label={tUi("spaceCharacters")}
            />
            <StatCard
              value={stats.charactersNoSpaces}
              label={tUi("nonSpaceCharacters")}
            />
          </StatGrid>
          <div className="space-y-3 p-4">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>{tUi("withSpaces")}</span>
                <span>{stats.characters}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${withSpacesPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>{tUi("withoutSpaces")}</span>
                <span>{stats.charactersNoSpaces}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-300 dark:bg-sky-700"
                  style={{ width: `${withoutSpacesPercent}%` }}
                />
              </div>
            </div>
          </div>
          <Note>{tUi("graphemesAreCountedByUnicodeCodePoint")}</Note>
        </Panel>
      ) : null}

      {showSeoChecks ? (
        <Panel className={seoOrder}>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SectionTitle>{tUi("sEOLengthChecks")}</SectionTitle>
          </div>
          <StatGrid>
            <StatCard
              value={metaTitle.length}
              label={tUi("metaTitleLength")}
              tone={metaTitleOk ? "good" : "warn"}
            />
            <StatCard value="50-60" label={tUi("recommendedTitleLength")} />
            <StatCard
              value={metaDescription.length}
              label={tUi("metaDescriptionLength")}
              tone={metaDescriptionOk ? "good" : "warn"}
            />
            <StatCard
              value="150-160"
              label={tUi("recommendedDescriptionLength")}
            />
          </StatGrid>
          <TwoColumn>
            <div>
              <Field label={tUi("metaTitle")} htmlFor="counter-meta-title">
                <TextInput
                  id="counter-meta-title"
                  value={metaTitle}
                  onChange={setMetaTitle}
                  placeholder={tUi("yourPageTitle")}
                />
              </Field>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {metaTitleOk ? tUi("goodLengthForSearchResults") : metaTitle.length < 50 ? tUi("tooShortAimFor50To60Characters") : tUi("tooLongAimFor50To60Characters")}
              </p>
            </div>
            <div>
              <Field label={tUi("metaDescription")} htmlFor="counter-meta-description">
                <TextInput
                  id="counter-meta-description"
                  value={metaDescription}
                  onChange={setMetaDescription}
                  placeholder={tUi("yourPageDescription")}
                />
              </Field>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {metaDescriptionOk ? tUi("goodLengthForSearchResults") : metaDescription.length < 150 ? tUi("tooShortAimFor150To160Characters") : tUi("tooLongAimFor150To160Characters")}
              </p>
            </div>
          </TwoColumn>
          <Note>{tUi("titlesRenderInFullUpToAbout60Characters")}</Note>
          <Note>{tUi("descriptionsAreTruncatedPastAbout160Characters")}</Note>
        </Panel>
      ) : null}

      <Panel className={frequencyOrder}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
          <SectionTitle>{tUi("wordFrequency")}</SectionTitle>
          <Checkbox
            id="counter-ignore-common-words"
            checked={ignoreCommonWords}
            onChange={setIgnoreCommonWords}
            label={tUi("ignoreCommonWords")}
          />
        </div>
        {frequency.length === 0 ? (
          <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
            {tUi("typeSomeTextToSeeTheMostFrequentWords")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">{tUi("word")}</th>
                  <th className="px-4 py-2 font-semibold">{tUi("count")}</th>
                  <th className="px-4 py-2 font-semibold">{tUi("share")}</th>
                </tr>
              </thead>
              <tbody>
                {frequency.map((row) => (
                  <tr
                    key={row.key}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="px-4 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                      {row.display}
                    </td>
                    <td className="px-4 py-1.5 text-slate-600 dark:text-slate-300">
                      {row.count}
                    </td>
                    <td className="px-4 py-1.5 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <span
                            className="block h-full rounded-full bg-sky-500"
                            style={{ width: `${Math.min(100, row.percent)}%` }}
                          />
                        </span>
                        {row.percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Note>{tUi("top20WordsByCountWithEachWordShareOfAllWords")}</Note>
      </Panel>
    </div>
  );
}
