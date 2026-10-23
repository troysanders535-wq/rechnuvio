"use client";

import React, { useState } from "react";
import { DollarSign, Zap } from "lucide-react";
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
  discountPrice,
  electricityCost,
  hourlyToSalary,
  marginPercent,
  markupPercent,
  overtimePay,
  priceAfterTax,
  priceForMargin,
  priceFromMarkup,
  salaryToHourly,
} from "./calc";

export function MoneyTools({ variant }: { variant: CalculatorVariant }) {
  const [price, setPrice] = useState("100");
  const [cost, setCost] = useState("60");
  const [percent, setPercent] = useState("20");
  const [hours, setHours] = useState("40");
  const [weeks, setWeeks] = useState("52");
  const [rate, setRate] = useState("25");
  const [otHours, setOtHours] = useState("10");
  const [multiplier, setMultiplier] = useState("1.5");
  const [doubleAfter, setDoubleAfter] = useState("12");
  const [watts, setWatts] = useState("1500");
  const [useHours, setUseHours] = useState("8");
  const [kwhPrice, setKwhPrice] = useState("0.28");

  const numPrice = num(price);
  const numCost = num(cost);
  const numPercent = num(percent);
  const numHours = num(hours);
  const numWeeks = num(weeks);
  const numRate = num(rate);
  const numOtHours = num(otHours);
  const numMultiplier = num(multiplier);
  const numDoubleAfter = num(doubleAfter);

  if (variant === "discount") {
    return (
      <CalcPanel
        title="Discount Calculator"
        subtitle="Sale price, savings, stacked discounts and sales tax."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Original price" value={price} onChange={setPrice} />
          <NumberField label="Discount (%)" value={percent} onChange={setPercent} />
          <NumberField label="Extra discount (%)" value={rate} onChange={setRate} />
        </div>
        <ResultGrid>
          <ResultCard
            label="Sale price"
            value={round(discountPrice(numPrice, numPercent), 2)}
            tone="emerald"
          />
          <ResultCard label="You save" value={round(numPrice - discountPrice(numPrice, numPercent), 2)} tone="sky" />
          <ResultCard
            label="With stacked discount"
            value={round(discountPrice(discountPrice(numPrice, numPercent), numRate), 2)}
            tone="amber"
          />
          <ResultCard
            label="Sale price + tax"
            value={round(priceAfterTax(discountPrice(numPrice, numPercent), numRate), 2)}
            tone="slate"
          />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Working", value: `${price} × (1 − ${percent}/100)` },
            { label: "Original price from sale price", value: round(numPrice === 0 ? 0 : discountPrice(numPrice, numPercent) / (1 - numPercent / 100 || 1), 2) },
            { label: "Excel formula", value: "=A2*(1-B2/100)" },
          ]}
        />
        <FormulaNote>
          Stacked discounts multiply, they do not add: 20% then 10% = 0.8 × 0.9 = 28% off in total.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "margin") {
    return (
      <CalcPanel
        title="Margin Calculator"
        subtitle="Profit margin from cost and price, or the selling price for a target margin."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Cost" value={cost} onChange={setCost} />
          <NumberField label="Selling price" value={price} onChange={setPrice} />
          <NumberField label="Target margin (%)" value={percent} onChange={setPercent} />
        </div>
        <ResultGrid>
          <ResultCard label="Profit margin" value={round(marginPercent(numCost, numPrice), 4)} unit="%" tone="emerald" />
          <ResultCard label="Markup" value={round(markupPercent(numCost, numPrice), 4)} unit="%" tone="sky" />
          <ResultCard label="Profit" value={round(numPrice - numCost, 4)} tone="slate" />
          <ResultCard
            label="Price for target margin"
            value={round(priceForMargin(numCost, numPercent), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>
          margin = (price − cost) ÷ price × 100 · markup = (price − cost) ÷ cost × 100 · price for
          margin = cost ÷ (1 − margin ÷ 100)
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "markup") {
    return (
      <CalcPanel
        title="Markup Calculator"
        subtitle="Selling price from a markup, or the markup of a given price."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Cost" value={cost} onChange={setCost} />
          <NumberField label="Markup (%)" value={percent} onChange={setPercent} />
          <NumberField label="Selling price" value={price} onChange={setPrice} />
        </div>
        <ResultGrid>
          <ResultCard label="Selling price" value={round(priceFromMarkup(numCost, numPercent), 2)} tone="emerald" />
          <ResultCard label="Markup" value={round(markupPercent(numCost, numPrice), 4)} unit="%" tone="sky" />
          <ResultCard label="Margin" value={round(marginPercent(numCost, numPrice), 4)} unit="%" tone="slate" />
          <ResultCard label="Profit" value={round(numPrice - numCost, 4)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          selling price = cost × (1 + markup ÷ 100) · Excel: =A2*(1+B2/100)
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "salary-hourly") {
    const hourly = salaryToHourly(numPrice, numHours, numWeeks);
    return (
      <CalcPanel
        title="Salary to Hourly Calculator"
        subtitle="Convert an annual salary to an hourly wage and other pay periods."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Annual salary" value={price} onChange={setPrice} />
          <NumberField label="Hours per week" value={hours} onChange={setHours} />
          <NumberField label="Paid weeks per year" value={weeks} onChange={setWeeks} />
        </div>
        <ResultGrid>
          <ResultCard label="Hourly wage" value={round(hourly, 2)} tone="emerald" />
          <ResultCard label="Weekly" value={round(hourly * numHours, 2)} tone="sky" />
          <ResultCard label="Bi-weekly" value={round(hourly * numHours * 2, 2)} tone="sky" />
          <ResultCard label="Monthly" value={round(numPrice / 12, 2)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          hourly = annual salary ÷ (hours per week × paid weeks) · assumes {numHours} h/week over{" "}
          {numWeeks} weeks.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "hourly-salary") {
    const annual = hourlyToSalary(numRate, numHours, numWeeks);
    return (
      <CalcPanel
        title="Hourly to Salary Calculator"
        subtitle="Convert an hourly wage to annual, weekly, bi-weekly and daily pay."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Hourly wage" value={rate} onChange={setRate} />
          <NumberField label="Hours per week" value={hours} onChange={setHours} />
          <NumberField label="Paid weeks per year" value={weeks} onChange={setWeeks} />
        </div>
        <ResultGrid>
          <ResultCard label="Annual salary" value={round(annual, 2)} tone="emerald" />
          <ResultCard label="Weekly" value={round(numRate * numHours, 2)} tone="sky" />
          <ResultCard label="Bi-weekly" value={round(numRate * numHours * 2, 2)} tone="sky" />
          <ResultCard
            label="Daily (8 h)"
            value={round(numRate * 8, 2)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          annual = hourly × hours per week × paid weeks · daily assumes an 8 hour day.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "overtime") {
    const result = overtimePay(
      numOtHours,
      numRate,
      8,
      numMultiplier,
      numDoubleAfter,
      2,
    );
    return (
      <CalcPanel
        title="Overtime Calculator"
        subtitle="Time-and-a-half and double time, with the regular and overtime pay split out."
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-5">
          <NumberField label="Hours worked" value={otHours} onChange={setOtHours} />
          <NumberField label="Hourly rate" value={rate} onChange={setRate} />
          <NumberField label="Overtime after (h)" value="8" onChange={() => {}} hint="8 hours" />
          <NumberField
            label="Double time after (h)"
            value={doubleAfter}
            onChange={setDoubleAfter}
          />
          <NumberField
            label="Overtime multiplier"
            value={multiplier}
            onChange={setMultiplier}
            hint="1.5 = time and a half"
          />
        </div>
        <ResultGrid>
          <ResultCard label="Regular pay" value={round(result.regularPay, 2)} tone="sky" />
          <ResultCard label="Overtime pay" value={round(result.overtimePay, 2)} tone="amber" />
          <ResultCard label="Total pay" value={round(result.totalPay, 2)} tone="emerald" />
          <ResultCard
            label="Regular hours"
            value={round(result.regularHours, 2)}
            unit="h"
            tone="slate"
          />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Overtime hours", value: `${round(result.overtimeHours, 2)} h` },
            { label: "Double time hours", value: `${round(result.doubleTimeHours, 2)} h` },
            { label: "Working", value: `${numOtHours} h → ${round(result.regularHours, 2)} regular + ${round(result.overtimeHours, 2)} OT` },
          ]}
        />
        <FormulaNote>
          overtime pay = overtime hours × hourly rate × multiplier (1.5 = time and a half, 2 =
          double time)
        </FormulaNote>
      </CalcPanel>
    );
  }

  // electricity-cost
  const result = electricityCost(num(watts), num(useHours), num(kwhPrice));
  return (
    <CalcPanel
      title="Electricity Cost Calculator"
      subtitle="What an appliance costs to run per day, month and year."
      icon={<Zap className="size-5 text-amber-600" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Wattage" value={watts} onChange={setWatts} />
        <NumberField label="Hours used per day" value={useHours} onChange={setUseHours} />
        <NumberField label="Price per kWh" value={kwhPrice} onChange={setKwhPrice} />
      </div>
      <ResultGrid>
        <ResultCard label="Cost per day" value={round(result.perDay, 2)} tone="emerald" />
        <ResultCard label="Cost per month" value={round(result.perMonth, 2)} tone="sky" />
        <ResultCard label="Cost per year" value={round(result.perYear, 2)} tone="amber" />
        <ResultCard label="Yearly energy (kWh)" value={round(result.yearlyKwh, 2)} tone="slate" />
      </ResultGrid>
      <FormulaNote>
        kWh per day = watts ÷ 1000 × hours per day · cost = kWh × price per kWh
      </FormulaNote>
    </CalcPanel>
  );
}
