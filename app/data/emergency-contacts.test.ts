import { describe, expect, test } from "vitest";

import { EU_MEMBER_STATES } from "./countries";
import {
  CRISIS_LINE_SOURCE_KEYS,
  EMERGENCY_NUMBER_SOURCE_KEYS,
  POISON_LINE_SOURCE_KEYS,
  emergencyContactsFor,
} from "./emergency-contacts";
import { evidenceSources } from "./evidence";

const allSources = Object.values(evidenceSources);

describe("emergency contacts", () => {
  test.each([
    ["US", { emergency: "911", crisis: [{ number: "988", textMessages: true }] }],
    ["GB", { emergency: "999", crisis: [] }],
    ["CH", { emergency: "144", crisis: [{ number: "143" }], poison: "145" }],
    ["FR", { emergency: "15", crisis: [{ number: "3114" }] }],
    ["CA", { emergency: "911", crisis: [{ number: "988", textMessages: true }] }],
    [
      "BE",
      {
        emergency: "112",
        crisis: [
          { number: "0800 32 123", language: "fr" },
          { number: "1813", language: "nl" },
        ],
        poison: "070 245 245",
      },
    ],
    ["LU", { emergency: "112", crisis: [], poison: "8002-5500" }],
    ["DE", { emergency: "112", crisis: [] }],
    ["MA", { crisis: [] }],
    ["DZ", { crisis: [] }],
    ["TN", { crisis: [] }],
    ["OTHER", { crisis: [] }],
  ] as const)("publishes only the sourced numbers for %s", (country, expected) => {
    expect(emergencyContactsFor(country, allSources)).toEqual(expected);
  });

  test("gives every EU member state without its own national entry the European 112", () => {
    for (const country of EU_MEMBER_STATES.filter((code) => code !== "FR")) {
      expect(emergencyContactsFor(country, allSources).emergency, country).toBe("112");
    }
  });

  test("drops a number whose own source the leaf did not retain", () => {
    const without = (id: string) => allSources.filter((source) => source.id !== id);

    expect(emergencyContactsFor("FR", without(evidenceSources.france3114.id))).toEqual({
      emergency: "15",
      crisis: [],
    });
    expect(
      emergencyContactsFor("FR", without(evidenceSources.servicePublicEmergencyNumbers.id)),
    ).toEqual({ crisis: [{ number: "3114" }] });
    expect(emergencyContactsFor("CH", without(evidenceSources.fophUfiEmergency.id))).toEqual({
      emergency: "144",
      crisis: [{ number: "143" }],
    });
  });

  test("never lets one country's source publish another country's number", () => {
    expect(
      emergencyContactsFor("CA", [evidenceSources.samhsa988, evidenceSources.crtc911]),
    ).toEqual({ emergency: "911", crisis: [] });
    expect(emergencyContactsFor("US", [evidenceSources.crtc911, evidenceSources.canada988])).toEqual({
      crisis: [],
    });
  });

  test("requires the retained source to cover the country operationally", () => {
    const belgiumOnly = { ...evidenceSources.belgiumPoisonCentre, operationalCountries: ["BE"] };

    expect(emergencyContactsFor("LU", [evidenceSources.eu112, belgiumOnly])).toEqual({
      emergency: "112",
      crisis: [],
    });
  });

  test("normalises the profile country", () => {
    expect(emergencyContactsFor(" be ", allSources).emergency).toBe("112");
    expect(emergencyContactsFor("fr", allSources).emergency).toBe("15");
  });

  test("scopes every number source to the countries it publishes for", () => {
    const keys = [
      ...EMERGENCY_NUMBER_SOURCE_KEYS.filter((key) => key !== "whoBasicEmergencyCare"),
      ...CRISIS_LINE_SOURCE_KEYS,
      ...POISON_LINE_SOURCE_KEYS,
    ];
    for (const key of keys) {
      const source = evidenceSources[key];
      expect(source.operationalCountries?.length, key).toBeGreaterThan(0);
      expect(source.applicability.countries, key).toEqual(source.operationalCountries);
    }
    expect(evidenceSources.whoBasicEmergencyCare.operationalCountries).toBeUndefined();
  });
});
