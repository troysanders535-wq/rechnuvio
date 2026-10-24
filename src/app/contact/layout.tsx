import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { pageAlternates } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const isGerman = (await getLocale()).startsWith("de");
  return {
    title: isGerman ? "Kontakt" : "Contact",
    description: isGerman
      ? "Fehler entdeckt, Rechner-Wunsch oder Frage? Schreib dem Rechnuvio-Team – wir antworten in der Regel innerhalb von zwei Werktagen."
      : "Found a bug, want a new calculator or have a question? Write to the Rechnuvio team.",
    alternates: pageAlternates("/contact"),
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
