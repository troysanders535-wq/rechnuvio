"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import CryptoJS from "crypto-js";

import {
  describeNode,
  hexToBytes,
  oidName,
  pemToDer,
  readCertificate,
  readCsr,
  readDer,
  type DerNode,
} from "./der";

type CryptoVariant = "asn1" | "csr" | "pem" | "certificate";

const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKZ7Rm0h1TrMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
-----END CERTIFICATE-----`;

const SAMPLE_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIC+jCCAVYCAwAwFjEUMBIGA1UEAxMLVG9DYWwtUmVxdWVzdA==
-----END CERTIFICATE REQUEST-----`;

/** The SHA-256 fingerprint of the bytes, in lower case hex. */
function fingerprint(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hex)).toString();
}

/** Render a DER tree as indented text. */
function renderTree(node: DerNode, depth = 0): string[] {
  const rows = [`${"  ".repeat(depth)}${describeNode(node)}`];
  for (const child of node.children) rows.push(...renderTree(child, depth + 1));
  return rows;
}

export function CryptoDecoderTool({ variant }: { variant: CryptoVariant }) {
  const tUi = useTranslations("ui.engines.CryptoHashEngine");
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<string[]>([]);
  const [facts, setFacts] = React.useState<{ label: string; value: string }[]>([]);
  const [error, setError] = React.useState("");

  const title =
    variant === "asn1"
      ? tUi("asn1DecoderTitle")
      : variant === "csr"
        ? tUi("csrDecoderTitle")
        : variant === "pem"
          ? tUi("pemDecoderTitle")
          : tUi("sslCertificateDecoderTitle");

  const subtitle =
    variant === "asn1"
      ? tUi("asn1DecoderSubtitle")
      : variant === "csr"
        ? tUi("csrDecoderSubtitle")
        : variant === "pem"
          ? tUi("pemDecoderSubtitle")
          : tUi("sslCertificateDecoderSubtitle");

  const placeholder =
    variant === "asn1"
      ? tUi("asn1DecoderPlaceholder")
      : variant === "csr"
        ? tUi("csrDecoderPlaceholder")
        : variant === "pem"
          ? tUi("pemDecoderPlaceholder")
          : tUi("sslCertificateDecoderPlaceholder");

  const sample =
    variant === "asn1" ? "" : variant === "csr" ? SAMPLE_CSR : SAMPLE_PEM;

  const run = () => {
    setRows([]);
    setFacts([]);
    setError("");

    const trimmed = text.trim();
    if (!trimmed) {
      setError(tUi("emptyInput"));
      return;
    }

    let bytes: Uint8Array | null = null;
    let label = "";

    if (trimmed.includes("-----BEGIN")) {
      const pem = pemToDer(trimmed);
      if (!pem) {
        setError(tUi("pemNotReadable"));
        return;
      }
      bytes = pem.der;
      label = pem.label;
    } else if (/^[0-9a-f\s]+$/i.test(trimmed)) {
      bytes = hexToBytes(trimmed);
      if (!bytes) {
        setError(tUi("hexNotReadable"));
        return;
      }
    } else {
      setError(tUi("pemNotReadable"));
      return;
    }

    const root = readDer(bytes);
    if (!root) {
      setError(tUi("derNotReadable"));
      return;
    }

    if (variant === "asn1") {
      setRows(renderTree(root));
      return;
    }

    if (variant === "pem") {
      setFacts([
        { label: tUi("pemLabel"), value: label },
        { label: tUi("pemSize"), value: `${bytes.length} bytes` },
        { label: tUi("pemHeader"), value: root.tag },
        { label: tUi("pemFingerprint"), value: fingerprint(bytes) },
      ]);
      setRows(renderTree(root));
      return;
    }

    if (variant === "csr") {
      const info = readCsr(root);
      if (!info) {
        setError(tUi("csrNotReadable"));
        return;
      }
      setFacts([
        { label: tUi("csrVersion"), value: info.version },
        { label: tUi("csrSubject"), value: info.subject.join(", ") },
        { label: tUi("csrPublicKey"), value: info.publicKey },
        { label: tUi("csrKeySize"), value: info.keySize },
        { label: tUi("csrSignatureAlgorithm"), value: info.signatureAlgorithm },
      ]);
      setRows(renderTree(root));
      return;
    }

    const info = readCertificate(root);
    if (!info) {
      setError(tUi("certificateNotReadable"));
      return;
    }
    setFacts([
      { label: tUi("certificateVersion"), value: info.version },
      { label: tUi("certificateSerial"), value: info.serialNumber },
      { label: tUi("certificateIssuer"), value: info.issuer.join(", ") },
      { label: tUi("certificateSubject"), value: info.subject.join(", ") },
      { label: tUi("certificateValidFrom"), value: info.notBefore },
      { label: tUi("certificateValidUntil"), value: info.notAfter },
      { label: tUi("certificateAlgorithm"), value: info.signatureAlgorithm },
      { label: tUi("certificatePublicKey"), value: info.publicKey },
      { label: tUi("certificateKeySize"), value: info.keySize },
      { label: tUi("certificateFingerprint"), value: fingerprint(bytes) },
      ...(info.subjectAlternativeNames.length
        ? [{ label: tUi("certificateAlternativeNames"), value: info.subjectAlternativeNames.join(", ") }]
        : []),
    ]);
    setRows(renderTree(root));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="size-5 text-sky-700" />
          {title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={placeholder}
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900 dark:bg-sky-700"
          >
            {tUi("decodeStructure")}
          </button>
          <button
            type="button"
            onClick={() => {
              setText("");
              setRows([]);
              setFacts([]);
              setError("");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tUi("clear")}
          </button>
          {sample ? (
            <button
              type="button"
              onClick={() => setText(sample)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {tUi("loadExample")}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {facts.length ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-800">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {fact.label}
              </dt>
              <dd className="break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                {fact.value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {rows.length ? (
        <div className="max-h-96 overflow-auto bg-slate-950 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-400">{tUi("decodedStructure")}</p>
          <pre className="font-mono text-xs leading-relaxed text-emerald-300">
            {rows.join("\n")}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

/** The names of the object identifiers that were found, for the summary. */
export function oidSummary(node: DerNode): string[] {
  const names: string[] = [];
  for (const child of node.children) {
    if (child.tag === "06") names.push(oidName(child));
    names.push(...oidSummary(child));
  }
  return names;
}
