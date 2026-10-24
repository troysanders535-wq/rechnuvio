/**
 * Pure calculation helpers for the calculator tools.
 *
 * Everything here is side-effect free and framework free so the formulas can
 * be unit tested in Node (see `scripts/calculator-selftest.mjs`) and reused by
 * every calculator workspace.
 */

/* ------------------------------------------------------------------ *
 * Percentage
 * ------------------------------------------------------------------ */

export function percentOf(percent: number, whole: number): number {
  return (percent / 100) * whole;
}

export function whatPercent(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export function wholeFromPart(part: number, percent: number): number {
  return percent === 0 ? 0 : (part / percent) * 100;
}

/** Signed percentage change from `oldValue` to `newValue`. */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/** Percentage difference uses the average of both numbers as the reference. */
export function percentDifference(a: number, b: number): number {
  const average = (a + b) / 2;
  if (average === 0) return 0;
  return (Math.abs(a - b) / Math.abs(average)) * 100;
}

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

export function discountPrice(price: number, percentOff: number): number {
  return price * (1 - percentOff / 100);
}

export function priceAfterTax(price: number, taxPercent: number): number {
  return price * (1 + taxPercent / 100);
}

export function markupPercent(cost: number, price: number): number {
  if (cost === 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function priceFromMarkup(cost: number, markup: number): number {
  return cost * (1 + markup / 100);
}

export function marginPercent(cost: number, price: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function priceForMargin(cost: number, margin: number): number {
  if (margin === 100) return Infinity;
  return cost / (1 - margin / 100);
}

export function salaryToHourly(
  annualSalary: number,
  hoursPerWeek: number,
  weeksPerYear: number,
): number {
  const hours = hoursPerWeek * weeksPerYear;
  return hours === 0 ? 0 : annualSalary / hours;
}

export function hourlyToSalary(
  hourlyRate: number,
  hoursPerWeek: number,
  weeksPerYear: number,
): number {
  return hourlyRate * hoursPerWeek * weeksPerYear;
}

export interface OvertimeBreakdown {
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularPay: number;
  overtimePay: number;
  doubleTimePay: number;
  totalPay: number;
}

export function overtimePay(
  totalHours: number,
  hourlyRate: number,
  dailyOvertimeAfter: number,
  overtimeMultiplier: number,
  doubleTimeAfter: number,
  doubleTimeMultiplier: number,
): OvertimeBreakdown {
  const otStart = dailyOvertimeAfter;
  const doubleStart = doubleTimeAfter;

  // Hours worked beyond the overtime threshold, capped by the double-time band.
  const overtimeHours = Math.max(0, Math.min(totalHours - otStart, doubleStart - otStart));
  const doubleTimeHours = Math.max(0, totalHours - doubleStart);
  const regularHours = Math.max(0, Math.min(totalHours, otStart));

  const regularPay = regularHours * hourlyRate;
  const otPay = overtimeHours * hourlyRate * overtimeMultiplier;
  const dtPay = doubleTimeHours * hourlyRate * doubleTimeMultiplier;

  return {
    regularHours,
    overtimeHours,
    doubleTimeHours,
    regularPay,
    overtimePay: otPay,
    doubleTimePay: dtPay,
    totalPay: regularPay + otPay + dtPay,
  };
}

export function electricityCost(
  watts: number,
  hoursPerDay: number,
  pricePerKwh: number,
): { perDay: number; perMonth: number; perYear: number; yearlyKwh: number } {
  const kw = watts / 1000;
  const perDay = kw * hoursPerDay * pricePerKwh;
  const perMonth = perDay * 30;
  const perYear = perDay * 365;
  return { perDay, perMonth, perYear, yearlyKwh: kw * hoursPerDay * 365 };
}

/* ------------------------------------------------------------------ *
 * Grades and GPA
 * ------------------------------------------------------------------ */

/** Grade points on the 4.0 scale used by most US schools. */
export const GRADE_POINTS_4: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  "D-": 0.7,
  F: 0.0,
};

/** Grade points including the +0.5 / +1.0 weighting for honours classes. */
export const GRADE_POINTS_WEIGHTED: Record<string, number> = {
  ...GRADE_POINTS_4,
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
};

export interface GradeCourse {
  name: string;
  credits: number;
  grade: string;
  /** Bonus applied to the grade points: 0 none, 0.5 honours, 1 AP/IB. */
  bonus?: number;
}

export function gradePointsFor(
  grade: string,
  scale: "4.0" | "weighted" = "4.0",
): number {
  const table = scale === "weighted" ? GRADE_POINTS_WEIGHTED : GRADE_POINTS_4;
  const base = table[grade] ?? table[grade.toUpperCase()] ?? 0;
  return base;
}

export function gpaOf(courses: GradeCourse[], scale: "4.0" | "weighted" = "4.0"): number {
  let points = 0;
  let credits = 0;
  for (const course of courses) {
    const c = Number(course.credits) || 0;
    if (c <= 0) continue;
    points += gradePointsFor(course.grade, scale) * c;
    credits += c;
  }
  return credits === 0 ? 0 : points / credits;
}

export function weightedGpaOf(courses: GradeCourse[]): number {
  let points = 0;
  let credits = 0;
  for (const course of courses) {
    const c = Number(course.credits) || 0;
    if (c <= 0) continue;
    points += (gradePointsFor(course.grade, "4.0") + (course.bonus ?? 0)) * c;
    credits += c;
  }
  return credits === 0 ? 0 : points / credits;
}

/**
 * The plain average of the grade points, without any credit weighting.
 * Middle school report cards carry no credit hours, so the average of the
 * grades is the GPA there.
 */
export function averageGradePoints(courses: GradeCourse[]): number {
  if (courses.length === 0) return 0;
  const points = courses.reduce((sum, c) => sum + gradePointsFor(c.grade, "4.0"), 0);
  return points / courses.length;
}

/**
 * The percentage that starts an A on the site's letter scale, the same
 * boundary `letterGrade` uses.
 */
export const A_GRADE_BOUNDARY = 93;

/** Letter grade for a percentage, with +/- modifiers. */
export function letterGrade(percent: number): string {
  if (percent >= 97) return "A+";
  if (percent >= 93) return "A";
  if (percent >= 90) return "A-";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B-";
  if (percent >= 77) return "C+";
  if (percent >= 73) return "C";
  if (percent >= 70) return "C-";
  if (percent >= 67) return "D+";
  if (percent >= 63) return "D";
  if (percent >= 60) return "D-";
  return "F";
}

/**
 * Score needed on the final exam to reach `targetPercent`.
 * `currentPercent` is the running class grade, `finalWeight` the weight of
 * the final as a percentage of the course grade.
 */
export function finalGradeNeeded(
  currentPercent: number,
  finalWeight: number,
  targetPercent: number,
): number | null {
  const weight = finalWeight / 100;
  if (weight <= 0 || weight >= 1) return null;
  return (targetPercent - currentPercent * (1 - weight)) / weight;
}

/** Percentage on a test from the number of correct answers. */
export function testScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return (correct / total) * 100;
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function modes(values: number[]): number[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = 0;
  for (const c of counts.values()) best = Math.max(best, c);
  if (best <= 1) return [];
  return [...counts.entries()].filter(([, c]) => c === best).map(([v]) => v);
}

export function rangeOf(values: number[]): number {
  if (!values.length) return 0;
  return Math.max(...values) - Math.min(...values);
}

/** Variance. `sample = true` divides by n - 1, otherwise by n. */
export function variance(values: number[], sample: boolean): number {
  if (values.length < (sample ? 2 : 1)) return 0;
  const m = mean(values);
  const sumSq = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
  return sumSq / (sample ? values.length - 1 : values.length);
}

export function standardDeviation(values: number[], sample: boolean): number {
  return Math.sqrt(variance(values, sample));
}

/** Mean absolute deviation: average distance of each value from the mean. */
export function meanAbsoluteDeviation(values: number[]): number {
  if (!values.length) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + Math.abs(v - m), 0) / values.length;
}

export interface FiveNumberSummary {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  outliers: number[];
}

/** Tukey hinges: median of the lower / upper half. */
export function quartileSummary(values: number[]): FiveNumberSummary {
  if (!values.length) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0, outliers: [] };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.length % 2 ? sorted.slice(half + 1) : sorted.slice(half);
  const q1 = median(lower);
  const q3 = median(upper);
  const iqr = q3 - q1;
  const outliers = sorted.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
  return {
    min: sorted[0],
    q1,
    median: median(sorted),
    q3,
    max: sorted[sorted.length - 1],
    iqr,
    outliers,
  };
}

export function zScore(value: number, m: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

/** Standard normal CDF via the error function (Abramowitz & Stegun). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Percentile rank of a z-score within the normal distribution. */
export function percentileFromZ(z: number): number {
  return normalCdf(z) * 100;
}

/* ------------------------------------------------------------------ *
 * Fractions
 * ------------------------------------------------------------------ */

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export interface Fraction {
  numerator: number;
  denominator: number;
}

export function simplifyFraction(numerator: number, denominator: number): Fraction {
  if (denominator === 0) return { numerator: 0, denominator: 0 };
  const sign = denominator < 0 ? -1 : 1;
  const n = numerator * sign;
  const d = Math.abs(denominator);
  const g = gcd(n, d);
  return { numerator: n / g, denominator: d / g };
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return simplifyFraction(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}

export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  return simplifyFraction(
    a.numerator * b.denominator - b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return simplifyFraction(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function divideFractions(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === 0) return { numerator: 0, denominator: 0 };
  return simplifyFraction(a.numerator * b.denominator, a.denominator * b.numerator);
}

/**
 * The result of a fraction operation before the numerator and the denominator
 * are reduced, so the unsimplified fraction can be shown as the working out.
 */
export function unsimplifiedFraction(
  operation: "add" | "subtract" | "multiply" | "divide",
  a: Fraction,
  b: Fraction,
): Fraction {
  if (operation === "add") {
    return {
      numerator: a.numerator * b.denominator + b.numerator * a.denominator,
      denominator: a.denominator * b.denominator,
    };
  }
  if (operation === "subtract") {
    return {
      numerator: a.numerator * b.denominator - b.numerator * a.denominator,
      denominator: a.denominator * b.denominator,
    };
  }
  if (operation === "multiply") {
    return { numerator: a.numerator * b.numerator, denominator: a.denominator * b.denominator };
  }
  return { numerator: a.numerator * b.denominator, denominator: a.denominator * b.numerator };
}

/** Mixed number (whole + proper fraction) to an improper fraction. */
export function mixedToImproper(whole: number, numerator: number, denominator: number): Fraction {
  return simplifyFraction(whole * denominator + numerator, denominator);
}

export interface MixedNumber {
  whole: number;
  numerator: number;
  denominator: number;
  decimal: number;
}

export function improperToMixed(numerator: number, denominator: number): MixedNumber {
  const simplified = simplifyFraction(numerator, denominator);
  if (simplified.denominator === 0) {
    return { whole: 0, numerator: 0, denominator: 0, decimal: 0 };
  }
  const sign = simplified.numerator < 0 ? -1 : 1;
  const abs = Math.abs(simplified.numerator);
  const whole = Math.floor(abs / simplified.denominator);
  const rest = abs % simplified.denominator;
  return {
    whole: sign * whole,
    numerator: rest,
    denominator: simplified.denominator,
    decimal: simplified.numerator / simplified.denominator,
  };
}

export function fractionToDecimal(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Exact decimal → fraction.
 * Supports repeating notation such as `0.333...` or `0.1(6)`.
 */
export function decimalToFraction(input: string): Fraction {
  let raw = input.trim().replace(/,/g, "");
  // `0.333...` is the same as `0.3(3)`.
  const ellipsis = raw.match(/^([+-]?)(\d*)\.(\d*)\.\.\.$/);
  if (ellipsis) {
    const [, sign, intPart, decimals] = ellipsis;
    const repeated = decimals.slice(0, 1) || "0";
    raw = `${sign}${intPart}.${decimals.slice(0, decimals.length - 1)}(${repeated})`;
  }
  const match = raw.match(/^([+-]?)(\d*)(?:\.(\d+))?(?:\((\d+)\))?$/);
  if (!match || (!match[2] && !match[3])) return { numerator: 0, denominator: 1 };

  const [, sign, intPart, decPart, repPart] = match;
  const negative = sign === "-";
  let numerator: number;
  let denominator: number;

  if (repPart) {
    const nonRepeating = decPart ?? "";
    const numeratorStr = `${intPart || "0"}${nonRepeating}${repPart}`;
    const otherStr = `${intPart || "0"}${nonRepeating}`;
    numerator = Number(numeratorStr) - Number(otherStr);
    denominator = 10 ** nonRepeating.length * (10 ** repPart.length - 1);
  } else {
    const digits = decPart ?? "";
    numerator = Number(`${intPart || "0"}${digits}`);
    denominator = 10 ** digits.length;
  }

  const simplified = simplifyFraction(numerator, denominator);
  if (negative) simplified.numerator = -simplified.numerator;
  return simplified;
}

/**
 * Detects a repeating decimal and returns the repeating period.
 * Uses long division on the original fraction, so the pre-period is skipped.
 */
export function repeatingPeriod(numerator: number, denominator: number): string | null {
  if (denominator === 0) return null;
  const den = Math.abs(denominator);
  if (den === 0) return null;
  let remainder = Math.abs(numerator) % den;
  if (remainder === 0) return null;

  const seen = new Map<number, number>();
  const digits: string[] = [];
  let order = 0;

  while (remainder !== 0 && !seen.has(remainder)) {
    seen.set(remainder, order);
    const scaled = remainder * 10;
    digits.push(String(Math.floor(scaled / den)));
    remainder = scaled % den;
    order += 1;
  }

  if (remainder === 0) return null;
  const start = seen.get(remainder);
  if (start === undefined) return null;
  return digits.slice(start).join("");
}

/** Least common denominator of a list of fractions. */
export function commonDenominator(fractions: Fraction[]): number {
  return fractions.reduce((acc, f) => lcm(acc, f.denominator), 1);
}

/* ------------------------------------------------------------------ *
 * Ratios
 * ------------------------------------------------------------------ */

/** Reduces a ratio like 24:36 to 2:3. */
export function simplifyRatio(a: number, b: number): { a: number; b: number; factor: number } {
  const g = gcd(a, b);
  return { a: a / g, b: b / g, factor: g };
}

/** Solves A : B = C : ? */
export function solveRatio(a: number, b: number, c: number): number {
  return b === 0 ? 0 : (b * c) / a;
}

/**
 * The height that keeps the ratio a : b for a given width.
 * Resizing a ratio must never break it: the height follows the width.
 */
export function heightForRatioWidth(a: number, b: number, width: number): number {
  return a === 0 ? 0 : width * (b / a);
}

/** Splits a total in the ratio a : b. */
export function splitByRatio(total: number, a: number, b: number): { first: number; second: number } {
  const sum = a + b;
  if (sum === 0) return { first: 0, second: 0 };
  return { first: (total * a) / sum, second: (total * b) / sum };
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

/** Parses `YYYY-MM-DD` in the local timezone (avoids UTC day shifts). */
/**
 * Parses "YYYY-MM-DD" or the German "DD.MM.YYYY" (one-digit day and month are
 * fine). Impossible dates such as 2026-02-31 are rejected instead of rolling
 * over into the next month.
 */
export function parseDate(value: string): Date | null {
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const german = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : german
      ? [Number(german[3]), Number(german[2]), Number(german[1])]
      : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function utcDays(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  totalWeeks: number;
  nextBirthday: Date;
  daysToBirthday: number;
}

/** Exact age in years / months / days between two dates. */
export function ageBetween(birth: Date, on: Date): AgeResult {
  let years = on.getFullYear() - birth.getFullYear();
  let months = on.getMonth() - birth.getMonth();
  let days = on.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = on.getMonth() - 1;
    const prevYear = prevMonth < 0 ? on.getFullYear() - 1 : on.getFullYear();
    const normalizedMonth = prevMonth < 0 ? 11 : prevMonth;
    days += daysInMonth(prevYear, normalizedMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round((utcDays(on) - utcDays(birth)) / 86400000);

  let nextBirthday = new Date(on.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday.getTime() < on.getTime()) {
    nextBirthday = new Date(on.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }

  return {
    years,
    months,
    days,
    totalDays,
    totalMonths: years * 12 + months,
    totalWeeks: Math.floor(totalDays / 7),
    nextBirthday,
    daysToBirthday: Math.round((utcDays(nextBirthday) - utcDays(on)) / 86400000),
  };
}

export interface DateDifference {
  days: number;
  weeks: number;
  months: number;
  years: number;
  weekday: string;
}

export function differenceBetween(from: Date, to: Date, includeEnd: boolean): DateDifference {
  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;
  const rawDays = Math.round((utcDays(end) - utcDays(start)) / 86400000);
  const days = includeEnd ? rawDays + 1 : rawDays;
  const age = ageBetween(start, end);
  return {
    days,
    weeks: Math.floor(days / 7),
    months: age.years * 12 + age.months,
    years: age.years,
    weekday: end.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

/** Adds or subtracts calendar units from a date. */
export function shiftDate(
  date: Date,
  units: { days?: number; weeks?: number; months?: number; years?: number },
  direction: 1 | -1,
): Date {
  const result = new Date(date.getTime());
  if (units.days) result.setDate(result.getDate() + direction * units.days);
  if (units.weeks) result.setDate(result.getDate() + direction * units.weeks * 7);
  if (units.months) {
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + direction * units.months);
    const maxDay = daysInMonth(result.getFullYear(), result.getMonth());
    result.setDate(Math.min(day, maxDay));
  }
  if (units.years) {
    const day = result.getDate();
    result.setDate(1);
    result.setFullYear(result.getFullYear() + direction * units.years);
    const maxDay = daysInMonth(result.getFullYear(), result.getMonth());
    result.setDate(Math.min(day, maxDay));
  }
  return result;
}

/** Easter Sunday for a year (anonymous Gregorian algorithm). */
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

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

export type HolidaySet = "none" | "us" | "uk";

/** Federal / bank holidays for a given year. */
export function holidaysForYear(year: number, set: HolidaySet): string[] {
  if (set === "none") return [];
  const dates: Date[] = [];

  if (set === "us") {
    dates.push(new Date(year, 0, 1));
    dates.push(nthWeekday(year, 0, 1, 3));
    dates.push(nthWeekday(year, 1, 1, 3));
    dates.push(lastWeekday(year, 4, 1));
    dates.push(new Date(year, 5, 19));
    dates.push(new Date(year, 6, 4));
    dates.push(nthWeekday(year, 8, 1, 1));
    dates.push(nthWeekday(year, 9, 1, 2));
    dates.push(new Date(year, 10, 11));
    dates.push(nthWeekday(year, 10, 4, 4));
    dates.push(new Date(year, 11, 25));
  } else {
    const easter = easterSunday(year);
    dates.push(new Date(year, 0, 1));
    dates.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2));
    dates.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1));
    dates.push(nthWeekday(year, 4, 1, 1));
    dates.push(lastWeekday(year, 4, 1));
    dates.push(lastWeekday(year, 7, 1));
    dates.push(new Date(year, 11, 25));
    dates.push(new Date(year, 11, 26));
  }

  return dates.map(toISODate);
}

/** Counts working days (Mon–Fri, minus holidays) between two dates. */
export function businessDaysBetween(
  from: Date,
  to: Date,
  holidays: string[],
): { businessDays: number; weekendDays: number; totalDays: number; holidaysSkipped: number } {
  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;
  const holidaySet = new Set(holidays);
  let business = 0;
  let weekend = 0;
  let skipped = 0;
  const cursor = new Date(start.getTime());

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    const iso = toISODate(cursor);
    if (day === 0 || day === 6) {
      weekend += 1;
    } else if (holidaySet.has(iso)) {
      skipped += 1;
    } else {
      business += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    businessDays: business,
    weekendDays: weekend,
    totalDays: Math.round((utcDays(end) - utcDays(start)) / 86400000) + 1,
    holidaysSkipped: skipped,
  };
}

/* ------------------------------------------------------------------ *
 * Time
 * ------------------------------------------------------------------ */

/** Parses `HH:MM` or `H:MM AM/PM` into minutes after midnight. */
export function parseTime(value: string): number | null {
  const raw = value.trim().toUpperCase();
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatHoursMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

/** Minutes between two clock times, handling overnight shifts. */
export function minutesBetween(start: string, end: string): number | null {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff < 0) diff += 1440;
  return diff;
}

/**
 * True when a shift ends before it starts, so the shift runs over midnight.
 * `minutesBetween` always returns a positive length, the overnight case has to
 * be detected from the clock times themselves.
 */
export function isOvernightShift(start: string, end: string): boolean {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === null || e === null) return false;
  return e < s;
}

export function decimalHours(minutes: number): number {
  return minutes / 60;
}

/** Sums a list of `HH:MM` entries. */
export function sumTimes(values: string[]): number | null {
  let total = 0;
  for (const v of values) {
    const parsed = parseTime(v);
    if (parsed === null) return null;
    total += parsed;
  }
  return total;
}

/** Military (24h) time to standard 12h time. */
export function militaryToStandard(value: string): string | null {
  const raw = value.trim();
  if (!/^\d{3,4}$/.test(raw)) return null;
  const padded = raw.padStart(4, "0");
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2));
  if (hours > 23 || minutes > 59) return null;
  const suffix = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Standard 12h time to military (24h) time. */
export function standardToMilitary(value: string): string | null {
  const raw = value.trim().toUpperCase();
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
}

export interface TimeCardRow {
  in: string;
  out: string;
  breakMinutes: number;
}

/** Turns a time card into hours, overtime and pay. */
export function timeCardTotals(
  rows: TimeCardRow[],
  hourlyRate: number,
  overtimeAfter: number,
  overtimeMultiplier: number,
): {
  dailyHours: number[];
  totalHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
} {
  const dailyHours: number[] = [];
  let regularHours = 0;
  let overtimeHours = 0;

  for (const row of rows) {
    const minutes = minutesBetween(row.in, row.out);
    if (minutes === null) {
      dailyHours.push(0);
      continue;
    }
    const net = Math.max(0, minutes - (row.breakMinutes || 0));
    const hours = net / 60;
    dailyHours.push(hours);
    regularHours += Math.min(hours, overtimeAfter);
    overtimeHours += Math.max(0, hours - overtimeAfter);
  }

  const regularPay = regularHours * hourlyRate;
  const otPay = overtimeHours * hourlyRate * overtimeMultiplier;

  return {
    dailyHours,
    totalHours: regularHours + overtimeHours,
    overtimeHours,
    regularPay,
    overtimePay: otPay,
    totalPay: regularPay + otPay,
  };
}

/* ------------------------------------------------------------------ *
 * Number bases
 * ------------------------------------------------------------------ */

export type Base = 2 | 8 | 10 | 16;

export function parseInBase(value: string, base: Base): bigint | null {
  const raw = value.trim().replace(/^0[xXbBoO]/, "");
  if (!raw) return null;
  const pattern =
    base === 16
      ? /^[0-9a-f]+$/i
      : base === 10
        ? /^\d+$/
        : base === 8
          ? /^[0-7]+$/
          : /^[01]+$/;
  if (!pattern.test(raw)) return null;
  try {
    // The value has to be read in the requested base, not as a decimal number.
    if (base === 2) return BigInt(`0b${raw}`);
    if (base === 8) return BigInt(`0o${raw}`);
    if (base === 16) return BigInt(`0x${raw}`);
    return BigInt(raw);
  } catch {
    return null;
  }
}

export function formatInBase(value: bigint, base: Base): string {
  return value.toString(base).toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Roman numerals
 * ------------------------------------------------------------------ */

const ROMAN_VALUES: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function intToRoman(num: number): string {
  if (!Number.isFinite(num) || num <= 0 || num > 3999999) return "";
  let remaining = Math.floor(num);
  let out = "";
  for (const [value, symbol] of ROMAN_VALUES) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out;
}

export function romanToInt(value: string): number | null {
  const raw = value.trim().toUpperCase();
  if (!raw) return null;
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const current = map[raw[i]];
    const next = map[raw[i + 1]] ?? 0;
    if (current === undefined) return null;
    if (current < next) total -= current;
    else total += current;
  }
  return total;
}

export type RomanDateOrder = "US" | "UK" | "ISO";
export type RomanDateSeparator = "." | "-" | "•" | "/";

export function dateToRoman(
  date: Date,
  order: RomanDateOrder = "US",
  separator: RomanDateSeparator = ".",
): string {
  const day = intToRoman(date.getDate());
  const month = intToRoman(date.getMonth() + 1);
  const year = intToRoman(date.getFullYear());
  if (order === "ISO") return `${year}${separator}${month}${separator}${day}`;
  if (order === "UK") return `${day}${separator}${month}${separator}${year}`;
  return `${month}${separator}${day}${separator}${year}`;
}

export type DogSize = "small" | "medium" | "large" | "giant";

export interface DogAgeResult {
  avma: number;
  epigenetic: number;
  stage: string;
  dogYearsEquivalent: number;
}

/**
 * Dog age in human years.
 * AVMA chart: the first two dog years count as 10.5 human years each, then the
 * size of the dog decides how fast it ages. The epigenetic formula comes from
 * the 2021 "How old is my dog in human years?" study.
 */
export function dogAge(years: number, size: DogSize): DogAgeResult {
  const age = Math.max(0, years);
  const perYear: Record<DogSize, number> = {
    small: 4,
    medium: 5,
    large: 6,
    giant: 7,
  };
  const avma =
    age <= 2 ? age * 10.5 : 21 + (age - 2) * perYear[size];
  const epigenetic = age <= 0 ? 0 : 10 * Math.log10(age) + 10;

  let stage = "Puppy";
  if (age >= 12) stage = "Senior";
  else if (age >= 3) stage = "Adult";
  else if (age >= 1) stage = "Adolescent";

  return {
    avma: Math.round(avma * 10) / 10,
    epigenetic: Math.round(epigenetic * 10) / 10,
    stage,
    dogYearsEquivalent: Math.round(avma * 7) / 7,
  };
}

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

/** Cubic feet per pre-mix bag (60 lb bag ≈ 0.45 ft³). */
export const CONCRETE_BAG_YIELD: Record<number, number> = {
  40: 0.3,
  50: 0.375,
  60: 0.45,
  80: 0.6,
};

export interface ConcreteResult {
  cubicFeet: number;
  cubicYards: number;
  cubicMeters: number;
  bags: Record<number, number>;
}

export function concreteVolume(
  lengthFt: number,
  widthFt: number,
  depthIn: number,
  wastePercent: number,
): ConcreteResult {
  const cubicFeet = lengthFt * widthFt * (depthIn / 12) * (1 + wastePercent / 100);
  const bags: Record<number, number> = {};
  for (const weight of [40, 50, 60, 80]) {
    bags[weight] = Math.ceil(cubicFeet / CONCRETE_BAG_YIELD[weight]);
  }
  return {
    cubicFeet,
    cubicYards: cubicFeet / 27,
    cubicMeters: cubicFeet * 0.0283168,
    bags,
  };
}

export interface GravelResult {
  cubicFeet: number;
  cubicYards: number;
  tons: number;
  metricTons: number;
}

export function gravelVolume(
  areaSqFt: number,
  depthIn: number,
  densityTonsPerCubicYard: number,
  wastePercent: number,
): GravelResult {
  const cubicFeet = areaSqFt * (depthIn / 12) * (1 + wastePercent / 100);
  const cubicYards = cubicFeet / 27;
  const tons = cubicYards * densityTonsPerCubicYard;
  return {
    cubicFeet,
    cubicYards,
    tons,
    metricTons: tons * 0.907185,
  };
}

export interface MulchResult {
  cubicFeet: number;
  cubicYards: number;
  bags: Record<number, number>;
}

export function mulchVolume(
  areaSqFt: number,
  depthIn: number,
  wastePercent: number,
): MulchResult {
  const cubicFeet = areaSqFt * (depthIn / 12) * (1 + wastePercent / 100);
  const bags: Record<number, number> = {};
  for (const size of [1.5, 2, 3]) {
    bags[size] = Math.ceil(cubicFeet / size);
  }
  return {
    cubicFeet,
    cubicYards: cubicFeet / 27,
    bags,
  };
}

export interface TileResult {
  tilesNeeded: number;
  boxesNeeded: number;
  squareFeet: number;
}

export function tileCount(
  areaSqFt: number,
  tileLengthIn: number,
  tileWidthIn: number,
  groutIn: number,
  wastePercent: number,
  tilesPerBox: number,
): TileResult {
  const tileAreaSqFt = ((tileLengthIn + groutIn) * (tileWidthIn + groutIn)) / 144;
  const tiles = Math.ceil((areaSqFt / tileAreaSqFt) * (1 + wastePercent / 100));
  return {
    tilesNeeded: tiles,
    boxesNeeded: Math.ceil(tiles / tilesPerBox),
    squareFeet: areaSqFt,
  };
}

export interface PaintResult {
  wallAreaSqFt: number;
  ceilingAreaSqFt: number;
  gallons: number;
  quarts: number;
  litres: number;
}

export function paintNeeded(
  lengthFt: number,
  widthFt: number,
  heightFt: number,
  doorsSqFt: number,
  windowsSqFt: number,
  includeCeiling: boolean,
  coverageSqFtPerGallon: number,
  coats: number,
): PaintResult {
  const perimeter = 2 * (lengthFt + widthFt);
  const grossWall = perimeter * heightFt;
  const wallArea = Math.max(0, grossWall - doorsSqFt - windowsSqFt);
  const ceilingArea = includeCeiling ? lengthFt * widthFt : 0;
  const total = wallArea + ceilingArea;
  const gallons = (total / coverageSqFtPerGallon) * coats;
  return {
    wallAreaSqFt: wallArea,
    ceilingAreaSqFt: ceilingArea,
    gallons,
    quarts: gallons * 4,
    litres: gallons * 3.78541,
  };
}

export interface RoofingResult {
  areaSqFt: number;
  squares: number;
  bundles: number;
  pitchMultiplier: number;
  underlaymentSqFt: number;
}

export function roofingEstimate(
  footprintSqFt: number,
  pitch: number,
  overhangIn: number,
  wastePercent: number,
  squaresPerBundle: number,
): RoofingResult {
  const pitchMultiplier = Math.sqrt(1 + (pitch / 12) ** 2);
  const overhangArea = (footprintSqFt / 12) * overhangIn * 0.5;
  const area = (footprintSqFt + overhangArea) * pitchMultiplier * (1 + wastePercent / 100);
  const squares = area / 100;
  return {
    areaSqFt: area,
    squares,
    bundles: Math.ceil(squares / squaresPerBundle),
    pitchMultiplier,
    underlaymentSqFt: area * 1.1,
  };
}

export interface BtuResult {
  btu: number;
  recommendedTons: number;
  /** The BTU size the tool recommends, as a plain number. */
  recommendedBtu: number;
  /** The ton figure that belongs to the recommended size: "1", "1.5", "2" ... */
  recommendedTonLabel: string;
  squareFeet: number;
}

export function btuForRoom(
  squareFeet: number,
  ceilingHeight: number,
  sunExposure: "low" | "medium" | "high",
  occupants: number,
  useAsKitchen: boolean,
): BtuResult {
  let btu = squareFeet * 30;
  if (ceilingHeight > 8) btu += squareFeet * 5;
  if (sunExposure === "high") btu += squareFeet * 10;
  else if (sunExposure === "medium") btu += squareFeet * 5;
  btu += occupants * 300;
  if (useAsKitchen) btu += 1200;

  const tons = btu / 12000;
  // The recommended size comes in the sizes that the trade uses. The wording
  // is left to the caller, because the unit word belongs to the language.
  let recommendedBtu = 12000;
  let recommendedTonLabel = "1";
  if (btu >= 18000) {
    recommendedBtu = 18000;
    recommendedTonLabel = "1.5";
  }
  if (btu >= 23000) {
    recommendedBtu = 24000;
    recommendedTonLabel = "2";
  }
  if (btu >= 34000) {
    recommendedBtu = 36000;
    recommendedTonLabel = "3";
  }
  if (btu >= 46000) {
    recommendedBtu = 48000;
    recommendedTonLabel = "4";
  }
  if (btu >= 58000) {
    recommendedBtu = 60000;
    recommendedTonLabel = "5";
  }

  return {
    btu: Math.round(btu / 100) * 100,
    recommendedTons: Math.round(tons * 10) / 10,
    recommendedBtu,
    recommendedTonLabel,
    squareFeet,
  };
}

export type ShapeKind = "rectangle" | "circle" | "triangle";

export interface ShapeInput {
  kind: ShapeKind;
  a: number;
  b: number;
}

export function shapeArea(shape: ShapeInput): number {
  if (shape.kind === "rectangle") return shape.a * shape.b;
  if (shape.kind === "circle") return Math.PI * (shape.a / 2) ** 2;
  return (shape.a * shape.b) / 2;
}

/* ------------------------------------------------------------------ *
 * Fitness
 * ------------------------------------------------------------------ */

export type OneRepMaxFormula = "epley" | "brzycki" | "lombardi";

export function oneRepMax(
  weight: number,
  reps: number,
  formula: OneRepMaxFormula = "epley",
): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  if (formula === "brzycki") return weight * (36 / (37 - reps));
  if (formula === "lombardi") return weight * reps ** 0.1;
  return weight * (1 + reps / 30);
}

export function waterIntake(
  weightKg: number,
  exerciseMinutes: number,
  climate: "temperate" | "hot" | "very-hot",
): { litres: number; ounces: number; cups: number; bottles: number } {
  const base = weightKg * 0.033;
  const exercise = (exerciseMinutes / 30) * 0.35;
  const climateFactor = climate === "temperate" ? 0 : climate === "hot" ? 0.5 : 1;
  const litres = Math.round((base + exercise + climateFactor) * 10) / 10;
  return {
    litres,
    ounces: Math.round(litres * 33.814 * 10) / 10,
    cups: Math.round((litres * 33.814 / 8) * 10) / 10,
    bottles: Math.round((litres * 33.814 / 16.9) * 10) / 10,
  };
}
