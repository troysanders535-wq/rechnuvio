/**
 * The cron expressions.
 *
 * A cron expression has five fields (minute, hour, day of the month, month,
 * day of the week) and optionally a leading field for the seconds. Every
 * field accepts "*", a number, a range, a list and a step.
 */

export interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  second?: string;
}

export interface CronBreakdown {
  key: "second" | "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";
  value: string;
  values: number[];
}

/** The values of one cron field, or null when the field is not valid. */
export function parseCronField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>();
  const trimmed = field.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(",");
  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) return null;
    const slash = chunk.indexOf("/");
    const rangePart = slash >= 0 ? chunk.slice(0, slash) : chunk;
    const stepPart = slash >= 0 ? chunk.slice(slash + 1) : "";
    const step = stepPart ? parseInt(stepPart, 10) : 1;
    if (!Number.isFinite(step) || step <= 0) return null;

    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const bounds = rangePart.split("-").map((value) => parseInt(value, 10));
      if (bounds.length !== 2) return null;
      start = bounds[0];
      end = bounds[1];
    } else {
      start = parseInt(rangePart, 10);
      end = start;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < min || end > max || start > end) return null;
    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

/** Split a cron expression into its fields, or return null when it is invalid. */
export function parseCronExpression(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5 && parts.length !== 6) return null;

  if (parts.length === 6) {
    // seconds, minutes, hours, day of the month, month, day of the week
    if (!parseCronField(parts[0], 0, 59)) return null;
    if (!parseCronField(parts[1], 0, 59)) return null;
    if (!parseCronField(parts[2], 0, 23)) return null;
    if (!parseCronField(parts[3], 1, 31)) return null;
    if (!parseCronField(parts[4], 1, 12)) return null;
    if (!parseCronField(parts[5], 0, 7)) return null;
    return {
      second: parts[0],
      minute: parts[1],
      hour: parts[2],
      dayOfMonth: parts[3],
      month: parts[4],
      dayOfWeek: parts[5],
    };
  }

  // minutes, hours, day of the month, month, day of the week
  if (!parseCronField(parts[0], 0, 59)) return null;
  if (!parseCronField(parts[1], 0, 23)) return null;
  if (!parseCronField(parts[2], 1, 31)) return null;
  if (!parseCronField(parts[3], 1, 12)) return null;
  if (!parseCronField(parts[4], 0, 7)) return null;
  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

/** The weekdays of a cron field, where the seventh day is the first day. */
function weekdayValues(field: string): number[] {
  const values = parseCronField(field, 0, 7) || [];
  return Array.from(new Set(values.map((value) => (value === 7 ? 0 : value)))).sort(
    (a, b) => a - b,
  );
}

/** The values of every field of a cron expression. */
export function cronBreakdown(fields: CronFields): CronBreakdown[] {
  const weekday = weekdayValues(fields.dayOfWeek);
  const breakdown: CronBreakdown[] = [
    { key: "minute", value: fields.minute, values: parseCronField(fields.minute, 0, 59) || [] },
    { key: "hour", value: fields.hour, values: parseCronField(fields.hour, 0, 23) || [] },
    {
      key: "dayOfMonth",
      value: fields.dayOfMonth,
      values: parseCronField(fields.dayOfMonth, 1, 31) || [],
    },
    { key: "month", value: fields.month, values: parseCronField(fields.month, 1, 12) || [] },
    { key: "dayOfWeek", value: fields.dayOfWeek, values: weekday },
  ];
  if (fields.second) {
    breakdown.unshift({
      key: "second",
      value: fields.second,
      values: parseCronField(fields.second, 0, 59) || [],
    });
  }
  return breakdown;
}

/** Does a moment in time match the cron expression? */
export function matchesCron(fields: CronFields, date: Date): boolean {
  const minute = parseCronField(fields.minute, 0, 59);
  const hour = parseCronField(fields.hour, 0, 23);
  const dayOfMonth = parseCronField(fields.dayOfMonth, 1, 31);
  const month = parseCronField(fields.month, 1, 12);
  const dayOfWeek = weekdayValues(fields.dayOfWeek);
  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek.length) return false;

  if (!minute.includes(date.getMinutes())) return false;
  if (!hour.includes(date.getHours())) return false;
  if (!month.includes(date.getMonth() + 1)) return false;

  const dayRestricted = fields.dayOfMonth.trim() !== "*";
  const weekdayRestricted = fields.dayOfWeek.trim() !== "*";
  const dayMatches = dayOfMonth.includes(date.getDate());
  const weekdayMatches = dayOfWeek.includes(date.getDay());

  if (dayRestricted && weekdayRestricted) {
    return dayMatches || weekdayMatches;
  }
  if (dayRestricted) return dayMatches;
  if (weekdayRestricted) return weekdayMatches;
  return true;
}

/**
 * The next moments in time that match the cron expression.
 *
 * The search walks through the days, so an expression that fires once a year
 * is found as fast as one that fires every minute.
 */
export function nextCronRuns(fields: CronFields, count: number, from: Date): Date[] {
  const results: Date[] = [];
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const limit = 366 * 2;
  for (let day = 0; day < limit && results.length < count; day += 1) {
    // the day that is looked at, starting at its own midnight
    const dayStart = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + day,
    );
    const dayMatch = matchesCron(
      { ...fields, minute: "*", hour: "*" },
      dayStart,
    );
    if (dayMatch) {
      const hours = parseCronField(fields.hour, 0, 23) || [];
      const minutes = parseCronField(fields.minute, 0, 59) || [];
      for (const hour of hours) {
        for (const minute of minutes) {
          const candidate = new Date(
            dayStart.getFullYear(),
            dayStart.getMonth(),
            dayStart.getDate(),
            hour,
            minute,
          );
          // only the first day is limited by the moment the search started
          if (day === 0 && candidate.getTime() < start.getTime()) continue;
          results.push(candidate);
          if (results.length >= count) return results;
        }
      }
    }
  }
  return results;
}

/** The weekday names of a cron expression. */
const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/** The clock reading of a description, for example "9:30 pm". */
function parseClock(text: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text.trim().toLowerCase());
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * The cron expression of a schedule description.
 *
 * The descriptions that are understood are the ones a person writes down:
 * "every 5 minutes", "every hour", "daily at 03:00", "weekly on monday at
 * 09:00" and "monthly on day 15 at 08:30".
 */
export function descriptionToCron(description: string): CronFields | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  const every = (minute: string, hour: string): CronFields => ({
    minute,
    hour,
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  });

  const everyMinutes = /^every\s+(\d+)\s+minutes?$/.exec(text);
  if (everyMinutes) return every(`*/${everyMinutes[1]}`, "*");

  const everyHours = /^every\s+(\d+)\s+hours?$/.exec(text);
  if (everyHours) return every("0", `*/${everyHours[1]}`);

  if (/^every\s+minute$/.test(text)) return every("*", "*");
  if (/^every\s+hour$/.test(text) || /^hourly$/.test(text)) return every("0", "*");

  const weekly = /^(?:every\s+)?week(?:ly)?\s+(?:on\s+)?([a-z]+)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(
    text,
  );
  if (weekly) {
    const weekday = WEEKDAY_NAMES[weekly[1]];
    const clock = parseClock(weekly[2]);
    if (weekday === undefined || !clock) return null;
    return {
      minute: `${clock.minute}`,
      hour: `${clock.hour}`,
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: `${weekday}`,
    };
  }

  const monthly = /^(?:every\s+)?month(?:ly)?\s+(?:on\s+(?:the\s+)?(?:day\s+)?)?(\d{1,2})\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(
    text,
  );
  if (monthly) {
    const day = parseInt(monthly[1], 10);
    const clock = parseClock(monthly[2]);
    if (day < 1 || day > 31 || !clock) return null;
    return {
      minute: `${clock.minute}`,
      hour: `${clock.hour}`,
      dayOfMonth: `${day}`,
      month: "*",
      dayOfWeek: "*",
    };
  }

  const daily = /^(?:every\s+)?(?:day|daily)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(
    text,
  );
  if (daily) {
    const clock = parseClock(daily[1]);
    if (!clock) return null;
    return {
      minute: `${clock.minute}`,
      hour: `${clock.hour}`,
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    };
  }

  const at = /^at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(text);
  if (at) {
    const clock = parseClock(at[1]);
    if (!clock) return null;
    return {
      minute: `${clock.minute}`,
      hour: `${clock.hour}`,
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    };
  }

  return null;
}

/** The cron expression of a set of fields. */
export function formatCron(fields: CronFields): string {
  return [
    fields.minute,
    fields.hour,
    fields.dayOfMonth,
    fields.month,
    fields.dayOfWeek,
  ].join(" ");
}
