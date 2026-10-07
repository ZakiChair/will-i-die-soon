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
  chair_stand_30s_count: {
    en: "The number of full stands from a chair in 30 seconds is a validated measure of leg strength and physical function, compared with age- and sex-specific reference ranges.",
    fr: "Le nombre de levers complets d'une chaise en 30 secondes est une mesure validée de la force des jambes et de la fonction physique, comparée à des repères par âge et par sexe.",
  },
  weekly_vigorous_activity_minutes: {
    en: "Vigorous minutes count double towards the weekly activity target, so separating them from moderate activity gives a fairer picture.",
    fr: "Les minutes d'activité intense comptent double dans l'objectif hebdomadaire ; les séparer de l'activité modérée donne une image plus juste.",
  },
  smoking_cigarettes_per_day: {
    en: "Cigarettes per day and years smoked are combined into an approximate pack-year total, which decides eligibility for lung cancer screening.",
    fr: "Les cigarettes par jour et les années de tabagisme sont combinées en un total approximatif de paquets-années, qui détermine l'éligibilité au dépistage du cancer du poumon.",
  },
  smoking_years_total: {
    en: "Count every year during which you smoked regularly, even with interruptions.",
    fr: "Comptez toutes les années pendant lesquelles vous avez fumé régulièrement, même avec des interruptions.",
  },
  blood_pressure_diastolic: {
    en: "The bottom number of the same reading completes the blood-pressure metric of Life's Essential 8.",
    fr: "Le chiffre du bas de la même mesure complète la métrique de tension artérielle du Life's Essential 8.",
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
  "reported_vo2_max_ml_kg_min", "chair_stand_30s_count",
  "waist_circumference_cm", "neck_circumference_cm",
]);

const ALCOHOL_DRINK_QUESTIONS = new Set([
  "alcohol_detail_typical_amount",
  "alcohol_detail_heavy_episode",
]);

type LocalizedText = { readonly en: string; readonly fr: string };

/** Standard-drink definitions differ by country; the notice anchors the count to the local one. */
const STANDARD_DRINK_NOTICES: Readonly<Record<string, LocalizedText>> = {
  US: {
    en: "In the United States, one standard drink is 14 g of pure alcohol: for example a 355 ml (12 fl oz) beer at 5 %, a 150 ml (5 fl oz) glass of wine at 12 %, or a 45 ml (1.5 fl oz) shot of spirits at 40 %.",
    fr: "Aux États-Unis, un verre standard contient 14 g d'alcool pur : par exemple une bière de 355 ml (12 oz) à 5 %, un verre de vin de 150 ml (5 oz) à 12 % ou 45 ml (1,5 oz) de spiritueux à 40 %.",
  },
  CA: {
    en: "In Canada, one standard drink is 13.6 g of pure alcohol: for example a 341 ml beer at 5 %, a 142 ml glass of wine at 12 %, or a 43 ml shot of spirits at 40 %.",
    fr: "Au Canada, un verre standard contient 13,6 g d'alcool pur : par exemple une bière de 341 ml à 5 %, un verre de vin de 142 ml à 12 % ou 43 ml de spiritueux à 40 %.",
  },
  GB: {
    en: "In the United Kingdom, count units: one unit is 8 g of pure alcohol, for example half a pint (284 ml) of beer at 3.6 % or a single 25 ml measure of spirits at 40 %. Treat one unit as one drink here.",
    fr: "Au Royaume-Uni, comptez en unités : une unité correspond à 8 g d'alcool pur, par exemple une demi-pinte (284 ml) de bière à 3,6 % ou une mesure simple de 25 ml de spiritueux à 40 %. Comptez une unité comme un verre ici.",
  },
  "10g": {
    en: "One standard drink here is about 10 g of pure alcohol: for example a 250 ml beer at 5 %, a 100 ml glass of wine at 12 %, or a 30 ml measure of spirits at 40 %.",
    fr: "Un verre standard contient environ 10 g d'alcool pur : par exemple 25 cl de bière à 5 %, 10 cl de vin à 12 % ou 3 cl de spiritueux à 40 %.",
  },
  "10-12g": {
    en: "One standard drink (Standardglas) here is about 10–12 g of pure alcohol: for example a 250–300 ml beer at 5 %, a 100 ml glass of wine at 12 %, or a 20–30 ml measure of spirits at 40 %.",
    fr: "Un verre standard contient environ 10 à 12 g d'alcool pur : par exemple 25 à 30 cl de bière à 5 %, 10 cl de vin à 12 % ou 2 à 3 cl de spiritueux à 40 %.",
  },
  WHO: {
    en: "A standard drink as defined by the WHO is about 10 g of pure alcohol: for example a 250 ml beer at 5 %, a 100 ml glass of wine at 12 %, or a 30 ml measure of spirits at 40 %.",
    fr: "Un verre standard tel que défini par l'OMS contient environ 10 g d'alcool pur : par exemple 25 cl de bière à 5 %, 10 cl de vin à 12 % ou 3 cl de spiritueux à 40 %.",
  },
};

function standardDrinkNotice(countryCode: string | undefined, locale: Locale): string {
  const group =
    countryCode === "US" || countryCode === "CA" || countryCode === "GB"
      ? countryCode
      : countryCode === "FR" || countryCode === "BE" || countryCode === "LU"
        ? "10g"
        : countryCode === "DE" || countryCode === "CH"
          ? "10-12g"
          : "WHO";
  return STANDARD_DRINK_NOTICES[group][locale];
}

export function getQuestionGuidance(
  questionId: string,
  locale: Locale,
  countryCode?: string,
): Guidance {
  const scale = SCALE_ANCHORS[questionId as keyof typeof SCALE_ANCHORS]?.[locale];
  const why = PRACTICAL_WHY[questionId as keyof typeof PRACTICAL_WHY]?.[locale];
  const notice = questionId === "chair_stand_30s_count"
    ? locale === "fr"
      ? "Chaise stable sans accoudoirs, bras croisés sur la poitrine, 30 secondes. Ne tentez pas le test si vous vous sentez instable, avez une douleur ou êtes seul sans appui ; laissez alors la réponse vide."
      : "Use a stable chair without armrests, arms crossed over the chest, for 30 seconds. Do not attempt the test if you feel unsteady, have pain, or are alone without support; leave the answer blank instead."
    : questionId === "reported_vo2_max_ml_kg_min"
      ? locale === "fr"
        ? "Utilisez une mesure ou une estimation déjà disponible sur votre appareil. Aucun test à réaliser."
        : "Use a measurement or device estimate you already have. No new test is needed."
      : ALCOHOL_DRINK_QUESTIONS.has(questionId)
        ? standardDrinkNotice(countryCode, locale)
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
