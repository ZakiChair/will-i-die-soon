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

test("uses the Express skip label in French while preserving the null answer", async () => {
  const user = userEvent.setup();
  const onAnswer = vi.fn();
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <QuestionControl
        question={requiredQuestion("reported_vo2_max_ml_kg_min")}
        onAnswer={onAnswer}
        onBack={vi.fn()}
        canGoBack={false}
        skipLabelKey="question.skip.express"
      />
    </I18nProvider>,
  );

  await chooseFrench(user);
  await user.click(
    screen.getByRole("button", {
      name: "Je ne sais pas ou je préfère ne pas répondre",
    }),
  );

  expect(onAnswer).toHaveBeenCalledWith(null);
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

test("trims user-entered text on a synthetic free-text question", async () => {
  const user = userEvent.setup();
  const onAnswer = vi.fn();
  const syntheticText: Question = {
    ...requiredQuestion("urgent_chest_discomfort_now"),
    id: "synthetic_free_text",
    prompt: "Describe anything else you want to share?",
    answerType: "text",
    options: undefined,
  };
  render(
    <I18nProvider>
      <h1 id="question-title">{syntheticText.prompt}</h1>
      <QuestionControl
        question={syntheticText}
        onAnswer={onAnswer}
        onBack={vi.fn()}
        canGoBack
      />
    </I18nProvider>,
  );

  const input = screen.getByRole("textbox", {
    name: /describe anything else you want to share/i,
  });
  await user.type(input, "  non-binary  ");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  expect(onAnswer).toHaveBeenCalledWith("non-binary");
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

test.each([
  ["usual_sleep_hours", "100"],
  ["chair_stand_30s_count", "61"],
  ["movement_strength_days", "-1"],
  ["diet_legumes", "-1"],
  ["height_cm", "0"],
  ["weight_kg", "-20"],
  ["neck_circumference_cm", "0"],
  ["weekly_moderate_activity_minutes", "-1"],
  ["waist_circumference_cm", "-1"],
])("keeps an impossible %s answer on screen with a described error", async (id, value) => {
  const user = userEvent.setup();
  const onAnswer = renderControl(id);
  const input = screen.getByRole("spinbutton");
  await user.type(input, value);
  await user.click(screen.getByRole("button", { name: "Continue" }));

  expect(onAnswer).not.toHaveBeenCalled();
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toBeVisible();
  expect(input.getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
  expect(input).toHaveFocus();
});

test("validates Enter, translates the error and resumes after correction", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("usual_sleep_hours");
  const input = screen.getByRole("spinbutton");
  await user.type(input, "100{Enter}");
  expect(onAnswer).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/0.*24/);

  await chooseFrench(user);
  expect(screen.getByRole("alert")).toHaveTextContent(/entre 0 et 24/);
  await user.clear(input);
  await user.type(input, "7.5{Enter}");

  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(7.5);
  expect(input).not.toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test.each([
  ["usual_sleep_hours", "0", 0],
  ["usual_sleep_hours", "24", 24],
  ["movement_strength_days", "7", 7],
  ["height_cm", "260", 260],
  ["weight_kg", "400", 400],
])("preserves valid or unusual %s values without medical cutoffs: %s", async (id, value, expected) => {
  const user = userEvent.setup();
  const onAnswer = renderControl(id);
  await user.type(screen.getByRole("spinbutton"), value);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(expected);
});

test("explains a missing answer and still permits an explicit skip", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("usual_sleep_hours");
  await chooseFrench(user);
  await user.click(screen.getByRole("button", { name: "Continuer" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/réponse.*passer/i);
  expect(onAnswer).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: /préfère ne pas répondre/i }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(null);
});

test("shows the chair-stand safety instruction before answering chair_stand_30s_count", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("chair_stand_30s_count");
  await chooseFrench(user);
  const guidance = screen.getByText(/Ne tentez pas le test si vous vous sentez instable/);
  expect(guidance).toBeVisible();
  expect(guidance.closest("details")).toBeNull();
  expect(screen.getByRole("spinbutton").getAttribute("aria-describedby")).toContain(guidance.id);
  await user.click(screen.getByRole("button", { name: "Je ne connais pas cette mesure" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(null);
});

test("gives question-specific scale anchors and keeps the numeric selection through translation", async () => {
  const user = userEvent.setup();
  const onAnswer = renderControl("sleep_refreshed");
  expect(screen.getByRole("radio", { name: /0.*Not at all rested/ })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: /10.*Fully rested/ }));
  await chooseFrench(user);
  expect(screen.getByRole("radio", { name: /10.*Complètement reposé/ })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Continuer" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(10);
});

test("uses a practical explanation for sleep while preserving the canonical question", async () => {
  const user = userEvent.setup();
  const canonical = structuredClone(requiredQuestion("usual_sleep_hours"));
  renderControl("usual_sleep_hours");
  await chooseFrench(user);
  await user.click(screen.getByText(/Pourquoi cette question/));
  expect(screen.getByText(/Cette durée complète votre ressenti/)).toBeVisible();
  expect(requiredQuestion("usual_sleep_hours")).toEqual(canonical);
});
