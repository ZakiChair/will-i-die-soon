import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { DecorativeSectionBoundary } from "./decorative-section-boundary";

function BrokenDecoration(): never {
  throw new Error("decorative render failed");
}

afterEach(() => vi.restoreAllMocks());

test("shows its fallback without removing sibling controls when decoration rendering fails", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  render(
    <>
      <DecorativeSectionBoundary fallback={<p>Decorative fallback</p>}>
        <BrokenDecoration />
      </DecorativeSectionBoundary>
      <button type="button">Start Express</button>
    </>,
  );

  expect(screen.getByText("Decorative fallback")).toBeVisible();
  expect(screen.getByRole("button", { name: "Start Express" })).toBeVisible();
  expect(error).toHaveBeenCalled();
});
