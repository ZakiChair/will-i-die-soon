import { describe, expect, test } from "vitest";

import { SELECTABLE_COUNTRY_CODES } from "../data/countries";
import { countryOptions } from "./country-names";

describe("country selector options", () => {
  test.each(["en", "fr"] as const)("names every selectable country once and sorts them in %s", (locale) => {
    const options = countryOptions(locale);
    const collator = new Intl.Collator(locale);

    expect(options.map(({ code }) => code).sort()).toEqual([...SELECTABLE_COUNTRY_CODES].sort());
    for (let index = 1; index < options.length; index += 1) {
      expect(collator.compare(options[index - 1].label, options[index].label)).toBeLessThanOrEqual(0);
    }
    for (const option of options) expect(option.label).not.toBe(option.code);
  });

  test("uses the interface language for the names", () => {
    const french = new Map(countryOptions("fr").map(({ code, label }) => [code, label]));
    const english = new Map(countryOptions("en").map(({ code, label }) => [code, label]));

    expect(french.get("CH")).toBe("Suisse");
    expect(french.get("MA")).toBe("Maroc");
    expect(french.get("DZ")).toBe("Algérie");
    expect(french.get("BE")).toBe("Belgique");
    expect(english.get("CH")).toBe("Switzerland");
    expect(english.get("GB")).toBe("United Kingdom");
    expect(english.get("US")).toBe("United States");
  });

  test("sorts accented French names with their base letter", () => {
    const codes = countryOptions("fr").map(({ code }) => code);

    expect(codes.indexOf("US")).toBeGreaterThan(codes.indexOf("ES"));
    expect(codes.indexOf("US")).toBeLessThan(codes.indexOf("FI"));
    expect(codes.indexOf("EG")).toBeLessThan(codes.indexOf("AE"));
  });

  test("returns the same list for repeated calls in one language", () => {
    expect(countryOptions("fr")).toBe(countryOptions("fr"));
    expect(countryOptions("en")).not.toBe(countryOptions("fr"));
  });
});
