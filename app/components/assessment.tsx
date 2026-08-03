"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { questionBank } from "../data/questions";
import {
  buildAssessmentQueue,
  getNextQuestion,
  reconcileAssessmentState,
} from "../lib/questionnaire";
import { prototypePolicy } from "../lib/release-policy";
import { evaluateRisks } from "../lib/risk-engine";
import type {
  AnalysisDepth,
  AnswerMap,
  HealthDomain,
  ProfileContext,
  Question,
  QuestionnaireState,
  RiskLeaf,
} from "../lib/types";
import { Intermission } from "./intermission";
import { LabImport } from "./lab-import";
import { LivingCanopy } from "./living-canopy";
import { QuestionControl } from "./question-control";
import type { ConfirmedLabValue, LabMarker } from "../lib/labs";

export type AssessmentProps = {
  depth: AnalysisDepth;
  profile: ProfileContext;
  onComplete: (answers: AnswerMap, confirmedLabs: ConfirmedLabValue[]) => void;
};

const LAB_ANSWER_IDS: Readonly<Record<LabMarker, string>> = {
  glucose: "lab_value_glucose",
  total_cholesterol: "lab_value_total_cholesterol",
  hdl_cholesterol: "lab_value_hdl_cholesterol",
  ldl_cholesterol: "lab_value_ldl_cholesterol",
  triglycerides: "lab_value_triglycerides",
  hba1c: "lab_value_hba1c",
  creatinine_serum: "lab_value_creatinine",
  hemoglobin_blood: "lab_value_hemoglobin",
  ferritin: "lab_value_ferritin",
  vitamin_d_25oh: "lab_value_vitamin_d",
  alt: "lab_value_alt",
  ast: "lab_value_ast",
  egfr: "lab_value_egfr",
  tsh: "lab_value_tsh",
};

function printedLabAnswer(value: ConfirmedLabValue): string {
  const range = /^[[(]/.test(value.reviewed.referenceRange)
    ? ` ${value.reviewed.referenceRange}`
    : ` (${value.reviewed.referenceRange})`;
  return `${value.reviewed.valueText} ${value.reviewed.unit}${range}`;
}

const INTERMISSION_LIMITS: Readonly<Record<AnalysisDepth, number>> = {
  quick: 2,
  detailed: 4,
  deep: 6,
};

function milestoneIndices(queue: ReadonlyArray<Question>, depth: AnalysisDepth) {
  const candidates = queue
    .slice(0, -1)
    .map((question, index) =>
      question.domain !== queue[index + 1].domain ? index + 1 : null,
    )
    .filter((index): index is number => index !== null);
  const count = Math.min(INTERMISSION_LIMITS[depth], candidates.length);
  const selected = new Set<number>();

  for (let milestone = 1; milestone <= count; milestone += 1) {
    const target = (queue.length * milestone) / (count + 1);
    const closest = candidates
      .filter((candidate) => !selected.has(candidate))
      .sort((left, right) => Math.abs(left - target) - Math.abs(right - target))[0];
    if (closest !== undefined) selected.add(closest);
  }

  return selected;
}

export function Assessment({ depth, profile, onComplete }: AssessmentProps) {
  const initialQueue = useMemo(
    () => buildAssessmentQueue(depth, questionBank, profile, {}),
    [depth, profile],
  );
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireState>(() => ({
    queue: initialQueue,
    answers: {},
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [awaitingLabImport, setAwaitingLabImport] = useState(false);
  const [confirmedLabs, setConfirmedLabs] = useState<ConfirmedLabValue[]>([]);
  const [urgentLeaf, setUrgentLeaf] = useState<RiskLeaf | null>(null);
  const [intermission, setIntermission] = useState<{
    completedDomain: HealthDomain;
    completed: number;
  } | null>(null);
  const shownMilestones = useRef(new Set<string>());
  const importedAnswerIds = useRef(new Set<string>());
  const intermissionCount = useRef(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const urgentHeading = useRef<HTMLHeadingElement>(null);
  const { answers, queue } = questionnaire;
  const question = queue[currentIndex] ?? getNextQuestion(questionnaire);

  useEffect(() => {
    if (!intermission && !urgentLeaf) questionHeading.current?.focus();
  }, [currentIndex, intermission, urgentLeaf]);

  useEffect(() => {
    if (urgentLeaf) urgentHeading.current?.focus();
  }, [urgentLeaf]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  function advanceAfterAnswer(
    answeredQuestion: Question,
    nextState: QuestionnaireState,
    labsForHandoff = confirmedLabs,
  ) {
    const nextQuestion = getNextQuestion(nextState);
    if (!nextQuestion) {
      onComplete(nextState.answers, labsForHandoff);
      return;
    }
    const completed = nextState.queue.findIndex(
      (candidate) => candidate.id === answeredQuestion.id,
    ) + 1;
    const milestoneKey = answeredQuestion.id;
    setCurrentIndex(nextState.queue.indexOf(nextQuestion));
    if (
      milestoneIndices(nextState.queue, depth).has(completed) &&
      intermissionCount.current < INTERMISSION_LIMITS[depth] &&
      !shownMilestones.current.has(milestoneKey)
    ) {
      shownMilestones.current.add(milestoneKey);
      intermissionCount.current += 1;
      setIntermission({ completedDomain: answeredQuestion.domain, completed });
    }
  }

  function recordAnswer(value: NonNullable<AnswerMap[string]> | null) {
    if (!question) return;
    importedAnswerIds.current.delete(question.id);
    const nextState = reconcileAssessmentState(depth, questionBank, profile, {
      ...answers,
      [question.id]: value,
    });
    setQuestionnaire(nextState);
    const immediateSignal = evaluateRisks(
      nextState.answers,
      profile,
      prototypePolicy,
    ).find((leaf) => leaf.urgency === "urgent");
    if (immediateSignal) {
      setAwaitingLabImport(false);
      setIntermission(null);
      setUrgentLeaf(immediateSignal);
      return;
    }
    if (question.id === "has_recent_labs") {
      if (value === true) {
        setAwaitingLabImport(true);
        return;
      }
      setConfirmedLabs([]);
      importedAnswerIds.current.clear();
    }
    advanceAfterAnswer(question, nextState);
  }

  function finishLabImport(values: ConfirmedLabValue[]) {
    if (!question || question.id !== "has_recent_labs") return;
    const answersWithoutPriorImport = Object.fromEntries(
      Object.entries(questionnaire.answers).filter(
        ([id]) => !importedAnswerIds.current.has(id),
      ),
    );
    const baseState = reconcileAssessmentState(
      depth,
      questionBank,
      profile,
      answersWithoutPriorImport,
    );
    const budgetedQuestionIds = new Set(baseState.queue.map((item) => item.id));
    const importedEntries = values
      .map(
        (value) => [LAB_ANSWER_IDS[value.reviewed.marker], printedLabAnswer(value)] as const,
      )
      .filter(([id]) => budgetedQuestionIds.has(id));
    const importedAnswers = Object.fromEntries(importedEntries);
    const nextState = reconcileAssessmentState(depth, questionBank, profile, {
      ...baseState.answers,
      ...importedAnswers,
    });
    importedAnswerIds.current = new Set(importedEntries.map(([id]) => id));
    setConfirmedLabs(values);
    setQuestionnaire(nextState);
    setAwaitingLabImport(false);
    advanceAfterAnswer(question, nextState, values);
  }

  function cancelLabImport() {
    if (!question || question.id !== "has_recent_labs") return;
    setAwaitingLabImport(false);
    advanceAfterAnswer(question, questionnaire);
  }

  if (urgentLeaf) {
    return (
      <section
        className="journey assessment assessment--urgent"
        aria-labelledby="urgent-action-title"
      >
        <header className="journey__header">
          <div className="wordmark">
            Will I Die <strong>Soon?</strong>
          </div>
          <p className="prototype-label data-label">Immediate safety / {depth}</p>
        </header>
        <article className="question-sheet safety-screen" role="alert">
          <p className="question-sheet__domain data-label">Immediate safety signal</p>
          <h1 id="urgent-action-title" ref={urgentHeading} tabIndex={-1}>
            Immediate action
          </h1>
          <p className="safety-screen__action">{urgentLeaf.copy}</p>
          <p>
            This prototype cannot contact emergency services, crisis support, or anyone
            nearby for you.
          </p>
          <button type="button" onClick={() => setUrgentLeaf(null)}>
            Change my answer
          </button>
        </article>
      </section>
    );
  }

  if (awaitingLabImport) {
    return (
      <section className="journey assessment assessment--lab-import">
        <LabImport onConfirm={finishLabImport} onCancel={cancelLabImport} />
      </section>
    );
  }

  if (intermission) {
    return (
      <section className="journey assessment assessment--intermission">
        <Intermission
          completedDomain={intermission.completedDomain}
          completed={intermission.completed}
          total={queue.length}
          onContinue={() => setIntermission(null)}
        />
      </section>
    );
  }

  return (
    <section className="journey assessment" aria-labelledby="question-title">
      <header className="journey__header">
        <div className="wordmark">
          Will I Die <strong>Soon?</strong>
        </div>
        <p className="prototype-label data-label">In-memory assessment / {depth}</p>
      </header>
      <div className="assessment__layout">
        <aside className="assessment__rail" aria-label="Assessment progress">
          <p className="data-label">Your living map</p>
          <progress value={currentIndex} max={queue.length}>
            {currentIndex} of {queue.length}
          </progress>
          <LivingCanopy
            progress={currentIndex / queue.length}
            tone="calm"
            reducedMotion={reducedMotion}
          />
        </aside>
        <article className="question-sheet">
          <p className="assessment__progress" aria-live="polite">
            Question {currentIndex + 1} of {queue.length}
          </p>
          <p className="question-sheet__domain data-label">
            {question?.domain.replaceAll("-", " ")}
          </p>
          <h1 id="question-title" ref={questionHeading} tabIndex={-1}>
            {question?.prompt}
          </h1>
          {question ? (
            <QuestionControl
              key={question.id}
              question={question}
              answer={answers[question.id]}
              onAnswer={recordAnswer}
              canGoBack={currentIndex > 0}
              onBack={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            />
          ) : null}
        </article>
      </div>
    </section>
  );
}
