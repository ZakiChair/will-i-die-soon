import Decimal from "decimal.js";
import type { AnswerMap } from "./types";

export type ExpressAxisId = "cardio" | "strength" | "sleep" | "nutrition";
export type ExpressSignalId =
  | "sleep-short" | "sleep-long" | "sleep-unrefreshing"
  | "plants-low" | "processed-frequent"
  | "cardio-below-reference" | "strength-below-reference"
  | "sleep-improve" | "nutrition-improve"
  | "sleep-maintain" | "nutrition-maintain" | "cardio-maintain" | "strength-maintain"
  | "complete-measurements";

export type ExpressAxis = {
  id: ExpressAxisId;
  score: number | null;
  availableComponents: number;
  totalComponents: number;
  status: "support" | "improve" | "attention" | "missing";
  signals: ExpressSignalId[];
};

export type ExpressAssessment = {
  version: "express-index-v1";
  kind: "complete-index" | "partial-index" | "insufficient-inputs" | "not-available";
  score: number | null;
  axes: readonly ExpressAxis[];
  answeredCount: number;
  interpretableComponentCount: number;
  scoredAxisCount: number;
  profile: "favorable" | "mixed" | "attention" | "incomplete";
  priorities: ExpressSignalId[];
};

/**
 * Conventions produit de express-index-v1 : ni normes de population ni modèle
 * de risque. Les repères généraux de sommeil/alimentation ne valident pas ces
 * coefficients, les seuils de profil ou la moyenne équipondérée des axes.
 */
export const EXPRESS_INDEX_REFERENCE = {
  cardioVo2: 50,
  squatBodyWeight: 1,
  deadliftBodyWeight: 1.5,
  plantPortions: 5,
  axisSupport: 75,
  profileAxisMinimum: 60,
  minimumComponents: 4,
  minimumAxes: 2,
  sleepHourlyPenalty: 25,
  processedPoints: { never: 100, rarely: 80, sometimes: 50, often: 25, daily: 0 },
} as const;

type AxisDraft = { axis: ExpressAxis; rawScore: number | null };

function nonnegative(value: unknown, maximum = Number.MAX_VALUE): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum
    ? value : null;
}

function positive(value: unknown): number | null {
  const number = nonnegative(value);
  return number !== null && number > 0 ? number : null;
}

function mean(values: readonly (number | null)[]): number | null {
  const available = values.filter((value): value is number => value !== null);
  return available.length ? Decimal.sum(...available).div(available.length).toNumber() : null;
}

function referencePoints(value: number | null, reference: number): number | null {
  return value === null ? null : new Decimal(value).div(reference).times(100).clamp(0, 100).toNumber();
}

function strengthPoints(load: number | null, weight: number | null, reference: number): number | null {
  return load === null || weight === null ? null
    : new Decimal(load).div(weight).div(reference).times(100).clamp(0, 100).toNumber();
}

function buildAxis(
  id: ExpressAxisId,
  components: readonly (number | null)[],
  attentionSignals: ExpressSignalId[] = [],
): AxisDraft {
  const rawScore = mean(components);
  const availableComponents = components.filter((value) => value !== null).length;
  const signals: ExpressSignalId[] = rawScore === null ? [] : attentionSignals.length
    ? attentionSignals
    : id === "cardio" || id === "strength"
      ? [rawScore < 100 ? `${id}-below-reference` : `${id}-maintain`]
      : [rawScore < EXPRESS_INDEX_REFERENCE.axisSupport ? `${id}-improve` : `${id}-maintain`];
  return {
    rawScore,
    axis: {
      id, score: rawScore === null ? null : Math.round(rawScore),
      availableComponents, totalComponents: components.length,
      status: rawScore === null ? "missing" : attentionSignals.length ? "attention"
        : rawScore >= EXPRESS_INDEX_REFERENCE.axisSupport ? "support" : "improve",
      signals,
    },
  };
}

export function buildExpressAssessment(
  answers: AnswerMap,
  { ageYears }: { ageYears: number | null },
): ExpressAssessment {
  if (ageYears === null || !Number.isInteger(ageYears) || ageYears < 18 || ageYears > 120) {
    return {
      version: "express-index-v1", kind: "not-available", score: null,
      axes: [buildAxis("cardio", [null]), buildAxis("strength", [null, null]),
        buildAxis("sleep", [null, null]), buildAxis("nutrition", [null, null])].map(({ axis }) => axis),
      answeredCount: 0, interpretableComponentCount: 0, scoredAxisCount: 0,
      profile: "incomplete", priorities: [],
    };
  }

  const vo2 = positive(answers.reported_vo2_max_ml_kg_min);
  const squat = positive(answers.squat_one_rep_max_kg);
  const deadlift = positive(answers.deadlift_one_rep_max_kg);
  const height = positive(answers.height_cm);
  const weight = positive(answers.weight_kg);
  const hours = nonnegative(answers.usual_sleep_hours, 24);
  const refreshed = nonnegative(answers.sleep_refreshed, 10);
  const plants = nonnegative(answers.plant_food_frequency);
  const frequency = answers.diet_ultra_processed;
  const processed = typeof frequency === "string" && Object.hasOwn(EXPRESS_INDEX_REFERENCE.processedPoints, frequency)
    ? EXPRESS_INDEX_REFERENCE.processedPoints[frequency as keyof typeof EXPRESS_INDEX_REFERENCE.processedPoints]
    : null;

  const sleepUpper = ageYears >= 65 ? 8 : 9;
  const durationPoints = hours === null ? null
    : Math.max(0, 100 - EXPRESS_INDEX_REFERENCE.sleepHourlyPenalty * Math.max(7 - hours, hours - sleepUpper, 0));
  const sleepSignals: ExpressSignalId[] = [];
  if (hours !== null && hours < 7) sleepSignals.push("sleep-short");
  if (hours !== null && hours > sleepUpper) sleepSignals.push("sleep-long");
  if (refreshed !== null && refreshed <= 3) sleepSignals.push("sleep-unrefreshing");
  const nutritionSignals: ExpressSignalId[] = [];
  if (plants !== null && plants < 3) nutritionSignals.push("plants-low");
  if (frequency === "often" || frequency === "daily") nutritionSignals.push("processed-frequent");

  const drafts = [
    buildAxis("cardio", [referencePoints(vo2, EXPRESS_INDEX_REFERENCE.cardioVo2)]),
    buildAxis("strength", [strengthPoints(squat, weight, EXPRESS_INDEX_REFERENCE.squatBodyWeight),
      strengthPoints(deadlift, weight, EXPRESS_INDEX_REFERENCE.deadliftBodyWeight)]),
    buildAxis("sleep", [durationPoints, refreshed === null ? null : refreshed * 10], sleepSignals),
    buildAxis("nutrition", [referencePoints(plants, EXPRESS_INDEX_REFERENCE.plantPortions), processed], nutritionSignals),
  ];
  const axes = drafts.map(({ axis }) => axis);
  const interpretableComponentCount = axes.reduce((sum, axis) => sum + axis.availableComponents, 0);
  const scoredAxisCount = drafts.filter(({ rawScore }) => rawScore !== null).length;
  const sufficient = scoredAxisCount >= EXPRESS_INDEX_REFERENCE.minimumAxes
    && interpretableComponentCount >= EXPRESS_INDEX_REFERENCE.minimumComponents;
  const rawScore = sufficient ? mean(drafts.map((draft) => draft.rawScore)) : null;
  const complete = interpretableComponentCount === 7;
  const habitSignals = [...sleepSignals, ...nutritionSignals];
  const habitImprovements = axes.flatMap((axis) => axis.signals.filter((signal) => signal.endsWith("-improve")));
  const belowReference = axes.flatMap((axis) => axis.signals.filter((signal) => signal.endsWith("-below-reference")));
  const maintenance = [axes[2], axes[3], axes[0], axes[1]]
    .flatMap((axis) => axis.signals.filter((signal) => signal.endsWith("-maintain")));
  const priorities: ExpressSignalId[] = [...habitSignals, ...habitImprovements, ...belowReference,
    ...(!complete ? ["complete-measurements" as const] : []), ...maintenance];

  return {
    version: "express-index-v1",
    kind: !sufficient ? "insufficient-inputs" : complete ? "complete-index" : "partial-index",
    score: rawScore === null ? null : Math.round(rawScore), axes,
    answeredCount: [vo2, squat, deadlift, height, weight, hours, refreshed, plants, processed]
      .filter((value) => value !== null).length,
    interpretableComponentCount, scoredAxisCount,
    profile: habitSignals.length ? "attention" : !complete ? "incomplete"
      : rawScore !== null && rawScore >= EXPRESS_INDEX_REFERENCE.axisSupport
        && drafts.every((draft) => draft.rawScore !== null && draft.rawScore >= EXPRESS_INDEX_REFERENCE.profileAxisMinimum)
        ? "favorable" : "mixed",
    priorities: priorities.slice(0, 3),
  };
}
