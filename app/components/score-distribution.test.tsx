import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { ScoreDistribution } from "./score-distribution";

test.each([
  { score: 0, x: "36",  },
  { score: 50, x: "360",  },
  { score: 100, x: "684",  },
])("places the actual score $score on the Life's Essential 8 scale without an invented population", ({ score, x }) => {
  const { container } = render(<I18nProvider><ScoreDistribution score={{ kind: "adult-score", score }} /></I18nProvider>);
  const chart = screen.getByRole("img", { name: "Your position on the Life's Essential 8 scale" });
  expect(chart).toHaveAccessibleDescription(new RegExp(`${score} out of 100`));
  expect(container.querySelector(".score-distribution__marker")).toHaveAttribute("x1", x);
  expect(screen.getByRole("meter")).toHaveTextContent(`${score} / 100`);
  expect(screen.getByText("Low cardiovascular health (<50)")).toBeVisible();
  expect(screen.getByText("High cardiovascular health (≥80)")).toBeVisible();
  expect(screen.getByRole("meter", { name: "Life's Essential 8 score" })).toHaveAttribute("aria-valuenow", String(score));
  const ticks = container.querySelector<HTMLElement>(".score-distribution__ticks");
  expect(ticks).toBeInTheDocument();
  expect(within(ticks!).getByText("0")).toBeVisible();
  expect(within(ticks!).getByText("100")).toBeVisible();
  expect(ticks?.closest("svg")).toBeNull();
  expect(container.textContent).not.toMatch(/percentile|better than|normal health|theoretical centre|standard deviation/i);
});

test.each([NaN, Infinity, -1, 101])("does not fabricate a position for an invalid score %s", (score) => {
  render(<I18nProvider><ScoreDistribution score={{ kind: "adult-score", score }} /></I18nProvider>);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Position unavailable")).toBeVisible();
});

test.each([
  { reason: "express-assessment" as const, explanation: /Express has its own fitness-and-habits index/ },
  { reason: "quick-assessment" as const, explanation: /Quick does not calculate Life's Essential 8/ },
  { reason: "answer-more-wellness-habits" as const, explanation: /Fewer than five of the eight metrics could be assessed/ },
])("explains the $reason gate without drawing a curve", ({ reason, explanation }) => {
  render(<I18nProvider><ScoreDistribution score={{ kind: "insufficient-coverage", reason }} /></I18nProvider>);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText(explanation)).toBeVisible();
});

test("localizes the reference without moving the score or using a population ranking", async () => {
  const user = userEvent.setup();
  const { container } = render(<I18nProvider><LanguageSwitcher /><ScoreDistribution score={{ kind: "adult-score", score: 65.5 }} /></I18nProvider>);
  const before = container.querySelector(".score-distribution__marker")?.getAttribute("x1");
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "65,5 / 100");
  expect(screen.getByRole("img", { name: "Votre position sur l’échelle Life’s Essential 8" })).toHaveAccessibleDescription(/65,5 sur 100/);
  expect(container.querySelector(".score-distribution__marker")).toHaveAttribute("x1", before);
  expect(screen.getByText(/le score n’est pas un diagnostic/)).toBeVisible();
  expect(container.textContent).not.toMatch(/percentile|meilleur que/i);
});

test("shows zero points as an actual position, not as missing answers", () => {
  const { container } = render(<I18nProvider><ScoreDistribution score={{ kind: "adult-score", score: 0 }} /></I18nProvider>);
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.queryByText("Position unavailable")).not.toBeInTheDocument();
  expect(container.querySelector(".score-distribution__curve")).toBeNull();
});
