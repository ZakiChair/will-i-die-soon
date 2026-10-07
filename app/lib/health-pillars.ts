import type { HealthDomain, Question, RiskLeaf } from "./types";

export const HEALTH_PILLARS = [
  "cardio-energy",
  "strength-neural",
  "sleep-circadian",
  "nutrition-metabolic",
] as const;
export type HealthPillar = (typeof HEALTH_PILLARS)[number];

export const DEFAULT_PILLAR_BY_DOMAIN = {
  demographics: "cardio-energy",
  "family-history": "cardio-energy",
  "diagnosed-conditions": "cardio-energy",
  "current-symptoms": "cardio-energy",
  "emergency-symptoms": "cardio-energy",
  movement: "cardio-energy",
  "sedentary-time": "cardio-energy",
  environment: "cardio-energy",
  "tobacco-nicotine": "cardio-energy",
  "blood-pressure": "cardio-energy",

  stress: "strength-neural",
  mood: "strength-neural",
  anxiety: "strength-neural",
  cognition: "strength-neural",
  "social-connection": "strength-neural",
  sun: "strength-neural",
  "sexual-health": "strength-neural",
  pregnancy: "strength-neural",
  cannabis: "strength-neural",
  stimulants: "strength-neural",
  opioids: "strength-neural",
  psychedelics: "strength-neural",
  "recreational-drugs": "strength-neural",
  "anabolic-steroids": "strength-neural",
  corticosteroids: "strength-neural",
  "research-compounds": "strength-neural",
  isotretinoin: "strength-neural",
  minoxidil: "strength-neural",
  "prescription-medications": "strength-neural",
  "medication-adherence": "strength-neural",
  interactions: "strength-neural",
  "preventive-care": "strength-neural",

  sleep: "sleep-circadian",
  "circadian-rhythm": "sleep-circadian",

  measurements: "nutrition-metabolic",
  diet: "nutrition-metabolic",
  alcohol: "nutrition-metabolic",
  glp1: "nutrition-metabolic",
  "blood-testing": "nutrition-metabolic",
} as const satisfies Record<HealthDomain, HealthPillar>;

export const QUESTION_PILLAR_OVERRIDES = {
  reported_vo2_max_ml_kg_min: "cardio-energy",
  chair_stand_30s_count: "strength-neural",
  falls_past_year: "strength-neural",
  erectile_difficulty: "cardio-energy",
  pregnancy_complication_history: "cardio-energy",
  family_diabetes: "nutrition-metabolic",
  glucose_high_ever: "nutrition-metabolic",
  daily_activity_30_min: "nutrition-metabolic",
  diagnosed_high_cholesterol: "nutrition-metabolic",
  statin_current: "cardio-energy",
  education_years: "strength-neural",
  neck_circumference_cm: "sleep-circadian",
  cancer_alarm_signs: "nutrition-metabolic",
  dementia_family_history: "strength-neural",
  movement_strength_days: "strength-neural",
  movement_balance_training: "strength-neural",
  has_recent_labs: "cardio-energy",
  uses_minoxidil: "cardio-energy",
  minoxidil_detail_cardiac_symptoms: "cardio-energy",
  adolescent_substance_severe_timing: "nutrition-metabolic",
} as const satisfies Readonly<Record<string, HealthPillar>>;

export function healthPillarForQuestion(question: Question): HealthPillar {
  return QUESTION_PILLAR_OVERRIDES[question.id as keyof typeof QUESTION_PILLAR_OVERRIDES]
    ?? DEFAULT_PILLAR_BY_DOMAIN[question.domain];
}

export function groupQuestionsByPillar(questions: ReadonlyArray<Question>): Question[] {
  return HEALTH_PILLARS.flatMap((pillar) =>
    questions.filter((question) => healthPillarForQuestion(question) === pillar),
  );
}

export const RISK_RULE_PILLAR_BY_ID = {
  "urgent-chest": "cardio-energy",
  "urgent-breathing": "cardio-energy",
  "urgent-severe-allergy": "cardio-energy",
  "urgent-severe-bleeding": "cardio-energy",
  "blood-pressure-salt-context": "cardio-energy",
  "breathlessness-review": "cardio-energy",
  "exertional-chest-pain-review": "cardio-energy",
  "exertional-leg-pain-review": "cardio-energy",
  "irregular-palpitations-review": "cardio-energy",
  "atrial-fibrillation-review": "cardio-energy",
  "nicotine-support": "cardio-energy",
  "lung-cancer-screening-eligibility": "cardio-energy",
  "secondhand-smoke-exposure": "cardio-energy",
  "slow-walking-pace-review": "cardio-energy",
  "pregnancy-complication-cardiovascular-context": "cardio-energy",
  "early-menopause-cardiovascular-context": "cardio-energy",
  "erectile-difficulty-vascular-review": "cardio-energy",
  "oral-minoxidil-symptom-review": "cardio-energy",
  "topical-minoxidil-symptom-review": "cardio-energy",
  "anabolic-cardiorespiratory-review": "cardio-energy",
  "anabolic-leg-symptom-review": "cardio-energy",
  "stimulant-symptom-review": "cardio-energy",

  "urgent-stroke": "strength-neural",
  "urgent-overdose-poisoning": "strength-neural",
  "urgent-self-harm": "strength-neural",
  "urgent-adolescent-substance-safety": "strength-neural",
  "low-mood-support": "strength-neural",
  "child-feeling-support": "strength-neural",
  "adolescent-substance-support": "strength-neural",
  "adolescent-substance-safety-support": "strength-neural",
  "isotretinoin-physical-symptom-review": "strength-neural",
  "isotretinoin-mood-review": "strength-neural",
  "falls-risk-review": "strength-neural",
  "polypharmacy-review": "strength-neural",
  "high-risk-medication-review": "strength-neural",
  "financial-strain-support": "strength-neural",
  "research-product-source-review": "strength-neural",
  "research-product-condition-review": "strength-neural",
  "research-product-storage-review": "strength-neural",
  "anabolic-neurologic-review": "strength-neural",
  "anabolic-mood-review": "strength-neural",
  "cannabis-unwanted-effect-review": "strength-neural",
  "opioid-mixing-safety-review": "strength-neural",
  "psychedelic-aftereffect-review": "strength-neural",
  "recreational-drug-effect-review": "strength-neural",
  "changing-skin-mark-review": "strength-neural",
  "sexual-safety-support": "strength-neural",
  "adult-movement-pattern": "strength-neural",

  "adult-short-sleep": "sleep-circadian",
  "sleep-breathing-review": "sleep-circadian",

  "urgent-adolescent-pregnancy-safety": "nutrition-metabolic",
  "cancer-alarm-signs-review": "nutrition-metabolic",
  "anabolic-liver-symptom-review": "nutrition-metabolic",
  "alcohol-control-support": "nutrition-metabolic",
  "glp1-severe-allergy": "nutrition-metabolic",
  "glp1-gastrointestinal-review": "nutrition-metabolic",
  "glp1-glucose-symptom-review": "nutrition-metabolic",
  "glp1-diabetes-vision-review": "nutrition-metabolic",
  "glp1-history-review": "nutrition-metabolic",
  "glp1-pregnancy-procedure-review": "nutrition-metabolic",
  "isotretinoin-pregnancy-program-review": "nutrition-metabolic",
  "systemic-steroid-illness-review": "nutrition-metabolic",
  "systemic-steroid-omission-review": "nutrition-metabolic",
  "eating-distress-support": "nutrition-metabolic",
  "pregnancy-new-concern-review": "nutrition-metabolic",
  "pregnancy-care-safety-support": "nutrition-metabolic",
  "pregnancy-medicine-review": "nutrition-metabolic",
  "minor-pregnancy-support": "nutrition-metabolic",
} as const satisfies Readonly<Record<string, HealthPillar>>;

export function healthPillarForRiskRule(ruleId: string): HealthPillar {
  if (!Object.hasOwn(RISK_RULE_PILLAR_BY_ID, ruleId)) {
    throw new Error(`Missing health-pillar mapping for risk rule: ${ruleId}`);
  }
  return RISK_RULE_PILLAR_BY_ID[ruleId as keyof typeof RISK_RULE_PILLAR_BY_ID];
}

export function indexRiskLeavesByPillar(leaves: ReadonlyArray<RiskLeaf>) {
  const index: Record<HealthPillar, RiskLeaf[]> = {
    "cardio-energy": [],
    "strength-neural": [],
    "sleep-circadian": [],
    "nutrition-metabolic": [],
  };
  for (const leaf of leaves) index[healthPillarForRiskRule(leaf.ruleId)].push(leaf);
  return index;
}
