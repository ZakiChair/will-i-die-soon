export type AnalysisDepth = "quick" | "detailed" | "deep";

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

export type AnswerMap = Readonly<Record<string, AnswerValue | undefined>>;

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
  sensitive?: boolean;
  minAge?: number;
  maxAge?: number;
  condition?: BranchCondition;
  consumers: ReadonlyArray<string>;
};

export type QuestionnaireState = {
  queue: ReadonlyArray<Question>;
  answers: AnswerMap;
};
