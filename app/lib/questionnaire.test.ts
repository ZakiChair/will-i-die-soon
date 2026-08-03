import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import {
  buildAssessmentQueue,
  getAvailableDepths,
  getEligibleQuestions,
  getNextQuestion,
} from "./questionnaire";
import type { AnswerMap, AnswerValue, HealthDomain, Question } from "./types";

const adult = { age: 35, countryCode: "CH" };
const child = { age: 12, countryCode: "CH", assistedMinor: true };
const adolescent = { age: 15, countryCode: "CH" };

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

  test("marks every health question sensitive and leaves skip rendering to controls", () => {
    expect(questionBank.every((question) => question.sensitive === true)).toBe(true);
    expect(
      questionBank
        .filter(
          (question) => question.answerType === "single" || question.answerType === "multi",
        )
        .every((question) =>
          question.options?.every((option) => option.value !== "prefer_not_to_say"),
        ),
    ).toBe(true);
  });

  test("models unanswered keys as missing while reserving null for deliberate skips", () => {
    const skipped: AnswerMap = { optional_health_answer: null };
    const unanswered: AnswerMap = {};

    expect(skipped.optional_health_answer).toBeNull();
    expect(Object.hasOwn(unanswered, "optional_health_answer")).toBe(false);
    expectTypeOf<AnswerValue>().not.toEqualTypeOf<undefined>();
    expectTypeOf<AnswerMap>().toEqualTypeOf<
      Readonly<Partial<Record<string, AnswerValue>>>
    >();
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
      { ...template, id: "regular_b", tiers: ["detailed", "deep"], priority: 1 },
      {
        ...template,
        id: "core_z",
        tiers: ["quick", "detailed", "deep"],
        priority: 99,
      },
      { ...template, id: "regular_a", tiers: ["detailed", "deep"], priority: 1 },
    ];

    expect(
      buildAssessmentQueue("detailed", bank, adult, {}).map((question) => question.id),
    ).toEqual(["core_z", "regular_a", "regular_b"]);
  });

  test("advertises Deep only when the profile has at least 150 eligible Deep items", () => {
    expect(getAvailableDepths(questionBank, child, {})).toEqual(["quick", "detailed"]);
    expect(getAvailableDepths(questionBank, adolescent, {})).toEqual([
      "quick",
      "detailed",
    ]);
    expect(getAvailableDepths(questionBank, adult, {})).toEqual([
      "quick",
      "detailed",
      "deep",
    ]);
  });

  test("rejects unavailable Deep queues instead of returning a misleading short assessment", () => {
    expect(() => buildAssessmentQueue("deep", questionBank, child, {})).toThrow(
      /Deep.+at least 150 eligible questions/,
    );
    expect(() => buildAssessmentQueue("deep", questionBank, adolescent, {})).toThrow(
      /Deep.+at least 150 eligible questions/,
    );
    expect(buildAssessmentQueue("deep", questionBank, adult, {})).toHaveLength(150);
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
  test("treats null and missing gates as unresolved for not-equals branches", () => {
    const alcoholAfterSkip = getEligibleQuestions(questionBank, adult, {
      alcohol_frequency: null,
    });
    const alcoholWithoutAnswer = getEligibleQuestions(questionBank, adult, {});
    const template = questionBank[0];
    const customDetail: Question = {
      ...template,
      id: "custom_not_equals_detail",
      condition: {
        questionId: "custom_gate",
        operator: "not-equals",
        value: "none",
      },
    };

    expect(alcoholAfterSkip.some((question) => question.id.startsWith("alcohol_detail_"))).toBe(
      false,
    );
    expect(alcoholWithoutAnswer.some((question) => question.id.startsWith("alcohol_detail_"))).toBe(
      false,
    );
    expect(getEligibleQuestions([customDetail], adult, { custom_gate: null })).toEqual([]);
    expect(getEligibleQuestions([customDetail], adult, {})).toEqual([]);
  });

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

  test("offers adolescents broad support and urgent-safety follow-ups without adult details", () => {
    const eligible = getEligibleQuestions(questionBank, adolescent, {
      current_tobacco_nicotine: true,
      alcohol_frequency: "monthly_or_less",
      uses_cannabis: true,
      uses_other_recreational_drugs: true,
      pregnancy_relevant: true,
    });
    const ids = eligible.map((question) => question.id);
    const expectedAdolescentIds = [
      "adolescent_nicotine_support",
      "adolescent_alcohol_support",
      "adolescent_cannabis_support",
      "adolescent_other_drug_support",
      "adolescent_substance_urgent_safety",
      "adolescent_pregnancy_support",
      "adolescent_pregnancy_urgent_safety",
    ];
    const adolescentFollowUps = eligible.filter((question) =>
      expectedAdolescentIds.includes(question.id),
    );

    expect(ids).toEqual(expect.arrayContaining(expectedAdolescentIds));
    expect(
      adolescentFollowUps.every(
        (question) =>
          question.minAge === 13 &&
          question.maxAge === 17 &&
          question.sensitive === true &&
          question.consumers.every((consumer) => !consumer.includes("score")),
      ),
    ).toBe(true);
    expect(
      adolescentFollowUps
        .filter((question) => question.domain !== "pregnancy")
        .every((question) => question.prompt.includes("past twelve months")),
    ).toBe(true);
    expect(ids.some((id) => id.startsWith("tobacco_detail_"))).toBe(false);
    expect(ids.some((id) => id.startsWith("alcohol_detail_"))).toBe(false);
    expect(ids.some((id) => id.startsWith("cannabis_detail_"))).toBe(false);
    expect(ids.some((id) => id.startsWith("recreational_detail_"))).toBe(false);
    expect(ids.includes("pregnancy_current_context")).toBe(false);
  });
});
