# Rechnuvio: Audit and German Localization Plan (brief for MiniMax)

Site: https://rechnuvio.de (German first, all tools run in the browser, no uploads).
Repo: https://github.com/troysanders535-wq/rechnuvio (public, AGPL-3.0-or-later).
Date of audit: 2026-10-24. Owner: Shahbaz.

The catalog was built for US users and machine-translated into German. Goal: make Rechnuvio a **German calculator and file-tool site** that ranks on German Google for the searches Germans really make. This file is the work order. Do the tasks in order; each task is one branch and one pull request.

---

## 0. Rules for working in this repo

1. **Read `AGENTS.md` first.** This is a newer Next.js (16.4) than most training data: before writing code, read the relevant page in `node_modules/next/dist/docs/`. `cacheComponents` is on (runtime APIs such as `headers()`/`cookies()` must sit inside Suspense or follow the documented patterns).
2. Never push to `main`. One branch and one PR per task (`gh pr create`). Wait for the owner to merge.
3. Do not commit `tsconfig.json` changes made by `next build` (it appends `.next-*` include lines; run `git checkout tsconfig.json` before committing).
4. Before every PR run: `npx tsc --noEmit` and `NEXT_DIST_DIR=.next-build npx next build --webpack` (delete `.next-build` afterwards). `next dev` with Turbopack is fine for quick checks.
5. Everything must keep running **in the browser, with no upload**. No server-side processing, no tracking scripts, no new heavy dependencies without asking (a dependency must be MIT/Apache/BSD or AGPL-compatible).
6. All user-visible German text must be natural German (not word-for-word translation). Use "Sie" (formal), metric units, `1.234,56 €`, dates `TT.MM.JJJJ`, 24-hour time, decimal comma. Allow both comma and dot as decimal separator in inputs (`parseLocaleNumber` already exists in `src/utils/numberFormat.ts`).
7. Tax, social-insurance and similar figures change every year. Never hard-code them in components. Put them in one data file per topic (for example `src/data/de/tax-2026.ts`) with the **year, the source URL and the date checked**, and show "Stand: 2026" on the page. Verify against official sources (BMF, Deutsche Rentenversicherung, GKV-Spitzenverband, destatis.de). If a figure cannot be verified, say so in the PR instead of guessing.
8. Windows and Git Bash environment. Heredocs that contain apostrophes can break the shell; write multi-line files with an editor tool instead.

### Where things live

| Topic | Path |
|---|---|
| Tool catalog (English source, 492 tools) | `src/data/tools.ts` |
| German names, descriptions, features, FAQs per tool | `src/data/tools_de.json` (keyed by slug) |
| How-to steps per tool | `src/data/howTo.ts` |
| Calculator variants (slug to variant) | `src/data/calculatorTools.ts` |
| Calculator UI and formulas | `src/components/calculators/*.tsx`, `calc.ts`, `shared.tsx` |
| Other tool engines | `src/components/engines/` |
| PDF tools | `src/components/pdf/` |
| UI strings (de/en) | `src/messages/de.json`, `src/messages/en.json` (namespace `ui.*` is the large one) |
| Page-level strings | `messages/*.json` is legacy; use `src/messages/` |
| Routes | `src/app/` (`tools/[slug]`, `[category]`, `blog`, `impressum`, ...) |
| Locale and 404 logic | `src/proxy.ts`, `src/i18n/` |
| Brand, Impressum data, JSON-LD | `src/lib/brand.ts` |
| Blog posts | `src/data/blogPosts.ts` |
| Per-engine message namespaces (generated) | `src/data/engineNamespaces.generated.ts`; regenerate with `node scripts/gen-engine-namespaces.mjs` after adding `useTranslations` namespaces |

---

## 1. Audit summary (what is wrong today)

### 1.1 Catalog fit for Germany

- 492 tools. Biggest groups: Design 97, Productivity 77, Text 62, Calculators 62, Coding 40, Data formats 36, PDF 31.
- **About 65 tools are US-specific or niche for Germany**: GPA family (7: gpa, college, high school, middle school, weighted, cumulative, raise), US grading helpers, Thanksgiving (3), Halloween, Yankee Swap, White Elephant, Dirty Santa, baby-shower bingo, D&D dice, `military-time-converter`, `square-footage-calculator`, APA/MLA/Chicago citation, Discord/Twitch/Reddit username generators, Instagram tools.
- **Missing German high-volume calculators (none exist):** Mehrwertsteuer, Brutto-Netto, Zinsrechner, Zinseszins, Kreditrechner/Annuität, Dreisatz, Einheitenumrechner (Länge, Gewicht, Temperatur, Fläche, Volumen), Kalenderwoche, Feiertage nach Bundesland, Schaltjahr, Promille, Lottozahlen, IBAN-Prüfer, Spritkosten, Entfernungspauschale, Skonto, Abschreibung (AfA), Notendurchschnitt, Abiturnote, Urlaubstage.
- Calculator defaults are US-style: `sq ft`, `ft³`, inches, lbs, US/UK holiday sets only (`HolidaySet = "none" | "us" | "uk"` in `calc.ts`). No German Feiertage per Bundesland in the business-days or date calculators.
- Category names and tool grouping reflect US sites (Lifestyle, Device Tests, "Games & Randomizers" with a single tool).

### 1.2 German text quality

- German text was machine-translated from English. Seen in `tools_de.json`: leftover "Free", "Convert", "Generate" prefixes in descriptions (fixed for about 33), odd phrases such as "Divid-by-2 Arbeit", "Mittelschule GPA", "Wort" instead of "Word", half-translated names like "Days Between Dates Rechner" (about 235 names fixed in PRs #3; re-check).
- **120 feature bullets** still contain English; the other bullets are templated ("Nimmt 3 Zahlenwerte entgegen: Alter, Gewicht (kg und Größe (cm.").
- Bug in the templated strings: the unit label has no closing bracket: "Gewicht (kg", "Größe (cm" (source: `ui.engines.HealthFitnessEngine.weight`/`height` in `src/messages/*.json` are `"Gewicht ("`/`"Größe ("`, and the component appends the unit without `)`; the same text appears in `howTo.ts` lines about 3527, 3848, 3856).
- FAQs are generic templates: 571 distinct questions, but only three real patterns ("Ist das kostenlos?", "Sind meine Daten sicher?", "Mobil nutzbar?") plus "Welche Dateiformate verarbeitet X?". They do not answer what Germans search ("Wie berechne ich ...?").
- `keywords` is empty for all 492 tools in `tools_de.json`.
- The English page text and the German page text for the same tool sometimes differ in meaning (engine strings in `src/messages/de.json` are 267 KB and unreviewed).

### 1.3 SEO status (live checks 2026-10-24)

Already fixed in merged PRs #2 to #4 and #7 (see git log): real 404 status for unknown URLs, www redirect, security headers, duplicate verification tag, lighter pages, German tool names, sitemap `lastmod`, blog replaced by 7 German articles, `/tools` 876 KB to 163 KB, AGPL license and footer link, date inputs.
Still open:

| Item | Detail |
|---|---|
| PR #5 (MuPDF compress) and PR #6 (PDF to DOCX) | not merged yet; owner decides |
| Impressum | `IMPRESSUM` in `src/lib/brand.ts` is empty, so `/impressum` is 404. German law requires it. Owner must supply name, address, e-mail. Contact form shows "unavailable" until `IMPRESSUM.email` is set |
| Cache-Control | public pages send `no-store`; test on Hostinger before changing |
| Core Web Vitals | never measured; run PageSpeed Insights/CrUX on 10 key pages |
| Search Console | not connected; no index or ranking data yet |
| Keyword data | not available yet (see section 3) |
| Blog | 7 posts only; thin internal linking |
| Titles | pattern "`{Name} – kostenlos online | Rechnuvio`" is good; verify each money page has the main keyword in title, H1 and first paragraph |
| Per-tool content | each tool page has the same template sections; almost no unique explanation text |
| Structured data | WebApplication + FAQPage + BreadcrumbList present. FAQ rich results are rare now; keep for AI answers |
| `hreflang` | German only; the English variant (`?locale=en`) exists but has no live English domain. Decide: keep EN hidden or drop |

### 1.4 Known bugs found during testing

1. `Gewicht (kg` / `Größe (cm` missing closing bracket (see 1.2). The BMI math itself is correct: 75 kg and 178 cm gives 23.7 (WHO category "Normalgewicht").
2. Age calculator: day count could be negative (fixed in PR #7), zodiac boundaries wrong on 3 days (fixed).
3. Zodiac and weekday names were English on the German page (fixed).
4. Possible language mix on the English variant: page header English with German engine panel was reported by the owner once (not reproducible in a production build with `?locale=en`). Test the language toggle (cookie plus client navigation) end to end and fix if it recurs. Related code: `src/proxy.ts`, `src/i18n/domains.ts` (`getLocaleFromHost` ignores the cookie), `src/app/tools/[slug]/page.tsx` (nested `NextIntlClientProvider`).

---

## 2. Task list (do in this order)

Priority: P0 = money pages, do first; P1 = next; P2 = later.

### T1 (P0): Tool-to-keyword map (needs data, see section 3)
Create `docs/keyword-map.csv` with columns: `keyword, volume_de, difficulty, intent, target_slug, status(existing|rework|new|skip)`. Drive every later task from it. Without Semrush data, start with the list in section 4 and mark it "unverified".
**Done when:** the top 50 German keywords each point to one page.

### T2 (P0): Build the missing German calculators (new tools)
For each new tool add: entry in `src/data/tools.ts`, German entry in `tools_de.json`, engine/variant, UI strings in `src/messages/de.json` and `en.json`, `howTo.ts` steps, and 3 to 5 **real** FAQs. Slugs use German words (`mehrwertsteuer-rechner`). Suggested order:

1. `mehrwertsteuer-rechner`: Brutto/Netto/Steuerbetrag; 19 % and 7 % presets plus free rate. Netto = Brutto / (1 + s).
2. `brutto-netto-rechner`: implement the official **BMF Programmablaufplan (Lohnsteuer)** for the current year plus social-insurance rates (KV incl. Zusatzbeitrag input, PV with Kinderlos-Zuschlag, RV, AV), Steuerklassen 1 to 6, Kirchensteuer by Bundesland, Kinderfreibeträge. Put all rates in `src/data/de/`. Validate against the BMF online calculator for at least 10 cases and keep them as unit tests. If full PAP is too large, ship a clearly labelled "Näherung" for Steuerklasse 1 first.
3. `zinsrechner` and `zinseszinsrechner`: K_n = K_0 (1 + p)^n; with monthly contribution (Sparplan).
4. `kreditrechner`: Annuität = K · q^n · (q − 1) / (q^n − 1) with q = 1 + Zins/12; Tilgungsplan table, Sondertilgung optional.
5. `dreisatz-rechner`: direkt und indirekt proportional, with the Rechenweg shown.
6. `einheiten-umrechner` family (or one tool with a category selector): Länge, Gewicht, Temperatur, Fläche, Volumen, Geschwindigkeit, Daten.
7. `kalenderwoche-rechner` (ISO 8601 week) and `feiertage-rechner` (see T3).
8. `promille-rechner` (Widmark: A = V · ρ · e; c = A / (m · r); r 0.7 men, 0.6 women; show clear "Schätzwert, nicht für Fahrtüchtigkeit" notice).
9. `lottozahlen-generator` (6 aus 49 plus Superzahl; also Eurojackpot 5 aus 50 + 2 aus 12) using `crypto.getRandomValues`.
10. `iban-pruefer` (mod-97 check, German IBAN length 22, show Bankleitzahl part).
11. `spritkosten-rechner`, `entfernungspauschale-rechner` (verify the current rates), `skonto-rechner`, `afa-rechner`, `urlaubstage-rechner`.
12. `notendurchschnitt-rechner` (Noten 1 bis 6, gewichtet) and `abiturnote-rechner` (Gesamtpunktzahl 300 bis 900 to Durchschnittsnote per KMK formula; verify the formula and rounding against the KMK document).

**Done when (each tool):** correct against at least 5 independent reference cases written as tests or documented in the PR; German page title, H1, intro paragraph of 80+ words and Rechenweg/Formel section; 3+ real FAQs; works with comma decimals; link added from the matching blog article or category page.

### T3 (P0): German holidays and metric defaults in existing calculators
- Add `HolidaySet` values for the 16 Bundesländer plus "bundesweit". Compute Easter-based holidays with the Gauss/Meeus algorithm. Cover: Neujahr, Heilige Drei Könige (BW, BY, ST), Internationaler Frauentag (BE, MV), Karfreitag, Ostermontag, Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag, Fronleichnam (BW, BY, HE, NW, RP, SL), Mariä Himmelfahrt (SL; parts of BY), Weltkindertag (TH), Tag der Deutschen Einheit, Reformationstag (BB, HB, HH, MV, NI, SN, ST, SH, TH), Allerheiligen (BW, BY, NW, RP, SL), Buß- und Bettag (SN), 1. und 2. Weihnachtstag. **Verify the table against a government source before shipping.**
- Use it in: business days, date calculator (Werktage), 2026/2027 holiday pages (check they already match), Urlaubstage tool.
- Default `Werktage` = Mo bis Fr; show Samstag option (German law counts Mo bis Sa as Werktage for Urlaub and many Fristen).
- Construction calculators (`ConstructionTools.tsx`): m², m³, cm, kg by default; imperial optional toggle. Currently hard-coded `sq ft`, `ft³`, inches.
- Health tools: metric default is correct; keep imperial toggle but hide it for the German locale or put it behind "Angloamerikanisch".
- `military-time-converter`: rename and explain as "24-Stunden-Format umrechnen (12h in 24h)".

### T4 (P0): Fix the German text defects
1. Fix the missing bracket: change `weight`/`height` messages to full labels with unit passed as a parameter (for example `"Gewicht ({unit})"`), update `HealthFitnessEngine.tsx`, update the affected `howTo.ts` strings and `tools_de.json` features. Search the repo for `"("` label fragments with the same pattern in other engines.
2. Remove all English in `tools_de.json` (`features`, `faqs`, `description`): list them with a script (about 120 bullets), translate properly.
3. Replace the templated features with useful ones: what the tool computes, the formula, input limits, example. Delete the "Nimmt N Zahlenwerte entgegen" pattern.
4. Replace generic FAQs (keep "Daten sicher?" as one shared answer) with real questions per tool, written from the keyword map (T1).
5. Fill `keywords` (3 to 6 per tool, German).
6. Review `src/messages/de.json` namespace by namespace (start with `ui.calculators.*`, `ui.pdf.*`, `ui.engines.*`). Fix literal translations, mixed English, wrong terms ("Wort" for Word, "Brief" notes, GPA terms).
**Done when:** a script finds no English function words (`the|and|with|your|for|from|free|generate|convert`) in German strings except brand and file-format names.

### T5 (P1): Re-scope the US-centric tools
- GPA family (7 tools): merge into one "Notendurchschnitt-Rechner" page and 301-redirect the old slugs (or keep as `noindex` and drop from sitemap and navigation). Keep an "US GPA" tool only as one page.
- Thanksgiving, Halloween, Yankee Swap, White Elephant, Dirty Santa, baby-shower bingo: remove from main navigation and sitemap or localize ("Wichteln", "Silvester", "Nikolaus", "Adventskalender", "Tage bis Weihnachten", "Osterzeit"). Keep Weihnachten/Wichteln/Silvester tools.
- Citation generators: keep APA 7 (used in German universities); add "Zitierweise nach DIN ISO 690" and "Harvard (deutsch)". Remove Chicago/MLA from navigation if there is no demand in the data.
- Username generators for Discord/Twitch/Reddit: keep only if the data shows demand.
Use `redirects()` in `next.config.ts` (permanent) for removed slugs, and keep `src/proxy.ts` known-path lists in sync (it reads the catalog, so remove from `tools.ts`).

### T6 (P1): Unique content on every money page
For the top 30 keyword pages: 300 to 600 words of original German text below the tool: how it works with the formula, a worked example with real numbers, common mistakes, "Wann nutzen?", links to 3 related tools and one blog article, a short "Stand" line for year-dependent values. No filler, no AI-sounding repetition. Use the existing `ToolShell.tsx` sections or add a `content` field per tool. Add `HowTo`/`FAQPage` JSON-LD only when the visible text matches.

### T7 (P1): Blog and internal links
Write 15 to 20 more articles from the keyword map (long-tail: "Prozent berechnen Beispiel", "Mehrwertsteuer rausrechnen", "Brutto Netto 2026", "Kalenderwoche heute", "Tage zwischen zwei Daten"). Each article 600+ words, with example tables, links to tools. Add `BlogPosting` JSON-LD (exists). Add "Ähnliche Rechner" blocks both ways. Home page: link the top 12 tools in the first screen.

### T8 (P1): Technical follow-ups
- Run PageSpeed Insights (mobile) on home, `/tools`, 8 tool pages. Fix LCP/INP issues. Heavy engines must stay lazy-loaded (MuPDF about 10 MB WASM loads only on PDF pages).
- Test Cache-Control on Hostinger (static assets long cache; HTML `s-maxage` only if proven safe with the locale logic).
- Connect Google Search Console and submit `https://rechnuvio.de/sitemap.xml`; check "Soft 404", "Duplicate", "Crawled, not indexed".
- `getLocaleFromHost` and the language toggle: decide whether an English version stays. If not, remove EN domains, `?locale=` override and the toggle (it creates duplicate URLs).
- Fill `IMPRESSUM` (owner provides data); then the contact form works via mailto.

### T9 (P2): Quality bar for PDF tools
PR #5 (compress, MuPDF) and PR #6 (PDF to DOCX) are waiting for the owner. After merge: test with 10 real German PDFs (Rechnung, Vertrag, Scan, Kontoauszug), tune table detection in `src/components/pdf/pdfLayout.ts`, keep text selectable, extend redact to true redaction with MuPDF (current redaction only draws boxes).

---

## 3. Data to collect before T1 (owner action in Semrush)

Semrush has a Claude connector (`https://mcp.semrush.com/claude/v1/mcp`). If it is connected in the session, use `keyword_research` and `organic_research` with database `de`. If not, ask the owner for these CSV exports (database: Germany):

1. **Keyword Magic Tool** exports, one per seed, filter volume >= 500, sorted by volume: `rechner`, `rechner online`, `umrechnen`, `berechnen`, `generator`, `zusammenfügen`, `pdf`, `komprimieren`, `umwandeln`, `zufall`, `kalender`.
2. **Organic Research** top pages for: smallpdf.com/de, ilovepdf.com, rechneronline.de, calconic.com, zinsen-berechnen.de, brutto-netto-rechner.info, rechner.org (and any German tool site the owner knows).
3. Optional: **Keyword Gap** between rechnuvio.de and two of those competitors.

Place files in `docs/semrush/` and build the map from them. For every keyword record intent (calculator, converter, information) and whether Google shows a tool or an article; match that format.

## 4. Provisional keyword themes (general knowledge, NOT measured; replace with data)

Group A, money: Mehrwertsteuer rechner, Brutto Netto Rechner, Zinsrechner, Zinseszinsrechner, Kreditrechner, Prozentrechner, Dreisatzrechner, Skonto, Rabatt berechnen, Stundenlohn Gehalt umrechnen, Entfernungspauschale, Spritkosten.
Group B, date and time: Tagerechner, Tage zwischen zwei Daten, Kalenderwoche, Feiertage 2026/2027 nach Bundesland, Altersrechner, Wochentag berechnen, Countdown, Uhrzeit umrechnen, Werktage berechnen, Schaltjahr.
Group C, health: BMI Rechner, Kalorienbedarf, Grundumsatz, Promillerechner, Wasserbedarf, Eisprung/Schwangerschaft (only with careful medical disclaimers).
Group D, files: PDF zusammenfügen, PDF komprimieren, PDF in Word, Word in PDF, JPG in PDF, PDF in JPG, Bild verkleinern, HEIC in JPG, WebP in JPG, QR Code Generator, Passwort Generator.
Group E, random and games: Zufallszahlengenerator, Lottozahlen, Würfel, Münze werfen, Namensrad, Wichteln.

## 5. Acceptance checklist for every PR

- [ ] `npx tsc --noEmit` passes; `next build --webpack` passes; `tsconfig.json` unchanged.
- [ ] New or changed calculators have documented reference cases (inputs, expected output, source).
- [ ] German strings reviewed: formal Sie, metric, decimal comma, no English fragments.
- [ ] `node scripts/gen-engine-namespaces.mjs` re-run if namespaces changed.
- [ ] Title, description, H1, intro and FAQs unique per page; canonical correct.
- [ ] No fabricated figures; every year-dependent number has year and source in its data file.
- [ ] Page works with JavaScript disabled for the static text, and with no network after load for the tool itself.
- [ ] PR description lists what was verified and what was not.

## 6. Questions the owner must answer

1. Operator name, address, e-mail for the Impressum.
2. Merge PR #5 and PR #6? (PDF tools)
3. Keep an English version? (decides T8)
4. Should US-only tools be removed or kept hidden (T5)?
5. Semrush: connector or CSV exports (section 3).
