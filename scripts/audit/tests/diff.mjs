/**
 * Functional specs for the 5 tools of the diff engine.
 *
 * The expected values come from the line and word diff definitions (a diff
 * is the smallest set of insertions and deletions that turns the original
 * into the modified text) and from JSON semantics (RFC 8259: object member
 * order is not significant).
 *
 * Every spec drives the real UI in Chrome and asserts on a value that was
 * rendered by the tool.
 */

import {
  spec,
  sleep,
  fillArea,
  clickButton,
  mainText,
  assertMatches,
  assertIncludes,
  assertNotIncludes,
  assertEqual,
} from "../lib/test-helpers.mjs";

/**
 * Wait until React has hydrated the workspace.
 *
 * The runner hands the page to the spec a moment after domcontentloaded,
 * which can be before React has hydrated. A fill or a click before the
 * hydration is silently dropped by React, so every spec waits until the
 * event handlers of the workspace are attached.
 */
async function waitForHydration(page, timeout = 20000) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main");
      if (!main) return false;
      // React attaches its fiber to the container while it hydrates the tree.
      return Object.keys(main).some((k) => k.startsWith("__reactFiber$"));
    },
    undefined,
    { timeout },
  );
  await sleep(150);
}

/**
 * Register the one spec of a tool.
 *
 * It waits for the React hydration before the test drives the UI, so that a
 * fill or a click is never lost to a page that is not hydrated yet.
 */
function toolSpec(slug, name, fn) {
  spec(slug, name, async (page) => {
    await waitForHydration(page);
    await fn(page);
  });
}
/** The two diff input panes: original first, modified second. */
async function fillDiff(page, original, modified) {
  await fillArea(page, original, 0);
  await fillArea(page, modified, 1);
  await clickButton(page, "Compare Diffs");
}

/** The text the visualizer renders as a deletion (struck through). */
async function removedText(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main span.line-through"))
      .map((el) => el.textContent || "")
      .join(""),
  );
}

export function register() {
  toolSpec("diff-checker", "counts the added and the deleted lines", async (page) => {
    await fillDiff(page, "alpha\nbeta\ngamma", "alpha\nBETA\ngamma");
    const text = await mainText(page);
    // one line was replaced, so the diff holds one addition and one deletion
    assertMatches(text, /\+1 additions/, "one addition should be counted");
    assertMatches(text, /-1 deletions/, "one deletion should be counted");
    assertIncludes(text, "BETA", "the added line should be shown");
    assertEqual(
      await removedText(page),
      "beta\n",
      "the removed line should be struck through",
    );
  });

  toolSpec("json-diff", "compares two JSON documents line by line", async (page) => {
    await fillDiff(
      page,
      JSON.stringify({ name: "Ada", role: "engineer" }, null, 2),
      JSON.stringify({ name: "Ada", role: "manager" }, null, 2),
    );
    const text = await mainText(page);
    assertMatches(text, /\+1 additions/, "one added line should be counted");
    assertMatches(text, /-1 deletions/, "one deleted line should be counted");
    assertIncludes(text, "manager", "the new value should be shown");
  });

  toolSpec("text-compare", "compares two texts word by word", async (page) => {
    await fillDiff(page, "the quick brown fox", "the quick red fox");
    await clickButton(page, "Word Diff");
    await sleep(400);
    const text = await mainText(page);
    assertMatches(text, /\+1 additions/, "one added word should be counted");
    assertMatches(text, /-1 deletions/, "one deleted word should be counted");
    assertIncludes(text, "red", "the added word should be shown");
    assertEqual(
      await removedText(page),
      "brown",
      "the deleted word should be struck through",
    );
  });

  toolSpec("text-diff", "marks the removed text with a strike-through", async (page) => {
    await fillDiff(page, "alpha\nbeta\ngamma", "alpha\nBETA\ngamma");
    const text = await mainText(page);
    assertMatches(text, /\+1 additions/, "one addition should be counted");
    assertMatches(text, /-1 deletions/, "one deletion should be counted");
    assertEqual(
      await removedText(page),
      "beta\n",
      "the removed line should be struck through",
    );
    assertNotIncludes(
      await removedText(page),
      "alpha",
      "the unchanged line should not be struck through",
    );
    assertNotIncludes(
      await removedText(page),
      "BETA",
      "the added line should not be struck through",
    );
  });

  toolSpec(
    "json-diff-compare",
    "counts the semantic differences of two JSON documents",
    async (page) => {
      const areas = page.locator("main textarea");
      await areas.nth(0).fill(JSON.stringify({ a: 1, b: 2 }));
      await areas.nth(1).fill(JSON.stringify({ a: 1, b: 3, c: 4 }));
      await sleep(900);
      const text = await mainText(page);
      // "b" changed from 2 to 3, "c" is new: one modification and one addition
      assertMatches(text, /2 differences detected/i, "two differences in total");
      assertMatches(text, /\+1 added/i, "one added member");
      assertMatches(text, /-0 removed/i, "no removed member");
      assertMatches(text, /~1 modified/i, "one modified member");
      assertIncludes(text, "MODIFIED", "the modified member should be listed");
      assertIncludes(text, "ADDED", "the added member should be listed");
      assertIncludes(text, "b", "the path of the modified member should be listed");
    },
  );
}
