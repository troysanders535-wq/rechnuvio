"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MessageSquare, Reply, TriangleAlert } from "lucide-react";
import {
  TimePanel,
  timeButtonClass,
  timeFieldLabelClass,
  timeGhostButtonClass,
  timeOutputClass,
} from "./kit";

const SAMPLE = `From: Alice Meyer <alice@example.com>
To: Bob Schmidt <bob@example.com>
Cc: Carol Novak <carol@example.com>
Subject: Quarterly report
Date: Mon, 12 Jan 2026 09:15:00 +0100
Message-ID: <20260112091500.12345@example.com>
Reply-To: Alice Meyer <alice@example.com>
In-Reply-To: <20260105090000.99999@example.com>
References: <20260105090000.99999@example.com> <20251230081500.11111@example.com>
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Authentication-Results: mx.example.com; dkim=pass

Hello Bob,

the quarterly report is attached, best regards
Alice`;

interface ParsedHeaders {
  fields: { name: string; value: string }[];
  body: string;
}

function parseRawEmail(raw: string): ParsedHeaders {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const separator = normalized.indexOf("\n\n");
  const headerBlock = separator >= 0 ? normalized.slice(0, separator) : normalized;
  const body = separator >= 0 ? normalized.slice(separator + 2).trim() : "";

  const fields: { name: string; value: string }[] = [];
  let current: { name: string; value: string } | null = null;
  headerBlock.split("\n").forEach((line) => {
    if (/^[ \t]/.test(line) && current) {
      current.value = `${current.value} ${line.trim()}`.trim();
      return;
    }
    const index = line.indexOf(":");
    if (index <= 0) return;
    current = { name: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
    fields.push(current);
  });

  return { fields, body };
}

/**
 * The reader of the headers of an email.
 *
 * The raw email is split into its headers and its body, the folded header
 * lines are joined again and the chain of the replied messages is listed.
 */
export function EmailHeaderAnalyzer() {
  const t = useTranslations("ui.engines.time");
  const [raw, setRaw] = useState(SAMPLE);

  const parsed = useMemo(() => parseRawEmail(raw), [raw]);

  const value = (name: string) => {
    const found = parsed.fields.find(
      (field) => field.name.toLowerCase() === name.toLowerCase(),
    );
    return found ? found.value : "";
  };

  const received = parsed.fields.filter((field) => field.name.toLowerCase() === "received");

  const shown = [
    "from",
    "to",
    "cc",
    "subject",
    "date",
    "message-id",
    "reply-to",
    "in-reply-to",
    "references",
    "return-path",
    "mime-version",
    "content-type",
    "authentication-results",
  ];

  const references = value("references")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const headerCount = parsed.fields.length;

  return (
    <TimePanel title={t("email.title")} subtitle={t("email.subtitle")}>
      <div>
        <label className={timeFieldLabelClass} htmlFor="email-headers">
          {t("email.pasteLabel")}
        </label>
        <textarea
          id="email-headers"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={12}
          spellCheck={false}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-300 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700"
        />
      </div>

      <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Mail className="size-4 text-sky-700" />
        {t("email.headerCount", { count: headerCount })}
      </p>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        {shown.map((name) => {
          const content = value(name);
          if (!content) return null;
          return (
            <li
              key={name}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-white px-4 py-2.5 text-xs dark:bg-slate-900"
            >
              <span className="w-40 shrink-0 font-semibold text-slate-700 dark:text-slate-200">
                {t(`email.headers.${name.replace(/-/g, "_")}`)}
              </span>
              <span className="min-w-0 flex-1 break-words font-mono text-slate-600 dark:text-slate-300">
                {content}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Reply className="size-4 text-sky-700" />
          {t("email.replyChain")}
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
          <li className="font-mono">
            {t("email.thisMessage")}: {value("message-id") || "-"}
          </li>
          <li className="font-mono">
            {t("email.replyTo")}: {value("in-reply-to") || "-"}
          </li>
          {references.length ? (
            references.map((entry, index) => (
              <li key={entry} className="font-mono">
                {t("email.reference", { index: index + 1 })}: {entry}
              </li>
            ))
          ) : (
            <li>{t("email.noReferences")}</li>
          )}
        </ul>
      </div>

      {received.length ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <MessageSquare className="size-4 text-sky-700" />
            {t("email.receivedChain", { count: received.length })}
          </p>
          <pre className={timeOutputClass}>{received.map((entry) => entry.value).join("\n")}</pre>
        </div>
      ) : null}

      <div>
        <p className={timeFieldLabelClass}>{t("email.body")}</p>
        <pre className={timeOutputClass}>{parsed.body || t("email.noBody")}</pre>
      </div>

      {!parsed.fields.length ? (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <TriangleAlert className="size-4" />
          {t("email.noHeaders")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRaw(SAMPLE)}
          className={timeGhostButtonClass}
        >
          {t("email.loadSample")}
        </button>
        <button
          type="button"
          onClick={() => setRaw("")}
          className={timeButtonClass}
        >
          {t("email.clear")}
        </button>
      </div>
    </TimePanel>
  );
}
