/**
 * Check the compound-file reader against a file that this repository did
 * not write.
 *
 * The fixture is a Word 97 document written by LibreOffice, so it is a
 * genuine OLE compound document with a directory tree, a mini FAT and
 * streams that were never produced by this code. The reader has to find the
 * "WordDocument" stream and the stream has to start with the word FIB.
 *
 * This check keeps the format layer honest independently of the .msg
 * fixture, which this repository builds itself.
 *
 * Usage: node scripts/audit/check-compound-file.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readOle } from "../../src/components/engines/viewers/ole.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "audit-compound.doc");

const bytes = readFileSync(fixture);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const doc = readOle(buffer);

const problems = [];

/**
 * The names of the special streams carry a control byte in front of them,
 * so the entry is found by the end of its name.
 */
const hasStream = (name) =>
  [...doc.entries.keys()].some((key) => key === name || key.endsWith(name));

for (const name of [
  "CompObj",
  "Ole",
  "1Table",
  "SummaryInformation",
  "WordDocument",
  "DocumentSummaryInformation",
]) {
  if (!hasStream(name)) problems.push(`the stream "${name}" was not found`);
}

const word = doc.read("WordDocument");
if (!word) {
  problems.push("the WordDocument stream cannot be read");
} else {
  if (word.length !== doc.entries.get("WordDocument")?.size) {
    problems.push(`the stream is ${word.length} bytes long, the directory says ${doc.entries.get("WordDocument")?.size}`);
  }
  // The word file information block starts with 0xEC 0xA5.
  if (word[0] !== 0xec || word[1] !== 0xa5) {
    problems.push(`the stream starts with ${word[0]} ${word[1]} instead of the word FIB`);
  }
}

console.log(`fixture: ${fixture}`);
console.log(`entries: ${[...doc.entries.keys()].join(", ")}`);
console.log(`WordDocument: ${word ? `${word.length} bytes` : "missing"}`);

if (problems.length) {
  console.error(`\n${problems.length} problems:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("\nA genuine third-party compound document is read correctly.");
