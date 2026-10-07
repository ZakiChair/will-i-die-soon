import type { UiCopyKey } from "../i18n/ui-copy";
import type { EXPRESS_QUESTION_IDS } from "../lib/questionnaire";

type ExpressQuestionId = (typeof EXPRESS_QUESTION_IDS)[number];

export const humanAtlasSceneIds = [
  "breath",
  "strength",
  "sleep",
  "energy",
] as const;

export type HumanAtlasSceneId = (typeof humanAtlasSceneIds)[number];

// Ordre du récit d'accueil, distinct de l'ordre canonique des axes et calculs.
export const humanAtlasStorySceneIds = [
  "sleep",
  "breath",
  "strength",
  "energy",
] as const satisfies readonly HumanAtlasSceneId[];

export type HumanAtlasScene = Readonly<{
  id: HumanAtlasSceneId;
  eyebrowKey: UiCopyKey;
  titleKey: UiCopyKey;
  descriptionKey: UiCopyKey;
  inputLabelKey: UiCopyKey;
  questionIds: readonly ExpressQuestionId[];
}>;

export const humanAtlasScenes = [
  {
    id: "sleep",
    eyebrowKey: "landing.atlas.sleep.eyebrow",
    titleKey: "landing.atlas.sleep.title",
    descriptionKey: "landing.atlas.sleep.description",
    inputLabelKey: "landing.atlas.sleep.input",
    questionIds: ["usual_sleep_hours", "sleep_refreshed"],
  },
  {
    id: "breath",
    eyebrowKey: "landing.atlas.breath.eyebrow",
    titleKey: "landing.atlas.breath.title",
    descriptionKey: "landing.atlas.breath.description",
    inputLabelKey: "landing.atlas.breath.input",
    questionIds: ["reported_vo2_max_ml_kg_min", "weekly_moderate_activity_minutes"],
  },
  {
    id: "strength",
    eyebrowKey: "landing.atlas.strength.eyebrow",
    titleKey: "landing.atlas.strength.title",
    descriptionKey: "landing.atlas.strength.description",
    inputLabelKey: "landing.atlas.strength.input",
    questionIds: ["chair_stand_30s_count", "movement_strength_days"],
  },
  {
    id: "energy",
    eyebrowKey: "landing.atlas.energy.eyebrow",
    titleKey: "landing.atlas.energy.title",
    descriptionKey: "landing.atlas.energy.description",
    inputLabelKey: "landing.atlas.energy.input",
    questionIds: ["plant_food_frequency", "diet_ultra_processed"],
  },
] as const satisfies readonly HumanAtlasScene[];

// Le sexe à la naissance sert de clé de référence (normes FRIEND et Rikli-Jones) ; il n'illumine aucune scène.
export const humanAtlasReferenceQuestionIds = ["sex_assigned_at_birth"] as const satisfies readonly ExpressQuestionId[];

export function isHumanAtlasSceneId(value: unknown): value is HumanAtlasSceneId {
  return humanAtlasSceneIds.some((sceneId) => sceneId === value);
}
