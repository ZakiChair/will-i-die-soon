import type { QuestionTranslation } from "./question-types";

export const performanceFrQuestionTranslations: Readonly<Record<string, QuestionTranslation>> = {
  reported_vo2_max_ml_kg_min: {
    prompt: "Quel est votre VO₂ max le plus récent, mesuré ou estimé par un appareil ?",
    why: "La forme cardiorespiratoire est l'un des prédicteurs inverses les plus puissants de la mortalité toutes causes et cardiovasculaire dans les grandes cohortes ; les valeurs peuvent toutefois varier selon le protocole de test ou l'appareil.",
  },
  chair_stand_30s_count: {
    prompt: "Combien de fois pouvez-vous vous lever complètement d'une chaise et vous rasseoir en 30 secondes, bras croisés sur la poitrine ?",
    why: "Le lever de chaise en 30 secondes est le test de force des membres inférieurs du programme CDC STEADI, avec des normes publiées par âge et par sexe ; une fonction des membres inférieurs réduite prédit les chutes, la perte d'autonomie et la mortalité chez les personnes âgées.",
  },
  squat_one_rep_max_kg: {
    prompt: "Quel est le squat le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "La force musculaire est inversement associée à la mortalité toutes causes, indépendamment de la forme aérobie, mais les normes de mortalité publiées portent sur la préhension et le lever de chaise ; un squat lu en rapport au poids du corps est une convention du produit. Facultatif : utilisez uniquement un résultat existant et laissez la réponse vide plutôt que de tenter une nouvelle répétition maximale.",
  },
  deadlift_one_rep_max_kg: {
    prompt: "Quel est le soulevé de terre le plus lourd que vous ayez déjà effectué pour une répétition ?",
    why: "La force globale rapportée au poids du corps ajoute un contexte à l'axe force, mais les normes de mortalité publiées portent sur la préhension et le lever de chaise ; un soulevé de terre lu en rapport au poids du corps est une convention du produit. Facultatif : utilisez uniquement un résultat existant et laissez la réponse vide plutôt que de tenter une nouvelle répétition maximale.",
  },
  walking_pace: {
    prompt: "Comment décririez-vous votre allure de marche habituelle ?",
    why: "L'allure de marche auto-évaluée est un marqueur validé de la condition physique ; dans UK Biobank, une allure habituelle lente était associée à une mortalité cardiovasculaire environ deux fois plus élevée qu'une allure rapide, indépendamment du niveau d'activité.",
    options: { slow: "Lente", steady_average: "Régulière ou moyenne", brisk: "Rapide ou soutenue" },
  },
  falls_past_year: {
    prompt: "Au cours de l'année écoulée, lesquelles de ces situations vous concernent ?",
    why: "Ce sont les trois questions de dépistage du programme de prévention des chutes CDC STEADI ; une réponse positive à l'une d'elles identifie une personne âgée qui devrait bénéficier d'une évaluation du risque de chute.",
    options: {
      fallen: "J'ai chuté",
      unsteady: "Je me sens instable debout ou en marchant",
      worried: "J'ai peur de tomber",
      none: "Aucune de ces situations",
    },
  },
  functional_difficulties: {
    prompt: "En raison d'un problème de santé, avez-vous des difficultés à faire seul l'une de ces activités ?",
    why: "Ce sont les quatre items fonctionnels de l'indice de Lee, un indice validé de mortalité toutes causes à 4 ans chez les adultes de 50 ans et plus vivant à domicile (Lee et al., JAMA 2006).",
    options: {
      bathing: "Prendre un bain ou une douche",
      managing_finances: "Gérer votre argent ou vos finances",
      walking_several_blocks: "Marcher plusieurs pâtés de maisons (environ un demi-kilomètre)",
      pushing_pulling_heavy: "Tirer ou pousser de gros objets, comme un fauteuil de salon",
      none: "Aucune de ces activités",
    },
  },
  smoking_history_former: {
    prompt: "Avez-vous fumé du tabac régulièrement par le passé, même si vous avez arrêté depuis ?",
    why: "Le tabagisme reste la première cause évitable de décès ; le risque diminue après l'arrêt, mais l'exposition passée continue d'influencer la mortalité cardiovasculaire, respiratoire et par cancer pendant des années.",
  },
  smoking_cigarettes_per_day: {
    prompt: "En moyenne, combien de cigarettes fumez-vous (ou fumiez-vous) par jour ?",
    why: "La quantité quotidienne multipliée par les années de tabagisme donne les paquets-années, la mesure d'exposition utilisée par les critères de dépistage du cancer du poumon (USPSTF 2021 : 20 paquets-années ou plus).",
  },
  smoking_years_total: {
    prompt: "Pendant combien d'années au total avez-vous fumé ?",
    why: "Les années de tabagisme se combinent à la quantité quotidienne en paquets-années ; 20 paquets-années ou plus est le seuil d'exposition de la recommandation USPSTF de dépistage du cancer du poumon.",
  },
  smoking_years_since_quit: {
    prompt: "Il y a combien d'années avez-vous arrêté de fumer ?",
    why: "Le délai depuis l'arrêt est coté par le Life's Essential 8 (moins de 1 an, 1 à 5 ans, plus de 5 ans) et le dépistage du cancer du poumon ne s'applique que dans les 15 ans suivant l'arrêt.",
  },
  secondhand_smoke_home: {
    prompt: "Quelqu'un fume-t-il régulièrement à l'intérieur de votre domicile ?",
    why: "L'exposition au tabagisme passif au domicile fait partie de la métrique nicotine du Life's Essential 8 et est associée à un risque cardiovasculaire plus élevé chez les non-fumeurs.",
  },
};
