const fs = require('fs');

const toolsDePath = 'src/data/tools_de.json';
const toolsDe = JSON.parse(fs.readFileSync(toolsDePath, 'utf8'));

// Common English to German terms in tool titles
const termMap = [
  [/\bCalculator\b/g, 'Rechner'],
  [/\bCalculators\b/g, 'Rechner'],
  [/\bConverter\b/g, 'Konverter'],
  [/\bConverters\b/g, 'Konverter'],
  [/\bViewer\b/g, 'Betrachter'],
  [/\bViewers\b/g, 'Betrachter'],
  [/\bCompressor\b/g, 'Kompressor'],
  [/\bCounter\b/g, 'Zähler'],
  [/\bRemover\b/g, 'Entferner'],
  [/\bBeautifier\b/g, 'Formatierer'],
  [/\bExtractor\b/g, 'Extraktor'],
  [/\bMaker\b/g, 'Ersteller'],
  [/\bSplitter\b/g, 'Teiler'],
  [/\bPicker\b/g, 'Auswahl-Tool'],
  [/\bChecker\b/g, 'Prüfer'],
  [/\bCalendar\b/g, 'Kalender'],
  [/\bHolidays\b/g, 'Feiertage'],
  [/\bTimer\b/g, 'Timer'],
  [/\bStopwatch\b/g, 'Stoppuhr'],
  [/\bResizer\b/g, 'Skalierer'],
  [/\bTester\b/g, 'Tester'],
  [/\bOnline\b/g, 'Online'],
  [/\bFree\b/g, 'Kostenloser'],
  [/\bSimple\b/g, 'Einfacher'],
  [/\bFast\b/g, 'Schneller'],
  [/\bAdvanced\b/g, 'Erweiterter'],
  [/\bPercentage\b/g, 'Prozent'],
  [/\bAge\b/g, 'Alter'],
  [/\bSalary\b/g, 'Gehalt'],
  [/\bWord\b/g, 'Wort'],
  [/\bText\b/g, 'Text'],
  [/\bImage\b/g, 'Bild'],
  [/\bPhoto\b/g, 'Foto'],
  [/\bPassword\b/g, 'Passwort'],
  [/\bHourly\b/g, 'Stundenlohn'],
];

for (const [slug, data] of Object.entries(toolsDe)) {
  let name = data.name;

  if (slug === '2026-calendar') {
    name = 'Kalender 2026';
  } else if (slug === '2027-calendar') {
    name = 'Kalender 2027';
  } else if (slug === '2027-holidays') {
    name = 'Feiertage 2027';
  } else {
    for (const [en, de] of termMap) {
      name = name.replace(en, de);
    }
  }

  data.name = name;
}

fs.writeFileSync(toolsDePath, JSON.stringify(toolsDe, null, 2), 'utf8');
console.log('Successfully polished tool names in src/data/tools_de.json!');
