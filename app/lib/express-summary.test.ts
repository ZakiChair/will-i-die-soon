import { describe, expect, test } from "vitest";

import { buildExpressSummary } from "./express-summary";

describe("Express summary", () => {
  test("preserves raw metrics and adds the FRIEND percentile and Rikli-Jones band for the age and sex", () => {
    expect(
      buildExpressSummary({
        sex_assigned_at_birth: "female",
        reported_vo2_max_ml_kg_min: 20,
        weekly_moderate_activity_minutes: 120,
        chair_stand_30s_count: 14,
        movement_strength_days: 1,
        usual_sleep_hours: 7.5,
        sleep_refreshed: 8,
        plant_food_frequency: 4,
        diet_ultra_processed: "rarely",
      }, { ageYears: 67 }),
    ).toEqual({
      sex: "female",
      cardio: { vo2Max: 20, vo2Percentile: 50, moderateMinutes: 120 },
      strength: { chairStandCount: 14, chairStandBand: "within", strengthDays: 1 },
      sleep: { hours: 7.5, refreshed: 8 },
      nutrition: { plantPortions: 4, ultraProcessedFrequency: "rarely" },
    });
  });

  test("rounds the percentile for display and keeps the raw VO₂ max", () => {
    const summary = buildExpressSummary({ sex_assigned_at_birth: "male", reported_vo2_max_ml_kg_min: 44.05 }, { ageYears: 25 });
    expect(summary.cardio).toEqual({ vo2Max: 44.05, vo2Percentile: 38, moderateMinutes: null });
  });

  test.each([
    ["intersex", 67], [null, 67], ["other", 67], ["female", null], ["female", 17],
  ] as const)("shows values without percentile or band for sex %s at age %s", (sex, ageYears) => {
    const summary = buildExpressSummary({
      sex_assigned_at_birth: sex as never,
      reported_vo2_max_ml_kg_min: 20,
      chair_stand_30s_count: 14,
    }, { ageYears });
    expect(summary.sex).toBe(sex === "other" ? null : sex);
    expect(summary.cardio.vo2Max).toBe(20);
    expect(summary.cardio.vo2Percentile).toBeNull();
    expect(summary.strength.chairStandCount).toBe(14);
    expect(summary.strength.chairStandBand).toBeNull();
  });

  test("keeps the chair-stand count visible before age 60 without a band", () => {
    const summary = buildExpressSummary({ sex_assigned_at_birth: "male", chair_stand_30s_count: 18 }, { ageYears: 45 });
    expect(summary.strength).toEqual({ chairStandCount: 18, chairStandBand: null, strengthDays: null });
  });

  test("defaults to no age, so no norm is applied", () => {
    const summary = buildExpressSummary({ sex_assigned_at_birth: "male", reported_vo2_max_ml_kg_min: 40, chair_stand_30s_count: 12 });
    expect(summary.cardio.vo2Percentile).toBeNull();
    expect(summary.strength.chairStandBand).toBeNull();
  });

  test("treats skipped and invalid values as missing while keeping real zeroes", () => {
    const summary = buildExpressSummary({
      reported_vo2_max_ml_kg_min: null,
      weekly_moderate_activity_minutes: 0,
      chair_stand_30s_count: -1,
      movement_strength_days: Number.NaN,
      usual_sleep_hours: 0,
      sleep_refreshed: 0,
      plant_food_frequency: 0,
      diet_ultra_processed: "not-an-option",
    }, { ageYears: 67 });

    expect(summary.sex).toBeNull();
    expect(summary.cardio).toEqual({ vo2Max: null, vo2Percentile: null, moderateMinutes: 0 });
    expect(summary.strength).toEqual({ chairStandCount: null, chairStandBand: null, strengthDays: null });
    expect(summary.sleep).toEqual({ hours: 0, refreshed: 0 });
    expect(summary.nutrition).toEqual({ plantPortions: 0, ultraProcessedFrequency: null });
  });
});
