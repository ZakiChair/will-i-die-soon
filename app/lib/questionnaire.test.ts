import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import {
  buildAssessmentQueue,
  getEligibleQuestions,
  getNextQuestion,
} from "./questionnaire";
import type { HealthDomain, Question } from "./types";

const adult = { age: 35, countryCode: "CH" };
const child = { age: 12, countryCode: "CH", assistedMinor: true };

const expectedDomains: ReadonlyArray<HealthDomain> = [
  "demographics",
  "measurements",
  "family-history",
  "diagnosed-conditions",
  "current-symptoms",
  "emergency-symptoms",
  "diet",
  "hydration",
  "movement",
  "sedentary-time",
  "sleep",
  "circadian-rhythm",
  "stress",
  "mood",
  "anxiety",
  "cognition",
  "social-connection",
  "work-exposures",
  "environment",
  "sun",
  "dental-health",
  "sexual-health",
  "reproductive-health",
  "pregnancy",
  "tobacco-nicotine",
  "alcohol",
  "cannabis",
  "stimulants",
  "opioids",
  "psychedelics",
  "recreational-drugs",
  "anabolic-steroids",
  "corticosteroids",
  "research-compounds",
  "glp1",
  "isotretinoin",
  "minoxidil",
  "prescription-medications",
  "otc-medications",
  "supplements",
  "medication-adherence",
  "interactions",
  "preventive-care",
  "vaccinations",
  "blood-pressure",
  "blood-testing",
  "lab-values",
];

describe("question bank invariants", () => {
  test("contains at least 220 curated questions with stable unique IDs and prompts", () => {
    expect(questionBank.length).toBeGreaterThanOrEqual(220);
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(
      questionBank.length,
    );
    expect(new Set(questionBank.map((question) => question.prompt)).size).toBe(
      questionBank.length,
    );
    expect(questionBank.every((question) => /^[a-z][a-z0-9_]*$/.test(question.id))).toBe(
      true,
    );
  });

  test("gives every question useful selection and explanation metadata", () => {
    expect(
      questionBank.every(
        (question) =>
          question.prompt.trim().length >= 12 &&
          question.why.trim().length >= 12 &&
          question.tiers.length > 0 &&
          question.consumers.length > 0 &&
          Number.isFinite(question.priority),
      ),
    ).toBe(true);
  });

  test("covers every questionnaire domain in the design", () => {
    const represented = new Set(questionBank.map((question) => question.domain));

    expect(expectedDomains.every((domain) => represented.has(domain))).toBe(true);
  });

  test("leaves prefer-not-to-say rendering to sensitive categorical controls", () => {
    const sensitiveCategorical = questionBank.filter(
      (question) =>
        question.sensitive &&
        (question.answerType === "single" || question.answerType === "multi"),
    );

    expect(sensitiveCategorical.length).toBeGreaterThan(0);
    expect(
      sensitiveCategorical.every((question) =>
        question.options?.every((option) => option.value !== "prefer_not_to_say"),
      ),
    ).toBe(true);
  });
});

describe("questionnaire selection", () => {
  test("builds the promised deterministic queue size for each depth", () => {
    expect(buildAssessmentQueue("quick", questionBank, adult, {})).toHaveLength(20);
    expect(buildAssessmentQueue("detailed", questionBank, adult, {})).toHaveLength(50);
    expect(buildAssessmentQueue("deep", questionBank, adult, {}).length).toBeGreaterThanOrEqual(
      150,
    );
    expect(buildAssessmentQueue("deep", questionBank, adult, {}).length).toBeLessThanOrEqual(
      200,
    );
    expect(buildAssessmentQueue("deep", questionBank, adult, {})).toEqual(
      buildAssessmentQueue("deep", questionBank, adult, {}),
    );
  });

  test("reserves quick core items before sorting remaining items by priority then ID", () => {
    const template = questionBank[0];
    const bank: Question[] = [
      { ...template, id: "regular_b", tiers: ["deep"], priority: 1 },
      { ...template, id: "core_z", tiers: ["quick", "deep"], priority: 99 },
      { ...template, id: "regular_a", tiers: ["deep"], priority: 1 },
    ];

    expect(buildAssessmentQueue("deep", bank, adult, {}).map((question) => question.id)).toEqual([
      "core_z",
      "regular_a",
      "regular_b",
    ]);
  });

  test("removes adult-only questions from a child profile", () => {
    expect(getEligibleQuestions(questionBank, child, {})).not.toContainEqual(
      expect.objectContaining({ minAge: 18 }),
    );
  });

  test("keeps guardian-assisted child Quick mode at 20 with child-safe alternatives", () => {
    const queue = buildAssessmentQueue("quick", questionBank, child, {});

    expect(queue).toHaveLength(20);
    expect(queue.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        "child_feeling_support",
        "child_food_access",
        "child_household_smoke",
        "child_trusted_adult_support",
      ]),
    );
    expect(queue).not.toContainEqual(
      expect.objectContaining({ id: "current_tobacco_nicotine" }),
    );
    expect(queue).not.toContainEqual(expect.objectContaining({ id: "alcohol_frequency" }));
    expect(queue).not.toContainEqual(expect.objectContaining({ id: "low_interest_frequency" }));
    expect(queue).not.toContainEqual(expect.objectContaining({ id: "pregnancy_relevant" }));
  });

  test("treats a null sensitive answer as answered when finding the next question", () => {
    const queue = buildAssessmentQueue("quick", questionBank, adult, {});

    expect(getNextQuestion({ queue, answers: { [queue[0].id]: null } })).toEqual(queue[1]);
    expect(
      getNextQuestion({
        queue,
        answers: Object.fromEntries(queue.map((question) => [question.id, null])),
      }),
    ).toBeNull();
  });
});

describe("adaptive branches", () => {
  test("uses_glp1=false removes GLP-1 detail questions", () => {
    const eligible = getEligibleQuestions(questionBank, adult, { uses_glp1: false });

    expect(eligible.some((question) => question.id.startsWith("glp1_detail_"))).toBe(false);
    expect(
      getEligibleQuestions(questionBank, adult, { uses_glp1: true }).some((question) =>
        question.id.startsWith("glp1_detail_"),
      ),
    ).toBe(true);
  });

  test("has_recent_labs=false removes lab-value questions", () => {
    const eligible = getEligibleQuestions(questionBank, adult, { has_recent_labs: false });

    expect(eligible.some((question) => question.domain === "lab-values")).toBe(false);
    expect(
      getEligibleQuestions(questionBank, adult, { has_recent_labs: true }).some(
        (question) => question.domain === "lab-values",
      ),
    ).toBe(true);
  });

  test("current_medications=false removes medication-detail questions", () => {
    const eligible = getEligibleQuestions(questionBank, adult, {
      current_medications: false,
    });

    expect(eligible.some((question) => question.id.startsWith("med_detail_"))).toBe(false);
    expect(
      getEligibleQuestions(questionBank, adult, { current_medications: true }).some((question) =>
        question.id.startsWith("med_detail_"),
      ),
    ).toBe(true);
  });
});
