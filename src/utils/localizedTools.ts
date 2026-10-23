import { ToolItem } from "@/data/tools";
import toolsDe from "@/data/tools_de.json";

export const CATEGORY_NAMES_DE: Record<string, string> = {
  "All": "Alle",
  "Data Formats": "Datenformate",
  "Design": "Design & Medien",
  "Productivity": "Produktivität",
  "Text Processing": "Textverarbeitung",
  "Calculators": "Rechner & Finanzen",
  "Coding": "Entwicklung & Code",
  "PDF": "PDF & Dokumente",
  "Encoding": "Kodierung & Konvertierung",
  "Lifestyle": "Lifestyle & Gesundheit",
  "Video & Audio": "Audio & Video",
  "Video &amp; Audio": "Audio & Video",
  "Device Tests": "Gerätetests",
  "Database": "Datenbank & SQL",
  "Security": "Sicherheit & Datenschutz",
  "Student": "Bildung & Studium",
  "DIY": "Bau & Heimwerken",
  "Holiday": "Feiertage & Events",
  "AI": "KI & Tokenizer",
};

export const FEATURE_TRANSLATIONS: Record<string, string> = {
  "100% Client-Side Processing - zero server uploads":
    "100% clientseitige Verarbeitung – keine Server-Uploads",
  "Instant real-time execution in modern browsers":
    "Sofortige Ausführung in Echtzeit in modernen Browsern",
  "One-click copy to clipboard and file download":
    "1-Klick-Kopieren in die Zwischenablage und Dateidownload",
  "Dark and light theme support":
    "Unterstützung für helles und dunkles Farbschema",
  "Free forever with no usage limits or sign-up required":
    "Dauerhaft kostenlos ohne Nutzungslimits oder Registrierung",
};

export function translateCategory(cat: string, locale: string): string {
  if (!locale || !locale.startsWith("de")) return cat;
  return CATEGORY_NAMES_DE[cat] || cat;
}

export function translateFeature(feature: string, locale: string): string {
  if (!locale || !locale.startsWith("de")) return feature;
  return FEATURE_TRANSLATIONS[feature] || feature;
}

export function translateFaq(
  faq: { q: string; a: string },
  toolName: string,
  locale: string
): { q: string; a: string } {
  if (!locale || !locale.startsWith("de")) return faq;

  if (/free to use/i.test(faq.q)) {
    return {
      q: `Ist dieses Tool (${toolName}) kostenlos?`,
      a: `Ja, ${toolName} auf Digital ToolPad ist zu 100% kostenlos ohne versteckte Gebühren, Abonnements oder Einschränkungen.`,
    };
  }

  if (/data safe and private/i.test(faq.q)) {
    return {
      q: "Sind meine Daten sicher und geschützt?",
      a: "Alle Vorgänge werden lokal in Ihrer Browser-Sandbox ausgeführt. Keine Ihrer Dateien, Texte oder Daten werden jemals an externe Server übertragen.",
    };
  }

  if (/mobile devices/i.test(faq.q)) {
    return {
      q: "Kann ich dieses Tool auf Mobilgeräten nutzen?",
      a: "Ja, unsere responsive Benutzeroberfläche funktioniert nahtlos auf Desktops, Laptops, Tablets und Smartphones.",
    };
  }

  return faq;
}

export function getLocalizedTool(tool: ToolItem, locale: string): ToolItem {
  if (!locale || !locale.startsWith("de")) return tool;
  const deEntry = (toolsDe as Record<string, Partial<ToolItem>>)[tool.slug];

  const localizedName = deEntry?.name || tool.name;
  const localizedDesc = deEntry?.description || tool.description;
  const localizedCategory = deEntry?.category || translateCategory(tool.category, locale);

  return {
    ...tool,
    name: localizedName,
    description: localizedDesc,
    category: localizedCategory,
    features: (tool.features || []).map((f) => translateFeature(f, locale)),
    faqs: (tool.faqs || []).map((faq) => translateFaq(faq, localizedName, locale)),
  };
}
