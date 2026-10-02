import type { ReleasePolicy } from "./types";

export const RISK_RULESET_VERSION = "risk-rules-v1";

export const PATHOLOGY_RULESET_VERSION = "pathology-scores-v2";

export const prototypePolicy: ReleasePolicy = {
  audience: "private-research",
  allowQualitativeRules: true,
  allowPromptReviewSignals: true,
  allowValidatedProbabilities: true,
  allowUrgentSignals: true,
};

export const publicWellnessPolicy: ReleasePolicy = {
  audience: "public-wellness",
  allowQualitativeRules: true,
  allowPromptReviewSignals: false,
  allowValidatedProbabilities: false,
  allowUrgentSignals: false,
};

export const regulatedPolicy: ReleasePolicy = {
  audience: "regulated",
  allowQualitativeRules: true,
  allowPromptReviewSignals: true,
  allowValidatedProbabilities: true,
  allowUrgentSignals: true,
  jurisdiction: "CH",
  enabledModelVersion: RISK_RULESET_VERSION,
};
