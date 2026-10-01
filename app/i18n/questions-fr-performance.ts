import type { QuestionTranslation } from "./question-types";

export const performanceFrQuestionTranslations: Readonly<Record<string, QuestionTranslation>> = {
  reported_vo2_max_ml_kg_min: {
    prompt: "Quel est votre VO₂ max le plus récent, mesuré ou estimé par un appareil ?",
    why: "La forme cardiorespiratoire est l'un des prédicteurs inverses les plus puissants de la mortalité toutes causes et cardiovasculaire dans les grandes cohortes ; les valeurs peuvent toutefois varier selon le protocole de test ou l'appareil.",
  },
  squat_one_rep_max_kg: {
    prompt: "Quel est le squat le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "La force musculaire est inversement associée à la mortalité toutes causes, indépendamment de la forme aérobie. Utilisez uniquement un résultat existant ; n'essayez pas une nouvelle répétition maximale pour ce questionnaire.",
  },
  deadlift_one_rep_max_kg: {
    prompt: "Quel est le soulevé de terre le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "La force globale rapportée au poids du corps ajoute un contexte pertinent pour la mortalité, au-delà de la forme aérobie. Utilisez uniquement un résultat existant ; n'essayez pas une nouvelle répétition maximale pour ce questionnaire.",
  },
  smoking_history_former: {
    prompt: "Avez-vous fumé du tabac régulièrement par le passé, même si vous avez arrêté depuis ?",
    why: "Le tabagisme reste la première cause évitable de décès ; le risque diminue après l'arrêt, mais l'exposition passée continue d'influencer la mortalité cardiovasculaire, respiratoire et par cancer pendant des années.",
  },
};
