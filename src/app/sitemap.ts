import { MetadataRoute } from "next";
import { TOOLS_CATALOG } from "@/data/tools";
import { BLOG_POSTS } from "./blog/page";
import { CATEGORY_SLUGS } from "./[category]/page";

export default function sitemap(): MetadataRoute.Sitemap {
  const enBase = process.env.NEXT_PUBLIC_EN_DOMAIN
    ? (process.env.NEXT_PUBLIC_EN_DOMAIN.startsWith("http")
        ? process.env.NEXT_PUBLIC_EN_DOMAIN
        : `https://${process.env.NEXT_PUBLIC_EN_DOMAIN}`)
    : "https://www.digitaltoolpad.com";

  const deBase = process.env.NEXT_PUBLIC_DE_DOMAIN
    ? (process.env.NEXT_PUBLIC_DE_DOMAIN.startsWith("http")
        ? process.env.NEXT_PUBLIC_DE_DOMAIN
        : `https://${process.env.NEXT_PUBLIC_DE_DOMAIN}`)
    : "https://de.digitaltoolpad.com";

  const staticDate = new Date("2026-10-23T00:00:00.000Z");

  const pathList = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/tools", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/productivity-suite", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/privacy-policy", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/terms-of-service", changeFrequency: "monthly" as const, priority: 0.3 },
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
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const item of pathList) {
    const enUrl = `${enBase}${item.path}`;
    const deUrl = `${deBase}${item.path}`;
    const languages = {
      en: enUrl,
      "de-DE": deUrl,
      "x-default": enUrl,
    };

    // English domain entry
    entries.push({
      url: enUrl,
      lastModified: staticDate,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      alternates: { languages },
    });

    // German domain entry
    entries.push({
      url: deUrl,
      lastModified: staticDate,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      alternates: { languages },
    });
  }

  return entries;
}
