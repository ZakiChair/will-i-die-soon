import { describe, expect, test } from "vitest";

import { evidenceSources } from "../data/evidence";
import { questionBank } from "../data/questions";
import { riskRuleGroups, riskRules } from "../data/rules";
import {
  prototypePolicy,
  publicWellnessPolicy,
  regulatedPolicy,
} from "./release-policy";
import {
  assertEvidenceContract,
  evaluateRisks,
  sortRisksForDisplay,
} from "./risk-engine";
import type { AnswerMap, ProfileContext, RiskCondition, RiskLeaf } from "./types";

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

describe("evidence and release contracts", () => {
  test("rejects probability on every non-validated evidence tier", () => {
    expect(() =>
      assertEvidenceContract({
        id: "invalid-probability",
        ruleId: "invalid-probability",
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
        (rule) =>
          rule.inputs.length > 0 &&
          rule.sourceIds.length > 0 &&
          rule.inputs.every(
            (input) => /^[a-z][a-z0-9_]*$/.test(input) && questionIds.has(input),
          ) &&
          rule.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
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

  test.each(["group", "evidenceTier", "urgency", "signal", "applicability"] as const)(
    "rejects a leaf missing required %s metadata",
    (field) => {
      const complete: RiskLeaf = {
        id: "complete",
        ruleId: "complete",
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
    ).toEqual(["urgent-adolescent-pregnancy-safety"]);

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
    [adultUS, "911"],
    [adultGB, "999"],
    [adultCH, "144"],
    [{ age: 35, countryCode: "OTHER" }, "local emergency"],
  ] as const)("uses only the confirmed country for emergency copy", (profile, expected) => {
    const leaf = leafById("urgent-chest", { urgent_chest_discomfort_now: true }, profile);
    expect(leaf.copy.toLowerCase()).toContain(expected.toLowerCase());
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

  test("an urgent signal suppresses a lower-priority duplicate", () => {
    const leaves = evaluateRisks(
      { urgent_breathing_now: true, breathlessness_activity: true },
      adultUS,
      prototypePolicy,
    );

    expect(leaves.map((leaf) => leaf.id)).toContain("urgent-breathing");
    expect(leaves.map((leaf) => leaf.id)).not.toContain("breathlessness-review");
  });

  test("a winning urgent leaf preserves the factors and sources of duplicate routes", () => {
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

    expect(leaves.map((leaf) => leaf.id)).toEqual(["urgent-chest"]);
    expect(leaves[0].factors).toEqual(
      expect.arrayContaining([
        "Confirmed new or severe chest discomfort now",
        "Current minoxidil use",
        "Cardiovascular symptoms reported while using it",
      ]),
    );
    expect(leaves[0].sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["nhs-chest-pain", "fda-oral-minoxidil"]),
    );
  });

  test("deduplicates direct neurologic and personal-safety routes without losing context", () => {
    const neurologic = evaluateRisks(
      {
        urgent_stroke_signs_now: true,
        uses_anabolic_steroids: true,
        anabolic_detail_symptoms: ["neurologic"],
      },
      adultUS,
      prototypePolicy,
    );
    expect(neurologic.map((leaf) => leaf.id)).toEqual(["urgent-stroke"]);
    expect(neurologic[0].factors).toContain(
      "Current anabolic, SARM, or steroid-like product use",
    );

    const personalSafety = evaluateRisks(
      {
        urgent_self_harm_now: true,
        mood_low_frequency: "nearly_every_day",
      },
      adultUS,
      prototypePolicy,
    );
    expect(personalSafety.map((leaf) => leaf.id)).toEqual(["urgent-self-harm"]);
    expect(personalSafety[0].factors).toContain("Frequent low or hopeless mood");
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
        glp1_detail_current_symptoms: ["none", "allergy"],
      }),
    ).not.toContain("glp1-severe-allergy");

    expect(
      leafIds({ uses_glp1: true, glp1_detail_current_symptoms: ["allergy"] }),
    ).toContain("glp1-severe-allergy");
  });

  test.each([false, "unsure", null, undefined] as const)(
    "requires the exact medication gate instead of %s",
    (gate) => {
      const answers: Record<string, unknown> = {
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
    [
      "GLP-1 fainting with glucose-lowering medicines",
      {
        uses_glp1: true,
        glp1_detail_glucose_medicines: true,
        glp1_detail_current_symptoms: ["fainting"],
      },
      "glp1-glucose-symptom-review",
    ],
    [
      "GLP-1 vision change in diabetes",
      {
        uses_glp1: true,
        glp1_detail_indication: "diabetes",
        glp1_detail_current_symptoms: ["vision"],
      },
      "glp1-diabetes-vision-review",
    ],
    [
      "GLP-1 relevant history",
      {
        uses_glp1: true,
        glp1_detail_relevant_history: ["pancreatitis"],
      },
      "glp1-history-review",
    ],
    [
      "GLP-1 pregnancy or procedure context",
      {
        uses_glp1: true,
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
      "persistent psychedelic after-effects",
      { uses_psychedelics: true, psychedelic_detail_aftereffects: true },
      "psychedelic-aftereffect-review",
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

  test.each(["warm", "damaged", "site", "systemic"] as const)(
    "routes research-product concern %s only to professional review",
    (concern) => {
      const leaf = leafById("research-product-condition-review", {
        uses_research_peptides: true,
        research_detail_storage_symptoms: [concern],
      });

      expect(leaf.urgency).toBe("prompt-review");
    },
  );

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

  test("groups isotretinoin mood context and lets a direct current self-harm route win", () => {
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
    expect(withImmediateSafety.map((leaf) => leaf.id)).not.toContain(
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
  });

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
