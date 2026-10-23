"use client";

import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { Copy, RefreshCw, Key, ShieldCheck, Sparkles } from "lucide-react";

interface CryptoHashEngineProps {
  slug: string;
}

export function CryptoHashEngine({ slug }: CryptoHashEngineProps) {
  const isPasswordTool = slug.includes("password");
  const isJwtTool = slug.includes("jwt");

  // Hash state
  const [hashInput, setHashInput] = useState("Digital ToolPad 2026");
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

  // JWT state
  const [jwtInput, setJwtInput] = useState(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  );
  const [jwtHeader, setJwtHeader] = useState("");
  const [jwtPayload, setJwtPayload] = useState("");

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

  const decodeJwt = (jwt: string) => {
    try {
      const parts = jwt.split(".");
      if (parts.length >= 2) {
        const h = JSON.parse(atob(parts[0]));
        const p = JSON.parse(atob(parts[1]));
        setJwtHeader(JSON.stringify(h, null, 2));
        setJwtPayload(JSON.stringify(p, null, 2));
      }
    } catch {
      setJwtHeader("Invalid JWT");
      setJwtPayload("Invalid JWT");
    }
  };

  React.useEffect(() => {
    updateHashes(hashInput);
    generatePassword();
    decodeJwt(jwtInput);
  }, []);

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
  };

  if (isPasswordTool) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="size-5 text-sky-700" />
          Password Generator Settings
        </h3>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-4 font-mono text-lg text-emerald-400">
          <span className="select-all break-all">{generatedPw}</span>
          <button
            onClick={() => copyText(generatedPw)}
            className="ml-4 shrink-0 rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Copy
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Password Length: {pwLength} characters</span>
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
              <span>Uppercase (A-Z)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>Lowercase (a-z)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useNums}
                onChange={(e) => setUseNums(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>Numbers (0-9)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSyms}
                onChange={(e) => setUseSyms(e.target.checked)}
                className="rounded accent-sky-700"
              />
              <span>Symbols (!@#$)</span>
            </label>
          </div>

          <button
            onClick={generatePassword}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <RefreshCw className="size-3.5" />
            <span>Regenerate Password</span>
          </button>
        </div>
      </div>
    );
  }

  if (isJwtTool) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Encoded JWT Token
          </label>
          <textarea
            value={jwtInput}
            onChange={(e) => {
              setJwtInput(e.target.value);
              decodeJwt(e.target.value);
            }}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
          <div className="p-4">
            <span className="text-xs font-semibold text-rose-400">HEADER: Algorithm & Token Type</span>
            <pre className="mt-2 font-mono text-xs text-rose-300 overflow-auto">{jwtHeader}</pre>
          </div>
          <div className="p-4">
            <span className="text-xs font-semibold text-indigo-400">PAYLOAD: Data Claims</span>
            <pre className="mt-2 font-mono text-xs text-indigo-300 overflow-auto">{jwtPayload}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Input String to Hash
        </label>
        <textarea
          value={hashInput}
          onChange={(e) => {
            setHashInput(e.target.value);
            updateHashes(e.target.value);
          }}
          rows={3}
          placeholder="Type or paste any text to hash..."
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
              <span className="font-semibold">{item.label} Hash</span>
              <button
                onClick={() => copyText(item.val)}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                <Copy className="size-3" />
                <span>Copy</span>
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
