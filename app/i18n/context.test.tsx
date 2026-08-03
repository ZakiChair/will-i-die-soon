import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { LanguageSwitcher } from "../components/language-switcher";
import { I18nProvider, useI18n } from "./context";

function TranslationProbe() {
  const { locale, t } = useI18n();

  return <output>{`${locale}: ${t("language.current", { language: "French" })}`}</output>;
}

afterEach(() => {
  cleanup();
  document.documentElement.lang = "en";
});

test("updates the document language and translations when the locale changes", async () => {
  const user = userEvent.setup();

  render(
    <I18nProvider>
      <LanguageSwitcher />
      <TranslationProbe />
    </I18nProvider>,
  );

  expect(screen.getByText("en: Current language: French")).toBeVisible();
  expect(document.documentElement).toHaveAttribute("lang", "en");

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(document.documentElement).toHaveAttribute("lang", "fr");
  expect(screen.getByText("fr: Langue actuelle : French")).toBeVisible();
});

test("throws for an unknown translation key in the test environment", () => {
  function MissingTranslationProbe() {
    const { t } = useI18n();

    return <output>{t("missing.translation.key")}</output>;
  }

  expect(() =>
    render(
      <I18nProvider>
        <MissingTranslationProbe />
      </I18nProvider>,
    ),
  ).toThrow(/missing translation key/i);
});
