import type { EvidenceSource } from "../lib/types";
import { EU_MEMBER_STATES, normalizeCountryCode } from "./countries";
import { evidenceSources } from "./evidence";

type SourceKey = keyof typeof evidenceSources;

/** Cited by every urgent rule, so each country's emergency number can be shown. */
export const EMERGENCY_NUMBER_SOURCE_KEYS = [
  "whoBasicEmergencyCare",
  "us911EmergencyAssistance",
  "nhsWhenToCall999",
  "swissEmergencyNumbers",
  "servicePublicEmergencyNumbers",
  "crtc911",
  "eu112",
] as const satisfies ReadonlyArray<SourceKey>;

/** Cited by the self-harm rule. */
export const CRISIS_LINE_SOURCE_KEYS = [
  "samhsa988",
  "canada988",
  "france3114",
  "belgiumSuicidePrevention",
  "belgiumZelfmoordlijn",
  "swiss143",
] as const satisfies ReadonlyArray<SourceKey>;

/** Cited by the overdose and poisoning rule. */
export const POISON_LINE_SOURCE_KEYS = [
  "fophUfiEmergency",
  "belgiumPoisonCentre",
] as const satisfies ReadonlyArray<SourceKey>;

export type CrisisLine = {
  readonly number: string;
  readonly textMessages?: true;
  /** Set when the country runs one line per language. */
  readonly language?: "fr" | "nl";
};

type SourcedNumber = { readonly number: string; readonly source: SourceKey };

type CountryNumbers = {
  readonly emergency?: SourcedNumber;
  readonly crisis?: ReadonlyArray<CrisisLine & { readonly source: (typeof CRISIS_LINE_SOURCE_KEYS)[number] }>;
  readonly poison?: SourcedNumber & { readonly source: (typeof POISON_LINE_SOURCE_KEYS)[number] };
};

const EU_112: SourcedNumber = { number: "112", source: "eu112" };

const NUMBERS_BY_COUNTRY: Readonly<Record<string, CountryNumbers>> = {
  ...Object.fromEntries(EU_MEMBER_STATES.map((country) => [country, { emergency: EU_112 }])),
  US: {
    emergency: { number: "911", source: "us911EmergencyAssistance" },
    crisis: [{ number: "988", textMessages: true, source: "samhsa988" }],
  },
  GB: { emergency: { number: "999", source: "nhsWhenToCall999" } },
  CH: {
    emergency: { number: "144", source: "swissEmergencyNumbers" },
    crisis: [{ number: "143", source: "swiss143" }],
    poison: { number: "145", source: "fophUfiEmergency" },
  },
  FR: {
    emergency: { number: "15", source: "servicePublicEmergencyNumbers" },
    crisis: [{ number: "3114", source: "france3114" }],
  },
  CA: {
    emergency: { number: "911", source: "crtc911" },
    crisis: [{ number: "988", textMessages: true, source: "canada988" }],
  },
  BE: {
    emergency: EU_112,
    crisis: [
      { number: "0800 32 123", language: "fr", source: "belgiumSuicidePrevention" },
      { number: "1813", language: "nl", source: "belgiumZelfmoordlijn" },
    ],
    poison: { number: "070 245 245", source: "belgiumPoisonCentre" },
  },
  LU: {
    emergency: EU_112,
    poison: { number: "8002-5500", source: "belgiumPoisonCentre" },
  },
};

export type EmergencyContacts = {
  readonly emergency?: string;
  readonly crisis: ReadonlyArray<CrisisLine>;
  readonly poison?: string;
};

/**
 * The numbers to show for one urgent leaf. A number appears only when the leaf
 * retained the source that publishes it and that source covers the country.
 */
export function emergencyContactsFor(
  countryCode: string,
  sources: ReadonlyArray<EvidenceSource>,
): EmergencyContacts {
  const country = normalizeCountryCode(countryCode);
  const numbers = NUMBERS_BY_COUNTRY[country];
  if (!numbers) return { crisis: [] };

  const supported = (key: SourceKey) =>
    sources.some(
      (source) =>
        source.id === evidenceSources[key].id &&
        source.operationalCountries?.includes(country) === true,
    );

  return {
    ...(numbers.emergency && supported(numbers.emergency.source)
      ? { emergency: numbers.emergency.number }
      : {}),
    crisis: (numbers.crisis ?? [])
      .filter((line) => supported(line.source))
      .map((line) => ({
        number: line.number,
        ...(line.textMessages ? { textMessages: true as const } : {}),
        ...(line.language ? { language: line.language } : {}),
      })),
    ...(numbers.poison && supported(numbers.poison.source) ? { poison: numbers.poison.number } : {}),
  };
}
