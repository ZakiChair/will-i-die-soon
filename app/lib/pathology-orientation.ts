import type { PathologySourceId } from "./pathology-risk";
import type { PathologyInstrumentId, PathologyScoreResult } from "./types";

export type PathologyOrientationId =
  | "findrisc-keep-habits"
  | "findrisc-habits-and-clinician"
  | "findrisc-glucose-test"
  | "score2-keep-habits"
  | "score2-clinician"
  | "score2-diabetes-keep-care"
  | "score2-diabetes-clinician"
  | "prevent-keep-habits"
  | "prevent-clinician"
  | "who-cvd-prevention"
  | "stop-bang-watch-symptoms"
  | "stop-bang-sleep-assessment"
  | "copd-watch-symptoms"
  | "copd-spirometry"
  | "caide-heart-and-activity"
  | "audit-c-support"
  | "phq-2-clinician"
  | "gad-2-clinician";

const ORIENTATIONS: Readonly<Record<PathologyInstrumentId, Readonly<Record<string, PathologyOrientationId>>>> = {
  findrisc: {
    low: "findrisc-keep-habits",
    "slightly-elevated": "findrisc-keep-habits",
    moderate: "findrisc-habits-and-clinician",
    high: "findrisc-glucose-test",
    "very-high": "findrisc-glucose-test",
  },
  score2: {
    "low-to-moderate": "score2-keep-habits",
    high: "score2-clinician",
    "very-high": "score2-clinician",
  },
  prevent: {
    low: "prevent-keep-habits",
    borderline: "prevent-clinician",
    intermediate: "prevent-clinician",
    high: "prevent-clinician",
  },
  "who-cvd": {
    "under-5": "who-cvd-prevention",
    "5-to-9": "who-cvd-prevention",
    "10-to-19": "who-cvd-prevention",
    "20-to-29": "who-cvd-prevention",
    "30-plus": "who-cvd-prevention",
  },
  "stop-bang": {
    low: "stop-bang-watch-symptoms",
    intermediate: "stop-bang-watch-symptoms",
    high: "stop-bang-sleep-assessment",
  },
  "copd-ps": {
    "below-threshold": "copd-watch-symptoms",
    "screen-positive": "copd-spirometry",
  },
  caide: {
    low: "caide-heart-and-activity",
    "slightly-elevated": "caide-heart-and-activity",
    moderate: "caide-heart-and-activity",
    high: "caide-heart-and-activity",
    "very-high": "caide-heart-and-activity",
  },
  "audit-c": { positive: "audit-c-support" },
  "phq-2": { positive: "phq-2-clinician" },
  "gad-2": { positive: "gad-2-clinician" },
};

export const ORIENTATION_SOURCE_IDS: Readonly<Record<PathologyOrientationId, ReadonlyArray<PathologySourceId>>> = {
  "findrisc-keep-habits": ["findriscLindstrom2003", "whoPhysicalActivity", "whoHealthyDiet"],
  "findrisc-habits-and-clinician": ["findriscLindstrom2003", "adaDiagnosisStandards2025"],
  "findrisc-glucose-test": ["adaDiagnosisStandards2025", "findriscLindstrom2003"],
  "score2-keep-habits": ["escPrevention2021", "whoPhysicalActivity", "whoTobacco"],
  "score2-clinician": ["escPrevention2021", "whoTobacco"],
  "score2-diabetes-keep-care": ["escDiabetes2023", "whoPhysicalActivity", "whoTobacco"],
  "score2-diabetes-clinician": ["escDiabetes2023", "whoTobacco"],
  "prevent-keep-habits": ["accAhaDyslipidemia2026", "whoPhysicalActivity", "whoTobacco"],
  "prevent-clinician": ["accAhaDyslipidemia2026", "whoTobacco"],
  "who-cvd-prevention": ["whoHeartsRiskBased", "whoPhysicalActivity", "whoTobacco"],
  "stop-bang-watch-symptoms": ["nhsSleepApnoea"],
  "stop-bang-sleep-assessment": ["nhsSleepApnoea"],
  "copd-watch-symptoms": ["nhsCopdDiagnosis"],
  "copd-spirometry": ["nhsCopdDiagnosis", "whoTobacco"],
  "caide-heart-and-activity": ["lancetDementia2024", "nhsBloodPressureTest"],
  "audit-c-support": ["nhsAlcoholSupport"],
  "phq-2-clinician": ["niceDepression", "whoDepression"],
  "gad-2-clinician": ["nhsGeneralisedAnxiety"],
};

/** What to do next for a complete score, or for a range whose category is already settled. */
export function pathologyOrientation(score: PathologyScoreResult): PathologyOrientationId | undefined {
  const category =
    score.status === "complete"
      ? score.category
      : score.status === "incomplete" && score.range && score.range.low.category === score.range.high.category
        ? score.range.low.category
        : undefined;
  if (category === undefined) return undefined;
  if (score.variant === "score2-diabetes") {
    return category === "low" || category === "moderate"
      ? "score2-diabetes-keep-care"
      : "score2-diabetes-clinician";
  }
  return ORIENTATIONS[score.instrument][category];
}
