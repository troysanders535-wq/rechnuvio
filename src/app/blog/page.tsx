import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage");
  return {
    title: `${t("title")} | Digital ToolPad`,
    description: t("subtitle"),
  };
}

export const BLOG_POSTS = [
  {
    slug: "online-json-formatter",
    title: "The Ultimate Guide to Modern JSON Formatting and Validation",
    excerpt: "Learn how modern client-side parsers detect invalid syntax, format nested trees, sort keys alphabetically, and ensure zero-leak data privacy.",
    date: "October 2026",
    readTime: "6 min read",
    category: "Coding",
  },
  {
    slug: "what-is-base-64-encoding",
    title: "What is Base64 Encoding? How Binary-to-Text Representation Works",
    excerpt: "Understand RFC 4648, 64-character radix tables, MIME email attachments, and data URL image embedding in modern web browsers.",
    date: "October 2026",
    readTime: "8 min read",
    category: "Encoding",
  },
  {
    slug: "how-to-convert-xml-to-json",
    title: "How to Convert XML to Clean JSON: Schemas, Attributes, and Edge Cases",
    excerpt: "A developer guide on handling XML attributes, repeating elements, CDATA blocks, and converting complex XSD documents to idiomatic JSON.",
    date: "October 2026",
    readTime: "7 min read",
    category: "Data Formats",
  },
  {
    slug: "privacy-first-qr-code-generator-playbook",
    title: "Privacy-First QR Codes: Client-Side Vector Generation Without Tracking",
    excerpt: "Why server-generated QR codes present security risks and how client-side SVG generation guarantees zero intermediary tracking.",
    date: "October 2026",
    readTime: "5 min read",
    category: "Design",
  },
  {
    slug: "markdown-to-word-conversion-guide",
    title: "Converting Markdown to Word (.docx) and PDF Without Pandoc",
    excerpt: "How WebAssembly and AST parsers allow instant high-fidelity document generation directly in web browsers.",
    date: "October 2026",
    readTime: "6 min read",
    category: "Productivity",
  },
  {
    slug: "bank-statement-converter-developer-guide",
    title: "Bank Statement Parsing: Extracting Transactions Safely in Your Browser",
    excerpt: "Best practices for converting PDF and CSV financial records into accounting-ready spreadsheets with zero cloud exposure.",
    date: "October 2026",
    readTime: "9 min read",
    category: "Finance",
  },
];

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
