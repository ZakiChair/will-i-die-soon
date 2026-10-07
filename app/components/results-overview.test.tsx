import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider, useI18n } from "../i18n/context";
import { localizeEssentialEight } from "../i18n/presentation";
import { calculateEssentialEight, type EssentialEightResult } from "../lib/scoring";
import type { AnswerMap, RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { ResultsOverview } from "./results-overview";

/** Six of the eight metrics at their top band; lipids and glucose need confirmed labs. */
const completeAnswers: AnswerMap = {
  plant_food_frequency: 5, diet_whole_grains: "daily", diet_legumes: 3,
  diet_processed_meat: "never", diet_sugary_drinks: 0,
  weekly_moderate_activity_minutes: 150,
  current_tobacco_nicotine: false, smoking_history_former: false, secondhand_smoke_home: false,
  usual_sleep_hours: 7.5, height_cm: 175, weight_kg: 70,
  diagnosed_conditions_core: ["none"],
  blood_pressure_systolic: 115, blood_pressure_diastolic: 75, bp_medication_current: false,
};

function leaf(urgency: RiskLeaf["urgency"]): RiskLeaf {
  return {
    id: urgency, ruleId: "urgent-chest", rulesetVersion: "v1", group: "preventive-follow-up",
    title: "A priority from your answers", copy: "Read the applicable guidance.",
    urgency, evidenceTier: "guideline-action", signal: "worth-attention",
    factors: [], missingInputs: [], sources: [], applicability: { countries: "all" },
  };
}

function LocalizedOverview({ score, leaves = [] }: { score: EssentialEightResult; leaves?: RiskLeaf[] }) {
  const { locale } = useI18n();
  return <ResultsOverview score={localizeEssentialEight(score, locale)} leaves={leaves} protectiveRoots={[]} />;
}

function show(score: EssentialEightResult, leaves: RiskLeaf[] = []) {
  return render(<I18nProvider><LanguageSwitcher /><LocalizedOverview score={score} leaves={leaves} /></I18nProvider>);
}

test.each([
  { urgency: "urgent" as const, status: "urgent", title: /An urgent signal comes first/i },
  { urgency: "prompt-review" as const, status: "review", title: /A follow-up needs attention/i },
])("prioritizes $urgency over a perfect Life's Essential 8 score", ({ urgency, status, title }) => {
  const score = calculateEssentialEight(completeAnswers, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score, [leaf(urgency)]);
  const statusPanel = container.querySelector<HTMLElement>(".results-overview__status")!;
  expect(statusPanel).toHaveAttribute("data-status", status);
  expect(within(statusPanel).getByRole("heading", { name: title })).toBeVisible();
  expect(statusPanel).toHaveTextContent("A priority from your answers");
  expect(statusPanel).toHaveTextContent(/Life's Essential 8 score/);
  expect(statusPanel.compareDocumentPosition(container.querySelector("#score-distribution")!)
    & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(container.querySelector<HTMLElement>("#score-distribution")!).getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  expect(within(statusPanel).queryByText(/All assessed metrics are in the top/)).not.toBeInTheDocument();
});

test("compares all eight metrics using published points and exposes partial coverage", () => {
  const score = calculateEssentialEight({
    ...completeAnswers, usual_sleep_hours: 4, diet_legumes: null,
  }, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score);
  const chart = screen.getByRole("region", { name: "Your eight metrics, one by one" });
  expect(within(chart).getAllByRole("listitem")).toHaveLength(8);
  const diet = chart.querySelector<HTMLElement>('[data-domain="diet"]')!;
  expect(diet).toHaveAttribute("data-state", "missing");
  expect(diet).toHaveTextContent("Not yet assessed");
  expect(within(diet).queryByRole("meter")).not.toBeInTheDocument();
  const sleep = chart.querySelector<HTMLElement>('[data-domain="sleep"]')!;
  expect(within(sleep).getByRole("meter")).toHaveAttribute("aria-valuenow", "20");
  expect(sleep).toHaveTextContent(/20 of 100 points/);
  const lipids = chart.querySelector<HTMLElement>('[data-domain="blood-lipids"]')!;
  expect(lipids).toHaveTextContent("Not yet assessed");
  const status = container.querySelector(".results-overview__status")!;
  expect(status).toHaveTextContent(/A metric to strengthen/);
  expect(status).toHaveTextContent("Sleep health");
  expect(status).toHaveTextContent(/63% of the eight metrics assessed/);
  expect(status).toHaveTextContent(/Absence of a flagged signal is not a health assessment/);
});

test("shows metric coverage alone when scoring is gated", () => {
  const score = calculateEssentialEight({
    current_tobacco_nicotine: false, smoking_history_former: false, usual_sleep_hours: 7,
  }, { ageYears: 35, assessmentDepth: "deep" });
  show(score);
  const chart = screen.getByRole("region", { name: "What your answers cover" });
  expect(within(chart).queryByRole("meter")).not.toBeInTheDocument();
  expect(within(chart).getAllByRole("listitem")).toHaveLength(8);
  const nicotine = chart.querySelector<HTMLElement>('[data-domain="nicotine"]')!;
  expect(within(nicotine).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  const diet = chart.querySelector<HTMLElement>('[data-domain="diet"]')!;
  expect(diet).toHaveTextContent("Not yet assessed");
  expect(diet).not.toHaveTextContent("0 / 100");
  expect(within(diet).queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText(/of 100 points/)).not.toBeInTheDocument();
  expect(screen.queryByText(/A metric to strengthen/)).not.toBeInTheDocument();
  expect(screen.getByText(/There is no Life's Essential 8 score for this assessment/)).toBeVisible();
});

test("localizes the interpretation and bars without turning a perfect score into a health verdict", async () => {
  const user = userEvent.setup();
  const score = calculateEssentialEight(completeAnswers, { ageYears: 35, assessmentDepth: "deep" });
  show(score);
  expect(screen.getByText(/All assessed metrics are in the top Life's Essential 8 band/)).toBeVisible();
  expect(screen.getByText("This report predicts neither your death nor your life expectancy.")).toBeVisible();
  expect(screen.getByText(/75% of the eight metrics assessed/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("heading", { name: "Votre santé cardiovasculaire, en perspective" })).toBeVisible();
  expect(screen.getByText("Ce bilan ne prédit ni votre décès ni votre espérance de vie.")).toBeVisible();
  expect(screen.getByRole("region", { name: "Vos huit métriques, une par une" })).toHaveTextContent("Santé du sommeil");
  expect(screen.getByText(/Toutes les métriques évaluées se situent dans la tranche la plus élevée/)).toBeVisible();
});

test("keeps a useful reported topic visible in an incomplete overview without inventing a score", () => {
  const score = calculateEssentialEight({ usual_sleep_hours: 4 }, { ageYears: 35, assessmentDepth: "deep" });
  const { container } = show(score, [leaf("long-term")]);
  const status = container.querySelector<HTMLElement>(".results-overview__status")!;
  expect(status).toHaveTextContent("A priority from your answers");
  expect(status).toHaveTextContent("Read the applicable guidance.");
  expect(status).toHaveTextContent(/There is no Life's Essential 8 score/);
  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  expect(status).not.toHaveTextContent("Absence of a flagged signal");
});
