/**
 * Functional specs for the 13 tools of the csv-data engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real textarea,
 * presses the real button, opens the real file picker and reads the real
 * rendered result. The expected values follow RFC 4180 (CSV) and RFC 8259
 * (JSON): a CSV row holds comma separated fields, a header row names the
 * columns and a JSON array holds one object per row.
 *
 * The file tools are checked with real files that the spec builds itself:
 * a workbook is written as a ZIP archive with the XML parts of the
 * SpreadsheetML format and a statement is written as a PDF with a text
 * layer. The tool has to show the cells and the lines of those files, not
 * just to claim that it accepts them.
 *
 * The parquet tools cannot read a parquet file - a browser has no parquet
 * reader - so their spec asserts the honest state: the panel says so and
 * the file dialog does not offer the format.
 */

import assert from "node:assert";

import {
  spec,
  fillArea,
  clickButton,
  assertEqual,
  assertIncludes,
  assertMatches,
  sleep,
} from "../lib/test-helpers.mjs";

import { buildWorkbook } from "../lib/xlsx-fixture.mjs";
import { buildStatementPdf } from "../lib/pdf-fixture.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The file types the workspace accepts. */
async function acceptedFiles(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll('input[type="file"]')).map(
      (el) => el.getAttribute("accept") || "",
    );
  });
}

/** The text of the engine panel only, without the page chrome around it. */
async function panel(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/** The file types the workspace accepts, one entry per token. */
async function acceptedTypes(page) {
  const accepts = await acceptedFiles(page);
  return accepts.flatMap((entry) =>
    entry
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length),
  );
}

/** Put a text file into the file input of the workspace. */
async function uploadText(page, name, type, text) {
  await page.evaluate(
    ({ name, type, text }) => {
      const file = new File([text], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, text },
  );
  await sleep(600);
}

/**
 * Put a binary file into the file input of the workspace.
 *
 * The bytes are read in memory and handed to the browser, so no file is ever
 * written to disk.
 */
async function uploadBytes(page, name, type, bytes) {
  await page.evaluate(
    ({ name, type, data }) => {
      const file = new File([new Uint8Array(data)], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector("main input[type=file]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, data: Array.from(bytes) },
  );
  await sleep(800);
}

/** The value of the output pane of the workspace. */
async function output(page) {
  return page.locator("main textarea[readonly]").inputValue();
}

/** The rows of the table view of the workspace. */
async function tableRows(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main table tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) =>
        (td.textContent || "").replace(/\s+/g, " ").trim(),
      ),
    ),
  );
}

/** The head cells of the table view of the workspace. */
async function tableHead(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main table thead th")).map((th) =>
      (th.textContent || "").replace(/\s+/g, " ").trim(),
    ),
  );
}

/**
 * Wait until the output pane shows the given text.
 *
 * Reading a workbook or a document takes a moment, so the spec waits for the
 * result instead of guessing how long it takes.
 */
async function waitForOutput(page, needle, timeout = 30000) {
  const started = Date.now();
  for (;;) {
    const value = await output(page);
    if (value.includes(needle)) return value;
    if (Date.now() - started > timeout) {
      throw new Error(
        `the workspace never showed ${JSON.stringify(needle)}; it shows ${JSON.stringify(
          value.slice(0, 400),
        )}`,
      );
    }
    await sleep(250);
  }
}

/** Wait until the table shows a row with the given cells. */
async function waitForTableRow(page, expected, timeout = 30000) {
  const started = Date.now();
  for (;;) {
    const rows = await tableRows(page);
    const found = rows.some((row) =>
      expected.every((cell, index) => row[index + 1] === cell),
    );
    if (found) return rows;
    if (Date.now() - started > timeout) {
      throw new Error(
        `the table never showed the row ${JSON.stringify(expected)}; it shows ${JSON.stringify(
          rows.slice(0, 6),
        )}`,
      );
    }
    await sleep(250);
  }
}

/** Switch the workspace into the direction that writes a CSV. */
async function switchToCsv(page) {
  /* The button that swaps the direction carries an arrow in both states. */
  await page
    .locator("main div.mt-6 button")
    .filter({ hasText: /(→|->)/ })
    .first()
    .click();
  await sleep(600);
}

/** Show the output pane of the workspace instead of the table. */
async function showOutput(page) {
  await page
    .locator("main div.mt-6 button")
    .filter({ hasText: /Output/ })
    .first()
    .click();
  await sleep(400);
}

/* --------------------------------------------------------------- samples -- */

const CSV_SAMPLE = "id,name,role\n1,Jane Doe,Lead Architect\n2,John Smith,Product Designer\n";
const TSV_SAMPLE = "id\tname\trole\n1\tJane Doe\tLead Architect\n2\tJohn Smith\tProduct Designer\n";

/**
 * The workbook the excel tools are checked with.
 *
 * The first sheet holds the cells of a small table, the second one another
 * sheet of the same workbook. The date column carries an Excel serial
 * number with the number format "dd.mm.yyyy" and the share column a
 * percentage, so a reader that ignores the number formats shows the raw
 * serial numbers instead of the formatted values.
 */
const XLSX_SHEETS = [
  {
    name: "Employees",
    rows: [
      ["id", "name", "role", "start", "share"],
      [1, "Jane Doe", "Lead Architect", { number: 45306, date: true }, { number: 0.125, percent: true }],
      [2, "John Smith", "Product Designer", { number: 45307, date: true }, { number: 0.07, percent: true }],
      [
        3,
        { inline: "Alice Johnson" },
        { inline: "Security Engineer" },
        { number: 45308, date: true },
        { number: 0.04, percent: true },
      ],
    ],
  },
  {
    name: "Locations",
    rows: [
      ["city", "country"],
      ["Munich", "Germany"],
      ["Berlin", "Germany"],
    ],
  },
];

/* The row of the workbook that every excel tool has to show. */
const XLSX_ROW = ["2", "John Smith", "Product Designer", "16.01.2024", "7.00%"];
const XLSX_CSV_ROW = "2,John Smith,Product Designer,16.01.2024,7.00%";

/**
 * The statement the bank statement tools are checked with.
 *
 * The rows are written with one position per column, the way a bank writes
 * a statement, so the reader can tell the columns apart.
 */
const STATEMENT_ROWS = [
  ["Date", "Description", "Amount"],
  ["15.01.2024", "COFFEE SHOP", "-12.50"],
  ["16.01.2024", "SALARY", "2500.00"],
  ["17.01.2024", "GROCERY STORE", "-45.90"],
];

const STATEMENT_ROW = ["16.01.2024", "SALARY", "2500.00"];
const STATEMENT_CSV_ROW = "16.01.2024,SALARY,2500.00";

/**
 * The ids of the table rows must be sorted after the column head was
 * pressed: the file starts with 3, 1 and 2.
 */
function assertSortedById(rows) {
  const ids = rows.map((r) => Number(r[1]));
  assert(
    ids.join(",") === "1,2,3",
    `clicking the column head must sort the table, the ids are ${ids.join(",")}`,
  );
}

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("csv-to-json-converter", "converts a CSV document into JSON", async (page) => {
    await fillArea(page, CSV_SAMPLE, 0);
    const out = await output(page);
    assertEqual(
      out,
      JSON.stringify(
        [
          { id: 1, name: "Jane Doe", role: "Lead Architect" },
          { id: 2, name: "John Smith", role: "Product Designer" },
        ],
        null,
        2,
      ),
      "every CSV row must become one JSON object, the numbers must be parsed",
    );

    // with the dynamic typing switched off every field stays a string
    await page.locator('main input[type="checkbox"]').nth(1).uncheck();
    await sleep(500);
    assertIncludes(
      await output(page),
      '"id": "1"',
      "without dynamic typing the numbers must stay strings",
    );
  });

  spec("json-to-csv-converter", "converts a JSON array into CSV", async (page) => {
    await fillArea(page, '[{"id":1,"name":"Ann"},{"id":2,"name":"Bob"}]', 0);
    await sleep(500);
    const out = await output(page);
    const lines = out.split(/\r?\n/).filter((line) => line.length);
    assertEqual(
      lines.join("\n"),
      "id,name\n1,Ann\n2,Bob",
      "the JSON array must become a CSV document with a header row",
    );
  });

  spec("tsv-to-json", "converts a tab separated document into JSON", async (page) => {
    await fillArea(page, TSV_SAMPLE, 0);
    const out = await output(page);
    assertEqual(
      out,
      JSON.stringify(
        [
          { id: 1, name: "Jane Doe", role: "Lead Architect" },
          { id: 2, name: "John Smith", role: "Product Designer" },
        ],
        null,
        2,
      ),
      "the tab separated rows must become JSON objects",
    );
  });

  spec("csv-viewer", "shows a sortable table of a CSV file", async (page) => {
    await uploadText(page, "people.csv", "text/csv", "id,name\n3,Carol\n1,Ann\n2,Bob\n");
    await clickButton(page, "Table");
    await sleep(500);
    const before = await tableRows(page);
    assertEqual(before.length, 3, "the table must show one row per data row");
    assertEqual(before[0][1], "3", "the rows must keep the order of the file");

    // the tool promises a sortable table: clicking a column head must order
    // the rows by that column
    await page
      .locator("main table thead th", { hasText: "id" })
      .first()
      .click();
    await sleep(500);
    const after = await tableRows(page);
    assertSortedById(after);
  });

  /* ----------------------------------------------------- bank statements -- */

  spec(
    "bank-statement-converter",
    "reads the transactions of a PDF bank statement",
    async (page) => {
      await uploadBytes(
        page,
        "statement.pdf",
        "application/pdf",
        buildStatementPdf(STATEMENT_ROWS),
      );

      // the text layer of the document must become rows
      await clickButton(page, "Table");
      const rows = await waitForTableRow(page, STATEMENT_ROW);
      assert(
        rows.some((row) => row.slice(1).join("|") === "15.01.2024|COFFEE SHOP|-12.50"),
        `the statement must show every transaction line, the table shows ${JSON.stringify(rows)}`,
      );

      const head = await tableHead(page);
      assertEqual(
        head.slice(1).join(","),
        "Date,Description,Amount",
        "the first line of the statement names the columns",
      );
    },
  );

  spec(
    "bank-statement-to-csv",
    "turns the transactions of a PDF bank statement into CSV",
    async (page) => {
      await uploadBytes(
        page,
        "statement.pdf",
        "application/pdf",
        buildStatementPdf(STATEMENT_ROWS),
      );

      // the amounts keep the notation of the statement
      const json = await waitForOutput(page, '"Amount": "2500.00"');
      assertIncludes(
        json,
        '"Description": "COFFEE SHOP"',
        "every transaction of the statement must be read",
      );

      await switchToCsv(page);
      const csv = await waitForOutput(page, STATEMENT_CSV_ROW);
      assertIncludes(
        csv,
        "Date,Description,Amount",
        "the CSV export must carry the header row of the statement",
      );
      assertIncludes(
        csv,
        "15.01.2024,COFFEE SHOP,-12.50",
        "the CSV export must carry the transaction lines of the statement",
      );
    },
  );

  spec(
    "bank-statement-to-excel",
    "turns the transactions of a PDF bank statement into a table for Excel",
    async (page) => {
      await uploadBytes(
        page,
        "statement.pdf",
        "application/pdf",
        buildStatementPdf(STATEMENT_ROWS),
      );

      await clickButton(page, "Table");
      await waitForTableRow(page, ["17.01.2024", "GROCERY STORE", "-45.90"]);

      // the table is the Excel compatible result: the columns of the
      // statement keep their names and their values
      const head = await tableHead(page);
      assertEqual(
        head.slice(1).join(","),
        "Date,Description,Amount",
        "the table must carry the columns of the statement",
      );

      await switchToCsv(page);
      await showOutput(page);
      const csv = await waitForOutput(page, "17.01.2024,GROCERY STORE,-45.90");
      assertIncludes(
        csv,
        "Date,Description,Amount",
        "the export must carry the header row of the statement",
      );
    },
  );

  /* ------------------------------------------------------------ excel ---- */

  spec("excel-to-csv", "reads an Excel workbook and writes it as CSV", async (page) => {
    const types = await acceptedTypes(page);
    assert(
      !types.includes(".xls"),
      `the tool must not offer the legacy .xls format it cannot read, it accepts ${JSON.stringify(
        types,
      )}`,
    );

    await uploadBytes(
      page,
      "employees.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      await buildWorkbook(XLSX_SHEETS),
    );

    // the cells of the workbook must be shown, not the name of the file
    await clickButton(page, "Table");
    await waitForTableRow(page, XLSX_ROW);
    const head = await tableHead(page);
    assertEqual(
      head.slice(1).join(","),
      "id,name,role,start,share",
      "the first row of the sheet names the columns",
    );

    await switchToCsv(page);
    await showOutput(page);
    const csv = await waitForOutput(page, XLSX_CSV_ROW);
    assertIncludes(
      csv,
      "id,name,role,start,share",
      "the CSV export must carry the header row of the sheet",
    );
    assertIncludes(
      csv,
      XLSX_CSV_ROW,
      "the CSV export must carry the exact row of the sheet",
    );
  });

  spec("excel-viewer", "shows every sheet of an Excel workbook", async (page) => {
    await uploadBytes(
      page,
      "employees.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      await buildWorkbook(XLSX_SHEETS),
    );

    await clickButton(page, "Table");
    await waitForTableRow(page, XLSX_ROW);

    // the sheets of the workbook are reachable
    const tabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main button"))
        .map((button) => (button.textContent || "").trim())
        .filter((text) => text === "Employees" || text === "Locations"),
    );
    assert(
      tabs.includes("Employees") && tabs.includes("Locations"),
      `the viewer must offer a tab for every sheet, it shows ${JSON.stringify(tabs)}`,
    );

    await page.locator("main button", { hasText: /^Locations$/ }).first().click();
    await sleep(600);
    const rows = await waitForTableRow(page, ["Munich", "Germany"]);
    assertEqual(
      rows[0].slice(1).join(","),
      "Munich,Germany",
      "the second sheet must show its own rows",
    );
  });

  spec("xlsx-to-csv", "reads an XLSX workbook and writes it as CSV", async (page) => {
    await uploadBytes(
      page,
      "employees.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      await buildWorkbook(XLSX_SHEETS),
    );

    // the JSON output already holds the cells of the sheet
    const json = await waitForOutput(page, '"name": "John Smith"');
    assertIncludes(json, '"start": "16.01.2024"', "the date cell must be read");
    assertIncludes(json, '"share": "7.00%"', "the percentage cell must be read");

    await switchToCsv(page);
    const csv = await waitForOutput(page, XLSX_CSV_ROW);
    assertIncludes(csv, XLSX_CSV_ROW, "the CSV export must carry the exact row of the sheet");
  });

  spec("xlsx-viewer", "shows the cells of an XLSX workbook", async (page) => {
    await uploadBytes(
      page,
      "employees.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      await buildWorkbook(XLSX_SHEETS),
    );

    await clickButton(page, "Table");
    const rows = await waitForTableRow(page, XLSX_ROW);
    assertEqual(
      rows[0].slice(1).join(","),
      "1,Jane Doe,Lead Architect,15.01.2024,12.50%",
      "the viewer must show the cells of the workbook as they are stored",
    );
    assert(
      !rows.some((row) => row.join("|").includes("45307")),
      "the viewer must not show the raw serial number of a date cell",
    );
  });

  /* ---------------------------------------------------------- parquet ---- */

  spec("parquet-to-csv", "states that it cannot read a parquet file", async (page) => {
    const types = await acceptedTypes(page);
    assert(
      !types.includes(".parquet"),
      `the tool must not offer a parquet file it cannot read, it accepts ${JSON.stringify(types)}`,
    );

    const text = await panel(page);
    assertMatches(
      text,
      /cannot read[^.]*parquet/i,
      "the panel must say that the tool cannot read parquet files",
    );
  });

  spec("parquet-viewer", "states that it cannot read a parquet file", async (page) => {
    const types = await acceptedTypes(page);
    assert(
      !types.includes(".parquet"),
      `the tool must not offer a parquet file it cannot read, it accepts ${JSON.stringify(types)}`,
    );

    const text = await panel(page);
    assertMatches(
      text,
      /cannot read[^.]*parquet/i,
      "the panel must say that the tool cannot read parquet files",
    );
  });
}
