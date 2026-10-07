import { expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { riskRules } from "../data/rules";
import type { AnalysisDepth, BranchCondition, RiskLeaf } from "./types";
import {
  DEFAULT_PILLAR_BY_DOMAIN,
  HEALTH_PILLARS,
  QUESTION_PILLAR_OVERRIDES,
  RISK_RULE_PILLAR_BY_ID,
  groupQuestionsByPillar,
  healthPillarForQuestion,
  healthPillarForRiskRule,
  indexRiskLeavesByPillar,
} from "./health-pillars";

function conditionRefs(condition: BranchCondition): string[] {
  if ("questionId" in condition) return [condition.questionId];
  if ("all" in condition) return condition.all.flatMap(conditionRefs);
  return condition.any.flatMap(conditionRefs);
}

test("defines the four pillars in product order", () => {
  expect(HEALTH_PILLARS).toEqual([
    "cardio-energy",
    "strength-neural",
    "sleep-circadian",
    "nutrition-metabolic",
  ]);
});

test("maps every current domain, question, and risk rule exactly once", () => {
  expect(Object.keys(DEFAULT_PILLAR_BY_DOMAIN).sort()).toEqual(
    [...new Set(questionBank.map(({ domain }) => domain))].sort(),
  );
  expect(Object.keys(RISK_RULE_PILLAR_BY_ID).sort()).toEqual(
    riskRules.map(({ id }) => id).sort(),
  );
  for (const question of questionBank) {
    expect(HEALTH_PILLARS).toContain(healthPillarForQuestion(question));
  }
});

test("uses only real non-default question overrides", () => {
  const questionsById = new Map(questionBank.map((question) => [question.id, question]));

  for (const [questionId, pillar] of Object.entries(QUESTION_PILLAR_OVERRIDES)) {
    const question = questionsById.get(questionId);
    expect(question, `${questionId} is a real question`).toBeDefined();
    expect(pillar).not.toBe(DEFAULT_PILLAR_BY_DOMAIN[question!.domain]);
  }
});

test("keeps every conditional gate in the same or an earlier pillar", () => {
  const byId = new Map(questionBank.map((question) => [question.id, question]));
  const order = new Map(HEALTH_PILLARS.map((pillar, index) => [pillar, index]));
  const violations: string[] = [];
  let conditionalQuestions = 0;
  let gateEdges = 0;
  for (const dependent of questionBank) {
    if (!dependent.condition) continue;
    conditionalQuestions += 1;
    for (const gateId of conditionRefs(dependent.condition)) {
      gateEdges += 1;
      const gate = byId.get(gateId);
      expect(gate, `${dependent.id} references ${gateId}`).toBeDefined();
      if (order.get(healthPillarForQuestion(gate!))! > order.get(healthPillarForQuestion(dependent))!) {
        violations.push(`${gateId} -> ${dependent.id}`);
      }
    }
  }
  expect(questionBank).toHaveLength(156);
  expect(conditionalQuestions).toBe(58);
  expect(gateEdges).toBe(74);
  expect(violations).toEqual([]);
});

test("keeps every branch child within the depths of its gates", () => {
  const byId = new Map(questionBank.map((question) => [question.id, question]));
  const reachableDepths = (condition: BranchCondition): Set<AnalysisDepth> => {
    if ("questionId" in condition) return new Set(byId.get(condition.questionId)?.tiers ?? []);
    if ("all" in condition) {
      return condition.all
        .map(reachableDepths)
        .reduce((left, right) => new Set([...left].filter((depth) => right.has(depth))));
    }
    return new Set(condition.any.flatMap((child) => [...reachableDepths(child)]));
  };
  const violations: string[] = [];
  for (const dependent of questionBank) {
    if (!dependent.condition) continue;
    const allowed = reachableDepths(dependent.condition);
    const unreachable = dependent.tiers.filter((depth) => !allowed.has(depth));
    if (unreachable.length > 0) {
      violations.push(`${dependent.id}: ${unreachable.join(", ")}`);
    }
  }
  expect(violations).toEqual([]);
});

test("maps adult Express performance questions to their intended pillars", () => {
  const byId = new Map(questionBank.map((question) => [question.id, question]));

  expect(healthPillarForQuestion(byId.get("reported_vo2_max_ml_kg_min")!)).toBe(
    "cardio-energy",
  );
  expect(healthPillarForQuestion(byId.get("chair_stand_30s_count")!)).toBe(
    "strength-neural",
  );
  expect(healthPillarForQuestion(byId.get("falls_past_year")!)).toBe(
    "strength-neural",
  );
  for (const id of ["squat_one_rep_max_kg", "deadlift_one_rep_max_kg", "functional_difficulties"]) {
    expect(healthPillarForQuestion(byId.get(id)!)).toBe("strength-neural");
  }
  expect(healthPillarForQuestion(byId.get("walking_pace")!)).toBe("cardio-energy");
  for (const id of ["reported_vo2_max_ml_kg_min", "chair_stand_30s_count", "squat_one_rep_max_kg", "deadlift_one_rep_max_kg"]) {
    expect(byId.get(id)).toMatchObject({ id, minAge: 18 });
  }
  expect(byId.get("falls_past_year")).toMatchObject({ minAge: 60 });
  expect(byId.get("functional_difficulties")).toMatchObject({ minAge: 50 });
});

test("groups without changing IDs and preserves order inside each pillar", () => {
  const grouped = groupQuestionsByPillar(questionBank);
  expect(grouped.map(({ id }) => id).sort()).toEqual(questionBank.map(({ id }) => id).sort());
  for (const pillar of HEALTH_PILLARS) {
    expect(grouped.filter((q) => healthPillarForQuestion(q) === pillar).map(({ id }) => id))
      .toEqual(questionBank.filter((q) => healthPillarForQuestion(q) === pillar).map(({ id }) => id));
  }
});

test("classifies all 68 risk rules in the required pillar distribution", () => {
  expect(Object.keys(RISK_RULE_PILLAR_BY_ID)).toHaveLength(68);
  expect(HEALTH_PILLARS.map((pillar) =>
    Object.values(RISK_RULE_PILLAR_BY_ID).filter((mapped) => mapped === pillar).length,
  )).toEqual([22, 26, 2, 18]);
  for (const ruleId of Object.keys(RISK_RULE_PILLAR_BY_ID)) {
    expect(healthPillarForRiskRule(ruleId)).toBe(
      RISK_RULE_PILLAR_BY_ID[ruleId as keyof typeof RISK_RULE_PILLAR_BY_ID],
    );
  }
  expect(() => healthPillarForRiskRule("unclassified-rule")).toThrow(
    "Missing health-pillar mapping for risk rule: unclassified-rule",
  );
});

test("indexes risk leaves by their mapped pillar without mutating them", () => {
  const leaves = riskRules.map((rule, index) => ({
    id: `leaf-${index}`,
    ruleId: rule.id,
  })) as RiskLeaf[];
  const index = indexRiskLeavesByPillar(leaves);

  expect(HEALTH_PILLARS.flatMap((pillar) => index[pillar]).map(({ id }) => id).sort())
    .toEqual(leaves.map(({ id }) => id).sort());
  expect(index["cardio-energy"][0]).toBe(leaves[0]);
});
