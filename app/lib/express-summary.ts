import {
  chairStandBand,
  expressSex,
  vo2MaxPercentile,
  type ChairStandBand,
  type ExpressSex,
} from "./express-assessment";
import type { AnswerMap } from "./types";

const ULTRA_PROCESSED_FREQUENCIES = new Set([
  "never",
  "rarely",
  "sometimes",
  "often",
  "daily",
]);

type UltraProcessedFrequency =
  | "never"
  | "rarely"
  | "sometimes"
  | "often"
  | "daily";

export type ExpressSummary = Readonly<{
  sex: ExpressSex | null;
  cardio: Readonly<{
    vo2Max: number | null;
    vo2Percentile: number | null;
    moderateMinutes: number | null;
  }>;
  strength: Readonly<{
    chairStandCount: number | null;
    chairStandBand: ChairStandBand | null;
    strengthDays: number | null;
  }>;
  sleep: Readonly<{
    hours: number | null;
    refreshed: number | null;
  }>;
  nutrition: Readonly<{
    plantPortions: number | null;
    ultraProcessedFrequency: UltraProcessedFrequency | null;
  }>;
}>;

function finiteAtLeastZero(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function positive(value: unknown): number | null {
  const number = finiteAtLeastZero(value);
  return number !== null && number > 0 ? number : null;
}

function ultraProcessedFrequency(value: unknown): UltraProcessedFrequency | null {
  return typeof value === "string" && ULTRA_PROCESSED_FREQUENCIES.has(value)
    ? (value as UltraProcessedFrequency)
    : null;
}

export function buildExpressSummary(
  answers: AnswerMap,
  { ageYears }: { ageYears: number | null } = { ageYears: null },
): ExpressSummary {
  const sex = expressSex(answers.sex_assigned_at_birth);
  const vo2Max = positive(answers.reported_vo2_max_ml_kg_min);
  const chairStandCount = finiteAtLeastZero(answers.chair_stand_30s_count);
  const percentile = vo2MaxPercentile(vo2Max, sex, ageYears);

  return {
    sex,
    cardio: {
      vo2Max,
      vo2Percentile: percentile === null ? null : Math.round(percentile),
      moderateMinutes: finiteAtLeastZero(answers.weekly_moderate_activity_minutes),
    },
    strength: {
      chairStandCount,
      chairStandBand: chairStandBand(chairStandCount, sex, ageYears),
      strengthDays: finiteAtLeastZero(answers.movement_strength_days),
    },
    sleep: {
      hours: finiteAtLeastZero(answers.usual_sleep_hours),
      refreshed: finiteAtLeastZero(answers.sleep_refreshed),
    },
    nutrition: {
      plantPortions: finiteAtLeastZero(answers.plant_food_frequency),
      ultraProcessedFrequency: ultraProcessedFrequency(answers.diet_ultra_processed),
    },
  };
}
