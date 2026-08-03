"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { questionBank } from "../data/questions";
import { buildAssessmentQueue, getNextQuestion } from "../lib/questionnaire";
import type {
  AnalysisDepth,
  AnswerMap,
  HealthDomain,
  ProfileContext,
  Question,
} from "../lib/types";
import { Intermission } from "./intermission";
import { LivingCanopy } from "./living-canopy";
import { QuestionControl } from "./question-control";

export type AssessmentProps = {
  depth: AnalysisDepth;
  profile: ProfileContext;
  onComplete: (answers: AnswerMap) => void;
};

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
  const queue = useMemo(
    () => buildAssessmentQueue(depth, questionBank, profile, {}),
    [depth, profile],
  );
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [intermission, setIntermission] = useState<{
    completedDomain: HealthDomain;
    completed: number;
  } | null>(null);
  const shownMilestones = useRef(new Set<number>());
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const milestones = useMemo(() => milestoneIndices(queue, depth), [depth, queue]);
  const question = queue[currentIndex] ?? getNextQuestion({ queue, answers });

  useEffect(() => {
    if (!intermission) questionHeading.current?.focus();
  }, [currentIndex, intermission]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  function recordAnswer(value: NonNullable<AnswerMap[string]> | null) {
    if (!question) return;
    const nextAnswers: AnswerMap = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    const nextQuestion = getNextQuestion({ queue, answers: nextAnswers });
    if (!nextQuestion) {
      onComplete(nextAnswers);
      return;
    }
    const completed = currentIndex + 1;
    setCurrentIndex(queue.indexOf(nextQuestion));
    if (milestones.has(completed) && !shownMilestones.current.has(completed)) {
      shownMilestones.current.add(completed);
      setIntermission({ completedDomain: question.domain, completed });
    }
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
