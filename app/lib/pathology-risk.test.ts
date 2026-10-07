import { describe, expect, test } from "vitest";

import { evidenceSources } from "../data/evidence";
import { questionBank } from "../data/questions";
import { normalizeLabValue, type ConfirmedLabValue, type FastingStatus, type LabMarker } from "./labs";
import {
  evaluatePathologyRisk,
  PATHOLOGY_RULESET_VERSION,
  plcom2012SixYearRisk,
  resolvePathologySources,
  score2TenYearRisk,
  shallowestDepthFor,
} from "./pathology-risk";
import { prototypePolicy, publicWellnessPolicy } from "./release-policy";
import type { AnswerMap, PathologyInstrumentId, PathologyScoreResult, ProfileContext } from "./types";

const CH: ProfileContext = { age: 50, countryCode: "CH" };
const CH_40: ProfileContext = { age: 40, countryCode: "CH" };

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

function score(
  instrument: PathologyInstrumentId,
  answers: AnswerMap,
  profile: ProfileContext = CH,
  labs: ReadonlyArray<ConfirmedLabValue> = [],
  policy = prototypePolicy,
): PathologyScoreResult {
  const result = evaluatePathologyRisk(answers, profile, labs, policy).scores.find(
    (candidate) => candidate.instrument === instrument,
  );
  if (!result) throw new Error(`No ${instrument} result`);
  return result;
}

function omit(answers: AnswerMap, ...ids: ReadonlyArray<string>): AnswerMap {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !ids.includes(id)));
}

function complete(result: PathologyScoreResult) {
  if (result.status !== "complete") throw new Error(`Expected complete, got ${result.status}`);
  return result;
}

function incomplete(result: PathologyScoreResult) {
  if (result.status !== "incomplete") throw new Error(`Expected incomplete, got ${result.status}`);
  return result;
}

function notApplicable(result: PathologyScoreResult) {
  if (result.status !== "not-applicable") throw new Error(`Expected not-applicable, got ${result.status}`);
  return result;
}

/** With the 40-year-old profile, these answers score zero FINDRISC points. */
const FINDRISC_ZERO: AnswerMap = {
  sex_assigned_at_birth: "female",
  height_cm: 170,
  weight_kg: 60,
  waist_circumference_cm: 75,
  daily_activity_30_min: true,
  plant_food_frequency: 3,
  bp_medication_ever: false,
  glucose_high_ever: false,
  family_diabetes: "no",
  diagnosed_conditions_core: ["none"],
};

const SCORE2_MALE_50: AnswerMap = {
  sex_assigned_at_birth: "male",
  diagnosed_conditions_core: ["none"],
  cvd_event_history: false,
  current_tobacco_nicotine: true,
  tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  blood_pressure_systolic: 140,
};
const SCORE2_MALE_50_LABS = [lab("total_cholesterol", 6.3, "mmol/L"), lab("hdl_cholesterol", 1.4, "mmol/L")];

describe("SCORE2 and SCORE2-OP", () => {
  test("reproduces the ESC worked example for the low-risk region", () => {
    const risk = score2TenYearRisk("male", { age: 50, smoker: true, systolic: 140, totalCholesterol: 6.3, hdl: 1.4 });
    expect(Math.round(risk * 1000) / 10).toBe(6.3);
  });

  test.each([
    ["male", "BE", "low", 6.3],
    ["male", "DE", "moderate", 8.1],
    ["male", "PL", "high", 8.8],
    ["male", "MA", "very-high", 15.1],
    ["female", "FR", "low", 4.3],
    ["female", "IT", "moderate", 5.2],
    ["female", "CZ", "high", 7.1],
    ["female", "DZ", "very-high", 14.1],
  ] as const)("recalibrates SCORE2 for %s in %s (%s)", (sex, countryCode, region, expected) => {
    const predictors = { age: 50, smoker: true, systolic: 140, totalCholesterol: 6.3, hdl: 1.4 };
    expect(Math.round(score2TenYearRisk(sex, predictors, region) * 1000) / 10).toBe(expected);
    expect(complete(score("score2", { ...SCORE2_MALE_50, sex_assigned_at_birth: sex }, { age: 50, countryCode }, SCORE2_MALE_50_LABS)).riskPercent).toBe(expected);
  });

  test.each([
    ["male", "CH", "low", 19.5, 29.2],
    ["male", "DE", "moderate", 25.2, 37.6],
    ["male", "PL", "high", 29.1, 41.6],
    ["male", "MA", "very-high", 40.7, 49.7],
    ["female", "GB", "low", 15.4, 26.0],
    ["female", "IT", "moderate", 20.4, 35.0],
    ["female", "CZ", "high", 31.1, 50.4],
    ["female", "TN", "very-high", 46.0, 60.1],
  ] as const)("recalibrates SCORE2-OP and includes diabetes for %s in %s (%s)", (sex, countryCode, region, expected, diabetic) => {
    const predictors = { age: 75, smoker: true, systolic: 140, totalCholesterol: 6.3, hdl: 1.4 };
    expect(Math.round(score2TenYearRisk(sex, predictors, region) * 1000) / 10).toBe(expected);
    expect(Math.round(score2TenYearRisk(sex, { ...predictors, diabetes: true }, region) * 1000) / 10).toBe(diabetic);
    const profile = { age: 75, countryCode };
    const answers = { ...SCORE2_MALE_50, sex_assigned_at_birth: sex };
    expect(complete(score("score2", answers, profile, SCORE2_MALE_50_LABS)).riskPercent).toBe(expected);
    expect(complete(score("score2", { ...answers, diagnosed_conditions_core: ["diabetes"] }, profile, SCORE2_MALE_50_LABS)).riskPercent).toBe(diabetic);
  });

  test("is monotonic in smoking, age, and pressure for both sexes", () => {
    for (const sex of ["male", "female"] as const) {
      const base = { age: 55, smoker: false, systolic: 130, totalCholesterol: 5.5, hdl: 1.3 };
      const reference = score2TenYearRisk(sex, base);
      expect(score2TenYearRisk(sex, { ...base, smoker: true })).toBeGreaterThan(reference);
      expect(score2TenYearRisk(sex, { ...base, age: 65 })).toBeGreaterThan(reference);
      expect(score2TenYearRisk(sex, { ...base, systolic: 160 })).toBeGreaterThan(reference);
      expect(score2TenYearRisk(sex, { ...base, hdl: 1.8 })).toBeLessThan(reference);
      expect(score2TenYearRisk(sex, { ...base, age: 75 })).toBeGreaterThan(reference);
    }
  });

  test("scores a complete adult from answers and confirmed mmol/L labs", () => {
    const result = complete(score("score2", SCORE2_MALE_50, CH, SCORE2_MALE_50_LABS));
    expect(result.riskPercent).toBe(6.3);
    expect(result.riskHorizonYears).toBe(10);
    expect(result.category).toBe("high");
    expect(result.level).toBe("high");
    expect(result.modifiers).toEqual([]);
    expect(result.sourceIds).toEqual(["score2Esc2021", "escPrevention2021", "escHeartScoreRegions"]);
    expect(result).toMatchObject({ variant: "score2", region: "low" });
    expect(result.inputs).toEqual(
      expect.arrayContaining([
        { id: "profile:age", value: 50 },
        { id: "derived:current_smoker", value: true, derived: true },
        { id: "lab:total_cholesterol", value: 6.3 },
        { id: "lab:hdl_cholesterol", value: 1.4 },
      ]),
    );
  });

  test("converts mg/dL cholesterol before scoring", () => {
    const labs = [lab("total_cholesterol", 243.6, "mg/dL"), lab("hdl_cholesterol", 54.1, "mg/dL")];
    const result = complete(score("score2", SCORE2_MALE_50, CH, labs));
    expect(result.riskPercent).toBeGreaterThanOrEqual(6.2);
    expect(result.riskPercent).toBeLessThanOrEqual(6.4);
  });

  test("uses the most recent confirmed value for a marker", () => {
    const labs = [
      lab("total_cholesterol", 8, "mmol/L", "not_stated", "2025-01-01"),
      lab("total_cholesterol", 6.3, "mmol/L", "not_stated", "2026-07-30"),
      lab("hdl_cholesterol", 1.4, "mmol/L"),
    ];
    expect(complete(score("score2", SCORE2_MALE_50, CH, labs)).riskPercent).toBe(6.3);
  });

  test("applies ESC age-banded categories", () => {
    const young = complete(
      score("score2", { ...SCORE2_MALE_50, current_tobacco_nicotine: false, blood_pressure_systolic: 120 }, { age: 42, countryCode: "CH" }, [
        lab("total_cholesterol", 4.5, "mmol/L"),
        lab("hdl_cholesterol", 1.6, "mmol/L"),
      ]),
    );
    expect(young.riskPercent).toBeLessThan(2.5);
    expect(young.category).toBe("low-to-moderate");
    expect(young.level).toBe("low");
    const older = complete(score("score2", { ...SCORE2_MALE_50, blood_pressure_systolic: 180 }, { age: 68, countryCode: "GB" }, [lab("total_cholesterol", 8, "mmol/L"), lab("hdl_cholesterol", 0.8, "mmol/L")]));
    expect(older.riskPercent).toBeGreaterThanOrEqual(10);
    expect(older.category).toBe("very-high");
  });

  test("routes people aged 70 to 89 to SCORE2-OP", () => {
    const result = complete(score("score2", { ...SCORE2_MALE_50, current_tobacco_nicotine: false }, { age: 75, countryCode: "CH" }, SCORE2_MALE_50_LABS));
    expect(result.sourceIds).toEqual(["score2OpEsc2021", "escPrevention2021", "escHeartScoreRegions"]);
    expect(result).toMatchObject({ variant: "score2-op", region: "low" });
    expect(result.riskPercent).toBeGreaterThan(0);
  });

  test("does not treat a country outside the ESC regions as European", () => {
    for (const countryCode of ["US", "CA", "OTHER"]) {
      const scores = evaluatePathologyRisk(SCORE2_MALE_50, { age: 50, countryCode }, SCORE2_MALE_50_LABS, prototypePolicy).scores;
      expect(scores.find((item) => item.instrument === "score2")).toBeUndefined();
    }
  });

  test("names every missing answer and lab when incomplete", () => {
    const result = incomplete(score("score2", { sex_assigned_at_birth: "male", diagnosed_conditions_core: ["none"] }));
    expect(result.missingInputs).toEqual(
      expect.arrayContaining([
        "cvd_event_history",
        "current_tobacco_nicotine",
        "blood_pressure_systolic",
        "lab:total_cholesterol",
        "lab:hdl_cholesterol",
      ]),
    );
    expect(result.missingInputs).not.toContain("diagnosed_conditions_core");
  });

  test("lists the published modifiers when reported", () => {
    const result = complete(
      score("score2", { ...SCORE2_MALE_50, family_early_cvd: true, statin_current: true, inflammatory_condition: false }, CH, SCORE2_MALE_50_LABS),
    );
    expect(result.modifiers).toEqual(["family_early_cvd", "statin_current"]);
  });

  test("flags declared heart, vascular, or kidney conditions as modifiers without excluding the estimate", () => {
    const heart = complete(score("score2", { ...SCORE2_MALE_50, diagnosed_conditions_core: ["heart_vascular"] }, CH, SCORE2_MALE_50_LABS));
    expect(heart.riskPercent).toBe(6.3);
    expect(heart.modifiers).toContain("declared_heart_vascular");
    expect(heart.modifiers).not.toContain("declared_kidney");
    expect(heart.inputs.some((input) => input.id === "declared_heart_vascular")).toBe(false);
    const kidney = complete(score("score2", { ...SCORE2_MALE_50, diagnosed_conditions_core: ["kidney"] }, CH, SCORE2_MALE_50_LABS));
    expect(kidney.riskPercent).toBe(6.3);
    expect(kidney.modifiers).toContain("declared_kidney");
    expect(kidney.inputs.some((input) => input.id === "declared_kidney")).toBe(false);
    const none = complete(score("score2", SCORE2_MALE_50, CH, SCORE2_MALE_50_LABS));
    expect(none.modifiers).not.toContain("declared_heart_vascular");
    expect(none.modifiers).not.toContain("declared_kidney");
  });

  test.each([
    ["age-out-of-range", SCORE2_MALE_50, { age: 39, countryCode: "CH" }],
    ["age-out-of-range", SCORE2_MALE_50, { age: 90, countryCode: "CH" }],
    ["established-cvd", { ...SCORE2_MALE_50, cvd_event_history: true }, CH],
    ["sex-not-supported", { ...SCORE2_MALE_50, sex_assigned_at_birth: "intersex" }, CH],
  ] as const)("is not applicable for %s", (reason, answers, profile) => {
    expect(notApplicable(score("score2", answers, profile, SCORE2_MALE_50_LABS)).reason).toBe(reason);
  });

  test("requests diabetes-specific inputs instead of excluding a diagnosis at age 50", () => {
    const result = incomplete(score(
      "score2",
      { ...SCORE2_MALE_50, diagnosed_conditions_core: ["diabetes"] },
      CH,
      SCORE2_MALE_50_LABS,
    ));
    expect(result.variant).toBe("score2-diabetes");
    expect(result.missingInputs).toContain("diabetes_type");
  });

  test("does not count prescribed nicotine replacement or vaping alone as smoking", () => {
    const nrt = complete(score("score2", { ...SCORE2_MALE_50, tobacco_nicotine_context: "only_prescribed_nrt_quit_plan" }, CH, SCORE2_MALE_50_LABS));
    expect(nrt.inputs).toContainEqual({ id: "derived:current_smoker", value: false, derived: true });
    const vape = complete(score("score2", { ...SCORE2_MALE_50, tobacco_detail_products: ["vape"] }, CH, SCORE2_MALE_50_LABS));
    expect(vape.inputs).toContainEqual({ id: "derived:current_smoker", value: false, derived: true });
    expect(vape.riskPercent).toBeLessThan(6.3);
  });
});

describe("SCORE2-Diabetes", () => {
  const profile = { age: 60, countryCode: "CH" };
  const answers: AnswerMap = {
    sex_assigned_at_birth: "male",
    diagnosed_conditions_core: ["diabetes"],
    diabetes_type: "type_2",
    diabetes_age_at_diagnosis: 60,
    cvd_event_history: false,
    current_tobacco_nicotine: false,
    blood_pressure_systolic: 140,
  };
  const labs = [
    lab("total_cholesterol", 5.5, "mmol/L"),
    lab("hdl_cholesterol", 1.3, "mmol/L"),
    lab("hba1c", 50, "mmol/mol"),
    lab("egfr", 90, "mL/min/1.73m²"),
  ];

  test.each([
    ["CH", "low", 8.4, "moderate"],
    ["DE", "moderate", 11.0, "high"],
    ["PL", "high", 12.5, "high"],
    ["MA", "very-high", 20.3, "very-high"],
  ] as const)("reproduces the published example in %s (%s)", (countryCode, region, riskPercent, category) => {
    const result = complete(score("score2", answers, { ...profile, countryCode }, labs));
    expect(result).toMatchObject({
      variant: "score2-diabetes",
      region,
      riskPercent,
      category,
      riskHorizonYears: 10,
    });
    expect(result.sourceIds).toContain("score2DiabetesEsc2023");
  });

  test.each([
    ["CH", 6.1, "moderate"],
    ["DE", 7.6, "moderate"],
    ["PL", 11.1, "high"],
    ["MA", 20.6, "very-high"],
  ] as const)("uses the published female coefficients in %s", (countryCode, riskPercent, category) => {
    expect(complete(score("score2", { ...answers, sex_assigned_at_birth: "female" }, { ...profile, countryCode }, labs)))
      .toMatchObject({ variant: "score2-diabetes", riskPercent, category });
  });

  test("requires diabetes type, age at diagnosis, and confirmed HbA1c and eGFR", () => {
    const result = incomplete(score("score2", omit(answers, "diabetes_type", "diabetes_age_at_diagnosis"), profile));
    expect(result.missingInputs).toEqual(expect.arrayContaining([
      "diabetes_type", "diabetes_age_at_diagnosis", "lab:hba1c", "lab:egfr",
    ]));
    expect(result.variant).toBe("score2-diabetes");
  });

  test("keeps type 1 outside the model and an unknown type incomplete", () => {
    expect(notApplicable(score("score2", { ...answers, diabetes_type: "type_1" }, profile, labs)).reason)
      .toBe("diabetes-type-not-covered");
    expect(incomplete(score("score2", { ...answers, diabetes_type: "unknown" }, profile, labs)).missingInputs)
      .toContain("diabetes_type");
  });

  test("does not calculate from a diagnosis age greater than the current age", () => {
    expect(incomplete(score("score2", { ...answers, diabetes_age_at_diagnosis: 65 }, profile, labs)).missingInputs)
      .toContain("diabetes_age_at_diagnosis");
  });

  test("flags eGFR under 45 independently of the calculated estimate", () => {
    const result = complete(score("score2", answers, profile, [...labs.slice(0, 3), lab("egfr", 40, "mL/min/1.73m²")]));
    expect(result.modifiers).toContain("egfr-below-45");
  });
});

describe("PREVENT-ASCVD", () => {
  const profile = { age: 50, countryCode: "US" };
  const answers: AnswerMap = {
    sex_assigned_at_birth: "female",
    diagnosed_conditions_core: ["diabetes"],
    cvd_event_history: false,
    current_tobacco_nicotine: false,
    blood_pressure_systolic: 160,
    bp_medication_ever: true,
    bp_medication_current: true,
    statin_current: false,
  };
  const labs = [
    lab("total_cholesterol", 200, "mg/dL"),
    lab("hdl_cholesterol", 45, "mg/dL"),
    lab("egfr", 90, "mL/min/1.73m²"),
  ];

  test.each([
    ["female", 9.2, "intermediate"],
    ["male", 10.2, "high"],
  ] as const)("matches the PREVENT base-model fixture for %s", (sex, riskPercent, category) => {
    const result = complete(score("prevent", { ...answers, sex_assigned_at_birth: sex }, profile, labs));
    expect(result).toMatchObject({ riskPercent, category, riskHorizonYears: 10 });
    expect(result.sourceIds).toContain("preventKhan2024");
    expect(result.inputs).toContainEqual({ id: "bp_medication_current", value: true });
  });

  test("uses only one cardiovascular card for the United States", () => {
    const synthesis = evaluatePathologyRisk(answers, profile, labs, prototypePolicy);
    expect(synthesis.scores.filter((item) => item.instrument === "prevent" || item.instrument === "score2"))
      .toHaveLength(1);
  });

  test("derives no current blood-pressure treatment only when history supports it", () => {
    const without = omit(answers, "bp_medication_current");
    expect(complete(score("prevent", { ...without, bp_medication_ever: false }, profile, labs)).inputs)
      .toContainEqual({ id: "bp_medication_current", value: false, derived: true });
    expect(incomplete(score("prevent", without, profile, labs)).missingInputs).toContain("bp_medication_current");
  });

  test("names missing eGFR and statin use rather than imputing", () => {
    const missing = incomplete(score("prevent", omit(answers, "statin_current"), profile, labs.slice(0, 2)));
    expect(missing.missingInputs).toEqual(expect.arrayContaining(["lab:egfr", "statin_current"]));
  });

  test("accepts the published cholesterol bounds in mmol/L and in mg/dL", () => {
    const withLipids = (total: ConfirmedLabValue, hdl: ConfirmedLabValue) =>
      score("prevent", answers, profile, [total, hdl, labs[2]]);
    for (const [total, hdl] of [
      [lab("total_cholesterol", 3.36, "mmol/L"), lab("hdl_cholesterol", 1.2, "mmol/L")],
      [lab("total_cholesterol", 8.28, "mmol/L"), lab("hdl_cholesterol", 2.59, "mmol/L")],
      [lab("total_cholesterol", 5, "mmol/L"), lab("hdl_cholesterol", 0.52, "mmol/L")],
      [lab("total_cholesterol", 130, "mg/dL"), lab("hdl_cholesterol", 20, "mg/dL")],
      [lab("total_cholesterol", 320, "mg/dL"), lab("hdl_cholesterol", 100, "mg/dL")],
    ]) {
      expect(withLipids(total, hdl).status, `${total.reviewed.valueText} / ${hdl.reviewed.valueText}`).toBe("complete");
    }
    for (const [total, hdl] of [
      [lab("total_cholesterol", 3.35, "mmol/L"), lab("hdl_cholesterol", 1.2, "mmol/L")],
      [lab("total_cholesterol", 8.29, "mmol/L"), lab("hdl_cholesterol", 1.2, "mmol/L")],
      [lab("total_cholesterol", 5, "mmol/L"), lab("hdl_cholesterol", 0.51, "mmol/L")],
      [lab("total_cholesterol", 5, "mmol/L"), lab("hdl_cholesterol", 2.6, "mmol/L")],
      [lab("total_cholesterol", 321, "mg/dL"), lab("hdl_cholesterol", 45, "mg/dL")],
    ]) {
      expect(notApplicable(withLipids(total, hdl)).reason).toBe("outside-validated-range");
    }
  });

  test("does not extrapolate beyond the published age, lab or pressure bounds", () => {
    expect(notApplicable(score("prevent", answers, { age: 80, countryCode: "US" }, labs)).reason).toBe("age-out-of-range");
    expect(notApplicable(score("prevent", { ...answers, blood_pressure_systolic: 210 }, profile, labs)).reason)
      .toBe("outside-validated-range");
    expect(notApplicable(score("prevent", answers, profile, [lab("total_cholesterol", 350, "mg/dL"), ...labs.slice(1)])).reason)
      .toBe("outside-validated-range");
  });
});

describe("WHO 2019 printed cardiovascular charts", () => {
  const answers: AnswerMap = {
    sex_assigned_at_birth: "male",
    diagnosed_conditions_core: ["none"],
    cvd_event_history: false,
    current_tobacco_nicotine: true,
    tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
    blood_pressure_systolic: 140,
    height_cm: 170,
    weight_kg: 80,
  };
  const cholesterol = [lab("total_cholesterol", 5, "mmol/L")];

  test.each([
    ["PE", "andean-latin-america", 11, "high"],
    ["TJ", "central-asia", 30, "very-high"],
  ] as const)("matches the published 60-year-old vector in %s", (countryCode, region, riskPercent, level) => {
    const result = complete(score("who-cvd", answers, { age: 60, countryCode }, cholesterol));
    expect(result).toMatchObject({ variant: "laboratory", region, riskPercent, level, riskHorizonYears: 10 });
    expect(result.sourceIds).toContain("whoCvdCharts2019");
  });

  test("uses the Canadian region and selects the non-laboratory chart without cholesterol", () => {
    const profile = { age: 60, countryCode: "CA" };
    const result = complete(score("who-cvd", { ...answers, sex_assigned_at_birth: "female", current_tobacco_nicotine: false }, profile));
    expect(result).toMatchObject({ variant: "non-laboratory", region: "high-income-north-america" });
    expect(result.inputs).toContainEqual(expect.objectContaining({ id: "derived:body_mass_index" }));
    expect(result.inputs.some((input) => input.id.startsWith("lab:"))).toBe(false);
    const withLab = complete(score("who-cvd", answers, profile, cholesterol));
    expect(withLab.variant).toBe("laboratory");
  });

  test("needs cholesterol for someone with diabetes rather than ignoring it", () => {
    const result = incomplete(score("who-cvd", { ...answers, diagnosed_conditions_core: ["diabetes"] }, { age: 60, countryCode: "CA" }));
    expect(result).toMatchObject({ variant: "laboratory", missingInputs: ["lab:total_cholesterol"] });
  });

  test("prints a zero cell as zero and retains the low percentage band", () => {
    const result = complete(score("who-cvd", {
      ...answers,
      sex_assigned_at_birth: "female",
      current_tobacco_nicotine: false,
      blood_pressure_systolic: 110,
    }, { age: 40, countryCode: "AU" }, [lab("total_cholesterol", 3.5, "mmol/L")]));
    expect(result).toMatchObject({ riskPercent: 0, category: "under-5", level: "low" });
  });

  test("uses inclusive lower boundaries for age, pressure and cholesterol", () => {
    const profile = { age: 60, countryCode: "TJ" };
    const base = { ...answers };
    const risk = (age: number, pressure: number, cholesterolValue: number) =>
      complete(score("who-cvd", { ...base, blood_pressure_systolic: pressure }, { ...profile, age }, [
        lab("total_cholesterol", cholesterolValue, "mmol/L"),
      ])).riskPercent;
    expect(risk(60, 140, 5)).toBe(30);
    expect(risk(59, 140, 5)).toBe(22);
    expect(risk(60, 139, 5)).toBe(22);
    expect(risk(60, 140, 4.99)).toBe(24);
  });

  test("uses BMI bands for the non-laboratory table", () => {
    const profile = { age: 60, countryCode: "TJ" };
    const withWeight = (weight: number) =>
      complete(score("who-cvd", { ...answers, height_cm: 170, weight_kg: weight }, profile)).riskPercent;
    expect(withWeight(86.4)).toBe(30);
    expect(withWeight(86.7)).toBe(35);
  });

  test("compares smoking cessation against the same WHO chart cell", () => {
    const result = complete(score("who-cvd", answers, { age: 60, countryCode: "PE" }, cholesterol));
    expect(result.gain).toMatchObject({
      habits: ["no-smoking"],
      category: "5-to-9",
      riskPercent: 8,
    });
    expect(result.riskPercent).toBe(11);
  });

  test("does not invent a region for OTHER and preserves the 40–74 age range", () => {
    expect(notApplicable(score("who-cvd", answers, { age: 60, countryCode: "OTHER" })).reason).toBe("region-not-calibrated");
    expect(notApplicable(score("who-cvd", answers, { age: 75, countryCode: "CA" })).reason).toBe("age-out-of-range");
  });
});

describe("FINDRISC", () => {
  test("scores zero points as low risk with the published one percent", () => {
    const result = complete(score("findrisc", FINDRISC_ZERO, CH_40));
    expect(result).toMatchObject({ points: 0, maxPoints: 26, category: "low", level: "low", riskPercent: 1, riskHorizonYears: 10 });
    expect(result.sourceIds).toEqual(["findriscLindstrom2003"]);
  });

  test("scores the fifteen-point example as high risk with thirty-three percent", () => {
    const result = complete(
      score("findrisc", {
        sex_assigned_at_birth: "male",
        height_cm: 175,
        weight_kg: 95, // BMI 31 → 3
        waist_circumference_cm: 105, // > 102 → 4
        daily_activity_30_min: false, // 2
        plant_food_frequency: 0, // 1
        bp_medication_ever: false,
        glucose_high_ever: false,
        family_diabetes: "other_relatives", // 3
        diagnosed_conditions_core: ["none"],
      }), // age 50 → 2
    );
    expect(result).toMatchObject({ points: 15, category: "high", level: "high", riskPercent: 33 });
  });

  test("reaches the maximum of 26 points", () => {
    const result = complete(
      score("findrisc", {
        sex_assigned_at_birth: "female",
        height_cm: 160,
        weight_kg: 90,
        waist_circumference_cm: 95,
        daily_activity_30_min: false,
        plant_food_frequency: 0,
        bp_medication_ever: true,
        glucose_high_ever: true,
        family_diabetes: "first_degree",
        diagnosed_conditions_core: ["none"],
      }, { age: 66, countryCode: "CH" }),
    );
    expect(result).toMatchObject({ points: 26, category: "very-high", level: "very-high", riskPercent: 50 });
  });

  test("uses sex-specific waist thresholds", () => {
    const female = complete(score("findrisc", { ...FINDRISC_ZERO, waist_circumference_cm: 85 }, CH_40));
    expect(female.points).toBe(3);
    const male = complete(score("findrisc", { ...FINDRISC_ZERO, sex_assigned_at_birth: "male", waist_circumference_cm: 85 }, CH_40));
    expect(male.points).toBe(0);
  });

  test("flags ages outside the validated 35–64 range as an extrapolation modifier", () => {
    const young = complete(score("findrisc", FINDRISC_ZERO, { age: 30, countryCode: "CH" }));
    expect(young.modifiers).toEqual(["findrisc-age-extrapolated"]);
    const older = complete(score("findrisc", FINDRISC_ZERO, { age: 66, countryCode: "CH" }));
    expect(older.modifiers).toEqual(["findrisc-age-extrapolated"]);
    const inside = complete(score("findrisc", FINDRISC_ZERO, CH_40));
    expect(inside.modifiers).toEqual([]);
  });

  test("derives daily activity from weekly minutes and flags the derivation", () => {
    const withoutDaily = omit(FINDRISC_ZERO, "daily_activity_30_min");
    const active = complete(score("findrisc", { ...withoutDaily, weekly_moderate_activity_minutes: 150 }, CH_40));
    expect(active.points).toBe(0);
    expect(active.inputs).toContainEqual({ id: "daily_activity_30_min", value: true, derived: true });
    expect(active.inputs).toContainEqual({ id: "derived:daily_fruit_vegetables", value: true, derived: true });
    const inactive = complete(score("findrisc", { ...withoutDaily, weekly_moderate_activity_minutes: 60 }, CH_40));
    expect(inactive.points).toBe(2);
  });

  test("names missing inputs instead of assuming zero", () => {
    const partial = omit(FINDRISC_ZERO, "waist_circumference_cm", "family_diabetes");
    const result = incomplete(score("findrisc", partial));
    expect(result.missingInputs).toEqual(["waist_circumference_cm", "family_diabetes"]);
  });

  test("derives absent blood-pressure medication from a negative hypertension diagnosis", () => {
    const quickShape = omit(FINDRISC_ZERO, "bp_medication_ever", "daily_activity_30_min");
    const result = complete(
      score("findrisc", {
        ...quickShape,
        weekly_moderate_activity_minutes: 150,
        diagnosed_high_blood_pressure: false,
      }, CH_40),
    );
    expect(result.points).toBe(0);
    expect(result.inputs).toContainEqual({ id: "bp_medication_ever", value: false, derived: true });
  });

  test("keeps blood-pressure medication missing when hypertension is diagnosed or unsure", () => {
    const withoutMedication = omit(FINDRISC_ZERO, "bp_medication_ever");
    expect(
      incomplete(score("findrisc", { ...withoutMedication, diagnosed_high_blood_pressure: true }, CH_40)).missingInputs,
    ).toEqual(["bp_medication_ever"]);
    expect(incomplete(score("findrisc", withoutMedication, CH_40)).missingInputs).toEqual(["bp_medication_ever"]);
  });

  test("treats an unsure family history as missing", () => {
    expect(incomplete(score("findrisc", { ...FINDRISC_ZERO, family_diabetes: "unsure" })).missingInputs).toEqual(["family_diabetes"]);
  });

  test("is not applicable once diabetes is diagnosed", () => {
    const result = notApplicable(score("findrisc", { ...FINDRISC_ZERO, diagnosed_conditions_core: ["diabetes"] }));
    expect(result.reason).toBe("diagnosed-condition");
    expect(result.inputs).toEqual([{ id: "diagnosed_conditions_core", value: "diabetes" }]);
  });

  test("ignores implausible measurements", () => {
    const result = incomplete(score("findrisc", { ...FINDRISC_ZERO, height_cm: 20 }));
    expect(result.missingInputs).toEqual(["height_cm"]);
  });
});

describe("STOP-Bang", () => {
  const base: AnswerMap = {
    sex_assigned_at_birth: "female",
    sleep_snoring: "yes",
    sleep_daytime_sleepiness: "sometimes",
    sleep_witnessed_apnea: "no",
    diagnosed_high_blood_pressure: false,
    bp_medication_ever: false,
    height_cm: 165,
    weight_kg: 65,
    neck_circumference_cm: 34,
    diagnosed_conditions_core: ["none"],
  };
  const age55: ProfileContext = { age: 55, countryCode: "CH" };

  test("scores two points as low probability", () => {
    expect(complete(score("stop-bang", base, age55))).toMatchObject({ points: 2, maxPoints: 8, category: "low", level: "low" });
  });

  test("scores three points as intermediate for a woman without body criteria", () => {
    const result = complete(score("stop-bang", { ...base, diagnosed_high_blood_pressure: true }, age55));
    expect(result).toMatchObject({ points: 3, category: "intermediate", level: "moderate" });
    expect(result.inputs).toContainEqual({ id: "derived:hypertension", value: true, derived: true });
  });

  test("raises two STOP items plus male sex to high probability", () => {
    const result = complete(score("stop-bang", { ...base, sex_assigned_at_birth: "male", diagnosed_high_blood_pressure: true }, age55));
    expect(result).toMatchObject({ points: 4, category: "high", level: "high" });
  });

  test("counts systolic pressure of 140 or more as the pressure item", () => {
    const result = complete(score("stop-bang", { ...base, blood_pressure_systolic: 145 }, age55));
    expect(result.points).toBe(3);
  });

  test("is not applicable after a sleep apnoea diagnosis and incomplete without neck size", () => {
    expect(notApplicable(score("stop-bang", { ...base, diagnosed_conditions_core: ["sleep_apnoea"] }, age55)).reason).toBe("diagnosed-condition");
    const withoutNeck = omit(base, "neck_circumference_cm");
    expect(incomplete(score("stop-bang", withoutNeck, age55)).missingInputs).toEqual(["neck_circumference_cm"]);
  });
});

describe("AUDIT-C", () => {
  test("scores never drinking as zero without the detail questions", () => {
    const result = complete(score("audit-c", { alcohol_frequency: "never" }));
    expect(result).toMatchObject({ points: 0, maxPoints: 12, category: "negative", level: "low" });
  });

  test("applies the published sex-specific thresholds", () => {
    const answers: AnswerMap = {
      alcohol_frequency: "two_to_three_weekly",
      alcohol_detail_typical_amount: 2,
      alcohol_detail_heavy_episode: "never",
    };
    expect(complete(score("audit-c", { ...answers, sex_assigned_at_birth: "female" }))).toMatchObject({ points: 3, category: "positive", level: "moderate" });
    expect(complete(score("audit-c", { ...answers, sex_assigned_at_birth: "male" }))).toMatchObject({ points: 3, category: "negative" });
    expect(complete(score("audit-c", { ...answers, sex_assigned_at_birth: "male", alcohol_detail_typical_amount: 5 }))).toMatchObject({ points: 5, category: "positive" });
  });

  test("needs the detail answers once drinking is reported", () => {
    const reported = incomplete(score("audit-c", { alcohol_frequency: "monthly_or_less" }));
    expect(reported.missingInputs).toEqual(["alcohol_detail_typical_amount", "alcohol_detail_heavy_episode"]);
    expect(reported).not.toHaveProperty("conditionalInputs");
  });

  test("names the detail answers an unknown drinking frequency may still require", () => {
    const unknown = incomplete(score("audit-c", {}));
    expect(unknown.missingInputs).toEqual(["alcohol_frequency"]);
    expect(unknown.conditionalInputs).toEqual(["alcohol_detail_typical_amount", "alcohol_detail_heavy_episode"]);
  });
});

describe("PHQ-2 and GAD-2", () => {
  test("screen positive at three points", () => {
    expect(complete(score("phq-2", { low_interest_frequency: "several_days", mood_low_frequency: "more_than_half" }))).toMatchObject({ points: 3, maxPoints: 6, category: "positive", level: "moderate" });
    expect(complete(score("gad-2", { anxiety_worry_frequency: "nearly_every_day", anxiety_control_worry: "not_at_all" }))).toMatchObject({ points: 3, category: "positive" });
  });

  test("stay below threshold at two points and incomplete with one item", () => {
    expect(complete(score("phq-2", { low_interest_frequency: "several_days", mood_low_frequency: "several_days" }))).toMatchObject({ points: 2, category: "negative", level: "low" });
    expect(incomplete(score("gad-2", { anxiety_worry_frequency: "several_days" })).missingInputs).toEqual(["anxiety_control_worry"]);
  });
});

describe("COPD-PS", () => {
  const symptoms: AnswerMap = {
    copd_breathless_frequency: "some",
    copd_phlegm: "never",
    copd_activity_limit: "disagree",
    smoking_history_former: true,
    current_tobacco_nicotine: false,
  };

  test("reaches the spirometry threshold at five points", () => {
    const result = complete(score("copd-ps", symptoms, { age: 62, countryCode: "CH" }));
    expect(result).toMatchObject({ points: 5, maxPoints: 10, category: "screen-positive", level: "moderate" });
    expect(result.inputs).toContainEqual({ id: "derived:ever_smoked", value: true, derived: true });
  });

  test("stays below threshold for a younger never-smoker", () => {
    const result = complete(score("copd-ps", { ...symptoms, smoking_history_former: false }, { age: 45, countryCode: "CH" }));
    expect(result).toMatchObject({ points: 1, category: "below-threshold", level: "low" });
  });

  test("is not applicable under 35 and incomplete without the smoking history", () => {
    expect(notApplicable(score("copd-ps", symptoms, { age: 34, countryCode: "CH" })).reason).toBe("age-out-of-range");
    const withoutSmoking = omit(symptoms, "smoking_history_former", "current_tobacco_nicotine");
    expect(incomplete(score("copd-ps", withoutSmoking, { age: 62, countryCode: "CH" })).missingInputs).toEqual([
      "smoking_history_former",
      "current_tobacco_nicotine",
    ]);
  });
});

describe("CAIDE", () => {
  const midlife: ProfileContext = { age: 55, countryCode: "CH" };
  const twelvePoints: AnswerMap = {
    sex_assigned_at_birth: "male", // 1
    education_years: "seven_to_nine", // 2
    blood_pressure_systolic: 150, // 2
    height_cm: 170,
    weight_kg: 93, // BMI 32.2 → 2
    weekly_moderate_activity_minutes: 30, // 1
  };

  test("scores twelve points as very high with the published twenty-year percentage", () => {
    const result = complete(score("caide", twelvePoints, midlife, [lab("total_cholesterol", 5, "mmol/L")]));
    expect(result).toMatchObject({ points: 12, maxPoints: 15, category: "very-high", level: "very-high", riskPercent: 16.4, riskHorizonYears: 20 });
    expect(result.inputs).toContainEqual({ id: "derived:physically_inactive", value: true, derived: true });
  });

  test("scores a protective profile as low", () => {
    const result = complete(
      score("caide", { sex_assigned_at_birth: "female", education_years: "ten_plus", blood_pressure_systolic: 120, height_cm: 170, weight_kg: 65, weekly_moderate_activity_minutes: 200 }, { age: 45, countryCode: "CH" }, [lab("total_cholesterol", 5, "mmol/L")]),
    );
    expect(result).toMatchObject({ points: 0, category: "low", riskPercent: 1 });
  });

  test("is restricted to ages 40 to 64 and needs a confirmed cholesterol", () => {
    expect(notApplicable(score("caide", twelvePoints, { age: 65, countryCode: "CH" })).reason).toBe("age-out-of-range");
    expect(incomplete(score("caide", twelvePoints, midlife)).missingInputs).toEqual(["lab:total_cholesterol"]);
  });
});

describe("Lee index", () => {
  const thirteenPoints: AnswerMap = {
    sex_assigned_at_birth: "male", // 2
    height_cm: 175,
    weight_kg: 70.4, // BMI 23 → 1
    diagnosed_conditions_core: ["diabetes"], // 1
    current_tobacco_nicotine: true, // 2
    functional_difficulties: ["bathing", "walking_several_blocks"], // 4
  };
  const older: ProfileContext = { age: 72, countryCode: "CH" }; // 3

  test("reproduces the published points and reads the validation-cohort mortality", () => {
    const result = complete(score("lee-index", thirteenPoints, older));
    expect(result).toMatchObject({ points: 13, maxPoints: 26, category: "high", level: "high", riskPercent: 59, riskHorizonYears: 4 });
    expect(result.modifiers).toEqual([]);
    expect(result.inputs).toContainEqual({ id: "heart_failure_diagnosed", value: false, derived: true });
  });

  test("scores a protective profile as low with the published one percent", () => {
    const result = complete(
      score(
        "lee-index",
        { sex_assigned_at_birth: "female", height_cm: 165, weight_kg: 74, diagnosed_conditions_core: ["none"], current_tobacco_nicotine: false, functional_difficulties: ["none"] },
        { age: 55, countryCode: "CH" },
      ),
    );
    expect(result).toMatchObject({ points: 0, category: "low", riskPercent: 1 });
    expect(result).not.toHaveProperty("gain");
  });

  test("caps the mortality readout at the last published point score", () => {
    const result = complete(
      score(
        "lee-index",
        { ...thirteenPoints, diagnosed_conditions_core: ["diabetes", "cancer", "lung", "heart_vascular"], heart_failure_diagnosed: true, functional_difficulties: ["bathing", "managing_finances", "walking_several_blocks", "pushing_pulling_heavy"] },
        { age: 86, countryCode: "CH" },
      ),
    );
    expect(result).toMatchObject({ points: 26, category: "very-high", riskPercent: 64 });
    expect(result.modifiers).toEqual(["lee-lung-disease-proxy"]);
  });

  test("asks about heart failure only after a heart condition is declared", () => {
    const withHeart = { ...thirteenPoints, diagnosed_conditions_core: ["heart_vascular"] };
    expect(incomplete(score("lee-index", withHeart, older)).missingInputs).toEqual(["heart_failure_diagnosed"]);
    expect(complete(score("lee-index", { ...withHeart, heart_failure_diagnosed: true }, older)).points).toBe(14);
  });

  test("compares quitting smoking against the same point table", () => {
    const result = complete(score("lee-index", thirteenPoints, older));
    expect(result.gain).toMatchObject({ habits: ["no-smoking"], points: 11, category: "high", riskPercent: 45 });
  });

  test("is restricted to ages 50 and over and names missing functional items", () => {
    expect(notApplicable(score("lee-index", thirteenPoints, { age: 49, countryCode: "CH" })).reason).toBe("age-out-of-range");
    expect(incomplete(score("lee-index", omit(thirteenPoints, "functional_difficulties"), older)).missingInputs).toEqual(["functional_difficulties"]);
  });
});

describe("PLCOm2012", () => {
  const currentSmoker: AnswerMap = {
    education_years: "ten_plus",
    education_highest_level: "secondary_diploma",
    height_cm: 170,
    weight_kg: 70,
    diagnosed_conditions_core: ["none"],
    current_tobacco_nicotine: true,
    smoking_history_former: false,
    family_lung_cancer: true,
    smoking_cigarettes_per_day: 20,
    smoking_years_total: 40,
  };
  const sixtyFive: ProfileContext = { age: 65, countryCode: "CH" };

  test("reproduces the logistic model at the centring values", () => {
    const reference = { age: 62, educationLevel: 4, bmi: 27, copd: false, personalCancer: false, familyLungCancer: false, currentSmoker: true, cigarettesPerDay: 20, yearsSmoked: 27, yearsSinceQuit: 0 };
    expect(plcom2012SixYearRisk(reference)).toBeCloseTo(1.563, 3);
    expect(plcom2012SixYearRisk({ ...reference, currentSmoker: false, yearsSinceQuit: 10 })).toBeCloseTo(0.892, 3);
  });

  test("scores a current smoker above the screening threshold", () => {
    const result = complete(score("plcom2012", currentSmoker, sixtyFive));
    expect(result).toMatchObject({ category: "screening-threshold-met", level: "high", riskPercent: 6.5, riskHorizonYears: 6 });
    expect(result.modifiers).toEqual(["plco-race-reference"]);
    expect(result.inputs).toContainEqual({ id: "smoking_years_since_quit", value: 0, derived: true });
    expect(result.gain).toMatchObject({ habits: ["no-smoking"], category: "screening-threshold-met", riskPercent: 5.1 });
  });

  test("scores a light former smoker below the threshold using the three-band education answer", () => {
    const result = complete(
      score(
        "plcom2012",
        { education_years: "seven_to_nine", height_cm: 170, weight_kg: 78, diagnosed_conditions_core: ["none"], current_tobacco_nicotine: false, smoking_history_former: true, family_lung_cancer: false, smoking_cigarettes_per_day: 10, smoking_years_total: 15, smoking_years_since_quit: 20 },
        { age: 58, countryCode: "CH" },
      ),
    );
    expect(result).toMatchObject({ category: "below-screening-threshold", level: "low", riskPercent: 0.2 });
    expect(result).not.toHaveProperty("gain");
  });

  test("flags the extrapolated ages and the lung-condition proxy", () => {
    const result = complete(score("plcom2012", { ...currentSmoker, diagnosed_conditions_core: ["lung"] }, { age: 52, countryCode: "CH" }));
    expect(result.modifiers).toEqual(["plco-race-reference", "plco-age-extrapolated", "plco-copd-proxy"]);
  });

  test("is not applicable for never-smokers or outside 50 to 80", () => {
    const never = { ...currentSmoker, current_tobacco_nicotine: false };
    expect(notApplicable(score("plcom2012", never, sixtyFive)).reason).toBe("never-smoked");
    expect(notApplicable(score("plcom2012", currentSmoker, { age: 49, countryCode: "CH" })).reason).toBe("age-out-of-range");
    expect(notApplicable(score("plcom2012", currentSmoker, { age: 81, countryCode: "CH" })).reason).toBe("age-out-of-range");
  });

  test("names the smoking history and the education follow-up when missing", () => {
    const missing = incomplete(score("plcom2012", omit(currentSmoker, "education_highest_level", "smoking_cigarettes_per_day", "family_lung_cancer"), sixtyFive));
    expect(missing.missingInputs).toEqual(["education_highest_level", "family_lung_cancer", "smoking_cigarettes_per_day"]);
    const former = incomplete(score("plcom2012", { ...currentSmoker, current_tobacco_nicotine: false, smoking_history_former: true }, sixtyFive));
    expect(former.missingInputs).toEqual(["smoking_years_since_quit"]);
  });
});

describe("release policy and audience", () => {
  test("withholds percentages but keeps categories when the policy forbids probabilities", () => {
    const result = complete(score("findrisc", FINDRISC_ZERO, CH_40, [], publicWellnessPolicy));
    expect(result).not.toHaveProperty("riskPercent");
    expect(result).not.toHaveProperty("riskHorizonYears");
    expect(result).toMatchObject({ points: 0, category: "low" });
  });

  test("returns an empty synthesis for anyone under 18", () => {
    const synthesis = evaluatePathologyRisk(FINDRISC_ZERO, { age: 17, countryCode: "CH" }, [], prototypePolicy);
    expect(synthesis).toEqual({
      rulesetVersion: PATHOLOGY_RULESET_VERSION,
      scores: [],
      labClassifications: [],
      dementiaFactors: [],
      dementiaFamilyHistory: "unanswered",
      dementiaSourceIds: [],
    });
  });

  test("evaluates all ten instruments for an adult and cites resolvable sources", () => {
    const synthesis = evaluatePathologyRisk({}, CH, [], prototypePolicy);
    expect(synthesis.scores.map((result) => result.instrument)).toEqual([
      "score2",
      "findrisc",
      "stop-bang",
      "copd-ps",
      "caide",
      "lee-index",
      "plcom2012",
      "audit-c",
      "phq-2",
      "gad-2",
    ]);
    for (const result of synthesis.scores) {
      expect(result.sourceIds.length).toBeGreaterThan(0);
      expect(resolvePathologySources(result.sourceIds)).toHaveLength(result.sourceIds.length);
      for (const id of result.sourceIds) expect(evidenceSources).toHaveProperty(id);
    }
    expect(resolvePathologySources(synthesis.dementiaSourceIds).map((source) => source.id)).toHaveLength(1);
  });

  test("never interprets free text or out-of-vocabulary values", () => {
    const result = incomplete(score("phq-2", { low_interest_frequency: "often", mood_low_frequency: "I feel low" }));
    expect(result.missingInputs).toEqual(["low_interest_frequency", "mood_low_frequency"]);
  });
});

describe("laboratory classifications", () => {
  test("classifies HbA1c against ADA thresholds in either unit", () => {
    const percent = evaluatePathologyRisk({}, CH, [lab("hba1c", 6, "%")], prototypePolicy).labClassifications;
    expect(percent).toEqual([{ marker: "hba1c", value: 6, unit: "%", category: "prediabetes-range", sourceIds: ["adaDiagnosisStandards2025"] }]);
    const mmol = evaluatePathologyRisk({}, CH, [lab("hba1c", 48, "mmol/mol")], prototypePolicy).labClassifications;
    expect(mmol[0]).toMatchObject({ marker: "hba1c", unit: "%", category: "diabetes-range" });
    expect(mmol[0].value).toBeCloseTo(6.54, 1);
  });

  test("classifies glucose only when fasting", () => {
    const fasting = evaluatePathologyRisk({}, CH, [lab("glucose", 7.2, "mmol/L", "fasting")], prototypePolicy).labClassifications;
    expect(fasting[0]).toMatchObject({ marker: "glucose", category: "diabetes-range" });
    const random = evaluatePathologyRisk({}, CH, [lab("glucose", 130, "mg/dL", "not_fasting")], prototypePolicy).labClassifications;
    expect(random[0]).toMatchObject({ marker: "glucose", unit: "mmol/L", category: "not-fasting" });
    expect(random[0].value).toBeCloseTo(7.22, 1);
  });

  test("does not call an unstated fasting status 'not fasting'", () => {
    const unstated = evaluatePathologyRisk({}, CH, [lab("glucose", 7.2, "mmol/L", "not_stated")], prototypePolicy).labClassifications;
    expect(unstated[0]).toMatchObject({ marker: "glucose", unit: "mmol/L", value: 7.2, category: "fasting-unknown" });
  });

  test("assigns KDIGO eGFR categories", () => {
    const rows = [95, 75, 50, 40, 20, 10].map((value) =>
      evaluatePathologyRisk({}, CH, [lab("egfr", value, "mL/min/1.73m²")], prototypePolicy).labClassifications[0].category,
    );
    expect(rows).toEqual(["g1", "g2", "g3a", "g3b", "g4", "g5"]);
  });

  test("ignores markers without a published classification", () => {
    expect(evaluatePathologyRisk({}, CH, [lab("ferritin", 40, "ng/mL")], prototypePolicy).labClassifications).toEqual([]);
  });
});

describe("Lancet dementia factors", () => {
  test("reports present, absent, and unanswered factors from structured answers", () => {
    const synthesis = evaluatePathologyRisk(
      {
        education_years: "seven_to_nine",
        hearing_difficulty: false,
        head_injury_history: true,
        height_cm: 170,
        weight_kg: 90,
        social_loneliness: "often",
      },
      CH,
      [lab("ldl_cholesterol", 3.5, "mmol/L")],
      prototypePolicy,
    );
    const status = Object.fromEntries(synthesis.dementiaFactors.map((factor) => [factor.id, factor.status]));
    expect(synthesis.dementiaFactors).toHaveLength(14);
    expect(status).toMatchObject({
      "less-education": "present",
      "hearing-loss": "absent",
      "head-injury": "present",
      obesity: "present",
      "social-isolation": "present",
      "high-ldl": "present",
      smoking: "unanswered",
      diabetes: "unanswered",
      "air-pollution": "unanswered",
    });
    expect(synthesis.dementiaSourceIds).toEqual(["lancetDementia2024"]);
  });

  test("ignores an implausible LDL value for the high-LDL factor", () => {
    const highLdl = (labs: ReadonlyArray<ConfirmedLabValue>) =>
      evaluatePathologyRisk({}, CH, labs, prototypePolicy).dementiaFactors.find((factor) => factor.id === "high-ldl")?.status;
    expect(highLdl([lab("ldl_cholesterol", 3.5, "mmol/L")])).toBe("present");
    expect(highLdl([lab("ldl_cholesterol", 350, "mmol/L")])).toBe("unanswered");
  });

  test("counts alcohol only from an AUDIT-C total of eight or more", () => {
    const hazardous = evaluatePathologyRisk(
      { sex_assigned_at_birth: "male", alcohol_frequency: "two_to_three_weekly", alcohol_detail_typical_amount: 3, alcohol_detail_heavy_episode: "never" },
      CH, [], prototypePolicy,
    );
    expect(hazardous.dementiaFactors.find((factor) => factor.id === "excessive-alcohol")?.status).toBe("absent");
    const heavy = evaluatePathologyRisk(
      { sex_assigned_at_birth: "male", alcohol_frequency: "four_plus_weekly", alcohol_detail_typical_amount: 5, alcohol_detail_heavy_episode: "monthly" },
      CH, [], prototypePolicy,
    );
    expect(heavy.dementiaFactors.find((factor) => factor.id === "excessive-alcohol")?.status).toBe("present");
  });

  test("derives depression from a positive PHQ-2 or a reported history", () => {
    const screen = evaluatePathologyRisk({ low_interest_frequency: "more_than_half", mood_low_frequency: "more_than_half" }, CH, [], prototypePolicy);
    expect(screen.dementiaFactors.find((factor) => factor.id === "depression")?.status).toBe("present");
    const history = evaluatePathologyRisk({ depression_history: false }, CH, [], prototypePolicy);
    expect(history.dementiaFactors.find((factor) => factor.id === "depression")?.status).toBe("absent");
  });

  test("keeps family history as context beside the fourteen factors, never as a factor", () => {
    expect(evaluatePathologyRisk({}, CH, [], prototypePolicy).dementiaFamilyHistory).toBe("unanswered");
    expect(evaluatePathologyRisk({ dementia_family_history: null }, CH, [], prototypePolicy).dementiaFamilyHistory).toBe("unanswered");
    const reported = evaluatePathologyRisk({ dementia_family_history: true }, CH, [], prototypePolicy);
    expect(reported.dementiaFamilyHistory).toBe("reported");
    expect(reported.dementiaFactors).toHaveLength(14);
    expect(reported.dementiaFactors.some((factor) => factor.inputs.includes("dementia_family_history"))).toBe(false);
    expect(evaluatePathologyRisk({ dementia_family_history: false }, CH, [], prototypePolicy).dementiaFamilyHistory).toBe("not-reported");
  });
});

describe("input provenance", () => {
  test("reports the shallowest depth that asks each question", () => {
    expect(shallowestDepthFor("height_cm")).toBe("quick");
    expect(shallowestDepthFor("neck_circumference_cm")).toBe("detailed");
    expect(shallowestDepthFor("inflammatory_condition")).toBe("deep");
    expect(shallowestDepthFor("lab:total_cholesterol")).toBeUndefined();
    expect(shallowestDepthFor("profile:age")).toBeUndefined();
  });

  test("every question id a score can request exists in the bank", () => {
    const ids = new Set(questionBank.map((question) => question.id));
    const synthesis = evaluatePathologyRisk({}, { age: 55, countryCode: "CH" }, [], prototypePolicy);
    for (const result of synthesis.scores) {
      if (result.status !== "incomplete") continue;
      for (const id of result.missingInputs) {
        if (id.startsWith("lab:") || id.startsWith("profile:")) continue;
        expect(ids.has(id), `${result.instrument} requests unknown question ${id}`).toBe(true);
      }
    }
    for (const factor of synthesis.dementiaFactors) {
      for (const id of factor.inputs) {
        if (id.startsWith("lab:")) continue;
        expect(ids.has(id), `${factor.id} reads unknown question ${id}`).toBe(true);
      }
    }
  });
});

/** The fifteen-point FINDRISC example for the default 50-year-old profile. */
const FINDRISC_FIFTEEN: AnswerMap = {
  sex_assigned_at_birth: "male",
  height_cm: 175,
  weight_kg: 95,
  waist_circumference_cm: 105,
  daily_activity_30_min: false,
  plant_food_frequency: 0,
  bp_medication_ever: false,
  glucose_high_ever: false,
  family_diabetes: "other_relatives",
  diagnosed_conditions_core: ["none"],
};

describe("ranges over missing answers", () => {
  test("spans every waist band when only the waist is missing", () => {
    const result = incomplete(score("findrisc", omit(FINDRISC_FIFTEEN, "waist_circumference_cm")));
    expect(result.missingInputs).toEqual(["waist_circumference_cm"]);
    expect(result.range).toEqual({
      low: { category: "slightly-elevated", level: "moderate", points: 11, riskPercent: 4 },
      high: { category: "high", level: "high", points: 15, riskPercent: 33 },
      maxPoints: 26,
      riskHorizonYears: 10,
    });
  });

  test("keeps one category when the missing answers cannot change it", () => {
    const result = incomplete(score("findrisc", omit(FINDRISC_ZERO, "waist_circumference_cm"), CH_40));
    expect(result.range?.low).toEqual({ category: "low", level: "low", points: 0, riskPercent: 1 });
    expect(result.range?.high).toEqual({ category: "low", level: "low", points: 4, riskPercent: 1 });
  });

  test("covers two missing answers but not three", () => {
    const two = incomplete(score("findrisc", omit(FINDRISC_FIFTEEN, "waist_circumference_cm", "family_diabetes")));
    expect(two.range).toMatchObject({ low: { points: 8 }, high: { points: 17 } });
    const three = incomplete(
      score("findrisc", omit(FINDRISC_FIFTEEN, "waist_circumference_cm", "family_diabetes", "glucose_high_ever")),
    );
    expect(three).not.toHaveProperty("range");
  });

  test("never stands in for blood pressure, laboratory values, body size or sex", () => {
    const cholesterol = [lab("total_cholesterol", 5, "mmol/L")];
    const caide = {
      sex_assigned_at_birth: "male",
      education_years: "seven_to_nine",
      blood_pressure_systolic: 150,
      height_cm: 170,
      weight_kg: 93,
      weekly_moderate_activity_minutes: 30,
    } satisfies AnswerMap;
    const midlife: ProfileContext = { age: 55, countryCode: "CH" };
    expect(incomplete(score("caide", omit(caide, "blood_pressure_systolic"), midlife, cholesterol))).not.toHaveProperty("range");
    expect(incomplete(score("caide", caide, midlife))).not.toHaveProperty("range");
    expect(
      incomplete(score("score2", omit(SCORE2_MALE_50, "blood_pressure_systolic"), CH, SCORE2_MALE_50_LABS)),
    ).not.toHaveProperty("range");
    expect(incomplete(score("findrisc", omit(FINDRISC_FIFTEEN, "weight_kg")))).not.toHaveProperty("range");
    expect(incomplete(score("findrisc", omit(FINDRISC_FIFTEEN, "sex_assigned_at_birth")))).not.toHaveProperty("range");
  });

  test("is withheld when one possible answer would make the instrument inapplicable", () => {
    const result = incomplete(score("score2", omit(SCORE2_MALE_50, "cvd_event_history"), CH, SCORE2_MALE_50_LABS));
    expect(result.missingInputs).toEqual(["cvd_event_history"]);
    expect(result).not.toHaveProperty("range");
  });

  test("is withheld when an answer would open further questions", () => {
    expect(incomplete(score("audit-c", {}))).not.toHaveProperty("range");
  });

  test("can already settle a positive screen", () => {
    const result = incomplete(score("audit-c", { alcohol_frequency: "four_plus_weekly" }));
    expect(result.range).toEqual({
      low: { category: "positive", level: "moderate", points: 4 },
      high: { category: "positive", level: "moderate", points: 12 },
      maxPoints: 12,
    });
  });

  test("replaces an unscored 'not sure' answer by the scored options only", () => {
    const answers: AnswerMap = {
      sex_assigned_at_birth: "female",
      sleep_snoring: "unknown",
      sleep_daytime_sleepiness: "sometimes",
      sleep_witnessed_apnea: "no",
      diagnosed_high_blood_pressure: true,
      height_cm: 165,
      weight_kg: 65,
      neck_circumference_cm: 34,
      diagnosed_conditions_core: ["none"],
    };
    const result = incomplete(score("stop-bang", answers, { age: 55, countryCode: "CH" }));
    expect(result.range).toEqual({
      low: { category: "low", level: "low", points: 2 },
      high: { category: "intermediate", level: "moderate", points: 3 },
      maxPoints: 8,
    });
  });

  test("withholds range percentages when the policy forbids probabilities", () => {
    const result = incomplete(
      score("findrisc", omit(FINDRISC_FIFTEEN, "waist_circumference_cm"), CH, [], publicWellnessPolicy),
    );
    expect(result.range).toEqual({
      low: { category: "slightly-elevated", level: "moderate", points: 11 },
      high: { category: "high", level: "high", points: 15 },
      maxPoints: 26,
    });
  });
});

describe("habit gain at an equal profile", () => {
  test("compares FINDRISC with daily activity and daily fruit or vegetables", () => {
    const result = complete(score("findrisc", FINDRISC_FIFTEEN));
    expect(result.gain).toEqual({
      habits: ["daily-activity", "daily-fruit-vegetables"],
      category: "moderate",
      level: "moderate",
      points: 12,
      riskPercent: 17,
    });
  });

  test("is absent when the habits are already healthy or cannot change the band", () => {
    expect(complete(score("findrisc", FINDRISC_ZERO, CH_40))).not.toHaveProperty("gain");
    const maximum = complete(
      score("findrisc", {
        sex_assigned_at_birth: "female",
        height_cm: 160,
        weight_kg: 90,
        waist_circumference_cm: 95,
        daily_activity_30_min: false,
        plant_food_frequency: 0,
        bp_medication_ever: true,
        glucose_high_ever: true,
        family_diabetes: "first_degree",
        diagnosed_conditions_core: ["none"],
      }, { age: 66, countryCode: "CH" }),
    );
    expect(maximum.points).toBe(26);
    expect(maximum).not.toHaveProperty("gain");
  });

  test("compares SCORE2 without smoking, other predictors unchanged", () => {
    const result = complete(score("score2", SCORE2_MALE_50, CH, SCORE2_MALE_50_LABS));
    const nonSmoker = score2TenYearRisk("male", { age: 50, smoker: false, systolic: 140, totalCholesterol: 6.3, hdl: 1.4 });
    expect(result.gain).toMatchObject({ habits: ["no-smoking"], riskPercent: Math.round(nonSmoker * 1000) / 10 });
    expect(result.gain?.riskPercent).toBeLessThan(6.3);
    const nonSmokerResult = complete(
      score("score2", { ...SCORE2_MALE_50, current_tobacco_nicotine: false }, CH, SCORE2_MALE_50_LABS),
    );
    expect(nonSmokerResult).not.toHaveProperty("gain");
  });

  test("compares CAIDE with the WHO weekly activity", () => {
    const result = complete(
      score(
        "caide",
        {
          sex_assigned_at_birth: "male",
          education_years: "seven_to_nine",
          blood_pressure_systolic: 150,
          height_cm: 170,
          weight_kg: 93,
          weekly_moderate_activity_minutes: 30,
        },
        { age: 55, countryCode: "CH" },
        [lab("total_cholesterol", 5, "mmol/L")],
      ),
    );
    expect(result.gain).toEqual({ habits: ["weekly-activity"], category: "high", level: "high", points: 11, riskPercent: 7.4 });
  });

  test("keeps the category comparison without percentages when the policy forbids them", () => {
    const result = complete(score("findrisc", FINDRISC_FIFTEEN, CH, [], publicWellnessPolicy));
    expect(result.gain).toEqual({
      habits: ["daily-activity", "daily-fruit-vegetables"],
      category: "moderate",
      level: "moderate",
      points: 12,
    });
  });
});
