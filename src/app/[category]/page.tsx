import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { TOOLS_CATALOG } from "@/data/tools";
import { getLocalizedTool } from "@/utils/localizedTools";
import { CATEGORY_MAP, CATEGORY_SLUGS } from "@/data/categorySlugs";

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({
    category,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORY_MAP[category];

  if (!cat) {
    return { title: "Page Not Found | Digital ToolPad" };
  }

  const tCat = await getTranslations("categories");
  const name = tCat.has(cat.nameKey as any) ? tCat(cat.nameKey as any) : cat.fallbackName;
  const description = tCat.has(cat.descKey as any) ? tCat(cat.descKey as any) : cat.fallbackDesc;

  return {
    title: `${name} - Free Online Browser Suite`,
    description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const cat = CATEGORY_MAP[category];

  if (!cat) {
    notFound();
  }

  const tCat = await getTranslations("categories");
  const tHome = await getTranslations("home");
  const locale = await getLocale();
  const isGerman = locale.startsWith("de");

  const name = tCat.has(cat.nameKey as any) ? tCat(cat.nameKey as any) : cat.fallbackName;
  const description = tCat.has(cat.descKey as any) ? tCat(cat.descKey as any) : cat.fallbackDesc;

  // Filter tools matching category
  const tools = TOOLS_CATALOG.filter(
    (t) =>
      t.slug.includes(cat.filterKey) ||
      t.category.toLowerCase().includes(cat.filterKey) ||
      t.keywords.some((k) => k.includes(cat.filterKey))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          <ShieldCheck className="size-3.5" />
          <span>{tHome("trustBadge")}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>

      {/* Tools Grid */}
      <div className="mt-8">
        <div className="mb-4 text-xs font-semibold text-slate-500">
          {isGerman
            ? `${tools.length} Tools in dieser Suite verfügbar`
            : `${tools.length} Tools Available in this Suite`}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => {
            const locTool = getLocalizedTool(tool, locale);
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500"
              >
                <div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {locTool.category}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                    {locTool.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {locTool.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700 dark:border-slate-800/80 dark:text-sky-400">
                  <span>{tHome("launchTool")}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
