import { Metadata } from "next";
import { pageAlternates, OG_IMAGE } from "@/lib/brand";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BLOG_POSTS } from "@/data/blogPosts";
import { getToolBySlug } from "@/data/tools";
import { getLocalizedTool } from "@/utils/localizedTools";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Artikel nicht gefunden", robots: { index: false } };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: pageAlternates(`/blog/${post.slug}`),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `https://rechnuvio.de/blog/${post.slug}`,
      siteName: "Rechnuvio",
      images: [OG_IMAGE],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const t = await getTranslations("blogPage");
  const relatedTools = post.toolSlugs
    .map((toolSlug) => getToolBySlug(toolSlug))
    .filter((tool) => tool !== undefined)
    .map((tool) => getLocalizedTool(tool, "de-DE"));
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.isoDate,
    dateModified: post.isoDate,
    inLanguage: "de-DE",
    mainEntityOfPage: `https://rechnuvio.de/blog/${post.slug}`,
    author: { "@type": "Organization", name: "Rechnuvio" },
    publisher: { "@id": "https://rechnuvio.de/#organization" },
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-800 dark:hover:text-sky-300"
      >
        <ArrowLeft className="size-3.5" />
        <span>{t("backToArticles")}</span>
      </Link>

      <div className="mt-6 border-b border-slate-200 pb-8 dark:border-slate-800">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          {post.category}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-tight">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {post.readTime}
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5" />
            {t("verifiedPlaybook")}
          </span>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none text-sm leading-relaxed space-y-6">
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          {post.excerpt}
        </p>

        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {relatedTools.length > 0 && (
          <section>
            <h2>Passende Rechner und Tools</h2>
            <ul>
              {relatedTools.map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`}>{tool.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-6 dark:border-sky-900/60 dark:bg-sky-950/40">
          <h4 className="font-bold text-sky-900 dark:text-sky-200 text-sm">
            {t("tryInBrowserTitle")}
          </h4>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {t("tryInBrowserDesc")}
          </p>
          <div className="mt-4">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <span>{t("launchToolsButton")}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
