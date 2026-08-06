# Bioluminescent GSAP Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the complete Will I Die Soon? frontend as the approved dark bioluminescent experience with GSAP-driven landing and journey motion while preserving all health, privacy, scoring, and accessibility behavior.

**Architecture:** Add GSAP as a client-only progressive-enhancement layer with one scoped landing timeline, one reusable reveal hook, and one keyed screen entrance. Keep all questionnaire and health logic in the existing components; markup changes expose stable animation targets, while the visual redesign is driven by a compact global token system and focused component selectors.

**Tech Stack:** Next 16.2.12, React 19.2.8, TypeScript 5.9.3, GSAP 3.15.0, @gsap/react 2.1.2, ScrollTrigger, CSS, Vitest 4.1.0, Testing Library, Playwright/Chrome.

## Global Constraints

- Preserve all questionnaire definitions, consent gates, scoring, summaries, evidence, lab handling, locale state, local-only behavior, and callbacks.
- Keep the selected `public/media/human-atlas-hero.webp`; do not generate or download replacement media.
- Use exactly `#041719`, `#071F22`, `#55F1CA`, `#42C9FF`, `#FF7154`, and `#EFFFFC` as the six authored design colours; derive muted/translucent values with alpha or `color-mix()`.
- Use Space Grotesk for display, Geist for body/controls, and Geist Mono for data/units through `next/font/google`.
- Set authored `letter-spacing` to `0`; do not use viewport-width font scaling.
- Do not add a green rectangle, target box, scan frame, HUD readout, WebGL, canvas, pointer tracking, scroll hijacking, decorative orb, or remote media.
- GSAP is progressive enhancement: initial markup is visible and functional, setup is client-only, every context is reverted on unmount, and reduced motion disables pin/scrub/scale/travel effects.
- Keep 44 by 44 CSS-pixel controls, visible focus, EN/FR parity, image failure, missing API, print, and 320-pixel fallbacks.
- Run every production behavior change through red-green-refactor.

---

## File Map

- Modify `package.json` and `package-lock.json`: add the approved GSAP packages.
- Modify `app/layout.tsx` and `app/layout.test.ts`: replace the four-font stack with Space Grotesk, Geist, and Geist Mono.
- Create `app/lib/gsap-client.ts`: register and export GSAP, ScrollTrigger, and `useGSAP` once from a client-only boundary.
- Create `app/hooks/use-section-reveal.ts`: progressively reveal scoped `[data-reveal]` elements.
- Create `app/hooks/use-section-reveal.test.tsx`: verify setup, reduced motion, and cleanup.
- Create `app/components/motion-screen.tsx`: animate a keyed screen entrance without delaying its children.
- Create `app/components/motion-screen.test.tsx`: verify semantic transparency and cleanup.
- Create `app/hooks/use-landing-timeline.ts`: map scroll progress to canonical Atlas scenes and build the scoped master timeline.
- Create `app/hooks/use-landing-timeline.test.tsx`: verify phase mapping, top rewind, reduced motion, and cleanup.
- Modify `app/components/human-atlas-scroll.tsx` and its tests: accept controlled GSAP scene state while retaining static/failure fallbacks.
- Modify `app/components/human-atlas-glow.tsx` and its tests: add a strength signal path target and new colour tokens without semantic changes.
- Modify `app/components/landing.tsx` and its tests: own the Atlas timeline scope, update the hero copy, and mark tail sections for reveal.
- Modify `app/i18n/ui-copy.ts` and its tests: add the accepted EN/FR headline while preserving CTA semantics.
- Modify `app/page.tsx` and its tests: wrap each in-memory screen in `MotionScreen` with stable keys.
- Modify `app/components/consent-screen.tsx`, `assessment.tsx`, `intermission.tsx`, `results.tsx`, and focused tests: expose presentation-only motion targets and results reveal scope.
- Modify `app/globals.css` and `app/globals.test.ts`: implement the complete palette, typography, geometry, responsive, print, and reduced-motion system.

---

### Task 1: Install GSAP And Replace The Font Contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app/layout.tsx`
- Modify: `app/layout.test.ts`

**Interfaces:**
- Consumes: Next font loaders and the existing body variable contract.
- Produces: CSS variables `--font-display`, `--font-body`, and `--font-data`; packages `gsap@3.15.0` and `@gsap/react@2.1.2`.

- [ ] **Step 1: Update the layout test first**

Assert that `app/layout.tsx` imports `Space_Grotesk`, `Geist`, and `Geist_Mono`, assigns the three CSS variables, and no longer imports `Bricolage_Grotesque`, `Manrope`, `Newsreader`, or `IBM_Plex_Mono`.

```ts
expect(source).toContain("Space_Grotesk");
expect(source).toContain("Geist_Mono");
expect(source).not.toMatch(/Newsreader|Bricolage_Grotesque|IBM_Plex_Mono/);
expect(source).toContain("--font-display");
```

- [ ] **Step 2: Run the layout test and verify RED**

Run: `npx vitest run app/layout.test.ts`

Expected: FAIL because the old four-font imports are still present.

- [ ] **Step 3: Install pinned motion packages and implement the font stack**

Run: `npm install --save-exact gsap@3.15.0 @gsap/react@2.1.2`

Replace the loaders in `app/layout.tsx`:

```ts
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-data", subsets: ["latin"] });
```

Remove `--font-editorial` from the body class.

- [ ] **Step 4: Run the layout test and TypeScript**

Run: `npx vitest run app/layout.test.ts && npx tsc --noEmit --incremental false --pretty false`

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/layout.tsx app/layout.test.ts
git commit -m "feat: add GSAP and bioluminescent font stack"
```

### Task 2: Build The Progressive Motion Foundation

**Files:**
- Create: `app/lib/gsap-client.ts`
- Create: `app/hooks/use-section-reveal.ts`
- Create: `app/hooks/use-section-reveal.test.tsx`
- Create: `app/components/motion-screen.tsx`
- Create: `app/components/motion-screen.test.tsx`

**Interfaces:**
- Produces: `gsap`, `ScrollTrigger`, `useGSAP`; `useSectionReveal(scope, selector?)`; `MotionScreen({ screenKey, children })`.
- Consumes: `useDecorativeMotion()` for the existing reduced-motion and hidden-document contract.

- [ ] **Step 1: Write failing foundation tests**

Mock `../lib/gsap-client` and prove that visible content renders before animation, a normal-motion mount creates a scoped GSAP context, reduced motion skips tweens, and unmount reverts the context.

```tsx
render(<MotionScreen screenKey="consent"><h1>Consent</h1></MotionScreen>);
expect(screen.getByRole("heading", { name: "Consent" })).toBeVisible();
expect(mockFromTo).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ autoAlpha: 1 }));
```

For the reveal hook, render two `[data-reveal]` children and assert one ScrollTrigger-backed tween per child under normal motion and zero under reduced motion.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run app/hooks/use-section-reveal.test.tsx app/components/motion-screen.test.tsx`

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement the GSAP boundary and hooks**

`app/lib/gsap-client.ts`:

```ts
"use client";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(useGSAP, ScrollTrigger);
export { gsap, ScrollTrigger, useGSAP };
```

`MotionScreen` keeps a real wrapper with `data-motion-screen={screenKey}` and uses a scoped `fromTo()` only when `useDecorativeMotion()` returns true. `useSectionReveal` finds scoped targets, sets no permanent hidden state, creates `fromTo()` tweens with `start: "top 86%"`, `once: true`, and relies on `useGSAP` cleanup.

- [ ] **Step 4: Run foundation and decorative-motion tests**

Run: `npx vitest run app/hooks/use-section-reveal.test.tsx app/components/motion-screen.test.tsx app/hooks/use-decorative-motion.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/gsap-client.ts app/hooks/use-section-reveal.ts app/hooks/use-section-reveal.test.tsx app/components/motion-screen.tsx app/components/motion-screen.test.tsx
git commit -m "feat: add progressive GSAP motion foundation"
```

### Task 3: Replace Atlas Scene Observation With A Scrubbed Timeline

**Files:**
- Create: `app/hooks/use-landing-timeline.ts`
- Create: `app/hooks/use-landing-timeline.test.tsx`
- Modify: `app/components/human-atlas-scroll.tsx`
- Modify: `app/components/human-atlas-scroll.test.tsx`
- Modify: `app/components/human-atlas-glow.tsx`
- Modify: `app/components/human-atlas-glow.test.tsx`

**Interfaces:**
- Produces: `atlasSceneFromProgress(progress: number): HumanAtlasSceneId`; `useLandingTimeline(scope): HumanAtlasSceneId`; optional `activeScene` prop on `HumanAtlasScroll`.
- Consumes: canonical `humanAtlasSceneIds`, scoped `.human-atlas-*` targets, and the motion foundation.

- [ ] **Step 1: Write failing phase and controlled-state tests**

Test exact progress clamping and canonical order:

```ts
expect(atlasSceneFromProgress(-1)).toBe("breath");
expect(atlasSceneFromProgress(0.34)).toBe("strength");
expect(atlasSceneFromProgress(0.67)).toBe("sleep");
expect(atlasSceneFromProgress(1)).toBe("energy");
```

Render `HumanAtlasScroll activeScene="sleep"` and assert only sleep progress/glow is active. Add a hook harness whose mocked ScrollTrigger calls `onUpdate({ progress: 0.6 })` and `onLeaveBack()`; assert the state becomes sleep and then resets to breath.

- [ ] **Step 2: Run Atlas tests and verify RED**

Run: `npx vitest run app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.test.tsx`

Expected: FAIL because the hook and controlled prop do not exist.

- [ ] **Step 3: Implement the timeline and controlled Atlas state**

Create one scoped GSAP timeline with ScrollTrigger `scrub: 0.8`, a CSS-sticky stage, progress-driven scene state, and `onLeaveBack` reset. Keep `useActiveAtlasScene` only as the uncontrolled fallback used when `HumanAtlasScroll` is rendered outside `Landing` or GSAP is unavailable.

Add `data-strength-signal` to the existing strength paths. Animate their `strokeDashoffset` only while strength is active and only under allowed motion. Do not add boxes, labels, or geometry around the figure.

- [ ] **Step 4: Run Atlas tests and verify GREEN**

Run: `npx vitest run app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.test.tsx app/hooks/use-active-atlas-scene.test.tsx`

Expected: PASS, including the top rewind regression.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-landing-timeline.ts app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.tsx app/components/human-atlas-glow.test.tsx
git commit -m "feat: drive Human Atlas with GSAP scroll progress"
```

### Task 4: Recompose The Landing And Update Its Copy

**Files:**
- Modify: `app/components/landing.tsx`
- Modify: `app/components/landing.test.tsx`
- Modify: `app/i18n/ui-copy.ts`
- Modify: `app/i18n/ui-copy.test.ts`

**Interfaces:**
- Consumes: `useLandingTimeline`, `useSectionReveal`, and unchanged `onStart(depth)`.
- Produces: scoped `landing__atlas-experience` timeline root and `[data-reveal]` landing tail sections.

- [ ] **Step 1: Update copy and landing tests first**

Assert the new heading in both locales, the unchanged two Express CTA names/callbacks, the four scene headings, and reveal markers on conversion, depth, privacy, and urgent sections.

```ts
expect(screen.getByRole("heading", { name: "Read the signals. Not a verdict." })).toBeVisible();
expect(screen.getAllByRole("button", { name: "Start Express" })).toHaveLength(2);
expect(container.querySelectorAll("[data-reveal]")).toHaveLength(4);
```

- [ ] **Step 2: Run landing/i18n tests and verify RED**

Run: `npx vitest run app/components/landing.test.tsx app/i18n/ui-copy.test.ts`

Expected: FAIL on the old hero title and missing reveal targets.

- [ ] **Step 3: Implement the accepted composition**

Give the experience section a ref, call `useLandingTimeline`, pass its scene to `HumanAtlasScroll`, and call `useSectionReveal` on the landing root. Update only `landing.atlas.hero.title` in EN/FR. Keep both primary CTA handlers outside the decorative boundary.

- [ ] **Step 4: Run landing, page, and i18n tests**

Run: `npx vitest run app/components/landing.test.tsx app/components/human-atlas-scroll.test.tsx app/i18n/ui-copy.test.ts app/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/landing.tsx app/components/landing.test.tsx app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts
git commit -m "feat: recompose landing for cinematic Atlas story"
```

### Task 5: Extend Motion Through The In-Memory Journey

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/components/consent-screen.tsx`
- Modify: `app/components/assessment.tsx`
- Modify: `app/components/intermission.tsx`
- Modify: `app/components/results.tsx`
- Modify: `app/components/assessment.test.tsx`
- Modify: `app/components/intermission.test.tsx`
- Modify: `app/components/results.test.tsx`

**Interfaces:**
- Consumes: `MotionScreen`, `useSectionReveal`, and existing screen state/callbacks.
- Produces: stable `data-motion-screen` keys and presentation-only `[data-reveal]` targets.

- [ ] **Step 1: Write failing journey integration tests**

Assert `landing`, `consent`, `assessment`, and `results` screens render inside the matching `data-motion-screen`. Assert each question and intermission is wrapped in its own keyed motion screen, and results contain reveal targets without changing heading order or action handlers.

```ts
expect(container.querySelector('[data-motion-screen="consent"]')).toBeInTheDocument();
expect(container.querySelector('[data-motion-screen^="question-"] .question-sheet')).toBeInTheDocument();
```

- [ ] **Step 2: Run focused journey tests and verify RED**

Run: `npx vitest run app/page.test.tsx app/components/assessment.test.tsx app/components/intermission.test.tsx app/components/results.test.tsx`

Expected: FAIL because the motion wrappers/targets are absent.

- [ ] **Step 3: Add presentation-only integration**

Wrap each page-level conditional screen in `MotionScreen` keyed by screen kind. Inside `Assessment`, wrap the active question content in `MotionScreen` keyed by the question ID; inside `Intermission`, wrap the existing panel in `MotionScreen` keyed by the pillar ID. Mark result bands without moving semantic elements and scope `useSectionReveal` to the results root. Do not delay `setScreen`, `onAccept`, `onComplete`, answer changes, focus calls, or urgent branching.

- [ ] **Step 4: Run the full journey regression group**

Run: `npx vitest run app/page.test.tsx app/components/assessment.test.tsx app/components/intermission.test.tsx app/components/results.test.tsx app/components/express-results.test.tsx`

Expected: PASS with unchanged navigation and focus behavior.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx app/components/consent-screen.tsx app/components/assessment.tsx app/components/intermission.tsx app/components/results.tsx app/components/assessment.test.tsx app/components/intermission.test.tsx app/components/results.test.tsx
git commit -m "feat: carry cinematic motion through the journey"
```

### Task 6: Implement The Complete Bioluminescent CSS System

**Files:**
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: the three font variables and motion target attributes from Tasks 1-5.
- Produces: responsive dark theme for landing, consent, assessment, intermissions, results, print, focus, and reduced motion.

- [ ] **Step 1: Replace brittle CSS assertions with the new visual contract**

Assert the six palette values, Space/Geist variable usage, zero negative/viewport letter spacing, no `--font-editorial`, stable atlas geometry, dark journey surfaces, reduced-motion disabling of GSAP targets, and absence of forbidden HUD/scan selectors.

```ts
expect(css).toContain("--abyss: #041719");
expect(css).toContain("--phosphor: #55F1CA");
expect(css).not.toMatch(/letter-spacing:\s*-|font-size:[^;]*(vw|cqw)/);
expect(css).not.toMatch(/scan-frame|target-box|hud/i);
```

- [ ] **Step 2: Run CSS tests and verify RED**

Run: `npx vitest run app/globals.test.ts app/layout.test.ts`

Expected: FAIL against the paper/editorial CSS.

- [ ] **Step 3: Implement the tokens and responsive visual system**

Refactor the authored landing and journey styles around the six tokens. Remove the paper/canopy page background, clipped-corner page sections, negative tracking, serif landing role, nested visual framing, and mobile white hero panel. Keep image/glow coordinate alignment, content order, CSS-sticky fallback, print visibility, and form control geometry.

Use a solid Abyss/Depth structure, fine translucent rules, Phosphor primary actions, Current informational emphasis, and Flare only for urgent/energy contrast. At widths below 780 pixels, place hero copy in normal flow above a stable `aspect-ratio: 1672 / 941` atlas crop and shorten the scrollytelling distance. Under reduced motion, keep every scene in normal flow and remove transform/opacity animation styles.

- [ ] **Step 4: Run CSS and component regressions**

Run: `npx vitest run app/globals.test.ts app/layout.test.ts app/components/landing.test.tsx app/components/assessment.test.tsx app/components/results.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "feat: apply bioluminescent design system"
```

### Task 7: Full Verification And Visual QA

**Files:**
- Modify only if a verified defect requires a focused red-green fix.

**Interfaces:**
- Consumes: complete implementation.
- Produces: fresh release and visual evidence.

- [ ] **Step 1: Run static and behavioral release gates**

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test -- --run
npm run build
npm audit --omit=dev
git diff --check
```

Expected: every command exits 0; Vitest reports zero failures; the production audit reports zero production vulnerabilities.

- [ ] **Step 2: Start a production server on a free port**

Confirm port 4189 is free, then run the generated build with `npm start -- --hostname 127.0.0.1 --port 4189` and wait for HTTP 200. Do not use port 3000 or the existing baseline server on 3108.

- [ ] **Step 3: Verify desktop and mobile visually**

Use Playwright/Chrome at 1440x900, 1024x768, 390x844, and 320x700. Capture and inspect landing top, each Atlas phase, conversion, consent, question controls, one intermission, and results. Confirm readable French and English wrapping, visible next-section hint, atlas/glow registration, no green rectangle, no overlap, no blank canvas, no horizontal overflow, and stable focus.

- [ ] **Step 4: Verify motion and fallbacks**

Confirm scroll scrub and rewind, strength signal travel, result reveals, screen entrances, and zero console/page errors. Repeat under `prefers-reduced-motion: reduce` and verify no pin/scrub/loop while all content remains visible. Trigger image failure and confirm the static story remains usable.

- [ ] **Step 5: Verify the privacy boundary**

Confirm all requests are same-origin GETs, with no answer POST, cookie, localStorage, or sessionStorage write during landing, Express consent, questions, and results.

- [ ] **Step 6: Record final evidence and commit verified fixes**

If QA found a defect, first add a focused failing test, verify RED, fix it, rerun the affected gate, and commit only the fix. Finish with fresh `git status --short` and `git diff --check` evidence.
