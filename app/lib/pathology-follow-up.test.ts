import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { normalizeLabValue, type ConfirmedLabValue, type LabMarker } from "./labs";
import { buildFollowUpPlan, followUpQuestionCount, type FollowUpScope, type FollowUpStep } from "./pathology-follow-up";
import { evaluatePathologyRisk } from "./pathology-risk";
import { prototypePolicy } from "./release-policy";
import { evaluateRisks } from "./risk-engine";
import type { AnswerMap, AnswerValue, ProfileContext, Question } from "./types";

const SWISS_55: ProfileContext = { age: 55, countryCode: "CH" };
const EXPRESS_SHAPE: AnswerMap = { height_cm: 172, weight_kg: 80, plant_food_frequency: 2 };

function cholesterol(marker: LabMarker, value: number): ConfirmedLabValue {
  const normalized = normalizeLabValue({ marker, value, unit: "mmol/L" });
  return {
    source: null,
    reviewed: {
      marker, valueText: String(value), value, unit: "mmol/L", referenceRange: "",
      collectionDate: "2026-07-30", fastingStatus: "not_stated",
    },
    normalized: { value: normalized.normalizedValue, unit: normalized.normalizedUnit, displayValue: normalized.displayValue },
  };
}

const CONFIRMED_CHOLESTEROL = [cholesterol("total_cholesterol", 5.5), cholesterol("hdl_cholesterol", 1.3)];

function plan(
  answers: AnswerMap,
  profile: ProfileContext = SWISS_55,
  scope: Parameters<typeof buildFollowUpPlan>[3] = "all",
  labs: ReadonlyArray<ConfirmedLabValue> = [],
) {
  const synthesis = evaluatePathologyRisk(answers, profile, labs, prototypePolicy);
  return buildFollowUpPlan(synthesis, answers, profile, scope);
}

function questionIds(steps: ReadonlyArray<FollowUpStep>): string[] {
  return steps.flatMap((step) => (step.kind === "question" ? [step.questionId] : ["labs"]));
}

function possibleValues(question: Question): AnswerValue[] {
  if (question.answerType === "boolean") return [true, false];
  if (question.answerType === "number" || question.answerType === "scale") return [0, 1, 10, 40, 100, 140, 180, 250];
  if (question.answerType === "multi") return (question.options ?? []).map((option) => [option.value]);
  return (question.options ?? []).map((option) => option.value);
}

describe("follow-up plan", () => {
  test("asks only the missing FINDRISC answers, in questionnaire order", () => {
    expect(questionIds(plan(EXPRESS_SHAPE, SWISS_55, "findrisc"))).toEqual([
      "sex_assigned_at_birth",
      "waist_circumference_cm",
      "glucose_high_ever",
      "family_diabetes",
      "daily_activity_30_min",
      "bp_medication_ever",
    ]);
  });

  test("merges what each answer unlocks and puts the lab import last", () => {
    const steps = plan(EXPRESS_SHAPE);
    const sex = steps.find((step) => step.kind === "question" && step.questionId === "sex_assigned_at_birth");
    expect(sex?.unlocks).toEqual(expect.arrayContaining(["score2", "findrisc", "stop-bang", "caide"]));
    const last = steps[steps.length - 1];
    expect(last).toEqual({
      kind: "labs",
      markers: ["total_cholesterol", "hdl_cholesterol"],
      unlocks: ["score2", "caide"],
    });
  });

  test("asks the blood-pressure gate before the systolic value, and again after a no", () => {
    const gate = plan(EXPRESS_SHAPE, SWISS_55, "caide").find(
      (step) => step.kind === "question" && step.questionId === "has_recent_blood_pressure",
    );
    expect(gate).toEqual({
      kind: "question",
      questionId: "has_recent_blood_pressure",
      opens: ["blood_pressure_systolic"],
      unlocks: ["caide"],
    });
    expect(questionIds(plan({ ...EXPRESS_SHAPE, has_recent_blood_pressure: false }, SWISS_55, "caide"))).toContain(
      "has_recent_blood_pressure",
    );
    const opened = questionIds(plan({ ...EXPRESS_SHAPE, has_recent_blood_pressure: true }, SWISS_55, "caide"));
    expect(opened).toContain("blood_pressure_systolic");
    expect(opened).not.toContain("has_recent_blood_pressure");
  });

  test("asks the alcohol details once drinking is reported", () => {
    expect(questionIds(plan({ alcohol_frequency: "monthly_or_less" }, SWISS_55, "audit-c"))).toEqual([
      "alcohol_detail_typical_amount",
      "alcohol_detail_heavy_episode",
    ]);
    expect(plan({ alcohol_frequency: "never" }, SWISS_55, "audit-c")).toEqual([]);
  });

  test("offers nothing for complete or inapplicable instruments", () => {
    expect(plan(EXPRESS_SHAPE, { age: 30, countryCode: "CH" }, "copd-ps")).toEqual([]);
    expect(plan(EXPRESS_SHAPE, { age: 30, countryCode: "CH" }, "caide")).toEqual([]);
  });

  test("counts the question a gate can open", () => {
    const steps = plan(EXPRESS_SHAPE, SWISS_55, "caide");
    expect(followUpQuestionCount(steps)).toBe(steps.length + 1);
  });

  test("counts the alcohol details that the drinking frequency can open", () => {
    const steps = plan({}, SWISS_55, "audit-c");
    expect(steps).toEqual([
      {
        kind: "question",
        questionId: "alcohol_frequency",
        opens: ["alcohol_detail_typical_amount", "alcohol_detail_heavy_episode"],
        unlocks: ["audit-c"],
      },
    ]);
    expect(followUpQuestionCount(steps)).toBe(3);
    // The optional smoking context opens questions that no score requires.
    expect(plan({}, SWISS_55, "score2").find((step) => step.kind === "question" && step.questionId === "current_tobacco_nicotine"))
      .not.toHaveProperty("opens");
  });

  test("counts diabetes details behind the diagnosis and current treatment behind prior use", () => {
    const diabetic = plan({}, { age: 55, countryCode: "FR" }, "score2").find(
      (step) => step.kind === "question" && step.questionId === "diagnosed_conditions_core",
    );
    expect(diabetic).toMatchObject({ opens: ["diabetes_type", "diabetes_age_at_diagnosis"] });
    const treatment = plan({}, { age: 55, countryCode: "US" }, "prevent").find(
      (step) => step.kind === "question" && step.questionId === "bp_medication_ever",
    );
    expect(treatment).toMatchObject({ opens: ["bp_medication_current"] });
  });

  test("reserves a conditional lab step when a WHO diagnosis can switch charts", () => {
    const profile = { age: 55, countryCode: "CA" };
    const answers = { height_cm: 170, weight_kg: 70 };
    const before = plan(answers, profile, "who-cvd");
    expect(before.find((step) => step.kind === "question" && step.questionId === "diagnosed_conditions_core"))
      .toMatchObject({ opensLab: true });
    const after = plan({ ...answers, diagnosed_conditions_core: ["diabetes"] }, profile, "who-cvd");
    expect(after.at(-1)).toMatchObject({ kind: "labs", markers: ["total_cholesterol"] });
    expect(followUpQuestionCount(after)).toBeLessThan(followUpQuestionCount(before));
  });

  test("reserves the SCORE2-Diabetes lab step behind the diagnosis once cholesterol is confirmed", () => {
    const profile = { age: 55, countryCode: "FR" };
    const answers: AnswerMap = { sex_assigned_at_birth: "male" };
    const before = plan(answers, profile, "score2", CONFIRMED_CHOLESTEROL);
    expect(before.some((step) => step.kind === "labs")).toBe(false);
    expect(before.find((step) => step.kind === "question" && step.questionId === "diagnosed_conditions_core"))
      .toMatchObject({ opens: ["diabetes_type", "diabetes_age_at_diagnosis"], opensLab: true });
    const after = plan({ ...answers, diagnosed_conditions_core: ["diabetes"] }, profile, "score2", CONFIRMED_CHOLESTEROL);
    expect(after.at(-1)).toMatchObject({ kind: "labs", markers: ["hba1c", "egfr"] });
    expect(followUpQuestionCount(after)).toBeLessThan(followUpQuestionCount(before));
  });

  test("does not reserve a second lab step when the lab import is already planned", () => {
    const steps = plan({ height_cm: 170, weight_kg: 70 }, { age: 55, countryCode: "CA" });
    expect(steps.at(-1)).toMatchObject({ kind: "labs", markers: expect.arrayContaining(["total_cholesterol"]) });
    expect(steps.find((step) => step.kind === "question" && step.questionId === "diagnosed_conditions_core"))
      .not.toHaveProperty("opensLab");
  });

  test("counts the smoking details behind the open branch of a compound gate", () => {
    const profile = { age: 65, countryCode: "CH" };
    const current = plan({}, profile, "plcom2012").find(
      (step) => step.kind === "question" && step.questionId === "current_tobacco_nicotine",
    );
    expect(current).toMatchObject({ opens: ["race_ethnicity", "family_lung_cancer", "smoking_cigarettes_per_day", "smoking_years_total"] });
    const steps = plan({}, profile, "plcom2012");
    expect(steps.find((step) => step.kind === "question" && step.questionId === "education_years")).toMatchObject({ opens: ["education_highest_level"] });
    expect(steps.find((step) => step.kind === "question" && step.questionId === "smoking_history_former")).toMatchObject({ opens: ["smoking_years_since_quit"] });

    // A no on the current gate moves the hidden items behind the former-smoker question.
    const former = plan({ current_tobacco_nicotine: false }, profile, "plcom2012").find(
      (step) => step.kind === "question" && step.questionId === "smoking_history_former",
    );
    expect(former).toMatchObject({ opens: expect.arrayContaining(["race_ethnicity", "smoking_cigarettes_per_day", "family_lung_cancer"]) });
    expect(questionIds(plan({ current_tobacco_nicotine: false }, profile, "plcom2012"))).not.toContain("current_tobacco_nicotine");
  });

  test("counts heart failure behind the diagnosis gate for the Lee index", () => {
    const diagnosis = plan({}, { age: 72, countryCode: "GB" }, "lee-index").find(
      (step) => step.kind === "question" && step.questionId === "diagnosed_conditions_core",
    );
    expect(diagnosis).toMatchObject({ opens: ["heart_failure_diagnosed", "copd_diagnosed"], unlocks: ["lee-index"] });
  });

  test("every answer lowers the count by at least one, so it stays an upper bound", () => {
    const questions = new Map(questionBank.map((question) => [question.id, question]));
    const starts: ReadonlyArray<readonly [AnswerMap, ProfileContext, ReadonlyArray<ConfirmedLabValue>?]> = [
      [{}, SWISS_55],
      [EXPRESS_SHAPE, SWISS_55],
      [{}, { age: 72, countryCode: "GB" }],
      [{}, { age: 30, countryCode: "US" }],
      [{}, { age: 55, countryCode: "FR" }],
      [{}, { age: 55, countryCode: "FR" }, CONFIRMED_CHOLESTEROL],
      [{}, { age: 55, countryCode: "DE" }],
      [{}, { age: 55, countryCode: "CA" }],
      [{}, { age: 55, countryCode: "CA" }, CONFIRMED_CHOLESTEROL],
      [{}, { age: 55, countryCode: "MA" }],
      [{ diagnosed_conditions_core: ["diabetes"] }, { age: 55, countryCode: "FR" }],
      [{ bp_medication_ever: true }, { age: 55, countryCode: "US" }],
    ];
    let checked = 0;
    for (const [answers, profile, labs = []] of starts) {
      // Each card shows its own count, so the bound must hold per instrument as well as overall.
      const scopes: FollowUpScope[] = [
        "all",
        ...evaluatePathologyRisk(answers, profile, labs, prototypePolicy).scores
          .filter((score) => score.status === "incomplete")
          .map((score) => score.instrument),
      ];
      for (const scope of scopes) {
        const steps = plan(answers, profile, scope, labs);
        const before = followUpQuestionCount(steps);
        for (const step of steps) {
          if (step.kind !== "question") continue;
          const question = questions.get(step.questionId);
          if (!question) throw new Error(`Unknown follow-up question ${step.questionId}`);
          for (const value of possibleValues(question)) {
            // The flow never offers a handled question again, whatever was answered.
            const after = plan({ ...answers, [step.questionId]: value }, profile, scope, labs).filter(
              (candidate) => candidate.kind === "labs" || candidate.questionId !== step.questionId,
            );
            expect(
              followUpQuestionCount(after),
              `${profile.countryCode} ${scope}: ${step.questionId} = ${JSON.stringify(value)}`,
            ).toBeLessThanOrEqual(before - 1);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test("never offers a question that can raise an urgent signal for an adult", () => {
    const offered = new Set<string>();
    for (const profile of [SWISS_55, { age: 70, countryCode: "GB" }, { age: 18, countryCode: "US" }] as const) {
      for (const step of plan({}, profile)) {
        if (step.kind !== "question") continue;
        offered.add(step.questionId);
        for (const opened of step.opens ?? []) offered.add(opened);
      }
      for (const step of plan({ has_recent_blood_pressure: true, alcohol_frequency: "four_plus_weekly" }, profile)) {
        if (step.kind === "question") offered.add(step.questionId);
      }
    }
    expect(offered.size).toBeGreaterThan(20);

    const questions = new Map(questionBank.map((question) => [question.id, question]));
    for (const id of offered) {
      const question = questions.get(id);
      if (!question) throw new Error(`Unknown follow-up question ${id}`);
      for (const value of possibleValues(question)) {
        for (const profile of [SWISS_55, { age: 18, countryCode: "US" }] as const) {
          const answers: AnswerMap = { has_recent_blood_pressure: true, alcohol_frequency: "four_plus_weekly", [id]: value };
          const urgent = evaluateRisks(answers, profile, prototypePolicy).filter((leaf) => leaf.urgency === "urgent");
          expect(urgent.map((leaf) => leaf.ruleId), `${id} = ${JSON.stringify(value)}`).toEqual([]);
        }
      }
    }
  });
});
