import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  BranchCondition,
  ProfileContext,
  Question,
  QuestionnaireState,
} from "./types";

const DEPTH_LIMITS: Readonly<Record<AnalysisDepth, number>> = {
  quick: 20,
  detailed: 50,
  deep: 200,
};

const DEPTH_MINIMUMS: Readonly<Record<AnalysisDepth, number>> = {
  quick: 20,
  detailed: 50,
  deep: 150,
};

const DEPTH_ORDER: ReadonlyArray<AnalysisDepth> = ["quick", "detailed", "deep"];

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

function matchesCondition(condition: BranchCondition, answers: AnswerMap): boolean {
  if ("all" in condition) {
    return condition.all.every((part) => matchesCondition(part, answers));
  }

  if ("any" in condition) {
    return condition.any.some((part) => matchesCondition(part, answers));
  }

  if (!Object.prototype.hasOwnProperty.call(answers, condition.questionId)) {
    return false;
  }

  const answer = answers[condition.questionId];
  if (answer === null || answer === undefined) {
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
  return bank.filter((question) => {
    if (question.minAge !== undefined && context.age < question.minAge) {
      return false;
    }

    if (question.maxAge !== undefined && context.age > question.maxAge) {
      return false;
    }

    return question.condition ? matchesCondition(question.condition, answers) : true;
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

function pruneIneligibleAnswers(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): AnswerMap {
  let stableAnswers = answers;

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

export function getAvailableDepths(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): AnalysisDepth[] {
  const eligible = getEligibleQuestions(bank, context, answers);

  return DEPTH_ORDER.filter(
    (depth) => {
      const depthEligible = eligible.filter((question) => question.tiers.includes(depth));
      const availableCount =
        depth === "deep"
          ? depthEligible.filter((question) => question.condition === undefined).length
          : depthEligible.length;
      return availableCount >= DEPTH_MINIMUMS[depth];
    },
  );
}

export function buildAssessmentQueue(
  depth: AnalysisDepth,
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): Question[] {
  const stableAnswers = pruneIneligibleAnswers(bank, context, answers);
  const eligible = orderQuestions(
    getEligibleQuestions(bank, context, stableAnswers).filter((question) =>
      question.tiers.includes(depth),
    ),
  );
  const deepBaseCount = eligible.filter(
    (question) => question.condition === undefined,
  ).length;
  if (depth === "deep" && deepBaseCount < DEPTH_MINIMUMS.deep) {
    throw new RangeError(
      `Deep assessment is unavailable: ${deepBaseCount} eligible base questions; at least 150 eligible questions are required.`,
    );
  }

  return selectAssessmentQuestions(depth, eligible, stableAnswers);
}

function selectAssessmentQuestions(
  depth: AnalysisDepth,
  eligible: ReadonlyArray<Question>,
  answers: AnswerMap,
): Question[] {
  if (depth === "deep") {
    const base = eligible
      .filter((question) => question.condition === undefined)
      .slice(0, DEPTH_MINIMUMS.deep);
    const activeBranches = eligible
      .filter((question) => question.condition !== undefined)
      .slice(0, DEPTH_LIMITS.deep - base.length);
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
  const stableAnswers = pruneIneligibleAnswers(bank, context, answers);
  const eligible = orderQuestions(
    getEligibleQuestions(bank, context, stableAnswers).filter((question) =>
      question.tiers.includes(depth),
    ),
  );
  const deepBaseCount = eligible.filter(
    (question) => question.condition === undefined,
  ).length;
  if (depth === "deep" && deepBaseCount < DEPTH_MINIMUMS.deep) {
    throw new RangeError(
      `Deep assessment is unavailable: ${deepBaseCount} eligible base questions; at least 150 eligible questions are required.`,
    );
  }

  return {
    queue: selectAssessmentQuestions(depth, eligible, stableAnswers),
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
