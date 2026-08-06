import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
  test("uses the approved question title and detail hierarchy", () => {
    expect(css).toMatch(
      /\.question-sheet \.question-prompt__title[^{]*\{[^}]*max-width:\s*28ch[^}]*font-size:\s*clamp\(2\.125rem,\s*2\.75vw,\s*2\.75rem\)[^}]*letter-spacing:\s*-\.035em[^}]*line-height:\s*1\.08/s,
    );
    expect(css).toMatch(
      /\.question-sheet \.question-prompt__title--split[^{]*\{[^}]*margin-bottom:\s*12px/s,
    );
    expect(css).toMatch(
      /\.question-prompt__detail[^{]*\{[^}]*max-width:\s*64ch[^}]*margin:\s*0 0 clamp\(22px,\s*2vw,\s*28px\)[^}]*font-size:\s*clamp\(1rem,\s*1\.2vw,\s*1\.125rem\)[^}]*line-height:\s*1\.55/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]+\.question-sheet \.question-prompt__title[^{]*\{[^}]*font-size:\s*clamp\(1\.75rem,\s*7vw,\s*2\.125rem\)/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]+\.question-prompt__detail[^{]*\{[^}]*font-size:\s*1rem/s,
    );
  });

  test("gives the question more room while keeping the chapter rail passive", () => {
    expect(css).toMatch(
      /\.assessment__layout\s*\{[^}]*grid-template-columns:\s*minmax\(230px,\s*\.52fr\) minmax\(0,\s*1\.48fr\)[^}]*gap:\s*clamp\(24px,\s*4vw,\s*56px\)/s,
    );
    expect(css).toMatch(
      /\.pillar-progress__chapters\s*\{[^}]*grid-template-columns:\s*1fr/s,
    );
    expect(css).toMatch(
      /\.question-sheet\s*\{[^}]*padding:\s*clamp\(24px,\s*3\.5vw,\s*48px\)/s,
    );
    expect(css).toMatch(/\.safety-screen h1\s*\{/);
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

  test("keeps the botanical motif on the journey layer with readable and dense content surfaces", () => {
    expect(css).toMatch(/--motif-canopy:\s*url\("\/media\/canopy-hero\.webp"\)/);
    expect(css).toMatch(/--motif-wash:\s*rgb\(244 247 245 \/ 92%\)/);
    expect(css).toMatch(/--motif-wash-dense:\s*rgb\(244 247 245 \/ 96%\)/);
    expect(css).toMatch(/--surface-readable:\s*rgb\(255 255 255 \/ 88%\)/);
    expect(css.match(/body\s*\{[^}]*\}/s)?.[0]).not.toMatch(/var\(--motif-canopy\)/);
    expect(css).toMatch(/\.journey::before\s*\{[^}]*var\(--motif-canopy\)[^;]+no-repeat/s);
    expect(css).toMatch(/\.consent__body[^{]*\{[^}]*background:\s*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.question-sheet[^{]*\{[^}]*background:\s*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.risk-tree\s*\{[^}]*var\(--surface-readable\)/s);
    expect(css).toMatch(/\.lab-import[^{]*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/\.lab-review__row\s*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/\.confirmed-labs table\s*\{[^}]*background:\s*var\(--motif-wash-dense\)/s);
    expect(css).toMatch(/@media print[\s\S]+body\s*\{[^}]*background:\s*white[^}]*background-image:\s*none/s);
    expect(css).toMatch(/@media print[\s\S]+\.journey::before\s*\{[^}]*display:\s*none/s);
  });

  test("contains the lab report file control within the import card", () => {
    const fileInputRule = css.match(
      /\.lab-import__source input\[type="file"\]\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;

    expect(fileInputRule).toMatch(/width:\s*100%/);
    expect(fileInputRule).toMatch(/min-width:\s*0/);
  });

  test("keeps Cardio intermission artwork responsive without landing video rules", () => {
    expect(css).toMatch(
      /\.intermission__media\s+(?:img|> img)[^{]*\{[^}]*object-fit:\s*cover/s,
    );
    expect(css).toMatch(
      /\.intermission__media\s+(?:video|> video)[^{]*\{[^}]*object-fit:\s*cover/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]+\.intermission__[^{]+\{/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]+\.intermission__video\s*\{[^}]*display:\s*none/s,
    );
  });

  test("keeps the intermission poster visible until its local video can play", () => {
    expect(css).toMatch(
      /\.intermission__poster--covered\s*\{[^}]*opacity:\s*0[^}]*visibility:\s*hidden/s,
    );
    expect(css).toMatch(
      /\.intermission__video\s*\{[^}]*opacity:\s*0/s,
    );
    expect(css).toMatch(
      /\.intermission__video--ready\s*\{[^}]*opacity:\s*1[^}]*visibility:\s*visible/s,
    );
  });

  test("ships a bounded local Human Atlas asset and its responsive fallback rules", () => {
    const atlasPath = join(process.cwd(), "public/media/human-atlas-hero.webp");
    const atlasAsset = existsSync(atlasPath) ? readFileSync(atlasPath) : Buffer.alloc(0);

    expect(existsSync(atlasPath)).toBe(true);
    expect(atlasAsset.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(atlasAsset.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(atlasAsset.byteLength).toBeLessThanOrEqual(650 * 1024);
    expect(createHash("sha256").update(atlasAsset).digest("hex")).toBe(
      "049911bc3c13c1151155d05c2449a629d801b9bfb3941c022e7b1a2af83f35e0",
    );
    expect(existsSync(join(process.cwd(), "public/media/canopy-loop.mp4"))).toBe(false);
    expect(css).toMatch(/\.human-atlas-stage\s*\{[^}]*position:\s*sticky/s);
    expect(css).toMatch(/\.human-atlas-media\s*\{[^}]*aspect-ratio:\s*1672 \/ 941/s);
    expect(css).toMatch(/@media \(max-width: 780px\)[\s\S]+\.human-atlas-media\s*\{[^}]*translate\(-62%,\s*-50%\)/s);
    expect(css).toMatch(/\.human-atlas-glow\s*\{[^}]*mix-blend-mode:\s*screen/s);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]+\.human-atlas-glow/s);
    expect(css).toMatch(/@media print[\s\S]+\.human-atlas-stage[^}]*display:\s*none/s);
    expect(css).not.toMatch(/\.landing__canopy-video/);
  });

  test("fills an edge-to-edge viewport with one registered Human Atlas frame", () => {
    const landing = css.match(/\.landing\s*\{(?<declarations>[^}]+)\}/s)?.groups?.declarations;
    const experience = css.match(
      /\.landing__atlas-experience\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;
    const stage = css.match(
      /\.human-atlas-stage\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;
    const media = css.match(
      /\.human-atlas-media\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;

    expect(landing).toMatch(/padding:\s*0 0 56px/);
    expect(experience).toMatch(/--atlas-stage-height:\s*100svh/);
    expect(experience).toMatch(/width:\s*100%/);
    expect(experience).toMatch(/margin:\s*clamp\(16px,\s*2vw,\s*28px\) 0 0/);
    expect(stage).toMatch(/top:\s*0/);
    expect(stage).toMatch(/height:\s*var\(--atlas-stage-height\)/);
    expect(stage).toMatch(/min-height:\s*0/);
    expect(stage).toMatch(/border:\s*0/);
    expect(media).toMatch(/top:\s*50%/);
    expect(media).toMatch(/left:\s*50%/);
    expect(media).toMatch(/height:\s*100%/);
    expect(media).toMatch(/aspect-ratio:\s*1672 \/ 941/);
    expect(media).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(css).toMatch(
      /@media \(min-aspect-ratio: 1672 \/ 941\)[\s\S]+\.human-atlas-media\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 780px\)[\s\S]+\.landing__atlas-experience\s*\{[^}]*width:\s*100%/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 780px\)[\s\S]+\.human-atlas-media\s*\{[^}]*translate\(-62%,\s*-50%\)/s,
    );
  });

  test("shows only the static breath glow when reduced motion is requested", () => {
    const reducedMotionRules = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{(?<rules>[\s\S]*?)\n}\n\n\[data-motion="paused"\]/,
    )?.groups?.rules;

    expect(reducedMotionRules).toMatch(
      /\.human-atlas-glow\[data-active="true"\]\s*\{[^}]*opacity:\s*0/s,
    );
    expect(reducedMotionRules).toMatch(
      /\.human-atlas-glow--breath,\s*\.human-atlas-glow--breath\[data-active="true"\]\s*\{[^}]*opacity:\s*\.76/s,
    );
  });

  test("keeps the Human Atlas hero and story in separate print flow", () => {
    const printRules = css.match(
      /@media print\s*\{(?<rules>[\s\S]*)\}\s*$/,
    )?.groups?.rules;

    expect(printRules).toMatch(
      /\.landing__atlas-experience\s*\{[^}]*width:\s*100%[^}]*margin:\s*0/s,
    );
    expect(printRules).toMatch(
      /\.landing__atlas-hero\s*\{[^}]*position:\s*static[^}]*width:\s*100%[^}]*margin-bottom:\s*24px/s,
    );
  });

  test("keeps Human Atlas input microcopy at least eleven CSS pixels", () => {
    const microcopyRule = css.match(
      /\.human-atlas-scene small, \.human-atlas-static small\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;
    const size = microcopyRule?.match(
      /font-size:\s*(?<value>[\d.]+)(?<unit>rem|px)/,
    )?.groups;

    expect(size).toBeDefined();
    const remSize = size?.unit === "px"
      ? Number(size.value) / 16
      : Number(size?.value);
    expect(remSize).toBeGreaterThanOrEqual(0.6875);
  });

  test("makes a failed pillar poster expose the ambient page surface", () => {
    expect(css).toMatch(
      /\.intermission__media--poster-failed\s*\{[^}]*background:\s*transparent/s,
    );
    expect(css).toMatch(
      /\.intermission__media--poster-failed::after\s*\{[^}]*background:\s*transparent/s,
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

  test("lays out four stable pillar branches in a desktop grid and mobile column while the foundation remains a block below it", () => {
    expect(css).toMatch(/\.risk-tree__branches\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    expect(css).toMatch(/\.risk-tree__branch--cardio-energy\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--strength-neural\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--sleep-circadian\s*\{/);
    expect(css).toMatch(/\.risk-tree__branch--nutrition-metabolic\s*\{/);
    const foundationRule = css.match(
      /\.risk-tree__foundation\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;
    expect(foundationRule).not.toMatch(/grid-column/);
    expect(foundationRule).toMatch(/width:\s*100%/);
    expect(css).not.toMatch(/\.risk-tree__branch--(?:urgent|review|longer|protective)\s*\{/);
    expect(css).toMatch(/@media \(max-width: 560px\)[\s\S]+\.risk-tree__branches\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/\.risk-tree__leaf-meta\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });

  test("scopes the passive pillar chapter rail and stacks its chapters", () => {
    expect(css).toMatch(/\.pillar-progress\s*\{[^}]*display:\s*grid/s);
    expect(css).toMatch(/\.pillar-progress__chapter\s*\{[^}]*display:\s*grid/s);
    expect(css).toMatch(/\.pillar-progress__chapter--completed\s*\{/);
    expect(css).toMatch(/\.pillar-progress__chapter--current\s*\{/);
    expect(css).toMatch(/\.pillar-progress__chapter--upcoming\s*\{/);
    expect(css).toMatch(
      /\.pillar-progress__chapters\s*\{[^}]*grid-template-columns:\s*1fr/s,
    );
  });

  test("scopes action-card layout and counters to direct action rows", () => {
    expect(css).toMatch(/\.action-plan > ol > li\s*\{/);
    expect(css).toMatch(/\.action-plan > ol > li::before\s*\{/);
    expect(css).not.toMatch(/\.action-plan li\s*\{/);
    expect(css).not.toMatch(/\.action-plan li::before\s*\{/);
    expect(css).toMatch(/\.action-plan__sources\s*\{[^}]*list-style:\s*none/s);
  });
});
