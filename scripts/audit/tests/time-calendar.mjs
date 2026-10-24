/**
 * Functional specs for the 22 tools of the time-calendar engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real field,
 * presses the real button and reads the real rendered result. The expected
 * values are computed from the calendar itself: 1700000000 s is
 * 2023-11-14T22:13:20Z, the 1st of January 2026 is a Thursday, 2026 is not a
 * leap year, and a date-only ISO string is read as UTC midnight.
 *
 * Where a tool cannot do what its name promises - the shared workspace only
 * offers a timestamp converter, a date difference and a pomodoro timer - the
 * spec asserts the promised behaviour anyway, so the defect shows up in the
 * audit evidence instead of being hidden.
 */

import assert from "node:assert";

import {
  spec,
  fillArea,
  fillInput,
  valueById,
  clickButton,
  workspaceText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The text of the engine panel only. */
async function panel(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/** The day grid of one month of the calendar. */
async function monthGrid(page, label) {
  return page.evaluate((wanted) => {
    const section = document.querySelector(`main section[aria-label="${wanted}"]`);
    if (!section) return null;
    const cells = Array.from(section.querySelectorAll('[role="cell"]'));
    const days = cells
      .map((c) => (c.textContent || "").trim())
      .filter((t) => /^\d+$/.test(t));
    const first = cells.find((c) => (c.textContent || "").trim() === "1");
    const headers = Array.from(section.querySelectorAll('[role="columnheader"]')).map((h) =>
      (h.textContent || "").trim(),
    );
    return {
      count: days.length,
      headers,
      // the column of the first day, counted among the day cells only: the
      // row can carry an extra column for the ISO week number
      weekdayOfFirst: first
        ? headers[
            Array.from(first.parentElement.children).filter(
              (el) => el.getAttribute("role") === "cell",
            ).indexOf(first)
          ]
        : null,
    };
  }, label);
}

/* ------------------------------------------------------- the panel readers -- */

/** Fill a control of the panel by its id. */
async function fillById(page, id, value) {
  await page.locator(`#${id}`).fill(String(value));
  await sleep(350);
}

/** Every paragraph of the engine panel, in the order they are rendered. */
async function panelParagraphs(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("p")).map((p) =>
      (p.textContent || "").replace(/\s+/g, " ").trim(),
    );
  });
}

/** Every preformatted block of the engine panel, in the order they appear. */
async function panelBlocks(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("pre")).map((pre) => pre.textContent || "");
  });
}

/** The rows of every list of the engine panel. */
async function panelLists(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("ul")).map((list) =>
      Array.from(list.querySelectorAll(":scope > li")).map((li) =>
        (li.textContent || "").replace(/\s+/g, " ").trim(),
      ),
    );
  });
}

/**
 * The rows of the breakdown of a cron expression.
 *
 * Every row carries the name of the field, the value of the field and the
 * number of values the field stands for.
 */
async function cronBreakdownRows(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const list = root.querySelector("ul");
    if (!list) return [];
    return Array.from(list.querySelectorAll(":scope > li")).map((li) => {
      const spans = Array.from(li.querySelectorAll(":scope > span"));
      const text = (node) => (node ? (node.textContent || "").trim() : "");
      return { label: text(spans[0]), value: text(spans[1]), count: text(spans[2]) };
    });
  });
}

/** The local time of the browser. */async function browserNow(page) {
  return page.evaluate(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      millisecond: now.getMilliseconds(),
    };
  });
}

/* ------------------------------------------------------------- the cron --- */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * The values of one cron field, expanded by the spec itself.
 *
 * The cron syntax is a standard: "*" is every value of the range, "a-b" is a
 * range, "a,b" is a list and "a/n" is a step. The spec expands the fields on
 * its own, so the numbers it compares with the panel are not read back from
 * the panel.
 */
function expandCronField(field, min, max) {
  const values = new Set();
  field.split(",").forEach((part) => {
    const [range, stepText] = part.split("/");
    const step = stepText ? parseInt(stepText, 10) : 1;
    let start;
    let end;
    if (range === "*") {
      start = min;
      end = max;
    } else if (range.includes("-")) {
      const bounds = range.split("-").map((value) => parseInt(value, 10));
      start = bounds[0];
      end = bounds[1];
    } else {
      start = parseInt(range, 10);
      end = start;
    }
    for (let value = start; value <= end; value += step) values.add(value);
  });
  return Array.from(values).sort((a, b) => a - b);
}

/**
 * The next moments that match a cron expression, found by the spec itself.
 *
 * The search walks the minutes of the calendar and applies the cron rules:
 * the minute, the hour and the month have to match, and the day of the month
 * and the day of the week are combined the way cron combines them - a day
 * matches when one of the two restricted fields matches.
 */
function nextCronRuns(expression, count, from) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/);
  const minutes = expandCronField(minute, 0, 59);
  const hours = expandCronField(hour, 0, 23);
  const days = expandCronField(dayOfMonth, 1, 31);
  const months = expandCronField(month, 1, 12);
  const weekdays = Array.from(
    new Set(expandCronField(dayOfWeek, 0, 7).map((day) => (day === 7 ? 0 : day))),
  ).sort((a, b) => a - b);
  const dayRestricted = dayOfMonth.trim() !== "*";
  const weekdayRestricted = dayOfWeek.trim() !== "*";

  const runs = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = 60 * 24 * 366;
  for (let step = 0; step < limit && runs.length < count; step += 1) {
    const moment = new Date(cursor.getTime());
    moment.setMinutes(moment.getMinutes() + step);
    if (!minutes.includes(moment.getMinutes())) continue;
    if (!hours.includes(moment.getHours())) continue;
    if (!months.includes(moment.getMonth() + 1)) continue;
    const dayMatches = days.includes(moment.getDate());
    const weekdayMatches = weekdays.includes(moment.getDay());
    if (dayRestricted && weekdayRestricted) {
      if (!dayMatches && !weekdayMatches) continue;
    } else if (dayRestricted) {
      if (!dayMatches) continue;
    } else if (weekdayRestricted) {
      if (!weekdayMatches) continue;
    }
    runs.push(new Date(moment.getTime()));
  }
  return runs;
}

/** A moment as the panel writes it, for example "Mar 2, 2026, 02:30 AM". */
function parseRun(text) {
  const match = /^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(
    text.trim(),
  );
  if (!match) return null;
  let hour = Number(match[4]);
  const meridiem = (match[6] || "").toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return {
    year: Number(match[3]),
    month: MONTHS.indexOf(match[1]),
    day: Number(match[2]),
    hour,
    minute: Number(match[5]),
  };
}

/** The same moment, read from the local time of the machine. */
function runParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/** Assert that a moment of the panel is the expected one. */
function assertRun(actual, expected, message) {
  assertEqual(
    JSON.stringify(actual),
    JSON.stringify(expected),
    `${message}\n  the panel shows ${JSON.stringify(actual)}, the spec expects ${JSON.stringify(
      expected,
    )}`,
  );
}

/* ------------------------------------------------------------- the zones -- */

/** The minutes of the day of a clock reading, for example "09:30" -> 570. */
function clockMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** A clock reading of the minutes of the day, for example 570 -> "09:30". */
function minutesClock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(
    2,
    "0",
  )}`;
}

/**
 * The clocks of the two zones, read in one go so that they belong to the same
 * moment.
 */
async function zoneClocks(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return Array.from(root.querySelectorAll("p"))
      .map((p) => (p.textContent || "").trim())
      .filter((text) => /^\d{2}:\d{2}:\d{2}$/.test(text));
  });
}

/**
 * Convert a time from one zone into another and compare the result with the
 * moment the spec computes on its own.
 *
 * The zones are chosen so that their offset does not depend on the date:
 * Asia/Kolkata is always UTC+05:30, Asia/Tokyo is always UTC+09:00 and
 * Asia/Shanghai is always UTC+08:00. The expected result is therefore plain
 * arithmetic and not a guess about the daylight saving rules.
 */
async function assertZoneConversion(page, { liveClocks }) {
  const OFFSETS = { "Asia/Kolkata": 330, "Asia/Tokyo": 540, "Asia/Shanghai": 480 };
  const source = "Asia/Kolkata";
  const wall = clockMinutes("12:00");

  await page.locator("#from-zone").selectOption(source);
  await page.locator("#to-zone").selectOption("Asia/Tokyo");
  await page.locator("#zone-date").fill("2026-03-02");
  await page.locator("#zone-time").fill("12:00");
  await sleep(500);

  const paragraphs = await panelParagraphs(page);
  const converted = paragraphs.find((text) =>
    /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}$/.test(text),
  );
  assert(converted, `the panel must show the converted time, it shows ${JSON.stringify(paragraphs)}`);

  // 12:00 in Kolkata is 15:30 in Tokyo, because Tokyo is 3 h 30 min ahead
  const difference = OFFSETS["Asia/Tokyo"] - OFFSETS[source];
  const expectedMinutes = wall + difference;
  assertRun(
    parseRun(converted),
    {
      year: 2026,
      month: 2,
      day: 2,
      hour: Math.floor(expectedMinutes / 60) % 24,
      minute: expectedMinutes % 60,
    },
    "12:00 in Asia/Kolkata is 15:30 in Asia/Tokyo",
  );

  const differenceLine = paragraphs.find((text) => /difference of the two zones/i.test(text));
  assert(differenceLine, "the panel must show the difference of the two zones");
  const shownDifference = /is ([+-][^.]+)\./.exec(differenceLine);
  assert(shownDifference, `the panel must name the difference of the two zones`);
  assertEqual(
    shownDifference[1].trim(),
    "+3 h 30 min",
    "Asia/Tokyo is 3 h 30 min ahead of Asia/Kolkata",
  );

  if (liveClocks) {
    const clocks = await zoneClocks(page);
    assertEqual(clocks.length, 2, "the panel must show the clock of both zones");
    const seconds = clocks.map((clock) => {
      const [hours, minutes, rest] = clock.split(":").map(Number);
      return hours * 3600 + minutes * 60 + rest;
    });
    const ahead = (seconds[1] - seconds[0] + 86400) % 86400;
    assertEqual(
      ahead,
      difference * 60,
      "the clock of Asia/Tokyo runs 3 h 30 min ahead of the clock of Asia/Kolkata",
    );
  }

  // the target zone is really used: Asia/Shanghai is 2 h 30 min ahead
  await page.locator("#to-zone").selectOption("Asia/Shanghai");
  await sleep(500);
  const after = await panelParagraphs(page);
  const convertedAfter = after.find((text) =>
    /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}$/.test(text),
  );
  const shanghaiDifference = OFFSETS["Asia/Shanghai"] - OFFSETS[source];
  const shanghaiMinutes = wall + shanghaiDifference;
  assertRun(
    parseRun(convertedAfter),
    {
      year: 2026,
      month: 2,
      day: 2,
      hour: Math.floor(shanghaiMinutes / 60) % 24,
      minute: shanghaiMinutes % 60,
    },
    "12:00 in Asia/Kolkata is 14:30 in Asia/Shanghai",
  );
  const differenceAfter = after.find((text) => /difference of the two zones/i.test(text));
  const shownAfter = /is ([+-][^.]+)\./.exec(differenceAfter || "");
  assertEqual(
    shownAfter ? shownAfter[1].trim() : "",
    "+2 h 30 min",
    "Asia/Shanghai is 2 h 30 min ahead of Asia/Kolkata",
  );
}

/* ---------------------------------------------------------- the tools ----- */

/**
 * The headers, the reply chain and the body of a raw email, as the panel
 * reads them.
 */
async function emailAnalysis(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const text = (node) => (node ? (node.textContent || "").trim() : "");
    const lists = Array.from(root.querySelectorAll("ul"));
    const headers = Array.from(lists[0]?.querySelectorAll(":scope > li") || []).map((li) => {
      const spans = Array.from(li.querySelectorAll(":scope > span"));
      return { label: text(spans[0]), value: text(spans[1]) };
    });
    const chain = Array.from(lists[1]?.querySelectorAll(":scope > li") || []).map((li) => {
      const line = text(li);
      const at = line.indexOf(": ");
      return at >= 0 ? line.slice(at + 2).trim() : line;
    });
    const blocks = Array.from(root.querySelectorAll("pre")).map((pre) => pre.textContent || "");
    const paragraphs = Array.from(root.querySelectorAll("p")).map((p) =>
      (p.textContent || "").replace(/\s+/g, " ").trim(),
    );
    const countLine = paragraphs.find((line) => /headers found/.test(line)) || "";
    const hopLine = paragraphs.find((line) => /hops in the chain/.test(line)) || "";
    const count = /(\d+)/.exec(countLine);
    const hops = /(\d+)/.exec(hopLine);
    return {
      headers,
      chain,
      body: blocks.length ? blocks[blocks.length - 1].trim() : "",
      received: blocks.length > 1 ? blocks[0].trim() : "",
      headerCount: count ? Number(count[1]) : -1,
      hops: hops ? Number(hops[1]) : -1,
    };
  });
}

/**
 * The MathML of the panel, decoded by the spec.
 *
 * The decoder reads the MathML tree of the browser and writes it as a plain
 * formula, so the value the spec compares with is not read from the panel but
 * rebuilt from the tree.
 */
async function decodeMathML(page, selector) {
  return page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node) return null;
    const decode = (element) => {
      const kids = Array.from(element.children);
      switch (element.tagName) {
        case "mi":
        case "mn":
        case "mtext":
        case "mo":
          return element.textContent || "";
        case "msup":
          return `${decode(kids[0])}^${decode(kids[1])}`;
        case "msub":
          return `${decode(kids[0])}_${decode(kids[1])}`;
        case "msubsup":
          return `${decode(kids[0])}_${decode(kids[1])}^${decode(kids[2])}`;
        case "mfrac":
          return `(${decode(kids[0])})/(${decode(kids[1])})`;
        case "msqrt":
          return `√(${decode(kids[0])})`;
        case "mroot":
          return `${decode(kids[0])}√${decode(kids[1])}`;
        default:
          return kids.map(decode).join("");
      }
    };
    if (node.tagName.toLowerCase() === "math") return decode(node);
    const math = node.querySelector("math");
    if (math) return decode(math);
    // the MathML source is a text, so it is parsed before it is decoded
    const parsed = new DOMParser().parseFromString(node.textContent || "", "application/xml");
    if (!parsed || parsed.getElementsByTagName("parsererror").length) return null;
    return decode(parsed.documentElement);
  }, selector);
}

/** The slot the panel proposes, or an empty string when it proposes none. */
async function meetingProposal(page) {
  const paragraphs = await panelParagraphs(page);
  const proposal = paragraphs.find((text) => /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(text));
  return proposal || "";
}

/** The plan of the meeting: the point of the agenda and its time. */
async function meetingPlan(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const list = root.querySelector("ul");
    if (!list) return [];
    return Array.from(list.querySelectorAll(":scope > li")).map((li) => {
      const spans = Array.from(li.querySelectorAll(":scope > span"));
      const text = (node) => (node ? (node.textContent || "").trim() : "");
      return { item: text(spans[0]), time: text(spans[1]) };
    });
  });
}

/** The free slots of a working day, computed by the spec. */
function freeSlots(dayStart, dayEnd, busy) {
  const slots = [];
  let cursor = clockMinutes(dayStart);
  const end = clockMinutes(dayEnd);
  busy
    .map(([start, stop]) => [clockMinutes(start), clockMinutes(stop)])
    .sort((a, b) => a[0] - b[0])
    .forEach(([start, stop]) => {
      if (start > cursor) slots.push([cursor, Math.min(start, end)]);
      cursor = Math.max(cursor, stop);
    });
  if (cursor < end) slots.push([cursor, end]);
  return slots
    .filter(([start, stop]) => stop > start)
    .map(([start, stop]) => `${minutesClock(start)} - ${minutesClock(stop)}`);
}

/** The number of rounds and of matches of the schedule. */
async function roundRobinSummary(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const line =
      Array.from(root.querySelectorAll("p, span"))
        .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
        .find((text) => /rounds with/.test(text)) || "";
    const match = /(\d+) rounds with (\d+) matches/.exec(line);
    return match ? { rounds: Number(match[1]), matches: Number(match[2]) } : { rounds: -1, matches: -1 };
  });
}

/** The rounds of the schedule with the pairs of every round. */
async function roundRobinSchedule(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const text = (node) => (node ? (node.textContent || "").trim() : "");
    return Array.from(root.querySelectorAll("section")).map((section) => ({
      pairs: Array.from(section.querySelectorAll("ul > li")).map((li) => {
        const spans = Array.from(li.querySelectorAll("span"));
        return { home: text(spans[0]), away: text(spans[2]) };
      }),
    }));
  });
}

/* --------------------------------------------------------------- numbers -- */

/* 1700000000 s after the epoch is 2023-11-14T22:13:20Z. */
const EPOCH = "1700000000";
const EPOCH_ISO = "2023-11-14T22:13:20.000Z";
const EPOCH_UTC = "Tue, 14 Nov 2023 22:13:20 GMT";

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("2026-calendar", "shows the calendar of the year 2026", async (page) => {
    const january = await monthGrid(page, "January 2026");
    assert(january, "the calendar must show the month of January 2026");
    assertEqual(january.count, 31, "January has 31 days");
    assertEqual(january.weekdayOfFirst, "Th", "the 1st of January 2026 is a Thursday");

    const february = await monthGrid(page, "February 2026");
    assert(february, "the calendar must show the month of February 2026");
    assertEqual(february.count, 28, "2026 is not a leap year, February has 28 days");

    const december = await monthGrid(page, "December 2026");
    assert(december, "the calendar must show the month of December 2026");
    assertEqual(december.count, 31, "December has 31 days");
  });

  spec("2027-calendar", "shows the calendar of the year 2027", async (page) => {
    assertEqual(
      await valueById(page, "calendar-year"),
      "2027",
      "the calendar must be set to the year 2027",
    );
    const january = await monthGrid(page, "January 2027");
    assert(january, "the calendar must show the month of January 2027");
    // the 1st of January 2027 is a Friday
    assertEqual(january.weekdayOfFirst, "Fr", "the 1st of January 2027 is a Friday");
  });

  spec("printable-calendar", "offers a printable calendar as PDF", async (page) => {
    const january = await monthGrid(page, "January 2026");
    assert(january, "the workspace must show the calendar");
    assertEqual(january.count, 31, "January has 31 days");

    const pending = page.waitForEvent("download", { timeout: 20000 });
    await clickButton(page, "Download PDF");
    const download = await pending;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    assert(
      download.suggestedFilename().endsWith(".pdf"),
      `the download must be a PDF, got ${download.suggestedFilename()}`,
    );
    assertEqual(
      bytes.subarray(0, 5).toString("latin1"),
      "%PDF-",
      "the downloaded file must start with the PDF signature",
    );
  });

  spec("2027-holidays", "shows the public holidays of 2027", async (page) => {
    const text = await panel(page);
    assert(
      /holiday/i.test(text),
      `a holiday calendar must show the holidays, the workspace shows: ${text.slice(0, 200)}`,
    );
    assert(
      text.includes("2027"),
      "the holiday calendar must be set to the year 2027",
    );
  });

  spec("countdown-to-date", "counts the days between two dates", async (page) => {
    const dates = page.locator('main input[type="date"]');
    await dates.nth(0).fill("2026-03-01");
    await dates.nth(1).fill("2026-03-31");
    await sleep(500);
    const text = await panel(page);
    assertIncludes(text, "30", "the 1st to the 31st of March 2026 are 30 days apart");
    assertIncludes(text, "Days", "the workspace must report the number of days");
  });

  spec("epoch-converter", "converts a unix timestamp into a date", async (page) => {
    await fillInput(page, EPOCH, 0, "text");
    await sleep(500);
    const text = await panel(page);
    assertIncludes(text, EPOCH_UTC, "the UTC date of 1700000000 is Tue, 14 Nov 2023 22:13:20 GMT");
    assertIncludes(text, EPOCH_ISO, "the ISO date of 1700000000 is 2023-11-14T22:13:20.000Z");
  });

  spec("unix-timestamp-converter", "converts a timestamp given in milliseconds", async (page) => {
    await fillInput(page, "1700000000000", 0, "text");
    await sleep(500);
    const text = await panel(page);
    assertIncludes(
      text,
      EPOCH_ISO,
      "1700000000000 ms is the same moment as 1700000000 s",
    );
  });

  spec("timestamp-converter-generator", "shows the world clocks next to the timestamp", async (page) => {
    await fillInput(page, EPOCH, 0, "text");
    await sleep(500);
    const text = await panel(page);
    assertIncludes(text, EPOCH_ISO, "the ISO date of 1700000000 is 2023-11-14T22:13:20.000Z");
    assertIncludes(text, "UTC / GMT", "the workspace must show the UTC clock");
    assertIncludes(text, "New York", "the workspace must show the New York clock");
    assertIncludes(text, "London", "the workspace must show the London clock");
    assertIncludes(text, "Tokyo", "the workspace must show the Tokyo clock");
  });

  spec("world-time-converter", "converts a time from one zone into another", async (page) => {
    await assertZoneConversion(page, { liveClocks: true });
  });

  spec("time-zone-converter", "converts a time from one zone into another", async (page) => {
    await assertZoneConversion(page, { liveClocks: false });
  });

  spec("pomodoro-timer", "runs a pomodoro timer", async (page) => {
    const text = await panel(page);
    assertIncludes(text, "25:00", "the timer must start at 25 minutes");
    await clickButton(page, "Start Focus");
    await sleep(2200);
    const running = await panel(page);
    const shown = /(\d{2}):(\d{2})/.exec(running);
    assert(shown, `the timer must show a time, the panel shows: ${running.slice(0, 120)}`);
    const seconds = Number(shown[1]) * 60 + Number(shown[2]);
    assert(
      seconds < 25 * 60 && seconds > 25 * 60 - 10,
      `the timer must count down, it shows ${shown[0]}`,
    );
    await clickButton(page, "Pause");
  });

  spec("focus-timer", "runs a focus timer", async (page) => {
    const text = await panel(page);
    assertIncludes(text, "25:00", "the focus timer must start at 25 minutes");
    assertIncludes(text, "Short Break (5m)", "the focus timer must offer a short break");
    await clickButton(page, "Short Break (5m)");
    await sleep(400);
    assertIncludes(await panel(page), "05:00", "the short break must last 5 minutes");
  });

  spec("study-timer", "runs a study timer", async (page) => {
    const text = await panel(page);
    assertIncludes(text, "25:00", "the study timer must start at 25 minutes");
    assertIncludes(text, "Long Break (15m)", "the study timer must offer a long break");
    await clickButton(page, "Long Break (15m)");
    await sleep(400);
    assertIncludes(await panel(page), "15:00", "the long break must last 15 minutes");
  });

  spec("cron-expression-generator", "builds a cron expression and shows when it runs", async (page) => {
    const now = await browserNow(page);
    // a daily schedule six hours ahead of the clock of the browser, so the
    // expected moments do not depend on the minute the spec runs in
    const hour = (now.hour + 6) % 24;
    const minute = now.minute;
    await fillById(page, "cron-minute", minute);
    await fillById(page, "cron-hour", hour);
    await fillById(page, "cron-day-of-month", "*");
    await fillById(page, "cron-month", "*");
    await fillById(page, "cron-day-of-week", "*");
    await sleep(400);

    // the expression is the five fields of the cron syntax in their order
    const paragraphs = await panelParagraphs(page);
    const expression = paragraphs.find((text) => /^\S+ \S+ \S+ \S+ \S+$/.test(text));
    assertEqual(
      expression,
      `${minute} ${hour} * * *`,
      "the expression is the minute, the hour, the day of the month, the month and the day of the week",
    );

    // the spec finds the next runs of the schedule on its own
    const from = new Date(now.year, now.month, now.day, now.hour, now.minute, now.second);
    const expected = nextCronRuns(`${minute} ${hour} * * *`, 5, from);
    assertEqual(expected.length, 5, "the spec must find five runs of the schedule");
    const lists = await panelLists(page);
    const runs = lists[lists.length - 1];
    assertEqual(runs.length, 5, "the panel must list five runs");
    runs.forEach((run, index) => {
      assertRun(parseRun(run), runParts(expected[index]), `the run ${index + 1} of the schedule`);
    });

    // a field that is out of range is refused and no run is listed any more
    await fillById(page, "cron-minute", "99");
    await sleep(400);
    const refused = await panelLists(page);
    assertEqual(refused.length, 0, "an invalid expression must not list a run");
  });

  spec("cron-expression-parser", "parses a cron expression field by field and shows when it runs", async (page) => {
    const expression = "0,30 9-17 1,15 * 1-5";
    await fillById(page, "cron-expression", expression);
    await sleep(500);

    // the spec expands the fields of the expression on its own
    const rows = await cronBreakdownRows(page);
    assertEqual(rows.length, 5, "the breakdown has a row for every field");
    const fields = [
      ["minute", "0,30", 0, 59],
      ["hour", "9-17", 0, 23],
      ["day of the month", "1,15", 1, 31],
      ["month", "*", 1, 12],
      ["day of the week", "1-5", 0, 7],
    ];
    fields.forEach(([name, value, min, max], index) => {
      const row = rows[index];
      assertEqual(row.value, value, `the field of the ${name} holds ${value}`);
      const expected = expandCronField(value, min, max).length;
      const shown = /(\d+)/.exec(row.count);
      assertEqual(
        shown ? Number(shown[1]) : -1,
        expected,
        `the field of the ${name} matches ${expected} values`,
      );
    });

    // the spec finds the next runs of the expression on its own
    const now = await browserNow(page);
    const from = new Date(now.year, now.month, now.day, now.hour, now.minute, now.second);
    const expected = nextCronRuns(expression, 5, from);
    assertEqual(expected.length, 5, "the spec must find five runs of the expression");
    const lists = await panelLists(page);
    const runs = lists[lists.length - 1];
    assertEqual(runs.length, 5, "the panel must list five runs");
    runs.forEach((run, index) => {
      assertRun(parseRun(run), runParts(expected[index]), `the run ${index + 1} of the expression`);
    });

    // an expression that cannot be read is refused
    await fillById(page, "cron-expression", "99 * * * *");
    await sleep(400);
    const refused = await panelLists(page);
    assertEqual(refused.length, 0, "an invalid expression must not be broken down");
  });

  spec("crontab-generator", "writes a crontab file from a description of the schedule", async (page) => {
    await fillById(page, "crontab-description", "every 15 minutes");
    await fillById(page, "crontab-command", "/usr/bin/backup --weekly");
    await sleep(400);

    // every 15 minutes is the step */15 in the minute field
    const blocks = await panelBlocks(page);
    const file = blocks[0];
    const entries = file
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    assertEqual(entries.length, 1, "the crontab file holds one entry");
    assertEqual(
      entries[0],
      "*/15 * * * * /usr/bin/backup --weekly",
      "the entry of the crontab file is the schedule and the command",
    );
    assertIncludes(file, "# expression: */15 * * * *", "the file names the expression");
    assertIncludes(file, "# description: every 15 minutes", "the file names the description");

    // a description that cannot be read falls back to the expression field
    await fillById(page, "crontab-description", "whenever it suits the server");
    await fillById(page, "crontab-expression", "5 4 * * 0");
    await sleep(400);
    const after = await panelBlocks(page);
    const entriesAfter = after[0]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    assertEqual(entriesAfter.length, 1, "the crontab file still holds one entry");
    assertEqual(
      entriesAfter[0],
      "5 4 * * 0 /usr/bin/backup --weekly",
      "the expression of the field is used when the description cannot be read",
    );
  });

  spec("email-header-analyzer", "reads the headers, the reply chain and the body of an email", async (page) => {
    // the spec builds its own raw email
    const headerLines = [
      "From: Alice Meyer <alice@example.com>",
      "To: Bob Schmidt <bob@example.com>",
      "Subject: Quarterly report",
      "\tfor the third quarter",
      "Date: Mon, 12 Jan 2026 09:15:00 +0100",
      "Message-ID: <20260112091500.12345@example.com>",
      "In-Reply-To: <20260105090000.99999@example.com>",
      "References: <20260105090000.99999@example.com> <20251230081500.11111@example.com>",
      "Received: from mx1.example.com (mx1.example.com [192.0.2.1])",
      "\tby mx2.example.com with ESMTPS id 42",
      "Received: from mx2.example.com (mx2.example.com [192.0.2.2])",
      "\tby mail.example.com with ESMTPS id 43",
    ];
    const body = [
      "Hello Bob,",
      "",
      "the quarterly report is attached, best regards",
      "Alice",
    ].join("\n");
    await fillArea(page, `${headerLines.join("\n")}\n\n${body}`);
    await sleep(600);

    const analysis = await emailAnalysis(page);
    // the spec counts the headers of its own email
    const expectedHeaders = headerLines.filter((line) => !/^[ \t]/.test(line)).length;
    assertEqual(analysis.headerCount, expectedHeaders, "the panel counts the headers of the email");

    // a folded header line belongs to the line above it
    const subject = analysis.headers.find((row) => row.label === "Subject");
    assert(subject, "the panel must show the subject of the email");
    assertEqual(
      subject.value,
      "Quarterly report for the third quarter",
      "the folded subject is joined with the line above it",
    );
    const from = analysis.headers.find((row) => row.label === "From");
    assertEqual(from.value, "Alice Meyer <alice@example.com>", "the sender of the email");
    assertEqual(analysis.body, body, "the body of the email");

    // the chain of the replied messages
    assertEqual(analysis.chain.length, 4, "the chain lists the message, the answer and the two references");
    assertEqual(analysis.chain[0], "<20260112091500.12345@example.com>", "the message itself");
    assertEqual(analysis.chain[1], "<20260105090000.99999@example.com>", "the message that is answered");
    assertEqual(analysis.chain[2], "<20260105090000.99999@example.com>", "the first earlier message");
    assertEqual(analysis.chain[3], "<20251230081500.11111@example.com>", "the second earlier message");

    // the chain of the mail servers
    assertEqual(analysis.hops, 2, "the panel counts the hops of the mail servers");
    assertIncludes(analysis.received, "from mx1.example.com", "the first hop of the mail servers");
    assertIncludes(analysis.received, "from mx2.example.com", "the second hop of the mail servers");
  });

  spec("equation-editor", "writes a formula in LaTeX and renders it as MathML", async (page) => {
    await fillArea(page, "x^2 + y^2 = z^2");
    await sleep(500);

    // the spec decodes the MathML of the panel with its own decoder
    const source = await decodeMathML(page, "main pre");
    assertEqual(source, "x^2+y^2=z^2", "the MathML of the formula");
    const preview = await decodeMathML(page, "main math");
    assertEqual(preview, source, "the rendered formula shows the same MathML");

    // the spec counts the powers of the formula it has typed
    const powers = await page.evaluate(() => {
      const pre = document.querySelector("main pre");
      return pre ? (pre.textContent.match(/<msup>/g) || []).length : -1;
    });
    assertEqual(powers, 3, "the formula x^2 + y^2 = z^2 has three powers");

    // a symbol is written at the place of the cursor
    await fillArea(page, "ab");
    await page.locator("#equation-formula").press("ArrowLeft");
    await clickButton(page, "√");
    await sleep(400);
    assertEqual(
      await valueById(page, "equation-formula"),
      "a\\sqrt{x}b",
      "the symbol is written at the place of the cursor",
    );
    assertEqual(
      await decodeMathML(page, "main pre"),
      "a√(x)b",
      "the formula with the inserted symbol",
    );
  });

  spec("meeting-planner", "proposes the first free slot of the working day and plans the agenda", async (page) => {
    await fillById(page, "meeting-busy-slots", "09:00-10:30\n11:00-12:00");
    await fillById(page, "meeting-duration", "60");
    await sleep(400);

    // the spec computes the free slots of the working day on its own
    const busy = ["09:00-10:30", "11:00-12:00"].map((slot) => slot.split("-"));
    const free = freeSlots("09:00", "17:00", busy);
    assertEqual(
      free.join("\n"),
      "10:30 - 11:00\n12:00 - 17:00",
      "the free slots of the working day 09:00 to 17:00",
    );
    const blocks = await panelBlocks(page);
    assertEqual(blocks[0].trim(), free.join("\n"), "the panel lists the free slots");

    // the proposal is the first free slot that is long enough
    assertEqual(
      await meetingProposal(page),
      "12:00 - 17:00",
      "the proposed slot is the first free slot of 60 minutes",
    );

    // the agenda shares the meeting evenly
    const agenda = ["Welcome", "Review of the figures", "Next steps"];
    const plan = await meetingPlan(page);
    assertEqual(plan.length, agenda.length, "the plan has a row for every point of the agenda");
    const share = Math.floor(60 / agenda.length);
    agenda.forEach((item, index) => {
      const start = clockMinutes("12:00") + index * share;
      const end = index === agenda.length - 1 ? clockMinutes("12:00") + 60 : start + share;
      assertEqual(plan[index].item, item, `the point ${index + 1} of the agenda`);
      assertEqual(
        plan[index].time,
        `${minutesClock(start)} - ${minutesClock(end)}`,
        `the time of the point ${index + 1} of the agenda`,
      );
    });

    // a meeting that is longer than every free slot has no proposal
    await fillById(page, "meeting-duration", "400");
    await sleep(400);
    assertEqual(
      await meetingProposal(page),
      "",
      "a meeting of 400 minutes does not fit into any free slot of the day",
    );
    const blocksAfter = await panelBlocks(page);
    assertEqual(blocksAfter[0].trim(), free.join("\n"), "the free slots do not change");
  });

  spec("round-robin-generator", "builds a schedule in which every player meets every other player once", async (page) => {
    const players = ["Alice", "Bob", "Carol", "David"];
    await fillArea(page, players.join("\n"));
    await sleep(500);

    // the spec computes the size of the schedule on its own
    const rounds = players.length - 1;
    const matches = (players.length * (players.length - 1)) / 2;
    const summary = await roundRobinSummary(page);
    assertEqual(summary.rounds, rounds, "four players need three rounds");
    assertEqual(summary.matches, matches, "four players play six matches");

    const schedule = await roundRobinSchedule(page);
    assertEqual(schedule.length, rounds, "the schedule has a round for every round");
    const pairs = [];
    schedule.forEach((round) => {
      const playing = [];
      round.pairs.forEach((pair) => {
        if (players.includes(pair.away)) {
          playing.push(pair.home, pair.away);
          pairs.push([pair.home, pair.away].sort().join("|"));
        }
      });
      assertEqual(
        new Set(playing).size,
        playing.length,
        "no player plays twice in the same round",
      );
    });
    assertEqual(pairs.length, matches, "the schedule holds every match of the round robin");
    assertEqual(
      new Set(pairs).size,
      matches,
      "every pair of players meets exactly once",
    );

    // an odd number of players leaves one player resting in every round, so
    // the schedule needs one round more than the even one
    const five = [...players, "Eva"];
    await fillArea(page, five.join("\n"));
    await sleep(500);
    const oddRounds = five.length - 1 + (five.length % 2);
    const summaryFive = await roundRobinSummary(page);
    assertEqual(summaryFive.rounds, oddRounds, "five players need five rounds");
    assertEqual(
      summaryFive.matches,
      (five.length * (five.length - 1)) / 2,
      "five players play ten matches",
    );
    const odd = await roundRobinSchedule(page);
    assertEqual(odd.length, oddRounds, "the schedule has a round for every round");
    const resting = [];
    const oddPairs = [];
    odd.forEach((round) => {
      const byes = round.pairs.filter((pair) => !five.includes(pair.away));
      assertEqual(byes.length, 1, "one player rests in every round");
      resting.push(byes[0].home);
      const playing = [];
      round.pairs.forEach((pair) => {
        if (five.includes(pair.away)) {
          playing.push(pair.home, pair.away);
          oddPairs.push([pair.home, pair.away].sort().join("|"));
        }
      });
      assertEqual(
        new Set(playing).size,
        playing.length,
        "no player plays twice in the same round",
      );
    });
    assertEqual(new Set(resting).size, five.length, "every player rests exactly once");
    assertEqual(
      new Set(oddPairs).size,
      (five.length * (five.length - 1)) / 2,
      "every pair of players meets exactly once",
    );

    // the return legs play every match a second time the other way round
    await page.locator("#round-robin-double").check();
    await sleep(500);
    const summaryDouble = await roundRobinSummary(page);
    assertEqual(summaryDouble.rounds, oddRounds * 2, "the return legs add the same rounds again");
    assertEqual(
      summaryDouble.matches,
      five.length * (five.length - 1),
      "every match is played twice",
    );
    const double = await roundRobinSchedule(page);
    const first = double.slice(0, oddRounds);
    const second = double.slice(oddRounds);
    first.forEach((round, index) => {
      round.pairs.forEach((pair, pairIndex) => {
        const other = second[index].pairs[pairIndex];
        if (five.includes(pair.away)) {
          assertEqual(other.home, pair.away, "the return leg is played at the other side");
          assertEqual(other.away, pair.home, "the return leg is played at the other side");
        } else {
          assertEqual(other.home, pair.home, "the resting player rests in the return leg as well");
          assertEqual(other.away, "Rest", "the resting player has no opponent in the return leg");
        }
      });
    });
  });

  spec("new-year-countdown", "counts down to the new year", async (page) => {
    const text = await panel(page);
    assert(
      /new year|countdown/i.test(text),
      `the tool must show a countdown to the new year, the workspace shows: ${text.slice(0, 200)}`,
    );
  });

  spec("thanksgiving-countdown", "counts down to thanksgiving", async (page) => {
    const text = await panel(page);
    assert(
      /thanksgiving/i.test(text),
      `the tool must show a countdown to thanksgiving, the workspace shows: ${text.slice(0, 200)}`,
    );
  });
}
