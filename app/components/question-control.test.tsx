import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { questionBank } from "../data/questions";
import { I18nProvider, useI18n } from "../i18n/context";
import { localizeQuestion } from "../i18n/questions-fr";
import type { AnswerValue, Question } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { QuestionControl } from "./question-control";

function requiredQuestion(id: string): Question {
  const question = questionBank.find((candidate) => candidate.id === id);
  if (!question) throw new Error(`Missing question fixture: ${id}`);
  return question;
}

function LocalizedControl({
  question,
  onAnswer,
}: {
  readonly question: Question;
  readonly onAnswer: (answer: AnswerValue) => void;
}) {
  const { locale } = useI18n();

  return (
    <>
      <h1 id="question-title">{localizeQuestion(question, locale).prompt}</h1>
      <QuestionControl
        question={localizeQuestion(question, locale)}
        onAnswer={onAnswer}
        onBack={vi.fn()}
        canGoBack
      />
    </>
  );
}

function renderControl(questionId: string, onAnswer = vi.fn()) {
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <LocalizedControl
        question={requiredQuestion(questionId)}
        onAnswer={onAnswer}
      />
    </I18nProvider>,
  );
  return onAnswer;
}

async function chooseFrench(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Français" }));
}

test("submits the canonical boolean value through French controls", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("urgent_chest_discomfort_now");
  await chooseFrench(user);

  expect(screen.getByRole("group", { name: /souffrez-vous actuellement/i })).toBeVisible();
  await user.click(screen.getByRole("radio", { name: "Oui" }));
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith(true);
  expect(screen.getByText(/Pourquoi cette question/)).toBeVisible();
});

test("keeps a live single-choice draft checked across EN to FR and submits its value", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("sex_assigned_at_birth");

  const canonicalOption = screen.getByRole("radio", { name: "Female" });
  expect((canonicalOption as HTMLInputElement).value).toBe("female");
  await user.click(canonicalOption);
  await chooseFrench(user);

  const localizedOption = screen.getByRole("radio", { name: "Féminin" });
  expect(localizedOption).toBeChecked();
  expect((localizedOption as HTMLInputElement).value).toBe("female");
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith("female");
});

test("submits canonical multi-select values through translated option labels", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("diagnosed_conditions_core");
  await chooseFrench(user);

  const option = screen.getByRole("checkbox", {
    name: "Affection cardiaque ou vasculaire",
  });
  expect((option as HTMLInputElement).value).toBe("heart_vascular");
  await user.click(option);
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith(["heart_vascular"]);
});

test("localizes a number unit while retaining its canonical numeric answer", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("plant_food_frequency");
  await chooseFrench(user);

  const input = screen.getByRole("spinbutton", {
    name: /combien de portions de légumes et de fruits/i,
  });
  expect(input).toHaveAccessibleDescription("portions / jour");
  await user.type(input, "3.5");
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith(3.5);
});

test("localizes scale accessibility copy without changing the selected number", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("sleep_refreshed");
  await chooseFrench(user);

  const scale = screen.getByRole("group", { name: "Échelle de 0 à 10" });
  await user.click(withinScale(scale, "8"));
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith(8);
});

test("localizes text presentation while preserving user-entered text", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("gender_identity_optional");
  await chooseFrench(user);

  const input = screen.getByRole("textbox", {
    name: /comment décrivez-vous votre identité de genre/i,
  });
  await user.type(input, "  non-binaire  ");
  await user.click(screen.getByRole("button", { name: "Continuer" }));

  expect(onAnswer).toHaveBeenCalledWith("non-binaire");
});

function withinScale(group: HTMLElement, value: string): HTMLElement {
  const input = group.querySelector<HTMLInputElement>(`input[value="${value}"]`);
  if (!input) throw new Error(`Missing scale value ${value}`);
  return input;
}

test("describes the answer group with visible question criteria", () => {
  render(
    <I18nProvider>
      <h1 id="question-title">Short title</h1>
      <p id="question-detail">Complete criteria.</p>
      <QuestionControl
        question={requiredQuestion("urgent_breathing_now")}
        questionDescriptionId="question-detail"
        onAnswer={vi.fn()}
        onBack={vi.fn()}
        canGoBack={false}
      />
    </I18nProvider>,
  );

  const group = screen.getByRole("group", { name: "Short title" });
  expect(group).toHaveAccessibleDescription("Complete criteria.");
  expect(group).toHaveAttribute("aria-describedby", "question-detail");
});

test("omits aria-describedby when a question has no presentation detail", () => {
  render(
    <I18nProvider>
      <h1 id="question-title">Ordinary question</h1>
      <QuestionControl
        question={requiredQuestion("usual_sleep_hours")}
        onAnswer={vi.fn()}
        onBack={vi.fn()}
        canGoBack={false}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("group", { name: "Ordinary question" })).not.toHaveAttribute(
    "aria-describedby",
  );
});
