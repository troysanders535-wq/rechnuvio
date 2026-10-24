import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS_CATALOG, getToolBySlug } from "@/data/tools";
import { ToolShell } from "@/components/layout/ToolShell";
import { EngineDispatcher } from "@/components/engines/EngineDispatcher";
import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedTool } from "@/utils/localizedTools";
import { getCanonicalUrl, getAlternateHreflang } from "@/i18n/domains";

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
      title: "Tool Not Found",
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
        siteName: "Digital ToolPad",
        type: "website",
      },
      alternates,
    };
  }

  const suffix = isGerman ? "Kostenloses Online-Browser-Tool" : "Free Online Browser Tool";

  return {
    title: `${localizedTool.name} - ${suffix}`,
    description: localizedTool.description,
    keywords: tool.keywords,
    openGraph: {
      title: `${localizedTool.name} | Digital ToolPad`,
      description: localizedTool.description,
      siteName: "Digital ToolPad",
      type: "website",
    },
    alternates,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolShell tool={tool}>
      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-500">
            Loading tool workspace...
          </div>
        }
      >
        <EngineDispatcher tool={tool} />
      </Suspense>
    </ToolShell>
  );
}
