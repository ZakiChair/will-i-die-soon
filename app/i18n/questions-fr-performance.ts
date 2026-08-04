import type { QuestionTranslation } from "./question-types";

export const performanceFrQuestionTranslations: Readonly<Record<string, QuestionTranslation>> = {
  reported_vo2_max_ml_kg_min: {
    prompt: "Quel est votre VO₂ max le plus récent, mesuré ou estimé par un appareil ?",
    why: "Un VO₂ max déclaré apporte un contexte sur la forme cardiorespiratoire, mais les valeurs peuvent varier selon le protocole de test ou l'appareil.",
  },
  squat_one_rep_max_kg: {
    prompt: "Quel est le squat le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "Utilisez uniquement un résultat existant. N'essayez pas de faire une nouvelle répétition maximale pour ce questionnaire.",
  },
  deadlift_one_rep_max_kg: {
    prompt: "Quel est le soulevé de terre le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "Utilisez uniquement un résultat existant. N'essayez pas de faire une nouvelle répétition maximale pour ce questionnaire.",
  },
};
