import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  BranchCondition,
  ProfileContext,
  Question,
  QuestionnaireState,
} from "./types";
import { groupQuestionsByPillar } from "./health-pillars";

export const EXPRESS_QUESTION_IDS = [
  "sex_assigned_at_birth",
  "reported_vo2_max_ml_kg_min",
  "weekly_moderate_activity_minutes",
  "chair_stand_30s_count",
  "weight_kg",
  "squat_one_rep_max_kg",
  "deadlift_one_rep_max_kg",
  "movement_strength_days",
  "usual_sleep_hours",
  "sleep_refreshed",
  "plant_food_frequency",
  "diet_ultra_processed",
] as const;

const DEPTH_LIMITS: Readonly<Record<AnalysisDepth, number>> = {
  express: 12,
  quick: 20,
  detailed: 50,
  deep: 200,
};

// Quick and Detailed ask up to their limit; minors with fewer eligible
// questions still get the depth as long as it reaches the minimum. Deep asks
// every eligible base question plus active branches, so its minimum only
// guards against a profile too thin for a deep pass.
const DEPTH_MINIMUMS: Readonly<Record<AnalysisDepth, number>> = {
  express: 12,
  quick: 10,
  detailed: 30,
  deep: 80,
};

const DEEP_MINIMUM_AGE = 18;

const DEPTH_ORDER: ReadonlyArray<AnalysisDepth> = [
  "express",
  "quick",
  "detailed",
  "deep",
];

const MALE_INAPPLICABLE_QUESTION_IDS = new Set([
  "isotretinoin_detail_program_pregnancy",
]);

function valuesEqual(left: AnswerValue | undefined, right: AnswerValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }

  return left === right;
}

function isValidBranchAnswer(
  question: Question | undefined,
  value: AnswerValue | undefined,
): value is AnswerValue {
  if (!question || value === null || value === undefined) return false;

  if (question.answerType === "boolean") return typeof value === "boolean";
  if (question.answerType === "number" || question.answerType === "scale") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (question.answerType === "text") {
    return typeof value === "string" && value.trim().length > 0;
  }

  const allowed = new Set(question.options?.map((option) => option.value) ?? []);
  if (question.answerType === "single") {
    return typeof value === "string" && allowed.has(value);
  }

  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && allowed.has(item)) &&
    new Set(value).size === value.length &&
    !(value.includes("none") && value.length > 1)
  );
}

function matchesCondition(
  condition: BranchCondition,
  answers: AnswerMap,
  questionsById: ReadonlyMap<string, Question>,
): boolean {
  if ("all" in condition) {
    return condition.all.every((part) =>
      matchesCondition(part, answers, questionsById),
    );
  }

  if ("any" in condition) {
    return condition.any.some((part) =>
      matchesCondition(part, answers, questionsById),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(answers, condition.questionId)) {
    return false;
  }

  const answer = answers[condition.questionId];
  if (!isValidBranchAnswer(questionsById.get(condition.questionId), answer)) {
    return false;
  }

  if (condition.operator === "equals") {
    return valuesEqual(answer, condition.value);
  }

  if (condition.operator === "not-equals") {
    return !valuesEqual(answer, condition.value);
  }

  return Array.isArray(answer) && answer.includes(condition.value);
}

export function getEligibleQuestions(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): Question[] {
  const questionsById = new Map(bank.map((question) => [question.id, question]));
  const maleAssignedAtBirth = answers.sex_assigned_at_birth === "male";

  const eligible = bank.filter((question) => {
    // Le sexe non renseigné ou intersexe conserve les questions déclaratives.
    if (maleAssignedAtBirth && (
      question.domain === "pregnancy" || MALE_INAPPLICABLE_QUESTION_IDS.has(question.id)
    )) {
      return false;
    }

    if (question.minAge !== undefined && context.age < question.minAge) {
      return false;
    }

    if (question.maxAge !== undefined && context.age > question.maxAge) {
      return false;
    }

    return question.condition
      ? matchesCondition(question.condition, answers, questionsById)
      : true;
  });

  return eligible.map((question) => {
    if (!maleAssignedAtBirth || question.id !== "glp1_detail_procedure_pregnancy") return question;
    return {
      ...question,
      prompt: "Do you have general anaesthesia or deep sedation planned soon?",
      options: question.options?.filter(({ value }) => value === "procedure" || value === "none"),
    };
  });
}

function compareQuestions(left: Question, right: Question): number {
  return left.priority - right.priority || left.id.localeCompare(right.id);
}

function orderQuestions(questions: ReadonlyArray<Question>): Question[] {
  const core = questions
    .filter((question) => question.tiers.includes("quick"))
    .sort(compareQuestions);
  const remaining = questions
    .filter((question) => !question.tiers.includes("quick"))
    .sort(compareQuestions);

  return [...core, ...remaining];
}

export function pruneIneligibleAnswers(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): AnswerMap {
  let stableAnswers = answers;

  const glpContext = answers.glp1_detail_procedure_pregnancy;
  if (answers.sex_assigned_at_birth === "male" && Array.isArray(glpContext)) {
    const applicableContext = glpContext.filter((value) => value === "procedure" || value === "none");
    if (applicableContext.length !== glpContext.length) {
      const remainingAnswers = Object.fromEntries(
        Object.entries(answers).filter(([id]) => id !== "glp1_detail_procedure_pregnancy"),
      );
      // Une ancienne grossesse ne devient pas implicitement « aucune situation ».
      stableAnswers = applicableContext.length
        ? { ...remainingAnswers, glp1_detail_procedure_pregnancy: applicableContext }
        : remainingAnswers;
    }
  }

  for (let pass = 0; pass <= bank.length; pass += 1) {
    const eligibleIds = new Set(
      getEligibleQuestions(bank, context, stableAnswers).map((question) => question.id),
    );
    const remainingEntries = Object.entries(stableAnswers).filter(([id]) =>
      eligibleIds.has(id),
    );
    if (remainingEntries.length === Object.keys(stableAnswers).length) {
      return stableAnswers;
    }
    stableAnswers = Object.fromEntries(remainingEntries);
  }

  return stableAnswers;
}

function isExpressAdult(context: ProfileContext): boolean {
  return Number.isFinite(context.age) && context.age >= 18;
}

function assertExpressAdult(depth: AnalysisDepth, context: ProfileContext): void {
  if (depth === "express" && !isExpressAdult(context)) {
    throw new RangeError(
      "Express assessment is available only to adults with all twelve eligible questions.",
    );
  }
}

export function getAvailableDepths(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): AnalysisDepth[] {
  const eligible = getEligibleQuestions(bank, context, answers);

  return DEPTH_ORDER.filter(
    (depth) => {
      if (depth === "express") {
        const eligibleIds = new Set(eligible.map((question) => question.id));
        return isExpressAdult(context)
          && EXPRESS_QUESTION_IDS.every((id) => eligibleIds.has(id));
      }
      const depthEligible = eligible.filter((question) => question.tiers.includes(depth));
      if (depth === "deep") {
        return isDeepAvailable(context, countDeepBase(depthEligible));
      }
      return depthEligible.length >= DEPTH_MINIMUMS[depth];
    },
  );
}

function countDeepBase(eligible: ReadonlyArray<Question>): number {
  return eligible.filter((question) => question.condition === undefined).length;
}

function isDeepAvailable(context: ProfileContext, deepBaseCount: number): boolean {
  return context.age >= DEEP_MINIMUM_AGE && deepBaseCount >= DEPTH_MINIMUMS.deep;
}

function assertDeepAvailable(
  depth: AnalysisDepth,
  context: ProfileContext,
  eligible: ReadonlyArray<Question>,
): void {
  if (depth !== "deep") return;
  const deepBaseCount = countDeepBase(eligible);
  if (!isDeepAvailable(context, deepBaseCount)) {
    throw new RangeError(
      `Deep assessment is unavailable: adults only, ${deepBaseCount} eligible base questions; at least ${DEPTH_MINIMUMS.deep} are required.`,
    );
  }
}

export function buildAssessmentQueue(
  depth: AnalysisDepth,
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): Question[] {
  assertExpressAdult(depth, context);
  const stableAnswers = pruneIneligibleAnswers(bank, context, answers);
  const eligible = orderQuestions(
    getEligibleQuestions(bank, context, stableAnswers).filter((question) =>
      question.tiers.includes(depth),
    ),
  );
  assertDeepAvailable(depth, context, eligible);

  return groupQuestionsByPillar(selectAssessmentQuestions(depth, eligible, stableAnswers));
}

function selectAssessmentQuestions(
  depth: AnalysisDepth,
  eligible: ReadonlyArray<Question>,
  answers: AnswerMap,
): Question[] {
  if (depth === "express") {
    const questionsById = new Map(eligible.map((question) => [question.id, question]));
    const selected: Question[] = [];
    for (const id of EXPRESS_QUESTION_IDS) {
      const question = questionsById.get(id);
      if (!question) {
        throw new RangeError(
          "Express assessment is available only to adults with all twelve eligible questions.",
        );
      }
      selected.push(question);
    }
    return selected;
  }

  if (depth === "deep") {
    const base = eligible.filter((question) => question.condition === undefined);
    const activeBranches = eligible
      .filter((question) => question.condition !== undefined)
      .slice(0, Math.max(0, DEPTH_LIMITS.deep - base.length));
    const selectedIds = new Set(
      [...base, ...activeBranches].map((question) => question.id),
    );
    return eligible.filter((question) => selectedIds.has(question.id));
  }

  const targetSize = Math.min(eligible.length, DEPTH_LIMITS[depth]);
  const selectedIds = new Set<string>();

  for (const question of eligible) {
    if (selectedIds.size >= targetSize) break;
    if (Object.prototype.hasOwnProperty.call(answers, question.id)) {
      selectedIds.add(question.id);
    }
  }

  for (const question of eligible) {
    if (selectedIds.size >= targetSize) break;
    if (question.condition !== undefined) selectedIds.add(question.id);
  }
  for (const question of eligible) {
    if (selectedIds.size >= targetSize) break;
    selectedIds.add(question.id);
  }

  return eligible.filter((question) => selectedIds.has(question.id));
}

export function reconcileAssessmentState(
  depth: AnalysisDepth,
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): QuestionnaireState {
  assertExpressAdult(depth, context);
  const stableAnswers = pruneIneligibleAnswers(bank, context, answers);
  const eligible = orderQuestions(
    getEligibleQuestions(bank, context, stableAnswers).filter((question) =>
      question.tiers.includes(depth),
    ),
  );
  assertDeepAvailable(depth, context, eligible);

  return {
    queue: groupQuestionsByPillar(selectAssessmentQuestions(depth, eligible, stableAnswers)),
    answers: stableAnswers,
  };
}

export function getNextQuestion(state: QuestionnaireState): Question | null {
  return (
    state.queue.find(
      (question) => !Object.prototype.hasOwnProperty.call(state.answers, question.id),
    ) ?? null
  );
}
