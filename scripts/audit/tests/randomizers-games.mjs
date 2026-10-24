/**
 * Functional specs for the 50 tools of the randomizers and games engine.
 *
 * Every spec drives the real workspace in Chrome and checks the behaviour the
 * tool promises. The expected values are established inside this file:
 *
 * - a coin flip is a fair 50/50 trial, so the heads and the tails counters
 *   have to add up to the number of flips,
 * - a die with n sides shows a value between 1 and n, and the shown total is
 *   the sum of the shown dice,
 * - the wheel can only pick one of the entries that were loaded into it, and
 *   the number of loaded entries is the number of typed lines,
 * - a bingo card holds 24 numbers plus one free space, every number inside
 *   the range of its column (B 1-15, I 16-30, N 31-45, G 46-60, O 61-75) and
 *   no number twice,
 * - a bracket is padded with byes to a power of two and a clicked winner
 *   advances into the next round,
 * - a countdown states the number of whole days left until the next holiday,
 * - a list randomizer returns a permutation of its input,
 * - a group generator partitions its input, and every name lands in exactly
 *   one group,
 * - a secret santa pairs every name with exactly one other name,
 * - the budget planner adds up the planned amounts of its categories.
 *
 * The workspaces of the tools carry stable data attributes (data-testid and
 * the data-* values) so a spec can read the numbers of the page instead of
 * guessing them out of a block of text.
 */

import assert from "node:assert/strict";

import {
  spec,
  sleep,
  fillPrimary,
  clickButton,
  clickButtonContaining,
  mainText,
  assertMatches,
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
 * Assert that the workspace is not the shared panel that the family falls
 * back to, and that it talks about the tool under test.
 *
 * This is a guard on top of the behavioural assertions of a spec: it makes
 * sure that the tool under test is the one that is rendered.
 */
async function assertOwnWorkspace(page, sharedHeading, expected, subject) {
  const heading = await workspaceHeading(page);
  assert(
    heading !== sharedHeading,
    `the ${subject} must not show the shared "${sharedHeading}" panel, it shows ${JSON.stringify(heading)}`,
  );
  const workspace = await workspaceRegion(page);
  assertMatches(
    workspace,
    expected,
    `the ${subject} workspace must offer the ${subject}`,
  );
  return workspace;
}

/** The number in the statistics card whose heading is the given label. */
async function coinStat(page, label) {
  return page.evaluate((wanted) => {
    const el = Array.from(document.querySelectorAll("main span, main p")).find(
      (n) => (n.textContent || "").trim() === wanted,
    );
    if (!el || !el.parentElement || !el.parentElement.parentElement) return null;
    const card = el.parentElement.parentElement;
    const number = Array.from(card.querySelectorAll("p")).find((n) =>
      /^\d+$/.test((n.textContent || "").trim()),
    );
    return number ? (number.textContent || "").trim() : null;
  }, label);
}

/** Flip the coin and wait for the animation to land. */
async function flipCoin(page) {
  await clickButtonContaining(page, ["flip", "coin"]);
  await sleep(2600);
}

/** Fill the wheel with the given entries and spin it. */
async function spinWheel(page, entries) {
  await fillPrimary(page, entries.join("\n"));
  await clickButton(page, "SPIN THE WHEEL!");
  await sleep(4200);
}

/**
 * Every element of the workspace that carries the given test id.
 *
 * The elements are read with their text and with their data attributes, so
 * a spec can compare the numbers of the page against the values it computed
 * itself.
 */
async function testIdNodes(page, id) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(document.querySelectorAll(`main [data-testid="${wanted}"]`));
    return nodes.map((el) => {
      const data = {};
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("data-")) data[attr.name] = attr.value;
      }
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim(),
        raw: el.textContent || "",
        ...data,
      };
    });
  }, id);
}

/** The first element of the workspace that carries the given test id. */
async function testIdNode(page, id) {
  const nodes = await testIdNodes(page, id);
  return nodes[0] || null;
}

/**
 * Click a control and read the file it downloads.
 *
 * @param {import("playwright").Page} page the page
 * @param {string} testId the test id of the control that downloads the file
 * @returns {Promise<{text: string, name: string}>} the content of the file
 */
async function downloadBuffer(page, testId, timeout = 20000) {
  const pending = page.waitForEvent("download", { timeout });
  const nodes = page.locator(`main [data-testid="${testId}"]`);
  await nodes.first().click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { text: Buffer.concat(chunks).toString("utf8"), name: download.suggestedFilename() };
}

/**
 * The cells of one CSV line.
 *
 * A cell that holds a comma is quoted, so a line must not be read with a
 * plain split: the quotes are read away and the doubled quotes of a quoted
 * cell become a single quote.
 */
function csvCells(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

/** The rows of a CSV file: every line split into its cells. */
function csvRows(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => csvCells(line));
}

/** Wait until the workspace shows an element with the given test id. */
async function waitForTestId(page, id, timeout = 20000) {
  await page.waitForSelector(`main [data-testid="${id}"]`, { timeout });
}

/** Click the nth element with the given test id. */
async function clickTestId(page, id, index = 0) {
  const nodes = page.locator(`main [data-testid="${id}"]`);
  await nodes.nth(index).click();
  await sleep(600);
}

/** Fill the nth element with the given test id. */
async function fillTestId(page, id, value, index = 0) {
  const nodes = page.locator(`main [data-testid="${id}"]`);
  await nodes.nth(index).fill(String(value));
  await sleep(500);
}

/** Choose an option of the element with the given test id. */
async function selectTestId(page, id, value) {
  const nodes = page.locator(`main [data-testid="${id}"]`);
  await nodes.nth(0).selectOption(String(value));
  await sleep(600);
}

/* ------------------------------------------------------------- the bingo --- */

/** The number range of every column of an American bingo card. */
const BINGO_COLUMN_RANGES = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

/** The structure of one bingo card: its columns and its squares. */
async function bingoCard(page, index = 0) {
  return page.evaluate((at) => {
    const card = document.querySelectorAll('main [data-testid="bingo-card"]')[at];
    if (!card) return null;
    const columns = Array.from(card.querySelectorAll('[data-testid="bingo-card-column"]')).map(
      (el) => el.getAttribute("data-letter") || "",
    );
    const cells = Array.from(card.querySelectorAll('[data-testid="bingo-card-cell"]')).map((el) => ({
      column: el.getAttribute("data-column") || "",
      row: Number(el.getAttribute("data-row")),
      kind: el.getAttribute("data-kind") || "",
      value: el.getAttribute("data-value") || "",
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    return { columns, cells };
  }, index);
}

/**
 * Assert that the card is a real American bingo card.
 *
 * The card holds five columns with the letters B to O, 25 squares, exactly
 * one free space in the middle of the N column and 24 numbers. Every number
 * has to sit inside the range of its column and no number may be used twice.
 */
function assertValidBingoCard(card, subject) {
  assert(card, `${subject} must show a bingo card`);
  assertEqual(card.columns.join(""), "BINGO", `${subject}: the columns of a bingo card`);
  assertEqual(card.cells.length, 25, `${subject}: a bingo card has 25 squares`);
  const numbers = [];
  let free = 0;
  for (const cell of card.cells) {
    const range = BINGO_COLUMN_RANGES[cell.column];
    assert(range, `${subject}: the square ${cell.column}${cell.row} sits in an unknown column`);
    if (cell.kind === "free") {
      free += 1;
      continue;
    }
    if (cell.kind !== "number") continue;
    const value = Number(cell.value);
    assert(
      Number.isInteger(value),
      `${subject}: the square ${cell.column}${cell.row} carries ${JSON.stringify(cell.value)}`,
    );
    assert(
      value >= range[0] && value <= range[1],
      `${subject}: ${value} is outside the range ${range[0]}-${range[1]} of the column ${cell.column}`,
    );
    numbers.push(value);
  }
  assertEqual(free, 1, `${subject}: a bingo card has exactly one free space`);
  assertEqual(numbers.length, 24, `${subject}: a bingo card carries 24 numbers`);
  assertEqual(
    new Set(numbers).size,
    numbers.length,
    `${subject}: the numbers of a bingo card are not used twice`,
  );
  const freeCell = card.cells.find((cell) => cell.kind === "free");
  assertEqual(freeCell.column, "N", `${subject}: the free space sits in the N column`);
  assertEqual(freeCell.row, 2, `${subject}: the free space sits in the middle row`);
}

/* ----------------------------------------------------------- the bracket --- */

/** Fill the bracket with the given names and build the plan. */
async function buildBracket(page, names) {
  await fillTestId(page, "bracket-names", names.join("\n"));
  await clickButton(page, "Generate the bracket");
  await sleep(400);
}

/** The rounds of the bracket with the matches and the teams of every match. */
async function bracketRounds(page) {
  return page.evaluate(() => {
    const rounds = Array.from(document.querySelectorAll('main [data-testid="bracket-round"]'));
    return rounds.map((round) => ({
      round: Number(round.getAttribute("data-round")),
      matches: Array.from(round.querySelectorAll('[data-testid="bracket-match"]')).map((match) => ({
        match: Number(match.getAttribute("data-match")),
        kind: match.getAttribute("data-kind") || "",
        entrants: Array.from(match.querySelectorAll('[data-testid="bracket-entrant"]')).map((el) => ({
          name: el.getAttribute("data-name") || "",
          side: Number(el.getAttribute("data-side")),
          winner: el.getAttribute("data-winner") === "true",
        })),
      })),
    }));
  });
}

/** Every match of the bracket, the winners bracket and the losers bracket. */
async function allBracketMatches(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('main [data-testid="bracket-match"]')).map((match) => ({
      kind: match.getAttribute("data-kind") || "",
      round: match.getAttribute("data-round") || "",
      match: match.getAttribute("data-match") || "",
      entrants: Array.from(match.querySelectorAll('[data-testid="bracket-entrant"]')).map((el) => ({
        name: el.getAttribute("data-name") || "",
        side: Number(el.getAttribute("data-side")),
        winner: el.getAttribute("data-winner") === "true",
      })),
    })),
  );
}

/** Click one team of one match of the winners bracket. */
async function clickBracketEntrant(page, round, match, side) {
  const selector = `main [data-testid="bracket-entrant"][data-round="${round}"][data-match="${match}"][data-side="${side}"]`;
  await page.locator(selector).first().click();
  await sleep(600);
}

/**
 * Assert the structure of the bracket and that a winner advances.
 *
 * The field is padded with byes to a power of two, so the first round holds
 * half as many matches as the padded field and the teams that were entered
 * are the only named teams. A clicked team wins its match and shows up in
 * the next round, and a team that got a bye advances without a click.
 */
async function assertBracketBehaviour(page, subject, names) {
  await buildBracket(page, names);
  const rounds = await bracketRounds(page);
  const padded = 2 ** Math.ceil(Math.log2(names.length));
  assertEqual(
    rounds.length,
    Math.log2(padded),
    `${subject}: the number of rounds of a field of ${names.length} teams`,
  );
  assertEqual(
    rounds[0].matches.length,
    padded / 2,
    `${subject}: the number of matches in the first round`,
  );
  const firstRound = rounds[0].matches.flatMap((match) => match.entrants);
  const named = firstRound.filter((entry) => entry.name !== "");
  assertEqual(named.length, names.length, `${subject}: the number of teams of the bracket`);
  assertEqual(
    named.map((entry) => entry.name).sort().join("|"),
    names.slice().sort().join("|"),
    `${subject}: the teams of the first round`,
  );
  assertEqual(
    firstRound.length - named.length,
    padded - names.length,
    `${subject}: the number of byes of the bracket`,
  );

  // A team that got a bye advances without a click.
  const advanced = rounds
    .slice(1)
    .flatMap((round) => round.matches)
    .flatMap((match) => match.entrants)
    .filter((entry) => entry.name !== "");
  assert(
    advanced.length >= 1,
    `${subject}: a team that got a bye must advance into the next round`,
  );

  // A clicked team wins the match and advances into the next round.
  const firstTeam = named[0].name;
  await clickBracketEntrant(page, 1, 0, 0);
  const after = await bracketRounds(page);
  const winner = after[0].matches[0].entrants.find((entry) => entry.winner);
  assert(winner, `${subject}: the clicked team must win its match`);
  assertEqual(winner.name, firstTeam, `${subject}: the clicked team wins its match`);
  const nextRound = after[1].matches[0].entrants.map((entry) => entry.name);
  assert(
    nextRound.includes(firstTeam),
    `${subject}: the winner must advance into the next round`,
  );
}

/* --------------------------------------------------------------- the specs --- */

export function register() {
  /* ---- the coin --------------------------------------------------------- */

  toolSpec("coin-flip", "flips the coin and counts the outcome", async (page) => {
    const heading = await workspaceHeading(page);
    assertMatches(heading, /heads|tails|coin/i, "the coin flip panel");
    await flipCoin(page);
    const total = await coinStat(page, "Total Flips");
    const heads = await coinStat(page, "Heads");
    const tails = await coinStat(page, "Tails");
    assertEqual(total, "1", "the number of flips");
    assertEqual(
      Number(heads) + Number(tails),
      1,
      "every flip lands on heads or on tails",
    );
    const text = await mainText(page);
    assertMatches(text, /Heads!|Tails!/, "the landed side should be shown");
  });

  toolSpec("coin-flip-simulator", "flips the coin and counts the outcome", async (page) => {
    const heading = await workspaceHeading(page);
    assertMatches(heading, /heads|tails|coin/i, "the coin flip panel");
    await flipCoin(page);
    await flipCoin(page);
    const total = await coinStat(page, "Total Flips");
    const heads = await coinStat(page, "Heads");
    const tails = await coinStat(page, "Tails");
    assertEqual(total, "2", "the number of flips");
    assertEqual(
      Number(heads) + Number(tails),
      2,
      "every flip lands on heads or on tails",
    );
  });

  toolSpec("flip-a-coin", "flips the coin and counts the outcome", async (page) => {
    const heading = await workspaceHeading(page);
    assertMatches(heading, /heads|tails|coin/i, "the coin flip panel");
    await flipCoin(page);
    const total = await coinStat(page, "Total Flips");
    const heads = await coinStat(page, "Heads");
    const tails = await coinStat(page, "Tails");
    assertEqual(total, "1", "the number of flips");
    assertEqual(
      Number(heads) + Number(tails),
      1,
      "every flip lands on heads or on tails",
    );
  });

  toolSpec("heads-or-tails", "flips the coin and counts the outcome", async (page) => {
    const heading = await workspaceHeading(page);
    assertMatches(heading, /heads|tails|coin/i, "the coin flip panel");
    await flipCoin(page);
    const total = await coinStat(page, "Total Flips");
    const heads = await coinStat(page, "Heads");
    const tails = await coinStat(page, "Tails");
    assertEqual(total, "1", "the number of flips");
    assertEqual(
      Number(heads) + Number(tails),
      1,
      "every flip lands on heads or on tails",
    );
  });

  /* ---- the wheel -------------------------------------------------------- */

  /** The wheel has to pick one of the loaded entries and count them. */
  async function assertWheel(page, subject, entries) {
    await spinWheel(page, entries);
    const count = await testIdNode(page, "wheel-count");
    assert(count, `${subject} must show how many entries are loaded`);
    assertEqual(
      Number(count["data-count"]),
      entries.length,
      `${subject}: the number of loaded entries`,
    );
    const winner = await testIdNode(page, "wheel-winner");
    assert(winner, `${subject} must announce a winner`);
    assert(
      entries.includes(winner["data-name"]),
      `${subject}: the winner ${JSON.stringify(winner["data-name"])} must be one of the loaded entries`,
    );
    const text = await mainText(page);
    assert(
      text.includes(`Winner: ${winner["data-name"]}!`),
      `${subject}: the winner must be announced`,
    );
  }

  toolSpec("wheel-of-names", "picks one of the loaded names", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Wheel of Names & Random Winner Picker", "the wheel panel");
    await assertWheel(page, "wheel of names", ["Alpha", "Beta", "Gamma"]);
  });

  toolSpec("random-winner-picker", "picks one of the loaded names", async (page) => {
    await assertWheel(page, "random winner picker", ["Alpha", "Beta", "Gamma"]);
  });

  toolSpec("random-name-picker", "picks one of the loaded names", async (page) => {
    await assertWheel(page, "random name picker", ["Alpha", "Beta", "Gamma"]);
  });

  toolSpec("random-item-picker", "picks one of the loaded items", async (page) => {
    await assertWheel(page, "random item picker", ["Red", "Green", "Blue"]);
  });

  toolSpec("yes-or-no-wheel", "picks yes or no", async (page) => {
    await assertWheel(page, "yes or no wheel", ["Yes", "No"]);
  });

  /* ---- the dice --------------------------------------------------------- */

  /** The dice types the roller offers: the polyhedral set of the family. */
  const DICE_SET = [4, 6, 8, 10, 12, 20, 100];

  toolSpec("dice-roller", "rolls a die with the chosen number of sides", async (page) => {
    const heading = await workspaceHeading(page);
    assertEqual(heading, "Dice Roller (d6 & d20)", "the dice panel");

    // The roller promises the dice from d4 to d100.
    const offered = await testIdNodes(page, "dice-die");
    assertEqual(
      offered.map((die) => Number(die["data-sides"])).join(","),
      DICE_SET.join(","),
      "the dice roller must offer the dice from d4 to d100",
    );

    await clickButton(page, "d20");
    await sleep(400);
    const face = await testIdNode(page, "dice-face");
    const value = Number(face["data-value"]);
    assert(
      Number.isInteger(value) && value >= 1 && value <= 20,
      `a d20 shows a value between 1 and 20, got ${JSON.stringify(value)}`,
    );
    const total = await testIdNode(page, "dice-total");
    assertEqual(
      Number(total["data-total"]),
      value + Number(total["data-modifier"]),
      "the shown total must be the sum of the shown dice and the modifier",
    );
    let history = await testIdNodes(page, "dice-history-row");
    assertEqual(history.length, 1, "the history must hold one row after one roll");

    await clickButton(page, "Roll Again");
    await sleep(400);
    const again = await testIdNode(page, "dice-face");
    const againValue = Number(again["data-value"]);
    assert(
      Number.isInteger(againValue) && againValue >= 1 && againValue <= 20,
      `a d20 shows a value between 1 and 20, got ${JSON.stringify(againValue)}`,
    );
    history = await testIdNodes(page, "dice-history-row");
    assertEqual(history.length, 2, "the history must hold one row per roll");

    // The roller also takes a die with a number of sides that is not one of
    // the presets: the typed number is the number of sides of the die.
    await fillTestId(page, "dice-custom-sides", 7);
    const custom = await testIdNode(page, "dice-face");
    assertEqual(Number(custom["data-sides"]), 7, "the custom die must be the active die");
    const customValue = Number(custom["data-value"]);
    assert(
      Number.isInteger(customValue) && customValue >= 1 && customValue <= 7,
      `a die with 7 custom sides shows a value between 1 and 7, got ${JSON.stringify(customValue)}`,
    );

    // The custom sides are clamped like the other inputs of the roller.
    await fillTestId(page, "dice-custom-sides", 5000);
    const clamped = await testIdNode(page, "dice-face");
    assertEqual(Number(clamped["data-sides"]), 1000, "the custom sides must be clamped to 1000");
    await fillTestId(page, "dice-custom-sides", 1);
    const low = await testIdNode(page, "dice-face");
    assertEqual(Number(low["data-sides"]), 2, "a die needs at least two sides");

    // The roller rolls up to 100 dice at once and keeps all of them in the
    // history.
    await fillTestId(page, "dice-count", 100);
    await clickButton(page, "Roll Again");
    await sleep(600);
    const dice = await testIdNodes(page, "dice-value");
    assertEqual(dice.length, 99, "a roll of 100 dice shows the first die and 99 more");
    const rolls = await testIdNodes(page, "dice-history-row");
    assertEqual(
      Number(rolls[0]["data-count"]),
      100,
      "the history must hold all 100 dice of the roll",
    );
  });

  toolSpec("dnd-dice-roller", "rolls the dice of a dice set", async (page) => {
    await assertOwnWorkspace(
      page,
      "Dice Roller (d6 & d20)",
      /\bd4\b/i,
      "dnd dice roller",
    );
    // The roller offers the polyhedral set of the family.
    const offered = await testIdNodes(page, "dnd-die");
    assertEqual(
      offered.map((die) => Number(die["data-sides"])).join(","),
      DICE_SET.join(","),
      "the dnd dice roller must offer the dice from d4 to d100",
    );

    // Roll a d4, a d8 and a d10 together with the d20 of the default set.
    for (const sides of [4, 8, 10]) {
      const index = offered.findIndex((die) => Number(die["data-sides"]) === sides);
      await clickTestId(page, "dnd-die", index);
    }
    await clickButton(page, "Roll all dice");
    await sleep(400);

    const results = await testIdNodes(page, "dnd-result");
    assertEqual(results.length, 4, "every selected die must show its own result");
    const rolledSides = results.map((entry) => Number(entry["data-sides"])).sort((a, b) => a - b);
    assertEqual(rolledSides.join(","), "4,8,10,20", "the rolled dice types");
    let sum = 0;
    for (const entry of results) {
      const sides = Number(entry["data-sides"]);
      const value = Number(entry["data-value"]);
      assert(
        Number.isInteger(value) && value >= 1 && value <= sides,
        `a d${sides} shows a value between 1 and ${sides}, got ${JSON.stringify(value)}`,
      );
      sum += value;
    }
    const total = await testIdNode(page, "dnd-total");
    assertEqual(
      Number(total["data-total"]),
      sum + Number(total["data-modifier"]) * results.length,
      "the shown total must be the sum of the shown dice and the modifier",
    );

    let history = await testIdNodes(page, "dnd-history-row");
    assertEqual(history.length, 1, "the history must hold one row after one roll");
    await clickButton(page, "Roll all dice");
    await sleep(400);
    history = await testIdNodes(page, "dnd-history-row");
    assertEqual(history.length, 2, "the history must hold one row per roll");
  });

  toolSpec("roll-two-dice", "rolls two dice and shows their sum", async (page) => {
    await assertOwnWorkspace(
      page,
      "Dice Roller (d6 & d20)",
      /sum|total/i,
      "roll two dice",
    );
    await clickButton(page, "Roll the two dice");
    await sleep(400);
    const faces = await testIdNodes(page, "dice-value");
    assertEqual(faces.length, 2, "two dice should be shown");
    let sum = 0;
    for (const face of faces) {
      const value = Number(face["data-value"]);
      assert(
        Number.isInteger(value) && value >= 1 && value <= 6,
        `a d6 shows a value between 1 and 6, got ${JSON.stringify(value)}`,
      );
      sum += value;
    }
    const shown = await testIdNode(page, "dice-sum");
    assertEqual(Number(shown["data-sum"]), sum, "the shown sum must be the sum of the two dice");

    let history = await testIdNodes(page, "dice-history-row");
    assertEqual(history.length, 1, "the history must hold one row after one roll");
    await clickButton(page, "Roll the two dice");
    await sleep(400);
    history = await testIdNodes(page, "dice-history-row");
    assertEqual(history.length, 2, "the history must hold one row per roll");

    // The history is exported as a CSV file: a header line plus one line per
    // roll, and every line carries the two faces and their sum.
    const csv = await downloadBuffer(page, "dice-export-csv");
    const csvText = csv.text;
    assert.match(csv.name, /\.csv$/, `the download should be named .csv, got ${csv.name}`);
    const csvLines = csvText.trim().split("\n");
    assertEqual(csvLines.length, 3, `the CSV holds a header and one line per roll, it has ${csvLines.length}`);
    assert.match(csvLines[0], /roll/i, `the CSV starts with a header, it starts with ${JSON.stringify(csvLines[0])}`);
    for (const line of csvLines.slice(1)) {
      const cells = line.split(",");
      assertEqual(cells.length, 4, `a CSV line holds four cells, it has ${cells.length}: ${JSON.stringify(line)}`);
      const first = Number(cells[1]);
      const second = Number(cells[2]);
      assert(
        first >= 1 && first <= 6 && second >= 1 && second <= 6,
        `a CSV line holds two d6 values, it holds ${JSON.stringify(line)}`,
      );
      assertEqual(Number(cells[3]), first + second, "the CSV sum must be the sum of the two dice");
    }

    // The probability guide lists the eleven sums of two d6 with their
    // combinations: 1, 2, 3, 4, 5, 6, 5, 4, 3, 2 and 1.
    const guide = await testIdNodes(page, "dice-probability-row");
    assertEqual(guide.length, 11, `the guide lists every sum from 2 to 12, it lists ${guide.length}`);
    const expectedCombinations = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
    guide.forEach((row, index) => {
      assertEqual(Number(row["data-sum"]), index + 2, "the guide lists the sums in order");
      assertEqual(
        Number(row["data-combinations"]),
        expectedCombinations[index],
        `the sum ${index + 2} has ${expectedCombinations[index]} combinations`,
      );
      assertEqual(
        row["data-percent"],
        `${((expectedCombinations[index] / 36) * 100).toFixed(2)}%`,
        `the sum ${index + 2} has the chance ${row["data-percent"]}`,
      );
    });

    // The history can be cleared again.
    const clear = await testIdNode(page, "dice-clear-history");
    assert.ok(clear, "the workspace offers a control that clears the history");
    await clickTestId(page, "dice-clear-history");
    await sleep(250);
    history = await testIdNodes(page, "dice-history-row");
    assertEqual(history.length, 0, "the history is empty after it was cleared");
  });

  /* ---- the bingo cards -------------------------------------------------- */

  toolSpec("bingo-card-generator", "shows a real bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "bingo card generator",
    );
    await waitForTestId(page, "bingo-card");
    const first = await bingoCard(page, 0);
    assertValidBingoCard(first, "bingo card generator");

    // A new card is drawn, and it is not the card of the last round.
    const signature = (card) => card.cells.map((cell) => cell.value).join("|");
    let changed = false;
    for (let round = 0; round < 3 && !changed; round += 1) {
      await clickButton(page, "New card");
      await sleep(300);
      const next = await bingoCard(page, 0);
      changed = signature(next) !== signature(first);
    }
    assert(changed, "the bingo card generator must draw a new card");
  });

  toolSpec("blank-bingo-card", "shows an empty bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "blank bingo card",
    );
    await waitForTestId(page, "bingo-card");
    const card = await bingoCard(page, 0);
    assert(card, "the blank bingo card must show a card");
    assertEqual(card.columns.join(""), "BINGO", "the columns of a bingo card");
    assertEqual(card.cells.length, 25, "a bingo card has 25 squares");
    const numbers = card.cells.filter((cell) => cell.kind === "number");
    assertEqual(numbers.length, 0, "a blank card carries no numbers");
    const free = card.cells.filter((cell) => cell.kind === "free");
    assertEqual(free.length, 1, "a blank card has exactly one free space");
    assertEqual(free[0].column, "N", "the free space sits in the N column");
    assertEqual(free[0].row, 2, "the free space sits in the middle row");
  });

  toolSpec("printable-bingo-cards", "shows the requested number of bingo cards", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "printable bingo cards",
    );
    await waitForTestId(page, "bingo-card");
    await fillTestId(page, "bingo-card-amount", 3);
    await sleep(600);
    const cards = await testIdNodes(page, "bingo-card");
    assertEqual(cards.length, 3, "the number of cards must match the requested amount");
    for (let index = 0; index < cards.length; index += 1) {
      assertValidBingoCard(await bingoCard(page, index), "printable bingo cards");
    }
  });

  toolSpec("custom-bingo-card-maker", "fills the card with the own words", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "custom bingo card maker",
    );
    await waitForTestId(page, "bingo-card");
    const words = Array.from({ length: 24 }, (_, index) => `word-${index + 1}`);
    await fillTestId(page, "bingo-custom-squares", words.join("\n"));
    await clickButton(page, "Fill the card");
    await sleep(400);

    const card = await bingoCard(page, 0);
    assert(card, "the custom bingo card maker must show a card");
    assertEqual(card.columns.join(""), "BINGO", "the columns of a bingo card");
    assertEqual(card.cells.length, 25, "a bingo card has 25 squares");
    const custom = card.cells.filter((cell) => cell.kind === "custom");
    assertEqual(custom.length, 24, "the own words must fill the 24 squares of the card");
    assertEqual(
      custom.map((cell) => cell.text).sort().join("|"),
      words.slice().sort().join("|"),
      "the own words on the card",
    );
    const free = card.cells.filter((cell) => cell.kind === "free");
    assertEqual(free.length, 1, "the free space must stay free");
    assertEqual(free[0].column, "N", "the free space sits in the N column");
    assertEqual(free[0].row, 2, "the free space sits in the middle row");
  });

  toolSpec("bingo-caller", "calls the bingo numbers", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /call/i,
      "bingo caller",
    );
    const calls = 10;
    for (let round = 0; round < calls; round += 1) {
      await clickButton(page, "Call the next number");
    }
    const called = await testIdNodes(page, "bingo-called-number");
    assertEqual(called.length, calls, "every call must be listed");
    const values = called.map((entry) => Number(entry["data-value"]));
    for (const value of values) {
      assert(
        Number.isInteger(value) && value >= 1 && value <= 75,
        `a bingo number lies between 1 and 75, got ${JSON.stringify(value)}`,
      );
    }
    assertEqual(
      new Set(values).size,
      values.length,
      "a number must not be called twice",
    );
    const current = await testIdNode(page, "bingo-current");
    assertEqual(
      Number(current["data-value"]),
      values[values.length - 1],
      "the shown number must be the number that was called last",
    );
  });

  /** The themed bingo card: a real card plus the picture prompts of the season. */
  async function assertThemedBingo(page, subject) {
    await waitForTestId(page, "bingo-card");
    assertValidBingoCard(await bingoCard(page, 0), subject);
    const prompts = await testIdNodes(page, "bingo-prompt");
    assertEqual(prompts.length, 12, `${subject}: the number of picture prompts`);
    for (const prompt of prompts) {
      assert(prompt.text.length > 0, `${subject}: every picture prompt carries a word`);
    }
    assertEqual(
      new Set(prompts.map((prompt) => prompt.text)).size,
      prompts.length,
      `${subject}: the picture prompts are all different`,
    );
  }

  toolSpec("christmas-bingo", "shows a christmas bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "christmas bingo",
    );
    await assertThemedBingo(page, "christmas bingo");
  });

  toolSpec("new-years-bingo", "shows a new year bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "new years bingo",
    );
    await assertThemedBingo(page, "new years bingo");
  });

  toolSpec("thanksgiving-bingo", "shows a thanksgiving bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "thanksgiving bingo",
    );
    await assertThemedBingo(page, "thanksgiving bingo");
  });

  toolSpec("baby-shower-bingo", "shows a baby shower bingo card", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /\bB\b/,
      "baby shower bingo",
    );
    await assertThemedBingo(page, "baby shower bingo");
  });

  /* ---- the brackets ----------------------------------------------------- */

  toolSpec("bracket-generator", "builds a bracket and plays the winners", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /round|final|semi/i,
      "bracket generator",
    );
    await assertBracketBehaviour(page, "bracket generator", ["A", "B", "C", "D", "E"]);
  });

  toolSpec("bracket-maker", "builds a bracket and plays the winners", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /round|final|semi/i,
      "bracket maker",
    );
    await assertBracketBehaviour(page, "bracket maker", ["A", "B", "C", "D", "E"]);
  });

  toolSpec("printable-bracket", "builds a bracket and plays the winners", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /round|final|semi/i,
      "printable bracket",
    );
    await assertBracketBehaviour(page, "printable bracket", ["A", "B", "C", "D", "E"]);
  });

  toolSpec("single-elimination-bracket", "builds a bracket and plays the winners", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /round|final|semi/i,
      "single elimination bracket",
    );
    await assertBracketBehaviour(page, "single elimination bracket", ["A", "B", "C", "D", "E"]);

    // The champion of a finished bracket is the team that won the final.
    await buildBracket(page, ["A", "B", "C", "D"]);
    const rounds = await bracketRounds(page);
    assertEqual(rounds.length, 2, "a field of four teams has two rounds");
    await clickBracketEntrant(page, 1, 0, 0);
    await clickBracketEntrant(page, 1, 1, 0);
    await clickBracketEntrant(page, 2, 0, 0);
    const champion = await testIdNode(page, "bracket-champion");
    assert(champion["data-name"], "the bracket must name the champion");
  });

  toolSpec("double-elimination-bracket", "gives every team a second chance", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /round|final|semi|loser/i,
      "double elimination bracket",
    );
    await buildBracket(page, ["A", "B", "C", "D"]);

    // The losers of the first round wait for their match in the losers bracket.
    await clickBracketEntrant(page, 1, 0, 0);
    await clickBracketEntrant(page, 1, 1, 0);
    const waiting = await testIdNode(page, "bracket-waiting");
    const waitingNames = (waiting["data-waiting"] || "").split(",").filter(Boolean);
    assertEqual(waitingNames.length, 2, "the two losers wait for their match");
    const eliminatedBefore = await testIdNode(page, "bracket-eliminated");
    assertEqual(
      (eliminatedBefore["data-eliminated"] || "").split(",").filter(Boolean).length,
      0,
      "nobody is out of the tournament before the losers bracket is played",
    );

    // The losers play their match, and the loser of that match is out.
    await clickTestId(page, "bracket-losers-play");
    const losers = (await allBracketMatches(page)).filter(
      (match) => match.kind === "losers",
    );
    assertEqual(losers.length, 1, "the losers bracket must hold the played match");
    const loserNames = losers[0].entrants.map((entry) => entry.name);
    assertEqual(
      loserNames.slice().sort().join("|"),
      waitingNames.slice().sort().join("|"),
      "the losers match must hold the two teams that lost",
    );

    await page
      .locator('main [data-testid="bracket-entrant"][data-kind="losers"][data-side="0"]')
      .first()
      .click();
    await sleep(600);
    const eliminated = await testIdNode(page, "bracket-eliminated");
    const eliminatedNames = (eliminated["data-eliminated"] || "").split(",").filter(Boolean);
    assertEqual(eliminatedNames.length, 1, "the loser of the losers match is out of the tournament");
    assertEqual(
      eliminatedNames[0],
      loserNames[1],
      "the team that lost the losers match is out of the tournament",
    );
  });

  /* ---- the countdowns --------------------------------------------------- */

  /**
   * The countdown has to show the number of whole days that are left.
   *
   * The expected value is computed from the clock of the browser, which is
   * the same clock the workspace used. The holiday itself is read from the
   * data attributes of the page and has to match the expected date exactly.
   */
  async function assertCountdown(page, subject, month, day) {
    const state = await page.evaluate(() => {
      const days = document.querySelector('main [data-testid="countdown-days"]');
      const date = document.querySelector('main [data-testid="countdown-date"]');
      return {
        shown: days ? Number(days.getAttribute("data-value")) : null,
        year: date ? Number(date.getAttribute("data-year")) : null,
        month: date ? Number(date.getAttribute("data-month")) : null,
        day: date ? Number(date.getAttribute("data-day")) : null,
        now: new Date().getTime(),
      };
    });
    const now = new Date(state.now);
    const target = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setFullYear(now.getFullYear() + 1);
    const expected = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    assert(
      state.shown !== null && Math.abs(state.shown - expected) <= 1,
      `${subject}: there are ${expected} days left, the tool shows ${JSON.stringify(state.shown)}`,
    );
    assertEqual(state.year, target.getFullYear(), `${subject}: the year of the holiday`);
    assertEqual(state.month, month + 1, `${subject}: the month of the holiday`);
    assertEqual(state.day, day, `${subject}: the day of the holiday`);
  }

  toolSpec("days-until-christmas", "counts the days until Christmas Day", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /day/i,
      "days until christmas",
    );
    await assertCountdown(page, "days until christmas", 11, 25);
  });

  toolSpec("days-until-halloween", "counts the days until Halloween", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /day/i,
      "days until halloween",
    );
    await assertCountdown(page, "days until halloween", 9, 31);
  });

  /* ---- the rules and the templates -------------------------------------- */

  /** The rules of a gift game: six numbered rules that are all different. */
  async function assertRules(page, subject) {
    const rules = await testIdNodes(page, "rule");
    assertEqual(rules.length, 6, `${subject}: the number of rules`);
    const numbers = await testIdNodes(page, "rule-number");
    assertEqual(
      numbers.map((node) => node.text).join(","),
      "1,2,3,4,5,6",
      `${subject}: the rules must be numbered from one to six`,
    );
    const texts = await testIdNodes(page, "rule-text");
    for (const text of texts) {
      assert(
        text.text.length >= 20,
        `${subject}: every rule spells out what to do, got ${JSON.stringify(text.text)}`,
      );
    }
    assertEqual(
      new Set(texts.map((text) => text.text)).size,
      texts.length,
      `${subject}: the rules are all different`,
    );
    const intro = await testIdNode(page, "rules-intro");
    assert(
      intro && intro.text.length >= 20,
      `${subject}: the rules must come with an introduction`,
    );
  }

  toolSpec("dirty-santa-rules", "shows the rules of Dirty Santa", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /santa/i,
      "dirty santa rules",
    );
    await assertRules(page, "dirty santa rules");
  });

  toolSpec("white-elephant-rules", "shows the rules of White Elephant", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /white elephant|gift/i,
      "white elephant rules",
    );
    await assertRules(page, "white elephant rules");
  });

  toolSpec("yankee-swap-rules", "shows the rules of Yankee Swap", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /swap|christmas/i,
      "yankee swap rules",
    );
    await assertRules(page, "yankee swap rules");
  });

  toolSpec("letter-to-santa-template", "shows a letter template", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /santa|dear/i,
      "letter to santa template",
    );
    const body = await testIdNode(page, "letter-body");
    assert(body, "the letter template must show the letter");
    const text = body.raw;
    assert(text.length >= 200, `the letter must be a letter, it holds ${text.length} characters`);
    const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    assert(paragraphs.length >= 3, `the letter must have paragraphs, it has ${paragraphs.length}`);
    const fields = text.match(/\[[^\]]+\]/g) || [];
    assert(fields.length >= 3, `the letter must have fields to fill in, it has ${fields.length}`);
    assertEqual(
      new Set(fields).size,
      fields.length,
      "the fields of the letter are all different",
    );
  });

  toolSpec("christmas-list-template", "shows a Christmas list template", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /christmas|list/i,
      "christmas list template",
    );
    const rows = await testIdNodes(page, "list-template-row");
    assertEqual(rows.length, 8, "the Christmas list template must hold eight categories");
    const categories = await testIdNodes(page, "list-template-category");
    for (const category of categories) {
      assert(category.text.length > 0, "every category of the list template carries a title");
    }
    assertEqual(
      new Set(categories.map((category) => category.text)).size,
      categories.length,
      "the categories of the list template are all different",
    );
  });

  /* ---- the Christmas lists and the budget ------------------------------- */

  toolSpec("christmas-list-maker", "collects the gifts of the list", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /list/i,
      "christmas list maker",
    );
    const gifts = [
      ["Sweater", "Mum"],
      ["Book", "Dad"],
      ["Toy", "Sister"],
    ];
    for (const [gift, person] of gifts) {
      await fillTestId(page, "list-gift", gift);
      await fillTestId(page, "list-person", person);
      await clickButton(page, "Add");
    }
    const rows = await testIdNodes(page, "list-row");
    assertEqual(rows.length, gifts.length, "every gift must show up in the list");
    assertEqual(
      rows.map((row) => row["data-title"]).join("|"),
      gifts.map(([gift]) => gift).join("|"),
      "the gifts of the list",
    );
    assertEqual(rows[0]["data-person"], "Mum", "the list must remember who gets the gift");
    let summary = await testIdNode(page, "list-summary");
    assertEqual(Number(summary["data-total"]), gifts.length, "the number of gifts");
    assertEqual(Number(summary["data-open"]), gifts.length, "the number of open gifts");

    await clickTestId(page, "list-toggle", 0);
    summary = await testIdNode(page, "list-summary");
    assertEqual(Number(summary["data-total"]), gifts.length, "the number of gifts");
    assertEqual(Number(summary["data-open"]), gifts.length - 1, "the number of open gifts");
    const rowsAfter = await testIdNodes(page, "list-row");
    assertEqual(rowsAfter[0]["data-done"], "true", "a ticked gift must be marked as done");
  });

  toolSpec("christmas-wish-list-maker", "collects the wishes of the list", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /wish|list/i,
      "christmas wish list maker",
    );
    const wishes = ["Book", "Scarf", "Chocolate"];
    for (const wish of wishes) {
      await fillTestId(page, "wish-input", wish);
      await clickButton(page, "Add");
    }
    const rows = await testIdNodes(page, "wish-row");
    assertEqual(rows.length, wishes.length, "every wish must show up in the list");
    assertEqual(
      rows.map((row) => row["data-name"]).join("|"),
      wishes.join("|"),
      "the wishes of the list",
    );
    const summary = await testIdNode(page, "wish-summary");
    assertEqual(Number(summary["data-total"]), wishes.length, "the number of wishes");
  });

  toolSpec("christmas-budget-planner", "adds up the planned amounts", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /budget/i,
      "christmas budget planner",
    );
    const inputs = await testIdNodes(page, "budget-amount");
    assertEqual(inputs.length, 7, "the budget planner must hold seven categories");

    await fillTestId(page, "budget-total", 1000);
    const amounts = [100, 200, 50, 0, 25, 75, 0];
    for (let index = 0; index < amounts.length; index += 1) {
      await fillTestId(page, "budget-amount", amounts[index], index);
    }
    const planned = amounts.reduce((sum, value) => sum + value, 0);
    const spent = await testIdNode(page, "budget-spent");
    assertEqual(Number(spent["data-amount"]), planned, "the planned amount of the categories");
    const left = await testIdNode(page, "budget-left");
    assertEqual(
      Number(left["data-amount"]),
      1000 - planned,
      "the remaining budget must be the budget minus the planned amount",
    );

    // The budget can be split per person: every name of the list gets the
    // same amount and the planner shows what the people need together.
    await fillTestId(page, "budget-people-source", "Anna\nBen\nCleo");
    await fillTestId(page, "budget-per-person", 100);
    const people = await testIdNodes(page, "budget-person");
    assertEqual(people.length, 3, "every name of the list must get a share");
    assertEqual(Number(people[0]["data-share"]), 100, "the share of a person");
    assertEqual(people[0]["data-name"], "Anna", "the first name of the list");
    const needed = await testIdNode(page, "budget-people-total");
    assert(needed, "the planner must show what the people need together");
    assertEqual(Number(needed["data-amount"]), 300, "the amount the people need together");
    assertEqual(Number(needed["data-people"]), 3, "the number of the people");

    // The people need more than the budget: the planner has to say so.
    await fillTestId(page, "budget-total", 200);
    const warning = await testIdNode(page, "budget-people-warning");
    assert(warning, "the planner must warn when the people need more than the budget");
    assertEqual(Number(warning["data-amount"]), 300, "the amount the people need");
    assertEqual(Number(warning["data-budget"]), 200, "the budget of the warning");

    // With a budget that covers the people the warning is gone.
    await fillTestId(page, "budget-total", 1000);
    const gone = await testIdNode(page, "budget-people-warning");
    assertEqual(gone, null, "the warning must be gone when the budget covers the people");

    // The planned amounts of the categories still count.
    const spentAgain = await testIdNode(page, "budget-spent");
    assertEqual(Number(spentAgain["data-amount"]), planned, "the planned amount of the categories");
    const leftAgain = await testIdNode(page, "budget-left");
    assertEqual(
      Number(leftAgain["data-amount"]),
      1000 - planned,
      "the remaining budget must be the budget minus the planned amount",
    );
  });

  /* ---- the name generators ---------------------------------------------- */

  /**
   * The name generator has to suggest names that fit the active filters.
   *
   * The filters are set by the spec, and every suggestion has to carry the
   * origin, the style and the length that were asked for.
   */
  async function assertNameGenerator(page, subject, genders) {
    await waitForTestId(page, "name-suggestion");
    const suggestions = await testIdNodes(page, "name-suggestion");
    assertEqual(suggestions.length, 8, `${subject}: the number of suggestions`);
    for (const suggestion of suggestions) {
      assert(/^[A-Za-z]+$/.test(suggestion["data-name"]), `${subject}: a name is a word`);
      assert(
        genders.includes(suggestion["data-gender"]),
        `${subject}: the suggestion ${JSON.stringify(suggestion["data-name"])} has the wrong gender`,
      );
    }
    const selected = await testIdNode(page, "name-selected");
    assert(
      suggestions.some((entry) => entry["data-name"] === selected["data-name"]),
      `${subject}: the shown name must be one of the suggestions`,
    );

    await selectTestId(page, "name-origin-filter", "hebrew");
    await selectTestId(page, "name-style-filter", "biblical");
    await selectTestId(page, "name-length-filter", "short");
    const filtered = await testIdNodes(page, "name-suggestion");
    assert(filtered.length > 0, `${subject}: the filters must leave suggestions`);
    for (const suggestion of filtered) {
      assertEqual(suggestion["data-origin"], "hebrew", `${subject}: the origin of a suggestion`);
      assertEqual(suggestion["data-style"], "biblical", `${subject}: the style of a suggestion`);
      assertEqual(suggestion["data-length"], "short", `${subject}: the length of a suggestion`);
    }
  }

  toolSpec("baby-boy-name-generator", "suggests boy names", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /name/i,
      "baby boy name generator",
    );
    await assertNameGenerator(page, "baby boy name generator", ["boy", "unisex"]);
  });

  toolSpec("baby-girl-name-generator", "suggests girl names", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /name/i,
      "baby girl name generator",
    );
    await assertNameGenerator(page, "baby girl name generator", ["girl", "unisex"]);
  });

  toolSpec("baby-name-ai", "suggests baby names", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /name/i,
      "baby name ai",
    );
    await assertNameGenerator(page, "baby name ai", ["boy", "girl", "unisex"]);
    // The gender filter of the tool narrows the suggestions down as well.
    await selectTestId(page, "name-gender-filter", "girl");
    const girls = await testIdNodes(page, "name-suggestion");
    assert(girls.length > 0, "the gender filter must leave suggestions");
    for (const suggestion of girls) {
      assertEqual(suggestion["data-gender"], "girl", "the gender of a suggestion");
    }
  });

  /* ---- the username generators ------------------------------------------- */

  /**
   * The username generator has to respect the rules of its platform.
   *
   * The rules are the ones of the platform itself: Reddit allows 3 to 30
   * characters, Discord 2 to 32 and Twitch 4 to 25, and none of them allows
   * a space.
   */
  async function assertUsernames(page, subject, min, max, pattern) {
    await waitForTestId(page, "username");
    const names = await testIdNodes(page, "username");
    assertEqual(names.length, 10, `${subject}: the number of names`);
    for (const name of names) {
      const value = name["data-name"];
      assert(
        value.length >= min && value.length <= max,
        `${subject}: ${JSON.stringify(value)} must have ${min} to ${max} characters`,
      );
      assert(
        pattern.test(value),
        `${subject}: ${JSON.stringify(value)} must only use the characters of the platform`,
      );
    }
    const rules = await testIdNodes(page, "username-rule");
    assertEqual(rules.length, 3, `${subject}: the number of rules that are shown`);

    // A new round draws ten names again.
    await clickButton(page, "Generate names");
    await sleep(400);
    const again = await testIdNodes(page, "username");
    assertEqual(again.length, 10, `${subject}: the number of names after a new round`);

    // --- the word of the user replaces the first part of the name -----------
    await page.locator('main input[aria-label="Your own word"]').fill("zebra");
    await sleep(600);
    const own = await testIdNodes(page, "username");
    assertEqual(own.length, 10, `${subject}: the number of names with a word of the user`);
    for (const name of own) {
      const value = name["data-name"];
      assert(
        value.toLowerCase().startsWith("zebra"),
        `${subject}: ${JSON.stringify(value)} must start with the word of the user`,
      );
      assert(
        value.length >= min && value.length <= max,
        `${subject}: ${JSON.stringify(value)} must still have ${min} to ${max} characters`,
      );
      assert(
        pattern.test(value),
        `${subject}: ${JSON.stringify(value)} must still only use the characters of the platform`,
      );
    }

    // --- a name is copied --------------------------------------------------
    // The permissions are granted for the origin of the page. Without the
    // origin the grant does not reach the page, and the read of the
    // clipboard is refused.
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(page.url()).origin,
    });
    const first = own[0]["data-name"];
    await page.locator('main [data-testid="username"]').first().click();
    await sleep(300);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assertEqual(
      clipboard.trim(),
      first.trim(),
      `${subject}: clicking a name must put it into the clipboard`,
    );

    // --- a name is kept in the shortlist -----------------------------------
    await page.locator('main [data-testid="username-save"]').first().click();
    await sleep(300);
    const shortlist = await testIdNodes(page, "shortlist-name");
    assertEqual(
      shortlist.length,
      1,
      `${subject}: a saved name must appear in the shortlist`,
    );
    assertEqual(
      shortlist[0].text.trim(),
      first.trim(),
      `${subject}: the shortlist must hold the name that was saved`,
    );

    // --- the shortlist can be emptied --------------------------------------
    await page.locator('main [data-testid="shortlist-clear"]').click();
    await sleep(300);
    const cleared = await testIdNodes(page, "shortlist-name");
    assertEqual(
      cleared.length,
      0,
      `${subject}: clearing the shortlist must remove every name from it`,
    );
  }

  toolSpec("username-generator", "suggests usernames", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /username/i,
      "username generator",
    );
    await assertUsernames(page, "username generator", 3, 30, /^[A-Za-z0-9_]+$/);
  });

  toolSpec("reddit-username-generator", "suggests Reddit usernames", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /username|reddit/i,
      "reddit username generator",
    );
    await assertUsernames(page, "reddit username generator", 3, 30, /^[A-Za-z0-9_]+$/);
  });

  toolSpec("discord-username-generator", "suggests Discord usernames", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /username|discord/i,
      "discord username generator",
    );
    await assertUsernames(page, "discord username generator", 2, 32, /^[A-Za-z0-9_.]+$/);
  });

  toolSpec("twitch-username-generator", "suggests Twitch usernames", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /username|twitch/i,
      "twitch username generator",
    );
    await assertUsernames(page, "twitch username generator", 4, 25, /^[A-Za-z0-9_]+$/);
  });

  /* ---- the list, group and team generators ------------------------------ */

  toolSpec("list-randomizer", "shuffles the whole list", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /shuffle|random order|reorder/i,
      "list randomizer",
    );
    const items = ["one", "two", "three", "four", "five", "six"];
    await fillTestId(page, "list-source", items.join("\n"));
    await clickButton(page, "Shuffle the list");
    await sleep(400);
    const results = await testIdNodes(page, "list-result");
    assertEqual(results.length, items.length, "the result must hold every item");
    assertEqual(
      results.map((result) => result["data-name"]).sort().join("|"),
      items.slice().sort().join("|"),
      "the result must be a permutation of the input",
    );
    assertEqual(
      new Set(results.map((result) => result["data-name"])).size,
      items.length,
      "an item must not show up twice",
    );
  });

  /** The group and the team generator split the names into equal groups. */
  async function assertSplit(page, subject, button) {
    const names = ["A", "B", "C", "D", "E", "F", "G"];
    const groups = 3;
    await fillTestId(page, "split-source", names.join("\n"));
    await fillTestId(page, "split-amount", groups);
    await clickButton(page, button);
    await sleep(400);

    const split = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main [data-testid="split-group"]')).map((group) => ({
        index: Number(group.getAttribute("data-index")),
        items: Array.from(group.querySelectorAll('[data-testid="split-item"]')).map(
          (item) => item.getAttribute("data-name") || "",
        ),
      })),
    );
    assertEqual(split.length, groups, `${subject}: the number of groups`);
    const all = split.flatMap((group) => group.items);
    assertEqual(all.length, names.length, `${subject}: every name must land in a group`);
    assertEqual(
      all.slice().sort().join("|"),
      names.slice().sort().join("|"),
      `${subject}: the groups must hold the names that were entered`,
    );
    assertEqual(
      new Set(all).size,
      names.length,
      `${subject}: a name must not land in two groups`,
    );
    const sizes = split.map((group) => group.items.length);
    assert(
      Math.max(...sizes) - Math.min(...sizes) <= 1,
      `${subject}: the groups must be as equal as possible, they hold ${sizes.join(",")}`,
    );
  }

  toolSpec("random-group-generator", "splits the names into groups", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /group/i,
      "random group generator",
    );
    await assertSplit(page, "random group generator", "Create the groups");

    // The generator has to tell the user which names stand in the list more
    // than once - before the split and after it.
    const names = ["Ann", "Ben", "Ann", "Cleo", "Ben"];
    await fillTestId(page, "split-source", names.join("\n"));
    let warning = await testIdNode(page, "split-duplicate-warning");
    assert(warning, "the group generator must warn about the names that occur twice");
    assertEqual(
      Number(warning["data-count"]),
      2,
      "the number of the names that occur more than once",
    );
    assertEqual(warning["data-names"], "Ann,Ben", "the names that occur more than once");
    assert(warning["text"].length > 0, "the warning must have a readable text");

    await clickButton(page, "Create the groups");
    await sleep(400);
    warning = await testIdNode(page, "split-duplicate-warning");
    assert(warning, "the warning must still be there after the split");
    assertEqual(
      Number(warning["data-count"]),
      2,
      "the number of the names that occur more than once after the split",
    );

    // Every line is dealt once, so a repeated name shows up twice.
    const items = await testIdNodes(page, "split-item");
    assertEqual(items.length, names.length, "every line must be dealt once");
    assertEqual(
      items.filter((item) => item["data-name"] === "Ann").length,
      2,
      "a repeated name must be dealt once per line the user typed",
    );

    // The assignments are exported as a CSV file: a header, one row per name
    // and the rows sorted by their group.
    const csv = await downloadBuffer(page, "group-export-csv");
    assert.match(csv.name, /\.csv$/, `the download should be named .csv, got ${csv.name}`);
    const rows = csvRows(csv.text);
    assertEqual(rows[0].join(","), "group,name", "the CSV starts with the group and the name");
    assertEqual(rows.length - 1, names.length, "the CSV holds one row per name");
    assertEqual(
      rows
        .slice(1)
        .map((row) => row[1])
        .sort()
        .join("|"),
      names.slice().sort().join("|"),
      "the CSV must hold every name",
    );
    const groupNumbers = rows.slice(1).map((row) => Number(row[0]));
    assert(
      groupNumbers.every((number) => Number.isInteger(number) && number >= 1),
      `every row of the CSV must name its group, it holds ${JSON.stringify(groupNumbers)}`,
    );
    assertEqual(
      groupNumbers
        .slice()
        .sort((a, b) => a - b)
        .join(","),
      groupNumbers.join(","),
      "the rows of the CSV must be sorted by their group",
    );
  });

  toolSpec("random-team-generator", "splits the names into teams", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /team/i,
      "random team generator",
    );
    await assertSplit(page, "random team generator", "Create the teams");

    // The teams can also be sized by the number of players that play in one
    // team: the number of teams then follows the number of names.
    const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    await fillTestId(page, "split-source", names.join("\n"));
    await selectTestId(page, "split-sizing-mode", "perTeam");
    await fillTestId(page, "split-amount", 3);
    const derived = await testIdNode(page, "split-derived-teams");
    assert(derived, "the team generator must show how many teams the players per team make");
    assertEqual(
      Number(derived["data-count"]),
      Math.ceil(names.length / 3),
      "the number of teams that follow from the players per team",
    );

    await clickButton(page, "Create the teams");
    await sleep(400);
    const teams = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main [data-testid="split-group"]')).map((group) => ({
        index: Number(group.getAttribute("data-index")),
        items: Array.from(group.querySelectorAll('[data-testid="split-item"]')).map(
          (item) => item.getAttribute("data-name") || "",
        ),
      })),
    );
    assertEqual(
      teams.length,
      Math.ceil(names.length / 3),
      "the number of teams must follow the players per team",
    );
    for (const team of teams) {
      assert(
        team.items.length <= 3,
        `a team must hold at most 3 players, it holds ${team.items.length}`,
      );
    }
    const all = teams.flatMap((team) => team.items);
    assertEqual(all.length, names.length, "every name must land in a team");
    assertEqual(
      all.slice().sort().join("|"),
      names.slice().sort().join("|"),
      "the teams must hold the names that were entered",
    );

    // The teams are exported as a CSV file: a header, one row per name and
    // the rows sorted by their team.
    const csv = await downloadBuffer(page, "team-export-csv");
    assert.match(csv.name, /\.csv$/, `the download should be named .csv, got ${csv.name}`);
    const rows = csvRows(csv.text);
    assertEqual(rows[0].join(","), "team,name", "the CSV starts with the team and the name");
    assertEqual(rows.length - 1, names.length, "the CSV holds one row per name");
    assertEqual(
      rows
        .slice(1)
        .map((row) => row[1])
        .sort()
        .join("|"),
      names.slice().sort().join("|"),
      "the CSV must hold every name",
    );
    const teamLabels = rows.slice(1).map((row) => row[0]);
    assertEqual(
      teamLabels[0],
      "A",
      "the first row of the CSV must name the first team",
    );
    assertEqual(
      teamLabels
        .slice()
        .sort()
        .join(","),
      teamLabels.join(","),
      "the rows of the CSV must be sorted by their team",
    );
  });

  /* ---- the remaining randomizers ---------------------------------------- */

  toolSpec("random-number-generator", "draws a number from a range", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /number|range|min|max/i,
      "random number generator",
    );
    await fillTestId(page, "number-min", 5);
    await fillTestId(page, "number-max", 10);
    await fillTestId(page, "number-amount", 8);
    await clickButton(page, "Draw a number");
    await sleep(400);
    const values = await testIdNodes(page, "number-value");
    assertEqual(values.length, 8, "the number of drawn numbers");
    for (const value of values) {
      const number = Number(value["data-value"]);
      assert(
        Number.isInteger(number) && number >= 5 && number <= 10,
        `a drawn number lies between 5 and 10, got ${JSON.stringify(number)}`,
      );
    }
  });

  toolSpec("random-letter-generator", "draws random letters", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /letter/i,
      "random letter generator",
    );
    await fillTestId(page, "letter-amount", 6);
    await selectTestId(page, "letter-case", "upper");
    await clickButton(page, "Draw letters");
    await sleep(400);
    let letters = await testIdNodes(page, "letter-value");
    assertEqual(letters.length, 6, "the number of drawn letters");
    for (const letter of letters) {
      assert(
        /^[A-Z]$/.test(letter["data-value"]),
        `an upper case letter is a single character from A to Z, got ${JSON.stringify(letter["data-value"])}`,
      );
    }

    await selectTestId(page, "letter-case", "lower");
    await clickButton(page, "Draw letters");
    await sleep(400);
    letters = await testIdNodes(page, "letter-value");
    assertEqual(letters.length, 6, "the number of drawn letters");
    for (const letter of letters) {
      assert(
        /^[a-z]$/.test(letter["data-value"]),
        `a lower case letter is a single character from a to z, got ${JSON.stringify(letter["data-value"])}`,
      );
    }
  });

  toolSpec("secret-santa-generator", "pairs every name with another name", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /santa|pair|partner|assignment/i,
      "secret santa generator",
    );
    const names = ["Ada", "Bert", "Cleo", "Dana", "Eli", "Fay"];
    await fillTestId(page, "santa-names", names.join("\n"));
    await clickButton(page, "Draw the pairs");
    await sleep(400);
    const pairs = await testIdNodes(page, "santa-pair");
    assertEqual(pairs.length, names.length, "every name must be in a pair");
    const givers = pairs.map((pair) => pair["data-giver"]);
    const receivers = pairs.map((pair) => pair["data-receiver"]);
    assertEqual(
      givers.slice().sort().join("|"),
      names.slice().sort().join("|"),
      "every name must give exactly once",
    );
    assertEqual(
      receivers.slice().sort().join("|"),
      names.slice().sort().join("|"),
      "every name must receive exactly once",
    );
    assertEqual(
      new Set(givers).size,
      names.length,
      "a name must not give twice",
    );
    assertEqual(
      new Set(receivers).size,
      names.length,
      "a name must not receive twice",
    );
    for (const pair of pairs) {
      assert(
        pair["data-giver"] !== pair["data-receiver"],
        `${pair["data-giver"]} must not draw themselves`,
      );
    }
  });

  toolSpec("white-elephant-generator", "draws the order of the turns", async (page) => {
    await assertOwnWorkspace(
      page,
      "Wheel of Names & Random Winner Picker",
      /turn|order|elephant/i,
      "white elephant generator",
    );
    const names = ["Ada", "Bert", "Cleo", "Dana", "Eli", "Fay"];
    await fillTestId(page, "elephant-names", names.join("\n"));
    await clickButton(page, "Draw the order");
    await sleep(400);
    const turns = await testIdNodes(page, "elephant-turn");
    assertEqual(turns.length, names.length, "every name must have a turn");
    assertEqual(
      turns.map((turn) => turn["data-name"]).sort().join("|"),
      names.slice().sort().join("|"),
      "the order must hold the names that were entered",
    );
    assertEqual(
      new Set(turns.map((turn) => turn["data-name"])).size,
      names.length,
      "a name must not have two turns",
    );
    assertEqual(
      turns.map((turn) => Number(turn["data-turn"])).join(","),
      names.map((_, index) => index + 1).join(","),
      "the turns must be numbered from one to the number of names",
    );
  });
}
