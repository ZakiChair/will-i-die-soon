import { afterEach, expect, test, vi } from "vitest";

const requestHeaders = vi.hoisted(() => ({
  get: vi.fn<(name: string) => string | null>(),
}));

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-display" }),
  IBM_Plex_Mono: () => ({ variable: "--font-data" }),
  Manrope: () => ({ variable: "--font-body" }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: requestHeaders.get })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  requestHeaders.get.mockReset();
  vi.resetModules();
});

async function loadMetadata(
  siteUrl: string,
  values: Readonly<Record<string, string>> = {},
) {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  requestHeaders.get.mockImplementation((name) => values[name] ?? null);
  vi.resetModules();
  const { generateMetadata } = await import("./layout");
  return generateMetadata();
}

test("generates absolute metadata from the routed host despite a conflicting forwarded host", async () => {
  const metadata = await loadMetadata("", {
    "x-forwarded-host": "attacker.example, internal.invalid",
    "x-forwarded-proto": "https, http",
    host: "private-preview.example",
  });
  const openGraphImages = metadata.openGraph?.images as Array<{
    url: URL;
    alt?: string;
  }>;
  const twitterImages = metadata.twitter?.images as Array<{
    url: URL;
    alt?: string;
  }>;

  expect(metadata.metadataBase).toEqual(new URL("https://private-preview.example/"));
  expect(metadata.alternates?.canonical).toEqual(
    new URL("https://private-preview.example/"),
  );
  expect(metadata.openGraph?.url).toEqual(
    new URL("https://private-preview.example/"),
  );
  expect(openGraphImages).toHaveLength(1);
  expect(openGraphImages[0].url).toEqual(
    new URL("https://private-preview.example/og.png"),
  );
  expect(twitterImages).toHaveLength(1);
  expect(twitterImages[0]).toEqual(openGraphImages[0]);
  expect(twitterImages[0].alt).toMatch(/will i die soon/i);
  expect(metadata.icons).toEqual({ icon: "/favicon.svg" });
});

test("lets a valid configured origin override request headers", async () => {
  const metadata = await loadMetadata("https://configured.example", {
    "x-forwarded-host": "request.example",
    "x-forwarded-proto": "https",
  });

  expect(metadata.metadataBase).toEqual(new URL("https://configured.example/"));
  expect(metadata.openGraph?.url).toEqual(new URL("https://configured.example/"));
});

test("falls back locally when configured and request values are hostile", async () => {
  const metadata = await loadMetadata("https://configured.example?", {
    "x-forwarded-host": "safe.example, attacker.example",
    "x-forwarded-proto": "javascript, https",
    host: "attacker.example,safe.example",
  });

  expect(metadata.metadataBase).toEqual(new URL("http://localhost:3000/"));
  expect(metadata.alternates?.canonical).toEqual(new URL("http://localhost:3000/"));
  expect(metadata.openGraph?.url).toEqual(new URL("http://localhost:3000/"));
});
