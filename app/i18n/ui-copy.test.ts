import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { riskRules } from "../data/rules";
import { LAB_MARKERS } from "../lib/labs";
import type { HealthDomain } from "../lib/types";
import { protectiveRootLabelsFr } from "./score-copy-fr";
import { uiCopy, uiCopyKeys, type UiCopyKey } from "./ui-copy";

const HEALTH_DOMAINS = [
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
] as const satisfies ReadonlyArray<HealthDomain>;

const expectedDynamicKeys = {
  depth: ["quick", "detailed", "deep"],
  country: ["CH", "GB", "US", "OTHER"],
  domain: HEALTH_DOMAINS,
  labMarker: LAB_MARKERS,
  fasting: ["fasting", "not_fasting", "not_stated"],
  canopyBranch: ["sleep", "heart", "habits", "care"],
  evidenceTier: [
    "validated-estimate",
    "authoritative-safety",
    "guideline-action",
    "evidence-limited-association",
  ],
  riskSignal: ["urgent", "high-signal", "worth-attention", "low-signal"],
  componentStatus: ["answered", "missing", "excluded"],
  exclusionReason: [
    "prescribed-nrt-quit-plan",
    "not-due",
    "access-or-safety-barrier",
    "no-current-access",
    "medication-not-applicable",
  ],
  adolescentSupport: [
    "adolescent_pregnancy_support",
    "adolescent_nicotine_support",
    "adolescent_alcohol_support",
    "adolescent_cannabis_support",
    "adolescent_other_drug_support",
  ],
} as const;

function variableTokens(message: string): string[] {
  return [...message.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

describe("complete bilingual UI copy", () => {
  test("keeps exact English/French key parity with nonblank copy and matching variables", () => {
    const englishKeys = Object.keys(uiCopy.en).sort();
    const frenchKeys = Object.keys(uiCopy.fr).sort();

    expect(frenchKeys).toEqual(englishKeys);
    expect(englishKeys.length).toBeGreaterThan(150);

    for (const key of englishKeys as UiCopyKey[]) {
      expect(uiCopy.en[key].trim(), `${key} English`).not.toBe("");
      expect(uiCopy.fr[key].trim(), `${key} French`).not.toBe("");
      expect(variableTokens(uiCopy.fr[key]), `${key} variables`).toEqual(
        variableTokens(uiCopy.en[key]),
      );
    }
  });

  test("maps every live dynamic identifier to an exact typed UI key", () => {
    expect(HEALTH_DOMAINS).toHaveLength(47);
    expect([...new Set(questionBank.map(({ domain }) => domain))].sort()).toEqual(
      [...HEALTH_DOMAINS].sort(),
    );
    expect(
      [...new Set(riskRules.map(({ evidenceTier }) => evidenceTier))].every((tier) =>
        expectedDynamicKeys.evidenceTier.includes(tier),
      ),
    ).toBe(true);
    expect(
      [...new Set(riskRules.map(({ signal }) => signal))].every((signal) =>
        expectedDynamicKeys.riskSignal.includes(signal),
      ),
    ).toBe(true);

    for (const [group, identifiers] of Object.entries(expectedDynamicKeys)) {
      const mapping = uiCopyKeys[group as keyof typeof uiCopyKeys];
      expect(Object.keys(mapping).sort(), group).toEqual([...identifiers].sort());
      for (const identifier of identifiers) {
        const copyKey = mapping[identifier as keyof typeof mapping] as UiCopyKey;
        expect(uiCopy.en[copyKey]?.trim(), `${group}.${identifier} English`).not.toBe("");
        expect(uiCopy.fr[copyKey]?.trim(), `${group}.${identifier} French`).not.toBe("");
      }
    }
  });

  test("retains the approved nine-item protective-root presentation corpus", () => {
    expect(Object.keys(protectiveRootLabelsFr)).toHaveLength(9);
    expect(Object.values(protectiveRootLabelsFr).every((value) => value.trim() !== ""))
      .toBe(true);
  });

  test("preserves canonical English result copy and natural calibrated French support wording", () => {
    expect(uiCopy.en["results.urgent.eyebrow"]).toBe("Immediate signals first");
    expect(uiCopy.en["results.urgent.title"]).toBe("Act on these immediate signals now");
    expect(uiCopy.en["assessment.progress"]).toBe("{completed} of {total}");
    expect(uiCopy.fr["assessment.progress"]).toBe("{completed} sur {total}");
    expect(uiCopy.en["evidenceTier.authoritative-safety"]).toBe(
      "Authoritative safety",
    );
    expect(uiCopy.en["evidenceTier.guideline-action"]).toBe("Guideline action");
    expect(uiCopy.en["adolescentSupport.adolescent_pregnancy_support"]).toBe(
      "pregnancy-related health",
    );
    expect(uiCopy.en["adolescentSupport.adolescent_nicotine_support"]).toBe(
      "nicotine or tobacco",
    );
    expect(uiCopy.en["adolescentSupport.adolescent_other_drug_support"]).toBe(
      "other substances",
    );
    expect(uiCopy.fr["adolescent.optional.title"]).toBe(
      "Une habitude sur laquelle vous pourriez choisir de travailler",
    );
    expect(uiCopy.fr["adolescentSupport.adolescent_pregnancy_support"]).toMatch(/^la /);
    expect(uiCopy.fr["adolescentSupport.adolescent_nicotine_support"]).toMatch(/^la /);
    expect(uiCopy.fr["adolescentSupport.adolescent_alcohol_support"]).toMatch(/^l'/);
    expect(uiCopy.fr["riskTree.noMissing"]).not.toMatch(/requise?/i);
    expect(uiCopy.fr["domain.isotretinoin"]).toBe("Isotretinoin");
  });
});
