"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Database } from "lucide-react";
import { AiViewerEngine } from "./AiViewerEngine";

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
  // Adobe Illustrator file viewer
  if (slug === "ai-viewer" || slug.includes("ai-viewer")) {
    return <AiViewerEngine slug={slug} />;
  }

  const is3D =
    slug.includes("3d") ||
    slug.includes("stl") ||
    slug.includes("obj") ||
    slug.includes("glb") ||
    slug.includes("gltf") ||
    slug.includes("3mf") ||
    slug.includes("ply") ||
    slug.includes("fbx");

  if (is3D) {
    return <Model3DViewer />;
  }

  // SQLite mock/in-memory query state for database tools (sqlite-browser, sqlite-viewer, db-viewer, etc.)
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT * FROM users WHERE active = 1 ORDER BY id DESC;"
  );
  const [queryResults] = useState([
    { id: 1, name: "Alice Smith", email: "alice@company.com", active: 1, role: "Admin" },
    { id: 2, name: "Bob Jones", email: "bob@company.com", active: 1, role: "Developer" },
    { id: 3, name: "Carol White", email: "carol@company.com", active: 1, role: "Designer" },
  ]);

  // SQLite / Database Viewer
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="size-5 text-sky-700" />
          SQLite Database Online Browser &amp; Query Runner
        </h3>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            onClick={() => {}}
            className="rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Execute SQL
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-950 overflow-auto">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="p-2">id</th>
              <th className="p-2">name</th>
              <th className="p-2">email</th>
              <th className="p-2">role</th>
              <th className="p-2">active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {queryResults.map((r) => (
              <tr key={r.id} className="hover:bg-slate-900/40">
                <td className="p-2 text-sky-400">{r.id}</td>
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2 text-slate-400">{r.email}</td>
                <td className="p-2 text-emerald-400">{r.role}</td>
                <td className="p-2 text-amber-400">{r.active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
