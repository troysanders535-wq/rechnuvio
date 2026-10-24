"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatIpv4, ipv4Mask, ipv4Subnet, parseIpv4 } from "./ipMath";

/** The prefixes of the IPv4 cheat sheet. */
const IPV4_PREFIXES = Array.from({ length: 33 }, (_, i) => i);

/** The prefixes of the IPv6 cheat sheet. */
const IPV6_PREFIXES = [32, 40, 48, 56, 64, 96, 112, 128];

/** The key of the typical use of an IPv4 prefix. */
function typicalUseKey(prefix: number): string {
  if (prefix <= 7) return "useVeryLargeNetwork";
  if (prefix <= 15) return "useLargeBlock";
  if (prefix <= 23) return "useLargePrivateNetwork";
  if (prefix === 24) return "useSmallPrivateNetwork";
  if (prefix <= 26) return "useDepartmentSubnet";
  if (prefix <= 30) return "useSmallSubnet";
  if (prefix === 31) return "usePointToPointLink";
  return "useSingleHost";
}

/** The key of the typical use of an IPv6 prefix. */
function typicalUseKeyV6(prefix: number): string {
  if (prefix <= 40) return "useVeryLargeNetwork";
  if (prefix <= 56) return "useLargeBlock";
  if (prefix <= 64) return "useLargePrivateNetwork";
  if (prefix <= 96) return "useSmallSubnet";
  return "useSingleHost";
}

/**
 * The subnet cheat sheet.
 *
 * The sheet lists the mask, the wildcard mask, the host bits, the number of
 * addresses and the typical use of every prefix length. Picking a prefix
 * highlights and scrolls to its row, the sheet itself is never replaced.
 */
export function SubnetCheatSheet() {
  const tUi = useTranslations("ui.engines.NetworkingToolsEngine");
  const locale = useLocale();

  const [prefix, setPrefix] = useState(24);
  const [address, setAddress] = useState("192.168.1.1");
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const row = rowRefs.current[prefix];
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "center" });
    }
  }, [prefix]);

  const parsed = parseIpv4(address);
  const subnet = parsed !== null ? ipv4Subnet(parsed, prefix) : null;

  const cell = "px-3 py-2 text-xs";
  const head = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {tUi("subnetCheatSheetTitle")}
        </h3>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {tUi("subnetCheatSheetHint")}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("iPAddress")}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              {IPV4_PREFIXES.map((c) => (
                <option key={c} value={c}>
                  /{c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {subnet ? (
          <p className="mt-3 font-mono text-xs text-slate-600 dark:text-slate-300">
            {formatIpv4(subnet.network)}/{prefix} • {formatIpv4(subnet.mask)} •{" "}
            {tUi("totalUsableHosts")}: {subnet.usable.toLocaleString(locale)}
          </p>
        ) : (
          <p className="mt-3 text-xs text-rose-500">{tUi("pleaseEnterAValidIPv4Address")}</p>
        )}
      </div>

      {/* IPv4 table */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {tUi("ipv4CheatSheetTitle")}
        </h4>
        <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className={head}>{tUi("columnPrefix")}</th>
                <th className={head}>{tUi("columnSubnetMask")}</th>
                <th className={head}>{tUi("columnWildcardMask")}</th>
                <th className={head}>{tUi("columnNetworkBits")}</th>
                <th className={head}>{tUi("columnHostBits")}</th>
                <th className={head}>{tUi("columnTotalAddresses")}</th>
                <th className={head}>{tUi("columnUsableHosts")}</th>
                <th className={head}>{tUi("columnTypicalUse")}</th>
              </tr>
            </thead>
            <tbody>
              {IPV4_PREFIXES.map((row) => {
                const mask = ipv4Mask(row);
                const size = Math.pow(2, 32 - row);
                const usable = row <= 30 ? size - 2 : size;
                const selected = row === prefix;
                return (
                  <tr
                    key={row}
                    ref={(node) => {
                      rowRefs.current[row] = node;
                    }}
                    className={`border-t border-slate-200 dark:border-slate-800 ${
                      selected
                        ? "bg-sky-50 dark:bg-sky-950/40"
                        : "even:bg-slate-50/60 dark:even:bg-slate-950/40"
                    }`}
                  >
                    <td className={`${cell} font-mono font-semibold text-sky-700 dark:text-sky-300`}>
                      /{row}
                    </td>
                    <td className={`${cell} font-mono text-slate-700 dark:text-slate-200`}>
                      {formatIpv4(mask)}
                    </td>
                    <td className={`${cell} font-mono text-slate-700 dark:text-slate-200`}>
                      {formatIpv4(~mask >>> 0)}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>{row}</td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {32 - row}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {size.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {usable.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} text-slate-600 dark:text-slate-300`}>
                      {tUi(typicalUseKey(row))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* IPv6 table */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {tUi("ipv6CheatSheetTitle")}
        </h4>
        <div className="mt-2 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[520px] border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className={head}>{tUi("columnPrefix")}</th>
                <th className={head}>{tUi("columnNetworkBits")}</th>
                <th className={head}>{tUi("columnHostBits")}</th>
                <th className={head}>{tUi("columnTotalAddresses")}</th>
                <th className={head}>{tUi("columnUsableHosts")}</th>
                <th className={head}>{tUi("columnTypicalUse")}</th>
              </tr>
            </thead>
            <tbody>
              {IPV6_PREFIXES.map((row) => {
                const total = BigInt(1) << BigInt(128 - row);
                const usable = row <= 126 ? total - BigInt(2) : total;
                return (
                  <tr
                    key={row}
                    className="border-t border-slate-200 even:bg-slate-50/60 dark:border-slate-800 dark:even:bg-slate-950/40"
                  >
                    <td className={`${cell} font-mono font-semibold text-sky-700 dark:text-sky-300`}>
                      /{row}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>{row}</td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {128 - row}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {total.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {usable.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} text-slate-600 dark:text-slate-300`}>
                      {tUi(typicalUseKeyV6(row))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
