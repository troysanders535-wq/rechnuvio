import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLocaleFromHost } from "@/i18n/domains";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
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

  // Ensure cookie matches current locale
  if (cookieLocale !== locale) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
