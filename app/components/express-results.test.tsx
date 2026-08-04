import { render as testingRender, screen } from "@testing-library/react";
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

function renderExpressResults(answers: AnswerMap = completeAnswers) {
  return testingRender(
    <I18nProvider>
      <LanguageSwitcher />
      <ExpressResults answers={answers} />
    </I18nProvider>,
  );
}

test("renders four transparent English Express summaries in their specified order", () => {
  renderExpressResults();

  expect(screen.getByRole("heading", { name: "Your Express snapshot" })).toBeVisible();
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(screen.getByRole("heading", { name: "VO₂ max" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Strength" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Sleep" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  expect(screen.getByText("1.54 × body weight")).toBeVisible();
  expect(screen.getByText("2.26 × body weight")).toBeVisible();
  expect(document.body.textContent).not.toMatch(/BMI|poor|average|good|excellent|elite|\/ 100/i);
});

test("localizes the Express snapshot in French", async () => {
  const user = userEvent.setup();
  renderExpressResults();

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("heading", { name: "Votre instantané Express" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "VO₂ max" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Force" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Sommeil" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Alimentation" })).toBeVisible();
  expect(screen.getByText("1,54 × le poids corporel")).toBeVisible();
  expect(screen.getByText("2,26 × le poids corporel")).toBeVisible();
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
  expect(document.body.textContent).not.toMatch(/0 kg|0 ml\/kg\/min/);
});
