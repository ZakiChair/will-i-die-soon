import { describe, expect, test } from "vitest";
import type { AnswerMap } from "./types";
import {
  buildExpressAssessment,
  chairStandBand,
  chairStandReference,
  EXPRESS_INDEX_REFERENCE,
  liftPoints,
  sleepDurationPoints,
  vo2MaxPercentile,
} from "./express-assessment";

const adult = { ageYears: 35 };
const senior = { ageYears: 67 };
// Homme de 35 ans : VO₂ max à la médiane FRIEND 30–39 ans, activité et renforcement aux recommandations OMS.
const complete: AnswerMap = {
  sex_assigned_at_birth: "male",
  reported_vo2_max_ml_kg_min: 42.4,
  weekly_moderate_activity_minutes: 150,
  chair_stand_30s_count: 20,
  movement_strength_days: 2,
  usual_sleep_hours: 7,
  sleep_refreshed: 8,
  plant_food_frequency: 4,
  diet_ultra_processed: "rarely",
};
// Femme de 67 ans : VO₂ max à la médiane FRIEND 60–69 ans, 14 levers dans l'intervalle 11–16.
const completeSenior: AnswerMap = {
  ...complete,
  sex_assigned_at_birth: "female",
  reported_vo2_max_ml_kg_min: 20,
  chair_stand_30s_count: 14,
};

describe("normes FRIEND de VO₂ max", () => {
  test.each([
    ["male", 45, 37.8, 50], ["female", 25, 44.7, 75], ["male", 25, 44.05, 37.5],
    ["female", 18, 37.6, 50], ["male", 85, 24.4, 50], ["male", 45, 24.2, 5],
    ["male", 45, 55.6, 97], ["male", 45, 60, 97], ["male", 45, 18.15, 2.5], ["male", 45, 12.1, 1], ["male", 45, 5, 1],
  ] as const)("%s de %s ans, VO₂ %s → p%s", (sex, ageYears, vo2, percentile) => {
    expect(vo2MaxPercentile(vo2, sex, ageYears)).toBeCloseTo(percentile, 6);
  });

  test.each([
    ["intersex", 45, 40], [null, 45, 40], ["male", 17, 40], ["male", null, 40], ["male", 45, 0], ["male", 45, null],
  ] as const)("ne calcule aucun percentile pour sexe %s, âge %s, VO₂ %s", (sex, ageYears, vo2) => {
    expect(vo2MaxPercentile(vo2, sex, ageYears)).toBeNull();
  });
});

describe("intervalle normal Rikli-Jones du lever de chaise", () => {
  test.each([
    ["female", 67, 10, "below"], ["male", 62, 16, "within"], ["male", 62, 20, "above"],
    ["female", 97, 5, "within"], ["female", 90, 4, "within"], ["male", 60, 13, "below"], ["male", 60, 0, "below"],
  ] as const)("%s de %s ans, %s levers → %s", (sex, ageYears, count, band) => {
    expect(chairStandBand(count, sex, ageYears)).toBe(band);
  });

  test.each([
    ["female", 45, 10], ["male", 59, 10], ["intersex", 67, 10], [null, 67, 10], ["female", 67, null], ["female", 67, -1],
  ] as const)("aucune bande pour sexe %s, âge %s, %s levers", (sex, ageYears, count) => {
    expect(chairStandBand(count, sex, ageYears)).toBeNull();
  });

  test("expose l'intervalle de référence utilisé pour l'affichage", () => {
    expect(chairStandReference("female", 67)).toEqual({ ageFrom: 65, ageTo: 69, low: 11, high: 16 });
    expect(chairStandReference("male", 95)).toEqual({ ageFrom: 90, ageTo: 94, low: 7, high: 12 });
    expect(chairStandReference("male", 59)).toBeNull();
  });
});

describe("points des charges optionnelles (convention produit)", () => {
  test.each([
    [60, 80, 1, 75], [80, 80, 1, 100], [120, 80, 1.5, 100], [60, 80, 1.5, 50], [200, 80, 1, 100], [Number.MAX_VALUE, 80, 1.5, 100],
  ])("%s kg pour %s kg de poids de corps, référence %s × → %s points", (load, weight, reference, points) => {
    expect(liftPoints(load, weight, reference)).toBe(points);
  });

  test.each([[null, 80], [60, null], [null, null]])("aucun point pour charge %s et poids %s", (load, weight) => {
    expect(liftPoints(load, weight, 1)).toBeNull();
  });
});

describe("points de sommeil Life's Essential 8", () => {
  test.each([
    [0, 0], [3.5, 0], [4, 20], [4.5, 20], [5, 40], [5.5, 40], [6, 70], [6.5, 70],
    [7, 100], [8.99, 100], [9, 90], [9.5, 90], [10, 40], [13, 40], [24, 40],
  ])("%s heures → %s points", (hours, points) => {
    expect(sleepDurationPoints(hours)).toBe(points);
  });

  test.each([-1, 25, Number.NaN, null])("rejette %s", (hours) => {
    expect(sleepDurationPoints(hours)).toBeNull();
  });
});

describe("indice Express v2", () => {
  test("calcule quatre axes équipondérés pour un adulte de moins de 60 ans sans noter le lever de chaise", () => {
    const result = buildExpressAssessment(complete, adult);
    expect(result).toMatchObject({
      version: "express-index-v2", kind: "complete-index", score: 86,
      answeredCount: 9, interpretableComponentCount: 7, applicableComponentCount: 7, scoredAxisCount: 4,
      profile: "favorable",
    });
    expect(result.axes.map(({ id, score, availableComponents, totalComponents, status, signals }) =>
      ({ id, score, availableComponents, totalComponents, status, signals }),
    )).toEqual([
      { id: "cardio", score: 75, availableComponents: 2, totalComponents: 2, status: "support", signals: ["cardio-maintain"] },
      { id: "strength", score: 100, availableComponents: 1, totalComponents: 1, status: "support", signals: ["strength-maintain", "chair-stand-reference-from-60"] },
      { id: "sleep", score: 90, availableComponents: 2, totalComponents: 2, status: "support", signals: ["sleep-maintain"] },
      { id: "nutrition", score: 80, availableComponents: 2, totalComponents: 2, status: "support", signals: ["nutrition-maintain"] },
    ]);
    expect(result.priorities).toEqual(["cardio-maintain", "strength-maintain", "sleep-maintain"]);
  });

  test("note le lever de chaise à partir de 60 ans face à l'intervalle normal du sexe et de l'âge", () => {
    const result = buildExpressAssessment(completeSenior, senior);
    expect(result).toMatchObject({
      kind: "complete-index", score: 82, interpretableComponentCount: 8, applicableComponentCount: 8, profile: "favorable",
    });
    expect(result.axes[0]).toMatchObject({ score: 75, signals: ["cardio-maintain"] });
    expect(result.axes[1]).toMatchObject({ score: 83, availableComponents: 2, totalComponents: 2, status: "support", signals: ["strength-maintain"] });
  });

  test("une charge optionnelle non renseignée ne compte ni comme applicable ni comme manquante", () => {
    const withoutLifts = buildExpressAssessment(complete, adult);
    const skipped = buildExpressAssessment({ ...complete, squat_one_rep_max_kg: null, deadlift_one_rep_max_kg: null, weight_kg: 80 }, adult);
    expect(skipped.axes).toEqual(withoutLifts.axes);
    expect(skipped.priorities).toEqual(withoutLifts.priorities);
    // Le poids de corps compte comme réponse, les charges passées non.
    expect(skipped).toMatchObject({ kind: "complete-index", score: 86, applicableComponentCount: 7, interpretableComponentCount: 7, answeredCount: 10 });
    expect(skipped.axes[1]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 1, optionalComponents: 0 });
    expect(skipped.priorities).not.toContain("complete-measurements");
  });

  test("une charge renseignée avec le poids de corps entre dans la moyenne de l'axe force", () => {
    const result = buildExpressAssessment({ ...complete, weight_kg: 80, squat_one_rep_max_kg: 60 }, adult);
    // Squat 60 / 80 = 0,75 × poids de corps face à la référence 1,0 → 75 points, en moyenne avec 100 points de renforcement.
    expect(result.axes[1]).toMatchObject({ score: 88, availableComponents: 2, totalComponents: 2, optionalComponents: 1, status: "support" });
    expect(result).toMatchObject({ kind: "complete-index", score: 83, applicableComponentCount: 8, interpretableComponentCount: 8, answeredCount: 11, profile: "favorable" });
    expect(result.axes[1].signals).toEqual(["strength-maintain", "chair-stand-reference-from-60"]);
  });

  test("le soulevé de terre est lu face à 1,5 × le poids de corps et les deux charges s'ajoutent aux composantes", () => {
    const result = buildExpressAssessment({ ...complete, weight_kg: 80, squat_one_rep_max_kg: 40, deadlift_one_rep_max_kg: 120 }, adult);
    // Squat 0,5 × → 50 points ; soulevé 1,5 × → 100 points ; renforcement 100 → moyenne 83,3.
    expect(result.axes[1]).toMatchObject({ score: 83, availableComponents: 3, totalComponents: 3, optionalComponents: 2 });
    expect(result).toMatchObject({ kind: "complete-index", applicableComponentCount: 9, interpretableComponentCount: 9, answeredCount: 12 });
    const seniorResult = buildExpressAssessment({ ...completeSenior, weight_kg: 60, squat_one_rep_max_kg: 30, deadlift_one_rep_max_kg: 45 }, senior);
    expect(seniorResult.axes[1]).toMatchObject({ availableComponents: 4, totalComponents: 4, optionalComponents: 2 });
    expect(seniorResult).toMatchObject({ kind: "complete-index", applicableComponentCount: 10, interpretableComponentCount: 10 });
  });

  test("note 100 points chaque charge atteignant exactement sa référence de poids de corps", () => {
    const result = buildExpressAssessment({ ...complete, weight_kg: 80, squat_one_rep_max_kg: 100, deadlift_one_rep_max_kg: 150 }, adult);
    // Squat 100 / 80 = 1,25 × ≥ 1,0 → 100 ; soulevé 150 / 80 = 1,875 × ≥ 1,5 → 100 ; renforcement 100 → axe 100.
    expect(result.axes[1]).toMatchObject({ score: 100, availableComponents: 3, totalComponents: 3, optionalComponents: 2, status: "support" });
    expect(result).toMatchObject({ kind: "complete-index", score: 86, applicableComponentCount: 9, interpretableComponentCount: 9, answeredCount: 12, profile: "favorable" });
    expect(liftPoints(80, 80, EXPRESS_INDEX_REFERENCE.squatBodyWeight)).toBe(100);
    expect(liftPoints(120, 80, EXPRESS_INDEX_REFERENCE.deadliftBodyWeight)).toBe(100);
  });

  test("plafonne une charge élevée à 100 points sans dépassement numérique", () => {
    const result = buildExpressAssessment({ ...complete, weight_kg: 80, squat_one_rep_max_kg: 200, deadlift_one_rep_max_kg: Number.MAX_VALUE }, adult);
    expect(result.axes[1]).toMatchObject({ score: 100, availableComponents: 3, totalComponents: 3, optionalComponents: 2 });
    expect(result.score).toBe(86);
  });

  test("ignore une charge sans poids de corps au lieu de la noter ou de la réclamer", () => {
    const withoutWeight = buildExpressAssessment({ ...complete, squat_one_rep_max_kg: 60, deadlift_one_rep_max_kg: 120 }, adult);
    const reference = buildExpressAssessment(complete, adult);
    expect(withoutWeight.axes).toEqual(reference.axes);
    expect(withoutWeight).toMatchObject({ kind: "complete-index", score: 86, applicableComponentCount: 7, interpretableComponentCount: 7, answeredCount: 11 });
    expect(withoutWeight.priorities).toEqual(reference.priorities);
    const zeroWeight = buildExpressAssessment({ ...complete, weight_kg: 0, squat_one_rep_max_kg: 60 }, adult);
    expect(zeroWeight.axes).toEqual(reference.axes);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejette une charge impossible %s sans la compter comme réponse", (load) => {
    const result = buildExpressAssessment({ ...complete, weight_kg: 80, squat_one_rep_max_kg: load, deadlift_one_rep_max_kg: load }, adult);
    expect(result.axes).toEqual(buildExpressAssessment(complete, adult).axes);
    expect(result.answeredCount).toBe(10);
  });

  test("une charge renseignée peut compléter le minimum de quatre composantes d'un indice provisoire", () => {
    const threeComponents = buildExpressAssessment({ usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5 }, adult);
    expect(threeComponents).toMatchObject({ kind: "insufficient-inputs", interpretableComponentCount: 3 });
    const withLift = buildExpressAssessment({ usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5,
      weight_kg: 80, deadlift_one_rep_max_kg: 120 }, adult);
    expect(withLift).toMatchObject({ kind: "partial-index", score: 100, interpretableComponentCount: 4, scoredAxisCount: 3 });
    expect(withLift.axes[1]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 2, optionalComponents: 1 });
  });

  test("ne convertit pas les absences en zéros", () => {
    const result = buildExpressAssessment({}, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null, answeredCount: 0,
      interpretableComponentCount: 0, applicableComponentCount: 7, scoredAxisCount: 0, profile: "incomplete" });
    expect(result.axes.every((axis) => axis.score === null && axis.status === "missing")).toBe(true);
    expect(result.priorities).toEqual(["complete-measurements"]);
  });

  test("produit un indice partiel à deux axes et quatre composantes sans lui attribuer un profil complet", () => {
    const result = buildExpressAssessment({ usual_sleep_hours: 8, sleep_refreshed: 10,
      plant_food_frequency: 5, diet_ultra_processed: "never" }, adult);
    expect(result).toMatchObject({ kind: "partial-index", score: 100,
      answeredCount: 4, interpretableComponentCount: 4, scoredAxisCount: 2, profile: "incomplete" });
    expect(result.priorities).toEqual(["complete-measurements", "sleep-maintain", "nutrition-maintain"]);
  });

  test("trois composantes sur trois axes ne suffisent pas pour l'indice", () => {
    const result = buildExpressAssessment({ sex_assigned_at_birth: "male", reported_vo2_max_ml_kg_min: 42.4,
      usual_sleep_hours: 8, plant_food_frequency: 5 }, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null, answeredCount: 4,
      interpretableComponentCount: 3, scoredAxisCount: 3 });
  });

  test.each([
    ["male", 45, 30, "cardio-low-fitness", "attention"],
    ["male", 45, 35, "cardio-below-median", "support"],
    ["female", 25, 44.7, "cardio-maintain", "support"],
  ] as const)("%s de %s ans, VO₂ %s → signal %s", (sex, ageYears, vo2, signal, status) => {
    const result = buildExpressAssessment({ sex_assigned_at_birth: sex, reported_vo2_max_ml_kg_min: vo2,
      weekly_moderate_activity_minutes: 150 }, { ageYears });
    expect(result.axes[0].signals[0]).toBe(signal);
    expect(result.axes[0].status).toBe(status);
  });

  test("le percentile FRIEND est la composante cardio, l'activité est lue face aux 150 minutes OMS", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 44.05,
      weekly_moderate_activity_minutes: 75 }, { ageYears: 25 });
    expect(result.axes[0]).toMatchObject({ score: 44, signals: ["cardio-below-median", "activity-below-guideline"], status: "improve" });
    expect(buildExpressAssessment({ ...complete, weekly_moderate_activity_minutes: 300 }, adult).axes[0].score).toBe(75);
  });

  test("un lever de chaise sous l'intervalle normal met l'axe force en vigilance", () => {
    const result = buildExpressAssessment({ ...completeSenior, chair_stand_30s_count: 10 }, senior);
    expect(result.axes[1]).toMatchObject({ score: 63, status: "attention", signals: ["strength-below-range"] });
    expect(result.profile).toBe("attention");
    expect(result.priorities[0]).toBe("strength-below-range");
  });

  test.each([[0, 0], [1, 50], [2, 100], [5, 100]])("%s jours de renforcement → %s points", (days, points) => {
    const result = buildExpressAssessment({ movement_strength_days: days }, adult);
    expect(result.axes[1].score).toBe(points);
    expect(result.axes[1].signals.includes("strength-days-below-guideline")).toBe(days < 2);
  });

  test("avant 60 ans, le lever de chaise est affiché mais ni noté ni compté comme composante applicable", () => {
    const result = buildExpressAssessment({ ...complete, chair_stand_30s_count: 3 }, { ageYears: 59 });
    expect(result.axes[1]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 1, status: "support" });
    expect(result.axes[1].signals).toContain("chair-stand-reference-from-60");
    expect(result.axes[1].signals).not.toContain("strength-below-range");
    expect(result.kind).toBe("complete-index");
  });

  test("un sexe intersexe retire les composantes normées sans pénaliser l'indice", () => {
    const result = buildExpressAssessment({ ...completeSenior, sex_assigned_at_birth: "intersex" }, senior);
    expect(result).toMatchObject({ kind: "complete-index", applicableComponentCount: 6, interpretableComponentCount: 6, answeredCount: 9 });
    expect(result.axes[0]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 1, signals: ["cardio-maintain", "sex-reference-unavailable"] });
    expect(result.axes[1]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 1, signals: ["strength-maintain", "sex-reference-unavailable"] });
    expect(result.priorities).toEqual(["cardio-maintain", "strength-maintain", "sleep-maintain"]);
    expect(new Set(result.axes.flatMap((axis) => axis.signals).filter((signal) => signal === "sex-reference-unavailable")).size).toBe(1);
  });

  test("un sexe non renseigné laisse la VO₂ max à compléter plutôt que de l'ignorer", () => {
    const result = buildExpressAssessment({ ...complete, sex_assigned_at_birth: null }, adult);
    expect(result).toMatchObject({ kind: "partial-index", profile: "incomplete", answeredCount: 8,
      applicableComponentCount: 7, interpretableComponentCount: 6 });
    expect(result.axes[0]).toMatchObject({ score: 100, availableComponents: 1, totalComponents: 2, signals: ["cardio-maintain", "sex-reference-unavailable"] });
    expect(result.priorities).toEqual(["complete-measurements", "cardio-maintain", "strength-maintain"]);
  });

  test.each([
    [3, 0, "sleep-short"], [5.5, 40, "sleep-short"], [6.5, 70, "sleep-maintain"], [7, 100, "sleep-maintain"],
    [9.5, 90, "sleep-maintain"], [10, 40, "sleep-long"], [13, 40, "sleep-long"],
  ])("situe %s heures de sommeil à %s points", (hours, expected, signal) => {
    const result = buildExpressAssessment({ usual_sleep_hours: hours }, adult);
    expect(result.axes[2].score).toBe(expected);
    expect(result.axes[2].signals).toContain(signal);
  });

  test("un axe à développer sans signal particulier ne reçoit ni vigilance ni maintien", () => {
    const result = buildExpressAssessment({ usual_sleep_hours: 6.5, sleep_refreshed: 4 }, adult);
    expect(result.axes[2]).toMatchObject({ score: 55, status: "improve", signals: [] });
  });

  test.each([
    ["never", 100], ["rarely", 80], ["sometimes", 50], ["often", 25], ["daily", 0],
  ])("applique la convention déclarée pour les repas transformés %s", (frequency, score) => {
    expect(buildExpressAssessment({ diet_ultra_processed: frequency }, adult).axes[3].score).toBe(score);
  });

  test("accepte les vrais zéros du sommeil, du ressenti et des portions comme réponses", () => {
    const result = buildExpressAssessment({ usual_sleep_hours: 0, sleep_refreshed: 0,
      plant_food_frequency: 0, diet_ultra_processed: "daily" }, adult);
    expect(result).toMatchObject({ kind: "partial-index", score: 0,
      answeredCount: 4, interpretableComponentCount: 4, profile: "attention" });
  });

  test.each([null, Number.NaN, Number.POSITIVE_INFINITY, -1, 17, 18.5, 121])(
    "n'évalue pas un âge non admissible %s, même avec des réponses adultes", (ageYears) => {
      const result = buildExpressAssessment(complete, { ageYears });
      expect(result).toMatchObject({ version: "express-index-v2", kind: "not-available", score: null, answeredCount: 0,
        interpretableComponentCount: 0, applicableComponentCount: 8, scoredAxisCount: 0, profile: "incomplete", priorities: [] });
      expect(result.axes.every((axis) => axis.score === null)).toBe(true);
    },
  );

  test.each([18, 120])("admet les bornes d'âge %s en extrapolant la tranche de référence la plus proche", (ageYears) => {
    const result = buildExpressAssessment(complete, { ageYears });
    expect(result.kind).toBe("complete-index");
    expect(result.axes[0].availableComponents).toBe(2);
  });

  test("rejette les valeurs impossibles indépendamment de l'interface", () => {
    const result = buildExpressAssessment({ sex_assigned_at_birth: "other", reported_vo2_max_ml_kg_min: Number.POSITIVE_INFINITY,
      weekly_moderate_activity_minutes: -1, chair_stand_30s_count: Number.NaN, movement_strength_days: -2,
      weight_kg: 0, squat_one_rep_max_kg: -1, deadlift_one_rep_max_kg: Number.NaN,
      usual_sleep_hours: 25, sleep_refreshed: 11,
      plant_food_frequency: -1, diet_ultra_processed: "not-an-option" }, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null,
      answeredCount: 0, interpretableComponentCount: 0 });
  });

  test("borne les composantes élevées sans dépassement numérique", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: Number.MAX_VALUE,
      weekly_moderate_activity_minutes: Number.MAX_VALUE, movement_strength_days: Number.MAX_VALUE,
      plant_food_frequency: Number.MAX_VALUE }, adult);
    expect(result.axes.map((axis) => axis.score)).toEqual([99, 100, 90, 90]);
    expect(result.score).toBe(95);
  });

  test("une vigilance prime sur l'incomplétude et les bonnes performances", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: null,
      usual_sleep_hours: 5, sleep_refreshed: 3, plant_food_frequency: 2, diet_ultra_processed: "daily" }, adult);
    expect(result.profile).toBe("attention");
    expect(result.axes[2].status).toBe("attention");
    expect(result.axes[3].status).toBe("attention");
    expect(result.priorities).toEqual(["sleep-short", "sleep-unrefreshing", "plants-low"]);
  });

  test("ordonne les vigilances par axe, puis les recommandations, et limite les priorités à trois", () => {
    const result = buildExpressAssessment({ ...completeSenior, reported_vo2_max_ml_kg_min: 15,
      chair_stand_30s_count: 8, usual_sleep_hours: 5, weekly_moderate_activity_minutes: 30 }, senior);
    expect(result.priorities).toEqual(["cardio-low-fitness", "strength-below-range", "sleep-short"]);
  });

  test("place les recommandations non atteintes avant l'entretien, sans profil de vigilance", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 37.2,
      weekly_moderate_activity_minutes: 60 }, adult);
    expect(result).toMatchObject({ kind: "complete-index", score: 76, profile: "mixed" });
    expect(result.axes[0]).toMatchObject({ score: 35, status: "improve", signals: ["cardio-below-median", "activity-below-guideline"] });
    expect(result.priorities).toEqual(["cardio-below-median", "activity-below-guideline", "strength-maintain"]);
  });

  test("ne fait pas passer une limite de profil grâce à un arrondi d'affichage", () => {
    const globalBelow = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 51.244,
      weekly_moderate_activity_minutes: 0, usual_sleep_hours: 6.5, sleep_refreshed: 6,
      plant_food_frequency: 3, diet_ultra_processed: "sometimes" }, adult);
    expect(globalBelow.score).toBe(65);
    expect(globalBelow.profile).toBe("mixed");
    const axisBelow = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 60,
      weekly_moderate_activity_minutes: 3, usual_sleep_hours: 8, sleep_refreshed: 10,
      plant_food_frequency: 5, diet_ultra_processed: "never" }, adult);
    expect(axisBelow.axes[0].score).toBe(50);
    expect(axisBelow.profile).toBe("mixed");
  });

  test("expose les repères et sources utilisés par l'export et l'interface", () => {
    expect(EXPRESS_INDEX_REFERENCE).toMatchObject({
      version: "express-index-v2", axisSupport: 65, profileAxisMinimum: 50, minimumComponents: 4, minimumAxes: 2,
      activityMinutes: 150, strengthDays: 2, plantPortions: 5, chairStandReferenceFromAge: 60,
      squatBodyWeight: 1, deadliftBodyWeight: 1.5, optionalStrengthLifts: ["squat_one_rep_max_kg", "deadlift_one_rep_max_kg"],
      processedPoints: { never: 100, rarely: 80, sometimes: 50, often: 25, daily: 0 },
    });
    expect(EXPRESS_INDEX_REFERENCE.sources.friend.doi).toBe("10.1016/j.mayocp.2015.07.026");
    expect(EXPRESS_INDEX_REFERENCE.sources.cdcSteadi.url).toBe("https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-30Sec-508.pdf");
    expect(EXPRESS_INDEX_REFERENCE.sources.whoActivity.url).toBe("https://www.who.int/publications/i/item/9789240015128");
    expect(EXPRESS_INDEX_REFERENCE.sources.lifesEssential8.url).toBe("https://doi.org/10.1161/CIR.0000000000001078");
    expect(EXPRESS_INDEX_REFERENCE.sleepPoints.map(({ points }) => points)).toEqual([100, 90, 70, 40, 40, 20, 0]);
  });

  test("ignore les réponses extérieures au parcours et ne modifie pas les données", () => {
    const input = { ...complete, height_cm: 180, current_tobacco_nicotine: true };
    const before = structuredClone(input);
    expect(buildExpressAssessment(input, adult)).toEqual(buildExpressAssessment(complete, adult));
    expect(input).toEqual(before);
  });
});
