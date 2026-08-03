"use client";

import { useState } from "react";
import type { AnswerValue, Question } from "../lib/types";

export type QuestionControlProps = {
  question: Question;
  answer?: AnswerValue;
  onAnswer: (answer: AnswerValue) => void;
  onBack: () => void;
  canGoBack: boolean;
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

const NUMERIC_UNITS: Readonly<Record<string, string>> = {
  height_cm: "cm",
  weight_kg: "kg",
  plant_food_frequency: "portions / day",
  weekly_moderate_activity_minutes: "minutes / week",
  usual_sleep_hours: "hours / day",
  waist_circumference_cm: "cm",
  sun_burns_recent: "times / year",
  dental_brushing: "times / day",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  diet_legumes: "times / week",
  diet_nuts_seeds: "days / week",
  diet_fish: "servings / week",
  diet_sugary_drinks: "drinks / week",
  hydration_daily_fluid: "litres / day",
  movement_walking_days: "days / week",
  movement_strength_days: "days / week",
  sedentary_total_hours: "hours / day",
  sedentary_screen_evening: "hours",
  sleep_fall_asleep_minutes: "minutes",
  circadian_bedtime_variation: "hours",
  circadian_wake_variation: "hours",
  tobacco_detail_frequency: "uses / day",
  alcohol_detail_typical_amount: "standard drinks",
  cannabis_detail_frequency: "days / 30 days",
};

function numericUnit(questionId: string): string | null {
  return NUMERIC_UNITS[questionId] ?? null;
}

export function QuestionControl({
  question,
  answer,
  onAnswer,
  onBack,
  canGoBack,
}: QuestionControlProps) {
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

  const unit = numericUnit(question.id);

  return (
    <form
      className="question-form"
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
      <fieldset aria-labelledby="question-title">
        <legend className="sr-only">Answer choices</legend>

        {question.answerType === "boolean" ? (
          <div className="answer-grid">
            {[
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
              { value: "unsure", label: "Not sure" },
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
              aria-describedby={unit ? `${question.id}-unit` : undefined}
              value={Array.isArray(draft) ? "" : draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            {unit ? (
              <span id={`${question.id}-unit`} className="question-number__unit">
                {unit}
              </span>
            ) : null}
          </div>
        ) : null}

        {question.answerType === "scale" ? (
          <div className="scale-grid" aria-label="Scale from 0 to 10">
            {Array.from({ length: 11 }, (_, value) => (
              <label key={value}>
                <input
                  type="radio"
                  name={question.id}
                  value={value}
                  checked={draft === String(value)}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        ) : null}

        {question.answerType === "text" ? (
          <div className="question-text">
            <label htmlFor={`${question.id}-value`} className="sr-only">
              {question.prompt}
            </label>
            <input
              id={`${question.id}-value`}
              type="text"
              value={Array.isArray(draft) ? "" : draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        ) : null}
      </fieldset>

      <details className="why-we-ask">
        <summary>Why we ask</summary>
        <p>{question.why}</p>
      </details>

      <div className="question-actions">
        <button type="button" onClick={onBack} disabled={!canGoBack}>
          Back
        </button>
        <button
          type="button"
          aria-pressed={answer === null}
          onClick={() => onAnswer(null)}
        >
          Prefer not to say
        </button>
        <button type="submit">Continue</button>
      </div>
    </form>
  );
}
