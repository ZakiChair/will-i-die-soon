import { describe, expect, it } from "vitest";
import { questionBank } from "../data/questions";
import type { Question } from "../lib/types";
import { frQuestionTranslations, localizeQuestion } from "./questions-fr";

function nonPresentationFields(question: Question): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(question).filter(
      ([key]) => key !== "prompt" && key !== "why" && key !== "options",
    ),
  );
}

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
      expect(nonPresentationFields(localized)).toEqual(nonPresentationFields(question));

      expect(localized.options).toEqual(
        question.options?.map((option) => ({
          ...option,
          label: frQuestionTranslations[question.id].options?.[option.value],
        })),
      );

      expect(question).toEqual(canonicalSnapshot);
    }
  });

  it("uses neutral French for canonical Not sure options", () => {
    const localizedLabels = questionBank.flatMap((question) =>
      (question.options ?? [])
        .filter(({ label }) => label === "Not sure")
        .map(({ value }) => frQuestionTranslations[question.id].options?.[value]),
    );

    expect(localizedLabels).toEqual(Array.from({ length: 15 }, () => "Je ne sais pas"));
  });
});
