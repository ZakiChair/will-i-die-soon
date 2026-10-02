export type AnalysisDepth = "express" | "quick" | "detailed" | "deep";

export type HealthDomain =
  | "demographics"
  | "measurements"
  | "family-history"
  | "diagnosed-conditions"
  | "current-symptoms"
  | "emergency-symptoms"
  | "diet"
  | "movement"
  | "sedentary-time"
  | "sleep"
  | "circadian-rhythm"
  | "stress"
  | "mood"
  | "anxiety"
  | "cognition"
  | "social-connection"
  | "environment"
  | "sun"
  | "sexual-health"
  | "pregnancy"
  | "tobacco-nicotine"
  | "alcohol"
  | "cannabis"
  | "stimulants"
  | "opioids"
  | "psychedelics"
  | "recreational-drugs"
  | "anabolic-steroids"
  | "corticosteroids"
  | "research-compounds"
  | "glp1"
  | "isotretinoin"
  | "minoxidil"
  | "prescription-medications"
  | "medication-adherence"
  | "interactions"
  | "preventive-care"
  | "blood-pressure"
  | "blood-testing";

export type AnswerValue = string | number | boolean | ReadonlyArray<string> | null;

export type AnswerMap = Readonly<Partial<Record<string, AnswerValue>>>;

export type ProfileContext = {
  age: number;
  countryCode: string;
  assistedMinor?: boolean;
};

export type BranchCondition =
  | {
      questionId: string;
      operator: "equals" | "not-equals";
      value: AnswerValue;
    }
  | {
      questionId: string;
      operator: "includes";
      value: string;
    }
  | { all: ReadonlyArray<BranchCondition> }
  | { any: ReadonlyArray<BranchCondition> };

export type Question = {
  id: string;
  domain: HealthDomain;
  prompt: string;
  why: string;
  answerType: "boolean" | "single" | "multi" | "number" | "scale" | "text";
  options?: ReadonlyArray<{ value: string; label: string }>;
  tiers: ReadonlyArray<AnalysisDepth>;
  priority: number;
  sensitive: true;
  minAge?: number;
  maxAge?: number;
  condition?: BranchCondition;
  consumers: ReadonlyArray<string>;
};

export type QuestionnaireState = {
  queue: ReadonlyArray<Question>;
  answers: AnswerMap;
};

export type EvidenceTier =
  | "validated-estimate"
  | "authoritative-safety"
  | "guideline-action"
  | "evidence-limited-association";

export type RiskUrgency = "urgent" | "prompt-review" | "long-term" | "support";

export type RiskSignal =
  | "urgent"
  | "high-signal"
  | "worth-attention"
  | "low-signal";

export type RiskGroup =
  | "immediate-red-flags"
  | "cardiovascular"
  | "metabolic"
  | "sleep"
  | "respiratory"
  | "liver"
  | "kidney"
  | "mental-wellbeing"
  | "dependency"
  | "medication-substance-review"
  | "preventive-follow-up"
  | "skin-hair"
  | "reproductive-health"
  | "musculoskeletal";

export type EvidenceSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  reviewedAt: string;
  /** Publisher or regulator provenance only; never a user-country filter. */
  jurisdictions: "all" | ReadonlyArray<string>;
  /** Countries and ages for which the cited content supports the associated copy. */
  applicability: RiskApplicability;
  /** Countries where this source directly supports a local operational instruction. */
  operationalCountries?: ReadonlyArray<string>;
};

export type RiskApplicability = {
  minAge?: number;
  maxAge?: number;
  countries: "all" | ReadonlyArray<string>;
};

export type RiskCondition =
  | {
      questionId: string;
      operator: "equals";
      value: string | number | boolean;
    }
  | {
      questionId: string;
      operator: "includes";
      value: string;
    }
  | {
      questionId: string;
      operator: "less-than" | "greater-than-or-equal";
      value: number;
      validMin?: number;
      validMax?: number;
    }
  | { all: ReadonlyArray<RiskCondition> }
  | { any: ReadonlyArray<RiskCondition> };

export type RiskFactorDefinition = {
  questionId: string;
  label: string;
  condition: RiskCondition;
};

export type EmergencyKind =
  | "chest"
  | "breathing"
  | "stroke"
  | "severe-allergy"
  | "overdose-poisoning"
  | "severe-bleeding"
  | "self-harm"
  | "pregnancy-safety"
  | "substance-safety";

export type RiskRule = {
  id: string;
  group: RiskGroup;
  title: string;
  copy: string;
  inputs: ReadonlyArray<string>;
  sourceIds: ReadonlyArray<string>;
  conditionalSources?: ReadonlyArray<{
    sourceId: string;
    condition: RiskCondition;
  }>;
  evidenceTier: EvidenceTier;
  urgency: RiskUrgency;
  signal: RiskSignal;
  condition: RiskCondition;
  factors: ReadonlyArray<RiskFactorDefinition>;
  applicability: RiskApplicability;
  dedupeKey?: string;
  emergencyKind?: EmergencyKind;
};

export type RiskLeaf = {
  id: string;
  ruleId: string;
  rulesetVersion: string;
  group: RiskGroup;
  title: string;
  copy: string;
  evidenceTier: EvidenceTier;
  urgency: RiskUrgency;
  signal: RiskSignal;
  probability?: number;
  factors: ReadonlyArray<string>;
  missingInputs: ReadonlyArray<string>;
  sources: ReadonlyArray<EvidenceSource>;
  applicability: RiskApplicability;
};

export type ReleasePolicy = {
  audience: "private-research" | "public-wellness" | "regulated";
  allowQualitativeRules: boolean;
  allowPromptReviewSignals: boolean;
  allowValidatedProbabilities: boolean;
  allowUrgentSignals: boolean;
  jurisdiction?: string;
  enabledModelVersion?: string;
};

export type PathologyInstrumentId =
  | "findrisc"
  | "score2"
  | "stop-bang"
  | "audit-c"
  | "phq-2"
  | "gad-2"
  | "copd-ps"
  | "caide";

export type PathologyRiskLevel = "low" | "moderate" | "high" | "very-high";

export type PathologyNotApplicableReason =
  | "age-out-of-range"
  | "diagnosed-condition"
  | "established-cvd"
  | "sex-not-supported"
  | "region-not-calibrated";

/** One value the instrument used; `derived` marks values reconstructed from other answers. */
export type PathologyScoreInput = {
  id: string;
  value: string | number | boolean;
  derived?: true;
};

type PathologyScoreBase = {
  instrument: PathologyInstrumentId;
  inputs: ReadonlyArray<PathologyScoreInput>;
  sourceIds: ReadonlyArray<string>;
};

export type PathologyRangeBound = {
  category: string;
  level: PathologyRiskLevel;
  points?: number;
  /** Published absolute risk; present only when the release policy allows it. */
  riskPercent?: number;
};

/**
 * Every result the missing answers could still produce. Never covers blood
 * pressure, laboratory values, body size or sex: those stay unknown.
 */
export type PathologyScoreRange = {
  low: PathologyRangeBound;
  high: PathologyRangeBound;
  maxPoints?: number;
  riskHorizonYears?: number;
};

export type PathologyHabitId = "daily-activity" | "daily-fruit-vegetables" | "weekly-activity" | "no-smoking";

/** The same instrument with healthier declared habits: a score comparison, not a causal effect. */
export type PathologyHabitGain = PathologyRangeBound & {
  habits: ReadonlyArray<PathologyHabitId>;
};

export type PathologyScoreResult = PathologyScoreBase &
  (
    | {
        status: "complete";
        category: string;
        level: PathologyRiskLevel;
        points?: number;
        maxPoints?: number;
        /** Published absolute risk; present only when the release policy allows it. */
        riskPercent?: number;
        riskHorizonYears?: number;
        modifiers: ReadonlyArray<string>;
        gain?: PathologyHabitGain;
      }
    | {
        status: "incomplete";
        missingInputs: ReadonlyArray<string>;
        /** Inputs read only once a missing answer takes certain values, like the AUDIT-C drink details. */
        conditionalInputs?: ReadonlyArray<string>;
        range?: PathologyScoreRange;
      }
    | { status: "not-applicable"; reason: PathologyNotApplicableReason }
  );

export type ClassifiedLabMarker = "hba1c" | "glucose" | "egfr";

export type LabClassification = {
  marker: ClassifiedLabMarker;
  value: number;
  unit: string;
  category: string;
  sourceIds: ReadonlyArray<string>;
};

export type DementiaFactorId =
  | "less-education"
  | "hearing-loss"
  | "high-ldl"
  | "depression"
  | "head-injury"
  | "physical-inactivity"
  | "diabetes"
  | "smoking"
  | "hypertension"
  | "obesity"
  | "excessive-alcohol"
  | "social-isolation"
  | "air-pollution"
  | "vision-loss";

export type DementiaFactor = {
  id: DementiaFactorId;
  status: "present" | "absent" | "unanswered";
  inputs: ReadonlyArray<string>;
};

/** Family history is context beside the modifiable factors, never a factor itself. */
export type DementiaFamilyHistory = "reported" | "not-reported" | "unanswered";

export type PathologySynthesis = {
  rulesetVersion: string;
  scores: ReadonlyArray<PathologyScoreResult>;
  labClassifications: ReadonlyArray<LabClassification>;
  dementiaFactors: ReadonlyArray<DementiaFactor>;
  dementiaFamilyHistory: DementiaFamilyHistory;
  dementiaSourceIds: ReadonlyArray<string>;
};
