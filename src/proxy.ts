import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLocaleFromHost, DEFAULT_LOCALE } from "@/i18n/domains";
import { TOOLS_CATALOG } from "@/data/tools";
import { BLOG_POSTS } from "@/data/blogPosts";
import { CATEGORY_SLUGS } from "@/data/categorySlugs";

const CANONICAL_HOST = "rechnuvio.de";

const STATIC_PATHS = new Set([
  "/",
  "/tools",
  "/productivity-suite",
  "/blog",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/impressum",
]);
const CATEGORY_PATHS = new Set(CATEGORY_SLUGS.map((c) => `/${c}`));
const TOOL_SLUGS = new Set(TOOLS_CATALOG.map((t) => t.slug));
const BLOG_SLUGS = new Set(BLOG_POSTS.map((p) => p.slug));

/**
 * Unknown URLs must answer with a real 404. Once the page starts streaming the
 * status is already 200, so `notFound()` inside a page only yields a soft 404
 * (noindex meta, HTTP 200). Deciding here runs before any rendering.
 */
const GENERATED_FILES = new Set(["/robots.txt", "/sitemap.xml", "/manifest.json"]);
const PROBE_EXTENSIONS = /\.(txt|xml|php|html?|aspx?|json)$/i;

function isKnownPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) return true;
  if (pathname.includes(".")) {
    // Assets (images, fonts, workers) pass through; guessed text/markup files
    // such as /llms.txt or /wp-login.php are not routes of this site.
    return GENERATED_FILES.has(pathname) || !PROBE_EXTENSIONS.test(pathname);
  }
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (STATIC_PATHS.has(path) || CATEGORY_PATHS.has(path)) return true;
  if (path.startsWith("/tools/")) return TOOL_SLUGS.has(path.slice(7));
  if (path.startsWith("/blog/")) return BLOG_SLUGS.has(path.slice(6));
  return false;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const cleanHost = (forwardedHost || host).toLowerCase().split(",")[0].trim().split(":")[0];

  if (cleanHost === `www.${CANONICAL_HOST}`) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (!isKnownPath(request.nextUrl.pathname)) {
    return new NextResponse(
      "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\"><title>404 – Seite nicht gefunden | Rechnuvio</title></head><body style=\"font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem\"><h1>404 – Seite nicht gefunden</h1><p>Diese Seite existiert nicht. <a href=\"/\">Zur Startseite</a> oder <a href=\"/tools\">alle Rechner &amp; Tools ansehen</a>.</p></body></html>",
      {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );
  }

  const urlLocale = request.nextUrl.searchParams.get("locale");
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  // Resolve locale based on query override, domain host, or default German
  const locale = urlLocale
    ? urlLocale === "en"
      ? "en"
      : "de-DE"
    : getLocaleFromHost(host, cookieLocale);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-next-intl-locale", locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // The default locale needs no cookie; skipping it keeps public pages cacheable.
  if (locale !== DEFAULT_LOCALE && cookieLocale !== locale) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
