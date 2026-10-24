"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Copy, Key, ShieldCheck } from "lucide-react";

/**
 * The JWT tools.
 *
 * RFC 7515 encodes the header and the payload with base64url, so the decoder
 * accepts the base64url alphabet and the encoder produces it. The signature is
 * a real HMAC over the signing input, so a token can be verified with the same
 * secret.
 */

/** base64url without the padding, as RFC 7515 requires. */
function base64url(input: string): string {
  return bytesToBase64url(new TextEncoder().encode(input));
}

/** base64url of raw bytes, without the padding. */
function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url segment into text. */
function fromBase64url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** The HMAC-SHA256 signature of the signing input, as a base64url segment. */
async function hmacSha256(signingInput: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return bytesToBase64url(new Uint8Array(signature));
}

/** Build a signed JWT from claims. */
async function signJwt(
  claims: Record<string, unknown>,
  secret: string,
  algorithm: string,
): Promise<string> {
  const header = { alg: algorithm, typ: "JWT" };
  const headerSegment = base64url(JSON.stringify(header));
  const payloadSegment = base64url(JSON.stringify(claims));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = await hmacSha256(signingInput, secret);
  return `${signingInput}.${signature}`;
}

/**
 * A translator that resolves a catalogue key to a localized string.
 */
type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Decode a token into its header and payload. */
export function decodeJwt(
  token: string,
  t: Translate,
): { header: string; payload: string; error: string } {
  const parts = token.trim().split(".");
  if (parts.length < 2) {
    return { header: "", payload: "", error: t("invalidJWT") };
  }
  try {
    const header = JSON.stringify(JSON.parse(fromBase64url(parts[0])), null, 2);
    const payload = JSON.stringify(JSON.parse(fromBase64url(parts[1])), null, 2);
    return { header, payload, error: "" };
  } catch {
    return { header: "", payload: "", error: t("invalidJWT") };
  }
}

export function JwtTool({ mode }: { mode: "decode" | "encode" | "both" }) {
  const tUi = useTranslations("ui.engines.CryptoHashEngine");
  const [token, setToken] = React.useState("");
  const [field, setField] = React.useState("");
  const [signed, setSigned] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [algorithm, setAlgorithm] = React.useState("HS256");
  const [decoded, setDecoded] = React.useState({ header: "", payload: "", error: "" });
  const [copied, setCopied] = React.useState(false);

  const showDecoder = mode === "decode" || mode === "both";
  const showEncoder = mode === "encode" || mode === "both";

  const decode = (value: string) => {
    setToken(value);
    if (!value.trim()) {
      setDecoded({ header: "", payload: "", error: "" });
      return;
    }
    setDecoded(decodeJwt(value, tUi));
  };

  /** Turn a JSON claims document into a signed token. */
  const encode = async (value: string, key: string, alg: string) => {
    setField(value);
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) {
      setSigned("");
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setSigned("");
        return;
      }
      setSigned(await signJwt(parsed, key || "secret", alg));
    } catch {
      setSigned("");
    }
  };

  React.useEffect(() => {
    if (!showEncoder) return;
    void encode(field, secret, algorithm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, algorithm, showEncoder]);

  /* The encoder field holds the claims while they are typed and the signed
     token as soon as they are complete, so the tool can be used by pasting a
     claims document and copying the token that comes out. */
  const encoderValue = mode === "encode" ? signed || field : field;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {showDecoder ? (
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("encodedJWTToken")}
          </label>
          <textarea
            value={token}
            onChange={(event) => decode(event.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={tUi("jwtTokenPlaceholder")}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {decoded.error ? (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              {tUi("invalidJWT")}
            </p>
          ) : null}
          {decoded.header || decoded.payload ? (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <span className="text-xs font-semibold text-rose-400">
                  {tUi("jwtHeaderLabel")}
                </span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-rose-300">
                  {decoded.header}
                </pre>
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-400">
                  {tUi("jwtPayloadLabel")}
                </span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-indigo-300">
                  {decoded.payload}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showEncoder ? (
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Key className="size-4 text-sky-700" />
            {tUi("jwtEncoderHeading")}
          </h4>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("jwtSigningKey")}
              <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={tUi("jwtSigningKeyPlaceholder")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("jwtAlgorithm")}
              <select
                value={algorithm}
                onChange={(event) => setAlgorithm(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="HS256">HS256</option>
                <option value="HS384">HS384</option>
                <option value="HS512">HS512</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("jwtClaimsLabel")}
            <textarea
              value={encoderValue}
              onChange={(event) => void encode(event.target.value, secret, algorithm)}
              rows={4}
              spellCheck={false}
              placeholder={tUi("jwtClaimsPlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          {mode === "encode" && signed ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(signed);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                <Copy className="size-3.5" />
                {copied ? tUi("copied") : tUi("copyToken")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigned("");
                  setField("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {tUi("editClaimsAgain")}
              </button>
            </div>
          ) : null}

          {mode === "both" && signed ? (
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tUi("jwtSignedTokenLabel")}
              </span>
              <code className="mt-1 block break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-300">
                {signed}
              </code>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "encode" ? (
        <div className="bg-slate-950 p-4">
          <p className="flex items-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            {tUi("jwtEncoderNote")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
