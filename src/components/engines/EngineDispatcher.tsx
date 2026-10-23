"use client";

import React from "react";
import { ToolItem } from "@/data/tools";
import { JsonEngine } from "./JsonEngine";
import { YamlEngine } from "./YamlEngine";
import { CsvDataEngine } from "./CsvDataEngine";
import { DiffEngine } from "./DiffEngine";
import { RegexEngine } from "./RegexEngine";
import { Base64Engine } from "./Base64Engine";
import { UuidEngine } from "./UuidEngine";
import { CryptoHashEngine } from "./CryptoHashEngine";
import { QrBarcodeEngine } from "./QrBarcodeEngine";
import { MarkdownEngine } from "./MarkdownEngine";
import { PdfSuiteEngine } from "./PdfSuiteEngine";
import { ImageSuiteEngine } from "./ImageSuiteEngine";
import { TextSuiteEngine } from "./TextSuiteEngine";
import { EncodingConvertersEngine } from "./EncodingConvertersEngine";
import { TimeCalendarEngine } from "./TimeCalendarEngine";
import { MathCalculatorsEngine } from "./MathCalculatorsEngine";
import { CalculatorSuiteEngine } from "./CalculatorSuiteEngine";
import { ConstructionDiyEngine } from "./ConstructionDiyEngine";
import { HealthFitnessEngine } from "./HealthFitnessEngine";
import { NetworkingToolsEngine } from "./NetworkingToolsEngine";
import { RandomizersGamesEngine } from "./RandomizersGamesEngine";
import { HeadsOrTailsEngine } from "./HeadsOrTailsEngine";
import { DeviceTesterEngine } from "./DeviceTesterEngine";
import { FileViewersEngine } from "./FileViewersEngine";
import { DeveloperSuiteEngine } from "./DeveloperSuiteEngine";
import { MediaAudioVideoEngine } from "./MediaAudioVideoEngine";

interface EngineDispatcherProps {
  tool: ToolItem;
}

export function EngineDispatcher({ tool }: EngineDispatcherProps) {
  if (tool.slug === "heads-or-tails" || tool.slug === "coin-flip") {
    return <HeadsOrTailsEngine slug={tool.slug} />;
  }

  switch (tool.engine) {
    case "json":
      return <JsonEngine slug={tool.slug} />;
    case "yaml":
      return <YamlEngine slug={tool.slug} />;
    case "csv-data":
      return <CsvDataEngine slug={tool.slug} />;
    case "diff":
      return <DiffEngine slug={tool.slug} />;
    case "regex":
      return <RegexEngine slug={tool.slug} />;
    case "base64":
      return <Base64Engine slug={tool.slug} />;
    case "uuid":
      return <UuidEngine slug={tool.slug} />;
    case "crypto-hash":
      return <CryptoHashEngine slug={tool.slug} />;
    case "qr-barcode":
      return <QrBarcodeEngine slug={tool.slug} />;
    case "markdown-docs":
      return <MarkdownEngine slug={tool.slug} />;
    case "pdf-suite":
      return <PdfSuiteEngine slug={tool.slug} />;
    case "image-suite":
      return <ImageSuiteEngine slug={tool.slug} />;
    case "text-suite":
      return <TextSuiteEngine slug={tool.slug} />;
    case "encoding-converters":
      return <EncodingConvertersEngine slug={tool.slug} />;
    case "time-calendar":
      return <TimeCalendarEngine slug={tool.slug} />;
    case "math-calculators":
      return <MathCalculatorsEngine slug={tool.slug} />;
    case "calculator-suite":
      return <CalculatorSuiteEngine slug={tool.slug} />;
    case "construction-diy":
      return <ConstructionDiyEngine slug={tool.slug} />;
    case "health-fitness":
      return <HealthFitnessEngine slug={tool.slug} />;
    case "networking-tools":
      return <NetworkingToolsEngine slug={tool.slug} />;
    case "randomizers-games":
      return <RandomizersGamesEngine slug={tool.slug} />;
    case "device-tester":
      return <DeviceTesterEngine slug={tool.slug} />;
    case "file-viewers":
      return <FileViewersEngine slug={tool.slug} />;
    case "developer-suite":
      return <DeveloperSuiteEngine slug={tool.slug} />;
    case "media-audio-video":
      return <MediaAudioVideoEngine slug={tool.slug} />;
    default:
      return <TextSuiteEngine slug={tool.slug} />;
  }
}
