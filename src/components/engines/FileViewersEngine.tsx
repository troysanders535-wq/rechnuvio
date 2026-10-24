"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AiViewerEngine } from "./AiViewerEngine";
import { useTranslations } from "next-intl";

import { SqlBrowser } from "./viewers/SqlBrowser";
import { DocxViewer, EmlViewer, MsgViewer, PsdViewer } from "./viewers/DocumentViewers";
import type { SqlTable } from "./viewers/sql";

// Dynamically import 3D Viewer with SSR disabled to ensure client-only WebGL execution
const Model3DViewer = dynamic(
  () => import("./viewer3d/Model3DViewer").then((mod) => mod.Model3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-3">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Initializing 3D WebGL engine...
          </p>
        </div>
      </div>
    ),
  }
);

interface FileViewersEngineProps {
  slug: string;
}

export function FileViewersEngine({ slug }: FileViewersEngineProps) {
  const tUi = useTranslations("ui.engines.FileViewersEngine");

  /* The Adobe Illustrator viewer has its own engine. */
  if (slug === "ai-viewer") {
    return <AiViewerEngine slug={slug} />;
  }

  /* The 3D viewers share the WebGL model viewer. */
  const THREE_D_SLUGS = new Set([
    "3d-viewer",
    "stl-viewer",
    "obj-viewer",
    "glb-viewer",
    "gltf-viewer",
    "3mf-viewer",
    "ply-viewer",
    "fbx-viewer",
  ]);
  if (THREE_D_SLUGS.has(slug)) {
    return <Model3DViewer />;
  }

  /* The document viewers read their own file format. */
  if (slug === "docx-viewer") return <DocxViewer />;
  if (slug === "eml-viewer") return <EmlViewer />;
  if (slug === "msg-viewer") return <MsgViewer />;
  if (slug === "psd-viewer") return <PsdViewer />;

  /* The database viewers run the SQL against the in-browser table. */
  const SQL_SLUGS = new Set([
    "sqlite-viewer",
    "sqlite-browser",
    "sqlite-online",
    "db-viewer",
  ]);
  if (SQL_SLUGS.has(slug)) {
    return <SqlBrowser table={USERS_TABLE(tUi)} title={tUi("sQLiteDatabaseOnlineBrowserQueryRunner")} />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {tUi("noViewerForSlug", { slug })}
    </div>
  );
}

/** The table every database viewer of this engine holds. */
function USERS_TABLE(
  tUi: (key: string) => string,
): SqlTable {
  return {
    name: "users",
    columns: ["id", "name", "email", "role", "active"],
    rows: [
      { id: 1, name: tUi("aliceSmith"), email: "alice@company.com", active: 1, role: tUi("admin") },
      { id: 2, name: tUi("bobJones"), email: "bob@company.com", active: 1, role: tUi("developer") },
      { id: 3, name: tUi("carolWhite"), email: "carol@company.com", active: 1, role: tUi("designer") },
    ],
  };
}
