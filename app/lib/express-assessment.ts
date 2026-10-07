import Decimal from "decimal.js";
import type { AnswerMap } from "./types";

export type ExpressAxisId = "cardio" | "strength" | "sleep" | "nutrition";
export type ExpressSex = "female" | "male" | "intersex";
export type ExpressReferenceSex = Exclude<ExpressSex, "intersex">;
export type ChairStandBand = "below" | "within" | "above";

export type ExpressSignalId =
  | "cardio-low-fitness" | "cardio-below-median" | "activity-below-guideline"
  | "strength-below-range" | "strength-days-below-guideline"
  | "sleep-short" | "sleep-long" | "sleep-unrefreshing"
  | "plants-low" | "processed-frequent"
  | "sex-reference-unavailable" | "chair-stand-reference-from-60"
  | "cardio-maintain" | "strength-maintain" | "sleep-maintain" | "nutrition-maintain"
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
  version: "express-index-v2";
  kind: "complete-index" | "partial-index" | "insufficient-inputs" | "not-available";
  score: number | null;
  axes: readonly ExpressAxis[];
  answeredCount: number;
  interpretableComponentCount: number;
  applicableComponentCount: number;
  scoredAxisCount: number;
  profile: "favorable" | "mixed" | "attention" | "incomplete";
  priorities: ExpressSignalId[];
};

const ATTENTION_SIGNALS: ReadonlySet<ExpressSignalId> = new Set<ExpressSignalId>([
  "cardio-low-fitness", "strength-below-range", "sleep-short", "sleep-long",
  "sleep-unrefreshing", "plants-low", "processed-frequent",
]);
const GUIDELINE_SIGNALS: ReadonlySet<ExpressSignalId> = new Set<ExpressSignalId>([
  "cardio-below-median", "activity-below-guideline", "strength-days-below-guideline",
]);
const CONTEXT_SIGNALS: ReadonlySet<ExpressSignalId> = new Set<ExpressSignalId>([
  "sex-reference-unavailable", "chair-stand-reference-from-60",
]);

/**
 * Percentiles de VO₂max (ml·kg⁻¹·min⁻¹) du registre FRIEND, tapis roulant,
 * adultes états-uniens de 20 à 79 ans sans maladie cardiovasculaire.
 * Kaminsky LA, Arena R, Myers J. Mayo Clin Proc 2015;90(11):1515-23, table 3.
 * Colonnes : p5, p10, p25, p50, p75, p90, p95.
 */
export const FRIEND_PERCENTILES = [5, 10, 25, 50, 75, 90, 95] as const;
type PercentileRow = readonly [number, number, number, number, number, number, number];
type FriendBand = Readonly<{ ageFrom: number; ageTo: number; values: PercentileRow }>;

export const FRIEND_VO2_MAX: Readonly<Record<ExpressReferenceSex, readonly FriendBand[]>> = {
  male: [
    { ageFrom: 20, ageTo: 29, values: [29.0, 32.1, 40.1, 48.0, 55.2, 61.8, 66.3] },
    { ageFrom: 30, ageTo: 39, values: [27.2, 30.2, 35.9, 42.4, 49.2, 56.5, 59.8] },
    { ageFrom: 40, ageTo: 49, values: [24.2, 26.8, 31.9, 37.8, 45.0, 52.1, 55.6] },
    { ageFrom: 50, ageTo: 59, values: [20.9, 22.8, 27.1, 32.6, 39.7, 45.6, 50.7] },
    { ageFrom: 60, ageTo: 69, values: [17.4, 19.8, 23.7, 28.2, 34.5, 40.3, 43.0] },
    { ageFrom: 70, ageTo: 79, values: [16.3, 17.1, 20.4, 24.4, 30.4, 36.6, 39.7] },
  ],
  female: [
    { ageFrom: 20, ageTo: 29, values: [21.7, 23.9, 30.5, 37.6, 44.7, 51.3, 56.0] },
    { ageFrom: 30, ageTo: 39, values: [19.0, 20.9, 25.3, 30.2, 36.1, 41.4, 45.8] },
    { ageFrom: 40, ageTo: 49, values: [17.0, 18.8, 22.1, 26.7, 32.4, 38.4, 41.7] },
    { ageFrom: 50, ageTo: 59, values: [16.0, 17.3, 19.9, 23.4, 27.6, 32.0, 35.9] },
    { ageFrom: 60, ageTo: 69, values: [13.4, 14.6, 17.2, 20.0, 23.8, 27.0, 29.4] },
    { ageFrom: 70, ageTo: 79, values: [13.1, 13.6, 15.6, 18.3, 20.8, 23.1, 24.1] },
  ],
};

/**
 * Lever de chaise 30 s : « normal range » (50 % centraux) du Senior Fitness Test,
 * Rikli RE & Jones CJ (1999 ; manuel 2013), adultes vivant à domicile, 60–94 ans.
 * La borne basse sert de seuil « below average » dans le CDC STEADI.
 */
type ChairStandBandReference = Readonly<{ ageFrom: number; ageTo: number; low: number; high: number }>;

export const CHAIR_STAND_NORMAL_RANGE: Readonly<Record<ExpressReferenceSex, readonly ChairStandBandReference[]>> = {
  male: [
    { ageFrom: 60, ageTo: 64, low: 14, high: 19 },
    { ageFrom: 65, ageTo: 69, low: 12, high: 18 },
    { ageFrom: 70, ageTo: 74, low: 12, high: 17 },
    { ageFrom: 75, ageTo: 79, low: 11, high: 17 },
    { ageFrom: 80, ageTo: 84, low: 10, high: 15 },
    { ageFrom: 85, ageTo: 89, low: 8, high: 14 },
    { ageFrom: 90, ageTo: 94, low: 7, high: 12 },
  ],
  female: [
    { ageFrom: 60, ageTo: 64, low: 12, high: 17 },
    { ageFrom: 65, ageTo: 69, low: 11, high: 16 },
    { ageFrom: 70, ageTo: 74, low: 10, high: 15 },
    { ageFrom: 75, ageTo: 79, low: 10, high: 15 },
    { ageFrom: 80, ageTo: 84, low: 9, high: 14 },
    { ageFrom: 85, ageTo: 89, low: 8, high: 13 },
    { ageFrom: 90, ageTo: 94, low: 4, high: 11 },
  ],
};

/**
 * Conventions de express-index-v2. Cardio (VO₂max) et lever de chaise sont
 * comparés à des normes publiées par âge et sexe ; activité, jours de
 * renforcement, sommeil et alimentation suivent des recommandations
 * (OMS 2020, Life's Essential 8, OMS alimentation), pas des normes.
 */
export const EXPRESS_INDEX_REFERENCE = {
  version: "express-index-v2",
  axisSupport: 65,
  profileAxisMinimum: 50,
  minimumComponents: 4,
  minimumAxes: 2,
  activityMinutes: 150,
  strengthDays: 2,
  plantPortions: 5,
  vo2LowFitnessPercentile: 25,
  vo2MedianPercentile: 50,
  vo2PercentileFloor: 1,
  vo2PercentileCeiling: 97,
  vo2ReferenceAges: { from: 20, to: 79, extrapolatedFrom: 18, extrapolatedTo: 120 },
  chairStandReferenceFromAge: 60,
  chairStandReferenceToAge: 94,
  chairStandPoints: { below: 25, within: 65, above: 100 },
  strengthDaysPoints: { none: 0, one: 50, guideline: 100 },
  sleepShortHours: 6,
  sleepLongHours: 10,
  sleepUnrefreshedMax: 3,
  plantsLowPortions: 3,
  // Life's Essential 8 : points de durée de sommeil, bornes [fromHours, toHours[.
  sleepPoints: [
    { fromHours: 7, toHours: 9, points: 100 },
    { fromHours: 9, toHours: 10, points: 90 },
    { fromHours: 6, toHours: 7, points: 70 },
    { fromHours: 5, toHours: 6, points: 40 },
    { fromHours: 10, toHours: null, points: 40 },
    { fromHours: 4, toHours: 5, points: 20 },
    { fromHours: 0, toHours: 4, points: 0 },
  ],
  processedPoints: { never: 100, rarely: 80, sometimes: 50, often: 25, daily: 0 },
  sources: {
    friend: {
      label: "Kaminsky LA, Arena R, Myers J. Reference standards for cardiorespiratory fitness measured with cardiopulmonary exercise testing: data from the FRIEND registry. Mayo Clin Proc. 2015;90(11):1515-1523.",
      doi: "10.1016/j.mayocp.2015.07.026",
      url: "https://doi.org/10.1016/j.mayocp.2015.07.026",
    },
    rikliJones: {
      label: "Rikli RE, Jones CJ. Functional fitness normative scores for community-residing older adults, ages 60-94. J Aging Phys Act. 1999;7(2):162-181; Senior Fitness Test Manual, 2nd ed. Human Kinetics; 2013.",
      doi: "10.1123/japa.7.2.162",
      url: "https://doi.org/10.1123/japa.7.2.162",
    },
    cdcSteadi: {
      label: "CDC STEADI. Assessment: 30-Second Chair Stand.",
      url: "https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-30Sec-508.pdf",
    },
    whoActivity: {
      label: "WHO guidelines on physical activity and sedentary behaviour. Geneva: World Health Organization; 2020.",
      url: "https://www.who.int/publications/i/item/9789240015128",
    },
    lifesEssential8: {
      label: "Lloyd-Jones DM, et al. Life's Essential 8: updating and enhancing the American Heart Association's construct of cardiovascular health. Circulation. 2022;146(5):e18-e43.",
      doi: "10.1161/CIR.0000000000001078",
      url: "https://doi.org/10.1161/CIR.0000000000001078",
    },
    whoDiet: {
      label: "WHO. Healthy diet fact sheet.",
      url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    },
  },
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

function guidelinePoints(value: number | null, guideline: number): number | null {
  return value === null ? null : new Decimal(value).div(guideline).times(100).clamp(0, 100).toNumber();
}

function validAge(ageYears: number | null): ageYears is number {
  return ageYears !== null && Number.isInteger(ageYears) && ageYears >= 18 && ageYears <= 120;
}

export function expressSex(value: unknown): ExpressSex | null {
  return value === "female" || value === "male" || value === "intersex" ? value : null;
}

function referenceSex(sex: ExpressSex | null): ExpressReferenceSex | null {
  return sex === "female" || sex === "male" ? sex : null;
}

/** Tranche FRIEND utilisée pour un âge : 18–19 ans → 20–29 ; 80 ans et plus → 70–79 (extrapolation). */
export function friendAgeBand(sex: ExpressSex | null, ageYears: number | null): FriendBand | null {
  const reference = referenceSex(sex);
  if (reference === null || !validAge(ageYears)) return null;
  const bands = FRIEND_VO2_MAX[reference];
  return bands.find((band) => ageYears >= band.ageFrom && ageYears <= band.ageTo)
    ?? (ageYears < bands[0].ageFrom ? bands[0] : bands[bands.length - 1]);
}

/**
 * Rang percentile FRIEND d'une VO₂max : interpolation linéaire entre anchors.
 * Sous p5, décroissance linéaire vers 0 à la moitié de la valeur p5, bornée à 1 ;
 * au-dessus de p95, borné à 97.
 */
export function vo2MaxPercentile(value: number | null, sex: ExpressSex | null, ageYears: number | null): number | null {
  const band = friendAgeBand(sex, ageYears);
  const vo2 = positive(value);
  if (band === null || vo2 === null) return null;
  const anchors = band.values;
  const p5 = anchors[0];
  const p95 = anchors[anchors.length - 1];
  if (vo2 >= p95) return EXPRESS_INDEX_REFERENCE.vo2PercentileCeiling;
  if (vo2 < p5) {
    const halfP5 = new Decimal(p5).div(2);
    return new Decimal(vo2).minus(halfP5).div(halfP5).times(FRIEND_PERCENTILES[0])
      .clamp(EXPRESS_INDEX_REFERENCE.vo2PercentileFloor, FRIEND_PERCENTILES[0]).toNumber();
  }
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const [low, high] = [anchors[index], anchors[index + 1]];
    if (vo2 >= low && vo2 < high) {
      const [pLow, pHigh] = [FRIEND_PERCENTILES[index], FRIEND_PERCENTILES[index + 1]];
      return new Decimal(vo2).minus(low).div(high - low).times(pHigh - pLow).plus(pLow).toNumber();
    }
  }
  return null;
}

/** Intervalle normal Rikli-Jones pour un âge : 95 ans et plus → 90–94 ; avant 60 ans → null. */
export function chairStandReference(sex: ExpressSex | null, ageYears: number | null): ChairStandBandReference | null {
  const reference = referenceSex(sex);
  if (reference === null || !validAge(ageYears) || ageYears < EXPRESS_INDEX_REFERENCE.chairStandReferenceFromAge) return null;
  const bands = CHAIR_STAND_NORMAL_RANGE[reference];
  return bands.find((band) => ageYears >= band.ageFrom && ageYears <= band.ageTo) ?? bands[bands.length - 1];
}

export function chairStandBand(count: number | null, sex: ExpressSex | null, ageYears: number | null): ChairStandBand | null {
  const range = chairStandReference(sex, ageYears);
  const stands = nonnegative(count);
  if (range === null || stands === null) return null;
  return stands < range.low ? "below" : stands > range.high ? "above" : "within";
}

export function sleepDurationPoints(hours: number | null): number | null {
  const valid = nonnegative(hours, 24);
  if (valid === null) return null;
  const band = EXPRESS_INDEX_REFERENCE.sleepPoints
    .find(({ fromHours, toHours }) => valid >= fromHours && (toHours === null || valid < toHours));
  return band?.points ?? null;
}

function strengthDaysPoints(days: number | null): number | null {
  if (days === null) return null;
  const { none, one, guideline } = EXPRESS_INDEX_REFERENCE.strengthDaysPoints;
  return days >= EXPRESS_INDEX_REFERENCE.strengthDays ? guideline : days >= 1 ? one : none;
}

type Component = Readonly<{ points: number | null; applicable: boolean }>;

function buildAxis(id: ExpressAxisId, components: readonly Component[], signals: readonly ExpressSignalId[]): AxisDraft {
  const applicable = components.filter((component) => component.applicable);
  const rawScore = mean(applicable.map((component) => component.points));
  const availableComponents = applicable.filter((component) => component.points !== null).length;
  const attention = signals.some((signal) => ATTENTION_SIGNALS.has(signal));
  const status: ExpressAxis["status"] = rawScore === null ? "missing" : attention ? "attention"
    : rawScore >= EXPRESS_INDEX_REFERENCE.axisSupport ? "support" : "improve";
  const actionable = signals.filter((signal) => !CONTEXT_SIGNALS.has(signal));
  const context = signals.filter((signal) => CONTEXT_SIGNALS.has(signal));
  const maintenance: ExpressSignalId[] = status === "support" && actionable.length === 0 ? [`${id}-maintain`] : [];
  return {
    rawScore,
    axis: {
      id, score: rawScore === null ? null : Math.round(rawScore),
      availableComponents, totalComponents: applicable.length, status,
      signals: [...actionable, ...maintenance, ...context],
    },
  };
}

function unavailable(): ExpressAssessment {
  const empty = (id: ExpressAxisId, total: number) => buildAxis(id,
    Array.from({ length: total }, () => ({ points: null, applicable: true })), []).axis;
  return {
    version: "express-index-v2", kind: "not-available", score: null,
    axes: [empty("cardio", 2), empty("strength", 2), empty("sleep", 2), empty("nutrition", 2)],
    answeredCount: 0, interpretableComponentCount: 0, applicableComponentCount: 8, scoredAxisCount: 0,
    profile: "incomplete", priorities: [],
  };
}

export function buildExpressAssessment(
  answers: AnswerMap,
  { ageYears }: { ageYears: number | null },
): ExpressAssessment {
  if (!validAge(ageYears)) return unavailable();

  const sex = expressSex(answers.sex_assigned_at_birth);
  const sexReferenced = referenceSex(sex) !== null;
  const vo2 = positive(answers.reported_vo2_max_ml_kg_min);
  const minutes = nonnegative(answers.weekly_moderate_activity_minutes);
  const stands = nonnegative(answers.chair_stand_30s_count);
  const days = nonnegative(answers.movement_strength_days);
  const hours = nonnegative(answers.usual_sleep_hours, 24);
  const refreshed = nonnegative(answers.sleep_refreshed, 10);
  const plants = nonnegative(answers.plant_food_frequency);
  const frequency = answers.diet_ultra_processed;
  const processed = typeof frequency === "string" && Object.hasOwn(EXPRESS_INDEX_REFERENCE.processedPoints, frequency)
    ? EXPRESS_INDEX_REFERENCE.processedPoints[frequency as keyof typeof EXPRESS_INDEX_REFERENCE.processedPoints]
    : null;

  const percentile = vo2MaxPercentile(vo2, sex, ageYears);
  const band = chairStandBand(stands, sex, ageYears);
  const chairStandApplicable = ageYears >= EXPRESS_INDEX_REFERENCE.chairStandReferenceFromAge;
  // Un sexe non renseigné laisse la composante applicable (à compléter) ;
  // « intersex » la retire du calcul faute de norme publiée.
  const sexApplicable = sex !== "intersex";

  const cardioSignals: ExpressSignalId[] = [];
  if (percentile !== null && percentile < EXPRESS_INDEX_REFERENCE.vo2LowFitnessPercentile) cardioSignals.push("cardio-low-fitness");
  else if (percentile !== null && percentile < EXPRESS_INDEX_REFERENCE.vo2MedianPercentile) cardioSignals.push("cardio-below-median");
  if (minutes !== null && minutes < EXPRESS_INDEX_REFERENCE.activityMinutes) cardioSignals.push("activity-below-guideline");
  if (vo2 !== null && !sexReferenced) cardioSignals.push("sex-reference-unavailable");

  const strengthSignals: ExpressSignalId[] = [];
  if (band === "below") strengthSignals.push("strength-below-range");
  if (days !== null && days < EXPRESS_INDEX_REFERENCE.strengthDays) strengthSignals.push("strength-days-below-guideline");
  if (stands !== null && !chairStandApplicable) strengthSignals.push("chair-stand-reference-from-60");
  else if (stands !== null && !sexReferenced) strengthSignals.push("sex-reference-unavailable");

  const sleepSignals: ExpressSignalId[] = [];
  if (hours !== null && hours < EXPRESS_INDEX_REFERENCE.sleepShortHours) sleepSignals.push("sleep-short");
  if (hours !== null && hours >= EXPRESS_INDEX_REFERENCE.sleepLongHours) sleepSignals.push("sleep-long");
  if (refreshed !== null && refreshed <= EXPRESS_INDEX_REFERENCE.sleepUnrefreshedMax) sleepSignals.push("sleep-unrefreshing");

  const nutritionSignals: ExpressSignalId[] = [];
  if (plants !== null && plants < EXPRESS_INDEX_REFERENCE.plantsLowPortions) nutritionSignals.push("plants-low");
  if (frequency === "often" || frequency === "daily") nutritionSignals.push("processed-frequent");

  const drafts = [
    buildAxis("cardio", [
      { points: percentile, applicable: sexApplicable },
      { points: guidelinePoints(minutes, EXPRESS_INDEX_REFERENCE.activityMinutes), applicable: true },
    ], cardioSignals),
    buildAxis("strength", [
      { points: band === null ? null : EXPRESS_INDEX_REFERENCE.chairStandPoints[band], applicable: sexApplicable && chairStandApplicable },
      { points: strengthDaysPoints(days), applicable: true },
    ], strengthSignals),
    buildAxis("sleep", [
      { points: sleepDurationPoints(hours), applicable: true },
      { points: refreshed === null ? null : refreshed * 10, applicable: true },
    ], sleepSignals),
    buildAxis("nutrition", [
      { points: guidelinePoints(plants, EXPRESS_INDEX_REFERENCE.plantPortions), applicable: true },
      { points: processed, applicable: true },
    ], nutritionSignals),
  ];
  const axes = drafts.map(({ axis }) => axis);
  const interpretableComponentCount = axes.reduce((sum, axis) => sum + axis.availableComponents, 0);
  const applicableComponentCount = axes.reduce((sum, axis) => sum + axis.totalComponents, 0);
  const scoredAxisCount = drafts.filter(({ rawScore }) => rawScore !== null).length;
  const sufficient = scoredAxisCount >= EXPRESS_INDEX_REFERENCE.minimumAxes
    && interpretableComponentCount >= EXPRESS_INDEX_REFERENCE.minimumComponents;
  const rawScore = sufficient ? mean(drafts.map((draft) => draft.rawScore)) : null;
  const complete = interpretableComponentCount === applicableComponentCount;

  const allSignals = axes.flatMap((axis) => axis.signals);
  const pick = (predicate: (signal: ExpressSignalId) => boolean) => allSignals.filter(predicate);
  const attention = pick((signal) => ATTENTION_SIGNALS.has(signal));
  const guideline = pick((signal) => GUIDELINE_SIGNALS.has(signal));
  const maintenance = pick((signal) => signal.endsWith("-maintain"));
  const context = pick((signal) => CONTEXT_SIGNALS.has(signal));
  const priorities = [...new Set<ExpressSignalId>([...attention, ...guideline,
    ...(complete ? [] : ["complete-measurements" as const]), ...maintenance, ...context])];

  return {
    version: "express-index-v2",
    kind: !sufficient ? "insufficient-inputs" : complete ? "complete-index" : "partial-index",
    score: rawScore === null ? null : Math.round(rawScore), axes,
    answeredCount: [sex, vo2, minutes, stands, days, hours, refreshed, plants, processed]
      .filter((value) => value !== null).length,
    interpretableComponentCount, applicableComponentCount, scoredAxisCount,
    profile: attention.length ? "attention" : !complete ? "incomplete"
      : rawScore !== null && rawScore >= EXPRESS_INDEX_REFERENCE.axisSupport
        && drafts.every((draft) => draft.rawScore !== null && draft.rawScore >= EXPRESS_INDEX_REFERENCE.profileAxisMinimum)
        ? "favorable" : "mixed",
    priorities: priorities.slice(0, 3),
  };
}
