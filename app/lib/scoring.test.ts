import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { normalizeLabValue, type ConfirmedLabValue, type FastingStatus, type LabMarker } from "./labs";
import {
  ESSENTIAL_EIGHT_INPUT_IDS,
  ESSENTIAL_EIGHT_LABEL,
  ESSENTIAL_EIGHT_MINIMUM_METRICS,
  ESSENTIAL_EIGHT_VERSION,
  SCORE_CATEGORY_IDS,
  buildActionPlan,
  calculateEssentialEight,
  type ScoreCategoryId,
} from "./scoring";
import type { AnalysisDepth, AnswerMap } from "./types";

const adultRouting = { ageYears: 45, assessmentDepth: "deep" as const };

function lab(
  marker: LabMarker,
  value: number,
  unit: string,
  fastingStatus: FastingStatus = "not_stated",
  collectionDate = "2026-07-30",
): ConfirmedLabValue {
  const normalized = normalizeLabValue({ marker, value, unit });
  return {
    source: null,
    reviewed: { marker, valueText: String(value), value, unit, referenceRange: "", collectionDate, fastingStatus },
    normalized: {
      value: normalized.normalizedValue,
      unit: normalized.normalizedUnit,
      displayValue: normalized.displayValue,
    },
  };
}

/** Every metric at its top band: the published maximum of 100. */
const IDEAL_ANSWERS: AnswerMap = {
  plant_food_frequency: 5,
  diet_whole_grains: "daily",
  diet_legumes: 3,
  diet_processed_meat: "never",
  diet_sugary_drinks: 0,
  weekly_moderate_activity_minutes: 150,
  weekly_vigorous_activity_minutes: 0,
  current_tobacco_nicotine: false,
  smoking_history_former: false,
  secondhand_smoke_home: false,
  usual_sleep_hours: 7.5,
  height_cm: 175,
  weight_kg: 70,
  statin_current: false,
  diagnosed_conditions_core: ["none"],
  blood_pressure_systolic: 115,
  blood_pressure_diastolic: 75,
  bp_medication_current: false,
};
const IDEAL_LABS = [
  lab("total_cholesterol", 180, "mg/dL"),
  lab("hdl_cholesterol", 60, "mg/dL"),
  lab("hba1c", 5.2, "%"),
];

/** A mixed profile used to check the mean, coverage, and action ordering. */
const MIXED_ANSWERS: AnswerMap = {
  ...IDEAL_ANSWERS,
  plant_food_frequency: 2,
  diet_whole_grains: "sometimes",
  diet_legumes: 1,
  diet_processed_meat: "often",
  diet_sugary_drinks: 2,
  weekly_moderate_activity_minutes: 60,
  weekly_vigorous_activity_minutes: 15,
  current_tobacco_nicotine: true,
  tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  usual_sleep_hours: 6.5,
  weight_kg: 85,
  blood_pressure_systolic: 134,
  blood_pressure_diastolic: 84,
};

function adultScore(answers: AnswerMap, labs: ReadonlyArray<ConfirmedLabValue> = IDEAL_LABS, routing = adultRouting) {
  const result = calculateEssentialEight(answers, routing, labs);
  expect(result.kind).toBe("adult-score");
  if (result.kind !== "adult-score") throw new Error("Expected an adult score");
  return result;
}

function metric(answers: AnswerMap, id: ScoreCategoryId, labs: ReadonlyArray<ConfirmedLabValue> = IDEAL_LABS) {
  const category = adultScore(answers, labs).categories.find((item) => item.id === id);
  if (!category) throw new Error(`Missing category ${id}`);
  return category;
}

function points(answers: AnswerMap, id: ScoreCategoryId, labs: ReadonlyArray<ConfirmedLabValue> = IDEAL_LABS) {
  return metric(answers, id, labs).earnedPoints;
}

describe("Life's Essential 8 ledger", () => {
  test("declares real question inputs and the eight published metrics", () => {
    const ids = new Set(questionBank.map((question) => question.id));
    for (const id of ESSENTIAL_EIGHT_INPUT_IDS) expect(ids.has(id), id).toBe(true);
    expect(SCORE_CATEGORY_IDS).toEqual([
      "diet",
      "physical-activity",
      "nicotine",
      "sleep",
      "body-mass-index",
      "blood-lipids",
      "blood-glucose",
      "blood-pressure",
    ]);
    expect(ESSENTIAL_EIGHT_VERSION).toBe("essential-eight-v1");
    expect(ESSENTIAL_EIGHT_LABEL).toMatch(/Life's Essential 8/);
  });

  test("scores an ideal profile at 100 with full coverage and one source per metric", () => {
    const result = adultScore(IDEAL_ANSWERS);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
    expect(result.answeredCategoryCount).toBe(8);
    expect(result.categories.map((item) => item.id)).toEqual(SCORE_CATEGORY_IDS);
    for (const category of result.categories) {
      expect(category.maxPoints).toBe(100);
      expect(category.components).toHaveLength(1);
      expect(category.components[0].status).toBe("answered");
      expect(category.source.url).toBe("https://doi.org/10.1161/CIR.0000000000001078");
    }
  });

  test("returns the unweighted mean of the eight metrics, rounded half up", () => {
    const result = adultScore(MIXED_ANSWERS);
    const byId = Object.fromEntries(result.categories.map((item) => [item.id, item.earnedPoints]));
    expect(byId).toEqual({
      diet: 25,
      "physical-activity": 80,
      nicotine: 0,
      sleep: 70,
      "body-mass-index": 70,
      "blood-lipids": 100,
      "blood-glucose": 100,
      "blood-pressure": 50,
    });
    expect(result.score).toBe(62);
    expect(result.earnedPoints).toBe(495);
    expect(result.assessedPoints).toBe(800);
  });

  test("is unavailable under 18 or without a verified integer age", () => {
    for (const ageYears of [null, 17, 17.5, Number.NaN]) {
      expect(calculateEssentialEight(IDEAL_ANSWERS, { ageYears, assessmentDepth: "deep" }, IDEAL_LABS)).toEqual({
        kind: "not-available",
        reason: "under-18-or-age-unverified",
      });
    }
  });

  test.each([
    ["express", "express-assessment"],
    ["quick", "quick-assessment"],
  ] as const)("withholds the mean for a %s assessment even with full answers", (depth: AnalysisDepth, reason) => {
    const result = calculateEssentialEight(IDEAL_ANSWERS, { ageYears: 45, assessmentDepth: depth }, IDEAL_LABS);
    expect(result).toMatchObject({ kind: "insufficient-coverage", reason, coverage: 100, answeredCategoryCount: 8 });
    if (result.kind !== "insufficient-coverage") throw new Error("Expected insufficient coverage");
    expect(result.answeredCategories).toHaveLength(8);
    expect(result.answeredCategories[0]).toEqual({
      id: "diet",
      label: "Diet",
      coverage: 100,
      answeredComponents: 1,
      missingComponents: 0,
    });
  });

  test("needs at least five assessed metrics before a partial mean is shown", () => {
    expect(ESSENTIAL_EIGHT_MINIMUM_METRICS).toBe(5);
    const fourMetrics: AnswerMap = {
      weekly_moderate_activity_minutes: 150,
      current_tobacco_nicotine: false,
      smoking_history_former: false,
      usual_sleep_hours: 8,
      height_cm: 170,
      weight_kg: 65,
    };
    const partial = calculateEssentialEight(fourMetrics, adultRouting);
    expect(partial).toMatchObject({
      kind: "insufficient-coverage",
      reason: "answer-more-wellness-habits",
      coverage: 50,
      answeredCategoryCount: 4,
    });

    const fiveMetrics = { ...fourMetrics, blood_pressure_systolic: 118, blood_pressure_diastolic: 76 };
    const shown = adultScore(fiveMetrics, []);
    expect(shown.answeredCategoryCount).toBe(5);
    expect(shown.coverage).toBe(63);
    expect(shown.score).toBe(100);
    expect(shown.categories.filter((item) => item.components[0].status === "missing").map((item) => item.id)).toEqual([
      "diet",
      "blood-lipids",
      "blood-glucose",
    ]);
  });

  test("never lets a missing metric contribute zero points to the mean", () => {
    const withoutLabs = adultScore(IDEAL_ANSWERS, []);
    expect(withoutLabs.score).toBe(100);
    expect(withoutLabs.coverage).toBe(75);
    const lipids = withoutLabs.categories.find((item) => item.id === "blood-lipids")!;
    expect(lipids).toMatchObject({ earnedPoints: 0, assessedPoints: 0, applicablePoints: 100, coverage: 0 });
  });
});

describe("diet metric", () => {
  test.each([
    [{ plant_food_frequency: 5, diet_whole_grains: "daily", diet_legumes: 3, diet_processed_meat: "never", diet_sugary_drinks: 0 }, 100],
    [{ plant_food_frequency: 4, diet_whole_grains: "often", diet_legumes: 3, diet_processed_meat: "rarely", diet_sugary_drinks: 0 }, 80],
    [{ plant_food_frequency: 3, diet_whole_grains: "sometimes", diet_legumes: 2, diet_processed_meat: "sometimes", diet_sugary_drinks: 2 }, 50],
    [{ plant_food_frequency: 2, diet_whole_grains: "sometimes", diet_legumes: 1, diet_processed_meat: "often", diet_sugary_drinks: 2 }, 25],
    [{ plant_food_frequency: 0, diet_whole_grains: "never", diet_legumes: 0, diet_processed_meat: "daily", diet_sugary_drinks: 4 }, 0],
  ])("scales five items to the 16-point screener band %#", (items, expected) => {
    expect(points({ ...IDEAL_ANSWERS, ...items }, "diet")).toBe(expected);
  });

  test("needs all five items before placing the pattern", () => {
    const { diet_legumes: _legumes, ...rest } = IDEAL_ANSWERS;
    void _legumes;
    const category = metric(rest, "diet");
    expect(category.components[0]).toMatchObject({ status: "missing", questionId: "diet_pattern" });
  });
});

describe("physical-activity metric", () => {
  test.each([
    [150, 0, 100],
    [120, 0, 90],
    [60, 30, 90],
    [90, 0, 80],
    [60, 0, 60],
    [30, 0, 40],
    [10, 0, 20],
    [0, 0, 0],
    [0, 75, 100],
  ])("scores %i moderate + %i vigorous minutes as %i", (moderate, vigorous, expected) => {
    expect(
      points({ ...IDEAL_ANSWERS, weekly_moderate_activity_minutes: moderate, weekly_vigorous_activity_minutes: vigorous }, "physical-activity"),
    ).toBe(expected);
  });

  test("treats unanswered vigorous minutes as zero but needs moderate minutes", () => {
    const { weekly_vigorous_activity_minutes: _vigorous, ...noVigorous } = IDEAL_ANSWERS;
    void _vigorous;
    expect(points({ ...noVigorous, weekly_moderate_activity_minutes: 100 }, "physical-activity")).toBe(80);
    const { weekly_moderate_activity_minutes: _moderate, ...noModerate } = IDEAL_ANSWERS;
    void _moderate;
    expect(metric(noModerate, "physical-activity").components[0].status).toBe("missing");
  });
});

describe("nicotine metric", () => {
  test.each([
    [{ current_tobacco_nicotine: false, smoking_history_former: false }, 100],
    [{ current_tobacco_nicotine: false, smoking_history_former: true, smoking_years_since_quit: 5 }, 75],
    [{ current_tobacco_nicotine: false, smoking_history_former: true, smoking_years_since_quit: 2 }, 50],
    [{ current_tobacco_nicotine: false, smoking_history_former: true, smoking_years_since_quit: 0.5 }, 25],
    [{ current_tobacco_nicotine: true, tobacco_nicotine_context: "only_prescribed_nrt_quit_plan" }, 25],
    [{ current_tobacco_nicotine: true, tobacco_nicotine_context: "tobacco_vape_or_other_nicotine" }, 0],
    [{ current_tobacco_nicotine: true, tobacco_nicotine_context: "both" }, 0],
  ])("scores nicotine status %# as %i", (status, expected) => {
    expect(points({ ...IDEAL_ANSWERS, ...status }, "nicotine")).toBe(expected);
  });

  test("removes twenty points for indoor second-hand smoke and explains it", () => {
    const category = metric({ ...IDEAL_ANSWERS, secondhand_smoke_home: true }, "nicotine");
    expect(category.earnedPoints).toBe(80);
    expect(category.components[0].explanation).toMatch(/Twenty points are removed because someone smokes indoors/);
    expect(points({ ...IDEAL_ANSWERS, current_tobacco_nicotine: true, tobacco_nicotine_context: "both", secondhand_smoke_home: true }, "nicotine")).toBe(0);
  });

  test("marks nicotine missing when the context or quit timing is unresolved", () => {
    expect(metric({ ...IDEAL_ANSWERS, current_tobacco_nicotine: true, tobacco_nicotine_context: "unsure" }, "nicotine").components[0]).toMatchObject({
      status: "missing",
      explanation: "The current nicotine context was not resolved.",
    });
    expect(metric({ ...IDEAL_ANSWERS, smoking_history_former: true }, "nicotine").components[0].status).toBe("missing");
  });
});

describe("sleep metric", () => {
  test.each([
    [7, 100],
    [8.9, 100],
    [9, 90],
    [6, 70],
    [5, 40],
    [10, 40],
    [4, 20],
    [3.5, 0],
  ])("scores %s hours as %i", (hours, expected) => {
    expect(points({ ...IDEAL_ANSWERS, usual_sleep_hours: hours }, "sleep")).toBe(expected);
  });

  test("rejects an impossible duration as missing", () => {
    expect(metric({ ...IDEAL_ANSWERS, usual_sleep_hours: 25 }, "sleep").components[0].status).toBe("missing");
  });
});

describe("body-mass index metric", () => {
  test.each([
    [70, 100],
    [77, 70],
    [92, 30],
    [108, 15],
    [125, 0],
  ])("scores %i kg at 175 cm as %i", (weight, expected) => {
    expect(points({ ...IDEAL_ANSWERS, height_cm: 175, weight_kg: weight }, "body-mass-index")).toBe(expected);
  });

  test("needs both height and weight", () => {
    const { weight_kg: _weight, ...rest } = IDEAL_ANSWERS;
    void _weight;
    expect(metric(rest, "body-mass-index").components[0]).toMatchObject({ status: "missing", questionId: "body_mass_index" });
  });
});

describe("blood-lipids metric", () => {
  test.each([
    [189, 60, 100],
    [200, 50, 60],
    [230, 50, 40],
    [260, 50, 20],
    [290, 50, 0],
  ])("scores total %i and HDL %i mg/dL as %i", (total, hdl, expected) => {
    expect(points(IDEAL_ANSWERS, "blood-lipids", [lab("total_cholesterol", total, "mg/dL"), lab("hdl_cholesterol", hdl, "mg/dL")])).toBe(expected);
  });

  test("converts mmol/L results and removes twenty points on a statin", () => {
    const mmol = [lab("total_cholesterol", 4.6, "mmol/L"), lab("hdl_cholesterol", 1.5, "mmol/L")];
    expect(points(IDEAL_ANSWERS, "blood-lipids", mmol)).toBe(100);
    const treated = metric({ ...IDEAL_ANSWERS, statin_current: true }, "blood-lipids", mmol);
    expect(treated.earnedPoints).toBe(80);
    expect(treated.components[0].explanation).toMatch(/Twenty points are removed because you take a statin/);
  });

  test("uses the most recent result and needs total above HDL", () => {
    const labs = [
      lab("total_cholesterol", 260, "mg/dL", "not_stated", "2025-01-01"),
      lab("total_cholesterol", 180, "mg/dL", "not_stated", "2026-01-01"),
      lab("hdl_cholesterol", 60, "mg/dL"),
    ];
    expect(points(IDEAL_ANSWERS, "blood-lipids", labs)).toBe(100);
    expect(metric(IDEAL_ANSWERS, "blood-lipids", [lab("total_cholesterol", 50, "mg/dL"), lab("hdl_cholesterol", 60, "mg/dL")]).components[0].status).toBe("missing");
  });
});

describe("blood-glucose metric", () => {
  test.each([
    [5.6, 100],
    [5.7, 60],
    [6.4, 60],
    [6.5, 40],
  ])("scores HbA1c %s %% without diabetes as %i", (hba1c, expected) => {
    expect(points(IDEAL_ANSWERS, "blood-glucose", [lab("hba1c", hba1c, "%")])).toBe(expected);
  });

  test.each([
    [6.8, 40],
    [7.5, 30],
    [8.5, 20],
    [9.5, 10],
    [10, 0],
  ])("scores HbA1c %s %% with diagnosed diabetes as %i", (hba1c, expected) => {
    const diabetes = { ...IDEAL_ANSWERS, diagnosed_conditions_core: ["diabetes"] };
    const category = metric(diabetes, "blood-glucose", [lab("hba1c", hba1c, "%")]);
    expect(category.earnedPoints).toBe(expected);
    expect(category.components[0].explanation).toMatch(/^You reported diagnosed diabetes/);
  });

  test("falls back to fasting glucose only when it is confirmed fasting", () => {
    expect(points(IDEAL_ANSWERS, "blood-glucose", [lab("glucose", 95, "mg/dL", "fasting")])).toBe(100);
    expect(points(IDEAL_ANSWERS, "blood-glucose", [lab("glucose", 6.0, "mmol/L", "fasting")])).toBe(60);
    expect(points(IDEAL_ANSWERS, "blood-glucose", [lab("glucose", 130, "mg/dL", "fasting")])).toBe(40);
    expect(metric(IDEAL_ANSWERS, "blood-glucose", [lab("glucose", 95, "mg/dL", "not_fasting")]).components[0].status).toBe("missing");
  });

  test("needs HbA1c with diabetes and diagnosed conditions at all", () => {
    expect(metric({ ...IDEAL_ANSWERS, diagnosed_conditions_core: ["diabetes"] }, "blood-glucose", [lab("glucose", 95, "mg/dL", "fasting")]).components[0].status).toBe("missing");
    const { diagnosed_conditions_core: _conditions, ...rest } = IDEAL_ANSWERS;
    void _conditions;
    expect(metric(rest, "blood-glucose").components[0].explanation).toMatch(/diabetes status is unknown/);
  });
});

describe("blood-pressure metric", () => {
  test.each([
    [115, 75, 100],
    [125, 75, 75],
    [125, 82, 50],
    [135, 70, 50],
    [145, 70, 25],
    [120, 95, 25],
    [165, 70, 0],
    [120, 100, 0],
  ])("scores %i/%i mmHg as %i", (systolic, diastolic, expected) => {
    expect(points({ ...IDEAL_ANSWERS, blood_pressure_systolic: systolic, blood_pressure_diastolic: diastolic }, "blood-pressure")).toBe(expected);
  });

  test("removes twenty points on treatment and needs both numbers", () => {
    const treated = metric({ ...IDEAL_ANSWERS, bp_medication_current: true }, "blood-pressure");
    expect(treated.earnedPoints).toBe(80);
    expect(treated.components[0].explanation).toMatch(/Twenty points are removed because you take blood-pressure medicine/);
    const { blood_pressure_diastolic: _diastolic, ...rest } = IDEAL_ANSWERS;
    void _diastolic;
    expect(metric(rest, "blood-pressure").components[0].status).toBe("missing");
    expect(metric({ ...IDEAL_ANSWERS, blood_pressure_systolic: 80, blood_pressure_diastolic: 90 }, "blood-pressure").components[0].status).toBe("missing");
  });
});

describe("action plan", () => {
  test("returns the three largest metric deficits as habit actions", () => {
    const plan = buildActionPlan([], adultScore(MIXED_ANSWERS));
    expect(plan.map((item) => [item.categoryId, item.opportunity])).toEqual([
      ["nicotine", 100],
      ["diet", 75],
      ["blood-pressure", 50],
    ]);
    for (const item of plan) {
      expect(item.kind).toBe("habit");
      expect(item.id).toBe(`habit-${item.categoryId}`);
      expect(item.sources[0].url).toBe("https://doi.org/10.1161/CIR.0000000000001078");
      expect(item.nextStep).not.toMatch(/\d+(?:\.\d+)?\s*%/);
    }
  });

  test("breaks ties in published metric order and skips perfect or missing metrics", () => {
    const plan = buildActionPlan([], adultScore({ ...IDEAL_ANSWERS, usual_sleep_hours: 6, weight_kg: 77 }, []));
    expect(plan.map((item) => item.categoryId)).toEqual(["sleep", "body-mass-index"]);
  });

  test("returns nothing without an adult score", () => {
    expect(buildActionPlan([], calculateEssentialEight(IDEAL_ANSWERS, { ageYears: 17, assessmentDepth: "deep" }))).toEqual([]);
    expect(buildActionPlan([], calculateEssentialEight(IDEAL_ANSWERS, { ageYears: 45, assessmentDepth: "quick" }, IDEAL_LABS))).toEqual([]);
  });
});
