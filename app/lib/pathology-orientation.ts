import type { PathologySourceId } from "./pathology-risk";
import type { PathologyInstrumentId, PathologyScoreResult } from "./types";

export type PathologyOrientationId =
  | "findrisc-keep-habits"
  | "findrisc-habits-and-clinician"
  | "findrisc-glucose-test"
  | "score2-keep-habits"
  | "score2-clinician"
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
  "score2-keep-habits": ["escPrevention2021", "whoPhysicalActivity"],
  "score2-clinician": ["escPrevention2021", "whoTobacco"],
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
  return category === undefined ? undefined : ORIENTATIONS[score.instrument][category];
}
