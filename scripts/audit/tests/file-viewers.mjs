/**
 * Functional specs for the 17 tools of the file-viewers engine.
 *
 * Every spec drives the real UI in Chrome and reads the real rendered result:
 *
 * - the 3D viewer is fed real model files (STL, OBJ, PLY, glTF, GLB, 3MF)
 *   that are built here, so the triangle and vertex counts the viewer reports
 *   can be checked against the geometry that was actually written into the
 *   file;
 * - the Illustrator viewer is fed a PDF compatible .ai file, so the page
 *   count and the page size can be checked against the MediaBox of the
 *   document;
 * - the database and document viewers are fed a real .docx, .eml and .msg
 *   file and have to show the content of that file.
 */

import assert from "node:assert";

import {
  spec,
  fillInput,
  clickButton,
  assertIncludes,
  assertEqual,
  sleep,
} from "../lib/test-helpers.mjs";

import { buildMsgFixture, MESSAGE } from "../lib/msg-fixture.mjs";

/* --------------------------------------------------------------- helpers -- */

/** Hand a file to the viewer file input and fire the real change event. */
async function uploadFile(page, { name, type, bytes }) {
  await page.evaluate(
    ({ name, type, bytes }) => {
      const input = document.querySelector("main input[type=file]");
      if (!input) {
        throw new Error("the viewer offers no file input, so no file can be opened");
      }
      const file = new File([new Uint8Array(bytes)], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, bytes: Array.from(bytes) },
  );
}

/** The geometry numbers the 3D viewer shows in its statistics panel. */
async function modelStats(page) {
  return page.evaluate(() => {
    const read = (wanted) => {
      const nodes = Array.from(document.querySelectorAll("main span, main p"));
      const el = nodes.find((n) => (n.textContent || "").trim() === wanted);
      if (!el || !el.parentElement) return null;
      const spans = Array.from(el.parentElement.querySelectorAll("span"));
      const at = spans.indexOf(el);
      return at >= 0 && spans[at + 1] ? (spans[at + 1].textContent || "").trim() : null;
    };
    const box = read("Bounding Box");
    return {
      triangles: read("Triangles"),
      vertices: read("Vertices"),
      meshes: read("Meshes"),
      box,
      extents: box
        ? box
            .split(/[×x]/)
            .map((part) => Number(part.trim()))
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => a - b)
        : [],
    };
  });
}

/** Wait until the viewer reports the geometry of the loaded model. */
async function waitForStats(page, timeout = 20000) {
  const started = Date.now();
  for (;;) {
    const stats = await modelStats(page);
    if (stats.triangles) return stats;
    if (Date.now() - started > timeout) {
      throw new Error("the viewer never reported the geometry of the model");
    }
    await sleep(300);
  }
}

/** The text the workspace shows. */
async function workspaceTextOf(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector("main [data-slug]") ||
      document.querySelector("main") ||
      document.body;
    return root.innerText || "";
  });
}

/* -------------------------------------------------------------- fixtures -- */

/** The CRC-32 of a buffer, as the ZIP format defines it. */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A ZIP archive with stored (uncompressed) entries, as the format defines. */
function zipFixture(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

/** An ASCII STL with two triangles and six distinct vertices. */
function stlFixture() {
  return Buffer.from(
    `solid box
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 20 0
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 30
    vertex 10 0 30
    vertex 0 20 30
  endloop
endfacet
endsolid box
`,
    "utf8",
  );
}

/** A Wavefront OBJ with three vertices and one triangular face. */
function objFixture() {
  return Buffer.from(
    `# a triangle
v 0 0 0
v 10 0 0
v 0 20 0
f 1 2 3
`,
    "utf8",
  );
}

/** An ASCII PLY with three vertices and one triangular face. */
function plyFixture() {
  return Buffer.from(
    `ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
element face 1
property list uchar int vertex_indices
end_header
0 0 0
10 0 0
0 20 0
3 0 1 2
`,
    "utf8",
  );
}

/** The nine floats of a single triangle, as glTF stores them. */
function gltfTriangleBuffer() {
  const data = Buffer.alloc(36);
  [[0, 0, 0], [10, 0, 0], [0, 20, 0]].forEach((vertex, i) => {
    vertex.forEach((value, j) => data.writeFloatLE(value, (i * 3 + j) * 4));
  });
  return data;
}

/** A glTF 2.0 document with an embedded buffer and one triangle. */
function gltfFixture() {
  return Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [0, 0, 0],
          max: [10, 20, 0],
        },
      ],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
      buffers: [
        {
          byteLength: 36,
          uri: `data:application/octet-stream;base64,${gltfTriangleBuffer().toString("base64")}`,
        },
      ],
    }),
    "utf8",
  );
}

/** A binary glTF (GLB) with one triangle. */
function glbFixture() {
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [0, 0, 0],
          max: [10, 20, 0],
        },
      ],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
      buffers: [{ byteLength: 36 }],
    }),
    "utf8",
  );
  const jsonPadded = Buffer.concat([
    json,
    Buffer.alloc((4 - (json.length % 4)) % 4, 0x20),
  ]);
  const binary = gltfTriangleBuffer();
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binary.length, 8);
  const jsonChunk = Buffer.alloc(8);
  jsonChunk.writeUInt32LE(jsonPadded.length, 0);
  jsonChunk.writeUInt32LE(0x4e4f534a, 4);
  const binaryChunk = Buffer.alloc(8);
  binaryChunk.writeUInt32LE(binary.length, 0);
  binaryChunk.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, jsonPadded, binaryChunk, binary]);
}

/** A 3MF package (a ZIP archive) with one triangular object. */
function threemfFixture() {
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const relationships =
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  const model =
    `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="10" y="0" z="0"/><vertex x="0" y="20" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
  return zipFixture([
    ["[Content_Types].xml", contentTypes],
    ["_rels/.rels", relationships],
    ["3D/3dmodel.model", model],
  ]);
}

/** A minimal PDF 1.4 document with one page of 200 by 100 points. */
function pdfFixture() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 18 Tf 20 40 Td (ToolPad Illustrator Preview) Tj ET";
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** A minimal Word document that carries an author in its core properties. */
function docxFixture() {
  return zipFixture([
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ],
    [
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>ToolPad Contract</w:t></w:r></w:p></w:body></w:document>`,
    ],
  ]);
}

/** A plain text e-mail message. */
function emlFixture() {
  return Buffer.from(
    `From: sender@example.com
To: reader@example.com
Subject: ToolPad Quarterly Report
Date: Mon, 12 Oct 2026 09:30:00 +0000
Message-ID: <abc123@example.com>
Content-Type: text/plain; charset="utf-8"

Hello from ToolPad.
`,
    "utf8",
  );
}

/** A 4x4 RGB Photoshop document. */
function psdFixture() {
  const head = Buffer.alloc(26);
  head.write("8BPS", 0, "ascii");
  head.writeUInt16BE(1, 4);
  head.writeUInt16BE(3, 12);
  head.writeUInt32BE(4, 14);
  head.writeUInt32BE(4, 18);
  head.writeUInt16BE(8, 22);
  head.writeUInt16BE(3, 24);
  const lengths = Buffer.alloc(12);
  const data = Buffer.alloc(2 + 4 * 4 * 3);
  data.writeUInt16BE(0, 0);
  return Buffer.concat([head, lengths, data]);
}

/* ---------------------------------------------------------------- specs -- */

export function register() {
  /* ---- 3D viewers ---- */

  spec("stl-viewer", "reports the geometry of the loaded STL mesh", async (page) => {
    await uploadFile(page, {
      name: "box.stl",
      type: "model/stl",
      bytes: stlFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "2", "the file holds two triangular facets");
    assertEqual(stats.vertices, "6", "the file holds six distinct vertices");
    assertEqual(stats.meshes, "1", "the file holds one mesh");
    assert.deepEqual(
      stats.extents,
      [10, 20, 30],
      "the bounding box must span 10, 20 and 30 units",
    );
  });

  spec("obj-viewer", "reports the geometry of the loaded OBJ mesh", async (page) => {
    await uploadFile(page, {
      name: "triangle.obj",
      type: "model/obj",
      bytes: objFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "1", "the file holds one triangular face");
    assertEqual(stats.vertices, "3", "the file holds three vertices");
    assert.deepEqual(
      stats.extents,
      [0, 10, 20],
      "the bounding box must span 10 and 20 units",
    );
  });

  spec("ply-viewer", "reports the geometry of the loaded PLY mesh", async (page) => {
    await uploadFile(page, {
      name: "triangle.ply",
      type: "model/ply",
      bytes: plyFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "1", "the file holds one triangular face");
    assertEqual(stats.vertices, "3", "the file holds three vertices");
    assert.deepEqual(
      stats.extents,
      [0, 10, 20],
      "the bounding box must span 10 and 20 units",
    );
  });

  spec("gltf-viewer", "reports the geometry of the loaded glTF model", async (page) => {
    await uploadFile(page, {
      name: "triangle.gltf",
      type: "model/gltf+json",
      bytes: gltfFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "1", "the model holds one triangle");
    assertEqual(stats.vertices, "3", "the model holds three vertices");
    assert.deepEqual(
      stats.extents,
      [0, 10, 20],
      "the bounding box must span 10 and 20 units",
    );
  });

  spec("glb-viewer", "reports the geometry of the loaded GLB model", async (page) => {
    await uploadFile(page, {
      name: "triangle.glb",
      type: "model/gltf-binary",
      bytes: glbFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "1", "the model holds one triangle");
    assertEqual(stats.vertices, "3", "the model holds three vertices");
    assert.deepEqual(
      stats.extents,
      [0, 10, 20],
      "the bounding box must span 10 and 20 units",
    );
  });

  spec("3mf-viewer", "reports the geometry of the loaded 3MF package", async (page) => {
    await uploadFile(page, {
      name: "triangle.3mf",
      type: "model/3mf",
      bytes: threemfFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "1", "the package holds one triangle");
    assertEqual(stats.vertices, "3", "the package holds three vertices");
    assert.deepEqual(
      stats.extents,
      [0, 10, 20],
      "the bounding box must span 10 and 20 units",
    );
  });

  spec("3d-viewer", "reports the geometry of the loaded model", async (page) => {
    await uploadFile(page, {
      name: "box.stl",
      type: "model/stl",
      bytes: stlFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "2", "the file holds two triangular facets");
    assertEqual(stats.vertices, "6", "the file holds six distinct vertices");
    assert.deepEqual(
      stats.extents,
      [10, 20, 30],
      "the bounding box must span 10, 20 and 30 units",
    );
  });

  spec("fbx-viewer", "reports the geometry of the model opened in the viewer", async (page) => {
    await uploadFile(page, {
      name: "box.stl",
      type: "model/stl",
      bytes: stlFixture(),
    });
    const stats = await waitForStats(page);
    assertEqual(stats.triangles, "2", "the file holds two triangular facets");
    assertEqual(stats.vertices, "6", "the file holds six distinct vertices");
    const accepts = await page.evaluate(() => {
      const input = document.querySelector("main input[type=file]");
      return input ? input.getAttribute("accept") || "" : "";
    });
    assertIncludes(accepts, ".fbx", "the viewer must accept .fbx files");
  });

  /* ---- Illustrator viewer ---- */

  spec("ai-viewer", "renders the PDF compatible stream of an .ai file", async (page) => {
    await uploadFile(page, {
      name: "artwork.ai",
      type: "application/illustrator",
      bytes: pdfFixture(),
    });
    await sleep(3500);
    const text = await workspaceTextOf(page);
    assertIncludes(text, "Page 1 of 1", "the document has a single page");
    assertIncludes(
      text,
      "200.0 × 100.0 pt",
      "the MediaBox of the document is 200 by 100 points",
    );
    const painted = await page.evaluate(() => {
      const canvas = document.querySelector("main canvas");
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let dark = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 200) dark += 1;
      return { width: canvas.width, height: canvas.height, dark };
    });
    assert(painted, "the viewer must render the page on a canvas");
    assert(painted.dark > 0, "the rendered page must not be blank");
  });

  /* ---- database viewers ---- */

  const sqlSpec = (slug, name) => {
    spec(slug, name, async (page) => {
      const headers = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main table th")).map((th) =>
          (th.textContent || "").trim(),
        ),
      );
      assert.deepEqual(
        headers,
        ["id", "name", "email", "role", "active"],
        "the result table must show the columns of the users table",
      );
      await fillInput(page, "SELECT name FROM users WHERE id = 2;", 0, "text");
      await clickButton(page, "Execute SQL");
      await sleep(800);
      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main table tbody tr")).map((tr) =>
          Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim()),
        ),
      );
      assert.deepEqual(
        rows.map((row) => row[1]),
        ["Bob Jones"],
        "the query must return only the row with id 2",
      );
    });
  };

  sqlSpec("sqlite-viewer", "runs the SQL query and shows the matching rows");
  sqlSpec("sqlite-browser", "runs the SQL query and shows the matching rows");
  sqlSpec("sqlite-online", "runs the SQL query and shows the matching rows");
  sqlSpec("db-viewer", "runs the SQL query and shows the matching rows");

  /* ---- document viewers ---- */

  spec("docx-viewer", "shows the text of the opened Word document", async (page) => {
    await uploadFile(page, {
      name: "contract.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docxFixture(),
    });
    await sleep(1500);
    const text = await workspaceTextOf(page);
    assertIncludes(text, "ToolPad Contract", "the viewer must show the text of the document");
  });

  spec("eml-viewer", "shows the headers of the opened e-mail", async (page) => {
    await uploadFile(page, {
      name: "report.eml",
      type: "message/rfc822",
      bytes: emlFixture(),
    });
    await sleep(1500);
    const text = await workspaceTextOf(page);
    assertIncludes(text, "ToolPad Quarterly Report", "the viewer must show the subject");
    assertIncludes(text, "sender@example.com", "the viewer must show the sender");
  });

  spec("msg-viewer", "opens an Outlook message and shows its headers, body and attachments", async (page) => {
    const accepts = await page.evaluate(() => {
      const input = document.querySelector("main input[type=file]");
      return input ? input.getAttribute("accept") || "" : "";
    });
    assertIncludes(accepts, ".msg", "the viewer must accept .msg files");

    // The fixture is a real Outlook message: a compound document with the
    // subject, the headers, the body and one attachment in its property
    // streams. The expected values are the ones the fixture declares.
    const { bytes } = buildMsgFixture();
    await uploadFile(page, {
      name: "quarterly-audit.msg",
      type: "application/vnd.ms-outlook",
      bytes: Buffer.from(bytes),
    });
    await sleep(2000);

    const body = await page.locator('[data-testid="msg-body"]').innerText();
    assertIncludes(body, MESSAGE.body.split("\r\n")[0], "the body of the message must be shown");
    assertIncludes(
      body,
      "The quarterly audit is attached to this message.",
      "the text of the message must be shown",
    );

    const text = await workspaceTextOf(page);
    assertIncludes(text, MESSAGE.subject, "the subject of the message must be shown");
    assertIncludes(text, MESSAGE.from, "the sender of the message must be shown");
    assertIncludes(text, MESSAGE.to, "the recipient of the message must be shown");
    assertIncludes(text, MESSAGE.cc, "the copied recipient of the message must be shown");
    assertIncludes(text, MESSAGE.date, "the date of the message must be shown");

    const headers = await page.locator('[data-testid="msg-headers"]').innerText();
    assertIncludes(
      headers,
      "Message-ID: <20260112093000.audit@example.com>",
      "the transport headers of the message must be shown",
    );

    const attachments = page.locator('[data-testid="msg-attachment"]');
    assert.equal(
      await attachments.count(),
      1,
      "the message carries exactly one attachment, so exactly one must be listed",
    );
    const attachmentText = await attachments.first().innerText();
    assertIncludes(
      attachmentText,
      MESSAGE.attachment.name,
      "the name of the attachment must be shown",
    );
    assertIncludes(
      attachmentText,
      String(MESSAGE.attachment.text.length),
      "the size of the attachment must be shown",
    );
  });

  spec("psd-viewer", "opens a Photoshop document and shows its layers", async (page) => {
    await uploadFile(page, {
      name: "artwork.psd",
      type: "image/vnd.adobe.photoshop",
      bytes: psdFixture(),
    });
    await sleep(1500);
    const text = await workspaceTextOf(page);
    assertIncludes(text, "Layer", "the viewer must list the layers of the document");
  });
}
