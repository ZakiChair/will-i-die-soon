import { describe, expect, test } from "vitest";

import { questionBank } from "../data/questions";
import { riskRules } from "../data/rules";
import { LAB_MARKERS } from "../lib/labs";
import { HEALTH_PILLARS } from "../lib/health-pillars";
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
  "movement",
  "sedentary-time",
  "sleep",
  "circadian-rhythm",
  "stress",
  "mood",
  "anxiety",
  "cognition",
  "social-connection",
  "environment",
  "sun",
  "sexual-health",
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
  "medication-adherence",
  "interactions",
  "preventive-care",
  "blood-pressure",
  "blood-testing",
] as const satisfies ReadonlyArray<HealthDomain>;

const expectedDynamicKeys = {
  depth: ["express", "quick", "detailed", "deep"],
  country: ["OTHER"],
  domain: HEALTH_DOMAINS,
  labMarker: LAB_MARKERS,
  fasting: ["fasting", "not_fasting", "not_stated"],
  pillar: HEALTH_PILLARS,
  pillarShort: HEALTH_PILLARS,
  evidenceTier: [
    "validated-estimate",
    "authoritative-safety",
    "guideline-action",
    "evidence-limited-association",
  ],
  riskSignal: ["urgent", "high-signal", "worth-attention", "low-signal"],
  riskUrgency: ["urgent", "prompt-review", "long-term", "support"],
  componentStatus: ["answered", "missing"],
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

function humanTypographySegments(key: UiCopyKey, message: string): string[] {
  if (key === "export.filename" || key.startsWith("unit.")) return [];
  return message.split(/https?:\/\/\S+/gu);
}

describe("complete bilingual UI copy", () => {
  test("removes the dead decorative canopy copy and branch map", () => {
    expect(uiCopy.en).not.toHaveProperty("canopy.aria");
    expect(uiCopy.en).not.toHaveProperty("canopy.caption");
    expect(uiCopy.fr).not.toHaveProperty("canopy.aria");
    expect(uiCopy.fr).not.toHaveProperty("canopy.caption");
    expect(uiCopyKeys).not.toHaveProperty("canopyBranch");
  });

  test("keeps Human Atlas copy descriptive without diagnostic or measurement claims", () => {
    const atlasEntries = Object.entries(uiCopy.en).filter(([key]) =>
      key.startsWith("landing.atlas."),
    );

    expect(atlasEntries.length).toBeGreaterThanOrEqual(26);
    for (const [key, message] of atlasEntries) {
      expect(message, key).not.toMatch(
        /we (?:diagnose|predict)|your diagnosis|predict(?:s|ing)? (?:your|when)|measures? your (?:brain|nervous system|digestion|energy)|medical scan/i,
      );
    }
  });

  test("uses the approved bilingual Human Atlas hero headline", () => {
    expect(uiCopy.en["landing.atlas.hero.title"]).toBe(
      "Your fitness, in a new light.",
    );
    expect(uiCopy.fr["landing.atlas.hero.title"]).toBe(
      "Votre forme, sous un nouveau jour.",
    );
  });

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
    expect(HEALTH_DOMAINS).toHaveLength(39);
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

  test("retains the approved seven-item protective-root presentation corpus", () => {
    expect(Object.keys(protectiveRootLabelsFr)).toHaveLength(7);
    expect(Object.values(protectiveRootLabelsFr).every((value) => value.trim() !== ""))
      .toBe(true);
  });

  test("preserves canonical English result copy and natural calibrated French support wording", () => {
    expect(uiCopy.en["depth.express"]).toBe("Express");
    expect(uiCopy.en["depth.express.detail"]).toBe(
      "9 targeted questions · under 1 minute",
    );
    expect(uiCopy.en["depth.express.description"]).toBe(
      "VO₂ max, strength, sleep, and nutrition for adults.",
    );
    expect(uiCopy.en["consent.express.unavailable"]).toBe(
      "Express is for adults aged 18 or older. Choose Quick to continue.",
    );
    expect(uiCopy.en["consent.express.useQuick"]).toBe("Use Quick instead");
    expect(uiCopy.en["question.skip.express"]).toBe(
      "I don't know or prefer not to answer",
    );
    expect(uiCopy.fr["question.skip.express"]).toBe(
      "Je ne sais pas ou je préfère ne pas répondre",
    );
    expect(uiCopy.en["unit.reported_vo2_max_ml_kg_min"]).toBe("ml/kg/min");
    expect(uiCopy.en["unit.chair_stand_30s_count"]).toBe("stands / 30 s");
    expect(uiCopy.fr["unit.chair_stand_30s_count"]).toBe("levers / 30 s");
    expect(uiCopy.en["unit.smoking_cigarettes_per_day"]).toBe("cigarettes / day");
    expect(uiCopy.en["results.urgent.eyebrow"]).toBe("Immediate signals first");
    expect(uiCopy.en["results.urgent.title"]).toBe("Act on these immediate signals now");
    expect(uiCopy.en["assessment.progress"]).toBe("{completed} of {total}");
    expect(uiCopy.fr["assessment.progress"]).toBe("{completed} sur {total}");
    expect(uiCopy.en["evidenceTier.authoritative-safety"]).toBe(
      "Authoritative safety",
    );
    expect(uiCopy.en["evidenceTier.guideline-action"]).toBe("Guideline action");
    expect(uiCopy.en["riskUrgency.urgent"]).toBe("Urgent");
    expect(uiCopy.en["riskUrgency.prompt-review"]).toBe("Prompt review");
    expect(uiCopy.en["riskUrgency.long-term"]).toBe("Longer-term");
    expect(uiCopy.en["riskUrgency.support"]).toBe("Support");
    expect(uiCopy.fr["riskUrgency.urgent"]).toBe("Urgent");
    expect(uiCopy.fr["riskUrgency.prompt-review"]).toBe("À examiner rapidement");
    expect(uiCopy.fr["riskUrgency.long-term"]).toBe("À plus long terme");
    expect(uiCopy.fr["riskUrgency.support"]).toBe("Soutien");
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

  test("uses four-pillar language for result navigation in both locales", () => {
    expect(uiCopy.en["riskTree.aria"]).toBe("Health signal pillars");
    expect(uiCopy.fr["riskTree.aria"]).toBe("Piliers de signaux de santé");
    expect(uiCopy.en["riskTree.pillar.aria"]).toBe("{pillar} pillar");
    expect(uiCopy.fr["riskTree.pillar.aria"]).toBe("Pilier {pillar}");
    expect(uiCopy.en["results.canopy.title"]).toBe("Four health pillars you can inspect.");
    expect(uiCopy.fr["results.canopy.title"]).toBe("Quatre piliers de santé que vous pouvez examiner.");
  });

  test("provides concise localized evidence-selection announcements", () => {
    expect(uiCopy.en["riskTree.evidence.selected"]).toBe(
      "Evidence selected: {title}",
    );
    expect(uiCopy.fr["riskTree.evidence.selected"]).toBe(
      "Preuve sélectionnée\u00a0: {title}",
    );
  });

  test("provides the approved long and short chapter labels in both languages", () => {
    expect(uiCopy.en["pillar.cardio-energy"]).toBe(
      "Cardio, VO₂ max & cellular energy",
    );
    expect(uiCopy.en["pillar.strength-neural"]).toBe(
      "Strength, nervous system & recovery",
    );
    expect(uiCopy.en["pillar.sleep-circadian"]).toBe("Sleep & circadian rhythm");
    expect(uiCopy.en["pillar.nutrition-metabolic"]).toBe(
      "Nutrition & metabolic health",
    );
    expect(uiCopy.fr["pillar.cardio-energy"]).toBe(
      "Cardio, VO₂ max et énergie cellulaire",
    );
    expect(uiCopy.fr["pillar.strength-neural"]).toBe(
      "Force, système nerveux et récupération",
    );
    expect(uiCopy.fr["pillar.sleep-circadian"]).toBe("Sommeil et rythme circadien");
    expect(uiCopy.fr["pillar.nutrition-metabolic"]).toBe(
      "Alimentation et santé métabolique",
    );
    expect(uiCopy.en["pillar.cardio-energy.short"]).toBe("Cardio & energy");
    expect(uiCopy.en["pillar.strength-neural.short"]).toBe("Strength & recovery");
    expect(uiCopy.en["pillar.sleep-circadian.short"]).toBe("Sleep");
    expect(uiCopy.en["pillar.nutrition-metabolic.short"]).toBe(
      "Nutrition & metabolism",
    );
    expect(uiCopy.fr["pillar.cardio-energy.short"]).toBe("Cardio et énergie");
    expect(uiCopy.fr["pillar.strength-neural.short"]).toBe("Force et récupération");
    expect(uiCopy.fr["pillar.sleep-circadian.short"]).toBe("Sommeil");
    expect(uiCopy.fr["pillar.nutrition-metabolic.short"]).toBe(
      "Nutrition et métabolisme",
    );
  });

  test("preserves the exact safe meaning of local privacy and temporal eligibility copy", () => {
    expect(uiCopy.fr["landing.privacy.local.body"]).toBe(
      "Aucun compte, aucun traitement côté serveur, aucun outil d’analyse, aucun cookie ni stockage des réponses.",
    );
    expect(uiCopy.fr["minor.adolescent.body"]).toBe(
      "Le fonctionnement en local ne garantit pas à lui seul la confidentialité médicale. Les personnes à proximité peuvent toujours voir cet écran.",
    );
  });

  test("uses the approved concise French score-ledger language", () => {
    expect(uiCopy.fr["score.readout"]).toBe(
      "{score} / 100 · {coverage}\u202f% des métriques évaluées",
    );
    expect(uiCopy.fr["score.category.assessed"]).toBe(
      "{earned} points sur {assessed} évalués",
    );
    expect(uiCopy.fr["score.category.excluded"]).toBe("non évaluée");
    expect(uiCopy.fr["score.category.coverage"]).toBe(
      "{coverage}\u202f% de la métrique couverte",
    );
    expect(uiCopy.fr["score.coverage"]).toBe(
      "{coverage}\u202f% des métriques évaluées",
    );
    expect(uiCopy.fr["score.version"]).toBe("Life's Essential 8 de l'AHA / {version}");
  });

  test("keeps French high punctuation and percentages inseparable from their preceding text", () => {
    for (const [key, message] of Object.entries(uiCopy.fr) as Array<
      [UiCopyKey, string]
    >) {
      for (const segment of humanTypographySegments(key, message)) {
        for (const match of segment.matchAll(/[:;?]/gu)) {
          expect(segment[match.index - 1], `${key} before ${match[0]}`).toBe("\u00a0");
        }
        for (const match of segment.matchAll(/%/gu)) {
          expect(segment[match.index - 1], `${key} before %`).toBe("\u202f");
        }
        for (const match of segment.matchAll(/—/gu)) {
          expect(segment[match.index - 1], `${key} before em dash`).toBe(" ");
          expect(segment[match.index + 1], `${key} after em dash`).toBe(" ");
        }
      }
    }
  });

  test("retains typed score-status corpus for composed presentation explanations", () => {
    expect(uiCopyKeys.componentStatus).toEqual({
      answered: "componentStatus.answered",
      missing: "componentStatus.missing",
    });
    expect("exclusionReason" in uiCopyKeys).toBe(false);
  });
});
