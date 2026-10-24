"use client";

import React, { useState } from "react";
import { BarChart3 } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  NumberListField,
  ResultCard,
  ResultGrid,
  Table,
  parseNumberList,
  num,
  round,
} from "./shared";
import {
  mean,
  meanAbsoluteDeviation,
  median,
  modes,
  normalCdf,
  percentileFromZ,
  quartileSummary,
  rangeOf,
  standardDeviation,
  variance,
  zScore,
} from "./calc";

const SAMPLE_DATA = "12, 15, 23, 27, 34, 45, 52, 60";

export function StatsTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.StatsTools");
  const [list, setList] = useState(SAMPLE_DATA);
  const [value, setValue] = useState("70");
  const [mu, setMu] = useState("55");
  const [sd, setSd] = useState("12");

  const data = parseNumberList(list);
  const m = mean(data);
  const sampleSd = standardDeviation(data, true);
  const populationSd = standardDeviation(data, false);

  const summary = quartileSummary(data);

  if (variant === "average") {
    return (
      <CalcPanel
        title={tUi("averageCalculator")}
        subtitle={tUi("meanMedianModeRangeAndStandardDeviationForAnyListOfNumbers")}
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField
          label={tUi("numbers")}
          value={list}
          onChange={setList}
          hint={tUi("separateTheNumbersWithCommasSpacesOrNewLines")}
        />
        <ResultGrid>
          <ResultCard label={tUi("meanAverage")} value={round(m, 4)} tone="emerald" />
          <ResultCard label={tUi("median")} value={round(median(data), 4)} tone="sky" />
          <ResultCard
            label={tUi("mode")}
            value={modes(data).length ? modes(data).join(", ") : tUi("noMode")}
            tone="slate"
          />
          <ResultCard label={tUi("range")} value={round(rangeOf(data), 4)} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("count")} value={data.length} tone="slate" />
          <ResultCard label={tUi("sampleSD")} value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label={tUi("populationSD")} value={round(populationSd, 4)} tone="slate" />
          <ResultCard label={tUi("minimum")} value={data.length ? round(Math.min(...data), 4) : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("meanMedianModeFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "std-dev" || variant === "sample-std-dev" || variant === "population-std-dev") {
    const isSample = variant !== "population-std-dev";
    const sdValue = isSample ? sampleSd : populationSd;
    const varValue = variance(data, isSample);
    return (
      <CalcPanel
        title={
          variant === "population-std-dev"
            ? "Population Standard Deviation Calculator"
            : variant === "sample-std-dev"
              ? "Sample Standard Deviation Calculator"
              : "Standard Deviation Calculator"
        }
        subtitle={
          isSample
            ? tUi("sampleStandardDeviationSubtitle")
            : tUi("populationStandardDeviationSubtitle")
        }
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label={tUi("dataSet")} value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard
            label={isSample ? tUi("sampleSDS") : tUi("populationSD2")}
            value={round(sdValue, 4)}
            tone="emerald"
          />
          <ResultCard
            label={isSample ? tUi("sampleVarianceS") : tUi("populationVariance")}
            value={round(varValue, 4)}
            tone="sky"
          />
          <ResultCard label={tUi("mean")} value={round(m, 4)} tone="slate" />
          <ResultCard label={tUi("countN")} value={data.length} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("sampleSD")} value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label={tUi("populationSD")} value={round(populationSd, 4)} tone="slate" />
          <ResultCard label={tUi("median")} value={round(median(data), 4)} tone="slate" />
          <ResultCard label={tUi("range")} value={round(rangeOf(data), 4)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          {isSample
            ? tUi("sampleStandardDeviationFormulaNote")
            : tUi("populationStandardDeviationFormulaNote")}
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "variance") {
    return (
      <CalcPanel
        title={tUi("varianceCalculator")}
        subtitle={tUi("sampleVarianceSAndPopulationVarianceWithTheSumOfSquares")}
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label={tUi("dataSet")} value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard label={tUi("sampleVarianceS")} value={round(variance(data, true), 4)} tone="emerald" />
          <ResultCard label={tUi("populationVariance")} value={round(variance(data, false), 4)} tone="sky" />
          <ResultCard label={tUi("sampleSD")} value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label={tUi("mean")} value={round(m, 4)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("sumOfSquaredDeviationsN1"), value: round(variance(data, true) * (data.length - 1), 4) },
            { label: tUi("sumOfSquaredDeviationsN"), value: round(variance(data, false) * data.length, 4) },
            { label: tUi("countN"), value: data.length },
          ]}
        />
        <FormulaNote>{tUi("varianceFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "mad") {
    const deviations = data.map((v) => ({ value: v, deviation: Math.abs(v - m) }));
    return (
      <CalcPanel
        title={tUi("meanAbsoluteDeviationCalculator")}
        subtitle={tUi("theAverageDistanceOfEveryValueFromTheMean")}
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label={tUi("dataSet")} value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard label={tUi("mean")} value={round(m, 4)} tone="sky" />
          <ResultCard label={tUi("meanAbsoluteDeviation")} value={round(meanAbsoluteDeviation(data), 4)} tone="emerald" />
          <ResultCard label={tUi("countN")} value={data.length} tone="slate" />
          <ResultCard label={tUi("sumOfDeviations")} value={round(deviations.reduce((s, d) => s + d.deviation, 0), 4)} tone="slate" />
        </ResultGrid>
        <Table
          headers={[tUi("value"), tUi("mean"), tUi("absoluteDeviation")]}
          rows={deviations.map((d) => [d.value, round(m, 2), round(d.deviation, 4)])}
        />
        <FormulaNote>{tUi("meanAbsoluteDeviationFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "z-score") {
    const z = zScore(num(value), num(mu), num(sd));
    const dataZ = data.map((v) => round(zScore(v, num(mu), num(sd)), 4));
    return (
      <CalcPanel
        title={tUi("zScoreCalculator")}
        subtitle={tUi("howManyStandardDeviationsAValueSitsFromTheMeanWithItsPercentile")}
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("valueX")} value={value} onChange={setValue} />
          <NumberField label={tUi("mean2")} value={mu} onChange={setMu} />
          <NumberField label={tUi("standardDeviation")} value={sd} onChange={setSd} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("zScore")} value={round(z, 4)} tone="emerald" />
          <ResultCard label={tUi("percentile")} value={round(percentileFromZ(z), 2)} unit="%" tone="sky" />
          <ResultCard label={tUi("belowTheMeanBy")} value={round((num(mu)) - (num(value)), 4)} tone="slate" />
          <ResultCard label={tUi("normalProbability")} value={round(normalCdf(z), 6)} tone="slate" />
        </ResultGrid>
        {data.length ? (
          <>
            <p className="text-xs font-semibold text-slate-500">{tUi("zScoresOfTheDataSet")}</p>
            <Table
              headers={["Value", "Z-score"]}
              rows={data.map((v, i) => [v, dataZ[i]])}
            />
          </>
        ) : null}
        <FormulaNote>{tUi("zScoreFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  // quartile
  return (
    <CalcPanel
      title={tUi("quartileAndIQRCalculator")}
      subtitle={tUi("q1MedianQ3TheInterquartileRangeOutliersAndTheFiveNumberSummary")}
      icon={<BarChart3 className="size-5 text-sky-700" />}
    >
      <NumberListField label={tUi("dataSet")} value={list} onChange={setList} />
      <ResultGrid>
        <ResultCard label={tUi("q125")} value={round(summary.q1, 4)} tone="sky" />
        <ResultCard label={tUi("median")} value={round(summary.median, 4)} tone="emerald" />
        <ResultCard label={tUi("q375")} value={round(summary.q3, 4)} tone="sky" />
        <ResultCard label={tUi("iQRQ3Q1")} value={round(summary.iqr, 4)} tone="amber" />
      </ResultGrid>
      <ResultGrid>
        <ResultCard label={tUi("minimum")} value={round(summary.min, 4)} tone="slate" />
        <ResultCard label={tUi("maximum")} value={round(summary.max, 4)} tone="slate" />
        <ResultCard
          label={tUi("outliers")}
          value={summary.outliers.length ? summary.outliers.join(", ") : "none"}
          tone="slate"
        />
        <ResultCard label={tUi("countN")} value={data.length} tone="slate" />
      </ResultGrid>
      <FormulaNote>{tUi("quartileAndIQRFormulaNote")}</FormulaNote>
    </CalcPanel>
  );
}
