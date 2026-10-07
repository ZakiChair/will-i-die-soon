import { expect, test } from "vitest";

import { createRedactedExport } from "./export";
import { evaluatePathologyRisk } from "./pathology-risk";
import { prototypePolicy, publicWellnessPolicy } from "./release-policy";
import { buildActionPlan, calculateEssentialEight } from "./scoring";
import type { ResultReport } from "./export";
import type { AnswerMap, ReleasePolicy, RiskLeaf } from "./types";

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
  score: calculateEssentialEight(
    {
      current_tobacco_nicotine: false,
      smoking_history_former: false,
      usual_sleep_hours: 7,
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

const essentialEightAnswers: AnswerMap = {
  plant_food_frequency: 5,
  diet_whole_grains: "daily",
  diet_legumes: 3,
  diet_processed_meat: "never",
  diet_sugary_drinks: 0,
  weekly_moderate_activity_minutes: 150,
  current_tobacco_nicotine: false,
  smoking_history_former: false,
  secondhand_smoke_home: false,
  usual_sleep_hours: 7,
  height_cm: 175,
  weight_kg: 70,
  diagnosed_conditions_core: ["none"],
  blood_pressure_systolic: 115,
  blood_pressure_diastolic: 75,
  bp_medication_current: false,
};

const completeAdultScore = calculateEssentialEight(
  essentialEightAnswers,
  { ageYears: 35, assessmentDepth: "deep" },
);

const quickAdultReflection = calculateEssentialEight(
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
    schemaVersion: "health-risk-explorer-report-v6",
    assessmentDepth: "deep",
    score: {
      kind: "insufficient-coverage",
      reason: "answer-more-wellness-habits",
      coverage: 25,
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

  expect(exported.rulesetVersion).toBe("pathology-scores-v4");
  expect(exported.interpretation).toBe("published-screening-instruments-not-a-diagnosis");
  expect(exported.scores).toHaveLength(10);
  expect(exported.scores.find((score) => score.instrument === "lee-index")).toMatchObject({ status: "not-applicable", reason: "age-out-of-range" });
  expect(exported.scores.find((score) => score.instrument === "plcom2012")).toMatchObject({ status: "not-applicable", reason: "age-out-of-range" });
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
    orientation: "findrisc-keep-habits",
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

test("cardiovascular exports identify the ESC variant and region without raw answers", async () => {
  const pathologyRisk = evaluatePathologyRisk(
    {
      sex_assigned_at_birth: "female",
      diagnosed_conditions_core: ["none"],
      cvd_event_history: false,
      current_tobacco_nicotine: false,
      blood_pressure_systolic: 130,
    },
    { age: 75, countryCode: "DE" },
    [],
    prototypePolicy,
  );
  const json = await readJson(createRedactedExport({ ...report, pathologyRisk }));
  const score = (json.pathologyRisk as { scores: Array<Record<string, unknown>> }).scores.find(
    (candidate) => candidate.instrument === "score2",
  );
  expect(score).toMatchObject({ variant: "score2-op", region: "moderate", status: "incomplete" });
  expect(score?.inputs).not.toContainEqual(expect.objectContaining({ value: expect.anything() }));
});

test("WHO exports identify the printed chart without exposing blood pressure or BMI", async () => {
  const pathologyRisk = evaluatePathologyRisk(
    {
      sex_assigned_at_birth: "female",
      diagnosed_conditions_core: ["none"],
      cvd_event_history: false,
      current_tobacco_nicotine: false,
      blood_pressure_systolic: 130,
      height_cm: 160,
      weight_kg: 64,
    },
    { age: 60, countryCode: "CA" },
    [],
    prototypePolicy,
  );
  const json = await readJson(createRedactedExport({ ...report, pathologyRisk }));
  const score = (json.pathologyRisk as { scores: Array<Record<string, unknown>> }).scores.find(
    (candidate) => candidate.instrument === "who-cvd",
  );
  expect(score).toMatchObject({
    variant: "non-laboratory",
    region: "high-income-north-america",
    status: "complete",
    sourceIds: ["whoCvdCharts2019"],
  });
  expect(score?.inputs).not.toContainEqual(expect.objectContaining({ value: expect.anything() }));
  expect(JSON.stringify(score)).not.toMatch(/"CA"|female|"130"|"160"|"64"/);
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

/** Fifteen FINDRISC points at 50: high band, 33 in 100 over ten years. */
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

async function exportedScores(answers: AnswerMap, policy: ReleasePolicy = prototypePolicy) {
  const pathologyRisk = evaluatePathologyRisk(answers, { age: 50, countryCode: "CH" }, [], policy);
  const json = await readJson(createRedactedExport({ ...report, answers, pathologyRisk }));
  return (json.pathologyRisk as { scores: Array<Record<string, unknown>> }).scores;
}

function scoreOf(scores: ReadonlyArray<Record<string, unknown>>, instrument: string) {
  const score = scores.find((candidate) => candidate.instrument === instrument);
  if (!score) throw new Error(`No exported ${instrument} score`);
  return score;
}

test("ranges, habit gains and orientations travel as interpreted values, never as answers", async () => {
  const complete = await exportedScores(FINDRISC_FIFTEEN);
  expect(scoreOf(complete, "findrisc")).toMatchObject({
    status: "complete",
    category: "high",
    points: 15,
    riskPercent: 33,
    gain: {
      habits: ["daily-activity", "daily-fruit-vegetables"],
      category: "moderate",
      level: "moderate",
      points: 12,
      riskPercent: 17,
    },
    orientation: "findrisc-glucose-test",
  });

  const missingWaist = await exportedScores(
    Object.fromEntries(Object.entries(FINDRISC_FIFTEEN).filter(([id]) => id !== "waist_circumference_cm")),
  );
  const range = scoreOf(missingWaist, "findrisc");
  expect(range).toMatchObject({ status: "incomplete", missingInputs: ["waist_circumference_cm"] });
  expect(range.range).toEqual({
    low: { category: "slightly-elevated", level: "moderate", points: 11, riskPercent: 4 },
    high: { category: "high", level: "high", points: 15, riskPercent: 33 },
    maxPoints: 26,
    riskHorizonYears: 10,
  });
  // The two bounds call for different next steps, so none is exported.
  expect(range).not.toHaveProperty("orientation");

  expect(scoreOf(await exportedScores({ alcohol_frequency: "four_plus_weekly" }), "audit-c")).toMatchObject({
    status: "incomplete",
    range: { low: { category: "positive", points: 4 }, high: { category: "positive", points: 12 }, maxPoints: 12 },
    orientation: "audit-c-support",
  });

  const withheld = await exportedScores(FINDRISC_FIFTEEN, publicWellnessPolicy);
  expect(scoreOf(withheld, "findrisc")).toMatchObject({
    gain: { habits: ["daily-activity", "daily-fruit-vegetables"], category: "moderate", points: 12 },
  });
  expect(JSON.stringify(withheld)).not.toMatch(/riskPercent|riskHorizonYears/);

  expect(JSON.stringify([complete, missingWaist])).not.toMatch(/"male"|\b95\b|\b175\b|\b105\b|31\.0|other_relatives/);
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

test("adult Express raw opt-in exports all twelve structured answers without private metadata", async () => {
  const answers = {
    sex_assigned_at_birth: "female",
    reported_vo2_max_ml_kg_min: 20,
    weekly_moderate_activity_minutes: 150,
    chair_stand_30s_count: 14,
    weight_kg: 60,
    squat_one_rep_max_kg: 60,
    deadlift_one_rep_max_kg: 90,
    movement_strength_days: 2,
    usual_sleep_hours: 7.5,
    sleep_refreshed: 8,
    plant_food_frequency: 4,
    diet_ultra_processed: "rarely",
    exact_location: "SECRET STREET ADDRESS",
  } as const;
  const json = await readJson(
    createRedactedExport(
      {
        ...report,
        subjectAgeYears: 67,
        assessmentDepth: "express",
        score: calculateEssentialEight(answers, {
          ageYears: 67,
          assessmentDepth: "express",
        }),
        answers,
      },
      { includeRawAnswers: true },
    ),
  );

  expect(json.assessmentDepth).toBe("express");
  expect(json.rawAnswers).toEqual({
    chair_stand_30s_count: 14,
    deadlift_one_rep_max_kg: 90,
    diet_ultra_processed: "rarely",
    movement_strength_days: 2,
    plant_food_frequency: 4,
    reported_vo2_max_ml_kg_min: 20,
    sex_assigned_at_birth: "female",
    sleep_refreshed: 8,
    squat_one_rep_max_kg: 60,
    usual_sleep_hours: 7.5,
    weekly_moderate_activity_minutes: 150,
    weight_kg: 60,
  });
  expect(JSON.stringify(json)).not.toMatch(/SECRET|STREET ADDRESS|exact_location/i);
  expect(json).not.toHaveProperty("expressSummary");
  expect(json.expressAssessment).toMatchObject({
    version: "express-index-v2",
    kind: "complete-index",
    score: 84,
    answeredCount: 12,
    interpretableComponentCount: 10,
    applicableComponentCount: 10,
    scoredAxisCount: 4,
  });
});

test("Express exports its interpreted index separately without raw measurements by default", async () => {
  const answers = {
    sex_assigned_at_birth: "female",
    reported_vo2_max_ml_kg_min: 20,
    weekly_moderate_activity_minutes: 150,
    chair_stand_30s_count: 14,
    movement_strength_days: 2,
    usual_sleep_hours: 7.5,
    sleep_refreshed: 8,
    plant_food_frequency: 4,
    diet_ultra_processed: "rarely",
    gender_identity_optional: "SECRET FREE TEXT",
  } as const;
  const json = await readJson(createRedactedExport({
    ...report,
    subjectAgeYears: 67,
    assessmentDepth: "express",
    answers,
    score: calculateEssentialEight(answers, { ageYears: 67, assessmentDepth: "express" }),
  }));
  expect(json.score).toMatchObject({ kind: "insufficient-coverage", reason: "express-assessment" });
  expect(json.expressAssessment).toMatchObject({
    version: "express-index-v2",
    kind: "complete-index",
    score: 82,
    profile: "favorable",
    interpretation: "normed-fitness-and-guideline-habits-index-not-a-health-diagnosis",
    reference: { version: "express-index-v2", axisSupport: 65, profileAxisMinimum: 50, activityMinutes: 150, strengthDays: 2 },
    referencePopulation: {
      vo2Max: { registry: "FRIEND", population: expect.stringMatching(/US adults aged 20-79 without cardiovascular disease/) },
      chairStand: { reference: expect.stringMatching(/Rikli & Jones/), population: expect.stringMatching(/community-dwelling adults aged 60-94/) },
      oneRepMax: { reference: "product convention", population: expect.stringMatching(/1\.0 × \(squat\) and 1\.5 × \(deadlift\)/), optional: true },
    },
  });
  const expressAssessment = json.expressAssessment as { sources: string[]; reference: { sources: { friend: { doi: string } } } };
  expect(expressAssessment.sources).toEqual([
    "https://doi.org/10.1016/j.mayocp.2015.07.026",
    "https://doi.org/10.1123/japa.7.2.162",
    "https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-30Sec-508.pdf",
    "https://www.who.int/publications/i/item/9789240015128",
    "https://doi.org/10.1161/CIR.0000000000001078",
    "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  ]);
  expect(expressAssessment.reference.sources.friend.doi).toBe("10.1016/j.mayocp.2015.07.026");
  expect(json).not.toHaveProperty("rawAnswers");
  expect(JSON.stringify(json.expressAssessment)).not.toMatch(/"female"|\b7\.5\b|SECRET|gender_identity_optional|rawAnswers|sex_assigned_at_birth|chair_stand_30s_count/);
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

test("the action plan exports the three largest Life's Essential 8 deficits with their sources", async () => {
  const answers: AnswerMap = {
    ...essentialEightAnswers,
    current_tobacco_nicotine: true,
    tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
    weekly_moderate_activity_minutes: 0,
    usual_sleep_hours: 5,
    blood_pressure_systolic: 125,
  };
  const score = calculateEssentialEight(answers, {
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
    current_tobacco_nicotine: true,
    tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
    weekly_moderate_activity_minutes: 0,
  });
  expect((json.actions as Array<Record<string, unknown>>).map((action) => action.id)).toEqual([
    "habit-physical-activity",
    "habit-nicotine",
    "habit-sleep",
  ]);
  expect(json.actions).toEqual([
    expect.objectContaining({
      kind: "habit",
      categoryId: "physical-activity",
      reason: "You reported no moderate or vigorous activity in a usual week.",
      sources: [
        expect.objectContaining({ publisher: "American Heart Association, Circulation 2022" }),
      ],
    }),
    expect.objectContaining({ kind: "habit", categoryId: "nicotine" }),
    expect.objectContaining({ kind: "habit", categoryId: "sleep" }),
  ]);
  for (const action of json.actions as Array<Record<string, unknown>>) {
    expect(action).not.toHaveProperty("opportunity");
    expect(action).not.toHaveProperty("source");
  }
  expect(json.schemaVersion).toBe("health-risk-explorer-report-v6");
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
          id: "habit-blood-pressure",
          kind: "habit",
          categoryId: "blood-pressure",
          title: "Have your blood pressure re-checked",
          reason: "Your systolic reading is 120–129 mmHg with a diastolic under 80.",
          nextStep: "A reading above 120/80 mmHg deserves repeat measurement.",
          sources: [
            {
              title: "Life's Essential 8",
              publisher: "American Heart Association, Circulation 2022",
              url: "https://doi.org/10.1161/CIR.0000000000001078",
            },
          ],
          opportunity: 25,
        },
      ],
    }),
  );

  expect(json.actions).toEqual([
    {
      id: "habit-blood-pressure",
      kind: "habit",
      categoryId: "blood-pressure",
      title: "Have your blood pressure re-checked",
      reason: "Your systolic reading is 120–129 mmHg with a diastolic under 80.",
      nextStep: "A reading above 120/80 mmHg deserves repeat measurement.",
      sources: [
        {
          title: "Life's Essential 8",
          publisher: "American Heart Association, Circulation 2022",
          url: "https://doi.org/10.1161/CIR.0000000000001078",
        },
      ],
    },
  ]);
});
