/**
 * Utility functions for locale-aware number and date formatting.
 * Handles German decimal comma (e.g., "12,5" -> 12.5) while preserving standard dot decimals.
 */

export function parseLocaleNumber(value: string | number): number {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (!value || typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();
  if (!trimmed) return 0;

  // Handle German format with dot as thousand separator and comma as decimal (e.g. "1.234,56")
  if (trimmed.includes(",") && trimmed.includes(".")) {
    if (trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")) {
      // European/German: 1.234,56
      const normalized = trimmed.replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // English: 1,234.56
      const normalized = trimmed.replace(/,/g, "");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    }
  }

  // Handle single comma as decimal separator (e.g. "12,5" -> 12.5)
  if (trimmed.includes(",")) {
    const normalized = trimmed.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatLocaleNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions
): string {
  if (isNaN(value)) return "0";
  const intlLocale = locale.startsWith("de") ? "de-DE" : "en-US";
  return new Intl.NumberFormat(intlLocale, options).format(value);
}

export function formatLocaleDate(
  date: Date | string | number,
  locale: string = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const intlLocale = locale.startsWith("de") ? "de-DE" : "en-US";
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  return new Intl.DateTimeFormat(intlLocale, defaultOptions).format(d);
}

export function formatLocaleCurrency(
  value: number,
  currency: string = "USD",
  locale: string = "en"
): string {
  const intlLocale = locale.startsWith("de") ? "de-DE" : "en-US";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}
