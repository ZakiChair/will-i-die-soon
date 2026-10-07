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

test.each(["squat_one_rep_max_kg", "deadlift_one_rep_max_kg"])("tells %s to use a known result and never a maximal test, in both languages", (id) => {
  const en = getQuestionGuidance(id, "en");
  expect(en.notice).toMatch(/result you already know/i);
  expect(en.notice).toMatch(/do not perform a maximal test/i);
  expect(en.why).toMatch(/optional/i);
  expect(en.unknownMeasurement).toBe("I don't know this measurement");
  const fr = getQuestionGuidance(id, "fr");
  expect(fr.notice).toMatch(/résultat déjà connu/);
  expect(fr.notice).toMatch(/Ne faites pas de test maximal/);
  expect(fr.why).toMatch(/facultatif/i);
  expect(fr.unknownMeasurement).toBe("Je ne connais pas cette mesure");
  for (const match of fr.notice!.matchAll(/[;:]/gu)) {
    expect(fr.notice![match.index - 1], `${id} before ${match[0]}`).toBe("\u00a0");
  }
});

test("leaves unmatched question explanations to the canonical source", () => {
  expect(getQuestionGuidance("urgent_breathing_now", "en").why).toBeUndefined();
});

test("explains a non-finite numeric answer in both languages", () => {
  expect(questionValidationMessage({ kind: "number" }, "en")).toMatch(/valid number/);
  expect(questionValidationMessage({ kind: "number" }, "fr")).toMatch(/nombre valide/);
});

test("anchors the standard-drink count to the local definition for each supported country", () => {
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en", "US").notice).toContain("14 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en", "CA").notice).toContain("13.6 g");
  expect(getQuestionGuidance("alcohol_detail_heavy_episode", "en", "GB").notice).toContain("one unit is 8 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "fr", "FR").notice).toContain("environ 10 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "fr", "BE").notice).toContain("environ 10 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "fr", "CH").notice).toContain("10 à 12 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en", "DE").notice).toContain("10–12 g");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en", "MA").notice).toContain("WHO");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en", "OTHER").notice).toContain("WHO");
  expect(getQuestionGuidance("alcohol_detail_typical_amount", "en").notice).toContain("WHO");
  expect(getQuestionGuidance("alcohol_frequency", "en", "US").notice).toBeUndefined();
});

test("keeps French standard-drink notices inseparable before high punctuation", () => {
  for (const countryCode of ["US", "CA", "GB", "FR", "BE", "LU", "DE", "CH", "MA", "OTHER"]) {
    for (const questionId of ["alcohol_detail_typical_amount", "alcohol_detail_heavy_episode"]) {
      const notice = getQuestionGuidance(questionId, "fr", countryCode).notice;
      expect(notice?.trim(), `${questionId} ${countryCode}`).toBeTruthy();
      for (const match of notice!.matchAll(/[;:]/gu)) {
        expect(notice![match.index - 1], `${questionId} ${countryCode} before ${match[0]}`).toBe(" ");
      }
    }
  }
});
