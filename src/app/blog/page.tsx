import { Metadata } from "next";
import { pageAlternates } from "@/lib/brand";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BLOG_POSTS } from "@/data/blogPosts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates("/blog"),
  };
}

export default async function BlogIndexPage() {
  const t = await getTranslations("blogPage");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          <BookOpen className="size-3.5" />
          <span>{t("badge")}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {post.category}
                </span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-4 font-bold text-base text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                {post.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {post.excerpt}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-sky-700 dark:border-slate-800 dark:text-sky-400">
              <span>Read Playbook</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
