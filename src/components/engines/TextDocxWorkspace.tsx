"use client";

/**
 * Workspace for the Word (.docx) tools of the text suite:
 *
 *   accept-all-changes-in-word - accept every tracked change of a document
 *   remove-comments-from-word  - drop the comments or clear their authors
 *   word-to-html                - semantic HTML out of a .docx
 *   word-viewer                 - read a .docx, count it, save it as PDF
 *
 * A .docx file is a ZIP archive. It is unpacked with JSZip, the XML parts are
 * rewritten with the browser DOMParser and packed again. Everything happens in
 * the browser - no upload, no server call, nothing is written to storage.
 */

import { useCallback, useState } from "react";
import JSZip from "jszip";
import mammoth from "mammoth";
import { jsPDF } from "jspdf";
import { useTranslations } from "next-intl";
import {
  ActionButton,
  ButtonGroup,
  CopyButton,
  DownloadButton,
  Field,
  FilePicker,
  Note,
  Panel,
  ResultBox,
  SectionTitle,
  SelectInput,
  StatCard,
  StatGrid,
  TextArea,
  Toolbar,
  TwoColumn,
} from "@/components/engines/TextKit";

/* ==== helpers-start ==== */

/** Namespace of the WordprocessingML elements. */
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Records of a formatting change - dropped when the change is accepted. */
const FORMAT_CHANGE_TAGS = [
  "w:rPrChange",
  "w:pPrChange",
  "w:tblPrChange",
  "w:tcPrChange",
  "w:trPrChange",
  "w:sectPrChange",
  "w:tblPrExChange",
];

/** Range markers that only exist because of tracked changes. */
const REVISION_MARKER_TAGS = [
  "w:moveFromRangeStart",
  "w:moveFromRangeEnd",
  "w:moveToRangeStart",
  "w:moveToRangeEnd",
  "w:customXmlInsRangeStart",
  "w:customXmlInsRangeEnd",
  "w:customXmlDelRangeStart",
  "w:customXmlDelRangeEnd",
  "w:customXmlMoveFromRangeStart",
  "w:customXmlMoveFromRangeEnd",
  "w:customXmlMoveToRangeStart",
  "w:customXmlMoveToRangeEnd",
  "w:numberingChange",
  "w:cellIns",
  "w:cellDel",
  "w:cellMerge",
];

/** Anchors that point at a comment stored in word/comments.xml. */
const COMMENT_ANCHOR_TAGS = ["w:commentRangeStart", "w:commentRangeEnd", "w:commentReference"];

/**
 * Collect every element with the given tag name.
 *
 * The lookup is done twice: once on the namespace URI and once on the
 * qualified name. A real .docx declares the "w" prefix, so both queries find
 * the same elements - the namespace query also works for a part that uses a
 * different prefix.
 */
function findElements(root: Element, tag: string): Element[] {
  const local = tag.indexOf(":") >= 0 ? tag.slice(tag.indexOf(":") + 1) : tag;
  const found: Element[] = [];
  const seen = new Set<Element>();

  const add = (el: Element): void => {
    if (!seen.has(el)) {
      seen.add(el);
      found.push(el);
    }
  };

  const byNamespace = root.getElementsByTagNameNS("*", local);
  for (let i = 0; i < byNamespace.length; i += 1) {
    const el = byNamespace[i];
    if (el) add(el);
  }

  const byName = root.getElementsByTagName(tag);
  for (let i = 0; i < byName.length; i += 1) {
    const el = byName[i];
    if (el) add(el);
  }

  return found;
}

/** Replace an element by its own child nodes. */
function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/** Remove every element with one of the given tags; returns the count. */
function removeElements(root: Element, tags: string[]): number {
  let removed = 0;
  for (const tag of tags) {
    for (const el of findElements(root, tag)) {
      const parent = el.parentNode;
      if (!parent) continue;
      parent.removeChild(el);
      removed += 1;
    }
  }
  return removed;
}

/** True when the attribute belongs to the WordprocessingML namespace. */
function isWordAttribute(attr: Attr): boolean {
  if (attr.namespaceURI === WORD_NS) return true;
  return attr.name.indexOf("w:") === 0;
}

/** Collect the distinct reviewer names used in the part. */
function collectAuthorNames(root: Element): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    if (!el) continue;
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const local = attr.localName || attr.name;
      if (local !== "author" || !isWordAttribute(attr)) continue;
      const value = attr.value || "";
      if (value && !seen.has(value)) {
        seen.add(value);
        names.push(value);
      }
    }
  }
  return names;
}

/** Remove the reviewer name and the date from every revision element. */
function stripRevisionAttributes(root: Element): number {
  let cleared = 0;
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    if (!el) continue;
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const local = attr.localName || attr.name;
      if (local !== "author" && local !== "date") continue;
      if (!isWordAttribute(attr)) continue;
      el.removeAttribute(attr.name);
      cleared += 1;
    }
  }
  return cleared;
}

/** Parse an XML part; the result may be a parser error document. */
function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

/** True when the XML could not be parsed. */
function hasParseError(doc: Document): boolean {
  return doc.getElementsByTagName("parsererror").length > 0;
}

/** Serialize a parsed XML part back into text. */
function serializeXml(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

/** Read the plain text of a document part, one line per paragraph. */
function extractDocumentText(doc: Document): string {
  const root = doc.documentElement;
  if (!root) return "";
  const paragraphs = findElements(root, "w:p");
  if (!paragraphs.length) {
    return findElements(root, "w:t")
      .map((el) => el.textContent || "")
      .join("");
  }
  return paragraphs
    .map((p) =>
      findElements(p, "w:t")
        .map((el) => el.textContent || "")
        .join(""),
    )
    .join("\n");
}

/** Text content of the first element with the given tag. */
function elementText(doc: Document, tag: string): string {
  const root = doc.documentElement;
  if (!root) return "";
  const el = findElements(root, tag)[0];
  return el ? (el.textContent || "").trim() : "";
}

/** Clear the author and the initials of every comment. */
function clearCommentAuthors(root: Element): number {
  let cleared = 0;
  for (const comment of findElements(root, "w:comment")) {
    for (const name of ["w:author", "w:initials"]) {
      if (comment.hasAttribute(name)) {
        comment.removeAttribute(name);
        cleared += 1;
      }
    }
  }
  return cleared;
}

/** Remove the relationships whose type matches the given needle. */
function removeRelationshipByType(root: Element, needle: string): number {
  let removed = 0;
  for (const rel of findElements(root, "Relationship")) {
    const type = rel.getAttribute("Type") || "";
    if (type.indexOf(needle) < 0) continue;
    const parent = rel.parentNode;
    if (!parent) continue;
    parent.removeChild(rel);
    removed += 1;
  }
  return removed;
}

/** Remove the content type overrides of the given part name. */
function removeContentTypeOverride(root: Element, partName: string): number {
  let removed = 0;
  for (const item of findElements(root, "Override")) {
    const part = item.getAttribute("PartName") || "";
    if (part.indexOf(partName) < 0) continue;
    const parent = item.parentNode;
    if (!parent) continue;
    parent.removeChild(item);
    removed += 1;
  }
  return removed;
}

/** Read a file into an ArrayBuffer. */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsArrayBuffer(file);
  });
}

/** Read one XML part out of a .docx archive. */
async function loadDocxPart(zip: JSZip, part: string): Promise<string> {
  const entry = zip.file(part);
  if (!entry) throw new Error("missing-part");
  return entry.async("string");
}

/** Unzip a .docx file and read one XML part out of it. */
async function loadDocxXml(file: File, part: string): Promise<string> {
  const zip = await JSZip.loadAsync(await readFileAsArrayBuffer(file));
  return loadDocxPart(zip, part);
}

/**
 * Copy the archive and swap the given parts.
 *
 * The order of the entries is kept so that [Content_Types].xml stays the
 * first part of the package.
 */
async function rebuildArchive(
  zip: JSZip,
  replace: Record<string, string>,
  drop: string[],
): Promise<Blob> {
  const out = new JSZip();
  const names = Object.keys(zip.files);
  for (const name of names) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    if (drop.indexOf(name) >= 0) continue;
    if (Object.prototype.hasOwnProperty.call(replace, name)) {
      out.file(name, replace[name]);
      continue;
    }
    const content = await entry.async("uint8array");
    out.file(name, content);
  }
  return out.generateAsync({ type: "blob" });
}

/** Break plain text into lines of at most the given number of characters. */
function wrapPlainText(text: string, max: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= max) {
        line += " " + word;
      } else {
        lines.push(line);
        line = word;
      }
      while (line.length > max) {
        lines.push(line.slice(0, max));
        line = line.slice(max);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Result of accepting every tracked change of a document. */
interface AcceptOutcome {
  xml: string;
  text: string;
  reviewers: string[];
  insertions: number;
  deletions: number;
  moves: number;
  comments: number;
}

/**
 * Accept every tracked change of a parsed document part.
 *
 * Insertions and moved-to text are unwrapped, deletions and moved-from text
 * are dropped, formatting change records and revision markers are removed and
 * the reviewer names are cleared.
 */
function acceptTrackedChanges(doc: Document): AcceptOutcome {
  const root = doc.documentElement;
  const outcome: AcceptOutcome = {
    xml: "",
    text: "",
    reviewers: [],
    insertions: 0,
    deletions: 0,
    moves: 0,
    comments: 0,
  };
  if (!root) return outcome;

  outcome.reviewers = collectAuthorNames(root);

  for (const el of findElements(root, "w:del")) {
    const parent = el.parentNode;
    if (!parent) continue;
    parent.removeChild(el);
    outcome.deletions += 1;
  }

  for (const el of findElements(root, "w:moveFrom")) {
    const parent = el.parentNode;
    if (!parent) continue;
    parent.removeChild(el);
    outcome.moves += 1;
  }

  for (const el of findElements(root, "w:ins")) {
    if (!el.parentNode) continue;
    outcome.insertions += 1;
    unwrapElement(el);
  }

  for (const el of findElements(root, "w:moveTo")) {
    if (!el.parentNode) continue;
    outcome.moves += 1;
    unwrapElement(el);
  }

  removeElements(root, FORMAT_CHANGE_TAGS);
  outcome.comments = removeElements(root, COMMENT_ANCHOR_TAGS);
  removeElements(root, REVISION_MARKER_TAGS);
  stripRevisionAttributes(root);

  outcome.xml = serializeXml(doc);
  outcome.text = extractDocumentText(doc);
  return outcome;
}

/* ==== helpers-end ==== */

/* ------------------------------------------------------------------ state -- */

interface AcceptState {
  fileName: string;
  text: string;
  blob: Blob | null;
  reviewers: string[];
  insertions: number;
  deletions: number;
  moves: number;
  comments: number;
  error: string;
  busy: boolean;
}

interface CommentState {
  fileName: string;
  blob: Blob | null;
  commentsFound: number;
  commentsRemoved: number;
  namesCleared: number;
  error: string;
  busy: boolean;
}

interface HtmlState {
  fileName: string;
  html: string;
  messages: number;
  error: string;
  busy: boolean;
}

interface ViewState {
  fileName: string;
  html: string;
  text: string;
  words: number;
  characters: number;
  author: string;
  title: string;
  created: string;
  error: string;
  busy: boolean;
}

function blankAccept(error = ""): AcceptState {
  return {
    fileName: "",
    text: "",
    blob: null,
    reviewers: [],
    insertions: 0,
    deletions: 0,
    moves: 0,
    comments: 0,
    error,
    busy: false,
  };
}

function blankComment(error = ""): CommentState {
  return {
    fileName: "",
    blob: null,
    commentsFound: 0,
    commentsRemoved: 0,
    namesCleared: 0,
    error,
    busy: false,
  };
}

function blankHtml(error = ""): HtmlState {
  return { fileName: "", html: "", messages: 0, error, busy: false };
}

function blankView(error = ""): ViewState {
  return {
    fileName: "",
    html: "",
    text: "",
    words: 0,
    characters: 0,
    author: "",
    title: "",
    created: "",
    error,
    busy: false,
  };
}

/* -------------------------------------------------------------- component -- */

export function TextDocxWorkspace({ slug }: { slug: string }) {
  const tUi = useTranslations("ui.engines.TextDocxWorkspace");
  const [accept, setAccept] = useState<AcceptState>(blankAccept());
  const [comments, setComments] = useState<CommentState>(blankComment());
  const [commentMode, setCommentMode] = useState("remove");
  const [html, setHtml] = useState<HtmlState>(blankHtml());
  const [view, setView] = useState<ViewState>(blankView());

  const errorTexts: Record<string, string> = {
    readFailed: tUi("theFileCouldNotBeRead"),
    missingPart: tUi("thisDocxFileDoesNotContainTheExpectedWordPart"),
    invalidXml: tUi("theDocumentPartOfThisFileIsNotValidXML"),
    noComments: tUi("thisDocumentDoesNotContainAnyComments"),
    notConverted: tUi("thisFileCouldNotBeConverted"),
    notOpened: tUi("thisFileCouldNotBeOpened"),
    notProcessed: tUi("thisFileCouldNotBeProcessed"),
  };

  const describeError = (err: unknown, fallback: string): string => {
    if (err instanceof Error) {
      const known = errorTexts[err.message];
      if (known) return known;
    }
    return errorTexts[fallback] ?? errorTexts.notProcessed;
  };

  const onAcceptFile = async (file: File) => {
    setAccept({ ...blankAccept(), fileName: file.name, busy: true });
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(buffer);
      const doc = parseXml(await loadDocxPart(zip, "word/document.xml"));
      if (hasParseError(doc)) {
        throw new Error("invalid-xml");
      }

      const outcome = acceptTrackedChanges(doc);
      const replace: Record<string, string> = { "word/document.xml": outcome.xml };

      const commentsPart = zip.file("word/comments.xml");
      if (commentsPart) {
        const commentsDoc = parseXml(await commentsPart.async("string"));
        if (!hasParseError(commentsDoc) && commentsDoc.documentElement) {
          clearCommentAuthors(commentsDoc.documentElement);
          replace["word/comments.xml"] = serializeXml(commentsDoc);
        }
      }

      const blob = await rebuildArchive(zip, replace, []);
      setAccept({
        fileName: file.name,
        text: outcome.text,
        blob,
        reviewers: outcome.reviewers,
        insertions: outcome.insertions,
        deletions: outcome.deletions,
        moves: outcome.moves,
        comments: outcome.comments,
        error: "",
        busy: false,
      });
    } catch (err) {
      const message = describeError(err, "notProcessed");
      setAccept(blankAccept(message));
    }
  };

  const onCommentFile = async (file: File) => {
    setComments({ ...blankComment(), fileName: file.name, busy: true });
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(buffer);
      const replace: Record<string, string> = {};
      const drop: string[] = [];
      let commentsFound = 0;
      let commentsRemoved = 0;
      let namesCleared = 0;

      if (commentMode === "remove") {
        const doc = parseXml(await loadDocxPart(zip, "word/document.xml"));
        if (hasParseError(doc)) {
          throw new Error("invalid-xml");
        }
        commentsRemoved = removeElements(doc.documentElement, COMMENT_ANCHOR_TAGS);
        replace["word/document.xml"] = serializeXml(doc);

        if (zip.file("word/comments.xml")) {
          const commentsDoc = parseXml(await loadDocxPart(zip, "word/comments.xml"));
          if (!hasParseError(commentsDoc) && commentsDoc.documentElement) {
            commentsFound = findElements(commentsDoc.documentElement, "w:comment").length;
          }

          drop.push("word/comments.xml", "word/commentsExtended.xml", "word/commentsIds.xml");

          const rels = zip.file("word/_rels/document.xml.rels");
          if (rels) {
            const relsDoc = parseXml(await rels.async("string"));
            if (!hasParseError(relsDoc) && relsDoc.documentElement) {
              removeRelationshipByType(relsDoc.documentElement, "/comments");
              replace["word/_rels/document.xml.rels"] = serializeXml(relsDoc);
            }
          }

          const contentTypes = zip.file("[Content_Types].xml");
          if (contentTypes) {
            const typesDoc = parseXml(await contentTypes.async("string"));
            if (!hasParseError(typesDoc) && typesDoc.documentElement) {
              removeContentTypeOverride(typesDoc.documentElement, "/word/comments");
              replace["[Content_Types].xml"] = serializeXml(typesDoc);
            }
          }
        }
      } else {
        if (!zip.file("word/comments.xml")) {
          throw new Error("no-comments");
        }
        const commentsDoc = parseXml(await loadDocxPart(zip, "word/comments.xml"));
        if (hasParseError(commentsDoc) || !commentsDoc.documentElement) {
          throw new Error("invalid-xml");
        }
        commentsFound = findElements(commentsDoc.documentElement, "w:comment").length;
        namesCleared = clearCommentAuthors(commentsDoc.documentElement);
        replace["word/comments.xml"] = serializeXml(commentsDoc);
      }

      const blob = await rebuildArchive(zip, replace, drop);
      setComments({
        fileName: file.name,
        blob,
        commentsFound,
        commentsRemoved,
        namesCleared,
        error: "",
        busy: false,
      });
    } catch (err) {
      const message = describeError(err, "notProcessed");
      setComments(blankComment(message));
    }
  };

  const onHtmlFile = async (file: File) => {
    setHtml({ ...blankHtml(), fileName: file.name, busy: true });
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      setHtml({
        fileName: file.name,
        html: result.value,
        messages: result.messages.length,
        error: "",
        busy: false,
      });
    } catch (err) {
      const message = describeError(err, "notConverted");
      setHtml(blankHtml(message));
    }
  };

  const onViewFile = async (file: File) => {
    setView({ ...blankView(), fileName: file.name, busy: true });
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer: buffer }),
        mammoth.extractRawText({ arrayBuffer: buffer }),
      ]);

      const raw = textResult.value || "";
      const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;

      let author = "";
      let title = "";
      let created = "";
      try {
        const coreDoc = parseXml(await loadDocxXml(file, "docProps/core.xml"));
        author = elementText(coreDoc, "dc:creator");
        title = elementText(coreDoc, "dc:title");
        created = elementText(coreDoc, "dcterms:created");
      } catch {
        // the document carries no properties part
      }

      setView({
        fileName: file.name,
        html: htmlResult.value,
        text: raw,
        words,
        characters: raw.length,
        author,
        title,
        created,
        error: "",
        busy: false,
      });
    } catch (err) {
      const message = describeError(err, "notOpened");
      setView(blankView(message));
    }
  };

  const onSavePdf = useCallback(() => {
    if (!view.text.trim()) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = wrapPlainText(view.text, 95);
    let y = 56;
    for (const line of lines) {
      if (y > 800) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, 40, y);
      y += 14;
    }
    doc.save("document.pdf");
  }, [view.text]);

  const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const docxAccept = `.docx,${docxMime}`;

  return (
    <div className="space-y-4">
      {slug === "accept-all-changes-in-word" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("acceptAllTrackedChanges")}</SectionTitle>
            <ButtonGroup>
              <FilePicker
                id="accept-docx"
                accept={docxAccept}
                label={tUi("chooseDocx")}
                onFile={onAcceptFile}
              />
              {accept.blob && (
                <DownloadButton
                  filename="accepted-changes.docx"
                  content={accept.blob}
                  mime={docxMime}
                  label={tUi("download")}
                />
              )}
            </ButtonGroup>
          </Toolbar>
          {accept.busy && (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {tUi("readingTheDocumentAndAcceptingEveryTrackedChange")}
            </p>
          )}
          {accept.error && (
            <p className="px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {accept.error}
            </p>
          )}
          {accept.blob && (
            <>
              <StatGrid>
                <StatCard value={accept.insertions} label={tUi("insertionsAccepted")} tone="good" />
                <StatCard value={accept.deletions} label={tUi("deletionsRemoved")} tone="warn" />
                <StatCard value={accept.reviewers.length} label={tUi("reviewerNamesCleared")} />
                <StatCard value={accept.comments} label={tUi("commentAnchorsRemoved")} />
              </StatGrid>
              <TwoColumn>
                <div className="space-y-3">
                  <SectionTitle>{tUi("acceptedText")}</SectionTitle>
                  <TextArea value={accept.text} readOnly rows={14} />
                  <ButtonGroup>
                    <CopyButton value={accept.text} label={tUi("copy")} />
                  </ButtonGroup>
                </div>
                <div className="space-y-3">
                  <SectionTitle>{tUi("summary")}</SectionTitle>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <li>
                      <span className="font-semibold">{tUi("fileLabel")}:</span> {accept.fileName}
                    </li>
                    <li>
                      <span className="font-semibold">{tUi("insertionsAccepted")}:</span>{" "}
                      {accept.insertions}
                    </li>
                    <li>
                      <span className="font-semibold">{tUi("deletionsRemoved")}:</span>{" "}
                      {accept.deletions}
                    </li>
                    <li>
                      <span className="font-semibold">{tUi("movesAccepted")}:</span> {accept.moves}
                    </li>
                    <li>
                      <span className="font-semibold">{tUi("commentAnchorsRemoved")}:</span>{" "}
                      {accept.comments}
                    </li>
                    <li>
                      <span className="font-semibold">{tUi("reviewerNamesCleared")}:</span>{" "}
                      {accept.reviewers.length ? accept.reviewers.join(", ") : tUi("none")}
                    </li>
                  </ul>
                </div>
              </TwoColumn>
              <Note>
                {tUi("theDocumentIsUnpackedRewrittenAndPackedAgainInYourBrowser")}
              </Note>
            </>
          )}
        </Panel>
      )}

      {slug === "remove-comments-from-word" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("removeCommentsFromWord")}</SectionTitle>
            <ButtonGroup>
              <FilePicker
                id="comments-docx"
                accept={docxAccept}
                label={tUi("chooseDocx")}
                onFile={onCommentFile}
              />
              {comments.blob && (
                <DownloadButton
                  filename="comments-removed.docx"
                  content={comments.blob}
                  mime={docxMime}
                  label={tUi("download")}
                />
              )}
            </ButtonGroup>
          </Toolbar>
          <TwoColumn>
            <div className="space-y-3">
              <Field label={tUi("whatShouldHappen")} htmlFor="comment-mode">
                <SelectInput
                  id="comment-mode"
                  value={commentMode}
                  onChange={setCommentMode}
                  options={[
                    { value: "remove", label: tUi("removeAllComments") },
                    { value: "keep", label: tUi("keepCommentsClearReviewerNames") },
                  ]}
                />
              </Field>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {tUi("removingTheCommentsAlsoDropsTheCommentPart")}
              </p>
            </div>
            <div className="space-y-3">
              {comments.busy && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tUi("rewritingTheDocument")}
                </p>
              )}
              {comments.error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {comments.error}
                </p>
              )}
              {comments.blob && (
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li>
                    <span className="font-semibold">{tUi("fileLabel")}:</span>{" "}
                    {comments.fileName}
                  </li>
                  <li>
                    <span className="font-semibold">{tUi("commentsFound")}:</span>{" "}
                    {comments.commentsFound}
                  </li>
                  <li>
                    <span className="font-semibold">{tUi("commentAnchorsRemoved")}:</span>{" "}
                    {comments.commentsRemoved}
                  </li>
                  <li>
                    <span className="font-semibold">{tUi("reviewerNamesCleared")}:</span>{" "}
                    {comments.namesCleared}
                  </li>
                </ul>
              )}
            </div>
          </TwoColumn>
          <Note>
            {tUi("nothingIsUploadedTheDocxFileIsOpenedRewrittenAndPackedAgain")}
          </Note>
        </Panel>
      )}

      {slug === "word-to-html" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("wordToHTML")}</SectionTitle>
            <ButtonGroup>
              <FilePicker
                id="html-docx"
                accept={docxAccept}
                label={tUi("chooseDocx")}
                onFile={onHtmlFile}
              />
              {html.html && (
                <>
                  <CopyButton value={html.html} label={tUi("copy")} />
                  <DownloadButton
                    filename="document.html"
                    content={html.html}
                    mime="text/html"
                    label={tUi("download")}
                  />
                </>
              )}
            </ButtonGroup>
          </Toolbar>
          {html.busy && (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {tUi("convertingTheDocument")}
            </p>
          )}
          {html.error && (
            <p className="px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {html.error}
            </p>
          )}
          {html.html && (
            <>
              <StatGrid>
                <StatCard value={html.html.length} label={tUi("hTMLCharacters")} />
                <StatCard value={html.messages} label={tUi("conversionNotes")} />
              </StatGrid>
              <TwoColumn>
                <div className="space-y-3">
                  <SectionTitle>{tUi("hTMLSource")}</SectionTitle>
                  <ResultBox value={html.html} rows={16} />
                </div>
                <div className="space-y-3">
                  <SectionTitle>{tUi("preview")}</SectionTitle>
                  <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div
                      className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 [&_a]:text-sky-600 [&_a]:underline [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
                      dangerouslySetInnerHTML={{ __html: html.html }}
                    />
                  </div>
                </div>
              </TwoColumn>
              {html.messages > 0 && (
                <Note>
                  {html.messages === 1
                    ? tUi("theConverterReportedOneNote", { count: String(html.messages) })
                    : tUi("theConverterReportedSeveralNotes", { count: String(html.messages) })}
                </Note>
              )}
            </>
          )}
        </Panel>
      )}

      {slug === "word-viewer" && (
        <Panel>
          <Toolbar>
            <SectionTitle>{tUi("wordViewer")}</SectionTitle>
            <ButtonGroup>
              <FilePicker
                id="viewer-docx"
                accept={docxAccept}
                label={tUi("chooseDocx")}
                onFile={onViewFile}
              />
              {view.text && (
                <>
                  <CopyButton value={view.text} label={tUi("copyText")} />
                  <ActionButton variant="primary" onClick={onSavePdf}>
                    {tUi("saveAsPDF")}
                  </ActionButton>
                </>
              )}
            </ButtonGroup>
          </Toolbar>
          {view.busy && (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {tUi("openingTheDocument")}
            </p>
          )}
          {view.error && (
            <p className="px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {view.error}
            </p>
          )}
          {view.html && (
            <>
              <StatGrid>
                <StatCard value={view.words} label={tUi("words")} />
                <StatCard value={view.characters} label={tUi("characters")} />
                <StatCard value={view.author || "-"} label={tUi("author")} />
                <StatCard value={view.title || "-"} label={tUi("title")} />
              </StatGrid>
              <div className="space-y-3 p-4">
                {view.created && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tUi("createdLabel")}: {view.created}
                  </p>
                )}
                <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div
                    className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 [&_a]:text-sky-600 [&_a]:underline [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{ __html: view.html }}
                  />
                </div>
              </div>
              <Note>
                {tUi("theDocumentStaysOnYourComputerNothingIsUploadedThePDFIsGeneratedInYourBrowser")}
              </Note>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
