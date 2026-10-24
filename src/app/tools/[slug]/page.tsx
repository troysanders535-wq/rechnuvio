import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS_CATALOG, getToolBySlug } from "@/data/tools";
import { ToolShell } from "@/components/layout/ToolShell";
import { EngineDispatcher } from "@/components/engines/EngineDispatcher";
import { getTranslations } from "next-intl/server";

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

  const pathname = `/tools/${tool.slug}`;
  const enUrl = `https://www.digitaltoolpad.com${pathname}`;
  const deUrl = `https://de.digitaltoolpad.com${pathname}`;
  const alternates = {
    languages: {
      en: enUrl,
      "de-DE": deUrl,
      "x-default": enUrl,
    },
  };

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

  return {
    title: `${tool.name} - Free Online Browser Tool`,
    description: tool.description,
    keywords: tool.keywords,
    openGraph: {
      title: `${tool.name} | Digital ToolPad`,
      description: tool.description,
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
