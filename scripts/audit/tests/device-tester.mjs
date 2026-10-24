/**
 * Functional specs for the 14 tools of the device tester engine.
 *
 * The device tester family serves four different workspaces (click speed,
 * keyboard, microphone, webcam) and ten device panels. A tool only works when
 * its own workspace is rendered, so every spec checks the workspace that
 * belongs to the tool and then drives it.
 *
 * The expected values come from the definitions the tools promise:
 * the click speed is the number of clicks divided by the elapsed seconds,
 * the keyboard reports the UI Events `code` of every key, the mouse counts the
 * presses of its three buttons, the gamepad reports the axes and the buttons
 * of the controller and the audio tools build a real Web Audio graph. The
 * hardware that the headless browser does not have - a controller and a sound
 * card - is replaced at the boundary of the browser API, the tool itself is
 * never replaced.
 */

import assert from "node:assert/strict";

import {
  spec,
  sleep,
  clickButton,
  mainText,
  assertMatches,
  assertIncludes,
  assertNotIncludes,
  assertEqual,
} from "../lib/test-helpers.mjs";

/** The origin the pages are served from; the permission is granted for it. */
const BASE_URL = process.env.FUNCTIONAL_BASE_URL || "http://localhost:3100";

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
/* --------------------------------------------------------------- helpers --- */

/**
 * The tool's own workspace: the block inside <main> that sits between the
 * tool header and the SEO block (the one that carries the "Key Features"
 * heading, the FAQ and the related tools).
 */
async function workspaceRegion(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return "";
    const container = main.querySelector(":scope > div");
    if (!container) return "";
    const kids = Array.from(container.children);
    const seoAt = kids.findIndex((k) => k.querySelector("h2"));
    const region = kids.slice(0, seoAt < 0 ? kids.length : seoAt);
    const workspace = region[region.length - 1];
    if (!workspace) return "";
    const clone = workspace.cloneNode(true);
    clone.querySelectorAll("script,style").forEach((n) => n.remove());
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  });
}

/** The heading of the tool's own workspace. */
async function workspaceHeading(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return "";
    const container = main.querySelector(":scope > div");
    if (!container) return "";
    const kids = Array.from(container.children);
    const seoAt = kids.findIndex((k) => k.querySelector("h2"));
    const region = kids.slice(0, seoAt < 0 ? kids.length : seoAt);
    const workspace = region[region.length - 1];
    const heading = workspace && workspace.querySelector("h3");
    return heading ? (heading.textContent || "").trim() : "";
  });
}

/**
 * The value of a measured card.
 *
 * A card renders its label, its value and its hint as three separate
 * paragraphs, so the value is read from the card itself and not from the text
 * of the page.
 */
async function deviceStat(page, label) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(document.querySelectorAll("main p, main span, main label"));
    const el = nodes.find((node) => (node.textContent || "").trim() === wanted);
    if (!el || !el.parentElement) return null;
    const value = el.nextElementSibling;
    return value ? (value.textContent || "").trim() : null;
  }, label);
}

/** The hint of a measured card. */
async function deviceStatHint(page, label) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(document.querySelectorAll("main p, main span, main label"));
    const el = nodes.find((node) => (node.textContent || "").trim() === wanted);
    if (!el || !el.parentElement) return null;
    const value = el.nextElementSibling;
    const hint = value ? value.nextElementSibling : null;
    return hint ? (hint.textContent || "").trim() : null;
  }, label);
}

/** The value of a measured card, waiting until the card shows up. */
async function waitForDeviceStat(page, label, timeout = 20000) {
  const started = Date.now();
  for (;;) {
    const value = await deviceStat(page, label);
    if (value !== null) return value;
    if (Date.now() - started > timeout) {
      throw new Error(`no card labelled ${JSON.stringify(label)} after ${timeout}ms`);
    }
    await sleep(250);
  }
}

/**
 * Record the Web Audio graph that a tool builds.
 *
 * The recorder replaces the AudioContext of the page with a wrapper that
 * keeps the oscillators, the gains and the panners the tool creates. The tool
 * itself is not touched: it still builds its own graph, the recorder only
 * reads it. It is the only way to check what a tool really plays in a headless
 * browser, where nothing can be heard.
 */
async function installAudioRecorder(page) {
  await page.evaluate(() => {
    const log = { oscillators: [], gains: [], panners: [] };
    window.__audioLog = log;

    const record = (param, sink) => {
      const set = param.setValueAtTime.bind(param);
      const ramp = param.exponentialRampToValueAtTime.bind(param);
      param.setValueAtTime = (value, time) => {
        sink.push(["set", value]);
        return set(value, time);
      };
      param.exponentialRampToValueAtTime = (value, time) => {
        sink.push(["ramp", value]);
        return ramp(value, time);
      };
    };

    const Original = window.AudioContext || window.webkitAudioContext;
    if (!Original) return;

    const Wrapped = function (...args) {
      const context = new Original(...args);
      const oscillator = context.createOscillator.bind(context);
      context.createOscillator = () => {
        const node = oscillator();
        const entry = { node, freqCalls: [], start: null, stop: null };
        record(node.frequency, entry.freqCalls);
        const start = node.start.bind(node);
        node.start = (when) => {
          entry.start = when === undefined ? context.currentTime : when;
          return start(when);
        };
        const stop = node.stop.bind(node);
        node.stop = (when) => {
          entry.stop = when === undefined ? context.currentTime : when;
          return stop(when);
        };
        log.oscillators.push(entry);
        return node;
      };
      const gain = context.createGain.bind(context);
      context.createGain = () => {
        const node = gain();
        const entry = { node, calls: [] };
        record(node.gain, entry.calls);
        log.gains.push(entry);
        return node;
      };
      const panner = context.createStereoPanner
        ? context.createStereoPanner.bind(context)
        : null;
      if (panner) {
        context.createStereoPanner = () => {
          const node = panner();
          log.panners.push({ node });
          return node;
        };
      }
      return context;
    };

    window.AudioContext = Wrapped;
    if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  });
}

/** The audio graph the tool has built. */
async function audioLog(page) {
  return page.evaluate(() => {
    const log = window.__audioLog || { oscillators: [], gains: [], panners: [] };
    return {
      oscillators: log.oscillators.map((entry) => ({
        type: entry.node.type,
        frequency: entry.node.frequency.value,
        freqCalls: entry.freqCalls,
        start: entry.start,
        stop: entry.stop,
      })),
      gains: log.gains.map((entry) => ({ value: entry.node.gain.value, calls: entry.calls })),
      pans: log.panners.map((entry) => entry.node.pan.value),
    };
  });
}

/**
 * Put a controller into the browser.
 *
 * A headless browser has no controller, so the gamepad API is replaced by a
 * controller the spec controls. The tool reads it exactly as it reads a real
 * one.
 */
async function installFakeGamepad(page, config) {
  await page.evaluate((options) => {
    window.__fakePad = {
      index: options.index,
      id: options.id,
      mapping: options.mapping,
      connected: true,
      axes: options.axes.slice(),
      buttons: Array.from({ length: options.buttons }, () => ({ pressed: false, value: 0 })),
      timestamp: 0,
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [window.__fakePad],
    });
  }, config);
}

/** Move the axes of the controller and press or release its buttons. */
async function setFakeGamepad(page, options) {
  await page.evaluate((changes) => {
    const pad = window.__fakePad;
    if (!pad) return;
    if (changes.axes) pad.axes = changes.axes.slice();
    if (changes.pressed) {
      changes.pressed.forEach((index) => {
        pad.buttons[index].pressed = true;
        pad.buttons[index].value = 1;
      });
    }
  }, options);
}

/**
 * Click the button that plays the tone.
 *
 * While the tone is playing the button carries the label "Playing...", so the
 * button is found by both of its labels.
 */
async function clickPlayTone(page) {
  const buttons = page.locator("main button");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const text = ((await buttons.nth(index).textContent()) || "").replace(/\s+/g, " ").trim();
    if (text === "Play the tone" || text === "Playing...") {
      await buttons.nth(index).click();
      await sleep(300);
      return;
    }
  }
  throw new Error("the tone generator must offer a button that plays the tone");
}

/* --------------------------------------------------------------- specs ---- */

export function register() {
  /* ---- the four workspaces that exist ----------------------------------- */

  toolSpec("cps-test", "counts the clicks and reports the clicks per second", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Mouse CPS & Click Speed Test", "the click speed panel");
    await clickButton(page, "CLICK HERE RAPIDLY!");
    await clickButton(page, "CLICK HERE RAPIDLY!");
    await clickButton(page, "CLICK HERE RAPIDLY!");
    const text = await mainText(page);
    assertMatches(text, /Clicks:\s*3/, "the three clicks should be counted");
    const score = await page.evaluate(() => {
      const el = document.querySelector("main span.font-mono.text-5xl");
      return el ? (el.textContent || "").trim() : null;
    });
    assert(
      score !== null && /^\d+(\.\d+)? CPS$/.test(score),
      `the click speed should be a number of clicks per second, got ${JSON.stringify(score)}`,
    );
    await clickButton(page, "Reset Score");
    const reset = await mainText(page);
    assertMatches(reset, /Clicks:\s*0/, "the reset should clear the click counter");
    assertMatches(reset, /0\.0 CPS/, "the reset should clear the click speed");
  });

  toolSpec("keyboard-test", "reports every key that was pressed", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Keyboard Ghosting & Key Detection Test", "the keyboard panel");
    await page.keyboard.press("a");
    await page.keyboard.press("b");
    await page.keyboard.press("a");
    await sleep(400);
    const text = await mainText(page);
    // the UI Events specification names the key "a" as the code "KeyA"
    assertIncludes(text, "KeyA", "the pressed key a should be listed");
    assertIncludes(text, "KeyB", "the pressed key b should be listed");
    const chips = await page.locator("main span.font-mono.font-bold").count();
    assertEqual(chips, 2, "a key that is pressed twice is listed once");
    await clickButton(page, "Reset Key History");
    const reset = await mainText(page);
    assertNotIncludes(reset, "KeyA", "the reset should clear the key history");
  });

  toolSpec("mic-test", "asks the browser for the microphone and reports a denied permission", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Microphone Input & Decibel Test", "the microphone panel");

    // --- the permission is denied -------------------------------------------
    // The browser refuses the microphone, the tool has to say so in the page
    // instead of failing silently.
    await page.context().clearPermissions();
    await clickButton(page, "Enable Microphone Test");
    await sleep(1200);
    const denied = page.locator('main [data-testid="device-permission-error"]');
    assertEqual(
      await denied.count(),
      1,
      "a refused microphone must produce exactly one error message in the page",
    );
    assertMatches(
      await denied.textContent(),
      /microphone/i,
      "the error must name the microphone that could not be reached",
    );
    assert(
      !/Input Level/i.test(await workspaceRegion(page)),
      "a refused microphone must not show an input level",
    );

    // --- the permission is granted -------------------------------------------
    // With the permission granted the tool has to work: the meter appears and
    // the level is read from the running audio graph.
    await page.context().grantPermissions(["microphone"], { origin: BASE_URL });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await clickButton(page, "Enable Microphone Test");
    await sleep(1500);
    const workspace = await workspaceRegion(page);
    assertMatches(
      workspace,
      /input level/i,
      "a granted microphone must show its input level",
    );
    assertEqual(
      await page.locator('main [data-testid="device-permission-error"]').count(),
      0,
      "a granted microphone must not show an error",
    );
  });

  toolSpec("webcam-test", "asks the browser for the camera and reports a denied permission", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Webcam Video Test", "the webcam panel");

    // --- the permission is denied -------------------------------------------
    await page.context().clearPermissions();
    await clickButton(page, "Start Camera Test");
    await sleep(1200);
    const denied = page.locator('main [data-testid="device-permission-error"]');
    assertEqual(
      await denied.count(),
      1,
      "a refused camera must produce exactly one error message in the page",
    );
    assertMatches(
      await denied.textContent(),
      /camera/i,
      "the error must name the camera that could not be reached",
    );
    assertEqual(
      await page.locator("main video").count(),
      0,
      "a refused camera must not show a video element",
    );

    // --- the permission is granted -------------------------------------------
    await page.context().grantPermissions(["camera"], { origin: BASE_URL });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await clickButton(page, "Start Camera Test");
    await sleep(1500);
    assert(
      await page.locator("main video").count() > 0,
      "a granted camera must show the video element",
    );
    assertEqual(
      await page.locator('main [data-testid="device-permission-error"]').count(),
      0,
      "a granted camera must not show an error",
    );
  });

  /* ---- the ten device panels --------------------------------------------- */

  toolSpec("mouse-test", "counts the presses, the scrolls and the movement of the pointer", async (page) => {
    assertEqual(await workspaceHeading(page), "Mouse Test", "the mouse panel");
    const area = page.locator("main div.cursor-crosshair");
    assertEqual(await area.count(), 1, "the mouse test must offer one field");
    const box = await area.boundingBox();
    assert(box, "the field of the mouse test must be visible");

    // the first move only places the pointer, the second one is a movement of
    // 50 px to the right and 30 px down
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.move(box.x + 60, box.y + 40);
    await sleep(150);

    // three presses of the left button, two of the right and one of the middle
    await page.mouse.click(box.x + 60, box.y + 40);
    await page.mouse.click(box.x + 60, box.y + 40);
    await page.mouse.click(box.x + 60, box.y + 40);
    await page.mouse.click(box.x + 60, box.y + 40, { button: "right" });
    await page.mouse.click(box.x + 60, box.y + 40, { button: "right" });
    await page.mouse.click(box.x + 60, box.y + 40, { button: "middle" });
    // a double click is two presses of the left button
    await page.mouse.dblclick(box.x + 60, box.y + 40);
    await sleep(200);

    assertEqual(
      await deviceStat(page, "Left button"),
      "4",
      "the three clicks and the double click press the left button four times",
    );
    assertEqual(await deviceStat(page, "Right button"), "2", "the presses of the right button");
    assertEqual(await deviceStat(page, "Middle button"), "1", "the presses of the middle button");
    assertEqual(await deviceStat(page, "Double clicks"), "1", "the double clicks");
    assertEqual(
      await deviceStat(page, "Movement"),
      "80 px",
      "the distance the pointer travelled: 50 px to the right and 30 px down",
    );

    // the wheel moves the pointer over the field
    await page.mouse.wheel(0, 120);
    await sleep(300);
    const scroll = await deviceStat(page, "Scroll");
    const scrolled = Number(/(-?\d+)/.exec(scroll || "")?.[1] ?? NaN);
    assert(
      scrolled >= 120 && scrolled <= 480,
      `the wheel moved 120 px over the field, the panel reports ${JSON.stringify(scroll)}`,
    );

    // the reset clears every counter
    await clickButton(page, "Reset the counters");
    assertEqual(await deviceStat(page, "Left button"), "0", "the reset clears the left button");
    assertEqual(await deviceStat(page, "Movement"), "0 px", "the reset clears the movement");
  });

  toolSpec(
    "double-click-test",
    "measures the interval between two clicks and the rate of the recognised double clicks",
    async (page) => {
      assertEqual(await workspaceHeading(page), "Double Click Test", "the double click panel");
      const target = page.locator("main div.cursor-pointer");
      assertEqual(await target.count(), 1, "the double click test must offer one field");
      const threshold = page.locator("#double-click-threshold");
      await threshold.fill("2000");
      await sleep(200);

      // the first click has no interval, it only counts as an attempt
      await target.click();
      await sleep(200);
      assertEqual(await deviceStat(page, "Attempts"), "1", "the first click is an attempt");
      assertEqual(await deviceStat(page, "Last interval"), "-- ms", "the first click has no interval");

      // a pair that is 700 ms apart is faster than the limit of 2000 ms
      await sleep(700);
      await target.click();
      // a pair that follows at once is faster than the limit as well
      await target.click();
      await sleep(200);

      assertEqual(await deviceStat(page, "Attempts"), "3", "three clicks are three attempts");
      assertEqual(
        await deviceStat(page, "Success rate"),
        "67 %",
        "two of the three clicks are recognised as a double click",
      );
      const last = Number(/(\d+)/.exec(await deviceStat(page, "Last interval"))?.[1] ?? NaN);
      assert(
        last >= 0 && last < 200,
        `the two last clicks follow each other at once, the panel reports ${last} ms`,
      );

      // the same pair is too slow for a limit of 100 ms
      await threshold.fill("100");
      await sleep(200);
      await sleep(700);
      await target.click();
      await sleep(200);

      assertEqual(await deviceStat(page, "Attempts"), "4", "four clicks are four attempts");
      assertEqual(
        await deviceStat(page, "Success rate"),
        "50 %",
        "the pair of 700 ms is not recognised as a double click any more",
      );
      const slow = Number(/(\d+)/.exec(await deviceStat(page, "Last interval"))?.[1] ?? NaN);
      assert(
        slow >= 700 && slow <= 2000,
        `the pair of 700 ms is measured, the panel reports ${slow} ms`,
      );
    },
  );

  toolSpec("dead-pixel-test", "shows the colour fields and magnifies the pixels of the loupe", async (page) => {
    assertEqual(await workspaceHeading(page), "Dead Pixel Test", "the dead pixel panel");
    const field = page.locator('main div[style*="background-color"]');
    assertEqual(await field.count(), 1, "the dead pixel test must show one colour field");
    const canvas = page.locator("main canvas");
    assertEqual(await canvas.count(), 1, "the dead pixel test must show one loupe");

    // the colour buttons set the colour of the field
    await clickButton(page, "Red");
    await sleep(200);
    assertEqual(
      await field.evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(255, 0, 0)",
      "the colour field is red",
    );
    await clickButton(page, "Blue");
    await sleep(200);
    assertEqual(
      await field.evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(0, 0, 255)",
      "the colour field is blue",
    );

    // the loupe draws the colour of the field
    const pixel = await canvas.evaluate((el) => {
      const context = el.getContext("2d");
      const data = context.getImageData(5, 5, 1, 1).data;
      return `${data[0]},${data[1]},${data[2]},${data[3]}`;
    });
    assertEqual(pixel, "0,0,255,255", "the loupe draws the colour of the field");

    // the zoom magnifies the loupe: twice the zoom, twice the size
    const zoom = page.locator("#dead-pixel-zoom");
    await zoom.fill("8");
    await sleep(200);
    const atEight = (await canvas.boundingBox()).width;
    await zoom.fill("16");
    await sleep(200);
    const atSixteen = (await canvas.boundingBox()).width;
    await zoom.fill("4");
    await sleep(200);
    const atFour = (await canvas.boundingBox()).width;
    assertEqual(atSixteen, atEight * 2, "twice the zoom is twice the size of the loupe");
    assertEqual(atFour, atEight / 2, "half the zoom is half the size of the loupe");

    // the loupe marks the cell under the pointer: the field is a grid of 16
    // cells and the pointer is placed in the middle of the third one
    await zoom.fill("8");
    await sleep(200);
    const box = await field.boundingBox();
    const grid = 16;
    const cell = 2;
    await page.mouse.move(
      box.x + box.width * ((cell + 0.5) / grid),
      box.y + box.height * ((cell + 0.5) / grid),
    );
    await sleep(300);
    const marker = await canvas.evaluate((el) => {
      const context = el.getContext("2d");
      const { data } = context.getImageData(0, 0, el.width, el.height);
      let count = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let y = 0; y < el.height; y += 1) {
        for (let x = 0; x < el.width; x += 1) {
          const at = (y * el.width + x) * 4;
          // the marker of the loupe is the orange #f97316
          if (
            Math.abs(data[at] - 249) < 12 &&
            Math.abs(data[at + 1] - 115) < 12 &&
            Math.abs(data[at + 2] - 22) < 12
          ) {
            count += 1;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      return { count, minX, maxX, minY, maxY };
    });
    assert(marker.count > 0, "the loupe must mark the cell under the pointer");
    const size = (await canvas.evaluate((el) => el.width)) / grid;
    assert(
      marker.minX >= cell * size - 2 && marker.maxX <= (cell + 1) * size + 1,
      `the marker is in the cell under the pointer, it is at ${marker.minX} to ${marker.maxX}`,
    );
    assert(
      marker.minY >= cell * size - 2 && marker.maxY <= (cell + 1) * size + 1,
      `the marker is in the cell under the pointer, it is at ${marker.minY} to ${marker.maxY}`,
    );
  });

  toolSpec("gamepad-tester", "reads the axes and the buttons of the connected controller", async (page) => {
    assertEqual(await workspaceHeading(page), "Gamepad Tester", "the gamepad panel");
    const axes = [0.5, -0.25, 0.125, 1];
    const buttons = 17;
    await installFakeGamepad(page, {
      index: 0,
      id: "Virtual Test Pad",
      mapping: "standard",
      axes,
      buttons,
    });

    await clickButton(page, "Start the test");
    await sleep(600);

    const text = await workspaceRegion(page);
    assertIncludes(text, "Virtual Test Pad", "the panel must name the controller it reads");
    assertIncludes(text, "standard", "the panel must name the mapping of the controller");
    const axisValues = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main ul li")).map((li) => {
        const spans = li.querySelectorAll("span");
        return spans.length > 1 ? (spans[1].textContent || "").trim() : "";
      }),
    );
    const shownAxes = axisValues.filter((value) => /^-?\d+\.\d{3}$/.test(value));
    assertEqual(
      shownAxes.join(","),
      axes.map((value) => value.toFixed(3)).join(","),
      "the panel reports the axes of the controller",
    );

    const buttonNames = await page.locator("main ul.grid li").count();
    assertEqual(buttonNames, buttons, "the panel lists every button of the controller");

    // the last button that was pressed is reported
    await setFakeGamepad(page, { pressed: [0] });
    await sleep(400);
    assertEqual(
      await deviceStat(page, "The last button"),
      "A / Cross",
      "the first button of the standard mapping is the cross",
    );
  });

  toolSpec("headphone-test", "plays a test tone in one ear and in both ears", async (page) => {
    assertEqual(await workspaceHeading(page), "Headphone Test", "the headphone panel");
    await installAudioRecorder(page);

    await clickButton(page, "Left channel");
    await sleep(300);
    let log = await audioLog(page);
    assertEqual(log.oscillators.length, 1, "the left channel plays one tone");
    assertEqual(log.oscillators[0].type, "sine", "the test tone is a sine");
    assertEqual(log.oscillators[0].frequency, 1000, "the test tone is a tone of 1000 Hz");
    assertEqual(log.pans.length, 1, "the tone is played on one channel");
    assertEqual(log.pans[0], -1, "the left channel is panned to the left");

    await clickButton(page, "Right channel");
    await sleep(300);
    log = await audioLog(page);
    assertEqual(log.oscillators.length, 2, "the right channel plays a second tone");
    assertEqual(log.pans.length, 2, "the second tone is played on one channel");
    assertEqual(log.pans[1], 1, "the right channel is panned to the right");

    await clickButton(page, "Both channels");
    await sleep(300);
    log = await audioLog(page);
    assertEqual(log.oscillators.length, 3, "both channels play a third tone");
    assertEqual(log.pans[2], 0, "both channels are played in the centre");

    // the sweep runs from 20 Hz to 20 kHz
    await clickButton(page, "Sine sweep 20 Hz - 20 kHz");
    await sleep(300);
    log = await audioLog(page);
    const sweep = log.oscillators[log.oscillators.length - 1];
    const sweepCalls = sweep.freqCalls.map(([kind, value]) => `${kind}:${value}`);
    assert(
      sweepCalls.includes("set:20") && sweepCalls.includes("ramp:20000"),
      `the sweep runs from 20 Hz to 20000 Hz, the panel sets ${sweepCalls.join(", ")}`,
    );
  });

  toolSpec("math-keyboard", "writes the mathematical symbols into the field at the cursor", async (page) => {
    assertEqual(await workspaceHeading(page), "Math Keyboard", "the math keyboard panel");
    const field = page.locator("#math-keyboard-target");
    assertEqual(await field.count(), 1, "the math keyboard must offer one field");

    await field.fill("ab");
    await field.press("ArrowLeft");
    await clickButton(page, "√");
    await sleep(200);
    assertEqual(
      await field.inputValue(),
      "a√b",
      "the symbol is written at the place of the cursor and not at the end",
    );

    await clickButton(page, "Clear");
    await sleep(200);
    assertEqual(await field.inputValue(), "", "the clear button empties the field");
  });

  toolSpec("refresh-rate-test", "measures the refresh rate of the display in frames per second", async (page) => {
    assertEqual(
      await workspaceHeading(page),
      "Display Refresh Rate Test",
      "the refresh rate panel",
    );
    // the spec counts the frames of the display on its own
    const own = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = (stamp) => {
            frames += 1;
            if (stamp - start < 2000) {
              requestAnimationFrame(tick);
            } else {
              resolve({ frames, ms: stamp - start });
            }
          };
          requestAnimationFrame(tick);
        }),
    );
    const ownHz = (own.frames / own.ms) * 1000;

    const reported = await waitForDeviceStat(page, "Estimated refresh rate");
    const hz = Number(String(reported).replace(" Hz", ""));
    assert(hz > 0, `the panel must report a refresh rate, it reports ${JSON.stringify(reported)}`);
    assert(
      Math.abs(hz - ownHz) <= Math.max(4, ownHz * 0.15),
      `the panel reports ${hz} Hz, the spec counted ${ownHz.toFixed(2)} Hz on its own`,
    );

    // the measurement is consistent with the frames it has counted
    const frames = Number(await deviceStat(page, "The measured frames"));
    assert(frames > 0, "the panel must count the frames of the display");
    const seconds = Number(
      /([\d.]+)/.exec(await deviceStatHint(page, "The measured frames"))?.[1] ?? NaN,
    );
    assert(
      Math.abs(seconds - frames / hz) <= 0.5,
      `${frames} frames at ${hz} Hz are ${(frames / hz).toFixed(2)} s, the panel reports ${seconds} s`,
    );
  });

  toolSpec("sound-test", "plays the test frequencies and measures the level of the output", async (page) => {
    assertEqual(await workspaceHeading(page), "Sound Test", "the sound panel");
    await installAudioRecorder(page);

    // the button of 4 kHz plays a tone of 4000 Hz
    await clickButton(page, "4 kHz");
    await sleep(400);
    const log = await audioLog(page);
    assertEqual(log.oscillators.length, 1, "the panel plays one tone");
    assertEqual(log.oscillators[0].frequency, 4000, "the tone of the 4 kHz button is 4000 Hz");

    // the level meter reads the output of the tone
    const level = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const started = Date.now();
          const read = () => {
            const text = document.querySelector("main p.font-mono.text-xs");
            const value = Number(((text && text.textContent) || "0").replace("%", ""));
            if (value > 0 || Date.now() - started > 2500) {
              resolve(value);
              return;
            }
            setTimeout(read, 100);
          };
          read();
        }),
    );
    assert(
      level > 0 && level <= 100,
      `the level meter must read the tone that is playing, it reads ${level} %`,
    );

    // the left speaker plays the tone on the left and the right speaker on the right
    await clickButton(page, "Left speaker");
    await sleep(300);
    const left = await audioLog(page);
    assertEqual(left.pans.length, 2, "the left speaker plays the tone on one channel");
    assertEqual(left.pans[1], -1, "the left speaker is panned to the left");
    await clickButton(page, "Right speaker");
    await sleep(300);
    const right = await audioLog(page);
    assertEqual(right.pans.length, 3, "the right speaker plays a third tone");
    assertEqual(right.pans[2], 1, "the right speaker is panned to the right");
  });

  toolSpec("stick-drift-test", "measures the drift of the analog stick around its neutral position", async (page) => {
    assertEqual(await workspaceHeading(page), "Stick Drift Test", "the stick drift panel");
    await installFakeGamepad(page, {
      index: 0,
      id: "Virtual Test Pad",
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: 17,
    });

    await clickButton(page, "Start the test");
    await sleep(400);
    assertEqual(
      await deviceStat(page, "Left stick X"),
      "0.000",
      "the panel reads the axis of the controller",
    );

    // the neutral position is measured with the stick at 0.1
    await setFakeGamepad(page, { axes: [0.1, 0, 0, 0] });
    await sleep(400);
    assertEqual(
      await deviceStat(page, "Left stick X"),
      "0.100",
      "the panel reads the axis of the controller",
    );
    await clickButton(page, "Measure the neutral position");
    await sleep(300);

    // the stick drifts to 0.22, so the drift is 0.12
    await setFakeGamepad(page, { axes: [0.22, 0, 0, 0] });
    await sleep(400);
    assertEqual(await deviceStat(page, "Left stick X"), "0.220", "the panel reads the axis");
    assertEqual(
      await deviceStatHint(page, "Left stick X"),
      "Drift 0.120",
      "the drift is the distance to the neutral position",
    );
    assertEqual(
      await deviceStat(page, "The largest drift"),
      "12.0 %",
      "the largest drift is 12 percent",
    );

    // a drift of 12 percent is beyond the limit of 5 percent
    const verdict = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("main p")).map((p) =>
        (p.textContent || "").trim(),
      );
      return (
        texts.find((text) => /beyond the limit/.test(text)) ||
        texts.find((text) => /inside the limit/.test(text)) ||
        ""
      );
    });
    assertEqual(
      verdict,
      "The stick drifts beyond the limit. It should be replaced.",
      "a drift of 12 percent is beyond the limit of 5 percent",
    );

    // with a limit of 20 percent the same drift is inside the limit
    await page.locator("#stick-drift-threshold").fill("20");
    await sleep(300);
    const healthy = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("main p")).map((p) =>
        (p.textContent || "").trim(),
      );
      return (
        texts.find((text) => /beyond the limit/.test(text)) ||
        texts.find((text) => /inside the limit/.test(text)) ||
        ""
      );
    });
    assertEqual(
      healthy,
      "The drift stays inside the limit.",
      "a drift of 12 percent is inside the limit of 20 percent",
    );
  });

  toolSpec("tone-generator", "generates a tone with the chosen frequency, waveform and duration", async (page) => {
    assertEqual(await workspaceHeading(page), "Tone Generator", "the tone generator panel");
    await installAudioRecorder(page);

    await page.locator("#tone-frequency").fill("880");
    await page.locator("#tone-waveform").selectOption("square");
    await page.locator("#tone-duration").fill("2");
    await page.locator("#tone-volume").fill("30");
    await sleep(300);
    await clickPlayTone(page);
    await sleep(400);

    const log = await audioLog(page);
    assertEqual(log.oscillators.length, 1, "the panel plays one tone");
    assertEqual(log.oscillators[0].type, "square", "the tone has the chosen waveform");
    assertEqual(log.oscillators[0].frequency, 880, "the tone has the chosen frequency");
    const duration = log.oscillators[0].stop - log.oscillators[0].start;
    assert(
      duration >= 2 && duration <= 2.3,
      `the tone lasts the two seconds that were chosen, it lasts ${duration} s`,
    );

    // the volume control scales the tone
    const peak = log.gains[0].calls
      .map(([, value]) => value)
      .filter((value) => value > 0.001)
      .sort((a, b) => b - a)[0];
    assert(peak > 0 && peak <= 1, `the tone is played with a peak of ${peak}`);

    await page.locator("#tone-volume").fill("60");
    await sleep(200);
    await clickPlayTone(page);
    await sleep(300);
    const louder = await audioLog(page);
    const louderPeak = louder.gains[1].calls
      .map(([, value]) => value)
      .filter((value) => value > 0.001)
      .sort((a, b) => b - a)[0];
    assertEqual(
      louderPeak,
      peak * 2,
      "twice the volume plays the tone twice as loud",
    );

    // the frequency is kept inside the range that a tone can have
    await page.locator("#tone-frequency").fill("5");
    await sleep(200);
    await clickPlayTone(page);
    await sleep(300);
    const low = await audioLog(page);
    assertEqual(
      low.oscillators[low.oscillators.length - 1].frequency,
      20,
      "a frequency below 20 Hz is raised to 20 Hz",
    );

    await page.locator("#tone-frequency").fill("30000");
    await sleep(200);
    await clickPlayTone(page);
    await sleep(300);
    const high = await audioLog(page);
    assertEqual(
      high.oscillators[high.oscillators.length - 1].frequency,
      20000,
      "a frequency above 20000 Hz is lowered to 20000 Hz",
    );
  });
}
