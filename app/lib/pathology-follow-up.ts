import { questionBank } from "../data/questions";
import { getEligibleQuestions } from "./questionnaire";
import type { AnswerMap, BranchCondition, PathologyInstrumentId, PathologySynthesis, ProfileContext } from "./types";

export type FollowUpScope = PathologyInstrumentId | "all";

export type FollowUpStep =
  | {
      kind: "question";
      questionId: string;
      /** Hidden questions this gate can open; each is asked once the gate allows it. */
      opens?: ReadonlyArray<string>;
      /** A lab step may be required if the diagnosis gate reveals diabetes. */
      opensLab?: boolean;
      unlocks: ReadonlyArray<PathologyInstrumentId>;
    }
  | { kind: "labs"; markers: ReadonlyArray<string>; unlocks: ReadonlyArray<PathologyInstrumentId> };

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** Every question a hidden question's condition reads, in declaration order. */
function gateQuestions(condition: BranchCondition | undefined): string[] {
  if (!condition) return [];
  if ("questionId" in condition) return [condition.questionId];
  const branches = "all" in condition ? condition.all : condition.any;
  return branches.flatMap(gateQuestions);
}

/**
 * The gate a hidden question is counted behind: an unanswered eligible gate first, so a
 * compound condition moves to the branch still open; otherwise the first eligible gate,
 * which a closed simple gate is asked again through.
 */
function gateFor(questionId: string, eligible: ReadonlySet<string>, answers: AnswerMap): string | undefined {
  const gates = gateQuestions(questionsById.get(questionId)?.condition).filter((gate) => eligible.has(gate));
  return gates.find((gate) => answers[gate] === undefined) ?? gates[0];
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
  const questionSteps = new Map<string, { opens: string[]; opensLab: boolean; unlocks: PathologyInstrumentId[] }>();
  const markers: string[] = [];
  const labUnlocks: PathologyInstrumentId[] = [];
  let conditionalLab = false;

  function addQuestion(inputId: string, instrument: PathologyInstrumentId): void {
    if (!questionsById.has(inputId)) return;
    let questionId = inputId;
    let opens: string | undefined;
    if (!eligible.has(inputId)) {
      const gate = gateFor(inputId, eligible, answers);
      if (!gate) return;
      questionId = gate;
      opens = inputId;
    }
    const step = questionSteps.get(questionId) ?? { opens: [], opensLab: false, unlocks: [] };
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
      if (inputId.startsWith("lab:")) {
        conditionalLab = true;
        continue;
      }
      if (!eligible.has(inputId)) addQuestion(inputId, score.instrument);
    }
  }
  // A lab value the diagnosis may still require joins an import already planned; the plan has
  // at most one import, so only a plan without one reserves it behind the diagnosis.
  const diagnosis = questionSteps.get("diagnosed_conditions_core");
  if (conditionalLab && markers.length === 0 && diagnosis) diagnosis.opensLab = true;

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
      ...(step.opensLab ? { opensLab: true } : {}),
      unlocks: step.unlocks,
    })),
    ...(markers.length > 0 ? [{ kind: "labs" as const, markers, unlocks: labUnlocks }] : []),
  ];
}

/** Upper bound on the questions a plan asks, counting what each gate can open. */
export function followUpQuestionCount(steps: ReadonlyArray<FollowUpStep>): number {
  return steps.reduce(
    (count, step) => count + 1 + (step.kind === "question" ? (step.opens?.length ?? 0) + (step.opensLab ? 1 : 0) : 0),
    0,
  );
}
