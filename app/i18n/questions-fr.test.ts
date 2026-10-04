import { describe, expect, it } from "vitest";
import { questionBank } from "../data/questions";
import { getEligibleQuestions } from "../lib/questionnaire";
import type { Question } from "../lib/types";
import { frQuestionTranslations, localizeQuestion } from "./questions-fr";
import { questionUnitKeys } from "./ui-copy";

function nonPresentationFields(question: Question): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(question).filter(
      ([key]) => key !== "prompt" && key !== "why" && key !== "options",
    ),
  );
}

describe("French question translations", () => {
  it.each(["en", "fr"] as const)("présente le contexte GLP-1 sans grossesse pour un homme en %s", (locale) => {
    const question = getEligibleQuestions(questionBank, { age: 35, countryCode: "FR" }, {
      sex_assigned_at_birth: "male", uses_glp1: true,
    }).find(({ id }) => id === "glp1_detail_procedure_pregnancy")!;
    const localized = localizeQuestion(question, locale);

    expect(localized.prompt).toMatch(/anesth|anaesth/i);
    expect(localized.prompt).not.toMatch(/grossesse|allait|pregnan|breastfeed/i);
    expect(localized.options?.map(({ value }) => value)).toEqual(["procedure", "none"]);
  });

  it("covers the audited 140-question bank with every canonical option value", () => {
    expect(questionBank).toHaveLength(140);
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

  it("keeps unit keys for every numeric Express performance question", () => {
    expect(questionUnitKeys).toMatchObject({
      reported_vo2_max_ml_kg_min: "unit.reported_vo2_max_ml_kg_min",
      squat_one_rep_max_kg: "unit.squat_one_rep_max_kg",
      deadlift_one_rep_max_kg: "unit.deadlift_one_rep_max_kg",
    });
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

    expect(localizedLabels).toEqual(Array.from({ length: 9 }, () => "Je ne sais pas"));
  });

  it("uses natural French for missed medicine doses", () => {
    expect(frQuestionTranslations.adherence_missed_doses.prompt).toBe(
      "À quelle fréquence vous arrive-t-il de ne pas prendre, de retarder ou de répéter involontairement une dose de médicament ?",
    );
  });

  it("uses neutral French for composite uncertainty and direct-address prompts", () => {
    expect(frQuestionTranslations.sleep_snoring.options?.unknown).toBe(
      "Personne n'a rien observé ou je ne sais pas",
    );
    expect(frQuestionTranslations.circadian_morning_light.prompt).toBe(
      "Recevez-vous généralement de la lumière du jour ou une lumière vive dans les deux heures qui suivent votre réveil ?",
    );
    expect(frQuestionTranslations.corticosteroid_detail_omission_symptoms.prompt).toBe(
      "Après l'omission d'une dose ou l'arrêt, avez-vous eu une faiblesse grave, un évanouissement, des vomissements répétés, ou avez-vous soudainement été très mal ?",
    );
  });
});
