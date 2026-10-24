/**
 * Builds a real .xlsx workbook for the functional tests.
 *
 * An .xlsx file is a ZIP archive with a handful of XML parts, so the fixture
 * is written byte by byte with JSZip - the same library the site uses - and
 * handed to the browser as a file. Nothing is read from or written to disk.
 *
 * The cells of a sheet are described with plain values:
 *
 *   "text"                 a shared string
 *   42                     a number
 *   { inline: "text" }     an inline string
 *   { number: 45306, date: true }   a date cell (Excel serial number)
 *   { number: 0.125, percent: true } a percentage cell
 */

import JSZip from "jszip";

const REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

/** The name of the column with the given index: 0 -> A, 26 -> AA. */
function columnName(index) {
  let name = "";
  let rest = index + 1;
  while (rest > 0) {
    const part = (rest - 1) % 26;
    name = String.fromCharCode(65 + part) + name;
    rest = Math.floor((rest - 1) / 26);
  }
  return name;
}

/** Escapes the five characters that XML reserves. */
function xmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Writes one workbook.
 *
 * A sheet is `{ name, rows }` and a row is an array of cells.
 */
export async function buildWorkbook(sheets) {
  const zip = new JSZip();
  const sharedStrings = [];
  const sharedIndex = new Map();

  const stringId = (text) => {
    if (sharedIndex.has(text)) return sharedIndex.get(text);
    const id = sharedStrings.length;
    sharedStrings.push(text);
    sharedIndex.set(text, id);
    return id;
  };

  const sheetXml = sheets.map((sheet) => {
    const rows = sheet.rows
      .map((cells, rowIndex) => {
        const cellsXml = cells
          .map((cell, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            if (typeof cell === "number") {
              return `<c r="${reference}"><v>${cell}</v></c>`;
            }
            if (cell && typeof cell === "object" && cell.inline !== undefined) {
              return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlText(
                cell.inline,
              )}</t></is></c>`;
            }
            if (cell && typeof cell === "object" && cell.date) {
              return `<c r="${reference}" s="1"><v>${cell.number}</v></c>`;
            }
            if (cell && typeof cell === "object" && cell.percent) {
              return `<c r="${reference}" s="2"><v>${cell.number}</v></c>`;
            }
            const text = String(cell);
            return `<c r="${reference}" t="s"><v>${stringId(text)}</v></c>`;
          })
          .join("");
        return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${MAIN_NS}"><sheetData>${rows}</sheetData></worksheet>`;
  });

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets
  .map(
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join("\n")}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
<Relationship Id="rId1" Type="${REL_TYPE}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_TYPE}"><sheets>${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${xmlText(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join("")}</sheets></workbook>`,
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
${sheets
  .map(
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="${REL_TYPE}/worksheet" Target="worksheets/sheet${
        index + 1
      }.xml"/>`,
  )
  .join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="${REL_TYPE}/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId${sheets.length + 2}" Type="${REL_TYPE}/styles" Target="styles.xml"/>
</Relationships>`,
  );

  sheetXml.forEach((xml, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, xml);
  });

  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="${MAIN_NS}" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings
      .map((text) => `<si><t xml:space="preserve">${xmlText(text)}</t></si>`)
      .join("")}</sst>`,
  );

  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${MAIN_NS}">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd\\.mm\\.yyyy"/><numFmt numFmtId="165" formatCode="0.00%"/></numFmts>
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(buffer);
}
