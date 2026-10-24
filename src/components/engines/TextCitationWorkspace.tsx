"use client";

/**
 * Workspace for the citation tools:
 * citation-generator, apa-citation-generator, mla-citation-generator,
 * chicago-citation-generator and harvard-citation-generator.
 *
 * The dedicated slugs lock the workspace to one style, the generic slug can
 * show every style at once. All formatting happens in the browser.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Note,
  NumberInput,
  Panel,
  ResultBox,
  SelectInput,
  SectionTitle,
  TextArea,
  TextInput,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

type CiteStyle = "apa" | "mla" | "chicago" | "harvard";
type SourceType = "book" | "article" | "website";

interface CitationForm {
  authors: string;
  year: number;
  title: string;
  sourceType: SourceType;
  publisher: string;
  volume: string;
  issue: string;
  pages: string;
  edition: string;
  doi: string;
  month: string;
  day: string;
  place: string;
}

/** The style a dedicated slug is locked to. */
const SLUG_STYLE: Record<string, CiteStyle | undefined> = {
  "apa-citation-generator": "apa",
  "mla-citation-generator": "mla",
  "chicago-citation-generator": "chicago",
  "harvard-citation-generator": "harvard",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBREV = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];

/* --------------------------------------------------------------- helpers -- */

/** Split the author field into single names. */
function splitAuthors(raw: string): string[] {
  return raw
    .split(";")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** Split "Smith, John" into its surname and given names. */
function splitName(name: string): { last: string; first: string } {
  const comma = name.indexOf(",");
  if (comma >= 0) {
    const last = name.slice(0, comma).trim();
    const first = name.slice(comma + 1).trim();
    return { last, first };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { last: parts[0], first: "" };
  const last = parts[parts.length - 1];
  return { last, first: parts.slice(0, -1).join(" ") };
}

/** "John Ronald" -> "J. R." */
function initials(first: string): string {
  return first
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + ".")
    .join(" ");
}

/** APA style author list: "Smith, J., & Doe, J." */
function apaAuthors(raw: string): string {
  const names = splitAuthors(raw);
  const parts = names.map((name) => {
    const split = splitName(name);
    const ini = initials(split.first);
    return ini ? split.last + ", " + ini : split.last;
  });
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + ", & " + parts[1];
  return parts.slice(0, -1).join(", ") + ", & " + parts[parts.length - 1];
}

/** MLA and Chicago author list: "Smith, John, and Jane Doe." */
function narrativeAuthors(raw: string): string {
  const names = splitAuthors(raw);
  const parts = names.map((name, index) => {
    const split = splitName(name);
    if (index === 0) return split.first ? split.last + ", " + split.first : split.last;
    return split.first ? split.first + " " + split.last : split.last;
  });
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
}

/** Harvard author list: "Smith, J. and Doe, J." */
function harvardAuthors(raw: string): string {
  const names = splitAuthors(raw);
  const parts = names.map((name) => {
    const split = splitName(name);
    const ini = initials(split.first);
    return ini ? split.last + ", " + ini : split.last;
  });
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + " and " + parts[1];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

/** Index of a month name or number, -1 when it cannot be resolved. */
function monthIndex(raw: string): number {
  const value = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!value) return -1;
  const byName = MONTH_NAMES.findIndex((name) => name.toLowerCase() === value);
  if (byName >= 0) return byName;
  const byAbbr = MONTH_ABBREV.findIndex((name) => name.toLowerCase().replace(/\.$/, "") === value);
  if (byAbbr >= 0) return byAbbr;
  const numeric = parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) return numeric - 1;
  return -1;
}

function fullMonth(raw: string): string {
  const index = monthIndex(raw);
  return index >= 0 ? MONTH_NAMES[index] : raw.trim();
}

function shortMonth(raw: string): string {
  const index = monthIndex(raw);
  return index >= 0 ? MONTH_ABBREV[index] : raw.trim();
}

/** "2nd" -> "2nd", "2nd ed." -> "2nd" */
function cleanEdition(raw: string): string {
  return raw.trim().replace(/\s*ed\.?$/i, "");
}

/** Collapse repeated whitespace and trim the finished citation. */
function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------- style builders -- */

function buildApa(form: CitationForm): string {
  const author = apaAuthors(form.authors);
  const year = form.year > 0 ? String(form.year) : "n.d.";
  const title = form.title.trim();
  const url = form.doi.trim();
  const blocks: string[] = [];

  if (form.sourceType === "article") {
    const volume = form.volume.trim();
    const issue = form.issue.trim();
    const volumeIssue = volume ? (issue ? volume + "(" + issue + ")" : volume) : "";
    const tail = [form.publisher.trim(), volumeIssue, form.pages.trim()].filter(Boolean).join(", ");
    blocks.push(author + " (" + year + ").");
    if (title) blocks.push(title + ".");
    if (tail) blocks.push(tail + ".");
  } else if (form.sourceType === "website") {
    const month = form.month.trim();
    const day = form.day.trim();
    let stamp = year;
    if (month && day) stamp = year + ", " + month + " " + day;
    else if (month) stamp = year + ", " + month;
    blocks.push(author + " (" + stamp + ").");
    if (title) blocks.push(title + ".");
    if (form.publisher.trim()) blocks.push(form.publisher.trim() + ".");
  } else {
    const edition = cleanEdition(form.edition);
    blocks.push(author + " (" + year + ").");
    if (title) blocks.push(edition ? title + " (" + edition + " ed.)." : title + ".");
    if (form.publisher.trim()) blocks.push(form.publisher.trim() + ".");
  }

  let out = blocks.filter(Boolean).join(" ");
  if (url) out += " " + url;
  return tidy(out);
}

function buildMla(form: CitationForm): string {
  const author = narrativeAuthors(form.authors);
  const year = form.year > 0 ? String(form.year) : "";
  const title = form.title.trim();
  const url = form.doi.trim();
  const blocks: string[] = [];

  if (form.sourceType === "article") {
    const volume = form.volume.trim();
    const issue = form.issue.trim();
    const pages = form.pages.trim();
    const tail = [
      form.publisher.trim(),
      volume ? "vol. " + volume : "",
      issue ? "no. " + issue : "",
      year,
      pages ? "pp. " + pages : "",
    ]
      .filter(Boolean)
      .join(", ");
    blocks.push(author + ".");
    if (title) blocks.push('"' + title + '."');
    if (tail) blocks.push(tail + ".");
  } else if (form.sourceType === "website") {
    const day = form.day.trim();
    const month = shortMonth(form.month);
    const date = [day, month, year].filter(Boolean).join(" ");
    const tail = [form.publisher.trim(), date, url].filter(Boolean).join(", ");
    blocks.push(author + ".");
    if (title) blocks.push('"' + title + '."');
    if (tail) blocks.push(tail + ".");
  } else {
    const edition = cleanEdition(form.edition);
    const tail = [
      edition ? edition + " ed." : "",
      form.publisher.trim(),
      year,
    ]
      .filter(Boolean)
      .join(", ");
    blocks.push(author + ".");
    if (title) blocks.push(title + ".");
    if (tail) blocks.push(tail + ".");
  }

  let out = blocks.filter(Boolean).join(" ");
  if (url && form.sourceType !== "website") out += " " + url;
  return tidy(out);
}

function buildChicago(form: CitationForm): string {
  const author = narrativeAuthors(form.authors);
  const year = form.year > 0 ? String(form.year) : "";
  const title = form.title.trim();
  const url = form.doi.trim();
  const blocks: string[] = [];

  if (form.sourceType === "article") {
    const volume = form.volume.trim();
    const issue = form.issue.trim();
    const pages = form.pages.trim();
    let journal = form.publisher.trim();
    if (volume) journal += " " + volume;
    if (issue) journal += " (" + issue + ")";
    if (pages) journal += ": " + pages;
    blocks.push(author + ".");
    if (year) blocks.push(year + ".");
    if (title) blocks.push('"' + title + '."');
    if (journal) blocks.push(journal + ".");
  } else if (form.sourceType === "website") {
    const day = form.day.trim();
    const month = fullMonth(form.month);
    const date = [month, day].filter(Boolean).join(" ");
    blocks.push(author + ".");
    if (year) blocks.push(year + ".");
    if (title) blocks.push('"' + title + '."');
    if (form.publisher.trim()) blocks.push(form.publisher.trim() + ".");
    if (date) blocks.push(date + ".");
    if (url) blocks.push(url + ".");
  } else {
    const edition = cleanEdition(form.edition);
    const place = form.place.trim();
    const publisher = form.publisher.trim();
    blocks.push(author + ".");
    if (year) blocks.push(year + ".");
    if (title) blocks.push(title + ".");
    if (edition) blocks.push(edition + " ed.");
    if (place && publisher) blocks.push(place + ": " + publisher + ".");
    else if (publisher) blocks.push(publisher + ".");
  }

  let out = blocks.filter(Boolean).join(" ");
  if (url && form.sourceType !== "website") out += " " + url;
  return tidy(out);
}

function buildHarvard(form: CitationForm): string {
  const author = harvardAuthors(form.authors);
  const year = form.year > 0 ? String(form.year) : "";
  const title = form.title.trim();
  const url = form.doi.trim();
  const blocks: string[] = [];

  if (form.sourceType === "article") {
    const volume = form.volume.trim();
    const issue = form.issue.trim();
    const volumeIssue = volume ? (issue ? volume + "(" + issue + ")" : volume) : "";
    const tail = [
      form.publisher.trim(),
      volumeIssue,
      form.pages.trim() ? "pp. " + form.pages.trim() : "",
    ]
      .filter(Boolean)
      .join(", ");
    blocks.push(author);
    blocks.push(year ? "(" + year + ")" : "(n.d.)");
    if (title) blocks.push("'" + title + "',");
    if (tail) blocks.push(tail + ".");
  } else if (form.sourceType === "website") {
    const day = form.day.trim();
    const month = fullMonth(form.month);
    const accessed = [day, month, year].filter(Boolean).join(" ");
    blocks.push(author);
    blocks.push(year ? "(" + year + ")" : "(n.d.)");
    if (title) blocks.push(title + ".");
    if (form.publisher.trim()) blocks.push(form.publisher.trim() + ".");
    if (url) {
      blocks.push("Available at: " + url);
      if (accessed) blocks.push("(Accessed: " + accessed + ").");
    }
  } else {
    const edition = cleanEdition(form.edition);
    const place = form.place.trim();
    const publisher = form.publisher.trim();
    blocks.push(author);
    blocks.push(year ? "(" + year + ")" : "(n.d.)");
    if (title) blocks.push(edition ? title + " (" + edition + " ed.)." : title + ".");
    if (place && publisher) blocks.push(place + ": " + publisher + ".");
    else if (publisher) blocks.push(publisher + ".");
  }

  let out = blocks.filter(Boolean).join(" ");
  if (url && form.sourceType !== "website") out += " " + url;
  return tidy(out);
}

/* -------------------------------------------------------------- BibTeX -- */

function bibtexKey(form: CitationForm): string {
  const names = splitAuthors(form.authors);
  const surname = names.length ? splitName(names[0]).last : "";
  const word = form.title.trim().split(/\s+/)[0] ?? "";
  const parts = [
    surname.replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "entry",
    form.year > 0 ? String(form.year) : "",
    word.replace(/[^A-Za-z0-9]/g, "").toLowerCase(),
  ];
  return parts.join("");
}

function buildBibtex(form: CitationForm): string {
  const type = form.sourceType === "article" ? "article" : form.sourceType === "website" ? "misc" : "book";
  const authors = splitAuthors(form.authors).join(" and ");
  const fields: string[] = [];

  if (authors) fields.push("  author = {" + authors + "}");
  if (form.title.trim()) fields.push("  title = {" + form.title.trim() + "}");
  if (form.year > 0) fields.push("  year = {" + form.year + "}");
  if (form.sourceType === "article") {
    if (form.publisher.trim()) fields.push("  journal = {" + form.publisher.trim() + "}");
    if (form.volume.trim()) fields.push("  volume = {" + form.volume.trim() + "}");
    if (form.issue.trim()) fields.push("  number = {" + form.issue.trim() + "}");
    if (form.pages.trim()) fields.push("  pages = {" + form.pages.trim() + "}");
  } else if (form.sourceType === "website") {
    if (form.publisher.trim()) fields.push("  howpublished = {" + form.publisher.trim() + "}");
    if (form.month.trim()) fields.push("  month = {" + fullMonth(form.month) + "}");
  } else {
    if (form.publisher.trim()) fields.push("  publisher = {" + form.publisher.trim() + "}");
    if (form.edition.trim()) fields.push("  edition = {" + cleanEdition(form.edition) + "}");
    if (form.place.trim()) fields.push("  address = {" + form.place.trim() + "}");
  }
  if (form.doi.trim()) fields.push("  url = {" + form.doi.trim() + "}");

  return "@" + type + "{" + bibtexKey(form) + ",\n" + fields.join(",\n") + "\n}";
}

/** Extract the known fields from a pasted BibTeX entry. */
function parseBibtex(raw: string): Partial<CitationForm> {
  const out: Partial<CitationForm> = {};
  const entry = /@\s*([A-Za-z]+)\s*[{(]/.exec(raw);
  if (entry) {
    const kind = entry[1].toLowerCase();
    if (kind === "article") out.sourceType = "article";
    else if (kind === "book" || kind === "inproceedings" || kind === "incollection") out.sourceType = "book";
    else if (kind === "misc" || kind === "online" || kind === "webpage" || kind === "www") out.sourceType = "website";
  }

  const field = /([A-Za-z]+)\s*=\s*[{"]([^}]*)[}"]/g;
  let match = field.exec(raw);
  while (match) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (value) {
      if (key === "author") out.authors = value.split(/\s+and\s+/i).join("; ");
      else if (key === "year") out.year = parseInt(value, 10) || 0;
      else if (key === "title") out.title = value;
      else if (key === "journal") {
        out.sourceType = "article";
        out.publisher = value;
      } else if (key === "booktitle") {
        out.sourceType = "book";
        out.publisher = value;
      } else if (key === "volume") out.volume = value;
      else if (key === "number") out.issue = value;
      else if (key === "pages") out.pages = value;
      else if (key === "publisher") out.publisher = value;
      else if (key === "edition") out.edition = value;
      else if (key === "address" || key === "location") out.place = value;
      else if (key === "url" || key === "doi") out.doi = value;
    }
    match = field.exec(raw);
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlParagraphs(lines: string[]): string {
  return lines.map((line) => "<p>" + escapeHtml(line) + "</p>").join("");
}

/* ------------------------------------------------------------ component -- */

export function TextCitationWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextCitationWorkspace");
  const [authors, setAuthors] = useState(tUi("smithJohn"));
  const [year, setYear] = useState(2020);
  const [title, setTitle] = useState(tUi("theBookTitle"));
  const [sourceType, setSourceType] = useState<SourceType>("book");
  const [publisher, setPublisher] = useState(tUi("acmePress"));
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");
  const [pages, setPages] = useState("");
  const [edition, setEdition] = useState("");
  const [doi, setDoi] = useState("");
  const [month, setMonth] = useState(tUi("march"));
  const [day, setDay] = useState(5);
  const [place, setPlace] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<CiteStyle>("apa");
  const [showAll, setShowAll] = useState(true);
  const [bibOpen, setBibOpen] = useState(false);
  const [bibInput, setBibInput] = useState("");

  const lockedStyle = SLUG_STYLE[slug] ?? null;
  const form: CitationForm = {
    authors,
    year,
    title,
    sourceType,
    publisher,
    volume,
    issue,
    pages,
    edition,
    doi,
    month,
    day: day > 0 ? String(day) : "",
    place,
  };

  const citations: Record<CiteStyle, string> = {
    apa: buildApa(form),
    mla: buildMla(form),
    chicago: buildChicago(form),
    harvard: buildHarvard(form),
  };

  const bibtex = buildBibtex(form);
  const shownCitations = lockedStyle
    ? [citations[lockedStyle]]
    : showAll
      ? [citations.apa, citations.mla, citations.chicago, citations.harvard]
      : [citations[selectedStyle]];
  const txtContent = shownCitations.join("\n");
  const docContent =
    "<html><head><meta charset=\"utf-8\"><title>Citations</title></head><body>" +
    htmlParagraphs(shownCitations) +
    "</body></html>";

  const handleParseBib = () => {
    const parsed = parseBibtex(bibInput);
    if (parsed.authors !== undefined) setAuthors(parsed.authors);
    if (parsed.year !== undefined) setYear(parsed.year);
    if (parsed.title !== undefined) setTitle(parsed.title);
    if (parsed.sourceType !== undefined) setSourceType(parsed.sourceType);
    if (parsed.publisher !== undefined) setPublisher(parsed.publisher);
    if (parsed.volume !== undefined) setVolume(parsed.volume);
    if (parsed.issue !== undefined) setIssue(parsed.issue);
    if (parsed.pages !== undefined) setPages(parsed.pages);
    if (parsed.edition !== undefined) setEdition(parsed.edition);
    if (parsed.place !== undefined) setPlace(parsed.place);
    if (parsed.doi !== undefined) setDoi(parsed.doi);
  };

  const styleName = lockedStyle ?? selectedStyle;

  return (
    <div className="space-y-4">
      <Panel>
        <Toolbar>
          <SectionTitle>{tUi("citationDetails")}</SectionTitle>
          <ButtonGroup>
            <DownloadButton
              filename="citations.txt"
              content={txtContent}
              mime="text/plain"
              label={tUi("downloadTxt")}
            />
            <DownloadButton
              filename="citations.doc"
              content={docContent}
              mime="application/msword"
              label={tUi("downloadDoc")}
            />
            <DownloadButton
              filename="citation.bib"
              content={bibtex}
              mime="application/x-bibtex"
              label={tUi("downloadBib")}
            />
          </ButtonGroup>
        </Toolbar>
        <TwoColumn>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <Field label={tUi("authorS")} htmlFor="citation-authors">
              <TextInput
                id="citation-authors"
                value={authors}
                onChange={setAuthors}
                placeholder={tUi("smithJohnDoeJane")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tUi("year")} htmlFor="citation-year">
                <NumberInput id="citation-year" value={year} onChange={setYear} min={0} />
              </Field>
              <Field label={tUi("sourceType")} htmlFor="citation-source-type">
                <SelectInput
                  id="citation-source-type"
                  value={sourceType}
                  onChange={(value) => setSourceType(value as SourceType)}
                  options={[
                    { value: "book", label: tUi("book") },
                    { value: "article", label: tUi("journalArticle") },
                    { value: "website", label: tUi("website") },
                  ]}
                />
              </Field>
            </div>
            <Field label={tUi("title")} htmlFor="citation-title">
              <TextInput
                id="citation-title"
                value={title}
                onChange={setTitle}
                placeholder={tUi("theBookTitle")}
              />
            </Field>
            <Field
              label={
                sourceType === "article"
                  ? tUi("journalName")
                  : sourceType === "website"
                    ? tUi("websiteName")
                    : tUi("publisher")
              }
              htmlFor="citation-publisher"
            >
              <TextInput
                id="citation-publisher"
                value={publisher}
                onChange={setPublisher}
                placeholder={tUi("acmePress")}
              />
            </Field>
            {sourceType === "article" && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={tUi("volume")} htmlFor="citation-volume">
                  <TextInput id="citation-volume" value={volume} onChange={setVolume} />
                </Field>
                <Field label={tUi("issue")} htmlFor="citation-issue">
                  <TextInput id="citation-issue" value={issue} onChange={setIssue} />
                </Field>
                <Field label={tUi("pages")} htmlFor="citation-pages">
                  <TextInput id="citation-pages" value={pages} onChange={setPages} />
                </Field>
              </div>
            )}
            {sourceType === "book" && (
              <Field label={tUi("edition")} htmlFor="citation-edition">
                <TextInput
                  id="citation-edition"
                  value={edition}
                  onChange={setEdition}
                  placeholder="2nd"
                />
              </Field>
            )}
            {sourceType === "website" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={tUi("month")} htmlFor="citation-month">
                  <TextInput
                    id="citation-month"
                    value={month}
                    onChange={setMonth}
                    placeholder={tUi("march")}
                  />
                </Field>
                <Field label={tUi("day")} htmlFor="citation-day">
                  <NumberInput id="citation-day" value={day} onChange={setDay} min={0} max={31} />
                </Field>
              </div>
            )}
            <Field label={tUi("place")} htmlFor="citation-place">
              <TextInput
                id="citation-place"
                value={place}
                onChange={setPlace}
                placeholder={tUi("london")}
              />
            </Field>
            <Field label={tUi("dOIOrURL")} htmlFor="citation-doi">
              <TextInput
                id="citation-doi"
                value={doi}
                onChange={setDoi}
                placeholder="https://example.com"
              />
            </Field>
          </form>

          <div className="space-y-3">
            {lockedStyle === null && (
              <>
                <Field label={tUi("citationStyle")} htmlFor="citation-style">
                  <SelectInput
                    id="citation-style"
                    value={selectedStyle}
                    onChange={(value) => setSelectedStyle(value as CiteStyle)}
                    options={[
                      { value: "apa", label: "APA 7" },
                      { value: "mla", label: "MLA 9" },
                      { value: "chicago", label: "Chicago 17" },
                      { value: "harvard", label: "Harvard" },
                    ]}
                  />
                </Field>
                <Checkbox
                  id="citation-show-all"
                  checked={showAll}
                  onChange={setShowAll}
                  label={tUi("showAllStyles")}
                />
              </>
            )}

            {lockedStyle !== null && (
              <SectionTitle>
                {lockedStyle === "apa"
                  ? tUi("aPA7")
                  : lockedStyle === "mla"
                    ? tUi("mLA9")
                    : lockedStyle === "chicago"
                      ? tUi("chicago17AuthorDate")
                      : tUi("harvard")}
              </SectionTitle>
            )}

            {lockedStyle !== null && (
              <div className="space-y-2">
                <ResultBox value={citations[lockedStyle]} rows={4} />
                <ButtonGroup>
                  <CopyButton
                    value={citations[lockedStyle]}
                    label={tUi("copy")}
                  />
                </ButtonGroup>
              </div>
            )}

            {lockedStyle === null && showAll && (
              <div className="space-y-3">
                <SectionTitle>{tUi("allStyles")}</SectionTitle>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {tUi("aPA7")}
                    </span>
                    <CopyButton value={citations.apa} label={tUi("copy")} />
                  </div>
                  <ResultBox value={citations.apa} rows={3} />
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {tUi("mLA9")}
                    </span>
                    <CopyButton value={citations.mla} label={tUi("copy")} />
                  </div>
                  <ResultBox value={citations.mla} rows={3} />
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {tUi("chicago17AuthorDate")}
                    </span>
                    <CopyButton value={citations.chicago} label={tUi("copy")} />
                  </div>
                  <ResultBox value={citations.chicago} rows={3} />
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {tUi("harvard")}
                    </span>
                    <CopyButton value={citations.harvard} label={tUi("copy")} />
                  </div>
                  <ResultBox value={citations.harvard} rows={3} />
                </div>
              </div>
            )}

            {lockedStyle === null && !showAll && (
              <div className="space-y-2">
                <SectionTitle>
                  {styleName === "apa"
                    ? tUi("aPA7")
                    : styleName === "mla"
                      ? tUi("mLA9")
                      : styleName === "chicago"
                        ? tUi("chicago17AuthorDate")
                        : tUi("harvard")}
                </SectionTitle>
                <ResultBox value={citations[selectedStyle]} rows={4} />
                <ButtonGroup>
                  <CopyButton
                    value={citations[selectedStyle]}
                    label={tUi("copy")}
                  />
                </ButtonGroup>
              </div>
            )}
          </div>
        </TwoColumn>
        <Note>
          {tUi("separateSeveralAuthorsWithASemicolon")}
        </Note>
      </Panel>

      <Panel>
        <Toolbar>
          <SectionTitle>{tUi("bibTeX")}</SectionTitle>
          <ButtonGroup>
            <ActionButton
              onClick={() => setBibOpen((open) => !open)}
              variant={bibOpen ? "primary" : "default"}
            >
              {bibOpen ? tUi("hideBibTeXImport") : tUi("importBibTeX")}
            </ActionButton>
            <CopyButton value={bibtex} label={tUi("copyBibTeX")} />
          </ButtonGroup>
        </Toolbar>
        {bibOpen && (
          <div className="space-y-3 p-4">
            <Field label={tUi("pasteABibTeXEntry")} htmlFor="citation-bibtex">
              <TextArea
                id="citation-bibtex"
                value={bibInput}
                onChange={setBibInput}
                rows={7}
                placeholder="@article{smith2020, author = {Smith, John}, title = {The Article Title}, year = {2020}}"
              />
            </Field>
            <ButtonGroup>
              <ActionButton onClick={handleParseBib} variant="primary">
                {tUi("parseBibTeX")}
              </ActionButton>
            </ButtonGroup>
            <Note>
              {tUi("parsingReadsTheAuthorYearTitleJournalOrBookTitleFields")}
            </Note>
          </div>
        )}
      </Panel>
    </div>
  );
}
