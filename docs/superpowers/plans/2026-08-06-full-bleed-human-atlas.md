# Full-bleed Human Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the selected Human Atlas landing artwork into an edge-to-edge `100svh` sticky story with no side or lower bands and a continuous handoff into the four anatomical chapters.

**Architecture:** Keep the existing React component boundaries and `IntersectionObserver` scene state. Replace the framed CSS geometry with one intrinsic-ratio cover frame shared by the WebP and all SVG glows, then add a parent failure-state class so image errors collapse into normal flow. CSS-source and DOM tests lock the contracts; real-browser QA verifies computed geometry and motion.

**Tech Stack:** React 19, TypeScript 5.9, Vinext/Vite, CSS, Vitest, Testing Library, Chrome DevTools, OpenAI Sites.

## Global Constraints

- Preserve `public/media/human-atlas-hero.webp` byte-for-byte with SHA-256 `049911bc3c13c1151155d05c2449a629d801b9bfb3941c022e7b1a2af83f35e0`.
- Use one landing-only top gap of `clamp(16px, 2vw, 28px)` after the product-header divider; do not change global language controls or non-landing chrome.
- Use `--atlas-stage-height: 100svh` for the sticky stage, intro interval, and four chapter intervals.
- Keep the image and glow-set outer rectangles matched within one CSS pixel; preserve the `1672 / 941` frame and current internal SVG geometry.
- Keep desktop centred and mobile at `left: 50%` plus `translateX(-62%)` within the shared frame.
- Add no scroll listener, canvas, WebGL, video, remote media, analytics, persistence, or answer-driven visual personalization.
- Preserve the selected image, four scene meanings, both Express CTAs, EN/FR parity, reduced-motion behavior, print flow, and local-only privacy boundary.
- Keep the existing public Sites access policy unchanged.

## File Map

- `app/globals.css` owns landing spacing, full-bleed stage geometry, shared cover frame, scene surfaces, failure layout, responsive rules, reduced motion, and print overrides.
- `app/globals.test.ts` owns source-level layout, asset identity, responsive, reduced-motion, and print regression contracts.
- `app/components/human-atlas-scroll.tsx` owns the runtime image-failure state exposed as a parent modifier class.
- `app/components/human-atlas-scroll.test.tsx` owns the DOM contract for the failed normal-flow story and unchanged four-scene content.
- `docs/superpowers/specs/2026-08-06-full-bleed-human-atlas-design.md` is the approved acceptance source and is not modified during implementation.

---

### Task 1: Edge-to-edge shared Atlas frame

**Files:**
- Modify: `app/globals.test.ts:1-3,142-158`
- Modify: `app/globals.css:84-196,233-252,1016-1020`

**Interfaces:**
- Consumes: existing `.landing`, `.landing__atlas-experience`, `.human-atlas-stage`, `.human-atlas-media`, `.human-atlas-scenes`, and `.human-atlas-scene` classes.
- Produces: CSS custom property `--atlas-stage-height`, an intrinsic-ratio shared cover frame, and edge-to-edge responsive geometry used by Task 2 and browser QA.

- [ ] **Step 1: Write the failing full-bleed and asset-identity tests**

Add the crypto import and this test in `app/globals.test.ts`:

```ts
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

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
```

Extend the existing Human Atlas asset test after reading `atlasAsset`:

```ts
expect(createHash("sha256").update(atlasAsset).digest("hex")).toBe(
  "049911bc3c13c1151155d05c2449a629d801b9bfb3941c022e7b1a2af83f35e0",
);
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
npx vitest run app/globals.test.ts
```

Expected: FAIL in `fills an edge-to-edge viewport with one registered Human Atlas frame` because the current experience is capped/inset, the stage is `min(88svh, 820px)`, and the frame has no wide-viewport cover rule. The SHA-256 assertion must already pass.

- [ ] **Step 3: Implement the shared viewport geometry**

Replace the relevant landing/Atlas rules in `app/globals.css` with these contracts while retaining unchanged typography, glow, and progress declarations:

```css
.landing {
  min-height: 100dvh;
  padding: 0 0 56px;
}

.landing__atlas-experience {
  --atlas-stage-height: 100svh;
  position: relative;
  width: 100%;
  margin: clamp(16px, 2vw, 28px) 0 0;
}

.human-atlas-scroll {
  position: relative;
  min-height: calc(5 * var(--atlas-stage-height));
}

.human-atlas-stage {
  position: sticky;
  z-index: 1;
  top: 0;
  height: var(--atlas-stage-height);
  min-height: 0;
  overflow: hidden;
  border: 0;
  background: #f1eee6;
  isolation: isolate;
}

.human-atlas-media {
  position: absolute;
  top: 50%;
  bottom: auto;
  left: 50%;
  width: auto;
  height: 100%;
  aspect-ratio: 1672 / 941;
  transform: translate(-50%, -50%);
}

.human-atlas-media > img {
  object-fit: cover;
  filter: saturate(.66) brightness(.92) contrast(1.02);
}

.human-atlas-scenes {
  position: relative;
  z-index: 6;
  width: min(39%, 430px);
  margin-top: calc(-1 * var(--atlas-stage-height));
  padding-top: var(--atlas-stage-height);
  padding-left: clamp(18px, 4vw, 54px);
}

.human-atlas-scene {
  display: flex;
  align-items: center;
  min-height: var(--atlas-stage-height);
  opacity: .34;
  transform: translateY(18px);
  transition: opacity .55s ease, transform .55s ease;
}

@media (min-aspect-ratio: 1672 / 941) {
  .human-atlas-media {
    width: 100%;
    height: auto;
  }
}

@media (max-width: 780px) {
  .landing__atlas-experience { width: 100%; }
  .human-atlas-media { transform: translate(-62%, -50%); }
  .human-atlas-scenes {
    width: 100%;
    margin-top: calc(-1 * var(--atlas-stage-height));
    padding-top: var(--atlas-stage-height);
    padding-inline: 14px;
  }
  .human-atlas-scene {
    align-items: flex-end;
    min-height: var(--atlas-stage-height);
    padding-bottom: 18px;
  }
}

@media (max-width: 560px) {
  .landing { padding: 0 0 40px; }
}
```

Remove the former `width: min(1600px, calc(100% - 32px))`, `min(88svh, 820px)`, `top: 12px`, stage border, desktop frame centring rule, and mobile `calc(100% - 32px)` override that conflict with these blocks.

- [ ] **Step 4: Run the targeted tests and verify GREEN**

Run:

```bash
npx vitest run app/globals.test.ts
```

Expected: PASS, including the exact image hash, print assertions, reduced-motion assertions, and the new full-bleed source contract.

- [ ] **Step 5: Commit the full-bleed frame**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "fix: make Human Atlas fill the viewport"
```

---

### Task 2: Continuous chapter handoff and image-failure flow

**Files:**
- Modify: `app/components/human-atlas-scroll.test.tsx:188-207`
- Modify: `app/components/human-atlas-scroll.tsx:39-45`
- Modify: `app/globals.test.ts:160-199`
- Modify: `app/globals.css:188-210,1053-1078`

**Interfaces:**
- Consumes: `imageFailed: boolean`, `--atlas-stage-height`, `.human-atlas-scenes`, and the existing four ordered scene nodes.
- Produces: parent modifier `.human-atlas-scroll--failed`, zero-gap conversion handoff, unframed scene reading washes, and a collapsed normal-flow failure story.

- [ ] **Step 1: Write the failing DOM and CSS contract tests**

Extend `keeps the full explanation when the decorative image fails` in `app/components/human-atlas-scroll.test.tsx`:

```ts
expect(container.querySelector(".human-atlas-scroll")).toHaveClass(
  "human-atlas-scroll--failed",
);
```

Add this test to `app/globals.test.ts`:

```ts
test("hands the Atlas story into conversion without a framed card or failed sticky void", () => {
  const sceneCard = css.match(
    /\.human-atlas-scene__card\s*\{(?<declarations>[^}]+)\}/s,
  )?.groups?.declarations;
  const conversion = css.match(
    /\.landing__atlas-conversion\s*\{(?<declarations>[^}]+)\}/s,
  )?.groups?.declarations;
  const failedStory = css.match(
    /\.human-atlas-scroll--failed\s*\{(?<declarations>[^}]+)\}/s,
  )?.groups?.declarations;
  const failedStage = css.match(
    /\.human-atlas-scroll--failed \.human-atlas-stage\s*\{(?<declarations>[^}]+)\}/s,
  )?.groups?.declarations;
  const failedHero = css.match(
    /\.landing__atlas-experience:has\(\.human-atlas-scroll--failed\) \.landing__atlas-hero\s*\{(?<declarations>[^}]+)\}/s,
  )?.groups?.declarations;

  expect(sceneCard).toMatch(/border:\s*0/);
  expect(sceneCard).toMatch(/box-shadow:\s*none/);
  expect(sceneCard).toMatch(/linear-gradient\(90deg/);
  expect(conversion).toMatch(/margin-top:\s*0/);
  expect(failedStory).toMatch(/min-height:\s*0/);
  expect(failedStage).toMatch(/position:\s*relative/);
  expect(failedStage).toMatch(/height:\s*auto/);
  expect(failedStage).toMatch(/min-height:\s*240px/);
  expect(failedHero).toMatch(/position:\s*relative/);
  expect(failedHero).toMatch(/top:\s*auto/);
  expect(failedHero).toMatch(/left:\s*auto/);
  expect(css).toMatch(
    /\.human-atlas-scroll--failed \.human-atlas-scenes\s*\{[^}]*margin:\s*0[^}]*padding:/s,
  );
  expect(css).toMatch(
    /\.human-atlas-scroll--failed \.human-atlas-scene\s*\{[^}]*min-height:\s*0[^}]*opacity:\s*1[^}]*transform:\s*none/s,
  );
});
```

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
npx vitest run app/components/human-atlas-scroll.test.tsx app/globals.test.ts
```

Expected: FAIL because the parent failure modifier does not exist, cards retain a border/shadow, conversion retains a large margin, and failure keeps the sticky geometry.

- [ ] **Step 3: Expose the failure modifier in React**

Change the opening story element in `app/components/human-atlas-scroll.tsx` to:

```tsx
<section
  aria-label={t("landing.atlas.story.aria")}
  className={`human-atlas-scroll${imageFailed ? " human-atlas-scroll--failed" : ""}`}
  data-active-scene={activeScene}
>
```

- [ ] **Step 4: Implement the continuous and failed-state CSS**

Use these declarations in `app/globals.css`:

```css
.human-atlas-scene__card {
  padding: 22px 32px 24px 24px;
  border: 0;
  background: linear-gradient(90deg, rgb(247 245 238 / 96%) 0%, rgb(247 245 238 / 84%) 68%, transparent 100%);
  box-shadow: none;
  backdrop-filter: none;
}

.landing__atlas-conversion {
  margin-top: 0;
  padding: clamp(28px, 5vw, 62px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.human-atlas-scroll--failed { min-height: 0; }

.landing__atlas-experience:has(.human-atlas-scroll--failed) .landing__atlas-hero {
  position: relative;
  top: auto;
  left: auto;
  width: min(720px, calc(100% - 32px));
  margin: 0 auto 24px;
}

.human-atlas-scroll--failed .human-atlas-stage {
  position: relative;
  top: auto;
  height: auto;
  min-height: 240px;
  border: 1px solid var(--line);
  background: #f1eee6;
}

.human-atlas-scroll--failed .human-atlas-scenes {
  width: 100%;
  margin: 0;
  padding: 24px clamp(16px, 4vw, 54px);
}

.human-atlas-scroll--failed .human-atlas-scene {
  min-height: 0;
  padding: 12px 0;
  opacity: 1;
  transform: none;
}
```

Keep `.human-atlas-stage--failed` as the centred fallback-text layout and keep `.human-atlas-stage--failed .human-atlas-progress { display: none; }`. Preserve the existing reduced-motion and print overrides after these base rules so they continue to win where needed.

- [ ] **Step 5: Run targeted and landing regression tests**

Run:

```bash
npx vitest run app/components/human-atlas-scroll.test.tsx app/components/landing.test.tsx app/globals.test.ts
```

Expected: PASS with four ordered chapters, unchanged CTA behavior, the failed normal-flow modifier, full-bleed CSS contracts, reduced motion, and print.

- [ ] **Step 6: Commit the story handoff**

```bash
git add app/components/human-atlas-scroll.tsx app/components/human-atlas-scroll.test.tsx app/globals.css app/globals.test.ts
git commit -m "fix: smooth the Human Atlas story handoff"
```

---

### Task 3: Release verification and production update

**Files:**
- Verify only: `app/**`, `public/media/human-atlas-hero.webp`, `.openai/hosting.json`

**Interfaces:**
- Consumes: the exact branch HEAD produced by Tasks 1–2.
- Produces: verified `main`, a saved Sites version from the same pushed commit, and an updated production deployment at the existing URL.

- [ ] **Step 1: Run all local release gates**

Run independently and require exit code `0` for every command:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
git status --short
```

Expected: TypeScript, ESLint, all Vitest files, the five Vinext build stages, audit, and diff checks pass. `git status --short` is empty and the build emits only the already-known advisory chunk-size warning.

- [ ] **Step 2: Run production browser geometry QA**

Start the built app with:

```bash
PORT=4173 npm start
```

Use Chrome DevTools on `http://localhost:4173/` and inspect `2048×1100` EN, `1365×900` EN/FR, `390×844` EN/FR, and `320×700` EN/FR. For every viewport record:

- `.human-atlas-stage.left === 0` and `.right === window.innerWidth` within one CSS pixel;
- initial stage top equals the product-header divider bottom plus the computed gap;
- initial stage bottom is below the viewport bottom;
- sticky stage top is `0` and height matches `window.visualViewport?.height ?? window.innerHeight` within one CSS pixel;
- image and `.human-atlas-glow-set` rectangles match within one CSS pixel and cover all stage edges;
- `document.documentElement.scrollWidth === window.innerWidth`;
- intro, Breath, Strength, Sleep, Energy, and conversion appear without a blank interval;
- both Express CTAs still focus the consent heading;
- reduced-motion is non-sticky and print remains non-overlapping.

If any assertion fails, return to the relevant Task 1 or Task 2 RED test before modifying production code.

- [ ] **Step 3: Measure motion and loading budgets**

At `1365×900`, run three Slow 4G / CPU 4× traces. Require median LCP `≤ 1.1s`, CLS `≤ 0.02`, and no chapter-transition long task above `50ms`. Confirm the network contains only same-origin GET requests with no video, analytics, answer upload, cookies, or remote media.

- [ ] **Step 4: Review, merge, and deploy the exact verified source**

Request a spec-compliance review and a code-quality review against `docs/superpowers/specs/2026-08-06-full-bleed-human-atlas-design.md`. After both pass, fast-forward `main` to the verified branch HEAD, remove the feature branch/worktree if one exists, and rerun the targeted CSS/Atlas tests on `main`.

Use the existing `.openai/hosting.json` project ID and the Sites hosting workflow: push the exact `main` HEAD with a short-lived per-command source credential, package the already-successful `dist/`, save one version with that commit SHA, deploy it under the unchanged public access policy, and poll until `succeeded`.

- [ ] **Step 5: Confirm the live URL**

Open the exact deployed URL returned by Sites and confirm the landing responds. Report the production URL and the verified full-bleed behavior; do not expose credentials, project identifiers, archive paths, or deployment identifiers.
