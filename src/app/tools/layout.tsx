import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { pageAlternates } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const isGerman = (await getLocale()).startsWith("de");
  return {
    title: {
      default: isGerman ? "Alle Rechner & Online-Tools" : "All calculators & online tools",
      template: "%s | Rechnuvio",
    },
    description: isGerman
      ? "Alle kostenlosen Rechner und Online-Tools von Rechnuvio auf einen Blick: Prozent, Datum, Gesundheit, PDF, Bilder, Text und Code – direkt im Browser."
      : "All free Rechnuvio calculators and online tools in one place: percentages, dates, health, PDF, images, text and code – right in your browser.",
    alternates: pageAlternates("/tools"),
  };
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
