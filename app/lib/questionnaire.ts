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

export function getAvailableDepths(
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): AnalysisDepth[] {
  const eligible = getEligibleQuestions(bank, context, answers);

  return DEPTH_ORDER.filter(
    (depth) =>
      eligible.filter((question) => question.tiers.includes(depth)).length >=
      DEPTH_MINIMUMS[depth],
  );
}

export function buildAssessmentQueue(
  depth: AnalysisDepth,
  bank: ReadonlyArray<Question>,
  context: ProfileContext,
  answers: AnswerMap,
): Question[] {
  const eligible = getEligibleQuestions(bank, context, answers).filter((question) =>
    question.tiers.includes(depth),
  );
  if (depth === "deep" && eligible.length < DEPTH_MINIMUMS.deep) {
    throw new RangeError(
      `Deep assessment is unavailable: ${eligible.length} eligible questions; at least 150 eligible questions are required.`,
    );
  }

  const core = eligible
    .filter((question) => question.tiers.includes("quick"))
    .sort(compareQuestions);
  const remaining = eligible
    .filter((question) => !question.tiers.includes("quick"))
    .sort(compareQuestions);

  return [...core, ...remaining].slice(0, DEPTH_LIMITS[depth]);
}

export function getNextQuestion(state: QuestionnaireState): Question | null {
  return (
    state.queue.find(
      (question) => !Object.prototype.hasOwnProperty.call(state.answers, question.id),
    ) ?? null
  );
}
