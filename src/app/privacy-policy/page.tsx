import { Metadata } from "next";
import { pageAlternates } from "@/lib/brand";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacyPolicyPage");
  return {
    title: t("title"),
    description: t("s1Desc"),
    alternates: pageAlternates("/privacy-policy"),
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacyPolicyPage");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-6">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-xs text-slate-500">{t("lastUpdated")}</p>
      </div>

      <section>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("s1Title")}</h2>
        <p className="mt-2">{t("s1Desc")}</p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("s2Title")}</h2>
        <p className="mt-2">{t("s2Desc")}</p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("s3Title")}</h2>
        <p className="mt-2">{t("s3Desc")}</p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("s4Title")}</h2>
        <p className="mt-2">{t("s4Desc")}</p>
      </section>
    </div>
  );
}
