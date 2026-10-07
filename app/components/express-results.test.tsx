import { act, render as testingRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import type { AnswerMap } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { ExpressResults } from "./express-results";

// Homme de 35 ans : VO₂ max à la médiane FRIEND 30–39 ans ; lever de chaise affiché mais non noté avant 60 ans.
const completeAnswers: AnswerMap = {
  sex_assigned_at_birth: "male",
  reported_vo2_max_ml_kg_min: 42.4,
  weekly_moderate_activity_minutes: 150,
  chair_stand_30s_count: 20,
  movement_strength_days: 2,
  usual_sleep_hours: 7.5,
  sleep_refreshed: 8,
  plant_food_frequency: 4,
  diet_ultra_processed: "rarely",
};
// Femme de 67 ans : VO₂ max à la médiane FRIEND 60–69 ans ; 14 levers dans l'intervalle 11–16.
const seniorAnswers: AnswerMap = {
  ...completeAnswers,
  sex_assigned_at_birth: "female",
  reported_vo2_max_ml_kg_min: 20,
  chair_stand_30s_count: 14,
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
  { name: "complet", answers: completeAnswers, score: 86 },
  { name: "provisoire", answers: { ...completeAnswers, reported_vo2_max_ml_kg_min: null }, score: 93 },
  { name: "zéro mesuré", answers: { usual_sleep_hours: 0, sleep_refreshed: 0, plant_food_frequency: 0, diet_ultra_processed: "daily" }, score: 0 },
  { name: "maximum mesuré", answers: { usual_sleep_hours: 8, sleep_refreshed: 10, plant_food_frequency: 5, diet_ultra_processed: "never" }, score: 100 },
])("place l’indice $name sur une échelle globale accessible", ({ answers, score }) => {
  renderExpressResults(answers);
  const scale = screen.getByRole("meter", { name: "Overall Express index position" });

  expect(scale).toHaveAttribute("aria-valuemin", "0");
  expect(scale).toHaveAttribute("aria-valuemax", "100");
  expect(scale).toHaveAttribute("aria-valuenow", String(score));
  expect(scale).toHaveAccessibleDescription(/published norms for your age and sex/i);
  expect(scale.querySelector(".express-profile__scale-fill")).toHaveStyle({ width: `${score}%` });
  expect(scale.querySelector(".express-profile__scale-marker")).toHaveStyle({ left: `${score}%` });
  expect(screen.getByText("Habits to strengthen")).toBeVisible();
  expect(screen.getByText("Norms and guidelines reached")).toBeVisible();
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

test("renders the Express index, four scored axes, normed readings and a complete compass", () => {
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
  expect(screen.getByText(/42\.4 ml\/kg\/min/)).not.toHaveAttribute("data-count-from");
  expect(screen.getByText("p50 for a 35-year-old man · FRIEND registry")).toBeVisible();
  expect(screen.getByText("150 min / week · guideline 150 min / week")).toBeVisible();
  expect(screen.getByText(/20 stands/)).toBeVisible();
  expect(screen.getByText("Reference available from age 60 (Rikli-Jones 60–94).")).toBeVisible();
  expect(screen.getByText("2 days / week · guideline 2 days / week")).toBeVisible();
  expect(screen.getByText("Man")).toBeVisible();
  expect(screen.getByText("35 years")).toBeVisible();
  expect(screen.getByLabelText("Express index · fitness and habits")).toHaveTextContent("86 / 100");
  expect(screen.getByText("Complete profile")).toBeVisible();
  expect(screen.getByText(/7 \/ 7 components · 9 \/ 9 answers/)).toBeVisible();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass).toHaveAccessibleDescription(/Cardio: 75.*Strength: 100.*Sleep: 90.*Nutrition: 80/);
  expect(compass.querySelector(".express-compass__shape")).toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(4);
  expect(document.body.textContent).not.toMatch(/BMI|life expectancy|elite|body weight|squat|deadlift|not population norms/i);
});

test("places a senior woman's chair stand and VO₂ max against the Rikli-Jones range and FRIEND percentile", () => {
  const { container } = renderExpressResults(seniorAnswers, 67);
  expect(screen.getByText("p50 for a 67-year-old woman · FRIEND registry")).toBeVisible();
  expect(screen.getByText("14 stands · within the 11–16 normal range for women 65–69")).toBeVisible();
  expect(screen.getByText("Woman")).toBeVisible();
  expect(screen.getByText(/8 \/ 8 components · 9 \/ 9 answers/)).toBeVisible();
  expect(screen.getByLabelText("Express index · fitness and habits")).toHaveTextContent("82 / 100");
  expect(container.querySelector('.express-result-card[data-axis="strength"]')).toHaveAttribute("data-status", "support");
});

test("flags a chair stand below the normal range as the first priority", () => {
  const { container } = renderExpressResults({ ...seniorAnswers, chair_stand_30s_count: 10 }, 67);
  expect(screen.getByText("10 stands · below the 11–16 normal range for women 65–69")).toBeVisible();
  expect(container.querySelector('.express-result-card[data-axis="strength"]')).toHaveAttribute("data-status", "attention");
  const priorities = screen.getByRole("region", { name: "Your next priorities" });
  expect(within(priorities).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Rebuild lower-body strength");
});

test("shows raw values without a percentile or range when sex at birth is intersex", () => {
  renderExpressResults({ ...seniorAnswers, sex_assigned_at_birth: "intersex" }, 67);
  expect(screen.getByText(/20 ml\/kg\/min/)).toBeVisible();
  expect(screen.getByText("Shown without a percentile: FRIEND norms are published for men and women only.")).toBeVisible();
  expect(screen.getByText(/14 stands/)).toBeVisible();
  expect(screen.getByText("Shown without a range: Rikli-Jones norms are published for men and women only.")).toBeVisible();
  expect(screen.getByText("Intersex or another variation")).toBeVisible();
  expect(document.body.textContent).not.toMatch(/\bp\d+ for a/);
  expect(screen.getByText(/6 \/ 6 components · 9 \/ 9 answers/)).toBeVisible();
});

test("localizes the Express snapshot in French", async () => {
  const user = userEvent.setup();
  renderExpressResults(seniorAnswers, 67);

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("heading", { name: "Votre bilan Express" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Cardio" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Force" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Sommeil" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Alimentation" })).toBeVisible();
  expect(screen.getByText("p50 pour une femme de 67 ans · registre FRIEND")).toBeVisible();
  expect(screen.getByText("14 levers · dans l’intervalle normal 11–16 des femmes de 65–69 ans")).toBeVisible();
  expect(screen.getByText("150 min / semaine · recommandation 150 min / semaine")).toBeVisible();
  expect(screen.getByText("Femme")).toBeVisible();
  expect(screen.getByLabelText("Indice Express · forme et habitudes")).toHaveTextContent("82 / 100");
  expect(screen.getByRole("meter", { name: "Position de l’indice Express global" })).toHaveAttribute("aria-valuenow", "82");
  expect(screen.getByText("Habitudes à renforcer")).toBeVisible();
  expect(screen.getByText("Normes et recommandations atteintes")).toBeVisible();
  expect(screen.getByRole("button", { name: "Français" })).toHaveFocus();
});

test("shows localized missing values without inventing zeroes", () => {
  renderExpressResults({
    sex_assigned_at_birth: null,
    reported_vo2_max_ml_kg_min: null,
    weekly_moderate_activity_minutes: null,
    chair_stand_30s_count: null,
    movement_strength_days: null,
    usual_sleep_hours: null,
    sleep_refreshed: null,
    plant_food_frequency: null,
    diet_ultra_processed: null,
  });

  expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  for (const card of screen.getAllByRole("article")) {
    expect(card.textContent).not.toMatch(/\b0 stands|\b0 ml\/kg\/min|\b0 min|\b0 days/);
  }
  expect(screen.getByText("Profile incomplete")).toBeVisible();
  expect(screen.queryByLabelText("Express index · fitness and habits")).not.toBeInTheDocument();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass.querySelector(".express-compass__shape")).not.toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(0);
});

test("a partial profile marks only known axes and never invents a zero for the missing cardio axis", () => {
  const { container } = renderExpressResults({ ...completeAnswers, reported_vo2_max_ml_kg_min: null, weekly_moderate_activity_minutes: null });
  expect(screen.getByText("Provisional index")).toBeVisible();
  expect(screen.getByText(/5 \/ 7 components · 7 \/ 9 answers/)).toBeVisible();
  const compass = screen.getByRole("img", { name: "Your four-axis compass" });
  expect(compass).toHaveAccessibleDescription(/Cardio: Not provided/);
  expect(compass.querySelector(".express-compass__shape")).not.toBeInTheDocument();
  expect(compass.querySelectorAll(".express-compass__point")).toHaveLength(3);
  expect(compass.querySelector('.express-compass__point[data-axis="cardio"]')).not.toBeInTheDocument();
  expect(container.querySelector('.express-compass__label[data-axis="cardio"]')).toHaveTextContent("Not provided");
});

test("sleep and food concerns lead the portrait and priorities even when fitness scores are high", () => {
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

test("names the published norms, their cohorts and the guideline-based items in the method", async () => {
  const user = userEvent.setup();
  const { container } = renderExpressResults();
  expect(screen.getByText(/compared with published norms by age and sex/i)).toBeVisible();
  expect(screen.getByText("Dashed reference: 65 / 100")).toBeVisible();
  await user.click(screen.getByText("How this Express index is built"));
  const method = container.querySelector("#express-method");
  expect(method).toHaveTextContent(/equal weight/i);
  expect(method).toHaveTextContent(/at least two axes and four components/i);
  expect(method).toHaveTextContent(/FRIEND is a US treadmill cardiopulmonary-exercise cohort of adults aged 20–79/i);
  expect(method).toHaveTextContent(/community-dwelling adults aged 60–94/i);
  expect(method).toHaveTextContent(/public guidelines, which describe recommended habits, not norms/i);
  expect(method).toHaveTextContent(/Life's Essential 8: 7–<9 h 100/);
  expect(method).not.toHaveTextContent(/not population norms|50 ml\/kg\/min/i);
  const links = within(method as HTMLElement).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual([
    "Kaminsky, Arena & Myers 2015 · FRIEND registry VO₂ max reference standards (Mayo Clin Proc)",
    "Rikli & Jones 1999/2013 · Senior Fitness Test normative scores, ages 60–94",
    "CDC STEADI · 30-Second Chair Stand",
    "WHO 2020 · Guidelines on physical activity and sedentary behaviour",
    "AHA 2022 · Life's Essential 8",
    "WHO · Healthy diet",
  ]);
  for (const link of links) expect(link).toHaveAttribute("rel", "noreferrer");
  expect(links[0]).toHaveAttribute("href", "https://doi.org/10.1016/j.mayocp.2015.07.026");
  expect(links[2]).toHaveAttribute("href", "https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-30Sec-508.pdf");
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
  expect(screen.getByLabelText("Express index · fitness and habits")).toHaveTextContent("86 / 100");
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(screen.getByRole("heading", { name: "Strength" })).toHaveAttribute("tabindex", "-1");
});

test("lets an unknown axis explain its missing inputs and distinguishes a real zero", async () => {
  const user = userEvent.setup();
  renderExpressResults({ ...completeAnswers, reported_vo2_max_ml_kg_min: null, weekly_moderate_activity_minutes: null, usual_sleep_hours: 0, sleep_refreshed: 0 });
  const controls = screen.getByRole("group", { name: "Explore the four axes" });
  await user.click(within(controls).getByRole("button", { name: /Cardio/ }));
  const missingPanel = screen.getByRole("region", { name: "Cardio, in focus" });
  expect(missingPanel.querySelector(".express-axis-inspector__score")).toHaveTextContent("Not provided");
  expect(missingPanel).toHaveTextContent("An existing VO₂ max value (with sex at birth) or your weekly moderate activity is needed");
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

test("explains an axis with room to develop even when no specific signal fires", async () => {
  const user = userEvent.setup();
  renderExpressResults({ ...completeAnswers, usual_sleep_hours: 6.5, sleep_refreshed: 4 });
  await user.click(within(screen.getByRole("group", { name: "Explore the four axes" })).getByRole("button", { name: /Sleep/ }));
  const panel = screen.getByRole("region", { name: "Sleep, in focus" });
  expect(panel).toHaveTextContent("55 / 100");
  expect(panel).toHaveTextContent("Room to develop");
  expect(panel).toHaveTextContent("Your sleep axis leaves room to develop without a specific signal.");
  expect(panel).not.toHaveTextContent("Complete a missing piece");
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
