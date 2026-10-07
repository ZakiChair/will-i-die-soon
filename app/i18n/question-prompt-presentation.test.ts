import { describe, expect, test } from "vitest";
import { questionBank } from "../data/questions";
import { localizeQuestion } from "./questions-fr";
import {
  CURATED_QUESTION_PROMPT_IDS,
  COMMON_QUESTION_PROMPT_IDS,
  getQuestionPromptPresentation,
} from "./question-prompt-presentation";
import type { Locale } from "./types";

const expected = {
  urgent_breathing_now: {
    en: {
      title: "Are there signs of severe breathing difficulty right now?",
      detail: "Struggling to breathe, being unable to speak normally, or turning blue or grey; or, for a child, grunting, sucking in under the ribs, becoming limp, or not responding normally.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de détresse respiratoire grave ?",
      detail: "Grande difficulté à respirer, impossibilité de parler normalement, peau bleue ou grise ; ou, chez un enfant, geignement respiratoire, creusement sous les côtes, mollesse ou réaction anormale.",
    },
  },
  adolescent_substance_severe_timing: {
    en: {
      title: "When did the serious substance-related event happen?",
      detail: "Collapse, a seizure, severe breathing trouble, chest pain, or another immediate substance-related safety concern — happening now or during the past twelve months.",
    },
    fr: {
      title: "Quand l’événement grave lié à une substance s’est-il produit ?",
      detail: "Effondrement ou perte de connaissance, convulsion, graves difficultés respiratoires, douleur thoracique ou autre problème de sécurité immédiat lié à une substance — actuellement ou au cours des douze derniers mois.",
    },
  },
  urgent_severe_allergy_now: {
    en: {
      title: "Are there signs of a severe allergic reaction right now?",
      detail: "Sudden swelling of the lips, mouth, tongue, or throat; trouble breathing or swallowing; or collapse.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de réaction allergique grave ?",
      detail: "Gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge ; difficultés à respirer ou à avaler ; effondrement ou perte de connaissance.",
    },
  },
  corticosteroid_detail_infection_context: {
    en: {
      title: "While using corticosteroids, do any infection or major physical-stress situations apply?",
      detail: "Fever or infection signs; recent chickenpox or shingles exposure; severe illness; surgery; or major injury.",
    },
    fr: {
      title: "Pendant l’utilisation de corticostéroïdes, l’une de ces situations d’infection ou de stress physique important s’applique-t-elle ?",
      detail: "Fièvre ou signes d’infection ; exposition récente à la varicelle ou au zona ; maladie sévère ; intervention chirurgicale ; ou blessure grave.",
    },
  },
  urgent_stroke_signs_now: {
    en: {
      title: "Have there been possible stroke signs in the last 24 hours?",
      detail: "Sudden facial droop, one-sided weakness, or new trouble speaking — even if the signs have stopped.",
    },
    fr: {
      title: "Y a-t-il eu des signes possibles d’AVC au cours des dernières 24 heures ?",
      detail: "Affaissement soudain du visage, faiblesse d’un seul côté ou nouvelles difficultés à parler — même si les signes ont disparu.",
    },
  },
  isotretinoin_detail_symptoms: {
    en: {
      title: "Have you had any serious symptoms while using isotretinoin?",
      detail: "Severe headache; vision change; severe abdominal pain; mood or behavior change; or a blistering rash.",
    },
    fr: {
      title: "Avez-vous eu des symptômes graves pendant l’utilisation d’isotrétinoïne ?",
      detail: "Maux de tête sévères ; changement de vision ; douleur abdominale sévère ; changement d’humeur ou de comportement ; ou éruption cutanée avec des cloques.",
    },
  },
  glp1_detail_relevant_history: {
    en: {
      title: "Do any of these medical-history factors apply to you?",
      detail: "Pancreatitis; gallbladder disease; severe delayed stomach emptying; kidney disease; diabetic eye disease; or MEN2.",
    },
    fr: {
      title: "L’un de ces éléments de vos antécédents médicaux s’applique-t-il ?",
      detail: "Pancréatite ; maladie de la vésicule biliaire ; retard sévère de la vidange gastrique ; maladie rénale ; atteinte oculaire diabétique ; ou MEN2.",
    },
  },
  minoxidil_detail_cardiac_symptoms: {
    en: {
      title: "Have you had any concerning symptoms while using minoxidil?",
      detail: "Chest pain; rapid heartbeat; faintness; breathlessness; swelling; or sudden weight gain.",
    },
    fr: {
      title: "Avez-vous eu des symptômes préoccupants pendant l’utilisation de minoxidil ?",
      detail: "Douleur thoracique ; rythme cardiaque rapide ; étourdissement ou évanouissement ; essoufflement ; gonflement ; ou prise de poids soudaine.",
    },
  },
} as const;

function requiredQuestion(id: string) {
  const question = questionBank.find((candidate) => candidate.id === id);
  if (!question) throw new Error(`Missing question fixture: ${id}`);
  return question;
}

describe("question prompt presentation", () => {
  test("contains exactly the eight approved dense prompt IDs", () => {
    expect(CURATED_QUESTION_PROMPT_IDS).toEqual(Object.keys(expected));
  });

  test.each(CURATED_QUESTION_PROMPT_IDS)(
    "returns exact complete bilingual presentation for %s",
    (id) => {
      const canonical = requiredQuestion(id);
      for (const locale of ["en", "fr"] satisfies Locale[]) {
        const localized = localizeQuestion(canonical, locale);
        expect(
          getQuestionPromptPresentation(id, locale, localized.prompt),
        ).toEqual(expected[id][locale]);
      }
    },
  );

  test.each(CURATED_QUESTION_PROMPT_IDS)(
    "falls back when the canonical prompt for %s drifts from its curated split",
    (id) => {
      const canonical = requiredQuestion(id);
      for (const locale of ["en", "fr"] satisfies Locale[]) {
        const changedPrompt = `${localizeQuestion(canonical, locale).prompt} Updated.`;
        expect(
          getQuestionPromptPresentation(id, locale, changedPrompt),
        ).toEqual({ title: changedPrompt });
      }
    },
  );

  test("uses the complete localized prompt for an ordinary question", () => {
    const canonical = requiredQuestion("family_early_cvd");
    const localized = localizeQuestion(canonical, "fr");
    expect(
      getQuestionPromptPresentation(canonical.id, "fr", localized.prompt),
    ).toEqual({ title: localized.prompt });
  });

  test.each(["en", "fr"] satisfies Locale[])("keeps the sleep period and maximal-effort guidance in %s", (locale) => {
    const sleep = requiredQuestion("usual_sleep_hours");
    const presentation = getQuestionPromptPresentation(sleep.id, locale, localizeQuestion(sleep, locale).prompt);
    expect(presentation.detail).toContain("24");
    const refreshed = requiredQuestion("sleep_refreshed");
    const recovery = getQuestionPromptPresentation(refreshed.id, locale, localizeQuestion(refreshed, locale).prompt);
    expect(recovery.detail).toMatch(locale === "fr" ? /l'heure qui suit/ : /within an hour/);
    const chairStand = requiredQuestion("chair_stand_30s_count");
    const stands = getQuestionPromptPresentation(chairStand.id, locale, localizeQuestion(chairStand, locale).prompt);
    expect(stands.detail).toMatch(locale === "fr" ? /30 secondes.*instable/ : /30 seconds.*unsteady/);
  });

  test.each(["en", "fr"] satisfies Locale[])("explains how to take each pathology measurement in %s", (locale) => {
    const detail = (id: string) =>
      getQuestionPromptPresentation(id, locale, localizeQuestion(requiredQuestion(id), locale).prompt).detail;
    expect(detail("waist_circumference_cm")).toMatch(locale === "fr" ? /dernière côte.*hanche.*nombril/ : /lowest rib.*hip bone.*navel/);
    expect(detail("neck_circumference_cm")).toMatch(locale === "fr" ? /pomme d'Adam/ : /Adam's apple/);
    expect(detail("has_recent_blood_pressure")).toMatch(locale === "fr" ? /pharmacie/ : /pharmacy/);
    expect(detail("blood_pressure_systolic")).toMatch(/mmHg.*125\/80/);
    if (locale === "fr") expect(detail("blood_pressure_systolic")).toContain("12,5/8");
  });

  test.each(COMMON_QUESTION_PROMPT_IDS)("uses both common presentations for %s and falls back if its meaning changes", (id) => {
    const question = requiredQuestion(id);
    const before = structuredClone(question);
    for (const locale of ["en", "fr"] satisfies Locale[]) {
      const prompt = localizeQuestion(question, locale).prompt;
      const presented = getQuestionPromptPresentation(id, locale, prompt);
      expect(presented.title.trim()).not.toBe("");
      expect(presented.detail?.trim()).toBeTruthy();
      const changed = `${prompt} Updated context.`;
      expect(getQuestionPromptPresentation(id, locale, changed)).toEqual({ title: changed });
    }
    expect(question).toEqual(before);
  });

  test("falls back without mutating canonical question data", () => {
    const canonical = requiredQuestion("urgent_breathing_now");
    const before = structuredClone(canonical);
    expect(
      getQuestionPromptPresentation("unknown-id", "en", canonical.prompt),
    ).toEqual({ title: canonical.prompt });
    expect(canonical).toEqual(before);
  });
});
