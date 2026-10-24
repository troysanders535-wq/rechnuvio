"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Copy, Download, TriangleAlert } from "lucide-react";
import {
  TimePanel,
  formatDateTime,
  timeButtonClass,
  timeFieldLabelClass,
  timeGhostButtonClass,
  timeInputClass,
  timeOutputClass,
} from "./kit";
import {
  cronBreakdown,
  descriptionToCron,
  formatCron,
  nextCronRuns,
  parseCronExpression,
  type CronBreakdown as CronBreakdownRow,
  type CronFields,
} from "./cron";

const PRESETS: { key: string; fields: CronFields }[] = [
  {
    key: "everyMinute",
    fields: { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  },
  {
    key: "everyFiveMinutes",
    fields: { minute: "*/5", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  },
  {
    key: "hourly",
    fields: { minute: "0", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  },
  {
    key: "dailyAtMidnight",
    fields: { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  },
  {
    key: "weeklyOnMonday",
    fields: { minute: "0", hour: "9", dayOfMonth: "*", month: "*", dayOfWeek: "1" },
  },
  {
    key: "monthlyOnFirst",
    fields: { minute: "0", hour: "0", dayOfMonth: "1", month: "*", dayOfWeek: "*" },
  },
];

/** The builder of a cron expression. */
export function CronGenerator() {
  const t = useTranslations("ui.engines.time");
  const locale = useLocale();

  const [minute, setMinute] = useState("*/5");
  const [hour, setHour] = useState("*");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");
  const [runs, setRuns] = useState<Date[]>([]);

  const expression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  const valid = parseCronExpression(expression) !== null;

  useEffect(() => {
    const fields = parseCronExpression(expression);
    setRuns(fields ? nextCronRuns(fields, 5, new Date()) : []);
  }, [minute, hour, dayOfMonth, month, dayOfWeek]);

  return (
    <TimePanel
      title={t("cron.generatorTitle")}
      subtitle={t("cron.generatorSubtitle")}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={timeFieldLabelClass} htmlFor="cron-minute">
            {t("cron.fields.minute")}
          </label>
          <input
            id="cron-minute"
            type="text"
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="cron-hour">
            {t("cron.fields.hour")}
          </label>
          <input
            id="cron-hour"
            type="text"
            value={hour}
            onChange={(event) => setHour(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="cron-day-of-month">
            {t("cron.fields.dayOfMonth")}
          </label>
          <input
            id="cron-day-of-month"
            type="text"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="cron-month">
            {t("cron.fields.month")}
          </label>
          <input
            id="cron-month"
            type="text"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="cron-day-of-week">
            {t("cron.fields.dayOfWeek")}
          </label>
          <input
            id="cron-day-of-week"
            type="text"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value)}
            className={timeInputClass}
          />
        </div>
      </div>

      <div>
        <p className={timeFieldLabelClass}>{t("cron.expression")}</p>
        <p className="mt-1.5 rounded-xl border border-slate-300 bg-slate-950 px-3 py-3 font-mono text-sm text-sky-300">
          {expression}
        </p>
      </div>

      <div>
        <p className={timeFieldLabelClass}>{t("cron.presetLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                setMinute(preset.fields.minute);
                setHour(preset.fields.hour);
                setDayOfMonth(preset.fields.dayOfMonth);
                setMonth(preset.fields.month);
                setDayOfWeek(preset.fields.dayOfWeek);
              }}
              className={timeGhostButtonClass}
            >
              {t(`cron.presets.${preset.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <CalendarClock className="size-4 text-sky-700" />
          {t("cron.nextRuns")}
        </p>
        {!valid ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <TriangleAlert className="size-4" />
            {t("cron.invalidExpression")}
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {runs.map((run) => (
              <li
                key={run.getTime()}
                className="rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
              >
                {formatDateTime(run, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </TimePanel>
  );
}

/** The reader of a cron expression. */
export function CronParser() {
  const t = useTranslations("ui.engines.time");
  const locale = useLocale();

  const [expression, setExpression] = useState("*/5 * * * *");
  const [breakdown, setBreakdown] = useState<CronBreakdownRow[]>([]);
  const [runs, setRuns] = useState<Date[]>([]);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    const fields = parseCronExpression(expression);
    if (!fields) {
      setValid(false);
      setBreakdown([]);
      setRuns([]);
      return;
    }
    setValid(true);
    setBreakdown(cronBreakdown(fields));
    setRuns(nextCronRuns(fields, 5, new Date()));
  }, [expression]);

  return (
    <TimePanel title={t("cron.parserTitle")} subtitle={t("cron.parserSubtitle")}>
      <div>
        <label className={timeFieldLabelClass} htmlFor="cron-expression">
          {t("cron.pasteExpression")}
        </label>
        <input
          id="cron-expression"
          type="text"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          className={timeInputClass}
          spellCheck={false}
        />
      </div>

      {!valid ? (
        <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <TriangleAlert className="size-4" />
          {t("cron.invalidExpression")}
        </p>
      ) : (
        <>
          <div>
            <p className={timeFieldLabelClass}>{t("cron.breakdown")}</p>
            <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {breakdown.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-wrap items-baseline justify-between gap-2 bg-white px-3 py-2 text-xs dark:bg-slate-900"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {t(`cron.fields.${row.key}`)}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {row.value}
                  </span>
                  <span className="w-full text-[11px] text-slate-500 dark:text-slate-400">
                    {t("cron.matches", { count: row.values.length })}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <CalendarClock className="size-4 text-sky-700" />
              {t("cron.nextRuns")}
            </p>
            <ul className="mt-2 space-y-1">
              {runs.map((run) => (
                <li
                  key={run.getTime()}
                  className="rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
                >
                  {formatDateTime(run, locale)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </TimePanel>
  );
}

/** The builder of a crontab file. */
export function CrontabGenerator() {
  const t = useTranslations("ui.engines.time");

  const [description, setDescription] = useState("every 5 minutes");
  const [command, setCommand] = useState("/usr/bin/backup --daily");
  const [expression, setExpression] = useState("*/5 * * * *");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fields = descriptionToCron(description);
    const expressionText = fields ? formatCron(fields) : expression;
    const lines = [
      "# Digital ToolPad crontab",
      `# description: ${description.trim() || "-"}`,
      `# expression: ${expressionText}`,
      "",
      `${expressionText} ${command.trim()}`,
      "",
    ];
    setContent(lines.join("\n"));
  }, [description, command, expression]);

  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crontab.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard?.writeText(content).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  };

  return (
    <TimePanel title={t("crontab.title")} subtitle={t("crontab.subtitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={timeFieldLabelClass} htmlFor="crontab-description">
            {t("crontab.description")}
          </label>
          <input
            id="crontab-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={timeInputClass}
          />
        </div>
        <div>
          <label className={timeFieldLabelClass} htmlFor="crontab-command">
            {t("crontab.command")}
          </label>
          <input
            id="crontab-command"
            type="text"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className={timeInputClass}
          />
        </div>
      </div>

      <div>
        <label className={timeFieldLabelClass} htmlFor="crontab-expression">
          {t("cron.expression")}
        </label>
        <input
          id="crontab-expression"
          type="text"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          className={timeInputClass}
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {t("crontab.expressionHint")}
        </p>
      </div>

      <div>
        <p className={timeFieldLabelClass}>{t("crontab.file")}</p>
        <pre className={timeOutputClass}>{content}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={timeButtonClass}>
          <Copy className="size-3.5" />
          {copied ? t("crontab.copied") : t("crontab.copy")}
        </button>
        <button type="button" onClick={download} className={timeGhostButtonClass}>
          <Download className="size-3.5" />
          {t("crontab.download")}
        </button>
      </div>
    </TimePanel>
  );
}
