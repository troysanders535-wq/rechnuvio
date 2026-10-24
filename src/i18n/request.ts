import { getRequestConfig } from "next-intl/server";
import { headers, cookies } from "next/headers";
import { getLocaleFromHost } from "./domains";

export default getRequestConfig(async ({ requestLocale }) => {
  let host = "";
  let xLocale: string | null = null;
  let cookieLocale: string | null = null;

  try {
    const headerList = await headers();
    host = headerList.get("host") || "";
    xLocale = headerList.get("x-next-intl-locale");
  } catch {
    // Fallback during static build/prerendering
  }

  try {
    const cookieList = await cookies();
    cookieLocale = cookieList.get("NEXT_LOCALE")?.value || null;
  } catch {
    // Fallback during static build/prerendering
  }

  let locale: "en" | "de-DE" = "de-DE";

  if (xLocale) {
    locale = xLocale === "en" ? "en" : "de-DE";
  } else if (cookieLocale) {
    locale = cookieLocale === "en" ? "en" : "de-DE";
  } else if (host) {
    locale = getLocaleFromHost(host, cookieLocale);
  } else if (requestLocale) {
    const req = await requestLocale;
    if (req) {
      locale = req === "en" ? "en" : "de-DE";
    }
  }

  const baseLocale = locale.startsWith("de") ? "de" : "en";
  const messages = (await import(`@/messages/${baseLocale}.json`)).default;

  return {
    locale,
    messages,
  };
});
