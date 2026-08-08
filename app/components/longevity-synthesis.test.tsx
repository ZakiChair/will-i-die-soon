import { render as testingRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import type { AnswerMap, ProfileContext } from "../lib/types";
import { LongevitySynthesis } from "./longevity-synthesis";

const adult: ProfileContext = { age: 40, countryCode: "CH" };

const riskyAnswers: AnswerMap = {
  sex_assigned_at_birth: "male",
  height_cm: 175,
  weight_kg: 112,
  weekly_moderate_activity_minutes: 0,
  walking_pace_self_rated: "slow",
  stair_flights_capacity: "none",
  usual_sleep_hours: 5,
  sleep_snoring: "yes",
  sleep_daytime_sleepiness: "daily",
  plant_food_frequency: 0,
  diet_processed_meat: "daily",
  diet_sugary_drinks: 14,
  current_tobacco_nicotine: true,
  tobacco_detail_frequency: 25,
  smoking_total_years: 30,
  alcohol_frequency: "four_plus_weekly",
  alcohol_detail_heavy_episode: "weekly",
  diagnosed_conditions_core: ["diabetes"],
  family_early_cvd: true,
  sedentary_total_hours: 12,
  movement_strength_days: 0,
  reported_vo2_max_ml_kg_min: 24,
};

function render(ui: ReactElement) {
  return testingRender(<I18nProvider>{ui}</I18nProvider>);
}

test("shows the estimated death age, range, and reference for a covered profile", () => {
  render(<LongevitySynthesis answers={riskyAnswers} profile={adult} />);

  expect(screen.getByText("Estimated age at death")).toBeInTheDocument();
  expect(screen.getByText(/^\d{2,3} years$/)).toBeInTheDocument();
  expect(screen.getByText(/Likely window \d{2,3}–\d{2,3} years/)).toBeInTheDocument();
  expect(
    screen.getByText(/Reference for your age, sex, and country: \d{2,3} years/),
  ).toBeInTheDocument();
});

test("draws one labelled score bar per analysis domain", () => {
  render(<LongevitySynthesis answers={riskyAnswers} profile={adult} />);

  const list = screen.getByRole("list", { name: "Domain scores from 0 to 100" });
  const rows = within(list).getAllByRole("listitem");
  expect(rows).toHaveLength(4);
  expect(within(rows[0]).getByText("Cardio & energy")).toBeInTheDocument();
  expect(within(rows[1]).getByText("Strength & recovery")).toBeInTheDocument();
  expect(within(rows[2]).getByText("Sleep")).toBeInTheDocument();
  expect(within(rows[3]).getByText("Nutrition & metabolism")).toBeInTheDocument();
  for (const row of rows) {
    expect(within(row).getByText(/\d+ \/ 100/)).toBeInTheDocument();
  }
});

test("ranks cause families and lists modifiable gains with years", () => {
  render(<LongevitySynthesis answers={riskyAnswers} profile={adult} />);

  expect(
    screen.getByText("Where your risk profile concentrates"),
  ).toBeInTheDocument();
  expect(screen.getByText("Cardiovascular")).toBeInTheDocument();
  expect(screen.getByText("Stopping smoking")).toBeInTheDocument();
  expect(screen.getAllByText(/^\+\d+(\.\d+)? yrs$/).length).toBeGreaterThan(0);
});

test("reports the fitness age gap from a low reported VO2 max", () => {
  render(<LongevitySynthesis answers={riskyAnswers} profile={adult} />);

  expect(
    screen.getByText(/VO₂ max reads about \d+(\.\d+)? years older than your age/),
  ).toBeInTheDocument();
});

test("locks the estimate when coverage is insufficient but keeps the domain bars", () => {
  render(
    <LongevitySynthesis
      answers={{ usual_sleep_hours: 7 }}
      profile={adult}
    />,
  );

  expect(
    screen.getByText(/Not enough of the model's inputs were answered/),
  ).toBeInTheDocument();
  const list = screen.getByRole("list", { name: "Domain scores from 0 to 100" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  expect(within(list).getAllByText("Not enough answers").length).toBeGreaterThan(0);
});

test("never renders for the transparent ledger a smoking gain on a non-smoking profile", () => {
  render(
    <LongevitySynthesis
      answers={{
        sex_assigned_at_birth: "female",
        height_cm: 168,
        weight_kg: 60,
        weekly_moderate_activity_minutes: 250,
        walking_pace_self_rated: "brisk",
        usual_sleep_hours: 8,
        sleep_snoring: "no",
        plant_food_frequency: 5,
        diet_processed_meat: "never",
        diet_sugary_drinks: 0,
        current_tobacco_nicotine: false,
        smoking_history_former: false,
        alcohol_frequency: "never",
        diagnosed_conditions_core: ["none"],
        family_early_cvd: false,
        sedentary_total_hours: 6,
        movement_strength_days: 3,
      }}
      profile={adult}
    />,
  );

  expect(screen.queryByText("Stopping smoking")).not.toBeInTheDocument();
  expect(screen.getByText(/^\d{2,3} years$/)).toBeInTheDocument();
});
