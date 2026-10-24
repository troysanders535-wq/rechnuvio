import type { Metadata } from "next";
import { getAlternateHreflang } from "@/i18n/domains";

/** Single source of truth for the Rechnuvio brand. */
export const SITE_NAME = "Rechnuvio";
export const SITE_URL = "https://rechnuvio.de";
export const SITE_TAGLINE = "Einfach rechnen. Privat bleiben.";
/** Default social image (src/app/opengraph-image.png). Re-add it whenever a page sets its own openGraph. */
export const OG_IMAGE = { url: `${SITE_URL}/opengraph-image.png`, width: 1200, height: 630, alt: "Rechnuvio – Einfach rechnen. Privat bleiben." };

/**
 * Self-referencing canonical + hreflang for a route. Every page must set this,
 * otherwise it inherits the homepage canonical from the root layout.
 */
export function pageAlternates(pathname: string): Metadata["alternates"] {
  return getAlternateHreflang(pathname);
}

/**
 * Impressum (§ 5 DDG). Fill in real data before deploying. While `name` is empty
 * the /impressum route returns 404 and the footer hides the link.
 */
export const IMPRESSUM = {
  name: "", // Vorname Nachname oder Firmenname
  street: "", // Straße Hausnummer
  city: "", // PLZ Ort
  country: "Deutschland",
  email: "", // z. B. kontakt@rechnuvio.de
  phone: "", // optional, sonst zweiter schneller Kontaktweg
  vatId: "", // USt-IdNr., nur falls vorhanden
  responsible: "", // Verantwortlich nach § 18 Abs. 2 MStV (meist gleiche Person)
};
export const hasImpressum = () => IMPRESSUM.name.trim().length > 0;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
    slogan: SITE_TAGLINE,
    ...(IMPRESSUM.email ? { email: IMPRESSUM.email } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "de-DE",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function webApplicationJsonLd(tool: { name: string; slug: string; description: string; category: string }) {
  const url = `${SITE_URL}/tools/${tool.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: tool.name,
    url,
    description: tool.description,
    applicationCategory: /calc|rechner|finanz/i.test(tool.category) ? "FinanceApplication" : "UtilitiesApplication",
    operatingSystem: "Any (Webbrowser)",
    inLanguage: "de-DE",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
