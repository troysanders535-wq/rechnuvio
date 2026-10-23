"use client";

import React, { useState } from "react";
import { Network, Server, Shield, Sparkles } from "lucide-react";

interface NetworkingToolsEngineProps {
  slug: string;
}

export function NetworkingToolsEngine({ slug }: NetworkingToolsEngineProps) {
  const [ip, setIp] = useState("192.168.1.1");
  const [cidr, setCidr] = useState(24);

  // Compute Subnet details
  const ipParts = ip.split(".").map(Number);
  const isValidIp =
    ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255);

  const maskInt = (0xffffffff << (32 - cidr)) >>> 0;
  const maskParts = [
    (maskInt >>> 24) & 255,
    (maskInt >>> 16) & 255,
    (maskInt >>> 8) & 255,
    maskInt & 255,
  ];

  const wildcardParts = maskParts.map((m) => 255 - m);

  let netParts = [0, 0, 0, 0];
  let bcastParts = [0, 0, 0, 0];
  let firstHost = [0, 0, 0, 0];
  let lastHost = [0, 0, 0, 0];
  let totalHosts = 0;

  if (isValidIp) {
    const ipInt =
      ((ipParts[0] << 24) |
        (ipParts[1] << 16) |
        (ipParts[2] << 8) |
        ipParts[3]) >>>
      0;
    const netInt = (ipInt & maskInt) >>> 0;
    const bcastInt = (netInt | ~maskInt) >>> 0;

    netParts = [
      (netInt >>> 24) & 255,
      (netInt >>> 16) & 255,
      (netInt >>> 8) & 255,
      netInt & 255,
    ];

    bcastParts = [
      (bcastInt >>> 24) & 255,
      (bcastInt >>> 16) & 255,
      (bcastInt >>> 8) & 255,
      bcastInt & 255,
    ];

    firstHost = [...netParts];
    firstHost[3] += 1;

    lastHost = [...bcastParts];
    lastHost[3] -= 1;

    totalHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.max(0, Math.pow(2, 32 - cidr) - 2);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Network className="size-5 text-sky-700" />
        IPv4 CIDR & Subnet Calculator
      </h3>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            IP Address
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            CIDR Prefix (/{cidr})
          </label>
          <select
            value={cidr}
            onChange={(e) => setCidr(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {Array.from({ length: 33 }, (_, i) => i).map((c) => (
              <option key={c} value={c}>
                /{c} (
                {c <= 8
                  ? "Class A"
                  : c <= 16
                  ? "Class B"
                  : c <= 24
                  ? "Class C"
                  : "Subnet"}
                )
              </option>
            ))}
          </select>
        </div>
      </div>

      {isValidIp ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Network Address:</span>
              <span className="font-bold text-sky-700 dark:text-sky-300">
                {netParts.join(".")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Broadcast Address:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {bcastParts.join(".")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Subnet Mask:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {maskParts.join(".")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Wildcard Mask:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {wildcardParts.join(".")}
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Usable Host Range:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {firstHost.join(".")} - {lastHost.join(".")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Usable Hosts:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {totalHosts.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">CIDR Notation:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {netParts.join(".")}/{cidr}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-rose-500">Please enter a valid IPv4 address.</p>
      )}
    </div>
  );
}
