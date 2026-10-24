export interface BlogSection {
  heading: string;
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs. */
  list?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** Display date, e.g. "24. Oktober 2026". */
  date: string;
  /** ISO date used for structured data and the sitemap. */
  isoDate: string;
  readTime: string;
  category: string;
  sections: BlogSection[];
  /** Slugs from the tool catalog that the article links to. */
  toolSlugs: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "prozent-berechnen",
    title: "Prozent berechnen: Formeln, Beispiele und typische Fehler",
    excerpt:
      "Prozentwert, Grundwert und Prozentsatz einfach ausrechnen – mit den drei Grundformeln, Beispielen für Zu- und Abnahme und dem Unterschied zwischen Prozent und Prozentpunkten.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "5 Min. Lesezeit",
    category: "Rechner",
    toolSlugs: [
      "percentage-calculator",
      "percentage-increase-calculator",
      "percentage-decrease-calculator",
      "percentage-change-calculator",
    ],
    sections: [
      {
        heading: "Die drei Grundgrößen der Prozentrechnung",
        paragraphs: [
          "Jede Prozentaufgabe arbeitet mit drei Größen: dem Grundwert (das Ganze, entspricht 100 %), dem Prozentsatz (der Anteil in Prozent) und dem Prozentwert (der Teil, der dem Prozentsatz entspricht). Wenn zwei davon bekannt sind, lässt sich die dritte berechnen.",
        ],
        list: [
          "Prozentwert = Grundwert × Prozentsatz ÷ 100",
          "Prozentsatz = Prozentwert ÷ Grundwert × 100",
          "Grundwert = Prozentwert ÷ Prozentsatz × 100",
        ],
      },
      {
        heading: "Beispiel: Wie viel sind 15 % von 240 Euro?",
        paragraphs: [
          "Hier ist der Grundwert 240 € und der Prozentsatz 15 %. Der Prozentwert ist 240 × 15 ÷ 100 = 36 €. Umgekehrt gilt: Wenn 36 € genau 15 % entsprechen, ist der Grundwert 36 ÷ 15 × 100 = 240 €.",
        ],
      },
      {
        heading: "Prozentuale Zunahme und Abnahme",
        paragraphs: [
          "Steigt ein Preis von 80 € auf 92 €, beträgt die Zunahme 12 €. Bezogen auf den alten Wert sind das 12 ÷ 80 × 100 = 15 %. Fällt er von 92 € auf 80 €, beträgt die Abnahme ebenfalls 12 €, aber bezogen auf den neuen Ausgangswert 92 € nur rund 13 %. Das ist der Grund, warum eine Erhöhung um 15 % und eine anschließende Senkung um 15 % nicht wieder beim Ausgangswert landen.",
          "Für die Veränderung gilt immer: (neuer Wert − alter Wert) ÷ alter Wert × 100. Ein positives Ergebnis ist eine Zunahme, ein negatives eine Abnahme.",
        ],
      },
      {
        heading: "Prozent und Prozentpunkte nicht verwechseln",
        paragraphs: [
          "Steigt ein Zinssatz von 2 % auf 3 %, ist er um einen Prozentpunkt gestiegen – relativ gesehen aber um 50 %. Wer beides vermischt, kommt schnell zu falschen Aussagen. Prozentpunkte beschreiben die Differenz zweier Prozentwerte, Prozent die relative Veränderung.",
        ],
      },
      {
        heading: "Typische Fehler vermeiden",
        paragraphs: ["Diese Punkte führen im Alltag am häufigsten zu falschen Ergebnissen:"],
        list: [
          "Der Bezugswert wird vertauscht: Die Veränderung wird auf den neuen statt auf den alten Wert bezogen.",
          "Mehrere Prozentsätze werden addiert, obwohl sie nacheinander wirken (zwei Rabatte von 10 % ergeben 19 %, nicht 20 %).",
          "Der Prozentsatz wird nicht durch 100 geteilt, bevor multipliziert wird.",
        ],
      },
    ],
  },
  {
    slug: "tage-zwischen-zwei-daten-berechnen",
    title: "Tage zwischen zwei Daten berechnen: Kalendertage, Werktage und Schaltjahre",
    excerpt:
      "So ermitteln Sie die Anzahl der Tage zwischen zwei Datumsangaben – inklusive Schaltjahr-Regel, Werktagen und der Frage, ob der Starttag mitzählt.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "4 Min. Lesezeit",
    category: "Rechner",
    toolSlugs: ["days-between-dates", "business-days-calculator", "date-calculator", "age-calculator", "countdown-to-date"],
    sections: [
      {
        heading: "Kalendertage berechnen",
        paragraphs: [
          "Die Differenz zwischen zwei Daten ergibt sich aus der Anzahl der Tage, die zwischen beiden Terminen liegen. Zwischen dem 1. März und dem 31. März liegen 30 Tage. Zählt man den Starttag und den Endtag beide mit, sind es 31. Welche Variante gilt, hängt vom Zweck ab: Bei Fristen ist meist der Starttag nicht enthalten, bei Urlaubs- oder Buchungstagen zählen oft beide Tage.",
        ],
      },
      {
        heading: "Das Schaltjahr nicht vergessen",
        paragraphs: [
          "Ein Jahr hat 365 Tage, ein Schaltjahr 366 – der Februar hat dann 29 statt 28 Tage. Ein Jahr ist ein Schaltjahr, wenn es durch 4 teilbar ist. Ausnahme: Jahre, die durch 100 teilbar sind, sind keine Schaltjahre, es sei denn, sie sind zugleich durch 400 teilbar. Deshalb war 2000 ein Schaltjahr, 1900 aber nicht. Nach 2024 ist 2028 das nächste Schaltjahr.",
        ],
      },
      {
        heading: "Werktage statt Kalendertage",
        paragraphs: [
          "Für Lieferzeiten, Kündigungs- oder Zahlungsfristen sind oft Werktage entscheidend. Hier werden Wochenenden nicht mitgezählt, und je nach Vereinbarung auch gesetzliche Feiertage nicht. Da Feiertage in Deutschland je nach Bundesland unterschiedlich sind, sollten Sie bei verbindlichen Fristen immer prüfen, welche Regelung gilt.",
        ],
      },
      {
        heading: "Weitere Datumsrechnungen",
        paragraphs: [
          "Dieselbe Logik steckt hinter dem Altersrechner (Tage, Monate und Jahre seit dem Geburtsdatum) und dem Countdown bis zu einem Wunschdatum. Mit dem Datumsrechner können Sie außerdem Tage zu einem Datum addieren oder davon abziehen, etwa um das Ende einer 30-Tage-Frist zu bestimmen.",
        ],
      },
    ],
  },
  {
    slug: "bmi-berechnen",
    title: "BMI berechnen: Formel, Kategorien und Grenzen des Body-Mass-Index",
    excerpt:
      "Der BMI setzt Körpergewicht und Körpergröße ins Verhältnis. Hier steht, wie er berechnet wird, wie die WHO-Kategorien aussehen und warum er nur ein grober Richtwert ist.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "4 Min. Lesezeit",
    category: "Gesundheit",
    toolSlugs: ["bmi-calculator", "adult-bmi-calculator", "bmr-calculator", "tdee-calculator"],
    sections: [
      {
        heading: "Die BMI-Formel",
        paragraphs: [
          "Der Body-Mass-Index ist das Körpergewicht in Kilogramm geteilt durch das Quadrat der Körpergröße in Metern: BMI = Gewicht (kg) ÷ Größe (m)². Bei 70 kg und 1,75 m ergibt das 70 ÷ (1,75 × 1,75) = 70 ÷ 3,0625 ≈ 22,9.",
        ],
      },
      {
        heading: "Kategorien nach WHO für Erwachsene",
        paragraphs: ["Für Erwachsene verwendet die Weltgesundheitsorganisation diese Einteilung:"],
        list: [
          "unter 18,5: Untergewicht",
          "18,5 bis 24,9: Normalgewicht",
          "25,0 bis 29,9: Übergewicht (Präadipositas)",
          "ab 30,0: Adipositas",
        ],
      },
      {
        heading: "Grenzen des BMI",
        paragraphs: [
          "Der BMI unterscheidet nicht zwischen Muskel- und Fettmasse. Kraftsportler können einen hohen BMI haben, ohne übergewichtig zu sein. Auch Alter, Geschlecht und die Fettverteilung am Körper fließen nicht ein. Für Kinder und Jugendliche gelten altersabhängige Perzentilen statt fester Grenzwerte.",
          "Der BMI ist deshalb ein einfacher Orientierungswert und keine Diagnose. Fragen zu Gewicht und Gesundheit gehören in ärztliche Hände.",
        ],
      },
      {
        heading: "Vom BMI zum Kalorienbedarf",
        paragraphs: [
          "Wer Ernährung oder Training planen möchte, kann zusätzlich den Grundumsatz (BMR) berechnen – die Energie, die der Körper in Ruhe verbraucht – und daraus mit einem Aktivitätsfaktor den Gesamtumsatz (TDEE) ableiten. Beide Werte sind Schätzungen auf Basis von Formeln und weichen individuell ab.",
        ],
      },
    ],
  },
  {
    slug: "rabatt-und-preisnachlass-berechnen",
    title: "Rabatt berechnen: Preisnachlass, Endpreis, Marge und Aufschlag",
    excerpt:
      "So rechnen Sie Rabatte und Endpreise aus, wie sich mehrere Rabatte verhalten und worin sich Marge und Aufschlag unterscheiden – mit Rechenbeispielen.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "5 Min. Lesezeit",
    category: "Rechner",
    toolSlugs: ["discount-calculator", "margin-calculator", "markup-calculator", "percentage-calculator"],
    sections: [
      {
        heading: "Endpreis nach Rabatt",
        paragraphs: [
          "Der Preisnachlass ist der Prozentwert vom Ursprungspreis, der Endpreis der Rest. Bei 129 € und 20 % Rabatt beträgt der Nachlass 129 × 20 ÷ 100 = 25,80 €. Der Endpreis liegt bei 129 − 25,80 = 103,20 €. Schneller geht es mit einem Faktor: Endpreis = Ursprungspreis × (1 − Rabatt ÷ 100), hier 129 × 0,8 = 103,20 €.",
        ],
      },
      {
        heading: "Rabatt rückwärts: Wie hoch war der Nachlass?",
        paragraphs: [
          "Kostet ein Artikel statt 80 € nur noch 60 €, beträgt die Ersparnis 20 €. Bezogen auf den Ursprungspreis sind das 20 ÷ 80 × 100 = 25 %.",
        ],
      },
      {
        heading: "Mehrere Rabatte hintereinander",
        paragraphs: [
          "Rabatte wirken nacheinander auf den jeweils reduzierten Preis. Auf 100 € erst 20 % Rabatt (80 €) und dann weitere 10 % ergeben 72 €, also insgesamt 28 % Nachlass – nicht 30 %.",
        ],
      },
      {
        heading: "Marge und Aufschlag sind nicht dasselbe",
        paragraphs: [
          "Beide beschreiben den Gewinn, beziehen sich aber auf unterschiedliche Größen. Der Aufschlag bezieht den Gewinn auf den Einkaufspreis, die Marge auf den Verkaufspreis. Kauft ein Händler für 60 € ein und verkauft für 100 €, beträgt der Gewinn 40 €: Der Aufschlag liegt bei 40 ÷ 60 ≈ 66,7 %, die Marge bei 40 ÷ 100 = 40 %.",
        ],
      },
      {
        heading: "Mehrwertsteuer herausrechnen",
        paragraphs: [
          "Bei Bruttopreisen mit 19 % Umsatzsteuer erhalten Sie den Nettopreis, indem Sie durch 1,19 teilen; beim ermäßigten Satz von 7 % durch 1,07. Prüfen Sie bei Bedarf, welcher Steuersatz für Ihr Produkt gilt.",
        ],
      },
    ],
  },
  {
    slug: "stundenlohn-in-gehalt-umrechnen",
    title: "Stundenlohn in Monatsgehalt umrechnen (und umgekehrt)",
    excerpt:
      "Aus dem Stundenlohn das Monats- oder Jahresgehalt berechnen und aus dem Gehalt den Stundenlohn: Formeln, Rechenbeispiele und der Hinweis, warum der Faktor 4,33 gilt.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "4 Min. Lesezeit",
    category: "Rechner",
    toolSlugs: ["hourly-to-salary-calculator", "salary-to-hourly-calculator", "overtime-calculator", "hours-calculator", "time-card-calculator"],
    sections: [
      {
        heading: "Vom Stundenlohn zum Monatsgehalt",
        paragraphs: [
          "Ein Jahr hat 52 Wochen, ein Monat im Schnitt also 52 ÷ 12 ≈ 4,33 Wochen. Deshalb gilt: Monatsgehalt = Stundenlohn × Wochenstunden × 52 ÷ 12. Bei 15 € Stundenlohn und 40 Wochenstunden sind das 15 × 40 × 52 ÷ 12 = 2.600 € pro Monat (brutto).",
          "Das Jahresgehalt ist entsprechend Stundenlohn × Wochenstunden × 52 – im Beispiel 31.200 €.",
        ],
      },
      {
        heading: "Vom Gehalt zum Stundenlohn",
        paragraphs: [
          "Umgekehrt teilen Sie das Monatsgehalt durch die durchschnittlichen Monatsstunden: Stundenlohn = Monatsgehalt ÷ (Wochenstunden × 52 ÷ 12). Bei 3.200 € und 40 Wochenstunden sind das 3.200 ÷ 173,33 ≈ 18,46 € pro Stunde.",
        ],
      },
      {
        heading: "Brutto, Netto und Urlaub",
        paragraphs: [
          "Alle Beispiele gelten für den Bruttolohn. Wie viel netto übrig bleibt, hängt von Steuerklasse, Sozialabgaben und weiteren Faktoren ab. Bezahlter Urlaub und Feiertage sind im Monatsgehalt bereits enthalten, weshalb der rechnerische Stundenlohn aus dem Gehalt niedriger ausfällt als der Lohn pro tatsächlich geleisteter Arbeitsstunde.",
        ],
      },
      {
        heading: "Überstunden und Arbeitszeit erfassen",
        paragraphs: [
          "Für Überstunden gelten die Regeln Ihres Arbeits- oder Tarifvertrags, etwa ein Zuschlag auf den Stundenlohn. Mit einem Stundenrechner oder Stundenzettel-Rechner summieren Sie Arbeitszeiten über die Woche und erhalten die Gesamtstunden für die Abrechnung.",
        ],
      },
    ],
  },
  {
    slug: "brueche-kuerzen-und-rechnen",
    title: "Brüche kürzen, addieren und umrechnen – Schritt für Schritt",
    excerpt:
      "Brüche mit dem größten gemeinsamen Teiler kürzen, mit dem Hauptnenner addieren und in Dezimalzahlen umrechnen: verständlich erklärt mit Beispielen.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "5 Min. Lesezeit",
    category: "Rechner",
    toolSlugs: [
      "simplify-fractions-calculator",
      "fraction-calculator",
      "common-denominator-calculator",
      "decimal-to-fraction-calculator",
      "fraction-to-decimal-calculator",
    ],
    sections: [
      {
        heading: "Brüche kürzen",
        paragraphs: [
          "Ein Bruch wird gekürzt, indem Zähler und Nenner durch dieselbe Zahl geteilt werden. Am schnellsten geht das mit dem größten gemeinsamen Teiler (ggT). Beim Bruch 24/36 ist der ggT 12: 24 ÷ 12 = 2 und 36 ÷ 12 = 3, der gekürzte Bruch lautet 2/3.",
        ],
      },
      {
        heading: "Brüche addieren und subtrahieren",
        paragraphs: [
          "Brüche lassen sich nur mit gleichem Nenner addieren. Dafür sucht man den Hauptnenner, das kleinste gemeinsame Vielfache der Nenner. Für 1/4 + 1/6 ist der Hauptnenner 12: 1/4 = 3/12 und 1/6 = 2/12, die Summe beträgt 5/12.",
        ],
      },
      {
        heading: "Brüche multiplizieren und dividieren",
        paragraphs: [
          "Beim Multiplizieren werden Zähler mit Zähler und Nenner mit Nenner multipliziert: 2/3 × 3/5 = 6/15 = 2/5. Beim Dividieren multipliziert man mit dem Kehrbruch: 2/3 ÷ 4/5 = 2/3 × 5/4 = 10/12 = 5/6.",
        ],
      },
      {
        heading: "Bruch und Dezimalzahl umrechnen",
        paragraphs: [
          "Einen Bruch verwandeln Sie in eine Dezimalzahl, indem Sie den Zähler durch den Nenner teilen: 3/8 = 0,375. Umgekehrt schreiben Sie 0,75 als 75/100 und kürzen auf 3/4. Manche Brüche, etwa 1/3, ergeben periodische Dezimalzahlen (0,333…).",
        ],
      },
      {
        heading: "Gemischte Zahlen",
        paragraphs: [
          "Eine gemischte Zahl wie 2 1/3 besteht aus einem ganzen Anteil und einem Bruch. Zum Rechnen wandelt man sie in einen unechten Bruch um: 2 × 3 + 1 = 7, also 7/3.",
        ],
      },
    ],
  },
  {
    slug: "dateien-ohne-upload-umwandeln",
    title: "PDFs und Bilder ohne Upload bearbeiten: So funktionieren Browser-Tools",
    excerpt:
      "Warum Dateien beim Zusammenfügen, Komprimieren oder Verkleinern nicht auf einen fremden Server müssen – und worauf Sie bei Online-Tools achten sollten.",
    date: "24. Oktober 2026",
    isoDate: "2026-10-24",
    readTime: "4 Min. Lesezeit",
    category: "Datenschutz",
    toolSlugs: ["merge-pdf", "compress-pdf", "split-pdf", "image-resizer"],
    sections: [
      {
        heading: "Was bei vielen Online-Tools passiert",
        paragraphs: [
          "Viele Webdienste laden Ihre Datei zunächst auf einen Server hoch, verarbeiten sie dort und senden das Ergebnis zurück. Das ist bequem, bedeutet aber, dass Verträge, Rechnungen oder persönliche Fotos zeitweise auf fremden Systemen liegen. Wie lange und zu welchem Zweck, ergibt sich aus der jeweiligen Datenschutzerklärung.",
        ],
      },
      {
        heading: "Verarbeitung direkt im Browser",
        paragraphs: [
          "Moderne Browser können Dateien selbst verarbeiten. Die Datei wird dabei nur in den Arbeitsspeicher Ihres Geräts geladen, das Tool rechnet lokal und bietet das Ergebnis zum Download an. Rechnuvio arbeitet für seine Werkzeuge nach diesem Prinzip: PDFs zusammenfügen, teilen oder komprimieren und Bilder skalieren, ohne dass die Datei hochgeladen wird.",
        ],
      },
      {
        heading: "So prüfen Sie, ob wirklich nichts hochgeladen wird",
        paragraphs: ["Sie können das selbst nachvollziehen:"],
        list: [
          "Öffnen Sie die Entwicklerwerkzeuge des Browsers (F12) und den Reiter „Netzwerk“.",
          "Verarbeiten Sie eine Testdatei und beobachten Sie, ob eine Anfrage mit dem Dateiinhalt gesendet wird.",
          "Alternativ: Trennen Sie nach dem Laden der Seite die Internetverbindung – lokale Tools funktionieren weiter.",
        ],
      },
      {
        heading: "Grenzen lokaler Verarbeitung",
        paragraphs: [
          "Sehr große Dateien benötigen viel Arbeitsspeicher und können auf älteren Geräten langsam sein. Außerdem hängt die Geschwindigkeit von Ihrem Gerät statt von einem Server ab. Für sensible Dokumente überwiegt in der Regel der Vorteil, dass sie das Gerät nicht verlassen.",
        ],
      },
    ],
  },
];
