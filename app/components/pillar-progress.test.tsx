import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import { PillarProgress } from "./pillar-progress";

test("renders four ordered passive chapters with clear completed, current, and upcoming states", () => {
  render(
    <I18nProvider>
      <PillarProgress
        currentPillar="strength-neural"
      />
    </I18nProvider>,
  );

  const chapters = screen.getByRole("region", { name: "Assessment chapters" });
  expect(chapters.querySelectorAll("ol > li")).toHaveLength(4);
  expect(chapters).toHaveTextContent("02 / 04 · Strength, nervous system & recovery");
  expect(chapters.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  expect(chapters.querySelector('[aria-current="step"]')).toHaveTextContent(
    "Strength, nervous system & recovery",
  );
  expect(chapters.querySelector(".pillar-progress__chapter--completed")).toHaveTextContent(
    "01Cardio, VO₂ max & cellular energy",
  );
  expect(chapters.querySelector(".pillar-progress__chapter--current")).toHaveTextContent(
    "02Strength, nervous system & recovery",
  );
  expect(chapters.querySelector(".pillar-progress__chapter--upcoming")).toHaveTextContent(
    "03Sleep & circadian rhythm",
  );
  expect(chapters.querySelectorAll(".pillar-progress__chapter")).toHaveLength(4);
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
