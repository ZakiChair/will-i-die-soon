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
  test("uses the smaller question-heading scale at desktop and mobile widths", () => {
    expect(css).toMatch(
      /\.question-sheet h1[^{]*\{[^}]*font-size:\s*clamp\(1\.9rem,\s*3\.4vw,\s*3\.75rem\)/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]+\.question-sheet h1[^{]*\{[^}]*clamp\(1\.7rem,\s*7\.4vw,\s*2\.6rem\)/s,
    );
  });

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

  test("retains focus-visible targeting and reduced-motion behavior without canopy controls", () => {
    expect(css).toMatch(/button:focus-visible/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).not.toMatch(/\.canopy__leaf/);
  });

  test("uses the botanical motif with readable and dense content surfaces", () => {
    expect(css).toMatch(/--motif-canopy:\s*url\("\/media\/canopy-hero\.webp"\)/);
    expect(css).toMatch(/--motif-wash:\s*rgb\(244 247 245 \/ 92%\)/);
    expect(css).toMatch(/--motif-wash-dense:\s*rgb\(244 247 245 \/ 96%\)/);
    expect(css).toMatch(/--surface-readable:\s*rgb\(255 255 255 \/ 88%\)/);
    expect(css).toMatch(/body\s*\{[\s\S]*var\(--motif-canopy\)[^;]+no-repeat/s);
    expect(css).toMatch(/\.consent__body[^{]*\{[^}]*background:\s*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.question-sheet[^{]*\{[^}]*background:\s*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.risk-tree\s*\{[^}]*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.lab-import[^{]*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/\.lab-review__row\s*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/\.confirmed-labs table\s*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/@media \(max-width: 560px\)[\s\S]+background-size:\s*100% 760px, auto 760px, 100% 100%/s);
    expect(css).toMatch(/@media print[\s\S]+body\s*\{[^}]*background:\s*white[^}]*background-image:\s*none/s);
    expect(css).toMatch(/@media print[\s\S]+\.landing__canopy-media,\s*\.intermission__media\s*\{[^}]*display:\s*none/s);
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

  test("shows exactly one canopy layer before and after the video becomes playable", () => {
    expect(css).toMatch(
      /\.landing__canopy-poster\s*\{[^}]*opacity:\s*\.78/s,
    );
    expect(css).toMatch(
      /\.landing__canopy-poster--covered\s*\{[^}]*opacity:\s*0[^}]*visibility:\s*hidden/s,
    );
    expect(css).toMatch(
      /\.landing__canopy-video\s*\{[^}]*opacity:\s*0/s,
    );
    expect(css).toMatch(
      /\.landing__canopy-video--ready\s*\{[^}]*opacity:\s*\.78/s,
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

  test("lays out four stable pillar branches in a desktop grid and mobile column with a full-width foundation", () => {
    expect(css).toMatch(/\.risk-tree__branches\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    expect(css).toMatch(/\.risk-tree__branch--cardio-energy\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--strength-neural\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--sleep-circadian\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--nutrition-metabolic\s*\{/);
    expect(css).toMatch(/\.risk-tree__foundation\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
    expect(css).not.toMatch(/\.risk-tree__branch--(?:urgent|review|longer|protective)\s*\{/);
    expect(css).toMatch(/@media \(max-width: 560px\)[\s\S]+\.risk-tree__branches\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/\.risk-tree__leaf-meta\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });

  test("scopes action-card layout and counters to direct action rows", () => {
    expect(css).toMatch(/\.action-plan > ol > li\s*\{/);
    expect(css).toMatch(/\.action-plan > ol > li::before\s*\{/);
    expect(css).not.toMatch(/\.action-plan li\s*\{/);
    expect(css).not.toMatch(/\.action-plan li::before\s*\{/);
    expect(css).toMatch(/\.action-plan__sources\s*\{[^}]*list-style:\s*none/s);
  });
});
