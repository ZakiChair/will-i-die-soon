import { describe, expect, test } from "vitest";

import {
  baselineDeathAgeFor,
  buildPillarBreakdowns,
  estimateLongevity,
} from "./longevity";
import type { AnswerMap, ProfileContext } from "./types";

const adult: ProfileContext = { age: 40, countryCode: "CH" };

const healthyAnswers: AnswerMap = {
  sex_assigned_at_birth: "male",
  height_cm: 180,
  weight_kg: 75,
  weekly_moderate_activity_minutes: 320,
  walking_pace_self_rated: "brisk",
  stair_flights_capacity: "six_plus",
  usual_sleep_hours: 7.5,
  sleep_snoring: "no",
  plant_food_frequency: 5,
  diet_processed_meat: "never",
  diet_sugary_drinks: 0,
  current_tobacco_nicotine: false,
  smoking_history_former: false,
  alcohol_frequency: "never",
  diagnosed_conditions_core: ["none"],
  family_early_cvd: false,
  sedentary_total_hours: 5,
  movement_strength_days: 3,
};

const riskyAnswers: AnswerMap = {
  sex_assigned_at_birth: "male",
  height_cm: 175,
  weight_kg: 112,
  weekly_moderate_activity_minutes: 0,
  walking_pace_self_rated: "slow",
  stair_flights_capacity: "none",
  usual_sleep_hours: 5,
  sleep_snoring: "yes",
  sleep_daytime_sleepiness: "daily",
  plant_food_frequency: 0,
  diet_processed_meat: "daily",
  diet_sugary_drinks: 14,
  current_tobacco_nicotine: true,
  tobacco_detail_frequency: 25,
  smoking_total_years: 30,
  alcohol_frequency: "four_plus_weekly",
  alcohol_detail_heavy_episode: "weekly",
  diagnosed_conditions_core: ["diabetes", "heart_vascular"],
  family_early_cvd: true,
  sedentary_total_hours: 12,
  movement_strength_days: 0,
};

describe("baselineDeathAgeFor", () => {
  test("interpolates remaining life expectancy by age and sex", () => {
    const at40 = baselineDeathAgeFor(40, "male", "CH");
    const at41 = baselineDeathAgeFor(41, "male", "CH");
    expect(at40).toBeGreaterThan(80);
    expect(at40).toBeLessThan(90);
    // L'âge de décès de référence progresse doucement avec l'âge atteint.
    expect(at41).toBeGreaterThan(at40 - 1);
    expect(at41 - at40).toBeLessThan(1);
  });

  test("orders sexes and applies country offsets", () => {
    expect(baselineDeathAgeFor(40, "female", "CH")).toBeGreaterThan(
      baselineDeathAgeFor(40, "male", "CH"),
    );
    expect(baselineDeathAgeFor(40, "male", "CH")).toBeGreaterThan(
      baselineDeathAgeFor(40, "male", "US"),
    );
    const unspecified = baselineDeathAgeFor(40, "unspecified", "CH");
    expect(unspecified).toBeGreaterThan(baselineDeathAgeFor(40, "male", "CH"));
    expect(unspecified).toBeLessThan(baselineDeathAgeFor(40, "female", "CH"));
  });

  test("clamps outside the table anchors", () => {
    expect(baselineDeathAgeFor(104, "female", "CH")).toBeGreaterThan(104);
    expect(baselineDeathAgeFor(10, "male", "GB")).toBeGreaterThan(70);
  });
});

describe("buildPillarBreakdowns", () => {
  test("returns the four pillars in presentation order", () => {
    const pillars = buildPillarBreakdowns(healthyAnswers, adult);
    expect(pillars.map((pillar) => pillar.pillar)).toEqual([
      "cardio-energy",
      "strength-neural",
      "sleep-circadian",
      "nutrition-metabolic",
    ]);
  });

  test("scores a healthy profile above a risky one on every pillar", () => {
    const healthy = buildPillarBreakdowns(healthyAnswers, adult);
    const risky = buildPillarBreakdowns(riskyAnswers, adult);
    for (let index = 0; index < healthy.length; index += 1) {
      expect(healthy[index].score).not.toBeNull();
      expect(risky[index].score).not.toBeNull();
      expect(healthy[index].score!).toBeGreaterThan(risky[index].score!);
    }
  });

  test("returns null scores with no answers instead of inventing values", () => {
    const pillars = buildPillarBreakdowns({}, adult);
    expect(pillars.every((pillar) => pillar.score === null)).toBe(true);
    expect(pillars.every((pillar) => pillar.answeredComponents === 0)).toBe(true);
  });

  test("keeps scores within 0-100", () => {
    for (const answers of [healthyAnswers, riskyAnswers]) {
      for (const pillar of buildPillarBreakdowns(answers, adult)) {
        expect(pillar.score).toBeGreaterThanOrEqual(0);
        expect(pillar.score).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("estimateLongevity", () => {
  test("is ineligible for minors and sparse coverage", () => {
    expect(estimateLongevity(healthyAnswers, { age: 15, countryCode: "CH" }).eligible).toBe(false);
    expect(estimateLongevity({}, adult).eligible).toBe(false);
    expect(estimateLongevity({}, adult).estimatedDeathAge).toBeNull();
  });

  test("healthy profile lands above baseline, risky far below", () => {
    const healthy = estimateLongevity(healthyAnswers, adult);
    const risky = estimateLongevity(riskyAnswers, adult);

    expect(healthy.eligible).toBe(true);
    expect(risky.eligible).toBe(true);
    expect(healthy.estimatedDeathAge!).toBeGreaterThan(healthy.baselineDeathAge!);
    expect(risky.estimatedDeathAge!).toBeLessThan(risky.baselineDeathAge!);
    expect(healthy.estimatedDeathAge!).toBeGreaterThan(risky.estimatedDeathAge!);
    expect(risky.totalAdjustmentYears).toBeLessThanOrEqual(-10);
  });

  test("estimated age stays within plausible bounds", () => {
    const estimates = [
      estimateLongevity(riskyAnswers, adult),
      estimateLongevity(riskyAnswers, { age: 95, countryCode: "US" }),
      estimateLongevity(healthyAnswers, { age: 25, countryCode: "CH" }),
    ];
    for (const estimate of estimates) {
      expect(estimate.estimatedDeathAge!).toBeLessThanOrEqual(105);
      expect(estimate.range!.low).toBeLessThanOrEqual(estimate.estimatedDeathAge!);
      expect(estimate.range!.high).toBeGreaterThanOrEqual(estimate.estimatedDeathAge!);
      expect(estimate.range!.high).toBeLessThanOrEqual(105);
    }
    expect(
      estimateLongevity(riskyAnswers, { age: 95, countryCode: "US" }).estimatedDeathAge!,
    ).toBeGreaterThan(95);
  });

  test("adjustments are sorted most-negative first and identified", () => {
    const estimate = estimateLongevity(riskyAnswers, adult);
    const years = estimate.adjustments.map((adjustment) => adjustment.years);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(estimate.adjustments.map((adjustment) => adjustment.id)).toContain(
      "smoking_current",
    );
    expect(estimate.adjustments.map((adjustment) => adjustment.id)).toContain(
      "diagnosed_conditions",
    );
  });

  test("prescribed nicotine replacement alone is not counted as smoking", () => {
    const estimate = estimateLongevity(
      {
        ...healthyAnswers,
        current_tobacco_nicotine: true,
        tobacco_nicotine_context: "only_prescribed_nrt_quit_plan",
      },
      adult,
    );
    expect(
      estimate.adjustments.some((adjustment) => adjustment.id === "smoking_current"),
    ).toBe(false);
  });

  test("cause shares sum to about 100 and rank external causes first for risky young adults", () => {
    const risky = estimateLongevity(riskyAnswers, adult);
    const total = risky.causes.reduce((sum, cause) => sum + cause.share, 0);
    expect(total).toBeGreaterThanOrEqual(97);
    expect(total).toBeLessThanOrEqual(103);
    expect(risky.causes[0].share).toBeGreaterThanOrEqual(
      risky.causes[risky.causes.length - 1].share,
    );

    const youngRisky = estimateLongevity(
      { ...riskyAnswers, uses_nonmedical_opioids: true },
      { age: 25, countryCode: "CH" },
    );
    expect(youngRisky.causes[0].cause).toBe("external");
  });

  test("gains list the biggest modifiable levers with positive years", () => {
    const risky = estimateLongevity(riskyAnswers, adult);
    expect(risky.gains.length).toBeGreaterThan(0);
    expect(risky.gains.length).toBeLessThanOrEqual(4);
    expect(risky.gains[0].id).toBe("gain_quit_smoking");
    for (const gain of risky.gains) {
      expect(gain.years).toBeGreaterThan(0);
    }
    const healthy = estimateLongevity(healthyAnswers, adult);
    expect(healthy.gains).toHaveLength(0);
  });

  test("fitness age delta reflects VO2 max against the age expectation", () => {
    const fit = estimateLongevity(
      { ...healthyAnswers, reported_vo2_max_ml_kg_min: 52 },
      adult,
    );
    const unfit = estimateLongevity(
      { ...healthyAnswers, reported_vo2_max_ml_kg_min: 25 },
      adult,
    );
    expect(fit.fitnessAgeDelta!).toBeLessThan(0);
    expect(unfit.fitnessAgeDelta!).toBeGreaterThan(0);
    expect(Math.abs(unfit.fitnessAgeDelta!)).toBeLessThanOrEqual(20);
    expect(estimateLongevity(healthyAnswers, adult).fitnessAgeDelta).toBeNull();
  });

  test("range widens as coverage shrinks", () => {
    const full = estimateLongevity(healthyAnswers, adult);
    const partial = estimateLongevity(
      {
        sex_assigned_at_birth: "male",
        height_cm: 180,
        weight_kg: 75,
        weekly_moderate_activity_minutes: 200,
        usual_sleep_hours: 7,
        current_tobacco_nicotine: false,
        plant_food_frequency: 3,
        alcohol_frequency: "never",
      },
      adult,
    );
    expect(partial.eligible).toBe(true);
    const fullWidth = full.range!.high - full.range!.low;
    const partialWidth = partial.range!.high - partial.range!.low;
    expect(partialWidth).toBeGreaterThan(fullWidth);
  });
});
