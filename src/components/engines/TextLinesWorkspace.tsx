"use client";

/**
 * Dedicated workspace for the two line oriented tools.
 *
 * Slugs: alphabetical-order-tool, remove-duplicate-lines-and-sort.
 *
 * One textarea holds the buffer, one line per item. Every action rewrites
 * that buffer, and the counters show what the last action changed.
 * Sorting always goes through an Intl.Collator so accented characters and
 * numbers are ordered the way a reader expects.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Note,
  Panel,
  SectionTitle,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
} from "@/components/engines/TextKit";

type SortOptions = {
  caseInsensitive: boolean;
  natural: boolean;
  ignoreSpaces: boolean;
  keepDuplicateOrder: boolean;
};

/* ------------------------------------------------------------------ *
 * Pure helpers. They live outside the component so the i18n codemod
 * never has to touch them, and they never contain user visible text.
 * ------------------------------------------------------------------ */

/** Splits the buffer into lines, keeping a trailing newline out of the way. */
function splitBuffer(value: string): { lines: string[]; trailing: boolean } {
  const trailing = value.endsWith("\n");
  const body = trailing ? value.slice(0, -1) : value;
  return { lines: body.length ? body.split("\n") : [], trailing };
}

function joinBuffer(lines: string[], trailing: boolean): string {
  const joined = lines.join("\n");
  return trailing ? `${joined}\n` : joined;
}

function countLines(value: string): number {
  return splitBuffer(value).lines.length;
}

function sortLines(lines: string[], options: SortOptions, descending: boolean): string[] {
  const collator = new Intl.Collator(undefined, {
    numeric: options.natural,
    sensitivity: options.caseInsensitive ? "base" : "variant",
  });
  const direction = descending ? -1 : 1;
  const sortKey = (line: string) =>
    options.ignoreSpaces ? line.replace(/\s+/g, "") : line;
  return [...lines].sort((a, b) => {
    const primary = collator.compare(sortKey(a), sortKey(b));
    if (primary !== 0) return direction * primary;
    /* A stable sort keeps equal lines in their original order. */
    if (options.keepDuplicateOrder) return 0;
    const secondary = collator.compare(a, b);
    return secondary !== 0 ? direction * secondary : 0;
  });
}

function dedupeLines(lines: string[]): { unique: string[]; removed: number } {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    unique.push(line);
  }
  return { unique, removed: lines.length - unique.length };
}

function removeEmptyLines(lines: string[]): string[] {
  return lines.filter((line) => line.trim().length > 0);
}

function trimLines(lines: string[]): string[] {
  return lines.map((line) => line.trim());
}

function stripLineNumbers(lines: string[]): string[] {
  return lines.map((line) => line.replace(/^\s*\d+[.)]\s*/, ""));
}

function looksNumbered(lines: string[]): boolean {
  return lines.length > 0 && lines.every((line) => /^\s*\d+[.)]\s/.test(line));
}

/* ------------------------------------------------------------------ */

export function TextLinesWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextLinesWorkspace");
  const isDuplicateTool = slug === "remove-duplicate-lines-and-sort";
  const [text, setText] = useState("banana\napple\ncherry\napple\ndate");
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [natural, setNatural] = useState(false);
  const [ignoreSpaces, setIgnoreSpaces] = useState(false);
  const [keepDuplicateOrder, setKeepDuplicateOrder] = useState(true);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [lastAction, setLastAction] = useState<{ before: number; after: number } | null>(null);
  const sampleRef = useRef(text);

  const options = useMemo<SortOptions>(
    () => ({ caseInsensitive, natural, ignoreSpaces, keepDuplicateOrder }),
    [caseInsensitive, natural, ignoreSpaces, keepDuplicateOrder],
  );

  /* The duplicate tool removes repeated lines while the user types, so the
     buffer never keeps a copy it is going to drop anyway. The sample that
     loads with the tool is left untouched. */
  useEffect(() => {
    if (!isDuplicateTool) return;
    if (text === sampleRef.current) return;
    const timer = setTimeout(() => {
      const { lines, trailing } = splitBuffer(text);
      const { unique, removed } = dedupeLines(lines);
      if (removed > 0) {
        setText(joinBuffer(unique, trailing));
        setDuplicatesRemoved(removed);
        setLastAction({ before: lines.length, after: unique.length });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [text, isDuplicateTool]);

  const { lines, trailing } = splitBuffer(text);
  const afterCount = lines.length;
  const beforeCount = lastAction ? lastAction.before : afterCount;
  const isNumbered = looksNumbered(lines);

  const handleChange = (value: string) => {
    setText(value);
    setLastAction(null);
  };

  const handleClear = () => {
    setText("");
    setLastAction(null);
    setDuplicatesRemoved(0);
  };

  const replaceBuffer = (next: string, before: number, after: number) => {
    setText(next);
    setLastAction({ before, after });
  };

  const handleSort = (descending: boolean) => {
    const sorted = sortLines(lines, options, descending);
    replaceBuffer(joinBuffer(sorted, trailing), lines.length, sorted.length);
  };

  const handleRemoveDuplicates = () => {
    const { unique, removed } = dedupeLines(lines);
    replaceBuffer(joinBuffer(unique, trailing), lines.length, unique.length);
    setDuplicatesRemoved(removed);
  };

  const handleRemoveDuplicatesAndSort = () => {
    const { unique } = dedupeLines(lines);
    const sorted = sortLines(unique, options, false);
    replaceBuffer(joinBuffer(sorted, trailing), lines.length, sorted.length);
  };

  const handleRemoveEmpty = () => {
    const kept = removeEmptyLines(lines);
    replaceBuffer(joinBuffer(kept, trailing), lines.length, kept.length);
  };

  const handleTrim = () => {
    const trimmed = trimLines(lines);
    replaceBuffer(joinBuffer(trimmed, trailing), lines.length, trimmed.length);
  };

  const handleReverse = () => {
    const reversed = [...lines].reverse();
    replaceBuffer(joinBuffer(reversed, trailing), lines.length, reversed.length);
  };

  const handleAddNumbers = () => {
    const numbered = lines.map((line, index) => `${index + 1}. ${line}`);
    replaceBuffer(joinBuffer(numbered, trailing), lines.length, numbered.length);
  };

  const handleRemoveNumbers = () => {
    const stripped = stripLineNumbers(lines);
    replaceBuffer(joinBuffer(stripped, trailing), lines.length, stripped.length);
  };

  const sortButtons = (
    <div>
      <SectionTitle>{tUi("sort")}</SectionTitle>
      <ButtonGroup>
        <ActionButton onClick={() => handleSort(false)} variant={isDuplicateTool ? "default" : "primary"}>{tUi("sortAToZ")}</ActionButton>
        <ActionButton onClick={() => handleSort(true)}>{tUi("sortZToA")}</ActionButton>
      </ButtonGroup>
    </div>
  );

  const cleanUpButtons = (
    <div>
      <SectionTitle>{tUi("cleanUp")}</SectionTitle>
      <ButtonGroup>
        <ActionButton onClick={handleRemoveDuplicates} variant={isDuplicateTool ? "primary" : "default"}>{tUi("removeDuplicates")}</ActionButton>
        {isDuplicateTool ? (
          <ActionButton onClick={handleRemoveDuplicatesAndSort}>{tUi("removeDuplicatesAndSort")}</ActionButton>
        ) : null}
        <ActionButton onClick={handleRemoveEmpty}>{tUi("removeEmptyLines")}</ActionButton>
        <ActionButton onClick={handleTrim}>{tUi("trimWhitespace")}</ActionButton>
        <ActionButton onClick={handleReverse}>{tUi("reverseLines")}</ActionButton>
        <ActionButton onClick={handleAddNumbers} disabled={isNumbered}>{tUi("addLineNumbers")}</ActionButton>
        <ActionButton onClick={handleRemoveNumbers} disabled={!isNumbered}>{tUi("removeLineNumbers")}</ActionButton>
      </ButtonGroup>
    </div>
  );

  return (
    <Panel>
      <Toolbar>
        <SectionTitle>{tUi("textLines")}</SectionTitle>
        <ButtonGroup>
          <ActionButton onClick={handleClear}>{tUi("clear")}</ActionButton>
        </ButtonGroup>
      </Toolbar>

      <TextArea
        id="text-lines-input"
        value={text}
        onChange={handleChange}
        rows={14}
        placeholder={tUi("typeOrPasteOneItemPerLine")}
      />

      <StatGrid>
        <StatCard value={beforeCount} label={tUi("linesBefore")} />
        <StatCard value={afterCount} label={tUi("linesAfter")} />
        <StatCard
          value={duplicatesRemoved}
          label={tUi("duplicatesRemoved")}
          tone={duplicatesRemoved > 0 ? "warn" : "default"}
        />
      </StatGrid>

      <div className="space-y-4 p-4">
        {isDuplicateTool ? (
          <>
            {cleanUpButtons}
            {sortButtons}
          </>
        ) : (
          <>
            {sortButtons}
            {cleanUpButtons}
          </>
        )}

        <div>
          <SectionTitle>{tUi("options")}</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox
              id="lines-case-insensitive"
              checked={caseInsensitive}
              onChange={setCaseInsensitive}
              label={tUi("caseInsensitiveSort")}
            />
            <Checkbox
              id="lines-natural"
              checked={natural}
              onChange={setNatural}
              label={tUi("naturalSort")}
            />
            <Checkbox
              id="lines-ignore-spaces"
              checked={ignoreSpaces}
              onChange={setIgnoreSpaces}
              label={tUi("ignoreSpacesWhenSorting")}
            />
            <Checkbox
              id="lines-keep-duplicate-order"
              checked={keepDuplicateOrder}
              onChange={setKeepDuplicateOrder}
              label={tUi("keepOriginalOrderOfDuplicates")}
            />
          </div>
        </div>
      </div>

      <Toolbar>
        <ButtonGroup>
          <CopyButton value={text} label={tUi("copy")} />
          <DownloadButton
            filename={`${slug}.txt`}
            content={text}
            mime="text/plain"
            label={tUi("download")}
          />
        </ButtonGroup>
      </Toolbar>

      <Note>{tUi("eachLineIsTreatedAsOneItem")}</Note>
    </Panel>
  );
}
