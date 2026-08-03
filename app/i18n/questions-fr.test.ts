import { describe, expect, it } from "vitest";
import { questionBank } from "../data/questions";
import { frQuestionTranslations, localizeQuestion } from "./questions-fr";

describe("French question translations", () => {
  it("covers the audited 243-question bank with every canonical option value", () => {
    expect(questionBank).toHaveLength(243);
    expect(Object.keys(frQuestionTranslations).sort()).toEqual(
      questionBank.map(({ id }) => id).sort(),
    );

    for (const question of questionBank) {
      const translated = frQuestionTranslations[question.id];

      expect(translated.prompt.trim()).not.toBe("");
      expect(translated.why.trim()).not.toBe("");
      expect(Object.keys(translated.options ?? {}).sort()).toEqual(
        (question.options ?? []).map(({ value }) => value).sort(),
      );
    }
  });

  it("returns the canonical question unchanged for English", () => {
    for (const question of questionBank) {
      expect(localizeQuestion(question, "en")).toBe(question);
    }
  });

  it("localizes only render copy while preserving option values and canonical data", () => {
    for (const question of questionBank) {
      const canonicalSnapshot = structuredClone(question);
      const localized = localizeQuestion(question, "fr");

      expect(localized).not.toBe(question);
      expect(localized.id).toBe(question.id);
      expect(localized.prompt).toBe(frQuestionTranslations[question.id].prompt);
      expect(localized.why).toBe(frQuestionTranslations[question.id].why);
      expect(localized.options?.map(({ value }) => value)).toEqual(
        question.options?.map(({ value }) => value),
      );
      expect(question).toEqual(canonicalSnapshot);
    }
  });
});
