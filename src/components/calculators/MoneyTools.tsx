"use client";

import React, { useState } from "react";
import { DollarSign, Zap } from "lucide-react";
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
  const tUi = useTranslations("ui.calculators.MoneyTools");
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
  const [tax, setTax] = useState("0");

  const numPrice = num(price);
  const numCost = num(cost);
  const numPercent = num(percent);
  const numHours = num(hours);
  const numWeeks = num(weeks);
  const numRate = num(rate);
  const numOtHours = num(otHours);
  const numMultiplier = num(multiplier);
  const numDoubleAfter = num(doubleAfter);
  const numTax = num(tax);

  if (variant === "discount") {
    const salePrice = discountPrice(numPrice, numPercent);
    return (
      <CalcPanel
        title={tUi("discountCalculator")}
        subtitle={tUi("salePriceSavingsStackedDiscountsAndSalesTax")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("originalPrice")} value={price} onChange={setPrice} />
          <NumberField label={tUi("discount")} value={percent} onChange={setPercent} />
          <NumberField label={tUi("extraDiscount")} value={rate} onChange={setRate} />
          <NumberField label={tUi("salesTax")} value={tax} onChange={setTax} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("salePrice")}
            value={round(salePrice, 2)}
            tone="emerald"
          />
          <ResultCard label={tUi("youSave")} value={round(numPrice - salePrice, 2)} tone="sky" />
          <ResultCard
            label={tUi("withStackedDiscount")}
            value={round(discountPrice(salePrice, numRate), 2)}
            tone="amber"
          />
          <ResultCard
            label={tUi("salePriceTax")}
            value={round(priceAfterTax(salePrice, numTax), 2)}
            tone="slate"
            hint={`${salePrice} × (1 + ${numTax}/100)`}
          />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("working"), value: `${price} × (1 − ${percent}/100)` },
            { label: tUi("originalPriceFromSalePrice"), value: round(numPrice === 0 ? 0 : discountPrice(numPrice, numPercent) / (1 - numPercent / 100 || 1), 2) },
            { label: tUi("excelFormula"), value: "=A2*(1-B2/100)" },
          ]}
        />
        <FormulaNote>{tUi("stackedDiscountsAndSalesTaxFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "margin") {
    return (
      <CalcPanel
        title={tUi("marginCalculator")}
        subtitle={tUi("profitMarginFromCostAndPriceOrTheSellingPriceForATargetMargin")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("cost")} value={cost} onChange={setCost} />
          <NumberField label={tUi("sellingPrice")} value={price} onChange={setPrice} />
          <NumberField label={tUi("targetMargin")} value={percent} onChange={setPercent} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("profitMargin")} value={round(marginPercent(numCost, numPrice), 4)} unit="%" tone="emerald" />
          <ResultCard label={tUi("markup")} value={round(markupPercent(numCost, numPrice), 4)} unit="%" tone="sky" />
          <ResultCard label={tUi("profit")} value={round(numPrice - numCost, 4)} tone="slate" />
          <ResultCard
            label={tUi("priceForTargetMargin")}
            value={round(priceForMargin(numCost, numPercent), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>{tUi("marginAndMarkupFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "markup") {
    return (
      <CalcPanel
        title={tUi("markupCalculator")}
        subtitle={tUi("sellingPriceFromAMarkupOrTheMarkupOfAGivenPrice")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("cost")} value={cost} onChange={setCost} />
          <NumberField label={tUi("markup2")} value={percent} onChange={setPercent} />
          <NumberField label={tUi("sellingPrice")} value={price} onChange={setPrice} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("sellingPrice")} value={round(priceFromMarkup(numCost, numPercent), 2)} tone="emerald" />
          <ResultCard label={tUi("markup")} value={round(markupPercent(numCost, numPrice), 4)} unit="%" tone="sky" />
          <ResultCard label={tUi("margin")} value={round(marginPercent(numCost, numPrice), 4)} unit="%" tone="slate" />
          <ResultCard label={tUi("profit")} value={round(numPrice - numCost, 4)} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("sellingPriceFromMarkupFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "salary-hourly") {
    const hourly = salaryToHourly(numPrice, numHours, numWeeks);
    return (
      <CalcPanel
        title={tUi("salaryToHourlyCalculator")}
        subtitle={tUi("convertAnAnnualSalaryToAnHourlyWageAndOtherPayPeriods")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("annualSalary")} value={price} onChange={setPrice} />
          <NumberField label={tUi("hoursPerWeek")} value={hours} onChange={setHours} />
          <NumberField label={tUi("paidWeeksPerYear")} value={weeks} onChange={setWeeks} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("hourlyWage")} value={round(hourly, 2)} tone="emerald" />
          <ResultCard label={tUi("weekly")} value={round(hourly * numHours, 2)} tone="sky" />
          <ResultCard label={tUi("biWeekly")} value={round(hourly * numHours * 2, 2)} tone="sky" />
          <ResultCard label={tUi("monthly")} value={round(numPrice / 12, 2)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          {tUi("hourlyRateFromAnnualSalaryFormulaNote", { hours: String(numHours), weeks: String(numWeeks) })}
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "hourly-salary") {
    const annual = hourlyToSalary(numRate, numHours, numWeeks);
    return (
      <CalcPanel
        title={tUi("hourlyToSalaryCalculator")}
        subtitle={tUi("convertAnHourlyWageToAnnualWeeklyBiWeeklyAndDailyPay")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("hourlyWage")} value={rate} onChange={setRate} />
          <NumberField label={tUi("hoursPerWeek")} value={hours} onChange={setHours} />
          <NumberField label={tUi("paidWeeksPerYear")} value={weeks} onChange={setWeeks} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("annualSalary")} value={round(annual, 2)} tone="emerald" />
          <ResultCard label={tUi("weekly")} value={round(numRate * numHours, 2)} tone="sky" />
          <ResultCard label={tUi("biWeekly")} value={round(numRate * numHours * 2, 2)} tone="sky" />
          <ResultCard
            label={tUi("daily8H")}
            value={round(numRate * 8, 2)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("annualSalaryFromHourlyRateFormulaNote")}</FormulaNote>
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
        title={tUi("overtimeCalculator")}
        subtitle={tUi("timeAndAHalfAndDoubleTimeWithTheRegularAndOvertimePaySplitOut")}
        icon={<DollarSign className="size-5 text-emerald-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-5">
          <NumberField label={tUi("hoursWorked")} value={otHours} onChange={setOtHours} />
          <NumberField label={tUi("hourlyRate")} value={rate} onChange={setRate} />
          <NumberField label={tUi("overtimeAfterH")} value="8" onChange={() => {}} hint={tUi("8Hours")} />
          <NumberField
            label={tUi("doubleTimeAfterH")}
            value={doubleAfter}
            onChange={setDoubleAfter}
          />
          <NumberField
            label={tUi("overtimeMultiplier")}
            value={multiplier}
            onChange={setMultiplier}
            hint={tUi("15TimeAndAHalf")}
          />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("regularPay")} value={round(result.regularPay, 2)} tone="sky" />
          <ResultCard label={tUi("overtimePay")} value={round(result.overtimePay, 2)} tone="amber" />
          <ResultCard label={tUi("totalPay")} value={round(result.totalPay, 2)} tone="emerald" />
          <ResultCard
            label={tUi("regularHours")}
            value={round(result.regularHours, 2)}
            unit="h"
            tone="slate"
          />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("overtimeHours"), value: `${round(result.overtimeHours, 2)} h` },
            { label: tUi("doubleTimeHours"), value: `${round(result.doubleTimeHours, 2)} h` },
            { label: tUi("working"), value: `${numOtHours} h → ${round(result.regularHours, 2)} regular + ${round(result.overtimeHours, 2)} OT` },
          ]}
        />
        <FormulaNote>{tUi("overtimePayFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  // electricity-cost
  const result = electricityCost(num(watts), num(useHours), num(kwhPrice));
  return (
    <CalcPanel
      title={tUi("electricityCostCalculator")}
      subtitle={tUi("whatAnApplianceCostsToRunPerDayMonthAndYear")}
      icon={<Zap className="size-5 text-amber-600" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label={tUi("wattage")} value={watts} onChange={setWatts} />
        <NumberField label={tUi("hoursUsedPerDay")} value={useHours} onChange={setUseHours} />
        <NumberField label={tUi("pricePerKWh")} value={kwhPrice} onChange={setKwhPrice} />
      </div>
      <ResultGrid>
        <ResultCard label={tUi("costPerDay")} value={round(result.perDay, 2)} tone="emerald" />
        <ResultCard label={tUi("costPerMonth")} value={round(result.perMonth, 2)} tone="sky" />
        <ResultCard label={tUi("costPerYear")} value={round(result.perYear, 2)} tone="amber" />
        <ResultCard label={tUi("yearlyEnergyKWh")} value={round(result.yearlyKwh, 2)} tone="slate" />
      </ResultGrid>
      <FormulaNote>{tUi("electricityCostFormulaNote")}</FormulaNote>
    </CalcPanel>
  );
}
