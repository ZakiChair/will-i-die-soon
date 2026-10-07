"use client";

import { useRef, useState } from "react";
import { useI18n } from "../i18n/context";
import { getQuestionGuidance, questionValidationMessage } from "../i18n/question-guidance";
import { questionUnitKeys, type UiCopyKey } from "../i18n/ui-copy";
import { validateQuestionAnswer } from "../lib/question-validation";
import type { AnswerValue, Question } from "../lib/types";
import { QUESTION_PROMPT_TITLE_ID } from "./question-prompt";

export type QuestionControlProps = {
  question: Question;
  answer?: AnswerValue;
  onAnswer: (answer: AnswerValue) => void;
  onBack: () => void;
  canGoBack: boolean;
  questionDescriptionId?: string;
  skipLabelKey?: UiCopyKey;
  subjectAgeYears?: number;
  countryCode?: string;
};

function initialValue(question: Question, answer: AnswerValue | undefined) {
  if (question.answerType === "multi") {
    return Array.isArray(answer) ? [...answer] : [];
  }
  if (answer === null || answer === undefined) {
    return "";
  }
  return String(answer);
}

function numericUnitKey(questionId: string): UiCopyKey | null {
  return questionUnitKeys[questionId as keyof typeof questionUnitKeys] ?? null;
}

export function QuestionControl({
  question,
  answer,
  onAnswer,
  onBack,
  canGoBack,
  questionDescriptionId,
  skipLabelKey,
  subjectAgeYears,
  countryCode,
}: QuestionControlProps) {
  const { locale, t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [attempted, setAttempted] = useState(false);
  const [draft, setDraft] = useState<string | string[]>(() =>
    initialValue(question, answer),
  );

  function committedValue(): AnswerValue | null {
    if (question.answerType === "multi") {
      return Array.isArray(draft) && draft.length > 0 ? draft : null;
    }
    if (Array.isArray(draft) || draft === "") return null;
    if (question.answerType === "boolean") {
      if (draft === "true") return true;
      if (draft === "false") return false;
      return draft;
    }
    if (question.answerType === "number" || question.answerType === "scale") {
      const number = Number(draft);
      return Number.isFinite(number) ? number : null;
    }
    return draft.trim() === "" ? null : draft.trim();
  }

  function commitAnswer() {
    const value = committedValue();
    setAttempted(true);
    if (validateQuestionAnswer(question, value, subjectAgeYears)) {
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    if (value !== null) onAnswer(value);
  }

  function toggleMulti(value: string, checked: boolean) {
    const current = Array.isArray(draft) ? draft : [];
    if (!checked) {
      setDraft(current.filter((item) => item !== value));
      return;
    }
    if (value === "none") {
      setDraft(["none"]);
      return;
    }
    setDraft([...current.filter((item) => item !== "none" && item !== value), value]);
  }

  const unitKey = numericUnitKey(question.id);
  const guidance = getQuestionGuidance(question.id, locale, countryCode);
  const error = attempted ? validateQuestionAnswer(question, committedValue(), subjectAgeYears) : null;
  const errorId = `${question.id}-error`;
  const guidanceId = `${question.id}-guidance`;
  const scaleId = `${question.id}-scale-anchors`;
  const descriptionId = [
    questionDescriptionId,
    guidance.notice ? guidanceId : undefined,
    error ? errorId : undefined,
  ].filter(Boolean).join(" ") || undefined;
  const inputDescriptionId = [descriptionId, unitKey ? `${question.id}-unit` : undefined]
    .filter(Boolean).join(" ") || undefined;

  return (
    <form
      ref={formRef}
      className="question-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        commitAnswer();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          commitAnswer();
        }
      }}
    >
      <fieldset
        aria-labelledby={QUESTION_PROMPT_TITLE_ID}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
      >
        <legend className="sr-only">{t("question.legend")}</legend>
        {guidance.notice ? (
          <p id={guidanceId} className="question-guidance">{guidance.notice}</p>
        ) : null}

        {question.answerType === "boolean" ? (
          <div className="answer-grid">
            {[
              { value: "true", label: t("question.yes") },
              { value: "false", label: t("question.no") },
              { value: "unsure", label: t("question.unsure") },
            ].map((option) => (
              <label className="answer-option" key={option.value}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={draft === option.value}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {question.answerType === "single" ? (
          <div className="answer-grid">
            {question.options?.map((option) => (
              <label className="answer-option" key={option.value}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={draft === option.value}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {question.answerType === "multi" ? (
          <div className="answer-grid">
            {question.options?.map((option) => (
              <label className="answer-option" key={option.value}>
                <input
                  type="checkbox"
                  name={question.id}
                  value={option.value}
                  checked={Array.isArray(draft) && draft.includes(option.value)}
                  onChange={(event) => toggleMulti(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {question.answerType === "number" ? (
          <div className="question-number">
            <label htmlFor={`${question.id}-value`} className="sr-only">
              {question.prompt}
            </label>
            <input
              id={`${question.id}-value`}
              type="number"
              inputMode="decimal"
              step="any"
              aria-describedby={inputDescriptionId}
              aria-invalid={error ? true : undefined}
              value={Array.isArray(draft) ? "" : draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            {unitKey ? (
              <span id={`${question.id}-unit`} className="question-number__unit">
                {t(unitKey)}
              </span>
            ) : null}
          </div>
        ) : null}

        {question.answerType === "scale" ? (
          <>
            {guidance.scale ? (
              <p className="scale-anchors" id={scaleId}>
                <span>0 · {guidance.scale[0]}</span>
                <span>10 · {guidance.scale[1]}</span>
              </p>
            ) : null}
            <div
              className="scale-grid"
              role="group"
              aria-label={t("question.scale")}
              aria-describedby={[guidance.scale ? scaleId : undefined, descriptionId].filter(Boolean).join(" ") || undefined}
            >
              {Array.from({ length: 11 }, (_, value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={question.id}
                    value={value}
                    aria-label={guidance.scale && (value === 0 || value === 10)
                      ? `${value} · ${guidance.scale[value === 0 ? 0 : 1]}`
                      : undefined}
                    checked={draft === String(value)}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {question.answerType === "text" ? (
          <div className="question-text">
            <label htmlFor={`${question.id}-value`} className="sr-only">
              {question.prompt}
            </label>
            <input
              id={`${question.id}-value`}
              type="text"
              aria-describedby={descriptionId}
              aria-invalid={error ? true : undefined}
              value={Array.isArray(draft) ? "" : draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p id={errorId} className="question-error" role="alert">
          {questionValidationMessage(error, locale)}
        </p>
      ) : null}

      <details className="why-we-ask">
        <summary>{t("question.why")}</summary>
        <p>{guidance.why ?? question.why}</p>
      </details>

      <div className="question-actions">
        <button type="button" onClick={onBack} disabled={!canGoBack}>
          {t("question.back")}
        </button>
        <button
          type="button"
          aria-pressed={answer === null}
          onClick={() => onAnswer(null)}
        >
          {skipLabelKey ? t(skipLabelKey) : guidance.unknownMeasurement ?? t("question.skip")}
        </button>
        <button type="submit">{t("question.continue")}</button>
      </div>
    </form>
  );
}
