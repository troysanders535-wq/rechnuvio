"use client";

/**
 * Dedicated workspace for the three browser notepad tools.
 *
 * Slugs: online-notepad, notepad-plus-plus-online,
 *        rapidtables-notepad-alternative.
 *
 * One editor, many tabs. Every tab keeps its own name, body and language.
 *
 * The tabs live in the memory of the tab and nowhere else: the audit brief
 * forbids persisting user content in the browser storage, so nothing is
 * written to localStorage, sessionStorage or IndexedDB. A note is kept by
 * downloading it, and the "Clear all text" button empties the editor.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  FilePicker,
  Note,
  NumberInput,
  Panel,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextInput,
  Toolbar,
} from "@/components/engines/TextKit";

/* ------------------------------------------------------------------ *
 * Pure helpers. They contain no user visible text, so the i18n codemod
 * never has to touch them.
 * ------------------------------------------------------------------ */

type NotepadTab = { id: string; name: string; content: string; language: string };

type HighlightRule = { pattern: RegExp; tone: string };

/** Hard limit on open tabs. */
const MAX_TABS = 12;

/** Accepted file types for the import button. */
const ACCEPTED_FILES = ".txt,.md,.json,.js,.css,.html,.xml,.sql";

let tabCounter = 0;

function makeId(): string {
  tabCounter += 1;
  return `tab-${Date.now().toString(36)}-${tabCounter}`;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function countLines(value: string): number {
  if (!value) return 0;
  const body = value.endsWith("\n") ? value.slice(0, -1) : value;
  return body.length ? body.split("\n").length : 0;
}

function countMatches(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

/** Index of the next occurrence of needle, wrapping around to the start. */
function findIndex(haystack: string, needle: string, from: number): number {
  if (!needle) return -1;
  const next = haystack.indexOf(needle, from);
  return next >= 0 ? next : haystack.indexOf(needle, 0);
}

/** Maps a file name to one of the supported languages. */
function languageForFile(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "json") return "json";
  if (extension === "js") return "javascript";
  if (extension === "css") return "css";
  if (extension === "html" || extension === "htm") return "html";
  if (extension === "xml") return "xml";
  if (extension === "sql") return "sql";
  if (extension === "md") return "markdown";
  return "plain";
}

/** Keeps a tab name usable as a file name. */
function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "notepad";
}

/** Saves plain text as a file download. */
function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*
 * Highlighting rules per language. Every rule is sticky, so it can only
 * match at the current scan position.
 */
const LANGUAGE_RULES: Record<string, HighlightRule[]> = {
  json: [
    { pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/y, tone: "key" },
    { pattern: /"(?:\\.|[^"\\])*"/y, tone: "string" },
    { pattern: /\b(?:true|false|null)\b/y, tone: "keyword" },
    { pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, tone: "number" },
  ],
  xml: [
    { pattern: /<!--[\s\S]*?-->/y, tone: "comment" },
    { pattern: /<\/?[A-Za-z][\w:.-]*/y, tone: "tag" },
    { pattern: /"[^"]*"|'[^']*'/y, tone: "string" },
    { pattern: /[\w:.-]+(?=\s*=)/y, tone: "attribute" },
    { pattern: /&[#\w]+;/y, tone: "number" },
  ],
  html: [
    { pattern: /<!--[\s\S]*?-->/y, tone: "comment" },
    { pattern: /<\/?[A-Za-z][\w:.-]*/y, tone: "tag" },
    { pattern: /"[^"]*"|'[^']*'/y, tone: "string" },
    { pattern: /[\w:.-]+(?=\s*=)/y, tone: "attribute" },
  ],
  css: [
    { pattern: /\/\*[\s\S]*?\*\//y, tone: "comment" },
    { pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y, tone: "string" },
    { pattern: /@[a-z-]+/y, tone: "keyword" },
    { pattern: /#[0-9a-fA-F]{3,8}\b/y, tone: "number" },
    { pattern: /-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg)?\b/y, tone: "number" },
    { pattern: /[a-z-]+(?=\s*:)/y, tone: "attribute" },
  ],
  javascript: [
    { pattern: /\/\*[\s\S]*?\*\//y, tone: "comment" },
    { pattern: /\/\/[^\n]*/y, tone: "comment" },
    { pattern: /`(?:\\.|[^`\\])*`/y, tone: "string" },
    { pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y, tone: "string" },
    {
      pattern:
        /\b(?:const|let|var|function|return|if|else|for|while|class|new|await|async|import|export|from|try|catch|throw|typeof|null|undefined|true|false)\b/y,
      tone: "keyword",
    },
    { pattern: /-?\d+(?:\.\d+)?\b/y, tone: "number" },
  ],
  sql: [
    { pattern: /--[^\n]*/y, tone: "comment" },
    { pattern: /'(?:''|[^'])*'/y, tone: "string" },
    {
      pattern:
        /\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AND|OR|NOT|NULL|AS|DISTINCT|UNION|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|INDEX|VIEW|WITH|CASE|WHEN|THEN|ELSE|END)\b/iy,
      tone: "keyword",
    },
    { pattern: /-?\d+(?:\.\d+)?\b/y, tone: "number" },
  ],
  markdown: [
    { pattern: /^#{1,6}[^\n]*/my, tone: "keyword" },
    { pattern: /```[\s\S]*?```/y, tone: "string" },
    { pattern: /`[^`\n]*`/y, tone: "string" },
    { pattern: /\*\*[^*\n]+\*\*/y, tone: "attribute" },
    { pattern: /\*[^*\n]+\*/y, tone: "attribute" },
    { pattern: /\[[^\]\n]*\]\([^)\n]*\)/y, tone: "tag" },
    { pattern: /^[ \t]*(?:[-*+]|\d+\.)\s/my, tone: "number" },
  ],
};

const TONE_CLASS: Record<string, string> = {
  key: "text-sky-300",
  string: "text-emerald-300",
  keyword: "text-violet-300",
  number: "text-amber-300",
  comment: "text-slate-500 italic",
  tag: "text-rose-300",
  attribute: "text-cyan-300",
};

/**
 * Turns source code into escaped HTML with coloured spans. Every character
 * that is not part of a rule is escaped, so the result can never inject
 * markup.
 */
function highlightCode(code: string, language: string): string {
  const rules = LANGUAGE_RULES[language];
  if (!rules || !code) return escapeHtml(code);
  let html = "";
  let index = 0;
  while (index < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.pattern.lastIndex = index;
      const match = rule.pattern.exec(code);
      if (match && match[0].length > 0) {
        html += `<span class="${TONE_CLASS[rule.tone] ?? ""}">${escapeHtml(match[0])}</span>`;
        index += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      html += escapeHtml(code[index]);
      index += 1;
    }
  }
  return html;
}

/* ------------------------------------------------------------------ */

export function TextNotepadWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextNotepadWorkspace");
  const isPlusPlus = slug === "notepad-plus-plus-online";
  const isRapid = slug === "rapidtables-notepad-alternative";
  const isOnline = slug === "online-notepad";

  const [tabs, setTabs] = useState<NotepadTab[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [hitCount, setHitCount] = useState(0);
  const [renamingId, setRenamingId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [wrap, setWrap] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [preview, setPreview] = useState(false);
  const [focusRequest, setFocusRequest] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  /* The first tab is created on the client, so the server and the browser
     render the same markup. */
  useEffect(() => {
    const next = [{ id: makeId(), name: tUi("untitled"), content: "", language: "plain" }];
    setTabs(next);
    setActiveId(next[0].id);
    setReady(true);
    if (isRapid) setFocusRequest(true);
  }, [isRapid, tUi]);

  /* Focus the editor once it exists (used by the open-and-type variant). */
  useEffect(() => {
    if (!focusRequest) return;
    editorRef.current?.focus();
  }, [focusRequest]);

  const active = useMemo(
    () =>
      tabs.find((tab) => tab.id === activeId) ??
      tabs[0] ??
      { id: "", name: "", content: "", language: "plain" },
    [tabs, activeId],
  );

  const stats = useMemo(
    () => ({
      words: countWords(active.content),
      characters: active.content.length,
      lines: countLines(active.content),
      readingTime: countWords(active.content)
        ? Math.max(1, Math.ceil(countWords(active.content) / 200))
        : 0,
    }),
    [active.content],
  );

  const highlighted = useMemo(
    () => highlightCode(active.content, active.language),
    [active.content, active.language],
  );

  const updateActive = useCallback(
    (patch: Partial<NotepadTab>) => {
      setTabs((current) =>
        current.map((tab) => (tab.id === activeId ? { ...tab, ...patch } : tab)),
      );
    },
    [activeId],
  );

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    const next: NotepadTab = {
      id: makeId(),
      name: tUi("untitled"),
      content: "",
      language: "plain",
    };
    setTabs([...tabs, next]);
    setActiveId(next.id);
  }, [tabs]);

  const removeTab = useCallback(
    (id: string) => {
      const remaining = tabs.filter((tab) => tab.id !== id);
      const next = remaining.length
        ? remaining
        : [{ id: makeId(), name: tUi("untitled"), content: "", language: "plain" }];
      setTabs(next);
      if (id === activeId) setActiveId(next[0].id);
    },
    [tabs, activeId],
  );

  const commitRename = useCallback((id: string, name: string) => {
    setRenamingId("");
    setTabs((current) =>
      current.map((tab) =>
        tab.id === id ? { ...tab, name: name.trim() || tUi("untitled") } : tab,
      ),
    );
  }, []);

  const clearAll = useCallback(() => {
    const fresh: NotepadTab = {
      id: makeId(),
      name: tUi("untitled"),
      content: "",
      language: "plain",
    };
    setTabs([fresh]);
    setActiveId(fresh.id);
    setHitCount(0);
  }, [tUi]);

  const findNext = useCallback(() => {
    const node = editorRef.current;
    if (!node || !findText) return;
    const index = findIndex(active.content, findText, node.selectionEnd ?? 0);
    setHitCount(countMatches(active.content, findText));
    if (index < 0) return;
    node.focus();
    node.setSelectionRange(index, index + findText.length);
  }, [active.content, findText]);

  const replaceOne = useCallback(() => {
    const node = editorRef.current;
    if (!node || !findText) return;
    const start = node.selectionStart ?? 0;
    const end = node.selectionEnd ?? 0;
    if (active.content.slice(start, end) === findText) {
      updateActive({
        content:
          active.content.slice(0, start) +
          replaceText +
          active.content.slice(end),
      });
      return;
    }
    findNext();
  }, [active.content, findText, replaceText, updateActive, findNext]);

  const replaceAll = useCallback(() => {
    if (!findText) return;
    const count = countMatches(active.content, findText);
    if (!count) return;
    updateActive({ content: active.content.split(findText).join(replaceText) });
    setHitCount(0);
  }, [active.content, findText, replaceText, updateActive]);

  const loadFile = useCallback(
    (file: File) => {
      void file.text().then((text) => {
        updateActive({ content: text, language: languageForFile(file.name) });
      });
    },
    [updateActive],
  );

  const downloadName = `${safeFileName(active.name)}.txt`;
  const editorFontSize = Math.max(10, Math.round(14 * (zoom / 100)));

  const languages = [
    { value: "plain", label: tUi("plainText") },
    { value: "json", label: "JSON" },
    { value: "xml", label: "XML" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "javascript", label: tUi("javaScript") },
    { value: "sql", label: "SQL" },
    { value: "markdown", label: tUi("markdown") },
  ];

  const languagePicker = (
    <div className="w-full sm:w-56">
      <Field label={tUi("language")} htmlFor="np-language">
        <SelectInput
          id="np-language"
          value={active.language}
          onChange={(value) => updateActive({ language: value })}
          options={languages}
        />
      </Field>
    </div>
  );

  const memoryBadge = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      data-testid="notepad-memory-badge"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {tUi("memoryOnly")}
    </span>
  );

  return (
    <Panel>
      <Toolbar>
        <SectionTitle>
          {isPlusPlus
            ? tUi("notepadStyleEditor")
            : isRapid
              ? tUi("openAndTypeNotepad")
              : tUi("notepad")}
        </SectionTitle>
        <ButtonGroup>
          <ActionButton onClick={addTab} disabled={tabs.length >= MAX_TABS}>
            {tUi("newTab")}
          </ActionButton>
          <FilePicker
            id="np-import"
            accept={ACCEPTED_FILES}
            onFile={loadFile}
            label={tUi("importFile")}
          />
          <DownloadButton
            filename={downloadName}
            content={active.content}
            mime="text/plain"
            label={tUi("download")}
          />
          <CopyButton value={active.content} label={tUi("copy")} />
          <ActionButton onClick={clearAll}>{tUi("clearAllText")}</ActionButton>
        </ButtonGroup>
      </Toolbar>

      {isPlusPlus && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {tUi("file")}
          </span>
          <ActionButton onClick={addTab} disabled={tabs.length >= MAX_TABS}>
            {tUi("new")}
          </ActionButton>
          <FilePicker
            id="np-open"
            accept={ACCEPTED_FILES}
            onFile={loadFile}
            label={tUi("open")}
          />
          <ActionButton
            onClick={() => downloadTextFile(downloadName, active.content)}
          >
            {tUi("save")}
          </ActionButton>
          <ActionButton
            onClick={() => document.getElementById("np-find")?.focus()}
          >
            {tUi("find")}
          </ActionButton>
          <Checkbox id="np-wrap" checked={wrap} onChange={setWrap} label={tUi("wordWrap")} />
          <div className="w-28">
            <Field label={tUi("zoom")} htmlFor="np-zoom">
              <NumberInput
                id="np-zoom"
                value={zoom}
                onChange={setZoom}
                min={75}
                max={200}
                step={5}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {tUi("privacy")}
        </span>
        {memoryBadge}
      </div>

      <p className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
        {tUi("memoryOnlyHint")}
      </p>

      {isOnline && (
        <div className="border-b border-sky-200 bg-sky-50/70 px-3 py-3 dark:border-sky-900 dark:bg-sky-950/40">
          {languagePicker}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex shrink-0 items-center gap-1 rounded-t-lg border border-b-0 ${
              tab.id === activeId
                ? "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
                : "border-transparent bg-transparent"
            }`}
          >
            {renamingId === tab.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={() => commitRename(tab.id, renameValue)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitRename(tab.id, renameValue);
                  if (event.key === "Escape") setRenamingId("");
                }}
                className="w-28 rounded-lg border border-sky-400 bg-white px-2 py-1 text-xs text-slate-800 outline-none dark:bg-slate-950 dark:text-slate-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveId(tab.id)}
                onDoubleClick={() => {
                  setRenamingId(tab.id);
                  setRenameValue(tab.name);
                }}
                title={tUi("doubleClickToRename")}
                className={`px-3 py-1.5 text-xs font-medium ${
                  tab.id === activeId
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {tab.name}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeTab(tab.id)}
              title={tUi("closeTab")}
              aria-label={tUi("closeTab")}
              className="rounded px-1 text-xs text-slate-400 hover:text-rose-500"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTab}
          disabled={tabs.length >= MAX_TABS}
          title={tUi("newTab")}
          aria-label={tUi("newTab")}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          +
        </button>
        <span className="ml-auto pl-2 text-[11px] text-slate-500">
          {tUi("tabCounter", { count: tabs.length, max: MAX_TABS })}
        </span>
      </div>

      {isRapid && (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="w-full sm:w-64">
            <Field label={tUi("tabName")} htmlFor="np-tab-name">
              <TextInput
                id="np-tab-name"
                value={active.name}
                onChange={(value) => updateActive({ name: value })}
                placeholder={tUi("untitled")}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 dark:border-slate-800">
        <textarea
          ref={editorRef}
          value={active.content}
          onChange={(event) => updateActive({ content: event.target.value })}
          spellCheck={false}
          wrap={wrap ? "soft" : "off"}
          style={{ fontSize: `${editorFontSize}px` }}
          placeholder={tUi("startTypingHere")}
          className="min-h-[320px] w-full resize-y bg-slate-950 p-4 font-mono leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>

      <StatGrid>
        <StatCard value={stats.words} label={tUi("words")} />
        <StatCard value={stats.characters} label={tUi("characters")} />
        <StatCard value={stats.lines} label={tUi("lines")} />
        <StatCard value={stats.readingTime} label={tUi("readingTimeMin")} />
      </StatGrid>

      <div className="grid gap-4 border-b border-slate-200 p-4 dark:border-slate-800 md:grid-cols-2">
        <Field label={tUi("find")} htmlFor="np-find">
          <div className="flex gap-2">
            <TextInput
              id="np-find"
              value={findText}
              onChange={setFindText}
              placeholder={tUi("textToFind")}
            />
            <ActionButton onClick={findNext}>{tUi("find")}</ActionButton>
          </div>
        </Field>
        <Field label={tUi("replace")} htmlFor="np-replace">
          <div className="flex gap-2">
            <TextInput
              id="np-replace"
              value={replaceText}
              onChange={setReplaceText}
              placeholder={tUi("replaceWith")}
            />
            <ActionButton onClick={replaceOne}>{tUi("replace")}</ActionButton>
            <ActionButton onClick={replaceAll}>{tUi("replaceAll")}</ActionButton>
          </div>
        </Field>
        <p className="text-xs text-slate-500 md:col-span-2">
          {tUi("matchCount", { count: hitCount })}
        </p>
      </div>

      {!isOnline && (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          {languagePicker}
          {isPlusPlus && (
            <Checkbox
              id="np-wrap-main"
              checked={wrap}
              onChange={setWrap}
              label={tUi("wordWrap")}
            />
          )}
          <ButtonGroup>
            <ActionButton
              onClick={() => setPreview((value) => !value)}
              variant={preview ? "primary" : "default"}
            >
              {preview ? tUi("hideSyntaxPreview") : tUi("showSyntaxPreview")}
            </ActionButton>
          </ButtonGroup>
        </div>
      )}

      {isOnline && (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <ButtonGroup>
            <ActionButton
              onClick={() => setPreview((value) => !value)}
              variant={preview ? "primary" : "default"}
            >
              {preview ? tUi("hideSyntaxPreview") : tUi("showSyntaxPreview")}
            </ActionButton>
          </ButtonGroup>
        </div>
      )}

      {preview && (
        <pre className="max-h-96 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      )}

      <Note>{tUi("textStaysInThisBrowser")}</Note>
      {isOnline ? (
        <Note>
          {tUi("multiTabEditingAndSyntaxHighlightingAllClientSide")}
        </Note>
      ) : isPlusPlus ? (
        <Note>
          {tUi("aTabbedEditorThatRunsInTheBrowserOnMacOSLinuxAndChromeOS")}
        </Note>
      ) : (
        <Note>
          {tUi("openThePageAndStartTypingThereIsNoSignupAndNoUpload")}
        </Note>
      )}
    </Panel>
  );
}
