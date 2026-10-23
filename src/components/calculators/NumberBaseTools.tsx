"use client";

import React, { useState } from "react";
import { Binary, Hash } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
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
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "multiply", label: "Multiply" },
  { value: "divide", label: "Divide" },
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
  { value: "xor", label: "XOR" },
  { value: "shl", label: "Shift left" },
  { value: "shr", label: "Shift right" },
] as const;

type Operation = (typeof OPERATIONS)[number]["value"];

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
        title={variant === "binary" ? "Binary Calculator" : "Hex Calculator"}
        subtitle={
          variant === "binary"
            ? "Add, subtract, multiply and divide binary numbers plus AND, OR, XOR and shifts."
            : "Add, subtract, multiply and divide hexadecimal numbers plus AND, OR, XOR and shifts."
        }
        icon={variant === "binary" ? <Binary className="size-5 text-sky-700" /> : <Hash className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label={variant === "binary" ? "First number (binary)" : "First number (hex)"}
            value={first}
            onChange={setFirst}
          />
          <NumberField
            label={variant === "binary" ? "Second number (binary)" : "Second number (hex)"}
            value={second}
            onChange={setSecond}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => setOperation(op.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                operation === op.value
                  ? "bg-sky-800 text-white"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {a === null || b === null ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {base === 2
              ? "Enter valid binary digits (0 and 1 only)."
              : "Enter valid hex digits (0–9 and A–F)."}
          </p>
        ) : null}

        <ResultGrid>
          <ResultCard
            label="Binary"
            value={result === null ? "—" : formatInBase(result, 2)}
            tone="emerald"
          />
          <ResultCard
            label="Decimal"
            value={result === null ? "—" : result.toString()}
            tone="sky"
          />
          <ResultCard
            label="Hexadecimal"
            value={result === null ? "—" : formatInBase(result, 16)}
            tone="amber"
          />
          <ResultCard
            label="Octal"
            value={result === null ? "—" : formatInBase(result, 8)}
            tone="slate"
          />
        </ResultGrid>

        <DetailList
          items={[
            { label: "First in decimal", value: a === null ? "—" : a.toString() },
            { label: "Second in decimal", value: b === null ? "—" : b.toString() },
            {
              label: "NOT of first",
              value: a === null ? "—" : formatInBase(~a, base),
            },
          ]}
        />

        <FormulaNote>
          Bitwise operators work on the binary representation: AND keeps a bit when both numbers
          have it, OR when either does, XOR when exactly one does.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "roman") {
    const number = num(roman);
    const romanValue = intToRoman(number);
    const parsed = romanToInt(romanInput);
    return (
      <CalcPanel
        title="Roman Numeral Converter"
        subtitle="Convert numbers to Roman numerals and back, from 1 to 3,999,999."
        icon={<Hash className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Number" value={roman} onChange={setRoman} />
          <NumberField label="Roman numeral" value={romanInput} onChange={setRomanInput} />
        </div>
        <ResultGrid>
          <ResultCard label="Roman numeral" value={romanValue || "—"} tone="emerald" />
          <ResultCard
            label="Back to a number"
            value={parsed === null ? "invalid numeral" : parsed}
            tone="sky"
          />
          <ResultCard
            label="Breakdown"
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
          <ResultCard label="Valid input" value={parsed === null ? "No" : "Yes"} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Roman numerals add when a smaller numeral follows a larger one and subtract when it
          precedes one (IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900).
        </FormulaNote>
      </CalcPanel>
    );
  }

  // roman-date
  const parsedDate = parseDate(date);
  const romanDate = parsedDate ? dateToRoman(parsedDate, order, separator) : "";
  return (
    <CalcPanel
      title="Roman Numeral Date Converter"
      subtitle="Convert any date to Roman numerals for tattoos, rings and wedding gifts."
      icon={<Hash className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Date" value={date} onChange={setDate} hint="YYYY-MM-DD" />
        <SelectField
          label="Order"
          value={order}
          onChange={setOrder}
          options={[
            { value: "US", label: "US (MM.DD.YYYY)" },
            { value: "UK", label: "UK (DD.MM.YYYY)" },
            { value: "ISO", label: "ISO (YYYY.MM.DD)" },
          ]}
        />
        <SelectField
          label="Separator"
          value={separator}
          onChange={setSeparator}
          options={[
            { value: ".", label: "Dot  ·  MM.DD.YYYY" },
            { value: "-", label: "Dash  ·  MM-DD-YYYY" },
            { value: "•", label: "Bullet  ·  MM•DD•YYYY" },
            { value: "/", label: "Slash  ·  MM/DD/YYYY" },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label="Roman numeral date" value={romanDate || "—"} tone="emerald" />
        <ResultCard label="Day" value={parsedDate ? intToRoman(parsedDate.getDate()) : "—"} tone="sky" />
        <ResultCard label="Month" value={parsedDate ? intToRoman(parsedDate.getMonth() + 1) : "—"} tone="sky" />
        <ResultCard label="Year" value={parsedDate ? intToRoman(parsedDate.getFullYear()) : "—"} tone="slate" />
      </ResultGrid>
      <FormulaNote>
        The year is written in full Roman numerals, while the day and month use the classic
        1–31 range (IIII for the fourth day is optional in many traditions).
      </FormulaNote>
    </CalcPanel>
  );
}
