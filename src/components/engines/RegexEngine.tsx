"use client";

import React from "react";
import { RegexTesterView } from "./regex/RegexTesterView";
import { RegexExplainerView } from "./regex/RegexExplainerView";
import { RegexGeneratorView } from "./regex/RegexGeneratorView";
import { RegexAiView } from "./regex/RegexAiView";

interface RegexEngineProps {
  slug: string;
}

/** The workspaces the regex engine can render. */
type RegexView = "tester" | "explainer" | "generator" | "assistant";

/**
 * The workspace of every tool of the engine.
 *
 * The tools of the regex family are not the same tool: the tester, the
 * checker and the JavaScript tester run a pattern over a text, while the
 * explainer, the generator and the pattern assistant each have their own
 * workspace. The mapping is explicit - a slug is never matched by a part of
 * its name.
 */
const VIEW_BY_SLUG: Record<string, RegexView> = {
  "regex-tester": "tester",
  "regex-checker": "tester",
  "javascript-regex-tester": "tester",
  "regex-explainer": "explainer",
  "regex-generator": "generator",
  "regex-ai": "assistant",
};

export function RegexEngine({ slug }: RegexEngineProps) {
  const view = VIEW_BY_SLUG[slug] ?? "tester";

  switch (view) {
    case "explainer":
      return <RegexExplainerView />;
    case "generator":
      return <RegexGeneratorView />;
    case "assistant":
      return <RegexAiView />;
    case "tester":
    default:
      return <RegexTesterView />;
  }
}
