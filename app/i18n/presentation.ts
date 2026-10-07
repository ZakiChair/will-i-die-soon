import { emergencyContactsFor, type CrisisLine } from "../data/emergency-contacts";
import { riskRules } from "../data/rules";
import type {
  ActionItem,
  AdultEssentialEightResult,
  PublicInsufficientCoverageResult,
  EssentialEightResult,
  ScoreCategoryId,
  ScoreComponent,
} from "../lib/scoring";
import type {
  AnswerMap,
  EmergencyKind,
  EvidenceSource,
  ProfileContext,
  RiskLeaf,
} from "../lib/types";
import { riskFactorLabelsFr, riskRuleCopyFr } from "./risk-copy-fr";
import {
  ESSENTIAL_EIGHT_LABEL_FR,
  actionCopyFr,
  protectiveRootLabelsFr,
  scoreCategoryLabelsFr,
  scoreComponentExplanationsFr,
  scoreComponentLabelsFr,
  scoreExplanationSuffixesFr,
  scoreLedgerExplanationsFr,
} from "./score-copy-fr";
import type { Locale } from "./types";

export type PresentedAdultEssentialEightResult = Omit<
  AdultEssentialEightResult,
  "label"
> & {
  readonly label: string;
};

export type PresentedInsufficientCoverageResult = Omit<
  PublicInsufficientCoverageResult,
  "label"
> & {
  readonly label: string;
};

export type PresentedEssentialEightResult =
  | PresentedAdultEssentialEightResult
  | PresentedInsufficientCoverageResult
  | Extract<EssentialEightResult, { kind: "not-available" }>;

const rulesById = new Map(riskRules.map((rule) => [rule.id, rule]));

function requiredFrenchCopy(
  value: string | undefined,
  corpus: string,
): string {
  if (!value?.trim()) {
    throw new Error(`Missing French ${corpus}`);
  }
  return value;
}

function requiredTranslation(
  dictionary: Readonly<Record<string, string>>,
  key: string,
  corpus: string,
): string {
  return requiredFrenchCopy(dictionary[key], `${corpus}: ${key}`);
}

const crisisLineLanguagesFr: Readonly<Record<NonNullable<CrisisLine["language"]>, string>> = {
  fr: "en français",
  nl: "en néerlandais",
};

function frenchCrisisLinesCopy(lines: ReadonlyArray<CrisisLine>): string {
  if (lines.length === 0) return "";
  const numbers = lines
    .map((line) =>
      line.language ? `le ${line.number} (${crisisLineLanguagesFr[line.language]})` : `le ${line.number}`,
    )
    .join(" ou ");
  const textMessages = lines.every((line) => line.textMessages)
    ? ` ou envoyer un SMS à ${lines.length === 1 ? "ce numéro" : "ces numéros"}`
    : "";
  return ` Vous pouvez également appeler ${numbers}${textMessages} pour obtenir un soutien en situation de crise.`;
}

function frenchEmergencyCopy(
  kind: EmergencyKind,
  countryCode: string,
  sources: ReadonlyArray<EvidenceSource>,
): string {
  const contacts = emergencyContactsFor(countryCode, sources);
  const number = contacts.emergency;
  const call = number
    ? `Appelez maintenant le ${number} pour obtenir des soins d'urgence.`
    : "Contactez maintenant le service d'urgence local.";

  if (kind === "self-harm") {
    return `${call}${frenchCrisisLinesCopy(contacts.crisis)} Restez si possible avec une personne de confiance pendant l'organisation de l'aide.`;
  }

  if (kind === "pregnancy-safety") {
    const severeAction = number
      ? `appelez maintenant le ${number}`
      : "contactez maintenant le service d'urgence local";
    return `Obtenez maintenant une aide urgente liée à la grossesse ou à votre protection auprès d'un professionnel de santé qualifié ou d'un adulte de confiance pouvant vous aider à accéder aux soins. En cas de symptôme grave, de danger physique immédiat ou si vous ne pouvez pas rester en sécurité, ${severeAction}.`;
  }

  if (kind === "overdose-poisoning") {
    const poison = contacts.poison
      ? ` Des informations sur les intoxications sont disponibles au ${contacts.poison}.`
      : "";
    return `${call}${poison} Gardez le produit ou l'emballage à proximité si vous pouvez le faire sans danger.`;
  }

  if (kind === "severe-bleeding") {
    return `${call} Si aucun objet n'est enfoncé dans la plaie, exercez une pression directe ferme avec un linge ou un pansement propre. Ne retirez pas un objet enfoncé.`;
  }

  return call;
}

export function localizeRiskLeaves(
  leaves: ReadonlyArray<RiskLeaf>,
  locale: Locale,
  profile: ProfileContext,
): ReadonlyArray<RiskLeaf> {
  if (locale === "en") return leaves;

  return leaves.map((leaf) => {
    const rule = rulesById.get(leaf.ruleId);
    if (!rule) throw new Error(`Missing canonical risk rule: ${leaf.ruleId}`);
    const translated = riskRuleCopyFr[leaf.ruleId];
    if (!translated?.title.trim() || !translated.copy.trim()) {
      throw new Error(`Missing French risk rule: ${leaf.ruleId}`);
    }
    return {
      ...leaf,
      title: translated.title,
      copy: rule.emergencyKind
        ? frenchEmergencyCopy(rule.emergencyKind, profile.countryCode, leaf.sources)
        : translated.copy,
      factors: leaf.factors.map((factor) =>
        requiredTranslation(riskFactorLabelsFr, factor, "risk factor"),
      ),
    };
  });
}

// Les explications LE8 se composent d'une phrase de base et, parfois, d'un suffixe de
// pénalité ("Twenty points are removed…"). Chaque partie est traduite séparément.
function localizeScoreExplanation(explanation: string): string {
  const [first, ...rest] = explanation.split(/(?<=\.) (?=Twenty points)/);
  const suffix = rest.join(" ");
  const base = requiredTranslation(
    scoreComponentExplanationsFr,
    first,
    "score component explanation",
  );
  return suffix
    ? `${base} ${requiredTranslation(scoreExplanationSuffixesFr, suffix, "score explanation suffix")}`
    : base;
}

function localizeComponent(component: ScoreComponent): ScoreComponent {
  return {
    ...component,
    label: requiredTranslation(
      scoreComponentLabelsFr,
      component.questionId,
      "score component label",
    ),
    explanation: localizeScoreExplanation(component.explanation),
  };
}

function localizeLedgerExplanations(
  explanations: ReadonlyArray<string>,
): ReadonlyArray<string> {
  return explanations.map((explanation) =>
    requiredTranslation(
      scoreLedgerExplanationsFr,
      explanation,
      "score ledger explanation",
    ),
  );
}

export function localizeEssentialEight(
  score: EssentialEightResult,
  locale: Locale,
): PresentedEssentialEightResult {
  if (locale === "en" || score.kind === "not-available") return score;
  const label = requiredFrenchCopy(ESSENTIAL_EIGHT_LABEL_FR, "score label");

  if (score.kind === "insufficient-coverage") {
    return {
      ...score,
      label,
      answeredCategories: score.answeredCategories.map((category) => ({
        ...category,
        label: requiredTranslation(
          scoreCategoryLabelsFr,
          category.id,
          "score category label",
        ),
      })),
      explanations: localizeLedgerExplanations(score.explanations),
    };
  }

  return {
    ...score,
    label,
    categories: score.categories.map((category) => ({
      ...category,
      label: requiredTranslation(
        scoreCategoryLabelsFr,
        category.id,
        "score category label",
      ),
      components: category.components.map(localizeComponent),
    })),
    explanations: localizeLedgerExplanations(score.explanations),
  };
}

function isScoreCategoryId(value: string): value is ScoreCategoryId {
  return Object.prototype.hasOwnProperty.call(actionCopyFr, value);
}

function localizeHabitAction(action: ActionItem): ActionItem {
  const categoryId = action.id.startsWith("habit-")
    ? action.id.slice("habit-".length)
    : "";
  if (
    !isScoreCategoryId(categoryId) ||
    action.categoryId !== categoryId ||
    action.kind !== "habit"
  ) {
    throw new Error(`Missing French action: ${action.id}`);
  }
  const copy = actionCopyFr[categoryId];

  return {
    ...action,
    title: copy.title,
    reason: localizeScoreExplanation(action.reason),
    nextStep: copy.nextStep,
  };
}

export function localizeActions(
  actions: ReadonlyArray<ActionItem>,
  locale: Locale,
): ReadonlyArray<ActionItem> {
  if (locale === "en") return actions;
  return actions.map(localizeHabitAction);
}

const protectiveRootDefinitions: ReadonlyArray<{
  readonly label: string;
  readonly applies: (answers: AnswerMap) => boolean;
}> = [
  {
    label: "A person you can contact for practical or emotional support",
    applies: (answers) => answers.reliable_social_support === true,
  },
  {
    label: "A regular balance or coordination practice",
    applies: (answers) => answers.movement_balance_training === true,
  },
  {
    label: "Outdoor or bright light after waking",
    applies: (answers) => answers.circadian_morning_light === true,
  },
  {
    label: "A known route to timely wellbeing support",
    applies: (answers) => answers.mood_support_access === true,
  },
  {
    label: "A sense of community or shared activity",
    applies: (answers) => answers.social_community_belonging === true,
  },
  {
    label: "A current medicine list shared with a clinician or pharmacist",
    applies: (answers) => answers.interaction_shared_list === true,
  },
  {
    label: "A regular brief stress-management practice",
    applies: (answers) =>
      answers.stress_recovery_practice === "often" ||
      answers.stress_recovery_practice === "daily",
  },
];

export function localizeProtectiveRoots(
  answers: AnswerMap,
  locale: Locale,
): ReadonlyArray<string> {
  return protectiveRootDefinitions
    .filter((definition) => definition.applies(answers))
    .map((definition) =>
      locale === "en"
        ? definition.label
        : requiredTranslation(
            protectiveRootLabelsFr,
            definition.label,
            "protective root",
          ),
    );
}
