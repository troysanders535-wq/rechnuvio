"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  CopyButton,
  Field,
  Note,
  NumberInput,
  Panel,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
} from "@/components/engines/TextKit";

type TokenEncoder = { encode: (text: string) => number[] };

type LoadedTokenizers = { gpt4: TokenEncoder; gpt5: TokenEncoder };

async function loadTokenizers(): Promise<LoadedTokenizers | null> {
  try {
    const { Tiktoken } = await import("js-tiktoken/lite");
    const { default: cl100k } = await import("js-tiktoken/ranks/cl100k_base");
    const { default: o200k } = await import("js-tiktoken/ranks/o200k_base");
    return { gpt4: new Tiktoken(cl100k), gpt5: new Tiktoken(o200k) };
  } catch {
    return null;
  }
}

function estimateTokens(characters: number, charsPerToken: number): number {
  if (characters <= 0) return 0;
  return Math.ceil(characters / charsPerToken);
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0.00";
  if (value >= 1) return "$" + value.toFixed(2);
  if (value >= 0.01) return "$" + value.toFixed(4);
  return "$" + value.toFixed(6);
}

/**
 * A translator that resolves a catalogue key to a localized string.
 */
type Translate = (key: string, values?: Record<string, string | number>) => string;

function buildSummary(
  modelName: string,
  tokens: number,
  characters: number,
  words: number,
  cost: number,
  isExact: boolean,
  t: Translate
): string {
  const charsPerToken = tokens > 0 ? (characters / tokens).toFixed(2) : "0.00";
  return [
    t("summaryModel", { model: modelName }),
    isExact
      ? t("summaryTokens", { tokens: String(tokens) })
      : t("summaryTokensEstimated", { tokens: String(tokens) }),
    t("summaryCharacters", { characters: String(characters) }),
    t("summaryCharactersPerToken", { ratio: charsPerToken }),
    t("summaryWords", { words: String(words) }),
    t("summaryEstimatedCost", { cost: formatUsd(cost) }),
  ].join("\n");
}

export function TextTokenWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextTokenWorkspace");
  const [text, setText] = useState("");
  const [model, setModel] = useState<string>(
    slug === "llm-token-counter" ? "gpt5" : "gpt4"
  );
  const [contextSize, setContextSize] = useState("128000");
  const [prices, setPrices] = useState<Record<string, number>>({
    gpt4: 2.5,
    gpt5: 1.25,
    claude: 3,
    gemini: 1.25,
    llama: 3,
  });
  const [encoders, setEncoders] = useState<{
    gpt4?: TokenEncoder;
    gpt5?: TokenEncoder;
  }>({});
  const [encoderState, setEncoderState] = useState<
    "loading" | "ready" | "fallback"
  >("loading");

  const isContextTool = slug === "ai-token-counter";
  const isCostTool = slug === "llm-token-counter" || slug === "ai-token-counter";
  const costProminent = slug === "llm-token-counter";
  const contextOrder = "order-1";
  const comparisonOrder = "order-2";
  const costOrder = costProminent ? "order-1" : "order-3";

  useEffect(() => {
    let cancelled = false;
    loadTokenizers().then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setEncoders(loaded);
        setEncoderState("ready");
      } else {
        setEncoderState("fallback");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const exactReady = encoderState === "ready";
  const gpt4Tokens = encoders.gpt4
    ? encoders.gpt4.encode(text).length
    : estimateTokens(characters, 4);
  const gpt5Tokens = encoders.gpt5
    ? encoders.gpt5.encode(text).length
    : estimateTokens(characters, 4);
  const claudeTokens = estimateTokens(characters, 3.6);
  const geminiTokens = estimateTokens(characters, 4);
  const llamaTokens = estimateTokens(characters, 3.7);

  const tokenByModel: Record<string, number> = {
    gpt4: gpt4Tokens,
    gpt5: gpt5Tokens,
    claude: claudeTokens,
    gemini: geminiTokens,
    llama: llamaTokens,
  };
  const selectedTokens = tokenByModel[model] ?? 0;
  const selectedIsExact = (model === "gpt4" || model === "gpt5") && exactReady;
  const selectedModelName =
    model === "gpt4"
      ? tUi("gPT4GPT4o")
      : model === "gpt5"
        ? tUi("gPT5OSeries")
        : model === "claude"
          ? "Claude"
          : model === "gemini"
            ? tUi("gemini")
            : tUi("llama");
  const price = prices[model] ?? 0;
  const cost = (selectedTokens / 1_000_000) * price;
  const limit = Number(contextSize);
  const usedPercent = limit > 0 ? (selectedTokens / limit) * 100 : 0;
  const overLimit = selectedTokens > limit;
  const charsPerToken =
    selectedTokens > 0 ? (characters / selectedTokens).toFixed(2) : "0.00";
  const summary = useMemo(
    () =>
      buildSummary(
        selectedModelName,
        selectedTokens,
        characters,
        words,
        cost,
        selectedIsExact,
        tUi
      ),
    [
      selectedModelName,
      selectedTokens,
      characters,
      words,
      cost,
      selectedIsExact,
      tUi,
    ]
  );

  const handlePriceChange = useCallback(
    (value: number) => {
      setPrices((prev) => ({
        ...prev,
        [model]: Number.isFinite(value) ? value : 0,
      }));
    },
    [model]
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <Toolbar>
          <ButtonGroup>
            <ActionButton onClick={() => setText("")} title={tUi("clearTheText")}>
              {tUi("clear")}
            </ActionButton>
          </ButtonGroup>
          <ButtonGroup>
            <CopyButton
              value={summary}
              label={tUi("copy")}
              title={tUi("copyTheTokenSummary")}
            />
          </ButtonGroup>
        </Toolbar>

        <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={tUi("model")} htmlFor="token-model">
              <SelectInput
                id="token-model"
                value={model}
                onChange={setModel}
                options={[
                  {
                    value: "gpt4",
                    label: exactReady ? tUi("gPT4GPT4oExact") : tUi("gPT4GPT4oEstimate"),
                  },
                  {
                    value: "gpt5",
                    label: exactReady ? tUi("gPT5OSeriesExact") : tUi("gPT5OSeriesEstimate"),
                  },
                  { value: "claude", label: tUi("claudeEstimate") },
                  { value: "gemini", label: tUi("geminiEstimate") },
                  { value: "llama", label: tUi("llamaEstimate") },
                ]}
              />
            </Field>
            <div className="flex items-end">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tUi("everythingRunsLocallyInYourBrowser")}
              </p>
            </div>
          </div>
        </div>

        <TextArea
          id="token-text"
          value={text}
          onChange={setText}
          rows={10}
          placeholder={tUi("pasteAPromptOrTextToCountTokens")}
        />

        {encoderState === "loading" ? (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            {tUi("loadingTokenizers")}
          </div>
        ) : null}
        {encoderState === "fallback" ? (
          <div className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-700 dark:border-slate-800 dark:bg-amber-950/40 dark:text-amber-300">
            {tUi("tokenizerUnavailableShowingEstimates")}
          </div>
        ) : null}

        <StatGrid>
          <StatCard
            value={selectedTokens}
            label={selectedIsExact ? tUi("tokensExact") : tUi("tokensEstimated")}
          />
          <StatCard value={characters} label={tUi("characters")} />
          <StatCard value={charsPerToken} label={tUi("charactersPerToken")} />
          <StatCard value={words} label={tUi("words")} />
          <StatCard value={formatUsd(cost)} label={tUi("estimatedCost")} />
        </StatGrid>

        <Note>
          {selectedIsExact
            ? tUi("thisCountComesFromTheExactOpenAIBPETokenizer")
            : tUi("thisCountIsAnEstimateFromACharacterRatio")}
        </Note>
      </Panel>

      {isContextTool ? (
        <Panel className={contextOrder}>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SectionTitle>{tUi("contextLimit")}</SectionTitle>
          </div>
          <div className="space-y-3 p-4">
            <Field label={tUi("contextWindow")} htmlFor="token-context">
              <SelectInput
                id="token-context"
                value={contextSize}
                onChange={setContextSize}
                options={[
                  { value: "8000", label: "8K tokens" },
                  { value: "32000", label: "32K tokens" },
                  { value: "64000", label: "64K tokens" },
                  { value: "128000", label: "128K tokens" },
                  { value: "200000", label: "200K tokens" },
                  { value: "1000000", label: "1M tokens" },
                ]}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{tUi("contextUsed")}</span>
              <span>
                {tUi("contextUsedTokens", {
                  used: String(selectedTokens),
                  limit: String(limit),
                  percent: usedPercent.toFixed(1),
                })}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={
                  overLimit
                    ? "h-full rounded-full bg-rose-500"
                    : "h-full rounded-full bg-sky-500"
                }
                style={{ width: `${Math.min(100, usedPercent)}%` }}
              />
            </div>
          </div>
          {overLimit ? (
            <Note>{tUi("thisPromptIsLongerThanTheSelectedContextLimit")}</Note>
          ) : null}
        </Panel>
      ) : null}

      <Panel className={comparisonOrder}>
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <SectionTitle>{tUi("tokenCountByModel")}</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-semibold">{tUi("model")}</th>
                <th className="px-4 py-2 font-semibold">{tUi("method")}</th>
                <th className="px-4 py-2 text-right font-semibold">{tUi("tokens")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "gpt4", label: exactReady ? tUi("gPT4GPT4oExact") : tUi("gPT4GPT4oEstimate"), method: exactReady ? "cl100k_base (exact)" : "~4.0 chars/token", tokens: gpt4Tokens },
                { key: "gpt5", label: exactReady ? tUi("gPT5OSeriesExact") : tUi("gPT5OSeriesEstimate"), method: exactReady ? "o200k_base (exact)" : "~4.0 chars/token", tokens: gpt5Tokens },
                { key: "claude", label: tUi("claudeEstimate"), method: "~3.6 chars/token", tokens: claudeTokens },
                { key: "gemini", label: tUi("geminiEstimate"), method: "~4.0 chars/token", tokens: geminiTokens },
                { key: "llama", label: tUi("llamaEstimate"), method: "~3.7 chars/token", tokens: llamaTokens },
              ].map((row) => (
                <tr
                  key={row.key}
                  className={`border-t border-slate-200 dark:border-slate-800 ${
                    row.key === model
                      ? "bg-sky-50 dark:bg-sky-950/40"
                      : ""
                  }`}
                >
                  <td
                    className={`px-4 py-2 font-medium ${
                      row.key === model
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {row.method}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white">
                    {row.tokens}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>{tUi("onlyTheGPTModelsUseTheExactOpenAIBPETokenizer")}</Note>
        <Note>{tUi("claudeGeminiAndLlamaCountsAreEstimates")}</Note>
      </Panel>

      {isCostTool ? (
        <Panel className={costOrder}>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SectionTitle>{tUi("costEstimate")}</SectionTitle>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {selectedModelName}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                  {formatUsd(cost)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tUi("estimatedCostForThisText")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Field label={tUi("pricePer1MInputTokensUSD")} htmlFor="token-price">
                  <NumberInput
                    id="token-price"
                    value={price}
                    min={0}
                    step={0.01}
                    onChange={handlePriceChange}
                  />
                </Field>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tUi("tokensAtPricePer1M", {
                    tokens: String(selectedTokens),
                    price: price.toFixed(2),
                  })}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-semibold">{tUi("model")}</th>
                    <th className="px-4 py-2 text-right font-semibold">
                      {tUi("pricePer1MInputTokens")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: tUi("gPT4o"), price: 2.5 },
                    { name: tUi("gPT4oMini"), price: 0.15 },
                    { name: tUi("gPT5"), price: 1.25 },
                    { name: tUi("claudeSonnet"), price: 3 },
                    { name: tUi("claudeOpus"), price: 15 },
                    { name: tUi("gemini"), price: 1.25 },
                    { name: tUi("llama"), price: 3 },
                  ].map((row) => (
                    <tr
                      key={row.name}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="px-4 py-1.5 text-slate-700 dark:text-slate-200">
                        {row.name}
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-600 dark:text-slate-300">
                        {row.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Note>{tUi("costTokensDividedBy1000000TimesThePrice")}</Note>
        </Panel>
      ) : null}
    </div>
  );
}
