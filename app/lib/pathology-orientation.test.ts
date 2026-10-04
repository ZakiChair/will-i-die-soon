import { describe, expect, test } from "vitest";

import { ORIENTATION_SOURCE_IDS, pathologyOrientation } from "./pathology-orientation";
import { resolvePathologySources } from "./pathology-risk";
import type { PathologyInstrumentId, PathologyRiskLevel, PathologyScoreResult } from "./types";

function completeScore(instrument: PathologyInstrumentId, category: string, level: PathologyRiskLevel = "low"): PathologyScoreResult {
  return { instrument, status: "complete", category, level, inputs: [], sourceIds: [], modifiers: [] };
}

describe("pathology orientation", () => {
  test.each([
    ["findrisc", "low", "findrisc-keep-habits"],
    ["findrisc", "slightly-elevated", "findrisc-keep-habits"],
    ["findrisc", "moderate", "findrisc-habits-and-clinician"],
    ["findrisc", "high", "findrisc-glucose-test"],
    ["findrisc", "very-high", "findrisc-glucose-test"],
    ["score2", "low-to-moderate", "score2-keep-habits"],
    ["score2", "high", "score2-clinician"],
    ["score2", "very-high", "score2-clinician"],
    ["prevent", "low", "prevent-keep-habits"],
    ["prevent", "borderline", "prevent-clinician"],
    ["prevent", "intermediate", "prevent-clinician"],
    ["prevent", "high", "prevent-clinician"],
    ["who-cvd", "under-5", "who-cvd-prevention"],
    ["who-cvd", "30-plus", "who-cvd-prevention"],
    ["stop-bang", "low", "stop-bang-watch-symptoms"],
    ["stop-bang", "intermediate", "stop-bang-watch-symptoms"],
    ["stop-bang", "high", "stop-bang-sleep-assessment"],
    ["copd-ps", "below-threshold", "copd-watch-symptoms"],
    ["copd-ps", "screen-positive", "copd-spirometry"],
    ["caide", "low", "caide-heart-and-activity"],
    ["caide", "very-high", "caide-heart-and-activity"],
    ["audit-c", "positive", "audit-c-support"],
    ["phq-2", "positive", "phq-2-clinician"],
    ["gad-2", "positive", "gad-2-clinician"],
  ] as const)("%s %s → %s", (instrument, category, expected) => {
    expect(pathologyOrientation(completeScore(instrument, category))).toBe(expected);
  });

  test("adds nothing to a negative alcohol, depression or anxiety screen", () => {
    for (const instrument of ["audit-c", "phq-2", "gad-2"] as const) {
      expect(pathologyOrientation(completeScore(instrument, "negative"))).toBeUndefined();
    }
  });

  test("gives diabetes-specific follow-up at every SCORE2-Diabetes level", () => {
    for (const category of ["low", "moderate"]) {
      expect(pathologyOrientation({ ...completeScore("score2", category), variant: "score2-diabetes" }))
        .toBe("score2-diabetes-keep-care");
    }
    for (const category of ["high", "very-high"]) {
      expect(pathologyOrientation({ ...completeScore("score2", category), variant: "score2-diabetes" }))
        .toBe("score2-diabetes-clinician");
    }
  });

  test("orients an incomplete score only when its range settles the category", () => {
    const base = { instrument: "audit-c", status: "incomplete", inputs: [], sourceIds: [], missingInputs: ["alcohol_detail_heavy_episode"] } as const;
    expect(pathologyOrientation(base)).toBeUndefined();
    expect(
      pathologyOrientation({
        ...base,
        range: { low: { category: "positive", level: "moderate", points: 4 }, high: { category: "positive", level: "moderate", points: 8 } },
      }),
    ).toBe("audit-c-support");
    expect(
      pathologyOrientation({
        ...base,
        range: { low: { category: "negative", level: "low", points: 2 }, high: { category: "positive", level: "moderate", points: 6 } },
      }),
    ).toBeUndefined();
    expect(
      pathologyOrientation({ instrument: "caide", status: "not-applicable", reason: "age-out-of-range", inputs: [], sourceIds: [] }),
    ).toBeUndefined();
  });

  test("cites resolvable sources for every orientation", () => {
    for (const [id, sourceIds] of Object.entries(ORIENTATION_SOURCE_IDS)) {
      expect(sourceIds.length, id).toBeGreaterThan(0);
      expect(resolvePathologySources(sourceIds), id).toHaveLength(sourceIds.length);
    }
  });
});
