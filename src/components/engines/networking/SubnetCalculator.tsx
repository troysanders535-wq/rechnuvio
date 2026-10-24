"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Network } from "lucide-react";
import {
  formatIpv4,
  formatIpv6,
  formatIpv6Expanded,
  ipv4Subnet,
  ipv6Subnet,
  parseIpv4,
  parseIpv6,
} from "./ipMath";

type AddressFamily = "ipv4" | "ipv6";

interface SubnetCalculatorProps {
  /** The address family the tool starts with. */
  defaultFamily?: AddressFamily;
}

/**
 * The subnet calculator.
 *
 * It works with both address families: the family switch changes the address
 * field, the range of the prefix length and the calculated values. The IPv6
 * prefix length runs up to /128, the IPv4 prefix length up to /32.
 */
export function SubnetCalculator({ defaultFamily = "ipv4" }: SubnetCalculatorProps) {
  const tUi = useTranslations("ui.engines.NetworkingToolsEngine");
  const locale = useLocale();

  const [family, setFamily] = useState<AddressFamily>(defaultFamily);
  const [ip, setIp] = useState(defaultFamily === "ipv6" ? "2001:db8::1" : "192.168.1.1");
  const [prefix, setPrefix] = useState(defaultFamily === "ipv6" ? 64 : 24);

  const maxPrefix = family === "ipv6" ? 128 : 32;

  const switchFamily = (next: AddressFamily) => {
    setFamily(next);
    setIp(next === "ipv6" ? "2001:db8::1" : "192.168.1.1");
    setPrefix(next === "ipv6" ? 64 : 24);
  };

  const ip4 = family === "ipv4" ? parseIpv4(ip) : null;
  const ip6 = family === "ipv6" ? parseIpv6(ip) : null;
  const isValid = family === "ipv4" ? ip4 !== null : ip6 !== null;

  const subnet4 = ip4 !== null ? ipv4Subnet(ip4, prefix) : null;
  const subnet6 = ip6 !== null ? ipv6Subnet(ip6, prefix) : null;

  const prefixLabel = (value: number) => {
    if (family === "ipv6") return `/${value}`;
    if (value <= 8) return `/${value} (${tUi("classA")})`;
    if (value <= 16) return `/${value} (${tUi("classB")})`;
    if (value <= 24) return `/${value} (${tUi("classC")})`;
    return `/${value} (${tUi("subnet")})`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Network className="size-5 text-sky-700" />
        {family === "ipv6" ? tUi("iPv6SubnetCalculator") : tUi("iPv4CIDRSubnetCalculator")}
      </h3>

      {/* Address family */}
      <div className="mt-4">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {tUi("addressFamily")}
        </span>
        <div className="mt-1 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs dark:border-slate-700 dark:bg-slate-950">
          {(["ipv4", "ipv6"] as AddressFamily[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => switchFamily(entry)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                family === entry
                  ? "bg-sky-800 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {entry === "ipv4" ? tUi("familyIpv4") : tUi("familyIpv6")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tUi("iPAddress")}
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
            {tUi("cIDRPrefix")}{prefix})
          </label>
          <select
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {Array.from({ length: maxPrefix + 1 }, (_, i) => i).map((c) => (
              <option key={c} value={c}>
                {prefixLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {family === "ipv4" ? (
        subnet4 ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("networkAddress")}</span>
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  {formatIpv4(subnet4.network)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("broadcastAddress")}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatIpv4(subnet4.broadcast)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("subnetMask")}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatIpv4(subnet4.mask)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("wildcardMask")}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatIpv4(subnet4.wildcard)}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("usableHostRange")}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatIpv4(subnet4.firstHost)} - {formatIpv4(subnet4.lastHost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("totalUsableHosts")}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {subnet4.usable.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{tUi("cidrNotation")}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatIpv4(subnet4.network)}/{prefix}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-rose-500">{tUi("pleaseEnterAValidIPv4Address")}</p>
        )
      ) : subnet6 ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("networkAddress")}</span>
              <span className="break-all font-bold text-sky-700 dark:text-sky-300">
                {formatIpv6(subnet6.network)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("firstUsableHost")}</span>
              <span className="break-all font-bold text-slate-900 dark:text-white">
                {formatIpv6(subnet6.firstHost)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("lastUsableHost")}</span>
              <span className="break-all font-bold text-emerald-600 dark:text-emerald-400">
                {formatIpv6(subnet6.lastHost)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("lastAddressBroadcast")}</span>
              <span className="break-all font-bold text-slate-900 dark:text-white">
                {formatIpv6(subnet6.last)}
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("totalAddresses")}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {subnet6.total.toLocaleString(locale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("usableHosts")}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {subnet6.usable.toLocaleString(locale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("cidrNotation")}</span>
              <span className="break-all font-bold text-slate-900 dark:text-white">
                {formatIpv6(subnet6.network)}/{prefix}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-sans">{tUi("expandedAddress")}</span>
              <span className="break-all font-bold text-slate-900 dark:text-white">
                {ip6 !== null ? formatIpv6Expanded(ip6) : ""}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-rose-500">{tUi("pleaseEnterAValidIPv6Address")}</p>
      )}
    </div>
  );
}
