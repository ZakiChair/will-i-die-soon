import { describe, expect, it } from "vitest";

import { evidenceSources } from "../data/evidence";
import { riskRules } from "../data/rules";
import { createRedactedExport } from "../lib/export";
import { prototypePolicy, RISK_RULESET_VERSION } from "../lib/release-policy";
import { evaluateRisks } from "../lib/risk-engine";
import {
  PURITY_SCORE_LABEL,
  buildActionPlan,
  calculatePurityScore,
} from "../lib/scoring";
import type {
  ActionItem,
  AdultPurityScoreResult,
  ScoreComponent,
  ScoreComponent as CanonicalScoreComponent,
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
  PURITY_SCORE_LABEL_FR,
  accessSupportCopyFr,
  accessSupportReasonClausesFr,
  actionCopyFr,
  bookedPreventiveActionCopyFr,
  protectiveRootLabelsFr,
  scoreCategoryLabelsFr,
  scoreComponentExplanationsFr,
  scoreComponentLabelsFr,
  scoreLedgerExplanationsFr,
} from "./score-copy-fr";
import {
  localizeActions,
  localizeProtectiveRoots,
  localizePurityScore,
  localizeRiskLeaves,
} from "./presentation";

const adultProfile: ProfileContext = { age: 35, countryCode: "CH" };

const COMPLETE_ANSWERS: AnswerMap = {
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
  preventive_followup_status: "yes",
  preventive_followup_action: "completed",
  current_medications: true,
  med_detail_prescriber_followup: "yes_all",
  adherence_missed_doses: "never",
  adherence_access_barriers: ["none"],
  interaction_shared_list: true,
};

type ComponentCase = {
  readonly questionId: CanonicalScoreComponent["questionId"];
  readonly answers: AnswerMap;
  readonly status: CanonicalScoreComponent["status"];
  readonly explanation: string;
  readonly exclusionReason?: CanonicalScoreComponent["exclusionReason"];
};

function answered(
  questionId: ComponentCase["questionId"],
  answers: AnswerMap,
  explanation: string,
): ComponentCase {
  return { questionId, answers, status: "answered", explanation };
}

function missing(
  questionId: ComponentCase["questionId"],
  answers: AnswerMap,
  explanation: string,
): ComponentCase {
  return { questionId, answers, status: "missing", explanation };
}

function excluded(
  questionId: ComponentCase["questionId"],
  answers: AnswerMap,
  explanation: string,
  exclusionReason: NonNullable<ComponentCase["exclusionReason"]>,
): ComponentCase {
  return {
    questionId,
    answers,
    status: "excluded",
    explanation,
    exclusionReason,
  };
}

const invalidNumber = "This component was not answered with a valid value.";
const invalidOption = "This component was not answered with a mapped option.";

const tobaccoCases: ReadonlyArray<ComponentCase> = [
  answered(
    "current_tobacco_nicotine",
    { current_tobacco_nicotine: false },
    "You reported no current tobacco or nicotine use.",
  ),
  excluded(
    "current_tobacco_nicotine",
    {
      current_tobacco_nicotine: true,
      tobacco_nicotine_context: "only_prescribed_nrt_quit_plan",
    },
    "Prescribed nicotine replacement in a quit plan is excluded from this component.",
    "prescribed-nrt-quit-plan",
  ),
  answered(
    "current_tobacco_nicotine",
    {
      current_tobacco_nicotine: true,
      tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
    },
    "You reported current tobacco, vaping, or other nicotine use.",
  ),
];

const drinkingContext: AnswerMap = {
  alcohol_frequency: "monthly_or_less",
  alcohol_detail_typical_amount: 1,
  alcohol_detail_heavy_episode: "never",
};

const alcoholCases: ReadonlyArray<ComponentCase> = [
  ...[
    ["never", "You reported no alcohol use."],
    ["monthly_or_less", "You reported alcohol use monthly or less."],
    ["two_to_four_monthly", "You reported alcohol use two to four times a month."],
    ["two_to_three_weekly", "You reported alcohol use two to three times a week."],
    ["four_plus_weekly", "You reported alcohol use four or more times a week."],
  ].map(([frequency, explanation]) =>
    answered(
      "alcohol_frequency",
      frequency === "never"
        ? { alcohol_frequency: frequency }
        : { ...drinkingContext, alcohol_frequency: frequency },
      explanation,
    ),
  ),
  answered(
    "alcohol_detail_typical_amount",
    { alcohol_frequency: "never" },
    "Typical amount is fully assessed because no alcohol use was reported.",
  ),
  ...[
    [1, "You reported up to one standard drink on a usual drinking day."],
    [1.5, "You reported more than one and up to two standard drinks."],
    [2.5, "You reported more than two and up to three standard drinks."],
    [4, "You reported more than three standard drinks."],
  ].map(([amount, explanation]) =>
    answered(
      "alcohol_detail_typical_amount",
      { ...drinkingContext, alcohol_detail_typical_amount: amount },
      String(explanation),
    ),
  ),
  missing(
    "alcohol_detail_typical_amount",
    { ...drinkingContext, alcohol_detail_typical_amount: null },
    invalidNumber,
  ),
  answered(
    "alcohol_detail_heavy_episode",
    { alcohol_frequency: "never" },
    "Heavy episodes are fully assessed because no alcohol use was reported.",
  ),
  ...[
    ["never", "You reported no heavy drinking episodes."],
    ["less_monthly", "You reported a heavy episode less than monthly."],
    ["monthly", "You reported a heavy episode monthly."],
    ["weekly", "You reported a heavy episode weekly."],
    ["daily", "You reported a heavy episode daily or almost daily."],
  ].map(([frequency, explanation]) =>
    answered(
      "alcohol_detail_heavy_episode",
      { ...drinkingContext, alcohol_detail_heavy_episode: frequency },
      explanation,
    ),
  ),
  missing(
    "alcohol_detail_heavy_episode",
    { ...drinkingContext, alcohol_detail_heavy_episode: null },
    invalidOption,
  ),
];

function numericCases(
  questionId: ComponentCase["questionId"],
  rows: ReadonlyArray<readonly [number, string]>,
): ReadonlyArray<ComponentCase> {
  return [
    ...rows.map(([value, explanation]) =>
      answered(questionId, { [questionId]: value }, explanation),
    ),
    missing(questionId, { [questionId]: null }, invalidNumber),
  ];
}

function optionCases(
  questionId: ComponentCase["questionId"],
  rows: ReadonlyArray<readonly [string, string]>,
): ReadonlyArray<ComponentCase> {
  return [
    ...rows.map(([value, explanation]) =>
      answered(questionId, { [questionId]: value }, explanation),
    ),
    missing(questionId, { [questionId]: null }, invalidOption),
  ];
}

const movementCases: ReadonlyArray<ComponentCase> = [
  ...numericCases("weekly_moderate_activity_minutes", [
    [0, "You reported no moderate or vigorous activity in a usual week."],
    [50, "You reported 1–74 minutes of weekly activity."],
    [100, "You reported 75–149 minutes of weekly activity."],
    [150, "You reported at least 150 minutes of weekly activity."],
  ]),
  ...numericCases("movement_strength_days", [
    [0, "You reported no strength-activity days."],
    [1, "You reported one strength-activity day."],
    [2, "You reported at least two strength-activity days."],
  ]),
  ...numericCases("movement_walking_days", [
    [0, "You reported no brisk-walking days."],
    [1, "You reported one or two brisk-walking days."],
    [3, "You reported three or four brisk-walking days."],
    [5, "You reported at least five brisk-walking days."],
  ]),
  ...numericCases("sedentary_total_hours", [
    [4, "You reported up to four waking hours sitting or reclining."],
    [5, "You reported more than four and under seven sedentary hours."],
    [8, "You reported seven to under ten sedentary hours."],
    [10, "You reported ten or more sedentary hours."],
  ]),
];

const nutritionCases: ReadonlyArray<ComponentCase> = [
  ...numericCases("plant_food_frequency", [
    [0, "You reported no vegetable or fruit portions on a typical day."],
    [1, "You reported one or two vegetable or fruit portions."],
    [3, "You reported three or four vegetable or fruit portions."],
    [5, "You reported at least five vegetable or fruit portions."],
  ]),
  ...optionCases("diet_whole_grains", [
    ["never", "You reported never choosing whole grains."],
    ["rarely", "You reported rarely choosing whole grains."],
    ["sometimes", "You reported sometimes choosing whole grains."],
    ["often", "You reported often choosing whole grains."],
    ["daily", "You reported choosing whole grains daily or almost daily."],
  ]),
  ...numericCases("diet_legumes", [
    [0, "You reported no legume meals in a usual week."],
    [1, "You reported one legume meal in a usual week."],
    [2, "You reported two legume meals in a usual week."],
    [3, "You reported at least three legume meals in a usual week."],
  ]),
  ...optionCases("diet_processed_meat", [
    ["never", "You reported never eating processed meat."],
    ["rarely", "You reported rarely eating processed meat."],
    ["sometimes", "You reported sometimes eating processed meat."],
    ["often", "You reported often eating processed meat."],
    ["daily", "You reported eating processed meat daily or almost daily."],
  ]),
  ...numericCases("diet_sugary_drinks", [
    [0, "You reported no sugary drinks in a usual week."],
    [1, "You reported one sugary drink in a usual week."],
    [2, "You reported two or three sugary drinks in a usual week."],
    [4, "You reported four to six sugary drinks in a usual week."],
    [7, "You reported seven or more sugary drinks in a usual week."],
  ]),
];

const sleepAndRecoveryCases: ReadonlyArray<ComponentCase> = [
  ...numericCases("usual_sleep_hours", [
    [5, "You reported under six hours of usual sleep."],
    [6.5, "You reported six to under seven hours of usual sleep."],
    [7, "You reported at least seven hours of usual sleep."],
  ]),
  ...numericCases("sleep_refreshed", [
    [2, "You placed refreshed sleep in the 0–2 band."],
    [4, "You placed refreshed sleep in the 3–4 band."],
    [6, "You placed refreshed sleep in the 5–6 band."],
    [8, "You placed refreshed sleep in the 7–8 band."],
    [9, "You placed refreshed sleep in the 9–10 band."],
  ]),
  ...numericCases("circadian_bedtime_variation", [
    [1, "You reported up to one hour of bedtime variation."],
    [2, "You reported more than one and up to two hours of bedtime variation."],
    [3, "You reported more than two and up to three hours of bedtime variation."],
    [4, "You reported more than three hours of bedtime variation."],
  ]),
  ...optionCases("stress_recovery_practice", [
    ["never", "You reported never practising a brief stress-management skill."],
    ["rarely", "You reported rarely practising a brief stress-management skill."],
    ["sometimes", "You reported sometimes practising a brief stress-management skill."],
    ["often", "You reported often practising a brief stress-management skill."],
    ["daily", "You reported practising a brief stress-management skill daily or almost daily."],
  ]),
];

const preventiveCases: ReadonlyArray<ComponentCase> = [
  excluded(
    "preventive_followup_action",
    { preventive_followup_status: "not_due", preventive_followup_action: null },
    "You reported that no routine follow-up was personally due.",
    "not-due",
  ),
  excluded(
    "preventive_followup_action",
    {
      preventive_followup_status: "yes",
      preventive_followup_action: "access_or_safety_barrier",
    },
    "You reported an access or safety barrier to a personally chosen follow-up.",
    "access-or-safety-barrier",
  ),
  missing(
    "preventive_followup_action",
    { preventive_followup_status: "yes", preventive_followup_action: null },
    "The chosen follow-up action was not answered.",
  ),
  answered(
    "preventive_followup_action",
    {
      preventive_followup_status: "yes",
      preventive_followup_action: "completed",
    },
    "You reported completing a personally due follow-up.",
  ),
  answered(
    "preventive_followup_action",
    {
      preventive_followup_status: "yes",
      preventive_followup_action: "booked_or_contacted",
    },
    "You reported booking or contacting a service about a personally due follow-up.",
  ),
  answered(
    "preventive_followup_action",
    {
      preventive_followup_status: "yes",
      preventive_followup_action: "not_yet",
    },
    "You reported not yet acting on a personally due follow-up.",
  ),
  missing(
    "preventive_followup_action",
    { preventive_followup_status: null, preventive_followup_action: null },
    "Whether a chosen preventive follow-up applies is unresolved.",
  ),
];

const noCurrentMedicine =
  "This component does not apply because you reported no current prescription medicines.";
const unresolvedCurrentMedicine = "Current prescription-medicine use is unresolved.";

const medicationCases: ReadonlyArray<ComponentCase> = [
  excluded(
    "med_detail_prescriber_followup",
    { current_medications: false },
    noCurrentMedicine,
    "medication-not-applicable",
  ),
  missing(
    "med_detail_prescriber_followup",
    { current_medications: null },
    unresolvedCurrentMedicine,
  ),
  excluded(
    "med_detail_prescriber_followup",
    {
      current_medications: true,
      med_detail_prescriber_followup: "no_current_access",
    },
    "You reported no current access to prescriber follow-up.",
    "no-current-access",
  ),
  ...[
    ["yes_all", "You reported prescriber follow-up for all current medicines."],
    ["yes_some", "You reported prescriber follow-up for some current medicines."],
    ["no", "You reported no prescriber follow-up for current medicines."],
  ].map(([value, explanation]) =>
    answered(
      "med_detail_prescriber_followup",
      { current_medications: true, med_detail_prescriber_followup: value },
      explanation,
    ),
  ),
  missing(
    "med_detail_prescriber_followup",
    { current_medications: true, med_detail_prescriber_followup: null },
    invalidOption,
  ),
  excluded(
    "adherence_missed_doses",
    { current_medications: false },
    noCurrentMedicine,
    "medication-not-applicable",
  ),
  missing(
    "adherence_missed_doses",
    { current_medications: null },
    unresolvedCurrentMedicine,
  ),
  excluded(
    "adherence_missed_doses",
    {
      current_medications: true,
      adherence_missed_doses: "weekly",
      adherence_access_barriers: ["cost"],
    },
    "A medicine access or use barrier was reported, so dose-taking is excluded.",
    "access-or-safety-barrier",
  ),
  ...[
    ["never", "You reported never missing, delaying, or repeating a dose."],
    ["rarely", "You reported rarely missing, delaying, or repeating a dose."],
    ["monthly", "You reported this happening a few times a month."],
    ["weekly", "You reported this happening at least weekly."],
  ].map(([value, explanation]) =>
    answered(
      "adherence_missed_doses",
      {
        current_medications: true,
        adherence_missed_doses: value,
        adherence_access_barriers: ["none"],
      },
      explanation,
    ),
  ),
  missing(
    "adherence_missed_doses",
    {
      current_medications: true,
      adherence_missed_doses: null,
      adherence_access_barriers: ["none"],
    },
    invalidOption,
  ),
  excluded(
    "interaction_shared_list",
    { current_medications: false },
    noCurrentMedicine,
    "medication-not-applicable",
  ),
  missing(
    "interaction_shared_list",
    { current_medications: null },
    unresolvedCurrentMedicine,
  ),
  answered(
    "interaction_shared_list",
    { current_medications: true, interaction_shared_list: true },
    "You reported that a clinician or pharmacist has a current medicine list.",
  ),
  answered(
    "interaction_shared_list",
    { current_medications: true, interaction_shared_list: false },
    "You reported that no clinician or pharmacist has a current medicine list.",
  ),
  missing(
    "interaction_shared_list",
    { current_medications: true, interaction_shared_list: null },
    "A shared current medicine list was not answered.",
  ),
];

const SCORE_COMPONENT_CASES: ReadonlyArray<ComponentCase> = [
  ...tobaccoCases,
  ...alcoholCases,
  ...movementCases,
  ...nutritionCases,
  ...sleepAndRecoveryCases,
  ...preventiveCases,
  ...medicationCases,
];

function adultScore(answers: AnswerMap = COMPLETE_ANSWERS): AdultPurityScoreResult {
  const result = calculatePurityScore(
    { ...COMPLETE_ANSWERS, ...answers },
    { ageYears: 35, assessmentDepth: "deep" },
  );
  expect(result.kind).toBe("adult-score");
  if (result.kind !== "adult-score") {
    throw new Error("Expected an adult score fixture");
  }
  return result;
}

function componentFor(testCase: ComponentCase): ScoreComponent {
  const component = adultScore(testCase.answers).categories
    .flatMap((category) => category.components)
    .find((candidate) => candidate.questionId === testCase.questionId);
  if (!component) throw new Error(`Missing component ${testCase.questionId}`);
  return component;
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

const emergencyCountries = [
  { countryCode: "US", age: 35, number: "911" },
  { countryCode: "GB", age: 35, number: "999" },
  { countryCode: "CH", age: 35, number: "144" },
  { countryCode: "OTHER", age: 35, number: null },
] as const;

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
  it("covers all 54 risk rules, 80 distinct factor labels, and 9 emergency kinds", () => {
    const factorLabels = riskRules.flatMap((rule) =>
      rule.factors.map((factor) => factor.label),
    );
    const emergencyKinds = riskRules.flatMap((rule) =>
      rule.emergencyKind ? [rule.emergencyKind] : [],
    );

    expect(riskRules).toHaveLength(54);
    expect(Object.keys(riskRuleCopyFr).sort()).toEqual(
      riskRules.map((rule) => rule.id).sort(),
    );
    expect(factorLabels).toHaveLength(100);
    expect(new Set(factorLabels).size).toBe(80);
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

  it("covers 8 categories, 21 rendered components, and all 97 explanations across 116 variants", () => {
    const components = SCORE_COMPONENT_CASES.map((testCase) => {
      const component = componentFor(testCase);
      expect(component).toMatchObject({
        questionId: testCase.questionId,
        status: testCase.status,
        explanation: testCase.explanation,
        ...(testCase.exclusionReason
          ? { exclusionReason: testCase.exclusionReason }
          : {}),
      });
      return component;
    });
    const categoryIds = adultScore().categories.map((category) => category.id);
    const componentIds = [...new Set(components.map((component) => component.questionId))];
    const explanations = [...new Set(components.map((component) => component.explanation))];
    const variantKeys = new Set(
      components.map((component) =>
        JSON.stringify([
          component.questionId,
          component.status,
          component.exclusionReason ?? null,
          component.explanation,
        ]),
      ),
    );

    expect(categoryIds).toHaveLength(8);
    expect(Object.keys(scoreCategoryLabelsFr).sort()).toEqual([...categoryIds].sort());
    expect(componentIds).toHaveLength(21);
    expect(Object.keys(scoreComponentLabelsFr).sort()).toEqual(componentIds.sort());
    expect(SCORE_COMPONENT_CASES).toHaveLength(116);
    expect(variantKeys.size).toBe(116);
    expect(explanations).toHaveLength(97);
    expect(Object.keys(scoreComponentExplanationsFr).sort()).toEqual(
      explanations.sort(),
    );
    expect(new Set(components.map((component) => component.status))).toEqual(
      new Set(["answered", "missing", "excluded"]),
    );
    expect(
      new Set(components.flatMap((component) =>
        component.exclusionReason ? [component.exclusionReason] : [],
      )),
    ).toEqual(
      new Set([
        "prescribed-nrt-quit-plan",
        "not-due",
        "access-or-safety-barrier",
        "no-current-access",
        "medication-not-applicable",
      ]),
    );
    expect(Object.keys(scoreLedgerExplanationsFr).sort()).toEqual(
      [
        "This transparent index uses only answered, modifiable wellness habits.",
        "The point weights are product choices, not disease probabilities or clinical coefficients.",
        "Missing answers reduce coverage rather than earning zero points.",
      ].sort(),
    );
    expect(PURITY_SCORE_LABEL_FR.trim(), "French score label").not.toBe("");
    for (const dictionary of [
      scoreCategoryLabelsFr,
      scoreComponentLabelsFr,
      scoreComponentExplanationsFr,
      scoreLedgerExplanationsFr,
    ]) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), key).not.toBe("");
      }
    }
  });

  it("uses non-breaking French spacing before semicolons and colons", () => {
    const frenchCopy = [
      PURITY_SCORE_LABEL_FR,
      ...Object.values(riskRuleCopyFr).flatMap(({ title, copy }) => [title, copy]),
      ...Object.values(riskFactorLabelsFr),
      ...Object.values(scoreCategoryLabelsFr),
      ...Object.values(scoreComponentLabelsFr),
      ...Object.values(scoreComponentExplanationsFr),
      ...Object.values(scoreLedgerExplanationsFr),
      ...Object.values(actionCopyFr).flatMap(({ title, nextStep }) => [
        title,
        nextStep,
      ]),
      bookedPreventiveActionCopyFr.title,
      bookedPreventiveActionCopyFr.nextStep,
      accessSupportCopyFr.title,
      accessSupportCopyFr.nextStep,
      ...Object.values(accessSupportReasonClausesFr),
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

  it("uses the precise French clinical term for standard drinks", () => {
    expect([
      scoreComponentExplanationsFr[
        "You reported up to one standard drink on a usual drinking day."
      ],
      scoreComponentExplanationsFr[
        "You reported more than one and up to two standard drinks."
      ],
      scoreComponentExplanationsFr[
        "You reported more than two and up to three standard drinks."
      ],
      scoreComponentExplanationsFr[
        "You reported more than three standard drinks."
      ],
    ]).toEqual([
      "Vous déclarez boire au plus un verre standard lors d'une journée habituelle de consommation.",
      "Vous déclarez boire plus d'un et jusqu'à deux verres standard.",
      "Vous déclarez boire plus de deux et jusqu'à trois verres standard.",
      "Vous déclarez boire plus de trois verres standard.",
    ]);
  });

  it("renders personally due follow-up as applicability, not debt", () => {
    expect([
      scoreComponentExplanationsFr[
        "You reported that no routine follow-up was personally due."
      ],
      scoreComponentExplanationsFr[
        "You reported completing a personally due follow-up."
      ],
      scoreComponentExplanationsFr[
        "You reported booking or contacting a service about a personally due follow-up."
      ],
      scoreComponentExplanationsFr[
        "You reported not yet acting on a personally due follow-up."
      ],
    ]).toEqual([
      "Vous déclarez qu'aucun suivi de routine ne s'appliquait à votre situation.",
      "Vous déclarez avoir effectué un suivi qui s'appliquait à votre situation.",
      "Vous déclarez avoir pris rendez-vous ou contacté un service au sujet d'un suivi qui s'appliquait à votre situation.",
      "Vous déclarez ne pas encore avoir agi concernant un suivi qui s'appliquait à votre situation.",
    ]);
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
        expect(localized.copy).toContain(country.number);
      } else {
        expect(localized.copy).toMatch(/service d'urgence local/i);
        expect(localized.copy).not.toMatch(/\b(?:911|988|999|144|145)\b/);
      }
      if (emergency.kind === "self-harm") {
        expect(localized.copy).toMatch(/personne de confiance/i);
        if (country.countryCode === "US") expect(localized.copy).toContain("988");
        else expect(localized.copy).not.toContain("988");
      }
      if (emergency.kind === "pregnancy-safety") {
        expect(localized.copy).toMatch(/professionnel de santé qualifié/i);
        expect(localized.copy).toMatch(/adulte de confiance/i);
        expect(localized.copy).toMatch(/danger physique immédiat/i);
      }
      if (emergency.kind === "overdose-poisoning") {
        expect(localized.copy).toMatch(/produit|emballage/i);
        if (country.countryCode === "CH") expect(localized.copy).toContain("145");
      }
      if (
        country.countryCode === "CH" &&
        emergency.kind !== "overdose-poisoning"
      ) {
        expect(localized.copy).not.toContain("145");
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
    const insufficient = calculatePurityScore(
      { current_tobacco_nicotine: false, alcohol_frequency: "never" },
      { ageYears: 35, assessmentDepth: "deep" },
    );
    const unavailable = calculatePurityScore(COMPLETE_ANSWERS, {
      ageYears: 17,
      assessmentDepth: "deep",
    });
    if (insufficient.kind !== "insufficient-coverage") {
      throw new Error("Expected insufficient score coverage");
    }

    expect(localizePurityScore(adult, "en")).toBe(adult);
    expect(localizePurityScore(insufficient, "en")).toBe(insufficient);
    expect(localizePurityScore(unavailable, "en")).toBe(unavailable);
    expect(adult.label).toBe(PURITY_SCORE_LABEL);
    expect(insufficient.label).toBe(PURITY_SCORE_LABEL);
    expect(PURITY_SCORE_LABEL).toBe(
      "Purity Score — wellness habits, not a health verdict.",
    );
  });

  it("states applicability and score-component exclusion without clinical ambiguity", () => {
    const canonical = adultScore({
      preventive_followup_status: null,
      preventive_followup_action: null,
      adherence_access_barriers: ["cost"],
    });
    const localized = localizePurityScore(canonical, "fr");
    if (localized.kind !== "adult-score") {
      throw new Error("Expected localized adult score");
    }
    const components = localized.categories.flatMap(
      (category) => category.components,
    );

    expect(
      components.find(
        (component) => component.questionId === "preventive_followup_action",
      )?.explanation,
    ).toBe(
      "Il reste à déterminer si le suivi préventif choisi s'applique à votre situation.",
    );
    expect(
      components.find(
        (component) => component.questionId === "adherence_missed_doses",
      )?.explanation,
    ).toBe(
      "Un obstacle à l'accès aux médicaments ou à leur utilisation a été signalé\u00a0; ce composant relatif aux habitudes de prise est donc exclu du calcul.",
    );
  });

  it("localizes an adult score without changing numeric, machine, order, or source fields", () => {
    const canonical = deepFreeze(
      structuredClone(
        adultScore({
          current_tobacco_nicotine: true,
          tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
          alcohol_frequency: "two_to_three_weekly",
          alcohol_detail_typical_amount: 3,
          alcohol_detail_heavy_episode: "weekly",
          preventive_followup_action: "booked_or_contacted",
          med_detail_prescriber_followup: "no_current_access",
          adherence_missed_doses: "weekly",
          adherence_access_barriers: ["cost"],
        }),
      ),
    );
    const localized = localizePurityScore(canonical, "fr");

    expect(localized).not.toBe(canonical);
    expect(localized.kind).toBe("adult-score");
    if (localized.kind !== "adult-score") throw new Error("Expected adult presentation");
    expect(localized.label).not.toBe(canonical.label);
    expect(localized.label).toBe(PURITY_SCORE_LABEL_FR);
    expect({ ...localized, label: canonical.label }).toEqual({
      ...canonical,
      categories: localized.categories,
      supportContexts: localized.supportContexts,
      explanations: localized.explanations,
    });
    expect(localized.categories.map((category) => category.id)).toEqual(
      canonical.categories.map((category) => category.id),
    );
    expect(localized.categories.map((category) => category.label)).toEqual(
      canonical.categories.map((category) => scoreCategoryLabelsFr[category.id]),
    );

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
          explanation: scoreComponentExplanationsFr[component.explanation],
        });
      }
    }
    for (const [index, context] of canonical.supportContexts.entries()) {
      expect(localized.supportContexts[index]).toEqual({
        ...context,
        explanation: scoreComponentExplanationsFr[context.explanation],
      });
      expect(localized.supportContexts[index].source).toBe(context.source);
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
    ["deep", "unresolved-core-gate"],
  ] as const)(
    "preserves the %s insufficient-coverage branch and reason %s",
    (assessmentDepth, expectedReason) => {
      const answers =
        expectedReason === "unresolved-core-gate"
          ? { current_tobacco_nicotine: true }
          : { current_tobacco_nicotine: false, alcohol_frequency: "never" };
      const canonical = calculatePurityScore(answers, {
        ageYears: 35,
        assessmentDepth,
      });
      expect(canonical).toMatchObject({
        kind: "insufficient-coverage",
        reason: expectedReason,
      });
      const localized = localizePurityScore(canonical, "fr");

      expect(localized).toMatchObject({
        kind: "insufficient-coverage",
        reason: expectedReason,
        scoreVersion: "purity-score-v1",
        assessmentDepth,
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
      expect(localized.supportContexts.map((context) => context.source)).toEqual(
        canonical.supportContexts.map((context) => context.source),
      );
    },
  );

  it("leaves the not-available result structurally and referentially unchanged in French", () => {
    const canonical = calculatePurityScore(COMPLETE_ANSWERS, {
      ageYears: 12,
      assessmentDepth: "quick",
    });
    const localized = localizePurityScore(canonical, "fr");

    expect(localized).toBe(canonical);
    expect(localized).toEqual({
      kind: "not-available",
      reason: "under-18-or-age-unverified",
    });
  });
});

const habitFixtures: Readonly<Record<string, AnswerMap>> = {
  "habit-tobacco-nicotine": {
    current_tobacco_nicotine: true,
    tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  },
  "habit-alcohol": {
    alcohol_frequency: "monthly_or_less",
    alcohol_detail_typical_amount: 1,
    alcohol_detail_heavy_episode: "never",
  },
  "habit-movement-sitting": { weekly_moderate_activity_minutes: 0 },
  "habit-nutrition": { diet_whole_grains: "never" },
  "habit-sleep": { usual_sleep_hours: 5 },
  "habit-recovery": { stress_recovery_practice: "never" },
  "habit-preventive-followup": { preventive_followup_action: "not_yet" },
  "habit-medication-safety": { med_detail_prescriber_followup: "no" },
};

function actionById(id: string, answers: AnswerMap): ActionItem {
  const action = buildActionPlan([], adultScore(answers)).find(
    (candidate) => candidate.id === id,
  );
  if (!action) throw new Error(`Missing action fixture ${id}`);
  return action;
}

describe("action and protective-root presentation", () => {
  it("covers every reachable action ID and localizes habits immutably", () => {
    const canonical = Object.entries(habitFixtures).map(([id, answers]) =>
      actionById(id, answers),
    );
    const access = buildActionPlan(
      [],
      adultScore({
        preventive_followup_action: "access_or_safety_barrier",
        med_detail_prescriber_followup: "no_current_access",
        adherence_missed_doses: "weekly",
        adherence_access_barriers: ["cost"],
      }),
    )[0];
    expect(access.id).toBe("access-support");
    const actions = deepFreeze(structuredClone([access, ...canonical]));

    expect(localizeActions(actions, "en")).toBe(actions);
    const localized = localizeActions(actions, "fr");
    expect(localized.map((action) => action.id).sort()).toEqual(
      ["access-support", ...Object.keys(habitFixtures)].sort(),
    );
    expect(Object.keys(actionCopyFr).sort()).toEqual(
      adultScore().categories.map((category) => category.id).sort(),
    );
    for (const [id, copy] of Object.entries(actionCopyFr)) {
      expect(copy.title.trim(), `${id} title`).not.toBe("");
      expect(copy.nextStep.trim(), `${id} next step`).not.toBe("");
    }
    for (const [id, copy] of [
      ["booked preventive", bookedPreventiveActionCopyFr],
      ["access support", accessSupportCopyFr],
    ] as const) {
      expect(copy.title.trim(), `${id} title`).not.toBe("");
      expect(copy.nextStep.trim(), `${id} next step`).not.toBe("");
    }
    for (const [reason, translation] of Object.entries(
      accessSupportReasonClausesFr,
    )) {
      expect(translation.trim(), reason).not.toBe("");
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
      expect(presented.sources.every((source, sourceIndex) => source === action.sources[sourceIndex])).toBe(true);
      expect(presented.opportunity).toBe(action.opportunity);
      expect(presented.title).not.toBe(action.title);
      expect(presented.reason).not.toBe(action.reason);
      expect(presented.nextStep).not.toBe(action.nextStep);
    }
    expect(localized[0]).toMatchObject({
      title: accessSupportCopyFr.title,
      nextStep: accessSupportCopyFr.nextStep,
    });
    expect(localized[0].reason).toContain(
      scoreCategoryLabelsFr["preventive-followup"],
    );
    expect(localized[0].reason).toContain(
      scoreCategoryLabelsFr["medication-safety"],
    );
    expect(localized[0].reason).not.toMatch(
      /Chosen preventive follow-up|Medication-safety behaviour|You reported/i,
    );
  });

  it("uses established stress-practice terms and keeps access barriers about scoring", () => {
    const recovery = localizeActions(
      [
        actionById("habit-recovery", {
          stress_recovery_practice: "never",
        }),
      ],
      "fr",
    )[0];
    const access = buildActionPlan(
      [],
      adultScore({ adherence_access_barriers: ["cost"] }),
    )[0];
    expect(access.id).toBe("access-support");
    const localizedAccess = localizeActions([access], "fr")[0];

    expect(recovery.nextStep).toBe(
      "Choisissez de vous ancrer, de vous décrocher des pensées difficiles, d'agir en accord avec vos valeurs, d'être bienveillant ou de faire de la place à ce que vous ressentez, puis pratiquez pendant quelques minutes aujourd'hui.",
    );
    expect(localizedAccess.reason).toBe(
      "Comportements favorisant la sécurité des médicaments\u00a0: Un obstacle à l'accès aux médicaments ou à leur utilisation a été signalé\u00a0; ce composant relatif aux habitudes de prise est donc exclu du calcul.",
    );
  });

  it("uses the special follow-through action for an already booked or contacted service", () => {
    const action = actionById("habit-preventive-followup", {
      preventive_followup_action: "booked_or_contacted",
    });
    const localized = localizeActions([action], "fr")[0];

    expect(localized.title).toBe(bookedPreventiveActionCopyFr.title);
    expect(localized.nextStep).toBe(bookedPreventiveActionCopyFr.nextStep);
    expect(localized.reason).toBe(
      scoreComponentExplanationsFr[action.reason],
    );
  });

  it("reproduces all nine canonical roots in order and localizes only their labels", () => {
    const answers: AnswerMap = {
      reliable_social_support: true,
      hydration_heat_access: true,
      movement_balance_training: true,
      circadian_morning_light: true,
      mood_support_access: true,
      social_community_belonging: true,
      vaccinations_records_available: true,
      interaction_shared_list: true,
      stress_recovery_practice: "often",
      unrelated_answer: "must not be inspected",
    };
    const expected = [
      "A person you can contact for practical or emotional support",
      "Reliable drinking-water access during heat or activity",
      "A regular balance or coordination practice",
      "Outdoor or bright light after waking",
      "A known route to timely wellbeing support",
      "A sense of community or shared activity",
      "Vaccination records available for review",
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
      ...COMPLETE_ANSWERS,
      current_tobacco_nicotine: true,
      tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
      preventive_followup_action: "access_or_safety_barrier",
      med_detail_prescriber_followup: "no_current_access",
      adherence_missed_doses: "weekly",
      adherence_access_barriers: ["cost"],
      gender_identity_optional: "SECRET FREE TEXT",
      diagnosed_conditions_core: ["none"],
    };
    const score = adultScore(answers);
    const leaves = evaluateRisks(answers, adultProfile, prototypePolicy);
    const actions = buildActionPlan(leaves, score);
    const localizedScore = localizePurityScore(score, "fr");
    const localizedLeaves = localizeRiskLeaves(leaves, "fr", adultProfile);
    const localizedActions = localizeActions(actions, "fr");
    const reportBase = {
      subjectAgeYears: 35,
      assessmentDepth: "deep" as const,
      confirmedLabs: [],
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
    expect(localizedJson.schemaVersion).toBe("health-risk-explorer-report-v2");
    expect(localizedJson.score).not.toEqual(canonicalJson.score);
    expect(localizedJson.riskLeaves).not.toEqual(canonicalJson.riskLeaves);
    expect(localizedJson.actions).not.toEqual(canonicalJson.actions);
  });
});
