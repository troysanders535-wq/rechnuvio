"use client";

/**
 * The engine of the image suite.
 *
 * The engine only routes: every tool of the suite has its own workspace in
 * `image/views.tsx`, and the slug decides which one is shown. There is no
 * shared generic editor behind this switch, because a generic editor is what
 * made 55 of the 76 tools behave like something else.
 */

import React from "react";
import { ImageIcon } from "lucide-react";
import { useImageT } from "./image/kit";
import { VIEW_BY_SLUG } from "./image/views";

interface ImageSuiteEngineProps {
  slug: string;
}

export function ImageSuiteEngine({ slug }: ImageSuiteEngineProps) {
  const t = useImageT();
  const View = VIEW_BY_SLUG[slug];

  if (!View) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ImageIcon className="mx-auto size-8 text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("noWorkspaceForThisTool")}
        </p>
      </div>
    );
  }

  return <View />;
}
