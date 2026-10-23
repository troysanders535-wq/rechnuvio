"use client";

import React, { useState } from "react";
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
        title="Square Footage Calculator"
        subtitle="Rooms, floors and lots — rectangles, circles and triangles, converted to m² and acres."
        icon={<Ruler className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField
            label="Shape"
            value={shapeKind}
            onChange={setShapeKind}
            options={[
              { value: "rectangle", label: "Rectangle" },
              { value: "circle", label: "Circle" },
              { value: "triangle", label: "Triangle" },
            ]}
          />
          {shapeKind === "circle" ? (
            <NumberField label="Radius (ft)" value={circleRadius} onChange={setCircleRadius} />
          ) : (
            <NumberField label="Side A (ft)" value={shapeA} onChange={setShapeA} />
          )}
          {shapeKind !== "circle" ? (
            <NumberField label="Side B (ft)" value={shapeB} onChange={setShapeB} />
          ) : null}
          <NumberField label="How many" value={shapeCount} onChange={setShapeCount} />
        </div>
        <ResultGrid>
          <ResultCard label="Total area" value={round(total, 2)} unit="sq ft" tone="emerald" />
          <ResultCard label="Square metres" value={round(total * 0.092903, 2)} unit="m²" tone="sky" />
          <ResultCard label="Acres" value={round(total / 43560, 4)} tone="slate" />
          <ResultCard label="Square yards" value={round(total / 9, 2)} unit="yd²" tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Rectangle = length × width · Circle = π × radius² · Triangle = (base × height) ÷ 2.
          Square metres = sq ft × 0.092903 · Acres = sq ft ÷ 43,560.
        </FormulaNote>
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
        title="Concrete Calculator"
        subtitle="How much concrete a slab, footing or post hole needs — with bags and cost."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Length (ft)" value={length} onChange={setLength} />
          <NumberField label="Width (ft)" value={width} onChange={setWidth} />
          <NumberField label="Depth (inches)" value={depth} onChange={setDepth} />
          <NumberField label="Waste (%)" value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label="Cubic yards" value={round(result.cubicYards, 2)} tone="emerald" />
          <ResultCard label="Cubic feet" value={round(result.cubicFeet, 2)} tone="sky" />
          <ResultCard label="Cubic metres" value={round(result.cubicMeters, 2)} tone="slate" />
          <ResultCard
            label={`Cost at $${cost}/yd³`}
            value={round(result.cubicYards * price, 2)}
            tone="amber"
          />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="40 lb bags" value={result.bags[40]} tone="slate" />
          <ResultCard label="50 lb bags" value={result.bags[50]} tone="slate" />
          <ResultCard label="60 lb bags" value={result.bags[60]} tone="slate" />
          <ResultCard label="80 lb bags" value={result.bags[80]} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          cubic feet = length × width × (depth ÷ 12) · cubic yards = cubic feet ÷ 27 · an 80 lb bag
          yields about 0.60 ft³, a 60 lb bag 0.45 ft³.
        </FormulaNote>
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
        title="Gravel Calculator"
        subtitle="How much gravel, crushed stone, river rock or sand you need in tons and cubic yards."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Area (sq ft)" value={area} onChange={setArea} />
          <NumberField label="Depth (inches)" value={depth} onChange={setDepth} />
          <NumberField label="Density (tons/yd³)" value={density} onChange={setDensity} />
          <NumberField label="Waste (%)" value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label="Tons" value={round(result.tons, 2)} tone="emerald" />
          <ResultCard label="Metric tons" value={round(result.metricTons, 2)} tone="sky" />
          <ResultCard label="Cubic yards" value={round(result.cubicYards, 2)} tone="slate" />
          <ResultCard label="Cubic feet" value={round(result.cubicFeet, 2)} tone="slate" />
        </ResultGrid>
        <DetailList
          items={[
            { label: "Cost at $" + cost + "/ton", value: round(result.tons * (num(cost)), 2) },
            { label: "Working", value: `${area} sq ft × ${depth} in ÷ 12 = ${round(result.cubicFeet, 2)} ft³` },
          ]}
        />
        <FormulaNote>
          Tons = (area × depth in feet ÷ 27) × density. Pea gravel is about 1.4 tons per cubic
          yard, crushed stone about 1.35 and sand about 1.3.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "mulch") {
    const result = mulchVolume(num(area), num(depth), num(waste));
    return (
      <CalcPanel
        title="Mulch Calculator"
        subtitle="How much mulch a garden bed needs in cubic yards and bags."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Area (sq ft)" value={area} onChange={setArea} />
          <NumberField label="Depth (inches)" value={depth} onChange={setDepth} hint="2–3 in for most beds" />
          <NumberField label="Waste (%)" value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label="Cubic yards" value={round(result.cubicYards, 2)} tone="emerald" />
          <ResultCard label="Cubic feet" value={round(result.cubicFeet, 2)} tone="sky" />
          <ResultCard label="1.5 cu ft bags" value={result.bags[1.5]} tone="slate" />
          <ResultCard label="2 cu ft bags" value={result.bags[2]} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="3 cu ft bags" value={result.bags[3]} tone="slate" />
          <ResultCard
            label={`Cost at $${cost}/yd³`}
            value={round(result.cubicYards * (num(cost)), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>
          cubic feet = area × (depth ÷ 12) · cubic yards = cubic feet ÷ 27.
        </FormulaNote>
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
        title="Tile Calculator"
        subtitle="How many tiles you need from the area, tile size and grout width, plus boxes and cost."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Floor area (sq ft)" value={area} onChange={setArea} />
          <NumberField label="Tile length (in)" value={tileLength} onChange={setTileLength} />
          <NumberField label="Tile width (in)" value={tileWidth} onChange={setTileWidth} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Grout width (in)" value={grout} onChange={setGrout} />
          <NumberField label="Waste / cuts (%)" value={waste} onChange={setWaste} />
          <NumberField label="Cost per sq ft" value={cost} onChange={setCost} />
        </div>
        <ResultGrid>
          <ResultCard label="Tiles needed" value={result.tilesNeeded} tone="emerald" />
          <ResultCard label="Boxes needed" value={result.boxesNeeded} tone="sky" hint="5 tiles per box" />
          <ResultCard label="Floor area" value={round(result.squareFeet, 2)} unit="sq ft" tone="slate" />
          <ResultCard
            label="Material cost"
            value={round(result.squareFeet * (num(cost)), 2)}
            tone="amber"
          />
        </ResultGrid>
        <FormulaNote>
          Tile area includes the grout joint: (length + grout) × (width + grout) ÷ 144. Tiles = area ÷
          tile area, plus the waste allowance.
        </FormulaNote>
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
        title="Paint Calculator"
        subtitle="How many gallons of paint a room needs, with openings and coats."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Room length (ft)" value={length} onChange={setLength} />
          <NumberField label="Room width (ft)" value={width} onChange={setWidth} />
          <NumberField label="Wall height (ft)" value={roomHeight} onChange={setRoomHeight} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Doors (sq ft)" value={doors} onChange={setDoors} />
          <NumberField label="Windows (sq ft)" value={windows} onChange={setWindows} />
          <NumberField label="Coverage (sq ft/gal)" value={coverage} onChange={setCoverage} />
          <NumberField label="Coats" value={coats} onChange={setCoats} />
        </div>
        <ResultGrid>
          <ResultCard label="Gallons" value={round(result.gallons, 2)} tone="emerald" />
          <ResultCard label="Quarts" value={round(result.quarts, 1)} tone="sky" />
          <ResultCard label="Litres" value={round(result.litres, 1)} tone="slate" />
          <ResultCard label="Wall area" value={round(result.wallAreaSqFt, 2)} unit="sq ft" tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Wall area = perimeter × height − doors − windows. Gallons = area ÷ coverage × coats. One
          gallon covers roughly 350 sq ft.
        </FormulaNote>
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
        title="Roofing Calculator"
        subtitle="Roof area, roofing squares and shingle bundles from your house size and pitch."
        icon={<Hammer className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Footprint (sq ft)" value={area} onChange={setArea} />
          <NumberField label="Roof pitch" value={pitch} onChange={setPitch} hint="6 = 6 in 12" />
          <NumberField label="Overhang (in)" value={overhang} onChange={setOverhang} />
          <NumberField label="Waste (%)" value={waste} onChange={setWaste} />
        </div>
        <ResultGrid>
          <ResultCard label="Roof area" value={round(result.areaSqFt, 2)} unit="sq ft" tone="emerald" />
          <ResultCard label="Roofing squares" value={round(result.squares, 2)} tone="sky" />
          <ResultCard label="Bundles needed" value={result.bundles} tone="amber" hint="3 squares per bundle" />
          <ResultCard label="Pitch multiplier" value={round(result.pitchMultiplier, 4)} tone="slate" />
        </ResultGrid>
        <ResultGrid>
          <ResultCard label="Underlayment (sq ft)" value={round(result.underlaymentSqFt, 2)} tone="slate" />
          <ResultCard
            label={`Cost at $${cost}/square`}
            value={round(result.squares * (num(cost)), 2)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          Pitch multiplier = √(1 + (pitch ÷ 12)²). One roofing square is 100 sq ft; three squares
          make a bundle of shingles.
        </FormulaNote>
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
      title="BTU Calculator"
      subtitle="The BTU and AC size a room needs from its size, ceiling height, sun and occupants."
      icon={<Hammer className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Room size (sq ft)" value={area} onChange={setArea} />
        <NumberField label="Ceiling height (ft)" value={ceilHeight} onChange={setCeilHeight} />
        <NumberField label="Occupants" value={occupants} onChange={setOccupants} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Sun exposure"
          value={sun}
          onChange={setSun}
          options={[
            { value: "low", label: "Low — shaded" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High — lots of sun" },
          ]}
        />
        <SelectField
          label="Kitchen?"
          value={kitchen}
          onChange={setKitchen}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes — add 1,200 BTU" },
          ]}
        />
      </div>
      <ResultGrid>
        <ResultCard label="BTU needed" value={result.btu.toLocaleString()} tone="emerald" />
        <ResultCard label="Recommended AC" value={result.recommended} tone="sky" />
        <ResultCard label="Tons" value={result.recommendedTons} tone="slate" />
        <ResultCard label="Room size" value={result.squareFeet} unit="sq ft" tone="slate" />
      </ResultGrid>
      <FormulaNote>
        Base = 30 BTU per sq ft · high ceilings add 5 BTU per sq ft · each occupant adds 300 BTU ·
        a kitchen adds 1,200 BTU. One ton of cooling equals 12,000 BTU.
      </FormulaNote>
    </CalcPanel>
  );
}
