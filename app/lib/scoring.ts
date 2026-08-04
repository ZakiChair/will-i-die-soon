import Decimal from "decimal.js";

import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  RiskLeaf,
} from "./types";

export const PURITY_SCORE_VERSION = "purity-score-v1" as const;
export const PURITY_SCORE_LABEL =
  "Purity Score — wellness habits, not a health verdict." as const;

export const PURITY_SCORE_INPUT_IDS = [
  "current_tobacco_nicotine",
  "tobacco_nicotine_context",
  "alcohol_frequency",
  "alcohol_detail_typical_amount",
  "alcohol_detail_heavy_episode",
  "weekly_moderate_activity_minutes",
  "movement_strength_days",
  "movement_walking_days",
  "sedentary_total_hours",
  "plant_food_frequency",
  "diet_whole_grains",
  "diet_legumes",
  "diet_processed_meat",
  "diet_sugary_drinks",
  "usual_sleep_hours",
  "sleep_refreshed",
  "circadian_bedtime_variation",
  "stress_recovery_practice",
  "preventive_followup_status",
  "preventive_followup_action",
  "current_medications",
  "med_detail_prescriber_followup",
  "adherence_missed_doses",
  "adherence_access_barriers",
  "interaction_shared_list",
] as const;

export type PurityScoreInputId = (typeof PURITY_SCORE_INPUT_IDS)[number];

export type ScoreCategoryId =
  | "tobacco-nicotine"
  | "alcohol"
  | "movement-sitting"
  | "nutrition"
  | "sleep"
  | "recovery"
  | "preventive-followup"
  | "medication-safety";

export type ScoreSource = {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
};

export type ScoreComponent = {
  readonly questionId: PurityScoreInputId;
  readonly label: string;
  readonly maxPoints: number;
  readonly status: "answered" | "missing" | "excluded";
  readonly fraction?: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly explanation: string;
  readonly exclusionReason?:
    | "prescribed-nrt-quit-plan"
    | "not-due"
    | "access-or-safety-barrier"
    | "no-current-access"
    | "medication-not-applicable";
  readonly source: ScoreSource;
};

export type ScoreCategory = {
  readonly id: ScoreCategoryId;
  readonly label: string;
  readonly maxPoints: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly coverage: number | null;
  readonly components: ReadonlyArray<ScoreComponent>;
  readonly source: ScoreSource;
};

export type ScoreSupportContext = {
  readonly categoryId: ScoreCategoryId;
  readonly explanation: string;
  readonly exclusionReason: "access-or-safety-barrier" | "no-current-access";
  readonly source: ScoreSource;
};

type ScoreLedger = {
  readonly label: typeof PURITY_SCORE_LABEL;
  readonly scoreVersion: typeof PURITY_SCORE_VERSION;
  readonly assessmentDepth: AnalysisDepth;
  readonly coverage: number;
  readonly earnedPoints: number;
  readonly assessedPoints: number;
  readonly applicablePoints: number;
  readonly answeredCategoryCount: number;
  readonly categories: ReadonlyArray<ScoreCategory>;
  readonly supportContexts: ReadonlyArray<ScoreSupportContext>;
  readonly explanations: ReadonlyArray<string>;
};

export type AdultPurityScoreResult = ScoreLedger & {
  readonly kind: "adult-score";
  readonly score: number;
};

export type CoverageCategory = {
  readonly id: ScoreCategoryId;
  readonly label: string;
  readonly coverage: number | null;
  readonly answeredComponents: number;
  readonly missingComponents: number;
  readonly excludedComponents: number;
};

export type PublicInsufficientCoverageResult = {
  readonly kind: "insufficient-coverage";
  readonly reason:
    | "express-assessment"
    | "quick-assessment"
    | "answer-more-wellness-habits"
    | "unresolved-core-gate";
  readonly label: typeof PURITY_SCORE_LABEL;
  readonly scoreVersion: typeof PURITY_SCORE_VERSION;
  readonly assessmentDepth: AnalysisDepth;
  readonly coverage: number;
  readonly answeredCategoryCount: number;
  readonly answeredCategories: ReadonlyArray<CoverageCategory>;
  readonly supportContexts: ReadonlyArray<ScoreSupportContext>;
  readonly explanations: ReadonlyArray<string>;
};

export type PurityScoreResult =
  | AdultPurityScoreResult
  | PublicInsufficientCoverageResult
  | {
      readonly kind: "not-available";
      readonly reason: "under-18-or-age-unverified";
    };

export type ScoreRouting = {
  readonly ageYears: number | null;
  readonly assessmentDepth: AnalysisDepth;
};

export type ActionItem = {
  readonly id: string;
  readonly kind: "access-support" | "prompt-review" | "habit";
  readonly categoryId?: ScoreCategoryId;
  readonly title: string;
  readonly reason: string;
  readonly nextStep: string;
  readonly sources: ReadonlyArray<ScoreSource>;
  readonly opportunity: number;
};

const SOURCES = {
  tobacco: {
    title: "Tobacco",
    publisher: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/tobacco",
  },
  alcohol: {
    title: "Alcohol",
    publisher: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/alcohol",
  },
  movement: {
    title: "Physical activity",
    publisher: "World Health Organization",
    url: "https://www.who.int/europe/news-room/fact-sheets/item/physical-activity",
  },
  nutrition: {
    title: "Healthy diet",
    publisher: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  },
  sleep: {
    title: "About sleep",
    publisher: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/sleep/about/index.html",
  },
  recovery: {
    title: "Doing What Matters in Times of Stress: An Illustrated Guide",
    publisher: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240003927",
  },
  preventive: {
    title: "Primary health care",
    publisher: "World Health Organization",
    url: "https://www.who.int/health-topics/primary-health-care",
  },
  medication: {
    title: "Medication Without Harm",
    publisher: "World Health Organization",
    url: "https://www.who.int/initiatives/medication-without-harm",
  },
} as const satisfies Readonly<Record<string, ScoreSource>>;

type ComponentOptions = {
  questionId: PurityScoreInputId;
  label: string;
  maxPoints: number;
  source: ScoreSource;
};

function componentAnswered(
  options: ComponentOptions,
  fraction: number,
  explanation: string,
): ScoreComponent {
  const boundedFraction = new Decimal(fraction).clamp(0, 1);
  return {
    ...options,
    status: "answered",
    fraction: boundedFraction.toNumber(),
    earnedPoints: boundedFraction
      .times(options.maxPoints)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber(),
    assessedPoints: options.maxPoints,
    applicablePoints: options.maxPoints,
    explanation,
  };
}

function componentMissing(
  options: ComponentOptions,
  explanation: string,
): ScoreComponent {
  return {
    ...options,
    status: "missing",
    earnedPoints: 0,
    assessedPoints: 0,
    applicablePoints: options.maxPoints,
    explanation,
  };
}

function componentExcluded(
  options: ComponentOptions,
  explanation: string,
  exclusionReason: NonNullable<ScoreComponent["exclusionReason"]>,
): ScoreComponent {
  return {
    ...options,
    status: "excluded",
    earnedPoints: 0,
    assessedPoints: 0,
    applicablePoints: 0,
    explanation,
    exclusionReason,
  };
}

function mappedString(
  value: AnswerValue | undefined,
  mapping: Readonly<Record<string, number>>,
): number | undefined {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(mapping, value)
    ? mapping[value]
    : undefined;
}

function cappedNumber(
  value: AnswerValue | undefined,
  cap: number,
  integerOnly = false,
): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integerOnly && !Number.isInteger(value))
  ) {
    return undefined;
  }
  return Math.min(value, cap);
}

function numericComponent(
  answers: AnswerMap,
  options: ComponentOptions,
  cap: number,
  map: (value: number) => { fraction: number; explanation: string },
  integerOnly = false,
): ScoreComponent {
  const value = cappedNumber(answers[options.questionId], cap, integerOnly);
  if (value === undefined) {
    return componentMissing(options, "This component was not answered with a valid value.");
  }
  const mapped = map(value);
  return componentAnswered(options, mapped.fraction, mapped.explanation);
}

function stringComponent(
  answers: AnswerMap,
  options: ComponentOptions,
  mapping: Readonly<Record<string, number>>,
  explanations: Readonly<Record<string, string>>,
): ScoreComponent {
  const value = answers[options.questionId];
  const fraction = mappedString(value, mapping);
  return fraction === undefined || typeof value !== "string"
    ? componentMissing(options, "This component was not answered with a mapped option.")
    : componentAnswered(options, fraction, explanations[value]);
}

function category(
  id: ScoreCategoryId,
  label: string,
  maxPoints: number,
  source: ScoreSource,
  components: ReadonlyArray<ScoreComponent>,
): ScoreCategory {
  const earned = Decimal.sum(...components.map((item) => item.earnedPoints));
  const assessed = Decimal.sum(...components.map((item) => item.assessedPoints));
  const applicable = Decimal.sum(...components.map((item) => item.applicablePoints));
  return {
    id,
    label,
    maxPoints,
    earnedPoints: earned.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    assessedPoints: assessed.toNumber(),
    applicablePoints: applicable.toNumber(),
    coverage: applicable.isZero()
      ? null
      : assessed
          .times(100)
          .div(applicable)
          .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
          .toNumber(),
    components,
    source,
  };
}

function tobaccoCategory(answers: AnswerMap) {
  const options = {
    questionId: "current_tobacco_nicotine" as const,
    label: "Current tobacco/nicotine avoidance",
    maxPoints: 20,
    source: SOURCES.tobacco,
  };
  const current = answers.current_tobacco_nicotine;
  const context = answers.tobacco_nicotine_context;
  let resolved = true;
  let component: ScoreComponent;

  if (current === false) {
    component = componentAnswered(
      options,
      1,
      "You reported no current tobacco or nicotine use.",
    );
  } else if (current === true && context === "only_prescribed_nrt_quit_plan") {
    component = componentExcluded(
      options,
      "Prescribed nicotine replacement in a quit plan is excluded from this component.",
      "prescribed-nrt-quit-plan",
    );
  } else if (
    current === true &&
    (context === "tobacco_vape_or_other_nicotine" || context === "both")
  ) {
    component = componentAnswered(
      options,
      0,
      "You reported current tobacco, vaping, or other nicotine use.",
    );
  } else {
    resolved = false;
    component = componentMissing(
      options,
      current === true
        ? "The current nicotine context was not resolved."
        : "Current tobacco or nicotine use was not answered.",
    );
  }

  return {
    category: category(
      "tobacco-nicotine",
      "Tobacco/nicotine avoidance",
      20,
      SOURCES.tobacco,
      [component],
    ),
    resolved,
  };
}

function alcoholCategory(answers: AnswerMap) {
  const frequencyOptions = {
    questionId: "alcohol_frequency" as const,
    label: "Alcohol frequency",
    maxPoints: 5,
    source: SOURCES.alcohol,
  };
  const amountOptions = {
    questionId: "alcohol_detail_typical_amount" as const,
    label: "Typical amount",
    maxPoints: 5,
    source: SOURCES.alcohol,
  };
  const heavyOptions = {
    questionId: "alcohol_detail_heavy_episode" as const,
    label: "Heavy-episode frequency",
    maxPoints: 5,
    source: SOURCES.alcohol,
  };
  const frequency = answers.alcohol_frequency;
  const frequencyMapping = {
    never: 1,
    monthly_or_less: 0.8,
    two_to_four_monthly: 0.6,
    two_to_three_weekly: 0.3,
    four_plus_weekly: 0,
  } as const;
  const frequencyExplanations = {
    never: "You reported no alcohol use.",
    monthly_or_less: "You reported alcohol use monthly or less.",
    two_to_four_monthly: "You reported alcohol use two to four times a month.",
    two_to_three_weekly: "You reported alcohol use two to three times a week.",
    four_plus_weekly: "You reported alcohol use four or more times a week.",
  } as const;
  const hasContradictoryDetail =
    frequency === "never" &&
    [answers.alcohol_detail_typical_amount, answers.alcohol_detail_heavy_episode].some(
      (value) => value !== undefined && value !== null,
    );

  if (hasContradictoryDetail) {
    const components = [
      componentMissing(
        frequencyOptions,
        "The alcohol gate conflicts with a drinking-detail answer and needs correction.",
      ),
      componentMissing(amountOptions, "This detail cannot be assessed until the gate is corrected."),
      componentMissing(heavyOptions, "This detail cannot be assessed until the gate is corrected."),
    ];
    return {
      category: category("alcohol", "Alcohol pattern", 15, SOURCES.alcohol, components),
      resolved: false,
    };
  }

  if (frequency === "never") {
    const components = [
      componentAnswered(frequencyOptions, 1, frequencyExplanations.never),
      componentAnswered(
        amountOptions,
        1,
        "Typical amount is fully assessed because no alcohol use was reported.",
      ),
      componentAnswered(
        heavyOptions,
        1,
        "Heavy episodes are fully assessed because no alcohol use was reported.",
      ),
    ];
    return {
      category: category("alcohol", "Alcohol pattern", 15, SOURCES.alcohol, components),
      resolved: true,
    };
  }

  const frequencyFraction = mappedString(frequency, frequencyMapping);
  const validFrequency =
    frequencyFraction !== undefined && typeof frequency === "string";
  const frequencyComponent = validFrequency
    ? componentAnswered(
        frequencyOptions,
        frequencyFraction,
        frequencyExplanations[frequency as keyof typeof frequencyExplanations],
      )
    : componentMissing(frequencyOptions, "Alcohol frequency was not answered with a mapped option.");
  const amountComponent = validFrequency
    ? numericComponent(answers, amountOptions, 4, (value) =>
        value <= 1
          ? { fraction: 1, explanation: "You reported up to one standard drink on a usual drinking day." }
          : value <= 2
            ? { fraction: 0.67, explanation: "You reported more than one and up to two standard drinks." }
            : value <= 3
              ? { fraction: 0.33, explanation: "You reported more than two and up to three standard drinks." }
              : { fraction: 0, explanation: "You reported more than three standard drinks." },
      )
    : componentMissing(amountOptions, "This detail is unresolved until alcohol frequency is answered.");
  const heavyComponent = validFrequency
    ? stringComponent(
        answers,
        heavyOptions,
        { never: 1, less_monthly: 0.75, monthly: 0.5, weekly: 0.25, daily: 0 },
        {
          never: "You reported no heavy drinking episodes.",
          less_monthly: "You reported a heavy episode less than monthly.",
          monthly: "You reported a heavy episode monthly.",
          weekly: "You reported a heavy episode weekly.",
          daily: "You reported a heavy episode daily or almost daily.",
        },
      )
    : componentMissing(heavyOptions, "This detail is unresolved until alcohol frequency is answered.");

  return {
    category: category(
      "alcohol",
      "Alcohol pattern",
      15,
      SOURCES.alcohol,
      [frequencyComponent, amountComponent, heavyComponent],
    ),
    resolved: validFrequency,
  };
}

function movementCategory(answers: AnswerMap) {
  const components = [
    numericComponent(
      answers,
      {
        questionId: "weekly_moderate_activity_minutes",
        label: "Weekly moderate or vigorous activity",
        maxPoints: 10,
        source: SOURCES.movement,
      },
      300,
      (value) =>
        value === 0
          ? { fraction: 0, explanation: "You reported no moderate or vigorous activity in a usual week." }
          : value < 75
            ? { fraction: 0.25, explanation: "You reported 1–74 minutes of weekly activity." }
            : value < 150
              ? { fraction: 0.5, explanation: "You reported 75–149 minutes of weekly activity." }
              : { fraction: 1, explanation: "You reported at least 150 minutes of weekly activity." },
    ),
    numericComponent(
      answers,
      {
        questionId: "movement_strength_days",
        label: "Strength activity days",
        maxPoints: 4,
        source: SOURCES.movement,
      },
      2,
      (value) =>
        value === 0
          ? { fraction: 0, explanation: "You reported no strength-activity days." }
          : value === 1
            ? { fraction: 0.5, explanation: "You reported one strength-activity day." }
            : { fraction: 1, explanation: "You reported at least two strength-activity days." },
      true,
    ),
    numericComponent(
      answers,
      {
        questionId: "movement_walking_days",
        label: "Brisk walking days",
        maxPoints: 2,
        source: SOURCES.movement,
      },
      5,
      (value) =>
        value === 0
          ? { fraction: 0, explanation: "You reported no brisk-walking days." }
          : value <= 2
            ? { fraction: 0.4, explanation: "You reported one or two brisk-walking days." }
            : value <= 4
              ? { fraction: 0.7, explanation: "You reported three or four brisk-walking days." }
              : { fraction: 1, explanation: "You reported at least five brisk-walking days." },
      true,
    ),
    numericComponent(
      answers,
      {
        questionId: "sedentary_total_hours",
        label: "Daily sitting or reclining",
        maxPoints: 2,
        source: SOURCES.movement,
      },
      10,
      (value) =>
        value <= 4
          ? { fraction: 1, explanation: "You reported up to four waking hours sitting or reclining." }
          : value < 7
            ? { fraction: 0.75, explanation: "You reported more than four and under seven sedentary hours." }
            : value < 10
              ? { fraction: 0.4, explanation: "You reported seven to under ten sedentary hours." }
              : { fraction: 0, explanation: "You reported ten or more sedentary hours." },
    ),
  ];
  return category(
    "movement-sitting",
    "Movement and sitting",
    18,
    SOURCES.movement,
    components,
  );
}

function nutritionCategory(answers: AnswerMap) {
  const components = [
    numericComponent(
      answers,
      {
        questionId: "plant_food_frequency",
        label: "Vegetable and fruit portions",
        maxPoints: 6,
        source: SOURCES.nutrition,
      },
      5,
      (value) =>
        value === 0
          ? { fraction: 0, explanation: "You reported no vegetable or fruit portions on a typical day." }
          : value <= 2
            ? { fraction: 0.35, explanation: "You reported one or two vegetable or fruit portions." }
            : value <= 4
              ? { fraction: 0.7, explanation: "You reported three or four vegetable or fruit portions." }
              : { fraction: 1, explanation: "You reported at least five vegetable or fruit portions." },
      true,
    ),
    stringComponent(
      answers,
      {
        questionId: "diet_whole_grains",
        label: "Whole-grain choices",
        maxPoints: 3,
        source: SOURCES.nutrition,
      },
      { never: 0, rarely: 0.25, sometimes: 0.5, often: 0.75, daily: 1 },
      {
        never: "You reported never choosing whole grains.",
        rarely: "You reported rarely choosing whole grains.",
        sometimes: "You reported sometimes choosing whole grains.",
        often: "You reported often choosing whole grains.",
        daily: "You reported choosing whole grains daily or almost daily.",
      },
    ),
    numericComponent(
      answers,
      {
        questionId: "diet_legumes",
        label: "Legume meals",
        maxPoints: 3,
        source: SOURCES.nutrition,
      },
      3,
      (value) =>
        value === 0
          ? { fraction: 0, explanation: "You reported no legume meals in a usual week." }
          : value === 1
            ? { fraction: 0.35, explanation: "You reported one legume meal in a usual week." }
            : value === 2
              ? { fraction: 0.7, explanation: "You reported two legume meals in a usual week." }
              : { fraction: 1, explanation: "You reported at least three legume meals in a usual week." },
      true,
    ),
    stringComponent(
      answers,
      {
        questionId: "diet_processed_meat",
        label: "Processed-meat frequency",
        maxPoints: 3,
        source: SOURCES.nutrition,
      },
      { never: 1, rarely: 0.75, sometimes: 0.5, often: 0.25, daily: 0 },
      {
        never: "You reported never eating processed meat.",
        rarely: "You reported rarely eating processed meat.",
        sometimes: "You reported sometimes eating processed meat.",
        often: "You reported often eating processed meat.",
        daily: "You reported eating processed meat daily or almost daily.",
      },
    ),
    numericComponent(
      answers,
      {
        questionId: "diet_sugary_drinks",
        label: "Sugary-drink frequency",
        maxPoints: 3,
        source: SOURCES.nutrition,
      },
      7,
      (value) =>
        value === 0
          ? { fraction: 1, explanation: "You reported no sugary drinks in a usual week." }
          : value === 1
            ? { fraction: 0.75, explanation: "You reported one sugary drink in a usual week." }
            : value <= 3
              ? { fraction: 0.5, explanation: "You reported two or three sugary drinks in a usual week." }
              : value <= 6
                ? { fraction: 0.25, explanation: "You reported four to six sugary drinks in a usual week." }
                : { fraction: 0, explanation: "You reported seven or more sugary drinks in a usual week." },
      true,
    ),
  ];
  return category("nutrition", "Nutrition pattern", 18, SOURCES.nutrition, components);
}

function sleepCategory(answers: AnswerMap) {
  const components = [
    numericComponent(
      answers,
      {
        questionId: "usual_sleep_hours",
        label: "Usual sleep duration",
        maxPoints: 5,
        source: SOURCES.sleep,
      },
      7,
      (value) =>
        value < 6
          ? { fraction: 0, explanation: "You reported under six hours of usual sleep." }
          : value < 7
            ? { fraction: 0.5, explanation: "You reported six to under seven hours of usual sleep." }
            : { fraction: 1, explanation: "You reported at least seven hours of usual sleep." },
    ),
    numericComponent(
      answers,
      {
        questionId: "sleep_refreshed",
        label: "Feeling refreshed after waking",
        maxPoints: 4,
        source: SOURCES.sleep,
      },
      10,
      (value) =>
        value <= 2
          ? { fraction: 0, explanation: "You placed refreshed sleep in the 0–2 band." }
          : value <= 4
            ? { fraction: 0.25, explanation: "You placed refreshed sleep in the 3–4 band." }
            : value <= 6
              ? { fraction: 0.5, explanation: "You placed refreshed sleep in the 5–6 band." }
              : value <= 8
                ? { fraction: 0.75, explanation: "You placed refreshed sleep in the 7–8 band." }
                : { fraction: 1, explanation: "You placed refreshed sleep in the 9–10 band." },
    ),
    numericComponent(
      answers,
      {
        questionId: "circadian_bedtime_variation",
        label: "Bedtime variation",
        maxPoints: 3,
        source: SOURCES.sleep,
      },
      4,
      (value) =>
        value <= 1
          ? { fraction: 1, explanation: "You reported up to one hour of bedtime variation." }
          : value <= 2
            ? { fraction: 0.75, explanation: "You reported more than one and up to two hours of bedtime variation." }
            : value <= 3
              ? { fraction: 0.5, explanation: "You reported more than two and up to three hours of bedtime variation." }
              : { fraction: 0, explanation: "You reported more than three hours of bedtime variation." },
    ),
  ];
  return category("sleep", "Sleep routine", 12, SOURCES.sleep, components);
}

function recoveryCategory(answers: AnswerMap) {
  const component = stringComponent(
    answers,
    {
      questionId: "stress_recovery_practice",
      label: "Brief stress-management practice",
      maxPoints: 7,
      source: SOURCES.recovery,
    },
    { never: 0, rarely: 0.25, sometimes: 0.5, often: 0.75, daily: 1 },
    {
      never: "You reported never practising a brief stress-management skill.",
      rarely: "You reported rarely practising a brief stress-management skill.",
      sometimes: "You reported sometimes practising a brief stress-management skill.",
      often: "You reported often practising a brief stress-management skill.",
      daily: "You reported practising a brief stress-management skill daily or almost daily.",
    },
  );
  return category("recovery", "Stress-management practice", 7, SOURCES.recovery, [component]);
}

function preventiveCategory(answers: AnswerMap) {
  const options = {
    questionId: "preventive_followup_action" as const,
    label: "Chosen preventive follow-up",
    maxPoints: 5,
    source: SOURCES.preventive,
  };
  const status = answers.preventive_followup_status;
  let component: ScoreComponent;
  if (status === "not_due") {
    component = componentExcluded(
      options,
      "You reported that no routine follow-up was personally due.",
      "not-due",
    );
  } else if (status === "yes" && answers.preventive_followup_action === "access_or_safety_barrier") {
    component = componentExcluded(
      options,
      "You reported an access or safety barrier to a personally chosen follow-up.",
      "access-or-safety-barrier",
    );
  } else if (status === "yes") {
    const action = answers.preventive_followup_action;
    const fraction = mappedString(action, {
      completed: 1,
      booked_or_contacted: 0.5,
      not_yet: 0,
    });
    component =
      fraction === undefined || typeof action !== "string"
        ? componentMissing(options, "The chosen follow-up action was not answered.")
        : componentAnswered(
            options,
            fraction,
            action === "completed"
              ? "You reported completing a personally due follow-up."
              : action === "booked_or_contacted"
                ? "You reported booking or contacting a service about a personally due follow-up."
                : "You reported not yet acting on a personally due follow-up.",
          );
  } else {
    component = componentMissing(options, "Whether a chosen preventive follow-up applies is unresolved.");
  }
  return category(
    "preventive-followup",
    "Chosen preventive follow-up",
    5,
    SOURCES.preventive,
    [component],
  );
}

function hasMedicationBarrier(value: AnswerValue | undefined): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    !value.includes("none") &&
    value.every((item) =>
      ["cost", "swallowing", "effects", "schedule", "memory"].includes(item),
    )
  );
}

function medicationCategory(answers: AnswerMap) {
  const prescriberOptions = {
    questionId: "med_detail_prescriber_followup" as const,
    label: "Prescriber follow-up",
    maxPoints: 3,
    source: SOURCES.medication,
  };
  const missedOptions = {
    questionId: "adherence_missed_doses" as const,
    label: "Dose-taking pattern",
    maxPoints: 1,
    source: SOURCES.medication,
  };
  const sharedOptions = {
    questionId: "interaction_shared_list" as const,
    label: "Shared medicine list",
    maxPoints: 1,
    source: SOURCES.medication,
  };
  const current = answers.current_medications;

  if (current === false) {
    return category(
      "medication-safety",
      "Medication-safety behaviour",
      5,
      SOURCES.medication,
      [prescriberOptions, missedOptions, sharedOptions].map((options) =>
        componentExcluded(
          options,
          "This component does not apply because you reported no current prescription medicines.",
          "medication-not-applicable",
        ),
      ),
    );
  }

  if (current !== true) {
    return category(
      "medication-safety",
      "Medication-safety behaviour",
      5,
      SOURCES.medication,
      [prescriberOptions, missedOptions, sharedOptions].map((options) =>
        componentMissing(options, "Current prescription-medicine use is unresolved."),
      ),
    );
  }

  const prescriber =
    answers.med_detail_prescriber_followup === "no_current_access"
      ? componentExcluded(
          prescriberOptions,
          "You reported no current access to prescriber follow-up.",
          "no-current-access",
        )
      : stringComponent(
          answers,
          prescriberOptions,
          { yes_all: 1, yes_some: 0.5, no: 0 },
          {
            yes_all: "You reported prescriber follow-up for all current medicines.",
            yes_some: "You reported prescriber follow-up for some current medicines.",
            no: "You reported no prescriber follow-up for current medicines.",
          },
        );
  const missed = hasMedicationBarrier(answers.adherence_access_barriers)
    ? componentExcluded(
        missedOptions,
        "A medicine access or use barrier was reported, so dose-taking is excluded.",
        "access-or-safety-barrier",
      )
    : stringComponent(
        answers,
        missedOptions,
        { never: 1, rarely: 0.75, monthly: 0.5, weekly: 0.25 },
        {
          never: "You reported never missing, delaying, or repeating a dose.",
          rarely: "You reported rarely missing, delaying, or repeating a dose.",
          monthly: "You reported this happening a few times a month.",
          weekly: "You reported this happening at least weekly.",
        },
      );
  const shared =
    answers.interaction_shared_list === true
      ? componentAnswered(sharedOptions, 1, "You reported that a clinician or pharmacist has a current medicine list.")
      : answers.interaction_shared_list === false
        ? componentAnswered(sharedOptions, 0, "You reported that no clinician or pharmacist has a current medicine list.")
        : componentMissing(sharedOptions, "A shared current medicine list was not answered.");

  return category(
    "medication-safety",
    "Medication-safety behaviour",
    5,
    SOURCES.medication,
    [prescriber, missed, shared],
  );
}

function scoreLedger(
  categories: ReadonlyArray<ScoreCategory>,
  assessmentDepth: AnalysisDepth,
): ScoreLedger {
  const earned = Decimal.sum(...categories.map((item) => item.earnedPoints));
  const assessed = Decimal.sum(...categories.map((item) => item.assessedPoints));
  const applicable = Decimal.sum(...categories.map((item) => item.applicablePoints));
  const coverage = applicable.isZero()
    ? 0
    : assessed
        .times(100)
        .div(applicable)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
  const answeredCategoryCount = categories.filter(
    (item) => item.applicablePoints > 0 && item.assessedPoints > 0,
  ).length;
  return {
    label: PURITY_SCORE_LABEL,
    scoreVersion: PURITY_SCORE_VERSION,
    assessmentDepth,
    coverage,
    earnedPoints: earned.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    assessedPoints: assessed.toNumber(),
    applicablePoints: applicable.toNumber(),
    answeredCategoryCount,
    categories,
    supportContexts: categories.flatMap((scoreCategory) =>
      scoreCategory.components.flatMap((component) =>
        component.exclusionReason === "access-or-safety-barrier" ||
        component.exclusionReason === "no-current-access"
          ? [
              {
                categoryId: scoreCategory.id,
                explanation: component.explanation,
                exclusionReason: component.exclusionReason,
                source: scoreCategory.source,
              },
            ]
          : [],
      ),
    ),
    explanations: [
      "This transparent index uses only answered, modifiable wellness habits.",
      "The point weights are product choices, not disease probabilities or clinical coefficients.",
      "Missing answers reduce coverage rather than earning zero points.",
    ],
  };
}

function insufficientCoverage(
  ledger: ScoreLedger,
  reason: PublicInsufficientCoverageResult["reason"],
): PublicInsufficientCoverageResult {
  return {
    kind: "insufficient-coverage",
    reason,
    label: ledger.label,
    scoreVersion: ledger.scoreVersion,
    assessmentDepth: ledger.assessmentDepth,
    coverage: ledger.coverage,
    answeredCategoryCount: ledger.answeredCategoryCount,
    answeredCategories: ledger.categories.map((scoreCategory) => ({
      id: scoreCategory.id,
      label: scoreCategory.label,
      coverage: scoreCategory.coverage,
      answeredComponents: scoreCategory.components.filter(
        (component) => component.status === "answered",
      ).length,
      missingComponents: scoreCategory.components.filter(
        (component) => component.status === "missing",
      ).length,
      excludedComponents: scoreCategory.components.filter(
        (component) => component.status === "excluded",
      ).length,
    })),
    supportContexts: ledger.supportContexts,
    explanations: ledger.explanations,
  };
}

export function calculatePurityScore(
  answers: AnswerMap,
  routing: ScoreRouting,
): PurityScoreResult {
  if (
    routing.ageYears === null ||
    !Number.isInteger(routing.ageYears) ||
    !Number.isFinite(routing.ageYears) ||
    routing.ageYears < 18
  ) {
    return {
      kind: "not-available",
      reason: "under-18-or-age-unverified",
    };
  }

  const tobacco = tobaccoCategory(answers);
  const alcohol = alcoholCategory(answers);
  const categories = [
    tobacco.category,
    alcohol.category,
    movementCategory(answers),
    nutritionCategory(answers),
    sleepCategory(answers),
    recoveryCategory(answers),
    preventiveCategory(answers),
    medicationCategory(answers),
  ] as const;
  const ledger = scoreLedger(categories, routing.assessmentDepth);

  if (routing.assessmentDepth === "express") {
    return insufficientCoverage(ledger, "express-assessment");
  }

  if (routing.assessmentDepth === "quick") {
    return insufficientCoverage(ledger, "quick-assessment");
  }

  const coreGatesResolved = tobacco.resolved && alcohol.resolved;
  const meetsRawCoverageGate =
    ledger.applicablePoints > 0 &&
    new Decimal(ledger.assessedPoints)
      .times(100)
      .gte(new Decimal(ledger.applicablePoints).times(70));
  if (
    !meetsRawCoverageGate ||
    ledger.answeredCategoryCount < 5 ||
    !coreGatesResolved ||
    ledger.assessedPoints === 0
  ) {
    return insufficientCoverage(
      ledger,
      coreGatesResolved
        ? "answer-more-wellness-habits"
        : "unresolved-core-gate",
    );
  }

  const score = new Decimal(ledger.earnedPoints)
    .times(100)
    .div(ledger.assessedPoints)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return { kind: "adult-score", score, ...ledger };
}

const ACTION_COPY: Readonly<
  Record<ScoreCategoryId, { title: string; nextStep: string }>
> = {
  "tobacco-nicotine": {
    title: "Choose the tobacco or nicotine support that fits you",
    nextStep:
      "If you want to change current use, choose one voluntary first step: ask a qualified local service, pharmacist, or clinician about support options.",
  },
  alcohol: {
    title: "Choose one alcohol-pattern step",
    nextStep:
      "If you want to change this pattern, choose one feasible alcohol-free occasion or ask a qualified local service for non-judgmental support.",
  },
  "movement-sitting": {
    title: "Choose one feasible movement or sitting step",
    nextStep:
      "Choose a small movement or sitting-break change that fits your body, access, work, and safety context.",
  },
  nutrition: {
    title: "Choose one practical food-pattern step",
    nextStep:
      "Choose one feasible addition or swap from the pattern you reported, without calorie targets or restrictive food rules.",
  },
  sleep: {
    title: "Choose one sleep-routine step",
    nextStep:
      "Choose one feasible routine change, such as protecting sleep time or making bedtime timing more regular.",
  },
  recovery: {
    title: "Try one brief stress-management practice",
    nextStep:
      "Choose grounding, unhooking, acting on your values, being kind, or making room, and practise it for a few minutes today.",
  },
  "preventive-followup": {
    title: "Take one step on the follow-up you chose",
    nextStep:
      "If it remains feasible and safe, choose whether to contact the relevant service or make a booking.",
  },
  "medication-safety": {
    title: "Strengthen one medicine-safety routine",
    nextStep:
      "Choose one feasible step such as updating your medicine list or asking a pharmacist or prescriber a question; do not change a dose from this report.",
  },
};

// This is the published category/source order from the v1 research table. It is used only
// after equal numerical deficits and the explicit already-planned step signal. Keeping it
// explicit avoids an accidental category-name priority.
const ACTION_EVIDENCE_DIRECTION = new Map<ScoreCategoryId, number>(
  ([
    "tobacco-nicotine",
    "alcohol",
    "movement-sitting",
    "nutrition",
    "sleep",
    "recovery",
    "preventive-followup",
    "medication-safety",
  ] as const).map((categoryId, index) => [categoryId, index]),
);

function evidenceDirectionRank(categoryId: ScoreCategoryId | undefined): number {
  return categoryId === undefined
    ? Number.MAX_SAFE_INTEGER
    : (ACTION_EVIDENCE_DIRECTION.get(categoryId) ?? Number.MAX_SAFE_INTEGER);
}

function distinctSources(
  sources: ReadonlyArray<ScoreSource>,
): ReadonlyArray<ScoreSource> {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const identity = JSON.stringify([source.publisher, source.title, source.url]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function barrierAction(
  score: AdultPurityScoreResult | PublicInsufficientCoverageResult,
):
  | { readonly action: ActionItem; readonly categoryIds: ReadonlySet<ScoreCategoryId> }
  | undefined {
  if (score.supportContexts.length === 0) return undefined;
  const categoryIds = new Set(score.supportContexts.map((context) => context.categoryId));
  const categoryLabels = new Map(
    score.kind === "adult-score"
      ? score.categories.map((scoreCategory) => [scoreCategory.id, scoreCategory.label])
      : score.answeredCategories.map((scoreCategory) => [scoreCategory.id, scoreCategory.label]),
  );
  const reasons = [
    ...new Set(
      score.supportContexts.map(
        (context) =>
          `${categoryLabels.get(context.categoryId) ?? context.categoryId}: ${context.explanation}`,
      ),
    ),
  ];
  const onlyCategory = categoryIds.size === 1 ? [...categoryIds][0] : undefined;
  return {
    categoryIds,
    action: {
      id: "access-support",
      kind: "access-support" as const,
      ...(onlyCategory ? { categoryId: onlyCategory } : {}),
      title: "Start with practical access and safety support",
      reason: reasons.join(" "),
      nextStep:
        "If you want support, choose a qualified local service, pharmacist, clinician, or trusted helper who can work with the barrier you named.",
      sources: distinctSources(score.supportContexts.map((context) => context.source)),
      opportunity: Number.POSITIVE_INFINITY,
    },
  };
}

function habitActions(score: AdultPurityScoreResult): ActionItem[] {
  return score.categories
    .map((scoreCategory) => {
      const deficit = new Decimal(scoreCategory.assessedPoints)
        .minus(scoreCategory.earnedPoints)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber();
      const largestDeficitComponent = scoreCategory.components
        .filter((component) => component.status === "answered")
        .sort(
          (left, right) =>
            right.assessedPoints - right.earnedPoints -
              (left.assessedPoints - left.earnedPoints) ||
            left.questionId.localeCompare(right.questionId),
        )[0];
      if (deficit <= 0 || !largestDeficitComponent) return null;
      const isAlreadyPlanned =
        largestDeficitComponent.questionId === "preventive_followup_action" &&
        largestDeficitComponent.fraction === 0.5;
      const copy = isAlreadyPlanned
        ? {
            title: "Follow through on the follow-up already underway",
            nextStep:
              "You already booked or contacted a service; if it remains feasible and safe, choose one small step that helps you attend or prepare.",
          }
        : ACTION_COPY[scoreCategory.id];
      return {
        action: {
          id: `habit-${scoreCategory.id}`,
          kind: "habit" as const,
          categoryId: scoreCategory.id,
          title: copy.title,
          reason: largestDeficitComponent.explanation,
          nextStep: copy.nextStep,
          sources: [scoreCategory.source],
          opportunity: deficit,
        },
        plannedStepRank: isAlreadyPlanned ? 0 : 1,
      };
    })
    .filter((candidate) => candidate !== null)
    .sort(
      (left, right) =>
        right.action.opportunity - left.action.opportunity ||
        left.plannedStepRank - right.plannedStepRank ||
        evidenceDirectionRank(left.action.categoryId) -
          evidenceDirectionRank(right.action.categoryId),
    )
    .map(({ action }) => action);
}

export function buildActionPlan(
  leaves: ReadonlyArray<RiskLeaf>,
  score: PurityScoreResult,
): ActionItem[] {
  // Qualitative leaves remain prominent in the urgent summary and canopy. They cannot
  // consume or reorder the three score-derived action slots, including when a protected
  // or contextual answer changes which qualitative leaves are emitted.
  void leaves;
  if (score.kind === "not-available") return [];
  const selected: ActionItem[] = [];
  const usedCategories = new Set<ScoreCategoryId>();
  const support = barrierAction(score);

  if (support) {
    selected.push(support.action);
    for (const categoryId of support.categoryIds) usedCategories.add(categoryId);
  }

  for (const action of score.kind === "adult-score" ? habitActions(score) : []) {
    if (selected.length >= 3) break;
    if (action.categoryId && usedCategories.has(action.categoryId)) continue;
    selected.push(action);
    if (action.categoryId) usedCategories.add(action.categoryId);
  }

  return selected;
}
