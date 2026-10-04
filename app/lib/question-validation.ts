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
  movement_walking_days: 7,
  movement_strength_days: 7,
  waist_circumference_cm: 250,
  neck_circumference_cm: 80,
};

const POSITIVE_MEASUREMENTS: ReadonlySet<string> = new Set([
  "height_cm",
  "weight_kg",
  "waist_circumference_cm",
  "neck_circumference_cm",
]);

/** Bornes d'unité uniquement : aucune valeur « normale » médicale n'est imposée. */
export function validateQuestionAnswer(
  question: Pick<Question, "id" | "answerType">,
  value: AnswerValue,
  subjectAgeYears?: number,
): QuestionValidationError | null {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return { kind: "required" };
  }
  if (question.answerType !== "number" && question.answerType !== "scale") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return { kind: "number" };

  const maximum =
    question.id === "diabetes_age_at_diagnosis" && Number.isInteger(subjectAgeYears)
      ? subjectAgeYears
      : question.answerType === "scale" ? 10 : MAXIMUM_BY_QUESTION[question.id];
  if (maximum !== undefined && (value < 0 || value > maximum)) {
    return { kind: "range", maximum };
  }
  if (POSITIVE_MEASUREMENTS.has(question.id) && value <= 0) {
    return { kind: "positive" };
  }
  if (value < 0) return { kind: "nonnegative" };
  return null;
}
