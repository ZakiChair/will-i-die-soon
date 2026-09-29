import type { AnswerValue, Question } from "./types";

export type QuestionValidationError =
  | { kind: "required" }
  | { kind: "number" }
  | { kind: "nonnegative" }
  | { kind: "positive" }
  | { kind: "range"; maximum: number };

const MAXIMUM_BY_QUESTION: Readonly<Record<string, number>> = {
  usual_sleep_hours: 24,
  sedentary_total_hours: 24,
  sedentary_screen_evening: 2,
  movement_walking_days: 7,
  movement_strength_days: 7,
  diet_nuts_seeds: 7,
  cannabis_detail_frequency: 30,
};

/** Bornes d'unité uniquement : aucune valeur « normale » médicale n'est imposée. */
export function validateQuestionAnswer(
  question: Pick<Question, "id" | "answerType">,
  value: AnswerValue,
): QuestionValidationError | null {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return { kind: "required" };
  }
  if (question.answerType !== "number" && question.answerType !== "scale") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return { kind: "number" };

  const maximum = question.answerType === "scale" ? 10 : MAXIMUM_BY_QUESTION[question.id];
  if (maximum !== undefined && (value < 0 || value > maximum)) {
    return { kind: "range", maximum };
  }
  if ((question.id === "height_cm" || question.id === "weight_kg") && value <= 0) {
    return { kind: "positive" };
  }
  if (value < 0) return { kind: "nonnegative" };
  return null;
}
