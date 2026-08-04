import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import { PillarProgress } from "./pillar-progress";

test("renders four ordered non-interactive chapters with one current step and question progress", () => {
  render(
    <I18nProvider>
      <PillarProgress
        currentPillar="strength-neural"
        completedQuestions={7}
        totalQuestions={20}
      />
    </I18nProvider>,
  );

  const chapters = screen.getByRole("region", { name: "Assessment chapters" });
  expect(chapters.querySelectorAll("ol > li")).toHaveLength(4);
  expect(chapters).toHaveTextContent("02 / 04 · Strength, nervous system & recovery");
  expect(chapters.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  expect(chapters.querySelector('[aria-current="step"]')).toHaveTextContent(
    "Strength & recovery",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "7");
  expect(screen.getByRole("progressbar")).toHaveAttribute("max", "20");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
