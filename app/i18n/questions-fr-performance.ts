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
  resting_heart_rate_bpm: {
    prompt: "Quelle est votre fréquence cardiaque au repos habituelle, en battements par minute ?",
    why: "Dans les grandes cohortes, une fréquence cardiaque au repos durablement supérieure à environ 80 battements par minute est associée à une mortalité cardiovasculaire et toutes causes plus élevée qu'une fréquence proche de 60.",
  },
  grip_strength_kg: {
    prompt: "Si vous l'avez déjà mesurée, quelle est votre force de préhension en kilogrammes ?",
    why: "La force de préhension est un prédicteur validé de mortalité : dans la cohorte internationale PURE, chaque baisse de 5 kg était associée à une mortalité toutes causes supérieure d'environ 16 %.",
  },
  walking_pace_self_rated: {
    prompt: "Comment décririez-vous votre allure de marche habituelle ?",
    why: "L'allure de marche auto-évaluée est un prédicteur puissant de mortalité : les marcheurs rapides présentent une mortalité toutes causes et cardiovasculaire nettement plus faible que les marcheurs lents, quelle que soit la corpulence.",
    options: {
      slow: "Lente",
      average: "Moyenne",
      brisk: "Rapide ou soutenue",
    },
  },
  stair_flights_capacity: {
    prompt: "Combien d'étages pouvez-vous monter à un rythme régulier sans vous arrêter ?",
    why: "La capacité à monter des escaliers approxime la capacité d'effort en MET ; une faible capacité fonctionnelle est régulièrement associée à une mortalité cardiovasculaire et toutes causes plus élevée.",
    options: {
      none: "Aucun, ou moins d'un étage",
      one_two: "1 à 2 étages",
      three_five: "3 à 5 étages",
      six_plus: "6 étages ou plus",
    },
  },
  chair_rise_capacity: {
    prompt: "Comment vous relevez-vous habituellement d'une chaise basse ou du sol ?",
    why: "Se relever sans s'aider des mains reflète la force du bas du corps et l'équilibre ; une moins bonne performance au test assis-debout est associée à une mortalité plus élevée chez les adultes d'âge moyen et plus âgés.",
    options: {
      easy_no_hands: "Facilement, sans m'aider des mains",
      hands_support: "En m'appuyant sur les mains ou les accoudoirs",
      much_difficulty: "Avec beaucoup de difficulté",
      cannot: "Je n'y arrive pas sans aide",
    },
  },
  pushup_max_reps: {
    prompt: "Combien de pompes pouvez-vous actuellement enchaîner en une seule série ?",
    why: "La capacité en pompes est un marqueur pratique de force-endurance : dans une cohorte suivie dix ans, en réaliser 40 ou plus était associé à bien moins d'événements cardiovasculaires qu'en réaliser moins de 10.",
  },
  smoking_history_former: {
    prompt: "Avez-vous fumé du tabac régulièrement par le passé, même si vous avez arrêté depuis ?",
    why: "Le tabagisme reste la première cause évitable de décès ; le risque diminue après l'arrêt, mais l'exposition passée continue d'influencer la mortalité cardiovasculaire, respiratoire et par cancer pendant des années.",
  },
  smoking_total_years: {
    prompt: "Pendant environ combien d'années au total avez-vous fumé régulièrement ?",
    why: "La durée du tabagisme détermine l'exposition cumulée, qui augmente le risque de décès par cancer du poumon, maladie cardiaque et maladie respiratoire plus fortement que la quantité quotidienne seule.",
  },
};
