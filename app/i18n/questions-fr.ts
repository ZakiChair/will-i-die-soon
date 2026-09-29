import type { Question } from "../lib/types";
import { clinicalFrQuestionTranslations } from "./questions-fr-clinical";
import { coreFrQuestionTranslations } from "./questions-fr-core";
import { labsFrQuestionTranslations } from "./questions-fr-labs";
import { lifestyleFrQuestionTranslations } from "./questions-fr-lifestyle";
import { medicationsFrQuestionTranslations } from "./questions-fr-medications";
import { performanceFrQuestionTranslations } from "./questions-fr-performance";
import { substancesFrQuestionTranslations } from "./questions-fr-substances";
import type { Locale } from "./types";
import type { QuestionTranslation } from "./question-types";

export const frQuestionTranslations: Readonly<Record<string, QuestionTranslation>> = {
  ...coreFrQuestionTranslations,
  ...performanceFrQuestionTranslations,
  ...lifestyleFrQuestionTranslations,
  ...clinicalFrQuestionTranslations,
  ...substancesFrQuestionTranslations,
  ...medicationsFrQuestionTranslations,
  ...labsFrQuestionTranslations,
};

function missingOption(questionId: string, optionValue: string): never {
  throw new Error(`Missing French option: ${questionId}.${optionValue}`);
}

export function localizeQuestion(question: Question, locale: Locale): Question {
  if (locale === "en") return question;
  const copy = frQuestionTranslations[question.id];
  if (!copy) throw new Error(`Missing French question: ${question.id}`);
  return {
    ...question,
    prompt: question.id === "glp1_detail_procedure_pregnancy"
      && question.options?.every(({ value }) => value === "procedure" || value === "none")
      ? "Une anesthésie générale ou une sédation profonde est-elle prévue prochainement pour vous ?"
      : copy.prompt,
    why: copy.why,
    options: question.options?.map((option) => ({
      ...option,
      label: copy.options?.[option.value] ?? missingOption(question.id, option.value),
    })),
  };
}
