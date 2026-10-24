import { MetadataRoute } from "next";
import { TOOLS_CATALOG } from "@/data/tools";
import { BLOG_POSTS } from "@/data/blogPosts";
import { CATEGORY_SLUGS } from "@/data/categorySlugs";
import { hasImpressum } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const enBase = process.env.NEXT_PUBLIC_EN_DOMAIN
    ? (process.env.NEXT_PUBLIC_EN_DOMAIN.startsWith("http")
        ? process.env.NEXT_PUBLIC_EN_DOMAIN
        : `https://${process.env.NEXT_PUBLIC_EN_DOMAIN}`)
    : "https://rechnuvio.de";

  const deBase = process.env.NEXT_PUBLIC_DE_DOMAIN
    ? (process.env.NEXT_PUBLIC_DE_DOMAIN.startsWith("http")
        ? process.env.NEXT_PUBLIC_DE_DOMAIN
        : `https://${process.env.NEXT_PUBLIC_DE_DOMAIN}`)
    : "https://rechnuvio.de";

  const pathList: {
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
    priority: number;
    lastModified?: Date;
  }[] = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/tools", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/productivity-suite", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/privacy-policy", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/terms-of-service", changeFrequency: "monthly" as const, priority: 0.3 },
    ...(hasImpressum() ? [{ path: "/impressum", changeFrequency: "yearly" as const, priority: 0.2 }] : []),
    ...CATEGORY_SLUGS.map((category) => ({
      path: `/${category}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...TOOLS_CATALOG.map((tool) => ({
      path: `/tools/${tool.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...BLOG_POSTS.map((post) => ({
      path: `/blog/${post.slug}`,
      // Posts carry a real publication month; every other URL has no
      // reliable modification date, so it is left out rather than faked.
      lastModified: Number.isNaN(Date.parse(post.date)) ? undefined : new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const entries: MetadataRoute.Sitemap = [];

  const isMultiDomain = enBase !== deBase;

  for (const item of pathList) {
    const deUrl = `${deBase}${item.path}`;
    const enUrl = `${enBase}${item.path}`;

    if (isMultiDomain) {
      const languages = {
        en: enUrl,
        "de-DE": deUrl,
        "x-default": deUrl,
      };

      entries.push({
        url: enUrl,
        lastModified: item.lastModified,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates: { languages },
      });

      entries.push({
        url: deUrl,
        lastModified: item.lastModified,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates: { languages },
      });
    } else {
      // Clean single-domain for rechnuvio.de (no duplicate URLs)
      entries.push({
        url: deUrl,
        lastModified: item.lastModified,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
      });
    }
  }

  return entries;
}
