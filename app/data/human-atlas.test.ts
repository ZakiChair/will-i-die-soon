import { describe, expect, test } from "vitest";

import { uiCopy } from "../i18n/ui-copy";
import { EXPRESS_QUESTION_IDS } from "../lib/questionnaire";
import {
  humanAtlasBodyContextQuestionIds,
  humanAtlasSceneIds,
  humanAtlasStorySceneIds,
  humanAtlasScenes,
  isHumanAtlasSceneId,
} from "./human-atlas";

describe("Human Atlas landing contract", () => {
  test("keeps canonical axes stable and orders the landing story from sleep to nutrition", () => {
    expect(humanAtlasSceneIds).toEqual([
      "breath",
      "strength",
      "sleep",
      "energy",
    ]);
    expect(humanAtlasScenes.map(({ id }) => id)).toEqual([
      "sleep", "breath", "strength", "energy",
    ]);
    expect(humanAtlasScenes.map(({ id }) => id)).toEqual(humanAtlasStorySceneIds);
    expect([...humanAtlasStorySceneIds].sort()).toEqual([...humanAtlasSceneIds].sort());
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
    for (const [index, scene] of humanAtlasScenes.entries()) {
      const number = String(index + 1).padStart(2, "0");
      expect(uiCopy.en[scene.eyebrowKey]).toMatch(new RegExp(`^${number} · `));
      expect(uiCopy.fr[scene.eyebrowKey]).toMatch(new RegExp(`^${number} · `));
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
