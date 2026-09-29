import { describe, expect, test } from "vitest";
import type { AnswerMap } from "./types";
import { buildExpressAssessment } from "./express-assessment";

const adult = { ageYears: 35 };
const complete: AnswerMap = {
  reported_vo2_max_ml_kg_min: 50,
  squat_one_rep_max_kg: 80,
  deadlift_one_rep_max_kg: 120,
  height_cm: 180,
  weight_kg: 80,
  usual_sleep_hours: 7,
  sleep_refreshed: 8,
  plant_food_frequency: 4,
  diet_ultra_processed: "rarely",
};

describe("indice Express indépendant", () => {
  test("calcule quatre axes équipondérés et distingue neuf réponses de sept composantes", () => {
    const result = buildExpressAssessment(complete, adult);
    expect(result).toMatchObject({
      version: "express-index-v1", kind: "complete-index", score: 93,
      answeredCount: 9, interpretableComponentCount: 7, scoredAxisCount: 4,
      profile: "favorable",
    });
    expect(result.axes.map(({ id, score, availableComponents, totalComponents }) =>
      ({ id, score, availableComponents, totalComponents }),
    )).toEqual([
      { id: "cardio", score: 100, availableComponents: 1, totalComponents: 1 },
      { id: "strength", score: 100, availableComponents: 2, totalComponents: 2 },
      { id: "sleep", score: 90, availableComponents: 2, totalComponents: 2 },
      { id: "nutrition", score: 80, availableComponents: 2, totalComponents: 2 },
    ]);
  });

  test("ne convertit pas les absences en zéros", () => {
    const result = buildExpressAssessment({}, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null,
      answeredCount: 0, interpretableComponentCount: 0, scoredAxisCount: 0, profile: "incomplete" });
    expect(result.axes.every((axis) => axis.score === null && axis.status === "missing")).toBe(true);
    expect(result.priorities).toEqual(["complete-measurements"]);
  });

  test("produit un indice partiel à deux axes et quatre composantes sans lui attribuer un profil complet", () => {
    const result = buildExpressAssessment({ usual_sleep_hours: 8, sleep_refreshed: 10,
      plant_food_frequency: 5, diet_ultra_processed: "never" }, adult);
    expect(result).toMatchObject({ kind: "partial-index", score: 100,
      answeredCount: 4, interpretableComponentCount: 4, scoredAxisCount: 2, profile: "incomplete" });
  });

  test("trois composantes sur trois axes ne suffisent pas pour l'indice", () => {
    const result = buildExpressAssessment({ reported_vo2_max_ml_kg_min: 50,
      usual_sleep_hours: 8, plant_food_frequency: 5 }, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null,
      interpretableComponentCount: 3, scoredAxisCount: 3 });
  });

  test("le poids manquant conserve les charges déclarées mais empêche les deux ratios", () => {
    const result = buildExpressAssessment({ ...complete, weight_kg: null }, adult);
    expect(result).toMatchObject({ kind: "partial-index", answeredCount: 8,
      interpretableComponentCount: 5, scoredAxisCount: 3, score: 90 });
    expect(result.axes[1]).toMatchObject({ score: null, availableComponents: 0, status: "missing" });
  });

  test("la taille n'entre pas dans le calcul de forme ni dans la couverture des composantes", () => {
    const result = buildExpressAssessment({ ...complete, height_cm: null }, adult);
    expect(result).toMatchObject({ kind: "complete-index", score: 93,
      answeredCount: 8, interpretableComponentCount: 7 });
  });

  test("utilise le seul exercice disponible sans remplacer l'autre par zéro", () => {
    const result = buildExpressAssessment({ ...complete, squat_one_rep_max_kg: 40,
      deadlift_one_rep_max_kg: null }, adult);
    expect(result.axes[1]).toMatchObject({ score: 50, availableComponents: 1, totalComponents: 2 });
    expect(result).toMatchObject({ kind: "partial-index", interpretableComponentCount: 6, profile: "incomplete" });
  });

  test("arrondit l'indice après la moyenne des axes non arrondis", () => {
    const result = buildExpressAssessment({ reported_vo2_max_ml_kg_min: 40.245,
      squat_one_rep_max_kg: 80.49, weight_kg: 100,
      usual_sleep_hours: 8, sleep_refreshed: 6.198 }, adult);
    expect(result.axes.map((axis) => axis.score)).toEqual([80, 80, 81, null]);
    expect(result.score).toBe(81);
  });

  test.each([
    [35, 3, 0, "sleep-short"], [35, 6, 75, "sleep-short"],
    [35, 7, 100, "sleep-maintain"], [35, 9, 100, "sleep-maintain"],
    [35, 10, 75, "sleep-long"], [65, 8, 100, "sleep-maintain"],
    [65, 9, 75, "sleep-long"], [65, 13, 0, "sleep-long"],
  ])("à l'âge %s, situe %s heures selon la fenêtre de sommeil", (ageYears, hours, expected, signal) => {
    const result = buildExpressAssessment({ usual_sleep_hours: hours }, { ageYears });
    expect(result.axes[2].score).toBe(expected);
    expect(result.axes[2].signals).toContain(signal);
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
      expect(result).toMatchObject({ kind: "not-available", score: null, answeredCount: 0,
        interpretableComponentCount: 0, scoredAxisCount: 0, profile: "incomplete", priorities: [] });
      expect(result.axes.every((axis) => axis.score === null)).toBe(true);
    },
  );

  test.each([18, 120])("admet les bornes d'âge %s", (ageYears) => {
    expect(buildExpressAssessment(complete, { ageYears }).kind).toBe("complete-index");
  });

  test("rejette les valeurs impossibles indépendamment de l'interface", () => {
    const result = buildExpressAssessment({ reported_vo2_max_ml_kg_min: Number.POSITIVE_INFINITY,
      squat_one_rep_max_kg: -1, deadlift_one_rep_max_kg: Number.NaN,
      height_cm: 0, weight_kg: -5, usual_sleep_hours: 25, sleep_refreshed: 11,
      plant_food_frequency: -1, diet_ultra_processed: "not-an-option" }, adult);
    expect(result).toMatchObject({ kind: "insufficient-inputs", score: null,
      answeredCount: 0, interpretableComponentCount: 0 });
  });

  test("calcule les ratios sans perdre leur précision avant la normalisation", () => {
    const result = buildExpressAssessment({ ...complete, squat_one_rep_max_kg: 31.16,
      deadlift_one_rep_max_kg: null, weight_kg: 40 }, adult);
    expect(result.axes[1].score).toBe(78);
  });

  test("borne les composantes élevées et évite les dépassements numériques des ratios", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: Number.MAX_VALUE,
      squat_one_rep_max_kg: Number.MAX_VALUE, deadlift_one_rep_max_kg: Number.MAX_VALUE,
      weight_kg: Number.MIN_VALUE, plant_food_frequency: Number.MAX_VALUE }, adult);
    expect(result.axes.map((axis) => axis.score)).toEqual([100, 100, 90, 90]);
    expect(result.score).toBe(95);
  });

  test("une vigilance d'habitude prime sur l'incomplétude et les performances", () => {
    const result = buildExpressAssessment({ ...complete, height_cm: null,
      reported_vo2_max_ml_kg_min: null, usual_sleep_hours: 6, sleep_refreshed: 3,
      plant_food_frequency: 2, diet_ultra_processed: "daily" }, adult);
    expect(result.profile).toBe("attention");
    expect(result.axes[2].status).toBe("attention");
    expect(result.axes[3].status).toBe("attention");
    expect(result.priorities).toEqual(["sleep-short", "sleep-unrefreshing", "plants-low"]);
  });

  test("propose de développer un axe alimentation faible sans lui attribuer un maintien", () => {
    const result = buildExpressAssessment({ ...complete, usual_sleep_hours: 8,
      sleep_refreshed: 10, plant_food_frequency: 3, diet_ultra_processed: "sometimes" }, adult);
    expect(result).toMatchObject({ kind: "complete-index", score: 89, profile: "mixed" });
    expect(result.axes[3]).toMatchObject({ score: 55, status: "improve", signals: ["nutrition-improve"] });
    expect(result.priorities).toEqual(["nutrition-improve", "sleep-maintain", "cardio-maintain"]);
  });

  test("priorise la récupération à développer même si l'indice conserve son profil favorable", () => {
    const result = buildExpressAssessment({ ...complete, usual_sleep_hours: 8,
      sleep_refreshed: 4, plant_food_frequency: 5, diet_ultra_processed: "never" }, adult);
    expect(result).toMatchObject({ kind: "complete-index", score: 93, profile: "favorable" });
    expect(result.axes[2]).toMatchObject({ score: 70, status: "improve", signals: ["sleep-improve"] });
    expect(result.priorities).toEqual(["sleep-improve", "nutrition-maintain", "cardio-maintain"]);
  });

  test("place les axes d'habitude à développer après les vigilances et avant les repères sportifs", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 40,
      squat_one_rep_max_kg: 40, deadlift_one_rep_max_kg: 60, usual_sleep_hours: 6,
      sleep_refreshed: 10, plant_food_frequency: 3, diet_ultra_processed: "sometimes" }, adult);
    expect(result.profile).toBe("attention");
    expect(result.priorities).toEqual(["sleep-short", "nutrition-improve", "cardio-below-reference"]);
  });

  test("une performance basse donne un profil mixte, sans qualifier le risque de santé", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 10,
      squat_one_rep_max_kg: 8, deadlift_one_rep_max_kg: 12 }, adult);
    expect(result.profile).toBe("mixed");
    expect(result.axes[0].status).toBe("improve");
    expect(result.axes[1].status).toBe("improve");
    expect(result.priorities).toContain("cardio-below-reference");
    expect(result.priorities).toContain("strength-below-reference");
  });

  test("distingue la zone d'appui du repère conventionnel maximal en cardio", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 48 }, adult);
    expect(result.axes[0]).toMatchObject({ score: 96, status: "support", signals: ["cardio-below-reference"] });
    expect(result.profile).toBe("favorable");
  });

  test("demande les mesures manquantes avant les conseils d'entretien et limite les priorités à trois", () => {
    const result = buildExpressAssessment({ usual_sleep_hours: 8, sleep_refreshed: 10,
      plant_food_frequency: 5, diet_ultra_processed: "never" }, adult);
    expect(result.priorities).toEqual(["complete-measurements", "sleep-maintain", "nutrition-maintain"]);
  });

  test("les zéros de performance restent des mesures absentes", () => {
    const result = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 0,
      squat_one_rep_max_kg: 0, deadlift_one_rep_max_kg: 0 }, adult);
    expect(result).toMatchObject({ answeredCount: 6, interpretableComponentCount: 4, scoredAxisCount: 2 });
    expect(result.axes[0].score).toBeNull();
    expect(result.axes[1].score).toBeNull();
  });

  test("ne fait pas passer une limite de profil grâce à un arrondi d'affichage", () => {
    const globalBelow = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 30,
      squat_one_rep_max_kg: 48, deadlift_one_rep_max_kg: 72, usual_sleep_hours: 8,
      sleep_refreshed: 6, plant_food_frequency: 4.96, diet_ultra_processed: "never" }, adult);
    expect(globalBelow.score).toBe(75);
    expect(globalBelow.profile).toBe("mixed");
    const axisBelow = buildExpressAssessment({ ...complete, reported_vo2_max_ml_kg_min: 29.995,
      usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5,
      diet_ultra_processed: "never" }, adult);
    expect(axisBelow.axes[0].score).toBe(60);
    expect(axisBelow.profile).toBe("mixed");
  });

  test("ignore les réponses extérieures au parcours et ne modifie pas les données", () => {
    const input = { ...complete, sex_assigned_at_birth: "female", current_tobacco_nicotine: true };
    const before = structuredClone(input);
    expect(buildExpressAssessment(input, adult)).toEqual(buildExpressAssessment(complete, adult));
    expect(input).toEqual(before);
  });
});
