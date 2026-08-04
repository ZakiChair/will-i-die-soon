import { describe, expect, test } from "vitest";

import { buildExpressSummary } from "./express-summary";

describe("Express summary", () => {
  test("preserves raw metrics and rounds body-weight ratios half-up to two decimals", () => {
    expect(
      buildExpressSummary({
        reported_vo2_max_ml_kg_min: 48.5,
        squat_one_rep_max_kg: 123,
        deadlift_one_rep_max_kg: 181,
        height_cm: 182,
        weight_kg: 80,
        usual_sleep_hours: 7.5,
        sleep_refreshed: 8,
        plant_food_frequency: 4,
        diet_ultra_processed: "rarely",
      }),
    ).toEqual({
      vo2Max: 48.5,
      bodyContext: { heightCm: 182, weightKg: 80 },
      strength: {
        squatKg: 123,
        squatBodyWeightRatio: 1.54,
        deadliftKg: 181,
        deadliftBodyWeightRatio: 2.26,
      },
      sleep: { hours: 7.5, refreshed: 8 },
      nutrition: { plantPortions: 4, ultraProcessedFrequency: "rarely" },
    });
  });

  test.each([undefined, null, 0, -80, Number.NaN, Number.POSITIVE_INFINITY])(
    "omits strength ratios for invalid body weight %s",
    (weight) => {
      const summary = buildExpressSummary({
        weight_kg: weight as never,
        squat_one_rep_max_kg: 120,
        deadlift_one_rep_max_kg: 180,
      });
      expect(summary.strength.squatBodyWeightRatio).toBeNull();
      expect(summary.strength.deadliftBodyWeightRatio).toBeNull();
    },
  );

  test("omits ratios that cannot be represented as finite numbers", () => {
    const summary = buildExpressSummary({
      weight_kg: Number.MIN_VALUE,
      squat_one_rep_max_kg: Number.MAX_VALUE,
      deadlift_one_rep_max_kg: Number.MAX_VALUE,
    });

    expect(summary.strength.squatBodyWeightRatio).toBeNull();
    expect(summary.strength.deadliftBodyWeightRatio).toBeNull();
  });

  test("rounds exact half ties up to two decimal places", () => {
    const summary = buildExpressSummary({
      weight_kg: 200,
      squat_one_rep_max_kg: 309,
    });

    expect(summary.strength.squatBodyWeightRatio).toBe(1.55);
  });

  test("treats skipped and invalid performance values as missing rather than zero", () => {
    const summary = buildExpressSummary({
      reported_vo2_max_ml_kg_min: null,
      squat_one_rep_max_kg: -1,
      deadlift_one_rep_max_kg: Number.NaN,
      usual_sleep_hours: 0,
      sleep_refreshed: 0,
      plant_food_frequency: 0,
    });

    expect(summary.vo2Max).toBeNull();
    expect(summary.strength.squatKg).toBeNull();
    expect(summary.strength.deadliftKg).toBeNull();
    expect(summary.sleep).toEqual({ hours: 0, refreshed: 0 });
    expect(summary.nutrition.plantPortions).toBe(0);
  });
});
