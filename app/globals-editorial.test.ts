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
  ".express-results__heading h2",
  ".habits-map__heading h2",
  ".action-plan__heading h2",
  ".confirmed-labs__heading h2",
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

test("forces focused reveal content into its visible final state", () => {
  expect(declarationsFor(css, "[data-reveal-item]:focus-within")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
  expect(
    declarationsFor(css, "[data-reveal]:not(:has([data-reveal-item])):focus-within"),
  ).toMatch(/opacity:\s*1 !important[\s\S]*transform:\s*none !important/);
});

test("masks only pending hero entrance items and keeps the title mask auto-height", () => {
  expect(declarationsFor(css, 'html[data-motion-bootstrap="pending"] [data-hero-item]'))
    .toMatch(/opacity:\s*0/);
  expect(css).not.toMatch(
    /html\[data-motion-bootstrap="pending"\]\s+\[data-hero-(?:handoff|title|title-mask)\]/,
  );

  const titleMask = declarationsFor(css, ".landing__hero-title-mask");
  const paddingBlock = Number(titleMask.match(/padding-block:\s*(\d*\.?\d+)em/)?.[1]);
  expect(paddingBlock).toBeGreaterThanOrEqual(0.12);
  expect(titleMask).not.toMatch(/(?:^|;)\s*(?:min-|max-)?height\s*:/);
  expect(declarationsFor(
    css,
    'html:is([data-motion-bootstrap="pending"], [data-motion-bootstrap="ready"]) [data-hero-title-mask]',
  )).toMatch(/overflow:\s*clip/);
  expect(declarationsFor(css, "[data-hero-handoff]")).toMatch(/display:\s*block/);
});

test("forces focused hero entrance items into their visible final state", () => {
  expect(declarationsFor(css, "[data-hero-item]:focus-within")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important[\s\S]*clip-path:\s*none !important/,
  );
});

test("forces focused Atlas chapter items into their visible final state", () => {
  expect(declarationsFor(css, "[data-atlas-scene-item]:focus-within")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
});

test("draws risk-tree connectors from their trunk-facing origins with final defaults", () => {
  expect(declarationsFor(css, ".risk-tree::before")).toMatch(
    /transform:\s*translateX\(-50%\) scaleY\(var\(--risk-trunk-progress, 1\)\)[\s\S]*transform-origin:\s*top center/,
  );
  expect(declarationsFor(css, ".risk-tree__branch::before")).toMatch(
    /transform:\s*scale\(var\(--risk-branch-progress, 1\)\)/,
  );
  expect(declarationsFor(css, ".risk-tree__branch:nth-child(odd)::before")).toMatch(
    /transform-origin:\s*top right/,
  );
  expect(declarationsFor(css, ".risk-tree__branch:nth-child(even)::before")).toMatch(
    /transform-origin:\s*top left/,
  );
});

test("forces both marked risk-tree focus ancestors into their visible final state", () => {
  expect(declarationsFor(css, "[data-risk-tree-item]:focus-within")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
});

test("forces focused evidence content into its visible final state", () => {
  expect(declarationsFor(css, "[data-evidence-transition]:focus-within")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
});

test("forces hero layers and the title mask final for reduced motion and print", () => {
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\),\s*print\s*\{/);
  const finalStateCss = css.slice(
    css.indexOf("@media (prefers-reduced-motion: reduce), print"),
    css.indexOf("@media (prefers-reduced-motion: reduce) {"),
  );
  for (const selector of ["[data-hero-item]", "[data-hero-handoff]"]) {
    expect(declarationsFor(finalStateCss, selector)).toMatch(
      /opacity:\s*1 !important[\s\S]*visibility:\s*visible !important[\s\S]*transform:\s*none !important[\s\S]*clip-path:\s*none !important/,
    );
  }
  expect(declarationsFor(finalStateCss, "[data-hero-title-mask]")).toMatch(
    /clip-path:\s*none !important[\s\S]*overflow:\s*visible !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-atlas-camera]")).toMatch(
    /transform:\s*none !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-atlas-progress-fill]")).toMatch(
    /transform:\s*scaleX\(1\) !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-risk-tree-trunk]")).toMatch(
    /--risk-trunk-progress:\s*1 !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-risk-tree-branch]")).toMatch(
    /--risk-branch-progress:\s*1 !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-risk-tree-item]")).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
  expect(declarationsFor(finalStateCss, "[data-evidence-transition]")).toMatch(
    /opacity:\s*1 !important[\s\S]*visibility:\s*visible !important[\s\S]*transform:\s*none !important/,
  );
});

test("keeps compact risk-tree connectors hidden", () => {
  const compactCss = css.slice(
    css.indexOf("@media (max-width: 560px)"),
    css.indexOf("[data-reveal-item]:focus-within"),
  );
  expect(declarationsFor(compactCss, ".risk-tree__branch::before")).toMatch(/display:\s*none/);
});

test.each([
  ["reduced motion", css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"), css.indexOf("@media screen"))],
  ["print", css.slice(css.indexOf("@media print"))],
])("forces semantic reveal items into their final state for %s", (_name, mediaCss) => {
  expect(declarationsFor(mediaCss, "[data-reveal-item]")).toMatch(
    /opacity:\s*1 !important[\s\S]*visibility:\s*visible !important[\s\S]*transform:\s*none !important/,
  );
  expect(declarationsFor(mediaCss, '[data-reveal-item="rule"]')).toMatch(
    /transform:\s*scaleX\(1\) !important/,
  );
});

test.each([
  ["reduced motion", css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"), css.indexOf("@media screen"))],
  ["print", css.slice(css.indexOf("@media print"))],
  ["image failure", declarationsFor(css, ".human-atlas-scroll--failed [data-atlas-scene-item]")],
])("forces Atlas chapter items into their final state for %s", (_name, stateCss) => {
  const declarations = stateCss.includes("{")
    ? declarationsFor(stateCss, "[data-atlas-scene-item]")
    : stateCss;
  expect(declarations).toMatch(
    /opacity:\s*1 !important[\s\S]*transform:\s*none !important/,
  );
});
