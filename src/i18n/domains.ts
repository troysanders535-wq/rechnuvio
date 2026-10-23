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

export function getLocaleFromHost(
  host?: string | null,
  cookieLocale?: string | null
): AppLocale {
  if (cookieLocale === "de" || cookieLocale === "de-DE") return "de-DE";
  if (cookieLocale === "en") return "en";
  if (!host) return "en";

  const clean = host.toLowerCase().split(":")[0];
  if (
    clean === "de.localhost" ||
    clean.startsWith("de.") ||
    clean.endsWith(".de")
  ) {
    return "de-DE";
  }
  if (
    clean === "en.localhost" ||
    clean.startsWith("en.") ||
    clean.endsWith(".com")
  ) {
    return "en";
  }

  return "en";
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
    return `http://${sub}.localhost${port}${pathname}`;
  }

  const prodDomain =
    targetLocale === "de-DE"
      ? process.env.NEXT_PUBLIC_DE_DOMAIN || "de.digitaltoolpad.com"
      : process.env.NEXT_PUBLIC_EN_DOMAIN || "www.digitaltoolpad.com";

  return `https://${prodDomain}${pathname}`;
}

export function getCanonicalUrl(pathname: string, locale: string): string {
  const isGerman = locale === "de-DE" || locale === "de";
  const domain = isGerman
    ? process.env.NEXT_PUBLIC_DE_DOMAIN || "https://de.digitaltoolpad.com"
    : process.env.NEXT_PUBLIC_EN_DOMAIN || "https://www.digitaltoolpad.com";

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
    canonical: `${enBase}${cleanPath}`,
    languages: {
      "en": `${enBase}${cleanPath}`,
      "de-DE": `${deBase}${cleanPath}`,
      "x-default": `${enBase}${cleanPath}`,
    },
  };
}
