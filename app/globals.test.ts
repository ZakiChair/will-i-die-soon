import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function declarationsFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directDeclarations = css.match(
    new RegExp(`${escapedSelector}\\s*\\{(?<declarations>[^}]+)\\}`, "s"),
  )?.groups?.declarations;
  if (directDeclarations) return directDeclarations;

  const groupedDeclarations = [...css.matchAll(/(?<selectors>[^{}]+)\{(?<declarations>[^{}]+)\}/g)]
    .find((match) => match.groups?.selectors
      .split(",")
      .map((item) => item.trim())
      .includes(selector))
    ?.groups?.declarations;

  if (!groupedDeclarations) throw new Error(`Missing CSS rule for ${selector}`);
  return groupedDeclarations;
}

function rulesForMedia(query: string): string {
  const marker = `@media ${query}`;
  const blocks: string[] = [];
  let searchFrom = 0;

  while (searchFrom < css.length) {
    const start = css.indexOf(marker, searchFrom);
    if (start < 0) break;

    const openingBrace = css.indexOf("{", start);
    let depth = 0;
    for (let index = openingBrace; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;
      if (depth === 0) {
        blocks.push(css.slice(openingBrace + 1, index));
        searchFrom = index + 1;
        break;
      }
    }
  }

  if (blocks.length === 0) throw new Error(`Missing @media ${query}`);
  return blocks.join("\n");
}

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

describe("bioluminescent global visual contract", () => {
  test("uses only the ten approved authored palette colors", () => {
    expect(css).toContain("--abyss: #041719");
    expect(css).toContain("--depth: #071F22");
    expect(css).toContain("--phosphor: #55F1CA");
    expect(css).toContain("--current: #42C9FF");
    expect(css).toContain("--flare: #FF7154");
    expect(css).toContain("--mist: #EFFFFC");

    const authoredColors = [...new Set(
      css.match(/#[0-9A-Fa-f]{6}\b/g)?.map((color) => color.toUpperCase()),
    )].sort();
    expect(authoredColors).toEqual([
      "#041719",
      "#071F22",
      "#1FA37F",
      "#3A78CC",
      "#42C9FF",
      "#55F1CA",
      "#9A7CE2",
      "#BD8830",
      "#EFFFFC",
      "#FF7154",
    ].sort());
    expect(css).not.toMatch(/--(?:paper|ink|deep-water|electric-blue|living-coral|signal-amber|motif-canopy)/);
  });

  test("uses the Manrope and data variables without compressed tracking or viewport-sized type", () => {
    expect(css).not.toContain("--font-editorial");
    expect(declarationsFor("body")).toMatch(
      /font-family:\s*var\(--font-body\), Arial, sans-serif/,
    );
    expect(declarationsFor("h1, h2, h3")).toMatch(
      /font-family:\s*var\(--font-body\), Arial, sans-serif/,
    );
    expect(declarationsFor(".wordmark")).toMatch(
      /font-family:\s*var\(--font-body\), Arial, sans-serif/,
    );
    expect(declarationsFor(".data-label")).toMatch(
      /font-family:\s*var\(--font-data\), monospace/,
    );
    expect(css).not.toMatch(/letter-spacing:\s*-/);
    expect(css).not.toMatch(/font-size:[^;]*(?:vw|cqw)/);

    const authoredTracking = [...css.matchAll(/letter-spacing:\s*([^;]+);/g)]
      .map((match) => match[1].trim());
    expect(authoredTracking.length).toBeGreaterThan(0);
    expect(new Set(authoredTracking)).toEqual(new Set(["0"]));
  });

  test("uses a two-color focus indicator with visible contrast on the dark canvas", () => {
    const focusRule = declarationsFor("button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible, [tabindex=\"-1\"]:focus-visible");

    expect(focusRule).toMatch(/outline:\s*3px solid var\(--phosphor\)/);
    expect(focusRule).toMatch(/box-shadow:\s*0 0 0 (?:7|8)px var\(--abyss\)/);
    expect(contrast(colorVariable("mist"), colorVariable("abyss"))).toBeGreaterThanOrEqual(7);
    expect(contrast(colorVariable("phosphor"), colorVariable("abyss"))).toBeGreaterThanOrEqual(3);
  });

  test("shows focus on the visible scale label when its radio receives keyboard focus", () => {
    const scaleFocusRule = declarationsFor(
      ".scale-grid label:has(input:focus-visible)",
    );

    expect(scaleFocusRule).toMatch(/outline:\s*3px solid var\(--phosphor\)/);
    expect(scaleFocusRule).toMatch(/outline-offset:\s*2px/);
    expect(scaleFocusRule).toMatch(/box-shadow:\s*0 0 0 (?:7|8)px var\(--abyss\)/);
  });

  test("keeps landing and journey bands dark and removes paper, canopy, and clipped-section framing", () => {
    expect(declarationsFor("html")).toMatch(/background:\s*var\(--abyss\)/);
    expect(declarationsFor("body")).toMatch(/color:\s*var\(--mist\)/);
    expect(declarationsFor("body")).toMatch(/background:\s*var\(--abyss\)/);
    expect(declarationsFor(".journey::before")).toMatch(/background:\s*var\(--abyss\)/);
    expect(declarationsFor(".consent__body")).toMatch(/border:\s*0/);
    expect(declarationsFor(".consent__body")).toMatch(/background:\s*transparent/);
    expect(declarationsFor(".question-sheet")).toMatch(/background:\s*var\(--depth\)/);
    expect(css).not.toMatch(/url\("\/media\/canopy-hero\.webp"\)/);
    expect(new Set([...css.matchAll(/clip-path:\s*([^;]+);/g)]
      .map((match) => match[1].trim()))).toEqual(new Set(["none !important"]));
  });

  test("keeps the Human Atlas registered to its image and glow coordinate system", () => {
    const atlasPath = join(process.cwd(), "public/media/human-atlas-hero.webp");
    const atlasAsset = existsSync(atlasPath) ? readFileSync(atlasPath) : Buffer.alloc(0);

    expect(existsSync(atlasPath)).toBe(true);
    expect(atlasAsset.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(atlasAsset.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(atlasAsset.byteLength).toBeLessThanOrEqual(650 * 1024);
    expect(createHash("sha256").update(atlasAsset).digest("hex")).toBe(
      "049911bc3c13c1151155d05c2449a629d801b9bfb3941c022e7b1a2af83f35e0",
    );

    expect(declarationsFor(".landing__atlas-experience")).toMatch(/--atlas-stage-height:\s*100svh/);
    expect(declarationsFor(".human-atlas-stage")).toMatch(/position:\s*sticky/);
    expect(declarationsFor(".human-atlas-stage")).toMatch(/height:\s*var\(--atlas-stage-height\)/);
    expect(declarationsFor(".human-atlas-media")).toMatch(/aspect-ratio:\s*1672 \/ 941/);
    expect(declarationsFor(".human-atlas-media")).toMatch(/transform:\s*translate\(-50%, -50%\)/);
    expect(declarationsFor("[data-atlas-camera]")).toMatch(/transform-origin:\s*center/);
    expect(declarationsFor("[data-atlas-camera]")).not.toMatch(/will-change/);
    expect(declarationsFor(".human-atlas-glow")).toMatch(/transform:\s*translateX\(-7\.4%\) scale\(\.985\)/);
    expect(declarationsFor(".human-atlas-glow")).toMatch(/mix-blend-mode:\s*screen/);
    expect(declarationsFor(".human-atlas-scroll")).toMatch(
      /min-height:\s*calc\(5 \* var\(--atlas-stage-height\)\)/,
    );
    expect(declarationsFor(".human-atlas-scenes")).toMatch(
      /margin-top:\s*calc\(-1 \* var\(--atlas-stage-height\)\)/,
    );
  });

  test("draws raw Atlas progress from the left without changing marker dimensions", () => {
    expect(declarationsFor(".human-atlas-progress__rail")).toMatch(
      /position:\s*relative[\s\S]*width:\s*38px[\s\S]*overflow:\s*hidden/,
    );
    expect(declarationsFor(".human-atlas-progress__fill")).toMatch(
      /width:\s*100%[\s\S]*transform:\s*scaleX\(0\)[\s\S]*transform-origin:\s*left center/,
    );
    expect(declarationsFor(".human-atlas-progress__markers > span")).toMatch(
      /width:\s*18px[\s\S]*height:\s*2px/,
    );
    expect(declarationsFor(
      '.human-atlas-progress__markers > span[data-active="true"]',
    )).toMatch(/width:\s*38px/);
    expect(declarationsFor(".human-atlas-progress__fill")).not.toMatch(/data-active/);
  });

  test("puts mobile hero copy in normal flow above a shorter stable Atlas story", () => {
    const mobile = rulesForMedia("(max-width: 780px)");

    expect(mobile).toMatch(
      /\.landing__atlas-hero\s*\{[^}]*position:\s*relative[^}]*top:\s*auto[^}]*left:\s*auto[^}]*background:\s*transparent/s,
    );
    expect(mobile).toMatch(
      /\.human-atlas-scroll\s*\{[^}]*min-height:\s*calc\(4 \* var\(--atlas-stage-height\)\)/s,
    );
    expect(mobile).toMatch(
      /\.human-atlas-media\s*\{[^}]*aspect-ratio:\s*1672 \/ 941[^}]*translate\(-62%, -50%\)/s,
    );
    expect(mobile).toMatch(
      /\.human-atlas-scene\s*\{[^}]*min-height:\s*calc\(var\(--atlas-stage-height\) \* \.72\)/s,
    );
    expect(mobile).not.toMatch(/\.landing__atlas-hero\s*\{[^}]*gradient/s);
  });

  test("keeps image failure, static story, and scene copy visible without framed overlays", () => {
    expect(declarationsFor(".human-atlas-scene__card")).toMatch(/border:\s*0/);
    expect(declarationsFor(".human-atlas-scene__card")).toMatch(/background:\s*transparent/);
    expect(declarationsFor(".human-atlas-scene__card")).toMatch(/box-shadow:\s*none/);
    expect(declarationsFor(".human-atlas-scroll--failed")).toMatch(/min-height:\s*0/);
    expect(declarationsFor(".human-atlas-scroll--failed .human-atlas-stage")).toMatch(/position:\s*relative/);
    expect(declarationsFor(".human-atlas-scroll--failed .human-atlas-stage")).toMatch(/min-height:\s*240px/);
    expect(declarationsFor(".human-atlas-scroll--failed .human-atlas-scene")).toMatch(/opacity:\s*1/);
    expect(declarationsFor(".human-atlas-scroll--failed .human-atlas-scene")).toMatch(/transform:\s*none/);
    expect(declarationsFor(".human-atlas-scroll--failed [data-atlas-camera]")).toMatch(
      /transform:\s*none !important/,
    );
    expect(declarationsFor(".human-atlas-scroll--failed [data-atlas-progress-fill]")).toMatch(
      /transform:\s*scaleX\(1\) !important/,
    );
    expect(
      declarationsFor(
        ".landing__atlas-experience:has(.human-atlas-static) .landing__atlas-hero",
      ),
    ).toMatch(/position:\s*relative[^}]*top:\s*auto[^}]*left:\s*auto/s);
    expect(declarationsFor(".human-atlas-static")).toMatch(
      /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/,
    );
    expect(declarationsFor(".human-atlas-scene small, .human-atlas-static small")).toMatch(
      /font-size:\s*\.75rem/,
    );
  });

  test("preserves form geometry, stable controls, and the contained lab file input", () => {
    expect(declarationsFor(".form-field input, .form-field select, .question-number input, .question-text input")).toMatch(/min-height:\s*52px/);
    expect(declarationsFor(".answer-option")).toMatch(/min-height:\s*54px/);
    expect(declarationsFor(".scale-grid label")).toMatch(/min-height:\s*54px/);
    expect(declarationsFor(".question-actions button")).toMatch(/min-height:\s*48px/);
    expect(declarationsFor(".language-switcher__option")).toMatch(/min-width:\s*44px/);
    expect(declarationsFor(".language-switcher__option")).toMatch(/min-height:\s*44px/);
    expect(declarationsFor(".minor-route label, .consent-check")).toMatch(/min-height:\s*44px/);
    expect(declarationsFor(".why-we-ask summary")).toMatch(/min-height:\s*44px/);
    expect(declarationsFor('.lab-import__source input[type="file"]')).toMatch(/width:\s*100%/);
    expect(declarationsFor('.lab-import__source input[type="file"]')).toMatch(/min-width:\s*0/);
    expect(rulesForMedia("(max-width: 560px)")).toMatch(
      /\.scale-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5, 1fr\)/s,
    );
  });

  test("keeps scale targets at least 44 pixels wide through constrained assessment widths", () => {
    expect(rulesForMedia("(max-width: 1000px)")).toMatch(
      /\.scale-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(44px, 1fr\)\)/s,
    );

    const baseRuleIndex = css.search(
      /\.scale-grid\s*\{[^}]*grid-template-columns:\s*repeat\(11, minmax\(38px, 1fr\)\)/s,
    );
    const compactRuleIndex = css.search(
      /\.scale-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(44px, 1fr\)\)/s,
    );
    expect(baseRuleIndex).toBeGreaterThanOrEqual(0);
    expect(compactRuleIndex).toBeGreaterThan(baseRuleIndex);
  });

  test("keeps compact depth-card actions in flow below localized copy", () => {
    const compact = rulesForMedia("(max-width: 850px)");

    expect(compact).toMatch(
      /\.depth-card button\s*\{[^}]*position:\s*static[^}]*display:\s*block[^}]*width:\s*100%[^}]*margin-top:\s*24px/s,
    );
  });

  test("keeps intermission media and poster fallbacks stable", () => {
    expect(declarationsFor(".intermission__media img, .intermission__media video")).toMatch(/object-fit:\s*cover/);
    expect(declarationsFor(".intermission__poster--covered")).toMatch(/opacity:\s*0/);
    expect(declarationsFor(".intermission__poster--covered")).toMatch(/visibility:\s*hidden/);
    expect(declarationsFor(".intermission__video")).toMatch(/opacity:\s*0/);
    expect(declarationsFor(".intermission__video--ready")).toMatch(/opacity:\s*1/);
    expect(declarationsFor(".intermission__video--ready")).toMatch(/visibility:\s*visible/);
    expect(declarationsFor(".intermission__media--poster-failed")).toMatch(/background:\s*transparent/);
    expect(declarationsFor(".intermission__media--poster-failed::after")).toMatch(/background:\s*transparent/);
  });

  test("keeps result grids structurally stable while leaving page bands unframed", () => {
    expect(declarationsFor(".risk-tree__branches")).toMatch(
      /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(declarationsFor(".risk-tree__foundation")).toMatch(/width:\s*100%/);
    expect(declarationsFor(".risk-tree__leaf-meta")).toMatch(/overflow-wrap:\s*anywhere/);
    expect(declarationsFor(".pillar-progress__chapters")).toMatch(/grid-template-columns:\s*1fr/);
    expect(css).toMatch(/\.action-plan > ol > li\s*\{/);
    expect(css).toMatch(/\.action-plan > ol > li::before\s*\{/);
    expect(css).not.toMatch(/\.action-plan li(?:\s|::)/);

    for (const selector of [
      ".results-urgent",
      ".results-canopy",
      ".score-sheet",
      ".express-results",
      ".habits-map",
      ".child-guide",
      ".private-results-handoff",
      ".action-plan",
      ".confirmed-labs",
    ]) {
      expect(declarationsFor(selector)).not.toMatch(/background:\s*var\(--mist\)/);
      expect(declarationsFor(selector)).not.toMatch(/clip-path/);
    }
  });

  test("forces every GSAP target into visible normal flow for reduced motion", () => {
    const reducedMotion = rulesForMedia("(prefers-reduced-motion: reduce)");

    expect(reducedMotion).toMatch(
      /\[data-reveal\],\s*\[data-motion-screen\]\s*\{[^}]*opacity:\s*1 !important[^}]*visibility:\s*visible !important[^}]*transform:\s*none !important/s,
    );
    expect(reducedMotion).toMatch(/\.human-atlas-stage\s*\{[^}]*position:\s*relative/s);
    expect(reducedMotion).toMatch(
      /\.landing__atlas-hero\s*\{[^}]*position:\s*relative[^}]*top:\s*auto[^}]*left:\s*auto/s,
    );
    expect(reducedMotion).toMatch(/\.human-atlas-scroll\s*\{[^}]*min-height:\s*0/s);
    expect(reducedMotion).toMatch(/\.human-atlas-scene\s*\{[^}]*min-height:\s*0[^}]*opacity:\s*1[^}]*transform:\s*none/s);
    expect(reducedMotion).toMatch(/\[data-strength-signal\]\s*\{[^}]*animation:\s*none !important/s);
    expect(reducedMotion).toMatch(
      /\[data-atlas-camera\]\s*\{[^}]*transform:\s*none !important/s,
    );
    expect(reducedMotion).toMatch(
      /\[data-atlas-progress-fill\]\s*\{[^}]*transform:\s*scaleX\(1\) !important/s,
    );
    expect(reducedMotion).toMatch(/\.intermission__video\s*\{[^}]*display:\s*none !important/s);
    expect(reducedMotion).toMatch(
      /\.human-atlas-glow--breath,\s*\.human-atlas-glow--breath\[data-active="true"\]\s*\{[^}]*opacity:\s*\.76/s,
    );
  });

  test("uses the same static Atlas flow whenever decorative motion is paused", () => {
    expect(css).toMatch(
      /\.landing__atlas-experience:has\(\.human-atlas-scroll\[data-motion="paused"\]\) \.landing__atlas-hero\s*\{[^}]*position:\s*relative[^}]*top:\s*auto[^}]*left:\s*auto/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\]\s*\{[^}]*min-height:\s*0/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \.human-atlas-stage\s*\{[^}]*position:\s*relative/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \.human-atlas-scenes\s*\{[^}]*width:\s*100%[^}]*margin-top:\s*0/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \.human-atlas-scene\s*\{[^}]*min-height:\s*0[^}]*opacity:\s*1[^}]*transform:\s*none/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \.human-atlas-scene\s*\{[^}]*transition:\s*none/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \[data-atlas-camera\]\s*\{[^}]*transform:\s*none !important/s,
    );
    expect(css).toMatch(
      /\.human-atlas-scroll\[data-motion="paused"\] \[data-atlas-progress-fill\]\s*\{[^}]*transform:\s*scaleX\(1\) !important/s,
    );
  });

  test("preserves semantic print flow with decoration and private tools removed", () => {
    const print = rulesForMedia("print");

    expect(print).toMatch(
      /\[data-reveal\],\s*\[data-motion-screen\]\s*\{[^}]*opacity:\s*1 !important[^}]*visibility:\s*visible !important[^}]*transform:\s*none !important/s,
    );
    expect(print).toMatch(/body\s*\{[^}]*color:\s*var\(--abyss\)[^}]*background:\s*var\(--mist\)/s);
    expect(print).toMatch(/\.journey::before\s*\{[^}]*display:\s*none/s);
    expect(print).toMatch(/\.landing__atlas-hero\s*\{[^}]*position:\s*static[^}]*width:\s*100%/s);
    expect(print).toMatch(/\.human-atlas-stage\s*\{[^}]*display:\s*none/s);
    expect(print).toMatch(/\.human-atlas-scene\s*\{[^}]*opacity:\s*1[^}]*transform:\s*none/s);
    expect(print).toMatch(/\.language-switcher\s*\{[^}]*display:\s*none/s);
    expect(print).toMatch(/\.results__header, \.result-tools\s*\{[^}]*display:\s*none !important/s);
  });

  test("prints Express context and primary readings in Abyss ink", () => {
    const print = rulesForMedia("print");

    expect(print).toMatch(
      /\.express-results__context dd[^{}]*\{[^}]*color:\s*var\(--abyss\)/s,
    );
    expect(print).toMatch(
      /\.express-result-card > p:first-of-type[^{}]*\{[^}]*color:\s*var\(--abyss\)/s,
    );
    expect(print).toMatch(
      /\.express-result-card dd[^{}]*\{[^}]*color:\s*var\(--abyss\)/s,
    );
  });

  test("prints adult score, urgent, lab, and risk text through one Abyss result cascade", () => {
    const print = rulesForMedia("print");
    const resultInk = print.match(
      /\.journey\.results,\s*\.journey\.results \*,\s*\.journey\.results \*::before,\s*\.journey\.results \*::after\s*\{(?<declarations>[^}]+)\}/s,
    )?.groups?.declarations;

    expect(resultInk).toMatch(/color:\s*var\(--abyss\) !important/);
    expect(resultInk).toMatch(/text-shadow:\s*none !important/);
    expect(contrast(colorVariable("abyss"), colorVariable("mist"))).toBeGreaterThanOrEqual(4.5);
  });

  test("contains no retired scanner, HUD, gradient-orb, or canopy-control selectors", () => {
    expect(css).not.toMatch(/scan-frame|target-box|hud/i);
    expect(css).not.toMatch(/gradient-orb|\borb(?:__|--|-)/i);
    expect(css).not.toMatch(/\.canopy__leaf|\.landing__canopy-video/);
  });
});
