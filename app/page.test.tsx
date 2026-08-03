import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import Home from "./page";

afterEach(() => {
  cleanup();
  document.documentElement.lang = "en";
});

test("preserves the active consent screen and entered age when the global locale changes", async () => {
  const user = userEvent.setup();

  render(<Home />);

  await user.click(screen.getByRole("button", { name: "Choose Quick" }));
  const age = screen.getByRole("spinbutton", { name: "How old are you?" });
  await user.type(age, "42");

  expect(screen.getByRole("heading", { name: "Before we begin" })).toBeVisible();
  expect(age).toHaveValue(42);

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(document.documentElement).toHaveAttribute("lang", "fr");
  expect(screen.getByRole("heading", { name: "Before we begin" })).toBeVisible();
  expect(screen.getByRole("spinbutton", { name: "How old are you?" })).toHaveValue(42);
});
