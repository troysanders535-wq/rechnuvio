import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const deBase = process.env.NEXT_PUBLIC_DE_DOMAIN
    ? (process.env.NEXT_PUBLIC_DE_DOMAIN.startsWith("http")
        ? process.env.NEXT_PUBLIC_DE_DOMAIN
        : `https://${process.env.NEXT_PUBLIC_DE_DOMAIN}`)
    : "https://rechnuvio.de";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: [
      `${deBase}/sitemap.xml`,
    ],
  };
}
