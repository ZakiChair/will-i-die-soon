import { render as testingRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { name: "ScrollTrigger", register: vi.fn() },
}));

import { questionBank } from "../data/questions";
import { I18nProvider } from "../i18n/context";
import { getQuestionPromptPresentation } from "../i18n/question-prompt-presentation";
import { localizeQuestion } from "../i18n/questions-fr";
import { buildFollowUpPlan } from "../lib/pathology-follow-up";
import { evaluatePathologyRisk } from "../lib/pathology-risk";
import { prototypePolicy, publicWellnessPolicy } from "../lib/release-policy";
import * as riskEngineModule from "../lib/risk-engine";
import type { AnswerMap, ProfileContext, RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { PathologyFollowUp } from "./pathology-follow-up";
import { PathologySynthesisSection } from "./pathology-synthesis";
import { Results } from "./results";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const CH_50: ProfileContext = { age: 50, countryCode: "CH" };
const CH_55: ProfileContext = { age: 55, countryCode: "CH" };

/** Fifteen FINDRISC points at 50: high band, 33 in 100 over ten years. */
const FINDRISC_FIFTEEN: AnswerMap = {
  sex_assigned_at_birth: "male",
  height_cm: 175,
  weight_kg: 95,
  waist_circumference_cm: 105,
  daily_activity_30_min: false,
  plant_food_frequency: 0,
  bp_medication_ever: false,
  glucose_high_ever: false,
  family_diabetes: "other_relatives",
  diagnosed_conditions_core: ["none"],
};

const EXPRESS_ANSWERS: AnswerMap = {
  height_cm: 172,
  weight_kg: 80,
  usual_sleep_hours: 7,
  sleep_refreshed: 6,
  plant_food_frequency: 2,
  diet_ultra_processed: "weekly",
  reported_vo2_max_ml_kg_min: null,
  squat_one_rep_max_kg: null,
  deadlift_one_rep_max_kg: null,
};

function omit(answers: AnswerMap, ...ids: string[]): AnswerMap {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !ids.includes(id)));
}

function renderResults(answers: AnswerMap, profile: ProfileContext, assessmentDepth: "express" | "quick" = "quick") {
  return testingRender(
    <I18nProvider>
      <LanguageSwitcher />
      <Results answers={answers} assessmentDepth={assessmentDepth} confirmedLabs={[]} profile={profile} onRestart={vi.fn()} />
    </I18nProvider>,
  );
}

function synthesisSection(): HTMLElement {
  return screen.getByRole("region", { name: /Most probable conditions to discuss|Pathologies les plus probables à discuter/ });
}

function scoreCard(pathology: string): HTMLElement {
  const card = within(synthesisSection()).getByRole("heading", { name: pathology }).closest("li");
  if (!card) throw new Error(`No card for ${pathology}`);
  return card;
}

function filledCells(scope: Element): number {
  return scope.querySelectorAll('.people-grid__cells span[data-state="filled"]').length;
}

test("a published percentage reads as X in 100 and compares healthier habits at an equal profile", async () => {
  const user = userEvent.setup();
  renderResults(FINDRISC_FIFTEEN, CH_50);

  const card = scoreCard("Type 2 diabetes");
  expect(card).toHaveAttribute("data-status", "complete");
  expect(card).toHaveTextContent("About 33 in 100 people with this result develop type 2 diabetes within 10 years.");
  const gain = card.querySelector<HTMLElement>(".pathology-score__gain");
  expect(gain).toHaveTextContent("Same profile, healthier habits");
  expect(gain).toHaveTextContent(
    "With 30 minutes of activity a day and vegetables or fruit every day, the score would correspond to about 17 in 100.",
  );
  expect(gain).toHaveTextContent("a comparison of scores, not a promise of the result");
  const grids = [...card.querySelectorAll(".people-grid")];
  expect(grids.map(filledCells)).toEqual([33, 17]);
  expect(grids.map((grid) => grid.textContent)).toEqual(["Today", "With these habits"]);
  expect(gain?.querySelector(".pathology-score__pictograms")).toHaveAttribute("aria-hidden", "true");
  expect(card.querySelector(".pathology-score__orientation")).toHaveTextContent(
    "Ask a doctor for a blood glucose or HbA1c test",
  );

  await user.click(screen.getByRole("button", { name: "Français" }));
  const french = scoreCard("Diabète de type 2");
  expect(french).toHaveTextContent(
    "Environ 33 personnes sur 100 ayant ce résultat développent un diabète de type 2 dans les 10 ans.",
  );
  expect(french).toHaveTextContent(
    "Avec 30 minutes d’activité par jour et des légumes ou des fruits chaque jour, le score correspondrait à environ 17 sur 100.",
  );
  expect(french).toHaveTextContent("Demandez à un médecin une glycémie ou une HbA1c");
});

test("one missing answer shows every result it could still produce, without an orientation", async () => {
  const user = userEvent.setup();
  renderResults(omit(FINDRISC_FIFTEEN, "waist_circumference_cm"), CH_50);

  const card = scoreCard("Type 2 diabetes");
  expect(card).toHaveAttribute("data-status", "incomplete");
  const range = card.querySelector<HTMLElement>(".pathology-score__range");
  if (!range) throw new Error("No range");
  expect(range).toHaveTextContent("Range with 1 missing answer");
  expect(range).toHaveTextContent("from “Slightly elevated risk” to “High risk”");
  expect(range).toHaveTextContent("between 11 and 15 / 26 points");
  expect(range).toHaveTextContent(
    "Between 4 and 33 in 100 people with this result develop type 2 diabetes within 10 years, depending on the missing answer.",
  );
  expect(filledCells(range)).toBe(4);
  expect(range.querySelectorAll('[data-state="possible"]')).toHaveLength(29);
  expect(card.querySelector(".pathology-score__orientation")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(scoreCard("Diabète de type 2").querySelector(".pathology-score__range")).toHaveTextContent(
    "Entre 4 et 33 personnes sur 100 ayant ce résultat développent un diabète de type 2 dans les 10 ans, selon la réponse manquante.",
  );
});

test("a category settled despite one missing answer reads in the singular", async () => {
  const user = userEvent.setup();
  renderResults(
    {
      sex_assigned_at_birth: "male",
      height_cm: 175,
      weight_kg: 95,
      sleep_snoring: "yes",
      sleep_daytime_sleepiness: "never",
      sleep_witnessed_apnea: "yes",
      diagnosed_high_blood_pressure: false,
      diagnosed_conditions_core: ["none"],
    },
    CH_55,
  );

  expect(scoreCard("Obstructive sleep apnoea")).toHaveTextContent("“High probability” whatever the missing answer");
  await user.click(screen.getByRole("button", { name: "Français" }));
  // The matcher folds the French non-breaking spaces into plain ones.
  expect(scoreCard("Apnée obstructive du sommeil")).toHaveTextContent(
    "« Probabilité élevée » quelle que soit la réponse manquante",
  );
});

test("a range whose category is settled already carries the orientation", () => {
  renderResults({ alcohol_frequency: "four_plus_weekly" }, CH_50);

  const card = scoreCard("Hazardous alcohol use");
  expect(card).toHaveTextContent("“Positive screen” whatever the missing answers");
  expect(card.querySelector(".pathology-score__orientation")).toHaveTextContent(
    "Talk to a doctor or an alcohol support service.",
  );
  expect(within(card).getByRole("button", { name: "Complete this estimate (2 questions at most)" })).toBeVisible();
});

test("without probability permission the habit gain compares categories and draws no people", () => {
  const synthesis = evaluatePathologyRisk(FINDRISC_FIFTEEN, CH_50, [], publicWellnessPolicy);
  testingRender(
    <I18nProvider>
      <PathologySynthesisSection synthesis={synthesis} depth="quick" answers={FINDRISC_FIFTEEN} />
    </I18nProvider>,
  );

  const card = scoreCard("Type 2 diabetes");
  expect(card).toHaveTextContent("The published percentage is withheld in this release");
  expect(card).not.toHaveTextContent(/in 100 people/);
  expect(card.querySelector(".pathology-score__gain")).toHaveTextContent(
    "With 30 minutes of activity a day and vegetables or fruit every day, the score would correspond to “Moderate risk” (12 / 26 points).",
  );
  expect(card.querySelectorAll(".people-grid")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: /Complete/ })).not.toBeInTheDocument();
});

test("completing one estimate asks only its missing answer, with measurement help, then updates the card", async () => {
  const user = userEvent.setup();
  renderResults(omit(FINDRISC_FIFTEEN, "waist_circumference_cm"), CH_50);

  await user.click(within(scoreCard("Type 2 diabetes")).getByRole("button", { name: "Complete this estimate (1 question at most)" }));
  const flow = screen.getByRole("region", { name: "Complete my estimates" });
  const heading = within(flow).getByRole("heading", { level: 3, name: "What is your waist circumference?" });
  expect(heading).toHaveFocus();
  expect(flow).toHaveTextContent("midway between your lowest rib and the top of your hip bone");
  expect(flow).toHaveTextContent("Helps estimate: Type 2 diabetes");
  expect(flow).toHaveTextContent("1 question left at most");

  await user.type(within(flow).getByRole("spinbutton"), "105");
  await user.click(within(flow).getByRole("button", { name: "Continue" }));

  expect(screen.getByRole("heading", { name: "Estimates updated" })).toHaveFocus();
  expect(screen.getByRole("link", { name: "See the estimate" })).toHaveAttribute("href", "#pathology-score-findrisc");
  const card = scoreCard("Type 2 diabetes");
  expect(card).toHaveAttribute("id", "pathology-score-findrisc");
  expect(card).toHaveAttribute("data-status", "complete");
  expect(card).toHaveTextContent("About 33 in 100 people with this result develop type 2 diabetes within 10 years.");

  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("heading", { level: 2, name: "Most probable conditions to discuss" })).toHaveFocus();
  expect(screen.queryByRole("region", { name: "Complete my estimates" })).not.toBeInTheDocument();
});

test("Express adults see the conditions and can complete all estimates, going back and stopping at will", async () => {
  const user = userEvent.setup();
  renderResults(EXPRESS_ANSWERS, CH_55, "express");

  const navigation = screen.getByRole("navigation", { name: "Explore your results" });
  expect(within(navigation).getByRole("link", { name: "Conditions" })).toHaveAttribute("href", "#pathology-synthesis");
  const section = synthesisSection();
  expect(section).toHaveTextContent(/\d+ questions at most could complete \d+ estimates\. You answer only what is missing\./);
  const invitation = section.querySelector(".pathology-follow-up-invite p")?.textContent ?? "";
  const invited = Number(/^(\d+) questions at most could complete/.exec(invitation)?.[1]);
  expect(invited).toBeGreaterThan(1);

  const plan = buildFollowUpPlan(
    evaluatePathologyRisk(EXPRESS_ANSWERS, CH_55, [], prototypePolicy),
    EXPRESS_ANSWERS,
    CH_55,
    "all",
  );
  const titles = plan.slice(0, 2).map((step) => {
    if (step.kind !== "question") throw new Error("Expected questions first");
    const question = questionBank.find((candidate) => candidate.id === step.questionId);
    if (!question) throw new Error(`Unknown question ${step.questionId}`);
    const prompt = localizeQuestion(question, "en").prompt;
    return getQuestionPromptPresentation(question.id, "en", prompt).title;
  });

  await user.click(within(section).getByRole("button", { name: "Complete all" }));
  const flow = screen.getByRole("region", { name: "Complete my estimates" });
  expect(within(flow).getByRole("heading", { level: 3, name: titles[0] })).toHaveFocus();
  expect(within(flow).getByRole("button", { name: "Back" })).toBeDisabled();
  expect(flow).toHaveTextContent(`${invited} questions left at most`);

  await user.click(within(flow).getByRole("button", { name: "Prefer not to say" }));
  expect(within(flow).getByRole("heading", { level: 3, name: titles[1] })).toHaveFocus();
  expect(flow).toHaveTextContent(`${invited - 1} questions left at most`);

  await user.click(within(flow).getByRole("button", { name: "Back" }));
  expect(within(flow).getByRole("heading", { level: 3, name: titles[0] })).toHaveFocus();
  expect(within(flow).getByRole("button", { name: "Prefer not to say" })).toHaveAttribute("aria-pressed", "true");

  await user.click(within(flow).getByRole("button", { name: "Stop here" }));
  expect(screen.getByRole("heading", { level: 2, name: "Most probable conditions to discuss" })).toHaveFocus();
  expect(within(section).getByRole("button", { name: "Complete all" })).toBeVisible();
});

test("skipping every question says that nothing was added", async () => {
  const user = userEvent.setup();
  renderResults({ alcohol_frequency: "four_plus_weekly" }, CH_50);

  await user.click(within(scoreCard("Hazardous alcohol use")).getByRole("button", { name: /Complete this estimate/ }));
  const flow = screen.getByRole("region", { name: "Complete my estimates" });
  await user.click(within(flow).getByRole("button", { name: "Prefer not to say" }));
  await user.click(within(screen.getByRole("region", { name: "Complete my estimates" })).getByRole("button", { name: "Prefer not to say" }));

  expect(screen.getByRole("heading", { name: "Nothing was added" })).toHaveFocus();
  expect(screen.queryByRole("link", { name: "See the estimate" })).not.toBeInTheDocument();
});

test("a closed blood-pressure gate is offered again with help, then the reading, then the lab import", async () => {
  const user = userEvent.setup();
  renderResults(
    {
      sex_assigned_at_birth: "male",
      education_years: "seven_to_nine",
      height_cm: 170,
      weight_kg: 93,
      weekly_moderate_activity_minutes: 30,
      has_recent_blood_pressure: false,
    },
    CH_55,
  );

  const card = scoreCard("Dementia in later life");
  await user.click(within(card).getByRole("button", { name: "Complete this estimate (3 questions at most)" }));
  const flow = () => screen.getByRole("region", { name: "Complete my estimates" });
  expect(within(flow()).getByRole("heading", { level: 3, name: "Do you know a recent blood-pressure reading?" })).toHaveFocus();
  expect(flow()).toHaveTextContent("a pharmacy, a doctor or a validated home monitor");
  expect(flow()).toHaveTextContent("3 questions left at most");

  await user.click(within(flow()).getByRole("radio", { name: "Yes" }));
  await user.click(within(flow()).getByRole("button", { name: "Continue" }));
  expect(
    within(flow()).getByRole("heading", { level: 3, name: "What was the top number of your latest blood-pressure reading?" }),
  ).toHaveFocus();
  expect(flow()).toHaveTextContent("125 for a reading of 125/80");
  expect(flow()).toHaveTextContent("2 questions left at most");

  await user.type(within(flow()).getByRole("spinbutton"), "150");
  await user.click(within(flow()).getByRole("button", { name: "Continue" }));
  expect(within(flow()).getByRole("heading", { level: 3, name: "Bring in results without sending them away." })).toHaveFocus();
  expect(flow()).toHaveTextContent("A recent blood test can complete this estimate. Helps estimate: Dementia in later life");
  expect(flow()).not.toHaveTextContent(/left at most/);

  await user.click(within(flow()).getByRole("button", { name: "Continue without import" }));
  expect(screen.getByRole("heading", { name: "Estimates updated" })).toHaveFocus();
  const updated = scoreCard("Dementia in later life");
  expect(updated).toHaveAttribute("data-status", "incomplete");
  expect(updated.querySelector(".pathology-score__missing")).not.toHaveTextContent("Systolic blood pressure");
  expect(updated.querySelector(".pathology-score__missing")).toHaveTextContent("Total cholesterol");
});

/** Everything SCORE2 and CAIDE read at 55 in Switzerland, except the blood test. */
const LABS_ONLY: AnswerMap = {
  sex_assigned_at_birth: "male",
  diagnosed_conditions_core: ["none"],
  cvd_event_history: false,
  current_tobacco_nicotine: false,
  has_recent_blood_pressure: true,
  blood_pressure_systolic: 150,
  education_years: "seven_to_nine",
  height_cm: 170,
  weight_kg: 93,
  weekly_moderate_activity_minutes: 30,
};

test.each([
  [
    "all" as const,
    "A recent blood test can complete these estimates. Helps estimate: Cardiovascular disease (heart attack, stroke) and Dementia in later life",
    "Un bilan sanguin récent peut compléter ces estimations. Utile pour : Maladie cardiovasculaire (infarctus, AVC) et Démence plus tard dans la vie",
  ],
  [
    "caide" as const,
    "A recent blood test can complete this estimate. Helps estimate: Dementia in later life",
    "Un bilan sanguin récent peut compléter cette estimation. Utile pour : Démence plus tard dans la vie",
  ],
])("the lab import agrees in number with the estimates it completes (%s)", async (scope, english, french) => {
  const user = userEvent.setup();
  const synthesis = evaluatePathologyRisk(LABS_ONLY, CH_55, [], prototypePolicy);
  const labScores = {
    ...synthesis,
    scores: synthesis.scores.filter((score) => score.instrument === "score2" || score.instrument === "caide"),
  };
  testingRender(
    <I18nProvider>
      <LanguageSwitcher />
      <PathologyFollowUp
        scope={scope}
        synthesis={labScores}
        answers={LABS_ONLY}
        profile={CH_55}
        onAnswer={vi.fn()}
        onLabs={vi.fn()}
        onClose={vi.fn()}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("region", { name: "Complete my estimates" })).toHaveTextContent(english);
  await user.click(screen.getByRole("button", { name: "Français" }));
  // The matcher folds the French non-breaking spaces into plain ones.
  expect(screen.getByRole("region", { name: "Compléter mes estimations" })).toHaveTextContent(french);
});

function captureDownloads(): Blob[] {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:report-${blobs.length}`;
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  return blobs;
}

async function readBlob(blob: Blob) {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
  return JSON.parse(text) as { schemaVersion: string; pathologyRisk?: { scores: Array<Record<string, unknown>> } };
}

test("the JSON download reflects an answer added after the results, without its value", async () => {
  const user = userEvent.setup();
  const blobs = captureDownloads();
  renderResults(omit(FINDRISC_FIFTEEN, "waist_circumference_cm"), CH_50);
  const findrisc = (json: Awaited<ReturnType<typeof readBlob>>) =>
    json.pathologyRisk?.scores.find((score) => score.instrument === "findrisc");

  await user.click(screen.getByRole("button", { name: /download json/i }));
  expect(findrisc(await readBlob(blobs[0]))).toMatchObject({ status: "incomplete", range: { maxPoints: 26 } });

  await user.click(within(scoreCard("Type 2 diabetes")).getByRole("button", { name: /Complete this estimate/ }));
  const flow = screen.getByRole("region", { name: "Complete my estimates" });
  await user.type(within(flow).getByRole("spinbutton"), "105");
  await user.click(within(flow).getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: /download json/i }));

  const updated = await readBlob(blobs[1]);
  expect(updated.schemaVersion).toBe("health-risk-explorer-report-v4");
  expect(findrisc(updated)).toMatchObject({
    status: "complete",
    points: 15,
    riskPercent: 33,
    gain: { riskPercent: 17 },
    orientation: "findrisc-glucose-test",
  });
  expect(JSON.stringify(updated)).not.toMatch(/\b105\b/);
});

test("adult Express downloads carry the conditions estimated from its answers", async () => {
  const user = userEvent.setup();
  const blobs = captureDownloads();
  renderResults(EXPRESS_ANSWERS, CH_55, "express");

  await user.click(screen.getByRole("button", { name: /download json/i }));
  const json = await readBlob(blobs[0]);
  expect(json.pathologyRisk?.scores.map((score) => score.instrument)).toContain("findrisc");
  expect(JSON.stringify(json.pathologyRisk)).not.toMatch(/\b172\b|\b80\b/);
});

test("a new urgent signal closes the follow-up and moves focus to the urgent summary", async () => {
  const user = userEvent.setup();
  const urgent: RiskLeaf = {
    id: "urgent-test",
    // A real rule id: every displayed leaf must map to a health pillar.
    ruleId: "urgent-breathing",
    rulesetVersion: "risk-rules-v1",
    group: "immediate-red-flags",
    title: "Urgent test signal",
    copy: "Seek care now.",
    evidenceTier: "guideline-action",
    urgency: "urgent",
    signal: "urgent",
    factors: [],
    missingInputs: [],
    sources: [],
    applicability: { countries: "all" },
  };
  vi.spyOn(riskEngineModule, "evaluateRisks").mockImplementation((answers) =>
    answers.waist_circumference_cm === 105 ? [urgent] : [],
  );
  renderResults(omit(FINDRISC_FIFTEEN, "waist_circumference_cm"), CH_50);

  await user.click(within(scoreCard("Type 2 diabetes")).getByRole("button", { name: /Complete this estimate/ }));
  const flow = screen.getByRole("region", { name: "Complete my estimates" });
  await user.type(within(flow).getByRole("spinbutton"), "105");
  await user.click(within(flow).getByRole("button", { name: "Continue" }));

  expect(screen.queryByRole("region", { name: "Complete my estimates" })).not.toBeInTheDocument();
  expect(document.getElementById("results-urgent-title")).toHaveFocus();
  expect(screen.getByRole("alert")).toHaveTextContent("Urgent test signal");
});
