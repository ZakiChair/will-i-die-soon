import { describe, expect, it } from "vitest";

import { evidenceSources } from "../data/evidence";
import { riskRules } from "../data/rules";
import { createRedactedExport } from "../lib/export";
import {
  normalizeLabValue,
  type ConfirmedLabValue,
  type FastingStatus,
  type LabMarker,
} from "../lib/labs";
import { prototypePolicy, RISK_RULESET_VERSION } from "../lib/release-policy";
import { evaluateRisks } from "../lib/risk-engine";
import {
  ESSENTIAL_EIGHT_LABEL,
  SCORE_CATEGORY_IDS,
  buildActionPlan,
  calculateEssentialEight,
} from "../lib/scoring";
import type {
  ActionItem,
  AdultEssentialEightResult,
  ScoreCategoryId,
  ScoreComponent,
} from "../lib/scoring";
import type {
  AnswerMap,
  EmergencyKind,
  EvidenceSource,
  ProfileContext,
  RiskLeaf,
} from "../lib/types";
import {
  riskFactorLabelsFr,
  riskRuleCopyFr,
} from "./risk-copy-fr";
import {
  ESSENTIAL_EIGHT_LABEL_FR,
  actionCopyFr,
  protectiveRootLabelsFr,
  scoreCategoryLabelsFr,
  scoreComponentExplanationsFr,
  scoreComponentLabelsFr,
  scoreExplanationSuffixesFr,
  scoreLedgerExplanationsFr,
} from "./score-copy-fr";
import {
  localizeActions,
  localizeProtectiveRoots,
  localizeEssentialEight,
  localizeRiskLeaves,
} from "./presentation";

const adultProfile: ProfileContext = { age: 35, countryCode: "CH" };

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
    reviewed: {
      marker,
      valueText: String(value),
      value,
      unit,
      referenceRange: "",
      collectionDate,
      fastingStatus,
    },
    normalized: {
      value: normalized.normalizedValue,
      unit: normalized.normalizedUnit,
      displayValue: normalized.displayValue,
    },
  };
}

/** Every Life's Essential 8 metric at its top band. */
const COMPLETE_ANSWERS: AnswerMap = {
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
const COMPLETE_LABS: ReadonlyArray<ConfirmedLabValue> = [
  lab("total_cholesterol", 180, "mg/dL"),
  lab("hdl_cholesterol", 60, "mg/dL"),
  lab("hba1c", 5.2, "%"),
];
const NO_LABS: ReadonlyArray<ConfirmedLabValue> = [];

/** A mixed profile with every penalty suffix and a deficit on every metric. */
const MIXED_ANSWERS: AnswerMap = {
  ...COMPLETE_ANSWERS,
  plant_food_frequency: 2,
  diet_whole_grains: "sometimes",
  diet_legumes: 1,
  diet_processed_meat: "often",
  diet_sugary_drinks: 2,
  weekly_moderate_activity_minutes: 60,
  weekly_vigorous_activity_minutes: 15,
  current_tobacco_nicotine: true,
  tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  secondhand_smoke_home: true,
  usual_sleep_hours: 6.5,
  weight_kg: 85,
  statin_current: true,
  blood_pressure_systolic: 134,
  blood_pressure_diastolic: 84,
  bp_medication_current: true,
};
const MIXED_LABS: ReadonlyArray<ConfirmedLabValue> = [
  lab("total_cholesterol", 230, "mg/dL"),
  lab("hdl_cholesterol", 45, "mg/dL"),
  lab("hba1c", 6.0, "%"),
];

type ComponentCase = {
  readonly questionId: ScoreComponent["questionId"];
  readonly answers: AnswerMap;
  readonly labs: ReadonlyArray<ConfirmedLabValue>;
  readonly status: ScoreComponent["status"];
  readonly explanation: string;
};

function answered(
  questionId: ComponentCase["questionId"],
  answers: AnswerMap,
  explanation: string,
  labs: ReadonlyArray<ConfirmedLabValue> = COMPLETE_LABS,
): ComponentCase {
  return { questionId, answers, labs, status: "answered", explanation };
}

function missing(
  questionId: ComponentCase["questionId"],
  answers: AnswerMap,
  explanation: string,
  labs: ReadonlyArray<ConfirmedLabValue> = COMPLETE_LABS,
): ComponentCase {
  return { questionId, answers, labs, status: "missing", explanation };
}

const dietCases: ReadonlyArray<ComponentCase> = [
  missing("diet_pattern", { diet_legumes: null }, "All five diet items are needed to place the diet pattern."),
  answered("diet_pattern", {}, "Your diet items place you in the top band of the Mediterranean-style screener (15–16 of 16)."),
  answered(
    "diet_pattern",
    { diet_sugary_drinks: 2, diet_legumes: 2 },
    "Your diet items place you in the second band of the Mediterranean-style screener (12–14 of 16).",
  ),
  answered(
    "diet_pattern",
    { plant_food_frequency: 3, diet_whole_grains: "often", diet_legumes: 2, diet_processed_meat: "sometimes", diet_sugary_drinks: 1 },
    "Your diet items place you in the middle band of the Mediterranean-style screener (8–11 of 16).",
  ),
  answered(
    "diet_pattern",
    { plant_food_frequency: 2, diet_whole_grains: "rarely", diet_legumes: 1, diet_processed_meat: "often", diet_sugary_drinks: 2 },
    "Your diet items place you in the fourth band of the Mediterranean-style screener (4–7 of 16).",
  ),
  answered(
    "diet_pattern",
    { plant_food_frequency: 0, diet_whole_grains: "never", diet_legumes: 0, diet_processed_meat: "daily", diet_sugary_drinks: 4 },
    "Your diet items place you in the lowest band of the Mediterranean-style screener (0–3 of 16).",
  ),
];

const activityCases: ReadonlyArray<ComponentCase> = [
  missing(
    "weekly_moderate_activity_minutes",
    { weekly_moderate_activity_minutes: null },
    "Weekly moderate activity minutes were not answered with a valid value.",
  ),
  answered(
    "weekly_moderate_activity_minutes",
    { weekly_moderate_activity_minutes: 60, weekly_vigorous_activity_minutes: 45 },
    "You reported at least 150 moderate-equivalent minutes a week (vigorous minutes count double).",
  ),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 120 }, "You reported 120–149 moderate-equivalent minutes a week."),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 90 }, "You reported 90–119 moderate-equivalent minutes a week."),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 60 }, "You reported 60–89 moderate-equivalent minutes a week."),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 30 }, "You reported 30–59 moderate-equivalent minutes a week."),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 10 }, "You reported 1–29 moderate-equivalent minutes a week."),
  answered("weekly_moderate_activity_minutes", { weekly_moderate_activity_minutes: 0 }, "You reported no moderate or vigorous activity in a usual week."),
];

const nicotineCases: ReadonlyArray<ComponentCase> = [
  answered(
    "current_tobacco_nicotine",
    { current_tobacco_nicotine: true, tobacco_nicotine_context: "only_prescribed_nrt_quit_plan" },
    "You reported using only prescribed nicotine replacement in a quit plan, scored like a quit under one year ago.",
  ),
  answered(
    "current_tobacco_nicotine",
    { current_tobacco_nicotine: true, tobacco_nicotine_context: "tobacco_vape_or_other_nicotine" },
    "You reported current tobacco, vaping, or other nicotine use.",
  ),
  answered("current_tobacco_nicotine", {}, "You reported never smoking regularly and no current nicotine use."),
  answered(
    "current_tobacco_nicotine",
    { smoking_history_former: true, smoking_years_since_quit: 6 },
    "You reported stopping smoking five or more years ago.",
  ),
  answered(
    "current_tobacco_nicotine",
    { smoking_history_former: true, smoking_years_since_quit: 2 },
    "You reported stopping smoking one to under five years ago.",
  ),
  answered(
    "current_tobacco_nicotine",
    { smoking_history_former: true, smoking_years_since_quit: 0 },
    "You reported stopping smoking under one year ago.",
  ),
  answered(
    "current_tobacco_nicotine",
    { secondhand_smoke_home: true },
    "You reported never smoking regularly and no current nicotine use. Twenty points are removed because someone smokes indoors at your home.",
  ),
  missing(
    "current_tobacco_nicotine",
    { current_tobacco_nicotine: true, tobacco_nicotine_context: null },
    "The current nicotine context was not resolved.",
  ),
  missing(
    "current_tobacco_nicotine",
    { smoking_history_former: true, smoking_years_since_quit: null },
    "Past smoking history, or the time since quitting, was not answered.",
  ),
  missing(
    "current_tobacco_nicotine",
    { current_tobacco_nicotine: null },
    "Current tobacco or nicotine use was not answered.",
  ),
];

const sleepCases: ReadonlyArray<ComponentCase> = [
  missing("usual_sleep_hours", { usual_sleep_hours: null }, "Usual sleep hours were not answered with a valid value."),
  answered("usual_sleep_hours", { usual_sleep_hours: 8 }, "You reported seven to under nine hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 9 }, "You reported nine to under ten hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 6.5 }, "You reported six to under seven hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 10 }, "You reported ten or more hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 5.5 }, "You reported five to under six hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 4.5 }, "You reported four to under five hours of usual sleep."),
  answered("usual_sleep_hours", { usual_sleep_hours: 3 }, "You reported under four hours of usual sleep."),
];

const bmiCases: ReadonlyArray<ComponentCase> = [
  missing("body_mass_index", { weight_kg: null }, "Height and weight are both needed to compute body-mass index."),
  answered("body_mass_index", {}, "Your body-mass index is under 25 kg/m²."),
  answered("body_mass_index", { weight_kg: 85 }, "Your body-mass index is between 25 and 29.9 kg/m²."),
  answered("body_mass_index", { weight_kg: 100 }, "Your body-mass index is between 30 and 34.9 kg/m²."),
  answered("body_mass_index", { weight_kg: 115 }, "Your body-mass index is between 35 and 39.9 kg/m²."),
  answered("body_mass_index", { weight_kg: 130 }, "Your body-mass index is 40 kg/m² or more."),
];

function lipids(total: number, hdl: number): ReadonlyArray<ConfirmedLabValue> {
  return [lab("total_cholesterol", total, "mg/dL"), lab("hdl_cholesterol", hdl, "mg/dL"), lab("hba1c", 5.2, "%")];
}

const lipidCases: ReadonlyArray<ComponentCase> = [
  missing(
    "lab:non_hdl_cholesterol",
    {},
    "Confirmed total and HDL cholesterol results are needed to compute non-HDL cholesterol.",
    NO_LABS,
  ),
  answered("lab:non_hdl_cholesterol", {}, "Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L).", lipids(180, 60)),
  answered("lab:non_hdl_cholesterol", {}, "Your non-HDL cholesterol is 130–159 mg/dL (3.4–4.1 mmol/L).", lipids(200, 55)),
  answered("lab:non_hdl_cholesterol", {}, "Your non-HDL cholesterol is 160–189 mg/dL (4.1–4.9 mmol/L).", lipids(230, 55)),
  answered("lab:non_hdl_cholesterol", {}, "Your non-HDL cholesterol is 190–219 mg/dL (4.9–5.7 mmol/L).", lipids(250, 50)),
  answered("lab:non_hdl_cholesterol", {}, "Your non-HDL cholesterol is 220 mg/dL (5.7 mmol/L) or more.", lipids(280, 50)),
  answered(
    "lab:non_hdl_cholesterol",
    { statin_current: true },
    "Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L). Twenty points are removed because you take a statin.",
    lipids(180, 60),
  ),
];

function glucoseLabs(
  hba1c: number | null,
  fastingGlucose: number | null = null,
  fastingStatus: FastingStatus = "fasting",
): ReadonlyArray<ConfirmedLabValue> {
  return [
    lab("total_cholesterol", 180, "mg/dL"),
    lab("hdl_cholesterol", 60, "mg/dL"),
    ...(hba1c === null ? [] : [lab("hba1c", hba1c, "%")]),
    ...(fastingGlucose === null ? [] : [lab("glucose", fastingGlucose, "mg/dL", fastingStatus)]),
  ];
}

const diabetes: AnswerMap = { diagnosed_conditions_core: ["diabetes"] };

const glucoseCases: ReadonlyArray<ComponentCase> = [
  missing(
    "lab:glycaemic_status",
    { diagnosed_conditions_core: undefined },
    "Diagnosed conditions were not answered, so diabetes status is unknown.",
  ),
  missing(
    "lab:glycaemic_status",
    diabetes,
    "A confirmed HbA1c result is needed to score glucose with diagnosed diabetes.",
    glucoseLabs(null),
  ),
  answered("lab:glycaemic_status", diabetes, "You reported diagnosed diabetes with an HbA1c under 7 %.", glucoseLabs(6.8)),
  answered("lab:glycaemic_status", diabetes, "You reported diagnosed diabetes with an HbA1c of 7–7.9 %.", glucoseLabs(7.5)),
  answered("lab:glycaemic_status", diabetes, "You reported diagnosed diabetes with an HbA1c of 8–8.9 %.", glucoseLabs(8.5)),
  answered("lab:glycaemic_status", diabetes, "You reported diagnosed diabetes with an HbA1c of 9–9.9 %.", glucoseLabs(9.5)),
  answered("lab:glycaemic_status", diabetes, "You reported diagnosed diabetes with an HbA1c of 10 % or more.", glucoseLabs(10.5)),
  answered("lab:glycaemic_status", {}, "No diagnosed diabetes and an HbA1c under 5.7 %.", glucoseLabs(5.2)),
  answered("lab:glycaemic_status", {}, "No diagnosed diabetes and an HbA1c of 5.7–6.4 %, the prediabetes range.", glucoseLabs(6.0)),
  answered(
    "lab:glycaemic_status",
    {},
    "No diagnosed diabetes but an HbA1c of 6.5 % or more, which is in the diabetes range and deserves clinical confirmation.",
    glucoseLabs(6.8),
  ),
  answered(
    "lab:glycaemic_status",
    {},
    "No diagnosed diabetes and a fasting glucose under 100 mg/dL (5.6 mmol/L).",
    glucoseLabs(null, 90),
  ),
  answered(
    "lab:glycaemic_status",
    {},
    "No diagnosed diabetes and a fasting glucose of 100–125 mg/dL (5.6–6.9 mmol/L), the prediabetes range.",
    glucoseLabs(null, 110),
  ),
  answered(
    "lab:glycaemic_status",
    {},
    "No diagnosed diabetes but a fasting glucose of 126 mg/dL (7.0 mmol/L) or more, which is in the diabetes range and deserves clinical confirmation.",
    glucoseLabs(null, 140),
  ),
  missing(
    "lab:glycaemic_status",
    {},
    "A confirmed HbA1c or fasting glucose result is needed to score glucose.",
    glucoseLabs(null, 90, "not_fasting"),
  ),
];

const bloodPressureCases: ReadonlyArray<ComponentCase> = [
  missing(
    "blood_pressure_systolic",
    { blood_pressure_diastolic: null },
    "A recent systolic and diastolic reading are both needed to score blood pressure.",
  ),
  answered("blood_pressure_systolic", {}, "Your reading is under 120/80 mmHg."),
  answered(
    "blood_pressure_systolic",
    { blood_pressure_systolic: 125 },
    "Your systolic reading is 120–129 mmHg with a diastolic under 80.",
  ),
  answered(
    "blood_pressure_systolic",
    { blood_pressure_systolic: 134, blood_pressure_diastolic: 84 },
    "Your reading is in the 130–139 systolic or 80–89 diastolic range.",
  ),
  answered(
    "blood_pressure_systolic",
    { blood_pressure_systolic: 145, blood_pressure_diastolic: 92 },
    "Your reading is in the 140–159 systolic or 90–99 diastolic range.",
  ),
  answered(
    "blood_pressure_systolic",
    { blood_pressure_systolic: 165, blood_pressure_diastolic: 102 },
    "Your reading is 160 systolic or 100 diastolic mmHg or more.",
  ),
  answered(
    "blood_pressure_systolic",
    { bp_medication_current: true },
    "Your reading is under 120/80 mmHg. Twenty points are removed because you take blood-pressure medicine.",
  ),
];

const SCORE_COMPONENT_CASES: ReadonlyArray<ComponentCase> = [
  ...dietCases,
  ...activityCases,
  ...nicotineCases,
  ...sleepCases,
  ...bmiCases,
  ...lipidCases,
  ...glucoseCases,
  ...bloodPressureCases,
];

function adultScore(
  answers: AnswerMap = {},
  labs: ReadonlyArray<ConfirmedLabValue> = COMPLETE_LABS,
): AdultEssentialEightResult {
  const result = calculateEssentialEight(
    { ...COMPLETE_ANSWERS, ...answers },
    { ageYears: 35, assessmentDepth: "deep" },
    labs,
  );
  expect(result.kind).toBe("adult-score");
  if (result.kind !== "adult-score") {
    throw new Error("Expected an adult score fixture");
  }
  return result;
}

function componentFor(testCase: ComponentCase): ScoreComponent {
  const component = adultScore(testCase.answers, testCase.labs).categories
    .flatMap((category) => category.components)
    .find((candidate) => candidate.questionId === testCase.questionId);
  if (!component) throw new Error(`Missing component ${testCase.questionId}`);
  return component;
}

/** Splits a canonical explanation into its base sentence and optional penalty suffix. */
function explanationParts(explanation: string): { base: string; suffix: string | null } {
  const [base, ...rest] = explanation.split(/(?<=\.) (?=Twenty points)/);
  return { base, suffix: rest.length > 0 ? rest.join(" ") : null };
}

function localizedExplanation(explanation: string): string {
  const { base, suffix } = explanationParts(explanation);
  const localizedBase = scoreComponentExplanationsFr[base];
  return suffix ? `${localizedBase} ${scoreExplanationSuffixesFr[suffix]}` : localizedBase;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function ruleLeaf(ruleId: string): RiskLeaf {
  const rule = riskRules.find((candidate) => candidate.id === ruleId);
  if (!rule) throw new Error(`Missing rule fixture ${ruleId}`);
  const source: EvidenceSource = structuredClone(evidenceSources.whoBasicEmergencyCare);
  return {
    id: rule.id,
    ruleId: rule.id,
    rulesetVersion: RISK_RULESET_VERSION,
    group: rule.group,
    title: rule.title,
    copy: rule.copy,
    evidenceTier: rule.evidenceTier,
    urgency: rule.urgency,
    signal: rule.signal,
    factors: rule.factors.map((factor) => factor.label),
    missingInputs: [...rule.inputs],
    sources: [source],
    applicability: structuredClone(rule.applicability),
  };
}

function leafByRuleId(
  ruleId: string,
  answers: AnswerMap,
  profile: ProfileContext,
): RiskLeaf {
  const leaf = evaluateRisks(answers, profile, prototypePolicy).find(
    (candidate) => candidate.ruleId === ruleId,
  );
  if (!leaf) throw new Error(`Missing evaluated leaf ${ruleId}`);
  return leaf;
}

const emergencyCases: ReadonlyArray<{
  readonly ruleId: string;
  readonly kind: EmergencyKind;
  readonly answers: AnswerMap;
}> = [
  { ruleId: "urgent-chest", kind: "chest", answers: { urgent_chest_discomfort_now: true } },
  { ruleId: "urgent-breathing", kind: "breathing", answers: { urgent_breathing_now: true } },
  { ruleId: "urgent-stroke", kind: "stroke", answers: { urgent_stroke_signs_now: true } },
  {
    ruleId: "urgent-severe-allergy",
    kind: "severe-allergy",
    answers: { urgent_severe_allergy_now: true },
  },
  {
    ruleId: "urgent-overdose-poisoning",
    kind: "overdose-poisoning",
    answers: { urgent_overdose_poisoning_now: true },
  },
  {
    ruleId: "urgent-severe-bleeding",
    kind: "severe-bleeding",
    answers: { urgent_severe_bleeding_now: true },
  },
  { ruleId: "urgent-self-harm", kind: "self-harm", answers: { urgent_self_harm_now: true } },
  {
    ruleId: "urgent-adolescent-pregnancy-safety",
    kind: "pregnancy-safety",
    answers: {
      pregnancy_relevant: true,
      adolescent_pregnancy_urgent_safety: true,
    },
  },
  {
    ruleId: "urgent-adolescent-substance-safety",
    kind: "substance-safety",
    answers: {
      uses_cannabis: true,
      adolescent_substance_severe_timing: "happening_now",
    },
  },
];

const emergencyCountries: ReadonlyArray<{
  readonly countryCode: string;
  readonly age: number;
  readonly number: string | null;
  readonly crisis: string | null;
  readonly poison: string | null;
}> = [
  {
    countryCode: "US",
    age: 35,
    number: "911",
    crisis: "Vous pouvez également appeler le 988 ou envoyer un SMS à ce numéro pour obtenir un soutien en situation de crise.",
    poison: null,
  },
  { countryCode: "GB", age: 35, number: "999", crisis: null, poison: null },
  {
    countryCode: "CH",
    age: 35,
    number: "144",
    crisis: "Vous pouvez également appeler le 143 pour obtenir un soutien en situation de crise.",
    poison: "145",
  },
  {
    countryCode: "FR",
    age: 35,
    number: "15",
    crisis: "Vous pouvez également appeler le 3114 pour obtenir un soutien en situation de crise.",
    poison: null,
  },
  {
    countryCode: "CA",
    age: 35,
    number: "911",
    crisis: "Vous pouvez également appeler le 988 ou envoyer un SMS à ce numéro pour obtenir un soutien en situation de crise.",
    poison: null,
  },
  {
    countryCode: "BE",
    age: 35,
    number: "112",
    crisis: "Vous pouvez également appeler le 0800 32 123 (en français) ou le 1813 (en néerlandais) pour obtenir un soutien en situation de crise.",
    poison: "070 245 245",
  },
  { countryCode: "LU", age: 35, number: "112", crisis: null, poison: "8002-5500" },
  { countryCode: "DE", age: 35, number: "112", crisis: null, poison: null },
  { countryCode: "MA", age: 35, number: null, crisis: null, poison: null },
  { countryCode: "OTHER", age: 35, number: null, crisis: null, poison: null },
];

function ageForEmergency(kind: EmergencyKind, fallback: number): number {
  return kind === "pregnancy-safety" || kind === "substance-safety" ? 15 : fallback;
}

async function readJson(blob: Blob): Promise<Record<string, unknown>> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
  return JSON.parse(text) as Record<string, unknown>;
}

function schemaShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(schemaShape);
  if (value === null) return "null";
  if (typeof value !== "object") return typeof value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, schemaShape(nested)]),
  );
}

function withoutApprovedDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutApprovedDisplay);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value);
  const isSource = entries.some(([key]) => key === "url") &&
    entries.some(([key]) => key === "publisher");
  const displayFields = new Set([
    "copy",
    "explanation",
    "explanations",
    "factors",
    "label",
    "nextStep",
    "reason",
    "title",
  ]);
  return Object.fromEntries(
    entries.flatMap(([key, nested]) =>
      !isSource && displayFields.has(key)
        ? []
        : [[key, withoutApprovedDisplay(nested)]],
    ),
  );
}

describe("live French presentation corpus", () => {
  it("covers all 68 risk rules, 113 distinct factor labels, and 9 emergency kinds", () => {
    const factorLabels = riskRules.flatMap((rule) =>
      rule.factors.map((factor) => factor.label),
    );
    const emergencyKinds = riskRules.flatMap((rule) =>
      rule.emergencyKind ? [rule.emergencyKind] : [],
    );

    expect(riskRules).toHaveLength(68);
    expect(Object.keys(riskRuleCopyFr).sort()).toEqual(
      riskRules.map((rule) => rule.id).sort(),
    );
    expect(factorLabels).toHaveLength(132);
    expect(new Set(factorLabels).size).toBe(113);
    expect(Object.keys(riskFactorLabelsFr).sort()).toEqual(
      [...new Set(factorLabels)].sort(),
    );
    expect(new Set(emergencyKinds)).toEqual(
      new Set<EmergencyKind>([
        "chest",
        "breathing",
        "stroke",
        "severe-allergy",
        "overdose-poisoning",
        "severe-bleeding",
        "self-harm",
        "pregnancy-safety",
        "substance-safety",
      ]),
    );

    for (const rule of riskRules) {
      const copy = riskRuleCopyFr[rule.id];
      expect(copy.title.trim(), rule.id).not.toBe("");
      expect(copy.copy.trim(), rule.id).not.toBe("");
      expect(copy.title, rule.id).not.toBe(rule.title);
      expect(copy.copy, rule.id).not.toBe(rule.copy);
    }
    for (const label of new Set(factorLabels)) {
      expect(riskFactorLabelsFr[label].trim(), label).not.toBe("");
      expect(riskFactorLabelsFr[label], label).not.toBe(label);
    }
  });

  it("covers 8 metrics, 8 rendered components, all 63 base explanations and 3 penalty suffixes", () => {
    const components = SCORE_COMPONENT_CASES.map((testCase) => {
      const component = componentFor(testCase);
      expect(component, testCase.explanation).toMatchObject({
        questionId: testCase.questionId,
        status: testCase.status,
        explanation: testCase.explanation,
      });
      return component;
    });
    const categoryIds = adultScore().categories.map((category) => category.id);
    const componentIds = [...new Set(components.map((component) => component.questionId))];
    const parts = components.map((component) => explanationParts(component.explanation));
    const baseExplanations = [...new Set(parts.map((part) => part.base))];
    const suffixes = [...new Set(parts.flatMap((part) => (part.suffix ? [part.suffix] : [])))];
    const variantKeys = new Set(
      components.map((component) =>
        JSON.stringify([component.questionId, component.status, component.explanation]),
      ),
    );

    expect(categoryIds).toEqual(SCORE_CATEGORY_IDS);
    expect(Object.keys(scoreCategoryLabelsFr).sort()).toEqual([...categoryIds].sort());
    expect(componentIds).toHaveLength(8);
    expect(Object.keys(scoreComponentLabelsFr).sort()).toEqual(componentIds.sort());
    expect(SCORE_COMPONENT_CASES).toHaveLength(66);
    expect(variantKeys.size).toBe(66);
    expect(baseExplanations).toHaveLength(63);
    expect(Object.keys(scoreComponentExplanationsFr).sort()).toEqual(
      baseExplanations.sort(),
    );
    expect(suffixes).toHaveLength(3);
    expect(Object.keys(scoreExplanationSuffixesFr).sort()).toEqual(suffixes.sort());
    expect(new Set(components.map((component) => component.status))).toEqual(
      new Set(["answered", "missing"]),
    );
    expect(Object.keys(scoreLedgerExplanationsFr).sort()).toEqual(
      adultScore().explanations.slice().sort(),
    );
    expect(ESSENTIAL_EIGHT_LABEL_FR.trim(), "French score label").not.toBe("");
    for (const dictionary of [
      scoreCategoryLabelsFr,
      scoreComponentLabelsFr,
      scoreComponentExplanationsFr,
      scoreExplanationSuffixesFr,
      scoreLedgerExplanationsFr,
    ]) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), key).not.toBe("");
        expect(value, key).not.toBe(key);
      }
    }
  });

  it("uses non-breaking French spacing before semicolons and colons", () => {
    const frenchCopy = [
      ESSENTIAL_EIGHT_LABEL_FR,
      ...Object.values(riskRuleCopyFr).flatMap(({ title, copy }) => [title, copy]),
      ...Object.values(riskFactorLabelsFr),
      ...Object.values(scoreCategoryLabelsFr),
      ...Object.values(scoreComponentLabelsFr),
      ...Object.values(scoreComponentExplanationsFr),
      ...Object.values(scoreExplanationSuffixesFr),
      ...Object.values(scoreLedgerExplanationsFr),
      ...Object.values(actionCopyFr).flatMap(({ title, nextStep }) => [
        title,
        nextStep,
      ]),
      ...Object.values(protectiveRootLabelsFr),
    ];

    for (const value of frenchCopy) {
      for (const [index, character] of [...value].entries()) {
        if (character === ";" || character === ":") {
          expect(value[index - 1], value).toBe("\u00a0");
        }
      }
    }
  });

  it("preserves safeguarding pressure and unwanted-effect meanings", () => {
    expect(
      riskFactorLabelsFr[
        "Severe pregnancy-related symptom or current pressure or safety concern reported"
      ],
    ).toBe(
      "Symptôme grave lié à la grossesse, pressions subies actuellement ou inquiétude concernant la sécurité signalés",
    );
    expect(
      riskFactorLabelsFr[
        "Unwanted anxiety, confusion, vomiting, or functional difficulty reported"
      ],
    ).toBe(
      "Anxiété, confusion, vomissements ou difficultés à fonctionner signalés comme effets indésirables",
    );
  });

  it("keeps laboratory thresholds in both unit systems and French decimal commas", () => {
    expect(
      scoreComponentExplanationsFr["Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L)."],
    ).toBe("Votre cholestérol non-HDL est inférieur à 130 mg/dL (3,4 mmol/L).");
    expect(
      scoreComponentExplanationsFr[
        "No diagnosed diabetes and a fasting glucose of 100–125 mg/dL (5.6–6.9 mmol/L), the prediabetes range."
      ],
    ).toBe(
      "Aucun diabète diagnostiqué et une glycémie à jeun de 100 à 125 mg/dL (5,6–6,9 mmol/L), dans la zone de prédiabète.",
    );
  });

  it("reports diagnosed diabetes as a declaration, not a verdict", () => {
    for (const [english, french] of Object.entries(scoreComponentExplanationsFr)) {
      if (english.includes("diagnosed diabetes with")) {
        expect(english).toMatch(/^You reported diagnosed diabetes/);
        expect(french).toMatch(/^Vous avez déclaré un diabète diagnostiqué/);
      }
    }
  });
});

describe("risk presentation", () => {
  it("returns the exact canonical array in English and clones only French display fields", () => {
    const leaves = riskRules.map((rule) => ruleLeaf(rule.id));
    expect(localizeRiskLeaves(leaves, "en", adultProfile)).toBe(leaves);

    const localized = localizeRiskLeaves(leaves, "fr", adultProfile);
    expect(localized).not.toBe(leaves);
    expect(localized).toHaveLength(leaves.length);

    for (const [index, leaf] of leaves.entries()) {
      const presented = localized[index];
      expect(presented).not.toBe(leaf);
      expect(presented.title).toBe(riskRuleCopyFr[leaf.ruleId].title);
      expect(presented.factors).toEqual(
        leaf.factors.map((factor) => riskFactorLabelsFr[factor]),
      );
      expect({
        ...presented,
        title: leaf.title,
        copy: leaf.copy,
        factors: leaf.factors,
      }).toEqual(leaf);
      expect(presented.sources).toBe(leaf.sources);
      expect(presented.sources[0]).toBe(leaf.sources[0]);
      expect(presented.missingInputs).toBe(leaf.missingInputs);
      expect(presented.applicability).toBe(leaf.applicability);
    }
  });

  it("keeps past-event, isotretinoin, personal-safety, and coercion scope explicit", () => {
    const adolescentProfile = { age: 15, countryCode: "CH" };
    const adolescent = localizeRiskLeaves(
      [
        leafByRuleId(
          "adolescent-substance-safety-support",
          {
            uses_cannabis: true,
            adolescent_substance_severe_timing: "past_year_not_now",
          },
          adolescentProfile,
        ),
      ],
      "fr",
      adolescentProfile,
    )[0];
    const isotretinoinAnswers: AnswerMap = {
      uses_isotretinoin: true,
      isotretinoin_detail_symptoms: ["head_vision", "mood"],
    };
    const physical = localizeRiskLeaves(
      [
        leafByRuleId(
          "isotretinoin-physical-symptom-review",
          isotretinoinAnswers,
          adultProfile,
        ),
      ],
      "fr",
      adultProfile,
    )[0];
    const mood = localizeRiskLeaves(
      [
        leafByRuleId(
          "isotretinoin-mood-review",
          isotretinoinAnswers,
          adultProfile,
        ),
      ],
      "fr",
      adultProfile,
    )[0];
    const sexualSafety = localizeRiskLeaves(
      [
        leafByRuleId(
          "sexual-safety-support",
          { sexual_contact_safety: true },
          adultProfile,
        ),
      ],
      "fr",
      adultProfile,
    )[0];

    expect(adolescent.copy).toBe(
      "Des événements graves liés à une consommation de substances — malaise avec perte de connaissance, crise convulsive, difficulté respiratoire grave, symptôme thoracique ou inquiétude concernant la sécurité — survenus au cours de l'année écoulée mais absents actuellement méritent d'être signalés rapidement à un adulte de confiance et à un professionnel de santé qualifié.",
    );
    expect(physical.copy).toBe(
      "Pendant l'utilisation d'isotretinoin, de graves maux de tête ou une modification de la vision, des symptômes abdominaux graves, ou une éruption avec cloques ou desquamation méritent une évaluation clinique rapide.",
    );
    expect(mood.copy).toBe(
      "Des changements touchant l'humeur, le comportement ou la sécurité personnelle, signalés pendant l'utilisation d'isotretinoin, méritent une évaluation clinique rapide et un examen de la sécurité personnelle.",
    );
    expect(mood.factors).toContain(
      "Changement signalé touchant l'humeur, le comportement ou la sécurité personnelle",
    );
    expect(sexualSafety.copy).toBe(
      "Une inquiétude concernant des pressions subies, le consentement ou la sécurité dans une situation sexuelle mérite un soutien confidentiel centré sur la personne. Un professionnel de santé qualifié ou un service spécialisé peut aider\u00a0; utilisez la voie de sécurité immédiate en cas de danger actuel.",
    );
    expect(sexualSafety.factors).toContain(
      "Inquiétude concernant des pressions subies, le consentement ou la sécurité dans une situation sexuelle",
    );
  });

  it("keeps reviewed French agreement and professional scope grammatical", () => {
    const localized = localizeRiskLeaves(
      [
        ruleLeaf("glp1-pregnancy-procedure-review"),
        ruleLeaf("anabolic-leg-symptom-review"),
        ruleLeaf("psychedelic-aftereffect-review"),
        ruleLeaf("stimulant-symptom-review"),
        ruleLeaf("pregnancy-new-concern-review"),
      ],
      "fr",
      adultProfile,
    );
    const byRuleId = new Map(localized.map((leaf) => [leaf.ruleId, leaf]));

    expect.soft(byRuleId.get("glp1-pregnancy-procedure-review")?.copy).toBe(
      "Une grossesse, un projet de grossesse, l'allaitement, une sédation profonde planifiée ou une anesthésie planifiée méritent un examen rapide avec le prescripteur ou l'équipe chargée de l'intervention.",
    );
    expect(byRuleId.get("glp1-pregnancy-procedure-review")?.factors).toContain(
      "Grossesse, allaitement ou intervention planifiée signalés",
    );
    expect(byRuleId.get("anabolic-leg-symptom-review")?.copy).toBe(
      "Un gonflement ou une douleur d'un seul côté de la jambe, signalés pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation, méritent une évaluation clinique rapide.",
    );
    expect.soft(byRuleId.get("anabolic-leg-symptom-review")?.factors).toContain(
      "Gonflement ou douleur d'un seul côté de la jambe signalés",
    );
    expect(byRuleId.get("psychedelic-aftereffect-review")?.copy).toBe(
      "Des changements perceptifs persistants, de la panique, de la confusion ou une difficulté à fonctionner ont été signalés après l'utilisation de psychédéliques ou de dissociatifs\u00a0; un professionnel de santé qualifié ou un professionnel de la santé mentale peut aider à les examiner sans présumer de leur cause.",
    );
    expect(byRuleId.get("stimulant-symptom-review")?.factors).toContain(
      "Douleur thoracique, évanouissement, agitation grave ou surchauffe signalés",
    );
    expect(byRuleId.get("pregnancy-new-concern-review")?.factors).toContain(
      "Une grossesse, un projet de grossesse, l'allaitement ou une grossesse récente peuvent être pertinents",
    );
  });

  it("uses plural agreement for coordinated pregnancy-relevance subjects", () => {
    const profile = { age: 15, countryCode: "CH" };
    const canonical = leafByRuleId(
      "urgent-adolescent-pregnancy-safety",
      {
        pregnancy_relevant: true,
        adolescent_pregnancy_urgent_safety: true,
      },
      profile,
    );
    const localized = localizeRiskLeaves([canonical], "fr", profile)[0];

    expect(localized.factors).toContain(
      "Une grossesse, un projet de grossesse ou l'allaitement peuvent être pertinents",
    );
  });

  it("does not mutate a deeply frozen merged emergency leaf", () => {
    const evaluated = evaluateRisks(
      { urgent_chest_discomfort_now: true, urgent_breathing_now: true },
      { age: 35, countryCode: "US" },
      prototypePolicy,
    );
    expect(evaluated).toHaveLength(1);
    const frozen = deepFreeze(structuredClone(evaluated));
    const localized = localizeRiskLeaves(frozen, "fr", {
      age: 35,
      countryCode: "US",
    });

    expect(localized[0].factors).toEqual([
      riskFactorLabelsFr["Confirmed new or severe chest discomfort now"],
      riskFactorLabelsFr["Confirmed severe breathing difficulty now"],
    ]);
    expect(localized[0].sources).toBe(frozen[0].sources);
    expect(localized[0].sources.every((source, index) => source === frozen[0].sources[index])).toBe(true);
    expect(Object.isFrozen(frozen[0].sources)).toBe(true);
  });

  it.each(
    emergencyCases.flatMap((emergency) =>
      emergencyCountries.map((country) => ({ emergency, country })),
    ),
  )(
    "routes French $emergency.kind emergency copy in $country.countryCode from retained sources",
    ({ emergency, country }) => {
      const profile = {
        age: ageForEmergency(emergency.kind, country.age),
        countryCode: country.countryCode,
      };
      const leaf = leafByRuleId(emergency.ruleId, emergency.answers, profile);
      const localized = localizeRiskLeaves([leaf], "fr", profile)[0];

      expect(localized.sources).toBe(leaf.sources);
      expect(localized.copy).toMatch(/maintenant/i);
      if (country.number) {
        expect(localized.copy).toMatch(new RegExp(`maintenant le ${country.number}\\b`));
      } else {
        expect(localized.copy).toMatch(/service d'urgence local/i);
        expect(localized.copy).not.toMatch(/\d/);
      }
      if (emergency.kind === "self-harm") {
        expect(localized.copy).toMatch(/personne de confiance/i);
      }
      if (emergency.kind === "self-harm" && country.crisis) {
        expect(localized.copy).toContain(country.crisis);
      } else {
        expect(localized.copy).not.toMatch(/soutien en situation de crise/);
      }
      if (emergency.kind === "pregnancy-safety") {
        expect(localized.copy).toMatch(/professionnel de santé qualifié/i);
        expect(localized.copy).toMatch(/adulte de confiance/i);
        expect(localized.copy).toMatch(/danger physique immédiat/i);
      }
      if (emergency.kind === "overdose-poisoning") {
        expect(localized.copy).toMatch(/produit|emballage/i);
      }
      if (emergency.kind === "overdose-poisoning" && country.poison) {
        expect(localized.copy).toContain(
          `Des informations sur les intoxications sont disponibles au ${country.poison}.`,
        );
      } else {
        expect(localized.copy).not.toMatch(/intoxications/);
      }
      if (emergency.kind === "severe-bleeding") {
        expect(localized.copy).toMatch(/pression directe ferme/i);
        expect(localized.copy).toMatch(/ne retirez pas.*objet/i);
      }
    },
  );

  it("falls back to generic French wording when operational sources were deliberately removed", () => {
    const profile = { age: 35, countryCode: "US" };
    const selfHarm = leafByRuleId(
      "urgent-self-harm",
      { urgent_self_harm_now: true },
      profile,
    );
    const reduced: RiskLeaf = {
      ...selfHarm,
      sources: selfHarm.sources.filter(
        (source) => !source.operationalCountries?.includes("US"),
      ),
    };
    const localized = localizeRiskLeaves([reduced], "fr", profile)[0];

    expect(localized.copy).toMatch(/service d'urgence local/i);
    expect(localized.copy).not.toMatch(/\b(?:911|988)\b/);
    expect(localized.copy).toMatch(/personne de confiance/i);
    expect(localized.sources).toBe(reduced.sources);
  });

  it("keeps US 911 but removes 988 when only the crisis-line source is absent", () => {
    const profile = { age: 35, countryCode: " us " };
    const selfHarm = leafByRuleId(
      "urgent-self-harm",
      { urgent_self_harm_now: true },
      profile,
    );
    const reduced: RiskLeaf = {
      ...selfHarm,
      sources: selfHarm.sources.filter(
        (source) => source.id !== "samhsa-988-faqs",
      ),
    };
    const localized = localizeRiskLeaves([reduced], "fr", profile)[0];

    expect(
      reduced.sources.some((source) =>
        source.operationalCountries?.includes("US"),
      ),
    ).toBe(true);
    expect(localized.copy).toContain("911");
    expect(localized.copy).not.toContain("988");
    expect(localized.copy).toMatch(/personne de confiance/i);
    expect(localized.sources).toBe(reduced.sources);
  });

  it("keeps Swiss 144 but removes 145 when the poison-information source is absent", () => {
    const profile = { age: 35, countryCode: " ch " };
    const poisoning = leafByRuleId(
      "urgent-overdose-poisoning",
      { urgent_overdose_poisoning_now: true },
      profile,
    );
    const reduced: RiskLeaf = {
      ...poisoning,
      sources: poisoning.sources.filter((source) => source.id !== "foph-ufi-emergency"),
    };
    const localized = localizeRiskLeaves([reduced], "fr", profile)[0];

    expect(localized.copy).toContain("144");
    expect(localized.copy).not.toContain("145");
    expect(localized.copy).toMatch(/produit|emballage/i);
  });
});

describe("score presentation", () => {
  it("returns canonical score objects by reference in English", () => {
    const adult = adultScore();
    const insufficient = calculateEssentialEight(
      { current_tobacco_nicotine: false, smoking_history_former: false },
      { ageYears: 35, assessmentDepth: "deep" },
    );
    const unavailable = calculateEssentialEight(COMPLETE_ANSWERS, {
      ageYears: 17,
      assessmentDepth: "deep",
    });
    if (insufficient.kind !== "insufficient-coverage") {
      throw new Error("Expected insufficient score coverage");
    }

    expect(localizeEssentialEight(adult, "en")).toBe(adult);
    expect(localizeEssentialEight(insufficient, "en")).toBe(insufficient);
    expect(localizeEssentialEight(unavailable, "en")).toBe(unavailable);
    expect(adult.label).toBe(ESSENTIAL_EIGHT_LABEL);
    expect(insufficient.label).toBe(ESSENTIAL_EIGHT_LABEL);
    expect(ESSENTIAL_EIGHT_LABEL).toBe(
      "Life's Essential 8 — cardiovascular health score, not a mortality verdict.",
    );
  });

  it("localizes missing metrics as data gaps, not as clinical findings", () => {
    const canonical = adultScore({ diagnosed_conditions_core: undefined }, NO_LABS);
    const localized = localizeEssentialEight(canonical, "fr");
    if (localized.kind !== "adult-score") {
      throw new Error("Expected localized adult score");
    }
    const components = localized.categories.flatMap(
      (category) => category.components,
    );

    expect(
      components.find((component) => component.questionId === "lab:glycaemic_status")
        ?.explanation,
    ).toBe(
      "Les affections diagnostiquées n'ont pas été renseignées\u00a0; le statut diabétique est donc inconnu.",
    );
    expect(
      components.find((component) => component.questionId === "lab:non_hdl_cholesterol")
        ?.explanation,
    ).toBe(
      "Des résultats confirmés de cholestérol total et de HDL sont nécessaires pour calculer le cholestérol non-HDL.",
    );
    expect(localized.coverage).toBe(canonical.coverage);
    expect(localized.answeredCategoryCount).toBe(6);
  });

  it("localizes an adult score without changing numeric, machine, order, or source fields", () => {
    const canonical = deepFreeze(structuredClone(adultScore(MIXED_ANSWERS, MIXED_LABS)));
    const localized = localizeEssentialEight(canonical, "fr");

    expect(localized).not.toBe(canonical);
    expect(localized.kind).toBe("adult-score");
    if (localized.kind !== "adult-score") throw new Error("Expected adult presentation");
    expect(localized.label).not.toBe(canonical.label);
    expect(localized.label).toBe(ESSENTIAL_EIGHT_LABEL_FR);
    expect({ ...localized, label: canonical.label }).toEqual({
      ...canonical,
      categories: localized.categories,
      explanations: localized.explanations,
    });
    expect(localized.categories.map((category) => category.id)).toEqual(
      canonical.categories.map((category) => category.id),
    );
    expect(localized.categories.map((category) => category.label)).toEqual(
      canonical.categories.map((category) => scoreCategoryLabelsFr[category.id]),
    );

    const suffixed = canonical.categories.flatMap((category) =>
      category.components.filter((component) => component.explanation.includes("Twenty points")),
    );
    expect(suffixed.map((component) => component.questionId)).toEqual([
      "current_tobacco_nicotine",
      "lab:non_hdl_cholesterol",
      "blood_pressure_systolic",
    ]);

    for (const [categoryIndex, category] of canonical.categories.entries()) {
      const presentedCategory = localized.categories[categoryIndex];
      expect(presentedCategory.source).toBe(category.source);
      expect(presentedCategory.components).not.toBe(category.components);
      expect({
        ...presentedCategory,
        label: category.label,
        components: category.components,
      }).toEqual(category);
      for (const [componentIndex, component] of category.components.entries()) {
        const presentedComponent = presentedCategory.components[componentIndex];
        expect(presentedComponent.source).toBe(component.source);
        expect(presentedComponent).toEqual({
          ...component,
          label: scoreComponentLabelsFr[component.questionId],
          explanation: localizedExplanation(component.explanation),
        });
        expect(presentedComponent.explanation).not.toMatch(/Twenty points|You reported|Your /);
      }
    }
    expect(localized.explanations).toEqual(
      canonical.explanations.map(
        (explanation) => scoreLedgerExplanationsFr[explanation],
      ),
    );
  });

  it.each([
    ["express", "express-assessment"],
    ["quick", "quick-assessment"],
    ["deep", "answer-more-wellness-habits"],
  ] as const)(
    "preserves the %s insufficient-coverage branch and reason %s",
    (assessmentDepth, expectedReason) => {
      const answers: AnswerMap =
        expectedReason === "answer-more-wellness-habits"
          ? { current_tobacco_nicotine: false, smoking_history_former: false, usual_sleep_hours: 8 }
          : COMPLETE_ANSWERS;
      const canonical = calculateEssentialEight(
        answers,
        { ageYears: 35, assessmentDepth },
        expectedReason === "answer-more-wellness-habits" ? NO_LABS : COMPLETE_LABS,
      );
      expect(canonical).toMatchObject({
        kind: "insufficient-coverage",
        reason: expectedReason,
      });
      const localized = localizeEssentialEight(canonical, "fr");

      expect(localized).toMatchObject({
        kind: "insufficient-coverage",
        reason: expectedReason,
        scoreVersion: "essential-eight-v1",
        assessmentDepth,
        label: ESSENTIAL_EIGHT_LABEL_FR,
      });
      if (
        canonical.kind !== "insufficient-coverage" ||
        localized.kind !== "insufficient-coverage"
      ) {
        throw new Error("Expected insufficient coverage presentation");
      }
      expect(localized.coverage).toBe(canonical.coverage);
      expect(localized.answeredCategoryCount).toBe(canonical.answeredCategoryCount);
      expect(localized.answeredCategories.map((category) => category.id)).toEqual(
        canonical.answeredCategories.map((category) => category.id),
      );
      expect(localized.answeredCategories.map((category) => category.label)).toEqual(
        canonical.answeredCategories.map(
          (category) => scoreCategoryLabelsFr[category.id],
        ),
      );
      expect(localized.explanations).toEqual(
        canonical.explanations.map(
          (explanation) => scoreLedgerExplanationsFr[explanation],
        ),
      );
    },
  );

  it("leaves the not-available result structurally and referentially unchanged in French", () => {
    const canonical = calculateEssentialEight(COMPLETE_ANSWERS, {
      ageYears: 12,
      assessmentDepth: "quick",
    });
    const localized = localizeEssentialEight(canonical, "fr");

    expect(localized).toBe(canonical);
    expect(localized).toEqual({
      kind: "not-available",
      reason: "under-18-or-age-unverified",
    });
  });
});

/** One answer set per metric that leaves a deficit only on that metric. */
const habitFixtures: Readonly<Record<ScoreCategoryId, AnswerMap>> = {
  diet: { diet_whole_grains: "never", diet_sugary_drinks: 4 },
  "physical-activity": { weekly_moderate_activity_minutes: 0 },
  nicotine: {
    current_tobacco_nicotine: true,
    tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  },
  sleep: { usual_sleep_hours: 5 },
  "body-mass-index": { weight_kg: 100 },
  "blood-lipids": { statin_current: true },
  "blood-glucose": { diagnosed_conditions_core: ["diabetes"] },
  "blood-pressure": { blood_pressure_systolic: 150, blood_pressure_diastolic: 95 },
};

function actionById(categoryId: ScoreCategoryId, answers: AnswerMap): ActionItem {
  const action = buildActionPlan([], adultScore(answers)).find(
    (candidate) => candidate.id === `habit-${categoryId}`,
  );
  if (!action) throw new Error(`Missing action fixture habit-${categoryId}`);
  return action;
}

describe("action and protective-root presentation", () => {
  it("covers every reachable action ID and localizes habits immutably", () => {
    const actions = deepFreeze(
      structuredClone(
        (Object.entries(habitFixtures) as Array<[ScoreCategoryId, AnswerMap]>).map(
          ([categoryId, answers]) => actionById(categoryId, answers),
        ),
      ),
    );

    expect(localizeActions(actions, "en")).toBe(actions);
    const localized = localizeActions(actions, "fr");
    expect(localized.map((action) => action.id).sort()).toEqual(
      SCORE_CATEGORY_IDS.map((categoryId) => `habit-${categoryId}`).sort(),
    );
    expect(Object.keys(actionCopyFr).sort()).toEqual([...SCORE_CATEGORY_IDS].sort());
    for (const [id, copy] of Object.entries(actionCopyFr)) {
      expect(copy.title.trim(), `${id} title`).not.toBe("");
      expect(copy.nextStep.trim(), `${id} next step`).not.toBe("");
    }

    for (const [index, action] of actions.entries()) {
      const presented = localized[index];
      expect(presented).not.toBe(action);
      expect({
        ...presented,
        title: action.title,
        reason: action.reason,
        nextStep: action.nextStep,
      }).toEqual(action);
      expect(presented.sources).toBe(action.sources);
      expect(presented.opportunity).toBe(action.opportunity);
      expect(presented.title).toBe(actionCopyFr[action.categoryId].title);
      expect(presented.nextStep).toBe(actionCopyFr[action.categoryId].nextStep);
      expect(presented.reason).toBe(localizedExplanation(action.reason));
      expect(presented.title).not.toBe(action.title);
      expect(presented.reason).not.toBe(action.reason);
      expect(presented.nextStep).not.toBe(action.nextStep);
    }
  });

  it("localizes the penalty suffix inside an action reason", () => {
    const action = actionById("blood-lipids", { statin_current: true });
    expect(action.reason).toBe(
      "Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L). Twenty points are removed because you take a statin.",
    );
    const localized = localizeActions([action], "fr")[0];

    expect(localized.reason).toBe(
      "Votre cholestérol non-HDL est inférieur à 130 mg/dL (3,4 mmol/L). Vingt points sont retirés parce que vous prenez une statine.",
    );
  });

  it("keeps the blood-pressure action about re-measurement and never about changing medicines alone", () => {
    const action = actionById("blood-pressure", habitFixtures["blood-pressure"]);
    const localized = localizeActions([action], "fr")[0];

    expect(localized.title).toBe("Faites recontrôler votre pression artérielle");
    expect(localized.nextStep).toMatch(/ne modifiez aucun médicament/);
  });

  it("reproduces all seven canonical roots in order and localizes only their labels", () => {
    const answers: AnswerMap = {
      reliable_social_support: true,
      movement_balance_training: true,
      circadian_morning_light: true,
      mood_support_access: true,
      social_community_belonging: true,
      interaction_shared_list: true,
      stress_recovery_practice: "often",
      unrelated_answer: "must not be inspected",
    };
    const expected = [
      "A person you can contact for practical or emotional support",
      "A regular balance or coordination practice",
      "Outdoor or bright light after waking",
      "A known route to timely wellbeing support",
      "A sense of community or shared activity",
      "A current medicine list shared with a clinician or pharmacist",
      "A regular brief stress-management practice",
    ];

    expect(localizeProtectiveRoots(answers, "en")).toEqual(expected);
    expect(Object.keys(protectiveRootLabelsFr)).toEqual(expected);
    expect(localizeProtectiveRoots(answers, "fr")).toEqual(
      expected.map((root) => protectiveRootLabelsFr[root]),
    );
    expect(localizeProtectiveRoots({ ...answers, stress_recovery_practice: "daily" }, "fr")).toEqual(
      expected.map((root) => protectiveRootLabelsFr[root]),
    );
    expect(localizeProtectiveRoots({ unrelated_answer: true }, "en")).toEqual([]);
  });
});

describe("localized export equivalence", () => {
  it("changes only approved display values while retaining schema, IDs, numbers, privacy, and sources", async () => {
    const answers: AnswerMap = {
      ...MIXED_ANSWERS,
      gender_identity_optional: "SECRET FREE TEXT",
    };
    const score = adultScore(answers, MIXED_LABS);
    const leaves = evaluateRisks(answers, adultProfile, prototypePolicy);
    const actions = buildActionPlan(leaves, score);
    expect(actions).not.toHaveLength(0);
    const localizedScore = localizeEssentialEight(score, "fr");
    const localizedLeaves = localizeRiskLeaves(leaves, "fr", adultProfile);
    const localizedActions = localizeActions(actions, "fr");
    const reportBase = {
      subjectAgeYears: 35,
      assessmentDepth: "deep" as const,
      confirmedLabs: MIXED_LABS,
      answers,
    };
    const canonicalJson = await readJson(
      createRedactedExport(
        { ...reportBase, score, riskLeaves: leaves, actions },
        { includeRawAnswers: true },
      ),
    );
    const localizedJson = await readJson(
      createRedactedExport(
        {
          ...reportBase,
          score: localizedScore,
          riskLeaves: localizedLeaves,
          actions: localizedActions,
        },
        { includeRawAnswers: true },
      ),
    );

    expect(schemaShape(localizedJson)).toEqual(schemaShape(canonicalJson));
    expect(withoutApprovedDisplay(localizedJson)).toEqual(
      withoutApprovedDisplay(canonicalJson),
    );
    expect(localizedJson.rawAnswers).toEqual(canonicalJson.rawAnswers);
    expect(JSON.stringify(localizedJson)).not.toContain("SECRET FREE TEXT");
    expect(localizedJson.schemaVersion).toBe("health-risk-explorer-report-v6");
    expect(localizedJson.score).not.toEqual(canonicalJson.score);
    expect(localizedJson.riskLeaves).not.toEqual(canonicalJson.riskLeaves);
    expect(localizedJson.actions).not.toEqual(canonicalJson.actions);
  });
});
