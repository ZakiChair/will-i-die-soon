import { readFileSync } from "node:fs";
import { Children, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { HERO_MOTION_BOOTSTRAP_SCRIPT } from "./lib/motion-bootstrap";

type InspectedElement = ReactElement<{
  children?: ReactNode;
  className?: string;
  dangerouslySetInnerHTML?: { __html: string };
  suppressHydrationWarning?: boolean;
}>;

const { dmSans, manrope } = vi.hoisted(() => ({
  dmSans: vi.fn(() => ({ variable: "--font-body" })),
  manrope: vi.fn(() => ({ variable: "--font-display" })),
}));

const requestHeaders = vi.hoisted(() => ({
  get: vi.fn<(name: string) => string | null>(),
}));

vi.mock("next/font/google", () => ({
  DM_Sans: dmSans,
  Manrope: manrope,
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

test("uses two locally hosted typefaces for titles and reading", async () => {
  await import("./layout");
  const source = readFileSync("app/layout.tsx", "utf8");

  expect(manrope).toHaveBeenCalledWith(expect.objectContaining({
    style: "normal",
    subsets: ["latin"],
    variable: "--font-display",
    weight: "variable",
  }));
  expect(dmSans).toHaveBeenCalledWith(expect.objectContaining({
    style: "normal",
    variable: "--font-body",
    weight: "variable",
  }));
  expect(source).toContain("--font-display");
  expect(source).toContain("--font-body");
  expect(source).not.toMatch(/Space_Grotesk|Geist_Mono|\bGeist\b/);
});

test("applies only two font resources; data shares the reading typeface", async () => {
  const { default: RootLayout } = await import("./layout");
  const tree = RootLayout({ children: "content" });
  const [head, body] = Children.toArray(tree.props.children) as InspectedElement[];

  expect(head.type).toBe("head");
  expect(body.type).toBe("body");
  expect(tree.props.suppressHydrationWarning).toBe(true);
  expect(body.props.className).toContain("--font-display");
  expect(body.props.className).toContain("--font-body");
  expect(body.props.className).not.toContain("--font-data");
  expect(body.props.className).not.toContain("--font-editorial");
});

test("owns the bootstrap script only at the document root and head", async () => {
  const { default: RootLayout } = await import("./layout");
  const tree = RootLayout({ children: "content" });
  const [head, body] = Children.toArray(tree.props.children) as InspectedElement[];
  const [script] = Children.toArray(head.props.children) as InspectedElement[];

  expect(tree.type).toBe("html");
  expect(tree.props.suppressHydrationWarning).toBe(true);
  expect(head.type).toBe("head");
  expect(script.type).toBe("script");
  expect(script.props.dangerouslySetInnerHTML).toEqual({
    __html: HERO_MOTION_BOOTSTRAP_SCRIPT,
  });
  expect(head.props.suppressHydrationWarning).toBeUndefined();
  expect(script.props.suppressHydrationWarning).toBeUndefined();
  expect(body.props.suppressHydrationWarning).toBeUndefined();
});
