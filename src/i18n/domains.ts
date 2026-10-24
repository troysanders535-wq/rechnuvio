export const EN_DOMAINS = [
  process.env.NEXT_PUBLIC_EN_DOMAIN,
  process.env.EN_DOMAIN,
  "www.digitaltoolpad.com",
  "digitaltoolpad.com",
  "en.localhost",
  "en.localhost:3100",
].filter(Boolean) as string[];

export const DE_DOMAINS = [
  process.env.NEXT_PUBLIC_DE_DOMAIN,
  process.env.DE_DOMAIN,
  "de.digitaltoolpad.com",
  "digitaltoolpad.de",
  "www.digitaltoolpad.de",
  "de.localhost",
  "de.localhost:3100",
].filter(Boolean) as string[];

export type AppLocale = "en" | "de-DE";

export const DEFAULT_LOCALE: AppLocale = "de-DE";

export function getLocaleFromHost(
  host?: string | null,
  _cookieLocale?: string | null
): AppLocale {
  // If host explicitly specifies an English subdomain (en.localhost, en.example.com), use en
  if (host) {
    const clean = host.toLowerCase().split(":")[0];
    if (clean === "en.localhost" || clean.startsWith("en.")) {
      return "en";
    }
    if (
      clean === "de.localhost" ||
      clean.startsWith("de.") ||
      clean.endsWith(".de")
    ) {
      return "de-DE";
    }
  }

  // Default fallback for any host (localhost, Hostinger domain, IP, etc.) is German
  return "de-DE";
}

export function getTargetUrlForLocale(
  targetLocale: AppLocale,
  currentHost: string,
  pathname: string = "/"
): string {
  const isDev = currentHost.includes("localhost") || currentHost.includes("127.0.0.1");
  const port = currentHost.includes(":") ? `:${currentHost.split(":")[1]}` : "";

  if (isDev) {
    const sub = targetLocale === "de-DE" ? "de" : "en";
    if (currentHost.startsWith("de.") || currentHost.startsWith("en.")) {
      return `http://${sub}.localhost${port}${pathname}`;
    }
    const sep = pathname.includes("?") ? "&" : "?";
    return `http://localhost${port}${pathname}${sep}locale=${targetLocale === "de-DE" ? "de" : "en"}`;
  }

  const enDomain = process.env.NEXT_PUBLIC_EN_DOMAIN || process.env.EN_DOMAIN;
  const deDomain = process.env.NEXT_PUBLIC_DE_DOMAIN || process.env.DE_DOMAIN;

  // If separate domains are explicitly configured, route across them:
  if (enDomain && deDomain && enDomain !== deDomain) {
    const prodDomain = targetLocale === "de-DE" ? deDomain : enDomain;
    return `https://${prodDomain}${pathname}`;
  }

  // Single-domain fallback: stay on current host with query parameter
  const base = currentHost.startsWith("http") ? currentHost : `https://${currentHost}`;
  const sep = pathname.includes("?") ? "&" : "?";
  return `${base}${pathname}${sep}locale=${targetLocale === "de-DE" ? "de" : "en"}`;
}

export function getCanonicalUrl(pathname: string, locale: string): string {
  const isGerman = locale === "de-DE" || locale === "de";
  const enDomain = process.env.NEXT_PUBLIC_EN_DOMAIN || process.env.EN_DOMAIN;
  const deDomain = process.env.NEXT_PUBLIC_DE_DOMAIN || process.env.DE_DOMAIN;

  const domain = isGerman
    ? (deDomain || "https://digitaltoolpad.com")
    : (enDomain || "https://digitaltoolpad.com");

  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  const cleanPath = pathname === "/" ? "" : pathname;
  return `${base}${cleanPath}`;
}

export function getAlternateHreflang(pathname: string) {
  const enDomain = process.env.NEXT_PUBLIC_EN_DOMAIN || "https://www.digitaltoolpad.com";
  const deDomain = process.env.NEXT_PUBLIC_DE_DOMAIN || "https://de.digitaltoolpad.com";

  const enBase = enDomain.startsWith("http") ? enDomain : `https://${enDomain}`;
  const deBase = deDomain.startsWith("http") ? deDomain : `https://${deDomain}`;
  const cleanPath = pathname === "/" ? "" : pathname;

  return {
    canonical: `${deBase}${cleanPath}`,
    languages: {
      "en": `${enBase}${cleanPath}`,
      "de-DE": `${deBase}${cleanPath}`,
      "x-default": `${deBase}${cleanPath}`,
    },
  };
}
