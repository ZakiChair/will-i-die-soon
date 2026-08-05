# Human Atlas Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing's canopy hero with the approved Express-first Human Atlas scrollytelling experience, using the exact selected artwork and four soft anatomical glow states without changing questionnaire behavior.

**Architecture:** Keep `Landing` responsible for page hierarchy and depth callbacks, move the scroll story into a focused `HumanAtlasScroll` client component, and isolate scroll observation, SVG glow rendering, and decorative error recovery behind small typed units. The nine-question Express contract remains in `questionnaire.ts`; the landing only references its stable IDs and never receives profile or answer state.

**Tech Stack:** Next 16.2.12, React 19.2.8, TypeScript 5.9.3, Vitest 4.1.0, Testing Library, CSS, inline SVG, `IntersectionObserver`, `next/font/google`, local WebP media, Vinext/Vite.

## Global Constraints

- Use the exact selected 1672 × 941 PNG whose SHA-256 is `e04f29b719ef94f6f1a3644ac72506057819b73694208f1026473f4d8f553886`; never use the later clothed variant.
- Preserve Express as exactly nine adult-only questions: reported VO₂ max; squat and deadlift one-repetition maxima; height and weight; usual sleep duration and waking refreshment; fruit/vegetable portions and ultra-processed main-meal frequency.
- Preserve the consent boundary, question definitions, queue behavior, scoring, summaries, results, privacy behavior, medical boundary, and Quick/Detailed/Deep canonical values.
- The landing receives no profile or answers and performs no body personalization, health inference, organ measurement, diagnosis, prediction, global scoring, storage, analytics, cookie write, or answer request.
- Add no runtime dependency, animation library, canvas, WebGL, pointer-following light, remote media, or per-pixel `scroll` listener.
- Use the original image as a local optimized WebP, four inline noninteractive `aria-hidden` SVG glow maps, CSS blending, and `IntersectionObserver` with a centre viewport band.
- Glow must be volumetric and soft: no boxes, hard selection outlines, organ callouts, anatomical labels, arrows, or interactive hotspots.
- Both Express CTAs must remain outside the decorative error boundary and call `onStart("express")`; Quick, Detailed, and Deep remain secondary and call their unchanged values.
- Use `Newsreader` only for landing display copy, `Manrope` for functional/body copy, and `IBM Plex Mono` for data labels; retain Bricolage Grotesque on non-landing screens.
- Respect `prefers-reduced-motion`, hidden documents, image failure, missing `IntersectionObserver`, print, keyboard focus, 44 × 44 CSS-pixel targets, EN/FR parity, and 320 CSS-pixel layouts.
- Remove the landing video code and public landing MP4. Keep the existing Cardio intermission video behavior unchanged.
- Production hero source: 1672 × 941 WebP, width no greater than 1920 pixels, target ≤ 450 KiB and hard cap ≤ 650 KiB.
- Follow red-green-refactor for every behavior change. Run a failing test before each production implementation.

## Design calibration

**Subject and job:** a private adult health-context questionnaire; the page's single primary job is to start Express through the existing consent route.

**Tokens:** paper `#F4F7F5`, ink `#102A2A`, deep water `#123E46`, electric blue `#435CFF`, living coral `#FF6F61`, signal amber `#F4C95D`. `Newsreader` supplies editorial anatomy-atlas headlines; Manrope stays plain and readable; IBM Plex Mono carries units, scene numbers, duration, and system labels.

**Layout:** the generated plate is the page, not a card inside the page. Its left negative space holds the hero and then the active scene card while the body remains fixed on the right.

```text
┌ wordmark ───────────────────────────── prototype ┐
│  HUMAN ATLAS / 9 QUESTIONS         fixed plate   │
│  Your body is a system.             ╭ figure ╮    │
│  [Start Express]                     │  glow  │    │
│                                      ╰────────╯    │
│  ┌ active scene copy ┐               same figure   │
│  └───────────────────┘               next glow     │
└────────────────────────────────────────────────────┘
       closing Express CTA
       Quick / Detailed / Deep
       privacy boundary
```

**Signature and risk:** the memorable element is the exact registration between the paper figure and four luminous SVG systems. The aesthetic risk is letting one quiet, nearly full-viewport scientific plate dominate the page; everything else stays square-edged, restrained, and typographically disciplined.

**Self-critique before build:** paper plus serif could collapse into a generic editorial template. Counter that default with the source artwork's registration marks, data-like mono labels, exact anatomical light geometry, asymmetric negative space, and one continuous sticky object. Do not add decorative pills, generic gradient blobs, floating glass cards, excessive rounding, or unrelated motion.

## File map

- Create `app/data/human-atlas.ts`: closed scene IDs, ordered metadata, typed copy keys, and Express input mapping.
- Create `app/data/human-atlas.test.ts`: scene order, copy references, and exact nine-input coverage.
- Modify `app/i18n/ui-copy.ts`: bilingual hero, scene, conversion, fallback, and secondary-section copy.
- Modify `app/i18n/ui-copy.test.ts`: Human Atlas key completeness and safety-language guards.
- Create `app/hooks/use-active-atlas-scene.ts`: observer lifecycle and safe active-scene selection.
- Create `app/hooks/use-active-atlas-scene.test.tsx`: centre-band observation, winning entry, fallback, and cleanup.
- Create `app/components/human-atlas-glow.tsx`: pure four-layer inline SVG renderer.
- Create `app/components/human-atlas-glow.test.tsx`: decorative, focus, mount, and active-state contract.
- Create `app/components/decorative-section-boundary.tsx`: narrow render-error fallback.
- Create `app/components/decorative-section-boundary.test.tsx`: fallback and sibling-action survival.
- Create `app/components/human-atlas-scroll.tsx`: sticky stage, local image, progress, normal-flow scene copy, failure state, and static fallback.
- Create `app/components/human-atlas-scroll.test.tsx`: image, copy order, observer activation, motion lifecycle, and image/no-observer fallback.
- Modify `app/components/landing.tsx`: Express-first page composition and three secondary depths.
- Rewrite `app/components/landing.test.tsx`: CTA, bilingual, hierarchy, local-media, boundary-placement, and no-video behavior.
- Modify `app/components/consent-screen.tsx` and `app/page.test.tsx`: restore focus to the consent heading after either Express CTA replaces the landing.
- Modify `app/layout.tsx` and `app/layout.test.ts`: self-hosted-at-build Newsreader variable and landing-only use contract.
- Modify `app/globals.css` and `app/globals.test.ts`: Human Atlas layout, blending, responsive, reduced-motion, print, and removal of obsolete landing-video rules.
- Create `public/media/human-atlas-hero.webp`: optimized exact artwork.
- Delete `public/media/canopy-loop.mp4`: obsolete landing video payload.
- Modify `README.md` and `docs/privacy-and-release.md`: Human Atlas provenance and current local implementation state.

---

### Task 1: Lock the Human Atlas data and bilingual copy contract

**Files:**
- Create: `app/data/human-atlas.test.ts`
- Create: `app/data/human-atlas.ts`
- Modify: `app/i18n/ui-copy.test.ts`
- Modify: `app/i18n/ui-copy.ts`

**Interfaces:**
- Consumes: `UiCopyKey` from `app/i18n/ui-copy.ts`; `EXPRESS_QUESTION_IDS` from `app/lib/questionnaire.ts` in tests only.
- Produces: `HumanAtlasSceneId`, `HumanAtlasScene`, `humanAtlasScenes`, `humanAtlasBodyContextQuestionIds`, `humanAtlasSceneIds`, and `isHumanAtlasSceneId`.

- [ ] **Step 1: Write the failing scene-contract tests**

Create `app/data/human-atlas.test.ts` with behavior assertions independent of the implementation:

```ts
import { describe, expect, test } from "vitest";

import { uiCopy } from "../i18n/ui-copy";
import { EXPRESS_QUESTION_IDS } from "../lib/questionnaire";
import {
  humanAtlasBodyContextQuestionIds,
  humanAtlasSceneIds,
  humanAtlasScenes,
  isHumanAtlasSceneId,
} from "./human-atlas";

describe("Human Atlas landing contract", () => {
  test("keeps four ordered visual chapters", () => {
    expect(humanAtlasSceneIds).toEqual([
      "breath",
      "strength",
      "sleep",
      "energy",
    ]);
    expect(humanAtlasScenes.map(({ id }) => id)).toEqual(humanAtlasSceneIds);
    expect(isHumanAtlasSceneId("sleep")).toBe(true);
    expect(isHumanAtlasSceneId("body-context")).toBe(false);
  });

  test("covers every Express input exactly once without inventing a fifth glow", () => {
    const mapped = [
      ...humanAtlasScenes.flatMap(({ questionIds }) => questionIds),
      ...humanAtlasBodyContextQuestionIds,
    ];

    expect(mapped).toHaveLength(EXPRESS_QUESTION_IDS.length);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...mapped].sort()).toEqual([...EXPRESS_QUESTION_IDS].sort());
    expect(humanAtlasScenes).toHaveLength(4);
  });

  test("points every scene at complete bilingual UI copy", () => {
    for (const scene of humanAtlasScenes) {
      for (const key of [
        scene.eyebrowKey,
        scene.titleKey,
        scene.descriptionKey,
        scene.inputLabelKey,
      ]) {
        expect(uiCopy.en[key].trim(), `${scene.id} English ${key}`).not.toBe("");
        expect(uiCopy.fr[key].trim(), `${scene.id} French ${key}`).not.toBe("");
      }
    }
  });
});
```

Extend `app/i18n/ui-copy.test.ts` with a safety test that iterates only the new Human Atlas keys and rejects direct personal measurement/prediction language:

```ts
test("keeps Human Atlas copy descriptive rather than diagnostic or personalized", () => {
  const atlasEntries = Object.entries(uiCopy.en).filter(([key]) =>
    key.startsWith("landing.atlas."),
  );

  expect(atlasEntries.length).toBeGreaterThanOrEqual(26);
  for (const [key, message] of atlasEntries) {
    expect(message, key).not.toMatch(
      /we (?:diagnose|predict)|your diagnosis|predict(?:s|ing)? (?:your|when)|measures? your (?:brain|nervous system|digestion|energy)|medical scan/i,
    );
  }
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- app/data/human-atlas.test.ts app/i18n/ui-copy.test.ts
```

Expected: FAIL because `app/data/human-atlas.ts` and the `landing.atlas.*` copy keys do not exist.

- [ ] **Step 3: Implement the closed scene metadata**

Create `app/data/human-atlas.ts`:

```ts
import type { UiCopyKey } from "../i18n/ui-copy";
import type { EXPRESS_QUESTION_IDS } from "../lib/questionnaire";

type ExpressQuestionId = (typeof EXPRESS_QUESTION_IDS)[number];

export const humanAtlasSceneIds = [
  "breath",
  "strength",
  "sleep",
  "energy",
] as const;

export type HumanAtlasSceneId = (typeof humanAtlasSceneIds)[number];

export type HumanAtlasScene = Readonly<{
  id: HumanAtlasSceneId;
  eyebrowKey: UiCopyKey;
  titleKey: UiCopyKey;
  descriptionKey: UiCopyKey;
  inputLabelKey: UiCopyKey;
  questionIds: readonly ExpressQuestionId[];
}>;

export const humanAtlasScenes = [
  {
    id: "breath",
    eyebrowKey: "landing.atlas.breath.eyebrow",
    titleKey: "landing.atlas.breath.title",
    descriptionKey: "landing.atlas.breath.description",
    inputLabelKey: "landing.atlas.breath.input",
    questionIds: ["reported_vo2_max_ml_kg_min"],
  },
  {
    id: "strength",
    eyebrowKey: "landing.atlas.strength.eyebrow",
    titleKey: "landing.atlas.strength.title",
    descriptionKey: "landing.atlas.strength.description",
    inputLabelKey: "landing.atlas.strength.input",
    questionIds: ["squat_one_rep_max_kg", "deadlift_one_rep_max_kg"],
  },
  {
    id: "sleep",
    eyebrowKey: "landing.atlas.sleep.eyebrow",
    titleKey: "landing.atlas.sleep.title",
    descriptionKey: "landing.atlas.sleep.description",
    inputLabelKey: "landing.atlas.sleep.input",
    questionIds: ["usual_sleep_hours", "sleep_refreshed"],
  },
  {
    id: "energy",
    eyebrowKey: "landing.atlas.energy.eyebrow",
    titleKey: "landing.atlas.energy.title",
    descriptionKey: "landing.atlas.energy.description",
    inputLabelKey: "landing.atlas.energy.input",
    questionIds: ["plant_food_frequency", "diet_ultra_processed"],
  },
] as const satisfies readonly HumanAtlasScene[];

export const humanAtlasBodyContextQuestionIds = [
  "height_cm",
  "weight_kg",
] as const;

export function isHumanAtlasSceneId(value: unknown): value is HumanAtlasSceneId {
  return humanAtlasSceneIds.some((sceneId) => sceneId === value);
}
```

Add these keys to both `en` and `fr` in `app/i18n/ui-copy.ts`, preserving the existing compile-time `keyof typeof en` parity check:

```text
landing.atlas.hero.eyebrow
landing.atlas.hero.title
landing.atlas.hero.body
landing.atlas.hero.cta
landing.atlas.hero.scroll
landing.atlas.story.aria
landing.atlas.breath.eyebrow/title/description/input
landing.atlas.strength.eyebrow/title/description/input
landing.atlas.sleep.eyebrow/title/description/input
landing.atlas.energy.eyebrow/title/description/input
landing.atlas.conversion.eyebrow/title/body/cta
landing.atlas.other.eyebrow/title
landing.atlas.imageFailure
```

Use this exact copy table so the visual metaphor and collected inputs cannot drift:

| Key suffix | English | French |
|---|---|---|
| `hero.eyebrow` | `Human Atlas · 9 questions · adults 18+ · under one minute` | `Human Atlas · 9 questions · adultes 18+ · moins d'une minute` |
| `hero.title` | `Your body is a system.` | `Votre corps est un système.` |
| `hero.body` | `Breath, strength, sleep, and energy: four short views of what helps you perform and recover.` | `Souffle, force, sommeil et énergie : quatre regards courts sur ce qui vous fait avancer et récupérer.` |
| `hero.cta` | `Start Express` | `Commencer Express` |
| `hero.scroll` | `Scroll to explore four anatomical metaphors.` | `Faites défiler pour explorer quatre métaphores anatomiques.` |
| `story.aria` | `Four-part Human Atlas story` | `Récit Human Atlas en quatre parties` |
| `breath.eyebrow` | `01 · Breath` | `01 · Souffle` |
| `breath.title` | `Lungs and heart, one circuit.` | `Poumons et cœur, un même circuit.` |
| `breath.description` | `The lungs take in oxygen and the heart circulates it. Your reported VO₂ max provides a cardiorespiratory-capacity reference point.` | `Les poumons captent l'oxygène, le cœur le fait circuler. Votre VO₂ max déclarée apporte un repère de capacité cardio-respiratoire.` |
| `breath.input` | `Reported input · measured or device-estimated VO₂ max · ml/kg/min` | `Donnée déclarée · VO₂ max mesurée ou estimée par un appareil · ml/kg/min` |
| `strength.eyebrow` | `02 · Strength` | `02 · Force` |
| `strength.title` | `The signal travels through the whole body.` | `Le signal traverse tout le corps.` |
| `strength.description` | `The brain, spinal cord, and nerves coordinate effort. Your already-completed squat and deadlift provide a relative-strength reference; they do not measure the nervous system.` | `Le cerveau, la moelle et les nerfs coordonnent l'effort. Vos meilleurs squat et soulevé de terre déjà réalisés donnent un repère de force relative ; ils ne mesurent pas le système nerveux.` |
| `strength.input` | `Reported inputs · existing squat and deadlift 1RM · interpreted against body weight` | `Données déclarées · max existants au squat et au soulevé de terre · rapportés au poids` |
| `sleep.eyebrow` | `03 · Sleep` | `03 · Sommeil` |
| `sleep.title` | `The brain sets the tempo.` | `Le cerveau donne le tempo.` |
| `sleep.description` | `The brain contributes to sleep cycles, alertness, and recovery. Your answers describe only two aspects: usual duration and how refreshed you feel on waking.` | `Le cerveau participe aux cycles, à la vigilance et à la récupération. Vos réponses décrivent seulement deux aspects : durée habituelle et sensation de récupération au réveil.` |
| `sleep.input` | `Reported inputs · usual hours · refreshed within one hour of waking` | `Données déclarées · durée habituelle · récupération ressentie dans l'heure suivant le réveil` |
| `energy.eyebrow` | `04 · Energy` | `04 · Énergie` |
| `energy.title` | `The digestive core lights up.` | `Le noyau digestif s'illumine.` |
| `energy.description` | `The stomach and intestines take part in digestion and nutrient absorption. This conceptual light does not measure digestion or energy; two food habits add context.` | `L'estomac et les intestins participent à la digestion et à l'absorption des nutriments. Cette lumière conceptuelle ne mesure ni digestion ni énergie ; deux habitudes alimentaires apportent du contexte.` |
| `energy.input` | `Reported inputs · daily fruit and vegetable portions · ultra-processed foods as the main meal` | `Données déclarées · portions quotidiennes de fruits et légumes · aliments ultra-transformés comme repas principal` |
| `conversion.eyebrow` | `Express · private and local` | `Express · privé et local` |
| `conversion.title` | `Nine answers. Four clear reference points.` | `Neuf réponses. Quatre repères clairs.` |
| `conversion.body` | `No diagnosis, prediction, global score, or ranking—only the inputs you report and their limits.` | `Aucun diagnostic, aucune prédiction, aucun score global ni classement — seulement vos données déclarées et leurs limites.` |
| `conversion.cta` | `Start Express` | `Commencer Express` |
| `other.eyebrow` | `Other explorations` | `Autres explorations` |
| `other.title` | `Go further when you want more context.` | `Allez plus loin lorsque vous souhaitez davantage de contexte.` |
| `imageFailure` | `The atlas image is unavailable; the four-part explanation remains below.` | `L'image de l'atlas est indisponible ; l'explication en quatre parties reste disponible ci-dessous.` |

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- app/data/human-atlas.test.ts app/i18n/ui-copy.test.ts app/lib/questionnaire.test.ts
```

Expected: PASS, including the existing exact nine-question Express guard.

- [ ] **Step 5: Refactor and commit**

Keep scene order in one array, avoid a second duplicated mapping, rerun Step 4, then commit:

```bash
git add app/data/human-atlas.ts app/data/human-atlas.test.ts app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts
git commit -m "feat: define Human Atlas landing story"
```

---

### Task 2: Build the observer, glow, and decorative failure primitives

**Files:**
- Create: `app/hooks/use-active-atlas-scene.test.tsx`
- Create: `app/hooks/use-active-atlas-scene.ts`
- Create: `app/components/human-atlas-glow.test.tsx`
- Create: `app/components/human-atlas-glow.tsx`
- Create: `app/components/decorative-section-boundary.test.tsx`
- Create: `app/components/decorative-section-boundary.tsx`

**Interfaces:**
- Consumes: `HumanAtlasSceneId`, `humanAtlasSceneIds`, and `isHumanAtlasSceneId` from Task 1.
- Produces: `HumanAtlasSceneElements`, `useActiveAtlasScene(ref)`, `<HumanAtlasGlow activeScene motionAllowed />`, and `<DecorativeSectionBoundary fallback>`.

- [ ] **Step 1: Write failing observer lifecycle tests**

In `app/hooks/use-active-atlas-scene.test.tsx`, install a complete `IntersectionObserver` fake that records `options`, observed nodes, and `disconnect`. Render a probe with four real `<section data-atlas-scene>` nodes assigned to one ref. Assert these user-visible/state contracts:

```ts
expect(screen.getByRole("status")).toHaveTextContent("breath");
expect(observerOptions).toEqual({
  root: null,
  rootMargin: "-38% 0px -42% 0px",
  threshold: [0, 0.15, 0.35, 0.6],
});

setNodeRect("strength", { top: 260, height: 240 });
setNodeRect("sleep", { top: 390, height: 240 });
act(() => emit([
  entryFor("strength", true, 0.6),
  entryFor("sleep", true, 0.6),
]));
expect(screen.getByRole("status")).toHaveTextContent("strength");

setNodeRect("strength", { top: 380, height: 240 });
setNodeRect("energy", { top: 700, height: 240 });
act(() => emit([entryFor("energy", true, 0.15)]));
expect(screen.getByRole("status")).toHaveTextContent("strength");
```

Add separate tests proving:

- an unknown `data-atlas-scene` value cannot replace `breath`;
- missing `IntersectionObserver` retains `breath` without throwing;
- simultaneous entries select the section whose centre is closest to the observer root centre, then use canonical scene order as the exact-distance tie-break;
- when a later callback contains only a newly crossed threshold, a previously intersecting scene remains eligible and wins if its current DOM centre is still closer;
- unmount calls `disconnect()`;
- rendering the hook never registers a `scroll` event listener.

- [ ] **Step 2: Run the observer test and verify RED**

Run:

```bash
npm test -- app/hooks/use-active-atlas-scene.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement safe centre-band activation**

Create `app/hooks/use-active-atlas-scene.ts` with this public shape:

```ts
"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  humanAtlasSceneIds,
  isHumanAtlasSceneId,
  type HumanAtlasSceneId,
} from "../data/human-atlas";

export type HumanAtlasSceneElements = Partial<
  Record<HumanAtlasSceneId, HTMLElement | null>
>;

export function useActiveAtlasScene(
  sceneElements: RefObject<HumanAtlasSceneElements>,
): HumanAtlasSceneId {
  const [activeScene, setActiveScene] = useState<HumanAtlasSceneId>("breath");

  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;

    const nodes = humanAtlasSceneIds
      .map((sceneId) => sceneElements.current[sceneId])
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    if (nodes.length === 0) return;

    const intersecting = new Map<HTMLElement, boolean>(
      nodes.map((node) => [node, false]),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        try {
          for (const entry of entries) {
            if (entry.target instanceof HTMLElement && intersecting.has(entry.target)) {
              intersecting.set(entry.target, entry.isIntersecting);
            }
          }
          const rootCentre = entries[0]?.rootBounds
            ? entries[0].rootBounds.top + entries[0].rootBounds.height / 2
            : window.innerHeight / 2;
          const visible = nodes
            .filter((node) => intersecting.get(node))
            .sort((left, right) => {
              const leftRect = left.getBoundingClientRect();
              const rightRect = right.getBoundingClientRect();
              const leftCentre = leftRect.top + leftRect.height / 2;
              const rightCentre = rightRect.top + rightRect.height / 2;
              const byDistance = Math.abs(leftCentre - rootCentre) - Math.abs(rightCentre - rootCentre);
              if (byDistance !== 0) return byDistance;
              const leftScene = left.getAttribute("data-atlas-scene");
              const rightScene = right.getAttribute("data-atlas-scene");
              return humanAtlasSceneIds.indexOf(leftScene as HumanAtlasSceneId)
                - humanAtlasSceneIds.indexOf(rightScene as HumanAtlasSceneId);
            })[0];
          const candidate = visible?.getAttribute("data-atlas-scene");
          if (isHumanAtlasSceneId(candidate)) setActiveScene(candidate);
        } catch {
          setActiveScene("breath");
        }
      },
      {
        root: null,
        rootMargin: "-38% 0px -42% 0px",
        threshold: [0, 0.15, 0.35, 0.6],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sceneElements]);

  return activeScene;
}
```

- [ ] **Step 4: Run the observer test and verify GREEN**

Run `npm test -- app/hooks/use-active-atlas-scene.test.tsx` and expect PASS.

- [ ] **Step 5: Write failing SVG and boundary tests**

Create `app/components/human-atlas-glow.test.tsx` and assert:

```ts
const { container, rerender } = render(
  <HumanAtlasGlow activeScene="breath" motionAllowed />,
);
const layers = container.querySelectorAll("svg[data-atlas-glow]");
expect(layers).toHaveLength(4);
expect([...layers].map((layer) => layer.getAttribute("data-atlas-glow"))).toEqual([
  "breath",
  "strength",
  "sleep",
  "energy",
]);
expect(container.querySelectorAll("svg[aria-hidden='true'][focusable='false']"))
  .toHaveLength(4);
expect(container.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
expect(container.querySelector("[data-atlas-glow='breath']")).toHaveAttribute(
  "data-active",
  "true",
);

rerender(<HumanAtlasGlow activeScene="sleep" motionAllowed={false} />);
expect(container.querySelector("[data-atlas-glow='sleep']")).toHaveAttribute(
  "data-active",
  "true",
);
expect(container.firstElementChild).toHaveAttribute("data-motion", "paused");
```

Create `app/components/decorative-section-boundary.test.tsx`. Render an always-throwing child inside the boundary and a real button as its sibling. Silence React's expected test error with a scoped `console.error` spy, then assert the fallback and sibling button both remain visible.

- [ ] **Step 6: Run the component tests and verify RED**

Run:

```bash
npm test -- app/components/human-atlas-glow.test.tsx app/components/decorative-section-boundary.test.tsx
```

Expected: FAIL because both components are missing.

- [ ] **Step 7: Implement all four exact glow layers**

Create `app/components/human-atlas-glow.tsx`. Render a wrapper carrying `data-motion="running|paused"`, then mount four SVGs permanently in `humanAtlasSceneIds` order. Each SVG uses:

```tsx
<svg
  aria-hidden="true"
  className={`human-atlas-glow human-atlas-glow--${sceneId}`}
  data-active={activeScene === sceneId ? "true" : "false"}
  data-atlas-glow={sceneId}
  focusable="false"
  preserveAspectRatio="xMidYMid slice"
  viewBox="0 0 1000 563"
>
  {layer}
</svg>
```

Port the accepted geometry verbatim from `/Users/zakichair/will-i-die-soon/.superpowers/brainstorm/38864-1785912637/content/human-atlas-original-image-glow-v4.html` (the validated design artifact lives in the main checkout's ignored workspace, not in a linked worktree):

- breath: lung ellipses centred at `(672,179)` and `(719,179)`, heart at `(697,213)`, cyan radial light plus coral centre;
- strength: centre line from head through `(696,390)`, bilateral paths to arms and legs, broad blur plus fine amber/coral luminous core;
- sleep: brain ellipses centred at `(696,67)`, restrained internal neural strokes, indigo/cyan halo;
- energy: abdominal ellipses centred at `(696,281)`, two abstract digestive paths, amber/coral diffusion.

Prefix every SVG gradient/filter ID with its scene name so React can mount all four without URL collisions. Do not render text, labels, links, buttons, foreign objects, event handlers, or hard anatomical outlines.

- [ ] **Step 8: Implement the narrow error boundary**

Create `app/components/decorative-section-boundary.tsx` as a class error boundary because React render errors cannot be caught by a function component:

```tsx
"use client";

import { Component, type ReactNode } from "react";

type Props = Readonly<{ children: ReactNode; fallback: ReactNode }>;
type State = Readonly<{ failed: boolean }>;

export class DecorativeSectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
```

- [ ] **Step 9: Run all Task 2 tests and verify GREEN**

Run:

```bash
npm test -- app/hooks/use-active-atlas-scene.test.tsx app/components/human-atlas-glow.test.tsx app/components/decorative-section-boundary.test.tsx
```

Expected: PASS with no uncontrolled React errors or cleanup warnings.

- [ ] **Step 10: Refactor and commit**

Keep SVG geometry pure and state-free, rerun Step 9, then commit:

```bash
git add app/hooks/use-active-atlas-scene.ts app/hooks/use-active-atlas-scene.test.tsx app/components/human-atlas-glow.tsx app/components/human-atlas-glow.test.tsx app/components/decorative-section-boundary.tsx app/components/decorative-section-boundary.test.tsx
git commit -m "feat: add Human Atlas interaction primitives"
```

---

### Task 3: Build the resilient sticky story component

**Files:**
- Create: `app/components/human-atlas-scroll.test.tsx`
- Create: `app/components/human-atlas-scroll.tsx`

**Interfaces:**
- Consumes: `humanAtlasScenes`, `HumanAtlasSceneElements`, `useActiveAtlasScene`, `useDecorativeMotion`, `HumanAtlasGlow`, and `useI18n`.
- Produces: `<HumanAtlasScroll />` and `<HumanAtlasStaticStory />`; neither accepts answers, profile, depth, or CTA callbacks.

- [ ] **Step 1: Write failing normal-flow and media tests**

Create `app/components/human-atlas-scroll.test.tsx` with the existing `I18nProvider` render wrapper and motion-query helper. Assert:

```ts
const { container } = render(<HumanAtlasScroll />);

expect(screen.getAllByRole("heading", { level: 3 }).map(({ textContent }) => textContent))
  .toEqual([
    "Lungs and heart, one circuit.",
    "The signal travels through the whole body.",
    "The brain sets the tempo.",
    "The digestive core lights up.",
  ]);

const image = container.querySelector<HTMLImageElement>(".human-atlas-stage img");
expect(image?.getAttribute("src")).toContain("human-atlas-hero.webp");
expect(image).toHaveAttribute("alt", "");
expect(image).toHaveAttribute("aria-hidden", "true");
expect(image).toHaveAttribute("loading", "eager");
expect(image).toHaveAttribute("fetchpriority", "high");
expect(image).toHaveAttribute("width", "1672");
expect(image).toHaveAttribute("height", "941");
expect(container.querySelector("video, canvas")).not.toBeInTheDocument();
expect(container.querySelectorAll("svg[data-atlas-glow]")).toHaveLength(4);
```

Add tests for:

- mocked observer entry moves `data-active-scene` from `breath` to `strength`, `sleep`, and `energy` without changing any external app state;
- reduced motion and `document.hidden` switch the glow wrapper's `data-motion` to `paused` while all four scene descriptions remain visible;
- `fireEvent.error(image)` removes all glow SVGs, shows the localized non-alert image fallback, and retains all four descriptions;
- with `IntersectionObserver` absent, breath is the static active scene and all descriptions remain in source order;
- `HumanAtlasStaticStory` renders all four headings and descriptions with no sticky stage or interactive element;
- switching the provider to French replaces every scene heading and input label without English leakage.

- [ ] **Step 2: Run the story tests and verify RED**

Run:

```bash
npm test -- app/components/human-atlas-scroll.test.tsx
```

Expected: FAIL because the story component does not exist.

- [ ] **Step 3: Implement the sticky story structure**

Create `app/components/human-atlas-scroll.tsx` with this structure:

```tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { humanAtlasScenes } from "../data/human-atlas";
import { useActiveAtlasScene, type HumanAtlasSceneElements } from "../hooks/use-active-atlas-scene";
import { useDecorativeMotion } from "../hooks/use-decorative-motion";
import { useI18n } from "../i18n/context";
import { HumanAtlasGlow } from "./human-atlas-glow";

export function HumanAtlasStaticStory() {
  const { t } = useI18n();
  return (
    <section className="human-atlas-static" aria-label={t("landing.atlas.story.aria")}>
      {humanAtlasScenes.map((scene) => (
        <article key={scene.id}>
          <p className="data-label">{t(scene.eyebrowKey)}</p>
          <h3>{t(scene.titleKey)}</h3>
          <p>{t(scene.descriptionKey)}</p>
          <small>{t(scene.inputLabelKey)}</small>
        </article>
      ))}
    </section>
  );
}

export function HumanAtlasScroll() {
  const { t } = useI18n();
  const sceneElements = useRef<HumanAtlasSceneElements>({});
  const activeScene = useActiveAtlasScene(sceneElements);
  const motionAllowed = useDecorativeMotion();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      aria-label={t("landing.atlas.story.aria")}
      className="human-atlas-scroll"
      data-active-scene={activeScene}
    >
      <div className={`human-atlas-stage${imageFailed ? " human-atlas-stage--failed" : ""}`}>
        {!imageFailed ? (
          <div className="human-atlas-media">
            <Image
              aria-hidden="true"
              alt=""
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
            <HumanAtlasGlow activeScene={activeScene} motionAllowed={motionAllowed} />
          </div>
        ) : (
          <p className="human-atlas-stage__fallback">{t("landing.atlas.imageFailure")}</p>
        )}
        <div className="human-atlas-progress" aria-hidden="true">
          {humanAtlasScenes.map((scene) => (
            <span data-active={activeScene === scene.id ? "true" : "false"} key={scene.id} />
          ))}
        </div>
      </div>

      <div className="human-atlas-scenes">
        {humanAtlasScenes.map((scene) => (
          <section
            className="human-atlas-scene"
            data-active={activeScene === scene.id ? "true" : "false"}
            data-atlas-scene={scene.id}
            key={scene.id}
            ref={(node) => { sceneElements.current[scene.id] = node; }}
          >
            <div className="human-atlas-scene__card">
              <p className="data-label">{t(scene.eyebrowKey)}</p>
              <h3>{t(scene.titleKey)}</h3>
              <p>{t(scene.descriptionKey)}</p>
              <small>{t(scene.inputLabelKey)}</small>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
```

If the callback-ref assignment triggers the React lint rule against expression bodies, keep the braced callback exactly as shown. The observer effect catches invalid entry data; the image failure is presentation-only and never throws an alert or disables navigation.

- [ ] **Step 4: Run the story and primitive tests and verify GREEN**

Run:

```bash
npm test -- app/components/human-atlas-scroll.test.tsx app/hooks/use-active-atlas-scene.test.tsx app/hooks/use-decorative-motion.test.tsx app/components/human-atlas-glow.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Refactor and commit**

Extract no extra abstraction unless the tests reveal duplication, rerun Step 4, then commit:

```bash
git add app/components/human-atlas-scroll.tsx app/components/human-atlas-scroll.test.tsx
git commit -m "feat: build Human Atlas scroll story"
```

---

### Task 4: Integrate the Express-first landing, font, asset, and responsive art direction

**Files:**
- Modify: `app/components/landing.test.tsx`
- Modify: `app/components/landing.tsx`
- Modify: `app/components/consent-screen.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/layout.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`
- Create: `public/media/human-atlas-hero.webp`
- Delete: `public/media/canopy-loop.mp4`

**Interfaces:**
- Consumes: `HumanAtlasScroll`, `HumanAtlasStaticStory`, `DecorativeSectionBoundary`, current `AnalysisDepth`, existing privacy copy, existing depth copy, and `onStart(depth)`.
- Produces: the final landing DOM and CSS; no change to `app/page.tsx` is required.

- [ ] **Step 1: Rewrite the landing tests for the new product hierarchy**

Replace canopy-specific assertions in `app/components/landing.test.tsx` with tests that prove:

```ts
const onStart = vi.fn();
const user = userEvent.setup();
const { container } = render(<Landing onStart={onStart} />);

expect(screen.getByRole("heading", { name: "Your body is a system." })).toBeVisible();
expect(screen.getByText(/9 questions.*adults 18\+.*under one minute/i)).toBeVisible();

const expressButtons = screen.getAllByRole("button", { name: "Start Express" });
expect(expressButtons).toHaveLength(2);
await user.click(expressButtons[0]);
await user.click(expressButtons[1]);
expect(onStart).toHaveBeenNthCalledWith(1, "express");
expect(onStart).toHaveBeenNthCalledWith(2, "express");

expect(screen.queryByRole("heading", { name: "Express", level: 3 })).not.toBeInTheDocument();
expect(screen.getAllByRole("heading", { level: 3 }).slice(-3).map(({ textContent }) => textContent))
  .toEqual(["Quick", "Detailed", "Deep"]);
expect(container.querySelector("video")).not.toBeInTheDocument();
expect(container.querySelector("img")?.getAttribute("src")).toContain("human-atlas-hero.webp");
expect(expressButtons.every((button) => !button.closest(".landing__atlas-decorative")))
  .toBe(true);
```

Keep canonical callback tests for Quick, Detailed, and Deep. Update the French test to assert `Votre corps est un système.`, two `Commencer Express` buttons, the four French scene headings, and `Rapide`, `Détaillée`, `Approfondie`, with no English Atlas copy leakage.

Add an integration test where the decorative boundary wraps an always-throwing test child alongside two outside Express buttons; assert the fallback appears and both buttons still call `express`. This test may compose `DecorativeSectionBoundary` directly rather than introduce a test-only prop on `Landing`.

In `app/page.test.tsx`, add a parameterized test for Express CTA index `0` and `1`. Each case renders a fresh `<Home />`, clicks that CTA, then asserts the newly mounted `Before we begin` heading has focus. This catches the SPA focus loss caused when the clicked landing button is removed from the DOM.

- [ ] **Step 2: Write failing font, asset, and CSS contract tests**

Update the `next/font/google` mock in `app/layout.test.ts` with:

```ts
Newsreader: () => ({ variable: "--font-editorial" }),
```

Add a layout assertion that calls `RootLayout({ children: "content" })`, reads the returned `<body>` element's `className`, and expects all four variables, including `--font-editorial`. Keep JSX out of the existing `.test.ts` file.

In `app/globals.test.ts`, import `existsSync` alongside `readFileSync`, replace only obsolete landing-canopy expectations, and add observable asset/layout guards. Avoid turning the missing asset into a test-runtime exception during RED:

```ts
const atlasPath = join(process.cwd(), "public/media/human-atlas-hero.webp");
expect(existsSync(atlasPath)).toBe(true);
const atlasAsset = existsSync(atlasPath) ? readFileSync(atlasPath) : Buffer.alloc(0);
expect(atlasAsset.subarray(0, 4).toString("ascii")).toBe("RIFF");
expect(atlasAsset.subarray(8, 12).toString("ascii")).toBe("WEBP");
expect(atlasAsset.byteLength).toBeLessThanOrEqual(650 * 1024);
expect(css).toMatch(/\.human-atlas-stage\s*\{[^}]*position:\s*sticky/s);
expect(css).toMatch(/\.human-atlas-media\s*\{[^}]*aspect-ratio:\s*1672 \/ 941/s);
expect(css).toMatch(/@media \(max-width: 780px\)[\s\S]+\.human-atlas-media\s*\{[^}]*translateX\(-62%\)/s);
expect(css).toMatch(/\.human-atlas-glow\s*\{[^}]*mix-blend-mode:\s*screen/s);
expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]+\.human-atlas-glow/s);
expect(css).toMatch(/@media print[\s\S]+\.human-atlas-stage[^}]*display:\s*none/s);
expect(css).not.toMatch(/\.landing__canopy-video/);
expect(css.match(/body\s*\{[^}]*\}/s)?.[0]).not.toMatch(/var\(--motif-canopy\)/);
expect(css).toMatch(/\.journey::before\s*\{[^}]*var\(--motif-canopy\)/s);
```

Also add a filesystem assertion that `public/media/canopy-loop.mp4` does not exist. Keep the current Cardio intermission poster/video tests unchanged.
Update the existing botanical-motif assertion from `body` to `.journey::before`; its purpose remains preserving that motif on the questionnaire/results journey, not forcing the old asset onto the new landing.

- [ ] **Step 3: Run the integration contracts and verify RED**

Run:

```bash
npm test -- app/components/landing.test.tsx app/layout.test.ts app/globals.test.ts app/components/human-atlas-scroll.test.tsx
```

Expected: FAIL because the old landing, font set, CSS, and media are still present.

- [ ] **Step 4: Encode the exact accepted asset and remove the obsolete landing MP4**

Verify the source before encoding:

```bash
atlas_source=/Users/zakichair/.codex/generated_images/019fce73-2081-7bd3-8b3b-b97ea55c7bc2/exec-198a35de-34e5-4fe9-a7d0-fb5abfa0bc52.png
test "$(shasum -a 256 "$atlas_source" | awk '{print $1}')" = "e04f29b719ef94f6f1a3644ac72506057819b73694208f1026473f4d8f553886"
cwebp -quiet -q 84 -m 6 -metadata none "$atlas_source" -o public/media/human-atlas-hero.webp
test "$(stat -f %z public/media/human-atlas-hero.webp)" -le 665600
sips -g pixelWidth -g pixelHeight -g format public/media/human-atlas-hero.webp
```

Expected output: 1672 × 941 WebP, approximately 112 KiB. Compare it visually at 100% against the PNG, checking paper grain, body texture, branches, registration marks, and colour dots. Delete only `public/media/canopy-loop.mp4`; retain Cardio media and the canopy poster still used as the quieter application motif.

- [ ] **Step 5: Add Newsreader without changing non-landing typography**

In `app/layout.tsx`, import and instantiate:

```ts
const editorial = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
```

Add `editorial.variable` to the body class. Do not replace `--font-display`; scope `--font-editorial` only through Human Atlas/landing CSS selectors.

In `app/components/consent-screen.tsx`, add a title ref and a mount-only focus effect:

```tsx
const titleRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  titleRef.current?.focus();
}, []);
```

Render the existing consent `<h1>` with `ref={titleRef}` and `tabIndex={-1}`. Do not focus the age input or reset entered fields on locale changes.

- [ ] **Step 6: Replace the landing composition**

In `app/components/landing.tsx`:

- remove `Image`, `useState`, `useDecorativeMotion`, `CanopyPoster`, and `AnimatedCanopyMedia`;
- keep the current header, wordmark, privacy facts, locale-aware depth labels, and `LandingProps`;
- change the depth metadata to Quick, Detailed, and Deep only;
- render this order: header; Atlas experience with hero copy and primary CTA; decorative boundary around `HumanAtlasScroll` with `HumanAtlasStaticStory` fallback; conversion block and closing CTA; `Other explorations` three-card grid; privacy panel; urgent footnote;
- put `.landing__atlas-hero` and both CTA buttons outside `.landing__atlas-decorative`;
- have both CTA handlers call `onStart("express")` directly.

The top-level shape is:

```tsx
<section className="landing__atlas-experience" aria-labelledby="landing-title">
  <div className="landing__atlas-hero">
    <p className="data-label">{t("landing.atlas.hero.eyebrow")}</p>
    <h1 id="landing-title">{t("landing.atlas.hero.title")}</h1>
    <p>{t("landing.atlas.hero.body")}</p>
    <button className="landing__primary-cta" type="button" onClick={() => onStart("express")}>
      {t("landing.atlas.hero.cta")}
    </button>
    <p className="landing__scroll-hint">{t("landing.atlas.hero.scroll")}</p>
  </div>
  <div className="landing__atlas-decorative">
    <DecorativeSectionBoundary fallback={<HumanAtlasStaticStory />}>
      <HumanAtlasScroll />
    </DecorativeSectionBoundary>
  </div>
</section>
```

The conversion section is a normal-flow sibling after the experience. Its CTA uses the same localized action name as the hero CTA.

- [ ] **Step 7: Implement the complete Human Atlas CSS system**

Replace the old landing hero/canopy CSS while leaving journey, assessment, results, and intermission selectors intact.

Required desktop declarations:

```css
.landing { padding: 24px 0 56px; }
.landing__header, .landing__footnote, .landing__atlas-conversion, .depth-section, .privacy-panel { width: min(1280px, calc(100% - clamp(32px, 10vw, 168px))); margin-inline: auto; }
.landing__main { width: 100%; max-width: none; }
.landing__atlas-experience { position: relative; width: min(1600px, calc(100% - 32px)); margin: clamp(28px, 5vw, 72px) auto 0; }
.landing__atlas-hero { position: absolute; z-index: 8; top: clamp(52px, 10vh, 112px); left: clamp(20px, 4vw, 58px); width: min(42%, 560px); }
.landing__atlas-hero h1, .human-atlas-scene h3, .landing__atlas-conversion h2 { font-family: var(--font-editorial), Georgia, serif; }
.human-atlas-scroll { position: relative; min-height: 430vh; }
.human-atlas-stage { position: sticky; z-index: 1; top: 12px; height: min(88svh, 820px); min-height: 590px; overflow: hidden; border: 1px solid var(--line); background: #f1eee6; isolation: isolate; }
.human-atlas-media { position: absolute; top: 0; bottom: 0; left: 50%; width: auto; height: 100%; aspect-ratio: 1672 / 941; transform: translateX(-50%); }
.human-atlas-media > img, .human-atlas-glow-set { position: absolute; inset: 0; width: 100%; height: 100%; }
.human-atlas-media > img { object-fit: fill; filter: saturate(.66) brightness(.92) contrast(1.02); }
.human-atlas-glow-set, .human-atlas-glow { pointer-events: none; }
.human-atlas-glow { position: absolute; inset: 0; width: 100%; height: 100%; }
.human-atlas-glow { opacity: 0; transform: translateX(-7.4%) scale(.985); transform-origin: 62% 36%; mix-blend-mode: screen; transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform 1.15s cubic-bezier(.2,.7,.2,1); }
.human-atlas-glow[data-active="true"] { opacity: 1; transform: translateX(-7.4%) scale(1); }
.human-atlas-scenes { position: relative; z-index: 6; width: min(39%, 430px); margin-top: calc(-1 * min(88svh, 820px)); padding-top: min(92svh, 860px); padding-left: clamp(18px, 4vw, 54px); }
.human-atlas-scene { display: flex; align-items: center; min-height: min(88svh, 820px); opacity: .34; transform: translateY(18px); transition: opacity .55s ease, transform .55s ease; }
.human-atlas-scene[data-active="true"] { opacity: 1; transform: translateY(0); }
.human-atlas-scene__card { padding: 22px 24px 24px; border: 1px solid var(--line); background: rgb(247 245 238 / 90%); box-shadow: 0 18px 70px rgb(16 42 42 / 8%); backdrop-filter: blur(14px); }
```

Add bounded scene-specific keyframes only for active breath, sleep, and energy glows. Strength remains a steady luminous trace. Use the accepted prototype durations: 3.6 s, 4.8 s, and 4 s.

Required mobile behavior at `max-width: 780px`:

- stage height `88svh`, minimum 580px;
- move the shared `.human-atlas-media` frame to `transform: translateX(-62%)`; because image and SVG live inside that one intrinsic 1672/941 frame, this centres the source figure without breaking glow registration;
- hero width becomes `calc(100% - 36px)` with a top/bottom paper gradient behind only the copy;
- scenes use full width with `padding-inline: 14px`, align cards to the bottom, and keep the active figure visible;
- scene card body is at least 14 CSS pixels with 1.6 line-height;
- all CTAs remain at least 48px high and no element creates horizontal overflow at 320px.

Required fallbacks:

- `[data-motion="paused"] .human-atlas-glow` has no animation but does not change sticky geometry, scene state, or DOM structure during hydration/document visibility changes;
- `@media (prefers-reduced-motion: reduce)` removes atlas animations/transitions, sets the stage to `position: relative`, resets the story margin/padding, and renders all scene cards in normal flow at full opacity with the first glow static;
- `.human-atlas-stage--failed` shows a plain paper surface and hides progress decoration;
- `@media print` hides `.human-atlas-stage`, `.landing__scroll-hint`, and glow layers; makes scenes/static story normal-flow, opaque, and break-safe; keeps CTAs/depth choices/privacy boundary readable;
- focus-visible retains the existing two-colour ring.

Move the old `var(--motif-canopy)` background out of `body` and into a fixed `.journey::before` presentation layer so consent/assessment/results preserve their quiet botanical surface while the Human Atlas landing does not download the obsolete canopy poster behind its hero. Keep `body` on the paper/grid background and hide the journey pseudo-element in print. Do not use `100vw`, negative viewport margins, or an overflow rule on any sticky ancestor.

- [ ] **Step 8: Run focused integration tests and verify GREEN**

Run:

```bash
npm test -- app/components/landing.test.tsx app/components/human-atlas-scroll.test.tsx app/components/human-atlas-glow.test.tsx app/components/decorative-section-boundary.test.tsx app/hooks/use-active-atlas-scene.test.tsx app/hooks/use-decorative-motion.test.tsx app/i18n/ui-copy.test.ts app/layout.test.ts app/globals.test.ts app/page.test.tsx app/lib/questionnaire.test.ts
```

Expected: PASS with no canopy landing assumptions remaining and no Express route regression.

- [ ] **Step 9: Refactor and commit**

Remove obsolete landing selectors and dead video code, run Step 8 again, then commit:

```bash
git add app/components/landing.tsx app/components/landing.test.tsx app/components/consent-screen.tsx app/page.test.tsx app/layout.tsx app/layout.test.ts app/globals.css app/globals.test.ts public/media/human-atlas-hero.webp public/media/canopy-loop.mp4
git commit -m "feat: launch Express with Human Atlas landing"
```

---

### Task 5: Document provenance and complete release-quality verification

**Files:**
- Modify: `README.md`
- Modify: `docs/privacy-and-release.md`
- Modify only if a discovered bug has a new failing regression test first: Human Atlas implementation/test files from Tasks 1–4.

**Interfaces:**
- Consumes: the complete landing implementation and exact branch commit history.
- Produces: accurate media/privacy documentation, browser QA evidence in this plan's ignored SDD workspace, and a fully verified feature branch.

- [ ] **Step 1: Update the human-facing media and privacy record**

In `README.md`:

- replace the statement that the landing has a silent video loop with the Human Atlas local WebP plus CSS/SVG scroll light;
- state that the selected Human Atlas artwork was generated with OpenAI's built-in image-generation tool, not Sora;
- record the source date, source SHA-256, 1672 × 941 dimensions, local `cwebp -q 84 -m 6 -metadata none` encoding, and absence of medical labels or factual diagram text;
- retain the Cardio intermission's local silent video provenance;
- describe the current branch as locally implemented until an actual deployment occurs.

In `docs/privacy-and-release.md`:

- update the presentation-asset count to six WebPs and one silent local MP4 after the obsolete landing MP4 removal;
- describe Human Atlas scene state as presentation-only, driven by intersection and never by answers/profile;
- record image, no-observer, reduced-motion, hidden-document, render-error, and print fallbacks;
- do not rewrite dated deployment attestations or claim this branch is deployed.

- [ ] **Step 2: Run static and automated release gates**

Use the repository's supported Node version and run fresh commands:

```bash
node --version
npm --version
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -print
```

Expected: Node ≥ 22.13.0; every command exits 0; zero production vulnerabilities; no unexpected `.tsbuildinfo` file.

- [ ] **Step 3: Run source and asset boundary scans**

Run:

```bash
test ! -e public/media/canopy-loop.mp4
test "$(stat -f %z public/media/human-atlas-hero.webp)" -le 665600
rg -n "canopy-loop|landing__canopy-video|<video|https?://.*\.(mp4|webm|png|jpe?g|webp|avif)" app public README.md docs --glob '!public/lab-assets/**'
rg -n "localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.sendBeacon|fetch\(|XMLHttpRequest|WebSocket|EventSource" app --glob '!app/lib/labs.ts'
rg -n "diagnos|predict.*death|medical scan|measures? your (brain|nervous system|digestion|energy)" app/i18n/ui-copy.ts app/components/human-atlas-*.tsx
```

Classify every match. Expected media result: no landing-video code or MP4 reference; the remaining `<video>` is Cardio intermission only; all Human Atlas media is same-origin and static.

- [ ] **Step 4: Run desktop/mobile EN/FR browser QA**

Start a production server and inspect at 1365 × 900, 390 × 844, and 320 × 700:

```bash
npm run start
```

Verify and capture evidence in this plan's ignored SDD workspace:

- original Human Atlas composition is unchanged and the clothed variant is absent;
- hero is visible above the fold, both Express CTAs open the existing consent screen, and minor Express fallback still routes to Quick;
- each centre-band scene activates the correct body glow: lungs/heart, nervous paths, brain, abdomen;
- glows are soft with no hard body overlays, labels, boxes, arrows, or hotspots;
- Quick/Detailed/Deep callbacks, EN/FR copy, keyboard order, visible focus, 44px targets, and privacy/urgent copy remain intact;
- no horizontal overflow at 320px;
- reduced motion freezes pulses/transitions but keeps active copy and glow; hiding/restoring the document pauses/resumes decorative motion;
- image failure, unavailable observer, forced decorative render failure, and print preserve all essential copy/actions;
- Network shows no landing video, remote media, POST, answer request, analytics, cookie, or storage activity; Console has no error after ordinary interaction.

If QA finds a behavior defect, first add a failing automated regression test that names the break, verify RED, apply the minimal fix, verify GREEN, and rerun the affected QA path.

- [ ] **Step 5: Measure the defined performance budget**

Run three mobile performance traces against the production build using local Chrome's Slow 4G and mobile CPU throttling. Record all three values and the median in the ignored release report. Require median LCP ≤ 2.5 s, CLS ≤ 0.1, no hero-image layout shift, and no >50 ms main-thread task attributable to one decorative scene transition.

If Lighthouse CLI is unavailable, use Chrome DevTools Performance/Network panels with the same throttling and explicitly label the evidence as a DevTools lab trace rather than inventing a Lighthouse score. Do not add a project dependency solely for this audit.

- [ ] **Step 6: Commit accurate documentation and any reviewed QA fix**

Run focused tests covering any QA fix, then commit:

```bash
git add README.md docs/privacy-and-release.md app public/media
git commit -m "docs: record Human Atlas landing provenance"
```

- [ ] **Step 7: Re-run the final verification matrix on exact HEAD**

Run fresh on the final commit:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
git status --short
```

Expected: every command exits 0, audit reports zero production vulnerabilities, diff check is clean, and the branch worktree is clean.

## Post-integration release gate

This implementation request authorizes completing the feature branch, not silently choosing its integration/deployment path. After `superpowers:finishing-a-development-branch` presents the required branch options and the user selects an integration path, a deployment-authorized continuation must:

1. merge or push the exact reviewed commit through the selected path;
2. use the repository's configured owner-only Sites project and the `sites:sites-hosting` workflow to save/deploy that exact source without widening access;
3. wait for terminal deployment success and verify the deployed source/version match;
4. run the spec's desktop/mobile English/French smoke test against the deployed URL;
5. confirm the Human Atlas asset, four glow transitions, both Express CTAs, Quick/Detailed/Deep paths, reduced motion, and local-only network/storage/cookie boundary;
6. update the dated deployment record with the exact SHA/version only after those checks pass.

Until that continuation succeeds, report the implementation branch as locally complete and verified, but do not claim the full deployment acceptance criterion or a new live version.
