import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import * as questionnaireModule from "./questionnaire";
import {
  buildAssessmentQueue,
  getAvailableDepths,
  getEligibleQuestions,
  getNextQuestion,
} from "./questionnaire";
import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  HealthDomain,
  ProfileContext,
  Question,
  QuestionnaireState,
} from "./types";

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

  test("contains structured current overdose and severe-bleeding safety questions", () => {
    expect(questionBank).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "urgent_overdose_poisoning_now",
          answerType: "boolean",
          domain: "emergency-symptoms",
          tiers: ["detailed", "deep"],
        }),
        expect.objectContaining({
          id: "urgent_severe_bleeding_now",
          answerType: "boolean",
          domain: "emergency-symptoms",
          tiers: ["detailed", "deep"],
        }),
      ]),
    );
  });

  test("contains structured adult systemic-steroid omission and symptom questions", () => {
    expect(questionBank).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "corticosteroid_detail_missed_or_stopped",
          answerType: "boolean",
          domain: "corticosteroids",
          minAge: 18,
        }),
        expect.objectContaining({
          id: "corticosteroid_detail_omission_symptoms",
          answerType: "boolean",
          domain: "corticosteroids",
          minAge: 18,
        }),
      ]),
    );
  });

  test("captures exact GLP-1 product and ingredient identity without parsing free text", () => {
    const productIdentity = questionBank.find(
      (question) => question.id === "glp1_detail_product_identity",
    );

    expect(productIdentity).toEqual(
      expect.objectContaining({
        domain: "glp1",
        answerType: "single",
        minAge: 18,
        condition: {
          questionId: "uses_glp1",
          operator: "equals",
          value: true,
        },
      }),
    );
    expect(productIdentity?.options?.map((option) => option.value)).toEqual([
      "zepbound_tirzepatide",
      "wegovy_semaglutide",
      "saxenda_liraglutide",
      "trulicity_dulaglutide",
      "other_or_unsure",
    ]);
  });

  test("separates a current adolescent substance emergency from past-year history", () => {
    const timing = questionBank.find(
      (question) => question.id === "adolescent_substance_severe_timing",
    );

    expect(timing).toEqual(
      expect.objectContaining({
        answerType: "single",
        minAge: 13,
        maxAge: 17,
        consumers: expect.arrayContaining(["urgent-signals"]),
      }),
    );
    expect(timing?.options?.map((option) => option.value)).toEqual([
      "happening_now",
      "past_year_not_now",
      "none",
    ]);
  });

  test("distinguishes unauthorized and research-use sellers from other online sources", () => {
    const sourceQuestion = questionBank.find(
      (question) => question.id === "research_detail_source",
    );

    expect(sourceQuestion?.options?.map((option) => option.value)).toEqual([
      "licensed_pharmacy",
      "registered_compounder",
      "clinic",
      "authorized_online",
      "unauthorized_online",
      "research_use_only",
      "unknown",
    ]);
    expect(sourceQuestion?.options?.map((option) => option.value)).not.toContain(
      "online",
    );
  });

  test("uses observable, time-bounded emergency wording and age-gates self-harm at 13", () => {
    const byId = new Map(questionBank.map((question) => [question.id, question]));

    expect(byId.get("urgent_stroke_signs_now")?.prompt).toMatch(/last 24 hours.*stopped/i);
    expect(byId.get("urgent_severe_allergy_now")?.prompt).not.toMatch(/hives/i);
    expect(byId.get("urgent_severe_allergy_now")?.prompt).toMatch(
      /swelling|breathing|swallowing/i,
    );
    expect(byId.get("urgent_breathing_now")?.prompt).toMatch(/grunting|under the ribs/i);
    expect(byId.get("urgent_breathing_now")?.prompt).toMatch(/limp|not responding/i);
    expect(byId.get("urgent_self_harm_now")?.minAge).toBe(13);
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
    expect(buildAssessmentQueue("deep", questionBank, adult, {})).toHaveLength(150);
    expect(buildAssessmentQueue("deep", questionBank, adult, {})).toEqual(
      buildAssessmentQueue("deep", questionBank, adult, {}),
    );
  });

  test.each([18, 24, 34])(
    "keeps Quick and Detailed fixed while making Deep available at age %i",
    (age) => {
      const profile = { age, countryCode: "CH" };

      expect(buildAssessmentQueue("quick", questionBank, profile, {})).toHaveLength(20);
      expect(buildAssessmentQueue("detailed", questionBank, profile, {})).toHaveLength(50);
      expect(buildAssessmentQueue("deep", questionBank, profile, {})).toHaveLength(150);
    },
  );

  test.each([13, 15, 17])(
    "keeps broad substance gates and adolescent follow-ups reachable at age %i",
    (age) => {
      const profile = { age, countryCode: "CH" };
      const gateIds = [
        "uses_cannabis",
        "uses_nonmedical_stimulants",
        "uses_nonmedical_opioids",
        "uses_psychedelics",
        "uses_other_recreational_drugs",
      ];
      const initial = buildAssessmentQueue("detailed", questionBank, profile, {});
      const answers = {
        current_tobacco_nicotine: true,
        alcohol_frequency: "monthly_or_less",
        uses_cannabis: true,
        uses_nonmedical_stimulants: true,
        uses_nonmedical_opioids: true,
        uses_psychedelics: true,
        uses_other_recreational_drugs: true,
      } as const;
      const active = questionnaireModule.reconcileAssessmentState(
        "detailed",
        questionBank,
        profile,
        answers,
      );

      expect(initial).toHaveLength(50);
      expect(initial.map((question) => question.id)).toEqual(
        expect.arrayContaining(gateIds),
      );
      expect(active.queue).toHaveLength(50);
      expect(active.queue.map((question) => question.id)).toEqual(
        expect.arrayContaining([
          "adolescent_nicotine_support",
          "adolescent_alcohol_support",
          "adolescent_cannabis_support",
          "adolescent_other_drug_support",
          "adolescent_substance_severe_timing",
        ]),
      );
      expect(buildAssessmentQueue("quick", questionBank, profile, {})).toHaveLength(20);
      expect(() => buildAssessmentQueue("deep", questionBank, profile, {})).toThrow(
        /Deep.+at least 150 eligible questions/,
      );
    },
  );

  test("keeps the adolescent sexual-safety declaration reachable in Quick and Detailed", () => {
    for (const depth of ["quick", "detailed"] as const) {
      expect(
        buildAssessmentQueue(depth, questionBank, adolescent, {}).map(
          (question) => question.id,
        ),
      ).toContain("sexual_contact_safety");
    }
  });

  test("keeps broad substance gates reachable in the adult Detailed queue", () => {
    expect(
      buildAssessmentQueue("detailed", questionBank, adult, {}).map(
        (question) => question.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "uses_cannabis",
        "uses_nonmedical_stimulants",
        "uses_nonmedical_opioids",
        "uses_psychedelics",
        "uses_other_recreational_drugs",
      ]),
    );
  });

  test("does not shrink a Deep queue after a non-branching answer", () => {
    const template = questionBank[0];
    const bank = Array.from({ length: 151 }, (_, index) => ({
      ...template,
      id: `deep_base_${String(index).padStart(3, "0")}`,
      tiers: ["deep"] as const,
      priority: index,
      condition: undefined,
    }));
    const initial = buildAssessmentQueue("deep", bank, adult, {});
    const reconciled = questionnaireModule.reconcileAssessmentState(
      "deep",
      bank,
      adult,
      { deep_base_000: null },
    );

    expect(initial).toHaveLength(150);
    expect(reconciled.queue.map((question) => question.id)).toEqual(
      initial.map((question) => question.id),
    );
  });

  test("keeps Deep within its 200-question cap when many branches become active", () => {
    const template = questionBank[0];
    const base = Array.from({ length: 150 }, (_, index) => ({
      ...template,
      id: index === 0 ? "deep_gate" : `deep_base_${String(index).padStart(3, "0")}`,
      answerType: index === 0 ? ("boolean" as const) : template.answerType,
      options: index === 0 ? undefined : template.options,
      tiers: ["deep"] as const,
      priority: index,
      condition: undefined,
    }));
    const branches = Array.from({ length: 60 }, (_, index) => ({
      ...template,
      id: `deep_branch_${String(index).padStart(3, "0")}`,
      tiers: ["deep"] as const,
      priority: index + 200,
      condition: {
        questionId: "deep_gate",
        operator: "equals" as const,
        value: true,
      },
    }));
    const bank = [...base, ...branches];
    const answers = { deep_gate: true };

    expect(buildAssessmentQueue("deep", bank, adult, answers)).toHaveLength(200);
    expect(
      questionnaireModule.reconcileAssessmentState("deep", bank, adult, answers).queue,
    ).toHaveLength(200);
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
  test("reconciles active branches, fixed depth limits, and stale dependent answers", () => {
    type ReconcileAssessmentState = (
      depth: AnalysisDepth,
      bank: ReadonlyArray<Question>,
      context: ProfileContext,
      answers: AnswerMap,
    ) => QuestionnaireState;
    const reconcileAssessmentState = Reflect.get(
      questionnaireModule,
      "reconcileAssessmentState",
    ) as ReconcileAssessmentState | undefined;

    expect(reconcileAssessmentState).toBeTypeOf("function");
    if (!reconcileAssessmentState) return;

    const initial = reconcileAssessmentState("detailed", questionBank, adult, {});
    const medicationsYes = reconcileAssessmentState("detailed", questionBank, adult, {
      current_medications: true,
    });
    const medicationsNo = reconcileAssessmentState("detailed", questionBank, adult, {
      current_medications: false,
    });
    const medicationsSkipped = reconcileAssessmentState("detailed", questionBank, adult, {
      current_medications: null,
    });
    const deepMedicationsYes = reconcileAssessmentState("deep", questionBank, adult, {
      current_medications: true,
    });
    const deepInitial = reconcileAssessmentState("deep", questionBank, adult, {});

    expect(initial.queue).toHaveLength(50);
    expect(medicationsYes.queue).toHaveLength(50);
    expect(
      medicationsYes.queue.filter((question) => question.id.startsWith("med_detail_")),
    ).toHaveLength(5);
    expect(medicationsYes.queue).not.toContainEqual(initial.queue.at(-1));
    expect(
      medicationsNo.queue.some((question) => question.id.startsWith("med_detail_")),
    ).toBe(false);
    expect(
      medicationsSkipped.queue.some((question) => question.id.startsWith("med_detail_")),
    ).toBe(false);
    expect(deepMedicationsYes.queue).toHaveLength(
      155,
    );
    expect(deepInitial.queue).toHaveLength(150);
    expect(
      deepInitial.queue.every((question) =>
        deepMedicationsYes.queue.some((candidate) => candidate.id === question.id),
      ),
    ).toBe(true);

    const template = questionBank[0];
    const nestedBank: Question[] = [
      { ...template, id: "gate", tiers: ["detailed"], condition: undefined },
      {
        ...template,
        id: "dependent_gate",
        tiers: ["detailed"],
        condition: { questionId: "gate", operator: "equals", value: true },
      },
      {
        ...template,
        id: "nested_detail",
        tiers: ["detailed"],
        condition: {
          questionId: "dependent_gate",
          operator: "equals",
          value: true,
        },
      },
      ...Array.from({ length: 50 }, (_, index) => ({
        ...template,
        id: `filler_${String(index).padStart(2, "0")}`,
        tiers: ["detailed"] as const,
        priority: index + 10,
        condition: undefined,
      })),
    ];
    const reconciledNested = reconcileAssessmentState(
      "detailed",
      nestedBank,
      adult,
      { gate: false, dependent_gate: true, nested_detail: "stale" },
    );

    expect(reconciledNested.answers).toEqual({ gate: false });
    expect(reconciledNested.queue).toHaveLength(50);
    expect(reconciledNested.queue.map((question) => question.id)).not.toEqual(
      expect.arrayContaining(["dependent_gate", "nested_detail"]),
    );
  });

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

  test("does not unlock adolescent alcohol probing from undeclared or malformed answers", () => {
    const followUpIds = [
      "adolescent_alcohol_support",
      "adolescent_substance_severe_timing",
    ];

    for (const value of [
      "unsure",
      "refused",
      "unknown",
      ["monthly_or_less"],
      1,
      true,
    ] as const) {
      const answers = { alcohol_frequency: value } as unknown as AnswerMap;
      const eligibleIds = getEligibleQuestions(
        questionBank,
        adolescent,
        answers,
      ).map((question) => question.id);
      const reconciledIds = questionnaireModule
        .reconcileAssessmentState(
          "detailed",
          questionBank,
          adolescent,
          answers,
        )
        .queue.map((question) => question.id);

      for (const id of followUpIds) {
        expect(eligibleIds, String(value)).not.toContain(id);
        expect(reconciledIds, String(value)).not.toContain(id);
      }
    }
  });

  test("validates option bags before evaluating includes branches", () => {
    const template = questionBank[0];
    const multiGate: Question = {
      ...template,
      id: "custom_multi_gate",
      answerType: "multi",
      options: [
        { value: "positive", label: "Positive" },
        { value: "none", label: "None" },
      ],
      condition: undefined,
    };
    const dependent: Question = {
      ...template,
      id: "custom_multi_detail",
      condition: {
        questionId: "custom_multi_gate",
        operator: "includes",
        value: "positive",
      },
    };
    const bank = [multiGate, dependent];

    expect(
      getEligibleQuestions(bank, adult, {
        custom_multi_gate: ["positive"],
      }).map((question) => question.id),
    ).toContain("custom_multi_detail");
    for (const invalid of [
      ["none", "positive"],
      ["positive", "positive"],
      ["unknown"],
      [],
      "positive",
      true,
    ] as const) {
      expect(
        getEligibleQuestions(bank, adult, {
          custom_multi_gate: invalid as never,
        }).map((question) => question.id),
      ).not.toContain("custom_multi_detail");
    }
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

  test("keeps the adult steroid gate and nested structured omission branch reachable", () => {
    const initialDetailed = buildAssessmentQueue(
      "detailed",
      questionBank,
      adult,
      {},
    );
    const afterGate = questionnaireModule.reconcileAssessmentState(
      "detailed",
      questionBank,
      adult,
      { uses_systemic_corticosteroids: true },
    );
    const afterOmission = questionnaireModule.reconcileAssessmentState(
      "detailed",
      questionBank,
      adult,
      {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: true,
      },
    );
    const deepAfterOmission = questionnaireModule.reconcileAssessmentState(
      "deep",
      questionBank,
      adult,
      {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: true,
      },
    );

    expect(initialDetailed.map((question) => question.id)).toContain(
      "uses_systemic_corticosteroids",
    );
    expect(afterGate.queue.map((question) => question.id)).toContain(
      "corticosteroid_detail_missed_or_stopped",
    );
    expect(afterGate.queue.map((question) => question.id)).not.toContain(
      "corticosteroid_detail_omission_symptoms",
    );
    expect(afterOmission.queue.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        "uses_systemic_corticosteroids",
        "corticosteroid_detail_missed_or_stopped",
        "corticosteroid_detail_omission_symptoms",
      ]),
    );
    expect(deepAfterOmission.queue.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        "uses_systemic_corticosteroids",
        "corticosteroid_detail_missed_or_stopped",
        "corticosteroid_detail_omission_symptoms",
      ]),
    );
    expect(
      getEligibleQuestions(questionBank, adolescent, {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: true,
      }).map((question) => question.id),
    ).not.toEqual(
      expect.arrayContaining([
        "uses_systemic_corticosteroids",
        "corticosteroid_detail_missed_or_stopped",
        "corticosteroid_detail_omission_symptoms",
      ]),
    );
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
      "adolescent_substance_severe_timing",
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
