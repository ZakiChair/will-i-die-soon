import { riskRules } from "../data/rules";
import type {
  ActionItem,
  AdultPurityScoreResult,
  PublicInsufficientCoverageResult,
  PurityScoreResult,
  ScoreCategoryId,
  ScoreComponent,
  ScoreSupportContext,
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
  PURITY_SCORE_LABEL_FR,
  accessSupportCopyFr,
  accessSupportReasonClausesFr,
  actionCopyFr,
  bookedPreventiveActionCopyFr,
  protectiveRootLabelsFr,
  scoreCategoryLabelsFr,
  scoreComponentExplanationsFr,
  scoreComponentLabelsFr,
  scoreLedgerExplanationsFr,
} from "./score-copy-fr";
import type { Locale } from "./types";

export type PresentedAdultPurityScoreResult = Omit<
  AdultPurityScoreResult,
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

export type PresentedPurityScoreResult =
  | PresentedAdultPurityScoreResult
  | PresentedInsufficientCoverageResult
  | Extract<PurityScoreResult, { kind: "not-available" }>;

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

function normalizedCountry(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

function supportsOperationalAction(
  sources: ReadonlyArray<EvidenceSource>,
  countryCode: string,
): boolean {
  const country = normalizedCountry(countryCode);
  return sources.some((source) =>
    source.operationalCountries?.some(
      (candidate) => normalizedCountry(candidate) === country,
    ),
  );
}

function emergencyNumber(countryCode: string): string | undefined {
  switch (normalizedCountry(countryCode)) {
    case "US":
      return "911";
    case "GB":
      return "999";
    case "CH":
      return "144";
    default:
      return undefined;
  }
}

function frenchEmergencyCopy(
  kind: EmergencyKind,
  countryCode: string,
  sources: ReadonlyArray<EvidenceSource>,
): string {
  const country = normalizedCountry(countryCode);
  const number = supportsOperationalAction(sources, country)
    ? emergencyNumber(country)
    : undefined;
  const call = number
    ? `Appelez maintenant le ${number} pour obtenir des soins d'urgence.`
    : "Contactez maintenant le service d'urgence local.";

  if (kind === "self-harm") {
    const has988 =
      country === "US" &&
      sources.some(
        (source) =>
          source.id === "samhsa-988-faqs" &&
          source.operationalCountries?.some(
            (candidate) => normalizedCountry(candidate) === "US",
          ),
      );
    const crisis = has988
      ? " Vous pouvez également appeler le 988 ou envoyer un SMS à ce numéro pour obtenir un soutien en situation de crise."
      : "";
    return `${call}${crisis} Restez si possible avec une personne de confiance pendant l'organisation de l'aide.`;
  }

  if (kind === "pregnancy-safety") {
    const severeAction = number
      ? `appelez maintenant le ${number}`
      : "contactez maintenant le service d'urgence local";
    return `Obtenez maintenant une aide urgente liée à la grossesse ou à votre protection auprès d'un professionnel de santé qualifié ou d'un adulte de confiance pouvant vous aider à accéder aux soins. En cas de symptôme grave, de danger physique immédiat ou si vous ne pouvez pas rester en sécurité, ${severeAction}.`;
  }

  if (
    kind === "overdose-poisoning" &&
    country === "CH" &&
    sources.some((source) => source.id === "foph-ufi-emergency")
  ) {
    return `${call} Des informations sur les intoxications sont disponibles au 145. Gardez le produit ou l'emballage à proximité si vous pouvez le faire sans danger.`;
  }

  if (kind === "overdose-poisoning") {
    return `${call} Gardez le produit ou l'emballage à proximité si vous pouvez le faire sans danger.`;
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

function localizeComponent(component: ScoreComponent): ScoreComponent {
  return {
    ...component,
    label: requiredTranslation(
      scoreComponentLabelsFr,
      component.questionId,
      "score component label",
    ),
    explanation: requiredTranslation(
      scoreComponentExplanationsFr,
      component.explanation,
      "score component explanation",
    ),
  };
}

function localizeSupportContext(
  context: ScoreSupportContext,
): ScoreSupportContext {
  return {
    ...context,
    explanation: requiredTranslation(
      scoreComponentExplanationsFr,
      context.explanation,
      "score support explanation",
    ),
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

export function localizePurityScore(
  score: PurityScoreResult,
  locale: Locale,
): PresentedPurityScoreResult {
  if (locale === "en" || score.kind === "not-available") return score;
  const label = requiredFrenchCopy(PURITY_SCORE_LABEL_FR, "score label");

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
      supportContexts: score.supportContexts.map(localizeSupportContext),
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
    supportContexts: score.supportContexts.map(localizeSupportContext),
    explanations: localizeLedgerExplanations(score.explanations),
  };
}

function isScoreCategoryId(value: string): value is ScoreCategoryId {
  return Object.prototype.hasOwnProperty.call(actionCopyFr, value);
}

function localizeAccessSupportReason(reason: string): string {
  const translatedClauses: string[] = [];
  let remaining = reason.trim();
  const clauses = Object.entries(accessSupportReasonClausesFr);

  while (remaining.length > 0) {
    const entry = clauses.find(
      ([canonical]) =>
        remaining === canonical || remaining.startsWith(`${canonical} `),
    );
    if (!entry) {
      throw new Error(`Missing French access-support reason clause: ${remaining}`);
    }
    const [canonical, translated] = entry;
    translatedClauses.push(translated);
    remaining = remaining.slice(canonical.length).trimStart();
  }

  return translatedClauses.join(" ");
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
  const isBookedPreventive =
    categoryId === "preventive-followup" &&
    action.title === "Follow through on the follow-up already underway";
  const copy = isBookedPreventive
    ? bookedPreventiveActionCopyFr
    : actionCopyFr[categoryId];

  return {
    ...action,
    title: copy.title,
    reason: requiredTranslation(
      scoreComponentExplanationsFr,
      action.reason,
      "habit action reason",
    ),
    nextStep: copy.nextStep,
  };
}

export function localizeActions(
  actions: ReadonlyArray<ActionItem>,
  locale: Locale,
): ReadonlyArray<ActionItem> {
  if (locale === "en") return actions;

  return actions.map((action) => {
    if (action.id === "access-support" && action.kind === "access-support") {
      return {
        ...action,
        title: accessSupportCopyFr.title,
        reason: localizeAccessSupportReason(action.reason),
        nextStep: accessSupportCopyFr.nextStep,
      };
    }
    return localizeHabitAction(action);
  });
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
    label: "Reliable drinking-water access during heat or activity",
    applies: (answers) => answers.hydration_heat_access === true,
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
    label: "Vaccination records available for review",
    applies: (answers) => answers.vaccinations_records_available === true,
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
