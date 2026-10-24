/**
 * Merge the locale-split message keys into one key per label.
 *
 * Two engines kept a German key and an English key for the same label and
 * picked one with a `locale === "de" ? ... : ...` ternary. That works, but it
 * leaves the English catalogue carrying German text and makes every label
 * need two keys.
 *
 * This script folds each pair into the English-named key: the German
 * catalogue keeps the German text it showed before, the English catalogue
 * keeps the English text, and the German-named key disappears from both.
 *
 * The pairs are listed explicitly. A pair whose two German texts differ keeps
 * the German text that the German page rendered before, so the merge never
 * changes a word a user could read.
 *
 * Usage:
 *   node scripts/audit/merge-locale-key-pairs.mjs [--check]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const checkOnly = process.argv.includes("--check");

/** namespace -> [german key, english key] */
const PAIRS = {
  "ui.engines.MathCalculatorsEngine": [
    ["gehaltZuStundenlohnRechnerUSDBasis", "salaryToHourlyWageConverterUSDBaseline"],
    ["wochenstunden", "hoursPerWeek"],
    ["proStunde", "perHour"],
    ["zweiwChentlich", "biWeekly"],
    ["monatlich", "monthly"],
    ["notendurchschnittGPARechner", "gPAFinalGradeCalculator"],
    ["prozentrechnerSuite", "percentageCalculatorSuite"],
    ["wertBerechnen", "calculateValue"],
    ["wieVielSind", "whatIs"],
    ["prozentsatzBerechnen", "calculatePercentage"],
  ],
  "ui.engines.Calendar2026Engine": [
    ["deutschland2026", "germany2026"],
    ["16BundeslNder", "16GermanStates"],
    ["brCkentageUrlaubsplaner", "bridgingDaysPlanner"],
    ["iSOKalenderwochenKW", "iSOWeekNumbers"],
    ["kalender", "calendar"],
    ["kalenderwoche", "week"],
    ["alleTermine", "allEvents"],
    ["gesetzlicheFeiertage", "publicHolidays"],
    ["brCkentage2026", "bridgeDays"],
    ["brauchtumFeste", "observances"],
    ["urlaubstageCleverEinsetzenIn2026", "maximizeYour2026VacationDays"],
    ["datum", "date"],
    ["feiertagEreignis", "holidayEvent"],
    ["geltungsbereich", "regionScope"],
    ["kategorie", "category"],
    ["gesetzlicherFeiertag", "publicHoliday"],
    ["brauchtumFesttag", "traditionEvent"],
    ["gesetzlicheFeiertageRotHervorgehoben", "statutoryPublicHolidaysHighlightedInRed"],
    ["bundesweit16LNder", "nationwide16States"],
    ["0Urlaubstage3TageFrei", "0Days3DaysOff"],
    [
      "zeigtAlle9BundesweitenFeiertageUndLNderspezifischeTermineAn",
      "showsAllNationwideHolidaysAndRegionalDates",
    ],
    [
      "nutzenSieBundesweiteFeiertageDieAufEinenDonnerstagFallenZBChristiHimmelfahrtOderFronleichnamFRBrCkentageAmFreitagMitNur1UrlaubstagErhaltenSie4FreieTageAmStCk",
      "germanThursdayPublicHolidaysSuchAsAscensionDayOrCorpusChristiAllowYouToGain4ConsecutiveDaysOffWithJust1VacationDayOnFriday",
    ],
  ],
};

/**
 * Labels that had a German key but no English counterpart. They get an
 * English-named key with the English text and the German text they showed.
 */
const NEW_KEYS = {
  "ui.engines.Calendar2026Engine": {
    allGermanStates: {
      en: "All German States",
      de: "Alle Bundesländer",
    },
    observancesAndEventsCarnivalSummerTimeAdvent: {
      en: "Observances & Events (Carnival, Summer Time, Advent …)",
      de: "Brauchtum & Ereignisse (Karneval, Sommerzeit, Advent …)",
    },
  },
};

const pick = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const enPath = join(root, "src", "messages", "en.json");
const dePath = join(root, "src", "messages", "de.json");
const en = JSON.parse(readFileSync(enPath, "utf8"));
const de = JSON.parse(readFileSync(dePath, "utf8"));

let changed = 0;
const notes = [];

for (const [namespace, pairs] of Object.entries(PAIRS)) {
  const enNs = pick(en, namespace);
  const deNs = pick(de, namespace);
  if (!enNs || !deNs) {
    console.error(`! namespace not found: ${namespace}`);
    process.exit(1);
  }

  for (const [germanKey, englishKey] of pairs) {
    if (!(germanKey in enNs)) {
      notes.push(`${namespace}: ${germanKey} is not in the English catalogue`);
      continue;
    }
    if (!(englishKey in enNs)) {
      console.error(`! ${namespace}: the English counterpart ${englishKey} does not exist`);
      process.exit(1);
    }
    // The German page keeps the German text it rendered before.
    if (deNs[germanKey] !== undefined && deNs[germanKey] !== deNs[englishKey]) {
      notes.push(
        `${namespace}.${englishKey}: German text "${deNs[englishKey]}" -> "${deNs[germanKey]}"`,
      );
      deNs[englishKey] = deNs[germanKey];
    }
    delete deNs[germanKey];
    delete enNs[germanKey];
    changed += 1;
  }
}

for (const [namespace, additions] of Object.entries(NEW_KEYS)) {
  const enNs = pick(en, namespace);
  const deNs = pick(de, namespace);
  for (const [key, values] of Object.entries(additions)) {
    enNs[key] = values.en;
    deNs[key] = values.de;
    changed += 1;
    notes.push(`${namespace}.${key}: added`);
  }
}

console.log(`merged pairs: ${changed}`);
for (const note of notes) console.log(`  ${note}`);

if (checkOnly) {
  console.log("\n--check: nothing written.");
} else {
  writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
  writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n", "utf8");
  console.log("\nmessage catalogues updated.");
}
