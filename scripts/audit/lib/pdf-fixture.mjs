/**
 * Writes a small but valid PDF with a text layer.
 *
 * The file follows ISO 32000: a header, the catalog, the page tree, the page
 * object, its content stream, the font and a cross reference table with a
 * trailer.
 *
 * The rows of a statement are written the way a bank writes them: every
 * column of a row gets its own position on the page, so the reader can tell
 * the columns apart by the distance between them. The bytes are handed to
 * the browser as a file; nothing is written to disk.
 */

/** Escapes the characters that a PDF literal string reserves. */
function pdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Writes a PDF with one page that carries the given rows.
 *
 * @param {string[][]} rows the rows of the table, one array per row
 * @param {number[]} columns the left edge of every column on the page
 */
export function buildStatementPdf(rows, columns = [40, 140, 460]) {
  const enc = (text) => Buffer.from(text, "latin1");
  const chunks = [];
  let offset = 0;

  const push = (buffer) => {
    chunks.push(buffer);
    offset += buffer.length;
  };

  let y = 780;
  let stream = "";
  for (const row of rows) {
    const cells = row.map((cell, index) => {
      const x = columns[index] === undefined ? columns[columns.length - 1] : columns[index];
      return `1 0 0 1 ${x} ${y} Tm (${pdfText(cell)}) Tj`;
    });
    stream += `BT /F1 10 Tf ${cells.join(" ")} ET\n`;
    y -= 16;
  }

  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
  objects[4] = { dict: `<< /Length ${stream.length} >>`, stream };
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  push(enc("%PDF-1.7\n"));
  const offsets = [];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = offset;
    const object = objects[i];
    if (typeof object === "string") {
      push(enc(`${i} 0 obj\n${object}\nendobj\n`));
    } else {
      push(enc(`${i} 0 obj\n${object.dict}\nstream\n${object.stream}endstream\nendobj\n`));
    }
  }

  const xrefStart = offset;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  push(enc(xref));

  return Buffer.concat(chunks);
}
