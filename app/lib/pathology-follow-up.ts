import { questionBank } from "../data/questions";
import { getEligibleQuestions } from "./questionnaire";
import type { AnswerMap, PathologyInstrumentId, PathologySynthesis, ProfileContext } from "./types";

export type FollowUpScope = PathologyInstrumentId | "all";

export type FollowUpStep =
  | {
      kind: "question";
      questionId: string;
      /** A hidden question this gate can open; it is asked once the gate allows it. */
      opens?: string;
      unlocks: ReadonlyArray<PathologyInstrumentId>;
    }
  | { kind: "labs"; markers: ReadonlyArray<string>; unlocks: ReadonlyArray<PathologyInstrumentId> };

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** The single question a hidden question waits for, when its condition is that simple. */
function gateFor(questionId: string): string | undefined {
  const condition = questionsById.get(questionId)?.condition;
  return condition && "questionId" in condition ? condition.questionId : undefined;
}

function addUnlock(unlocks: PathologyInstrumentId[], instrument: PathologyInstrumentId): void {
  if (!unlocks.includes(instrument)) unlocks.push(instrument);
}

/**
 * Questions that would complete the incomplete scores in scope, ordered like the
 * questionnaire, gates before what they open, the lab import last.
 */
export function buildFollowUpPlan(
  synthesis: PathologySynthesis,
  answers: AnswerMap,
  profile: ProfileContext,
  scope: FollowUpScope,
): FollowUpStep[] {
  const eligible = new Set(getEligibleQuestions(questionBank, profile, answers).map((question) => question.id));
  const questionSteps = new Map<string, { opens?: string; unlocks: PathologyInstrumentId[] }>();
  const markers: string[] = [];
  const labUnlocks: PathologyInstrumentId[] = [];

  for (const score of synthesis.scores) {
    if (score.status !== "incomplete" || (scope !== "all" && score.instrument !== scope)) continue;
    for (const inputId of score.missingInputs) {
      if (inputId.startsWith("lab:")) {
        const marker = inputId.slice("lab:".length);
        if (!markers.includes(marker)) markers.push(marker);
        addUnlock(labUnlocks, score.instrument);
        continue;
      }
      if (!questionsById.has(inputId)) continue;
      let questionId = inputId;
      let opens: string | undefined;
      if (!eligible.has(inputId)) {
        const gate = gateFor(inputId);
        if (!gate || !eligible.has(gate)) continue;
        questionId = gate;
        opens = inputId;
      }
      const step = questionSteps.get(questionId) ?? { unlocks: [] };
      if (opens) step.opens = opens;
      addUnlock(step.unlocks, score.instrument);
      questionSteps.set(questionId, step);
    }
  }

  const ordered = [...questionSteps.entries()].sort(([left], [right]) => {
    const leftPriority = questionsById.get(left)?.priority ?? Number.POSITIVE_INFINITY;
    const rightPriority = questionsById.get(right)?.priority ?? Number.POSITIVE_INFINITY;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
  return [
    ...ordered.map(([questionId, step]): FollowUpStep => ({
      kind: "question",
      questionId,
      ...(step.opens ? { opens: step.opens } : {}),
      unlocks: step.unlocks,
    })),
    ...(markers.length > 0 ? [{ kind: "labs" as const, markers, unlocks: labUnlocks }] : []),
  ];
}

/** Upper bound on the questions a plan asks: a gate can open one more. */
export function followUpQuestionCount(steps: ReadonlyArray<FollowUpStep>): number {
  return steps.reduce((count, step) => count + 1 + (step.kind === "question" && step.opens ? 1 : 0), 0);
}
