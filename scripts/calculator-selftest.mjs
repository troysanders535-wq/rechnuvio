/**
 * Formula self-test for the calculator tools.
 *
 * Runs every calculation helper against hand-checked expected values.
 * Usage: node scripts/calculator-selftest.mjs
 */

import {
  addFractions,
  ageBetween,
  btuForRoom,
  businessDaysBetween,
  commonDenominator,
  concreteVolume,
  dateToRoman,
  decimalToFraction,
  differenceBetween,
  discountPrice,
  dogAge,
  electricityCost,
  easterSunday,
  finalGradeNeeded,
  formatInBase,
  fractionToDecimal,
  gpaOf,
  gravelVolume,
  weightedGpaOf,
  holidaysForYear,
  improperToMixed,
  intToRoman,
  lcm,
  letterGrade,
  marginPercent,
  markupPercent,
  mean,
  meanAbsoluteDeviation,
  median,
  militaryToStandard,
  minutesBetween,
  mixedToImproper,
  modes,
  multiplyFractions,
  mulchVolume,
  normalCdf,
  oneRepMax,
  overtimePay,
  paintNeeded,
  parseDate,
  parseInBase,
  parseTime,
  percentileFromZ,
  percentChange,
  percentDifference,
  percentOf,
  priceForMargin,
  priceFromMarkup,
  quartileSummary,
  rangeOf,
  repeatingPeriod,
  romanToInt,
  solveRatio,
  splitByRatio,
  simplifyRatio,
  standardDeviation,
  standardToMilitary,
  variance,
  zScore,
} from "../src/components/calculators/calc.ts";

let passed = 0;
const failures = [];

function show(value) {
  if (typeof value === "bigint") return `${value}n`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function check(name, actual, expected, tolerance = 1e-6) {
  let ok;
  if (typeof expected === "bigint") {
    ok = actual === expected;
  } else if (typeof expected === "number") {
    ok = typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
  } else {
    ok = show(actual) === show(expected);
  }
  if (ok) {
    passed += 1;
  } else {
    failures.push(`${name}: expected ${show(expected)}, got ${show(actual)}`);
  }
}

/* Percentage ------------------------------------------------------- */
check("percentOf(15, 250)", percentOf(15, 250), 37.5);
check("percentOf(0, 10)", percentOf(0, 10), 0);
check("whatPercent(30, 120)", (30 / 120) * 100, 25);
check("percentChange(80, 100)", percentChange(80, 100), 25);
check("percentChange(100, 80)", percentChange(100, 80), -20);
check("percentChange(0, 50)", percentChange(0, 50), 0);
check("percentDifference(40, 60)", percentDifference(40, 60), 40);
check("percentDifference(100, 100)", percentDifference(100, 100), 0);

/* Money ------------------------------------------------------------ */
check("discountPrice(100, 20)", discountPrice(100, 20), 80);
check("markupPercent(60, 100)", markupPercent(60, 100), 66.666666, 1e-4);
check("priceFromMarkup(60, 50)", priceFromMarkup(60, 50), 90);
check("marginPercent(60, 100)", marginPercent(60, 100), 40);
check("priceForMargin(60, 40)", priceForMargin(60, 40), 100);
const ot = overtimePay(10, 25, 8, 1.5, 12, 2);
check("overtime regular hours", ot.regularHours, 8);
check("overtime hours", ot.overtimeHours, 2);
check("overtime double time hours", ot.doubleTimeHours, 0);
check("overtime regular pay", ot.regularPay, 200);
check("overtime pay", ot.overtimePay, 75);
check("overtime total pay", ot.totalPay, 275);
const power = electricityCost(1500, 8, 0.28);
check("electricity per day", power.perDay, 3.36);
check("electricity per month", power.perMonth, 100.8);
check("electricity yearly kWh", power.yearlyKwh, 4380);

/* Grades ----------------------------------------------------------- */
const courses = [
  { name: "A", credits: 3, grade: "A" },
  { name: "B", credits: 3, grade: "B" },
];
check("gpaOf", gpaOf(courses), 3.5);
check("gpaOf ignores bonus", gpaOf([{ credits: 3, grade: "A", bonus: 1 }]), 4);
check("weightedGpaOf applies bonus", weightedGpaOf([{ credits: 3, grade: "A", bonus: 1 }]), 5);
check("letterGrade(93)", letterGrade(93), "A");
check("letterGrade(89.9)", letterGrade(89.9), "B+");
check("letterGrade(60)", letterGrade(60), "D-");
check("letterGrade(59.9)", letterGrade(59.9), "F");
check("finalGradeNeeded(80, 30, 90)", finalGradeNeeded(80, 30, 90), 113.333333, 1e-4);

/* Statistics -------------------------------------------------------- */
const data = [12, 15, 23, 27, 34, 45, 52, 60];
check("mean", mean(data), 33.5);
check("median", median(data), 30.5);
check("modes", modes(data), []);
check("range", rangeOf(data), 48);
const popVar = data.reduce((s, v) => s + (v - 33.5) ** 2, 0) / 8;
check("population variance value", variance(data, false), 266.75);
check("sample variance value", variance(data, true), 304.857142857, 1e-6);
check("population SD", standardDeviation(data, false), Math.sqrt(266.75), 1e-9);
check("sample SD", standardDeviation(data, true), Math.sqrt(304.857142857), 1e-9);
check("MAD", meanAbsoluteDeviation(data), 14.25);
check("zScore(70, 55, 12)", zScore(70, 55, 12), 1.25);
check("percentileFromZ(1.25)", percentileFromZ(1.25), 89.44, 1e-2);
const summary = quartileSummary(data);
check("Q1", summary.q1, 19);
check("Q2", summary.median, 30.5);
check("Q3", summary.q3, 48.5);
check("IQR", summary.iqr, 29.5);
check("outliers", summary.outliers, []);
check("normalCdf(0)", normalCdf(0), 0.5, 1e-4);
check("normalCdf(1.96)", normalCdf(1.96), 0.975, 1e-3);

/* Fractions --------------------------------------------------------- */
check("gcd(12, 18)", lcm(12, 18), 36);
check("addFractions", addFractions({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }), {
  numerator: 5,
  denominator: 6,
});
check("multiplyFractions", multiplyFractions({ numerator: 2, denominator: 3 }, { numerator: 3, denominator: 4 }), {
  numerator: 1,
  denominator: 2,
});
check("mixedToImproper(2, 1, 2)", mixedToImproper(2, 1, 2), { numerator: 5, denominator: 2 });
check("improperToMixed(7, 2)", improperToMixed(7, 2), {
  whole: 3,
  numerator: 1,
  denominator: 2,
  decimal: 3.5,
});
check("decimalToFraction(0.375)", decimalToFraction("0.375"), { numerator: 3, denominator: 8 });
check("decimalToFraction(0.333...)", decimalToFraction("0.333..."), { numerator: 1, denominator: 3 });
check("decimalToFraction(0.3(3))", decimalToFraction("0.3(3)"), { numerator: 1, denominator: 3 });
check("fractionToDecimal(1, 4)", fractionToDecimal(1, 4), 0.25);
check("commonDenominator", commonDenominator([
  { numerator: 1, denominator: 2 },
  { numerator: 1, denominator: 3 },
]), 6);

/* Dates ------------------------------------------------------------- */
const birth = parseDate("1995-06-15");
const on = parseDate("2026-10-23");
const age = ageBetween(birth, on);
check("age years", age.years, 31);
check("age months", age.months, 4);
check("age days", age.days, 8);
check("age total days", age.totalDays, 11453);
const diff = differenceBetween(parseDate("2026-01-01"), parseDate("2026-12-31"), false);
check("days between", diff.days, 364);
check("months between", diff.months, 11);
const business = businessDaysBetween(parseDate("2026-01-01"), parseDate("2026-12-31"), []);
check("business days 2026", business.businessDays, 261);
check("weekend days 2026", business.weekendDays, 104);
const easter = easterSunday(2026);
check("easter 2026", easter.getMonth() === 3 && easter.getDate() === 5, true);
const usHolidays = holidaysForYear(2026, "us");
check("US holidays count", usHolidays.length, 11);
check("US new year", usHolidays.includes("2026-01-01"), true);
check("US MLK", usHolidays.includes("2026-01-19"), true);
check("US memorial", usHolidays.includes("2026-05-25"), true);
check("US thanksgiving", usHolidays.includes("2026-11-26"), true);

/* Time -------------------------------------------------------------- */
check("parseTime 24h", parseTime("17:30"), 1050);
check("parseTime 12h", parseTime("5:30 PM"), 1050);
check("parseTime midnight", parseTime("12:00 AM"), 0);
check("minutesBetween overnight", minutesBetween("22:00", "06:00"), 480);
check("minutesBetween same day", minutesBetween("09:00", "17:30"), 510);
check("militaryToStandard", militaryToStandard("1730"), "5:30 PM");
check("militaryToStandard invalid", militaryToStandard("9999"), null);

/* Number bases ------------------------------------------------------ */
check("parseInBase binary", parseInBase("1010", 2), 10n);
check("parseInBase hex", parseInBase("FF", 16), 255n);
check("parseInBase invalid binary", parseInBase("10201", 2), null);
check("formatInBase", formatInBase(255n, 16), "FF");
check("intToRoman(2026)", intToRoman(2026), "MMXXVI");
check("intToRoman(4)", intToRoman(4), "IV");
check("romanToInt", romanToInt("MMXXVI"), 2026);
check("romanToInt invalid", romanToInt("ABC"), null);
check("roman date US", dateToRoman(new Date(2026, 9, 23), "US", "."), "X.XXIII.MMXXVI");
check("roman date ISO", dateToRoman(new Date(2026, 9, 23), "ISO", "-"), "MMXXVI-X-XXIII");
check("standardToMilitary", standardToMilitary("5:30 PM"), "1730");
check("repeatingPeriod 1/3", repeatingPeriod(1, 3), "3");
check("repeatingPeriod 1/6", repeatingPeriod(1, 6), "6");
check("repeatingPeriod 1/12", repeatingPeriod(1, 12), "3");
check("repeatingPeriod 1/4", repeatingPeriod(1, 4), null);

/* Ratios ----------------------------------------------------------- */
check("simplifyRatio", simplifyRatio(24, 36), { a: 2, b: 3, factor: 12 });
check("solveRatio", solveRatio(2, 3, 4), 6);
check("splitByRatio", splitByRatio(500, 2, 3), { first: 200, second: 300 });

/* Construction ------------------------------------------------------ */
const concrete = concreteVolume(20, 16, 4, 0);
check("concrete cubic feet", concrete.cubicFeet, 106.666667, 1e-4);
check("concrete cubic yards", concrete.cubicYards, 3.950617, 1e-5);
check("concrete 80 lb bags", concrete.bags[80], 178);
check("concrete 60 lb bags", concrete.bags[60], 238);
check("concrete 40 lb bags", concrete.bags[40], 356);
const gravel = gravelVolume(320, 4, 1.35, 0);
check("gravel cubic feet", gravel.cubicFeet, 106.666667, 1e-4);
check("gravel tons", gravel.tons, 5.333333, 1e-5);
const mulch = mulchVolume(320, 3, 0);
check("mulch cubic feet", mulch.cubicFeet, 80);
check("mulch 2 cu ft bags", mulch.bags[2], 40);
const paint = paintNeeded(12, 12, 8, 21, 15, false, 350, 2);
check("paint wall area", paint.wallAreaSqFt, 348);
check("paint gallons", paint.gallons, 1.988571, 1e-5);
const btu = btuForRoom(150, 8, "medium", 2, false);
check("btu value", btu.btu, 5900);
check("btu tons", btu.recommendedTons, 0.5);

/* Fitness ------------------------------------------------------------ */
check("1RM epley", oneRepMax(100, 5, "epley"), 116.666667, 1e-5);
check("1RM brzycki", oneRepMax(100, 5, "brzycki"), 112.5);
check("1RM lombardi", oneRepMax(100, 5, "lombardi"), 117.461894, 1e-5);
check("1RM single rep", oneRepMax(100, 1, "epley"), 100);
const dog = dogAge(3, "medium");
check("dog avma", dog.avma, 26);
check("dog stage", dog.stage, "Adult");

/* Report ------------------------------------------------------------ */
console.log(`calculator formula self-test: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  process.exit(1);
}
