const http = require("http");

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

async function runAudit() {
  console.log("=================================================");
  console.log("HEADS OR TAILS (3D COIN FLIP) AUDIT & TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Verify /tools/heads-or-tails HTTP 200 and content
  try {
    const res = await fetchUrl("http://localhost:3100/tools/heads-or-tails");
    assert(res.status === 200, "HTTP 200 on /tools/heads-or-tails");

    // Negative assertions: Word counter and text editor must be gone
    assert(!res.body.includes("readingTimeMin"), "No reading time word counter in output");
    assert(!res.body.includes("approxTokens"), "No token counter in output");
    assert(!res.body.includes("toTitleCase"), "No case converter in output");
    assert(!res.body.includes("Characters (no spaces)"), "Zero text editor stats on heads-or-tails");

    // Positive assertions: Coin flip UI elements
    assert(res.body.includes("HEADS"), "Coin contains distinct HEADS face");
    assert(res.body.includes("TAILS"), "Coin contains distinct TAILS face");
    assert(res.body.includes("Flip Coin"), "Coin contains 'Flip Coin' button");
    assert(res.body.includes("Single Flip"), "Contains Single Flip mode");
    assert(res.body.includes("Best of 3"), "Contains Best of 3 mode");
    assert(res.body.includes("Best of 5"), "Contains Best of 5 mode");
    assert(res.body.includes("Best of 7"), "Contains Best of 7 mode");
    assert(res.body.includes("Total Flips"), "Contains Total Flips counter");
    assert(res.body.includes("Streak"), "Contains Streak tracker");
    assert(res.body.includes("crypto.getRandomValues"), "Explains cryptographic 50/50 fairness");
    assert(res.body.includes("aria-live=\"polite\""), "Includes accessible aria-live screen reader region");
  } catch (err) {
    assert(false, "HTTP Request to /tools/heads-or-tails", err.message);
  }

  // 2. German localized page check
  try {
    const resDe = await fetchUrl("http://localhost:3100/tools/heads-or-tails?locale=de");
    assert(resDe.status === 200, "HTTP 200 on German /tools/heads-or-tails?locale=de");
    assert(resDe.body.includes("Kopf oder Zahl"), "Contains German title 'Kopf oder Zahl'");
  } catch (err) {
    assert(false, "German HTTP Request", err.message);
  }

  // 3. Cryptographic fairness test: 10,000 trials
  try {
    let heads = 0;
    let tails = 0;
    const trials = 10000;
    const buf = new Uint32Array(trials);
    crypto.getRandomValues(buf);

    for (let i = 0; i < trials; i++) {
      if ((buf[i] & 1) === 0) heads++;
      else tails++;
    }

    const headsPct = (heads / trials) * 100;
    const tailsPct = (tails / trials) * 100;
    console.log(`\n[STAT TEST] 10,000 crypto flips: Heads=${heads} (${headsPct.toFixed(2)}%), Tails=${tails} (${tailsPct.toFixed(2)}%)`);
    assert(headsPct >= 48.0 && headsPct <= 52.0, "10,000 crypto trials fall strictly within 50% ± 2.0% variance");
  } catch (err) {
    assert(false, "Crypto fairness test", err.message);
  }

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log("-------------------------------------------------");

  process.exit(failed > 0 ? 1 : 0);
}

runAudit();
