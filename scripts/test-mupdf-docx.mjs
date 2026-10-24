// Usage: node --import ./scripts/register-ts.mjs scripts/test-mupdf-docx.mjs input.pdf output.docx
import fs from "node:fs";
import * as mupdf from "mupdf";
import { convertPdfToDocx } from "../src/components/pdf/mupdfDocx.ts";

const [input, output] = process.argv.slice(2);
const result = await convertPdfToDocx(mupdf, new Uint8Array(fs.readFileSync(input)));
fs.writeFileSync(output, Buffer.from(await result.blob.arrayBuffer()));
console.log(`pages ${result.pages}, tables ${result.tables}, figures ${result.figures}, empty pages [${result.emptyPages}], ${result.blob.size} bytes`);
