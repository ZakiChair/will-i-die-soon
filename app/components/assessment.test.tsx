import { render as testingRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { expect, test, vi } from "vitest";

import { questionBank } from "../data/questions";
import { I18nProvider } from "../i18n/context";
import * as questionnaireModule from "../lib/questionnaire";
import Home from "../page";
import { Assessment } from "./assessment";
import { LanguageSwitcher } from "./language-switcher";
import { QuestionControl } from "./question-control";

function render(ui: ReactElement) {
  return testingRender(<I18nProvider>{ui}</I18nProvider>);
}

const adultProfile = { age: 35, countryCode: "CH" };

async function chooseDepth(depth: "quick" | "detailed" | "deep") {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(
    screen.getByRole("button", { name: new RegExp(`choose ${depth}`, "i") }),
  );
  return user;
}

async function fillProfile(
  user: ReturnType<typeof userEvent.setup>,
  age: number,
) {
  await user.type(screen.getByLabelText(/how old are you/i), String(age));
  await user.selectOptions(screen.getByLabelText(/country or region/i), "CH");
  await user.click(
    screen.getByRole("checkbox", { name: /i understand and want to continue/i }),
  );
}

async function continuePastIntermission(user: ReturnType<typeof userEvent.setup>) {
  const continueButton = screen.queryByRole("button", {
    name: /continue assessment/i,
  });
  if (!continueButton) return false;
  await user.click(continueButton);
  expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  return true;
}

async function skipUntilQuestion(
  user: ReturnType<typeof userEvent.setup>,
  prompt: RegExp,
  limit = 200,
) {
  for (let step = 0; step < limit; step += 1) {
    if (await continuePastIntermission(user)) continue;
    const heading = screen.getByRole("heading", { level: 1 });
    if (prompt.test(heading.textContent ?? "")) return;
    await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }
  throw new Error(`Question ${prompt} was not reached within ${limit} steps.`);
}

async function completeAssessment(
  user: ReturnType<typeof userEvent.setup>,
  onComplete: ReturnType<typeof vi.fn>,
  answerMedicationGate: "yes" | "no" | "skip" = "skip",
) {
  let intermissions = 0;
  for (let step = 0; step < 220 && onComplete.mock.calls.length === 0; step += 1) {
    if (await continuePastIntermission(user)) {
      intermissions += 1;
      continue;
    }
    const heading = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    if (
      /currently taking or using any prescription medicine/i.test(heading) &&
      answerMedicationGate !== "skip"
    ) {
      await user.click(
        screen.getByRole("radio", {
          name: answerMedicationGate === "yes" ? "Yes" : "No",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Continue" }));
    } else {
      await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
    }
  }
  return intermissions;
}

test("requires consent and a profile before showing health questions", async () => {
  await chooseDepth("quick");

  expect(
    screen.getByRole("heading", { name: /before we begin/i }),
  ).toBeVisible();
  expect(screen.getByLabelText(/how old are you/i)).toBeVisible();
  expect(
    screen.queryByText(/what sex were you assigned at birth/i),
  ).not.toBeInTheDocument();
});

test("introduces the first available chapter before the first adult Quick question", async () => {
  const user = userEvent.setup();
  render(<Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />);

  expect(screen.getByText("Chapter 01 / 04")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Next: Cardio, VO₂ max & cellular energy" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Continue assessment" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Continue assessment" }));

  expect(screen.queryByRole("button", { name: /sleep|heart|habits|care/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Prefer not to say" })).toBeVisible();
  const chapters = screen.getByRole("region", { name: "Assessment chapters" });
  expect(chapters).toHaveTextContent("Cardio & energy");
  expect(chapters).toHaveTextContent("Strength & recovery");
  expect(chapters).toHaveTextContent("Sleep");
  expect(chapters).toHaveTextContent("Nutrition & metabolism");
});

test("introduces each entered chapter once and never replays it after Back", async () => {
  const user = userEvent.setup();
  render(<Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "Continue assessment" }));
  for (let step = 0; step < 20; step += 1) {
    if (screen.queryByText("Chapter 02 / 04")) break;
    await user.click(screen.getByRole("button", { name: "Prefer not to say" }));
  }

  expect(screen.getByText("Chapter 02 / 04")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Continue assessment" }));
  await user.click(screen.getByRole("button", { name: "Back" }));

  expect(screen.queryByText("Chapter 02 / 04")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
});

test("keeps lab import ahead of chapter content and resumes the current chapter", async () => {
  const user = userEvent.setup();
  render(<Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />);

  await skipUntilQuestion(user, /blood-test results from the past twelve months/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  expect(
    screen.getByRole("heading", { name: /bring in results without sending them away/i }),
  ).toBeVisible();
  expect(screen.queryByRole("region", { name: "Assessment chapters" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /continue without import/i }));

  expect(screen.getByRole("region", { name: "Assessment chapters" })).toHaveTextContent(
    "01 / 04",
  );
});

test("requires guardian-assisted mode for a child under 13", async () => {
  const user = await chooseDepth("quick");
  await fillProfile(user, 12);

  expect(
    screen.getByText(/a parent, guardian, or other trusted adult must help/i),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: /start quick/i })).toBeDisabled();

  await user.click(
    screen.getByRole("radio", { name: /trusted adult is helping/i }),
  );
  await user.click(screen.getByRole("button", { name: /start quick/i }));
  await continuePastIntermission(user);

  expect(screen.getByText("Question 1 of 20")).toBeVisible();
});

test("lets an adolescent choose assisted or private completion", async () => {
  const user = await chooseDepth("quick");
  await fillProfile(user, 15);

  expect(
    screen.getByRole("radio", { name: /answer privately on my own/i }),
  ).toBeVisible();
  expect(
    screen.getByRole("radio", { name: /trusted adult is helping/i }),
  ).toBeVisible();
  await user.click(
    screen.getByRole("radio", { name: /answer privately on my own/i }),
  );
  await user.click(screen.getByRole("button", { name: /start quick/i }));
  await continuePastIntermission(user);

  expect(screen.getByText("Question 1 of 20")).toBeVisible();
});

test("offers Detailed instead of silently downgrading an unavailable child Deep queue", async () => {
  const user = await chooseDepth("deep");
  await fillProfile(user, 12);
  await user.click(
    screen.getByRole("radio", { name: /trusted adult is helping/i }),
  );

  expect(
    screen.getByText(/deep needs at least 150 eligible questions/i),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: /start deep/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /use detailed instead/i }));
  await user.click(screen.getByRole("button", { name: /start detailed/i }));
  await continuePastIntermission(user);

  expect(screen.getByText("Question 1 of 50")).toBeVisible();
});

test("starts the full Deep queue when at least 150 questions are eligible", async () => {
  const user = await chooseDepth("deep");
  await fillProfile(user, 35);
  await user.click(screen.getByRole("button", { name: /start deep/i }));
  await continuePastIntermission(user);

  expect(screen.getByText("Question 1 of 150")).toBeVisible();
});

test("interrupts immediately for a confirmed red flag and lets the user correct it", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(<Assessment depth="quick" profile={adultProfile} onComplete={onComplete} />);

  await skipUntilQuestion(user, /chest pressure, tightness, or pain/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  expect(screen.getByRole("alert")).toHaveTextContent(/emergency care/i);
  const urgentHeading = screen.getByRole("heading", { name: /immediate action/i });
  expect(urgentHeading).toBeVisible();
  expect(urgentHeading).toHaveFocus();
  expect(screen.getByText(/144/)).toBeVisible();
  expect(screen.getByText(/cannot contact emergency services/i)).toBeVisible();
  expect(screen.queryByText(/purity score|risk tree/i)).not.toBeInTheDocument();
  expect(onComplete).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: /change my answer/i }));
  expect(
    screen.getByRole("heading", { name: /chest pressure, tightness, or pain/i }),
  ).toBeVisible();
  expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();

  await user.click(screen.getByRole("radio", { name: "No" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.queryByRole("heading", { name: /immediate action/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Question 5 of 20/)).toBeVisible();
});

test("keeps a live urgent interruption and the triggering answer while switching it to French", async () => {
  const user = userEvent.setup();
  render(
    <>
      <LanguageSwitcher />
      <Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />
    </>,
  );

  await skipUntilQuestion(user, /chest pressure, tightness, or pain/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  const french = screen.getByRole("button", { name: "Français" });
  await user.click(french);

  expect(french).toHaveFocus();
  expect(screen.getByRole("heading", { name: "Action immédiate" })).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(/appelez maintenant le 144/i);
  await user.click(screen.getByRole("button", { name: "Modifier ma réponse" }));
  expect(screen.getByRole("radio", { name: "Oui" })).toBeChecked();
  expect(screen.getByRole("heading", { name: /pression.*douleur.*thoracique/i })).toBeVisible();
});

test("keeps a live chapter introduction and does not reconstruct the queue on a locale switch", async () => {
  const user = userEvent.setup();
  const buildQueue = vi.spyOn(questionnaireModule, "buildAssessmentQueue");
  render(
    <>
      <LanguageSwitcher />
      <Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />
    </>,
  );

  const chapter = screen.getByText("Chapter 01 / 04").textContent;
  const callsBeforeSwitch = buildQueue.mock.calls.length;
  expect(callsBeforeSwitch).toBeGreaterThan(0);

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByText(chapter?.replace("Chapter", "Chapitre") ?? "")).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuer l'analyse" })).toBeVisible();
  expect(buildQueue).toHaveBeenCalledTimes(callsBeforeSwitch);
  buildQueue.mockRestore();
});

test("interrupts for an adolescent current pregnancy or safeguarding concern", async () => {
  const user = userEvent.setup();
  render(
    <Assessment
      depth="quick"
      profile={{ age: 15, countryCode: "GB" }}
      onComplete={vi.fn()}
    />,
  );

  await skipUntilQuestion(user, /could pregnancy, trying to conceive/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await skipUntilQuestion(user, /severe pregnancy-related symptom/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  const heading = screen.getByRole("heading", { name: /immediate action/i });
  expect(heading).toHaveFocus();
  expect(screen.getByRole("alert")).toHaveTextContent(/urgent.*pregnancy|safeguarding/i);
  expect(screen.getByRole("alert")).toHaveTextContent(/999/);
});

test("makes None exclusive in every multi-select control", async () => {
  const user = userEvent.setup();
  const question = questionBank.find(
    (candidate) => candidate.id === "anabolic_detail_symptoms",
  );
  expect(question).toBeDefined();
  if (!question) return;

  render(
    <QuestionControl
      question={question}
      onAnswer={vi.fn()}
      onBack={vi.fn()}
      canGoBack={false}
    />,
  );

  const none = screen.getByRole("checkbox", { name: "None of these" });
  const chest = screen.getByRole("checkbox", { name: /chest pain or breathlessness/i });

  await user.click(none);
  expect(none).toBeChecked();
  await user.click(chest);
  expect(chest).toBeChecked();
  expect(none).not.toBeChecked();

  await user.click(none);
  expect(none).toBeChecked();
  expect(chest).not.toBeChecked();
});

test("Enter advances only after a valid answer and Back restores that answer", async () => {
  const user = userEvent.setup();
  render(
    <Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />,
  );
  await continuePastIntermission(user);

  expect(
    screen.getByRole("group", { name: /what sex were you assigned at birth/i }),
  ).toBeVisible();
  await user.keyboard("{Enter}");
  expect(screen.getByText("Question 1 of 20")).toBeVisible();

  await user.click(screen.getByRole("radio", { name: "Female" }));
  await user.keyboard("{Enter}");

  expect(screen.getByText("Question 2 of 20")).toBeVisible();
  expect(
    screen.getByRole("group", {
      name: /did a parent or sibling have a heart attack or stroke/i,
    }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: /back/i }));

  expect(screen.getByText("Question 1 of 20")).toBeVisible();
  expect(screen.getByRole("radio", { name: "Female" })).toBeChecked();
});

test("Back visibly preserves a deliberate skip", async () => {
  const user = userEvent.setup();
  render(<Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />);
  await continuePastIntermission(user);

  await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  await user.click(screen.getByRole("button", { name: /back/i }));

  expect(screen.getByRole("button", { name: /prefer not to say/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("every numeric question exposes its unit beside the input", () => {
  for (const question of questionBank.filter(
    (candidate) => candidate.answerType === "number",
  )) {
    const { unmount } = render(
      <QuestionControl
        question={question}
        onAnswer={vi.fn()}
        onBack={vi.fn()}
        canGoBack={false}
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveAccessibleDescription();
    unmount();
  }
});

test("Quick completes after exactly 20 deliberate skips stored only as null", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(
    <Assessment depth="quick" profile={adultProfile} onComplete={onComplete} />,
  );

  let intermissions = 0;
  for (let answered = 0; answered < 20; answered += 1) {
    const continueButton = screen.queryByRole("button", {
      name: /continue assessment/i,
    });
    if (continueButton) {
      intermissions += 1;
      await user.click(continueButton);
    }
    await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }

  expect(intermissions).toBe(4);
  expect(onComplete).toHaveBeenCalledOnce();
  const completedAnswers = onComplete.mock.calls[0][0];
  expect(Object.keys(completedAnswers)).toHaveLength(20);
  expect(Object.values(completedAnswers)).toEqual(Array(20).fill(null));
  expect(Object.values(completedAnswers)).not.toContain(undefined);
});

test.each([
  ["quick", 20, 4, 0],
  ["detailed", 50, 4, 5],
  ["deep", 158, 4, 5],
] as const)(
  "%s adaptation completes %i questions with %i intermissions and %i medication follow-ups",
  async (depth, questionCount, expectedIntermissions, expectedFollowUps) => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Assessment depth={depth} profile={adultProfile} onComplete={onComplete} />);
    const intermissions = await completeAssessment(user, onComplete, "yes");

    expect(intermissions).toBe(expectedIntermissions);
    expect(onComplete).toHaveBeenCalledOnce();
    const completedAnswers = onComplete.mock.calls[0][0];
    expect(Object.keys(completedAnswers)).toHaveLength(questionCount);
    expect(completedAnswers.current_medications).toBe(true);
    expect(
      Object.keys(completedAnswers).filter((id) => id.startsWith("med_detail_")),
    ).toHaveLength(expectedFollowUps);
  },
  20_000,
);

test("an affirmative medication gate inserts a real follow-up into the Detailed UI", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(<Assessment depth="detailed" profile={adultProfile} onComplete={onComplete} />);

  await skipUntilQuestion(user, /currently taking or using any prescription medicine/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await skipUntilQuestion(user, /exact medicine or ingredient names/i);

  expect(screen.getByText(/Question \d+ of 50/)).toBeVisible();
  await user.type(screen.getByRole("textbox"), "Metformin");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await completeAssessment(user, onComplete);

  expect(onComplete.mock.calls[0][0].med_detail_names).toBe("Metformin");
  expect(Object.keys(onComplete.mock.calls[0][0])).toHaveLength(50);
}, 10_000);

test("a personally due preventive follow-up routes access barriers into the action question", async () => {
  const user = userEvent.setup();
  render(
    <Assessment depth="detailed" profile={adultProfile} onComplete={vi.fn()} />,
  );

  await skipUntilQuestion(
    user,
    /personally invited, advised, or due for a routine health follow-up\?$/i,
  );
  const statusHeading = screen.getByRole("heading", { level: 1 });
  expect(statusHeading).not.toHaveTextContent(/access|accessible/i);
  expect(
    screen.getByRole("radio", { name: "No — nothing was personally due" }),
  ).toBeVisible();

  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await continuePastIntermission(user);

  expect(
    screen.getByRole("heading", {
      name: /what have you chosen to do about that routine follow-up/i,
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("radio", { name: /access or safety barrier is in the way/i }),
  ).toBeVisible();
}, 10_000);

test.each([
  ["No", "no"],
  ["Prefer not to say", "skip"],
] as const)("%s at the medication gate unlocks no follow-up", async (_, gateAnswer) => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(<Assessment depth="detailed" profile={adultProfile} onComplete={onComplete} />);

  await completeAssessment(user, onComplete, gateAnswer);

  const completedAnswers = onComplete.mock.calls[0][0];
  expect(Object.keys(completedAnswers)).toHaveLength(50);
  expect(Object.keys(completedAnswers).some((id) => id.startsWith("med_detail_"))).toBe(
    false,
  );
  expect(completedAnswers).not.toHaveProperty("adherence_missed_doses");
  expect(completedAnswers).not.toHaveProperty("adherence_access_barriers");
  expect(completedAnswers).not.toHaveProperty("interaction_shared_list");
  expect(completedAnswers.current_medications).toBe(gateAnswer === "no" ? false : null);
}, 10_000);

test("changing an earlier gate with Back closes its branch and removes stale answers", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(<Assessment depth="detailed" profile={adultProfile} onComplete={onComplete} />);

  await skipUntilQuestion(user, /currently taking or using any prescription medicine/i);
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await skipUntilQuestion(user, /exact medicine or ingredient names/i);
  await user.type(screen.getByRole("textbox"), "Metformin");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  for (let step = 0; step < 50; step += 1) {
    const heading = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    if (/currently taking or using any prescription medicine/i.test(heading)) break;
    await user.click(screen.getByRole("button", { name: /back/i }));
  }
  expect(
    screen.getByRole("heading", {
      name: /currently taking or using any prescription medicine/i,
    }),
  ).toBeVisible();

  await user.click(screen.getByRole("radio", { name: "No" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await completeAssessment(user, onComplete);

  const completedAnswers = onComplete.mock.calls[0][0];
  expect(completedAnswers.current_medications).toBe(false);
  expect(Object.keys(completedAnswers).some((id) => id.startsWith("med_detail_"))).toBe(
    false,
  );
  expect(completedAnswers).not.toHaveProperty("adherence_missed_doses");
  expect(completedAnswers).not.toHaveProperty("adherence_access_barriers");
  expect(completedAnswers).not.toHaveProperty("interaction_shared_list");
  expect(Object.values(completedAnswers)).not.toContain(undefined);
  expect(Object.keys(completedAnswers)).toHaveLength(50);
}, 15_000);

test("adds a navigation warning only while an assessment is active", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<Home />);

  await user.click(screen.getByRole("button", { name: /choose quick/i }));
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(
    true,
  );
  await fillProfile(user, 35);
  await user.click(screen.getByRole("button", { name: /start quick/i }));

  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(
    false,
  );
  unmount();
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(
    true,
  );
});
