import { describe, expect, test } from "vitest";

import { uiCopy } from "../i18n/ui-copy";
import { EXPRESS_QUESTION_IDS } from "../lib/questionnaire";
import {
  humanAtlasBodyContextQuestionIds,
  humanAtlasSceneIds,
  humanAtlasScenes,
  isHumanAtlasSceneId,
} from "./human-atlas";

describe("Human Atlas landing contract", () => {
  test("keeps four ordered visual chapters", () => {
    expect(humanAtlasSceneIds).toEqual([
      "breath",
      "strength",
      "sleep",
      "energy",
    ]);
    expect(humanAtlasScenes.map(({ id }) => id)).toEqual(humanAtlasSceneIds);
    expect(isHumanAtlasSceneId("sleep")).toBe(true);
    expect(isHumanAtlasSceneId("body-context")).toBe(false);
  });

  test("covers every Express input exactly once without inventing a fifth glow", () => {
    const mapped = [
      ...humanAtlasScenes.flatMap(({ questionIds }) => questionIds),
      ...humanAtlasBodyContextQuestionIds,
    ];

    expect(mapped).toHaveLength(EXPRESS_QUESTION_IDS.length);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...mapped].sort()).toEqual([...EXPRESS_QUESTION_IDS].sort());
    expect(humanAtlasScenes).toHaveLength(4);
  });

  test("points every scene at complete bilingual UI copy", () => {
    for (const scene of humanAtlasScenes) {
      for (const key of [
        scene.eyebrowKey,
        scene.titleKey,
        scene.descriptionKey,
        scene.inputLabelKey,
      ]) {
        expect(uiCopy.en[key].trim(), `${scene.id} English ${key}`).not.toBe("");
        expect(uiCopy.fr[key].trim(), `${scene.id} French ${key}`).not.toBe("");
      }
    }
  });
});
