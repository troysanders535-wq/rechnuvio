/**
 * Functional specs for the 9 tools of the health-fitness engine.
 *
 * Every spec drives the real UI in Chrome: it fills the real number fields,
 * presses the real unit switch and reads the real rendered result. The
 * expected values are computed from the published formulas - BMI = kg / m²
 * (WHO), the Mifflin-St Jeor equation for the basal metabolic rate (Am. J.
 * Clin. Nutr. 52, 1990) with the standard activity factor 1.55 for moderate
 * activity, 2 g of protein per kg of body weight and 35 ml of water per kg.
 *
 * Where a tool cannot do what its name promises - the shared workspace only
 * shows the BMI, the TDEE, the protein target and the water target - the spec
 * asserts the promised behaviour anyway, so the defect shows up in the audit
 * evidence instead of being hidden.
 */

import assert from "node:assert";

import {
  spec,
  fillNumber,
  selectOption,
  clickButton,
  assertEqual,
  assertIncludes,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The four result cards of the workspace, keyed by their caption. */
async function results(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const out = {};
    root.querySelectorAll("div.rounded-2xl").forEach((card) => {
      const value = card.querySelector("span");
      const caption = card.querySelector("p");
      if (value && caption) {
        out[(caption.textContent || "").trim()] = (value.textContent || "").trim();
      }
    });
    return out;
  });
}

/** The value of the result card whose caption mentions the keyword. */
async function cardValue(page, keyword) {
  const all = await results(page);
  const key = Object.keys(all).find((k) => k.toLowerCase().includes(keyword.toLowerCase()));
  return key ? all[key] : null;
}

/* --------------------------------------------------------------- numbers -- */

/* The workspace starts at: male, 28 years, 75 kg, 178 cm, activity factor 1.55. */
const WEIGHT_KG = 75;
const HEIGHT_CM = 178;
const AGE = 28;

/* BMI = weight / height^2 = 75 / 1.78^2 = 23.669... -> 23.7 (WHO: 18.5-24.9 normal). */
const BMI_DEFAULT = (WEIGHT_KG / (HEIGHT_CM / 100) ** 2).toFixed(1);
/* Mifflin-St Jeor, male: 10*75 + 6.25*178 - 5*28 + 5 = 1727.5 kcal/day. */
const BMR_DEFAULT = 10 * WEIGHT_KG + 6.25 * HEIGHT_CM - 5 * AGE + 5;
/* TDEE = BMR * 1.55 (moderate activity) = 2677.6 -> 2678 kcal/day. */
const TDEE_DEFAULT = Math.round(BMR_DEFAULT * 1.55);
/* 2 g of protein per kg of body weight. */
const PROTEIN_DEFAULT = Math.round(WEIGHT_KG * 2);
/* 35 ml of water per kg of body weight = 2625 ml = 2.6 l. */
const WATER_DEFAULT = ((WEIGHT_KG * 0.035).toFixed(1));

/* A second scenario: female, 40 years, 100 kg, 170 cm. */
/* BMI = 100 / 1.7^2 = 34.60 -> 34.6 (WHO: 30 and above is obese). */
const BMI_SECOND = (100 / 1.7 ** 2).toFixed(1);
/* Mifflin-St Jeor, female: 10*100 + 6.25*170 - 5*40 - 161 = 1701.5 kcal/day. */
const BMR_SECOND = 10 * 100 + 6.25 * 170 - 5 * 40 - 161;
const TDEE_SECOND = Math.round(BMR_SECOND * 1.55);
const PROTEIN_SECOND = Math.round(100 * 2);
const WATER_SECOND = (100 * 0.035).toFixed(1);

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("bmi-calculator", "computes the body mass index", async (page) => {
    const all = await results(page);
    assertEqual(all["Normal Weight (Healthy)"], BMI_DEFAULT, "BMI of 75 kg and 178 cm is 23.7");
    assert(
      all["Normal Weight (Healthy)"] !== undefined,
      `the workspace must show the BMI category, cards: ${JSON.stringify(all)}`,
    );
  });

  spec("adult-bmi-calculator", "computes the body mass index of an adult", async (page) => {
    await fillNumber(page, 100, 1); // weight 100 kg
    await fillNumber(page, 170, 2); // height 170 cm
    await sleep(500);
    const all = await results(page);
    assertEqual(all["Obese"], BMI_SECOND, "BMI of 100 kg and 170 cm is 34.6");
    assert(
      all["Obese"] !== undefined,
      `the workspace must show the BMI category, cards: ${JSON.stringify(all)}`,
    );
  });

  spec("bmi-calculator-for-women", "computes the same body mass index for women", async (page) => {
    // The WHO defines the body mass index from the weight and the height
    // only, so the sex must not change the result.
    await selectOption(page, "female", 0);
    await sleep(400);
    const female = await results(page);
    assertEqual(
      female["Normal Weight (Healthy)"],
      BMI_DEFAULT,
      "the body mass index does not depend on the sex",
    );

    await selectOption(page, "male", 0);
    await sleep(400);
    const male = await results(page);
    assertEqual(
      male["Normal Weight (Healthy)"],
      female["Normal Weight (Healthy)"],
      "the body mass index must be the same for both sexes",
    );
  });

  spec("bmr-calculator", "shows the basal metabolic rate", async (page) => {
    const all = await results(page);
    const bmr = await cardValue(page, "bmr");
    assert(
      bmr !== null,
      `the tool must show the basal metabolic rate, cards: ${JSON.stringify(all)}`,
    );
    assertEqual(
      Math.round(Number(String(bmr).replace(/[^\d.]/g, ""))),
      Math.round(BMR_DEFAULT),
      "the Mifflin-St Jeor basal metabolic rate of this person is 1728 kcal/day",
    );
  });

  spec("carb-calculator", "shows the daily carbohydrate target", async (page) => {
    const all = await results(page);
    const carbs = await cardValue(page, "carb");
    assert(
      carbs !== null,
      `the tool must show the carbohydrate target, cards: ${JSON.stringify(all)}`,
    );
    const grams = Number(String(carbs).replace(/[^\d.]/g, ""));
    assert(grams > 0, `the carbohydrate target must be a positive amount, got ${carbs}`);
  });

  spec("macro-calculator", "shows the protein, the carbohydrate and the fat target", async (page) => {
    const all = await results(page);
    const protein = await cardValue(page, "protein");
    const carbs = await cardValue(page, "carb");
    const fat = await cardValue(page, "fat");
    assert(
      protein !== null,
      `the tool must show the protein target, cards: ${JSON.stringify(all)}`,
    );
    assert(carbs !== null, "a macro calculator must also show the carbohydrate target");
    assert(fat !== null, "a macro calculator must also show the fat target");
    assertEqual(
      Number(String(protein).replace(/[^\d.]/g, "")),
      PROTEIN_DEFAULT,
      "2 g of protein per kg of body weight is 150 g",
    );
  });

  spec("maintenance-calorie-calculator", "shows the daily maintenance calories", async (page) => {
    const all = await results(page);
    const tdee = await cardValue(page, "tdee");
    assert(
      tdee !== null,
      `the tool must show the maintenance calories, cards: ${JSON.stringify(all)}`,
    );
    assertEqual(
      Number(String(tdee).replace(/[^\d.]/g, "")),
      TDEE_DEFAULT,
      "the maintenance calories are 2678 kcal/day",
    );
  });

  spec("protein-calculator", "shows the daily protein target", async (page) => {
    const all = await results(page);
    assertEqual(
      all["Target Protein"],
      `${PROTEIN_DEFAULT}g`,
      "2 g of protein per kg of body weight is 150 g for 75 kg",
    );
    assert(
      all["Target Protein"] !== undefined,
      `the workspace must show the protein target, cards: ${JSON.stringify(all)}`,
    );
  });

  spec("tdee-calculator", "shows the total daily energy expenditure", async (page) => {
    const all = await results(page);
    const tdee = await cardValue(page, "tdee");
    assert(
      tdee !== null,
      `the tool must show the total daily energy expenditure, cards: ${JSON.stringify(all)}`,
    );
    assertEqual(
      Number(String(tdee).replace(/[^\d.]/g, "")),
      TDEE_DEFAULT,
      "the Mifflin-St Jeor basal rate 1727.5 kcal times the factor 1.55 is 2678 kcal/day",
    );
    assertIncludes(
      JSON.stringify(all),
      "TDEE",
      "the tool must label the value as the total daily energy expenditure",
    );
  });
}
