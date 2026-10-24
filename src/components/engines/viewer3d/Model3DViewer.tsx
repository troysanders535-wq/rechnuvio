"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as OV from "online-3d-viewer";
import JSZip from "jszip";
import { useTranslations } from "next-intl";
import {
  Box,
  Upload,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  Palette,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Check,
  Minimize2,
  Move,
  MousePointer
} from "lucide-react";

interface ModelStats {
  meshCount: number;
  triangleCount: number;
  vertexCount: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  volume?: number;
  surfaceArea?: number;
}

interface BackgroundPreset {
  id: string;
  /** Catalogue key of the preset name shown in the theme picker. */
  nameKey: string;
  color: [number, number, number];
  hex: string;
}

const BG_PRESETS: BackgroundPreset[] = [
  { id: "dark-navy", nameKey: "bgPresetDeepSpace", color: [10, 14, 23], hex: "#0a0e17" },
  { id: "slate-dark", nameKey: "bgPresetDarkSlate", color: [30, 41, 59], hex: "#1e293b" },
  { id: "neutral-gray", nameKey: "bgPresetStudioGray", color: [71, 85, 105], hex: "#475569" },
  { id: "neutral-light", nameKey: "bgPresetNeutralLight", color: [248, 250, 252], hex: "#f8fafc" },
  { id: "pure-white", nameKey: "bgPresetPureWhite", color: [255, 255, 255], hex: "#ffffff" },
  { id: "pitch-black", nameKey: "bgPresetPitchBlack", color: [0, 0, 0], hex: "#000000" }
];

const SUPPORTED_FORMATS = [
  { ext: "STL", name: "Stereolithography", groupKey: "formatGroup3DPrint" },
  { ext: "OBJ", name: "Wavefront (+MTL)", groupKey: "formatGroupMesh" },
  { ext: "GLTF/GLB", name: "glTF 2.0 Web Ready", groupKey: "formatGroupStandard" },
  { ext: "3MF", name: "3D Manufacturing Format", groupKey: "formatGroup3DPrint" },
  { ext: "PLY", name: "Polygon File Format", groupKey: "formatGroupPointAndMesh" },
  { ext: "FBX", name: "Autodesk Filmbox", groupKey: "formatGroupAsset" },
  { ext: "STEP/STP", name: "CAD STEP AP203/214", groupKey: "formatGroupCad" },
  { ext: "IGES/IGS", name: "CAD Initial Graphics", groupKey: "formatGroupCad" },
  { ext: "3DS", name: "3D Studio", groupKey: "formatGroupLegacy" },
  { ext: "DAE", name: "Collada Digital Asset", groupKey: "formatGroupAsset" },
  { ext: "OFF", name: "Object File Format", groupKey: "formatGroupMath" },
  { ext: "IFC", name: "Industry Foundation Classes", groupKey: "formatGroupBim" },
  { ext: "3DM", name: "Rhino 3D Model", groupKey: "formatGroupCad" },
  { ext: "FCSTD", name: "FreeCAD Standard", groupKey: "formatGroupCad" },
  { ext: "BIM", name: "DotBIM Specification", groupKey: "formatGroupBim" }
];

// High quality ASCII STL sample model (a faceted gemstone) for immediate 1-click testing
const SAMPLE_GEMSTONE_STL = `solid gemstone
  facet normal 0.000000 0.894427 0.447214
    outer loop
      vertex 0.000000 0.000000 15.000000
      vertex 14.265848 10.364745 5.000000
      vertex -14.265848 10.364745 5.000000
    endloop
  endfacet
  facet normal 0.850651 0.276393 0.447214
    outer loop
      vertex 0.000000 0.000000 15.000000
      vertex 23.082565 -7.500000 5.000000
      vertex 14.265848 10.364745 5.000000
    endloop
  endfacet
  facet normal 0.525731 -0.723607 0.447214
    outer loop
      vertex 0.000000 0.000000 15.000000
      vertex 0.000000 -24.270510 5.000000
      vertex 23.082565 -7.500000 5.000000
    endloop
  endfacet
  facet normal -0.525731 -0.723607 0.447214
    outer loop
      vertex 0.000000 0.000000 15.000000
      vertex -23.082565 -7.500000 5.000000
      vertex 0.000000 -24.270510 5.000000
    endloop
  endfacet
  facet normal -0.850651 0.276393 0.447214
    outer loop
      vertex 0.000000 0.000000 15.000000
      vertex -14.265848 10.364745 5.000000
      vertex -23.082565 -7.500000 5.000000
    endloop
  endfacet
  facet normal 0.000000 0.447214 -0.894427
    outer loop
      vertex 0.000000 0.000000 -20.000000
      vertex -14.265848 10.364745 5.000000
      vertex 14.265848 10.364745 5.000000
    endloop
  endfacet
  facet normal 0.425325 0.138197 -0.894427
    outer loop
      vertex 0.000000 0.000000 -20.000000
      vertex 14.265848 10.364745 5.000000
      vertex 23.082565 -7.500000 5.000000
    endloop
  endfacet
  facet normal 0.262866 -0.361803 -0.894427
    outer loop
      vertex 0.000000 0.000000 -20.000000
      vertex 23.082565 -7.500000 5.000000
      vertex 0.000000 -24.270510 5.000000
    endloop
  endfacet
  facet normal -0.262866 -0.361803 -0.894427
    outer loop
      vertex 0.000000 0.000000 -20.000000
      vertex 0.000000 -24.270510 5.000000
      vertex -23.082565 -7.500000 5.000000
    endloop
  endfacet
  facet normal -0.425325 0.138197 -0.894427
    outer loop
      vertex 0.000000 0.000000 -20.000000
      vertex -23.082565 -7.500000 5.000000
      vertex -14.265848 10.364745 5.000000
    endloop
  endfacet
endsolid gemstone`;

export function Model3DViewer() {
  const tUi = useTranslations("ui.engines.viewer3d.Model3DViewer");
  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instance Ref for cleanup & manipulation
  const viewerRef = useRef<OV.EmbeddedViewer | null>(null);

  // States
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(tUi("loadingModel"));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedFileNames, setLoadedFileNames] = useState<string[]>([]);
  const [totalFilesSize, setTotalFilesSize] = useState<string>("");

  // Controls state
  const [wireframeEnabled, setWireframeEnabled] = useState(false);
  const [currentBg, setCurrentBg] = useState<BackgroundPreset>(BG_PRESETS[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [showStatsHud, setShowStatsHud] = useState(true);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return tUi("0Bytes");
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Safe destruction of viewer instance
  const destroyViewer = useCallback(() => {
    if (viewerRef.current) {
      try {
        viewerRef.current.Destroy();
      } catch (err) {
        console.warn("Error while disposing 3D viewer:", err);
      }
      viewerRef.current = null;
    }
    if (canvasHostRef.current) {
      canvasHostRef.current.innerHTML = "";
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyViewer();
    };
  }, [destroyViewer]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resize viewer canvas when fullscreen changes
      if (viewerRef.current) {
        setTimeout(() => viewerRef.current?.Resize(), 100);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Load a model from File list
  const loadFiles = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) return;

      setErrorMessage(null);
      setIsLoading(true);
      setLoadingMessage(tUi("reading3DGeometry"));

      const names = files.map((f) => f.name);
      setLoadedFileNames(names);
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      setTotalFilesSize(formatBytes(totalSize));

      // Destroy any prior viewer before mounting fresh canvas
      destroyViewer();
      setModelLoaded(true);

      // Brief delay to allow canvasHostRef to render in DOM if transitioning from empty state
      setTimeout(() => {
        if (!canvasHostRef.current) {
          setIsLoading(false);
          return;
        }

        try {
          const viewer = new OV.EmbeddedViewer(canvasHostRef.current, {
            backgroundColor: new OV.RGBAColor(
              currentBg.color[0],
              currentBg.color[1],
              currentBg.color[2],
              255
            ),
            edgeSettings: new OV.EdgeSettings(
              wireframeEnabled,
              new OV.RGBColor(56, 189, 248),
              1
            ),
            onModelLoaded: () => {
              setIsLoading(false);
              const model = viewer.GetModel();
              const underlyingViewer = viewer.GetViewer();
              if (model && underlyingViewer) {
                const boundingBox = underlyingViewer.GetBoundingBox(() => true);
                let sizeX = 0;
                let sizeY = 0;
                let sizeZ = 0;
                if (boundingBox && boundingBox.min && boundingBox.max) {
                  sizeX = Math.abs(boundingBox.max.x - boundingBox.min.x);
                  sizeY = Math.abs(boundingBox.max.y - boundingBox.min.y);
                  sizeZ = Math.abs(boundingBox.max.z - boundingBox.min.z);
                }

                let volume: number | undefined;
                let surfaceArea: number | undefined;
                try {
                  const rawVolume = OV.CalculateVolume(model);
                  if (rawVolume && !isNaN(rawVolume) && rawVolume > 0) {
                    volume = rawVolume;
                  }
                  const rawArea = OV.CalculateSurfaceArea(model);
                  if (rawArea && !isNaN(rawArea) && rawArea > 0) {
                    surfaceArea = rawArea;
                  }
                } catch {
                  // Volume calculation is optional for complex non-manifold meshes
                }

                setStats({
                  meshCount: model.MeshCount(),
                  triangleCount: model.TriangleCount(),
                  vertexCount: model.VertexCount(),
                  sizeX,
                  sizeY,
                  sizeZ,
                  volume,
                  surfaceArea
                });
              }
            },
            onModelLoadFailed: () => {
              setIsLoading(false);
              setErrorMessage(
                tUi("unableToParseThe3DModelPleaseCheckTheFileFormatOrEnsureAllDependentTexturesAndMaterialMtlBinFilesWereSelectedTogether")
              );
            }
          });

          viewerRef.current = viewer;

          // Pass File objects into the viewer loader
          viewer.LoadModelFromFileList(files);
        } catch (err: unknown) {
          setIsLoading(false);
          const msg = err instanceof Error ? err.message : tUi("unknownErrorInitializing3DViewer");
          setErrorMessage(tUi("initializationError", { message: msg }));
        }
      }, 50);
    },
    [currentBg, destroyViewer, wireframeEnabled]
  );

  // ResizeObserver on canvas host container
  useEffect(() => {
    if (!canvasHostRef.current) return;
    const observer = new ResizeObserver(() => {
      if (viewerRef.current) {
        viewerRef.current.Resize();
      }
    });
    observer.observe(canvasHostRef.current);
    return () => observer.disconnect();
  }, [modelLoaded]);

  // Handle standard file picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFiles(Array.from(e.target.files));
      // Reset input value to allow selecting same file again
      e.target.value = "";
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Load sample model
  const handleLoadSample = () => {
    const blob = new Blob([SAMPLE_GEMSTONE_STL], { type: "model/stl" });
    const sampleFile = new File([blob], "faceted_gemstone.stl", { type: "model/stl" });
    loadFiles([sampleFile]);
  };

  // Camera Actions
  const handleFitToView = () => {
    if (!viewerRef.current) return;
    const v = viewerRef.current.GetViewer();
    const boundingSphere = v.GetBoundingSphere(() => true);
    if (boundingSphere) {
      v.FitSphereToWindow(boundingSphere, true);
    }
  };

  const handleResetCamera = () => {
    if (!viewerRef.current) return;
    const v = viewerRef.current.GetViewer();
    v.SetUpVector(OV.Direction.Y, true);
    const boundingSphere = v.GetBoundingSphere(() => true);
    if (boundingSphere) {
      v.FitSphereToWindow(boundingSphere, true);
    }
  };

  const handleZoom = (ratio: number) => {
    if (!viewerRef.current) return;
    const v = viewerRef.current.GetViewer();
    if (v && v.navigation) {
      v.navigation.Zoom(ratio);
      v.navigation.Update();
    }
  };

  // Wireframe toggle
  const handleToggleWireframe = () => {
    const nextState = !wireframeEnabled;
    setWireframeEnabled(nextState);
    if (viewerRef.current) {
      viewerRef.current.GetViewer().SetEdgeSettings(
        new OV.EdgeSettings(nextState, new OV.RGBColor(56, 189, 248), 1)
      );
    }
  };

  // Background color change
  const handleChangeBackground = (preset: BackgroundPreset) => {
    setCurrentBg(preset);
    if (viewerRef.current) {
      viewerRef.current.GetViewer().SetBackgroundColor(
        new OV.RGBAColor(preset.color[0], preset.color[1], preset.color[2], 255)
      );
    }
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Error exiting fullscreen:", err);
      });
    }
  };

  // Model Export
  const handleExport = (formatKey: string) => {
    if (!viewerRef.current) return;
    const model = viewerRef.current.GetModel();
    if (!model) {
      alert(tUi("noModelLoadedToExport"));
      return;
    }

    setExportingFormat(formatKey);
    const exporter = new OV.Exporter();
    const settings = new OV.ExporterSettings({});

    let format = OV.FileFormat.Text;
    let extension = "stl";

    switch (formatKey) {
      case "stl-binary":
        format = OV.FileFormat.Binary;
        extension = "stl";
        break;
      case "stl-ascii":
        format = OV.FileFormat.Text;
        extension = "stl";
        break;
      case "obj":
        format = OV.FileFormat.Text;
        extension = "obj";
        break;
      case "gltf":
        format = OV.FileFormat.Text;
        extension = "gltf";
        break;
      case "glb":
        format = OV.FileFormat.Binary;
        extension = "glb";
        break;
      case "ply-binary":
        format = OV.FileFormat.Binary;
        extension = "ply";
        break;
      case "ply-ascii":
        format = OV.FileFormat.Text;
        extension = "ply";
        break;
      case "off":
        format = OV.FileFormat.Text;
        extension = "off";
        break;
      case "bim":
        format = OV.FileFormat.Text;
        extension = "bim";
        break;
      default:
        format = OV.FileFormat.Binary;
        extension = "stl";
    }

    try {
      exporter.Export(model, settings, format, extension, {
        onSuccess: (files: OV.ExportedFile[]) => {
          setExportingFormat(null);
          setShowExportModal(false);

          const baseName =
            loadedFileNames.length > 0
              ? loadedFileNames[0].replace(/\.[^/.]+$/, "")
              : "model";

          if (files.length === 1) {
            // Single file download
            const f = files[0];
            const buffer = f.GetBufferContent();
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = f.GetName() || `${baseName}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } else if (files.length > 1) {
            // Multi-file export (e.g. OBJ + MTL), package with JSZip
            const zip = new JSZip();
            for (const file of files) {
              zip.file(file.GetName(), file.GetBufferContent());
            }
            zip.generateAsync({ type: "blob" }).then((content) => {
              const url = URL.createObjectURL(content);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${baseName}_${formatKey}_export.zip`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            });
          }
        },
        onError: () => {
          setExportingFormat(null);
          alert(
            tUi("failedToExportModelToFormat", { format: formatKey.toUpperCase() })
          );
        }
      });
    } catch (err: unknown) {
      setExportingFormat(null);
      const msg = err instanceof Error ? err.message : tUi("exportFailed");
      alert(tUi("exportError", { message: msg }));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 shadow-sm ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none p-4 bg-slate-950" : ""
      }`}
    >
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".stl,.obj,.mtl,.gltf,.glb,.bin,.3mf,.ply,.fbx,.3ds,.dae,.off,.step,.stp,.iges,.igs,.brep,.ifc,.3dm,.fcstd,.bim,.png,.jpg,.jpeg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-400">
            <Box className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {tUi("online3DModelCADViewer")}
              {modelLoaded && loadedFileNames.length > 0 && (
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {loadedFileNames[0]}
                  {loadedFileNames.length > 1 && (
                    <>
                      {" "}
                      {tUi("additionalAssets", { count: loadedFileNames.length - 1 })}
                    </>
                  )}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tUi("webGLHardwareAccelerated100PrivateClientSideSandbox")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {modelLoaded && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title={tUi("selectOrDropAnother3DModel")}
              >
                <FolderOpen className="size-3.5 text-sky-700 dark:text-sky-400" />
                <span className="hidden sm:inline">{tUi("openFile")}</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                title={tUi("exportOrConvertThis3DModel")}
              >
                <Download className="size-3.5" />
                <span>{tUi("export")}</span>
              </button>
            </>
          )}

          <button
            onClick={handleToggleFullscreen}
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title={isFullscreen ? tUi("exitFullscreen") : tUi("fullscreen")}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Main interactive area */}
      {!modelLoaded ? (
        /* Empty State / Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`m-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
            isDraggingOver
              ? "border-sky-500 bg-sky-50/60 dark:border-sky-500 dark:bg-sky-950/30"
              : "border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/50"
          }`}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-950 dark:text-sky-400">
            <Upload className="size-8" />
          </div>

          <h4 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {tUi("dragDropYour3DModelHere")}
          </h4>
          <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {tUi("openStandard3DMeshesCadSolidsAndMultiFilePackages")} {tUi("forTexturedModelsSelectYour")}{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">.obj + .mtl + {tUi("images")}</span> {tUi("or")}{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">.gltf + .bin</span> {tUi("filesTogether")}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              <FolderOpen className="size-4" />
              <span>{tUi("open3DFile")}</span>
            </button>

            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Sparkles className="size-4 text-amber-500" />
              <span>{tUi("trySampleModel")}</span>
            </button>
          </div>

          {/* Supported Format Badges */}
          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800 w-full max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {tUi("supportedFormats")}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUPPORTED_FORMATS.map((fmt) => (
                <span
                  key={fmt.ext}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title={`${fmt.name} (${tUi(fmt.groupKey)})`}
                >
                  {fmt.ext}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active 3D Viewer Workspace */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex flex-col"
        >
          {/* Canvas Host Container */}
          <div
            ref={canvasHostRef}
            className="relative h-[550px] w-full overflow-hidden bg-slate-950 touch-none select-none"
            style={{ backgroundColor: currentBg.hex }}
          />

          {/* Drag Overlay when dragging files onto active viewer */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-sky-950/80 backdrop-blur-xs text-white">
              <Upload className="size-12 animate-bounce text-sky-400" />
              <p className="mt-3 text-base font-bold">{tUi("dropFilesToLoadNew3DModel")}</p>
              <p className="text-xs text-slate-300">{tUi("supportsMultiFileSelectionObjMtlGltfBin")}</p>
            </div>
          )}

          {/* Loading Indicator Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-xs text-white">
              <div className="size-10 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
              <p className="mt-3 text-sm font-semibold">{loadingMessage}</p>
              <p className="text-xs text-slate-400">{tUi("renderingGeometryInWebGL")}</p>
            </div>
          )}

          {/* Floating Controls Bar */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-700/60 bg-slate-900/80 p-1.5 backdrop-blur-md shadow-lg text-white">
            {/* Camera Actions */}
            <button
              onClick={handleFitToView}
              className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-800/80 transition text-slate-200 hover:text-white"
              title={tUi("fitToView")}
            >
              <Maximize2 className="size-4 text-sky-400" />
            </button>
            <button
              onClick={handleResetCamera}
              className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-800/80 transition text-slate-200 hover:text-white"
              title={tUi("resetCameraView")}
            >
              <RotateCcw className="size-4" />
            </button>

            <div className="h-5 w-px bg-slate-700/60 mx-0.5" />

            <button
              onClick={() => handleZoom(0.25)}
              className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-800/80 transition text-slate-200 hover:text-white"
              title={tUi("zoomIn")}
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.25)}
              className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-800/80 transition text-slate-200 hover:text-white"
              title={tUi("zoomOut")}
            >
              <ZoomOut className="size-4" />
            </button>

            <div className="h-5 w-px bg-slate-700/60 mx-0.5" />

            {/* Wireframe Toggle */}
            <button
              onClick={handleToggleWireframe}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition ${
                wireframeEnabled
                  ? "bg-sky-600 text-white"
                  : "hover:bg-slate-800/80 text-slate-300"
              }`}
              title={tUi("toggleWireframeMeshEdges")}
            >
              <Layers className="size-3.5" />
              <span className="hidden sm:inline">{tUi("wireframe")}</span>
            </button>

            {/* Background Presets Picker */}
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800/80 transition"
                title={tUi("changeViewerBackground")}
              >
                <Palette className="size-3.5 text-amber-400" />
                <span className="hidden sm:inline">{tUi("theme")}</span>
              </button>

              <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl min-w-36">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5">{tUi("background")}</span>
                {BG_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleChangeBackground(p)}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs text-left hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full border border-slate-600"
                        style={{ backgroundColor: p.hex }}
                      />
                      <span>{tUi(p.nameKey)}</span>
                    </div>
                    {currentBg.id === p.id && <Check className="size-3 text-sky-400" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-slate-700/60 mx-0.5" />

            {/* HUD Toggle */}
            <button
              onClick={() => setShowStatsHud(!showStatsHud)}
              className={`flex size-8 items-center justify-center rounded-xl transition ${
                showStatsHud ? "text-sky-400 bg-slate-800" : "text-slate-400 hover:bg-slate-800"
              }`}
              title={tUi("toggleGeometryStats")}
            >
              <Info className="size-4" />
            </button>
          </div>

          {/* Mouse & Gesture Control Hints (Desktop & Mobile) */}
          <div className="absolute top-4 right-4 z-10 hidden md:flex items-center gap-3 rounded-xl bg-slate-900/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md border border-slate-800">
            <span className="flex items-center gap-1">
              <MousePointer className="size-3 text-sky-400" />
              <span>{tUi("leftDragOrbit")}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <Move className="size-3 text-amber-400" />
              <span>{tUi("rightDragPan")}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>{tUi("scrollZoom")}</span>
          </div>

          {/* Geometry Statistics HUD Panel */}
          {showStatsHud && stats && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/85 px-4 py-2.5 backdrop-blur-md text-xs text-slate-300 shadow-md">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{tUi("triangles")}</span>
                  <span className="font-mono font-bold text-white">
                    {stats.triangleCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{tUi("vertices")}</span>
                  <span className="font-mono font-bold text-white">
                    {stats.vertexCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{tUi("meshes")}</span>
                  <span className="font-mono font-bold text-white">{stats.meshCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{tUi("boundingBox")}</span>
                  <span className="font-mono text-slate-200">
                    {stats.sizeX.toFixed(1)} × {stats.sizeY.toFixed(1)} × {stats.sizeZ.toFixed(1)}
                  </span>
                </div>
                {stats.volume !== undefined && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{tUi("volume")}</span>
                    <span className="font-mono text-emerald-400">
                      {stats.volume.toFixed(2)} units³
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                <span>{tUi("totalSize")}{" "}</span>
                <span className="font-semibold text-slate-200">{totalFilesSize}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="m-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-bold underline hover:no-underline"
          >
            {tUi("dismiss")}
          </button>
        </div>
      )}

      {/* Open Source License Notice Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div>
          <span>{tUi("3DEnginePoweredBy")} </span>
          <a
            href="https://github.com/kovacsv/Online3DViewer"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
          >
            {tUi("online3DViewer")}
          </a>
          <span> {tUi("licenseNotice")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{tUi("webGLThreeJsClientSideExecution")}</span>
        </div>
      </div>

      {/* Export Format Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="size-5 text-sky-700 dark:text-sky-400" />
                {tUi("export3DModel")}
              </h4>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {tUi("convertAndDownloadTheLoaded3DGeometry")}
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: "stl-binary", name: tUi("sTLBinary"), desc: tUi("standardFor3DPrinting") },
                { id: "stl-ascii", name: tUi("sTLASCII"), desc: tUi("humanReadableMesh") },
                { id: "glb", name: tUi("gLBBinary"), desc: tUi("compactGlTFWithMaterials") },
                { id: "gltf", name: "glTF (JSON)", desc: tUi("standardWeb3DFormat") },
                { id: "obj", name: tUi("wavefrontOBJ"), desc: tUi("includesMtlInZIP") },
                { id: "ply-binary", name: tUi("pLYBinary"), desc: tUi("polygonFormatWithColors") },
                { id: "ply-ascii", name: tUi("pLYASCII"), desc: tUi("textPolygonFormat") },
                { id: "off", name: "OFF", desc: tUi("objectFileFormat") },
                { id: "bim", name: tUi("bIMBim"), desc: tUi("lightweightBIMModel") }
              ].map((item) => (
                <button
                  key={item.id}
                  disabled={exportingFormat !== null}
                  onClick={() => handleExport(item.id)}
                  className="flex flex-col text-left rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sky-500 hover:bg-sky-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-500"
                >
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                    {item.name}
                    {exportingFormat === item.id && (
                      <RefreshCw className="size-3 animate-spin text-sky-600" />
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {tUi("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
