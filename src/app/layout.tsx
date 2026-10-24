import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCanonicalUrl, getAlternateHreflang } from "@/i18n/domains";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    ? "Kostenlose Online-Tools für PDF, Bilder, Text & Code | Rechnuvio"
    : "Free Online Tools for PDF, Images, Text & Code | Rechnuvio";

  const description = isGerman
    ? "Kostenlose Online-Tools, die direkt in Ihrem Browser laufen. PDFs konvertieren, JSON formatieren, Bilder skalieren und Texte bearbeiten – ohne Upload auf externe Server."
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
    keywords: isGerman
      ? [
          "kostenlose Online-Tools",
          "JSON-Formatierer",
          "PDF-Werkzeuge",
          "Bilder skalieren",
          "UUID Generator",
          "QR-Code Generator",
          "Client-seitiger Datenschutz",
          "Entwickler-Werkzeuge",
        ]
      : [
          "free online tools",
          "json formatter",
          "pdf tools",
          "image resizer",
          "uuid generator",
          "qr code generator",
          "client-side privacy",
          "developer utilities",
        ],
    authors: [{ name: "Rechnuvio Team" }],
    openGraph: {
      type: "website",
      locale: isGerman ? "de_DE" : "en_US",
      url: canonicalUrl,
      siteName: "Digital ToolPad",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: isGerman
        ? "Digital ToolPad - 492 kostenlose Browser-Tools"
        : "Digital ToolPad - 492 Free Browser Tools",
      description,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-sky-800 selection:text-white">
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
