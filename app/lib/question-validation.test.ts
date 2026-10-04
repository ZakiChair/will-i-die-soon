import { expect, test } from "vitest";
import { validateQuestionAnswer } from "./question-validation";

test.each([-1, 11, Number.NaN, Number.POSITIVE_INFINITY])("rejects an invalid numeric scale answer: %s", (value) => {
  expect(validateQuestionAnswer({ id: "sleep_refreshed", answerType: "scale" }, value)).not.toBeNull();
});

test.each([0, 7, 10])("accepts a scale response within its bounds: %s", (value) => {
  expect(validateQuestionAnswer({ id: "sleep_refreshed", answerType: "scale" }, value)).toBeNull();
});

test("does not invent an age limit without the person's age", () => {
  expect(validateQuestionAnswer({ id: "smoking_total_years", answerType: "number" }, 80)).toBeNull();
});

test("limits age at diabetes diagnosis to the current age when it is known", () => {
  const question = { id: "diabetes_age_at_diagnosis", answerType: "number" } as const;
  expect(validateQuestionAnswer(question, 60, 60)).toBeNull();
  expect(validateQuestionAnswer(question, 61, 60)).toEqual({ kind: "range", maximum: 60 });
  expect(validateQuestionAnswer(question, -1, 60)).toEqual({ kind: "range", maximum: 60 });
});

test.each([
  ["sedentary_total_hours", 24, 25],
  ["movement_walking_days", 7, 8],
])("uses the stated observation period for %s", (id, valid, invalid) => {
  expect(validateQuestionAnswer({ id, answerType: "number" }, valid)).toBeNull();
  expect(validateQuestionAnswer({ id, answerType: "number" }, invalid)).toEqual({ kind: "range", maximum: valid });
});

test("keeps a false answer valid and distinguishes it from an unanswered question", () => {
  const question = { id: "current_tobacco_nicotine", answerType: "boolean" } as const;
  expect(validateQuestionAnswer(question, false)).toBeNull();
  expect(validateQuestionAnswer(question, null)).toEqual({ kind: "required" });
});
