const fs = require("fs");

const dePath = "f:/Website_Project/digitaltoolpad/messages/de.json";
const enPath = "f:/Website_Project/digitaltoolpad/messages/en.json";

const de = JSON.parse(fs.readFileSync(dePath, "utf8"));
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

de.faqs.q2 = "Welche gesetzlichen Feiertage gelten {year} in ganz Deutschland?";
de.faqs.a2 = "Neun Feiertage gelten bundesweit in allen 16 Ländern: Neujahr (01.01.), Karfreitag (03.04.), Ostermontag (06.04.), Tag der Arbeit (01.05.), Christi Himmelfahrt (14.05.), Pfingstmontag (25.05.), Tag der Deutschen Einheit (03.10.), 1. und 2. Weihnachtstag (25./26.12.). Weitere Feiertage wie Fronleichnam, Reformationstag oder Allerheiligen gelten in ausgewählten Bundesländern.";
de.faqs.q6 = "Wie nutze ich die Brückentage {year} optimal für meinen Urlaub?";
de.faqs.a6 = "Besonders vorteilhaft sind Donnerstags-Feiertage wie Christi Himmelfahrt (14.05.) und Fronleichnam (04.06.): Mit nur 1 Urlaubstag am Freitag erhalten Sie 4 freie Tage. Auch Neujahr (01.01.) fällt auf einen Donnerstag. Rund um Ostern ergeben 4 bzw. 8 Urlaubstage 10 bis 16 freie Tage am Stück.";

en.faqs.q2 = "Which public holidays are nationwide in Germany in {year}?";
en.faqs.a2 = "Nine statutory public holidays apply across all 16 federal states: New Year's Day (Jan 1), Good Friday (Apr 3), Easter Monday (Apr 6), Labour Day (May 1), Ascension Day (May 14), Whit Monday (May 25), Day of German Unity (Oct 3), and Christmas Day & Boxing Day (Dec 25/26). Regional holidays such as Corpus Christi or Reformation Day depend on the specific state.";
en.faqs.q6 = "How can I best use German bridging days in {year}?";
en.faqs.a6 = "Thursday holidays such as Ascension Day (May 14) and Corpus Christi (Jun 4) are ideal: 1 vacation day on Friday gives 4 consecutive days off. New Year's Day also falls on a Thursday. Around Easter, 4 to 8 vacation days yield 10 to 16 consecutive days off.";

fs.writeFileSync(dePath, JSON.stringify(de, null, 2), "utf8");
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), "utf8");
console.log("Updated FAQs in de.json and en.json successfully.");
