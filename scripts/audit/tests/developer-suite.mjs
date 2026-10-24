/**
 * Functional specs for the 31 tools of the developer-suite engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real field,
 * presses the real button and reads the real rendered result. The expected
 * values are established independently - the OpenAPI 3 and Swagger 2
 * specifications, the GraphQL grammar, XML well-formedness, the LaTeX and the
 * PNG file format - never by running this site's own code.
 *
 * The API tester specs answer the request inside the browser with a prepared
 * response, so nothing ever leaves the machine.
 *
 * The three local-model chats promise no bundled weights, so their specs
 * assert exactly that honest state: the tool has to say that the weights are
 * missing, and it must never invent an answer.
 */

import assert from "node:assert";

import {
  spec,
  fillArea,
  fillInput,
  clickButton,
  selectOption,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The rendered text of the workspace. */
async function devText(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/**
 * The result the workspace produced.
 *
 * A tool shows its result either in the output block or in the green "this
 * worked" panel, so both are read.
 */
async function devResult(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const pre = root.querySelector("pre");
    if (pre) return (pre.textContent || "").trim();
    const ok = Array.from(root.querySelectorAll("p")).find((el) =>
      (el.className || "").includes("bg-emerald-50"),
    );
    if (ok) return (ok.textContent || "").trim();
    return "";
  });
}

/** The error messages the workspace reported. */
async function devErrors(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("p"))
      .filter((el) => (el.className || "").includes("bg-rose-50"))
      .map((el) => (el.textContent || "").trim());
  });
}

/** The operations table of the OpenAPI and Swagger tools. */
async function operationTable(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const table = root.querySelector("table");
    if (!table) return null;
    return {
      head: Array.from(table.querySelectorAll("thead th")).map((th) =>
        (th.textContent || "").trim(),
      ),
      rows: Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim()),
      ),
    };
  });
}

/** The list items of the "declared types" block. */
async function declaredTypes(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const headings = Array.from(root.querySelectorAll("p")).filter(
      (el) => (el.textContent || "").trim() === "Declared types",
    );
    if (!headings.length) return [];
    const scope = headings[0].parentElement;
    if (!scope) return [];
    return Array.from(scope.querySelectorAll("li > span")).map((span) =>
      (span.textContent || "").trim(),
    );
  });
}

/**
 * The HTML the tool produced, read back through the browser's own parser.
 *
 * A formatter that breaks a document up has to keep the document itself: the
 * text and the elements have to survive the round trip.
 */
async function htmlResult(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const pre = root.querySelector("pre");
    if (!pre) return null;
    const source = pre.textContent || "";
    const doc = new DOMParser().parseFromString(source, "text/html");
    return {
      source,
      text: (doc.body.textContent || "").replace(/\s+/g, " ").trim(),
      tags: Array.from(doc.body.querySelectorAll("*")).map((el) =>
        el.tagName.toLowerCase(),
      ),
      lines: source.split("\n").length,
    };
  });
}

/** The options of the nth select of the workspace. */
async function selectOptions(page, nth = 0) {
  return page.evaluate((index) => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const selects = Array.from(root.querySelectorAll("select"));
    if (!selects[index]) return [];
    return Array.from(selects[index].querySelectorAll("option")).map((option) =>
      (option.textContent || "").trim(),
    );
  }, nth);
}

/** Whether the button with the given label is enabled. */
async function buttonEnabled(page, label) {
  return page.evaluate((wanted) => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const target = Array.from(root.querySelectorAll("button")).find(
      (button) =>
        (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase() ===
        wanted.toLowerCase(),
    );
    if (!target) return null;
    return !target.disabled;
  }, label);
}

/** The value of the status line that starts with the given label. */
async function statusValue(page, label) {
  return page.evaluate((wanted) => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const holder = Array.from(root.querySelectorAll("span")).find((span) =>
      (span.textContent || "").trim().startsWith(wanted),
    );
    if (!holder) return null;
    const inner = holder.querySelector("span");
    return inner ? (inner.textContent || "").trim() : null;
  }, label);
}

/** The rendered equation. */
async function mathInfo(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const math = root.querySelector("math");
    if (!math) return null;
    return {
      html: math.outerHTML,
      text: math.textContent || "",
      fractions: math.querySelectorAll("mfrac").length,
      roots: math.querySelectorAll("msqrt, mroot").length,
      superscripts: math.querySelectorAll("msup").length,
      subscripts: math.querySelectorAll("msub").length,
      operators: math.querySelectorAll("mo").length,
    };
  });
}

/**
 * The PNG the code screenshot tool produced.
 *
 * The bytes are decoded here, in the browser, so the header of the image is
 * read the way a reader would read it.
 */
async function canvasInfo(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const canvas = root.querySelector("canvas");
    if (!canvas) return null;
    const url = canvas.toDataURL("image/png");
    const binary = atob(url.slice(url.indexOf(",") + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    const context = canvas.getContext("2d");
    const pixel = context
      ? Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
      : [];
    return {
      header: url.slice(0, 22),
      magic: Array.from(bytes.slice(0, 8)),
      chunk: String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]),
      width: view.getUint32(16),
      height: view.getUint32(20),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      pixel,
      bytes: bytes.length,
    };
  });
}

/** The value of the editor of the workspace. */
async function editorValue(page) {
  return page.locator("main textarea").first().inputValue();
}

/**
 * Answer the request of the API tester inside the browser.
 *
 * The route is fulfilled by the test, so no request ever leaves the machine.
 */
async function answerRequests(page, body, status = 200) {
  await page.route("**/audit-probe/**", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body,
    });
  });
}

/* --------------------------------------------------------------- samples -- */

/* A query the formatter has to break into clauses. */
const MESSY_SQL =
  "select u.id, u.name from users u where u.active=1 and u.created_at>'2024-01-01' order by u.name limit 10;";

/* An OpenAPI 3 document: two paths, four operations. */
const OPENAPI_YAML = `openapi: 3.0.3
info:
  title: Shop API
  version: 2.1.0
paths:
  /orders:
    get:
      summary: List orders
      tags: [orders]
    post:
      summary: Create order
      tags: [orders]
  /orders/{id}:
    get:
      summary: Get order
      tags: [orders, detail]
    delete:
      summary: Delete order
      tags: [orders]
`;

/* The same four operations as a Swagger 2 document. */
const SWAGGER_JSON = JSON.stringify(
  {
    swagger: "2.0",
    info: { title: "Shop API", version: "2.1.0" },
    paths: {
      "/orders": {
        get: { summary: "List orders", tags: ["orders"] },
        post: { summary: "Create order", tags: ["orders"] },
      },
      "/orders/{id}": {
        get: { summary: "Get order", tags: ["orders", "detail"] },
        delete: { summary: "Delete order", tags: ["orders"] },
      },
    },
  },
  null,
  2,
);

/* The four operations the two documents above declare. */
const EXPECTED_OPERATIONS = [
  ["GET", "/orders", "List orders", "orders"],
  ["POST", "/orders", "Create order", "orders"],
  ["GET", "/orders/{id}", "Get order", "orders, detail"],
  ["DELETE", "/orders/{id}", "Delete order", "orders"],
];

/* A GraphQL schema with four definitions. */
const GRAPHQL_SCHEMA = `type Order { id: ID! total: Float! customer: Customer items: [Item!]! }
type Customer { id: ID! name: String }
type Item { id: ID! label: String }
interface Node { id: ID! }`;

/* An XML document with two books. */
const XML_DOCUMENT =
  "<catalog><book id=\"bk101\"><author>Gambardella, Matthew</author><price>44.95</price></book>" +
  "<book id=\"bk102\"><author>Ralls, Kim</author><price>45.95</price></book></catalog>";

/* An XSD schema with two elements and one attribute. */
const XSD_ELEMENTS = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="order">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="item" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>
      </xs:sequence>
      <xs:attribute name="id" type="xs:ID" use="required"/>
      <xs:attribute name="note" type="xs:string"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

/* An XSD schema with a named simple type and a named complex type. */
const XSD_TYPES = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="Currency">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
  <xs:complexType name="Money">
    <xs:simpleContent>
      <xs:extension base="xs:string">
        <xs:attribute name="currency" type="xs:string" use="required"/>
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
</xs:schema>`;

/* --------------------------------------------------------------- specs ---- */

export function register() {
  /* ---------------------------------------------------------- SQL tools -- */

  spec("sql-formatter", "formats a SQL query", async (page) => {
    await fillArea(page, MESSY_SQL, 0);
    await clickButton(page, "Format SQL");
    const out = await editorValue(page);
    assert(out !== MESSY_SQL, "the formatter must rewrite the query");
    const lines = out.split("\n");
    assert(lines.length >= 6, `the formatter must break the query into several lines, got ${lines.length}`);
    assert(/\n {2}\S/.test(out), "the formatter must indent the items of a clause");
    assert(/^select$/im.test(out), "the keyword must be written on a line of its own");
    assertIncludes(out.toLowerCase(), "order by", "the formatter must keep the ORDER BY clause");
    assertIncludes(out.toLowerCase(), "limit", "the formatter must keep the LIMIT clause");
    assert(/\b10\b/.test(out), "the formatter must keep the limit of ten rows");
  });

  spec("sql-beautifier", "beautifies a SQL query", async (page) => {
    const messy = "select * from orders where status='paid' and total>50;";
    await fillArea(page, messy, 0);
    await clickButton(page, "Format SQL");
    const out = await editorValue(page);
    assert(out !== messy, "the beautifier must rewrite the query");
    const lines = out.split("\n");
    assert(lines.length >= 6, "the beautifier must break the query into several lines");
    assert(/\n {2}\S/.test(out), "the beautifier must indent the items of a clause");
    assertIncludes(out.toLowerCase(), "where", "the beautifier must keep the WHERE clause");
  });

  spec("sql-formatter-beautifier", "formats and beautifies a SQL query", async (page) => {
    const messy = "select a,b from t join u on t.id=u.id where a=1 group by b having count(*)>2;";
    await fillArea(page, messy, 0);
    await clickButton(page, "Format SQL");
    const out = await editorValue(page);
    assert(out !== messy, "the formatter must rewrite the query");
    const lines = out.split("\n");
    assert(lines.length >= 4, "the formatter must break the query into several lines");
    assertIncludes(out.toLowerCase(), "group by", "the formatter must keep the GROUP BY clause");
    assertIncludes(out.toLowerCase(), "having", "the formatter must keep the HAVING clause");
  });

  /* ------------------------------------------------------- API testers -- */

  spec("api-tester", "sends a request and shows the response", async (page) => {
    await answerRequests(page, JSON.stringify({ toolpad: "ok", n: 7 }));
    await fillInput(page, "https://example.invalid/audit-probe/todos", 0, "text");
    await clickButton(page, "Send Request");
    await sleep(700);
    const text = await devText(page);
    assertIncludes(text, "Status: 200", "the tester must show the status of the response");
    assertIncludes(text, '"toolpad": "ok"', "the tester must show the body of the response");
    assertIncludes(text, '"n": 7', "the tester must show every field of the response");
  });

  spec("http-request-tester", "sends a request and shows the response", async (page) => {
    await answerRequests(page, JSON.stringify({ hello: "world" }), 201);
    await fillInput(page, "https://example.invalid/audit-probe/http", 0, "text");
    await clickButton(page, "Send Request");
    await sleep(700);
    const text = await devText(page);
    assertIncludes(text, "Status: 201", "the tester must show the status of the response");
    assertIncludes(text, '"hello": "world"', "the tester must show the body of the response");
  });

  spec("rest-api-tester", "sends a request and shows the response", async (page) => {
    await answerRequests(page, JSON.stringify({ id: 42 }));
    await fillInput(page, "https://example.invalid/audit-probe/rest", 0, "text");
    await clickButton(page, "Send Request");
    await sleep(700);
    const text = await devText(page);
    assertIncludes(text, "Status: 200", "the tester must show the status of the response");
    assertIncludes(text, '"id": 42', "the tester must show the body of the response");
  });

  /* ----------------------------------------------------- OpenAPI family -- */

  spec("openapi-editor", "parses an OpenAPI document and lists its operations", async (page) => {
    await fillArea(page, OPENAPI_YAML, 0);
    await clickButton(page, "Parse specification");

    const table = await operationTable(page);
    assert(table, "the editor must show the operations of the document");
    assertEqual(
      table.head.join(" | "),
      "Method | Path | Summary | Tags",
      "the table must name its four columns",
    );
    assertEqual(
      table.rows.length,
      4,
      `the document declares four operations, the table shows ${table.rows.length}`,
    );
    assert.deepStrictEqual(
      table.rows,
      EXPECTED_OPERATIONS,
      "every operation must be read with its method, path, summary and tags",
    );

    const output = await devResult(page);
    assert(
      /^GET\s+\/orders \[orders\] - List orders$/m.test(output),
      `the result must list the GET operation of /orders, it reads ${JSON.stringify(output)}`,
    );
    assert(
      /^DELETE\s+\/orders\/\{id\} \[orders\] - Delete order$/m.test(output),
      `the result must list the DELETE operation of /orders/{id}, it reads ${JSON.stringify(output)}`,
    );
    assert(
      /^GET\s+\/orders\/\{id\} \[orders, detail\] - Get order$/m.test(output),
      `the result must list both tags of the operation, it reads ${JSON.stringify(output)}`,
    );

    // A broken document has to be reported, not silently accepted.
    await fillArea(page, "paths: [unclosed", 0);
    await clickButton(page, "Parse specification");
    const errors = await devErrors(page);
    assert(errors.length >= 1, "a broken document must raise an error");
    assertEqual(
      await operationTable(page),
      null,
      "a broken document must not leave an operations table behind",
    );
  });

  spec("openapi-viewer", "lists the operations of an OpenAPI document", async (page) => {
    await fillArea(page, OPENAPI_YAML, 0);
    await clickButton(page, "List operations");

    const table = await operationTable(page);
    assert(table, "the viewer must show the operations of the document");
    assertEqual(
      table.rows.length,
      4,
      `the document declares four operations, the table shows ${table.rows.length}`,
    );
    assert.deepStrictEqual(table.rows, EXPECTED_OPERATIONS);
    assertEqual(table.rows[2][3], "orders, detail", "both tags of the operation must be read");
  });

  spec("swagger-viewer", "lists the endpoints of a Swagger document", async (page) => {
    await fillArea(page, SWAGGER_JSON, 0);
    await clickButton(page, "List operations");

    const table = await operationTable(page);
    assert(table, "the viewer must show the endpoints of the document");
    assertEqual(
      table.rows.length,
      4,
      `the document declares four endpoints, the table shows ${table.rows.length}`,
    );
    assert.deepStrictEqual(table.rows, EXPECTED_OPERATIONS);
    assertEqual(
      table.rows[3][1],
      "/orders/{id}",
      "the path of the endpoint must be read as it is written",
    );
  });

  /* -------------------------------------------------------- HTML family -- */

  spec("html-beautifier", "indents a minified HTML document", async (page) => {
    await fillArea(page, "<div><p>hello</p></div>", 0);
    await clickButton(page, "Format HTML");
    const out = await htmlResult(page);
    assert(out, "the beautifier must show the document it produced");
    assert(out.lines >= 4, "the beautifier must break the document into lines");
    assert(/\n\s+/.test(out.source), "the beautifier must indent the nested tags");
    assertEqual(out.text, "hello", "the beautifier must keep the text of the document");
    assert.deepStrictEqual(
      out.tags,
      ["div", "p"],
      "the beautifier must keep every element of the document",
    );
  });

  spec("html-formatter", "indents an HTML document", async (page) => {
    await fillArea(page, "<div><p>hello</p></div>", 0);
    await clickButton(page, "Format HTML");
    const out = await htmlResult(page);
    assert(out, "the formatter must show the document it produced");
    assert(out.lines >= 4, "the formatter must break the document into lines");
    assert(/\n\s+/.test(out.source), "the formatter must indent the nested tags");
    assertEqual(out.text, "hello", "the formatter must keep the text of the document");
    assert.deepStrictEqual(
      out.tags,
      ["div", "p"],
      "the formatter must keep every element of the document",
    );
  });

  spec("html-minifier", "collapses an HTML document into a single line", async (page) => {
    await fillArea(page, "<div>\n  <p>hello</p>\n</div>", 0);
    await clickButton(page, "Minify HTML");
    const out = await devResult(page);
    assert(!out.includes("\n"), `the minifier must collapse the document into one line, got ${JSON.stringify(out)}`);
    assertEqual(out, "<div><p>hello</p></div>", "the minifier must drop the whitespace only");
  });

  /* ----------------------------------------------------- GraphQL family -- */

  spec("graphql-formatter-beautifier", "beautifies a GraphQL document", async (page) => {
    await fillArea(page, "query { user { id name } }", 0);
    await clickButton(page, "Format GraphQL");
    const out = await devResult(page);
    assertEqual(
      out,
      "query {\n  user {\n    id\n    name\n  }\n}",
      "the formatter must pretty print the query",
    );
  });

  spec("graphql-minifier", "collapses a GraphQL document into a single line", async (page) => {
    await fillArea(page, "query { user { id name email } }", 0);
    await clickButton(page, "Minify GraphQL");
    const out = await devResult(page);
    assert(!out.includes("\n"), `the minifier must collapse the document into one line, got ${JSON.stringify(out)}`);
    assertEqual(
      out,
      "query{user{id name email}}",
      "the minifier must keep the space between two names",
    );
  });

  spec("graphql-validator", "reports the errors of a GraphQL document", async (page) => {
    // A document with an unclosed brace has to be reported with its line.
    await fillArea(page, "query { user { id }", 0);
    await clickButton(page, "Validate GraphQL");
    const errors = await devErrors(page);
    assert(errors.length >= 1, "an unclosed brace must raise an error");
    assert(
      errors.some((error) => error.includes("is never closed")),
      `the error must name the missing brace, it says ${JSON.stringify(errors)}`,
    );
    assert(
      errors.some((error) => error.includes("Line 1")),
      `the error must carry the line, it says ${JSON.stringify(errors)}`,
    );

    // A sound document has to be accepted.
    await fillArea(page, "query { user { id name } }", 0);
    await clickButton(page, "Validate GraphQL");
    assert.deepStrictEqual(
      await devErrors(page),
      [],
      "a sound document must not raise an error",
    );
    assertEqual(
      await devResult(page),
      "The document is a valid GraphQL document.",
      "the validator must confirm a sound document",
    );
  });

  spec("graphql-schema-explorer", "lists the types of a GraphQL schema", async (page) => {
    await fillArea(page, GRAPHQL_SCHEMA, 0);
    await clickButton(page, "Read schema");
    assertEqual(
      await devResult(page),
      "type Order\ntype Customer\ntype Item\ninterface Node",
      "the explorer must list every definition of the schema",
    );
  });

  spec("graphql-schema-validator", "reports the errors of a GraphQL schema", async (page) => {
    // A schema that uses a type it never defines is not valid.
    await fillArea(page, "type Order { id: ID! customer: Customer }", 0);
    await clickButton(page, "Validate schema");
    const errors = await devErrors(page);
    assert(errors.length >= 1, "an undefined type must raise an error");
    assert(
      errors.some((error) => error.includes("Customer")),
      `the error must name the missing type, it says ${JSON.stringify(errors)}`,
    );
    assert(
      errors.some((error) => error.includes("never defined")),
      `the error must say that the type is undefined, it says ${JSON.stringify(errors)}`,
    );
    assertNotIncludes(
      await devResult(page),
      "The schema is valid",
      "a schema with an undefined type must not be reported as valid",
    );

    // A complete schema has to be accepted.
    await fillArea(page, GRAPHQL_SCHEMA, 0);
    await clickButton(page, "Validate schema");
    assert.deepStrictEqual(
      await devErrors(page),
      [],
      "a complete schema must not raise an error",
    );
    assertEqual(
      await devResult(page),
      "The schema is valid: every type it uses is defined.",
      "the validator must confirm a complete schema",
    );
  });

  spec("graphql-schema-viewer-validator", "shows the types and fields of a GraphQL schema", async (page) => {
    await fillArea(page, GRAPHQL_SCHEMA, 0);
    await clickButton(page, "Show schema");
    const out = await devResult(page);
    assertIncludes(out, "type Order", "the viewer must show the type");
    assertIncludes(out, "  id: ID!", "the viewer must keep the non-null mark of a field");
    assertIncludes(out, "  total: Float!", "the viewer must read a floating point field");
    assertIncludes(out, "  customer: Customer", "the viewer must read a field of another type");
    assertIncludes(out, "  items: [Item!]!", "the viewer must read a list of non-null items");
    assertIncludes(out, "interface Node", "the viewer must show the interface as well");

    assert.deepStrictEqual(
      await declaredTypes(page),
      ["type Order", "type Customer", "type Item", "interface Node"],
      "the declared types must be listed with their kind",
    );
  });

  /* --------------------------------------------------------- XML family -- */

  spec("xml-formatter", "indents an XML document", async (page) => {
    await fillArea(page, "<a><b>text</b></a>", 0);
    await clickButton(page, "Format XML");
    assertEqual(
      await devResult(page),
      "<a>\n  <b>text</b>\n</a>",
      "the formatter must indent the child and keep the text",
    );
  });

  spec("xml-validator", "reports whether an XML document is well formed", async (page) => {
    await fillArea(page, "<a><b>text</b></a>", 0);
    await clickButton(page, "Validate XML");
    assertEqual(
      await devResult(page),
      "The document is well-formed XML.",
      "a sound document must be confirmed",
    );
    assert.deepStrictEqual(
      await devErrors(page),
      [],
      "a sound document must not raise an error",
    );

    // A document whose tags do not match is not well formed.
    await fillArea(page, "<a><b>text</a>", 0);
    await clickButton(page, "Validate XML");
    const errors = await devErrors(page);
    assert(errors.length >= 1, "a document with mismatched tags must raise an error");
    assert(
      errors.some((error) => /error/i.test(error)),
      `the error must say that the document is broken, it says ${JSON.stringify(errors)}`,
    );
    assertNotIncludes(
      await devResult(page),
      "well-formed",
      "a broken document must not be confirmed",
    );
  });

  spec("xml-viewer", "shows the tree of an XML document", async (page) => {
    await fillArea(page, XML_DOCUMENT, 0);
    await clickButton(page, "Build tree");
    assert.deepStrictEqual(
      (await devResult(page)).split("\n"),
      [
        "<catalog>",
        '  <book id="bk101">',
        "    <author> Gambardella, Matthew",
        "    <price> 44.95",
        '  <book id="bk102">',
        "    <author> Ralls, Kim",
        "    <price> 45.95",
      ],
      "the tree must show every element with its attribute and its text",
    );
  });

  spec("xsd-editor", "reads the declarations of an XSD schema", async (page) => {
    await fillArea(page, XSD_ELEMENTS, 0);
    await clickButton(page, "Check schema");
    assert.deepStrictEqual(
      (await devResult(page)).split("\n"),
      [
        "element order (minOccurs=1, maxOccurs=1)",
        "element item : xs:string (minOccurs=0, maxOccurs=unbounded)",
        "attribute id : xs:ID (required)",
        "attribute note : xs:string (optional)",
      ],
      "the editor must read every element and attribute with its occurrence",
    );
  });

  spec("xsd-schema-viewer", "shows the types an XSD schema defines", async (page) => {
    await fillArea(page, XSD_TYPES, 0);
    await clickButton(page, "List types");
    assert.deepStrictEqual(
      (await devResult(page)).split("\n"),
      ["simpleType Currency", "complexType Money"],
      "the viewer must list the named types of the schema",
    );
  });

  spec("xsd-viewer", "shows the elements an XSD schema declares", async (page) => {
    await fillArea(page, XSD_ELEMENTS, 0);
    await clickButton(page, "List elements");
    assert.deepStrictEqual(
      (await devResult(page)).split("\n"),
      [
        "element order (minOccurs=1, maxOccurs=1)",
        "element item : xs:string (minOccurs=0, maxOccurs=unbounded)",
        "attribute id : xs:ID (required)",
        "attribute note : xs:string (optional)",
      ],
      "the viewer must list every element and attribute of the schema",
    );
  });

  /* -------------------------------------------------------- Math family -- */

  spec("latex-equation-editor", "renders a LaTeX equation", async (page) => {
    await fillArea(page, "E = mc^2", 0);
    await clickButton(page, "Render equation");

    const einstein = await mathInfo(page);
    assert(einstein, "the editor must render the equation");
    assertEqual(einstein.text, "E=mc2", "the rendered equation must be E = mc²");
    assertEqual(einstein.superscripts, 1, "the exponent must be a real superscript");
    assert(einstein.html.includes("<mo>=</mo>"), "the equals sign must be rendered");

    await fillArea(page, "\\frac{a+b}{c}", 0);
    await clickButton(page, "Render equation");
    const fraction = await mathInfo(page);
    assert(fraction, "the editor must render the fraction");
    assertEqual(fraction.fractions, 1, "the fraction must be a real fraction");
    assertEqual(fraction.text, "a+bc", "the fraction must keep the plus of its numerator");
    assert(fraction.html.includes("<mo>+</mo>"), "the plus must be rendered");

    assertEqual(
      await buttonEnabled(page, "Copy MathML"),
      true,
      "the rendered MathML must be ready to be copied",
    );
  });

  spec("math-editor", "renders a mathematical formula", async (page) => {
    await fillArea(page, "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", 0);
    await clickButton(page, "Render equation");

    const formula = await mathInfo(page);
    assert(formula, "the editor must render the formula");
    assertEqual(formula.fractions, 1, "the formula must contain a real fraction");
    assertEqual(formula.roots, 1, "the formula must contain a real root");
    assert(formula.html.includes("<mo>±</mo>"), "the plus-minus must be rendered");
    assert(formula.text.includes("±"), "the plus-minus must be part of the formula");
    assert(formula.superscripts >= 1, "the square under the root must be a superscript");
  });

  /* -------------------------------------------------- local model chats -- */

  const chatSpec = (slug, name, expectedModels) =>
    spec(slug, name, async (page) => {
      const before = await devText(page);
      assertIncludes(
        before,
        "No model weights are bundled with this site",
        "the tool must say that no model ships with it",
      );
      assertIncludes(before, "/models/", "the weights must be loaded from this origin");

      const options = await selectOptions(page, 0);
      assert(options.length >= 2, "the tool must offer more than one model");
      for (const model of expectedModels) {
        assert(
          options.some((option) => option.toLowerCase().includes(model.toLowerCase())),
          `the model list must offer ${model}, it offers ${JSON.stringify(options)}`,
        );
      }

      // Pressing "Load model" has to report the truth about the weights.
      await clickButton(page, "Load model");
      await sleep(600);
      const errors = await devErrors(page);
      assert(
        errors.some((error) => error.includes("were not found on this origin")),
        `the tool must say that the weights are missing, it says ${JSON.stringify(errors)}`,
      );
      assertEqual(
        await statusValue(page, "Model status"),
        "not found",
        "the model status must report the missing weights",
      );

      // A prompt without a model must not be answered with an invention.
      await fillArea(page, "Hello from the audit", 0);
      await clickButton(page, "Send prompt");
      await sleep(400);
      const after = await devText(page);
      assertIncludes(after, "You: Hello from the audit", "the prompt must appear in the chat");
      assertIncludes(
        after,
        "Load the model first, then send a prompt.",
        "the tool must refuse to answer without a model",
      );

      const gpu = await statusValue(page, "WebGPU");
      assert(
        gpu === "available" || gpu === "not available in this browser",
        `the tool must report the WebGPU state, it reports ${JSON.stringify(gpu)}`,
      );

      // The browser logs the 404 of the missing weights: that is the honest
      // answer of the probe, not a defect of the page.
      return ["status of 404"];
    });

  chatSpec(
    "local-ai-chat",
    "offers a chat with a local model",
    ["Qwen2.5", "Llama"],
  );
  chatSpec(
    "offline-ai-chat",
    "offers a chat with a local model",
    ["Qwen2.5", "Llama"],
  );
  chatSpec(
    "private-ai-chatbot",
    "offers a chat with a local model",
    ["Phi-3", "Qwen2.5"],
  );

  /* ------------------------------------------------- code screenshotting -- */

  const screenshotSpec = (slug, name) =>
    spec(slug, name, async (page) => {
      await fillArea(page, "const total = 1 + 2;", 0);
      await sleep(500);

      const dark = await canvasInfo(page);
      assert(dark, "the tool must draw the snippet on a canvas");
      assertEqual(dark.header, "data:image/png;base64,", "the canvas must hold a PNG");
      assertEqual(
        dark.magic.join(","),
        "137,80,78,71,13,10,26,10",
        "the file must start with the signature of a PNG",
      );
      assertEqual(dark.chunk, "IHDR", "the first chunk of a PNG must be its header");
      assertEqual(dark.width, dark.canvasWidth, "the PNG must have the width of the canvas");
      assertEqual(dark.height, dark.canvasHeight, "the PNG must have the height of the canvas");
      assert(dark.width >= 320, "the image must be at least 320 pixels wide");
      assert(dark.bytes > 100, "the PNG must carry the drawn snippet");
      assertEqual(
        dark.pixel.join(","),
        "15,23,42",
        "the dark theme must paint the background in its own colour",
      );

      // The theme selector has to change the image that is produced.
      await selectOption(page, "light", 0);
      await sleep(600);
      const light = await canvasInfo(page);
      assert(light, "the canvas must still hold the snippet");
      assertEqual(
        light.pixel.join(","),
        "255,255,255",
        "the light theme must paint the background white",
      );
      assertEqual(
        await buttonEnabled(page, "Download PNG"),
        true,
        "the PNG must be ready for the download",
      );
    });

  screenshotSpec("code-screenshot-generator", "renders a screenshot of a code snippet");
  screenshotSpec("code-snippet-screenshot", "renders a screenshot of a code snippet");
}
