"use client";

import React, { useState } from "react";
import { BarChart3 } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
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
        title="Average Calculator"
        subtitle="Mean, median, mode, range and standard deviation for any list of numbers."
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField
          label="Numbers"
          value={list}
          onChange={setList}
          hint="Separate the numbers with commas, spaces or new lines."
        />
        <ResultGrid>
          <ResultCard label="Mean (average)" value={round(m, 4)} tone="emerald" />
          <ResultCard label="Median" value={round(median(data), 4)} tone="sky" />
          <ResultCard
            label="Mode"
            value={modes(data).length ? modes(data).join(", ") : "none"}
            tone="slate"
          />
          <ResultCard label="Range" value={round(rangeOf(data), 4)} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="Count" value={data.length} tone="slate" />
          <ResultCard label="Sample SD" value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label="Population SD" value={round(populationSd, 4)} tone="slate" />
          <ResultCard label="Minimum" value={data.length ? round(Math.min(...data), 4) : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          mean = Σx ÷ n · median = middle value of the sorted list · mode = most frequent value
        </FormulaNote>
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
            ? "Uses the n − 1 formula for a sample taken from a larger population."
            : "Uses the population formula (divide by N)."
        }
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label="Data set" value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard
            label={isSample ? "Sample SD (s)" : "Population SD (σ)"}
            value={round(sdValue, 4)}
            tone="emerald"
          />
          <ResultCard
            label={isSample ? "Sample variance (s²)" : "Population variance (σ²)"}
            value={round(varValue, 4)}
            tone="sky"
          />
          <ResultCard label="Mean" value={round(m, 4)} tone="slate" />
          <ResultCard label="Count (n)" value={data.length} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="Sample SD" value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label="Population SD" value={round(populationSd, 4)} tone="slate" />
          <ResultCard label="Median" value={round(median(data), 4)} tone="slate" />
          <ResultCard label="Range" value={round(rangeOf(data), 4)} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          {isSample
            ? "s = √( Σ(x − x̄)² ÷ (n − 1) ) — the sample formula"
            : "σ = √( Σ(x − μ)² ÷ N ) — the population formula"}
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "variance") {
    return (
      <CalcPanel
        title="Variance Calculator"
        subtitle="Sample variance (s²) and population variance (σ²) with the sum of squares."
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label="Data set" value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard label="Sample variance (s²)" value={round(variance(data, true), 4)} tone="emerald" />
          <ResultCard label="Population variance (σ²)" value={round(variance(data, false), 4)} tone="sky" />
          <ResultCard label="Sample SD" value={round(sampleSd, 4)} tone="slate" />
          <ResultCard label="Mean" value={round(m, 4)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Sum of squared deviations (÷ n − 1)", value: round(variance(data, true) * (data.length - 1), 4) },
            { label: "Sum of squared deviations (÷ n)", value: round(variance(data, false) * data.length, 4) },
            { label: "Count (n)", value: data.length },
          ]}
        />
        <FormulaNote>
          s² = Σ(x − x̄)² ÷ (n − 1) · σ² = Σ(x − μ)² ÷ N
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "mad") {
    const deviations = data.map((v) => ({ value: v, deviation: Math.abs(v - m) }));
    return (
      <CalcPanel
        title="Mean Absolute Deviation Calculator"
        subtitle="The average distance of every value from the mean."
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <NumberListField label="Data set" value={list} onChange={setList} />
        <ResultGrid>
          <ResultCard label="Mean" value={round(m, 4)} tone="sky" />
          <ResultCard label="Mean absolute deviation" value={round(meanAbsoluteDeviation(data), 4)} tone="emerald" />
          <ResultCard label="Count (n)" value={data.length} tone="slate" />
          <ResultCard label="Sum of deviations" value={round(deviations.reduce((s, d) => s + d.deviation, 0), 4)} tone="slate" />
        </ResultGrid>
        <Table
          headers={["Value", "Mean", "Absolute deviation"]}
          rows={deviations.map((d) => [d.value, round(m, 2), round(d.deviation, 4)])}
        />
        <FormulaNote>
          MAD = Σ|x − x̄| ÷ n
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "z-score") {
    const z = zScore(num(value), num(mu), num(sd));
    const dataZ = data.map((v) => round(zScore(v, num(mu), num(sd)), 4));
    return (
      <CalcPanel
        title="Z-Score Calculator"
        subtitle="How many standard deviations a value sits from the mean, with its percentile."
        icon={<BarChart3 className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Value (x)" value={value} onChange={setValue} />
          <NumberField label="Mean (μ)" value={mu} onChange={setMu} />
          <NumberField label="Standard deviation (σ)" value={sd} onChange={setSd} />
        </div>
        <ResultGrid>
          <ResultCard label="Z-score" value={round(z, 4)} tone="emerald" />
          <ResultCard label="Percentile" value={round(percentileFromZ(z), 2)} unit="%" tone="sky" />
          <ResultCard label="Below the mean by" value={round((num(mu)) - (num(value)), 4)} tone="slate" />
          <ResultCard label="Normal probability" value={round(normalCdf(z), 6)} tone="slate" />
        </ResultGrid>
        {data.length ? (
          <>
            <p className="text-xs font-semibold text-slate-500">Z-scores of the data set</p>
            <Table
              headers={["Value", "Z-score"]}
              rows={data.map((v, i) => [v, dataZ[i]])}
            />
          </>
        ) : null}
        <FormulaNote>
          z = (x − μ) ÷ σ · the percentile comes from the standard normal CDF.
        </FormulaNote>
      </CalcPanel>
    );
  }

  // quartile
  return (
    <CalcPanel
      title="Quartile and IQR Calculator"
      subtitle="Q1, median, Q3, the interquartile range, outliers and the five number summary."
      icon={<BarChart3 className="size-5 text-sky-700" />}
    >
      <NumberListField label="Data set" value={list} onChange={setList} />
      <ResultGrid>
        <ResultCard label="Q1 (25%)" value={round(summary.q1, 4)} tone="sky" />
        <ResultCard label="Median" value={round(summary.median, 4)} tone="emerald" />
        <ResultCard label="Q3 (75%)" value={round(summary.q3, 4)} tone="sky" />
        <ResultCard label="IQR (Q3 − Q1)" value={round(summary.iqr, 4)} tone="amber" />
      </ResultGrid>
      <ResultGrid>
        <ResultCard label="Minimum" value={round(summary.min, 4)} tone="slate" />
        <ResultCard label="Maximum" value={round(summary.max, 4)} tone="slate" />
        <ResultCard
          label="Outliers"
          value={summary.outliers.length ? summary.outliers.join(", ") : "none"}
          tone="slate"
        />
        <ResultCard label="Count (n)" value={data.length} tone="slate" />
      </ResultGrid>
      <FormulaNote>
        Tukey hinges: Q1 is the median of the lower half, Q3 the median of the upper half. IQR =
        Q3 − Q1. Outliers lie outside Q1 − 1.5·IQR and Q3 + 1.5·IQR.
      </FormulaNote>
    </CalcPanel>
  );
}
