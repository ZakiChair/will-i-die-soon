import { afterEach, expect, test, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-display" }),
  IBM_Plex_Mono: () => ({ variable: "--font-data" }),
  Manrope: () => ({ variable: "--font-body" }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadMetadata(siteUrl: string) {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  vi.resetModules();
  const { metadata } = await import("./layout");
  return metadata;
}

test("uses a safe local metadata base when the public site URL is absent or invalid", async () => {
  const missingUrlMetadata = await loadMetadata("");
  expect(missingUrlMetadata.metadataBase).toEqual(
    new URL("http://localhost:3000"),
  );

  const invalidUrlMetadata = await loadMetadata("not a URL");
  expect(invalidUrlMetadata.metadataBase).toEqual(
    new URL("http://localhost:3000"),
  );

  const unsupportedProtocolMetadata = await loadMetadata(
    "ftp://preview.example",
  );
  expect(unsupportedProtocolMetadata.metadataBase).toEqual(
    new URL("http://localhost:3000"),
  );
});

test("resolves one shared social image absolutely and gives Twitter explicit alt text", async () => {
  const metadata = await loadMetadata("https://preview.example/project/");
  const openGraphImages = metadata.openGraph?.images as Array<{
    url: string;
    alt?: string;
  }>;
  const twitterImages = metadata.twitter?.images as Array<{
    url: string;
    alt?: string;
  }>;

  expect(metadata.metadataBase).toEqual(
    new URL("https://preview.example/project/"),
  );
  expect(openGraphImages).toHaveLength(1);
  expect(twitterImages).toHaveLength(1);
  expect(twitterImages[0].url).toBe(openGraphImages[0].url);
  expect(twitterImages[0].alt).toBe(openGraphImages[0].alt);
  expect(twitterImages[0].alt).toMatch(/will i die soon/i);
  expect(new URL(openGraphImages[0].url, metadata.metadataBase!)).toEqual(
    new URL("https://preview.example/og.png"),
  );
  expect(new URL(twitterImages[0].url, metadata.metadataBase!)).toEqual(
    new URL("https://preview.example/og.png"),
  );
});
