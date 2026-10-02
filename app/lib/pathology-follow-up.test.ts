import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { buildFollowUpPlan, followUpQuestionCount, type FollowUpStep } from "./pathology-follow-up";
import { evaluatePathologyRisk } from "./pathology-risk";
import { prototypePolicy } from "./release-policy";
import { evaluateRisks } from "./risk-engine";
import type { AnswerMap, AnswerValue, ProfileContext } from "./types";

const SWISS_55: ProfileContext = { age: 55, countryCode: "CH" };
const EXPRESS_SHAPE: AnswerMap = { height_cm: 172, weight_kg: 80, plant_food_frequency: 2 };

function plan(answers: AnswerMap, profile: ProfileContext = SWISS_55, scope: Parameters<typeof buildFollowUpPlan>[3] = "all") {
  const synthesis = evaluatePathologyRisk(answers, profile, [], prototypePolicy);
  return buildFollowUpPlan(synthesis, answers, profile, scope);
}

function questionIds(steps: ReadonlyArray<FollowUpStep>): string[] {
  return steps.flatMap((step) => (step.kind === "question" ? [step.questionId] : ["labs"]));
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
      opens: "blood_pressure_systolic",
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

  test("never offers a question that can raise an urgent signal for an adult", () => {
    const offered = new Set<string>();
    for (const profile of [SWISS_55, { age: 70, countryCode: "GB" }, { age: 18, countryCode: "US" }] as const) {
      for (const step of plan({}, profile)) {
        if (step.kind !== "question") continue;
        offered.add(step.questionId);
        if (step.opens) offered.add(step.opens);
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
      const values: AnswerValue[] =
        question.answerType === "boolean"
          ? [true, false]
          : question.answerType === "number" || question.answerType === "scale"
            ? [0, 1, 10, 40, 100, 140, 180, 250]
            : question.answerType === "multi"
              ? (question.options ?? []).map((option) => [option.value])
              : (question.options ?? []).map((option) => option.value);
      for (const value of values) {
        for (const profile of [SWISS_55, { age: 18, countryCode: "US" }] as const) {
          const answers: AnswerMap = { has_recent_blood_pressure: true, alcohol_frequency: "four_plus_weekly", [id]: value };
          const urgent = evaluateRisks(answers, profile, prototypePolicy).filter((leaf) => leaf.urgency === "urgent");
          expect(urgent.map((leaf) => leaf.ruleId), `${id} = ${JSON.stringify(value)}`).toEqual([]);
        }
      }
    }
  });
});
