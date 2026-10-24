"use client";

import React, { useState } from "react";
import { Binary, Hash } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  SelectField,
  num,
  round,
} from "./shared";
import {
  dateToRoman,
  formatInBase,
  intToRoman,
  parseDate,
  parseInBase,
  romanToInt,
  type Base,
  type RomanDateOrder,
  type RomanDateSeparator,
} from "./calc";

const OPERATIONS = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "and",
  "or",
  "xor",
  "shl",
  "shr",
] as const;

type Operation = (typeof OPERATIONS)[number];

function applyOperation(a: bigint, b: bigint, operation: Operation): bigint | null {
  switch (operation) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      return b === BigInt(0) ? null : a / b;
    case "and":
      return a & b;
    case "or":
      return a | b;
    case "xor":
      return a ^ b;
    case "shl":
      return a << b;
    case "shr":
      return a >> b;
    default:
      return null;
  }
}

export function NumberBaseTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.NumberBaseTools");
  // The boolean operators stay as they are: they are code, not prose.
  const operationLabels: Record<Operation, string> = {
    add: tUi("add"),
    subtract: tUi("subtract"),
    multiply: tUi("multiply"),
    divide: tUi("divide"),
    and: "AND",
    or: "OR",
    xor: "XOR",
    shl: tUi("shiftLeft"),
    shr: tUi("shiftRight"),
  };
  const [first, setFirst] = useState("1010");
  const [second, setSecond] = useState("1100");
  const [operation, setOperation] = useState<Operation>("add");
  const [roman, setRoman] = useState("2026");
  const [romanInput, setRomanInput] = useState("MMXXVI");
  const [date, setDate] = useState("2026-10-23");
  const [order, setOrder] = useState<RomanDateOrder>("US");
  const [separator, setSeparator] = useState<RomanDateSeparator>(".");

  if (variant === "binary" || variant === "hex") {
    const base: Base = variant === "binary" ? 2 : 16;
    const a = parseInBase(first, base);
    const b = parseInBase(second, base);
    const result = a !== null && b !== null ? applyOperation(a, b, operation) : null;

    return (
      <CalcPanel
        title={variant === "binary" ? tUi("binaryCalculator") : tUi("hexCalculator")}
        subtitle={
          variant === "binary"
            ? tUi("binaryCalculatorSubtitle")
            : tUi("hexCalculatorSubtitle")
        }
        icon={variant === "binary" ? <Binary className="size-5 text-sky-700" /> : <Hash className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label={variant === "binary" ? tUi("firstNumberBinary") : tUi("firstNumberHex")}
            value={first}
            onChange={setFirst}
          />
          <NumberField
            label={variant === "binary" ? tUi("secondNumberBinary") : tUi("secondNumberHex")}
            value={second}
            onChange={setSecond}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperation(op)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                operation === op
                  ? "bg-sky-800 text-white"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {operationLabels[op]}
            </button>
          ))}
        </div>

        {a === null || b === null ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {base === 2
              ? tUi("enterValidBinaryDigits0And1Only")
              : tUi("enterValidHexDigits09AndAF")}
          </p>
        ) : null}

        <ResultGrid>
          <ResultCard
            label={tUi("binary")}
            value={result === null ? "—" : formatInBase(result, 2)}
            tone="emerald"
          />
          <ResultCard
            label={tUi("decimal")}
            value={result === null ? "—" : result.toString()}
            tone="sky"
          />
          <ResultCard
            label={tUi("hexadecimal")}
            value={result === null ? "—" : formatInBase(result, 16)}
            tone="amber"
          />
          <ResultCard
            label={tUi("octal")}
            value={result === null ? "—" : formatInBase(result, 8)}
            tone="slate"
          />
        </ResultGrid>

        <DetailList
          items={[
            { label: tUi("firstInDecimal"), value: a === null ? "—" : a.toString() },
            { label: tUi("secondInDecimal"), value: b === null ? "—" : b.toString() },
            {
              label: tUi("notOfFirst"),
              value: a === null ? "—" : formatInBase(~a, base),
            },
          ]}
        />

        <FormulaNote>{tUi("bitwiseOperatorsFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "roman") {
    const number = num(roman);
    const romanValue = intToRoman(number);
    const parsed = romanToInt(romanInput);
    return (
      <CalcPanel
        title={tUi("romanNumeralConverter")}
        subtitle={tUi("convertNumbersToRomanNumeralsAndBackFrom1To3999999")}
        icon={<Hash className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("number")} value={roman} onChange={setRoman} />
          <NumberField label={tUi("romanNumeral")} value={romanInput} onChange={setRomanInput} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("romanNumeral")} value={romanValue || "—"} tone="emerald" />
          <ResultCard
            label={tUi("backToANumber")}
            value={parsed === null ? "invalid numeral" : parsed}
            tone="sky"
          />
          <ResultCard
            label={tUi("breakdown")}
            value={
              romanValue
                ? romanValue
                    .split(/(CM|CD|DC|M|XC|XL|LX|VX|IX|IV|V)/)
                    .filter(Boolean)
                    .join(" + ")
                : "—"
            }
            tone="slate"
          />
          <ResultCard label={tUi("validInput")} value={parsed === null ? "No" : "Yes"} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("romanNumeralRulesFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  // roman-date
  const parsedDate = parseDate(date);
  const romanDate = parsedDate ? dateToRoman(parsedDate, order, separator) : "";
  return (
    <CalcPanel
      title={tUi("romanNumeralDateConverter")}
      subtitle={tUi("convertAnyDateToRomanNumeralsForTattoosRingsAndWeddingGifts")}
      icon={<Hash className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label={tUi("date")} value={date} onChange={setDate} hint={tUi("yYYYMMDD")} />
        <SelectField
          label={tUi("order")}
          value={order}
          onChange={setOrder}
          options={[
            { value: "US", label: tUi("uSMMDDYYYY") },
            { value: "UK", label: tUi("uKDDMMYYYY") },
            { value: "ISO", label: tUi("iSOYYYYMMDD") },
          ]}
        />
        <SelectField
          label={tUi("separator")}
          value={separator}
          onChange={setSeparator}
          options={[
            { value: ".", label: tUi("dotSeparator") },
            { value: "-", label: tUi("dashSeparator") },
            { value: "•", label: tUi("bulletSeparator") },
            { value: "/", label: tUi("slashSeparator") },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label={tUi("romanNumeralDate")} value={romanDate || "—"} tone="emerald" />
        <ResultCard label={tUi("day")} value={parsedDate ? intToRoman(parsedDate.getDate()) : "—"} tone="sky" />
        <ResultCard label={tUi("month")} value={parsedDate ? intToRoman(parsedDate.getMonth() + 1) : "—"} tone="sky" />
        <ResultCard label={tUi("year")} value={parsedDate ? intToRoman(parsedDate.getFullYear()) : "—"} tone="slate" />
      </ResultGrid>
      <FormulaNote>{tUi("romanDateRangeFormulaNote")}</FormulaNote>
    </CalcPanel>
  );
}
