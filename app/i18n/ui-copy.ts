import type { Locale } from "./types";

export const uiCopy = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.french": "Français",
    "language.current": "Current language: {language}",
  },
  fr: {
    "language.label": "Langue",
    "language.english": "Anglais",
    "language.french": "Français",
    "language.current": "Langue actuelle : {language}",
  },
} as const satisfies Record<Locale, Readonly<Record<string, string>>>;
