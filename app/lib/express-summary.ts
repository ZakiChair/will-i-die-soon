import Decimal from "decimal.js";

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
  vo2Max: number | null;
  bodyContext: Readonly<{
    heightCm: number | null;
    weightKg: number | null;
  }>;
  strength: Readonly<{
    squatKg: number | null;
    squatBodyWeightRatio: number | null;
    deadliftKg: number | null;
    deadliftBodyWeightRatio: number | null;
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

function ratio(load: number | null, weight: number | null): number | null {
  return load !== null && weight !== null
    ? new Decimal(load)
        .div(weight)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber()
    : null;
}

function ultraProcessedFrequency(value: unknown): UltraProcessedFrequency | null {
  return typeof value === "string" && ULTRA_PROCESSED_FREQUENCIES.has(value)
    ? (value as UltraProcessedFrequency)
    : null;
}

export function buildExpressSummary(answers: AnswerMap): ExpressSummary {
  const weightKg = positive(answers.weight_kg);
  const squatKg = positive(answers.squat_one_rep_max_kg);
  const deadliftKg = positive(answers.deadlift_one_rep_max_kg);

  return {
    vo2Max: positive(answers.reported_vo2_max_ml_kg_min),
    bodyContext: {
      heightCm: positive(answers.height_cm),
      weightKg,
    },
    strength: {
      squatKg,
      squatBodyWeightRatio: ratio(squatKg, weightKg),
      deadliftKg,
      deadliftBodyWeightRatio: ratio(deadliftKg, weightKg),
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
