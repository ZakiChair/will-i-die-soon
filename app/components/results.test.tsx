import { render as testingRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { expect, test, vi } from "vitest";

import Home from "../page";
import { I18nProvider } from "../i18n/context";
import type { ConfirmedLabValue } from "../lib/labs";
import * as riskEngineModule from "../lib/risk-engine";
import * as scoringModule from "../lib/scoring";
import type { AnswerMap, RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { RiskTree } from "./risk-tree";
import { Results } from "./results";

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
  title: string,
  urgency: RiskLeaf["urgency"],
): RiskLeaf {
  return {
    id,
    ruleId: id,
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

test("the risk canopy is complete semantic navigation with an adjacent evidence panel", async () => {
  const user = userEvent.setup();
  render(
    <RiskTree
      leaves={[
        riskLeaf("urgent", "Immediate breathing signal", "urgent"),
        riskLeaf("review", "Follow-up conversation", "prompt-review"),
        riskLeaf("longer", "Longer-term sleep pattern", "long-term"),
      ]}
      protectiveRoots={["Reliable social support", "Morning light"]}
    />,
  );

  const navigation = screen.getByRole("navigation", { name: /living risk canopy/i });
  expect(within(navigation).getByText("You today")).toBeVisible();
  expect(within(navigation).getByText("Urgent signals")).toBeVisible();
  expect(within(navigation).getByText("Medical review")).toBeVisible();
  expect(within(navigation).getByText("Longer-term domains")).toBeVisible();
  expect(within(navigation).getByText("Protective roots")).toBeVisible();
  expect(within(navigation).getAllByRole("list").length).toBeGreaterThanOrEqual(5);

  const reviewButton = within(navigation).getByRole("button", {
    name: "Follow-up conversation",
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

test("a merged support action renders every applicable reason and source link", () => {
  render(
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
  expect(screen.getByText(/100% answer coverage/i)).toBeVisible();
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
  await user.click(screen.getByText("Nutrition pattern"));
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
  expect(screen.queryByRole("navigation", { name: /living risk canopy/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "My Health Habits Map" })).not.toBeInTheDocument();
  expect(screen.queryByText(/pregnancy-related health service/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: /confirmed lab context/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /print or save as pdf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /download json/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /show my private results/i }));

  expect(
    screen.getByRole("heading", { name: /a living canopy you can inspect/i }),
  ).toHaveFocus();
  expect(screen.getByRole("navigation", { name: /living risk canopy/i })).toBeVisible();
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
  expect(screen.queryByRole("navigation", { name: /living risk canopy/i })).not.toBeInTheDocument();
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
  expect(
    screen.getByRole("heading", { name: /your health is not a verdict.*it is a map/i }),
  ).toBeVisible();
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
      name: "Votre carte de santé, avec les raisons associées.",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", {
      name: "Purity Score — habitudes de bien-être, pas un verdict sur la santé.",
    }),
  ).toBeVisible();
  expect(screen.getByText("Habitudes alimentaires")).toBeVisible();
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
    /Your field notes|Versioned habit ledger|Actions you can choose|Confirmed lab context|Keep or clear these results/i,
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
  const canopy = screen.getByRole("navigation", { name: /living risk canopy/i });
  const leafButtons = within(canopy).getAllByRole("button");
  const selected = leafButtons.at(-1);
  expect(selected).toBeDefined();
  if (!selected) return;
  await user.click(selected);
  const selectedPanelId = screen.getByRole("region", { name: selected.textContent ?? "" }).id;

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
  expect(screen.queryByRole("navigation", { name: /canopée vivante/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Afficher mes résultats privés" }));
  expect(screen.getByRole("heading", { name: "Une canopée vivante que vous pouvez examiner." }))
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
