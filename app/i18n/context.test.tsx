import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
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

    // @ts-expect-error Deliberately cross the public exact-key boundary to verify its runtime guard.
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

test("changes only in-memory presentation state without storage, cookies, URL, or network writes", async () => {
  const user = userEvent.setup();
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const fetch = vi.spyOn(globalThis, "fetch");
  const cookieBefore = document.cookie;
  const urlBefore = window.location.href;

  render(
    <I18nProvider>
      <LanguageSwitcher />
      <TranslationProbe />
    </I18nProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(storage).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.cookie).toBe(cookieBefore);
  expect(window.location.href).toBe(urlBefore);
  storage.mockRestore();
  fetch.mockRestore();
});
