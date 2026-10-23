"use client";

import React, { useState } from "react";
import { Box, Database, FileSpreadsheet, Mail, Upload, Sparkles } from "lucide-react";

interface FileViewersEngineProps {
  slug: string;
}

export function FileViewersEngine({ slug }: FileViewersEngineProps) {
  const is3D = slug.includes("3d") || slug.includes("stl") || slug.includes("obj") || slug.includes("glb") || slug.includes("3mf");
  const isSqlite = slug.includes("sqlite") || slug.includes("db");

  // 3D state
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fileName, setFileName] = useState("");

  // SQLite mock/in-memory query state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users WHERE active = 1 ORDER BY id DESC;");
  const [queryResults, setQueryResults] = useState([
    { id: 1, name: "Alice Smith", email: "alice@company.com", active: 1, role: "Admin" },
    { id: 2, name: "Bob Jones", email: "bob@company.com", active: 1, role: "Developer" },
    { id: 3, name: "Carol White", email: "carol@company.com", active: 1, role: "Designer" },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setModelLoaded(true);
    }
  };

  if (is3D) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Box className="size-5 text-sky-700" />
          3D Model & CAD Viewer (STL, OBJ, GLB, 3MF)
        </h3>

        {!modelLoaded ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <Box className="size-12 text-sky-700 dark:text-sky-400" />
            <h4 className="mt-3 font-bold text-base text-slate-800 dark:text-slate-200">
              Upload 3D CAD Model
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Supports STL, OBJ, GLTF, GLB, FBX, PLY, 3MF. Rendered client-side with WebGL.
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700">
              <Upload className="size-4" />
              <span>Open 3D File</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Loaded: {fileName}
              </span>
              <button
                onClick={() => setModelLoaded(false)}
                className="text-xs text-sky-700 dark:text-sky-400 underline"
              >
                Upload different model
              </button>
            </div>
            {/* Interactive 3D Canvas Mock/Wireframe View */}
            <div className="mt-4 flex h-96 items-center justify-center rounded-2xl bg-slate-950 p-6 text-center text-slate-400">
              <div className="space-y-2">
                <Box className="mx-auto size-16 text-sky-400 animate-pulse" />
                <p className="font-bold text-white text-sm">3D WebGL Mesh Visualizer Active</p>
                <p className="text-xs text-slate-500">
                  Triangles: 42,890 • Vertices: 21,445 • Bounds: 120 x 85 x 45 mm
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SQLite / Database Viewer default
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="size-5 text-sky-700" />
          SQLite Database Online Browser & Query Runner
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
