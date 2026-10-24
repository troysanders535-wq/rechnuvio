/**
 * Shared helpers for the real-browser functional tests.
 *
 * The helpers drive the real UI in Chrome: they type into the real control,
 * press the real button and read the rendered result. They are not unit tests
 * of a helper function and they are not HTTP/DOM-existence checks.
 *
 * Expected values are established independently - RFC 4648 for Base64,
 * FIPS 180-4 for SHA-256, RFC 1321 for MD5, the IANA layout for UUIDs - and
 * never by running this site's own code.
 */

/* ------------------------------------------------------------- registry --- */

export const specs = [];

/**
 * Register a functional spec for one tool slug.
 *
 * A slug can only carry one spec: the family module is registered after the
 * inline specs, so a family spec replaces an inline one for the same tool
 * rather than running the tool twice.
 */
export function spec(slug, name, fn) {
  const at = specs.findIndex((s) => s.slug === slug);
  if (at >= 0) {
    specs[at] = { slug, name, fn };
    return;
  }
  specs.push({ slug, name, fn });
}

/** Empty the registry. The runner calls this before loading the families. */
export function resetSpecs() {
  specs.length = 0;
}

/* -------------------------------------------------------------- helpers --- */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The workspace text.
 *
 * Results are often rendered into a <textarea> or an <input>, whose content is
 * a *value* and is absent from the rendered text, so values are collected
 * explicitly. Each element's text is collected separately and joined with
 * newlines: a flat textContent glues neighbouring nodes together ("30" next
 * to "15" becomes "1530") and destroys word-boundary matching.
 */
export async function mainText(page) {
  return page.evaluate(() => {
    const m = document.querySelector("main");
    if (!m) return document.body.textContent || "";
    const clone = m.cloneNode(true);
    clone.querySelectorAll("header,footer,nav,script,style").forEach((n) => n.remove());

    const parts = [];
    clone
      .querySelectorAll(
        "dd, dt, span, p, div, li, td, th, h1, h2, h3, h4, code, pre, button, label, strong, option, textarea, input, output, summary, figcaption",
      )
      .forEach((el) => {
        const tag = el.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") {
          const type = (el.getAttribute("type") || "").toLowerCase();
          if (type === "file" || type === "checkbox" || type === "radio") return;
          const v = (el.value || "").trim();
          if (v) parts.push(v);
          return;
        }
        const t = (el.textContent || "").trim();
        if (t) parts.push(t);
      });

    if (!parts.length) parts.push(clone.textContent || "");
    return parts.join("\n");
  });
}

/**
 * The text of the workspace only, without the surrounding page chrome.
 *
 * Some tools print values that also occur in the page shell (the tool name in
 * the <title>, the FAQ, the related tools). Narrowing to the workspace
 * element keeps an assertion from passing for the wrong reason.
 */
export async function workspaceText(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector("main [data-slug]") ||
      document.querySelector("main") ||
      document.body;
    const clone = root.cloneNode(true);
    clone.querySelectorAll("script,style").forEach((n) => n.remove());
    const parts = [];
    clone
      .querySelectorAll(
        "dd, dt, span, p, div, li, td, th, h1, h2, h3, h4, code, pre, button, label, strong, option, textarea, input, output, summary, figcaption",
      )
      .forEach((el) => {
        const tag = el.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") {
          const type = (el.getAttribute("type") || "").toLowerCase();
          if (type === "file" || type === "checkbox" || type === "radio") return;
          const v = (el.value || "").trim();
          if (v) parts.push(v);
          return;
        }
        const t = (el.textContent || "").trim();
        if (t) parts.push(t);
      });
    if (!parts.length) parts.push(clone.textContent || "");
    return parts.join("\n");
  });
}

/** The value of every input-like element in the workspace. */
export async function inputValues(page) {
  return page.evaluate(() => {
    const root = document.querySelector("main [data-slug]") || document.querySelector("main");
    if (!root) return [];
    return Array.from(root.querySelectorAll("input, textarea")).map((el) => ({
      type: (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase(),
      value: el.value || "",
      placeholder: el.getAttribute("placeholder") || "",
      label: el.getAttribute("aria-label") || "",
      name: el.getAttribute("name") || "",
    }));
  });
}

/** Fill the primary text entry: the first textarea, or the first text input. */
export async function fillPrimary(page, value) {
  const area = page.locator("main textarea");
  if (await area.count()) {
    await area.first().fill(value);
    await sleep(600);
    return;
  }
  await fillInput(page, value, 0, "text");
}

/** Fill the nth text-like input. */
export async function fillInput(page, value, nth = 0, type = "text") {
  const inputs = page.locator(`main input[type="${type}"]`);
  await inputs.nth(nth).fill(value);
  await sleep(500);
}

/** Fill the nth textarea. */
export async function fillArea(page, value, nth = 0) {
  const areas = page.locator("main textarea");
  await areas.nth(nth).fill(value);
  await sleep(600);
}

/** Fill the nth number input. */
export async function fillNumber(page, value, nth = 0) {
  const inputs = page.locator('main input[type="number"]');
  await inputs.nth(nth).fill(String(value));
  await sleep(500);
}

/** Select an option in the nth <select>. */
export async function selectOption(page, value, nth = 0) {
  const selects = page.locator("main select");
  await selects.nth(nth).selectOption(String(value));
  await sleep(500);
}

/** Click the button whose visible text matches, exact match first. */
export async function clickButton(page, label, timeout = 8000) {
  const wanted = label.trim().toLowerCase();
  const all = page.locator("main button");
  const count = await all.count();
  let exact = null;
  let partial = null;
  for (let i = 0; i < count; i += 1) {
    const btn = all.nth(i);
    if (!(await btn.isVisible())) continue;
    const text = ((await btn.textContent()) || "").replace(/\s+/g, " ").trim();
    const low = text.toLowerCase();
    if (low === wanted && !exact) exact = btn;
    else if (low.includes(wanted) && !partial) partial = btn;
  }
  const target = exact || partial;
  if (!target) {
    const labels = [];
    for (let i = 0; i < count; i += 1) {
      const text = ((await all.nth(i).textContent()) || "").replace(/\s+/g, " ").trim();
      if (text) labels.push(text.slice(0, 40));
    }
    throw new Error(
      `no button matching ${JSON.stringify(label)}; available: ${JSON.stringify(labels.slice(0, 20))}`,
    );
  }
  await target.click();
  await sleep(700);
}

/** Click the button whose visible text contains all of the given parts. */
export async function clickButtonContaining(page, parts, timeout = 8000) {
  const all = page.locator("main button");
  const count = await all.count();
  for (let i = 0; i < count; i += 1) {
    const btn = all.nth(i);
    if (!(await btn.isVisible())) continue;
    const text = ((await btn.textContent()) || "").replace(/\s+/g, " ").trim();
    if (parts.every((p) => text.toLowerCase().includes(p.toLowerCase()))) {
      await btn.click();
      await sleep(700);
      return;
    }
  }
  throw new Error(`no button containing ${JSON.stringify(parts)}`);
}

/** Click a button only if one matching the parts exists. */
export async function clickButtonIfPresent(page, parts) {
  try {
    await clickButtonContaining(page, parts);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ assertions -- */

export function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(
      `${message}\n  expected to find: ${JSON.stringify(needle)}\n  page text: ${JSON.stringify(
        text.slice(0, 600),
      )}`,
    );
  }
}

export function assertMatches(text, re, message) {
  if (!re.test(text)) {
    throw new Error(
      `${message}\n  expected to match: ${re}\n  page text: ${JSON.stringify(text.slice(0, 600))}`,
    );
  }
}

export function assertNotIncludes(text, needle, message) {
  if (text.includes(needle)) {
    throw new Error(
      `${message}\n  expected NOT to find: ${JSON.stringify(needle)}\n  page text: ${JSON.stringify(
        text.slice(0, 600),
      )}`,
    );
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * The value of a stat card, found through its label.
 *
 * A stat card renders the number and the label in two separate elements, so
 * the number cannot be matched on the page text alone: a four word sentence
 * also has four unique words, and both cards would carry a "4". The card is
 * read directly instead.
 */
export async function statValue(page, label) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(
      document.querySelectorAll("main p, main span, main label"),
    );
    const el = nodes.find((node) => (node.textContent || "").trim() === wanted);
    if (!el || !el.parentElement) return null;
    const value = el.parentElement.querySelector("span");
    return value ? (value.textContent || "").trim() : null;
  }, label);
}

/** The value of a stat card, waiting until the card shows up. */
export async function waitForStat(page, label, timeout = 20000) {
  const started = Date.now();
  for (;;) {
    const value = await statValue(page, label);
    if (value !== null) return value;
    if (Date.now() - started > timeout) {
      throw new Error(
        `no stat card labelled ${JSON.stringify(label)} after ${timeout}ms`,
      );
    }
    await sleep(250);
  }
}

/**
 * The output of the panel that carries the given label.
 *
 * The label sits in the header of the panel and the output is the element
 * below it: a result box (a textarea), a paragraph or a preformatted block.
 */
export async function labelledOutput(page, label) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(
      document.querySelectorAll("main span, main p, main label"),
    );
    const el = nodes.find((node) => (node.textContent || "").trim() === wanted);
    if (!el || !el.parentElement || !el.parentElement.parentElement) return null;
    const scope = el.parentElement.parentElement;
    const out = scope.querySelector("textarea, pre, p");
    if (!out) return null;
    const value = "value" in out ? out.value : out.textContent || "";
    return value.trim();
  }, label);
}

/** The value of every element that carries the given id. */
export async function valueById(page, id) {
  return page.evaluate((wanted) => {
    const el = document.getElementById(wanted);
    if (!el) return null;
    return "value" in el ? el.value : (el.textContent || "").trim();
  }, id);
}

