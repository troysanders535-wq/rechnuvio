"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IMPRESSUM } from "@/lib/brand";
import { Send, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const isGerman = useLocale().startsWith("de");
  const contactEmail = IMPRESSUM.email.trim();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // There is no mail backend: the form opens the visitor's mail client with
    // the message prefilled, so nothing is shown as "sent" when it was not.
    const subject = encodeURIComponent(`Rechnuvio: ${name}`);
    const body = encodeURIComponent(`${message}

${name} <${email}>`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {!contactEmail ? (
          <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">
            {isGerman
              ? "Das Kontaktformular ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut."
              : "The contact form is currently unavailable. Please try again later."}
          </p>
        ) : submitted ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              {t("thankYou")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("thankYouDesc")}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setName("");
                setEmail("");
                setMessage("");
              }}
              className="mt-6 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              {t("sendAnother")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("nameLabel")}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("emailLabel")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("messageLabel")}
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 shadow-sm"
            >
              <Send className="size-3.5" />
              <span>{t("submitButton")}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
