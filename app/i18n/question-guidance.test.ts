import { expect, test } from "vitest";
import { questionBank } from "../data/questions";
import { getQuestionGuidance, questionValidationMessage } from "./question-guidance";
import type { Locale } from "./types";

test.each(questionBank.filter((question) => question.answerType === "scale"))(
  "describes both ends of the $id scale in each language",
  (question) => {
    for (const locale of ["en", "fr"] satisfies Locale[]) {
      const anchors = getQuestionGuidance(question.id, locale).scale;
      expect(anchors?.[0].trim()).toBeTruthy();
      expect(anchors?.[1].trim()).toBeTruthy();
      expect(anchors?.[0]).not.toBe(anchors?.[1]);
    }
  },
);

test("keeps sensitive weight and substance questions on their existing skip wording", () => {
  expect(getQuestionGuidance("weight_kg", "fr").unknownMeasurement).toBeUndefined();
  expect(getQuestionGuidance("tobacco_detail_frequency", "fr").unknownMeasurement).toBeUndefined();
});

test("leaves unmatched question explanations to the canonical source", () => {
  expect(getQuestionGuidance("urgent_breathing_now", "en").why).toBeUndefined();
});

test("explains a non-finite numeric answer in both languages", () => {
  expect(questionValidationMessage({ kind: "number" }, "en")).toMatch(/valid number/);
  expect(questionValidationMessage({ kind: "number" }, "fr")).toMatch(/nombre valide/);
});
