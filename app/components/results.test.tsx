import { render as testingRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { name: "ScrollTrigger", register: vi.fn() },
}));

import Home from "../page";
import { I18nProvider } from "../i18n/context";
import type { ConfirmedLabValue } from "../lib/labs";
import * as riskEngineModule from "../lib/risk-engine";
import * as scoringModule from "../lib/scoring";
import type { AnswerMap, RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { RiskTree } from "./risk-tree";
import { Results } from "./results";

function installReducedMotionPreference() {
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
}

beforeEach(installReducedMotionPreference);
afterEach(() => vi.unstubAllGlobals());

function render(ui: ReactElement) {
  return testingRender(<I18nProvider>{ui}</I18nProvider>);
}

function renderLocalizedResults(
  props: Omit<React.ComponentProps<typeof Results>, "onRestart"> & {
    readonly onRestart?: () => void;
  },
) {
  return render(
    <>
      <LanguageSwitcher />
      <Results {...props} onRestart={props.onRestart ?? vi.fn()} />
    </>,
  );
}

const source = {
  id: "official-source",
  title: "Official public-health guidance",
  publisher: "World Health Organization",
  url: "https://www.who.int/example",
  reviewedAt: "2026-08-03",
  jurisdictions: "all" as const,
  applicability: { countries: "all" as const },
};

function riskLeaf(
  id: string,
  ruleId: string,
  title: string,
  urgency: RiskLeaf["urgency"],
): RiskLeaf {
  return {
    id,
    ruleId,
    rulesetVersion: "risk-rules-v1",
    group:
      urgency === "urgent"
        ? "immediate-red-flags"
        : urgency === "prompt-review"
          ? "preventive-follow-up"
          : "sleep",
    title,
    copy: "This qualitative signal can guide a careful next conversation.",
    evidenceTier: "guideline-action",
    urgency,
    signal: urgency === "urgent" ? "urgent" : "worth-attention",
    factors: ["A structured self-reported factor"],
    missingInputs: ["another_structured_answer"],
    sources: [source],
    applicability: { countries: "all" },
  };
}

const F1_ANSWERS: AnswerMap = {
  current_tobacco_nicotine: false,
  alcohol_frequency: "never",
  weekly_moderate_activity_minutes: 300,
  movement_strength_days: 2,
  movement_walking_days: 5,
  sedentary_total_hours: 4,
  plant_food_frequency: 5,
  diet_whole_grains: "daily",
  diet_legumes: 3,
  diet_processed_meat: "never",
  diet_sugary_drinks: 0,
  usual_sleep_hours: 7,
  sleep_refreshed: 9,
  circadian_bedtime_variation: 1,
  stress_recovery_practice: "daily",
  preventive_followup_status: "yes",
  preventive_followup_action: "completed",
  current_medications: true,
  med_detail_prescriber_followup: "yes_all",
  adherence_missed_doses: "never",
  adherence_access_barriers: ["none"],
  interaction_shared_list: true,
};

test("marks result reading units as non-nested sibling roots without changing heading order", () => {
  const { container } = render(
    <Results
      answers={{ ...F1_ANSWERS, urgent_chest_discomfort_now: true }}
      assessmentDepth="deep"
      confirmedLabs={[confirmedLab]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const results = container.querySelector(".results");
  expect(results?.querySelector(".results__intro")).toHaveAttribute("data-reveal", "heading");
  expect(results?.querySelector(".results-urgent")).toHaveAttribute("data-reveal", "single");
  expect(results?.querySelector(".results-canopy")).not.toHaveAttribute("data-reveal");
  expect(results?.querySelector(".results-canopy > .section-heading")).toHaveAttribute(
    "data-reveal",
    "heading",
  );

  const siblingRootPairs = [
    [".score-sheet", ".score-sheet__heading", ".score-categories"],
    [".confirmed-labs", ".confirmed-labs__heading", ".confirmed-labs__table-wrap"],
  ] as const;
  for (const [sectionSelector, headingSelector, groupSelector] of siblingRootPairs) {
    const section = results?.querySelector<HTMLElement>(sectionSelector);
    const headingRoot = results?.querySelector<HTMLElement>(headingSelector);
    const groupRoot = results?.querySelector<HTMLElement>(groupSelector);
    expect(section).not.toHaveAttribute("data-reveal");
    expect(headingRoot).toHaveAttribute("data-reveal", "heading");
    expect(groupRoot).toHaveAttribute("data-reveal", "group");
    expect(headingRoot?.parentElement).toBe(section);
    expect(groupRoot?.parentElement).toBe(section);
  }
  expect(results?.querySelector(".result-tools")).toHaveAttribute("data-reveal", "single");

  const roots = [...(results?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [])];
  for (const root of roots) expect(root.querySelector("[data-reveal]")).toBeNull();

  const scoreReadout = screen.getByText(/100 \/ 100 · 100% answer coverage/i);
  expect(scoreReadout).toHaveAttribute("data-reveal-item");
  expect(scoreReadout).not.toHaveAttribute("data-count-from");

  const title = screen.getByRole("heading", { name: "Your health, in perspective." });
  const urgent = screen.getByRole("heading", { name: "Act on these immediate signals now" });
  const canopy = screen.getByRole("heading", { name: "Four health pillars you can inspect." });
  expect(title.compareDocumentPosition(urgent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(urgent.compareDocumentPosition(canopy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("Express results show their own index and navigation while keeping shared tools", () => {
  const { container } = render(
    <Results
      answers={{
        reported_vo2_max_ml_kg_min: 48.5,
        squat_one_rep_max_kg: 123,
        deadlift_one_rep_max_kg: 181,
        usual_sleep_hours: 7.5,
        sleep_refreshed: 8,
        height_cm: 182,
        weight_kg: 80,
        plant_food_frequency: 4,
        diet_ultra_processed: "rarely",
      }}
      assessmentDepth="express"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "Your Express profile" })).toBeVisible();
  expect(container.querySelector(".express-profile__score")).toHaveTextContent("92");
  expect(container.querySelector("#score-distribution")).toBeNull();
  const navigation = screen.getByRole("navigation", { name: "Explore your results" });
  expect(within(navigation).getByRole("link", { name: "Priorities" })).toHaveAttribute("href", "#express-priorities");
  expect(within(navigation).getByRole("link", { name: "Method" })).toHaveAttribute("href", "#express-method");
  for (const link of navigation.querySelectorAll("a")) {
    expect(container.querySelector(link.hash)).not.toBeNull();
  }
  expect(screen.getByRole("heading", { name: /keep or clear these results/i })).toBeVisible();
  expect(screen.queryByText("Health signal pillars")).not.toBeInTheDocument();
  expect(screen.queryByText(/Purity Score/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/wellness habits reflection/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /actions you can choose/i })).not.toBeInTheDocument();
  const express = container.querySelector(".results .express-results");
  expect(express).not.toHaveAttribute("data-reveal");
  expect(express?.querySelector(".express-results__heading")).toHaveAttribute(
    "data-reveal",
    "heading",
  );
  expect(express?.querySelector(".express-results__grid")).toHaveAttribute(
    "data-reveal",
    "group",
  );
});

test("marks adolescent habits as sibling heading and card-group reading units", () => {
  const { container } = render(
    <Results
      answers={{ adolescent_nicotine_support: "find_service" }}
      assessmentDepth="detailed"
      confirmedLabs={[]}
      profile={{ age: 15, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const section = container.querySelector<HTMLElement>(".habits-map");
  const heading = section?.querySelector<HTMLElement>(".habits-map__heading");
  const cards = section?.querySelector<HTMLElement>(".habits-map__cards");
  expect(section).not.toHaveAttribute("data-reveal");
  expect(heading).toHaveAttribute("data-reveal", "heading");
  expect(cards).toHaveAttribute("data-reveal", "group");
  expect(heading?.parentElement).toBe(section);
  expect(cards?.parentElement).toBe(section);
  expect(cards?.querySelectorAll(":scope > [data-reveal-item]")).toHaveLength(3);
});

const confirmedLab: ConfirmedLabValue = {
  source: {
    marker: "hba1c",
    value: 5.7,
    unit: "%",
    rawLine: "SECRET RAW LAB LINE",
    rawTestName: "Private report name.pdf",
  },
  reviewed: {
    marker: "hba1c",
    valueText: "5.7",
    value: 5.7,
    unit: "%",
    referenceRange: "4.0–5.6",
    collectionDate: "2026-07-30",
    fastingStatus: "not_stated",
  },
  normalized: {
    value: 38.801,
    unit: "mmol/mol",
    displayValue: "39",
  },
};

async function readBlob(blob: Blob) {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
  return JSON.parse(text) as Record<string, unknown>;
}

test("the health signal pillars are complete semantic navigation with an adjacent evidence panel", async () => {
  const user = userEvent.setup();
  render(
    <RiskTree
      leaves={[
        riskLeaf("urgent", "urgent-breathing", "Immediate breathing signal", "urgent"),
        riskLeaf("review", "low-mood-support", "Follow-up conversation", "prompt-review"),
        riskLeaf("longer", "adult-short-sleep", "Longer-term sleep pattern", "long-term"),
      ]}
      protectiveRoots={["Reliable social support", "Morning light"]}
    />,
  );

  const navigation = screen.getByRole("navigation", { name: /health signal pillars/i });
  expect(within(navigation).getByText("You today")).toBeVisible();
  expect(within(navigation).getByText("Cardio, VO₂ max & cellular energy")).toBeVisible();
  expect(within(navigation).getByText("Strength, nervous system & recovery")).toBeVisible();
  expect(within(navigation).getByText("Sleep & circadian rhythm")).toBeVisible();
  expect(within(navigation).getByText("Nutrition & metabolic health")).toBeVisible();
  expect(within(navigation).getByText("Protective roots")).toBeVisible();
  expect(within(navigation).getAllByRole("listitem", { name: /pillar/i })).toHaveLength(4);

  const reviewButton = within(navigation).getByRole("button", {
    name: /Follow-up conversation/,
  });
  await user.click(reviewButton);

  expect(reviewButton).toHaveAttribute("aria-pressed", "true");
  const panel = screen.getByRole("region", { name: "Follow-up conversation" });
  expect(panel).toHaveTextContent("A structured self-reported factor");
  expect(panel).toHaveTextContent("A question not shown in this route");
  expect(panel).toHaveTextContent("Guideline action");
  expect(within(panel).getByRole("link", { name: /official public-health guidance/i })).toHaveAttribute(
    "href",
    source.url,
  );
});

test("urgent findings render before the adult habits score without changing its arithmetic", () => {
  render(
    <Results
      answers={{ ...F1_ANSWERS, urgent_chest_discomfort_now: true }}
      assessmentDepth="deep"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const urgent = screen.getByRole("alert");
  const scoreHeading = screen.getByRole("heading", {
    name: "Purity Score — wellness habits, not a health verdict.",
  });
  expect(urgent).toHaveTextContent(/call 144 now/i);
  expect(
    urgent.compareDocumentPosition(scoreHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText(/100 \/ 100 · 100% answer coverage/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(/your disease probability|\byou will (?:live|die)\b/i);
});

test("urgent-chest remains in the urgent summary and Cardio with its canonical evidence source", async () => {
  const user = userEvent.setup();
  render(
    <Results
      answers={{ urgent_chest_discomfort_now: true }}
      assessmentDepth="quick"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const urgent = screen.getByRole("alert");
  expect(urgent).toHaveTextContent("Immediate cardiopulmonary action");
  const cardio = screen.getByRole("listitem", {
    name: "Cardio, VO₂ max & cellular energy pillar",
  });
  const chestLeaf = within(cardio).getByRole("button", {
    name: /Immediate cardiopulmonary action.*Urgent.*Authoritative safety/i,
  });
  await user.click(chestLeaf);
  expect(screen.getByRole("region", { name: "Immediate cardiopulmonary action" }))
    .toHaveTextContent("Chest pain");
  expect(screen.getByRole("link", { name: "Chest pain" })).toHaveAttribute(
    "href",
    "https://www.nhs.uk/conditions/chest-pain/",
  );
});

test("a merged support action renders every applicable reason and source link", () => {
  const { container } = render(
    <Results
      answers={{
        ...F1_ANSWERS,
        preventive_followup_action: "access_or_safety_barrier",
        med_detail_prescriber_followup: "no_current_access",
      }}
      assessmentDepth="deep"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const action = screen
    .getByRole("heading", { name: /practical access and safety support/i })
    .closest("li");
  expect(action).not.toBeNull();
  if (!action) return;
  expect(action).toHaveTextContent(/access or safety barrier/i);
  expect(action).toHaveTextContent(/no current access to prescriber follow-up/i);
  expect(
    within(action).getByRole("link", { name: /primary health care/i }),
  ).toHaveAttribute("href", "https://www.who.int/health-topics/primary-health-care");
  expect(
    within(action).getByRole("link", { name: /medication without harm/i }),
  ).toHaveAttribute(
    "href",
    "https://www.who.int/initiatives/medication-without-harm",
  );

  const section = container.querySelector<HTMLElement>(".action-plan");
  const heading = section?.querySelector<HTMLElement>(".action-plan__heading");
  const list = section?.querySelector<HTMLOListElement>(":scope > ol");
  expect(section).not.toHaveAttribute("data-reveal");
  expect(heading).toHaveAttribute("data-reveal", "heading");
  expect(list).toHaveAttribute("data-reveal", "group");
  expect(heading?.parentElement).toBe(section);
  expect(list?.parentElement).toBe(section);
  expect(list?.querySelectorAll(":scope > [data-reveal-item]").length).toBeGreaterThan(0);
});

test("Quick shows a habits reflection and coverage but never a numeric score", () => {
  render(
    <Results
      answers={F1_ANSWERS}
      assessmentDepth="quick"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: /wellness habits reflection/i })).toBeVisible();
  expect(screen.getByText(/Quick does not calculate a number/i)).toBeVisible();
  const reflection = screen.getByRole("region", { name: /wellness habits reflection/i });
  expect(within(reflection).getByText(/100% answer coverage/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(/\b\d+\s*\/\s*100\b/);
  expect(
    screen.queryByText(/Purity Score — wellness habits, not a health verdict/i),
  ).not.toBeInTheDocument();
});

test("the adult ledger distinguishes assessed points and exposes every component cap", async () => {
  const user = userEvent.setup();
  render(
    <Results
      answers={{ ...F1_ANSWERS, diet_legumes: null }}
      assessmentDepth="deep"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  expect(
    screen.getByText("15 / 15 assessed · 83% component coverage"),
  ).toBeVisible();
  const ledger = screen.getByRole("region", { name: /Purity Score — wellness habits/i });
  await user.click(within(ledger).getByText("Nutrition pattern"));
  expect(screen.getByText("Legume meals").closest("li")).toHaveTextContent(
    "Missing; 3 possible points affect coverage only",
  );
});

test("ages 13 to 17 receive a non-ranked My Health Habits Map", () => {
  render(
    <Results
      answers={{
        adolescent_nicotine_support: "find_service",
        adolescent_pregnancy_support: "find_service",
        reliable_social_support: true,
        stress_recovery_practice: "rarely",
      }}
      assessmentDepth="detailed"
      confirmedLabs={[]}
      profile={{ age: 15, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "My Health Habits Map" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Things going well" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "One habit you could choose to work on" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Support you asked for" })).toBeVisible();
  expect(screen.getByText(/help finding a pregnancy-related health service/i)).toBeVisible();
  expect(screen.getByText(/brief stress-management practice/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(/recovery or enjoyable activity/i);
  expect(screen.getByText(/parent, guardian, or another trusted adult/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(
    /purity score|\b\d+\s*\/\s*100\b|\bpoints?\b|\bgrade\b|adult comparison/i,
  );
  expect(
    screen.queryByRole("checkbox", { name: /include structured raw answers/i }),
  ).not.toBeInTheDocument();
});

test("assisted adolescents see urgent instructions before a neutral private-results handoff", async () => {
  const user = userEvent.setup();
  render(
    <Results
      answers={{
        urgent_chest_discomfort_now: true,
        adolescent_pregnancy_support: "find_service",
      }}
      assessmentDepth="detailed"
      confirmedLabs={[confirmedLab]}
      profile={{ age: 15, countryCode: "CH", assistedMinor: true }}
      onRestart={vi.fn()}
    />,
  );

  const urgent = screen.getByRole("alert");
  const handoff = screen.getByRole("heading", { name: /your private results are ready/i });
  expect(urgent).toHaveTextContent(/call 144 now/i);
  expect(
    urgent.compareDocumentPosition(handoff) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText(/move to a private place if it is safe/i)).toBeVisible();
  expect(screen.queryByRole("navigation", { name: /health signal pillars/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "My Health Habits Map" })).not.toBeInTheDocument();
  expect(screen.queryByText(/pregnancy-related health service/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: /confirmed lab context/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /print or save as pdf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /download json/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /show my private results/i }));

  expect(
    screen.getByRole("heading", { name: /four health pillars you can inspect/i }),
  ).toHaveFocus();
  expect(screen.getByRole("navigation", { name: /health signal pillars/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: "My Health Habits Map" })).toBeVisible();
  expect(screen.getByText(/pregnancy-related health service/i)).toBeVisible();
  expect(screen.getByRole("region", { name: /confirmed lab context/i })).toBeVisible();
  expect(screen.getByRole("button", { name: /print or save as pdf/i })).toBeVisible();
  expect(screen.getByRole("button", { name: /download json/i })).toBeVisible();
  expect(
    screen.queryByRole("checkbox", { name: /include structured raw answers/i }),
  ).not.toBeInTheDocument();
});

test("children under 13 receive general information and guardian routing only", () => {
  render(
    <Results
      answers={F1_ANSWERS}
      assessmentDepth="deep"
      confirmedLabs={[confirmedLab]}
      profile={{ age: 12, countryCode: "CH", assistedMinor: true }}
      onRestart={vi.fn()}
    />,
  );

  expect(
    screen.getByRole("heading", { name: /guide for you and your adult helper/i }),
  ).toBeVisible();
  expect(screen.getByText(/parent, guardian, or trusted adult/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(
    /purity score|my health habits map|\b\d+\s*\/\s*100\b|\bpoints?\b|\bgrade\b/i,
  );
  expect(screen.queryByRole("navigation", { name: /health signal pillars/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: /confirmed lab context/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /print or save as pdf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /download json/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /restart and clear/i })).toBeVisible();
});

test("confirmed labs are shown only as user-reviewed context without classification or source metadata", () => {
  render(
    <Results
      answers={F1_ANSWERS}
      assessmentDepth="deep"
      confirmedLabs={[confirmedLab]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const labs = screen.getByRole("region", { name: /confirmed lab context/i });
  expect(labs).toHaveTextContent(/HbA1c/i);
  expect(labs).toHaveTextContent("5.7 %");
  expect(labs).toHaveTextContent("4.0–5.6");
  expect(labs).toHaveTextContent("2026-07-30");
  expect(labs.textContent).not.toMatch(
    /normal|abnormal|high|low|diagnosis|deficient|SECRET|Private report name/i,
  );
});

test("print, explicit raw JSON opt-in, and restart are separate local controls", async () => {
  const user = userEvent.setup();
  const onRestart = vi.fn();
  const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
  const blobs: Blob[] = [];
  const createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob);
    return `blob:report-${blobs.length}`;
  });
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);

  render(
    <Results
      answers={{ ...F1_ANSWERS, gender_identity_optional: "SECRET FREE TEXT" }}
      assessmentDepth="deep"
      confirmedLabs={[confirmedLab]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={onRestart}
    />,
  );

  await user.click(screen.getByRole("button", { name: /print or save as pdf/i }));
  expect(print).toHaveBeenCalledOnce();

  const rawToggle = screen.getByRole("checkbox", {
    name: /include structured raw answers in json/i,
  });
  expect(rawToggle).not.toBeChecked();
  await user.click(screen.getByRole("button", { name: /download json/i }));
  expect(await readBlob(blobs[0])).not.toHaveProperty("rawAnswers");

  await user.click(rawToggle);
  await user.click(screen.getByRole("button", { name: /download json/i }));
  const raw = await readBlob(blobs[1]);
  expect(raw).toHaveProperty("rawAnswers");
  expect(JSON.stringify(raw)).not.toMatch(/SECRET FREE TEXT|SECRET RAW LAB LINE|Private report name/i);
  expect(createObjectURL).toHaveBeenCalledTimes(2);
  expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(click).toHaveBeenCalledTimes(2);

  await user.click(screen.getByRole("button", { name: /restart from the beginning/i }));
  expect(onRestart).toHaveBeenCalledOnce();
});

test("page completion hands depth into Results and restart clears the in-memory journey", async () => {
  const user = userEvent.setup();
  testingRender(<Home />);
  await user.click(screen.getByRole("button", { name: /choose quick/i }));
  await user.type(screen.getByLabelText(/how old are you/i), "35");
  await user.selectOptions(screen.getByLabelText(/country or region/i), "CH");
  await user.click(
    screen.getByRole("checkbox", { name: /i understand and want to continue/i }),
  );
  await user.click(screen.getByRole("button", { name: /start quick/i }));

  for (let answered = 0; answered < 20; answered += 1) {
    const intermission = screen.queryByRole("button", { name: /continue assessment/i });
    if (intermission) await user.click(intermission);
    await user.click(screen.getByRole("button", { name: /prefer not to say/i }));
  }

  expect(screen.getByRole("heading", { name: /wellness habits reflection/i })).toBeVisible();
  expect(screen.getByText(/Quick assessment/i)).toBeVisible();
  await user.click(screen.getByRole("button", { name: /restart from the beginning/i }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("id", "landing-title");
  expect(screen.queryByRole("region", { name: /wellness habits reflection/i })).not.toBeInTheDocument();
});

test("renders the complete adult result presentation in French while preserving clinical machine data", async () => {
  const user = userEvent.setup();
  renderLocalizedResults({
    answers: {
      ...F1_ANSWERS,
      urgent_chest_discomfort_now: true,
      preventive_followup_action: "access_or_safety_barrier",
      med_detail_prescriber_followup: "no_current_access",
    },
    assessmentDepth: "deep",
    confirmedLabs: [confirmedLab],
    profile: { age: 35, countryCode: "CH" },
  });

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(
    screen.getByRole("heading", {
      name: "Votre santé, en perspective.",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", {
      name: "Purity Score — habitudes de bien-être, pas un verdict sur la santé.",
    }),
  ).toBeVisible();
  expect(within(screen.getByRole("region", { name: "Vos habitudes, domaine par domaine" }))
    .getByText("Habitudes alimentaires")).toBeVisible();
  const scoreReadout = screen.getByText(/\d+ \/ 100 ·/);
  expect(scoreReadout).toBeVisible();
  expect(scoreReadout.textContent).toMatch(
    /^\d+ \/ 100 · \d+\u202f% de couverture des réponses$/,
  );
  const categoryReadouts = screen.getAllByText(/\d+ points sur \d+ évalués/);
  expect(
    categoryReadouts.some((readout) =>
      /\d+ points sur \d+ évalués · \d+\u202f% des composantes couvertes/.test(
        readout.textContent ?? "",
      ),
    ),
  ).toBe(true);
  expect(screen.getByRole("alert")).toHaveTextContent(/appelez maintenant le 144/i);
  expect(
    screen.getByRole("heading", { name: "Actions que vous pouvez choisir" }),
  ).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Contexte de laboratoire confirmé" }),
  ).toHaveTextContent("5.7 %");
  expect(
    screen.getByRole("region", { name: "Contexte de laboratoire confirmé" }),
  ).toHaveTextContent("4.0–5.6");
  expect(screen.getByRole("button", { name: "Télécharger le JSON" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Recommencer depuis le début" })).toBeVisible();
  expect(document.body.textContent).not.toMatch(
    /Your personal summary|Versioned habit ledger|Actions you can choose|Confirmed lab context|Keep or clear these results/i,
  );
});

test("keeps the selected evidence leaf and raw-answer choice while exporting equivalent localized JSON", async () => {
  const user = userEvent.setup();
  const blobs: Blob[] = [];
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:localized-report-${blobs.length}`;
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });

  renderLocalizedResults({
    answers: {
      ...F1_ANSWERS,
      urgent_chest_discomfort_now: true,
      urgent_breathing_now: true,
      preventive_followup_action: "access_or_safety_barrier",
      med_detail_prescriber_followup: "no_current_access",
    },
    assessmentDepth: "deep",
    confirmedLabs: [confirmedLab],
    profile: { age: 35, countryCode: "CH" },
  });

  const rawToggle = screen.getByRole("checkbox", {
    name: /include structured raw answers in json/i,
  });
  await user.click(rawToggle);
  const canopy = screen.getByRole("navigation", { name: /health signal pillars/i });
  const leafButtons = within(canopy).getAllByRole("button");
  const selected = leafButtons.at(-1);
  expect(selected).toBeDefined();
  if (!selected) return;
  await user.click(selected);
  const selectedTitle = selected.querySelector(".risk-tree__leaf-title")?.textContent;
  expect(selectedTitle).toBeTruthy();
  if (!selectedTitle) return;
  const selectedPanelId = screen.getByRole("region", { name: selectedTitle }).id;

  await user.click(screen.getByRole("button", { name: "Download JSON" }));
  const english = await readBlob(blobs[0]);
  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(rawToggle).toBeChecked();
  expect(selected).toHaveAttribute("aria-pressed", "true");
  expect(document.getElementById(selectedPanelId)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Télécharger le JSON" }));
  const french = await readBlob(blobs[1]);

  expect(downloads).toEqual([
    "health-risk-explorer-report.json",
    "rapport-explorateur-risques-sante.json",
  ]);
  expect(french).toMatchObject({
    schemaVersion: english.schemaVersion,
    assessmentDepth: english.assessmentDepth,
    score: {
      kind: (english.score as Record<string, unknown>).kind,
      score: (english.score as Record<string, unknown>).score,
      coverage: (english.score as Record<string, unknown>).coverage,
      label: "Purity Score — habitudes de bien-être, pas un verdict sur la santé.",
    },
    rawAnswers: english.rawAnswers,
  });
  const englishLeaves = english.riskLeaves as Array<Record<string, unknown>>;
  const frenchLeaves = french.riskLeaves as Array<Record<string, unknown>>;
  expect(frenchLeaves.map(({ id, ruleId }) => ({ id, ruleId }))).toEqual(
    englishLeaves.map(({ id, ruleId }) => ({ id, ruleId })),
  );
  expect(frenchLeaves[0].sources).toEqual(englishLeaves[0].sources);
  expect(frenchLeaves[0].title).not.toBe(englishLeaves[0].title);
  expect((french.actions as Array<Record<string, unknown>>)[0].title).not.toBe(
    (english.actions as Array<Record<string, unknown>>)[0].title,
  );
});

test("localizes adolescent, assisted-handoff, and child result routes without exposing adult scoring", async () => {
  const user = userEvent.setup();
  const adolescent = renderLocalizedResults({
    answers: {
      adolescent_nicotine_support: "find_service",
      reliable_social_support: true,
      stress_recovery_practice: "rarely",
    },
    assessmentDepth: "detailed",
    confirmedLabs: [],
    profile: { age: 15, countryCode: "CH" },
  });
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("heading", { name: "Ma carte des habitudes de santé" })).toBeVisible();
  expect(screen.getByText(/trouver un service concernant la nicotine ou le tabac/i)).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Purity Score|mapped points|adult comparison/i);
  adolescent.unmount();

  const assisted = renderLocalizedResults({
    answers: { adolescent_pregnancy_support: "find_service" },
    assessmentDepth: "detailed",
    confirmedLabs: [confirmedLab],
    profile: { age: 15, countryCode: "CH", assistedMinor: true },
  });
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("heading", { name: "Vos résultats privés sont prêts" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: /piliers de signaux de santé/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Afficher mes résultats privés" }));
  expect(screen.getByRole("heading", { name: "Quatre piliers de santé que vous pouvez examiner." }))
    .toHaveFocus();
  expect(screen.getByRole("heading", { name: "Ma carte des habitudes de santé" })).toBeVisible();
  assisted.unmount();

  renderLocalizedResults({
    answers: F1_ANSWERS,
    assessmentDepth: "deep",
    confirmedLabs: [confirmedLab],
    profile: { age: 12, countryCode: "CH", assistedMinor: true },
  });
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(
    screen.getByRole("heading", { name: "Un guide pour vous et l'adulte qui vous accompagne" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Recommencer et effacer" })).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Purity Score|Ma carte des habitudes de santé/);
});

test.each([
  [
    "Swiss poisoning",
    "CH",
    { urgent_overdose_poisoning_now: true },
    /144[\s\S]*145/,
  ],
  [
    "US self-harm",
    "US",
    { urgent_self_harm_now: true },
    /911[\s\S]*988/,
  ],
  [
    "GB emergency",
    "GB",
    { urgent_chest_discomfort_now: true },
    /999/,
  ],
  [
    "other-country emergency",
    "OTHER",
    { urgent_severe_bleeding_now: true },
    /service d'urgence local/i,
  ],
] as const)("renders the French %s route with only its applicable urgent instructions", async (
  _route,
  countryCode,
  urgentAnswer,
  expected,
) => {
  const user = userEvent.setup();
  renderLocalizedResults({
    answers: urgentAnswer,
    assessmentDepth: "quick",
    confirmedLabs: [],
    profile: { age: 35, countryCode },
  });

  await user.click(screen.getByRole("button", { name: "Français" }));

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent(expected);
  expect(alert.textContent).not.toMatch(/Call .* now|Seek emergency care/i);
});

test("does not rerun risk, score, or action engines when only the result locale changes", async () => {
  const user = userEvent.setup();
  const evaluate = vi.spyOn(riskEngineModule, "evaluateRisks");
  const calculate = vi.spyOn(scoringModule, "calculatePurityScore");
  const buildActions = vi.spyOn(scoringModule, "buildActionPlan");
  renderLocalizedResults({
    answers: { ...F1_ANSWERS, urgent_chest_discomfort_now: true },
    assessmentDepth: "deep",
    confirmedLabs: [],
    profile: { age: 35, countryCode: "CH" },
  });
  const callsBeforeSwitch = {
    evaluate: evaluate.mock.calls.length,
    calculate: calculate.mock.calls.length,
    buildActions: buildActions.mock.calls.length,
  };
  expect(callsBeforeSwitch.evaluate).toBeGreaterThan(0);
  expect(callsBeforeSwitch.calculate).toBeGreaterThan(0);
  expect(callsBeforeSwitch.buildActions).toBeGreaterThan(0);

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(evaluate).toHaveBeenCalledTimes(callsBeforeSwitch.evaluate);
  expect(calculate).toHaveBeenCalledTimes(callsBeforeSwitch.calculate);
  expect(buildActions).toHaveBeenCalledTimes(callsBeforeSwitch.buildActions);
  evaluate.mockRestore();
  calculate.mockRestore();
  buildActions.mockRestore();
});

test("puts urgent instructions before the overview with its score, followed by priorities and evidence", () => {
  render(
    <Results
      answers={{ ...F1_ANSWERS, usual_sleep_hours: 4, urgent_chest_discomfort_now: true }}
      assessmentDepth="deep"
      confirmedLabs={[]}
      profile={{ age: 35, countryCode: "CH" }}
      onRestart={vi.fn()}
    />,
  );

  const orderedSections = [
    screen.getByRole("alert", { name: "Act on these immediate signals now" }),
    screen.getByRole("region", { name: "Your results at a glance" }),
    screen.getByRole("region", { name: "Your habits score" }),
    screen.getByRole("heading", { name: /actions you can choose/i }).closest("section")!,
    screen.getByRole("region", { name: "Four health pillars you can inspect." }),
  ];
  for (let index = 1; index < orderedSections.length; index += 1) {
    expect(orderedSections[index - 1].compareDocumentPosition(orderedSections[index])
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(screen.queryByRole("heading", { name: /longevity synthesis/i })).not.toBeInTheDocument();
  expect(document.querySelector(".longevity")).not.toBeInTheDocument();
});

test("focuses the result title on arrival and only links to accessible report sections", async () => {
  const user = userEvent.setup();
  renderLocalizedResults({
    answers: F1_ANSWERS,
    assessmentDepth: "deep",
    confirmedLabs: [],
    profile: { age: 35, countryCode: "CH" },
  });
  expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  const navigation = screen.getByRole("navigation", { name: "Explore your results" });
  for (const link of within(navigation).getAllByRole("link")) {
    expect(document.querySelector(link.getAttribute("href")!)).toBeVisible();
  }
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("button", { name: "Français" })).toHaveFocus();
  expect(screen.getByRole("navigation", { name: "Explorer vos résultats" })).toHaveTextContent("Synthèse");
  expect(screen.getByRole("region", { name: "Votre score d’habitudes" })).toHaveTextContent("Cette échelle ne vous compare pas à une population");
});

test("Quick explains the unavailable reference without assigning a score or drawing a population curve", () => {
  render(<Results answers={F1_ANSWERS} assessmentDepth="quick" confirmedLabs={[]}
    profile={{ age: 35, countryCode: "CH" }} onRestart={vi.fn()} />);
  const reference = screen.getByRole("region", { name: "Your habits score" });
  expect(reference).toHaveTextContent(/Quick does not calculate a global habits score/i);
  expect(within(reference).queryByRole("img")).not.toBeInTheDocument();
  expect(within(reference).queryByText("Your score")).not.toBeInTheDocument();
});

test("private adolescent handoff reveals no adult overview, reference, or inaccessible anchors", async () => {
  const user = userEvent.setup();
  render(<Results answers={F1_ANSWERS} assessmentDepth="detailed" confirmedLabs={[]}
    profile={{ age: 15, countryCode: "CH", assistedMinor: true }} onRestart={vi.fn()} />);
  expect(screen.queryByRole("navigation", { name: "Explore your results" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Your results at a glance" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Your habits score" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /show my private results/i }));
  expect(screen.queryByRole("region", { name: "Your habits score" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Four health pillars you can inspect." })).toHaveFocus();
});
