import { act, render as testingRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import type { AnswerMap } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { ExpressResults } from "./express-results";

const completeAnswers: AnswerMap = {
  reported_vo2_max_ml_kg_min: 48.5,
  squat_one_rep_max_kg: 123,
  deadlift_one_rep_max_kg: 181,
  usual_sleep_hours: 7.5,
  sleep_refreshed: 8,
  height_cm: 182,
  weight_kg: 80,
  plant_food_frequency: 4,
  diet_ultra_processed: "rarely",
};

function renderExpressResults(answers: AnswerMap = completeAnswers, ageYears = 35) {
  return testingRender(
    <I18nProvider>
      <LanguageSwitcher />
      <ExpressResults answers={answers} ageYears={ageYears} />
    </I18nProvider>,
  );
}

test.each([
  { name: "complet", answers: completeAnswers, score: 92 },
  { name: "provisoire", answers: { ...completeAnswers, reported_vo2_max_ml_kg_min: null }, score: 90 },
  { name: "zéro mesuré", answers: { usual_sleep_hours: 0, sleep_refreshed: 0, plant_food_frequency: 0, diet_ultra_processed: "daily" }, score: 0 },
  { name: "maximum mesuré", answers: { usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5, diet_ultra_processed: "never" }, score: 100 },
])("place l’indice $name sur une échelle globale accessible", ({ answers, score }) => {
  renderExpressResults(answers);
  const scale = screen.getByRole("meter", { name: "Overall Express index position" });

  expect(scale).toHaveAttribute("aria-valuemin", "0");
  expect(scale).toHaveAttribute("aria-valuemax", "100");
  expect(scale).toHaveAttribute("aria-valuenow", String(score));
  expect(scale).toHaveAccessibleDescription(/fixed index references.*age.*sex/i);
  expect(scale.querySelector(".express-profile__scale-fill")).toHaveStyle({ width: `${score}%` });
  expect(scale.querySelector(".express-profile__scale-marker")).toHaveStyle({ left: `${score}%` });
  expect(screen.getByText("Habits to strengthen")).toBeVisible();
  expect(screen.getByText("Index references reached")).toBeVisible();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

test.each([{}, { usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5 }])(
  "n’invente pas de position globale lorsque les composantes sont insuffisantes",
  (answers) => {
    renderExpressResults(answers);
    expect(screen.queryByRole("meter", { name: "Overall Express index position" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Express index · fitness and habits")).not.toBeInTheDocument();
  },
);

test("renders the Express index, four scored axes, raw measurements and a complete compass", () => {
  const { container } = renderExpressResults();

  const section = container.querySelector<HTMLElement>(".express-results");
  const heading = section?.querySelector<HTMLElement>(".express-results__heading");
  const grid = section?.querySelector<HTMLElement>(".express-results__grid");
  expect(section).not.toHaveAttribute("data-reveal");
  expect(heading).toHaveAttribute("data-reveal", "heading");
  expect(grid).toHaveAttribute("data-reveal", "group");
  expect(heading?.parentElement).toBe(section);
  expect(grid?.parentElement).toBe(section);
  expect(heading?.querySelector("[data-reveal]")).toBeNull();
  expect(grid?.querySelector("[data-reveal]")).toBeNull();
  expect(heading?.querySelectorAll(":scope > [data-reveal-item]")).toHaveLength(3);
  expect(grid?.querySelectorAll(":scope > [data-reveal-item]")).toHaveLength(4);
  expect(screen.getByRole("heading", { name: "Your Express profile" })).toBeVisible();
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(screen.getByRole("heading", { name: "Cardio" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Strength" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Sleep" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  expect(screen.getByText("1.54 × body weight")).toBeVisible();
  expect(screen.getByText("2.26 × body weight")).toBeVisible();
  expect(screen.getByText("48.5 ml/kg/min")).not.toHaveAttribute("data-count-from");
  expect(screen.getByLabelText("Express index · fitness and habits")).toHaveTextContent("92 / 100");
  expect(screen.getByText("Complete profile")).toBeVisible();
  expect(screen.getByText(/7 \/ 7 components · 9 \/ 9 answers/)).toBeVisible();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass).toHaveAccessibleDescription(/Cardio: 97.*Strength: 100.*Sleep: 90.*Nutrition: 80/);
  expect(compass.querySelector(".express-compass__shape")).toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(4);
  expect(document.body.textContent).not.toMatch(/BMI|percentile|life expectancy|elite/i);
});

test("localizes the Express snapshot in French", async () => {
  const user = userEvent.setup();
  renderExpressResults();

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("heading", { name: "Votre bilan Express" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Cardio" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Force" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Sommeil" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Alimentation" })).toBeVisible();
  expect(screen.getByText("1,54 × le poids corporel")).toBeVisible();
  expect(screen.getByText("2,26 × le poids corporel")).toBeVisible();
  expect(screen.getByLabelText("Indice Express · forme et habitudes")).toHaveTextContent("92 / 100");
  expect(screen.getByRole("meter", { name: "Position de l’indice Express global" })).toHaveAttribute("aria-valuenow", "92");
  expect(screen.getByText("Habitudes à renforcer")).toBeVisible();
  expect(screen.getByText("Repères de l’indice atteints")).toBeVisible();
  expect(screen.getByRole("button", { name: "Français" })).toHaveFocus();
});

test("shows localized missing values without inventing zeroes", () => {
  renderExpressResults({
    reported_vo2_max_ml_kg_min: null,
    squat_one_rep_max_kg: null,
    deadlift_one_rep_max_kg: null,
    usual_sleep_hours: null,
    sleep_refreshed: null,
    height_cm: null,
    weight_kg: null,
    plant_food_frequency: null,
    diet_ultra_processed: null,
  });

  expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  for (const card of screen.getAllByRole("article")) {
    expect(card.textContent).not.toMatch(/\b0 kg|\b0 ml\/kg\/min/);
  }
  expect(screen.getByText("Profile incomplete")).toBeVisible();
  expect(screen.queryByLabelText("Express index · fitness and habits")).not.toBeInTheDocument();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass.querySelector(".express-compass__shape")).not.toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(0);
});

test("a partial profile marks only known axes and never invents a zero for the missing cardio axis", () => {
  const { container } = renderExpressResults({ ...completeAnswers, reported_vo2_max_ml_kg_min: null });
  expect(screen.getByText("Provisional index")).toBeVisible();
  expect(screen.getByText(/6 \/ 7 components · 8 \/ 9 answers/)).toBeVisible();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass).toHaveAccessibleDescription(/Cardio: Not provided/);
  expect(compass.querySelector(".express-compass__shape")).not.toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(3);
  expect(compass.querySelector('.express-compass__point[data-axis="cardio"]')).not.toBeInTheDocument();
  expect(container.querySelector('.express-compass__label[data-axis="cardio"]')).toHaveTextContent("Not provided");
});

test("sleep and food concerns lead the portrait and priorities even when sports scores are high", () => {
  const { container } = renderExpressResults({ ...completeAnswers, usual_sleep_hours: 5, sleep_refreshed: 2, plant_food_frequency: 1, diet_ultra_processed: "daily" });
  const portrait = container.querySelector(".express-profile__portrait");
  expect(portrait).toHaveTextContent(/Sleep.*Nutrition/);
  expect(portrait).toHaveTextContent(/Cardio.*Strength/);
  const priorities = screen.getByRole("region", { name: "Your next priorities" });
  expect(within(priorities).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(/sleep/i);
  expect(priorities.querySelectorAll(".express-priority")).toHaveLength(3);
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(container.querySelector('.express-result-card[data-axis="sleep"]')).toHaveAttribute("data-status", "attention");
  expect(container.querySelector('.express-result-card[data-axis="nutrition"]')).toHaveAttribute("data-status", "attention");
});

test.each([17, -1, 121, NaN, Infinity])("withholds the adult Express interpretation for age %s", (ageYears) => {
  renderExpressResults(completeAnswers, ageYears);
  expect(screen.queryByLabelText("Express index · fitness and habits")).not.toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "Your four-axis compass" })).not.toBeInTheDocument();
  expect(screen.getByText(/available for adults with a valid age/i)).toBeVisible();
});

test("keeps the fixed references and missing-data method explicit and links only to supporting guidance", async () => {
  const user = userEvent.setup();
  const { container } = renderExpressResults();
  expect(screen.getByText(/Cardio and strength: fixed reading references/i)).toBeVisible();
  expect(screen.getByText("Dashed reference: 75 / 100")).toBeVisible();
  await user.click(screen.getByText("How this Express index is built"));
  const method = container.querySelector("#express-method");
  expect(method).toHaveTextContent(/equal weight/i);
  expect(method).toHaveTextContent(/at least two axes and four components/i);
  expect(method).toHaveTextContent(/25 points per hour/i);
  for (const title of ["CDC · About sleep", "WHO · Healthy diet"]) {
    expect(screen.getByRole("link", { name: title })).toHaveAttribute("rel", "noreferrer");
  }
});

test("selects axes by click, persistent hover and keyboard focus while keeping the original readings", async () => {
  const user = userEvent.setup();
  renderExpressResults();
  const controls = screen.getByRole("group", { name: "Explore the four axes" });
  const buttons = within(controls).getAllByRole("button");
  expect(buttons).toHaveLength(4);
  expect(buttons[0]).toHaveAttribute("aria-pressed", "true");

  await user.click(within(controls).getByRole("button", { name: /Sleep/ }));
  const sleepPanel = screen.getByRole("region", { name: "Sleep, in focus" });
  expect(sleepPanel).toHaveTextContent("90 / 100");
  expect(sleepPanel).toHaveTextContent("Point of support");
  expect(within(sleepPanel).getByRole("link", { name: "See Sleep measurements" })).toHaveAttribute("href", "#express-axis-sleep");

  await user.hover(buttons[3]);
  await user.unhover(buttons[3]);
  expect(screen.getByRole("region", { name: "Nutrition, in focus" })).toHaveTextContent("80 / 100");
  expect(buttons[3]).toHaveAttribute("aria-pressed", "true");
  expect(within(controls).getAllByRole("button", { pressed: true })).toHaveLength(1);

  act(() => buttons[0].focus());
  await user.tab();
  await user.keyboard("{Enter}");
  expect(buttons[1]).toHaveFocus();
  expect(screen.getByRole("region", { name: "Strength, in focus" })).toHaveTextContent("100 / 100");
  await user.hover(buttons[3]);
  await user.keyboard(" ");
  expect(buttons[1]).toHaveFocus();
  expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: "Strength, in focus" })).toBeVisible();
  expect(screen.getByLabelText("Express index · fitness and habits")).toHaveTextContent("92 / 100");
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(screen.getByRole("heading", { name: "Strength" })).toHaveAttribute("tabindex", "-1");
});

test("lets an unknown axis explain its missing inputs and distinguishes a real zero", async () => {
  const user = userEvent.setup();
  renderExpressResults({ ...completeAnswers, reported_vo2_max_ml_kg_min: null, usual_sleep_hours: 0, sleep_refreshed: 0 });
  const controls = screen.getByRole("group", { name: "Explore the four axes" });
  await user.click(within(controls).getByRole("button", { name: /Cardio/ }));
  const missingPanel = screen.getByRole("region", { name: "Cardio, in focus" });
  expect(missingPanel.querySelector(".express-axis-inspector__score")).toHaveTextContent("Not provided");
  expect(missingPanel).toHaveTextContent("An existing VO₂ max value is needed");
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass.querySelector('.express-compass__point[data-axis="cardio"]')).toBeNull();
  expect(compass.querySelector(".express-compass__shape")).toBeNull();

  await user.click(within(controls).getByRole("button", { name: /Sleep/ }));
  const zeroPanel = screen.getByRole("region", { name: "Sleep, in focus" });
  expect(zeroPanel.querySelector(".express-axis-inspector__score")).toHaveTextContent("0 / 100");
  expect(zeroPanel).toHaveTextContent("Worth a closer look");
  expect(compass.querySelector('.express-compass__point[data-axis="sleep"]')).toHaveAttribute("cx", "150");
  expect(compass.querySelector('.express-compass__point[data-axis="sleep"]')).toHaveAttribute("cy", "150");
  expect(screen.getAllByRole("article")).toHaveLength(4);
});

test("retains the selected axis when locale and supplied answers change", async () => {
  const user = userEvent.setup();
  const view = renderExpressResults();
  await user.click(within(screen.getByRole("group", { name: "Explore the four axes" })).getByRole("button", { name: /Nutrition/ }));
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("region", { name: "Alimentation, de plus près" })).toHaveTextContent("80 / 100");
  expect(screen.getByRole("button", { name: "Français" })).toHaveFocus();

  view.rerender(<I18nProvider><LanguageSwitcher /><ExpressResults answers={{ ...completeAnswers, plant_food_frequency: 1, diet_ultra_processed: "daily" }} ageYears={35} /></I18nProvider>);
  const panel = screen.getByRole("region", { name: "Alimentation, de plus près" });
  expect(panel).toHaveTextContent("10 / 100");
  expect(panel).toHaveTextContent("À approfondir");
  expect(within(screen.getByRole("group", { name: "Explorer les quatre axes" })).getByRole("button", { name: /Alimentation/ })).toHaveAttribute("aria-pressed", "true");
});
