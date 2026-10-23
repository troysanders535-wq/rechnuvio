import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: [
      `${enBase}/sitemap.xml`,
      `${deBase}/sitemap.xml`,
    ],
  };
}
