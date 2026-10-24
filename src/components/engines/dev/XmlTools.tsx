"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  DevClearButton,
  DevCopyButton,
  DevEditor,
  DevError,
  DevOk,
  DevOutput,
  DevPanel,
  devButtonClass,
} from "./DevKit";

/**
 * XML and XSD workspaces.
 *
 * The parsing is done with the browser's own DOMParser, so nothing is uploaded
 * and no library is needed: the same parser that renders the page reports
 * whether the document is well formed.
 */

type XmlVariant = "format" | "validate" | "view" | "xsd-editor" | "xsd-schema" | "xsd-elements";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><price>44.95</price></book><book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><price>45.95</price></book></catalog>`;

const SAMPLE_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="catalog">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="book" maxOccurs="unbounded">
          <xs:complexType>
            <xs:simpleContent>
              <xs:extension base="xs:string">
                <xs:attribute name="id" type="xs:string" use="required"/>
              </xs:extension>
            </xs:simpleContent>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

/** Parse an XML document with the browser parser. */
export function parseXml(text: string): {
  doc: XMLDocument | null;
  error: string;
} {
  if (!text.trim()) return { doc: null, error: "" };
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const failure = doc.getElementsByTagName("parsererror")[0];
    if (failure) {
      const message = (failure.textContent || "").replace(/\s+/g, " ").trim();
      return { doc: null, error: message };
    }
    return { doc, error: "" };
  } catch (err) {
    return { doc: null, error: String((err as Error)?.message || err) };
  }
}

/** Indent an XML document, keeping the text content of every element. */
export function formatXml(text: string, indent = "  "): string {
  const { doc, error } = parseXml(text);
  if (!doc || error) return text;

  const lines: string[] = [];
  const declaration = doc.firstChild;
  const root = doc.documentElement;
  if (!root) return text;

  const attrs = Array.from(root.attributes)
    .map((a) => ` ${a.name}="${a.value}"`)
    .join("");
  lines.push(`<${root.nodeName}${attrs}>`);

  const walk = (node: Node, depth: number) => {
    const children = Array.from(node.childNodes).filter(
      (c) => !(c.nodeType === 3 && !(c.textContent || "").trim()),
    );
    for (const child of children) {
      if (child.nodeType === 1) {
        const element = child as Element;
        const childAttrs = Array.from(element.attributes)
          .map((a) => ` ${a.name}="${a.value}"`)
          .join("");
        const hasElementChildren = Array.from(element.childNodes).some(
          (c) => c.nodeType === 1,
        );
        if (!hasElementChildren) {
          const content = (element.textContent || "").trim();
          lines.push(
            `${indent.repeat(depth + 1)}<${element.nodeName}${childAttrs}>${content}</${element.nodeName}>`,
          );
        } else {
          lines.push(`${indent.repeat(depth + 1)}<${element.nodeName}${childAttrs}>`);
          walk(element, depth + 1);
          lines.push(`${indent.repeat(depth + 1)}</${element.nodeName}>`);
        }
      }
    }
  };

  walk(root, 0);
  lines.push(`</${root.nodeName}>`);

  const head = declaration && declaration.nodeType === 1 && declaration.nodeName === "xml"
    ? `${text.slice(0, text.indexOf("?>") + 2)}\n`
    : "";
  return `${head}${lines.join("\n")}\n`;
}

/** The tree of an XML document, as indented text. */
export function xmlTree(doc: XMLDocument): string[] {
  const rows: string[] = [];
  const root = doc.documentElement;
  if (!root) return rows;

  const push = (element: Element, depth: number) => {
    const attrs = Array.from(element.attributes)
      .map((a) => ` ${a.name}="${a.value}"`)
      .join("");
    const text = Array.from(element.childNodes)
      .filter((c) => c.nodeType === 3)
      .map((c) => (c.textContent || "").trim())
      .filter(Boolean)
      .join(" ");
    rows.push(`${"  ".repeat(depth)}<${element.nodeName}${attrs}>${text ? ` ${text}` : ""}`);
    for (const child of Array.from(element.children)) push(child, depth + 1);
  };
  push(root, 0);
  return rows;
}

/** The elements and attributes an XSD schema declares. */
export function xsdElements(doc: XMLDocument): string[] {
  const rows: string[] = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    if (el.localName === "element") {
      const name = el.getAttribute("name") || "(anonymous)";
      const type = el.getAttribute("type");
      const min = el.getAttribute("minOccurs") || "1";
      const max = el.getAttribute("maxOccurs") || "1";
      rows.push(
        `element ${name}${type ? ` : ${type}` : ""} (minOccurs=${min}, maxOccurs=${max})`,
      );
    }
    if (el.localName === "attribute") {
      const name = el.getAttribute("name") || "(anonymous)";
      const type = el.getAttribute("type");
      const use = el.getAttribute("use") || "optional";
      rows.push(`attribute ${name}${type ? ` : ${type}` : ""} (${use})`);
    }
  }
  return rows;
}

/** The types an XSD schema defines. */
export function xsdTypes(doc: XMLDocument): string[] {
  const rows: string[] = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    if (el.localName === "complexType") {
      rows.push(`complexType ${el.getAttribute("name") || "(anonymous)"}`);
    }
    if (el.localName === "simpleType") {
      rows.push(`simpleType ${el.getAttribute("name") || "(anonymous)"}`);
    }
  }
  return rows;
}

export function XmlTool({ variant }: { variant: XmlVariant }) {
  const tUi = useTranslations("ui.engines.developerSuite");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");
  const [tree, setTree] = React.useState<string[]>([]);
  const [elements, setElements] = React.useState<string[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);

  const isXsd = variant === "xsd-editor" || variant === "xsd-schema" || variant === "xsd-elements";
  const sample = isXsd ? SAMPLE_XSD : SAMPLE_XML;

  const title =
    variant === "format"
      ? tUi("xmlFormatterTitle")
      : variant === "validate"
        ? tUi("xmlValidatorTitle")
        : variant === "view"
          ? tUi("xmlViewerTitle")
          : variant === "xsd-editor"
            ? tUi("xsdEditorTitle")
            : variant === "xsd-schema"
              ? tUi("xsdSchemaViewerTitle")
              : tUi("xsdViewerTitle");

  const subtitle =
    variant === "format"
      ? tUi("xmlFormatterSubtitle")
      : variant === "validate"
        ? tUi("xmlValidatorSubtitle")
        : variant === "view"
          ? tUi("xmlViewerSubtitle")
          : variant === "xsd-editor"
            ? tUi("xsdEditorSubtitle")
            : variant === "xsd-schema"
              ? tUi("xsdSchemaViewerSubtitle")
              : tUi("xsdViewerSubtitle");

  const actionLabel =
    variant === "format"
      ? tUi("formatXml")
      : variant === "validate"
        ? tUi("validateXml")
        : variant === "view"
          ? tUi("buildTree")
          : variant === "xsd-editor"
            ? tUi("checkSchema")
            : variant === "xsd-schema"
              ? tUi("listTypes")
              : tUi("listElements");

  const run = () => {
    setError("");
    setTree([]);
    setElements([]);
    setTypes([]);

    if (!text.trim()) {
      setResult("");
      setError(tUi("emptyInput"));
      return;
    }

    const { doc, error: parseError } = parseXml(text);
    if (!doc || parseError) {
      setResult("");
      setError(parseError || tUi("xmlParseError"));
      return;
    }

    if (variant === "format") {
      setResult(formatXml(text));
      return;
    }
    if (variant === "validate") {
      setResult(tUi("xmlIsWellFormed"));
      return;
    }
    if (variant === "view") {
      const rows = xmlTree(doc);
      setTree(rows);
      setResult(rows.join("\n"));
      return;
    }
    if (variant === "xsd-elements") {
      const rows = xsdElements(doc);
      setElements(rows);
      setResult(rows.join("\n") || tUi("noXsdDeclarations"));
      return;
    }
    if (variant === "xsd-schema") {
      const rows = xsdTypes(doc);
      setTypes(rows);
      setResult(rows.join("\n") || tUi("noXsdTypes"));
      return;
    }
    // xsd-editor
    const rows = xsdElements(doc);
    setElements(rows);
    setResult(rows.join("\n") || tUi("noXsdDeclarations"));
  };

  return (
    <DevPanel
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <button type="button" onClick={run} className={devButtonClass}>
            {actionLabel}
          </button>
          <DevCopyButton
            value={result}
            label={{ copy: tUi("copy"), copied: tUi("copied") }}
          />
          <DevClearButton
            onClick={() => {
              setText("");
              setResult("");
              setError("");
              setTree([]);
              setElements([]);
              setTypes([]);
            }}
            label={tUi("clear")}
          />
          <button
            type="button"
            onClick={() => setText(sample)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("loadExample")}
          </button>
        </>
      }
    >
      <DevEditor
        value={text}
        onChange={setText}
        placeholder={isXsd ? tUi("pasteXsdHere") : tUi("pasteXmlHere")}
      />

      {error ? <DevError>{error}</DevError> : null}
      {!error && result && variant === "validate" ? <DevOk>{result}</DevOk> : null}

      {result && variant !== "validate" ? (
        <DevOutput label={tUi("result")}>{result}</DevOutput>
      ) : null}

      {tree.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("nodeTree")}
          </p>
          <pre className="overflow-auto font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {tree.join("\n")}
          </pre>
        </div>
      ) : null}

      {types.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("declaredTypes")}
          </p>
          <ul className="space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300">
            {types.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {elements.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("declaredElements")}
          </p>
          <ul className="space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300">
            {elements.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </DevPanel>
  );
}
