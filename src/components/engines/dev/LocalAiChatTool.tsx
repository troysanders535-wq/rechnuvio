"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Cpu, Trash2 } from "lucide-react";

import {
  DevCopyButton,
  DevError,
  DevOk,
  DevPanel,
  DevSelect,
  devButtonClass,
  devGhostButtonClass,
} from "./DevKit";

export type AiChatVariant = "local-ai-chat" | "offline-ai-chat" | "private-ai-chatbot";

interface ModelEntry {
  id: string;
  label: string;
  /** Where the model files have to live on this site's own origin. */
  path: string;
  /** Catalogue key of the parameter description shown next to the model. */
  parametersKey: string;
}

/**
 * The three local-model chat tools.
 *
 * There is no model bundled with this site and no remote inference is
 * allowed, so the workspace is honest about it: it offers the real chat
 * surface, detects WebGPU, and loads a model from this site's own origin
 * once the weights are placed there. It never invents an answer.
 */
const MODELS: Record<AiChatVariant, ModelEntry[]> = {
  "local-ai-chat": [
    {
      id: "qwen2.5-0.5b-instruct",
      label: "Qwen2.5 0.5B Instruct",
      path: "/models/qwen2.5-0.5b-instruct/",
      parametersKey: "qwen05bParameters",
    },
    {
      id: "llama-3.2-1b-instruct",
      label: "Llama 3.2 1B Instruct",
      path: "/models/llama-3.2-1b-instruct/",
      parametersKey: "llama1bParameters",
    },
    {
      id: "gemma-2-2b-it",
      label: "Gemma 2 2B Instruct",
      path: "/models/gemma-2-2b-it/",
      parametersKey: "gemma2bParameters",
    },
  ],
  "offline-ai-chat": [
    {
      id: "qwen2.5-1.5b-instruct",
      label: "Qwen2.5 1.5B Instruct",
      path: "/models/qwen2.5-1.5b-instruct/",
      parametersKey: "qwen15bParameters",
    },
    {
      id: "llama-3.2-1b-instruct",
      label: "Llama 3.2 1B Instruct",
      path: "/models/llama-3.2-1b-instruct/",
      parametersKey: "llama1bParameters",
    },
  ],
  "private-ai-chatbot": [
    {
      id: "phi-3-mini",
      label: "Phi-3 Mini",
      path: "/models/phi-3-mini/",
      parametersKey: "phi3MiniParameters",
    },
    {
      id: "qwen2.5-0.5b-instruct",
      label: "Qwen2.5 0.5B Instruct",
      path: "/models/qwen2.5-0.5b-instruct/",
      parametersKey: "qwen05bParameters",
    },
  ],
};

interface Message {
  role: "user" | "model";
  text: string;
}

export function LocalAiChatTool({ variant }: { variant: AiChatVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [modelId, setModelId] = React.useState(MODELS[variant][0].id);
  const [prompt, setPrompt] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "missing">("idle");
  const [note, setNote] = React.useState("");
  const [webgpu, setWebgpu] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const gpu = (navigator as unknown as { gpu?: unknown }).gpu;
    setWebgpu(Boolean(gpu));
  }, []);

  const model = MODELS[variant].find((entry) => entry.id === modelId) || MODELS[variant][0];

  const title =
    variant === "local-ai-chat"
      ? tUi("localAiChatTitle")
      : variant === "offline-ai-chat"
        ? tUi("offlineAiChatTitle")
        : tUi("privateAiChatbotTitle");
  const subtitle =
    variant === "local-ai-chat"
      ? tUi("localAiChatSubtitle")
      : variant === "offline-ai-chat"
        ? tUi("offlineAiChatSubtitle")
        : tUi("privateAiChatbotSubtitle");

  /**
   * Load the model from this site's own origin.
   *
   * The request stays on the origin, so no user content and no model file
   * ever leaves the machine. When the weights are not placed there, the tool
   * says exactly that instead of pretending to be ready.
   */
  const loadModel = async () => {
    setStatus("loading");
    setNote("");
    try {
      const response = await fetch(`${model.path}config.json`, { cache: "no-store" });
      if (!response.ok) {
        setStatus("missing");
        setNote(tUi("modelMissing"));
        return;
      }
      setStatus("ready");
      setNote(tUi("modelFound"));
    } catch {
      setStatus("missing");
      setNote(tUi("modelMissing"));
    }
  };

  const send = () => {
    const text = prompt.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setPrompt("");
    if (status !== "ready") {
      setNote(tUi("modelRequiredBeforeChat"));
      return;
    }
    setNote(tUi("inferenceNotBundled"));
  };

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button type="button" onClick={loadModel} className={devButtonClass}>
            <Cpu className="size-3.5" />
            {tUi("loadModel")}
          </button>
          <DevCopyButton
            value={messages.map((message) => `${message.role}: ${message.text}`).join("\n")}
            label={{ copy: tUi("copy"), copied: tUi("copied") }}
          />
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setNote("");
              setStatus("idle");
            }}
            className={devGhostButtonClass}
          >
            <Trash2 className="size-3.5" />
            {tUi("clearChat")}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("model")}
          <DevSelect
            value={modelId}
            onChange={setModelId}
            options={MODELS[variant].map((entry) => ({ value: entry.id, label: entry.label }))}
          />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {tUi(model.parametersKey)} · {model.path}
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="flex items-start gap-2 font-semibold">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{tUi("noModelBundled")}</span>
        </p>
        <p className="mt-2 pl-6">{tUi("noModelBundledDetail")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {tUi("webgpu")}:{" "}
          <span
            className={
              webgpu
                ? "font-bold text-emerald-600 dark:text-emerald-400"
                : "font-bold text-rose-600 dark:text-rose-400"
            }
          >
            {webgpu === null ? tUi("checking") : webgpu ? tUi("available") : tUi("notAvailable")}
          </span>
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {tUi("modelStatus")}:{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            {status === "idle"
              ? tUi("notLoaded")
              : status === "loading"
                ? tUi("loading")
                : status === "ready"
                  ? tUi("loaded")
                  : tUi("missing")}
          </span>
        </span>
      </div>

      {note ? <DevError>{note}</DevError> : null}
      {status === "ready" ? <DevOk>{tUi("modelFound")}</DevOk> : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("messages")}
        </p>
        <div className="max-h-72 min-h-24 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          {messages.length ? (
            messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "mb-2 rounded-lg bg-sky-100 px-3 py-2 text-xs text-slate-800 dark:bg-sky-950/60 dark:text-sky-100"
                    : "mb-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }
              >
                <span className="font-bold">
                  {message.role === "user" ? tUi("you") : tUi("model")}:{" "}
                </span>
                {message.text}
              </p>
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">{tUi("noMessages")}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("prompt")}
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder={tUi("promptPlaceholder")}
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <button type="button" onClick={send} className={devButtonClass}>
          {tUi("sendPrompt")}
        </button>
      </div>
    </DevPanel>
  );
}
