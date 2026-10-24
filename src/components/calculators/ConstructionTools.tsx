"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Hammer, Ruler } from "lucide-react";
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
  btuForRoom,
  concreteVolume,
  gravelVolume,
  mulchVolume,
  paintNeeded,
  roofingEstimate,
  shapeArea,
  tileCount,
  type ShapeKind,
} from "./calc";

export function ConstructionTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.ConstructionTools");
  const locale = useLocale();
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("16");
  const [depth, setDepth] = useState("4");
  const [area, setArea] = useState("320");
  const [waste, setWaste] = useState("10");
  const [cost, setCost] = useState("150");
  const [tileLength, setTileLength] = useState("12");
  const [tileWidth, setTileWidth] = useState("12");
  const [grout, setGrout] = useState("0.125");
  const [roomHeight, setRoomHeight] = useState("8");
  const [coverage, setCoverage] = useState("350");
  const [coats, setCoats] = useState("2");
  const [doors, setDoors] = useState("21");
  const [windows, setWindows] = useState("15");
  const [pitch, setPitch] = useState("6");
  const [overhang, setOverhang] = useState("6");
  const [density, setDensity] = useState("1.35");
  const [ceilHeight, setCeilHeight] = useState("8");
  const [sun, setSun] = useState<"low" | "medium" | "high">("medium");
  const [occupants, setOccupants] = useState("2");
  const [kitchen, setKitchen] = useState("no");
  const [shapeKind, setShapeKind] = useState<ShapeKind>("rectangle");
  const [shapeA, setShapeA] = useState("20");
  const [shapeB, setShapeB] = useState("16");
  const [shapeCount, setShapeCount] = useState("1");
  const [circleRadius, setCircleRadius] = useState("6");

  if (variant === "square-footage") {
    const areaValue = shapeArea({
      kind: shapeKind,
      a: shapeKind === "circle" ? num(circleRadius) : num(shapeA),
      b: num(shapeB),
    });
    const count = Math.max(1, Math.round(num(shapeCount) || 1));
    const total = areaValue * count;
    return (
      <CalcPanel
        title={tUi("squareFootageCalculator")}
        subtitle={tUi("roomsFloorsAndLotsRectanglesCirclesAndTrianglesConvertedToMAndAcres")}
        icon={<Ruler className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField
            label={tUi("shape")}
            value={shapeKind}
            onChange={setShapeKind}
            options={[
              { value: "rectangle", label: tUi("rectangle") },
              { value: "circle", label: tUi("circle") },
              { value: "triangle", label: tUi("triangle") },
            ]}
          />
          {shapeKind === "circle" ? (
            <NumberField label={tUi("radiusFt")} value={circleRadius} onChange={setCircleRadius} />
          ) : (
            <NumberField label={tUi("sideAFt")} value={shapeA} onChange={setShapeA} />
          )}
          {shapeKind !== "circle" ? (
            <NumberField label={tUi("sideBFt")} value={shapeB} onChange={setShapeB} />
          ) : null}
          <NumberField label={tUi("howMany")} value={shapeCount} onChange={setShapeCount} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("totalArea")} value={round(total, 2)} unit="sq ft" tone="emerald" />
          <ResultCard label={tUi("squareMetres")} value={round(total * 0.092903, 2)} unit="m²" tone="sky" />
          <ResultCard label={tUi("acres")} value={round(total / 43560, 4)} tone="slate" />
          <ResultCard label={tUi("squareYards")} value={round(total / 9, 2)} unit="yd²" tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("rectangleCircleTriangleAreaFormulas")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "concrete") {
    const result = concreteVolume(
      num(length),
      num(width),
      num(depth),
      num(waste),
    );
    const price = num(cost);
    return (
      <CalcPanel
        title={tUi("concreteCalculator")}
        subtitle={tUi("howMuchConcreteASlabFootingOrPostHoleNeedsWithBagsAndCost")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("lengthFt")} value={length} onChange={setLength} />
          <NumberField label={tUi("widthFt")} value={width} onChange={setWidth} />
          <NumberField label={tUi("depthInches")} value={depth} onChange={setDepth} />
          <NumberField label={tUi("waste")} value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("cubicYards")} value={round(result.cubicYards, 2)} tone="emerald" />
          <ResultCard label={tUi("cubicFeet")} value={round(result.cubicFeet, 2)} tone="sky" />
          <ResultCard label={tUi("cubicMetres")} value={round(result.cubicMeters, 2)} tone="slate" />
          <ResultCard
            label={tUi("costAtPerYd3", { amount: cost })}
            value={round(result.cubicYards * price, 2)}
            tone="amber"
          />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("40LbBags")} value={result.bags[40]} tone="slate" />
          <ResultCard label={tUi("50LbBags")} value={result.bags[50]} tone="slate" />
          <ResultCard label={tUi("60LbBags")} value={result.bags[60]} tone="slate" />
          <ResultCard label={tUi("80LbBags")} value={result.bags[80]} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("cubicFeetAndCubicYardsWithBagYields")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "gravel") {
    const result = gravelVolume(
      num(area),
      num(depth),
      num(density),
      num(waste),
    );
    return (
      <CalcPanel
        title={tUi("gravelCalculator")}
        subtitle={tUi("howMuchGravelCrushedStoneRiverRockOrSandYouNeedInTonsAndCubicYards")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("areaSqFt")} value={area} onChange={setArea} />
          <NumberField label={tUi("depthInches")} value={depth} onChange={setDepth} />
          <NumberField label={tUi("densityTonsYd")} value={density} onChange={setDensity} />
          <NumberField label={tUi("waste")} value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("tons")} value={round(result.tons, 2)} tone="emerald" />
          <ResultCard label={tUi("metricTons")} value={round(result.metricTons, 2)} tone="sky" />
          <ResultCard label={tUi("cubicYards")} value={round(result.cubicYards, 2)} tone="slate" />
          <ResultCard label={tUi("cubicFeet")} value={round(result.cubicFeet, 2)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: tUi("costAtPerTon", { amount: cost }), value: round(result.tons * (num(cost)), 2) },
            { label: tUi("working"), value: `${area} sq ft × ${depth} in ÷ 12 = ${round(result.cubicFeet, 2)} ft³` },
          ]}
        />
        <FormulaNote>{tUi("tonsAndGravelDensities")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "mulch") {
    const result = mulchVolume(num(area), num(depth), num(waste));
    return (
      <CalcPanel
        title={tUi("mulchCalculator")}
        subtitle={tUi("howMuchMulchAGardenBedNeedsInCubicYardsAndBags")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("areaSqFt")} value={area} onChange={setArea} />
          <NumberField label={tUi("depthInches")} value={depth} onChange={setDepth} hint={tUi("23InForMostBeds")} />
          <NumberField label={tUi("waste")} value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("cubicYards")} value={round(result.cubicYards, 2)} tone="emerald" />
          <ResultCard label={tUi("cubicFeet")} value={round(result.cubicFeet, 2)} tone="sky" />
          <ResultCard label={tUi("15CuFtBags")} value={result.bags[1.5]} tone="slate" />
          <ResultCard label={tUi("2CuFtBags")} value={result.bags[2]} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("3CuFtBags")} value={result.bags[3]} tone="slate" />
          <ResultCard
            label={tUi("costAtPerYd3", { amount: cost })}
            value={round(result.cubicYards * (num(cost)), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>{tUi("mulchCubicFeetAndCubicYards")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "tile") {
    const result = tileCount(
      num(area),
      num(tileLength),
      num(tileWidth),
      num(grout),
      num(waste),
      5,
    );
    return (
      <CalcPanel
        title={tUi("tileCalculator")}
        subtitle={tUi("howManyTilesYouNeedFromTheAreaTileSizeAndGroutWidthPlusBoxesAndCost")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("floorAreaSqFt")} value={area} onChange={setArea} />
          <NumberField label={tUi("tileLengthIn")} value={tileLength} onChange={setTileLength} />
          <NumberField label={tUi("tileWidthIn")} value={tileWidth} onChange={setTileWidth} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("groutWidthIn")} value={grout} onChange={setGrout} />
          <NumberField label={tUi("wasteCuts")} value={waste} onChange={setWaste} />
          <NumberField label={tUi("costPerSqFt")} value={cost} onChange={setCost} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("tilesNeeded")} value={result.tilesNeeded} tone="emerald" />
          <ResultCard label={tUi("boxesNeeded")} value={result.boxesNeeded} tone="sky" hint={tUi("5TilesPerBox")} />
          <ResultCard label={tUi("floorArea")} value={round(result.squareFeet, 2)} unit="sq ft" tone="slate" />
          <ResultCard
            label={tUi("materialCost")}
            value={round(result.squareFeet * (num(cost)), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>{tUi("tileAreaIncludesTheGroutJoint")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "paint") {
    const result = paintNeeded(
      num(length),
      num(width),
      num(roomHeight),
      num(doors),
      num(windows),
      false,
      num(coverage),
      num(coats),
    );
    return (
      <CalcPanel
        title={tUi("paintCalculator")}
        subtitle={tUi("howManyGallonsOfPaintARoomNeedsWithOpeningsAndCoats")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("roomLengthFt")} value={length} onChange={setLength} />
          <NumberField label={tUi("roomWidthFt")} value={width} onChange={setWidth} />
          <NumberField label={tUi("wallHeightFt")} value={roomHeight} onChange={setRoomHeight} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("doorsSqFt")} value={doors} onChange={setDoors} />
          <NumberField label={tUi("windowsSqFt")} value={windows} onChange={setWindows} />
          <NumberField label={tUi("coverageSqFtGal")} value={coverage} onChange={setCoverage} />
          <NumberField label={tUi("coats")} value={coats} onChange={setCoats} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("gallons")} value={round(result.gallons, 2)} tone="emerald" />
          <ResultCard label={tUi("quarts")} value={round(result.quarts, 1)} tone="sky" />
          <ResultCard label={tUi("litres")} value={round(result.litres, 1)} tone="slate" />
          <ResultCard label={tUi("wallArea")} value={round(result.wallAreaSqFt, 2)} unit="sq ft" tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("wallAreaAndGallons")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "roofing") {
    const result = roofingEstimate(
      num(area),
      num(pitch),
      num(overhang),
      num(waste),
      3,
    );
    return (
      <CalcPanel
        title={tUi("roofingCalculator")}
        subtitle={tUi("roofAreaRoofingSquaresAndShingleBundlesFromYourHouseSizeAndPitch")}
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("footprintSqFt")} value={area} onChange={setArea} />
          <NumberField label={tUi("roofPitch")} value={pitch} onChange={setPitch} hint={tUi("66In12")} />
          <NumberField label={tUi("overhangIn")} value={overhang} onChange={setOverhang} />
          <NumberField label={tUi("waste")} value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("roofArea")} value={round(result.areaSqFt, 2)} unit="sq ft" tone="emerald" />
          <ResultCard label={tUi("roofingSquares")} value={round(result.squares, 2)} tone="sky" />
          <ResultCard label={tUi("bundlesNeeded")} value={result.bundles} tone="amber" hint={tUi("3SquaresPerBundle")} />
          <ResultCard label={tUi("pitchMultiplier")} value={round(result.pitchMultiplier, 4)} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label={tUi("underlaymentSqFt")} value={round(result.underlaymentSqFt, 2)} tone="slate" />
          <ResultCard
            label={tUi("costAtPerSquare", { amount: cost })}
            value={round(result.squares * (num(cost)), 2)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("pitchMultiplierAndRoofingSquares")}</FormulaNote>
      </CalcPanel>
    );
  }

  // btu
  const result = btuForRoom(
    num(area),
    num(ceilHeight),
    sun,
    num(occupants),
    kitchen === "yes",
  );
  return (
    <CalcPanel
      title={tUi("bTUCalculator")}
      subtitle={tUi("theBTUAndACSizeARoomNeedsFromItsSizeCeilingHeightSunAndOccupants")}
      icon={<Hammer className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label={tUi("roomSizeSqFt")} value={area} onChange={setArea} />
        <NumberField label={tUi("ceilingHeightFt")} value={ceilHeight} onChange={setCeilHeight} />
        <NumberField label={tUi("occupants")} value={occupants} onChange={setOccupants} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={tUi("sunExposure")}
          value={sun}
          onChange={setSun}
          options={[
            { value: "low", label: tUi("lowShaded") },
            { value: "medium", label: tUi("medium") },
            { value: "high", label: tUi("highLotsOfSun") },
          ]}
        />
        <SelectField
          label={tUi("kitchen")}
          value={kitchen}
          onChange={setKitchen}
          options={[
            { value: "no", label: tUi("no") },
            { value: "yes", label: tUi("yesAdd1200BTU", { btu: 1200 }) },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label={tUi("bTUNeeded")} value={result.btu.toLocaleString(locale)} tone="emerald" />
        <ResultCard
          label={tUi("recommendedAC")}
          value={
            result.recommendedTonLabel === "1"
              ? tUi("btuRecommendationOne", {
                  btu: result.recommendedBtu.toLocaleString(locale),
                })
              : tUi("btuRecommendationMany", {
                  btu: result.recommendedBtu.toLocaleString(locale),
                  tons: result.recommendedTonLabel,
                })
          }
          tone="sky"
        />
        <ResultCard label={tUi("tons")} value={result.recommendedTons} tone="slate" />
        <ResultCard
          label={tUi("roomSize")}
          value={result.squareFeet}
          unit={tUi("squareFeetUnit")}
          tone="slate"
        />
      </ResultGrid>
      <FormulaNote>{tUi("bTUBaseWithCeilingsOccupantsAndKitchen")}</FormulaNote>
    </CalcPanel>
  );
}
