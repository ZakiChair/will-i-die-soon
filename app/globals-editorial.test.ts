import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function declarationsFor(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = source.match(
    new RegExp(`${escapedSelector}\\s*\\{(?<declarations>[^}]+)\\}`, "s"),
  )?.groups?.declarations;
  if (direct) return direct;

  const grouped = [...source.matchAll(
    /(?<selectors>[^{}]+)\{(?<declarations>[^{}]+)\}/g,
  )].find((match) => match.groups?.selectors
    .split(",")
    .map((item) => item.trim())
    .includes(selector))
    ?.groups?.declarations;
  if (!grouped) throw new Error(`Missing CSS rule for ${selector}`);
  return grouped;
}

const newsreaderSelectors = [
  ".landing__atlas-hero h1",
  ".landing__atlas-conversion h2",
  ".depth-section .section-heading h2",
  ".privacy-panel h2",
  ".results__intro h1",
  ".results-canopy > .section-heading h2",
  ".score-sheet h2",
  ".express-results > h2",
  ".habits-map > h2",
  ".action-plan > h2",
  ".confirmed-labs > h2",
];

test.each(newsreaderSelectors)("assigns Newsreader to %s", (selector) => {
  expect(declarationsFor(css, selector)).toMatch(/font-family:\s*var\(--font-display\)/);
});

test("uses optical Newsreader only for approved editorial headings", () => {
  for (const selector of newsreaderSelectors) {
    expect(declarationsFor(css, selector)).toMatch(/font-optical-sizing:\s*auto/);
  }
  expect(css).not.toMatch(/font-family:\s*var\(--font-display\), Arial, sans-serif/);
});

test("keeps Manrope as the UI and non-editorial heading default", () => {
  expect(declarationsFor(css, "body")).toMatch(/var\(--font-body\)/);
  expect(declarationsFor(css, "h1, h2, h3")).toMatch(/var\(--font-body\)/);
  expect(declarationsFor(css, ".wordmark")).toMatch(/var\(--font-body\)/);
});

const monoSelectors = [
  ".language-switcher__option",
  ".data-label",
  ".depth-card__eyebrow",
  ".privacy-panel__eyebrow",
  ".landing__scroll-hint",
  ".human-atlas-scene small",
  ".human-atlas-static small",
  ".privacy-panel dt",
  ".input-with-unit span",
  ".question-number__unit",
  ".pillar-progress__position",
  ".pillar-progress__number",
  ".assessment__progress",
  ".question-number input",
  ".lab-review__row legend",
  ".lab-review__row input",
  ".risk-tree__root",
  ".risk-tree__branch-label",
  ".risk-tree__leaf-meta",
  ".risk-evidence dt",
  ".score-sheet__readout",
  ".score-sheet__coverage",
  ".score-category summary span:last-child",
  ".score-category li > span:nth-of-type(2)",
  ".express-results__context-title",
  ".express-results__context dt",
  ".express-result-card dt",
  ".express-results__context dd",
  ".express-result-card dd",
  ".express-result-card > p:first-of-type",
  ".action-plan > ol > li::before",
  ".confirmed-labs thead th",
  ".confirmed-labs tbody td",
];

test.each(monoSelectors)("assigns IBM Plex Mono to %s", (selector) => {
  expect(declarationsFor(css, selector)).toMatch(/font-family:\s*var\(--font-data\)/);
});

test("keeps print scene copy in Manrope while retaining mono metadata", () => {
  const printCss = css.slice(css.indexOf("@media print"));
  const printCopySelectors = [
    ".landing__atlas-hero > p:not(.data-label)",
    ".landing__atlas-conversion > p:not(.data-label)",
    ".human-atlas-scene__card > p:not(.data-label)",
  ];

  for (const selector of printCopySelectors) {
    expect(declarationsFor(printCss, selector)).not.toMatch(/var\(--font-data\)/);
  }
  expect(declarationsFor(printCss, ".human-atlas-scene small")).toMatch(
    /font-family:\s*var\(--font-data\)/,
  );
});

test("uses accessible, stable editorial type measurements", () => {
  const remFontSizes = [...css.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)]
    .map((match) => Number(match[1]));
  expect(Math.min(...remFontSizes)).toBeGreaterThanOrEqual(0.75);
  expect(css).not.toMatch(/font-size:[^;]*(?:vw|cqw)/);
  expect(css).not.toMatch(/letter-spacing:\s*-/);
  expect(new Set([...css.matchAll(/letter-spacing:\s*([^;]+);/g)]
    .map((match) => match[1].trim()))).toEqual(new Set(["0"]));
  expect(declarationsFor(css, "html")).toMatch(/font-synthesis:\s*none/);
  expect(declarationsFor(css, "h1, h2, h3")).toMatch(/overflow-wrap:\s*break-word/);
  expect(declarationsFor(css, "h1, h2, h3")).toMatch(/hyphens:\s*auto/);
  expect(css).toMatch(/^p\s*\{\s*font-size:\s*1rem;\s*line-height:\s*1\.65;/m);
});

test("keeps metadata legible and measurement numerals aligned", () => {
  for (const selector of monoSelectors) {
    const declarations = declarationsFor(css, selector);
    const weight = declarations.match(/font-weight:\s*(\d+)/)?.[1];
    if (weight) expect(["400", "500", "600", "700"]).toContain(weight);
    const lineHeight = declarations.match(/line-height:\s*(\d*\.?\d+)/)?.[1];
    if (lineHeight) expect(Number(lineHeight)).toBeGreaterThanOrEqual(1.45);
    expect(declarations).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums/);
  }
});

test("uses the fixed display and question hierarchy", () => {
  const desktopCss = css.slice(0, css.indexOf("@media (max-width: 560px)"));

  expect(declarationsFor(desktopCss, ".landing__atlas-hero h1")).toMatch(
    /font-size:\s*5\.75rem[\s\S]*line-height:\s*\.92/,
  );
  expect(declarationsFor(desktopCss, ".question-sheet .question-prompt__title")).toMatch(
    /font-size:\s*2\.75rem[\s\S]*line-height:\s*1\.08/,
  );
  for (const selector of newsreaderSelectors.slice(1)) {
    expect(declarationsFor(desktopCss, selector)).toMatch(
      /font-size:\s*4rem[\s\S]*line-height:\s*\.98/,
    );
  }
  expect(css).toMatch(/\.landing__atlas-hero h1\s*\{[^}]*font-size:\s*3rem[^}]*line-height:\s*\.98/s);
  expect(css).toMatch(/\.question-sheet \.question-prompt__title\s*\{[^}]*font-size:\s*2rem[^}]*line-height:\s*1\.12/s);
  for (const selector of newsreaderSelectors.slice(1)) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(css).toMatch(new RegExp(`${escapedSelector}\\s*\\{[^}]*font-size:\\s*2\\.5rem[^}]*line-height:\\s*1\\.04`, "s"));
  }
});
