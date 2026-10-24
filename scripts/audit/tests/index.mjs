/**
 * The per-family functional spec modules.
 *
 * Every family owns exactly one file, so several workers can extend the
 * suite at the same time without touching the same file.
 */

import * as base64 from "./base64.mjs";
import * as calculatorSuite from "./calculator-suite.mjs";
import * as cryptoHash from "./crypto-hash.mjs";
import * as csvData from "./csv-data.mjs";
import * as developerSuite from "./developer-suite.mjs";
import * as deviceTester from "./device-tester.mjs";
import * as diff from "./diff.mjs";
import * as encodingConverters from "./encoding-converters.mjs";
import * as fileViewers from "./file-viewers.mjs";
import * as healthFitness from "./health-fitness.mjs";
import * as imageSuite from "./image-suite.mjs";
import * as json from "./json.mjs";
import * as markdownDocs from "./markdown-docs.mjs";
import * as mediaAudioVideo from "./media-audio-video.mjs";
import * as networkingTools from "./networking-tools.mjs";
import * as pdfSuite from "./pdf-suite.mjs";
import * as qrBarcode from "./qr-barcode.mjs";
import * as randomizersGames from "./randomizers-games.mjs";
import * as regex from "./regex.mjs";
import * as textSuite from "./text-suite.mjs";
import * as timeCalendar from "./time-calendar.mjs";
import * as uuid from "./uuid.mjs";
import * as yaml from "./yaml.mjs";

export const FAMILIES = [
  base64,
  calculatorSuite,
  cryptoHash,
  csvData,
  developerSuite,
  deviceTester,
  diff,
  encodingConverters,
  fileViewers,
  healthFitness,
  imageSuite,
  json,
  markdownDocs,
  mediaAudioVideo,
  networkingTools,
  pdfSuite,
  qrBarcode,
  randomizersGames,
  regex,
  textSuite,
  timeCalendar,
  uuid,
  yaml,
];
