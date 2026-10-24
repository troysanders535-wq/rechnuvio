"use client";

import React, { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { allocateVlsm, formatIpv4, parseIpv4 } from "./ipMath";

/**
 * The VLSM calculator.
 *
 * Every subnet row carries the number of hosts it has to hold. The
 * calculation allocates the subnets from the largest to the smallest one and
 * reports a subnet that does not fit into the parent block instead of
 * dropping it silently.
 */
export function VlsmCalculator() {
  const tUi = useTranslations("ui.engines.NetworkingToolsEngine");
  const locale = useLocale();

  const [address, setAddress] = useState("192.168.1.0");
  const [prefix, setPrefix] = useState(24);
  const [hosts, setHosts] = useState<string[]>(["", ""]);

  const parsed = parseIpv4(address);

  const requests = useMemo(
    () =>
      hosts
        .map((value, index) => ({ index, hosts: Number.parseInt(value, 10) }))
        .filter((entry) => Number.isFinite(entry.hosts) && entry.hosts > 0),
    [hosts],
  );

  const result = useMemo(
    () => (parsed !== null ? allocateVlsm(parsed, prefix, requests) : null),
    [parsed, prefix, requests],
  );

  const setHostCount = (index: number, value: string) => {
    setHosts((prev) => prev.map((entry, i) => (i === index ? value : entry)));
  };

  const addRow = () => setHosts((prev) => [...prev, ""]);

  const removeRow = (index: number) =>
    setHosts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const cell = "px-3 py-2 text-xs";
  const head = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {tUi("vlsmCalculatorTitle")}
        </h3>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{tUi("vlsmHint")}</p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tUi("baseNetwork")}
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
              {Array.from({ length: 33 }, (_, i) => i).map((c) => (
                <option key={c} value={c}>
                  /{c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {parsed === null ? (
          <p className="mt-3 text-xs text-rose-500">{tUi("pleaseEnterAValidIPv4Address")}</p>
        ) : null}
      </div>

      {/* Subnet requirements */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {tUi("requiredHostsPerSubnet")}
        </h4>
        <div className="mt-2 space-y-2">
          {hosts.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-24 shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
                {tUi("subnetName", { index: index + 1 })}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => setHostCount(index, e.target.value)}
                placeholder={tUi("requiredHostsPlaceholder")}
                className="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tUi("requiredHostsUnit")}
              </span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="ml-auto rounded p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                title={tUi("removeSubnet")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Plus className="size-3.5" />
          <span>{tUi("addSubnet")}</span>
        </button>
      </div>

      {/* Allocations */}
      <div className="p-4">
        {result === null ? (
          <p className="text-xs text-slate-500">{tUi("pleaseEnterAValidIPv4Address")}</p>
        ) : result.allocations.length === 0 ? (
          <p className="text-xs text-slate-500">{tUi("vlsmNoSubnets")}</p>
        ) : (
          <>
            {!result.fits ? (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {tUi("vlsmDoesNotFit")}
              </p>
            ) : null}

            <div className="space-y-3">
              {result.allocations.map((allocation) => (
                <div
                  key={allocation.index}
                  className={`rounded-xl border p-3 font-mono text-xs ${
                    allocation.fits
                      ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                      : "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {tUi("subnetName", { index: allocation.index + 1 })}
                    </span>
                    <span className="font-semibold text-sky-700 dark:text-sky-300">
                      {formatIpv4(allocation.network)}/{allocation.prefix}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("requiredHosts")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {allocation.hosts.toLocaleString(locale)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("networkAddress")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatIpv4(allocation.network)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("subnetMask")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatIpv4(allocation.mask)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("wildcardMask")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatIpv4(allocation.wildcard)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("usableHostRange")}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatIpv4(allocation.firstHost)} - {formatIpv4(allocation.lastHost)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("totalUsableHosts")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {allocation.usable.toLocaleString(locale)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("broadcastAddress")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatIpv4(allocation.broadcast)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-sans text-slate-500">{tUi("allocatedSize")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        /{allocation.prefix} ({Math.pow(2, 32 - allocation.prefix).toLocaleString(locale)})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Parent block summary */}
            <div className="mt-4 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[420px] border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className={head}>{tUi("vlsmParentBlock")}</th>
                    <th className={head}>{tUi("columnTotalAddresses")}</th>
                    <th className={head}>{tUi("vlsmUsed")}</th>
                    <th className={head}>{tUi("vlsmLeftover")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    <td className={`${cell} font-mono text-sky-700 dark:text-sky-300`}>
                      {formatIpv4(result.parentNetwork)}/{result.parentPrefix}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {result.parentTotal.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {result.used.toLocaleString(locale)}
                    </td>
                    <td className={`${cell} font-mono text-slate-600 dark:text-slate-300`}>
                      {result.leftover.toLocaleString(locale)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
