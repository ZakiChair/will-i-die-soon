# Editorial Scroll Motion And Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Newsreader/Manrope/IBM Plex Mono typography and orchestrated landing/results scroll motion while preserving the Human Atlas image, questionnaire behavior, accessibility, privacy, and static fallbacks.

**Architecture:** Keep GSAP as progressive enhancement behind one synchronous capability observer. Extend the shared section-reveal hook for semantic entry patterns, keep the existing Atlas ScrollTrigger as the only continuous trigger, and isolate chapter, risk-tree, and evidence transitions in focused hooks. React components expose stable data attributes and retain semantic/business ownership; CSS keeps the fully visible final state as its default.

**Tech Stack:** Next 16.2.12 App Router, React 19.2.8, TypeScript 5.9.3, GSAP 3.15.0, @gsap/react 2.1.2, ScrollTrigger, CSS, Vitest 4.1.0, Testing Library, vinext/Vite, Chrome DevTools.

## Global Constraints

- Preserve `public/media/human-atlas-hero.webp`, its `1672 × 941` dimensions, current SHA-256 contract, localized image-failure story, and four canonical scene IDs.
- Keep the existing six authored colors unchanged: `#041719`, `#071F22`, `#55F1CA`, `#42C9FF`, `#FF7154`, and `#EFFFFC`; add no authored palette color.
- Load Newsreader normal variable plus `opsz` as `--font-display`, Manrope normal variable as `--font-body`, and IBM Plex Mono normal 400/500/600/700 as `--font-data` through `next/font/google`.
- Use Newsreader only on the selectors enumerated in the approved specification; Manrope remains the default UI/body/heading family and IBM Plex Mono remains the exact data/measurement exception.
- Use fixed font sizes per breakpoint, `letter-spacing: 0`, `font-synthesis: none`, Newsreader `font-optical-sizing: auto`, metadata at least `0.75rem/1.45`, and tabular lining numerals for measurements.
- Add no question-to-question animation, new `MotionScreen` behavior, score counter, blur, 3D tilt, per-letter split, loop, gradient orb, HUD, green side rectangle, generated/replacement image, external service, tracking, or persistence.
- Animate only opacity and transforms during continuous scroll. Connector custom properties are once-only and the result sections retain no pinning or long scrub.
- Keep content visible by default. Reduced motion, hidden documents, missing or throwing `matchMedia`, missing/non-callable GSAP or ScrollTrigger, setup errors, print, and asset failure all settle to opacity 1, zero transform, no clip, and drawn connectors.
- Preserve every current focus move, `aria-pressed`, `aria-controls`, live-region, heading order, private-results handoff, score/risk/action memoization, export, consent, urgent route, EN/FR, and local-only contract.
- Keep touch targets at least 44 CSS pixels, no horizontal overflow at 320 pixels, and no text clipping at 200% zoom, 400% reflow, or WCAG text spacing.
- Use RED/GREEN development for every behavior change and commit each task independently after its focused regression group passes.

---

## File Map

### Create

- `app/globals-editorial.test.ts`: focused typography, semantic-motion, focus, reduced-motion, and print CSS contract.
- `app/lib/motion-bootstrap.ts`: exception-safe, before-hydration hero bootstrap source.
- `app/lib/motion-bootstrap.test.ts`: direct execution tests for the bootstrap state machine.
- `app/test/motion-fixture.ts`: reusable `MediaQueryList`, visibility, and event-listener test fixture.
- `app/hooks/use-atlas-scene-transition.ts`: active Atlas chapter entry and interruption handling.
- `app/hooks/use-atlas-scene-transition.test.tsx`: chapter timeline and cleanup contract.
- `app/hooks/use-risk-tree-construction.ts`: once-only tree construction timeline.
- `app/hooks/use-risk-tree-construction.test.tsx`: viewport, timing, origin, and fallback contract.
- `app/hooks/use-evidence-transition.ts`: interruption-safe evidence-content transition.
- `app/hooks/use-evidence-transition.test.tsx`: initial mount, selection change, interruption, and cleanup contract.

### Modify

- `app/layout.tsx`, `app/layout.test.ts`: font loaders, bootstrap `<head>` script, and intentional root hydration suppression.
- `app/globals.css`, `app/globals.test.ts`: explicit typography map, semantic motion targets, Atlas camera/progress, tree construction, responsive/focus/reduced/print fallbacks, and replacement of obsolete font assertions.
- `app/hooks/use-decorative-motion.ts`, `app/hooks/use-decorative-motion.test.tsx`: synchronous settled-status reader/observer while preserving both existing hook APIs.
- `app/hooks/use-section-reveal.ts`, `app/hooks/use-section-reveal.test.tsx`: `single`, `heading`, and `group` timelines with `document`/`new-content` initialization.
- `app/hooks/use-landing-timeline.ts`, `app/hooks/use-landing-timeline.test.tsx`: hero entrance, terminal bootstrap cleanup, camera limits, raw progress fill, and the existing scene mapping.
- `app/components/landing.tsx`, `app/components/landing.test.tsx`: hero targets and non-nested semantic reveal roots.
- `app/components/human-atlas-scroll.tsx`, `app/components/human-atlas-scroll.test.tsx`: camera/progress targets, scene child markers, and chapter hook.
- `app/components/results.tsx`, `app/components/results.test.tsx`, `app/components/results-motion.test.tsx`: non-nested reveal roots and private-result `new-content` refresh.
- `app/components/express-results.tsx`, `app/components/express-results.test.tsx`: heading and card-group reveal roots.
- `app/components/risk-tree.tsx`, `app/components/risk-tree.test.tsx`: construction markers/ref, evidence wrapper/ref, live status, and transition hooks.
- `app/i18n/ui-copy.ts`, `app/i18n/ui-copy.test.ts`: concise EN/FR selected-evidence announcement.

### Regression Only

- `app/page.test.tsx`, `app/components/assessment.test.tsx`, `app/components/motion-screen.test.tsx`, `app/components/question-control.test.tsx`, `app/components/question-prompt.test.tsx`, `app/components/pillar-progress.test.tsx`, `app/components/lab-import.test.tsx`, `app/lib/gsap-client.test.ts`: run unchanged unless a verified regression needs a focused RED/GREEN fix.

---

### Task 1: Adopt The Editorial Typography Contract

**Files:**
- Modify: `app/layout.tsx:3-11,62-64`
- Modify: `app/layout.test.ts:1-105`
- Modify: `app/globals.css:18-161,228-230,329,410-420,471-532,574,668-720,778-790,839-870,897-907,926-992,1009-1060,1071-1143`
- Modify: `app/globals.test.ts:82-120`
- Create: `app/globals-editorial.test.ts`

**Interfaces:**
- Consumes: `next/font/google` and the existing `--font-display`, `--font-body`, `--font-data` body class contract.
- Produces: Newsreader variable normal + `opsz`, Manrope variable normal, IBM Plex Mono normal 400/500/600/700, and the exact selector map from the approved specification.

- [ ] **Step 1: Replace the font-loader assertions and add the focused CSS test**

Hoist loader mocks so the test can assert exact options, then invert the old Space/Geist prohibition:

```ts
const { ibmPlexMono, manrope, newsreader } = vi.hoisted(() => ({
  ibmPlexMono: vi.fn(() => ({ variable: "--font-data" })),
  manrope: vi.fn(() => ({ variable: "--font-body" })),
  newsreader: vi.fn(() => ({ variable: "--font-display" })),
}));

vi.mock("next/font/google", () => ({
  IBM_Plex_Mono: ibmPlexMono,
  Manrope: manrope,
  Newsreader: newsreader,
}));

expect(newsreader).toHaveBeenCalledWith(expect.objectContaining({
  axes: ["opsz"], style: "normal", subsets: ["latin"],
  variable: "--font-display", weight: "variable",
}));
expect(manrope).toHaveBeenCalledWith(expect.objectContaining({
  style: "normal", variable: "--font-body", weight: "variable",
}));
expect(ibmPlexMono).toHaveBeenCalledWith(expect.objectContaining({
  style: "normal", variable: "--font-data",
  weight: ["400", "500", "600", "700"],
}));
```

Create `app/globals-editorial.test.ts` with a CSS reader and exact family groups:

```ts
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
```

Use the exact `monoSelectors` array above to assert the complete data-family map. Add separate assertions that every mono declaration uses only `400|500|600|700`; all authored `rem` font sizes are at least `0.75` (including the compact `.prototype-label` override); metadata line heights are at least `1.45`; measurement declarations use `font-variant-numeric: tabular-nums lining-nums`; `html` sets `font-synthesis: none`; display selectors set `font-optical-sizing: auto`; letter spacing is zero; and no font size uses `vw` or `cqw`. Implement the size-floor assertion numerically:

```ts
const remFontSizes = [...css.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)]
  .map((match) => Number(match[1]));
expect(Math.min(...remFontSizes)).toBeGreaterThanOrEqual(0.75);
```

- [ ] **Step 2: Run the font/CSS tests and verify RED**

Run: `npm test -- app/layout.test.ts app/globals.test.ts app/globals-editorial.test.ts`

Expected: FAIL because `layout.tsx` still loads Space Grotesk/Geist/Geist Mono and the CSS still makes every heading/wordmark use `--font-display`.

- [ ] **Step 3: Implement the three font loaders and selector hierarchy**

Use these loaders in `app/layout.tsx`:

```ts
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";

const display = Newsreader({
  axes: ["opsz"],
  display: "swap",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-display",
  weight: "variable",
});
const body = Manrope({
  display: "swap",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-body",
  weight: "variable",
});
const mono = IBM_Plex_Mono({
  display: "swap",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500", "600", "700"],
});
```

Make Manrope the default, then override only the approved display selectors:

```css
html { font-synthesis: none; }
body, button, a, input, select { font-family: var(--font-body), Arial, sans-serif; }
h1, h2, h3 { font-family: var(--font-body), Arial, sans-serif; }

.landing__atlas-hero h1,
.landing__atlas-conversion h2,
.depth-section .section-heading h2,
.privacy-panel h2,
.results__intro h1,
.results-canopy > .section-heading h2,
.score-sheet h2,
.express-results > h2,
.habits-map > h2,
.action-plan > h2,
.confirmed-labs > h2 {
  font-family: var(--font-display), Georgia, serif;
  font-optical-sizing: auto;
  font-weight: 500;
}
```

Normalize all mono rules to 400/500/600/700, raise sub-`0.75rem` metadata, add tabular lining numerals, and change global heading wrapping from `overflow-wrap: anywhere` to `overflow-wrap: break-word; hyphens: auto`. Apply the fixed hierarchy directly: landing hero `5.75rem/0.92` desktop and `3rem/0.98` compact; every other approved Newsreader heading `4rem/0.98` desktop and `2.5rem/1.04` compact; question prompt Manrope `2.75rem/1.08` desktop and `2rem/1.12` compact; body copy at least `1rem/1.65`; metadata at least `0.75rem/1.45`. Use Newsreader weight 500 for the landing/results H1s and 600 for the approved H2s.

- [ ] **Step 4: Run the typography and questionnaire regression group**

Run: `npm test -- app/layout.test.ts app/globals.test.ts app/globals-editorial.test.ts app/components/question-prompt.test.tsx app/components/question-control.test.tsx app/components/pillar-progress.test.tsx app/components/lab-import.test.tsx`

Expected: PASS; the questionnaire has no new motion and its measurement exceptions remain mono.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/layout.test.ts app/globals.css app/globals.test.ts app/globals-editorial.test.ts
git commit -m "feat: adopt editorial typography"
```

### Task 2: Add The Synchronous Decorative-Motion Observer

**Files:**
- Create: `app/test/motion-fixture.ts`
- Modify: `app/hooks/use-decorative-motion.ts:1-57`
- Modify: `app/hooks/use-decorative-motion.test.tsx:1-153`

**Interfaces:**
- Preserves: `useDecorativeMotion(): boolean`; `useDecorativeMotionStatus(): DecorativeMotionStatus` and its initial `pending` render.
- Produces: `type SettledDecorativeMotionStatus = Exclude<DecorativeMotionStatus, "pending">`; `readDecorativeMotionStatus(): SettledDecorativeMotionStatus`; `observeDecorativeMotion(onChange): DecorativeMotionObservation`.

- [ ] **Step 1: Add the reusable browser fixture and failing observer tests**

Create the fixture with controllable preference and visibility:

```ts
import { vi } from "vitest";

export type MotionEnvironment = Readonly<{
  media: MediaQueryList;
  setHidden(hidden: boolean): void;
  setReduced(reduced: boolean): void;
  removeMediaListener: ReturnType<typeof vi.fn>;
  restore(): void;
}>;

export function installMotionEnvironment(
  { hidden = false, reduced = false } = {},
): MotionEnvironment {
  let hiddenState = hidden;
  let reducedState = reduced;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const previousHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  const invoke = (listener: EventListenerOrEventListenerObject, event: Event) => {
    if (typeof listener === "function") listener.call(media, event);
    else listener.handleEvent(event);
  };
  const removeMediaListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change") listeners.delete(listener);
    },
  );
  const media = {
    get matches() { return reducedState; },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "change") listeners.add(listener);
      },
    ),
    removeEventListener: removeMediaListener,
    addListener: vi.fn((listener: EventListener) => listeners.add(listener)),
    removeListener: vi.fn((listener: EventListener) => listeners.delete(listener)),
    dispatchEvent(event: Event) {
      for (const listener of listeners) invoke(listener, event);
      return !event.defaultPrevented;
    },
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hiddenState,
  });

  return {
    media,
    removeMediaListener,
    setHidden(next) {
      hiddenState = next;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    setReduced(next) {
      reducedState = next;
      media.dispatchEvent(new Event("change"));
    },
    restore() {
      vi.unstubAllGlobals();
      if (previousHidden) Object.defineProperty(document, "hidden", previousHidden);
      else Reflect.deleteProperty(document, "hidden");
    },
  };
}
```

Add tests that directly call the new APIs before React effects:

```ts
expect(readDecorativeMotionStatus()).toBe("running");
environment.setReduced(true);
expect(listener).toHaveBeenLastCalledWith("reduced");
environment.setHidden(true);
expect(listener).toHaveBeenLastCalledWith("hidden");
observation.dispose();
expect(environment.removeMediaListener).toHaveBeenCalled();
```

Cover missing `matchMedia`, non-callable `matchMedia`, a throwing `matchMedia`, a throwing media listener installation, and partial-listener cleanup. Keep the existing hook tests proving `pending → running`, boolean no-rerender under reduced motion, and live visibility behavior.

- [ ] **Step 2: Run the observer tests and verify RED**

Run: `npm test -- app/hooks/use-decorative-motion.test.tsx`

Expected: FAIL because the synchronous reader, observer type, and observer function do not exist.

- [ ] **Step 3: Implement the observer without changing existing hook semantics**

Add these exact public shapes:

```ts
export type SettledDecorativeMotionStatus = Exclude<DecorativeMotionStatus, "pending">;

export type DecorativeMotionObservation = Readonly<{
  status: SettledDecorativeMotionStatus;
  dispose(): void;
}>;

const noop = () => undefined;

export function readDecorativeMotionStatus(): SettledDecorativeMotionStatus {
  if (typeof window === "undefined" || typeof document === "undefined" ||
      typeof window.matchMedia !== "function") {
    return "unsupported";
  }
  try {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    return media.matches ? "reduced" : document.hidden ? "hidden" : "running";
  } catch {
    return "unsupported";
  }
}

export function observeDecorativeMotion(
  onChange: (status: SettledDecorativeMotionStatus) => void,
): DecorativeMotionObservation {
  if (typeof window === "undefined" || typeof document === "undefined" ||
      typeof window.matchMedia !== "function") {
    return { status: "unsupported", dispose: noop };
  }

  let media: MediaQueryList;
  try {
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof media.addEventListener !== "function" ||
        typeof media.removeEventListener !== "function") {
      return { status: "unsupported", dispose: noop };
    }
  } catch {
    return { status: "unsupported", dispose: noop };
  }

  const currentStatus = (): SettledDecorativeMotionStatus =>
    media.matches ? "reduced" : document.hidden ? "hidden" : "running";
  const emit = () => onChange(currentStatus());
  let disposed = false;
  let mediaInstalled = false;
  let visibilityInstalled = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (mediaInstalled) {
      try { media.removeEventListener("change", emit); }
      catch { /* Best-effort cleanup after partial observer setup. */ }
    }
    if (visibilityInstalled) {
      try { document.removeEventListener("visibilitychange", emit); }
      catch { /* Best-effort cleanup after partial observer setup. */ }
    }
  };

  try {
    mediaInstalled = true;
    media.addEventListener("change", emit);
    visibilityInstalled = true;
    document.addEventListener("visibilitychange", emit);
  } catch {
    dispose();
    return { status: "unsupported", dispose: noop };
  }

  return { status: currentStatus(), dispose };
}
```

Refactor both existing hooks to create/dispose this observer inside their existing `useEffect`; do not change their return types or initial values.

- [ ] **Step 4: Run motion foundation regressions**

Run: `npm test -- app/hooks/use-decorative-motion.test.tsx app/components/motion-screen.test.tsx app/components/intermission.test.tsx app/components/human-atlas-glow.test.tsx`

Expected: PASS with listeners removed on unmount and no questionnaire/screen behavior change.

- [ ] **Step 5: Commit**

```bash
git add app/test/motion-fixture.ts app/hooks/use-decorative-motion.ts app/hooks/use-decorative-motion.test.tsx
git commit -m "feat: add synchronous motion preflight"
```

### Task 3: Implement Semantic Section Reveals

**Files:**
- Modify: `app/hooks/use-section-reveal.ts:1-35`
- Modify: `app/hooks/use-section-reveal.test.tsx:1-86`
- Modify: `app/globals.css:1128-1205`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Preserves: `useSectionReveal(scope, selector?)`.
- Produces: `type SectionRevealMode = "document" | "new-content"`; `useSectionReveal(scope, selector = "[data-reveal]", mode = "document"): void`.
- Consumes: `observeDecorativeMotion`, `gsap.timeline`, callable `ScrollTrigger.create`, `[data-reveal-item]`, and `[data-reveal-item="rule"]`.

- [ ] **Step 1: Replace the two legacy tests with the semantic matrix**

Use real rectangle stubs and callable GSAP/ScrollTrigger mocks:

```tsx
function RevealProbe({ mode = "document" }: { mode?: SectionRevealMode }) {
  const scope = useRef<HTMLElement>(null);
  useSectionReveal(scope, "[data-reveal]", mode);
  return (
    <section ref={scope}>
      <div data-reveal="single">Single</div>
      <section data-reveal="heading">
        <p data-reveal-item>Eyebrow</p>
        <h2 data-reveal-item>Heading</h2>
        <span aria-hidden="true" data-reveal-item="rule" />
      </section>
      <div data-reveal="group"><article data-reveal-item>Card</article></div>
    </section>
  );
}
```

Assert `top: window.innerHeight + 100` creates exactly one timeline/trigger per root with `start: "top 84%"` and `once: true`; `top <= innerHeight` creates zero in `document` mode; `new-content` still creates them. Assert exact starts/durations/staggers:

```ts
expect(singleFrom).toEqual(expect.objectContaining({ opacity: 0, y: 20 }));
expect(singleTo).toEqual(expect.objectContaining({ duration: 0.55, ease: "power3.out", opacity: 1, y: 0 }));
expect(headingTo).toEqual(expect.objectContaining({ duration: 0.65, stagger: 0.08 }));
expect(groupTo).toEqual(expect.objectContaining({ duration: 0.55, stagger: 0.07 }));
expect(ruleFrom).toEqual(expect.objectContaining({ opacity: 1, scaleX: 0 }));
```

Also test bare `data-reveal` as `single`, nested parent/child roots both skipped/final, unrelated roots still active, missing/non-callable ScrollTrigger before any initial state, setup exception cleanup, live reduced-motion cancellation, and no replay when preference returns.

- [ ] **Step 2: Run the reveal tests and verify RED**

Run: `npm test -- app/hooks/use-section-reveal.test.tsx app/globals-editorial.test.ts`

Expected: FAIL on the old `gsap.fromTo`, `top 86%`, uniform 500 ms behavior and absent semantic CSS.

- [ ] **Step 3: Implement one timeline per eligible root**

Use the preserved overload and these exact variant constants:

```ts
export type SectionRevealMode = "document" | "new-content";

const REVEAL_VARIANTS = {
  single: {
    from: { opacity: 0, y: 20 },
    to: { duration: 0.55, ease: "power3.out", opacity: 1, y: 0 },
  },
  heading: {
    from: { opacity: 0, y: 24 },
    to: { duration: 0.65, ease: "power3.out", opacity: 1, stagger: 0.08, y: 0 },
  },
  group: {
    from: { opacity: 0, y: 18 },
    to: { duration: 0.55, ease: "power3.out", opacity: 1, stagger: 0.07, y: 0 },
  },
} as const;

export function useSectionReveal(
  scope: RefObject<HTMLElement | null>,
  selector = "[data-reveal]",
  mode: SectionRevealMode = "document",
): void;
```

Inside the scoped `useGSAP` layout effect, perform these operations in order:

1. Resolve all matching roots, identify every pair where either root contains the other, clear both members of each invalid pair, and continue with unrelated roots.
2. Verify `scope.current`, `gsap.timeline`, and `ScrollTrigger.create`, then create `observeDecorativeMotion`. If any requirement is unavailable or the synchronous status is not `running`, clear every root and return the observer disposer when one exists.
3. In `document` mode, measure each valid root and clear/skip it when `getBoundingClientRect().top <= window.innerHeight`; do not measure away roots in `new-content` mode.
4. Treat an absent or invalid `data-reveal` value as `single`. A `single` root animates itself; `heading` and `group` roots animate their direct `[data-reveal-item]` children. Initialize the rule child separately with `{ opacity: 1, scaleX: 0, transformOrigin: "left center" }` and tween it to `scaleX: 1` in reading order.
5. Build one paused GSAP timeline per remaining root using `REVEAL_VARIANTS`, then create exactly one `ScrollTrigger.create({ animation: timeline, once: true, start: "top 84%", trigger: root })`.
6. On a live status other than `running`, permanently cancel this mount: kill every owned trigger and timeline, revert its GSAP context, clear inline `opacity`, `transform`, `visibility`, `will-change`, and rule `transform-origin`, and never replay if the status later returns to `running`.
7. Run that same idempotent terminal cleanup on setup error and unmount. Use DOM `style.removeProperty()` so fallback cleanup still works when GSAP itself is missing or throws. Never use `autoAlpha` or animate `visibility`.

Add CSS final-state overrides that beat inline values:

```css
[data-reveal-item]:focus-within,
[data-reveal]:not(:has([data-reveal-item])):focus-within {
  opacity: 1 !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce), print {
  [data-reveal], [data-reveal-item] {
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }
  [data-reveal-item="rule"] { transform: scaleX(1) !important; }
}
```

- [ ] **Step 4: Run semantic, focus, print, and existing GSAP regressions**

Run: `npm test -- app/hooks/use-section-reveal.test.tsx app/globals.test.ts app/globals-editorial.test.ts app/lib/gsap-client.test.ts`

Expected: PASS, including zero trigger creation for invalid or already-visible `document` roots.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-section-reveal.ts app/hooks/use-section-reveal.test.tsx app/globals.css app/globals-editorial.test.ts
git commit -m "feat: implement semantic section reveals"
```

### Task 4: Mark Landing And Result Reading Units

**Files:**
- Modify: `app/components/landing.tsx:62-138`
- Modify: `app/components/landing.test.tsx:32-188`
- Modify: `app/components/results.tsx:44-520`
- Modify: `app/components/results.test.tsx`
- Modify: `app/components/results-motion.test.tsx:1-132`
- Modify: `app/components/express-results.tsx:25-86`
- Modify: `app/components/express-results.test.tsx`
- Modify: `app/globals.css:266-331,713-750,913-1065`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Consumes: `useSectionReveal(scope, "[data-reveal]", mode)` and callable `ScrollTrigger.refresh`.
- Produces: non-nested `heading`, `group`, and `single` roots with explicit `data-reveal-item`; one next-frame refresh for `PrivateResultsRevealBoundary`.
- Preserves: every CTA callback, result condition, heading ID, focus call, list/table semantic, and `content-visibility: auto` section.

- [ ] **Step 1: Write the marker and private-boundary tests first**

Update landing expectations to enforce sibling roots and the decorative rule:

```ts
const roots = [...container.querySelectorAll<HTMLElement>("[data-reveal]")];
expect(roots.map((root) => root.dataset.reveal)).toEqual([
  "heading", "heading", "group", "heading", "group", "single",
]);
for (const root of roots) expect(root.querySelector("[data-reveal]")).toBeNull();
expect(container.querySelector('[data-reveal-item="rule"]')).toHaveAttribute("aria-hidden", "true");
```

For results, assert heading/group roots are siblings in score, Express, habits, actions, and labs; numeric readouts are never initialized to a different value. In `results-motion.test.tsx`, stub initial document roots below the viewport, expose `ScrollTrigger.refresh`, stub `requestAnimationFrame`, reveal private results, then assert only new roots initialize and `refresh` runs once in the next frame.

- [ ] **Step 2: Run landing/results tests and verify RED**

Run: `npm test -- app/components/landing.test.tsx app/components/results-motion.test.tsx app/components/results.test.tsx app/components/express-results.test.tsx`

Expected: FAIL because all current sections use bare roots and `PrivateResultsRevealBoundary` still uses default mode without refresh.

- [ ] **Step 3: Apply the semantic markup without nesting roots**

Apply this exact landing root map:

1. `.landing__atlas-conversion` is `data-reveal="heading"`; its eyebrow, H2, body, and button are `data-reveal-item`, followed by `<span aria-hidden="true" className="reveal-rule" data-reveal-item="rule" />`.
2. `.depth-section` has no reveal attribute. Its `.section-heading` is `data-reveal="heading"` and marks the eyebrow and H2; its sibling `.depth-grid` is `data-reveal="group"` and marks each of the three `.depth-card` articles.
3. `.privacy-panel` has no reveal attribute. Its first child `div` is `data-reveal="heading"` and marks the eyebrow and H2; its sibling `.privacy-panel__facts` is `data-reveal="group"` and marks each of its three direct fact `div` elements, allowing their existing separators to enter with the facts.
4. `.landing__footnote` is `data-reveal="single"` and has no nested reveal root.

Apply this exact results root map:

1. `.results__intro` is `heading` and marks its eyebrow, H1, and body. `.results-urgent`, `.child-guide`, `.private-results-handoff`, and `.result-tools` are explicit `single` roots.
2. `.results-canopy` has no reveal attribute. Its direct `.section-heading` is a `heading` root with marked eyebrow and H2; `RiskTree` retains only its dedicated construction trigger.
3. `.score-sheet` has no root attribute in the adult-score branch. Add `.score-sheet__heading` as a `heading` root containing the existing eyebrow, H2, readout, and scope, and make `.score-categories` its sibling `group` root with each direct `details.score-category` marked. Both insufficient-coverage variants remain one `heading` root and mark each direct child because they have no peer collection.
4. `.express-results`, `.habits-map`, `.action-plan`, and `.confirmed-labs` have no outer reveal attribute. Add a `__heading` child as a `heading` root for each section's existing eyebrow/title/intro nodes; their `.express-results__grid`, `.habits-map__cards`, direct `ol`, and `.confirmed-labs__table-wrap` become sibling `group` roots. Mark Express cards, habit cards, action steps, and the existing table as their direct items.
5. Keep headings in their existing semantic section and preserve every heading ID. Where a heading wrapper changes a direct-child CSS selector, update only that selector to the new `__heading h2` path and update the exact typography test without widening Newsreader to card H3s.

Do not place `[data-reveal]` on an outer section when a descendant is also a reveal root. Keep result values final from the first render; these timelines may change only opacity and transforms.

Update the private boundary:

```tsx
function PrivateResultsRevealBoundary({ children }: { readonly children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useSectionReveal(scope, "[data-reveal]", "new-content");
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div ref={scope} data-private-results-reveal>{children}</div>;
}
```

Adjust CSS grid wrappers without introducing cards around sections. Keep result values final from the first render and do not modify questionnaire components.

- [ ] **Step 4: Run result, focus, and questionnaire non-regressions**

Run: `npm test -- app/components/landing.test.tsx app/components/results-motion.test.tsx app/components/results.test.tsx app/components/express-results.test.tsx app/components/assessment.test.tsx app/components/motion-screen.test.tsx`

Expected: PASS with the private results heading still focused and no nested reveal roots.

- [ ] **Step 5: Commit**

```bash
git add app/components/landing.tsx app/components/landing.test.tsx app/components/results.tsx app/components/results.test.tsx app/components/results-motion.test.tsx app/components/express-results.tsx app/components/express-results.test.tsx app/globals.css app/globals-editorial.test.ts
git commit -m "feat: choreograph landing and result bands"
```

### Task 5: Bootstrap And Orchestrate The Hero Entrance

**Files:**
- Create: `app/lib/motion-bootstrap.ts`
- Create: `app/lib/motion-bootstrap.test.ts`
- Modify: `app/layout.tsx:56-67`
- Modify: `app/layout.test.ts`
- Modify: `app/components/landing.tsx:62-70`
- Modify: `app/components/landing.test.tsx`
- Modify: `app/hooks/use-landing-timeline.ts:23-73`
- Modify: `app/hooks/use-landing-timeline.test.tsx:1-170`
- Modify: `app/globals.css:146-161,1128-1205`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Produces: `HERO_MOTION_BOOTSTRAP_SCRIPT`; root states `pending | ready | static`; hero targets `data-hero-item`, `data-hero-title-mask`, `data-hero-title`, and `data-hero-handoff`.
- Preserves: `useLandingTimeline(scope): HumanAtlasSceneId`, both Express buttons, and the existing Atlas ScrollTrigger.
- Consumes: `observeDecorativeMotion` and `suppressHydrationWarning` on the root `<html>`.

- [ ] **Step 1: Write bootstrap and exact hero timeline tests**

Execute the exported script in JSDOM with fake timers and the shared motion fixture. Prove:

```ts
expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "pending");
window.dispatchEvent(new Event("scroll"));
expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");

document.documentElement.dataset.motionBootstrap = "ready";
vi.advanceTimersByTime(1500);
expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "ready");
```

Add cases for initial reduced motion/missing API (attribute absent), preference changing to reduce (`pending → static`), throwing `matchMedia`/listener (`static` if pending), and timer/listener cleanup. In `layout.test.ts`, assert the script is in `<head>`, `<html suppressHydrationWarning>` is true, and no other suppression prop is added.

Because adding `<head>` changes `RootLayout` from one child to two, replace the current `const body = tree.props.children` lookup with an explicit child split and assert both elements:

```ts
import { Children, type ReactElement } from "react";

const [head, body] = Children.toArray(tree.props.children) as ReactElement[];
expect(head.type).toBe("head");
expect(body.type).toBe("body");
expect(tree.props.suppressHydrationWarning).toBe(true);
```

In the landing timeline test, distinguish the entrance timeline from the scroll-triggered timeline and assert these calls: eyebrow `{opacity:0,y:12}` at `0`; H1 `{opacity:0,y:32,duration:.62}` at `.08`; body `{y:18,duration:.42}` at `.26`; action `{y:14,duration:.36}` at `.38`; hint `{y:10,duration:.32}` at `.5`; all `power3.out`, final opacity 1/y 0, total `.82`. Make `gsap.timeline` or `ScrollTrigger.create` non-callable in separate cases and assert a pending bootstrap becomes `static` before any `gsap.set` or `fromTo` call.

- [ ] **Step 2: Run bootstrap/hero tests and verify RED**

Run: `npm test -- app/lib/motion-bootstrap.test.ts app/layout.test.ts app/components/landing.test.tsx app/hooks/use-landing-timeline.test.tsx app/globals-editorial.test.ts`

Expected: FAIL because the bootstrap module, root script, hero markers, title mask, and entrance timeline do not exist.

- [ ] **Step 3: Implement the exception-safe bootstrap and hero targets**

Export an inline script with this state machine:

```ts
export const HERO_MOTION_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement;
  let media;
  let timer;
  let mediaInstalled = false;
  let scrollInstalled = false;
  const onPreferenceChange = () => {
    if (media && media.matches) settle();
  };
  const cleanup = () => {
    if (scrollInstalled) {
      scrollInstalled = false;
      try { window.removeEventListener("scroll", settle); }
      catch { /* Best-effort cleanup after partial bootstrap setup. */ }
    }
    if (mediaInstalled && media) {
      mediaInstalled = false;
      try { media.removeEventListener("change", onPreferenceChange); }
      catch { /* Best-effort cleanup after partial bootstrap setup. */ }
    }
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };
  const settle = () => {
    if (root.dataset.motionBootstrap === "pending") {
      root.dataset.motionBootstrap = "static";
    }
    cleanup();
  };
  try {
    if (typeof window.matchMedia !== "function") return;
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    root.dataset.motionBootstrap = "pending";
    scrollInstalled = true;
    window.addEventListener("scroll", settle, { once: true, passive: true });
    mediaInstalled = true;
    media.addEventListener("change", onPreferenceChange);
    timer = window.setTimeout(settle, 1500);
  } catch {
    settle();
  }
})();`;
```

Inject it from `RootLayout`:

```tsx
<html lang="en" suppressHydrationWarning>
  <head><script dangerouslySetInnerHTML={{ __html: HERO_MOTION_BOOTSTRAP_SCRIPT }} /></head>
  <body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body>
</html>
```

Wrap only the H1 in an auto-height `.landing__hero-title-mask` with `0.12em` block padding and `data-hero-title-mask`. Keep entrance and continuous transforms on separate DOM layers so entrance cleanup cannot erase a current scroll position. Use this exact target map:

| Hero node | Attributes |
| --- | --- |
| Eyebrow `p` | `data-hero-item`; its text is wrapped by a block `span[data-hero-handoff]` |
| H1 inside the mask | `data-hero-item`; its text is wrapped by a block `span[data-hero-title][data-hero-handoff]` |
| Body `p` | `data-hero-item`; its text is wrapped by a block `span[data-hero-handoff]` |
| Primary CTA | `data-hero-item` only |
| Scroll-hint `p` | `data-hero-item`; its text is wrapped by a block `span[data-hero-handoff]` |

Add a component test proving no element matches both `[data-hero-item]` and `[data-hero-handoff]`. Split `useLandingTimeline` into two scoped `useGSAP` calls while preserving its public return type:

1. The entrance effect does not depend on `useDecorativeMotion()`. It performs the synchronous capability observation, prepares initial values only when the root state is exactly `pending`, changes it to `ready` in that same layout effect, and starts only the entrance timeline.
2. The existing continuous Atlas effect retains `useDecorativeMotion()` as its dependency. It owns only the scrubbed camera/handoff/strength timeline, so visibility or preference changes can revert and recreate it at current scroll progress without rerunning the entrance.

Remove the bootstrap attribute on entrance completion, and change `ready → static` on entrance unmount, Strict Mode replay, hidden document, reduced preference, or setup error. Returning to no-preference must not replay the entrance. The continuous timeline may translate every `data-hero-handoff` target, but only `data-hero-title` may receive the `.82` opacity endpoint.

- [ ] **Step 4: Add CSS bootstrap/focus/static states and run regressions**

```css
html[data-motion-bootstrap="pending"] [data-hero-item] { opacity: 0; }
html:is([data-motion-bootstrap="pending"], [data-motion-bootstrap="ready"])
  [data-hero-title-mask] { overflow: clip; }
[data-hero-item]:focus-within {
  opacity: 1 !important;
  transform: none !important;
  clip-path: none !important;
}
[data-hero-handoff] { display: block; }
@media (prefers-reduced-motion: reduce), print {
  [data-hero-item], [data-hero-handoff] {
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    clip-path: none !important;
  }
  [data-hero-title-mask] {
    clip-path: none !important;
    overflow: visible !important;
  }
}
```

In `globals-editorial.test.ts`, assert the pending mask selector contains only `[data-hero-item]`, the title mask has no fixed height, block padding is at least `0.12em`, and the focus/reduced/print rules above use `!important` where they must override GSAP inline styles.

Run: `npm test -- app/lib/motion-bootstrap.test.ts app/layout.test.ts app/hooks/use-landing-timeline.test.tsx app/components/landing.test.tsx app/globals.test.ts app/globals-editorial.test.ts app/page.test.tsx`

Expected: PASS with SSR/static hero content visible and no test console warning.

- [ ] **Step 5: Commit**

```bash
git add app/lib/motion-bootstrap.ts app/lib/motion-bootstrap.test.ts app/layout.tsx app/layout.test.ts app/components/landing.tsx app/components/landing.test.tsx app/hooks/use-landing-timeline.ts app/hooks/use-landing-timeline.test.tsx app/globals.css app/globals-editorial.test.ts
git commit -m "feat: orchestrate the bootstrapped hero"
```

### Task 6: Extend The Atlas Camera And Raw Progress Rail

**Files:**
- Modify: `app/hooks/use-landing-timeline.ts:12-73`
- Modify: `app/hooks/use-landing-timeline.test.tsx:1-170`
- Modify: `app/components/human-atlas-scroll.tsx:61-110`
- Modify: `app/components/human-atlas-scroll.test.tsx`
- Modify: `app/globals.css:163-230,289-320,1159-1196`
- Modify: `app/globals.test.ts`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Produces: `atlasMotionLimits(width: number): { heroY: number; imageScale: number; imageY: number }`; `[data-atlas-camera]`; `[data-atlas-progress-fill]`.
- Preserves: `atlasSceneFromProgress`, one Atlas ScrollTrigger with `scrub: 0.8`, four marker states, strength signals, and uncontrolled Atlas fallback.

- [ ] **Step 1: Add failing limits, target, and raw-progress tests**

```ts
expect(atlasMotionLimits(1440)).toEqual({ heroY: 36, imageScale: 1.035, imageY: 8 });
expect(atlasMotionLimits(851)).toEqual({ heroY: 36, imageScale: 1.035, imageY: 8 });
expect(atlasMotionLimits(850)).toEqual({ heroY: 18, imageScale: 1.018, imageY: 4 });

act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }));
expect(mockGsapSet).toHaveBeenCalledWith(progressFill, { scaleX: 0.6 });
expect(screen.getByRole("status")).toHaveTextContent("sleep");
```

Assert the scroll timeline still has `scrub: 0.8`, camera targets the image rather than `.human-atlas-media`, H1 reaches no lower than `.82`, normal copy and CTA are not opacity targets, fill error is at most `.02` for progress samples `[0,.25,.5,.75,1]`, and missing camera/fill targets do not throw. Component tests assert the image path/dimensions/hash and exactly four active-scene markers remain unchanged.

Drive the shared motion fixture from visible to hidden and back to visible. Assert the first continuous timeline is reverted, no second hero entrance timeline is created, and exactly one replacement continuous timeline is attached. Invoke its `onRefresh({ progress: 0.6 })` callback and assert the fill is `.6` and the active scene is `sleep`; a temporary hidden state must not reset the prior scene to `breath`.

- [ ] **Step 2: Run Atlas camera tests and verify RED**

Run: `npm test -- app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.test.tsx app/globals.test.ts app/globals-editorial.test.ts`

Expected: FAIL because no camera/fill targets or responsive limit helper exist.

- [ ] **Step 3: Add stable targets and extend the existing trigger**

Use explicit markup:

```tsx
<Image
  aria-hidden="true"
  alt=""
  data-atlas-camera
  decoding="async"
  draggable={false}
  fetchPriority="high"
  height={941}
  loading="eager"
  onError={() => setImageFailed(true)}
  sizes="100vw"
  src="/media/human-atlas-hero.webp"
  unoptimized
  width={1672}
/>
<div className="human-atlas-progress" aria-hidden="true">
  <span className="human-atlas-progress__rail">
    <span className="human-atlas-progress__fill" data-atlas-progress-fill />
  </span>
  <span className="human-atlas-progress__markers">
    {humanAtlasScenes.map((scene) => (
      <span
        data-active={activeScene === scene.id ? "true" : "false"}
        key={scene.id}
      />
    ))}
  </span>
</div>
```

Create one `syncAtlasProgress({ progress })` callback that clamps raw progress, calls `gsap.set(fill, { scaleX: progress })`, and derives the scene from the same raw value. Register it as both `onUpdate` and `onRefresh` on the continuous trigger so a recreated trigger immediately reflects the current scroll position. Do not reset `activeScene` when `motionAllowed` becomes false; `onLeaveBack` remains the only explicit reset to `breath`. Keep the camera/hero/strength motion on the smoothed timeline. Animate the image from scale 1/y 0 to the selected `atlasMotionLimits`; translate `[data-hero-handoff]`, fade only `[data-hero-title]` to `.82`, and exclude the CTA.

- [ ] **Step 4: Implement responsive/static CSS and run the Atlas regression group**

Make the fill transform from the left without affecting marker dimensions. `atlasMotionLimits(window.innerWidth)` selects compact values at widths up to and including 850 px; CSS preserves the existing compact layout rather than attempting to encode those JavaScript amplitudes. Under reduced motion, image failure, and print force the image transform to none and the progress fill to `scaleX(1)`. Apply `will-change` only to the active camera target and clear it on hook cleanup.

Run: `npm test -- app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.test.tsx app/hooks/use-active-atlas-scene.test.tsx app/globals.test.ts app/globals-editorial.test.ts`

Expected: PASS with one continuous trigger and the original image intact.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-landing-timeline.ts app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.tsx app/components/human-atlas-scroll.test.tsx app/globals.css app/globals.test.ts app/globals-editorial.test.ts
git commit -m "feat: extend the Human Atlas camera"
```

### Task 7: Sequence Human Atlas Chapters Safely

**Files:**
- Create: `app/hooks/use-atlas-scene-transition.ts`
- Create: `app/hooks/use-atlas-scene-transition.test.tsx`
- Modify: `app/components/human-atlas-scroll.tsx:44-112`
- Modify: `app/components/human-atlas-scroll.test.tsx`
- Modify: `app/globals.css:218-230,1159-1196`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Produces: `useAtlasSceneTransition(scope: RefObject<HTMLElement | null>, activeScene: HumanAtlasSceneId): void`; `[data-atlas-scene-item]`.
- Consumes: `observeDecorativeMotion`, the controlled/uncontrolled scene ID, and scoped GSAP context.

- [ ] **Step 1: Write failing initial, ordinary, interrupted, and disabled tests**

Render a hook harness with four marked items in the active scene. Assert initial mount calls no entrance timeline and all items are final. Rerender to a new scene and assert:

```ts
expect(mockFromTo).toHaveBeenCalledWith(
  activeItems,
  { opacity: 0.45, y: 12 },
  expect.objectContaining({
    duration: 0.38, ease: "power2.out", opacity: 1, stagger: 0.06, y: 0,
  }),
);
```

Make `timeline.isActive()` return true before another scene change; assert cleanup order is `kill → context.revert → final-state cleanup`, the next entrance is skipped, and its children are opacity 1/y 0 before paint. Trigger reduced motion during an active entrance and prove returning to no-preference does not replay it. Make `gsap.timeline` missing and throwing in separate cases and assert no initial opacity/transform is retained.

- [ ] **Step 2: Run chapter tests and verify RED**

Run: `npm test -- app/hooks/use-atlas-scene-transition.test.tsx app/components/human-atlas-scroll.test.tsx`

Expected: FAIL because the hook and scene item markers do not exist.

- [ ] **Step 3: Implement the focused hook and markers**

Use a root ref on `.human-atlas-scroll`, mark eyebrow/H3/body/source with `data-atlas-scene-item`, and call:

```ts
useAtlasSceneTransition(atlasRef, activeScene);
```

Inside the hook, keep `initialMountRef`, `interruptedRef`, `motionCancelledRef`, and the owned timeline/context. Always clear every scene child to final before deciding whether to animate. On an interrupted change set `interruptedRef` during cleanup and skip exactly the next entrance. The four-item sequence must end at `0.38 + 3 × 0.06 = 0.56s`.

- [ ] **Step 4: Add static CSS coverage and run regressions**

Extend reduced-motion/print/image-failure rules to `[data-atlas-scene-item]` with opacity 1 and transform none `!important`. Do not change scene DOM order, text, active attributes, glow behavior, or the uncontrolled IntersectionObserver fallback.

Run: `npm test -- app/hooks/use-atlas-scene-transition.test.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.test.tsx app/globals-editorial.test.ts`

Expected: PASS for initial static render, ordinary 560 ms entry, interruption, unmount, and reduced motion.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-atlas-scene-transition.ts app/hooks/use-atlas-scene-transition.test.tsx app/components/human-atlas-scroll.tsx app/components/human-atlas-scroll.test.tsx app/globals.css app/globals-editorial.test.ts
git commit -m "feat: sequence Human Atlas chapters"
```

### Task 8: Construct The Risk Tree On Entry

**Files:**
- Create: `app/hooks/use-risk-tree-construction.ts`
- Create: `app/hooks/use-risk-tree-construction.test.tsx`
- Modify: `app/components/risk-tree.tsx:166-212`
- Modify: `app/components/risk-tree.test.tsx`
- Modify: `app/globals.css:752-884,1128-1205`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Produces: `useRiskTreeConstruction(scope: RefObject<HTMLElement | null>): void`; `data-risk-tree-trunk`, `data-risk-tree-branch`, and `data-risk-tree-item` markers; custom properties `--risk-trunk-progress` and `--risk-branch-progress`.
- Preserves: the navigation landmark, four-pillar order, buttons/lists, `aria-pressed`, `aria-controls`, foundation section, empty states, and missing-pillar error.

- [ ] **Step 1: Write viewport, timing, cleanup, and focus tests first**

Set the tree rectangle to `top: window.innerHeight` and then `top: window.innerHeight + 100`. At `top <= innerHeight`, assert no timeline/trigger and final custom properties. At `top > innerHeight`, assert one trigger at `top 84%` and exact values:

```ts
expect(mockSet).toHaveBeenCalledWith(trunk, { "--risk-trunk-progress": 0 });
expect(mockSet).toHaveBeenCalledWith(branches, { "--risk-branch-progress": 0 });
expect(mockSet).toHaveBeenCalledWith(pillars, { opacity: 0, y: 16 });
expect(mockSet).toHaveBeenCalledWith(leafGroups, { opacity: 0, y: 10 });
expect(mockSet).toHaveBeenCalledWith(foundation, { opacity: 0, y: 12 });
```

Assert the trigger uses `once: true`; trunk/branch tweens are 550 ms; branches start at `.16,.24,.32,.40`; content uses 380 ms/60 ms stagger; foundation ends at `1.10`; and reduced motion mid-tween kills/reverts/settles. Make `ScrollTrigger.create` missing and throwing in separate tests and assert no initial tree state remains. Component/CSS tests focus a leaf during construction and require both marked ancestors to match the `!important` final-state rule.

- [ ] **Step 2: Run tree construction tests and verify RED**

Run: `npm test -- app/hooks/use-risk-tree-construction.test.tsx app/components/risk-tree.test.tsx app/globals-editorial.test.ts`

Expected: FAIL because the construction hook, custom properties, markers, and focus override are absent.

- [ ] **Step 3: Implement the once-only tree timeline**

Attach a ref to the existing `.risk-tree` nav and mark both branch blocks and nested leaf groups. `LeafList` adds `data-risk-tree-item` directly to both its populated and empty `<ul>` return paths; it does not gain a generic prop-forwarding API. Use this exact outer structure:

```tsx
<nav
  ref={treeRef}
  className="risk-tree"
  aria-label={t("riskTree.aria")}
  data-risk-tree-trunk
>
  <p className="risk-tree__root">{t("riskTree.root")}</p>
  <p className="data-label">{t("riskTree.signals")}</p>
  {leaves.length === 0 ? (
    <p className="risk-tree__empty" role="status">
      {t("riskTree.emptySignals")}
    </p>
  ) : null}
  <ul className="risk-tree__branches">
    {HEALTH_PILLARS.map((pillar) => (
      <li
        key={pillar}
        className={`risk-tree__branch risk-tree__branch--${pillar}`}
        aria-label={t("riskTree.pillar.aria", {
          pillar: t(uiCopyKeys.pillar[pillar]),
        })}
        data-risk-tree-branch
        data-risk-tree-item
      >
        <span className="risk-tree__branch-label">
          {t(uiCopyKeys.pillar[pillar])}
        </span>
        <LeafList
          leaves={leavesByPillar[pillar]}
          selectedId={selectedLeaf?.id}
          onSelect={setRequestedLeafId}
        />
      </li>
    ))}
  </ul>
  <section
    className="risk-tree__foundation"
    aria-label={t("riskTree.protective")}
    data-risk-tree-item
  >
    <span className="risk-tree__branch-label">{t("riskTree.protective")}</span>
    <ul className="risk-tree__roots">
      {protectiveRoots.length > 0
        ? protectiveRoots.map((root) => <li key={root}>{root}</li>)
        : <li>{t("riskTree.emptyProtective")}</li>}
    </ul>
  </section>
</nav>
```

Call `useRiskTreeConstruction(treeRef)` in `RiskTree`. Build one GSAP timeline only when `gsap.timeline` and `ScrollTrigger.create` are callable, the synchronous motion observation is `running`, and the measured tree is strictly below the viewport. Use these exact positions: trunk at `0` for `.55s`; the four branch connectors at `.16`, `.24`, `.32`, and `.40` for `.55s`; the four pillar blocks from `.22` for `.38s` with `.06s` stagger; the four leaf groups from `.38` for `.38s` with `.06s` stagger; foundation at `.72` for `.38s`, ending the sequence at `1.10s`. Use default CSS custom property value `1` so unsupported/static rendering is fully drawn. Kill the timeline and its trigger, revert context, remove inline custom properties/opacity/transform, and unsubscribe on every terminal path.

- [ ] **Step 4: Implement origins/focus/print CSS and run regressions**

```css
.risk-tree::before {
  transform: translateX(-50%) scaleY(var(--risk-trunk-progress, 1));
  transform-origin: top center;
}
.risk-tree__branch::before {
  transform: scale(var(--risk-branch-progress, 1));
}
.risk-tree__branch:nth-child(odd)::before { transform-origin: top right; }
.risk-tree__branch:nth-child(even)::before { transform-origin: top left; }
[data-risk-tree-item]:focus-within {
  opacity: 1 !important;
  transform: none !important;
}
```

Reduced motion and print must force both custom properties to `1 !important` and every item final. Run: `npm test -- app/hooks/use-risk-tree-construction.test.tsx app/components/risk-tree.test.tsx app/components/results.test.tsx app/globals.test.ts app/globals-editorial.test.ts`

Expected: PASS with navigation and selection semantics unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-risk-tree-construction.ts app/hooks/use-risk-tree-construction.test.tsx app/components/risk-tree.tsx app/components/risk-tree.test.tsx app/globals.css app/globals-editorial.test.ts
git commit -m "feat: construct the risk tree on entry"
```

### Task 9: Transition And Announce Risk Evidence

**Files:**
- Create: `app/hooks/use-evidence-transition.ts`
- Create: `app/hooks/use-evidence-transition.test.tsx`
- Modify: `app/components/risk-tree.tsx:19-212`
- Modify: `app/components/risk-tree.test.tsx`
- Modify: `app/i18n/ui-copy.ts:298-323,720-745`
- Modify: `app/i18n/ui-copy.test.ts:230-250`
- Modify: `app/globals.css:886-911,1128-1205`
- Modify: `app/globals-editorial.test.ts`

**Interfaces:**
- Produces: `useEvidenceTransition(scope: RefObject<HTMLElement | null>, evidenceKey: string | undefined): void`; `[data-evidence-transition]`; `riskTree.evidence.selected` in EN/FR.
- Preserves: evidence region labeling/content, selected-button focus, `aria-pressed`, `aria-controls`, and immediate React content commit.

- [ ] **Step 1: Write failing transition and live-status tests**

The hook test skips initial mount, then rerenders with a new key and expects:

```ts
expect(mockFromTo).toHaveBeenCalledWith(
  evidenceContent,
  { opacity: 0.82, y: 8 },
  expect.objectContaining({
    duration: 0.22, ease: "power2.out", opacity: 1, y: 0,
  }),
);
```

Change selection again while `timeline.isActive()` is true and assert old timeline kill/revert precedes the new transition, old evidence never reappears, and the selected button retains focus. Trigger focus inside evidence during the tween and assert CSS final state.

Add component/i18n tests:

```ts
expect(screen.getByRole("status")).toBeEmptyDOMElement();
await user.click(screen.getByRole("button", { name: /Second signal/ }));
expect(screen.getByRole("status")).toHaveTextContent("Evidence selected: Second signal");
expect(screen.getByRole("status")).not.toHaveTextContent("Second signal copy");
```

Switch to French before selection and expect `Preuve sélectionnée : Second signal`. Rapidly select two leaves and assert only the final title remains in the atomic polite status. Make `gsap.timeline` missing and throwing in separate hook tests and assert the newly committed evidence stays at full opacity and zero transform.

- [ ] **Step 2: Run evidence/i18n tests and verify RED**

Run: `npm test -- app/hooks/use-evidence-transition.test.tsx app/components/risk-tree.test.tsx app/i18n/ui-copy.test.ts app/globals-editorial.test.ts`

Expected: FAIL because the transition hook, content wrapper, status, copy key, and focus CSS are absent.

- [ ] **Step 3: Implement transition ownership and concise announcement**

In both branches of `EvidencePanel`, add an `evidenceRef` prop and place exactly one `<div ref={evidenceRef} className="risk-evidence__content" data-evidence-transition>` inside the existing `<aside>`. Move the current data label, heading or empty prompt, copy, and ledger into that wrapper without changing their content or order. Keep `id="risk-evidence-panel"`, `role="region"`, and `aria-labelledby={headingId}` on the populated `<aside>`.

Call `useEvidenceTransition(evidenceRef, selectedLeaf?.id)`. Replace direct `setRequestedLeafId` use with a `handleSelect(id)` callback that resolves the selected leaf, updates `requestedLeafId`, and updates an initially empty announcement only for a user selection. Use these locale entries:

```ts
"riskTree.evidence.selected": "Evidence selected: {title}",
"riskTree.evidence.selected": "Preuve sélectionnée : {title}",
```

Render `<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>`. Do not place the complete evidence body in the live region.

- [ ] **Step 4: Add opacity/focus/static CSS and run the full result regression group**

```css
[data-evidence-transition]:focus-within {
  opacity: 1 !important;
  transform: none !important;
}
@media (prefers-reduced-motion: reduce), print {
  [data-evidence-transition] {
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }
}
```

Run: `npm test -- app/hooks/use-evidence-transition.test.tsx app/components/risk-tree.test.tsx app/components/results-motion.test.tsx app/components/results.test.tsx app/components/express-results.test.tsx app/i18n/ui-copy.test.ts app/globals.test.ts app/globals-editorial.test.ts`

Expected: PASS with immediate semantic updates, one concise announcement, focus retained, and panel opacity never below `.82`.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-evidence-transition.ts app/hooks/use-evidence-transition.test.tsx app/components/risk-tree.tsx app/components/risk-tree.test.tsx app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts app/globals.css app/globals-editorial.test.ts
git commit -m "feat: transition and announce risk evidence"
```

### Task 10: Full Verification And Browser QA

**Files:**
- Modify only when a reproduced defect first receives a focused failing test.
- Do not commit `.playwright-mcp`, screenshots, `dist`, `.next`, `.vinext`, `.wrangler`, or `*.tsbuildinfo` artifacts.

**Interfaces:**
- Consumes: Tasks 1-9 and the approved specification.
- Produces: fresh release-gate output, exact-build HTTP smoke evidence, desktop/mobile EN/FR visual evidence, and a clean Git worktree.

- [ ] **Step 1: Run focused non-regression groups**

```bash
npm test -- app/layout.test.ts app/globals.test.ts app/globals-editorial.test.ts
npm test -- app/hooks/use-decorative-motion.test.tsx app/hooks/use-section-reveal.test.tsx app/lib/gsap-client.test.ts
npm test -- app/hooks/use-landing-timeline.test.tsx app/hooks/use-atlas-scene-transition.test.tsx app/components/landing.test.tsx app/components/human-atlas-scroll.test.tsx
npm test -- app/hooks/use-risk-tree-construction.test.tsx app/hooks/use-evidence-transition.test.tsx app/components/results-motion.test.tsx app/components/risk-tree.test.tsx app/components/results.test.tsx app/components/express-results.test.tsx app/i18n/ui-copy.test.ts
npm test -- app/components/assessment.test.tsx app/components/motion-screen.test.tsx app/components/question-control.test.tsx app/components/question-prompt.test.tsx app/components/pillar-progress.test.tsx app/components/lab-import.test.tsx
```

Expected: every command exits 0. Any failure gets a new focused RED test before its fix and a separate fix commit.

- [ ] **Step 2: Run complete static, behavioral, build, and dependency gates**

```bash
node --version
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
```

Expected: Node satisfies `>=22.13.0`; TypeScript, ESLint, all Vitest files, and production build exit 0; production audit reports zero vulnerabilities; diff check is empty.

- [ ] **Step 3: Start and smoke-test the exact production build**

Use the first free port from 4189 through 4199:

```bash
PORT=4189
while lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null; do
  PORT=$((PORT + 1))
  if test "$PORT" -gt 4199; then
    printf '%s\n' 'No free QA port from 4189 through 4199.' >&2
    exit 1
  fi
done
printf '%s\n' "$PORT" > /tmp/editorial-motion-port
nohup npm start -- --hostname 127.0.0.1 --port "$PORT" \
  > /tmp/editorial-motion-server.log 2>&1 &
printf '%s\n' "$!" > /tmp/editorial-motion-server.pid
ATTEMPT=0
until curl -fsS -D /tmp/editorial-motion-headers.txt -o /dev/null \
  "http://127.0.0.1:$PORT/"; do
  ATTEMPT=$((ATTEMPT + 1))
  if test "$ATTEMPT" -ge 30; then
    cat /tmp/editorial-motion-server.log
    exit 1
  fi
  sleep 1
done
```

Expected: HTTP 200, no unexpected `Set-Cookie`, and `/media/human-atlas-hero.webp` decodes with its original dimensions. Keep this server running through browser QA and stop it before completion.

- [ ] **Step 4: Verify normal motion and layout in Chrome**

At `1440×900`, `390×844`, and `320×700`, in English and French, repeat the capture set once with normal motion and once with emulated `prefers-reduced-motion: reduce`:

1. Capture the hero at initial/final entrance, all four Atlas quarters, conversion, depth choices, privacy, results intro, risk tree, score/Express, and action/lab sections.
2. Confirm raw progress fill differs from `ScrollTrigger.progress` by at most `.02` while camera easing remains visibly smoothed.
3. Confirm desktop maxima `heroY <= 36`, `scale <= 1.035`, `imageY < 10`; compact maxima `18`, `1.018`, `4`.
4. Confirm no overlap, clipped word/accent/descender, green side rectangle, blank image, layout shift, or horizontal overflow (`document.documentElement.scrollWidth === innerWidth`).
5. Inspect console and page errors for zero hydration, GSAP, asset, or React errors.

- [ ] **Step 5: Verify focus, announcements, contrast, reflow, and print during active tweens**

1. While the entrance/reveal is active, Tab to the hero CTA, a depth-card button, a risk-tree leaf, and a score disclosure. Each focused target and every animated ancestor must compute to opacity 1/transform none without moving focus.
2. Select risk leaves with keyboard and VoiceOver, and confirm one concise localized polite announcement, retained button focus, correct `aria-pressed`, and immediate evidence region content. Record any unavailable screen-reader check rather than inferring it from DOM alone.
3. Freeze the deepest hero handoff frame with the H1 at opacity `.82`, and separately freeze evidence content at `.82`. Measure composited contrast over the real bitmap and panel: H1 at least `3:1`; eyebrow, body, scroll hint, evidence copy, and metadata at least `4.5:1`; focus rings remain distinguishable.
4. Test browser zoom 200%, 400% reflow, and inject: `*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-bottom:2em!important}`. Confirm the title mask is cleared when settled and EN/FR content remains uncut at 320 pixels.
5. Emulate print while the hero, a reveal, tree construction, and evidence transition have inline tween values. Confirm hero/reveal/tree/evidence text is opacity 1, visible, untransformed, unclipped, connectors fully drawn, and the decorative Atlas stage remains handled by the existing print contract.

- [ ] **Step 6: Verify progressive-enhancement failure modes**

Before module load, separately test reduced motion, deleted `window.matchMedia`, throwing `matchMedia`, and an aborted Atlas image request. Confirm no pending/ready bootstrap remains, no entry replay after returning to no-preference, no hidden content, the four-chapter localized static story on image failure, and no console error. Hide/show the document during an entrance; entry content must settle final while the continuous Atlas may reattach at current raw progress.

- [ ] **Step 7: Reconcile and review the final branch**

Run a fresh independent code review using `superpowers:requesting-code-review`. Resolve every Critical/Important finding through RED/GREEN and a focused fix commit. Then rerun the affected focused tests and all commands from Step 2.

- [ ] **Step 8: Stop servers and prove a clean final state**

```bash
if test -f /tmp/editorial-motion-server.pid; then
  kill "$(cat /tmp/editorial-motion-server.pid)"
  rm -f /tmp/editorial-motion-server.pid /tmp/editorial-motion-port
fi
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -print
git status --short --branch
git log --oneline -12
```

Remove only generated artifacts created during this implementation/QA, stop the production server, and rerun `git diff --check`. Expected: clean worktree on the implementation branch with all task commits present.
