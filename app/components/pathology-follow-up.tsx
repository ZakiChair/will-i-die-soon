"use client";

import { useEffect, useRef, useState } from "react";

import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import { pathologyCopy } from "../i18n/pathology-copy";
import { getQuestionPromptPresentation } from "../i18n/question-prompt-presentation";
import { localizeQuestion } from "../i18n/questions-fr";
import type { ConfirmedLabValue } from "../lib/labs";
import {
  buildFollowUpPlan,
  followUpQuestionCount,
  type FollowUpScope,
  type FollowUpStep,
} from "../lib/pathology-follow-up";
import { getEligibleQuestions } from "../lib/questionnaire";
import type { AnswerMap, AnswerValue, PathologySynthesis, ProfileContext } from "../lib/types";
import { LabImport } from "./lab-import";
import { QuestionControl } from "./question-control";
import { QUESTION_PROMPT_DETAIL_ID, QuestionPrompt } from "./question-prompt";

export type PathologyFollowUpProps = Readonly<{
  scope: FollowUpScope;
  synthesis: PathologySynthesis;
  answers: AnswerMap;
  profile: ProfileContext;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onLabs: (values: ConfirmedLabValue[]) => void;
  onClose: () => void;
}>;

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/**
 * Asks only what the incomplete scores in scope still need. A question answered
 * or skipped here is not offered again during this run; "back" revisits it.
 */
export function PathologyFollowUp({
  scope,
  synthesis,
  answers,
  profile,
  onAnswer,
  onLabs,
  onClose,
}: PathologyFollowUpProps) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const [history, setHistory] = useState<ReadonlyArray<string>>([]);
  const [revisit, setRevisit] = useState<number | null>(null);
  const [labsHandled, setLabsHandled] = useState(false);
  const [added, setAdded] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  // An answer pruned by a later change (a gate switched back to "no") leaves the history.
  const handled = history.filter((id) => Object.hasOwn(answers, id));
  const handledIds = new Set(handled);
  const plan = buildFollowUpPlan(synthesis, answers, profile, scope).filter((candidate) =>
    candidate.kind === "labs" ? !labsHandled : !handledIds.has(candidate.questionId),
  );
  const revisitIndex = revisit !== null && revisit < handled.length ? revisit : null;
  const step: FollowUpStep | undefined =
    revisitIndex !== null ? { kind: "question", questionId: handled[revisitIndex], unlocks: [] } : plan[0];
  const stepKey = step === undefined ? "done" : step.kind === "labs" ? "labs" : step.questionId;
  const position = revisitIndex ?? handled.length;
  // Same count as the invitation and the card buttons, where the lab import is one step.
  const remaining = followUpQuestionCount(plan) + (revisitIndex !== null ? 1 : 0);

  useEffect(() => {
    // The lab import focuses its own heading when it mounts.
    if (stepKey === "labs") return;
    (stepKey === "done" ? doneHeading : questionHeading).current?.focus();
  }, [stepKey]);

  function record(questionId: string, value: AnswerValue) {
    onAnswer(questionId, value);
    if (value !== null) setAdded(true);
    setHistory((current) => (current.includes(questionId) ? current : [...current, questionId]));
    setRevisit(null);
  }

  if (step === undefined) {
    return (
      <section
        className="pathology-follow-up pathology-follow-up--done"
        aria-labelledby="pathology-follow-up-done-title"
      >
        <h3 id="pathology-follow-up-done-title" ref={doneHeading} tabIndex={-1}>
          {added ? copy.followUp.doneTitle : copy.followUp.unchangedTitle}
        </h3>
        <p>{added ? copy.followUp.doneBody : copy.followUp.unchangedBody}</p>
        <div className="pathology-follow-up__actions">
          {added && scope !== "all" ? (
            <a href={`#pathology-score-${scope}`}>{copy.followUp.seeEstimate}</a>
          ) : null}
          <button type="button" onClick={onClose}>
            {copy.followUp.close}
          </button>
        </div>
      </section>
    );
  }

  const question =
    step.kind === "question"
      ? (getEligibleQuestions(questionBank, profile, answers).find((candidate) => candidate.id === step.questionId) ??
        questionsById.get(step.questionId))
      : undefined;
  const presentedQuestion = question ? localizeQuestion(question, locale) : undefined;
  const presentation = presentedQuestion
    ? getQuestionPromptPresentation(presentedQuestion.id, locale, presentedQuestion.prompt)
    : undefined;
  const unlocks =
    step.unlocks.length > 0
      ? new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
          step.unlocks.map((instrument) => copy.instruments[instrument].pathology),
        )
      : undefined;

  return (
    <section className="pathology-follow-up" aria-label={copy.followUp.title}>
      <div className="pathology-follow-up__bar">
        <p className="data-label">{copy.followUp.title}</p>
        {remaining > 0 && step.kind !== "labs" ? (
          <p className="pathology-follow-up__remaining">{copy.followUp.remaining(remaining)}</p>
        ) : null}
      </div>
      {step.kind === "labs" ? (
        <div className="pathology-follow-up__labs">
          <p className="pathology-follow-up__unlocks">
            {copy.followUp.labsStep(step.unlocks.length)}
            {unlocks ? ` ${copy.followUp.unlocks(unlocks)}` : null}
          </p>
          <LabImport
            headingLevel={3}
            onConfirm={(values) => {
              onLabs(values);
              setAdded(true);
              setLabsHandled(true);
            }}
            onCancel={() => setLabsHandled(true)}
          />
        </div>
      ) : question && presentedQuestion && presentation ? (
        <div className="pathology-follow-up__question">
          <QuestionPrompt presentation={presentation} headingRef={questionHeading} headingLevel={3} />
          {unlocks ? <p className="pathology-follow-up__unlocks">{copy.followUp.unlocks(unlocks)}</p> : null}
          <QuestionControl
            key={question.id}
            question={presentedQuestion}
            questionDescriptionId={presentation.detail?.trim() ? QUESTION_PROMPT_DETAIL_ID : undefined}
            answer={answers[question.id]}
            onAnswer={(value) => record(question.id, value)}
            canGoBack={position > 0}
            onBack={() => setRevisit(position - 1)}
          />
        </div>
      ) : null}
      <button type="button" className="pathology-follow-up__stop" onClick={onClose}>
        {copy.followUp.stop}
      </button>
    </section>
  );
}
