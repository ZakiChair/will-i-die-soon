# Human Atlas landing experience

Date: 2026-08-05
Status: approved visual direction; implementation pending

## Outcome

Transform the landing page into an Express-first, cinematic product story built around the selected Human Atlas artwork. The same figure remains fixed while scrolling reveals four anatomical visual metaphors tied to the real Express categories:

1. breath — lungs and heart, tied to reported VO₂ max;
2. strength — brain, spinal cord, and peripheral nervous pathways as a metaphor for effort coordination, tied to existing squat and deadlift maxima plus body-weight context;
3. sleep — brain as a metaphor for sleep and recovery, tied only to usual duration and how refreshed the person feels on waking;
4. energy — stomach and intestines as a metaphor for food processing, tied only to the two reported nutrition habits.

The experience should feel as deliberate as a premium product launch without presenting a medical scan, diagnosis, organ measurement, or hidden physiological inference. The existing Express questionnaire, consent boundary, scoring, and four-part result contract do not change.

## Validated direction

The accepted visual prototype is `Human Atlas original + volumetric glow`:

- preserve the exact originally selected generated Human Atlas composition;
- keep the figure and botanical paper artwork visually unchanged as the source of truth for the master image;
- do not replace it with the later clothed-person variant;
- do not bake new glow effects into the image;
- add glow at runtime with blurred SVG layers and CSS blending;
- activate one visual chapter at a time from scroll position;
- never draw selection boxes, hard organ outlines, callout arrows, anatomical labels, or hotspots over the body.

The selected image was generated with OpenAI's built-in image-generation tool during design exploration. It was not generated with Sora. Implementation must retain that provenance and must not claim otherwise.

## Scope

### In scope

- Redesign the landing page as an Express-first product story.
- Replace the current split hero/canopy presentation with a full-width Human Atlas hero.
- Add a sticky, four-scene scrollytelling sequence driven by `IntersectionObserver`.
- Add four noninteractive, `aria-hidden` SVG glow maps aligned to the selected image.
- Introduce a more editorial display typeface while retaining readable body and data faces.
- Add concise English and French copy for the four chapters.
- Launch Express from the primary hero and closing calls to action.
- Preserve Quick, Detailed, and Deep as clearly labelled secondary explorations below the main Express conversion.
- Preserve the privacy, evidence, and medical-boundary content in a quieter closing section.
- Preserve static, mobile, reduced-motion, hidden-document, image-failure, and print fallbacks.
- Optimize and locally host the selected generated image.

### Out of scope

- Changing any Express question, answer type, eligibility gate, unit, formula, summary, or result.
- Adding a global health, mortality, fitness, neurological, digestive, or sleep score.
- Estimating VO₂ max when the user does not report one.
- Claiming that squat or deadlift directly measures the nervous system.
- Claiming that two sleep answers diagnose a sleep disorder.
- Claiming that two nutrition answers measure digestion, absorption, microbiome health, or metabolic function.
- Adding Sora video or any other video.
- Adding WebGL, canvas rendering, remote media, analytics, cookies, persistence, or server-side answer processing.
- Removing the three longer assessment depths.

## Product hierarchy

### Primary path

Express is the product presented above the fold:

- exactly 9 adult-only questions;
- less than one minute;
- VO₂ max, strength, sleep, body context, and nutrition;
- four transparent summaries;
- no global score or ranking.

The primary CTA calls the existing `onStart("express")` boundary. The homepage does not prefill answers or skip consent.

### Express data contract

The visual story does not alter or reinterpret the nine-question queue:

- breath: `reported_vo2_max_ml_kg_min`;
- strength: `squat_one_rep_max_kg` and `deadlift_one_rep_max_kg`;
- body context: `height_cm` and `weight_kg`;
- sleep: `usual_sleep_hours` and `sleep_refreshed`;
- nutrition: `plant_food_frequency` and `diet_ultra_processed`.

Body context has no fifth organ glow. Weight supports the existing body-weight strength ratios, while height and weight remain a separately labelled context block in the Express result. The landing must not imply that the illustration is sized or personalized from either value.

### Secondary paths

Quick, Detailed, and Deep remain available after the Human Atlas sequence under a compact `Other explorations` section. Each option retains its existing canonical `AnalysisDepth` value, time/count copy, and `onStart(depth)` behavior. They must not compete visually with the main Express CTA in the hero.

## Narrative sequence

### Scene 00 — Hero

The Human Atlas artwork fills a large, near-viewport stage. The figure sits right of centre and the existing negative space carries the headline and CTA.

French draft:

- eyebrow: `Human Atlas · 9 questions · adultes 18+ · moins d'une minute`
- headline: `Votre corps est un système.`
- body: `Souffle, force, sommeil et énergie : quatre regards courts sur ce qui vous fait avancer et récupérer.`
- CTA: `Commencer Express`

English draft:

- eyebrow: `Human Atlas · 9 questions · adults 18+ · under one minute`
- headline: `Your body is a system.`
- body: `Breath, strength, sleep, and energy: four short views of what helps you perform and recover.`
- CTA: `Start Express`

The hero CTA may start Express immediately. A subtle scroll affordance introduces the four-scene explanation.

### Scene 01 — Breath

Target: lungs plus heart.

Visual behavior:

- two diffuse cyan-blue lung volumes brighten together;
- a smaller coral heart glow pulses inside the same thoracic region;
- the light has no hard boundary and spills only softly into the surrounding body texture;
- the pulse is slow and decorative, not synchronized to a medical heart rate.

French copy:

`Les poumons captent l'oxygène, le cœur le fait circuler. Votre VO₂ max déclarée apporte un repère de capacité cardio-respiratoire.`

English copy:

`The lungs take in oxygen and the heart circulates it. Your reported VO₂ max provides a cardiorespiratory-capacity reference point.`

Express input label: most recent measured or device-estimated VO₂ max in ml/kg/min, reported by the person.

### Scene 02 — Strength

Target: brain, spinal cord, and peripheral nervous pathways through the limbs.

Visual behavior:

- a warm amber signal begins near the head;
- it travels down a central spinal path and diffuses into arms and legs;
- the path has a broad blurred bloom plus a very fine luminous core;
- there is no muscle highlighting, skeleton, anatomy plate, or electrical shock effect.

French copy:

`Le cerveau, la moelle et les nerfs coordonnent l'effort. Vos meilleurs squat et soulevé de terre déjà réalisés donnent un repère simple de force relative.`

English copy:

`The brain, spinal cord, and nerves coordinate effort. Your best already-completed squat and deadlift provide a simple relative-strength reference point.`

Express input label: the heaviest squat and deadlift already completed for one repetition, interpreted relative to body weight; never invite a new maximal attempt.

### Scene 03 — Sleep

Target: brain.

Visual behavior:

- an indigo-blue halo emerges within and immediately around the head;
- restrained internal neural texture appears without mapping named regions;
- the animation breathes more slowly than the other scenes;
- the overall stage may dim slightly, but text contrast remains unchanged.

French copy:

`Le cerveau participe aux cycles, à la vigilance et à la récupération. Vos réponses décrivent deux aspects seulement : durée habituelle et sensation de récupération au réveil.`

English copy:

`The brain contributes to sleep cycles, alertness, and recovery. Your answers describe only two aspects: usual duration and how refreshed you feel on waking.`

Express input label: usual sleep duration and how refreshed the person feels within an hour of waking.

### Scene 04 — Energy

Target: stomach and intestines.

Visual behavior:

- a warm amber-to-coral glow diffuses through the upper and lower abdomen;
- faint organic curves suggest digestive movement without tracing literal organs;
- the effect remains abstract and does not imply direct observation of digestion or absorption.

French copy:

`L'estomac et les intestins participent à la digestion et à l'absorption des nutriments. Ici, seules deux habitudes apportent du contexte : portions de fruits et légumes, et fréquence des repas principalement ultra-transformés.`

English copy:

`The stomach and intestines take part in digestion and nutrient absorption. Here, only two habits add context: fruit-and-vegetable portions and how often ultra-processed foods are the main meal.`

Express input label: typical daily portions of vegetables and fruit, plus how often packaged ready meals, sweets, crisps, or fast food are the main meal.

### Scene 05 — Conversion

The four colours settle into a quiet shared atlas. The stage releases from sticky positioning and reveals the final Express CTA.

French:

- headline: `Neuf réponses. Quatre repères clairs.`
- CTA: `Commencer Express`

English:

- headline: `Nine answers. Four clear reference points.`
- CTA: `Start Express`

The secondary depth choices and privacy boundary follow.

## Typography

Use three roles with strict boundaries:

1. `Newsreader` for hero and scene headlines. Its editorial, human forms replace the current display role on the landing page only.
2. `Manrope` for descriptions, buttons, privacy copy, and all functional labels requiring fast reading.
3. `IBM Plex Mono` for durations, scene numbers, units, and short data labels.

Load `Newsreader` through `next/font/google` in `app/layout.tsx` and expose it as a dedicated CSS variable such as `--font-editorial`. Retain the existing Bricolage Grotesque variable for non-landing screens unless implementation proves a smaller, safe global change is needed. Do not use proprietary Apple fonts or runtime font requests.

Typography constraints:

- hero headline: large editorial serif, compact line-height, controlled negative tracking;
- scene title: editorial serif, shorter than two lines when possible;
- descriptions: 14–18 CSS pixels depending on viewport, line-height at least 1.55;
- microcopy: never below 11 CSS pixels in production;
- buttons: Manrope, sentence case, no condensed or monospaced body copy;
- English and French line wrapping must be tested separately.

## Visual implementation
### Master image

Copy the exact selected image into a stable project path such as:

`public/media/human-atlas-hero.webp`

Selected source identity before optimization:

- design working copy: `.superpowers/brainstorm/38864-1785912637/content/generated-human-atlas.png`;
- generated-source output: `~/.codex/generated_images/019fce73-2081-7bd3-8b3b-b97ea55c7bc2/exec-198a35de-34e5-4fe9-a7d0-fb5abfa0bc52.png`;
- dimensions and format: 1672 × 941 PNG;
- SHA-256: `e04f29b719ef94f6f1a3644ac72506057819b73694208f1026473f4d8f553886`.

The source hash identifies the accepted artwork; an optimized production encoding will naturally have a different hash.

Keep the original composition, figure, botanical branches, paper texture, registration marks, and external colour dots. Encoding to WebP or AVIF is permitted when visual comparison confirms no material degradation. Do not use the later generated clothed-person image.

The image remains local, silent, noninteractive, nonfocusable, and decorative. Copy provides all semantic meaning, so the final image should use an empty alt attribute.

### Glow maps

Render four inline SVGs in the same `viewBox` as the master image. Each map is `aria-hidden="true"` and contains only gradients, blur filters, and abstract paths. The image and SVGs share identical `object-fit`/`preserveAspectRatio` geometry so alignment survives responsive cropping.

Layer contract:

- all glow maps are mounted once;
- inactive maps have `opacity: 0`;
- the active map transitions to `opacity: 1` and a subtle scale of `1`;
- use `mix-blend-mode: screen` and restrained blur;
- do not add DOM labels or clickable areas on top of the body;
- do not use canvas, WebGL, mouse tracking, or pointer-following light.

The existing selected image contains mild chest and abdominal colour. The generated source remains unchanged and is the visual comparison reference. A restrained runtime saturation/brightness treatment may quiet those baked colours, provided visual QA confirms that the composition, body, botanical elements, and paper texture remain recognizably intact. The active runtime glow must dominate without blowing out that texture.

### Colour roles

- breath: electric/cyan blue with a small coral heart accent;
- strength: amber-to-warm-coral nervous propagation;
- sleep: indigo/electric-blue halo;
- energy: amber-to-coral abdominal diffusion;
- ink and reading surfaces: existing deep teal and paper colours.

Colour never carries meaning alone; each active scene has an explicit heading and description.

## Interaction architecture

Create a focused landing component boundary rather than extending the current `Landing` component indefinitely.

Suggested structure:

- `app/components/landing.tsx` — page composition and depth actions;
- `app/components/human-atlas-scroll.tsx` — sticky stage, active scene, observer lifecycle, and fallback;
- `app/components/human-atlas-glow.tsx` — pure SVG glow rendering from a typed scene ID;
- `app/components/decorative-section-boundary.tsx` — narrow error boundary around the decorative atlas only;
- `app/data/human-atlas.ts` — ordered scene metadata and typed `UiCopyKey` references;
- `app/i18n/ui-copy.ts` — complete English/French Human Atlas copy, preserving the existing compile-time locale parity check;
- `app/hooks/use-active-atlas-scene.ts` — isolated `IntersectionObserver` behavior if the component would otherwise become difficult to test.

Use a closed scene union:

```ts
type HumanAtlasScene = "breath" | "strength" | "sleep" | "energy";
```

The observer activates the section intersecting a centre viewport band. Do not attach a per-pixel `scroll` listener. Active scene state is presentation-only and must never enter the questionnaire or answer state.

The primary and closing CTA both call `onStart("express")`. Secondary depth buttons retain their existing callbacks. Keep both CTAs outside the decorative error boundary so a rendering failure in the atlas cannot remove the path into Express. If the decorative subtree throws, its boundary replaces only that subtree with the normal-flow static copy.

## Motion and lifecycle

Reuse `useDecorativeMotion` so motion is allowed only when:

- the user has not requested reduced motion;
- the document is visible.

When decorative motion is disabled:

- do not pulse, trace, or animate glow;
- preserve a static highlighted state that matches the nearby scene copy, or use a simple non-sticky stacked presentation;
- never hide text or prevent Express from starting.

When the document becomes hidden, stop decorative animation. The current scene may be retained so the user returns to the same place.

## Responsive behavior

### Desktop and large tablet

- sticky stage occupies approximately 80–90 viewport height;
- image remains full-stage;
- text cards travel through the existing left-side negative space;
- figure and glow remain aligned on the right;
- scene duration is approximately 75–90 viewport height each.

### Mobile

- retain the same scene order;
- crop the image consistently with the matching SVG coordinate system;
- place the active copy in an opaque or blurred paper panel near the bottom;
- keep the figure's head, torso, abdomen, and enough limbs visible for all four glows;
- avoid horizontal overflow at 320 CSS pixels;
- keep touch targets at least 44 by 44 CSS pixels.

If one crop cannot keep both the body and copy readable, use art-direction metadata or a second crop derived from the same selected image. Do not generate a different person or composition for mobile.

## Accessibility

- The artwork and SVG glow layers are decorative and excluded from the accessibility tree.
- The four scene headings and descriptions are normal document content in source order.
- Sticky behavior must not reorder reading or keyboard focus.
- No glow layer is focusable, clickable, or pointer-sensitive.
- The primary CTA remains keyboard reachable and visibly focused.
- `prefers-reduced-motion` removes pulses, line propagation, and large scroll transitions without removing information.
- High-contrast focus treatment remains consistent with the application.
- Colour is always paired with text.
- Print removes the sticky stage and glow layers, then prints a compact static introduction plus the depth choices and safety boundary.

## Privacy and medical boundary

The landing page receives no profile or answer data. It must not adapt the body, glow intensity, wording, or scene order to a user. It has no analytics, storage, cookie, request beacon, model inference, or server processing.

Body-system wording is educational framing only:

- the lungs/heart glow is not a real oxygen or cardiac visualization;
- the nervous glow is not a neurological measurement;
- the brain glow is not sleep staging or brain activity;
- the abdominal glow is not a digestive or metabolic measurement.

The existing prototype and urgent-care boundary remains visible near the end of the landing page.

## Performance

- Ship one optimized master image and inline vector glow layers.
- Do not ship landing video.
- Avoid large animation libraries; use React, CSS, SVG, and `IntersectionObserver`.
- Preload or prioritize only the hero image.
- Do not lazy-load the above-the-fold hero.
- Keep decorative SVG filters bounded to the body region where practical.
- Ensure hidden/inactive layers do not trigger unnecessary animation.
- Preserve the current local-only network boundary.

The optimized master image should be visually compared against the generated source. Use a responsive source no wider than 1920 pixels. Target at most 450 KiB transferred for the largest source and treat 650 KiB as the hard cap; if the target visibly damages paper grain or body detail, change encoding settings or provide responsive variants rather than crossing the hard cap silently.

Pre-release performance QA uses a production build and three Lighthouse mobile runs with simulated Slow 4G and mobile CPU throttling. Use the median result and require:

- LCP at or below 2.5 seconds;
- CLS at or below 0.1;
- no main-thread task longer than 50 milliseconds attributable to continuous decorative animation during a recorded scene transition;
- no layout shift when the hero image resolves.

## Error handling and fallbacks

- Image load failure: retain a paper background, headline, descriptions, and all CTAs; hide glow layers.
- `IntersectionObserver` unavailable: show the first scene statically and render all four descriptions in normal flow.
- Reduced motion: use static or non-sticky presentation with no pulsing.
- SVG filter failure: the copy and base image remain complete; no error dialog.
- JavaScript exception inside decorative scene activation: the narrow decorative error boundary renders static normal-flow copy while the Express CTA and secondary depth choices remain mounted.
- Print: omit artwork, glow, sticky layout, and animation.

## Test strategy

Implementation follows red-green-refactor.

### Data and copy tests

- Exactly four ordered scene IDs exist.
- Every scene has English and French eyebrow, title, description, and input-label copy.
- No copy claims diagnosis, direct organ measurement, or prediction.
- Express remains exactly nine questions.

### Component tests

- Hero and closing CTA call `onStart("express")`.
- Quick, Detailed, and Deep remain available and call their canonical values.
- Four normal-flow scene sections render in order.
- Four glow layers render once, remain `aria-hidden`, and expose no focusable elements.
- Mocked intersection changes the active scene without changing application state.
- Reduced motion disables decorative animation while retaining all copy and actions.
- Hidden-document changes suspend motion.
- Image failure preserves content and actions.
- A forced render error from the glow subtree activates the decorative fallback while both Express CTAs and all secondary depth choices remain available.
- French renders without English landing copy leakage.

### CSS and asset tests

- The landing references only local media.
- The selected Human Atlas asset exists at the declared path.
- Print hides decorative/sticky media.
- Reduced-motion rules suppress keyframes and transitions.
- No horizontal overflow at the supported mobile width.
- No legacy canopy video request occurs on the landing page after replacement.

### Pre-deployment verification

- non-incremental TypeScript;
- ESLint;
- focused landing, motion, i18n, and page tests;
- complete Vitest suite;
- production Vinext build;
- dependency audit;
- `git diff --check` and clean generated-file audit;
- desktop/mobile EN/FR visual QA;
- keyboard and visible-focus QA;
- reduced-motion and hidden-document QA;
- image-failure QA;
- local-only network/storage/cookie QA;
- median-of-three mobile Lighthouse budget check.

### Post-deployment verification

- Run a deployed-product smoke test in English and French at desktop and mobile widths.
- Confirm the deployed Human Atlas asset, all four scene transitions, both Express CTAs, and the Quick/Detailed/Deep secondary paths.
- Recheck that no video, remote-media, analytics, storage, or cookie request occurs in production.
- Report completion only after the deployed smoke test passes.

## Acceptance criteria

- The exact selected original Human Atlas artwork is used; the later clothed variant is absent from production.
- Express is clearly the primary landing path and starts through the existing consent boundary.
- Four scroll scenes illuminate lungs/heart, nervous system, brain, and digestive region respectively.
- Glow is volumetric and soft, with no boxes, hard selection outlines, organ callouts, or interactive hotspots.
- Each scene contains a short bilingual description tied to actual Express inputs.
- Newsreader, Manrope, and IBM Plex Mono have distinct, consistent landing roles.
- Quick, Detailed, and Deep remain accessible as secondary explorations.
- No question, calculation, risk rule, result contract, privacy boundary, or medical boundary changes.
- Reduced motion, mobile, image failure, print, and no-observer fallbacks retain all essential content and actions.
- The landing adds no video, analytics, persistence, remote media, or per-pixel scroll handler.
- All pre-deployment gates pass before deployment, and the post-deployment smoke test passes before completion is reported.
