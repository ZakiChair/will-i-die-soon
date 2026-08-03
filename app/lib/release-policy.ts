import type { ReleasePolicy } from "./types";

export const prototypePolicy: ReleasePolicy = {
  audience: "private-research",
  allowQualitativeRules: true,
  allowPromptReviewSignals: true,
  allowValidatedProbabilities: false,
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
  enabledModelVersion: "prototype-v1",
};
