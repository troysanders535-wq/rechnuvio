/**
 * Functional specs for the 3 tools of the uuid engine.
 *
 * Every spec drives the real UI in Chrome: it picks the version, sets the
 * quantity, presses the real "Generate New UUIDs" button and reads the
 * rendered UUID list.
 *
 * Expected values come from the IANA UUID layout (RFC 4122 section 4.1.1 for
 * the version and variant bits, RFC 9562 section 5.7 for version 7) - never
 * from this site's own implementation.
 */

import {
  spec,
  fillNumber,
  selectOption,
  clickButton,
  assertEqual,
  assertMatches,
} from "../lib/test-helpers.mjs";

/**
 * RFC 4122 section 4.4: a version 4 UUID has the 13th hex digit "4" and the
 * 17th hex digit in 8/9/a/b (the variant bits are 10xx).
 */
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * RFC 9562 section 5.7: a version 7 UUID keeps the same layout, with the
 * 13th hex digit "7" and the variant bits 10xx.
 */
const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The UUIDs that are rendered in the generated list. */
async function generated(page) {
  return page.locator("main span.select-all").allTextContents();
}

export function register() {
  spec("uuid-generator", "generates RFC 4122 version 4 UUIDs", async (page) => {
    await clickButton(page, "Generate New UUIDs");
    const ids = await generated(page);
    assertEqual(ids.length, 5, "number of generated UUIDs");
    for (const id of ids) {
      assertMatches(id, V4, "generated UUID must be a version 4 UUID");
    }
  });

  spec("uuid-v4-generator", "generates the requested number of version 4 UUIDs", async (page) => {
    await selectOption(page, "v4", 0);
    await fillNumber(page, 3, 0);
    await clickButton(page, "Generate New UUIDs");

    const ids = await generated(page);
    assertEqual(ids.length, 3, "number of generated UUIDs");
    for (const id of ids) {
      assertMatches(id, V4, "generated UUID must be a version 4 UUID");
    }
  });

  spec("uuid-v7-generator", "generates version 7 UUIDs by default", async (page) => {
    // The tool is the "UUID v7 Generator", so its default output has to be a
    // version 7 UUID (13th hex digit "7"), not a random version 4 one.
    await clickButton(page, "Generate New UUIDs");
    const ids = await generated(page);
    assertEqual(ids.length, 5, "number of generated UUIDs");
    for (const id of ids) {
      assertMatches(id, V7, "generated UUID must be a version 7 UUID");
    }
  });
}
