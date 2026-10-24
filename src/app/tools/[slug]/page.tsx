import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS_CATALOG, getToolBySlug } from "@/data/tools";
import { ToolShell } from "@/components/layout/ToolShell";
import { EngineDispatcher } from "@/components/engines/EngineDispatcher";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, getLocale, getMessages } from "next-intl/server";
import { ENGINE_NAMESPACES } from "@/data/engineNamespaces.generated";
import { pickMessages } from "@/i18n/pickMessages";
import { getLocalizedTool } from "@/utils/localizedTools";
import { getCanonicalUrl, getAlternateHreflang } from "@/i18n/domains";
import { SITE_NAME, OG_IMAGE, webApplicationJsonLd } from "@/lib/brand";

interface ToolPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return TOOLS_CATALOG.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: "Tool nicht gefunden",
      robots: { index: false },
    };
  }

  const locale = await getLocale();
  const localizedTool = getLocalizedTool(tool, locale);
  const isGerman = locale.startsWith("de");

  const pathname = `/tools/${tool.slug}`;
  const canonicalUrl = getCanonicalUrl(pathname, locale);
  const alternates = getAlternateHreflang(pathname);

  if (slug === "2026-calendar") {
    // The calendar ships its own headline copy in the message catalogue, so
    // it has to be resolved for the active locale - otherwise the English
    // page would publish the German title and description.
    const tMeta = await getTranslations("meta");
    const metaTitle = tMeta("title");
    const metaDescription = tMeta("description");
    return {
      title: metaTitle,
      description: metaDescription,
      openGraph: {
        title: metaTitle,
        description: metaDescription,
        url: canonicalUrl,
        siteName: SITE_NAME,
      images: [OG_IMAGE],
        type: "website",
      },
      alternates,
    };
  }

  const suffix = isGerman ? "kostenlos online" : "free online";
  // "<Tool> – kostenlos online | Rechnuvio" stays within ~60 chars; long names drop the suffix.
  const title = `${localizedTool.name} – ${suffix}`.length <= 48 ? `${localizedTool.name} – ${suffix}` : localizedTool.name;

  return {
    title,
    description: localizedTool.description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: localizedTool.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [OG_IMAGE],
      type: "website",
    },
    twitter: { title: `${title} | ${SITE_NAME}`, description: localizedTool.description, images: [OG_IMAGE.url] },
    alternates,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const locale = await getLocale();
  const localizedTool = getLocalizedTool(tool, locale);
  const appJsonLd = webApplicationJsonLd({
    name: localizedTool.name,
    slug: tool.slug,
    description: localizedTool.description,
    category: tool.category,
  });

  // Engines read strings from the large `ui` namespace on the client. Give
  // them only the namespaces their component tree uses (see
  // scripts/gen-engine-namespaces.mjs) rather than the whole catalog.
  const engineKey =
    tool.slug === "heads-or-tails" || tool.slug === "coin-flip"
      ? "__heads_or_tails"
      : ENGINE_NAMESPACES[tool.engine]
        ? tool.engine
        : "__default";
  const engineMessages = pickMessages(
    (await getMessages()) as Record<string, unknown>,
    ENGINE_NAMESPACES[engineKey]
  );

  return (
    <ToolShell tool={tool}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-500">
            {locale.startsWith("de") ? "Tool wird geladen …" : "Loading tool…"}
          </div>
        }
      >
        <NextIntlClientProvider locale={locale} messages={engineMessages}>
          <EngineDispatcher tool={tool} />
        </NextIntlClientProvider>
      </Suspense>
    </ToolShell>
  );
}
