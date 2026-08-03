import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function colorVariable(name: string): string {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
  if (!value) throw new Error(`Missing --${name} color variable`);
  return value;
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${hex}`);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(left: string, right: string): number {
  const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("global interaction styles", () => {
  test("uses a two-color focus-visible indicator that contrasts on paper and deep water", () => {
    const focusRule = css.match(
      /button:focus-visible[^{]+\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;

    expect(focusRule).toMatch(/outline:\s*3px solid var\(--signal-amber\)/);
    expect(focusRule).toMatch(/box-shadow:\s*0 0 0 8px var\(--deep-water\)/);
    expect(focusRule).not.toMatch(/electric-blue/);
    expect(
      contrast(colorVariable("deep-water"), colorVariable("paper")),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(colorVariable("signal-amber"), colorVariable("deep-water")),
    ).toBeGreaterThanOrEqual(3);
  });

  test("retains focus-visible targeting and reduced-motion behavior", () => {
    expect(css).toMatch(/button:focus-visible/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.canopy__leaf:focus-visible[^}]+transform:\s*none/s);
  });

  test("crops decorative artwork responsively and removes video under reduced motion", () => {
    expect(css).toMatch(
      /\.landing__canopy-media\s+(?:img|> img)[^{]*\{[^}]*object-fit:\s*cover/s,
    );
    expect(css).toMatch(
      /\.intermission__media\s+(?:img|> img)[^{]*\{[^}]*object-fit:\s*cover/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]+\.intermission__[^{]+\{/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]+\.landing__canopy-video\s*\{[^}]*display:\s*none/s,
    );
  });

  test("keeps both focus rings when a risk-tree button is selected or hovered", () => {
    const riskTreeFocusRule = css.match(
      /\.risk-tree__leaves button:hover:focus-visible,[^{]+\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;

    expect(riskTreeFocusRule).toMatch(
      /box-shadow:\s*inset 5px 0 var\(--electric-blue\),\s*0 0 0 8px var\(--deep-water\)/,
    );
    expect(
      css.indexOf(".risk-tree__leaves button:hover:focus-visible"),
    ).toBeGreaterThan(css.indexOf(".risk-tree__leaves button:hover,"));
  });

  test("scopes action-card layout and counters to direct action rows", () => {
    expect(css).toMatch(/\.action-plan > ol > li\s*\{/);
    expect(css).toMatch(/\.action-plan > ol > li::before\s*\{/);
    expect(css).not.toMatch(/\.action-plan li\s*\{/);
    expect(css).not.toMatch(/\.action-plan li::before\s*\{/);
    expect(css).toMatch(/\.action-plan__sources\s*\{[^}]*list-style:\s*none/s);
  });
});
