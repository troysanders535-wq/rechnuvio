/**
 * The public holidays of a year.
 *
 * The dates are computed, not hard-coded: the federal holidays of the United
 * States follow the calendar rules of the federal law (the n-th weekday of a
 * month), the bank holidays of the United Kingdom follow the Easter cycle and
 * the "next working day" rule, and a holiday that falls on a weekend is
 * observed on the neighbouring working day.
 */

export interface HolidayEntry {
  /** The identifier of the holiday inside its region. */
  id: string;
  /** The day the holiday falls on. */
  date: Date;
  /** The day the holiday is observed on, when that is another day. */
  observed?: Date;
  /** The region the holiday belongs to. */
  region: "us" | "uk";
}

/** Easter Sunday of a year (Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** The n-th weekday of a month, the weekday being 0 for Sunday. */
function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

/** The last weekday of a month. */
function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

/** The next working day of a holiday that falls on a weekend. */
function observedDay(date: Date): Date | undefined {
  const weekday = date.getDay();
  if (weekday === 6) {
    const friday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    return friday;
  }
  if (weekday === 0) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return monday;
  }
  return undefined;
}

/** The next working day of a bank holiday, including the Saturday case. */
function substituteDay(date: Date): Date | undefined {
  const weekday = date.getDay();
  if (weekday === 6) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  }
  if (weekday === 0) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  return undefined;
}

/** The federal holidays of the United States. */
export function usFederalHolidays(year: number): HolidayEntry[] {
  const entries: HolidayEntry[] = [];
  const add = (id: string, date: Date, observed?: Date) => {
    entries.push({ id, date, observed, region: "us" });
  };

  add("newYearsDay", new Date(year, 0, 1), observedDay(new Date(year, 0, 1)));
  add("martinLutherKingDay", nthWeekday(year, 0, 1, 3));
  add("washingtonBirthday", nthWeekday(year, 1, 1, 3));
  add("memorialDay", lastWeekday(year, 4, 1));
  add("juneteenth", new Date(year, 5, 19), observedDay(new Date(year, 5, 19)));
  add("independenceDay", new Date(year, 6, 4), observedDay(new Date(year, 6, 4)));
  add("laborDay", nthWeekday(year, 8, 1, 1));
  add("columbusDay", nthWeekday(year, 9, 1, 2));
  add("veteransDay", new Date(year, 10, 11), observedDay(new Date(year, 10, 11)));
  add("thanksgivingDay", nthWeekday(year, 10, 4, 4));
  add("christmasDay", new Date(year, 11, 25), observedDay(new Date(year, 11, 25)));

  return entries;
}

/**
 * The substitute days of Christmas Day and Boxing Day.
 *
 * When Christmas Day falls on a weekend the two days move to the next free
 * working days, so the pair never shares a day.
 */
function christmasSubstitutes(year: number): { christmas?: Date; boxing?: Date } {
  const weekday = new Date(year, 11, 25).getDay();
  if (weekday === 6) {
    return {
      christmas: new Date(year, 11, 27),
      boxing: new Date(year, 11, 28),
    };
  }
  if (weekday === 0) {
    return { christmas: new Date(year, 11, 27) };
  }
  if (weekday === 5) {
    return { boxing: new Date(year, 11, 28) };
  }
  return {};
}

/** The bank holidays of England and Wales. */
export function ukBankHolidays(year: number): HolidayEntry[] {
  const entries: HolidayEntry[] = [];
  const add = (id: string, date: Date, observed?: Date) => {
    entries.push({ id, date, observed, region: "uk" });
  };

  const easter = easterSunday(year);
  const newYear = new Date(year, 0, 1);
  const substitutes = christmasSubstitutes(year);

  add("newYearsDay", newYear, substituteDay(newYear));
  add("goodFriday", new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2));
  add("easterMonday", new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1));
  add("earlyMayBankHoliday", nthWeekday(year, 4, 1, 1));
  add("springBankHoliday", lastWeekday(year, 4, 1));
  add("summerBankHoliday", lastWeekday(year, 7, 1));
  add("christmasDay", new Date(year, 11, 25), substitutes.christmas);
  add("boxingDay", new Date(year, 11, 26), substitutes.boxing);

  return entries;
}
