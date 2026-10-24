import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  // Allow a build to land in an alternate directory so a long-running audit
  // server survives a routine `next build` in the default .next directory.
  // Defaults to the standard ".next" when NEXT_DIST_DIR is not set.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // The first blog posts were placeholder articles; send their old URLs to the index.
  async redirects() {
    return [
      "online-json-formatter",
      "what-is-base-64-encoding",
      "how-to-convert-xml-to-json",
      "privacy-first-qr-code-generator-playbook",
      "markdown-to-word-conversion-guide",
      "bank-statement-converter-developer-guide",
    ].map((slug) => ({ source: `/blog/${slug}`, destination: "/blog", permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
