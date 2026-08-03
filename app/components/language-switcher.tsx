"use client";

import { useI18n } from "../i18n/context";
import type { Locale } from "../i18n/types";

const languageOptions: ReadonlyArray<{ locale: Locale; key: "english" | "french"; shortName: string }> = [
  { locale: "en", key: "english", shortName: "EN" },
  { locale: "fr", key: "french", shortName: "FR" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="language-switcher" role="group" aria-label={t("language.label")}>
      {languageOptions.map((option) => (
        <button
          aria-label={t(`language.${option.key}`)}
          aria-pressed={locale === option.locale}
          className="language-switcher__option"
          key={option.locale}
          onClick={() => setLocale(option.locale)}
          type="button"
        >
          {option.shortName}
        </button>
      ))}
    </div>
  );
}
