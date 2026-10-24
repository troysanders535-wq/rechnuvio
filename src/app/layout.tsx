import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCanonicalUrl, getAlternateHreflang } from "@/i18n/domains";
import { SITE_NAME, SITE_URL, SITE_TAGLINE, organizationJsonLd, websiteJsonLd } from "@/lib/brand";

// Rechnuvio brand fonts (SIL OFL), shipped in src/app/fonts and self-hosted:
// no request to Google at build or runtime (DSGVO-safe, no build network dependency).
const brandDisplay = localFont({
  variable: "--font-schibsted",
  display: "swap",
  src: [
    { path: "./fonts/schibsted-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

const brandText = localFont({
  variable: "--font-source-sans",
  display: "swap",
  src: [
    { path: "./fonts/source-sans-3-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-sans-3-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-sans-3-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const brandMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
});

/**
 * The locale is resolved from the request host and the NEXT_LOCALE cookie
 * (see `src/i18n/request.ts`), which reads `headers()` and `cookies()`.
 * Those are runtime APIs, so the shell cannot be fully prerendered while
 * `cacheComponents` is on.
 *
 * `instant = false` marks this segment as allowed to block. It does not force
 * the route to be dynamic, and it lets the rest of the app keep prerendering.
 * See https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/instant
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isGerman = locale === "de-DE" || locale === "de";

  const title = isGerman
    ? "Kostenlose Rechner & Online-Tools | Rechnuvio"
    : "Free Calculators & Online Tools | Rechnuvio";

  const description = isGerman
    ? "Prozentrechner, Tagerechner, BMI, Gehalt und über 400 weitere Tools – kostenlos, mit Rechenweg und direkt im Browser. Ohne Anmeldung, ohne Upload."
    : "Free online tools that run in your browser. Convert PDFs and images, compare JSON, format code, and edit text without uploading your files or text to our servers.";

  const canonicalUrl = getCanonicalUrl("/", locale);
  const alternates = getAlternateHreflang("/");

  return {
    title: {
      default: title,
      template: "%s | Rechnuvio",
    },
    description,
    metadataBase: new URL(canonicalUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: alternates.languages,
    },
    authors: [{ name: SITE_NAME, url: `${SITE_URL}/about` }],
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      locale: isGerman ? "de_DE" : "en_US",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: isGerman ? `${SITE_NAME} – ${SITE_TAGLINE}` : `${SITE_NAME} – Free calculators & browser tools`,
      description,
    },
    verification: {
      google: "6Mc837XAbtH0LtC8cfuE95JnuGw7ZkulJgvCbc4kIGQ",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${brandDisplay.variable} ${brandText.variable} ${brandMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="google-site-verification"
          content="6Mc837XAbtH0LtC8cfuE95JnuGw7ZkulJgvCbc4kIGQ"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-sky-800 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
