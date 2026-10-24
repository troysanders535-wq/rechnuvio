# Keyword map (Rechnuvio, German market)

This is the working file for T1 of `rechnuvio.de-audit/GERMAN-LOCALIZATION-PLAN.md`.
It is the input for T2 (new calculators), T4 (German text), T6 (money pages) and
T7 (blog articles). The CSV next to this file is the machine-readable version.

## `docs/keyword-map.csv`

| column | meaning |
|---|---|
| `keyword` | the German search phrase |
| `volume_de` | monthly searches in Germany — **unverified** until Semrush data is supplied |
| `difficulty` | ranking difficulty — **unverified** until Semrush data is supplied |
| `intent` | `calculator`, `converter`, `generator` or `information` |
| `target_slug` | the one page that serves this keyword |
| `status` | `existing`, `rework`, `new` or `skip` |

**139 keywords, 139 distinct, 106 target pages. Every keyword points to exactly
one page** — that is the "done" criterion of T1.

| status | keywords | distinct pages | meaning |
|---|---|---|---|
| `existing` | 0 | 0 | the page already serves the keyword as it is |
| `rework` | 83 | 66 | the page exists and is the right one, but its German text, title or content has to be rewritten |
| `new` | 36 | 20 | the page does not exist yet and has to be built (T2) |
| `skip` | 20 | 20 | US-centric or duplicate; remove from the navigation, sitemap and the catalogue (T5) |

`existing` is empty on purpose: every page of the catalogue was machine
translated and none of them is ready for a German search today, so every
surviving page needs at least the T4 treatment.

## The volumes are not measured

There is no Semrush connector in this session and no export in `docs/semrush/`,
so **every volume and every difficulty is `unverified`**. The keyword list comes
from section 4 of the work order, which is explicitly marked as general
knowledge and not measured.

To make the file real, drop the Semrush exports of section 3 into
`docs/semrush/` and replace the two `unverified` columns. The keyword, target
and status columns stay as they are — they are a decision, not a measurement.

## The 20 pages that have to be built (T2)

`mehrwertsteuer-rechner`, `brutto-netto-rechner`, `zinsrechner`,
`zinseszinsrechner`, `kreditrechner`, `dreisatz-rechner`, `skonto-rechner`,
`entfernungspauschale-rechner`, `spritkosten-rechner`, `abiturnote-rechner`,
`afa-rechner`, `kalenderwoche-rechner`, `feiertage-rechner`,
`schaltjahr-rechner`, `urlaubstage-rechner`, `promille-rechner`, `word-to-pdf`,
`lottozahlen-generator`, `einheiten-umrechner`, `iban-pruefer`

That is the same list as the suggested order in the work order, plus
`schaltjahr-rechner`, `word-to-pdf`, `urlaubstage-rechner` and
`einheiten-umrechner`, which the section 4 keyword themes ask for.

## The pages that carry the most weight

Three keywords point at the same page, so these pages answer the most search
intent and need their content first (T6):

* `date-calculator` — Tagerechner, Datum berechnen, Wochentag berechnen
* `percentage-calculator` — Prozentrechner, Prozent berechnen
* `discount-calculator` — Rabatt Rechner, Rabatt berechnen

Two keywords each: `age-calculator`, `countdown-to-date`,
`military-time-converter`, `business-days-calculator`, `bmi-calculator`,
`merge-pdf`, `image-to-pdf`, `image-resizer`, `password-generator`,
`random-number-generator`, `coin-flip`, `secret-santa-generator`,
`word-counter`, `percentage-change-calculator`, `hours-calculator`.

## Duplicate pages that weaken the ranking

The catalogue contains families of pages that serve the same search intent.
They split the ranking power and they duplicate the content. They are listed
here because the keyword map has to point at **one** page per keyword.

Found by name signature (`node scripts/.cache/…` is scratch, the list is
hand-checked against the catalogue):

* PDF: `merge-pdf`, `pdf-merger`, `combine-pdf` — `compress-pdf`,
  `pdf-compressor`, `reduce-pdf-size` — `pdf-to-docx`, `pdf-to-word`,
  `pdf-to-word-converter` — `pdf-to-markdown`, `pdf-to-md`, `pdf-to-markdown-for-claude`
* Colour: `hex-to-rgb`, `hex-to-rgb-calculator`, `hex-rgb-converter`,
  `rgb-to-hex`, `rgb-to-hex-calculator`, `rgb-hex-converter` — six pages for
  two directions
* Format pairs that exist in both directions with a second wording:
  `markdown-to-pdf` / `markdown-to-pdf-converter`, `md-to-pdf`,
  `md-to-docx` / `markdown-to-docx`, `yaml-to-json` / `yaml-json-converter` /
  `yml-to-json`, `json-to-toon` / `json-to-toon-converter` / `toon-to-json`
* Text: `notepad-plus-plus-online` / `online-notepad` /
  `rapidtables-notepad-alternative` — `json-editor` / `json-viewer` —
  `markdown-file-viewer` / `markdown-viewer` / `markdown-editor` /
  `online-markdown-editor` / `markdown-wysiwyg-editor`
* Media: `favicon-generator` / `favicon-maker` / `svg-favicon-generator` —
  `og-image-generator` / `og-image-maker` — `quote-image-generator` /
  `quote-image-maker` / `quote-maker` — `webm-to-mp4` / `webm-to-mp4-converter`
* Random: `coin-flip` / `coin-flip-simulator` / `flip-a-coin` / `heads-or-tails`

The resolution belongs to T5: one page keeps the keyword, the others are
redirected (301) or removed from the catalogue and the sitemap.

## The pages that are skipped (T5)

The US-centric pages: the seven GPA tools, `thanksgiving-countdown`,
`thanksgiving-bingo`, `days-until-halloween`, `baby-shower-bingo`,
`white-elephant-generator`, `white-elephant-rules`, `yankee-swap-rules`,
`dirty-santa-rules`, `chicago-citation-generator`, `mla-citation-generator`,
`discord-username-generator`, `twitch-username-generator`,
`reddit-username-generator`.

`white-elephant-generator` is skipped while `secret-santa-generator` stays:
the German word for the game is *Wichteln*, and there is already a page for it.
`citation-generator`, `apa-citation-generator` and `harvard-citation-generator`
stay, because German universities use APA 7 and the work order asks for
*DIN ISO 690* to be added.

## How the map is used

* **T2** — every `new` row is a calculator to build. The row is the brief:
  the slug, the intent and the keywords that have to appear in the title, the
  H1 and the first paragraph.
* **T4** — every `rework` row is a page whose German text has to be
  rewritten; the keyword of the row is the phrase to build the title, the
  description and the `keywords` list from.
* **T6** — the 66 `rework` pages with the most keywords are the money pages
  that need 300 to 600 words of original German text.
* **T7** — the long-tail rows (*Prozent berechnen Beispiel*, *Mehrwertsteuer
  rausrechnen*, *Brutto Netto 2026*, *Kalenderwoche heute*, *Tage zwischen
  zwei Daten*) are the article titles.

## Open point for the owner

The keyword list is a German-language judgement, not a measurement. Before the
map is used to delete or rename pages, the Semrush exports of section 3 should
confirm that the phrases are actually searched. Until then the `skip` and
`new` rows are proposals, not measurements.
