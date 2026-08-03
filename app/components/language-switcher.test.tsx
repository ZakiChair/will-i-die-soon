import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { I18nProvider } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";

afterEach(() => {
  cleanup();
  document.documentElement.lang = "en";
});

test("marks the active locale in the accessible language selector", async () => {
  const user = userEvent.setup();

  render(
    <I18nProvider>
      <LanguageSwitcher />
    </I18nProvider>,
  );

  expect(screen.getByRole("group", { name: /language|langue/i })).toBeVisible();
  expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(document.documentElement).toHaveAttribute("lang", "fr");
  expect(screen.getByRole("button", { name: "Français" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
