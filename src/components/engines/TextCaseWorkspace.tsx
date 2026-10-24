"use client";

/**
 * Dedicated workspace for the four case-conversion tools.
 *
 * Slugs: uppercase-converter, lowercase-converter, title-case-converter,
 *        text-case-converter.
 *
 * The workspace is selection aware: when the caret covers a range of the
 * input, a conversion only rewrites that range and leaves the surrounding
 * text untouched. Without a selection the whole input is converted.
 *
 * The result is derived live from the input, so the preview always shows
 * what the currently selected case button produces.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  CopyButton,
  Note,
  Panel,
  ResultBox,
  SectionTitle,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
} from "@/components/engines/TextKit";

type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "kebab"
  | "snake"
  | "constant"
  | "alternate";

/* ------------------------------------------------------------------ *
 * Pure helpers. They live outside the component so the i18n codemod
 * never has to touch them, and they never contain user visible text.
 * ------------------------------------------------------------------ */

function splitWords(value: string): string[] {
  return value.split(/[\s_-]+/).filter(Boolean);
}

function toTitleCase(value: string): string {
  return value.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function toSentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function toCamelCase(value: string): string {
  return splitWords(value)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

function toPascalCase(value: string): string {
  return splitWords(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toKebabCase(value: string): string {
  return splitWords(value)
    .map((word) => word.toLowerCase())
    .join("-");
}

function toSnakeCase(value: string): string {
  return splitWords(value)
    .map((word) => word.toLowerCase())
    .join("_");
}

function toConstantCase(value: string): string {
  return splitWords(value)
    .map((word) => word.toUpperCase())
    .join(" ");
}

function toAlternateCase(value: string): string {
  let index = 0;
  return value.replace(/\S/g, (char) => {
    const upper = index % 2 === 1;
    index += 1;
    return upper ? char.toUpperCase() : char.toLowerCase();
  });
}

const CONVERTERS: Record<CaseId, (value: string) => string> = {
  upper: (value) => value.toUpperCase(),
  lower: (value) => value.toLowerCase(),
  title: toTitleCase,
  sentence: toSentenceCase,
  camel: toCamelCase,
  pascal: toPascalCase,
  kebab: toKebabCase,
  snake: toSnakeCase,
  constant: toConstantCase,
  alternate: toAlternateCase,
};

/** Converts the selected range only, or the whole value when nothing is selected. */
function applyToSelection(
  value: string,
  start: number,
  end: number,
  convert: (input: string) => string,
): string {
  if (start >= 0 && end > start && end <= value.length) {
    return value.slice(0, start) + convert(value.slice(start, end)) + value.slice(end);
  }
  return convert(value);
}

function countLines(value: string): number {
  if (!value) return 0;
  const body = value.endsWith("\n") ? value.slice(0, -1) : value;
  return body.length ? body.split("\n").length : 0;
}

function collectStats(value: string) {
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const sentences = trimmed
    ? trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0).length
    : 0;
  const paragraphs = trimmed
    ? trimmed.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length
    : 0;
  return {
    words,
    characters: value.length,
    charactersNoSpaces: value.replace(/\s/g, "").length,
    sentences,
    paragraphs,
    lines: countLines(value),
    readingTime: words ? Math.ceil(words / 200) : 0,
  };
}

/* ------------------------------------------------------------------ */

export function TextCaseWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextCaseWorkspace");
  const showsEveryVariant = slug === "text-case-converter";
  const [text, setText] = useState("");
  const [active, setActive] = useState<CaseId>(
    slug === "lowercase-converter"
      ? "lower"
      : slug === "title-case-converter"
        ? "title"
        : "upper",
  );
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const inputWrapRef = useRef<HTMLDivElement>(null);

  const cases: { id: CaseId; label: string }[] = [
    { id: "upper", label: "UPPERCASE" },
    { id: "lower", label: "lowercase" },
    { id: "title", label: tUi("titleCase") },
    { id: "sentence", label: tUi("sentenceCase") },
    { id: "camel", label: "camelCase" },
    { id: "pascal", label: tUi("pascalCase") },
    { id: "kebab", label: "kebab-case" },
    { id: "snake", label: "snake_case" },
    { id: "constant", label: tUi("cONSTANTCASE") },
    { id: "alternate", label: "aLtErNaTiNg" },
  ];

  /* Track the caret range of the textarea so a conversion can be limited
     to the selected part of the text.

     The listeners deliberately do NOT include "input": a native input
     listener runs before React's own change handler, so the state update it
     triggers restores the controlled value and wipes what the user typed.
     The caret is synced from React's change handler instead, and the other
     events only report a selection the user made with the mouse or the
     keyboard. */
  useEffect(() => {
    const node = inputWrapRef.current?.querySelector("textarea");
    if (!node) return;
    const sync = () => {
      const start = node.selectionStart ?? 0;
      const end = node.selectionEnd ?? 0;
      setSelection((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end },
      );
    };
    const events = ["select", "keyup", "mouseup", "click", "focus"];
    events.forEach((name) => node.addEventListener(name, sync));
    sync();
    return () => {
      events.forEach((name) => node.removeEventListener(name, sync));
    };
  }, []);

  const stats = useMemo(() => collectStats(text), [text]);

  const result = useMemo(
    () => applyToSelection(text, selection.start, selection.end, CONVERTERS[active]),
    [text, selection.start, selection.end, active],
  );

  const variants = cases.map((entry) => ({
    ...entry,
    value: CONVERTERS[entry.id](text),
  }));

  const exportAll = variants.map((entry) => `${entry.label}\n${entry.value}`).join("\n\n");

  const clear = useCallback(() => {
    setText("");
    setSelection({ start: 0, end: 0 });
  }, []);

  return (
    <Panel>
      <Toolbar>
        <SectionTitle>{showsEveryVariant ? tUi("caseVariants") : tUi("text")}</SectionTitle>
        <ButtonGroup>
          {showsEveryVariant ? (
            <>
              <ActionButton onClick={() => setMode("edit")} variant={mode === "edit" ? "primary" : "default"}>{tUi("edit")}</ActionButton>
              <ActionButton onClick={() => setMode("preview")} variant={mode === "preview" ? "primary" : "default"}>{tUi("preview")}</ActionButton>
              <CopyButton value={exportAll} label={tUi("copyAll")} />
            </>
          ) : (
            <CopyButton value={result} label={tUi("copy")} />
          )}
          <ActionButton onClick={clear}>{tUi("clear")}</ActionButton>
        </ButtonGroup>
      </Toolbar>

      <div
        ref={inputWrapRef}
        className="border-b border-slate-200 dark:border-slate-800"
      >
        <TextArea
          id="text-case-input"
          value={text}
          onChange={(value, event) => {
            setText(value);
            // Read the caret from the same event React delivered, so the
            // selection never lags behind the text.
            const node = event.currentTarget;
            setSelection({
              start: node.selectionStart ?? value.length,
              end: node.selectionEnd ?? value.length,
            });
          }}
          rows={10}
          readOnly={mode === "preview"}
          placeholder={tUi("typeOrPasteYourTextHere")}
        />
      </div>

      <StatGrid>
        <StatCard value={stats.words} label={tUi("words")} />
        <StatCard value={stats.characters} label={tUi("charactersWithSpaces")} />
        <StatCard value={stats.charactersNoSpaces} label={tUi("charactersWithoutSpaces")} />
        <StatCard value={stats.sentences} label={tUi("sentences")} />
        <StatCard value={stats.paragraphs} label={tUi("paragraphs")} />
        <StatCard value={stats.lines} label={tUi("lines")} />
        <StatCard value={stats.readingTime} label={tUi("readingTimeMin")} />
      </StatGrid>

      {showsEveryVariant ? (
        <div className="space-y-3 p-4">
          {variants.map((entry) => (
            <div
              key={entry.id}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {entry.label}
                </span>
                <CopyButton value={entry.value} label={tUi("copy")} />
              </div>
              <ResultBox value={entry.value} rows={3} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="p-4">
            <SectionTitle>{tUi("convert")}</SectionTitle>
            <ButtonGroup>
              {cases.map((entry) => (
                <ActionButton
                  key={entry.id}
                  onClick={() => setActive(entry.id)}
                  variant={active === entry.id ? "primary" : "default"}
                >
                  {entry.label}
                </ActionButton>
              ))}
            </ButtonGroup>
          </div>
          <ResultBox value={result} rows={8} />
        </>
      )}

      <Note>{tUi("selectTextInsideTheBoxToConvertOnlyThatPart")}</Note>
      {slug === "uppercase-converter" ? (
        <Note>{tUi("clickUPPERCASEToConvertTheTextInstantly")}</Note>
      ) : slug === "lowercase-converter" ? (
        <Note>{tUi("clickLowercaseToConvertTheTextInstantly")}</Note>
      ) : slug === "title-case-converter" ? (
        <Note>{tUi("capitalizeTheFirstLetterOfEveryWord")}</Note>
      ) : (
        <Note>{tUi("everyCaseFormatIsShownLiveWithItsOwnCopyButton")}</Note>
      )}
    </Panel>
  );
}
