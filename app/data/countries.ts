/**
 * Countries the profile can name, with the cardiovascular risk region each
 * published model assigns them. Codes are ISO 3166-1 alpha-2; `OTHER` stands
 * for any country or region outside these lists.
 */

export const OTHER_COUNTRY_CODE = "OTHER";

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

export type EscRiskRegion = "low" | "moderate" | "high" | "very-high";

/** ESC HeartScore risk regions, shared by SCORE2, SCORE2-OP and SCORE2-Diabetes. */
export const ESC_RISK_REGIONS: Readonly<Record<EscRiskRegion, ReadonlyArray<string>>> = {
  low: ["BE", "CH", "DK", "ES", "FR", "GB", "IL", "LU", "NL", "NO"],
  moderate: ["AT", "CY", "DE", "FI", "GR", "IE", "IS", "IT", "MT", "PT", "SE", "SI", "SM"],
  high: ["AL", "BA", "CZ", "EE", "HR", "HU", "KZ", "PL", "SK", "TR"],
  "very-high": [
    "AM", "AZ", "BG", "BY", "DZ", "EG", "GE", "KG", "LB", "LT", "LV", "LY",
    "MA", "MD", "ME", "MK", "RO", "RS", "RU", "SY", "TN", "UA", "UZ",
  ],
};

export const WHO_CVD_REGIONS = [
  "andean-latin-america",
  "australasia",
  "caribbean",
  "central-asia",
  "central-europe",
  "central-latin-america",
  "central-sub-saharan-africa",
  "east-asia",
  "eastern-europe",
  "eastern-sub-saharan-africa",
  "high-income-asia-pacific",
  "high-income-north-america",
  "north-africa-and-middle-east",
  "oceania",
  "south-asia",
  "southeast-asia",
  "southern-latin-america",
  "southern-sub-saharan-africa",
  "tropical-latin-america",
  "western-europe",
  "western-sub-saharan-africa",
] as const;

export type WhoCvdRegion = (typeof WHO_CVD_REGIONS)[number];

/** Countries printed on each regional WHO 2019 cardiovascular risk chart. */
export const WHO_CVD_REGION_COUNTRIES: Readonly<Record<WhoCvdRegion, ReadonlyArray<string>>> = {
  "andean-latin-america": ["BO", "EC", "PE"],
  australasia: ["AU", "NZ"],
  caribbean: [
    "AG", "BB", "BM", "BS", "BZ", "CU", "DM", "DO", "GD", "GY", "HT", "JM",
    "LC", "PR", "SR", "TT", "VC",
  ],
  "central-asia": ["AM", "AZ", "GE", "KG", "KZ", "MN", "TJ", "TM", "UZ"],
  "central-europe": ["AL", "BA", "BG", "CZ", "HR", "HU", "ME", "MK", "PL", "RO", "RS", "SI", "SK"],
  "central-latin-america": ["CO", "CR", "GT", "HN", "MX", "NI", "PA", "SV", "VE"],
  "central-sub-saharan-africa": ["AO", "CD", "CF", "CG", "GA", "GQ"],
  "east-asia": ["CN", "KP"],
  "eastern-europe": ["BY", "EE", "LT", "LV", "MD", "RU", "UA"],
  "eastern-sub-saharan-africa": [
    "BI", "DJ", "ER", "ET", "KE", "KM", "MG", "MW", "MZ", "RW", "SO", "TZ", "UG", "ZM",
  ],
  "high-income-asia-pacific": ["BN", "JP", "KR", "SG"],
  "high-income-north-america": ["CA", "GL", "US"],
  "north-africa-and-middle-east": [
    "AE", "AF", "BH", "DZ", "EG", "IQ", "IR", "JO", "KW", "LB", "LY", "MA",
    "OM", "PS", "QA", "SA", "SD", "SY", "TN", "TR", "YE",
  ],
  oceania: ["FJ", "FM", "KI", "MH", "PG", "SB", "TO", "VU", "WS"],
  "south-asia": ["BD", "BT", "IN", "NP", "PK"],
  "southeast-asia": ["ID", "KH", "LA", "LK", "MM", "MU", "MV", "MY", "PH", "SC", "TH", "TL", "VN"],
  "southern-latin-america": ["AR", "CL", "UY"],
  "southern-sub-saharan-africa": ["BW", "LS", "NA", "SZ", "ZA", "ZW"],
  "tropical-latin-america": ["BR", "PY"],
  "western-europe": [
    "AD", "AT", "BE", "CH", "CY", "DE", "DK", "ES", "FI", "FR", "GB", "GR",
    "IE", "IL", "IS", "IT", "LU", "MT", "NL", "NO", "PT", "SE",
  ],
  "western-sub-saharan-africa": [
    "BF", "BJ", "CI", "CM", "CV", "GH", "GM", "GN", "GW", "LR", "ML", "MR",
    "NE", "NG", "SL", "SN", "ST", "TD", "TG",
  ],
};

/** Countries where the AHA PREVENT equations were derived and are recommended. */
export const PREVENT_COUNTRIES: ReadonlyArray<string> = ["US"];

export const EU_MEMBER_STATES: ReadonlyArray<string> = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
];

const escRegionByCountry = new Map<string, EscRiskRegion>(
  (Object.entries(ESC_RISK_REGIONS) as Array<[EscRiskRegion, ReadonlyArray<string>]>).flatMap(
    ([region, countries]) => countries.map((country) => [country, region] as const),
  ),
);

const whoRegionByCountry = new Map<string, WhoCvdRegion>(
  WHO_CVD_REGIONS.flatMap((region) =>
    WHO_CVD_REGION_COUNTRIES[region].map((country) => [country, region] as const),
  ),
);

export function escRiskRegionFor(countryCode: string): EscRiskRegion | undefined {
  return escRegionByCountry.get(normalizeCountryCode(countryCode));
}

export function whoCvdRegionFor(countryCode: string): WhoCvdRegion | undefined {
  return whoRegionByCountry.get(normalizeCountryCode(countryCode));
}

export function usesPrevent(countryCode: string): boolean {
  return PREVENT_COUNTRIES.includes(normalizeCountryCode(countryCode));
}

/** Every country the selector names, in code order; `OTHER` is offered separately. */
export const SELECTABLE_COUNTRY_CODES: ReadonlyArray<string> = [
  ...new Set([...escRegionByCountry.keys(), ...whoRegionByCountry.keys(), ...PREVENT_COUNTRIES]),
].sort();
