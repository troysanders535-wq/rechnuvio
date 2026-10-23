/**
 * Exact slug → calculator variant map.
 *
 * The previous setup matched calculators with `slug.includes(...)` inside a
 * handful of shared engines, so tools such as the Z-Score calculator rendered
 * a percentage suite and the percentage-difference calculator rendered a JSON
 * diff tool. Every calculator now owns a variant and is matched by its exact
 * slug, so a tool can never fall through to an unrelated workspace.
 *
 * Keep this map exhaustive: `CalculatorSuiteEngine` renders an explicit
 * "not wired up" state for a slug that is missing here.
 */

export type CalculatorVariant =
  // Percentage family
  | "percent"
  | "percent-change"
  | "percent-increase"
  | "percent-decrease"
  | "percent-difference"
  // Money family
  | "discount"
  | "margin"
  | "markup"
  | "salary-hourly"
  | "hourly-salary"
  | "overtime"
  | "electricity-cost"
  // Grades family
  | "gpa"
  | "college-gpa"
  | "high-school-gpa"
  | "middle-school-gpa"
  | "weighted-gpa"
  | "cumulative-gpa"
  | "raise-gpa"
  | "grade"
  | "weighted-grade"
  | "final-grade"
  | "test-grade"
  | "easy-grader"
  // Statistics family
  | "average"
  | "std-dev"
  | "sample-std-dev"
  | "population-std-dev"
  | "variance"
  | "mad"
  | "z-score"
  | "quartile"
  // Fractions family
  | "fraction"
  | "simplify-fraction"
  | "mixed-number"
  | "common-denominator"
  | "decimal-to-fraction"
  | "fraction-to-decimal"
  // Ratios
  | "ratio"
  // Dates
  | "age"
  | "dog-age"
  | "date"
  | "days-between"
  | "business-days"
  // Time
  | "hours"
  | "time"
  | "time-card"
  | "military-time"
  // Number bases
  | "binary"
  | "hex"
  | "roman"
  | "roman-date"
  // Construction
  | "square-footage"
  | "concrete"
  | "gravel"
  | "mulch"
  | "tile"
  | "paint"
  | "roofing"
  | "btu"
  // Fitness
  | "one-rep-max"
  | "water-intake";

export const CALCULATOR_VARIANTS: Record<string, CalculatorVariant> = {
  // --- Percentage ---------------------------------------------------------
  "percentage-calculator": "percent",
  "percentage-change-calculator": "percent-change",
  "percentage-increase-calculator": "percent-increase",
  "percentage-decrease-calculator": "percent-decrease",
  "percentage-difference-calculator": "percent-difference",

  // --- Money --------------------------------------------------------------
  "discount-calculator": "discount",
  "margin-calculator": "margin",
  "markup-calculator": "markup",
  "salary-to-hourly-calculator": "salary-hourly",
  "hourly-to-salary-calculator": "hourly-salary",
  "overtime-calculator": "overtime",
  "electricity-cost-calculator": "electricity-cost",

  // --- Grades -------------------------------------------------------------
  "gpa-calculator": "gpa",
  "college-gpa-calculator": "college-gpa",
  "high-school-gpa-calculator": "high-school-gpa",
  "middle-school-gpa-calculator": "middle-school-gpa",
  "weighted-gpa-calculator": "weighted-gpa",
  "cumulative-gpa-calculator": "cumulative-gpa",
  "raise-gpa-calculator": "raise-gpa",
  "grade-calculator": "grade",
  "weighted-grade-calculator": "weighted-grade",
  "final-grade-calculator": "final-grade",
  "test-grade-calculator": "test-grade",
  "easy-grader": "easy-grader",

  // --- Statistics ---------------------------------------------------------
  "average-calculator": "average",
  "standard-deviation-calculator": "std-dev",
  "sample-standard-deviation-calculator": "sample-std-dev",
  "population-standard-deviation-calculator": "population-std-dev",
  "variance-calculator": "variance",
  "mean-absolute-deviation-calculator": "mad",
  "z-score-calculator": "z-score",
  "quartile-calculator": "quartile",

  // --- Fractions ----------------------------------------------------------
  "fraction-calculator": "fraction",
  "simplify-fractions-calculator": "simplify-fraction",
  "mixed-number-calculator": "mixed-number",
  "common-denominator-calculator": "common-denominator",
  "decimal-to-fraction-calculator": "decimal-to-fraction",
  "fraction-to-decimal-calculator": "fraction-to-decimal",

  // --- Ratios -------------------------------------------------------------
  "ratio-calculator": "ratio",

  // --- Dates --------------------------------------------------------------
  "age-calculator": "age",
  "dog-age-calculator": "dog-age",
  "date-calculator": "date",
  "days-between-dates": "days-between",
  "business-days-calculator": "business-days",

  // --- Time ---------------------------------------------------------------
  "hours-calculator": "hours",
  "time-calculator": "time",
  "time-card-calculator": "time-card",
  "military-time-converter": "military-time",

  // --- Number bases -------------------------------------------------------
  "binary-calculator": "binary",
  "hex-calculator": "hex",
  "roman-numeral-converter": "roman",
  "roman-numeral-date-converter": "roman-date",

  // --- Construction -------------------------------------------------------
  "square-footage-calculator": "square-footage",
  "concrete-calculator": "concrete",
  "gravel-calculator": "gravel",
  "mulch-calculator": "mulch",
  "tile-calculator": "tile",
  "paint-calculator": "paint",
  "roofing-calculator": "roofing",
  "btu-calculator": "btu",

  // --- Fitness ------------------------------------------------------------
  "one-rep-max-calculator": "one-rep-max",
  "water-intake-calculator": "water-intake",
};

/** Exact-match lookup. Returns null when a slug has no calculator variant. */
export function getCalculatorVariant(slug: string): CalculatorVariant | null {
  return Object.prototype.hasOwnProperty.call(CALCULATOR_VARIANTS, slug)
    ? CALCULATOR_VARIANTS[slug]
    : null;
}

/** Human readable label used in the workspace heading. */
export const CALCULATOR_VARIANT_LABELS: Record<CalculatorVariant, string> = {
  percent: "Percentage Calculator",
  "percent-change": "Percentage Change Calculator",
  "percent-increase": "Percentage Increase Calculator",
  "percent-decrease": "Percentage Decrease Calculator",
  "percent-difference": "Percentage Difference Calculator",
  discount: "Discount Calculator",
  margin: "Margin Calculator",
  markup: "Markup Calculator",
  "salary-hourly": "Salary to Hourly Calculator",
  "hourly-salary": "Hourly to Salary Calculator",
  overtime: "Overtime Calculator",
  "electricity-cost": "Electricity Cost Calculator",
  gpa: "GPA Calculator",
  "college-gpa": "College GPA Calculator",
  "high-school-gpa": "High School GPA Calculator",
  "middle-school-gpa": "Middle School GPA Calculator",
  "weighted-gpa": "Weighted GPA Calculator",
  "cumulative-gpa": "Cumulative GPA Calculator",
  "raise-gpa": "Raise GPA Calculator",
  grade: "Grade Calculator",
  "weighted-grade": "Weighted Grade Calculator",
  "final-grade": "Final Grade Calculator",
  "test-grade": "Test Grade Calculator",
  "easy-grader": "Easy Grader",
  average: "Average Calculator",
  "std-dev": "Standard Deviation Calculator",
  "sample-std-dev": "Sample Standard Deviation Calculator",
  "population-std-dev": "Population Standard Deviation Calculator",
  variance: "Variance Calculator",
  mad: "Mean Absolute Deviation Calculator",
  "z-score": "Z-Score Calculator",
  quartile: "Quartile and IQR Calculator",
  fraction: "Fraction Calculator",
  "simplify-fraction": "Simplify Fractions Calculator",
  "mixed-number": "Mixed Number Calculator",
  "common-denominator": "Common Denominator Calculator",
  "decimal-to-fraction": "Decimal to Fraction Calculator",
  "fraction-to-decimal": "Fraction to Decimal Calculator",
  ratio: "Ratio Calculator",
  age: "Age Calculator",
  "dog-age": "Dog Age Calculator",
  date: "Date Calculator",
  "days-between": "Days Between Dates Calculator",
  "business-days": "Business Days Calculator",
  hours: "Hours Calculator",
  time: "Time Calculator",
  "time-card": "Time Card Calculator",
  "military-time": "Military Time Converter",
  binary: "Binary Calculator",
  hex: "Hex Calculator",
  roman: "Roman Numeral Converter",
  "roman-date": "Roman Numeral Date Converter",
  "square-footage": "Square Footage Calculator",
  concrete: "Concrete Calculator",
  gravel: "Gravel Calculator",
  mulch: "Mulch Calculator",
  tile: "Tile Calculator",
  paint: "Paint Calculator",
  roofing: "Roofing Calculator",
  btu: "BTU Calculator",
  "one-rep-max": "One Rep Max Calculator",
  "water-intake": "Water Intake Calculator",
};
