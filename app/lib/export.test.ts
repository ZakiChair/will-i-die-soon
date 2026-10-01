import { expect, test } from "vitest";

import { createRedactedExport } from "./export";
import { evaluatePathologyRisk } from "./pathology-risk";
import { prototypePolicy } from "./release-policy";
import { buildActionPlan, calculatePurityScore } from "./scoring";
import type { ResultReport } from "./export";
import type { RiskLeaf } from "./types";

const source = {
  id: "who-example",
  title: "Official guidance",
  publisher: "World Health Organization",
  url: "https://www.who.int/example",
  reviewedAt: "2026-08-03",
  jurisdictions: "all" as const,
  applicability: { countries: "all" as const },
};

const leaf: RiskLeaf = {
  id: "review-example",
  ruleId: "review-example",
  rulesetVersion: "risk-rules-v1",
  group: "preventive-follow-up",
  title: "A review may be useful",
  copy: "Consider discussing the self-reported factor with a qualified professional.",
  evidenceTier: "guideline-action",
  urgency: "prompt-review",
  signal: "worth-attention",
  factors: ["A structured self-reported factor"],
  missingInputs: ["another_structured_answer"],
  sources: [source],
  applicability: { countries: "all" },
};

const report: ResultReport & { readonly subjectAgeYears: number } = {
  subjectAgeYears: 35,
  assessmentDepth: "deep",
  score: calculatePurityScore(
    {
      current_tobacco_nicotine: false,
      alcohol_frequency: "never",
    },
    { ageYears: 35, assessmentDepth: "deep" },
  ),
  riskLeaves: [leaf],
  actions: [],
  confirmedLabs: [
    {
      source: {
        marker: "hba1c",
        value: 5.7,
        unit: "%",
        rawLine: "SECRET RAW LAB LINE from private-report.pdf",
        rawTestName: "HbA1c from private-report.pdf",
      },
      reviewed: {
        marker: "hba1c",
        valueText: "5.7",
        value: 5.7,
        unit: "%",
        referenceRange: "4.0–5.6",
        collectionDate: "2026-07-30",
        fastingStatus: "not_stated",
      },
      normalized: {
        value: 38.801,
        unit: "mmol/mol",
        displayValue: "39",
      },
    },
  ],
  answers: {
    current_tobacco_nicotine: false,
    sex_assigned_at_birth: "female",
    diagnosed_conditions_core: ["none"],
    gender_identity_optional: "SECRET FREE TEXT",
    med_detail_names: "SECRET MEDICINE NAME",
    lab_value_glucose: "SECRET PRINTED LAB STRING",
    birth_date: "1990-01-02",
    exact_location: "SECRET STREET ADDRESS",
    uploaded_file_name: "private-report.pdf",
  },
};

const completeAdultScore = calculatePurityScore(
  {
    current_tobacco_nicotine: false,
    alcohol_frequency: "never",
    weekly_moderate_activity_minutes: 300,
    movement_strength_days: 2,
    movement_walking_days: 5,
    sedentary_total_hours: 4,
    plant_food_frequency: 5,
    diet_whole_grains: "daily",
    diet_legumes: 3,
    diet_processed_meat: "never",
    diet_sugary_drinks: 0,
    usual_sleep_hours: 7,
    sleep_refreshed: 9,
    circadian_bedtime_variation: 1,
    stress_recovery_practice: "daily",
    preventive_followup_status: "not_due",
    current_medications: false,
  },
  { ageYears: 35, assessmentDepth: "deep" },
);

const quickAdultReflection = calculatePurityScore(
  report.answers,
  { ageYears: 35, assessmentDepth: "quick" },
);

async function readJson(blob: Blob) {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
  return JSON.parse(text) as Record<string, unknown>;
}

test("default JSON contains interpreted output and confirmed reviewed lab context only", async () => {
  const blob = createRedactedExport(report);
  const json = await readJson(blob);
  const serialized = JSON.stringify(json);

  expect(blob.type).toBe("application/json");
  expect(json).toMatchObject({
    schemaVersion: "health-risk-explorer-report-v3",
    assessmentDepth: "deep",
    score: {
      kind: "insufficient-coverage",
      coverage: 35,
    },
    riskLeaves: [
      {
        title: "A review may be useful",
        evidenceTier: "guideline-action",
      },
    ],
    confirmedLabs: [
      {
        reviewed: { marker: "hba1c", valueText: "5.7" },
        normalized: { displayValue: "39" },
      },
    ],
  });
  expect(json).not.toHaveProperty("rawAnswers");
  expect((json.confirmedLabs as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
    "source",
  );
  expect(serialized).not.toMatch(
    /SECRET|private-report\.pdf|1990-01-02|STREET ADDRESS|rawLine|rawTestName/i,
  );
});

test("validated screening scores travel in the report with status, inputs, and sources, never as free text", async () => {
  const pathologyRisk = evaluatePathologyRisk(
    {
      sex_assigned_at_birth: "female",
      diagnosed_conditions_core: ["none"],
      height_cm: 170,
      weight_kg: 60,
      waist_circumference_cm: 75,
      daily_activity_30_min: true,
      plant_food_frequency: 3,
      bp_medication_ever: false,
      glucose_high_ever: false,
      family_diabetes: "no",
    },
    { age: 39, countryCode: "CH" },
    report.confirmedLabs,
    prototypePolicy,
  );
  const json = await readJson(createRedactedExport({ ...report, pathologyRisk }));
  const exported = json.pathologyRisk as {
    rulesetVersion: string;
    interpretation: string;
    scores: Array<Record<string, unknown>>;
    labClassifications: Array<Record<string, unknown>>;
    dementiaFactors: Array<Record<string, unknown>>;
  };

  expect(exported.rulesetVersion).toBe("pathology-scores-v1");
  expect(exported.interpretation).toBe("published-screening-instruments-not-a-diagnosis");
  expect(exported.scores).toHaveLength(8);
  expect(exported.scores.find((score) => score.instrument === "findrisc")).toEqual({
    instrument: "findrisc",
    status: "complete",
    inputs: expect.arrayContaining([{ id: "derived:body_mass_index", derived: true }]),
    sourceIds: ["findriscLindstrom2003"],
    category: "low",
    level: "low",
    points: 0,
    maxPoints: 26,
    riskPercent: 1,
    riskHorizonYears: 10,
    modifiers: [],
  });
  expect(exported.scores.find((score) => score.instrument === "score2")).toMatchObject({
    status: "not-applicable",
    reason: "age-out-of-range",
  });
  expect(exported.scores.find((score) => score.instrument === "audit-c")).toMatchObject({
    status: "incomplete",
    missingInputs: ["alcohol_frequency"],
  });
  expect(exported.labClassifications).toEqual([
    { marker: "hba1c", value: 5.7, unit: "%", category: "prediabetes-range", sourceIds: ["adaDiagnosisStandards2025"] },
  ]);
  expect(exported.dementiaFactors).toHaveLength(14);
  expect(JSON.stringify(json)).not.toMatch(/SECRET|rawLine|rawTestName/i);
  expect(
    exported.scores
      .flatMap((score) => score.inputs as Array<Record<string, unknown>>)
      .some((input) => "value" in input),
  ).toBe(false);
  expect(JSON.stringify(exported.scores)).not.toMatch(/female|\b75\b|\b170\b|\b60\b|20\.8|"CH"/);

  const withoutScores = await readJson(
    createRedactedExport({ ...report, pathologyRisk: { ...pathologyRisk, scores: [] } }),
  );
  expect(withoutScores).not.toHaveProperty("pathologyRisk");
});

test("adult raw opt-in keeps screening score inputs as identifiers only", async () => {
  const pathologyRisk = evaluatePathologyRisk(
    {
      sex_assigned_at_birth: "female",
      diagnosed_conditions_core: ["none"],
      height_cm: 170,
      weight_kg: 60,
      waist_circumference_cm: 75,
      family_diabetes: "no",
    },
    { age: 39, countryCode: "CH" },
    report.confirmedLabs,
    prototypePolicy,
  );
  const json = await readJson(
    createRedactedExport({ ...report, pathologyRisk }, { includeRawAnswers: true }),
  );
  const exported = json.pathologyRisk as { scores: Array<{ inputs: Array<Record<string, unknown>> }> };

  expect(json.rawAnswers).toMatchObject({ sex_assigned_at_birth: "female" });
  expect(exported.scores.flatMap((score) => score.inputs).length).toBeGreaterThan(0);
  expect(exported.scores.flatMap((score) => score.inputs).some((input) => "value" in input)).toBe(false);
  expect(JSON.stringify(exported.scores)).not.toMatch(/female|\b75\b|\b170\b|\b60\b/);
});

test("explicit raw opt-in includes only valid structured answers and still removes private metadata", async () => {
  const json = await readJson(
    createRedactedExport(report, { includeRawAnswers: true }),
  );
  const serialized = JSON.stringify(json);

  expect(json.rawAnswers).toEqual({
    current_tobacco_nicotine: false,
    diagnosed_conditions_core: ["none"],
    sex_assigned_at_birth: "female",
  });
  expect(serialized).not.toMatch(
    /SECRET|private-report\.pdf|1990-01-02|STREET ADDRESS|rawLine|rawTestName/i,
  );
});

test("adult Express raw opt-in exports all nine structured answers without private metadata", async () => {
  const answers = {
    reported_vo2_max_ml_kg_min: 48.5,
    squat_one_rep_max_kg: 123,
    deadlift_one_rep_max_kg: 181,
    usual_sleep_hours: 7.5,
    sleep_refreshed: 8,
    height_cm: 182,
    weight_kg: 80,
    plant_food_frequency: 4,
    diet_ultra_processed: "rarely",
    exact_location: "SECRET STREET ADDRESS",
  } as const;
  const json = await readJson(
    createRedactedExport(
      {
        ...report,
        subjectAgeYears: 35,
        assessmentDepth: "express",
        score: calculatePurityScore(answers, {
          ageYears: 35,
          assessmentDepth: "express",
        }),
        answers,
      },
      { includeRawAnswers: true },
    ),
  );

  expect(json.assessmentDepth).toBe("express");
  expect(json.rawAnswers).toEqual({
    deadlift_one_rep_max_kg: 181,
    diet_ultra_processed: "rarely",
    height_cm: 182,
    plant_food_frequency: 4,
    reported_vo2_max_ml_kg_min: 48.5,
    sleep_refreshed: 8,
    squat_one_rep_max_kg: 123,
    usual_sleep_hours: 7.5,
    weight_kg: 80,
  });
  expect(JSON.stringify(json)).not.toMatch(/SECRET|STREET ADDRESS|exact_location/i);
  expect(json).not.toHaveProperty("expressSummary");
  expect(json.expressAssessment).toMatchObject({
    version: "express-index-v1",
    kind: "complete-index",
    score: 92,
    answeredCount: 9,
    interpretableComponentCount: 7,
    scoredAxisCount: 4,
  });
});

test("Express exports its interpreted index separately without raw measurements by default", async () => {
  const answers = {
    reported_vo2_max_ml_kg_min: 48.5,
    squat_one_rep_max_kg: 123,
    deadlift_one_rep_max_kg: 181,
    usual_sleep_hours: 7.5,
    sleep_refreshed: 8,
    height_cm: 182,
    weight_kg: 80,
    plant_food_frequency: 4,
    diet_ultra_processed: "rarely",
    gender_identity_optional: "SECRET FREE TEXT",
  } as const;
  const json = await readJson(createRedactedExport({
    ...report,
    assessmentDepth: "express",
    answers,
    score: calculatePurityScore(answers, { ageYears: 35, assessmentDepth: "express" }),
  }));
  expect(json.score).toMatchObject({ kind: "insufficient-coverage", reason: "express-assessment" });
  expect(json.expressAssessment).toMatchObject({
    kind: "complete-index",
    score: 92,
    profile: "favorable",
    interpretation: "heuristic-form-and-habits-index-not-a-health-diagnosis",
  });
  expect(json).not.toHaveProperty("rawAnswers");
  expect(JSON.stringify(json.expressAssessment)).not.toMatch(/48\.5|123|181|182|SECRET|gender_identity_optional|rawAnswers|height_cm|weight_kg/);
});

test.each([17, 12, null, Number.NaN, 18.5, 121])("Express interpretation is not exported for unverified adult age %s", async (subjectAgeYears) => {
  const json = await readJson(createRedactedExport({ ...report, assessmentDepth: "express", subjectAgeYears }));
  expect(json).not.toHaveProperty("expressAssessment");
});

test("other depths do not export an Express index from overlapping answers", async () => {
  const json = await readJson(createRedactedExport(report));
  expect(json).not.toHaveProperty("expressAssessment");
});

test.each([
  ["age 17 with an adult-shaped score", 17, completeAdultScore],
  ["under 13 with a Quick reflection", 12, quickAdultReflection],
  ["unverified age with an insufficient result", null, report.score],
  ["invalid age with an adult-shaped score", Number.NaN, completeAdultScore],
] as const)("raw opt-in is ignored for %s", async (_name, subjectAgeYears, score) => {
  const json = await readJson(
    createRedactedExport(
      { ...report, subjectAgeYears, score },
      { includeRawAnswers: true },
    ),
  );

  expect(json).not.toHaveProperty("rawAnswers");
  expect(json).not.toHaveProperty("subjectAgeYears");
});

test("merged adult barriers retain every reason and distinct source in structured export", async () => {
  const answers = {
    current_tobacco_nicotine: false,
    alcohol_frequency: "never",
    preventive_followup_status: "yes",
    preventive_followup_action: "access_or_safety_barrier",
    current_medications: true,
    med_detail_prescriber_followup: "no_current_access",
  } as const;
  const score = calculatePurityScore(answers, {
    ageYears: 35,
    assessmentDepth: "detailed",
  });
  const actions = buildActionPlan([], score);
  const json = await readJson(
    createRedactedExport(
      {
        ...report,
        assessmentDepth: "detailed",
        score,
        actions,
        answers,
      },
      { includeRawAnswers: true },
    ),
  );

  expect(json.rawAnswers).toMatchObject({
    preventive_followup_status: "yes",
    preventive_followup_action: "access_or_safety_barrier",
    current_medications: true,
    med_detail_prescriber_followup: "no_current_access",
  });
  expect(json.actions).toEqual([
    expect.objectContaining({
      kind: "access-support",
      reason: expect.stringMatching(/access or safety barrier/i),
      sources: [
        expect.objectContaining({ title: "Primary health care" }),
        expect.objectContaining({ title: "Medication Without Harm" }),
      ],
    }),
  ]);
  expect(JSON.stringify(json.actions)).toMatch(/no current access to prescriber follow-up/i);
  expect((json.actions as Array<Record<string, unknown>>)[0]).not.toHaveProperty("source");
  expect(json.schemaVersion).toBe("health-risk-explorer-report-v3");
});

test("raw opt-in is ignored when the trusted age guard is missing", async () => {
  const missingAgeReport = { ...report } as Partial<ResultReport>;
  Reflect.deleteProperty(missingAgeReport, "subjectAgeYears");
  const json = await readJson(
    createRedactedExport(
      { ...missingAgeReport, score: completeAdultScore } as ResultReport,
      { includeRawAnswers: true },
    ),
  );

  expect(json).not.toHaveProperty("rawAnswers");
  expect(json).not.toHaveProperty("subjectAgeYears");
});

test.each([
  ["Quick reflection", quickAdultReflection],
  ["insufficient coverage", report.score],
  ["published adult score", completeAdultScore],
] as const)("verified adults can explicitly opt into raw answers with %s", async (_name, score) => {
  const json = await readJson(
    createRedactedExport(
      { ...report, subjectAgeYears: 35, score },
      { includeRawAnswers: true },
    ),
  );

  expect(json.rawAnswers).toEqual({
    current_tobacco_nicotine: false,
    diagnosed_conditions_core: ["none"],
    sex_assigned_at_birth: "female",
  });
  expect(json).not.toHaveProperty("subjectAgeYears");
});

test("default JSON exports a curated action without its internal ranking sentinel", async () => {
  const json = await readJson(
    createRedactedExport({
      ...report,
      actions: [
        {
          id: "access-medication-safety",
          kind: "access-support",
          categoryId: "medication-safety",
          title: "Start with practical access and safety support",
          reason: "No current access was reported.",
          nextStep: "Choose a qualified local support route if you want one.",
          sources: [
            {
              title: "Medication Without Harm",
              publisher: "World Health Organization",
              url: "https://www.who.int/initiatives/medication-without-harm",
            },
          ],
          opportunity: Number.POSITIVE_INFINITY,
        },
      ],
    }),
  );

  expect(json.actions).toEqual([
    {
      id: "access-medication-safety",
      kind: "access-support",
      categoryId: "medication-safety",
      title: "Start with practical access and safety support",
      reason: "No current access was reported.",
      nextStep: "Choose a qualified local support route if you want one.",
      sources: [
        {
          title: "Medication Without Harm",
          publisher: "World Health Organization",
          url: "https://www.who.int/initiatives/medication-without-harm",
        },
      ],
    },
  ]);
});
