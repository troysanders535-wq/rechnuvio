/**
 * Functional specs for the 7 tools of the base64 engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real textarea,
 * presses the real "Encode to Base64" / "Decode Base64" button and reads the
 * rendered output textarea.
 *
 * Expected values come from RFC 4648 section 10 (the test vectors for the
 * base64 alphabet) and from the definition of a base64 data URL - never from
 * this site's own implementation.
 */

import {
  spec,
  fillArea,
  clickButton,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
} from "../lib/test-helpers.mjs";

/** The 1x1 pixel PNG from RFC 4648 style data URLs, as a base64 data URL. */
const PNG_DATA_URL =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Read the value of the output textarea (the second textarea of the workspace). */
async function output(page) {
  return page.locator("main textarea").nth(1).inputValue();
}

/**
 * Decode a base64 payload into a data URL for an image and read the src of the
 * rendered <img> preview. Returns null when no preview was rendered.
 */
async function previewSrc(page) {
  const img = page.locator("main img").first();
  if ((await img.count()) === 0) return null;
  return img.getAttribute("src");
}

export function register() {
  spec("base64-encoder", "encodes plain text to base64 (RFC 4648 vector)", async (page) => {
    // RFC 4648 section 10: "foobar" -> "Zm9vYmFy"
    await fillArea(page, "foobar");
    await clickButton(page, "Encode to Base64");
    assertEqual(await output(page), "Zm9vYmFy", "base64 of \"foobar\"");
  });

  spec("base64-decoder", "decodes base64 back to plain text (RFC 4648 vector)", async (page) => {
    // RFC 4648 section 10: "Zm9vYmFy" -> "foobar"
    await fillArea(page, "Zm9vYmFy");
    await clickButton(page, "Decode Base64");
    assertEqual(await output(page), "foobar", "decoded text");
  });

  spec("base64-encoder-decoder", "round-trips text through base64", async (page) => {
    // RFC 4648 section 10: "Man" -> "TWFu", and "TWFu" -> "Man".
    await fillArea(page, "Man");
    await clickButton(page, "Encode to Base64");
    assertEqual(await output(page), "TWFu", "base64 of \"Man\"");

    await fillArea(page, "TWFu");
    await clickButton(page, "Decode Base64");
    assertEqual(await output(page), "Man", "round-tripped text");
  });

  spec("base64-image-decoder", "decodes a base64 image and shows the picture", async (page) => {
    // A base64 image is binary data, so the decoder must not run it through a
    // UTF-8 text decoder: it must produce a data URL and render the image.
    await fillArea(page, PNG_DATA_URL);
    await clickButton(page, "Decode Base64");

    const out = await output(page);
    assertNotIncludes(out, "Error decoding", "base64 image decoding must not fail");

    const src = await previewSrc(page);
    assertIncludes(String(src), "data:image/png;base64,", "rendered image preview src");
  });

  spec("base64-image-viewer", "shows the image of a base64 data URL", async (page) => {
    // The viewer has to render the picture itself, not only echo the payload.
    await fillArea(page, PNG_DATA_URL);
    await clickButton(page, "Decode Base64");

    const out = await output(page);
    assertNotIncludes(out, "Error decoding", "base64 image decoding must not fail");

    const src = await previewSrc(page);
    assertIncludes(String(src), "data:image/png;base64,", "rendered image preview src");
  });

  spec("base64-to-image", "turns base64 image data into a rendered image", async (page) => {
    // The converter must hand back an image the browser can display.
    await fillArea(page, PNG_DATA_URL);
    await clickButton(page, "Decode Base64");

    const out = await output(page);
    assertNotIncludes(out, "Error decoding", "base64 image conversion must not fail");

    const src = await previewSrc(page);
    assertIncludes(String(src), "data:image/png;base64,", "rendered image src");
  });

  spec("svg-to-base64", "encodes SVG markup to base64", async (page) => {
    // Independent RFC 4648 encoding of the exact SVG bytes.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
      '<rect width="10" height="10" fill="#0a0"/></svg>';
    const expected = Buffer.from(svg, "utf8").toString("base64");

    await fillArea(page, svg);
    await clickButton(page, "Encode to Base64");
    assertEqual(await output(page), expected, "base64 of the SVG source");
  });
}
