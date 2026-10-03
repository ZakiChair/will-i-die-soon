import { SELECTABLE_COUNTRY_CODES } from "../data/countries";
import type { Locale } from "./types";

export type CountryOption = { readonly code: string; readonly label: string };

const optionsByLocale = new Map<Locale, ReadonlyArray<CountryOption>>();

/** Selectable countries named and sorted in the interface language; `OTHER` is not included. */
export function countryOptions(locale: Locale): ReadonlyArray<CountryOption> {
  const cached = optionsByLocale.get(locale);
  if (cached) return cached;

  const names = new Intl.DisplayNames([locale], { type: "region" });
  const collator = new Intl.Collator(locale);
  const options = SELECTABLE_COUNTRY_CODES.map((code) => ({ code, label: names.of(code) ?? code }))
    .sort((left, right) => collator.compare(left.label, right.label));
  optionsByLocale.set(locale, options);
  return options;
}
