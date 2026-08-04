import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { prototypePolicy } from "./release-policy";
import { evaluateRisks } from "./risk-engine";
import {
  buildAssessmentQueue,
  getNextQuestion,
  reconcileAssessmentState,
} from "./questionnaire";
import {
  PURITY_SCORE_INPUT_IDS,
  buildActionPlan,
  calculatePurityScore,
} from "./scoring";
import type { AnalysisDepth, AnswerMap, QuestionnaireState } from "./types";

const adultRouting = {
  ageYears: 24,
  assessmentDepth: "deep" as const,
};

const F1_ANSWERS: AnswerMap = {
  current_tobacco_nicotine: false,
  alcohol_frequency: "never",
  weekly_moderate_activity_minutes: 300,
  movement_strength_days: 2,
  movement_walking_days: 5,
  sedentary_total_hours: 4,
  plant_food_frequency: 5,
  diet_whole_grains: "daily",
  diet_legumes: 3,
  diet_processed_meat: "never",
  diet_sugary_drinks: 0,
  usual_sleep_hours: 7,
  sleep_refreshed: 9,
  circadian_bedtime_variation: 1,
  stress_recovery_practice: "daily",
  preventive_followup_status: "yes",
  preventive_followup_action: "completed",
  current_medications: true,
  med_detail_prescriber_followup: "yes_all",
  adherence_missed_doses: "never",
  adherence_access_barriers: ["none"],
  interaction_shared_list: true,
};

const F2_ANSWERS: AnswerMap = {
  current_tobacco_nicotine: true,
  tobacco_nicotine_context: "tobacco_vape_or_other_nicotine",
  alcohol_frequency: "two_to_three_weekly",
  alcohol_detail_typical_amount: 3,
  alcohol_detail_heavy_episode: "weekly",
  weekly_moderate_activity_minutes: 100,
  movement_strength_days: 1,
  movement_walking_days: 2,
  sedentary_total_hours: 8,
  plant_food_frequency: 2,
  diet_whole_grains: "sometimes",
  diet_legumes: 1,
  diet_processed_meat: "daily",
  diet_sugary_drinks: 5,
  usual_sleep_hours: 6.5,
  sleep_refreshed: 5,
  circadian_bedtime_variation: 2.5,
  stress_recovery_practice: "sometimes",
  preventive_followup_status: "yes",
  preventive_followup_action: "not_yet",
  current_medications: true,
  med_detail_prescriber_followup: "yes_some",
  adherence_missed_doses: "monthly",
  adherence_access_barriers: ["none"],
  interaction_shared_list: true,
};

function adultScore(answers: AnswerMap = F1_ANSWERS) {
  const result = calculatePurityScore(answers, adultRouting);
  expect(result.kind).toBe("adult-score");
  if (result.kind !== "adult-score") throw new Error("Expected an adult score");
  return result;
}

function completeReachableAssessment(
  depth: AnalysisDepth,
  desiredAnswers: AnswerMap,
): AnswerMap {
  const profile = { age: 35, countryCode: "CH" };
  let state: QuestionnaireState = {
    queue: buildAssessmentQueue(depth, questionBank, profile, {}),
    answers: {} as AnswerMap,
  };

  for (let step = 0; step < 220; step += 1) {
    const question = getNextQuestion(state);
    if (!question) return state.answers;
    const answer = Object.prototype.hasOwnProperty.call(desiredAnswers, question.id)
      ? desiredAnswers[question.id] ?? null
      : null;
    state = reconcileAssessmentState(depth, questionBank, profile, {
      ...state.answers,
      [question.id]: answer,
    });
  }

  throw new Error(`${depth} did not complete within its 200-question cap`);
}

describe("Purity Score v1 exact arithmetic", () => {
  test("F1 publishes 100 only after all applicable adult components are assessed", () => {
    const result = adultScore();

    expect(result).toMatchObject({
      scoreVersion: "purity-score-v1",
      assessmentDepth: "deep",
      score: 100,
      coverage: 100,
      earnedPoints: 100,
      assessedPoints: 100,
      applicablePoints: 100,
    });
    expect(result.categories).toHaveLength(8);
    expect(result.categories.map((category) => category.maxPoints)).toEqual([
      20, 15, 18, 18, 12, 7, 5, 5,
    ]);
    expect(buildActionPlan([], result)).toEqual([]);
  });

  test("F2 uses decimal half-up rounding and the required category action order", () => {
    const result = adultScore(F2_ANSWERS);
    const leaves = evaluateRisks(
      F2_ANSWERS,
      { age: 46, countryCode: "CH" },
      prototypePolicy,
    );

    expect(result).toMatchObject({
      score: 31,
      coverage: 100,
      earnedPoints: 30.9,
      assessedPoints: 100,
      applicablePoints: 100,
    });
    expect(
      result.categories.map(({ id, earnedPoints }) => [id, earnedPoints]),
    ).toEqual([
      ["tobacco-nicotine", 0],
      ["alcohol", 4.4],
      ["movement-sitting", 8.6],
      ["nutrition", 5.4],
      ["sleep", 6],
      ["recovery", 3.5],
      ["preventive-followup", 0],
      ["medication-safety", 3],
    ]);
    expect(leaves.length).toBeGreaterThan(0);
    expect(buildActionPlan(leaves, result).map((action) => action.categoryId)).toEqual([
      "tobacco-nicotine",
      "nutrition",
      "alcohol",
    ]);
  });

  test("F3 withholds the hidden favourable ratio at 35 percent coverage", () => {
    const result = calculatePurityScore(
      {
        current_tobacco_nicotine: false,
        alcohol_frequency: "never",
      },
      adultRouting,
    );

    expect(result).toMatchObject({
      kind: "insufficient-coverage",
      coverage: 35,
    });
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("earnedPoints");
    expect(result).not.toHaveProperty("assessedPoints");
    expect(result).not.toHaveProperty("applicablePoints");
    expect(result).not.toHaveProperty("categories");
  });

  test("F4 excludes a medicine access barrier instead of turning it into a penalty", () => {
    const withBarrier = adultScore({
      ...F1_ANSWERS,
      adherence_missed_doses: "weekly",
      adherence_access_barriers: ["cost"],
    });
    const withoutBarrier = adultScore({
      ...F1_ANSWERS,
      adherence_missed_doses: "weekly",
      adherence_access_barriers: ["none"],
    });

    expect(withBarrier).toMatchObject({
      score: 100,
      earnedPoints: 99,
      assessedPoints: 99,
      applicablePoints: 99,
    });
    expect(withoutBarrier).toMatchObject({
      score: 99,
      earnedPoints: 99.25,
      assessedPoints: 100,
      applicablePoints: 100,
    });
    expect(buildActionPlan([], withBarrier)[0]).toMatchObject({
      kind: "access-support",
      categoryId: "medication-safety",
    });
  });

  test("F5 caps positive values and ignores every protected or contextual mutation", () => {
    const atCaps = adultScore({
      ...F2_ANSWERS,
      weekly_moderate_activity_minutes: 300,
      movement_strength_days: 2,
      movement_walking_days: 5,
      plant_food_frequency: 5,
    });
    const beyondCaps = adultScore({
      ...F2_ANSWERS,
      weekly_moderate_activity_minutes: 600,
      movement_strength_days: 9,
      movement_walking_days: 99,
      plant_food_frequency: 99,
    });
    expect(beyondCaps).toEqual(atCaps);

    const baseline = adultScore(F2_ANSWERS);
    for (const mutation of [
      { sex_assigned_at_birth: "female" },
      { gender_identity_optional: "private text" },
      { ancestry_optional: "private text" },
      { diagnosed_conditions_core: ["diabetes"] },
      { movement_limiting_condition: true },
      { disability_context: "private" },
      { family_early_cvd: true },
      { pregnancy_relevant: true },
      { environment_secondhand_smoke: true },
      { height_cm: 190, weight_kg: 90, bmi: 24.9 },
      { circadian_shift_work: true, stress_current_level: 10 },
      { country: "US", lab_value_glucose: "100 mg/dL", urgent_chest_discomfort_now: true },
    ]) {
      expect(adultScore({ ...F2_ANSWERS, ...mutation })).toEqual(baseline);
    }
    expect(
      calculatePurityScore(F2_ANSWERS, {
        ageYears: 90,
        assessmentDepth: "deep",
      }),
    ).toEqual(baseline);

    const profile = { age: 46, countryCode: "CH" };
    const baselineLeaves = evaluateRisks(F2_ANSWERS, profile, prototypePolicy);
    const contextAnswers = {
      ...F2_ANSWERS,
      pregnancy_relevant: true,
      pregnancy_new_concern: true,
    };
    const contextLeaves = evaluateRisks(contextAnswers, profile, prototypePolicy);
    expect(contextLeaves).not.toEqual(baselineLeaves);
    expect(
      buildActionPlan(contextLeaves, adultScore(contextAnswers)),
    ).toEqual(buildActionPlan(baselineLeaves, baseline));
  });

  test.each([17, 13, 12, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])(
    "F6 exposes no score-shaped result for age %s",
    (ageYears) => {
      expect(
        calculatePurityScore(F1_ANSWERS, {
          ageYears,
          assessmentDepth: "deep",
        }),
      ).toEqual({
        kind: "not-available",
        reason: "under-18-or-age-unverified",
      });
    },
  );
});

describe("eligibility, exclusions, and missingness", () => {
  test("Quick always returns a reflection state without a number", () => {
    const result = calculatePurityScore(F1_ANSWERS, {
      ageYears: 35,
      assessmentDepth: "quick",
    });

    expect(result).toMatchObject({
      kind: "insufficient-coverage",
      reason: "quick-assessment",
      coverage: 100,
    });
    expect(result).not.toHaveProperty("score");
  });

  test("Express always returns its no-score summary state", () => {
    const result = calculatePurityScore(F1_ANSWERS, {
      ageYears: 35,
      assessmentDepth: "express",
    });

    expect(result).toMatchObject({
      kind: "insufficient-coverage",
      reason: "express-assessment",
    });
    expect(result).not.toHaveProperty("score");
  });

  test("skipping an answer preserves other earned points and reduces assessed coverage", () => {
    const complete = adultScore();
    const skipped = calculatePurityScore(
      { ...F1_ANSWERS, diet_legumes: null },
      adultRouting,
    );
    expect(skipped.kind).toBe("adult-score");
    if (skipped.kind !== "adult-score") return;

    expect(skipped.earnedPoints).toBe(complete.earnedPoints - 3);
    expect(skipped.assessedPoints).toBe(complete.assessedPoints - 3);
    expect(skipped.applicablePoints).toBe(100);
    expect(skipped.coverage).toBe(97);
    expect(skipped.score).toBe(100);
  });

  test("uses raw D over T for the 70 percent gate before rounding display coverage", () => {
    const result = calculatePurityScore(
      {
        ...F1_ANSWERS,
        adherence_access_barriers: ["cost"],
        plant_food_frequency: null,
        diet_whole_grains: null,
        diet_legumes: null,
        diet_processed_meat: null,
        diet_sugary_drinks: null,
        usual_sleep_hours: null,
        sleep_refreshed: null,
        circadian_bedtime_variation: null,
      },
      adultRouting,
    );

    expect(result).toMatchObject({
      kind: "insufficient-coverage",
      coverage: 70,
      reason: "answer-more-wellness-habits",
    });
    expect(result).not.toHaveProperty("score");
  });

  test("prescribed nicotine replacement excludes the component and unresolved nicotine withholds a number", () => {
    const nrt = adultScore({
      ...F1_ANSWERS,
      current_tobacco_nicotine: true,
      tobacco_nicotine_context: "only_prescribed_nrt_quit_plan",
    });
    expect(nrt).toMatchObject({
      score: 100,
      earnedPoints: 80,
      assessedPoints: 80,
      applicablePoints: 80,
    });
    expect(nrt.categories[0].components[0].status).toBe("excluded");

    for (const tobacco_nicotine_context of [undefined, "unsure"] as const) {
      const result = calculatePurityScore(
        {
          ...F1_ANSWERS,
          current_tobacco_nicotine: true,
          tobacco_nicotine_context,
        },
        adultRouting,
      );
      expect(result.kind).toBe("insufficient-coverage");
      expect(result).not.toHaveProperty("score");
    }
  });

  test("preventive not-due and safety barriers exclude only the chosen component", () => {
    const notDue = adultScore({
      ...F1_ANSWERS,
      preventive_followup_status: "not_due",
      preventive_followup_action: undefined,
    });
    const barrier = adultScore({
      ...F1_ANSWERS,
      preventive_followup_status: "yes",
      preventive_followup_action: "access_or_safety_barrier",
    });

    for (const result of [notDue, barrier]) {
      expect(result).toMatchObject({
        score: 100,
        earnedPoints: 95,
        assessedPoints: 95,
        applicablePoints: 95,
      });
    }
    const notDueComponent = notDue.categories
      .flatMap((category) => category.components)
      .find((component) => component.questionId === "preventive_followup_action");
    expect(notDueComponent?.explanation).toBe(
      "You reported that no routine follow-up was personally due.",
    );
    expect(notDueComponent?.explanation).not.toMatch(/access|accessible/i);
    expect(buildActionPlan([], notDue)).toEqual([]);
    expect(buildActionPlan([], barrier)[0].kind).toBe("access-support");
  });

  test("a not-yet preventive action does not infer that the due follow-up was accessible", () => {
    const result = adultScore({
      ...F1_ANSWERS,
      preventive_followup_status: "yes",
      preventive_followup_action: "not_yet",
    });
    const component = result.categories
      .flatMap((category) => category.components)
      .find((candidate) => candidate.questionId === "preventive_followup_action");

    expect(component?.explanation).toBe(
      "You reported not yet acting on a personally due follow-up.",
    );
    expect(component?.explanation).not.toMatch(/access|accessible/i);
  });

  test("no current prescriber access excludes three points and creates support", () => {
    const result = adultScore({
      ...F1_ANSWERS,
      med_detail_prescriber_followup: "no_current_access",
    });
    expect(result).toMatchObject({
      score: 100,
      earnedPoints: 97,
      assessedPoints: 97,
      applicablePoints: 97,
    });
    expect(buildActionPlan([], result)[0]).toMatchObject({
      kind: "access-support",
      categoryId: "medication-safety",
    });
  });

  test.each([
    [
      "preventive barrier",
      {
        preventive_followup_status: "yes",
        preventive_followup_action: "access_or_safety_barrier",
      },
      "preventive-followup",
    ],
    [
      "no prescriber access",
      {
        current_medications: true,
        med_detail_prescriber_followup: "no_current_access",
      },
      "medication-safety",
    ],
    [
      "medicine-use barrier",
      {
        current_medications: true,
        adherence_missed_doses: "weekly",
        adherence_access_barriers: ["cost"],
      },
      "medication-safety",
    ],
  ] as const)("surfaces %s support even below the numeric coverage gate", (_name, barrierAnswers, categoryId) => {
    const result = calculatePurityScore(
      {
        current_tobacco_nicotine: false,
        alcohol_frequency: "never",
        ...barrierAnswers,
      },
      adultRouting,
    );

    expect(result.kind).toBe("insufficient-coverage");
    expect(result).not.toHaveProperty("earnedPoints");
    expect(result).not.toHaveProperty("assessedPoints");
    expect(result).not.toHaveProperty("applicablePoints");
    expect(buildActionPlan([], result)[0]).toMatchObject({
      kind: "access-support",
      categoryId,
    });
  });

  test("negative, non-finite, and fractional day or portion counts are missing rather than rounded", () => {
    for (const [id, value] of [
      ["plant_food_frequency", 2.5],
      ["diet_legumes", -1],
      ["movement_strength_days", 1.5],
      ["movement_walking_days", Number.POSITIVE_INFINITY],
      ["diet_sugary_drinks", Number.NaN],
    ] as const) {
      const result = adultScore({ ...F1_ANSWERS, [id]: value });
      const component = result.categories
        .flatMap((category) => category.components)
        .find((candidate) => candidate.questionId === id);
      expect(component?.status).toBe("missing");
    }
  });

  test("one category contributes at most one initial action", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      diet_whole_grains: "never",
      diet_legumes: 0,
      diet_processed_meat: "daily",
      diet_sugary_drinks: 9,
    });
    const actions = buildActionPlan([], score);

    expect(actions.filter((action) => action.categoryId === "nutrition")).toHaveLength(1);
    expect(actions).toHaveLength(1);
  });

  test("one medicine support action preserves every simultaneous barrier reason", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      med_detail_prescriber_followup: "no_current_access",
      adherence_missed_doses: "weekly",
      adherence_access_barriers: ["cost"],
    });
    const actions = buildActionPlan([], score);

    expect(score.supportContexts).toHaveLength(2);
    expect(actions.filter((action) => action.kind === "access-support")).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      kind: "access-support",
      categoryId: "medication-safety",
      sources: [
        {
          title: "Medication Without Harm",
          publisher: "World Health Organization",
          url: "https://www.who.int/initiatives/medication-without-harm",
        },
      ],
    });
    expect(actions[0].reason).toMatch(/no current access to prescriber follow-up/i);
    expect(actions[0].reason).toMatch(/medicine access or use barrier/i);
  });

  test("related preventive and medicine barriers share one practical-support action", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      preventive_followup_action: "access_or_safety_barrier",
      med_detail_prescriber_followup: "no_current_access",
    });
    const actions = buildActionPlan([], score);

    expect(actions.filter((action) => action.kind === "access-support")).toHaveLength(1);
    expect(actions[0].reason).toMatch(/access or safety barrier/i);
    expect(actions[0].reason).toMatch(/no current access to prescriber follow-up/i);
    expect(actions[0].sources).toEqual([
      {
        title: "Primary health care",
        publisher: "World Health Organization",
        url: "https://www.who.int/health-topics/primary-health-care",
      },
      {
        title: "Medication Without Harm",
        publisher: "World Health Organization",
        url: "https://www.who.int/initiatives/medication-without-harm",
      },
    ]);
    expect(new Set(actions[0].sources.map((source) => source.url)).size).toBe(2);
  });

  test("an already planned follow-up wins an equal deficit tie and suggests follow-through", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      preventive_followup_action: "booked_or_contacted",
      usual_sleep_hours: 6.5,
    });
    const actions = buildActionPlan([], score);

    expect(actions.map((action) => action.categoryId)).toEqual([
      "preventive-followup",
      "sleep",
    ]);
    expect(actions[0].nextStep).toMatch(/already booked or contacted/i);
    expect(actions[0].nextStep).not.toMatch(/contact the relevant service|make a booking/i);
  });

  test("equal deficits use the declared evidence-direction fallback rather than category spelling", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      usual_sleep_hours: 5,
      sleep_refreshed: 5,
      stress_recovery_practice: "never",
    });

    expect(buildActionPlan([], score).map((action) => action.categoryId)).toEqual([
      "sleep",
      "recovery",
    ]);
  });

  test("recovery uses the verified WHO stress guide and only its brief supported practices", () => {
    const score = adultScore({
      ...F1_ANSWERS,
      stress_recovery_practice: "never",
    });
    const recovery = score.categories.find((category) => category.id === "recovery");
    const action = buildActionPlan([], score).find(
      (candidate) => candidate.categoryId === "recovery",
    );

    expect(recovery?.source).toEqual({
      title: "Doing What Matters in Times of Stress: An Illustrated Guide",
      publisher: "World Health Organization",
      url: "https://www.who.int/publications/i/item/9789240003927",
    });
    expect(action).toMatchObject({
      title: "Try one brief stress-management practice",
      nextStep:
        "Choose grounding, unhooking, acting on your values, being kind, or making room, and practise it for a few minutes today.",
      sources: [recovery?.source],
    });
    expect(`${action?.title} ${action?.nextStep}`).not.toMatch(
      /enjoyable activity|generic recovery/i,
    );
  });
});

describe("question-bank contract and reachable coverage", () => {
  test("the explicit score allow-list matches only declared score and exclusion consumers", () => {
    expect(PURITY_SCORE_INPUT_IDS).toEqual([
      "current_tobacco_nicotine",
      "tobacco_nicotine_context",
      "alcohol_frequency",
      "alcohol_detail_typical_amount",
      "alcohol_detail_heavy_episode",
      "weekly_moderate_activity_minutes",
      "movement_strength_days",
      "movement_walking_days",
      "sedentary_total_hours",
      "plant_food_frequency",
      "diet_whole_grains",
      "diet_legumes",
      "diet_processed_meat",
      "diet_sugary_drinks",
      "usual_sleep_hours",
      "sleep_refreshed",
      "circadian_bedtime_variation",
      "stress_recovery_practice",
      "preventive_followup_status",
      "preventive_followup_action",
      "current_medications",
      "med_detail_prescriber_followup",
      "adherence_missed_doses",
      "adherence_access_barriers",
      "interaction_shared_list",
    ]);
    const bankIds = questionBank
      .filter((question) =>
        question.consumers.some((consumer) =>
          ["purity-score", "purity-score-exclusion-support"].includes(consumer),
        ),
      )
      .map((question) => question.id)
      .sort();

    expect([...PURITY_SCORE_INPUT_IDS].sort()).toEqual(bankIds);
    expect(bankIds).not.toContain("stress_current_level");
    expect(bankIds).not.toContain("preventive_visit_recency");
  });

  test.each(["quick", "detailed", "deep"] as const)(
    "the nicotine context branch is reachable in %s without breaking queue caps",
    (depth) => {
      const queue = buildAssessmentQueue(
        depth,
        questionBank,
        { age: 35, countryCode: "CH" },
        { current_tobacco_nicotine: true },
      );
      expect(queue.map((question) => question.id)).toContain("tobacco_nicotine_context");
      if (depth === "quick") expect(queue).toHaveLength(20);
      else if (depth === "detailed") expect(queue).toHaveLength(50);
      else {
        expect(queue.length).toBeGreaterThanOrEqual(150);
        expect(queue.length).toBeLessThanOrEqual(200);
      }
    },
  );

  test.each([
    ["quick", "insufficient-coverage"],
    ["detailed", "adult-score"],
    ["deep", "adult-score"],
  ] as const)("a realistic %s route reaches the intended score state", (depth, kind) => {
    const answers = completeReachableAssessment(depth, {
      ...F1_ANSWERS,
      current_medications: false,
      preventive_followup_status: "not_due",
    });
    const result = calculatePurityScore(answers, {
      ageYears: 35,
      assessmentDepth: depth,
    });

    expect(result.kind).toBe(kind);
    if (depth === "quick") expect(result).not.toHaveProperty("score");
    else if (result.kind !== "adult-score") {
      throw new Error(`Expected an adult score for ${depth}`);
    } else if (depth === "detailed") {
      expect(result.coverage).toBeGreaterThanOrEqual(70);
    } else {
      expect(result).toMatchObject({ score: 100, coverage: 100 });
    }
  });

  test("a realistic Detailed medicine route remains score-eligible without penalizing no access", () => {
    const answers = completeReachableAssessment("detailed", {
      ...F1_ANSWERS,
      preventive_followup_status: "not_due",
      current_medications: true,
      med_detail_prescriber_followup: "no_current_access",
      adherence_access_barriers: ["none"],
    });
    const result = calculatePurityScore(answers, {
      ageYears: 35,
      assessmentDepth: "detailed",
    });

    expect(result.kind).toBe("adult-score");
    if (result.kind === "adult-score") expect(result.coverage).toBeGreaterThanOrEqual(70);
  });
});
