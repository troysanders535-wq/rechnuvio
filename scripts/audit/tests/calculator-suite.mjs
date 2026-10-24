/**
 * Functional specs for the 62 tools of the calculator suite engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real input
 * fields, picks real options in the real <select> elements, presses the real
 * operation buttons and reads the rendered result cards.
 *
 * Expected values are established from the mathematical definition of each
 * quantity (the arithmetic is written out in the comment above each spec) and
 * never from running this site's own code.
 */

import {
  spec,
  fillInput,
  fillArea,
  fillNumber,
  selectOption,
  clickButton,
  assertEqual,
} from "../lib/test-helpers.mjs";

/**
 * The value of a rendered result card, found through its visible label.
 *
 * A result card renders its number and its label in two separate elements, so
 * the number cannot be matched on the page text alone. The card is read from
 * the rendered markup instead of by the visible label text, because some
 * panels use the same words for an input field and for a result card.
 */
async function card(page, label) {
  return page.evaluate((wanted) => {
    for (const el of Array.from(document.querySelectorAll("main div"))) {
      const spans = Array.from(el.children).filter((c) => c.tagName === "SPAN");
      if (spans.length < 2) continue;
      if (!spans[0].className.includes("text-2xl")) continue;
      if ((spans[1].textContent || "").trim() !== wanted) continue;
      return (spans[0].textContent || "").trim();
    }
    return null;
  }, label);
}

/** The value of a rendered detail row (<dt> label, <dd> value). */
async function detail(page, label) {
  return page.evaluate((wanted) => {
    const dts = Array.from(document.querySelectorAll("main dt"));
    const dt = dts.find((node) => (node.textContent || "").trim() === wanted);
    if (!dt || !dt.parentElement) return null;
    const dd = dt.parentElement.querySelector("dd");
    return dd ? (dd.textContent || "").trim() : null;
  }, label);
}

/** The rows of a rendered table, each as an array of cell texts. */
async function tableRows(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main table tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim()),
    ),
  );
}

export function register() {
  /* ------------------------------------------------------------ dates --- */

  spec("age-calculator", "gives the exact age and the days lived", async (page) => {
    // 1995-06-15 + 31 years = 2026-06-15, + 4 months = 2026-10-15, + 9 days.
    // The days in between: 31 x 365 + 8 leap days (1996..2024) = 11323, plus
    // 131 days from 2026-06-15 to 2026-10-24 = 11454.
    await fillInput(page, "1995-06-15", 0, "text");
    await fillInput(page, "2026-10-24", 1, "text");

    assertEqual(await card(page, "Age"), "31y 4m 9d", "exact age");
    assertEqual(await card(page, "Total days lived"), "11,454", "days lived");
    assertEqual(await card(page, "Next birthday"), "2027-06-15", "next birthday");
    assertEqual(await card(page, "Days to birthday"), "234", "days to the birthday");
    assertEqual(await card(page, "Day of birth"), "Thursday", "weekday of birth");
    assertEqual(await card(page, "Zodiac"), "Gemini", "zodiac sign");
  });

  spec("days-between-dates", "counts the days, weeks, months and years between two dates", async (page) => {
    // 2026 is not a leap year: 1 Jan to 31 Dec 2026 is 364 days = 52 weeks.
    await fillInput(page, "2026-01-01", 0, "text");
    await fillInput(page, "2026-12-31", 1, "text");

    assertEqual(await card(page, "Total days"), "364", "days between");
    assertEqual(await card(page, "Weeks"), "52", "weeks between");
    assertEqual(await card(page, "Months"), "11", "months between");
    assertEqual(await card(page, "Years"), "0", "years between");
  });

  spec("business-days-calculator", "skips the weekends of a whole year", async (page) => {
    // 2026 has 365 days and starts on a Thursday, so every weekday except
    // Thursday occurs 52 times and Thursday 53 times: 261 working days and
    // 104 weekend days.
    await fillInput(page, "2026-01-01", 0, "text");
    await fillInput(page, "2026-12-31", 1, "text");
    await selectOption(page, "none", 0);

    assertEqual(await card(page, "Business days"), "261", "business days");
    assertEqual(await card(page, "Weekend days"), "104", "weekend days");
    assertEqual(await card(page, "Holidays skipped"), "0", "holidays skipped");
    assertEqual(await card(page, "Total days"), "365", "total days");
  });

  spec("date-calculator", "shifts a date and measures the gap to another one", async (page) => {
    await fillInput(page, "2026-01-01", 0, "text");
    await fillInput(page, "2026-12-31", 1, "text");
    await fillInput(page, "30", 2, "text");
    await selectOption(page, "days", 0);
    await selectOption(page, "add", 1);

    assertEqual(await card(page, "Date after adding"), "2026-01-31", "date plus 30 days");
    assertEqual(await card(page, "Days between"), "364", "days between");
    assertEqual(await card(page, "Weeks between"), "52", "weeks between");
    assertEqual(await card(page, "Weekday of end date"), "Thursday", "weekday");
    assertEqual(await detail(page, "Months between"), "11", "months between");
    assertEqual(await detail(page, "Years between"), "0", "years between");
  });

  spec("dog-age-calculator", "converts dog years to human years", async (page) => {
    // AVMA: the first two dog years count as 10.5 human years each (21) and a
    // medium dog then ages 5 human years per dog year: 21 + 5 = 26.
    // Epigenetic (2021 study): 10 x log10(3) + 10 = 14.77 ~ 14.8.
    await fillInput(page, "3", 0, "text");
    await selectOption(page, "medium", 0);

    assertEqual(await card(page, "Human age (AVMA)"), "26 years", "AVMA human age");
    assertEqual(await card(page, "Human age (epigenetic)"), "14.8 years", "epigenetic age");
    assertEqual(await card(page, "Life stage"), "Adult", "life stage");
  });

  /* ---------------------------------------------------------- percent --- */

  spec("percentage-calculator", "works out a percentage, a part and a whole", async (page) => {
    // 20% of 200 = 40; 20 is 10% of 200; 20 is 200% of 10; if 200 is 20% of
    // the whole, the whole is 200 / 0.2 = 1000.
    await fillInput(page, "20", 0, "text");
    await fillInput(page, "200", 1, "text");
    await fillInput(page, "10", 2, "text");

    assertEqual(await card(page, "20% of 200"), "40", "percent of value");
    assertEqual(await card(page, "20 is what % of 200"), "10%", "what percent");
    assertEqual(await card(page, "20 is what % of 10"), "200%", "what percent of the third value");
    assertEqual(await card(page, "Whole from 20% of 200"), "1000", "whole from the part");
  });

  spec("percentage-change-calculator", "measures the change between an old and a new value", async (page) => {
    // (125 - 100) / 100 x 100 = 25%.
    await fillInput(page, "100", 0, "text");
    await fillInput(page, "125", 1, "text");

    assertEqual(await card(page, "Percentage change"), "25%", "percentage change");
    assertEqual(await card(page, "Direction"), "Increase", "direction");
    assertEqual(await card(page, "Difference"), "25", "difference");
    assertEqual(await detail(page, "Working"), "((125 − 100) ÷ |100|) × 100 = 25%", "working");
  });

  spec("percentage-increase-calculator", "finds the original value behind an increase", async (page) => {
    // 200 grew to 250, so the increase is (250 - 200) / 200 x 100 = 25% and
    // 250 / (1 + 0.25) = 200 is the original value.
    await fillInput(page, "200", 0, "text");
    await fillInput(page, "250", 1, "text");

    assertEqual(await card(page, "Percentage increase"), "25%", "percentage increase");
    assertEqual(await card(page, "Amount added"), "50", "amount added");
    assertEqual(await card(page, "Original from new"), "200", "original value behind the new one");
  });

  spec("percentage-decrease-calculator", "finds the value before a decrease", async (page) => {
    // 250 fell to 200, so the decrease is (250 - 200) / 250 x 100 = 20% and
    // 200 / (1 - 0.2) = 250 is the value before the decrease.
    await fillInput(page, "250", 0, "text");
    await fillInput(page, "200", 1, "text");

    assertEqual(await card(page, "Percentage decrease"), "20%", "percentage decrease");
    assertEqual(await card(page, "Amount removed"), "50", "amount removed");
    assertEqual(await card(page, "Value before the decrease"), "250", "value before the decrease");
  });

  spec("percentage-difference-calculator", "compares two values against their average", async (page) => {
    // |80 - 120| / ((80 + 120) / 2) x 100 = 40 / 100 x 100 = 40%.
    await fillInput(page, "80", 0, "text");
    await fillInput(page, "120", 1, "text");

    assertEqual(await card(page, "Percentage difference"), "40%", "percentage difference");
    assertEqual(await card(page, "Absolute difference"), "40", "absolute difference");
    assertEqual(await card(page, "Average of A and B"), "100", "average");
    assertEqual(await card(page, "Percentage change (A → B)"), "50%", "percentage change");
  });

  /* ------------------------------------------------------------ money --- */

  spec("discount-calculator", "applies a discount and a stacked discount", async (page) => {
    // 100 - 20% = 80; the extra 25% then gives 80 x 0.75 = 60.
    await fillInput(page, "100", 0, "text");
    await fillInput(page, "20", 1, "text");
    await fillInput(page, "25", 2, "text");

    assertEqual(await card(page, "Sale price"), "80", "sale price");
    assertEqual(await card(page, "You save"), "20", "savings");
    assertEqual(await card(page, "With stacked discount"), "60", "stacked discount");
  });

  spec("margin-calculator", "separates margin from markup", async (page) => {
    // margin = (100 - 60) / 100 = 40%; markup = (100 - 60) / 60 = 66.67%;
    // the price for a 20% margin is 60 / (1 - 0.2) = 75.
    assertEqual(await card(page, "Profit margin"), "40%", "profit margin");
    assertEqual(await card(page, "Markup"), "66.6667%", "markup");
    assertEqual(await card(page, "Profit"), "40", "profit");
    assertEqual(await card(page, "Price for target margin"), "75", "price for the target margin");
  });

  spec("markup-calculator", "turns a markup into a selling price", async (page) => {
    // 60 x (1 + 20/100) = 72; the markup of a 100 price is 66.67% and the
    // margin is 40%.
    assertEqual(await card(page, "Selling price"), "72", "selling price");
    assertEqual(await card(page, "Markup"), "66.6667%", "markup");
    assertEqual(await card(page, "Margin"), "40%", "margin");
    assertEqual(await card(page, "Profit"), "40", "profit");
  });

  spec("salary-to-hourly-calculator", "converts an annual salary to an hourly wage", async (page) => {
    // 52000 / (40 x 52) = 25 per hour; 25 x 40 = 1000 a week.
    await fillInput(page, "52000", 0, "text");
    await fillInput(page, "40", 1, "text");
    await fillInput(page, "52", 2, "text");

    assertEqual(await card(page, "Hourly wage"), "25", "hourly wage");
    assertEqual(await card(page, "Weekly"), "1000", "weekly pay");
    assertEqual(await card(page, "Bi-weekly"), "2000", "bi-weekly pay");
    assertEqual(await card(page, "Monthly"), "4333.33", "monthly pay");
  });

  spec("hourly-to-salary-calculator", "converts an hourly wage to a yearly salary", async (page) => {
    // 25 x 40 x 52 = 52000 a year.
    await fillInput(page, "25", 0, "text");
    await fillInput(page, "40", 1, "text");
    await fillInput(page, "52", 2, "text");

    assertEqual(await card(page, "Annual salary"), "52000", "annual salary");
    assertEqual(await card(page, "Weekly"), "1000", "weekly pay");
    assertEqual(await card(page, "Bi-weekly"), "2000", "bi-weekly pay");
    assertEqual(await card(page, "Daily (8 h)"), "200", "daily pay");
  });

  spec("overtime-calculator", "splits regular and overtime pay", async (page) => {
    // 10 hours at $25: 8 regular (200) and 2 hours of time-and-a-half (2 x 25
    // x 1.5 = 75), so the total is 275.
    await fillInput(page, "10", 0, "text");
    await fillInput(page, "25", 1, "text");
    await fillInput(page, "12", 3, "text");
    await fillInput(page, "1.5", 4, "text");

    assertEqual(await card(page, "Regular pay"), "200", "regular pay");
    assertEqual(await card(page, "Overtime pay"), "75", "overtime pay");
    assertEqual(await card(page, "Total pay"), "275", "total pay");
    assertEqual(await card(page, "Regular hours"), "8h", "regular hours");
    assertEqual(await detail(page, "Overtime hours"), "2 h", "overtime hours");
    assertEqual(await detail(page, "Double time hours"), "0 h", "double time hours");
  });

  spec("electricity-cost-calculator", "prices an appliance per day, month and year", async (page) => {
    // 2000 W = 2 kW; 2 kW x 6 h x $0.15 = $1.80 a day, x 30 = $54 a month and
    // x 365 = $657 a year; the appliance burns 2 x 6 x 365 = 4380 kWh.
    await fillInput(page, "2000", 0, "text");
    await fillInput(page, "6", 1, "text");
    await fillInput(page, "0.15", 2, "text");

    assertEqual(await card(page, "Cost per day"), "1.8", "cost per day");
    assertEqual(await card(page, "Cost per month"), "54", "cost per month");
    assertEqual(await card(page, "Cost per year"), "657", "cost per year");
    assertEqual(await card(page, "Yearly energy (kWh)"), "4380", "yearly energy");
  });

  /* ------------------------------------------------------------ grades --- */

  spec("gpa-calculator", "adds up the grade points of the courses", async (page) => {
    // A 4cr = 16.0, A 4cr = 16.0, A- 3cr = 11.1, A 3cr = 12.0 -> 55.1 points
    // over 14 credits = 3.9357 -> 3.936.
    await selectOption(page, "A", 1);
    assertEqual(await card(page, "Semester GPA"), "3.936", "semester GPA");
    assertEqual(await card(page, "Total credits"), "14", "total credits");
    assertEqual(await card(page, "Quality points"), "55.1", "quality points");
  });

  spec("college-gpa-calculator", "adds up the grade points of the courses", async (page) => {
    // A 4cr = 16.0, B+ 4cr = 13.2, A 3cr = 12.0, A 3cr = 12.0 -> 53.2 points
    // over 14 credits = 3.8.
    await selectOption(page, "A", 2);
    assertEqual(await card(page, "Semester GPA"), "3.8", "semester GPA");
    assertEqual(await card(page, "Total credits"), "14", "total credits");
    assertEqual(await card(page, "Quality points"), "53.2", "quality points");
  });

  spec("high-school-gpa-calculator", "adds the honours weighting to the grade points", async (page) => {
    // The first course becomes an AP class: (4.0 + 1.0) x 4 = 20.0, then
    // 13.2 + 11.1 + 12.0 -> 56.3 points over 14 credits = 4.0214 -> 4.021.
    await selectOption(page, "1", 0);
    assertEqual(await card(page, "Unweighted GPA"), "3.736", "unweighted GPA");
    assertEqual(await card(page, "Weighted GPA"), "4.021", "weighted GPA");
    assertEqual(await card(page, "Weighted bonus"), "0.286", "weighted bonus");
    assertEqual(await card(page, "Credits"), "14", "credits");
  });

  spec("weighted-gpa-calculator", "adds the honours weighting to the grade points", async (page) => {
    // The first course becomes an honours class: (4.0 + 0.5) x 4 = 18.0, then
    // 13.2 + 11.1 + 12.0 -> 54.3 points over 14 credits = 3.8786 -> 3.879.
    await selectOption(page, "0.5", 0);
    assertEqual(await card(page, "Unweighted GPA"), "3.736", "unweighted GPA");
    assertEqual(await card(page, "Weighted GPA"), "3.879", "weighted GPA");
    assertEqual(await card(page, "Weighted bonus"), "0.143", "weighted bonus");
  });

  spec("middle-school-gpa-calculator", "averages the letter grades of the report card", async (page) => {
    // A = 4.0, B+ = 3.3, A- = 3.7, A = 4.0 -> 15.0 points over the four
    // subjects = 3.75. Credit hours are not part of a middle school GPA.
    assertEqual(await card(page, "GPA (4.0 scale)"), "3.75", "GPA on the 4.0 scale");
    assertEqual(await card(page, "Letter grade"), "A", "letter grade");
    assertEqual(await card(page, "Subjects"), "4", "number of subjects");
  });

  spec("cumulative-gpa-calculator", "combines the old GPA with the new semester", async (page) => {
    // The semester is 52.3 / 14 = 3.7357 points; cumulative =
    // (3.2 x 45 + 3.7357 x 14) / 59 = 196.3 / 59 = 3.3271 -> 3.327. The GPA
    // needed next term is (3.8 x 59 - 3.2 x 45) / 14 = 80.2 / 14 = 5.7286.
    assertEqual(await card(page, "New semester GPA"), "3.736", "semester GPA");
    assertEqual(await card(page, "Cumulative GPA"), "3.327", "cumulative GPA");
    assertEqual(await card(page, "GPA needed next term"), "5.729", "GPA needed next term");
    assertEqual(await card(page, "Total credits"), "59", "total credits");
  });

  spec("raise-gpa-calculator", "says what next term has to look like", async (page) => {
    // (3.8 x 60 - 3.2 x 45) / 15 = 84 / 15 = 5.6; 84 points at 4.0 a credit
    // are 21 credits of A's; the best reachable average is
    // (3.2 x 45 + 4 x 15) / 60 = 204 / 60 = 3.4.
    assertEqual(await card(page, "GPA needed next term"), "5.6", "GPA needed next term");
    assertEqual(await card(page, "Credits of A's needed"), "21", "credits of A's needed");
    assertEqual(await card(page, "Highest reachable GPA"), "3.4", "highest reachable GPA");
  });

  spec("grade-calculator", "weighs the categories into a class grade", async (page) => {
    // Homework 20% at 90, midterm 30% at 80 and the final 50% at 90:
    // (90 x 20 + 80 x 30 + 90 x 50) / 100 = (1800 + 2400 + 4500) / 100 = 87,
    // which is a B+ on the site's scale (87 starts B+).
    await fillNumber(page, 90, 1);
    await fillNumber(page, 80, 3);
    await fillNumber(page, 90, 5);

    assertEqual(await card(page, "Class grade"), "87%", "class grade");
    assertEqual(await card(page, "Letter grade"), "B+", "letter grade");
    assertEqual(await card(page, "Total weight"), "100%", "total weight");
  });

  spec("weighted-grade-calculator", "weighs the categories into a weighted grade", async (page) => {
    // Homework 20% at 90, midterm 30% at 80 and the final 50% at 70:
    // (90 x 20 + 80 x 30 + 70 x 50) / 100 = (1800 + 2400 + 3500) / 100 = 77,
    // which is a C+.
    await fillNumber(page, 90, 1);
    await fillNumber(page, 80, 3);
    await fillNumber(page, 70, 5);

    assertEqual(await card(page, "Weighted grade"), "77%", "weighted grade");
    assertEqual(await card(page, "Letter grade"), "C+", "letter grade");
    assertEqual(await card(page, "Total weight"), "100%", "total weight");
    assertEqual(await card(page, "Points earned"), "77", "points earned");
  });

  spec("final-grade-calculator", "says the score the final exam needs", async (page) => {
    // (90 - 82 x (1 - 0.3)) / 0.3 = (90 - 57.4) / 0.3 = 108.67.
    await fillInput(page, "82", 0, "text");
    await fillInput(page, "30", 1, "text");
    await fillInput(page, "90", 2, "text");

    assertEqual(await card(page, "Score needed on the final"), "108.67%", "score needed");
    assertEqual(await card(page, "For a B"), "75.33%", "score needed for a B");
    assertEqual(await card(page, "For a C"), "42%", "score needed for a C");
  });

  spec("test-grade-calculator", "turns the correct answers into a percentage", async (page) => {
    // 18 of 20 = 90%, which is an A- on the site's scale.
    assertEqual(await card(page, "Score"), "90%", "score");
    assertEqual(await card(page, "Letter grade"), "A-", "letter grade");
    assertEqual(await card(page, "Wrong answers"), "2", "wrong answers");
    assertEqual(await card(page, "Questions"), "20", "questions");
  });

  spec("easy-grader", "prints the chart of every possible score", async (page) => {
    // 8 of 10 = 80% -> B-; every question is worth 10 points.
    await fillInput(page, "10", 0, "text");
    await fillInput(page, "8", 1, "text");

    assertEqual(await card(page, "Current score"), "80%", "current score");
    assertEqual(await card(page, "Letter grade"), "B-", "letter grade");
    assertEqual(await card(page, "Points per question"), "10%", "points per question");

    const chart = await tableRows(page);
    assertEqual(chart[0].join(" | "), "0 | 100 | A+", "row for no wrong answer");
    assertEqual(chart[2].join(" | "), "2 | 80 | B-", "row for two wrong answers");
  });

  /* ------------------------------------------------------------- stats --- */

  spec("average-calculator", "summarises a list of numbers", async (page) => {
    // 2+4+4+4+5+5+7+9 = 40 over 8 numbers = 5; the median is (4+5)/2 = 4.5;
    // 4 occurs three times; the range is 9 - 2 = 7. The squared deviations
    // from the mean are 9+1+1+1+0+0+4+16 = 32, so the population variance
    // is 32/8 = 4 (SD 2) and the sample variance is 32/7 = 4.5714
    // (SD 2.1381).
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Mean (average)"), "5", "mean");
    assertEqual(await card(page, "Median"), "4.5", "median");
    assertEqual(await card(page, "Mode"), "4", "mode");
    assertEqual(await card(page, "Range"), "7", "range");
    assertEqual(await card(page, "Count"), "8", "count");
    assertEqual(await card(page, "Sample SD"), "2.1381", "sample standard deviation");
    assertEqual(await card(page, "Population SD"), "2", "population standard deviation");
    assertEqual(await card(page, "Minimum"), "2", "minimum");
  });

  spec("standard-deviation-calculator", "reports the sample spread of a list", async (page) => {
    // Sum of squared deviations 32, n = 8: sample variance 32/7 = 4.5714 and
    // sample SD = sqrt(4.5714) = 2.1381.
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Sample SD (s)"), "2.1381", "sample SD");
    assertEqual(await card(page, "Sample variance (s²)"), "4.5714", "sample variance");
    assertEqual(await card(page, "Mean"), "5", "mean");
    assertEqual(await card(page, "Count (n)"), "8", "count");
  });

  spec("sample-standard-deviation-calculator", "reports the sample spread of a list", async (page) => {
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Sample SD (s)"), "2.1381", "sample SD");
    assertEqual(await card(page, "Sample variance (s²)"), "4.5714", "sample variance");
    assertEqual(await card(page, "Mean"), "5", "mean");
    assertEqual(await card(page, "Count (n)"), "8", "count");
  });

  spec("population-standard-deviation-calculator", "reports the population spread of a list", async (page) => {
    // Sum of squared deviations 32, N = 8: variance 32/8 = 4, SD 2.
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Population SD (σ)"), "2", "population SD");
    assertEqual(await card(page, "Population variance (σ²)"), "4", "population variance");
    assertEqual(await card(page, "Mean"), "5", "mean");
    assertEqual(await card(page, "Count (n)"), "8", "count");
  });

  spec("variance-calculator", "reports both variances and the sum of squares", async (page) => {
    // Sum of squared deviations 32; 32/7 = 4.5714 and 32/8 = 4.
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Sample variance (s²)"), "4.5714", "sample variance");
    assertEqual(await card(page, "Population variance (σ²)"), "4", "population variance");
    assertEqual(await card(page, "Sample SD"), "2.1381", "sample SD");
    assertEqual(await detail(page, "Sum of squared deviations (÷ n − 1)"), "32", "sum of squares");
    assertEqual(await detail(page, "Sum of squared deviations (÷ n)"), "32", "sum of squares");
    assertEqual(await detail(page, "Count (n)"), "8", "count");
  });

  spec("mean-absolute-deviation-calculator", "averages the distance from the mean", async (page) => {
    // Mean 5; the absolute deviations are 3,1,1,1,0,0,2,4 = 12; 12/8 = 1.5.
    await fillArea(page, "2, 4, 4, 4, 5, 5, 7, 9");

    assertEqual(await card(page, "Mean"), "5", "mean");
    assertEqual(await card(page, "Mean absolute deviation"), "1.5", "mean absolute deviation");
    assertEqual(await card(page, "Count (n)"), "8", "count");
    assertEqual(await card(page, "Sum of deviations"), "12", "sum of deviations");

    const table = await tableRows(page);
    assertEqual(table[0].join(" | "), "2 | 5 | 3", "deviation of the first value");
  });

  spec("quartile-calculator", "finds the quartiles and the interquartile range", async (page) => {
    // Tukey hinges on 1..10: the lower half is 1..5 so Q1 = 3, the upper half
    // is 6..10 so Q3 = 8, the median is (5+6)/2 = 5.5 and the IQR is 5.
    await fillArea(page, "1, 2, 3, 4, 5, 6, 7, 8, 9, 10");

    assertEqual(await card(page, "Q1 (25%)"), "3", "first quartile");
    assertEqual(await card(page, "Median"), "5.5", "median");
    assertEqual(await card(page, "Q3 (75%)"), "8", "third quartile");
    assertEqual(await card(page, "IQR (Q3 − Q1)"), "5", "interquartile range");
    assertEqual(await card(page, "Minimum"), "1", "minimum");
    assertEqual(await card(page, "Maximum"), "10", "maximum");
    assertEqual(await card(page, "Outliers"), "none", "outliers");
    assertEqual(await card(page, "Count (n)"), "10", "count");
  });

  spec("z-score-calculator", "measures how far a value sits from the mean", async (page) => {
    // z = (85 - 70) / 10 = 1.5; the standard normal CDF at 1.5 is 0.933193,
    // so the value is at the 93.32nd percentile.
    await fillInput(page, "85", 0, "text");
    await fillInput(page, "70", 1, "text");
    await fillInput(page, "10", 2, "text");

    assertEqual(await card(page, "Z-score"), "1.5", "z-score");
    assertEqual(await card(page, "Percentile"), "93.32%", "percentile");
    assertEqual(await card(page, "Below the mean by"), "-15", "distance from the mean");
    assertEqual(await card(page, "Normal probability"), "0.933193", "normal probability");
  });

  /* --------------------------------------------------------- fractions --- */

  spec("fraction-calculator", "adds two fractions", async (page) => {
    // 3/4 + 5/6 = (3 x 6 + 5 x 4) / 24 = 38/24 = 19/12 = 1 7/12 = 1.583333.
    assertEqual(await card(page, "Answer"), "19/12", "answer");
    assertEqual(await card(page, "Mixed number"), "1 7/12", "mixed number");
    assertEqual(await card(page, "Decimal"), "1.583333", "decimal");
    assertEqual(await card(page, "Percent"), "158.3333%", "percent");
  });

  spec("mixed-number-calculator", "adds two mixed numbers", async (page) => {
    // 2 3/4 = 11/4 and 1 5/6 = 11/6; 11/4 + 11/6 = 33/12 + 22/12 = 55/12.
    assertEqual(await card(page, "Answer"), "55/12", "answer");
    assertEqual(await card(page, "Mixed number"), "4 7/12", "mixed number");
    assertEqual(await card(page, "Decimal"), "4.583333", "decimal");
    assertEqual(await card(page, "A as improper"), "11/4", "first number as an improper fraction");
  });

  spec("simplify-fractions-calculator", "reduces a mixed number to lowest terms", async (page) => {
    // 2 3/4 = (2 x 4 + 3) / 4 = 11/4, which is already in lowest terms.
    assertEqual(await card(page, "In lowest terms"), "11/4", "fraction in lowest terms");
    assertEqual(await card(page, "As a mixed number"), "2 3/4", "mixed number");
    assertEqual(await card(page, "Decimal"), "2.75", "decimal");
    assertEqual(await card(page, "Greatest common factor"), "1", "greatest common factor");
  });

  spec("fraction-to-decimal-calculator", "divides the numerator by the denominator", async (page) => {
    // 5/8 = 0.625, which is a terminating decimal, and 0.625 - 0.5 = 0.125.
    await fillInput(page, "5", 0, "text");
    await fillInput(page, "8", 1, "text");

    assertEqual(await card(page, "Decimal"), "0.625", "decimal");
    assertEqual(await card(page, "Percent"), "62.5%", "percent");
    assertEqual(await card(page, "Mixed number"), "0 5/8", "mixed number");
    assertEqual(await card(page, "Repeating?"), "No", "repeating or not");
    assertEqual(await detail(page, "Repeating period"), "terminating decimal", "repeating period");
    assertEqual(await detail(page, "Difference"), "0.125", "difference to the compared decimal");
  });

  spec("decimal-to-fraction-calculator", "turns a decimal into a fraction", async (page) => {
    // 0.125 = 125/1000 = 1/8.
    await fillInput(page, "0.125", 0, "text");

    assertEqual(await card(page, "Fraction"), "1/8", "fraction");
    assertEqual(await card(page, "Mixed number"), "0 1/8", "mixed number");
    assertEqual(await card(page, "Percent"), "12.5%", "percent");
    assertEqual(await card(page, "GCD"), "1", "greatest common divisor");
  });

  spec("common-denominator-calculator", "rewrites fractions over a common denominator", async (page) => {
    // The three fractions are 1/6, 2/6 = 1/3 and 3/6 = 1/2, so the least
    // common denominator is 6 and the rewritten fractions are 1/6, 2/6, 3/6.
    await fillInput(page, "1", 0, "text");
    await fillInput(page, "6", 1, "text");
    await fillInput(page, "3", 2, "text");

    assertEqual(await card(page, "Least common denominator"), "6", "least common denominator");
    assertEqual(await card(page, "Fractions"), "3", "number of fractions");
    assertEqual(await card(page, "LCM of denominators"), "6", "lcm of the denominators");
    assertEqual(await card(page, "Smallest value"), "0.1667", "smallest value");

    const table = await tableRows(page);
    assertEqual(table[0].join(" | "), "1/6 | 1/6 | 0.1667", "first fraction");
    assertEqual(table[2].join(" | "), "1/2 | 3/6 | 0.5", "third fraction");
  });

  /* ------------------------------------------------------ number bases --- */

  spec("binary-calculator", "multiplies two binary numbers", async (page) => {
    // 1010 = 10 and 1100 = 12, so the product is 120 = 1111000 = 0x78 = 170
    // octal.
    await clickButton(page, "Multiply");
    assertEqual(await card(page, "Binary"), "1111000", "binary result");
    assertEqual(await card(page, "Decimal"), "120", "decimal result");
    assertEqual(await card(page, "Hexadecimal"), "78", "hexadecimal result");
    assertEqual(await card(page, "Octal"), "170", "octal result");
    assertEqual(await detail(page, "First in decimal"), "10", "first number in decimal");
    assertEqual(await detail(page, "Second in decimal"), "12", "second number in decimal");
  });

  spec("hex-calculator", "subtracts two hexadecimal numbers", async (page) => {
    // 0x1010 = 4112 and 0x1100 = 4352, so the difference is -240 = -0xF0 =
    // -11110000 binary = -360 octal.
    await clickButton(page, "Subtract");
    assertEqual(await card(page, "Binary"), "-11110000", "binary result");
    assertEqual(await card(page, "Decimal"), "-240", "decimal result");
    assertEqual(await card(page, "Hexadecimal"), "-F0", "hexadecimal result");
    assertEqual(await card(page, "Octal"), "-360", "octal result");
    assertEqual(await detail(page, "First in decimal"), "4112", "first number in decimal");
    assertEqual(await detail(page, "Second in decimal"), "4352", "second number in decimal");
  });

  spec("roman-numeral-converter", "writes a number in Roman numerals and back", async (page) => {
    // 1994 = 1000 + 900 + 90 + 4 = M + CM + XC + IV.
    await fillInput(page, "1994", 0, "text");
    await fillInput(page, "MCMXCIV", 1, "text");

    assertEqual(await card(page, "Roman numeral"), "MCMXCIV", "Roman numeral");
    assertEqual(await card(page, "Back to a number"), "1994", "number behind the numeral");
    assertEqual(await card(page, "Breakdown"), "M + CM + XC + IV", "breakdown");
    assertEqual(await card(page, "Valid input"), "Yes", "valid numeral");
  });

  spec("roman-numeral-date-converter", "writes a date in Roman numerals", async (page) => {
    // 2026-10-23 in US order is month 10 = X, day 23 = XXIII, year 2026 = MMXXVI.
    assertEqual(await card(page, "Roman numeral date"), "X.XXIII.MMXXVI", "Roman numeral date");
    assertEqual(await card(page, "Day"), "XXIII", "day");
    assertEqual(await card(page, "Month"), "X", "month");
    assertEqual(await card(page, "Year"), "MMXXVI", "year");

    await selectOption(page, "ISO", 0);
    await selectOption(page, "-", 1);
    assertEqual(await card(page, "Roman numeral date"), "MMXXVI-X-XXIII", "Roman numeral date in ISO order");
  });

  /* -------------------------------------------------------------- time --- */

  spec("hours-calculator", "measures the hours between two clock times", async (page) => {
    // 09:00 to 17:30 is 510 minutes, minus a 30 minute break = 480 minutes
    // = 8 hours; at $22 an hour that is $176.
    assertEqual(await card(page, "Total time"), "8:00", "total time");
    assertEqual(await card(page, "Decimal hours"), "8", "decimal hours");
    assertEqual(await card(page, "Hours"), "8", "hours");
    assertEqual(await card(page, "Minutes"), "0", "minutes");
    assertEqual(await detail(page, "Pay at rate"), "176", "pay at the hourly rate");
    assertEqual(await detail(page, "Raw difference"), "510 minutes", "raw difference");

    // A shift from 22:00 to 06:00 runs over midnight and is 480 minutes long.
    await fillInput(page, "22:00", 0, "text");
    await fillInput(page, "06:00", 1, "text");
    await fillInput(page, "0", 2, "text");
    assertEqual(await card(page, "Total time"), "8:00", "total time of the overnight shift");
    assertEqual(await detail(page, "Overnight shift"), "Yes", "overnight shift");
  });

  spec("time-calculator", "totals a list of times and shifts a clock time", async (page) => {
    // 00:45 + 00:45 + 00:30 = 120 minutes = 2:00; 09:00 + 1:00 = 10:00.
    await fillInput(page, "00:45, 00:45, 00:30", 0, "text");
    await fillInput(page, "1", 1, "text");
    await fillInput(page, "0", 2, "text");

    assertEqual(await card(page, "Total of the list"), "2:00", "total of the list");
    assertEqual(await card(page, "Decimal hours"), "2", "decimal hours");
    assertEqual(await card(page, "Start + duration"), "10:00", "start plus duration");
    assertEqual(await card(page, "Start − duration"), "08:00", "start minus duration");
  });

  spec("time-card-calculator", "totals the shifts and the overtime pay", async (page) => {
    // Two shifts of 9 hours: 8 regular hours and 1 overtime hour each, so
    // 16 regular hours (16 x 22 = 352) and 2 overtime hours
    // (2 x 22 x 1.5 = 66), total 418.
    await fillInput(page, "09:00-18:00, 09:00-18:00", 0, "text");
    await fillInput(page, "22", 1, "text");
    await fillInput(page, "8", 2, "text");

    assertEqual(await card(page, "Total hours"), "18h", "total hours");
    assertEqual(await card(page, "Overtime hours"), "2h", "overtime hours");
    assertEqual(await card(page, "Regular pay"), "352", "regular pay");
    assertEqual(await card(page, "Total pay"), "418", "total pay");
  });

  spec("military-time-converter", "converts military time to standard time", async (page) => {
    // 1730 is 17:30, which is 5:30 PM.
    assertEqual(await card(page, "1730 in standard time"), "5:30 PM", "standard time");
    assertEqual(await card(page, "5:30 PM in military time"), "1730", "military time");
    assertEqual(await card(page, "Spoken"), "5 30 PM in the afternoon", "spoken form");

    const table = await tableRows(page);
    assertEqual(table[3].join(" | "), "1730 | 5:30 PM", "reference row");
  });

  /* ------------------------------------------------------------ ratio --- */

  spec("ratio-calculator", "simplifies, solves and splits a ratio", async (page) => {
    // 24 : 36 = 2 : 3 (common factor 12); ? = (36 x 8) / 24 = 12; 500 is
    // split into 500 x 24/60 = 200 and 500 x 36/60 = 300.
    assertEqual(await card(page, "Simplified ratio"), "2 : 3", "simplified ratio");
    assertEqual(await card(page, "Common factor"), "12", "common factor");
    assertEqual(await card(page, "Solve A:B = C:?"), "12", "solved value");
    assertEqual(await card(page, "Ratio as decimal"), "0.666667", "ratio as a decimal");
    assertEqual(await card(page, "24 part"), "200", "first part of the split");
    assertEqual(await card(page, "36 part"), "300", "second part of the split");
  });

  /* -------------------------------------------------------- construction --- */

  spec("square-footage-calculator", "measures a room in every unit", async (page) => {
    // 30 x 20 = 600 sq ft per shape, two shapes = 1200 sq ft;
    // 1200 x 0.092903 = 111.48 m2; 1200 / 43560 = 0.0275 acres;
    // 1200 / 9 = 133.33 sq yd.
    await fillInput(page, "30", 0, "text");
    await fillInput(page, "20", 1, "text");
    await fillInput(page, "2", 2, "text");

    assertEqual(await card(page, "Total area"), "1200sq ft", "total area");
    assertEqual(await card(page, "Square metres"), "111.48m²", "square metres");
    assertEqual(await card(page, "Acres"), "0.0275", "acres");
    assertEqual(await card(page, "Square yards"), "133.33yd²", "square yards");
  });

  spec("concrete-calculator", "works out the volume of a slab and the bags", async (page) => {
    // 20 x 16 x (4/12) x 1.1 = 117.33 ft3 = 4.35 yd3 = 3.32 m3;
    // a 40 lb bag yields 0.3 ft3, so ceil(117.33/0.3) = 392 bags.
    assertEqual(await card(page, "Cubic yards"), "4.35", "cubic yards");
    assertEqual(await card(page, "Cubic feet"), "117.33", "cubic feet");
    assertEqual(await card(page, "Cubic metres"), "3.32", "cubic metres");
    assertEqual(await card(page, "Cost at $150/yd³"), "651.85", "cost");
    assertEqual(await card(page, "40 lb bags"), "392", "40 lb bags");
    assertEqual(await card(page, "80 lb bags"), "196", "80 lb bags");
  });

  spec("gravel-calculator", "turns an area and a depth into tons of gravel", async (page) => {
    // 400 sq ft x (3/12) = 100 ft3 = 3.7037 yd3; at 1.4 tons per yd3 that is
    // 5.19 tons = 4.7 metric tons, and 5.185 x $150 = $777.78.
    await fillInput(page, "400", 0, "text");
    await fillInput(page, "3", 1, "text");
    await fillInput(page, "1.4", 2, "text");
    await fillInput(page, "0", 3, "text");

    assertEqual(await card(page, "Tons"), "5.19", "tons");
    assertEqual(await card(page, "Metric tons"), "4.7", "metric tons");
    assertEqual(await card(page, "Cubic yards"), "3.7", "cubic yards");
    assertEqual(await card(page, "Cubic feet"), "100", "cubic feet");
    assertEqual(await detail(page, "Cost at $150/ton"), "777.78", "cost");
  });

  spec("mulch-calculator", "turns an area and a depth into bags of mulch", async (page) => {
    // 400 sq ft x (3/12) = 100 ft3 = 3.7 yd3; a 1.5 cu ft bag needs
    // ceil(100/1.5) = 67 bags, a 2 cu ft bag 50 and a 3 cu ft bag 34.
    await fillInput(page, "400", 0, "text");
    await fillInput(page, "3", 1, "text");
    await fillInput(page, "0", 2, "text");

    assertEqual(await card(page, "Cubic yards"), "3.7", "cubic yards");
    assertEqual(await card(page, "Cubic feet"), "100", "cubic feet");
    assertEqual(await card(page, "1.5 cu ft bags"), "67", "1.5 cu ft bags");
    assertEqual(await card(page, "2 cu ft bags"), "50", "2 cu ft bags");
    assertEqual(await card(page, "3 cu ft bags"), "34", "3 cu ft bags");
    assertEqual(await card(page, "Cost at $150/yd³"), "555.56", "cost");
  });

  spec("tile-calculator", "counts the tiles and the boxes a floor needs", async (page) => {
    // One 18 x 18 in tile with a 0.25 in grout joint covers
    // (18.25 x 18.25) / 144 = 2.3129 sq ft; 200 / 2.3129 x 1.05 = 90.8, so
    // 91 tiles, which need ceil(91/5) = 19 boxes.
    await fillInput(page, "200", 0, "text");
    await fillInput(page, "18", 1, "text");
    await fillInput(page, "18", 2, "text");
    await fillInput(page, "0.25", 3, "text");
    await fillInput(page, "5", 4, "text");
    await fillInput(page, "100", 5, "text");

    assertEqual(await card(page, "Tiles needed"), "91", "tiles needed");
    assertEqual(await card(page, "Boxes needed"), "19", "boxes needed");
    assertEqual(await card(page, "Floor area"), "200sq ft", "floor area");
    assertEqual(await card(page, "Material cost"), "20000", "material cost");
  });

  spec("paint-calculator", "works out the paint a room needs", async (page) => {
    // The perimeter is 2 x (12 + 10) = 44 ft and the walls are 44 x 8 = 352
    // sq ft; minus 21 sq ft of doors and 15 sq ft of windows = 316 sq ft.
    // At 350 sq ft a gallon and two coats: 316 / 350 x 2 = 1.81 gallons.
    await fillInput(page, "12", 0, "text");
    await fillInput(page, "10", 1, "text");
    await fillInput(page, "8", 2, "text");
    await fillInput(page, "21", 3, "text");
    await fillInput(page, "15", 4, "text");
    await fillInput(page, "350", 5, "text");
    await fillInput(page, "2", 6, "text");

    assertEqual(await card(page, "Wall area"), "316sq ft", "wall area");
    assertEqual(await card(page, "Gallons"), "1.81", "gallons");
    assertEqual(await card(page, "Quarts"), "7.2", "quarts");
    assertEqual(await card(page, "Litres"), "6.8", "litres");
  });

  spec("roofing-calculator", "works out the roof area, squares and bundles", async (page) => {
    // A 6 in 12 pitch gives the multiplier sqrt(1 + 0.25) = 1.1180; the
    // 6 in overhang adds (1000/12) x 6 x 0.5 = 250 sq ft; with 15% waste the
    // roof area is (1000 + 250) x 1.1180 x 1.15 = 1818.31 sq ft = 18.18
    // squares, which need ceil(18.18/3) = 7 bundles.
    await fillInput(page, "1000", 0, "text");
    await fillInput(page, "4", 1, "text");
    await fillInput(page, "12", 2, "text");
    await fillInput(page, "15", 3, "text");

    assertEqual(await card(page, "Roof area"), "1818.31sq ft", "roof area");
    assertEqual(await card(page, "Roofing squares"), "18.18", "roofing squares");
    assertEqual(await card(page, "Bundles needed"), "7", "bundles needed");
    assertEqual(await card(page, "Pitch multiplier"), "1.0541", "pitch multiplier");
    assertEqual(await card(page, "Underlayment (sq ft)"), "2000.14", "underlayment");
    assertEqual(await card(page, "Cost at $150/square"), "2727.46", "cost");
  });

  spec("btu-calculator", "sizes the air conditioning a room needs", async (page) => {
    // 320 sq ft x 30 BTU = 9600, medium sun adds 5 BTU per sq ft (1600) and
    // two occupants add 2 x 300 = 600, so 11800 BTU, which is one ton.
    assertEqual(await card(page, "BTU needed"), "11,800", "BTU needed");
    assertEqual(await card(page, "Recommended AC"), "12,000 BTU (1 ton)", "recommended AC");
    assertEqual(await card(page, "Tons"), "1", "tons");
    assertEqual(await card(page, "Room size"), "320sq ft", "room size");
  });

  /* ----------------------------------------------------------- fitness --- */

  spec("one-rep-max-calculator", "estimates the one rep maximum", async (page) => {
    // Epley: 100 x (1 + 5/30) = 116.67; Brzycki: 100 x 36 / 32 = 112.5;
    // Lombardi: 100 x 5^0.1 = 117.46.
    assertEqual(await card(page, "Your estimated 1RM"), "116.67", "estimated 1RM");
    assertEqual(await card(page, "Epley"), "116.67", "Epley");
    assertEqual(await card(page, "Brzycki"), "112.5", "Brzycki");
    assertEqual(await card(page, "Lombardi"), "117.46", "Lombardi");

    // The chart has to agree with itself: the weight of a row must be the
    // stated percentage of the estimated one rep maximum.
    const oneRm = Number(await card(page, "Your estimated 1RM"));
    const chart = await tableRows(page);
    for (const [reps, percent, weight] of chart) {
      const p = Number(String(percent).replace("%", ""));
      const w = Number(weight);
      assertEqual(
        Math.abs(w - (oneRm * p) / 100) < 1.5,
        true,
        `the row for ${reps} reps lists ${percent} but a weight of ${weight}, which is not ${p}% of the ${oneRm} 1RM`,
      );
    }
  });

  spec("water-intake-calculator", "works out the daily water intake", async (page) => {
    // 90 kg x 33 ml = 2.97 L, 60 minutes of exercise add (60/30) x 0.35 =
    // 0.7 L and hot weather adds 0.5 L, so 4.17 L rounded to 4.2 L.
    await fillInput(page, "90", 0, "text");
    await fillInput(page, "60", 1, "text");
    await selectOption(page, "hot", 1);

    assertEqual(await card(page, "Water per day"), "4.2L", "water per day");
    assertEqual(await card(page, "Fluid ounces"), "142oz", "fluid ounces");
    assertEqual(await card(page, "Cups (8 oz)"), "17.8", "cups");
    assertEqual(await card(page, "Bottles (16.9 oz)"), "8.4", "bottles");
    assertEqual(await detail(page, "Base (33 ml per kg)"), "2.97 L", "base amount");
    assertEqual(await detail(page, "Exercise top-up"), "0.7 L", "exercise top-up");
  });
}
