import type { QuestionValidationError } from "../lib/question-validation";
import type { Locale } from "./types";

type Guidance = Readonly<{
  notice?: string;
  why?: string;
  scale?: readonly [string, string];
  unknownMeasurement?: string;
}>;

const SCALE_ANCHORS = {
  sleep_refreshed: { en: ["Not at all rested", "Fully rested"], fr: ["Pas du tout reposé", "Complètement reposé"] },
} as const;

const PRACTICAL_WHY = {
  usual_sleep_hours: {
    en: "Sleep duration adds context to how rested you feel and how regular your sleep is.",
    fr: "Cette durée complète votre ressenti au réveil et la régularité de votre sommeil.",
  },
  plant_food_frequency: {
    en: "This helps describe your usual eating pattern, without judging an individual meal.",
    fr: "Cette réponse décrit vos habitudes alimentaires, sans porter de jugement sur un repas particulier.",
  },
  weekly_moderate_activity_minutes: {
    en: "Your usual activity time helps describe your movement habits and identify changes that fit your situation.",
    fr: "Votre temps d'activité habituel aide à décrire vos habitudes et à repérer des changements adaptés à votre situation.",
  },
  reported_vo2_max_ml_kg_min: {
    en: "An existing VO₂ max value adds context to your cardiorespiratory fitness. Results vary by device and test method.",
    fr: "Une valeur de VO₂ max déjà connue complète votre profil de forme cardiorespiratoire. Elle peut varier selon l'appareil et la méthode de mesure.",
  },
  squat_one_rep_max_kg: {
    en: "An existing squat result adds context to your strength. It is optional and does not assess your overall health.",
    fr: "Un résultat de squat déjà connu apporte un repère de force. Il est facultatif et n'évalue pas votre santé globale.",
  },
  deadlift_one_rep_max_kg: {
    en: "An existing deadlift result adds context to your strength. It is optional and does not assess your overall health.",
    fr: "Un résultat de soulevé de terre déjà connu apporte un repère de force. Il est facultatif et n'évalue pas votre santé globale.",
  },
  movement_strength_days: {
    en: "This describes how often strengthening activity is part of your week, alongside everyday movement.",
    fr: "Cette fréquence décrit la place du renforcement musculaire dans votre semaine, en complément des mouvements du quotidien.",
  },
  sedentary_total_hours: {
    en: "Time spent sitting adds context beyond exercise. Your circumstances affect which movement breaks are possible.",
    fr: "Le temps passé assis complète les informations sur l'activité physique. Votre situation détermine les pauses de mouvement possibles.",
  },
  diet_processed_meat: {
    en: "This helps describe the place of processed meat in your overall eating pattern.",
    fr: "Cette fréquence aide à décrire la place de la charcuterie et des viandes transformées dans votre alimentation.",
  },
  diet_sugary_drinks: {
    en: "This helps describe your usual drink choices alongside the rest of your diet.",
    fr: "Cette quantité décrit vos choix habituels de boissons, en complément du reste de votre alimentation.",
  },
} as const;

const UNKNOWN_MEASUREMENTS = new Set([
  "reported_vo2_max_ml_kg_min", "squat_one_rep_max_kg", "deadlift_one_rep_max_kg",
  "waist_circumference_cm", "neck_circumference_cm",
]);

export function getQuestionGuidance(questionId: string, locale: Locale): Guidance {
  const scale = SCALE_ANCHORS[questionId as keyof typeof SCALE_ANCHORS]?.[locale];
  const why = PRACTICAL_WHY[questionId as keyof typeof PRACTICAL_WHY]?.[locale];
  const maximalLift = questionId === "squat_one_rep_max_kg" || questionId === "deadlift_one_rep_max_kg";
  const notice = maximalLift
    ? locale === "fr"
      ? "Utilisez uniquement un résultat déjà connu. Ne tentez pas de nouvelle charge maximale pour répondre."
      : "Use only a result you already know. Do not attempt a new maximal lift to answer."
    : questionId === "reported_vo2_max_ml_kg_min"
      ? locale === "fr"
        ? "Utilisez une mesure ou une estimation déjà disponible sur votre appareil. Aucun test à réaliser."
        : "Use a measurement or device estimate you already have. No new test is needed."
      : undefined;
  return {
    scale,
    why,
    notice,
    unknownMeasurement: UNKNOWN_MEASUREMENTS.has(questionId)
      ? locale === "fr" ? "Je ne connais pas cette mesure" : "I don't know this measurement"
      : undefined,
  };
}

export function questionValidationMessage(error: QuestionValidationError, locale: Locale): string {
  const french = locale === "fr";
  switch (error.kind) {
    case "required": return french
      ? "Choisissez ou saisissez une réponse, ou utilisez le bouton pour passer cette question."
      : "Choose or enter an answer, or use the button to skip this question.";
    case "number": return french ? "Saisissez un nombre valide." : "Enter a valid number.";
    case "nonnegative": return french ? "Saisissez une valeur supérieure ou égale à 0." : "Enter a value of 0 or more.";
    case "positive": return french ? "Saisissez une valeur supérieure à 0." : "Enter a value greater than 0.";
    case "range": return french
      ? `Saisissez une valeur entre 0 et ${error.maximum}, dans l'unité indiquée.`
      : `Enter a value between 0 and ${error.maximum}, using the unit shown.`;
  }
}
