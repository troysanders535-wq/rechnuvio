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
};

export default withNextIntl(nextConfig);
