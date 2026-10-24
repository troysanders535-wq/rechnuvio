"use client";

import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { Copy, RefreshCw, Key, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { CryptoDecoderTool } from "./crypto/CryptoDecoderTool";
import { JwtTool } from "./crypto/JwtTool";

interface CryptoHashEngineProps {
  slug: string;
}

export function CryptoHashEngine({ slug }: CryptoHashEngineProps) {
  const tUi = useTranslations("ui.engines.CryptoHashEngine");
  const isPasswordTool = slug.includes("password");
  const isJwtTool = slug.includes("jwt");

  // Hash state
  const [hashInput, setHashInput] = useState(tUi("digitalToolPad2026"));
  const [md5Hash, setMd5Hash] = useState("");
  const [sha1Hash, setSha1Hash] = useState("");
  const [sha256Hash, setSha256Hash] = useState("");
  const [sha512Hash, setSha512Hash] = useState("");

  // Password generator state
  const [pwLength, setPwLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNums, setUseNums] = useState(true);
  const [useSyms, setUseSyms] = useState(true);
  const [generatedPw, setGeneratedPw] = useState("");

  const updateHashes = (text: string) => {
    setMd5Hash(CryptoJS.MD5(text).toString());
    setSha1Hash(CryptoJS.SHA1(text).toString());
    setSha256Hash(CryptoJS.SHA256(text).toString());
    setSha512Hash(CryptoJS.SHA512(text).toString());
  };

  const generatePassword = () => {
    let chars = "";
    if (useUpper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (useLower) chars += "abcdefghijklmnopqrstuvwxyz";
    if (useNums) chars += "0123456789";
    if (useSyms) chars += "!@#$%^&*()-_=+[]{}|;:,.<>?";
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz";

    let pw = "";
    const array = new Uint32Array(pwLength);
    crypto.getRandomValues(array);
    for (let i = 0; i < pwLength; i++) {
      pw += chars[array[i] % chars.length];
    }
    setGeneratedPw(pw);
  };

  /* The password follows the settings, so the length on the slider and the
     password on the screen can never disagree. */
  React.useEffect(() => {
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwLength, useUpper, useLower, useNums, useSyms]);

  React.useEffect(() => {
    updateHashes(hashInput);
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
  };

  if (isPasswordTool) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="size-5 text-sky-700" />
          {tUi("passwordGeneratorSettings")}
        </h3>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-4 font-mono text-lg text-emerald-400">
          <span className="select-all break-all">{generatedPw}</span>
          <button
            onClick={() => copyText(generatedPw)}
            className="ml-4 shrink-0 rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            {tUi("copy")}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{tUi("passwordLength", { length: pwLength })}</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={pwLength}
              onChange={(e) => {
                setPwLength(Number(e.target.value));
                generatePassword();
              }}
              className="mt-2 w-full accent-sky-700"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>{tUi("uppercaseAZ")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>{tUi("lowercaseAZ")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useNums}
                onChange={(e) => setUseNums(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>{tUi("numbers09")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSyms}
                onChange={(e) => setUseSyms(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>{tUi("symbols")}</span>
            </label>
          </div>

          <button
            onClick={generatePassword}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <RefreshCw className="size-3.5" />
            <span>{tUi("regeneratePassword")}</span>
          </button>
        </div>
      </div>
    );
  }

  if (isJwtTool) {
    const mode =
      slug === "jwt-encoder"
        ? "encode"
        : slug === "jwt-decoder-encoder"
          ? "both"
          : "decode";
    return <JwtTool mode={mode} />;
  }

  if (slug === "asn1-decoder") {
    return <CryptoDecoderTool variant="asn1" />;
  }
  if (slug === "csr-decoder") {
    return <CryptoDecoderTool variant="csr" />;
  }
  if (slug === "pem-decoder") {
    return <CryptoDecoderTool variant="pem" />;
  }
  if (slug === "ssl-certificate-decoder") {
    return <CryptoDecoderTool variant="certificate" />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("inputStringToHash")}
        </label>
        <textarea
          value={hashInput}
          onChange={(e) => {
            setHashInput(e.target.value);
            updateHashes(e.target.value);
          }}
          rows={3}
          placeholder={tUi("typeOrPasteAnyTextToHash")}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="p-4 bg-slate-950 space-y-4">
        {[
          { label: "SHA-256", val: sha256Hash },
          { label: "MD5", val: md5Hash },
          { label: "SHA-1", val: sha1Hash },
          { label: "SHA-512", val: sha512Hash },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">{item.label} {tUi("hash")}</span>
              <button
                onClick={() => copyText(item.val)}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                <Copy className="size-3" />
                <span>{tUi("copy")}</span>
              </button>
            </div>
            <p className="mt-1 font-mono text-xs text-emerald-400 break-all select-all">
              {item.val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
