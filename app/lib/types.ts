export type AnalysisDepth = "express" | "quick" | "detailed" | "deep";

export type HealthDomain =
  | "demographics"
  | "measurements"
  | "family-history"
  | "diagnosed-conditions"
  | "current-symptoms"
  | "emergency-symptoms"
  | "diet"
  | "hydration"
  | "movement"
  | "sedentary-time"
  | "sleep"
  | "circadian-rhythm"
  | "stress"
  | "mood"
  | "anxiety"
  | "cognition"
  | "social-connection"
  | "work-exposures"
  | "environment"
  | "sun"
  | "dental-health"
  | "sexual-health"
  | "reproductive-health"
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
  | "otc-medications"
  | "supplements"
  | "medication-adherence"
  | "interactions"
  | "preventive-care"
  | "vaccinations"
  | "blood-pressure"
  | "blood-testing"
  | "lab-values";

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
