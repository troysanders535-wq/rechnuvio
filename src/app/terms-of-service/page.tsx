import { Metadata } from "next";
import { pageAlternates } from "@/lib/brand";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("termsOfServicePage");
  return {
    title: t("title"),
    description: t("s1Desc"),
    alternates: pageAlternates("/terms-of-service"),
  };
}

export default async function TermsOfServicePage() {
  const t = await getTranslations("termsOfServicePage");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-6">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-xs text-slate-500">{t("effectiveDate")}</p>
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
    </div>
  );
}
