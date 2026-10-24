"use client";

/**
 * Dispatcher for the 45 text-suite tools.
 *
 * Every slug is mapped explicitly. There is deliberately NO substring
 * matching (slug.includes(...)) here: substring dispatch is what previously
 * sent 29 unrelated tools to a single generic panel.
 */

import React from "react";
import { HeadsOrTailsEngine } from "./HeadsOrTailsEngine";
import { TextCaseWorkspace } from "./TextCaseWorkspace";
import { TextLinesWorkspace } from "./TextLinesWorkspace";
import { TextCounterWorkspace } from "./TextCounterWorkspace";
import { TextTokenWorkspace } from "./TextTokenWorkspace";
import { TextFontWorkspace } from "./TextFontWorkspace";
import { TextCitationWorkspace } from "./TextCitationWorkspace";
import { TextConvertWorkspace } from "./TextConvertWorkspace";
import { TextTransformWorkspace } from "./TextTransformWorkspace";
import { TextDocxWorkspace } from "./TextDocxWorkspace";
import { TextNotepadWorkspace } from "./TextNotepadWorkspace";
import { TextDiceWorkspace } from "./TextDiceWorkspace";
import { TextHandwritingWorkspace } from "./TextHandwritingWorkspace";
import { useTranslations } from "next-intl";

interface TextSuiteEngineProps {
  slug: string;
}

const WORKSPACES: Record<string, React.ComponentType<{ slug: string }>> = {
  // Case conversion
  "uppercase-converter": TextCaseWorkspace,
  "lowercase-converter": TextCaseWorkspace,
  "title-case-converter": TextCaseWorkspace,
  "text-case-converter": TextCaseWorkspace,

  // Line operations
  "alphabetical-order-tool": TextLinesWorkspace,
  "remove-duplicate-lines-and-sort": TextLinesWorkspace,
  "remove-duplicate-lines": TextLinesWorkspace,

  // Counting
  "word-counter": TextCounterWorkspace,
  "character-counter": TextCounterWorkspace,
  "string-length-calculator": TextCounterWorkspace,

  // Token counting
  "token-counter": TextTokenWorkspace,
  "ai-token-counter": TextTokenWorkspace,
  "llm-token-counter": TextTokenWorkspace,

  // Unicode fonts and text styles
  "fancy-text-generator": TextFontWorkspace,
  "font-generator": TextFontWorkspace,
  "bold-text-generator": TextFontWorkspace,
  "cursive-text-generator": TextFontWorkspace,
  "small-text-generator": TextFontWorkspace,
  "strikethrough-text-generator": TextFontWorkspace,
  "upside-down-text-generator": TextFontWorkspace,
  "glitch-text-generator": TextFontWorkspace,
  "zalgo-text-generator": TextFontWorkspace,

  // Citations
  "citation-generator": TextCitationWorkspace,
  "apa-citation-generator": TextCitationWorkspace,
  "mla-citation-generator": TextCitationWorkspace,
  "chicago-citation-generator": TextCitationWorkspace,
  "harvard-citation-generator": TextCitationWorkspace,

  // Format conversion
  "text-to-binary": TextConvertWorkspace,
  "binary-to-text": TextConvertWorkspace,
  "text-to-hex": TextConvertWorkspace,
  "html-to-md": TextConvertWorkspace,
  "latex-to-word-equation": TextConvertWorkspace,

  // Text transforms
  "backwards-text-generator": TextTransformWorkspace,
  "text-repeater": TextTransformWorkspace,
  "blank-text-generator": TextTransformWorkspace,
  "invisible-character": TextTransformWorkspace,

  // Word document processing
  "accept-all-changes-in-word": TextDocxWorkspace,
  "remove-comments-from-word": TextDocxWorkspace,
  "word-to-html": TextDocxWorkspace,
  "word-viewer": TextDocxWorkspace,

  // Notepads
  "online-notepad": TextNotepadWorkspace,
  "notepad-plus-plus-online": TextNotepadWorkspace,
  "rapidtables-notepad-alternative": TextNotepadWorkspace,

  // Dice
  "d20-roller": TextDiceWorkspace,

  // Handwriting
  "handwriting-generator": TextHandwritingWorkspace,
  "text-to-handwriting": TextHandwritingWorkspace,
};

export function TextSuiteEngine({ slug }: TextSuiteEngineProps) {
  const tUi = useTranslations("ui.engines.TextSuiteEngine");
  if (slug === "heads-or-tails" || slug === "coin-flip") {
    return <HeadsOrTailsEngine slug={slug} />;
  }

  const Workspace = WORKSPACES[slug];
  if (!Workspace) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {tUi("thisToolIsNotAvailableRightNow")}
      </div>
    );
  }
  return <Workspace slug={slug} />;
}
