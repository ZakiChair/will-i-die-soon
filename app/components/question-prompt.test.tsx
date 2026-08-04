import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  QUESTION_PROMPT_DETAIL_ID,
  QUESTION_PROMPT_TITLE_ID,
  QuestionPrompt,
} from "./question-prompt";

test("renders a focusable short title followed by complete criteria", () => {
  render(
    <QuestionPrompt
      presentation={{ title: "Short title", detail: "Complete criteria." }}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );

  const heading = screen.getByRole("heading", { level: 1, name: "Short title" });
  expect(heading).toHaveAttribute("id", QUESTION_PROMPT_TITLE_ID);
  expect(heading).toHaveAttribute("tabindex", "-1");
  expect(heading).toHaveClass("question-prompt__title--split");
  expect(screen.getByText("Complete criteria.")).toHaveAttribute(
    "id",
    QUESTION_PROMPT_DETAIL_ID,
  );
});

test("renders no detail node or split modifier for an ordinary prompt", () => {
  render(
    <QuestionPrompt
      presentation={{ title: "Ordinary question" }}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );

  expect(screen.getByRole("heading", { name: "Ordinary question" })).not.toHaveClass(
    "question-prompt__title--split",
  );
  expect(document.getElementById(QUESTION_PROMPT_DETAIL_ID)).toBeNull();
});
