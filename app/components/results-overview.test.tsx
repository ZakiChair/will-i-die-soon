import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider, useI18n } from "../i18n/context";
import { localizePurityScore } from "../i18n/presentation";
import { calculatePurityScore, type PurityScoreResult } from "../lib/scoring";
import type { AnswerMap, RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { ResultsOverview } from "./results-overview";

const completeAnswers: AnswerMap = {
  current_tobacco_nicotine: false, alcohol_frequency: "never",
  weekly_moderate_activity_minutes: 300, movement_strength_days: 2,
  movement_walking_days: 5, sedentary_total_hours: 4,
  plant_food_frequency: 5, diet_whole_grains: "daily", diet_legumes: 3,
  diet_processed_meat: "never", diet_sugary_drinks: 0,
  usual_sleep_hours: 7, sleep_refreshed: 9, circadian_bedtime_variation: 1,
  stress_recovery_practice: "daily", preventive_followup_status: "yes",
  preventive_followup_action: "completed", current_medications: true,
  med_detail_prescriber_followup: "yes_all", adherence_missed_doses: "never",
  adherence_access_barriers: ["none"], interaction_shared_list: true,
};

function leaf(urgency: RiskLeaf["urgency"]): RiskLeaf {
  return {
    id: urgency, ruleId: "urgent-chest", rulesetVersion: "v1", group: "preventive-follow-up",
    title: "A priority from your answers", copy: "Read the applicable guidance.",
    urgency, evidenceTier: "guideline-action", signal: "worth-attention",
    factors: [], missingInputs: [], sources: [], applicability: { countries: "all" },
  };
}

function LocalizedOverview({ score, leaves = [] }: { score: PurityScoreResult; leaves?: RiskLeaf[] }) {
  const { locale } = useI18n();
  return <ResultsOverview score={localizePurityScore(score, locale)} leaves={leaves} protectiveRoots={[]} />;
}

function show(score: PurityScoreResult, leaves: RiskLeaf[] = []) {
  return render(<I18nProvider><LanguageSwitcher /><LocalizedOverview score={score} leaves={leaves} /></I18nProvider>);
}

test.each([
  { urgency: "urgent" as const, status: "urgent", title: /An urgent signal comes first/i },
  { urgency: "prompt-review" as const, status: "review", title: /A follow-up needs attention/i },
])("prioritizes $urgency over a perfect habits score", ({ urgency, status, title }) => {
  const score = calculatePurityScore(completeAnswers, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score, [leaf(urgency)]);
  const statusPanel = container.querySelector<HTMLElement>(".results-overview__status")!;
  expect(statusPanel).toHaveAttribute("data-status", status);
  expect(within(statusPanel).getByRole("heading", { name: title })).toBeVisible();
  expect(statusPanel).toHaveTextContent("A priority from your answers");
  expect(statusPanel.compareDocumentPosition(container.querySelector("#score-distribution")!)
    & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(container.querySelector<HTMLElement>("#score-distribution")!).getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  expect(within(statusPanel).queryByText(/All documented habits meet/)).not.toBeInTheDocument();
});

test("compares all eight adult domains using assessed points and exposes partial coverage", () => {
  const score = calculatePurityScore({
    ...completeAnswers, usual_sleep_hours: 4,
    diet_whole_grains: null, diet_legumes: null, diet_processed_meat: null, diet_sugary_drinks: null,
  }, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score);
  const chart = screen.getByRole("region", { name: "Your habits, domain by domain" });
  expect(within(chart).getAllByRole("listitem")).toHaveLength(8);
  const nutrition = chart.querySelector<HTMLElement>('[data-domain="nutrition"]')!;
  expect(within(nutrition).getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  expect(nutrition).toHaveTextContent(/6 of 6 assessed points/);
  expect(nutrition).toHaveTextContent(/33% answer coverage/);
  const sleep = chart.querySelector<HTMLElement>('[data-domain="sleep"]')!;
  expect(within(sleep).getByRole("meter")).toHaveAttribute("aria-valuenow", "58.3");
  const status = container.querySelector(".results-overview__status")!;
  expect(status).toHaveTextContent(/A domain to strengthen/);
  expect(status).toHaveTextContent("Sleep routine");
  expect(status).toHaveTextContent(/Absence of a flagged signal is not a health assessment/);
});

test("shows answer coverage alone when scoring is gated, separating missing and excluded domains", () => {
  const score = calculatePurityScore({
    current_tobacco_nicotine: false, alcohol_frequency: "never",
    current_medications: false, plant_food_frequency: 2,
  }, { ageYears: 35, assessmentDepth: "deep" });
  show(score);
  const chart = screen.getByRole("region", { name: "What your answers cover" });
  expect(within(chart).queryByRole("meter")).not.toBeInTheDocument();
  const nutrition = chart.querySelector<HTMLElement>('[data-domain="nutrition"]')!;
  expect(within(nutrition).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  const medication = chart.querySelector<HTMLElement>('[data-domain="medication-safety"]')!;
  expect(medication).toHaveTextContent("Not applicable");
  expect(within(medication).queryByRole("progressbar")).not.toBeInTheDocument();
  const sleep = chart.querySelector<HTMLElement>('[data-domain="sleep"]')!;
  expect(sleep).toHaveTextContent("Not yet answered");
  expect(sleep).not.toHaveTextContent("0 / 100");
  expect(screen.queryByText(/assessed points/)).not.toBeInTheDocument();
  expect(screen.queryByText(/A domain to strengthen/)).not.toBeInTheDocument();
});

test("localizes the interpretation and bars without turning a perfect score into a health verdict", async () => {
  const user = userEvent.setup();
  const score = calculatePurityScore(completeAnswers, { ageYears: 35, assessmentDepth: "deep" });
  show(score);
  expect(screen.getByText(/All documented habits meet the questionnaire benchmarks/)).toBeVisible();
  expect(screen.getByText("This report predicts neither your death nor your life expectancy.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("heading", { name: "Vos habitudes, en perspective" })).toBeVisible();
  expect(screen.getByText("Ce bilan ne prédit ni votre décès ni votre espérance de vie.")).toBeVisible();
  expect(screen.getByRole("region", { name: "Vos habitudes, domaine par domaine" })).toHaveTextContent("Routine de sommeil");
  expect(screen.getByText(/Les habitudes renseignées atteignent les repères du questionnaire/)).toBeVisible();
});

test("keeps a useful reported topic visible in an incomplete overview without inventing a score", () => {
  const score = calculatePurityScore({ usual_sleep_hours: 4 }, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score, [leaf("long-term")]);
  const status = container.querySelector<HTMLElement>(".results-overview__status")!;
  expect(status).toHaveTextContent("A priority from your answers");
  expect(status).toHaveTextContent("Read the applicable guidance.");
  expect(status).toHaveTextContent(/There is no global habits score/);
  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  expect(status).not.toHaveTextContent("Absence of a flagged signal");
});
