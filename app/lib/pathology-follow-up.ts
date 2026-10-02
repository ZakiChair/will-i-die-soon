import { questionBank } from "../data/questions";
import { getEligibleQuestions } from "./questionnaire";
import type { AnswerMap, PathologyInstrumentId, PathologySynthesis, ProfileContext } from "./types";

export type FollowUpScope = PathologyInstrumentId | "all";

export type FollowUpStep =
  | {
      kind: "question";
      questionId: string;
      /** Hidden questions this gate can open; each is asked once the gate allows it. */
      opens?: ReadonlyArray<string>;
      unlocks: ReadonlyArray<PathologyInstrumentId>;
    }
  | { kind: "labs"; markers: ReadonlyArray<string>; unlocks: ReadonlyArray<PathologyInstrumentId> };

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** The single question a hidden question waits for, when its condition is that simple. */
function gateFor(questionId: string): string | undefined {
  const condition = questionsById.get(questionId)?.condition;
  return condition && "questionId" in condition ? condition.questionId : undefined;
}

function addOnce<T>(list: T[], item: T): void {
  if (!list.includes(item)) list.push(item);
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
  const questionSteps = new Map<string, { opens: string[]; unlocks: PathologyInstrumentId[] }>();
  const markers: string[] = [];
  const labUnlocks: PathologyInstrumentId[] = [];

  function addQuestion(inputId: string, instrument: PathologyInstrumentId): void {
    if (!questionsById.has(inputId)) return;
    let questionId = inputId;
    let opens: string | undefined;
    if (!eligible.has(inputId)) {
      const gate = gateFor(inputId);
      if (!gate || !eligible.has(gate)) return;
      questionId = gate;
      opens = inputId;
    }
    const step = questionSteps.get(questionId) ?? { opens: [], unlocks: [] };
    if (opens) addOnce(step.opens, opens);
    addOnce(step.unlocks, instrument);
    questionSteps.set(questionId, step);
  }

  for (const score of synthesis.scores) {
    if (score.status !== "incomplete" || (scope !== "all" && score.instrument !== scope)) continue;
    for (const inputId of score.missingInputs) {
      if (inputId.startsWith("lab:")) {
        addOnce(markers, inputId.slice("lab:".length));
        addOnce(labUnlocks, score.instrument);
        continue;
      }
      addQuestion(inputId, score.instrument);
    }
    // An input the instrument may never read is not asked directly, only counted behind its gate.
    for (const inputId of score.conditionalInputs ?? []) {
      if (!eligible.has(inputId)) addQuestion(inputId, score.instrument);
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
      ...(step.opens.length > 0 ? { opens: step.opens } : {}),
      unlocks: step.unlocks,
    })),
    ...(markers.length > 0 ? [{ kind: "labs" as const, markers, unlocks: labUnlocks }] : []),
  ];
}

/** Upper bound on the questions a plan asks, counting what each gate can open. */
export function followUpQuestionCount(steps: ReadonlyArray<FollowUpStep>): number {
  return steps.reduce((count, step) => count + 1 + (step.kind === "question" ? (step.opens?.length ?? 0) : 0), 0);
}
