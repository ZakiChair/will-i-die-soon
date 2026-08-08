import type { HealthPillar } from "./health-pillars";
import type { AnswerMap, ProfileContext } from "./types";

/**
 * Estimation heuristique de longévité pour le prototype privé.
 *
 * Le module transforme les réponses en trois lectures : un score 0–100 par
 * pilier, un âge de décès estimé (table de survie simplifiée + ajustements en
 * années issus d'associations de cohortes), et des indicateurs dérivés
 * (causes dominantes, gains modifiables, âge de forme). Les ajustements sont
 * des ordres de grandeur illustratifs, pas des prédictions cliniques.
 */

export type PillarBreakdown = Readonly<{
  pillar: HealthPillar;
  /** Score 0–100, moyenne des composantes répondues. Null si rien de répondu. */
  score: number | null;
  answeredComponents: number;
  totalComponents: number;
}>;

export type AdjustmentId =
  | "smoking_current"
  | "smoking_former"
  | "activity_minutes"
  | "walking_pace"
  | "strength_training"
  | "sedentary_time"
  | "functional_strength"
  | "cardio_fitness"
  | "sleep_duration"
  | "sleep_apnea_signal"
  | "diet_pattern"
  | "body_composition"
  | "alcohol_heavy"
  | "diagnosed_conditions"
  | "blood_pressure"
  | "family_history"
  | "social_wellbeing"
  | "substance_exposure";

export type GainId =
  | "gain_quit_smoking"
  | "gain_move_more"
  | "gain_walk_faster"
  | "gain_sit_less"
  | "gain_sleep_range"
  | "gain_sleep_apnea_review"
  | "gain_diet_quality"
  | "gain_reduce_alcohol"
  | "gain_body_composition"
  | "gain_build_strength"
  | "gain_build_fitness";

export type LongevityAdjustment = Readonly<{
  id: AdjustmentId;
  years: number;
}>;

export type CauseKey =
  | "cardiovascular"
  | "cancer"
  | "respiratory"
  | "metabolic"
  | "external";

export type CauseOutlook = Readonly<{
  cause: CauseKey;
  /** Part relative 0–100 du profil de risque, somme = 100. */
  share: number;
}>;

export type ModifiableGain = Readonly<{
  id: GainId;
  years: number;
}>;

export type LongevityEstimate = Readonly<{
  eligible: boolean;
  /** Fraction 0–1 des entrées du modèle effectivement répondues. */
  coverage: number;
  baselineDeathAge: number | null;
  estimatedDeathAge: number | null;
  range: Readonly<{ low: number; high: number }> | null;
  totalAdjustmentYears: number;
  adjustments: ReadonlyArray<LongevityAdjustment>;
  pillars: ReadonlyArray<PillarBreakdown>;
  causes: ReadonlyArray<CauseOutlook>;
  gains: ReadonlyArray<ModifiableGain>;
  /** Écart d'âge de forme (positif = plus « vieux » que l'âge civil). Null sans VO₂ max. */
  fitnessAgeDelta: number | null;
}>;

type Sex = "female" | "male" | "unspecified";

const LIFE_TABLE_AGES = [18, 30, 40, 50, 60, 70, 80, 90, 100] as const;
// Espérance de vie restante (années), ordre de grandeur Europe occidentale.
const REMAINING_LIFE_FEMALE = [68.2, 56.5, 46.8, 37.3, 28.2, 19.6, 11.9, 5.8, 2.4] as const;
const REMAINING_LIFE_MALE = [64.5, 52.9, 43.3, 34.0, 25.2, 17.2, 10.2, 4.9, 2.1] as const;

const COUNTRY_YEARS_OFFSET: Readonly<Record<string, number>> = {
  CH: 0.8,
  GB: -0.7,
  US: -2.5,
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function sexFromAnswers(answers: AnswerMap): Sex {
  const value = answers.sex_assigned_at_birth;
  if (value === "female" || value === "male") return value;
  return "unspecified";
}

function interpolateRemaining(age: number, table: ReadonlyArray<number>): number {
  if (age <= LIFE_TABLE_AGES[0]) return table[0];
  const last = LIFE_TABLE_AGES.length - 1;
  if (age >= LIFE_TABLE_AGES[last]) return table[last];
  for (let index = 1; index <= last; index += 1) {
    if (age <= LIFE_TABLE_AGES[index]) {
      const left = LIFE_TABLE_AGES[index - 1];
      const right = LIFE_TABLE_AGES[index];
      const ratio = (age - left) / (right - left);
      return table[index - 1] + ratio * (table[index] - table[index - 1]);
    }
  }
  return table[last];
}

export function baselineDeathAgeFor(
  age: number,
  sex: Sex,
  countryCode: string,
): number {
  const female = interpolateRemaining(age, REMAINING_LIFE_FEMALE);
  const male = interpolateRemaining(age, REMAINING_LIFE_MALE);
  const remaining =
    sex === "female" ? female : sex === "male" ? male : (female + male) / 2;
  const offset = COUNTRY_YEARS_OFFSET[countryCode] ?? 0;
  return round1(age + remaining + offset);
}

/** VO₂ max attendu (ml/kg/min) pour l'âge, approximation de cohortes de référence. */
function expectedVo2Max(age: number, sex: Sex): number {
  const base = sex === "female" ? 40 : sex === "male" ? 47 : 43.5;
  const decline = sex === "female" ? 0.27 : 0.3;
  return Math.max(14, base - decline * Math.max(0, age - 20));
}

type ComponentValue = number | null;

function mean(components: ReadonlyArray<ComponentValue>): {
  score: number | null;
  answered: number;
  total: number;
} {
  const answered = components.filter((value): value is number => value !== null);
  return {
    score:
      answered.length === 0
        ? null
        : Math.round(
            (answered.reduce((sum, value) => sum + value, 0) / answered.length) * 100,
          ),
    answered: answered.length,
    total: components.length,
  };
}

function scaleValue(value: unknown): number | null {
  // Les réponses "scale" sont saisies 0–10 dans le contrôle numérique.
  const number = asNumber(value);
  if (number === null) return null;
  return Math.min(1, Math.max(0, number / 10));
}

function frequencyScore(value: unknown, descending: boolean): number | null {
  const ladder: Record<string, number> = {
    never: 1,
    rarely: 0.8,
    sometimes: 0.55,
    often: 0.3,
    daily: 0.1,
  };
  if (typeof value !== "string" || !(value in ladder)) return null;
  const score = ladder[value];
  return descending ? score : 1 - score + 0.1 > 1 ? 1 : round1(1.1 - score);
}

function bmiFrom(answers: AnswerMap): number | null {
  const height = asNumber(answers.height_cm);
  const weight = asNumber(answers.weight_kg);
  if (height === null || weight === null || height < 90 || height > 250) return null;
  if (weight < 25 || weight > 350) return null;
  const meters = height / 100;
  return weight / (meters * meters);
}

function isCurrentSmoker(answers: AnswerMap): boolean | null {
  const current = answers.current_tobacco_nicotine;
  if (current === false) return false;
  if (current !== true) return null;
  // La substitution nicotinique prescrite seule n'est pas comptée comme tabagisme.
  return answers.tobacco_nicotine_context !== "only_prescribed_nrt_quit_plan";
}

function diagnosedConditions(answers: AnswerMap): ReadonlySet<string> {
  const value = answers.diagnosed_conditions_core;
  return new Set(Array.isArray(value) ? value.filter((item) => item !== "none") : []);
}

function cardioComponents(answers: AnswerMap, profile: ProfileContext): ComponentValue[] {
  const sex = sexFromAnswers(answers);
  const minutes = asNumber(answers.weekly_moderate_activity_minutes);
  const pace = answers.walking_pace_self_rated;
  const stairs = answers.stair_flights_capacity;
  const vo2 = asNumber(answers.reported_vo2_max_ml_kg_min);
  const rhr = asNumber(answers.resting_heart_rate_bpm);
  const sitting = asNumber(answers.sedentary_total_hours);
  const smoker = isCurrentSmoker(answers);

  return [
    minutes === null ? null : Math.min(1, minutes / 300),
    pace === "slow" ? 0.2 : pace === "average" ? 0.6 : pace === "brisk" ? 1 : null,
    stairs === "none"
      ? 0.1
      : stairs === "one_two"
        ? 0.4
        : stairs === "three_five"
          ? 0.7
          : stairs === "six_plus"
            ? 1
            : null,
    vo2 === null
      ? null
      : Math.min(
          1,
          Math.max(0, (vo2 / expectedVo2Max(profile.age, sex) - 0.5) / 0.7),
        ),
    rhr === null || rhr < 30 || rhr > 220
      ? null
      : rhr <= 60
        ? 1
        : rhr <= 70
          ? 0.8
          : rhr <= 80
            ? 0.55
            : rhr <= 90
              ? 0.3
              : 0.15,
    sitting === null || sitting > 24
      ? null
      : sitting <= 6
        ? 1
        : sitting <= 9
          ? 0.7
          : sitting <= 12
            ? 0.4
            : 0.2,
    smoker === null ? null : smoker ? 0 : answers.smoking_history_former === true ? 0.6 : 1,
  ];
}

function strengthComponents(answers: AnswerMap): ComponentValue[] {
  const sex = sexFromAnswers(answers);
  const weight = asNumber(answers.weight_kg);
  const grip = asNumber(answers.grip_strength_kg);
  const gripReference = sex === "female" ? 29 : sex === "male" ? 46 : 37.5;
  const squat = asNumber(answers.squat_one_rep_max_kg);
  const deadlift = asNumber(answers.deadlift_one_rep_max_kg);
  const pushups = asNumber(answers.pushup_max_reps);
  const strengthDays = asNumber(answers.movement_strength_days);
  const chair = answers.chair_rise_capacity;
  const tasks = answers.movement_daily_tasks;

  const ratioScore = (load: number | null, target: number): number | null =>
    load === null || weight === null || weight <= 0
      ? null
      : Math.min(1, load / weight / target);

  return [
    strengthDays === null ? null : Math.min(1, strengthDays / 3),
    grip === null || grip > 120
      ? null
      : Math.min(1, Math.max(0, (grip / gripReference - 0.4) / 0.7)),
    pushups === null ? null : Math.min(1, pushups / 40),
    chair === "easy_no_hands"
      ? 1
      : chair === "hands_support"
        ? 0.55
        : chair === "much_difficulty"
          ? 0.25
          : chair === "cannot"
            ? 0.05
            : null,
    ratioScore(squat, 1.25),
    ratioScore(deadlift, 1.6),
    tasks === "no_difficulty"
      ? 1
      : tasks === "some_difficulty"
        ? 0.6
        : tasks === "much_difficulty"
          ? 0.25
          : tasks === "cannot"
            ? 0.05
            : null,
    answers.movement_balance_training === true
      ? 1
      : answers.movement_balance_training === false
        ? 0.4
        : null,
  ];
}

function sleepComponents(answers: AnswerMap): ComponentValue[] {
  const hours = asNumber(answers.usual_sleep_hours);
  const variation = asNumber(answers.circadian_bedtime_variation);

  return [
    hours === null || hours > 24
      ? null
      : hours >= 7 && hours <= 9
        ? 1
        : (hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)
          ? 0.6
          : 0.25,
    scaleValue(answers.sleep_refreshed),
    frequencyScore(answers.sleep_awakenings, true),
    answers.sleep_snoring === "yes"
      ? 0.3
      : answers.sleep_snoring === "no"
        ? 1
        : answers.sleep_snoring === "unknown"
          ? 0.6
          : null,
    frequencyScore(answers.sleep_daytime_sleepiness, true),
    variation === null
      ? null
      : variation <= 1
        ? 1
        : variation <= 2
          ? 0.7
          : 0.4,
    answers.circadian_shift_work === true
      ? 0.5
      : answers.circadian_shift_work === false
        ? 1
        : null,
    frequencyScore(answers.circadian_late_caffeine, true),
  ];
}

function heavyDrinkingScore(answers: AnswerMap): number | null {
  const episodes = answers.alcohol_detail_heavy_episode;
  if (answers.alcohol_frequency === "never") return 1;
  if (typeof episodes !== "string") return null;
  const ladder: Record<string, number> = {
    never: 1,
    less_monthly: 0.8,
    monthly: 0.6,
    weekly: 0.25,
    daily: 0.05,
  };
  return episodes in ladder ? ladder[episodes] : null;
}

function nutritionComponents(answers: AnswerMap): ComponentValue[] {
  const sex = sexFromAnswers(answers);
  const plants = asNumber(answers.plant_food_frequency);
  const sugary = asNumber(answers.diet_sugary_drinks);
  const fish = asNumber(answers.diet_fish);
  const legumes = asNumber(answers.diet_legumes);
  const nuts = asNumber(answers.diet_nuts_seeds);
  const bmi = bmiFrom(answers);
  const waist = asNumber(answers.waist_circumference_cm);
  const waistLimit = sex === "female" ? 88 : sex === "male" ? 102 : 95;

  return [
    plants === null ? null : Math.min(1, plants / 5),
    frequencyScore(answers.diet_processed_meat, true),
    sugary === null ? null : sugary <= 0 ? 1 : sugary <= 3 ? 0.7 : sugary <= 7 ? 0.45 : 0.2,
    frequencyScore(answers.diet_whole_grains, false),
    frequencyScore(answers.diet_ultra_processed, true),
    fish === null ? null : Math.min(1, fish / 2),
    legumes === null ? null : Math.min(1, legumes / 3),
    nuts === null ? null : Math.min(1, nuts / 5),
    bmi === null
      ? null
      : bmi < 18.5
        ? 0.5
        : bmi < 25
          ? 1
          : bmi < 30
            ? 0.7
            : bmi < 35
              ? 0.4
              : 0.2,
    waist === null || waist > 250
      ? null
      : waist <= waistLimit
        ? 1
        : waist <= waistLimit + 10
          ? 0.6
          : 0.3,
    heavyDrinkingScore(answers),
  ];
}

export function buildPillarBreakdowns(
  answers: AnswerMap,
  profile: ProfileContext,
): PillarBreakdown[] {
  const definitions: ReadonlyArray<[HealthPillar, ComponentValue[]]> = [
    ["cardio-energy", cardioComponents(answers, profile)],
    ["strength-neural", strengthComponents(answers)],
    ["sleep-circadian", sleepComponents(answers)],
    ["nutrition-metabolic", nutritionComponents(answers)],
  ];
  return definitions.map(([pillar, components]) => {
    const summary = mean(components);
    return {
      pillar,
      score: summary.score,
      answeredComponents: summary.answered,
      totalComponents: summary.total,
    };
  });
}

type AdjustmentDraft = { id: AdjustmentId; years: number };

function smokingAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  const smoker = isCurrentSmoker(answers);
  const years = asNumber(answers.smoking_total_years);
  const perDay = asNumber(answers.tobacco_detail_frequency);

  if (smoker === true) {
    let penalty = -7;
    if (perDay !== null) penalty = perDay >= 20 ? -9 : perDay >= 10 ? -7 : -5;
    if (years !== null && years >= 30) penalty -= 1;
    drafts.push({ id: "smoking_current", years: penalty });
  } else if (answers.smoking_history_former === true) {
    drafts.push({
      id: "smoking_former",
      years: years !== null && years >= 20 ? -3 : -2,
    });
  }
  return drafts;
}

function activityAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  const minutes = asNumber(answers.weekly_moderate_activity_minutes);
  if (minutes !== null) {
    const years = minutes >= 300 ? 2.5 : minutes >= 150 ? 1.5 : minutes > 0 ? 0 : -2;
    if (years !== 0) drafts.push({ id: "activity_minutes", years });
  }
  const pace = answers.walking_pace_self_rated;
  if (pace === "brisk") drafts.push({ id: "walking_pace", years: 1.5 });
  else if (pace === "slow") drafts.push({ id: "walking_pace", years: -2 });

  const strengthDays = asNumber(answers.movement_strength_days);
  if (strengthDays !== null && strengthDays >= 2) {
    drafts.push({ id: "strength_training", years: 1 });
  }
  const sitting = asNumber(answers.sedentary_total_hours);
  if (sitting !== null && sitting <= 24 && sitting >= 10) {
    drafts.push({ id: "sedentary_time", years: -1 });
  }
  const chair = answers.chair_rise_capacity;
  if (chair === "much_difficulty" || chair === "cannot") {
    drafts.push({ id: "functional_strength", years: -2 });
  }
  return drafts;
}

function fitnessAdjustment(
  answers: AnswerMap,
  profile: ProfileContext,
): AdjustmentDraft[] {
  const vo2 = asNumber(answers.reported_vo2_max_ml_kg_min);
  if (vo2 === null || vo2 > 95) return [];
  const ratio = vo2 / expectedVo2Max(profile.age, sexFromAnswers(answers));
  if (ratio >= 1.15) return [{ id: "cardio_fitness", years: 2 }];
  if (ratio < 0.7) return [{ id: "cardio_fitness", years: -3 }];
  if (ratio < 0.85) return [{ id: "cardio_fitness", years: -1.5 }];
  return [];
}

function sleepAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  const hours = asNumber(answers.usual_sleep_hours);
  if (hours !== null && hours <= 24) {
    if (hours < 6 || hours > 9) drafts.push({ id: "sleep_duration", years: -1.5 });
    else if (hours < 7) drafts.push({ id: "sleep_duration", years: -0.5 });
  }
  const sleepiness = answers.sleep_daytime_sleepiness;
  if (
    answers.sleep_snoring === "yes" &&
    (sleepiness === "often" || sleepiness === "daily")
  ) {
    drafts.push({ id: "sleep_apnea_signal", years: -1 });
  }
  return drafts;
}

function nutritionAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  let dietYears = 0;
  const plants = asNumber(answers.plant_food_frequency);
  if (plants !== null) dietYears += plants >= 5 ? 1.5 : plants >= 3 ? 0.5 : plants < 1 ? -1 : 0;
  const processed = answers.diet_processed_meat;
  if (processed === "often" || processed === "daily") dietYears -= 1.5;
  const sugary = asNumber(answers.diet_sugary_drinks);
  if (sugary !== null && sugary >= 7) dietYears -= 1;
  const ultra = answers.diet_ultra_processed;
  if (ultra === "often" || ultra === "daily") dietYears -= 1;
  const grains = answers.diet_whole_grains;
  if (grains === "often" || grains === "daily") dietYears += 0.5;
  dietYears = Math.max(-3.5, Math.min(3, dietYears));
  if (dietYears !== 0) drafts.push({ id: "diet_pattern", years: round1(dietYears) });

  const bmi = bmiFrom(answers);
  if (bmi !== null) {
    if (bmi >= 35) drafts.push({ id: "body_composition", years: -3 });
    else if (bmi >= 30) drafts.push({ id: "body_composition", years: -1.5 });
    else if (bmi < 18.5) drafts.push({ id: "body_composition", years: -1.5 });
  } else {
    const sex = sexFromAnswers(answers);
    const waist = asNumber(answers.waist_circumference_cm);
    const waistLimit = sex === "female" ? 88 : sex === "male" ? 102 : 95;
    if (waist !== null && waist <= 250 && waist > waistLimit + 10) {
      drafts.push({ id: "body_composition", years: -1.5 });
    }
  }
  return drafts;
}

function alcoholAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  const heavy = answers.alcohol_detail_heavy_episode;
  if (heavy === "weekly" || heavy === "daily") {
    drafts.push({ id: "alcohol_heavy", years: heavy === "daily" ? -3 : -2 });
  } else if (heavy === "monthly") {
    drafts.push({ id: "alcohol_heavy", years: -1 });
  } else if (answers.alcohol_frequency === "four_plus_weekly") {
    const amount = asNumber(answers.alcohol_detail_typical_amount);
    if (amount !== null && amount >= 3) {
      drafts.push({ id: "alcohol_heavy", years: -1.5 });
    }
  }
  return drafts;
}

function clinicalAdjustments(answers: AnswerMap): AdjustmentDraft[] {
  const drafts: AdjustmentDraft[] = [];
  const conditions = diagnosedConditions(answers);
  let conditionYears = 0;
  if (conditions.has("diabetes")) conditionYears -= 5;
  if (conditions.has("heart_vascular")) conditionYears -= 4;
  if (conditions.has("lung")) conditionYears -= 3;
  if (conditions.has("kidney")) conditionYears -= 3;
  if (conditions.has("liver")) conditionYears -= 3;
  if (conditions.has("cancer")) conditionYears -= 3;
  conditionYears = Math.max(-8, conditionYears);
  if (conditionYears !== 0) {
    drafts.push({ id: "diagnosed_conditions", years: conditionYears });
  }

  const systolic = asNumber(answers.blood_pressure_systolic);
  if (systolic !== null && systolic >= 80 && systolic <= 260) {
    if (systolic >= 160) drafts.push({ id: "blood_pressure", years: -2.5 });
    else if (systolic >= 140) drafts.push({ id: "blood_pressure", years: -1.5 });
  } else if (answers.diagnosed_high_blood_pressure === true) {
    drafts.push({ id: "blood_pressure", years: -1 });
  }

  let familyYears = 0;
  if (answers.family_early_cvd === true) familyYears -= 1;
  if (answers.family_sudden_death === true) familyYears -= 1;
  if (answers.family_diabetes === true) familyYears -= 0.5;
  if (familyYears !== 0) drafts.push({ id: "family_history", years: familyYears });

  let socialYears = 0;
  const loneliness = answers.social_loneliness;
  if (loneliness === "often" || loneliness === "daily") socialYears -= 1;
  if (answers.reliable_social_support === false) socialYears -= 0.5;
  const mood = answers.mood_low_frequency;
  if (mood === "nearly_every_day") socialYears -= 1;
  socialYears = Math.max(-2, socialYears);
  if (socialYears !== 0) drafts.push({ id: "social_wellbeing", years: socialYears });

  let substanceYears = 0;
  if (answers.uses_nonmedical_opioids === true) substanceYears -= 3;
  if (answers.uses_nonmedical_stimulants === true) substanceYears -= 2;
  if (answers.opioid_detail_mixing === true) substanceYears -= 1;
  substanceYears = Math.max(-4, substanceYears);
  if (substanceYears !== 0) drafts.push({ id: "substance_exposure", years: substanceYears });

  return drafts;
}

const MODEL_INPUT_IDS = [
  "sex_assigned_at_birth",
  "height_cm",
  "weight_kg",
  "weekly_moderate_activity_minutes",
  "walking_pace_self_rated",
  "stair_flights_capacity",
  "usual_sleep_hours",
  "sleep_snoring",
  "plant_food_frequency",
  "diet_processed_meat",
  "diet_sugary_drinks",
  "current_tobacco_nicotine",
  "smoking_history_former",
  "alcohol_frequency",
  "diagnosed_conditions_core",
  "family_early_cvd",
  "sedentary_total_hours",
  "movement_strength_days",
] as const;

function modelCoverage(answers: AnswerMap): number {
  const answered = MODEL_INPUT_IDS.filter(
    (id) => answers[id] !== undefined && answers[id] !== null,
  ).length;
  return answered / MODEL_INPUT_IDS.length;
}

function causeShares(
  answers: AnswerMap,
  profile: ProfileContext,
): CauseOutlook[] {
  const conditions = diagnosedConditions(answers);
  const smoker = isCurrentSmoker(answers) === true;
  const formerSmoker = answers.smoking_history_former === true;
  const minutes = asNumber(answers.weekly_moderate_activity_minutes);
  const bmi = bmiFrom(answers);
  const heavyAlcohol =
    answers.alcohol_detail_heavy_episode === "weekly" ||
    answers.alcohol_detail_heavy_episode === "daily";

  // Poids de base par cause, ordre de grandeur des statistiques de décès
  // d'Europe occidentale, modulés par l'âge puis par les réponses.
  const young = profile.age < 45;
  const weights: Record<CauseKey, number> = {
    cardiovascular: young ? 15 : 30,
    cancer: young ? 15 : 28,
    respiratory: young ? 5 : 8,
    metabolic: young ? 5 : 7,
    external: young ? 30 : 6,
  };

  if (smoker) {
    weights.cardiovascular += 10;
    weights.cancer += 12;
    weights.respiratory += 10;
  } else if (formerSmoker) {
    weights.cancer += 5;
    weights.respiratory += 3;
  }
  if (conditions.has("heart_vascular") || answers.family_early_cvd === true) {
    weights.cardiovascular += 10;
  }
  if (answers.family_sudden_death === true) weights.cardiovascular += 5;
  if (conditions.has("diabetes")) weights.metabolic += 10;
  if (bmi !== null && bmi >= 30) {
    weights.metabolic += 6;
    weights.cardiovascular += 4;
  }
  if (conditions.has("lung")) weights.respiratory += 10;
  if (conditions.has("cancer") || answers.family_cancer_patterns === true) {
    weights.cancer += 10;
  }
  const processed = answers.diet_processed_meat;
  if (processed === "often" || processed === "daily") weights.cancer += 3;
  if (heavyAlcohol) {
    weights.external += 8;
    weights.cancer += 3;
  }
  if (
    answers.uses_nonmedical_opioids === true ||
    answers.uses_nonmedical_stimulants === true
  ) {
    weights.external += 12;
  }
  if (minutes !== null && minutes === 0) weights.cardiovascular += 4;

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return (Object.entries(weights) as Array<[CauseKey, number]>)
    .map(([cause, weight]) => ({
      cause,
      share: Math.round((weight / total) * 100),
    }))
    .sort((left, right) => right.share - left.share);
}

const GAIN_BY_ADJUSTMENT: Readonly<Partial<Record<AdjustmentId, GainId>>> = {
  smoking_current: "gain_quit_smoking",
  activity_minutes: "gain_move_more",
  walking_pace: "gain_walk_faster",
  sedentary_time: "gain_sit_less",
  sleep_duration: "gain_sleep_range",
  sleep_apnea_signal: "gain_sleep_apnea_review",
  diet_pattern: "gain_diet_quality",
  alcohol_heavy: "gain_reduce_alcohol",
  body_composition: "gain_body_composition",
  functional_strength: "gain_build_strength",
  cardio_fitness: "gain_build_fitness",
};

function modifiableGains(adjustments: ReadonlyArray<AdjustmentDraft>): ModifiableGain[] {
  return adjustments
    .flatMap((adjustment) => {
      const gainId = GAIN_BY_ADJUSTMENT[adjustment.id];
      if (adjustment.years >= 0 || gainId === undefined) return [];
      return [
        {
          id: gainId,
          years: round1(Math.min(6, Math.abs(adjustment.years) * 0.8)),
        },
      ];
    })
    .filter((gain) => gain.years >= 0.5)
    .sort((left, right) => right.years - left.years)
    .slice(0, 4);
}

export function estimateLongevity(
  answers: AnswerMap,
  profile: ProfileContext,
): LongevityEstimate {
  const pillars = buildPillarBreakdowns(answers, profile);
  const coverage = modelCoverage(answers);
  const eligible = profile.age >= 18 && profile.age <= 100 && coverage >= 0.4;

  const vo2 = asNumber(answers.reported_vo2_max_ml_kg_min);
  let fitnessAgeDelta: number | null = null;
  if (vo2 !== null && vo2 <= 95 && profile.age >= 18) {
    const sex = sexFromAnswers(answers);
    const expected = expectedVo2Max(profile.age, sex);
    const declinePerYear = sex === "female" ? 0.27 : 0.3;
    fitnessAgeDelta = round1(
      Math.max(-20, Math.min(20, (expected - vo2) / declinePerYear)),
    );
  }

  if (!eligible) {
    return {
      eligible: false,
      coverage: round1(coverage),
      baselineDeathAge: null,
      estimatedDeathAge: null,
      range: null,
      totalAdjustmentYears: 0,
      adjustments: [],
      pillars,
      causes: [],
      gains: [],
      fitnessAgeDelta,
    };
  }

  const drafts = [
    ...smokingAdjustments(answers),
    ...activityAdjustments(answers),
    ...fitnessAdjustment(answers, profile),
    ...sleepAdjustments(answers),
    ...nutritionAdjustments(answers),
    ...alcoholAdjustments(answers),
    ...clinicalAdjustments(answers),
  ];

  const rawTotal = drafts.reduce((sum, draft) => sum + draft.years, 0);
  const totalAdjustment = Math.max(-18, Math.min(8, round1(rawTotal)));
  const sex = sexFromAnswers(answers);
  const baseline = baselineDeathAgeFor(profile.age, sex, profile.countryCode);
  const estimated = Math.min(
    105,
    Math.max(profile.age + 1, round1(baseline + totalAdjustment)),
  );
  const halfWidth = round1(Math.max(4, 8 - coverage * 4));

  return {
    eligible: true,
    coverage: round1(coverage),
    baselineDeathAge: baseline,
    estimatedDeathAge: estimated,
    range: {
      low: Math.max(profile.age + 1, round1(estimated - halfWidth)),
      high: Math.min(105, round1(estimated + halfWidth)),
    },
    totalAdjustmentYears: totalAdjustment,
    adjustments: drafts
      .map((draft) => ({ id: draft.id, years: round1(draft.years) }))
      .sort((left, right) => left.years - right.years),
    pillars,
    causes: causeShares(answers, profile),
    gains: modifiableGains(drafts),
    fitnessAgeDelta,
  };
}
