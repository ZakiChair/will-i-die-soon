import { describe, expect, test } from "vitest";

import { evidenceSources } from "../data/evidence";
import { questionBank } from "../data/questions";
import { riskRuleGroups, riskRules } from "../data/rules";
import {
  prototypePolicy,
  publicWellnessPolicy,
  regulatedPolicy,
  RISK_RULESET_VERSION,
} from "./release-policy";
import {
  assertEvidenceContract,
  evaluateRisks,
  sortRisksForDisplay,
} from "./risk-engine";
import type {
  AnswerMap,
  AnswerValue,
  ProfileContext,
  RiskCondition,
  RiskLeaf,
  RiskRule,
} from "./types";

const adultUS: ProfileContext = { age: 35, countryCode: "US" };
const adultGB: ProfileContext = { age: 35, countryCode: "GB" };
const adultCH: ProfileContext = { age: 35, countryCode: "CH" };

function leafIds(answers: AnswerMap, profile = adultUS) {
  return evaluateRisks(answers, profile, prototypePolicy).map((leaf) => leaf.id);
}

function leafById(id: string, answers: AnswerMap, profile = adultUS) {
  const leaf = evaluateRisks(answers, profile, prototypePolicy).find(
    (candidate) => candidate.id === id,
  );
  expect(leaf, `Expected risk leaf ${id}`).toBeDefined();
  return leaf as RiskLeaf;
}

function conditionQuestionIds(
  condition: RiskCondition,
  ids = new Set<string>(),
): Set<string> {
  if ("all" in condition) {
    condition.all.forEach((part) => conditionQuestionIds(part, ids));
  } else if ("any" in condition) {
    condition.any.forEach((part) => conditionQuestionIds(part, ids));
  } else {
    ids.add(condition.questionId);
  }
  return ids;
}

function mergeConditionAnswers(
  left: Record<string, AnswerValue>,
  right: Record<string, AnswerValue>,
): Record<string, AnswerValue> {
  const merged = { ...left };
  for (const [questionId, value] of Object.entries(right)) {
    const existing = merged[questionId];
    if (existing === undefined || existing === value) {
      merged[questionId] = value;
      continue;
    }
    if (Array.isArray(existing) && Array.isArray(value)) {
      merged[questionId] = [...new Set([...existing, ...value])];
      continue;
    }
    throw new Error(`Cannot construct a valid answer for ${questionId}.`);
  }
  return merged;
}

function satisfyingAnswers(condition: RiskCondition): Record<string, AnswerValue> {
  if ("all" in condition) {
    return condition.all.reduce<Record<string, AnswerValue>>(
      (answers, part) => mergeConditionAnswers(answers, satisfyingAnswers(part)),
      {},
    );
  }
  if ("any" in condition) return satisfyingAnswers(condition.any[0]);
  if (condition.operator === "includes") {
    return { [condition.questionId]: [condition.value] };
  }
  if (condition.operator === "equals") {
    return { [condition.questionId]: condition.value };
  }
  return {
    [condition.questionId]:
      condition.operator === "less-than"
        ? Math.max(condition.validMin ?? 0, condition.value - 1)
        : condition.value,
  };
}

function profileForRule(rule: RiskRule, countryCode: string): ProfileContext {
  const { minAge = 0, maxAge } = rule.applicability;
  const age =
    maxAge === undefined
      ? Math.max(35, minAge)
      : Math.max(minAge, Math.min(maxAge, maxAge >= 15 ? 15 : maxAge));
  return { age, countryCode };
}

describe("global rule source support matrix", () => {
  test.each(
    riskRules.flatMap((rule) =>
      ["US", "GB", "CH", "DE", "OTHER"].map((countryCode) => [
        rule.id,
        countryCode,
        rule,
      ] as const),
    ),
  )("keeps %s supported in %s", (_ruleId, countryCode, rule) => {
    expect(rule.applicability.countries, rule.id).toBe("all");
    const leaves = evaluateRisks(
      satisfyingAnswers(rule.condition),
      profileForRule(rule, countryCode),
      prototypePolicy,
    );

    expect(
      leaves.find((leaf) => leaf.ruleId === rule.id),
      `${rule.id} lost all applicable evidence in ${countryCode}`,
    ).toBeDefined();
  });
});

describe("evidence and release contracts", () => {
  test("separates publisher origin from content and operational applicability", () => {
    for (const source of Object.values(evidenceSources)) {
      const contract = source as typeof source & {
        applicability?: { countries: "all" | ReadonlyArray<string>; minAge?: number; maxAge?: number };
        operationalCountries?: ReadonlyArray<string>;
      };
      const validOrigin =
        contract.jurisdictions === "all" ||
        (Array.isArray(contract.jurisdictions) &&
          contract.jurisdictions.length > 0 &&
          contract.jurisdictions.every((country) => /^[A-Z]{2}$/.test(country)));
      expect(validOrigin, source.id).toBe(true);
      expect(contract.applicability, source.id).toEqual(
        expect.objectContaining({ countries: expect.anything() }),
      );
      if (contract.operationalCountries !== undefined) {
        expect(contract.operationalCountries, source.id).not.toHaveLength(0);
      }
    }

    expect(evidenceSources.nhsChangingMole.jurisdictions).toEqual(["GB"]);
    expect(
      (evidenceSources.nhsChangingMole as typeof evidenceSources.nhsChangingMole & {
        applicability: { countries: "all" | ReadonlyArray<string> };
      }).applicability.countries,
    ).toBe("all");
  });

  test.each([
    { jurisdictions: [] },
    { jurisdictions: [""] },
    { applicability: { countries: [] } },
    { applicability: { countries: "all", minAge: 18, maxAge: 12 } },
    { operationalCountries: [] },
  ])("rejects malformed source scope metadata %#", (override) => {
    const source = {
      ...evidenceSources.cdcAdultSleep,
      applicability: { countries: "all" as const },
      ...override,
    };
    const leaf: RiskLeaf = {
      id: "source-contract",
      ruleId: "source-contract",
      rulesetVersion: RISK_RULESET_VERSION,
      group: "sleep",
      title: "Source contract",
      copy: "This pattern is worth discussing.",
      evidenceTier: "guideline-action",
      urgency: "long-term",
      signal: "worth-attention",
      factors: ["A factor"],
      missingInputs: [],
      sources: [source as typeof evidenceSources.cdcAdultSleep],
      applicability: { countries: "all" },
    };

    expect(() => assertEvidenceContract(leaf)).toThrow(/source.*(?:scope|applicability|jurisdiction|operational)/i);
  });

  test("rejects probability on every non-validated evidence tier", () => {
    expect(() =>
      assertEvidenceContract({
        id: "invalid-probability",
        ruleId: "invalid-probability",
        rulesetVersion: RISK_RULESET_VERSION,
        group: "sleep",
        title: "Invalid",
        copy: "This is worth discussing with a clinician.",
        evidenceTier: "guideline-action",
        urgency: "long-term",
        signal: "worth-attention",
        probability: 0.42,
        factors: ["A factor"],
        missingInputs: [],
        sources: [evidenceSources.cdcAdultSleep],
        applicability: { minAge: 18, countries: "all" },
      }),
    ).toThrow(/probability/i);
  });

  test("rejects incomplete evidence and diagnostic or percentage copy", () => {
    const base = {
      id: "invalid-copy",
      ruleId: "invalid-copy",
      rulesetVersion: RISK_RULESET_VERSION,
      group: "sleep" as const,
      title: "Invalid",
      evidenceTier: "guideline-action" as const,
      urgency: "long-term" as const,
      signal: "worth-attention" as const,
      factors: ["A factor"],
      missingInputs: [],
      sources: [evidenceSources.cdcAdultSleep],
      applicability: { minAge: 18, countries: "all" as const },
    };

    expect(() => assertEvidenceContract({ ...base, copy: "You have a sleep disorder." })).toThrow(
      /diagnostic/i,
    );
    expect(() => assertEvidenceContract({ ...base, copy: "Your risk is 42%." })).toThrow(
      /percentage/i,
    );
    expect(() => assertEvidenceContract({ ...base, copy: "Worth discussing.", sources: [] })).toThrow(
      /source/i,
    );
  });

  test("provides reviewed source records and exact input declarations for every shipped rule", () => {
    const questionIds = new Set(questionBank.map((question) => question.id));
    const sourceIds = new Set(Object.keys(evidenceSources));

    expect(riskRules.length).toBeGreaterThan(0);
    expect(
      riskRules.every(
        (rule) => {
          const conditionalSources = (
            rule as RiskRule & {
              conditionalSources?: ReadonlyArray<{
                sourceId: string;
                condition: RiskCondition;
              }>;
            }
          ).conditionalSources ?? [];
          return (
            rule.inputs.length > 0 &&
            rule.sourceIds.length + conditionalSources.length > 0 &&
            rule.inputs.every(
            (input) => /^[a-z][a-z0-9_]*$/.test(input) && questionIds.has(input),
            ) &&
            [...rule.sourceIds, ...conditionalSources.map((item) => item.sourceId)].every(
              (sourceId) => sourceIds.has(sourceId),
            )
          );
        },
      ),
    ).toBe(true);
    expect(
      Object.values(evidenceSources).every(
        (source) =>
          source.url.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt),
      ),
    ).toBe(true);

    for (const rule of riskRules) {
      const referenced = conditionQuestionIds(rule.condition);
      rule.factors.forEach((item) => {
        referenced.add(item.questionId);
        conditionQuestionIds(item.condition, referenced);
      });
      expect([...new Set(rule.inputs)].sort(), rule.id).toEqual([...referenced].sort());
    }
  });

  test("exposes the current reviewed regulator and NHS records on consumer-visible leaves", () => {
    const glp = leafById("glp1-history-review", {
      uses_glp1: true,
      glp1_detail_active_ingredient: "tirzepatide",
      glp1_detail_relevant_history: ["pancreatitis"],
    });
    const steroid = leafById("systemic-steroid-illness-review", {
      uses_systemic_corticosteroids: true,
      corticosteroid_detail_infection_context: ["infection"],
    });
    const skin = leafById(
      "changing-skin-mark-review",
      { sun_changing_mole: true },
      adultGB,
    );

    expect(glp.sources).toContainEqual(
      expect.objectContaining({
        id: "dailymed-zepbound-tirzepatide",
        title: "Zepbound (tirzepatide) prescribing information",
        url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=487cd7e7-434c-4925-99fa-aa80b1cc776b&version=38",
        reviewedAt: "2026-08-03",
      }),
    );
    expect(steroid.sources).toContainEqual(
      expect.objectContaining({
        id: "ese-endocrine-society-glucocorticoid-adrenal-insufficiency",
        title: "Glucocorticoid-Induced Adrenal Insufficiency",
        url: "https://www.endocrine.org/clinical-practice-guidelines/glucocorticoid-induced-adrenal-insufficiency",
        reviewedAt: "2026-08-03",
      }),
    );
    expect(skin.sources).toContainEqual(
      expect.objectContaining({
        id: "nhs-changing-mole",
        title: "Moles",
        url: "https://www.nhs.uk/conditions/moles/",
        reviewedAt: "2026-08-03",
      }),
    );
  });

  test("registers the primary WHO adolescent-pregnancy publication rather than its news release", () => {
    expect(evidenceSources.whoAdolescentPregnancy).toEqual(
      expect.objectContaining({
        title:
          "WHO guideline on preventing early pregnancy and poor reproductive outcomes among adolescents in low- and middle-income countries",
        url: "https://www.who.int/publications/i/item/9789240104105",
        applicability: { maxAge: 19, countries: "all" },
      }),
    );
  });

  test("consumes every declared sexual, adult pregnancy, and steroid safety answer", () => {
    const consumedInputs = new Set(riskRules.flatMap((rule) => rule.inputs));

    for (const questionId of [
      "sexual_contact_safety",
      "pregnancy_new_concern",
      "pregnancy_care_access",
      "pregnancy_medication_review",
      "pregnancy_feeling_safe",
      "corticosteroid_detail_missed_or_stopped",
      "corticosteroid_detail_omission_symptoms",
    ]) {
      expect(consumedInputs.has(questionId), questionId).toBe(true);
    }
  });

  test.each([
    "rulesetVersion",
    "group",
    "evidenceTier",
    "urgency",
    "signal",
    "applicability",
  ] as const)(
    "rejects a leaf missing required %s metadata",
    (field) => {
      const complete: RiskLeaf = {
        id: "complete",
        ruleId: "complete",
        rulesetVersion: RISK_RULESET_VERSION,
        group: "sleep",
        title: "Complete",
        copy: "This pattern is worth discussing.",
        evidenceTier: "guideline-action",
        urgency: "long-term",
        signal: "worth-attention",
        factors: ["A factor"],
        missingInputs: [],
        sources: [evidenceSources.cdcAdultSleep],
        applicability: { minAge: 18, countries: "all" },
      };
      const incomplete = { ...complete } as Record<string, unknown>;
      delete incomplete[field];

      expect(() => assertEvidenceContract(incomplete as unknown as RiskLeaf)).toThrow();
    },
  );

  test("declares every Task 5 rule group even when audited inputs require omission", () => {
    expect(Object.keys(riskRuleGroups).sort()).toEqual(
      [
        "cardiovascular",
        "dependency",
        "immediate-red-flags",
        "kidney",
        "liver",
        "medication-substance-review",
        "mental-wellbeing",
        "metabolic",
        "musculoskeletal",
        "preventive-follow-up",
        "reproductive-health",
        "respiratory",
        "skin-hair",
        "sleep",
      ].sort(),
    );
    expect(
      Object.entries(riskRuleGroups).every(([group, definition]) =>
        definition.rules.every((rule) => rule.group === group),
      ),
    ).toBe(true);
  });

  test("sorts urgent leaves first without mutating its input", () => {
    const urgent = leafById("urgent-chest", { urgent_chest_discomfort_now: true });
    const longTerm = leafById("adult-short-sleep", { usual_sleep_hours: 6 });
    const original = [longTerm, urgent];

    expect(sortRisksForDisplay(original).map((leaf) => leaf.id)).toEqual([
      "urgent-chest",
      "adult-short-sleep",
    ]);
    expect(original.map((leaf) => leaf.id)).toEqual([
      "adult-short-sleep",
      "urgent-chest",
    ]);
  });

  test("enforces policy gates and regulated model metadata", () => {
    expect(evaluateRisks({ urgent_chest_discomfort_now: true }, adultUS, publicWellnessPolicy)).toEqual(
      [],
    );
    expect(() =>
      evaluateRisks({ usual_sleep_hours: 6 }, adultUS, {
        ...regulatedPolicy,
        jurisdiction: undefined,
      }),
    ).toThrow(/jurisdiction/i);
    expect(() =>
      evaluateRisks({ usual_sleep_hours: 6 }, adultUS, {
        ...regulatedPolicy,
        enabledModelVersion: undefined,
      }),
    ).toThrow(/model version/i);
    expect(evaluateRisks({ usual_sleep_hours: 6 }, adultUS, prototypePolicy)).not.toEqual([]);
    expect(
      evaluateRisks({ usual_sleep_hours: 6 }, adultUS, prototypePolicy).every(
        (leaf) => leaf.probability === undefined,
      ),
    ).toBe(true);
  });

  test("fails a regulated evaluation closed on jurisdiction or ruleset mismatch", () => {
    expect(() =>
      evaluateRisks(
        { diagnosed_high_blood_pressure: true, diet_added_salt: "daily" },
        adultUS,
        regulatedPolicy,
      ),
    ).toThrow(/jurisdiction.*profile|profile.*jurisdiction/i);
    expect(() =>
      evaluateRisks(
        { diagnosed_high_blood_pressure: true, diet_added_salt: "daily" },
        adultCH,
        { ...regulatedPolicy, enabledModelVersion: "invented-rules-v99" },
      ),
    ).toThrow(/unsupported.*(?:model|ruleset).*version/i);

    const matching = evaluateRisks(
      { diagnosed_high_blood_pressure: true, diet_added_salt: "daily" },
      { age: 35, countryCode: "ch" },
      { ...regulatedPolicy, jurisdiction: " CH " },
    );
    expect(matching).toHaveLength(1);
    expect(matching[0]).toEqual(
      expect.objectContaining({
        id: "blood-pressure-salt-context",
        rulesetVersion: regulatedPolicy.enabledModelVersion,
      }),
    );
  });

  test("keeps private and public policy behavior independent of regulated metadata", () => {
    expect(
      evaluateRisks(
        { usual_sleep_hours: 6 },
        adultUS,
        {
          ...prototypePolicy,
          jurisdiction: "CH",
          enabledModelVersion: "invented-rules-v99",
        },
      ).map((leaf) => leaf.id),
    ).toContain("adult-short-sleep");
    expect(
      evaluateRisks(
        { usual_sleep_hours: 6 },
        adultUS,
        {
          ...publicWellnessPolicy,
          jurisdiction: "CH",
          enabledModelVersion: "invented-rules-v99",
        },
      ).map((leaf) => leaf.id),
    ).toContain("adult-short-sleep");
  });

  test("uses content applicability without treating publisher origin as user scope", () => {
    const gbSkin = leafById(
      "changing-skin-mark-review",
      { sun_changing_mole: true },
      adultGB,
    );
    expect(gbSkin.sources.map((source) => source.id)).toContain(
      "nhs-changing-mole",
    );
    const usSkin = leafById(
      "changing-skin-mark-review",
      { sun_changing_mole: true },
      adultUS,
    );
    expect(usSkin.sources.map((source) => source.id)).toContain(
      "nhs-changing-mole",
    );

    const usUrgent = leafById(
      "urgent-chest",
      { urgent_chest_discomfort_now: true },
      adultUS,
    );
    expect(usUrgent.sources.length).toBeGreaterThan(0);
    expect(usUrgent.sources.map((source) => source.id)).toContain(
      "us-911-emergency-assistance",
    );
  });

  test("uses evidence tiers and sources that match the shipped route claims", () => {
    const byId = new Map(riskRules.map((rule) => [rule.id, rule]));
    const adolescentSupport = byId.get("adolescent-substance-support");
    const adolescentSafety = byId.get("adolescent-substance-safety-support");
    const adolescentPregnancy = byId.get(
      "urgent-adolescent-pregnancy-safety",
    );
    const psychedelic = byId.get("psychedelic-aftereffect-review");
    const researchSource = byId.get("research-product-source-review");
    const researchReaction = byId.get("research-product-condition-review");
    const researchStorage = byId.get("research-product-storage-review");

    expect(adolescentSupport?.sourceIds).not.toContain("cdcYrbs");
    expect(adolescentSupport?.sourceIds).toEqual(
      expect.arrayContaining([
        "whoAdolescentFriendlyServices",
        "samhsaYouthSubstanceSupport",
      ]),
    );
    expect(adolescentSafety?.sourceIds).not.toContain("cdcYrbs");
    expect(adolescentSafety?.sourceIds).toContain("whoBasicEmergencyCare");
    expect(adolescentPregnancy?.sourceIds).toContain(
      "whoPregnancyHealthServices",
    );
    expect(psychedelic).toEqual(
      expect.objectContaining({
        evidenceTier: "evidence-limited-association",
        urgency: "support",
      }),
    );
    expect(researchSource?.sourceIds).toEqual(["fdaUnapprovedDrugs"]);
    expect(researchReaction?.sourceIds).toEqual(["fdaProductProblems"]);
    expect(researchReaction?.evidenceTier).toBe("evidence-limited-association");
    expect(researchReaction?.sourceIds).not.toContain("cdcInjectionSafety");
    expect(researchReaction?.sourceIds).not.toContain("fdaCompoundedRisks");
    expect(researchStorage?.sourceIds).toEqual(["fdaMedicationStorage"]);
    expect(researchStorage?.evidenceTier).toBe("evidence-limited-association");
    expect(researchSource?.sourceIds).not.toEqual(
      expect.arrayContaining(["fdaUnapprovedGlp1", "fdaCompoundedSemaglutide"]),
    );
    expect(researchReaction?.sourceIds).not.toEqual(
      expect.arrayContaining(["fdaUnapprovedGlp1", "fdaCompoundedSemaglutide"]),
    );
  });

  test("keeps public wellness output informational without prompt-review triage", () => {
    expect(
      evaluateRisks({ breathlessness_activity: true }, adultUS, publicWellnessPolicy),
    ).toEqual([]);
    expect(
      evaluateRisks({ usual_sleep_hours: 6 }, adultUS, publicWellnessPolicy).map(
        (leaf) => leaf.id,
      ),
    ).toContain("adult-short-sleep");
  });
});

describe("strict emergency routing", () => {
  test.each(
    riskRules
      .filter((rule) => rule.urgency === "urgent")
      .flatMap((rule) =>
        [
          ["US", "911", "us-911-emergency-assistance"],
          ["GB", "999", "nhs-when-to-call-999"],
          ["CH", "144", "swiss-emergency-numbers"],
          ["OTHER", "local emergency service", "who-basic-emergency-care"],
        ].map(([countryCode, expectedCopy, expectedSourceId]) => [
          rule.id,
          countryCode,
          rule,
          expectedCopy,
          expectedSourceId,
        ] as const),
      ),
  )(
    "keeps operational copy and evidence coherent for %s in %s",
    (_ruleId, countryCode, rule, expectedCopy, expectedSourceId) => {
      const leaf = evaluateRisks(
        satisfyingAnswers(rule.condition),
        profileForRule(rule, countryCode),
        prototypePolicy,
      ).find((candidate) => candidate.ruleId === rule.id);

      expect(leaf, rule.id).toBeDefined();
      expect(leaf?.copy.toLowerCase()).toContain(expectedCopy.toLowerCase());
      expect(leaf?.copy).not.toMatch(/drive yourself/i);
      expect(leaf?.sources.map((source) => source.id)).toContain(expectedSourceId);
      if (countryCode === "OTHER") {
        expect(leaf?.copy).not.toMatch(/\b(?:911|999|144|145)\b/);
      }
    },
  );

  test.each([
    ["urgent_chest_discomfort_now", "urgent-chest"],
    ["urgent_breathing_now", "urgent-breathing"],
    ["urgent_stroke_signs_now", "urgent-stroke"],
    ["urgent_severe_allergy_now", "urgent-severe-allergy"],
    ["urgent_overdose_poisoning_now", "urgent-overdose-poisoning"],
    ["urgent_severe_bleeding_now", "urgent-severe-bleeding"],
    ["urgent_self_harm_now", "urgent-self-harm"],
  ] as const)("routes %s only for the boolean true", (questionId, expectedLeafId) => {
    expect(leafIds({ [questionId]: true })).toContain(expectedLeafId);

    for (const value of [false, "unsure", null, "true", 1] as const) {
      expect(leafIds({ [questionId]: value })).not.toContain(expectedLeafId);
    }
    expect(leafIds({})).not.toContain(expectedLeafId);
  });

  test("routes a legacy self-harm answer even for a profile below the current question age", () => {
    const leaf = leafById(
      "urgent-self-harm",
      { urgent_self_harm_now: true },
      { age: 11, countryCode: "US", assistedMinor: true },
    );

    expect(leaf.urgency).toBe("urgent");
    expect(leaf.copy).toMatch(/911/);
    expect(leaf.copy).toMatch(/988/);
  });

  test("routes an adolescent current pregnancy or safeguarding concern only behind its gate", () => {
    const profile = { age: 15, countryCode: "GB" };
    const leaf = leafById(
      "urgent-adolescent-pregnancy-safety",
      {
        pregnancy_relevant: true,
        adolescent_pregnancy_urgent_safety: true,
      },
      profile,
    );

    expect(leaf.urgency).toBe("urgent");
    expect(leaf.copy).toMatch(/999/);
    expect(leaf.copy).toMatch(/urgent.*pregnancy|safeguarding/i);
    expect(
      leafIds(
        {
          pregnancy_relevant: true,
          adolescent_pregnancy_urgent_safety: true,
        },
        profile,
      ),
    ).toEqual([
      "urgent-adolescent-pregnancy-safety",
      "minor-pregnancy-support",
    ]);

    for (const gate of [false, "unsure", null] as const) {
      expect(
        leafIds(
          {
            pregnancy_relevant: gate,
            adolescent_pregnancy_urgent_safety: true,
          },
          profile,
        ),
      ).not.toContain("urgent-adolescent-pregnancy-safety");
    }
    expect(
      leafIds({ adolescent_pregnancy_urgent_safety: true }, profile),
    ).not.toContain("urgent-adolescent-pregnancy-safety");
    for (const safetyAnswer of [false, "unsure", null, "true", 1] as const) {
      expect(
        leafIds(
          {
            pregnancy_relevant: true,
            adolescent_pregnancy_urgent_safety: safetyAnswer,
          },
          profile,
        ),
      ).not.toContain("urgent-adolescent-pregnancy-safety");
    }
  });

  test.each([
    [adultUS, "911", "us-911-emergency-assistance"],
    [adultGB, "999", "nhs-chest-pain"],
    [adultCH, "144", "swiss-emergency-numbers"],
    [{ age: 35, countryCode: "OTHER" }, "local emergency service", "who-basic-emergency-care"],
  ] as const)("keeps emergency copy and operational evidence coherent for %#", (profile, expected, expectedSource) => {
    const leaf = leafById("urgent-chest", { urgent_chest_discomfort_now: true }, profile);
    expect(leaf.copy.toLowerCase()).toContain(expected.toLowerCase());
    expect(leaf.sources.map((source) => source.id)).toContain(expectedSource);
    expect(leaf.copy).not.toMatch(/drive yourself/i);
    if (profile.countryCode === "OTHER") {
      expect(leaf.copy).not.toMatch(/\b(?:911|999|144|145)\b/);
    }
  });

  test("adds Swiss poison information only to the poisoning route", () => {
    const poisoning = leafById(
      "urgent-overdose-poisoning",
      { urgent_overdose_poisoning_now: true },
      adultCH,
    );
    const chest = leafById("urgent-chest", { urgent_chest_discomfort_now: true }, adultCH);

    expect(poisoning.copy).toMatch(/145/);
    expect(poisoning.copy).toMatch(/144/);
    expect(chest.copy).toMatch(/144/);
    expect(chest.copy).not.toMatch(/145/);
  });

  test("retains a semantically distinct activity-breathlessness review beside urgent action", () => {
    const leaves = evaluateRisks(
      { urgent_breathing_now: true, breathlessness_activity: true },
      adultUS,
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "urgent-breathing",
      "breathlessness-review",
    ]);
  });

  test("keeps medicine context separate from a direct urgent symptom route", () => {
    const leaves = evaluateRisks(
      {
        urgent_chest_discomfort_now: true,
        uses_minoxidil: true,
        minoxidil_detail_route_product: "oral",
        minoxidil_detail_cardiac_symptoms: ["chest"],
      },
      adultUS,
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "urgent-chest",
      "oral-minoxidil-symptom-review",
    ]);
    expect(leaves[0].factors).toEqual([
      "Confirmed new or severe chest discomfort now",
    ]);
    expect(leaves[1].sources.map((source) => source.id)).toContain(
      "fda-oral-minoxidil",
    );
  });

  test("merges only explicitly equivalent chest and breathing emergency actions", () => {
    const leaves = evaluateRisks(
      {
        urgent_chest_discomfort_now: true,
        urgent_breathing_now: true,
      },
      adultUS,
      prototypePolicy,
    );

    expect(leaves).toHaveLength(1);
    expect(leaves[0].id).toBe("urgent-chest");
    expect(leaves[0].factors).toEqual([
      "Confirmed new or severe chest discomfort now",
      "Confirmed severe breathing difficulty now",
    ]);
  });

  test("keeps chest, breathing, and medicine contexts deterministic without arbitrary merging", () => {
    const entries = [
      ["urgent_chest_discomfort_now", true],
      ["urgent_breathing_now", true],
      ["uses_minoxidil", true],
      ["minoxidil_detail_route_product", "oral"],
      ["minoxidil_detail_cardiac_symptoms", ["chest"]],
    ] as const;
    const forward = Object.fromEntries(entries) as AnswerMap;
    const reverse = Object.fromEntries([...entries].reverse()) as AnswerMap;
    const expectedIds = ["urgent-chest", "oral-minoxidil-symptom-review"];

    expect(evaluateRisks(forward, adultUS, prototypePolicy).map((leaf) => leaf.id)).toEqual(expectedIds);
    expect(evaluateRisks(reverse, adultUS, prototypePolicy)).toEqual(
      evaluateRisks(forward, adultUS, prototypePolicy),
    );
  });

  test("preserves self-harm and poisoning instructions as separate emergency contexts", () => {
    const leaves = evaluateRisks(
      { urgent_self_harm_now: true, urgent_overdose_poisoning_now: true },
      adultCH,
      prototypePolicy,
    );
    const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]));

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "urgent-self-harm",
      "urgent-overdose-poisoning",
    ]);
    expect(byId.get("urgent-overdose-poisoning")?.copy).toMatch(/145|package/i);
    expect(byId.get("urgent-self-harm")?.copy).toMatch(/trusted person|stay.*with/i);
  });

  test("retains semantically distinct same-urgency medicine and substance leaves", () => {
    const answers = {
      uses_minoxidil: true,
      minoxidil_detail_route_product: "oral",
      minoxidil_detail_cardiac_symptoms: ["chest"],
      uses_anabolic_steroids: true,
      anabolic_detail_symptoms: ["chest_breath"],
      uses_nonmedical_stimulants: true,
      stimulant_detail_symptoms: true,
    } as const;
    const leaves = evaluateRisks(answers, adultUS, prototypePolicy);
    const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]));

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "anabolic-cardiorespiratory-review",
      "stimulant-symptom-review",
      "oral-minoxidil-symptom-review",
    ].sort((left, right) => {
      const leftTitle = byId.get(left)?.title ?? "";
      const rightTitle = byId.get(right)?.title ?? "";
      return leftTitle.localeCompare(rightTitle) || left.localeCompare(right);
    }));
    expect(byId.get("oral-minoxidil-symptom-review")?.sources.map((source) => source.id)).toEqual([
      "fda-oral-minoxidil",
    ]);
    expect(byId.get("anabolic-cardiorespiratory-review")?.sources.map((source) => source.id)).toEqual([
      "fda-bodybuilding-products",
      "fda-sarms-warning",
    ]);
    expect(byId.get("stimulant-symptom-review")?.sources.map((source) => source.id)).toEqual([
      "fda-stimulant-misuse",
      "cdc-stimulant-overdose",
    ]);
    expect(byId.get("oral-minoxidil-symptom-review")?.factors).not.toContain(
      "Current anabolic, SARM, or steroid-like product use",
    );
    expect(byId.get("anabolic-cardiorespiratory-review")?.factors).not.toContain(
      "Current minoxidil use",
    );
    expect(byId.get("stimulant-symptom-review")?.title).toMatch(/stimulant/i);
  });

  test("keeps urgent breathing action and medicine context as distinct leaves", () => {
    const leaves = evaluateRisks(
      {
        urgent_breathing_now: true,
        uses_minoxidil: true,
        minoxidil_detail_route_product: "oral",
        minoxidil_detail_cardiac_symptoms: ["breath"],
      },
      adultUS,
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "urgent-breathing",
      "oral-minoxidil-symptom-review",
    ]);
    expect(leaves[0].factors).toEqual([
      "Confirmed severe breathing difficulty now",
    ]);
    expect(leaves[1].factors).toEqual(
      expect.arrayContaining([
        "Current minoxidil use",
        "Oral minoxidil route reported",
        "Cardiovascular symptoms reported while using it",
      ]),
    );
  });

  test("produces deterministic semantic ordering independent of answer insertion order", () => {
    const entries = [
      ["uses_minoxidil", true],
      ["minoxidil_detail_route_product", "oral"],
      ["minoxidil_detail_cardiac_symptoms", ["chest"]],
      ["uses_anabolic_steroids", true],
      ["anabolic_detail_symptoms", ["chest_breath"]],
      ["uses_nonmedical_stimulants", true],
      ["stimulant_detail_symptoms", true],
    ] as const;
    const forward = Object.fromEntries(entries) as AnswerMap;
    const reverse = Object.fromEntries([...entries].reverse()) as AnswerMap;

    expect(evaluateRisks(forward, adultUS, prototypePolicy)).toEqual(
      evaluateRisks(reverse, adultUS, prototypePolicy),
    );
  });

  test("retains distinct neurologic and personal-safety review contexts", () => {
    const neurologic = evaluateRisks(
      {
        urgent_stroke_signs_now: true,
        uses_anabolic_steroids: true,
        anabolic_detail_symptoms: ["neurologic"],
      },
      adultUS,
      prototypePolicy,
    );
    expect(neurologic.map((leaf) => leaf.id)).toEqual([
      "urgent-stroke",
      "anabolic-neurologic-review",
    ]);

    const personalSafety = evaluateRisks(
      {
        urgent_self_harm_now: true,
        mood_low_frequency: "nearly_every_day",
      },
      adultUS,
      prototypePolicy,
    );
    expect(personalSafety.map((leaf) => leaf.id)).toEqual([
      "urgent-self-harm",
      "low-mood-support",
    ]);
  });

  test("qualifies severe-bleeding first aid when an object may be embedded", () => {
    const leaf = leafById("urgent-severe-bleeding", {
      urgent_severe_bleeding_now: true,
    });

    expect(leaf.copy).toMatch(/if no object is embedded.*direct pressure/i);
    expect(leaf.copy).toMatch(/do not remove an embedded object/i);
  });
});

describe("structured qualitative rules", () => {
  test("rejects contradictory none-plus-positive medication symptom bags", () => {
    expect(
      leafIds({
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_current_symptoms: ["none", "allergy"],
      }),
    ).not.toContain("glp1-severe-allergy");

    expect(
      leafIds({
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_current_symptoms: ["allergy"],
      }),
    ).toContain("glp1-severe-allergy");
  });

  test.each([false, "unsure", null, undefined] as const)(
    "requires the exact medication gate instead of %s",
    (gate) => {
      const answers: Record<string, unknown> = {
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_current_symptoms: ["allergy"],
      };
      if (gate !== undefined) answers.uses_glp1 = gate;

      expect(leafIds(answers as AnswerMap)).not.toContain("glp1-severe-allergy");
    },
  );

  test("does not parse free text or printed laboratory strings", () => {
    expect(
      evaluateRisks(
        {
          med_detail_names: "Chest pain and overdose",
          corticosteroid_detail_stop_plan: "Stopped suddenly and fainted",
          lab_value_hba1c: "14.0 % (4.0 - 5.6) H",
          lab_value_egfr: "5 mL/min/1.73m2 L",
        },
        adultUS,
        prototypePolicy,
      ),
    ).toEqual([]);
  });

  test("routes a declared sexual pressure, consent, or safety worry to support", () => {
    const adolescentProfile = { age: 15, countryCode: "GB" };
    const leaf = leafById(
      "sexual-safety-support",
      { sexual_contact_safety: true },
      adolescentProfile,
    );

    expect(leaf.urgency).toBe("support");
    expect(leaf.applicability).toEqual({ minAge: 13, countries: "all" });
    expect(leaf.factors).toContain(
      "Worry about pressure, consent, or safety in a sexual situation",
    );
    expect(leaf.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["nhs-sexual-assault-support"]),
    );
    const globalLeaf = leafById(
      "sexual-safety-support",
      { sexual_contact_safety: true },
      { age: 15, countryCode: "CH" },
    );
    expect(globalLeaf.sources).toContainEqual(
      expect.objectContaining({
        id: "who-child-adolescent-sexual-abuse",
        title:
          "Responding to children and adolescents who have been sexually abused: WHO clinical guidelines",
        url: "https://www.who.int/publications/i/item/9789241550147",
        jurisdictions: "all",
        applicability: { maxAge: 17, countries: "all" },
      }),
    );
    expect(globalLeaf.sources.map((source) => source.id)).not.toContain(
      "who-sexual-violence-support",
    );

    const adultLeaf = leafById(
      "sexual-safety-support",
      { sexual_contact_safety: true },
      adultCH,
    );
    expect(adultLeaf.sources.map((source) => source.id)).not.toContain(
      "who-child-adolescent-sexual-abuse",
    );

    for (const value of [false, "unsure", null, "true", 1] as const) {
      expect(
        leafIds({ sexual_contact_safety: value }, adolescentProfile),
      ).not.toContain("sexual-safety-support");
    }
  });

  test("retains adolescent sexual-safety support alongside pregnancy support", () => {
    const ids = leafIds(
      {
        sexual_contact_safety: true,
        pregnancy_relevant: true,
        adolescent_pregnancy_urgent_safety: false,
      },
      { age: 15, countryCode: "GB" },
    );

    expect(ids).toEqual(
      expect.arrayContaining([
        "sexual-safety-support",
        "minor-pregnancy-support",
      ]),
    );
  });

  test("routes each gated adult pregnancy declaration without diagnosing or changing medicines", () => {
    const answers = {
      pregnancy_relevant: true,
      pregnancy_new_concern: true,
      pregnancy_care_access: false,
      pregnancy_medication_review: "no",
      pregnancy_feeling_safe: false,
    } as const;
    const leaves = evaluateRisks(answers, adultGB, prototypePolicy);
    const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]));

    expect([...byId.keys()]).toEqual(
      expect.arrayContaining([
        "pregnancy-new-concern-review",
        "pregnancy-care-safety-support",
        "pregnancy-medicine-review",
      ]),
    );
    expect(byId.get("pregnancy-new-concern-review")?.urgency).toBe(
      "prompt-review",
    );
    expect(byId.get("pregnancy-care-safety-support")?.urgency).toBe("support");
    expect(byId.get("pregnancy-care-safety-support")?.factors).toEqual(
      expect.arrayContaining([
        "No current access to a maternity or pregnancy-care professional",
        "Does not currently feel safe and supported",
      ]),
    );
    expect(byId.get("pregnancy-medicine-review")?.urgency).toBe(
      "prompt-review",
    );
    expect(byId.get("pregnancy-medicine-review")?.sources.map((source) => source.id)).toContain(
      "nhs-pregnancy-medicines",
    );
    for (const leaf of byId.values()) {
      expect(leaf.copy).not.toMatch(/you have|caused by/i);
      expect(leaf.copy).not.toMatch(
        /\b(?:start|stop|change)\b.*\b(?:medicine|dose|treatment)\b/i,
      );
    }
  });

  test.each(["CH", "GB", "OTHER"] as const)(
    "cites direct postpartum health-service guidance for new concerns in %s",
    (countryCode) => {
      const leaf = leafById(
        "pregnancy-new-concern-review",
        { pregnancy_relevant: true, pregnancy_new_concern: true },
        { age: 35, countryCode },
      );

      expect(leaf.sources).toContainEqual(
        expect.objectContaining({
          id: "who-postpartum-health-services",
          title: "Getting the health services you need: after childbirth",
          url: "https://www.who.int/tools/your-life-your-health/life-phase/pregnancy--birth-and-after-childbirth/getting-the-health-services-you-need-after-childbirth",
        }),
      );
    },
  );

  test("keeps pregnancy medicine review sourced outside the United Kingdom", () => {
    const answers = {
      pregnancy_relevant: true,
      pregnancy_medication_review: "planned",
    } as const;
    const leaf = leafById("pregnancy-medicine-review", answers);

    expect(leaf.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        "cdc-medicine-pregnancy",
        "who-pregnancy-medicine-safety",
        "who-medication-without-harm",
      ]),
    );
    expect(leaf.sources.map((source) => source.id)).not.toContain(
      "nhs-pregnancy-medicines",
    );
    expect(leaf.sources.map((source) => source.id)).not.toContain(
      "who-pregnancy-health-services",
    );

    const chLeaf = leafById("pregnancy-medicine-review", answers, adultCH);
    expect(chLeaf.sources.map((source) => source.id)).toEqual([
      "who-pregnancy-medicine-safety",
      "who-medication-without-harm",
    ]);
  });

  test("rejects stale adult pregnancy details without the exact pregnancy gate", () => {
    const details = {
      pregnancy_new_concern: true,
      pregnancy_care_access: false,
      pregnancy_medication_review: "no",
      pregnancy_feeling_safe: false,
    } as const;
    const pregnancyLeafIds = [
      "pregnancy-new-concern-review",
      "pregnancy-care-safety-support",
      "pregnancy-medicine-review",
    ];

    for (const gate of [undefined, false, "unsure", null] as const) {
      const answers: Record<string, AnswerValue> = { ...details };
      if (gate !== undefined) answers.pregnancy_relevant = gate;
      const ids = leafIds(answers, adultGB);

      for (const id of pregnancyLeafIds) expect(ids).not.toContain(id);
    }
  });

  test("routes structured steroid omission symptoms while continuing to ignore free text", () => {
    const structured = leafById("systemic-steroid-omission-review", {
      uses_systemic_corticosteroids: true,
      corticosteroid_detail_missed_or_stopped: true,
      corticosteroid_detail_omission_symptoms: true,
      corticosteroid_detail_stop_plan: "Stopped suddenly and fainted",
    });

    expect(structured.urgency).toBe("prompt-review");
    expect(structured.evidenceTier).toBe("authoritative-safety");
    expect(structured.sources.map((source) => source.id)).toEqual(
      [
        "fda-prednisone-label",
        "ese-endocrine-society-glucocorticoid-adrenal-insufficiency",
      ],
    );
    const gbStructured = leafById(
      "systemic-steroid-omission-review",
      {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: true,
        corticosteroid_detail_omission_symptoms: true,
      },
      adultGB,
    );
    expect(gbStructured.sources.map((source) => source.id)).toEqual([
      "mhra-steroid-emergency-card",
      "ese-endocrine-society-glucocorticoid-adrenal-insufficiency",
    ]);
    const chStructured = leafById(
      "systemic-steroid-omission-review",
      {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: true,
        corticosteroid_detail_omission_symptoms: true,
      },
      adultCH,
    );
    expect(chStructured.sources.map((source) => source.id)).toEqual([
      "ese-endocrine-society-glucocorticoid-adrenal-insufficiency",
    ]);
    expect(structured.copy).not.toMatch(/you have|caused by/i);
    expect(
      leafIds({
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_stop_plan: "Stopped suddenly and fainted",
      }),
    ).not.toContain("systemic-steroid-omission-review");

    for (const answers of [
      {
        corticosteroid_detail_missed_or_stopped: true,
        corticosteroid_detail_omission_symptoms: true,
      },
      {
        uses_systemic_corticosteroids: false,
        corticosteroid_detail_missed_or_stopped: true,
        corticosteroid_detail_omission_symptoms: true,
      },
      {
        uses_systemic_corticosteroids: true,
        corticosteroid_detail_missed_or_stopped: false,
        corticosteroid_detail_omission_symptoms: true,
      },
    ] as const) {
      expect(leafIds(answers)).not.toContain("systemic-steroid-omission-review");
    }
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "6", null] as const)(
    "treats invalid short-sleep input %s as missing",
    (value) => {
      expect(leafIds({ usual_sleep_hours: value as never })).not.toContain(
        "adult-short-sleep",
      );
    },
  );

  test("creates a sourced adult short-sleep leaf with explicit missing context", () => {
    const leaf = leafById("adult-short-sleep", { usual_sleep_hours: 6 });

    expect(leaf.factors).toContain("Usually sleeps under 7 hours in 24 hours");
    expect(leaf.missingInputs).toContain("sleep_daytime_sleepiness");
    expect(leaf.sources.length).toBeGreaterThan(0);
    expect(leaf.applicability.minAge).toBe(18);
    expect(leaf.applicability.countries).toBe("all");
  });

  test("reports a finite but out-of-range numeric input as missing", () => {
    const leaf = leafById("adult-movement-pattern", {
      weekly_moderate_activity_minutes: -1,
      movement_strength_days: 0,
    });

    expect(leaf.factors).toEqual([
      "Reports muscle-strengthening activity on fewer than 2 days per week",
    ]);
    expect(leaf.missingInputs).toContain("weekly_moderate_activity_minutes");
  });

  test("groups correlated low-mood inputs into one leaf with multiple factors", () => {
    const leaves = evaluateRisks(
      {
        low_interest_frequency: "nearly_every_day",
        mood_low_frequency: "more_than_half",
      },
      adultUS,
      prototypePolicy,
    ).filter((leaf) => leaf.group === "mental-wellbeing");

    expect(leaves).toHaveLength(1);
    expect(leaves[0].factors).toHaveLength(2);
  });

  test("keeps medication copy non-diagnostic and free of dose-change directions", () => {
    const leaves = evaluateRisks(
      {
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_current_symptoms: ["abdominal"],
        uses_minoxidil: true,
        minoxidil_detail_route_product: "oral",
        minoxidil_detail_cardiac_symptoms: ["chest"],
      },
      adultUS,
      prototypePolicy,
    );

    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.copy).not.toMatch(/\b(?:start|stop|change)\b.*\b(?:medicine|dose|treatment)\b/i);
      expect(leaf.copy).not.toMatch(/you have|caused by/i);
    }
  });
});

describe("audited medication and substance class routes", () => {
  test.each([
    ["tirzepatide", "dailymed-zepbound-tirzepatide"],
    ["semaglutide", "dailymed-wegovy-semaglutide"],
    ["liraglutide", "dailymed-saxenda-liraglutide"],
    ["dulaglutide", "dailymed-trulicity-dulaglutide"],
  ] as const)(
    "uses only the product-appropriate official label for %s",
    (ingredient, expectedSourceId) => {
      const leaf = leafById("glp1-gastrointestinal-review", {
        uses_glp1: true,
        glp1_detail_active_ingredient: ingredient,
        glp1_detail_current_symptoms: ["abdominal"],
      });
      const labelSourceIds = leaf.sources
        .map((source) => source.id)
        .filter((sourceId) => sourceId.startsWith("dailymed-"));

      expect(labelSourceIds).toEqual([expectedSourceId]);
    },
  );

  test.each([
    [
      "glp1-severe-allergy",
      { glp1_detail_current_symptoms: ["allergy"] },
    ],
    [
      "glp1-gastrointestinal-review",
      { glp1_detail_current_symptoms: ["abdominal"] },
    ],
    [
      "glp1-glucose-symptom-review",
      {
        glp1_detail_glucose_medicines: true,
        glp1_detail_current_symptoms: ["fainting"],
      },
    ],
    [
      "glp1-diabetes-vision-review",
      {
        glp1_detail_indication: "diabetes",
        glp1_detail_current_symptoms: ["vision"],
      },
    ],
    [
      "glp1-history-review",
      { glp1_detail_relevant_history: ["pancreatitis"] },
    ],
    [
      "glp1-pregnancy-procedure-review",
      { glp1_detail_procedure_pregnancy: ["procedure"] },
    ],
  ] as const)(
    "requires a recognized structured ingredient for %s",
    (expectedId, detail) => {
      const base = { uses_glp1: true, ...detail } as AnswerMap;

      expect(leafIds(base)).not.toContain(expectedId);
      expect(
        leafIds({
          ...base,
          glp1_detail_product_source: "Zepbound tirzepatide",
        }),
      ).not.toContain(expectedId);
      expect(
        leafIds({
          ...base,
          glp1_detail_active_ingredient: "other_or_unsure",
        }),
      ).not.toContain(expectedId);
    },
  );

  test("narrows the diabetes-vision route to labels that directly address retinopathy", () => {
    const detail = {
      uses_glp1: true,
      glp1_detail_indication: "diabetes",
      glp1_detail_current_symptoms: ["vision"],
    } as const;

    expect(
      leafIds({ ...detail, glp1_detail_active_ingredient: "liraglutide" }),
    ).not.toContain("glp1-diabetes-vision-review");
    for (const ingredient of ["tirzepatide", "semaglutide", "dulaglutide"] as const) {
      expect(
        leafIds({ ...detail, glp1_detail_active_ingredient: ingredient }),
      ).toContain("glp1-diabetes-vision-review");
    }
  });

  test.each([
    [
      "dailymed-zepbound-tirzepatide",
      "Zepbound (tirzepatide) prescribing information",
      "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=487cd7e7-434c-4925-99fa-aa80b1cc776b&version=38",
    ],
    [
      "dailymed-wegovy-semaglutide",
      "Wegovy (semaglutide) prescribing information",
      "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ee06186f-2aa3-4990-a760-757579d8f77b&version=19",
    ],
    [
      "dailymed-saxenda-liraglutide",
      "Saxenda (liraglutide) prescribing information",
      "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=3946d389-0926-4f77-a708-0acb8153b143&version=22",
    ],
    [
      "dailymed-trulicity-dulaglutide",
      "Trulicity (dulaglutide) prescribing information",
      "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=463050bd-2b1c-40f5-b3c3-0a04bb433309&version=60",
    ],
  ] as const)("registers current official product label %s", (id, title, url) => {
    expect(Object.values(evidenceSources)).toContainEqual(
      expect.objectContaining({ id, title, url, reviewedAt: "2026-08-03" }),
    );
  });

  test.each([
    [
      "GLP-1 fainting with glucose-lowering medicines",
      {
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_glucose_medicines: true,
        glp1_detail_current_symptoms: ["fainting"],
      },
      "glp1-glucose-symptom-review",
    ],
    [
      "GLP-1 vision change in diabetes",
      {
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_indication: "diabetes",
        glp1_detail_current_symptoms: ["vision"],
      },
      "glp1-diabetes-vision-review",
    ],
    [
      "GLP-1 relevant history",
      {
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_relevant_history: ["pancreatitis"],
      },
      "glp1-history-review",
    ],
    [
      "GLP-1 pregnancy or procedure context",
      {
        uses_glp1: true,
        glp1_detail_active_ingredient: "tirzepatide",
        glp1_detail_procedure_pregnancy: ["procedure"],
      },
      "glp1-pregnancy-procedure-review",
    ],
    [
      "isotretinoin safety-program or pregnancy context",
      {
        uses_isotretinoin: true,
        isotretinoin_detail_program_pregnancy: "not_complete",
      },
      "isotretinoin-pregnancy-program-review",
    ],
    [
      "topical minoxidil scalp context",
      {
        uses_minoxidil: true,
        minoxidil_detail_route_product: "topical",
        minoxidil_detail_hair_scalp_context: "one_or_more",
      },
      "topical-minoxidil-scalp-review",
    ],
    [
      "combined oral and topical minoxidil scalp context",
      {
        uses_minoxidil: true,
        minoxidil_detail_route_product: "both",
        minoxidil_detail_hair_scalp_context: "one_or_more",
      },
      "topical-minoxidil-scalp-review",
    ],
    [
      "topical minoxidil symptoms",
      {
        uses_minoxidil: true,
        minoxidil_detail_route_product: "topical",
        minoxidil_detail_cardiac_symptoms: ["heartbeat"],
      },
      "topical-minoxidil-symptom-review",
    ],
    [
      "cannabis unwanted effects",
      { uses_cannabis: true, cannabis_detail_effects: true },
      "cannabis-unwanted-effect-review",
    ],
    [
      "stimulant symptoms",
      { uses_nonmedical_stimulants: true, stimulant_detail_symptoms: true },
      "stimulant-symptom-review",
    ],
    [
      "opioid and sedative mixing",
      { uses_nonmedical_opioids: true, opioid_detail_mixing: true },
      "opioid-mixing-safety-review",
    ],
    [
      "unexpected recreational-drug effects",
      {
        uses_other_recreational_drugs: true,
        recreational_detail_unwanted_effect: true,
      },
      "recreational-drug-effect-review",
    ],
  ] as const)("routes %s to cautious professional review", (_name, answers, expectedId) => {
    const leaf = leafById(expectedId, answers as unknown as AnswerMap);

    expect(leaf.urgency).toBe("prompt-review");
    expect(leaf.copy).not.toMatch(/call .*emergency|you have|caused by/i);
    expect(leaf.sources.length).toBeGreaterThan(0);
  });

  test("keeps the NIDA psychedelic route evidence-limited and supportive", () => {
    const leaf = leafById("psychedelic-aftereffect-review", {
      uses_psychedelics: true,
      psychedelic_detail_aftereffects: true,
    });

    expect(leaf.evidenceTier).toBe("evidence-limited-association");
    expect(leaf.urgency).toBe("support");
    expect(leaf.copy).toMatch(/reported/i);
    expect(leaf.copy).not.toMatch(/call .*emergency|you have|caused by/i);
  });

  test.each(["head_vision", "abdominal", "rash"] as const)(
    "routes structured isotretinoin physical symptom %s without a diagnosis",
    (symptom) => {
      const leaf = leafById("isotretinoin-physical-symptom-review", {
        uses_isotretinoin: true,
        isotretinoin_detail_symptoms: [symptom],
      });

      expect(leaf.urgency).toBe("prompt-review");
      expect(leaf.copy).not.toMatch(/you have|caused by/i);
    },
  );

  test("keeps temporally ambiguous medication symptoms out of call-now routing", () => {
    const glpAllergy = leafById("glp1-severe-allergy", {
      uses_glp1: true,
      glp1_detail_active_ingredient: "tirzepatide",
      glp1_detail_current_symptoms: ["allergy"],
    });
    const researchSystemic = leafById("research-product-condition-review", {
      uses_research_peptides: true,
      research_detail_storage_symptoms: ["systemic"],
    });
    const stimulant = leafById("stimulant-symptom-review", {
      uses_nonmedical_stimulants: true,
      stimulant_detail_symptoms: true,
    });

    for (const leaf of [glpAllergy, researchSystemic, stimulant]) {
      expect(leaf.urgency).toBe("prompt-review");
      expect(leaf.copy).not.toMatch(/call .*emergency/i);
    }
  });

  test.each(["warm", "damaged"] as const)(
    "routes research-product storage concern %s to evidence-limited pharmacist review",
    (concern) => {
      const leaf = leafById("research-product-storage-review", {
        uses_research_peptides: true,
        research_detail_storage_symptoms: [concern],
      });

      expect(leaf.urgency).toBe("prompt-review");
      expect(leaf.evidenceTier).toBe("evidence-limited-association");
      expect(leaf.sources.map((source) => source.id)).toEqual([
        "fda-medicine-storage",
      ]);
      expect(leaf.copy).toMatch(/label|pharmacist|manufacturer/i);
    },
  );

  test.each(["site", "systemic"] as const)(
    "routes research-product reaction concern %s without injection-practice overclaiming",
    (concern) => {
      const leaf = leafById("research-product-condition-review", {
        uses_research_peptides: true,
        research_detail_storage_symptoms: [concern],
      });

      expect(leaf.urgency).toBe("prompt-review");
      expect(leaf.evidenceTier).toBe("evidence-limited-association");
      expect(leaf.sources.map((source) => source.id)).not.toContain(
        "cdc-injection-safety",
      );
      expect(leaf.copy).not.toMatch(/storage|warm|damaged/i);
    },
  );

  test("does not treat every unapproved product as a compounded product", () => {
    const leaf = leafById("research-product-source-review", {
      uses_research_peptides: true,
      research_detail_source: "online",
    });

    expect(leaf.sources.map((source) => source.id)).toEqual([
      "fda-unapproved-drugs",
    ]);
    expect(leaf.copy).not.toMatch(/compound/i);
  });

  test.each([
    ["chest_breath", "anabolic-cardiorespiratory-review"],
    ["leg_swelling", "anabolic-leg-symptom-review"],
    ["neurologic", "anabolic-neurologic-review"],
    ["jaundice", "anabolic-liver-symptom-review"],
    ["mood", "anabolic-mood-review"],
  ] as const)("routes structured AAS/SARM symptom %s cautiously", (symptom, expectedId) => {
    const leaf = leafById(expectedId, {
      uses_anabolic_steroids: true,
      anabolic_detail_symptoms: [symptom],
    });

    expect(leaf.urgency).toBe("prompt-review");
    expect(leaf.copy).not.toMatch(/call .*emergency|you have|caused by/i);
  });

  test("keeps isotretinoin mood context separate from a direct self-harm route", () => {
    const review = leafById("isotretinoin-mood-review", {
      uses_isotretinoin: true,
      isotretinoin_detail_symptoms: ["mood"],
    });
    expect(review.urgency).toBe("prompt-review");

    const withImmediateSafety = evaluateRisks(
      {
        uses_isotretinoin: true,
        isotretinoin_detail_symptoms: ["mood"],
        urgent_self_harm_now: true,
      },
      adultUS,
      prototypePolicy,
    );
    expect(withImmediateSafety.map((leaf) => leaf.id)).toContain("urgent-self-harm");
    expect(withImmediateSafety.map((leaf) => leaf.id)).toContain(
      "isotretinoin-mood-review",
    );
  });

  test("accepts pregnancy context only behind the exact isotretinoin gate", () => {
    expect(
      leafIds({ uses_isotretinoin: true, pregnancy_relevant: true }),
    ).toContain("isotretinoin-pregnancy-program-review");

    for (const gate of [false, "unsure", null] as const) {
      expect(
        leafIds({ uses_isotretinoin: gate, pregnancy_relevant: true }),
      ).not.toContain("isotretinoin-pregnancy-program-review");
    }
  });

  test.each([
    [
      "uses_cannabis",
      { cannabis_detail_effects: true },
      "cannabis-unwanted-effect-review",
    ],
    [
      "uses_nonmedical_stimulants",
      { stimulant_detail_symptoms: true },
      "stimulant-symptom-review",
    ],
    [
      "uses_nonmedical_opioids",
      { opioid_detail_mixing: true },
      "opioid-mixing-safety-review",
    ],
    [
      "uses_psychedelics",
      { psychedelic_detail_aftereffects: true },
      "psychedelic-aftereffect-review",
    ],
    [
      "uses_other_recreational_drugs",
      { recreational_detail_unwanted_effect: true },
      "recreational-drug-effect-review",
    ],
  ] as const)("requires exact true for the %s class gate", (gateId, detail, expectedId) => {
    expect(leafIds({ ...detail, [gateId]: true })).toContain(expectedId);

    for (const invalidGate of [false, "unsure", null] as const) {
      expect(leafIds({ ...detail, [gateId]: invalidGate })).not.toContain(expectedId);
    }
    expect(leafIds(detail)).not.toContain(expectedId);
  });

  test.each([
    [
      "uses_isotretinoin",
      { isotretinoin_detail_symptoms: ["rash"] },
      "isotretinoin-physical-symptom-review",
    ],
    [
      "uses_minoxidil",
      {
        minoxidil_detail_route_product: "topical",
        minoxidil_detail_cardiac_symptoms: ["heartbeat"],
      },
      "topical-minoxidil-symptom-review",
    ],
    [
      "uses_research_peptides",
      { research_detail_storage_symptoms: ["systemic"] },
      "research-product-condition-review",
    ],
    [
      "uses_anabolic_steroids",
      { anabolic_detail_symptoms: ["neurologic"] },
      "anabolic-neurologic-review",
    ],
  ] as const)("rejects non-boolean values at the %s medication gate", (gateId, detail, expectedId) => {
    expect(leafIds({ ...detail, [gateId]: true })).toContain(expectedId);
    for (const invalidGate of [false, "unsure", null] as const) {
      expect(leafIds({ ...detail, [gateId]: invalidGate })).not.toContain(expectedId);
    }
    expect(leafIds(detail)).not.toContain(expectedId);
  });

  test("offers only a grouped support leaf for an adolescent substance-support choice", () => {
    const leaves = evaluateRisks(
      {
        adolescent_cannabis_support: "find_service",
        uses_cannabis: true,
        cannabis_detail_effects: true,
      },
      { age: 15, countryCode: "GB" },
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toEqual(["adolescent-substance-support"]);
    expect(leaves[0].urgency).toBe("support");
  });

  test("excludes a stale adolescent support factor whose own upstream gate is false", () => {
    const leaf = leafById(
      "adolescent-substance-support",
      {
        current_tobacco_nicotine: false,
        adolescent_nicotine_support: "find_service",
        uses_cannabis: true,
        adolescent_cannabis_support: "find_service",
      },
      { age: 15, countryCode: "GB" },
    );

    expect(leaf.factors).toEqual([
      "Requested cannabis information or service help",
    ]);
  });

  test.each([
    [{ adolescent_nicotine_support: "find_service" }],
    [{ adolescent_alcohol_support: "general_information" }],
    [{ adolescent_cannabis_support: "find_service" }],
    [{ adolescent_other_drug_support: "general_information" }],
  ] as const)("rejects a stale adolescent support answer without its upstream gate", (answers) => {
    expect(
      evaluateRisks(answers, { age: 15, countryCode: "GB" }, prototypePolicy),
    ).toEqual([]);
  });

  test("keeps an adolescent past-year severe substance event in support-only routing", () => {
    const leaf = leafById(
      "adolescent-substance-safety-support",
      { uses_cannabis: true, adolescent_substance_urgent_safety: true },
      { age: 15, countryCode: "GB" },
    );

    expect(leaf.urgency).toBe("support");
    expect(leaf.copy).not.toMatch(/call .*emergency/i);
    expect(leaf.copy).toMatch(/if .*happening now.*immediate.*emergency/i);
  });

  test.each(["CH", "GB", "OTHER"] as const)(
    "supports adolescent severe substance signals directly outside the US in %s",
    (countryCode) => {
      const leaf = leafById(
        "adolescent-substance-safety-support",
        { uses_cannabis: true, adolescent_substance_urgent_safety: true },
        { age: 15, countryCode },
      );

      expect(leaf.sources.map((source) => source.id)).toContain(
        "who-basic-emergency-care",
      );
      expect(leaf.sources.map((source) => source.id)).toContain(
        "who-adolescent-friendly-services",
      );
    },
  );

  test("rejects a stale adolescent safety answer without any substance gate", () => {
    expect(
      leafIds(
        { adolescent_substance_urgent_safety: true },
        { age: 15, countryCode: "GB" },
      ),
    ).not.toContain("adolescent-substance-safety-support");
  });
});

describe("minor and pregnancy boundaries", () => {
  test("returns no adult threshold or review leaf for a minor", () => {
    const leaves = evaluateRisks(
      {
        usual_sleep_hours: 4,
        weekly_moderate_activity_minutes: 0,
        movement_strength_days: 0,
        diet_added_salt: "daily",
        diagnosed_high_blood_pressure: true,
        alcohol_detail_control_concern: true,
        breathlessness_activity: true,
        sun_changing_mole: true,
      },
      { age: 16, countryCode: "GB" },
      prototypePolicy,
    );

    expect(leaves).toEqual([]);
  });

  test("minor pregnancy support suppresses ordinary leaves but preserves immediate safety", () => {
    const leaves = evaluateRisks(
      {
        pregnancy_relevant: true,
        child_feeling_support: true,
        urgent_breathing_now: true,
        usual_sleep_hours: 4,
      },
      { age: 15, countryCode: "GB" },
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toEqual([
      "urgent-breathing",
      "minor-pregnancy-support",
    ]);
    expect(leaves.every((leaf) => ["urgent", "support"].includes(leaf.urgency))).toBe(true);
    expect(leaves.every((leaf) => leaf.probability === undefined)).toBe(true);
    expect(
      leaves
        .find((leaf) => leaf.id === "minor-pregnancy-support")
        ?.sources.map((source) => source.id),
    ).toContain("who-adolescent-pregnancy");
  });

  test("child feeling support cites child- or adolescent-applicable guidance", () => {
    const leaf = leafById(
      "child-feeling-support",
      { child_feeling_support: true },
      { age: 12, countryCode: "GB", assistedMinor: true },
    );

    expect(leaf.sources.map((source) => source.id)).not.toContain(
      "nice-depression-adults",
    );
  });
});
