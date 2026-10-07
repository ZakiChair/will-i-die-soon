import Decimal from "decimal.js";

import type { ConfirmedLabValue, LabMarker } from "./labs";
import { canonicalUnit } from "./labs";
import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  RiskLeaf,
} from "./types";

// Life's Essential 8 (Lloyd-Jones et al., Circulation 2022;146:e18–e43). Each of
// the eight metrics is scored 0–100 with the published cut-points; the total is
// the unweighted mean of the metrics that could be assessed.
export const ESSENTIAL_EIGHT_VERSION = "essential-eight-v1" as const;
export const ESSENTIAL_EIGHT_LABEL =
  "Life's Essential 8 — cardiovascular health score, not a mortality verdict." as const;

export const ESSENTIAL_EIGHT_INPUT_IDS = [
  "plant_food_frequency",
  "diet_whole_grains",
  "diet_legumes",
  "diet_processed_meat",
  "diet_sugary_drinks",
  "weekly_moderate_activity_minutes",
  "weekly_vigorous_activity_minutes",
  "current_tobacco_nicotine",
  "tobacco_nicotine_context",
  "smoking_history_former",
  "smoking_years_since_quit",
  "secondhand_smoke_home",
  "usual_sleep_hours",
  "height_cm",
  "weight_kg",
  "statin_current",
  "diagnosed_conditions_core",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "bp_medication_current",
] as const;

export type EssentialEightInputId = (typeof ESSENTIAL_EIGHT_INPUT_IDS)[number];

/** Component identifiers: either a question id or a value derived from several inputs. */
export type ScoreComponentId =
  | EssentialEightInputId
  | "diet_pattern"
  | "body_mass_index"
  | "lab:non_hdl_cholesterol"
  | "lab:glycaemic_status";

export type ScoreCategoryId =
  | "diet"
  | "physical-activity"
  | "nicotine"
  | "sleep"
  | "body-mass-index"
  | "blood-lipids"
  | "blood-glucose"
  | "blood-pressure";

export const SCORE_CATEGORY_IDS: ReadonlyArray<ScoreCategoryId> = [
  "diet",
  "physical-activity",
  "nicotine",
  "sleep",
  "body-mass-index",
  "blood-lipids",
  "blood-glucose",
  "blood-pressure",
];

export type ScoreSource = {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
};

export type ScoreComponent = {
  readonly questionId: ScoreComponentId;
  readonly label: string;
  readonly maxPoints: number;
  readonly status: "answered" | "missing";
  readonly fraction?: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly explanation: string;
  readonly source: ScoreSource;
};

export type ScoreCategory = {
  readonly id: ScoreCategoryId;
  readonly label: string;
  readonly maxPoints: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly coverage: number | null;
  readonly components: ReadonlyArray<ScoreComponent>;
  readonly source: ScoreSource;
};

type ScoreLedger = {
  readonly label: typeof ESSENTIAL_EIGHT_LABEL;
  readonly scoreVersion: typeof ESSENTIAL_EIGHT_VERSION;
  readonly assessmentDepth: AnalysisDepth;
  readonly coverage: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly answeredCategoryCount: number;
  readonly categories: ReadonlyArray<ScoreCategory>;
  readonly explanations: ReadonlyArray<string>;
};

export type AdultEssentialEightResult = ScoreLedger & {
  readonly kind: "adult-score";
  readonly score: number;
};

export type CoverageCategory = {
  readonly id: ScoreCategoryId;
  readonly label: string;
  readonly coverage: number | null;
  readonly answeredComponents: number;
  readonly missingComponents: number;
};

export type PublicInsufficientCoverageResult = {
  readonly kind: "insufficient-coverage";
  readonly reason:
    | "express-assessment"
    | "quick-assessment"
    | "answer-more-wellness-habits";
  readonly label: typeof ESSENTIAL_EIGHT_LABEL;
  readonly scoreVersion: typeof ESSENTIAL_EIGHT_VERSION;
  readonly assessmentDepth: AnalysisDepth;
  readonly coverage: number;
  readonly answeredCategoryCount: number;
  readonly answeredCategories: ReadonlyArray<CoverageCategory>;
  readonly explanations: ReadonlyArray<string>;
};

export type EssentialEightResult =
  | AdultEssentialEightResult
  | PublicInsufficientCoverageResult
  | {
      readonly kind: "not-available";
      readonly reason: "under-18-or-age-unverified";
    };

export type ScoreRouting = {
  readonly ageYears: number | null;
  readonly assessmentDepth: AnalysisDepth;
};

export type ActionItem = {
  readonly id: string;
  readonly kind: "habit";
  readonly categoryId: ScoreCategoryId;
  readonly title: string;
  readonly reason: string;
  readonly nextStep: string;
  readonly sources: ReadonlyArray<ScoreSource>;
  readonly opportunity: number;
};

/** Minimum number of assessed metrics before a partial Life's Essential 8 mean is shown. */
export const ESSENTIAL_EIGHT_MINIMUM_METRICS = 5;
const METRIC_POINTS = 100;

const LE8_SOURCE: ScoreSource = {
  title:
    "Life's Essential 8: Updating and Enhancing the American Heart Association's Construct of Cardiovascular Health",
  publisher: "American Heart Association, Circulation 2022",
  url: "https://doi.org/10.1161/CIR.0000000000001078",
};

const SOURCES = {
  diet: LE8_SOURCE,
  activity: LE8_SOURCE,
  nicotine: LE8_SOURCE,
  sleep: LE8_SOURCE,
  bmi: LE8_SOURCE,
  lipids: LE8_SOURCE,
  glucose: LE8_SOURCE,
  bloodPressure: LE8_SOURCE,
} as const satisfies Readonly<Record<string, ScoreSource>>;

type ComponentOptions = {
  questionId: ScoreComponentId;
  label: string;
  source: ScoreSource;
};

function componentAnswered(
  options: ComponentOptions,
  points: number,
  explanation: string,
): ScoreComponent {
  const bounded = new Decimal(points).clamp(0, METRIC_POINTS);
  return {
    ...options,
    maxPoints: METRIC_POINTS,
    status: "answered",
    fraction: bounded.div(METRIC_POINTS).toNumber(),
    earnedPoints: bounded.toNumber(),
    assessedPoints: METRIC_POINTS,
    applicablePoints: METRIC_POINTS,
    explanation,
  };
}

function componentMissing(options: ComponentOptions, explanation: string): ScoreComponent {
  return {
    ...options,
    maxPoints: METRIC_POINTS,
    status: "missing",
    earnedPoints: 0,
    assessedPoints: 0,
    applicablePoints: METRIC_POINTS,
    explanation,
  };
}

function finiteNumber(value: AnswerValue | undefined, minimum = 0): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum
    ? value
    : undefined;
}

function category(
  id: ScoreCategoryId,
  label: string,
  source: ScoreSource,
  component: ScoreComponent,
): ScoreCategory {
  return {
    id,
    label,
    maxPoints: METRIC_POINTS,
    earnedPoints: component.earnedPoints,
    assessedPoints: component.assessedPoints,
    applicablePoints: component.applicablePoints,
    coverage: component.status === "answered" ? 100 : 0,
    components: [component],
    source,
  };
}

// ---------------------------------------------------------------------------
// Diet: MEPA-style screener proxy. LE8 scores a 16-point Mediterranean Eating
// Pattern for Americans screener as 15–16 → 100, 12–14 → 80, 8–11 → 50,
// 4–7 → 25, 0–3 → 0. The five diet items here are scaled to the same 0–16 range.
// ---------------------------------------------------------------------------

type DietItemScore = { readonly points: number; readonly max: number };

function frequencyFavourable(value: AnswerValue | undefined, favourableHigh: boolean): DietItemScore | undefined {
  const order = ["never", "rarely", "sometimes", "often", "daily"];
  if (typeof value !== "string" || !order.includes(value)) return undefined;
  const index = order.indexOf(value);
  return { points: favourableHigh ? index : order.length - 1 - index, max: order.length - 1 };
}

function dietCategory(answers: AnswerMap): ScoreCategory {
  const options = { questionId: "diet_pattern" as const, label: "Diet pattern (Mediterranean-style screener)", source: SOURCES.diet };
  const plants = finiteNumber(answers.plant_food_frequency);
  const legumes = finiteNumber(answers.diet_legumes);
  const sugary = finiteNumber(answers.diet_sugary_drinks);
  const items: ReadonlyArray<DietItemScore | undefined> = [
    plants === undefined ? undefined : { points: Math.min(plants, 5), max: 5 },
    frequencyFavourable(answers.diet_whole_grains, true),
    legumes === undefined ? undefined : { points: Math.min(legumes, 3), max: 3 },
    frequencyFavourable(answers.diet_processed_meat, false),
    sugary === undefined ? undefined : { points: Math.max(0, 4 - Math.min(sugary, 4)), max: 4 },
  ];
  const answered = items.filter((item): item is DietItemScore => item !== undefined);
  if (answered.length < items.length) {
    return category("diet", "Diet", SOURCES.diet, componentMissing(options, "All five diet items are needed to place the diet pattern."));
  }
  const raw = Decimal.sum(...answered.map((item) => item.points))
    .div(Decimal.sum(...answered.map((item) => item.max)))
    .times(16);
  const screener = raw.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const points = screener >= 15 ? 100 : screener >= 12 ? 80 : screener >= 8 ? 50 : screener >= 4 ? 25 : 0;
  const explanation =
    screener >= 15
      ? "Your diet items place you in the top band of the Mediterranean-style screener (15–16 of 16)."
      : screener >= 12
        ? "Your diet items place you in the second band of the Mediterranean-style screener (12–14 of 16)."
        : screener >= 8
          ? "Your diet items place you in the middle band of the Mediterranean-style screener (8–11 of 16)."
          : screener >= 4
            ? "Your diet items place you in the fourth band of the Mediterranean-style screener (4–7 of 16)."
            : "Your diet items place you in the lowest band of the Mediterranean-style screener (0–3 of 16).";
  return category("diet", "Diet", SOURCES.diet, componentAnswered(options, points, explanation));
}

// ---------------------------------------------------------------------------
// Physical activity: moderate minutes + 2 × vigorous minutes per week.
// ---------------------------------------------------------------------------

function activityCategory(answers: AnswerMap): ScoreCategory {
  const options = { questionId: "weekly_moderate_activity_minutes" as const, label: "Weekly moderate-equivalent activity", source: SOURCES.activity };
  const moderate = finiteNumber(answers.weekly_moderate_activity_minutes);
  const vigorous = finiteNumber(answers.weekly_vigorous_activity_minutes) ?? 0;
  if (moderate === undefined) {
    return category("physical-activity", "Physical activity", SOURCES.activity, componentMissing(options, "Weekly moderate activity minutes were not answered with a valid value."));
  }
  const equivalent = moderate + 2 * vigorous;
  const points = equivalent >= 150 ? 100 : equivalent >= 120 ? 90 : equivalent >= 90 ? 80 : equivalent >= 60 ? 60 : equivalent >= 30 ? 40 : equivalent > 0 ? 20 : 0;
  const explanation =
    equivalent >= 150
      ? "You reported at least 150 moderate-equivalent minutes a week (vigorous minutes count double)."
      : equivalent >= 120
        ? "You reported 120–149 moderate-equivalent minutes a week."
        : equivalent >= 90
          ? "You reported 90–119 moderate-equivalent minutes a week."
          : equivalent >= 60
            ? "You reported 60–89 moderate-equivalent minutes a week."
            : equivalent >= 30
              ? "You reported 30–59 moderate-equivalent minutes a week."
              : equivalent > 0
                ? "You reported 1–29 moderate-equivalent minutes a week."
                : "You reported no moderate or vigorous activity in a usual week.";
  return category("physical-activity", "Physical activity", SOURCES.activity, componentAnswered(options, points, explanation));
}

// ---------------------------------------------------------------------------
// Nicotine: never 100; former ≥5 y 75; 1–<5 y 50; <1 y 25; current 0;
// minus 20 if someone smokes indoors at home.
// ---------------------------------------------------------------------------

function nicotineCategory(answers: AnswerMap): { category: ScoreCategory; resolved: boolean } {
  const options = { questionId: "current_tobacco_nicotine" as const, label: "Nicotine exposure", source: SOURCES.nicotine };
  const current = answers.current_tobacco_nicotine;
  const context = answers.tobacco_nicotine_context;
  const former = answers.smoking_history_former;
  const yearsSinceQuit = finiteNumber(answers.smoking_years_since_quit);
  const secondhand = answers.secondhand_smoke_home === true;

  let base: number | undefined;
  let explanation: string | undefined;
  if (current === true && context === "only_prescribed_nrt_quit_plan") {
    base = 25;
    explanation = "You reported using only prescribed nicotine replacement in a quit plan, scored like a quit under one year ago.";
  } else if (current === true && (context === "tobacco_vape_or_other_nicotine" || context === "both")) {
    base = 0;
    explanation = "You reported current tobacco, vaping, or other nicotine use.";
  } else if (current === false && former === false) {
    base = 100;
    explanation = "You reported never smoking regularly and no current nicotine use.";
  } else if (current === false && former === true && yearsSinceQuit !== undefined) {
    base = yearsSinceQuit >= 5 ? 75 : yearsSinceQuit >= 1 ? 50 : 25;
    explanation =
      yearsSinceQuit >= 5
        ? "You reported stopping smoking five or more years ago."
        : yearsSinceQuit >= 1
          ? "You reported stopping smoking one to under five years ago."
          : "You reported stopping smoking under one year ago.";
  }

  if (base === undefined || explanation === undefined) {
    const missing =
      current === true
        ? "The current nicotine context was not resolved."
        : current === false
          ? "Past smoking history, or the time since quitting, was not answered."
          : "Current tobacco or nicotine use was not answered.";
    return { category: category("nicotine", "Nicotine exposure", SOURCES.nicotine, componentMissing(options, missing)), resolved: false };
  }
  const points = secondhand ? Math.max(0, base - 20) : base;
  const fullExplanation = secondhand
    ? `${explanation} Twenty points are removed because someone smokes indoors at your home.`
    : explanation;
  return { category: category("nicotine", "Nicotine exposure", SOURCES.nicotine, componentAnswered(options, points, fullExplanation)), resolved: true };
}

// ---------------------------------------------------------------------------
// Sleep: 7–<9 h 100; 9–<10 h 90; 6–<7 h 70; 5–<6 or ≥10 h 40; 4–<5 h 20; <4 h 0.
// ---------------------------------------------------------------------------

function sleepCategory(answers: AnswerMap): ScoreCategory {
  const options = { questionId: "usual_sleep_hours" as const, label: "Usual sleep duration", source: SOURCES.sleep };
  const hours = finiteNumber(answers.usual_sleep_hours);
  if (hours === undefined || hours > 24) {
    return category("sleep", "Sleep health", SOURCES.sleep, componentMissing(options, "Usual sleep hours were not answered with a valid value."));
  }
  const points = hours >= 7 && hours < 9 ? 100 : hours >= 9 && hours < 10 ? 90 : hours >= 6 && hours < 7 ? 70 : (hours >= 5 && hours < 6) || hours >= 10 ? 40 : hours >= 4 ? 20 : 0;
  const explanation =
    points === 100
      ? "You reported seven to under nine hours of usual sleep."
      : points === 90
        ? "You reported nine to under ten hours of usual sleep."
        : points === 70
          ? "You reported six to under seven hours of usual sleep."
          : hours >= 10
            ? "You reported ten or more hours of usual sleep."
            : points === 40
              ? "You reported five to under six hours of usual sleep."
              : points === 20
                ? "You reported four to under five hours of usual sleep."
                : "You reported under four hours of usual sleep.";
  return category("sleep", "Sleep health", SOURCES.sleep, componentAnswered(options, points, explanation));
}

// ---------------------------------------------------------------------------
// Body-mass index: <25 100; 25–29.9 70; 30–34.9 30; 35–39.9 15; ≥40 0.
// ---------------------------------------------------------------------------

function bmiCategory(answers: AnswerMap): ScoreCategory {
  const options = { questionId: "body_mass_index" as const, label: "Body-mass index", source: SOURCES.bmi };
  const height = finiteNumber(answers.height_cm, 50);
  const weight = finiteNumber(answers.weight_kg, 20);
  if (height === undefined || weight === undefined || height > 272 || weight > 400) {
    return category("body-mass-index", "Body-mass index", SOURCES.bmi, componentMissing(options, "Height and weight are both needed to compute body-mass index."));
  }
  const bmi = new Decimal(weight).div(new Decimal(height).div(100).pow(2)).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
  const points = bmi < 25 ? 100 : bmi < 30 ? 70 : bmi < 35 ? 30 : bmi < 40 ? 15 : 0;
  const explanation =
    bmi < 25
      ? "Your body-mass index is under 25 kg/m²."
      : bmi < 30
        ? "Your body-mass index is between 25 and 29.9 kg/m²."
        : bmi < 35
          ? "Your body-mass index is between 30 and 34.9 kg/m²."
          : bmi < 40
            ? "Your body-mass index is between 35 and 39.9 kg/m²."
            : "Your body-mass index is 40 kg/m² or more.";
  return category("body-mass-index", "Body-mass index", SOURCES.bmi, componentAnswered(options, points, explanation));
}

// ---------------------------------------------------------------------------
// Confirmed laboratory values (same lookup rules as the pathology engine).
// ---------------------------------------------------------------------------

function latestLab(labs: ReadonlyArray<ConfirmedLabValue>, marker: LabMarker): ConfirmedLabValue | undefined {
  return labs
    .filter((lab) => lab.reviewed.marker === marker)
    .reduce<ConfirmedLabValue | undefined>(
      (latest, lab) =>
        latest === undefined || lab.reviewed.collectionDate >= latest.reviewed.collectionDate ? lab : latest,
      undefined,
    );
}

function labValueIn(lab: ConfirmedLabValue | undefined, unit: string): number | undefined {
  if (!lab) return undefined;
  if (canonicalUnit(lab.reviewed.unit) === unit && Number.isFinite(lab.reviewed.value)) return lab.reviewed.value;
  if (canonicalUnit(lab.normalized.unit) === unit && Number.isFinite(lab.normalized.value)) return lab.normalized.value;
  return undefined;
}

// Non-HDL cholesterol (mg/dL): <130 100; 130–159 60; 160–189 40; 190–219 20; ≥220 0;
// minus 20 if lipid-lowering treatment is taken.
function lipidCategory(answers: AnswerMap, labs: ReadonlyArray<ConfirmedLabValue>): ScoreCategory {
  const options = { questionId: "lab:non_hdl_cholesterol" as const, label: "Non-HDL cholesterol", source: SOURCES.lipids };
  const total = labValueIn(latestLab(labs, "total_cholesterol"), "mg/dL");
  const hdl = labValueIn(latestLab(labs, "hdl_cholesterol"), "mg/dL");
  if (total === undefined || hdl === undefined || total <= hdl) {
    return category("blood-lipids", "Blood lipids", SOURCES.lipids, componentMissing(options, "Confirmed total and HDL cholesterol results are needed to compute non-HDL cholesterol."));
  }
  const nonHdl = total - hdl;
  const treated = answers.statin_current === true;
  const base = nonHdl < 130 ? 100 : nonHdl < 160 ? 60 : nonHdl < 190 ? 40 : nonHdl < 220 ? 20 : 0;
  const points = treated ? Math.max(0, base - 20) : base;
  const band =
    nonHdl < 130
      ? "Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L)."
      : nonHdl < 160
        ? "Your non-HDL cholesterol is 130–159 mg/dL (3.4–4.1 mmol/L)."
        : nonHdl < 190
          ? "Your non-HDL cholesterol is 160–189 mg/dL (4.1–4.9 mmol/L)."
          : nonHdl < 220
            ? "Your non-HDL cholesterol is 190–219 mg/dL (4.9–5.7 mmol/L)."
            : "Your non-HDL cholesterol is 220 mg/dL (5.7 mmol/L) or more.";
  const explanation = treated ? `${band} Twenty points are removed because you take a statin.` : band;
  return category("blood-lipids", "Blood lipids", SOURCES.lipids, componentAnswered(options, points, explanation));
}

// Glucose: no diabetes and HbA1c <5.7 % (or fasting glucose <100 mg/dL) 100; 5.7–6.4 % (100–125) 60;
// diabetes with HbA1c <7 % 40; 7–7.9 % 30; 8–8.9 % 20; 9–9.9 % 10; ≥10 % 0.
function glucoseCategory(answers: AnswerMap, labs: ReadonlyArray<ConfirmedLabValue>): ScoreCategory {
  const options = { questionId: "lab:glycaemic_status" as const, label: "Glycaemic status", source: SOURCES.glucose };
  const conditions = answers.diagnosed_conditions_core;
  const diabetes = Array.isArray(conditions) ? conditions.includes("diabetes") : conditions === undefined ? undefined : false;
  const hba1c = labValueIn(latestLab(labs, "hba1c"), "%");
  const glucoseLab = latestLab(labs, "glucose");
  const fastingGlucose = glucoseLab?.reviewed.fastingStatus === "fasting" ? labValueIn(glucoseLab, "mg/dL") : undefined;

  if (diabetes === undefined) {
    return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentMissing(options, "Diagnosed conditions were not answered, so diabetes status is unknown."));
  }
  if (diabetes) {
    if (hba1c === undefined) {
      return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentMissing(options, "A confirmed HbA1c result is needed to score glucose with diagnosed diabetes."));
    }
    const points = hba1c < 7 ? 40 : hba1c < 8 ? 30 : hba1c < 9 ? 20 : hba1c < 10 ? 10 : 0;
    const explanation =
      hba1c < 7
        ? "You reported diagnosed diabetes with an HbA1c under 7 %."
        : hba1c < 8
          ? "You reported diagnosed diabetes with an HbA1c of 7–7.9 %."
          : hba1c < 9
            ? "You reported diagnosed diabetes with an HbA1c of 8–8.9 %."
            : hba1c < 10
              ? "You reported diagnosed diabetes with an HbA1c of 9–9.9 %."
              : "You reported diagnosed diabetes with an HbA1c of 10 % or more.";
    return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentAnswered(options, points, explanation));
  }
  if (hba1c !== undefined) {
    const points = hba1c < 5.7 ? 100 : hba1c < 6.5 ? 60 : 40;
    const explanation =
      hba1c < 5.7
        ? "No diagnosed diabetes and an HbA1c under 5.7 %."
        : hba1c < 6.5
          ? "No diagnosed diabetes and an HbA1c of 5.7–6.4 %, the prediabetes range."
          : "No diagnosed diabetes but an HbA1c of 6.5 % or more, which is in the diabetes range and deserves clinical confirmation.";
    return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentAnswered(options, points, explanation));
  }
  if (fastingGlucose !== undefined) {
    const points = fastingGlucose < 100 ? 100 : fastingGlucose < 126 ? 60 : 40;
    const explanation =
      fastingGlucose < 100
        ? "No diagnosed diabetes and a fasting glucose under 100 mg/dL (5.6 mmol/L)."
        : fastingGlucose < 126
          ? "No diagnosed diabetes and a fasting glucose of 100–125 mg/dL (5.6–6.9 mmol/L), the prediabetes range."
          : "No diagnosed diabetes but a fasting glucose of 126 mg/dL (7.0 mmol/L) or more, which is in the diabetes range and deserves clinical confirmation.";
    return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentAnswered(options, points, explanation));
  }
  return category("blood-glucose", "Blood glucose", SOURCES.glucose, componentMissing(options, "A confirmed HbA1c or fasting glucose result is needed to score glucose."));
}

// ---------------------------------------------------------------------------
// Blood pressure: <120/<80 100; 120–129/<80 75; 130–139 or 80–89 50;
// 140–159 or 90–99 25; ≥160 or ≥100 0; minus 20 if treated.
// ---------------------------------------------------------------------------

function bloodPressureCategory(answers: AnswerMap): ScoreCategory {
  const options = { questionId: "blood_pressure_systolic" as const, label: "Blood pressure", source: SOURCES.bloodPressure };
  const systolic = finiteNumber(answers.blood_pressure_systolic, 60);
  const diastolic = finiteNumber(answers.blood_pressure_diastolic, 30);
  if (systolic === undefined || diastolic === undefined || systolic > 260 || diastolic > 160 || diastolic >= systolic) {
    return category("blood-pressure", "Blood pressure", SOURCES.bloodPressure, componentMissing(options, "A recent systolic and diastolic reading are both needed to score blood pressure."));
  }
  const treated = answers.bp_medication_current === true;
  const base =
    systolic >= 160 || diastolic >= 100 ? 0
      : systolic >= 140 || diastolic >= 90 ? 25
        : systolic >= 130 || diastolic >= 80 ? 50
          : systolic >= 120 ? 75
            : 100;
  const points = treated ? Math.max(0, base - 20) : base;
  const band =
    base === 100
      ? "Your reading is under 120/80 mmHg."
      : base === 75
        ? "Your systolic reading is 120–129 mmHg with a diastolic under 80."
        : base === 50
          ? "Your reading is in the 130–139 systolic or 80–89 diastolic range."
          : base === 25
            ? "Your reading is in the 140–159 systolic or 90–99 diastolic range."
            : "Your reading is 160 systolic or 100 diastolic mmHg or more.";
  const explanation = treated ? `${band} Twenty points are removed because you take blood-pressure medicine.` : band;
  return category("blood-pressure", "Blood pressure", SOURCES.bloodPressure, componentAnswered(options, points, explanation));
}

// ---------------------------------------------------------------------------
// Ledger and routing
// ---------------------------------------------------------------------------

function scoreLedger(categories: ReadonlyArray<ScoreCategory>, assessmentDepth: AnalysisDepth): ScoreLedger {
  const earned = Decimal.sum(...categories.map((item) => item.earnedPoints));
  const assessed = Decimal.sum(...categories.map((item) => item.assessedPoints));
  const applicable = Decimal.sum(...categories.map((item) => item.applicablePoints));
  return {
    label: ESSENTIAL_EIGHT_LABEL,
    scoreVersion: ESSENTIAL_EIGHT_VERSION,
    assessmentDepth,
    coverage: assessed.times(100).div(applicable).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(),
    earnedPoints: earned.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    assessedPoints: assessed.toNumber(),
    applicablePoints: applicable.toNumber(),
    answeredCategoryCount: categories.filter((item) => item.assessedPoints > 0).length,
    categories,
    explanations: [
      "This score applies the American Heart Association Life's Essential 8 cut-points to your answers and confirmed laboratory values.",
      "Each metric is scored 0–100 as published; the total is the unweighted mean of the metrics that could be assessed.",
      "Missing metrics reduce coverage rather than earning zero points; the full score needs all eight metrics.",
    ],
  };
}

function insufficientCoverage(
  ledger: ScoreLedger,
  reason: PublicInsufficientCoverageResult["reason"],
): PublicInsufficientCoverageResult {
  return {
    kind: "insufficient-coverage",
    reason,
    label: ledger.label,
    scoreVersion: ledger.scoreVersion,
    assessmentDepth: ledger.assessmentDepth,
    coverage: ledger.coverage,
    answeredCategoryCount: ledger.answeredCategoryCount,
    answeredCategories: ledger.categories.map((scoreCategory) => ({
      id: scoreCategory.id,
      label: scoreCategory.label,
      coverage: scoreCategory.coverage,
      answeredComponents: scoreCategory.components.filter((component) => component.status === "answered").length,
      missingComponents: scoreCategory.components.filter((component) => component.status === "missing").length,
    })),
    explanations: ledger.explanations,
  };
}

export function calculateEssentialEight(
  answers: AnswerMap,
  routing: ScoreRouting,
  labs: ReadonlyArray<ConfirmedLabValue> = [],
): EssentialEightResult {
  if (
    routing.ageYears === null ||
    !Number.isInteger(routing.ageYears) ||
    !Number.isFinite(routing.ageYears) ||
    routing.ageYears < 18
  ) {
    return { kind: "not-available", reason: "under-18-or-age-unverified" };
  }

  const categories = [
    dietCategory(answers),
    activityCategory(answers),
    nicotineCategory(answers).category,
    sleepCategory(answers),
    bmiCategory(answers),
    lipidCategory(answers, labs),
    glucoseCategory(answers, labs),
    bloodPressureCategory(answers),
  ] as const;
  const ledger = scoreLedger(categories, routing.assessmentDepth);

  if (routing.assessmentDepth === "express") return insufficientCoverage(ledger, "express-assessment");
  if (routing.assessmentDepth === "quick") return insufficientCoverage(ledger, "quick-assessment");
  if (ledger.answeredCategoryCount < ESSENTIAL_EIGHT_MINIMUM_METRICS) {
    return insufficientCoverage(ledger, "answer-more-wellness-habits");
  }

  const score = new Decimal(ledger.earnedPoints)
    .times(100)
    .div(ledger.assessedPoints)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return { kind: "adult-score", score, ...ledger };
}

// ---------------------------------------------------------------------------
// Action plan: the three metrics with the largest point deficit.
// ---------------------------------------------------------------------------

const ACTION_COPY: Readonly<Record<ScoreCategoryId, { title: string; nextStep: string }>> = {
  diet: {
    title: "Choose one practical food-pattern step",
    nextStep: "Choose one feasible addition or swap, such as a daily vegetable portion, a whole-grain choice, or one fewer sugary drink, without calorie targets or restrictive rules.",
  },
  "physical-activity": {
    title: "Choose one feasible movement step",
    nextStep: "Add a block of moderate activity you can keep up, such as a brisk 20–30 minute walk on more days; vigorous minutes count double towards the 150-minute target.",
  },
  nicotine: {
    title: "Choose the tobacco or nicotine support that fits you",
    nextStep: "If you want to change current use, ask a qualified local service, pharmacist, or clinician about support options; combining counselling with medication roughly doubles quit rates.",
  },
  sleep: {
    title: "Choose one sleep-routine step",
    nextStep: "Protect a regular sleep window that allows seven to nine hours, and discuss persistent short, long, or unrefreshing sleep with a clinician.",
  },
  "body-mass-index": {
    title: "Discuss weight and body composition in context",
    nextStep: "Body-mass index is one metric among eight; if you want to act on it, a clinician or dietitian can help set a realistic, non-restrictive plan.",
  },
  "blood-lipids": {
    title: "Review your cholesterol results with a clinician",
    nextStep: "Non-HDL cholesterol above target is worth discussing; lifestyle steps and, where indicated, treatment decisions belong to that conversation.",
  },
  "blood-glucose": {
    title: "Review your glucose results with a clinician",
    nextStep: "A prediabetes-range or above-target result is worth a conversation about confirmation, follow-up and prevention options.",
  },
  "blood-pressure": {
    title: "Have your blood pressure re-checked",
    nextStep: "A reading above 120/80 mmHg deserves repeat measurement and, from 130/80, a conversation with a clinician about next steps; do not change any medicine from this report.",
  },
};

export function buildActionPlan(
  leaves: ReadonlyArray<RiskLeaf>,
  score: EssentialEightResult,
): ActionItem[] {
  // Qualitative leaves remain prominent in the urgent summary and canopy. They cannot
  // consume or reorder the three score-derived action slots.
  void leaves;
  if (score.kind !== "adult-score") return [];
  return score.categories
    .flatMap((scoreCategory) => {
      const component = scoreCategory.components[0];
      const deficit = new Decimal(scoreCategory.assessedPoints)
        .minus(scoreCategory.earnedPoints)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber();
      if (deficit <= 0 || component.status !== "answered") return [];
      const copy = ACTION_COPY[scoreCategory.id];
      return [{
        id: `habit-${scoreCategory.id}`,
        kind: "habit" as const,
        categoryId: scoreCategory.id,
        title: copy.title,
        reason: component.explanation,
        nextStep: copy.nextStep,
        sources: [scoreCategory.source],
        opportunity: deficit,
      }];
    })
    .sort(
      (left, right) =>
        right.opportunity - left.opportunity ||
        SCORE_CATEGORY_IDS.indexOf(left.categoryId) - SCORE_CATEGORY_IDS.indexOf(right.categoryId),
    )
    .slice(0, 3);
}
