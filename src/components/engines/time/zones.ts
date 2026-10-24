/**
 * The time zone helpers.
 *
 * A wall clock time is the time a person reads from a clock in a zone, so it
 * is converted into a moment in time with the offset of that zone. The offset
 * is read from the Intl API, so every zone of the IANA database is available.
 */

export const ZONE_IDS = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Africa/Cairo",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

/** The offset of a zone in milliseconds at a given moment. */
export function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(instantMs));
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour) % 24,
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - instantMs;
}

/**
 * The moment in time of a wall clock reading of a zone.
 *
 * The offset is resolved twice, because a zone can change its offset between
 * the first and the second attempt (a daylight saving switch).
 */
export function wallClockToInstant(
  date: string,
  time: string,
  timeZone: string,
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || "0");
  if (month < 0 || month > 11 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const naive = Date.UTC(year, month, day, hour, minute, second);
  const firstOffset = zoneOffsetMs(naive, timeZone);
  const guess = naive - firstOffset;
  const secondOffset = zoneOffsetMs(guess, timeZone);
  return naive - secondOffset;
}

/** The short name of a zone, for example "CET" or "GMT+2". */
export function zoneAbbreviation(instantMs: number, timeZone: string, locale: string): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    });
    const part = formatter.formatToParts(new Date(instantMs)).find((item) => item.type === "timeZoneName");
    return part ? part.value : "";
  } catch {
    return "";
  }
}

/** The offset of a zone, for example "UTC+02:00". */
export function zoneOffsetLabel(instantMs: number, timeZone: string): string {
  const offset = zoneOffsetMs(instantMs, timeZone);
  const sign = offset < 0 ? "-" : "+";
  // the milliseconds of the moment are rounded away, so the minutes stay below 60
  const total = Math.round(Math.abs(offset) / 60000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `UTC${sign}${pad(hours)}:${pad(minutes)}`;
}
