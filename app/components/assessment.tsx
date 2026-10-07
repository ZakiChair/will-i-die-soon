"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import { localizeRiskLeaves } from "../i18n/presentation";
import { getQuestionPromptPresentation } from "../i18n/question-prompt-presentation";
import { localizeQuestion } from "../i18n/questions-fr";
import { uiCopyKeys } from "../i18n/ui-copy";
import { healthPillarForQuestion, type HealthPillar } from "../lib/health-pillars";
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
  ProfileContext,
  Question,
  QuestionnaireState,
  RiskLeaf,
} from "../lib/types";
import { Intermission } from "./intermission";
import { LabImport } from "./lab-import";
import { MotionScreen } from "./motion-screen";
import { QuestionControl } from "./question-control";
import {
  QUESTION_PROMPT_DETAIL_ID,
  QuestionPrompt,
} from "./question-prompt";
import { PillarProgress } from "./pillar-progress";
import type { ConfirmedLabValue } from "../lib/labs";

export type AssessmentProps = {
  depth: AnalysisDepth;
  profile: ProfileContext;
  onComplete: (answers: AnswerMap, confirmedLabs: ConfirmedLabValue[]) => void;
};

type PillarIntro = { readonly pillar: HealthPillar; readonly completed: number };

export function Assessment({ depth, profile, onComplete }: AssessmentProps) {
  const { locale, t } = useI18n();
  const isExpress = depth === "express";
  const initialQueue = useMemo(
    () => buildAssessmentQueue(depth, questionBank, profile, {}),
    [depth, profile],
  );
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireState>(() => ({
    queue: initialQueue,
    answers: {},
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [awaitingLabImport, setAwaitingLabImport] = useState(false);
  const [confirmedLabs, setConfirmedLabs] = useState<ConfirmedLabValue[]>([]);
  const [urgentLeaf, setUrgentLeaf] = useState<RiskLeaf | null>(null);
  const firstPillar = initialQueue[0] ? healthPillarForQuestion(initialQueue[0]) : null;
  const [intermission, setIntermission] = useState<PillarIntro | null>(() =>
    !isExpress && firstPillar ? { pillar: firstPillar, completed: 0 } : null,
  );
  const introducedPillars = useRef(
    new Set<HealthPillar>(firstPillar ? [firstPillar] : []),
  );
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const urgentHeading = useRef<HTMLHeadingElement>(null);
  const { answers, queue } = questionnaire;
  const answeredQuestionCount = queue.filter((candidate) =>
    Object.prototype.hasOwnProperty.call(answers, candidate.id),
  ).length;
  const question = queue[currentIndex] ?? getNextQuestion(questionnaire);
  const presentedQuestion = question ? localizeQuestion(question, locale) : null;
  const promptPresentation = presentedQuestion
    ? getQuestionPromptPresentation(
        presentedQuestion.id,
        locale,
        presentedQuestion.prompt,
      )
    : null;
  const presentedUrgentLeaf = useMemo(
    () =>
      urgentLeaf ? localizeRiskLeaves([urgentLeaf], locale, profile)[0] ?? null : null,
    [locale, profile, urgentLeaf],
  );

  useEffect(() => {
    if (!intermission && !urgentLeaf) questionHeading.current?.focus();
  }, [currentIndex, intermission, urgentLeaf]);

  useEffect(() => {
    if (urgentLeaf) urgentHeading.current?.focus();
  }, [urgentLeaf]);

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
    setCurrentIndex(nextState.queue.indexOf(nextQuestion));
    const nextPillar = healthPillarForQuestion(nextQuestion);
    const answeredPillar = healthPillarForQuestion(answeredQuestion);
    if (
      !isExpress &&
      nextPillar !== answeredPillar &&
      !introducedPillars.current.has(nextPillar)
    ) {
      introducedPillars.current.add(nextPillar);
      setIntermission({ pillar: nextPillar, completed });
    }
  }

  function recordAnswer(value: NonNullable<AnswerMap[string]> | null) {
    if (!question) return;
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
    }
    advanceAfterAnswer(question, nextState);
  }

  function finishLabImport(values: ConfirmedLabValue[]) {
    if (!question || question.id !== "has_recent_labs") return;
    setConfirmedLabs(values);
    setAwaitingLabImport(false);
    advanceAfterAnswer(question, questionnaire, values);
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
          <p className="prototype-label data-label">
            {t("urgent.header", { depth: t(uiCopyKeys.depth[depth]) })}
          </p>
        </header>
        <article className="question-sheet safety-screen" role="alert">
          <p className="question-sheet__domain data-label">{t("urgent.eyebrow")}</p>
          <h1 id="urgent-action-title" ref={urgentHeading} tabIndex={-1}>
            {t("urgent.title")}
          </h1>
          <p className="safety-screen__action">{presentedUrgentLeaf?.copy}</p>
          <p>{t("urgent.localBoundary")}</p>
          <button type="button" onClick={() => setUrgentLeaf(null)}>
            {t("urgent.change")}
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
          pillar={intermission.pillar}
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
        <p className="prototype-label data-label">
          {t("assessment.header", { depth: t(uiCopyKeys.depth[depth]) })}
        </p>
      </header>
      <div className="assessment__layout">
        <aside className="assessment__rail" aria-label={t("assessment.progress.aria")}>
          <p className="data-label">{t("assessment.map")}</p>
          {question ? (
            <PillarProgress
              currentPillar={healthPillarForQuestion(question)}
            />
          ) : null}
          <progress
            aria-label={t("assessment.progress.aria")}
            value={answeredQuestionCount}
            max={queue.length}
          >
            {t("assessment.progress", {
              completed: answeredQuestionCount,
              total: queue.length,
            })}
          </progress>
        </aside>
        {question ? (
          <MotionScreen key={question.id} screenKey={`question-${question.id}`}>
            <article className="question-sheet">
              <p className="assessment__progress" aria-live="polite">
                {t("assessment.question", { current: currentIndex + 1, total: queue.length })}
              </p>
              <p className="question-sheet__domain data-label">
                {t(uiCopyKeys.domain[question.domain])}
              </p>
              {promptPresentation ? (
                <QuestionPrompt
                  presentation={promptPresentation}
                  headingRef={questionHeading}
                />
              ) : null}
              <QuestionControl
                key={question.id}
                question={presentedQuestion ?? question}
                questionDescriptionId={
                  promptPresentation?.detail?.trim()
                    ? QUESTION_PROMPT_DETAIL_ID
                    : undefined
                }
                answer={answers[question.id]}
                subjectAgeYears={profile.age}
                countryCode={profile.countryCode}
                onAnswer={recordAnswer}
                canGoBack={currentIndex > 0}
                onBack={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                skipLabelKey={isExpress ? "question.skip.express" : undefined}
              />
            </article>
          </MotionScreen>
        ) : null}
      </div>
    </section>
  );
}
