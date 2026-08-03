"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { uiCopy, type UiCopyKey } from "./ui-copy";
import type { Locale, MessageVariables } from "./types";

export type Translate = (key: UiCopyKey, variables?: MessageVariables) => string;

type I18nContextValue = {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(message: string, variables?: MessageVariables): string {
  return message.replace(/\{([^}]+)\}/g, (token, name: string) => {
    const value = variables?.[name];
    return value === undefined ? token : String(value);
  });
}

function translate(locale: Locale, key: UiCopyKey, variables?: MessageVariables): string {
  const message = uiCopy[locale][key];

  if (!message) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Missing translation key: ${key}`);
    }
    return key;
  }

  return interpolate(message, variables);
}

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, variables) => translate(locale, key, variables),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}
