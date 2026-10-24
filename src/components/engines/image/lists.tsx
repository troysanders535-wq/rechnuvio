"use client";

/**
 * The workspaces that are not picture editors: the gift list, the name draw,
 * the font list, the link checkers and the Word document reader.
 */

import React, { useCallback, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  CodeBlock,
  DataList,
  DownloadButton,
  ErrorNote,
  Field,
  GhostButton,
  Note,
  Panel,
  PrimaryButton,
  useImageT,
} from "./kit";

/* ------------------------------------------------------------ gift tracker -- */

interface Gift {
  id: string;
  name: string;
  budget: number;
}

export function GiftTrackerView() {
  const t = useImageT();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("0");

  const total = gifts.reduce((sum, gift) => sum + (gift.budget || 0), 0);

  const addGift = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const value = Number(budget) || 0;
    setGifts([
      ...gifts,
      { id: `${Date.now()}-${trimmed}`, name: trimmed, budget: value },
    ]);
    setName("");
    setBudget("0");
  };

  const removeGift = (id: string) => {
    setGifts(gifts.filter((gift) => gift.id !== id));
  };

  return (
    <Panel title={t("giftTitle")} subtitle={t("giftSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("giftName")}>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("giftNamePlaceholder")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </Field>
            <Field label={t("giftBudget")}>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={addGift}>{t("giftAdd")}</PrimaryButton>
            <GhostButton onClick={() => setGifts([])}>{t("clearList")}</GhostButton>
          </div>
          <Note>{t("giftNote")}</Note>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("giftTotal")}
            </p>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
              {total.toFixed(2)}
            </p>
          </div>
          {gifts.length ? (
            <ul className="space-y-2">
              {gifts.map((gift) => (
                <li
                  key={gift.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {gift.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500">
                      {gift.budget.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGift(gift.id)}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      {t("remove")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("giftEmpty")}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------- gift exchange -- */

export function GiftExchangeView() {
  const t = useImageT();
  const [names, setNames] = useState("");
  const [excluded, setExcluded] = useState("");
  const [result, setResult] = useState<string[]>([]);

  const draw = () => {
    const pool = names
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const blocked = new Set(
      excluded
        .split(/[\n,]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    );
    const candidates = pool.filter((entry) => !blocked.has(entry.toLowerCase()));
    if (!candidates.length) {
      setResult([]);
      return;
    }
    const drawn: string[] = [];
    const rest = [...candidates];
    while (rest.length) {
      const index = Math.floor(Math.random() * rest.length);
      drawn.push(rest[index]);
      rest.splice(index, 1);
    }
    setResult(drawn);
  };

  return (
    <Panel title={t("exchangeTitle")} subtitle={t("exchangeSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("exchangeNames")} hint={t("exchangeNamesHint")}>
            <textarea
              value={names}
              onChange={(event) => setNames(event.target.value)}
              rows={8}
              placeholder={"Alex\nBlanca\nCem"}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("exchangeExclude")} hint={t("exchangeExcludeHint")}>
            <input
              type="text"
              value={excluded}
              onChange={(event) => setExcluded(event.target.value)}
              placeholder={t("exchangeExcludePlaceholder")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={draw}>{t("exchangeDraw")}</PrimaryButton>
            <GhostButton onClick={() => setResult([])}>{t("clear")}</GhostButton>
          </div>
          <Note>{t("exchangeNote")}</Note>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("exchangeResult")}
          </p>
          {result.length ? (
            <ol className="space-y-2">
              {result.map((entry, index) => (
                <li
                  key={entry}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="font-mono text-xs text-slate-400">
                    {index + 1}.
                  </span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {entry}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("exchangeEmpty")}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------- instagram fonts -- */

/**
 * The Instagram typefaces.
 *
 * The names are the style names and stay as they are; the notes are
 * translated, so the list is built with the translator of the image suite.
 */
function instagramFonts(t: (key: string) => string) {
  return [
    {
      name: "Classic",
      family: "Georgia, 'Times New Roman', serif",
      note: t("instagramFontSerifElegant"),
    },
    { name: "Modern", family: "Helvetica, Arial, sans-serif", note: t("instagramFontNeutralClean") },
    {
      name: "Neon",
      family: "'Trebuchet MS', Arial, sans-serif",
      note: t("instagramFontFriendlyRound"),
    },
    { name: "Strong", family: "Impact, 'Arial Black', sans-serif", note: t("instagramFontPoster") },
    { name: "Mono", family: "'Courier New', monospace", note: t("instagramFontTechnical") },
    {
      name: "Soft",
      family: "'Trebuchet MS', sans-serif",
      note: t("instagramFontSoftEdges"),
    },
    { name: "Loud", family: "'Arial Black', Arial, sans-serif", note: t("instagramFontHeavy") },
    {
      name: "Calm",
      family: "'Palatino Linotype', Georgia, serif",
      note: t("instagramFontBookish"),
    },
  ];
}

export function InstagramFontsView() {
  const t = useImageT();
  const fonts = useMemo(() => instagramFonts(t), [t]);
  const [font, setFont] = useState(fonts[0].family);
  const [sample, setSample] = useState("Save the date");

  return (
    <Panel title={t("instagramFontsTitle")} subtitle={t("instagramFontsSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("fontPreviewText")}>
            <input
              type="text"
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Field label={t("fontPreviewFont")}>
            <select
              value={font}
              onChange={(event) => setFont(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {fonts.map((entry) => (
                <option key={entry.name} value={entry.family}>
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
          <div
            className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950"
            style={{ fontFamily: font }}
          >
            <span className="text-2xl text-slate-900 dark:text-white">
              {sample || t("fontPreviewText")}
            </span>
          </div>
          <Note>{t("instagramFontsNote")}</Note>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("fontList")}
          </p>
          <ul className="space-y-2">
            {fonts.map((entry) => (
              <li
                key={entry.name}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-sm text-slate-900 dark:text-white"
                    style={{ fontFamily: entry.family }}
                  >
                    {entry.name}
                  </span>
                  <span className="text-[11px] text-slate-500">{entry.note}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {entry.family}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------- open graph tools -- */

interface OgTag {
  property: string;
  content: string;
}

/** Read the Open Graph tags of a piece of HTML. */
function readOgTags(html: string): OgTag[] {
  if (!html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(
    doc.querySelectorAll('meta[property], meta[name]'),
  );
  const tags: OgTag[] = [];
  for (const node of nodes) {
    const property =
      node.getAttribute("property") || node.getAttribute("name") || "";
    if (!/^(og:|twitter:|description$|title$)/i.test(property)) continue;
    const content = node.getAttribute("content") || "";
    if (content) tags.push({ property, content });
  }
  return tags;
}

export function OgCheckerView({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  const t = useImageT();
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [tags, setTags] = useState<OgTag[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const read = () => {
    const found = readOgTags(html);
    setTags(found);
    setMessage(
      found.length
        ? t("ogTagsFound", { count: String(found.length) })
        : t("ogTagsNone"),
    );
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("urlField")} hint={t("urlFieldHint")}>
            <input
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/page"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Note>{note}</Note>
          <Note tone="warn">{t("ogFetchDisabled")}</Note>
        </div>

        <div className="space-y-4">
          <Field label={t("pasteHtml")} hint={t("pasteHtmlHint")}>
            <textarea
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={'<meta property="og:title" content="...">'}
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-sky-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={read}>{t("readOgTags")}</PrimaryButton>
            <GhostButton onClick={() => setHtml("")}>{t("clear")}</GhostButton>
          </div>
          {message ? <p className="text-xs text-slate-500">{message}</p> : null}
          {tags.length ? (
            <DataList
              items={tags.map((tag) => ({
                label: tag.property,
                value: tag.content,
              }))}
            />
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ youtube tools -- */

function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = /^[A-Za-z0-9_-]{11}$/.exec(trimmed);
  if (match) return trimmed;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const hit = pattern.exec(trimmed);
    if (hit) return hit[1];
  }
  return null;
}

const THUMBNAIL_SIZES = [
  { name: "maxresdefault", label: "1280 × 720 (maxresdefault)" },
  { name: "sddefault", label: "640 × 480 (sddefault)" },
  { name: "hqdefault", label: "480 × 360 (hqdefault)" },
  { name: "mqdefault", label: "320 × 180 (mqdefault)" },
  { name: "default", label: "120 × 90 (default)" },
];

export function YoutubeThumbnailView({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  const t = useImageT();
  const [link, setLink] = useState("");
  const id = useMemo(() => youtubeId(link), [link]);

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("youtubeLink")} hint={t("youtubeLinkHint")}>
            <input
              type="text"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("youtubeVideoId")}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-900 dark:text-white">
              {id || t("youtubeNoId")}
            </p>
          </div>
          <Note>{note}</Note>
          <Note tone="warn">{t("youtubeNoDownload")}</Note>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("youtubeThumbnailUrls")}
          </p>
          {id ? (
            <ul className="space-y-2">
              {THUMBNAIL_SIZES.map((entry) => (
                <li
                  key={entry.name}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {entry.label}
                  </p>
                  <p className="break-all font-mono text-[11px] text-slate-500">
                    {`https://i.ytimg.com/vi/${id}/${entry.name}.jpg`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("youtubeNoId")}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------- word files -- */

interface WordFacts {
  author: string;
  title: string;
  lastModifiedBy: string;
  created: string;
  company: string;
}

function textOf(doc: Document, ...names: string[]): string {
  const nodes = doc.getElementsByTagName("*");
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const qualified = node.tagName || "";
    const local = node.localName || "";
    for (const name of names) {
      if (qualified === name || local === name) {
        const text = (node.textContent || "").trim();
        if (text) return text;
      }
    }
  }
  return "";
}

export function WordMetadataView() {
  const t = useImageT();
  const [facts, setFacts] = useState<WordFacts | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [zip, setZip] = useState<JSZip | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFacts(null);
      try {
        const archive = await JSZip.loadAsync(await file.arrayBuffer());
        setZip(archive);
        setFileName(file.name);
        const core = await archive.file("docProps/core.xml")?.async("string");
        const app = await archive.file("docProps/app.xml")?.async("string");
        const coreDoc = core
          ? new DOMParser().parseFromString(core, "application/xml")
          : null;
        const appDoc = app
          ? new DOMParser().parseFromString(app, "application/xml")
          : null;
        setFacts({
          author: coreDoc ? textOf(coreDoc, "dc:creator", "creator") : "",
          title: coreDoc ? textOf(coreDoc, "dc:title", "title") : "",
          lastModifiedBy: coreDoc
            ? textOf(coreDoc, "cp:lastModifiedBy", "lastModifiedBy")
            : "",
          created: coreDoc
            ? textOf(coreDoc, "dcterms:created", "created")
            : "",
          company: appDoc ? textOf(appDoc, "Company", "company") : "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const downloadClean = async () => {
    if (!zip) return;
    try {
      zip.remove("docProps/core.xml");
      zip.remove("docProps/app.xml");
      const bytes = await zip.generateAsync({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const anchor = document.createElement("a");
      const url = URL.createObjectURL(bytes);
      anchor.href = url;
      anchor.download = fileName.replace(/\.[^.]+$/, "") + "-ohne-metadaten.docx";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Panel title={t("wordTitle")} subtitle={t("wordSubtitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label={t("wordFile")}>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>
          <Note>{t("wordNote")}</Note>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {facts ? (
            <DownloadButton onClick={downloadClean} label={t("wordDownloadClean")} />
          ) : null}
        </div>

        <div className="space-y-3">
          {facts ? (
            <>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("wordProperties")}
              </p>
              <DataList
                items={[
                  { label: t("wordAuthor"), value: facts.author || t("notPresent") },
                  { label: t("wordTitleLabel"), value: facts.title || t("notPresent") },
                  {
                    label: t("wordLastModifiedBy"),
                    value: facts.lastModifiedBy || t("notPresent"),
                  },
                  { label: t("wordCreated"), value: facts.created || t("notPresent") },
                  { label: t("wordCompany"), value: facts.company || t("notPresent") },
                ]}
              />
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("wordNoFile")}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ codes -- */

/** A short code preview of the CSS of a page, used by the preview tools. */
export function SocialPreviewView() {
  const t = useImageT();
  const [url, setUrl] = useState("");
  return (
    <Panel title={t("socialTitle")} subtitle={t("socialSubtitle")}>
      <div className="space-y-4">
        <Field label={t("urlField")} hint={t("urlFieldHint")}>
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/page"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </Field>
        <Note>{t("socialNote")}</Note>
        <Note tone="warn">{t("ogFetchDisabled")}</Note>
        {url ? <CodeBlock label={t("socialLinkLabel")} value={url} /> : null}
      </div>
    </Panel>
  );
}
