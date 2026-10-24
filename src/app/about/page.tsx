import { Metadata } from "next";
import { pageAlternates } from "@/lib/brand";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, Zap, Globe } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aboutPage");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates("/about"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("missionHeading")}
          </h2>
          <p className="mt-3">{t("missionP1")}</p>
          <p className="mt-3">{t("missionP2")}</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck className="size-8 text-sky-700 dark:text-sky-400" />
            <h3 className="mt-3 font-bold text-slate-900 dark:text-white">
              {t("pillar1Title")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("pillar1Desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <Zap className="size-8 text-emerald-600 dark:text-emerald-400" />
            <h3 className="mt-3 font-bold text-slate-900 dark:text-white">
              {t("pillar2Title")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("pillar2Desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <Globe className="size-8 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-3 font-bold text-slate-900 dark:text-white">
              {t("pillar3Title")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("pillar3Desc")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
