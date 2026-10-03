import { describe, expect, test } from "vitest";

import {
  ESC_RISK_REGIONS,
  EU_MEMBER_STATES,
  OTHER_COUNTRY_CODE,
  SELECTABLE_COUNTRY_CODES,
  WHO_CVD_REGIONS,
  WHO_CVD_REGION_COUNTRIES,
  escRiskRegionFor,
  normalizeCountryCode,
  usesPrevent,
  whoCvdRegionFor,
} from "./countries";

const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

describe("country module", () => {
  test("offers unique, recognised ISO 3166-1 alpha-2 codes and keeps OTHER out of the list", () => {
    expect(new Set(SELECTABLE_COUNTRY_CODES).size).toBe(SELECTABLE_COUNTRY_CODES.length);
    for (const code of SELECTABLE_COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(regionNames.of(code), code).toBeDefined();
    }
    expect(SELECTABLE_COUNTRY_CODES).not.toContain(OTHER_COUNTRY_CODE);
    expect(SELECTABLE_COUNTRY_CODES).toHaveLength(190);
  });

  test("gives every offered country a published cardiovascular model region", () => {
    for (const code of SELECTABLE_COUNTRY_CODES) {
      expect(
        escRiskRegionFor(code) !== undefined || whoCvdRegionFor(code) !== undefined || usesPrevent(code),
        code,
      ).toBe(true);
    }
  });

  test("copies the ESC HeartScore risk regions exactly", () => {
    expect(ESC_RISK_REGIONS).toEqual({
      low: ["BE", "CH", "DK", "ES", "FR", "GB", "IL", "LU", "NL", "NO"],
      moderate: ["AT", "CY", "DE", "FI", "GR", "IE", "IS", "IT", "MT", "PT", "SE", "SI", "SM"],
      high: ["AL", "BA", "CZ", "EE", "HR", "HU", "KZ", "PL", "SK", "TR"],
      "very-high": [
        "AM", "AZ", "BG", "BY", "DZ", "EG", "GE", "KG", "LB", "LT", "LV", "LY",
        "MA", "MD", "ME", "MK", "RO", "RS", "RU", "SY", "TN", "UA", "UZ",
      ],
    });
    const escCountries = Object.values(ESC_RISK_REGIONS).flat();
    expect(new Set(escCountries).size).toBe(escCountries.length);
  });

  test("places each country on at most one of the 21 WHO 2019 regional charts", () => {
    expect(WHO_CVD_REGIONS).toHaveLength(21);
    expect(Object.keys(WHO_CVD_REGION_COUNTRIES).sort()).toEqual([...WHO_CVD_REGIONS].sort());
    const whoCountries = Object.values(WHO_CVD_REGION_COUNTRIES).flat();
    expect(new Set(whoCountries).size).toBe(whoCountries.length);
    expect(whoCountries).toHaveLength(189);
    for (const region of WHO_CVD_REGIONS) {
      expect(WHO_CVD_REGION_COUNTRIES[region].length, region).toBeGreaterThan(0);
    }
  });

  test.each([
    ["FR", "low", "western-europe"],
    ["BE", "low", "western-europe"],
    ["LU", "low", "western-europe"],
    ["CH", "low", "western-europe"],
    ["DE", "moderate", "western-europe"],
    ["SM", "moderate", undefined],
    ["PL", "high", "central-europe"],
    ["TR", "high", "north-africa-and-middle-east"],
    ["MA", "very-high", "north-africa-and-middle-east"],
    ["DZ", "very-high", "north-africa-and-middle-east"],
    ["TN", "very-high", "north-africa-and-middle-east"],
    ["CA", undefined, "high-income-north-america"],
    ["US", undefined, "high-income-north-america"],
    ["BR", undefined, "tropical-latin-america"],
    ["SN", undefined, "western-sub-saharan-africa"],
    ["JP", undefined, "high-income-asia-pacific"],
  ] as const)("assigns %s to ESC region %s and WHO region %s", (code, esc, who) => {
    expect(escRiskRegionFor(code)).toBe(esc);
    expect(whoCvdRegionFor(code)).toBe(who);
  });

  test("normalises codes once and recognises no region for OTHER", () => {
    expect(normalizeCountryCode(" fr ")).toBe("FR");
    expect(escRiskRegionFor(" be ")).toBe("low");
    expect(whoCvdRegionFor("ca")).toBe("high-income-north-america");
    expect(usesPrevent(" us ")).toBe(true);
    expect(usesPrevent("CA")).toBe(false);
    expect(escRiskRegionFor(OTHER_COUNTRY_CODE)).toBeUndefined();
    expect(whoCvdRegionFor(OTHER_COUNTRY_CODE)).toBeUndefined();
  });

  test("lists the 27 EU member states, all of them selectable", () => {
    expect(EU_MEMBER_STATES).toHaveLength(27);
    expect(new Set(EU_MEMBER_STATES).size).toBe(27);
    for (const code of EU_MEMBER_STATES) expect(SELECTABLE_COUNTRY_CODES).toContain(code);
    expect(EU_MEMBER_STATES).not.toContain("GB");
    expect(EU_MEMBER_STATES).not.toContain("CH");
  });
});
