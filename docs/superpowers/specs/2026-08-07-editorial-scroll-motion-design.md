# Editorial Scroll Motion And Typography Design

Date: 2026-08-07
Status: Draft for written-spec review

## Context

The current bioluminescent redesign established a strong Human Atlas, GSAP motion foundation, dark visual system, and robust reduced-motion, print, focus, and progressive-enhancement behavior. The remaining weakness is rhythm: after the Atlas, most landing and result sections use the same 500 ms opacity-and-Y reveal. Space Grotesk and Geist also have similar visual color, so hierarchy depends mainly on size.

The approved scope is the landing and results experience. The questionnaire stays calm and task-focused. The selected visual direction is an editorial contemporary system, and the selected motion direction is editorial orchestration.

## Goals

- Give the landing and results a distinct editorial voice without weakening health-content clarity.
- Make scroll progression feel responsive and intentional rather than adding unrelated effects.
- Replace uniform section fades with a small semantic motion vocabulary.
- Preserve the Human Atlas as the signature visual and keep every existing privacy and accessibility boundary.
- Maintain usable static content when motion, GSAP, `matchMedia`, media assets, or JavaScript enhancement is unavailable.

## Non-goals

- No new motion is added to the question-to-question workflow.
- No animated medical counters, score roulette, or delayed final values.
- No blur, 3D tilt, per-letter animation, looping decorative effects, gradient orbs, HUD overlays, or green side rectangle.
- No new palette, illustration, generated image, or external service.
- No pinning or long scrub timelines in result sections that use `content-visibility: auto`.

## Typography

### Families and roles

- **Newsreader** becomes `--font-display`. It is limited to the landing hero H1, landing conversion/depth/privacy H2s, the results introduction H1, and the results canopy/score/Express/habits/action/laboratory H2s.
- **Manrope** becomes `--font-body`. It owns body copy, controls, navigation, cards, question prompts, forms, and compact subheadings.
- **IBM Plex Mono** becomes `--font-data`. It owns data labels, progress, units, laboratory values, evidence metadata, and other measurement-oriented text.

All fonts are loaded through `next/font/google`, self-hosted by the build, and exposed through the existing CSS variable contract. Newsreader and Manrope load their normal variable faces; Newsreader also enables the `opsz` axis. Newsreader declarations use only weights 500 and 600. Manrope may retain the current intermediate weights from 400 through 750 because its variable face covers them. IBM Plex Mono loads normal static faces 400, 500, 600, and 700, and every data declaration is normalized to one of those four values. No italic face and no fourth family is introduced.

The CSS family map is explicit; the Newsreader and IBM Plex Mono rows override the Manrope default:

| Family | Selectors and roles |
| --- | --- |
| Newsreader | `.landing__atlas-hero h1`, `.landing__atlas-conversion h2`, `.depth-section .section-heading h2`, `.privacy-panel h2`, `.results__intro h1`, `.results-canopy > .section-heading h2`, `.score-sheet h2`, `.express-results > h2`, `.habits-map > h2`, `.action-plan > h2`, `.confirmed-labs > h2` |
| Manrope | `body`, controls, links, `.wordmark`, and all `h1`, `h2`, and `h3` not overridden by the Newsreader row. This explicitly keeps consent, safety, question, intermission, lab-import, Atlas-scene, depth-card, urgent-result, child-guide, private-handoff, result-tools, action-card, Express-card, and risk-evidence headings in Manrope. |
| IBM Plex Mono | `.language-switcher__option`, `.data-label`, `.depth-card__eyebrow`, `.privacy-panel__eyebrow`, `.landing__scroll-hint`, `.human-atlas-scene small`, `.human-atlas-static small`, `.privacy-panel dt`, `.input-with-unit span`, `.question-number__unit`, `.pillar-progress__position`, `.pillar-progress__number`, `.assessment__progress`, `.question-number input`, `.lab-review__row legend`, `.lab-review__row input`, `.risk-tree__root`, `.risk-tree__branch-label`, `.risk-tree__leaf-meta`, `.risk-evidence dt`, `.score-sheet__readout`, `.score-sheet__coverage`, `.score-category summary span:last-child`, `.score-category li > span:nth-of-type(2)`, `.express-results__context-title`, `.express-results__context dt`, `.express-result-card dt`, `.express-results__context dd`, `.express-result-card dd`, `.express-result-card > p:first-of-type`, `.action-plan > ol > li::before`, `.confirmed-labs thead th`, `.confirmed-labs tbody td` |

### Hierarchy

- Landing hero: 5.75 rem / 0.92 desktop, 3 rem / 0.98 compact.
- Major landing and result section headings: 4 rem / 0.98 desktop, 2.5 rem / 1.04 compact.
- Question prompt: Manrope at the existing 2.75 rem / 1.08 desktop and 2 rem / 1.12 compact scale.
- Body: 1 rem minimum with 1.65 line height.
- Metadata: 0.75 rem minimum with at least 1.45 line height.

Font sizes remain fixed per breakpoint and never scale with viewport width. Letter spacing remains zero. French headings use balanced wrapping, `overflow-wrap: break-word`, and `hyphens: auto` instead of arbitrary mid-word breaking. Measurement text uses tabular lining numerals. Newsreader uses `font-optical-sizing: auto`. `font-synthesis: none` prevents synthetic weight or style generation.

## Motion Vocabulary

The existing `[data-reveal]` attribute remains the progressive-enhancement and print contract. Its optional value selects one of three behaviors:

1. `data-reveal="single"`: one target enters from opacity 0 and `translateY(20px)`.
2. `data-reveal="heading"`: marked children enter in reading order: eyebrow, title, body, action, then decorative rule.
3. `data-reveal="group"`: marked peer items enter from opacity 0 and `translateY(18px)`.

Children participating in a sequence use `data-reveal-item`. Non-rule `heading` items start at opacity 0 and `translateY(24px)`. Decorative rules are non-focusable `<span aria-hidden="true">` elements using `data-reveal-item="rule"`; they remain at opacity 1 and draw from left to right with `scaleX(0)` to `scaleX(1)` and `transform-origin: left center`. Existing bare `data-reveal` targets remain backward compatible and behave as `single`.

Each eligible root element carrying `[data-reveal]` receives one GSAP timeline and one ScrollTrigger starting at `top 84%`. In `document` mode, an already visible or passed root receives neither; in `new-content` mode, a newly mounted valid root remains eligible even when it is inside the viewport. A semantic section may contain several reveal roots, but a reveal root may not contain another `[data-reveal]` root. If a nested pair is detected, both members of that pair are cleared to their final visible state and skipped without throwing or creating triggers; unrelated valid roots still initialize. The Atlas and risk tree use dedicated triggers and are not counted as section reveals. The evidence-panel transition has no ScrollTrigger.

Timelines use `opacity` and `transform`, never `visibility`. A `single` reveal lasts 550 ms. `heading` items last 650 ms with 80 ms stagger. `group` items last 550 ms with 70 ms stagger. All use `power3.out` and run once. Server-rendered content is visible by default; GSAP only enhances it after the motion gate resolves.

### Initialization without visible-to-hidden flash

Before any hook applies a GSAP initial state, a synchronous browser-only preflight verifies that `matchMedia` is callable, reduced motion is not requested, the document is visible, and the required GSAP/ScrollTrigger APIs are callable. This preflight does not wait for the current effect-driven motion status. `app/hooks/use-decorative-motion.ts` exposes the shared capability reader and observer while retaining the existing status API for other components.

Each entry-animation owner performs preflight, setup, and live preference/visibility subscription inside one layout effect; it does not use the effect-driven initial `pending → running` transition as a setup dependency. The first transition to a non-running capability kills the owned timelines, clears inline state, marks those entry roots complete, and unsubscribes. A later return to `running` cannot replay them during that mount. The continuous Atlas hook may reattach at current raw scroll progress when page visibility returns, but it never replays completed entry sequences.

`useSectionReveal` accepts an optional mode:

- `document` is the default for landing and the main results root. At setup, roots whose top edge is at or above the viewport bottom remain at their final visible state and do not replay. Roots strictly below the viewport are placed in their initial transform state before a user can scroll to them, then play at `top 84%`.
- `new-content` is used only by `PrivateResultsRevealBoundary`. Because those nodes have just mounted, the hook sets their initial state in its layout effect and may animate roots already inside the viewport.

The hero uses a separate before-paint bootstrap. A small inline script emitted in the document `<head>` by `app/layout.tsx` sets `data-motion-bootstrap="pending"` on `<html>` only when `matchMedia` exists and reduced motion is not requested. CSS may mask only marked hero entrance items while that attribute is `pending`. The first scroll, a media-query change to reduced motion, or a 1,500 ms guard changes `pending` to the terminal `static` state; none removes or rewinds a `ready` state. The whole bootstrap, including media-query creation and listener/timer installation, is wrapped in `try/catch`; any thrown step changes an already-set `pending` state to `static`, or leaves the attribute absent if setup had not begun.

The root `<html>` uses `suppressHydrationWarning` solely because the before-paint script owns this one bootstrap attribute, which is absent from the server React tree. Tests assert that no other root attribute or text divergence is suppressed and that hydration emits no warning.

The landing layout effect may prepare the GSAP entrance only when the current bootstrap state is exactly `pending`. In that same pre-paint commit, it sets the scoped GSAP initial state, changes the bootstrap state to `ready`, and starts the timeline. A successful timeline removes the attribute on completion. If the effect observes `static`, a missing attribute, or an unsupported motion dependency, it synchronously changes any remaining `pending` state to `static`, skips the entrance, and clears all motion-owned inline properties. A caught setup error performs the same terminal cleanup.

Any cleanup while the state is `ready`, including unmount, Strict Mode effect replay, document hiding, or a live preference change to reduced motion, kills and reverts the timeline, clears motion-owned inline properties, and changes the state to `static`. Returning to no-preference during the same mount does not replay that entrance. A late bundle or interrupted entrance therefore cannot leave or remask content. With JavaScript disabled, the attribute is never set and content is visible from the first paint.

## Landing Choreography

### Hero entrance

The Atlas hero receives explicit `data-hero-item` markers. When decorative motion is allowed, a scoped `power3.out` entrance timeline uses these exact overlapping tweens:

- eyebrow: opacity 0 and `translateY(12px)` to final over 320 ms, starting at 0 ms;
- H1 inside the mask: opacity 0 and `translateY(32px)` to final over 620 ms, starting at 80 ms;
- body: opacity 0 and `translateY(18px)` to final over 420 ms, starting at 260 ms;
- primary action: opacity 0 and `translateY(14px)` to final over 360 ms, starting at 380 ms;
- scroll hint: opacity 0 and `translateY(10px)` to final over 320 ms, starting at 500 ms.

The sequence therefore ends at 820 ms. It does not split text into letters or words. The title mask has automatic height, at least `0.12em` block padding, and `overflow: clip` only while the bootstrap is `pending` or `ready`; overflow and all inline motion state are cleared at completion and in every static fallback.

### Hero handoff and Atlas camera

The existing Atlas ScrollTrigger remains the single source of continuous scroll progress. Its timeline is extended to:

- move only marked, non-interactive hero copy upward by no more than 36 px, and fade only the large H1 no lower than opacity 0.82, without applying `visibility`;
- scale the Atlas image from 1 to no more than 1.035 with a vertical translation below 10 px;
- preserve camera smoothing with `scrub: 0.8`, while the same trigger's `onUpdate` drives a compositor-friendly progress fill directly from raw `progress` using `scaleX`;
- preserve the existing strength-signal animation and active-scene state calculation.

The camera targets the image layer, not the centered media wrapper whose transform defines layout geometry. Normal-size hero copy and the primary action are excluded from the continuous fade and remain at full opacity. Any hero entrance item containing keyboard focus is forced to full opacity, zero translation, and no clipping for the duration of that focus. At widths up to 850 px, the hero handoff is limited to 18 px, image scale to 1.018, and image translation to 4 px.

### Atlas chapters

On initial mount, `HumanAtlasScroll` leaves every scene child in its static final state and records the initial `activeScene`; it does not replay an entrance. A later `activeScene` change runs a scoped timeline for the active card's eyebrow, title, body, and source line from opacity 0.45 and `translateY(12px)`. Each item lasts 380 ms with 60 ms stagger and `power2.out`.

On a dependency change, cleanup first records whether the previous timeline was still active, kills it, and reverts its GSAP context. The next layout-effect callback sets every scene child to the final state (`opacity: 1`, zero translation). If the prior entrance was interrupted, the new entrance is skipped and the newly active scene remains final before the next paint. Otherwise, the callback starts the new active-scene timeline. On unmount or motion disable, cleanup kills the timeline, reverts the context, and clears motion-owned inline opacity and transform properties. An `activeScene` change arriving before the preceding 560 ms staggered sequence completes is therefore treated as fast scrolling and never leaves partially hidden text.

### Post-Atlas sections

- Conversion uses a `heading` reveal with a horizontal rule drawn from left to right.
- Depth choices use a `group` reveal across the three cards, with no tilt or continuous hover animation.
- Privacy facts use a `group` reveal in reading order, including their separators.
- The urgent footnote remains a restrained `single` reveal.

## Results Choreography

### Introduction and section pacing

The results introduction and major section headers use the new Newsreader display role and `heading` reveal. Score categories, action steps, laboratory groups, and Express cards use `group` reveals. Numeric values render at their final value from the first frame.

### Risk tree construction

The risk tree keeps its current semantic navigation, lists, buttons, and CSS connectors. CSS custom properties control the reveal transform of the existing connector pseudo-elements:

- the trunk grows vertically;
- branch connectors draw from the trunk outward;
- pillar blocks and leaf buttons enter in short groups;
- protective roots enter last.

GSAP animates the custom properties on the real tree and branch elements. The trunk uses a top transform origin. Odd branch connectors draw from their top-right corner toward the branch; even branch connectors draw from their top-left corner. Their CSS defaults are the fully drawn state, so missing enhancement never removes connectors.

The tree layout effect measures the real tree before applying any initial values. If its top edge is at or above the viewport bottom, it leaves all connectors and content final and does not replay construction. Only a tree strictly below the viewport is prepared with trunk and branch scale custom properties at 0, pillar blocks at opacity 0 and `translateY(16px)`, leaf groups at opacity 0 and `translateY(10px)`, and protective roots at opacity 0 and `translateY(12px)`. Every animated block and nested leaf group carries `data-risk-tree-item`, so `[data-risk-tree-item]:focus-within` forces opacity 1 and zero transform with `!important` on both the focused group and its animated ancestors. It then attaches a once-only trigger at `top 84%`. The trunk and each branch connector tween last 550 ms; branch starts are staggered by 80 ms beginning 160 ms after the trunk. Content groups use 380 ms tweens with 60 ms stagger, overlap the connector sequence, and the complete timeline ends within 1,100 ms. The tree is never scrubbed.

### Evidence panel transition

Changing the selected risk leaf keeps focus on the selected button and immediately updates semantic content. A scoped GSAP timeline crossfades only the evidence panel content from opacity 0.82 and an 8 px Y offset over 220 ms. It never hides the panel through `visibility` and never delays accessible content. CSS forces the panel content to full opacity and zero translation while it contains keyboard focus. Browser QA verifies that the composited normal-text contrast remains at least 4.5:1 at the lowest-opacity frame.

If selection changes during the 220 ms transition, cleanup kills and reverts the previous timeline. React commits the new evidence first; the new layout effect sets that content to full opacity and zero translation before starting its own transition. Old evidence is never reinserted, and the selected tree button retains focus.

After a user-initiated leaf change, a visually hidden `role="status"` with `aria-live="polite"` and `aria-atomic="true"` announces only the localized selected evidence title. Initial render does not announce. The region and `aria-pressed` contracts remain unchanged, and the full evidence body is not duplicated into the live region.

### Long result sections

Sections using `content-visibility: auto` receive short once-only entry timelines, not pinning or scrub. `PrivateResultsRevealBoundary` rebuilds timelines in `new-content` mode and schedules one `ScrollTrigger.refresh()` in the next animation frame after insertion. No disclosure listener or MutationObserver is added.

## Component Boundaries

- `app/layout.tsx`: font family imports, CSS variables, and the bounded before-paint hero bootstrap.
- `app/globals.css`: semantic typography roles, motion targets, transform origins, static fallbacks, and responsive amplitudes.
- `app/hooks/use-decorative-motion.ts`: the synchronous capability preflight plus existing live preference and visibility status.
- `app/hooks/use-section-reveal.ts`: the declarative `single`, `heading`, and `group` reveal engine with `document` and `new-content` initialization modes.
- `app/hooks/use-landing-timeline.ts`: hero entrance, hero handoff, Atlas camera, progress fill, and existing scroll state.
- `app/components/landing.tsx`: semantic motion attributes and decorative rule elements.
- `app/components/human-atlas-scroll.tsx`: camera/progress targets, active-scene child markers, and the interrupted-safe active-scene timeline.
- `app/components/results.tsx`: semantic reveal attributes plus `PrivateResultsRevealBoundary` selection of `new-content` mode and its next-frame refresh.
- `app/components/express-results.tsx`: semantic reveal attributes only.
- `app/components/risk-tree.tsx`: risk-tree construction timeline, focus-safe item markers, evidence-panel transition, and selection status.
- `app/i18n/ui-copy.ts`: the concise English and French evidence-selection status.

The questionnaire components and `MotionScreen` behavior are not expanded by this change.
The wordmark, consent, questions, safety screens, laboratory import, intermissions, compact card headings, and risk evidence H3 remain Manrope rather than Newsreader.

## Accessibility And Fallbacks

- With JavaScript disabled, the server-rendered landing remains readable. The client-only assessment cannot produce a result route without JavaScript; the result fallback contract instead guarantees that already-mounted or isolated server-rendered result markup remains visible if decorative enhancement is unavailable.
- `prefers-reduced-motion: reduce` prevents the bootstrap attribute and forces all targets to full opacity, no transform, and fully drawn connectors.
- Missing `matchMedia` prevents bootstrap masking and causes decorative-motion hooks to return the static final state.
- Missing or non-callable ScrollTrigger is checked before any initial GSAP state is applied; hooks synchronously change any `pending` bootstrap to `static` and keep targets final.
- An Atlas image error retains the existing localized static four-chapter story. Camera and scene hooks treat missing media targets as a no-op.
- A caught decorative timeline or bootstrap setup error kills any partial timeline, clears motion-owned inline properties, changes any `pending` or `ready` bootstrap to `static`, and leaves the affected scope final and visible.
- Print media overrides inline opacity, visibility, transforms, clip paths, mask overflow, and connector custom properties.
- Focus is never moved by decorative timelines. CSS `!important` final-state overrides cover `[data-hero-item]:focus-within`, `[data-reveal-item]:focus-within`, focus-containing bare `[data-reveal]` roots, `[data-risk-tree-item]:focus-within`, and evidence-transition content, so inline GSAP opacity, transform, or clip values cannot hide a focused descendant. Existing heading focus and scale-radio focus behavior remain unchanged.
- Animation does not change DOM order, accessible names, live-region semantics, or button state.
- The risk evidence panel changes immediately in the accessibility tree even while its decorative transition runs.

## Performance

- Continuous scrub animates only opacity and transform. Connector custom properties may require style recalculation, so each connector tween runs once for 550 ms inside the at-most-1,100 ms tree construction and is never part of a scrub timeline.
- Create at most one ScrollTrigger per `[data-reveal]` root: exactly one for each valid below-viewport `document` root and each valid newly mounted `new-content` root, and zero for visible/passed `document` roots or invalid nested roots. Create one dedicated trigger only for a below-viewport risk tree, and reuse the existing Atlas ScrollTrigger for continuous motion.
- Avoid filter, background-position animation, layout dimensions, and per-letter DOM splitting.
- Use `will-change` only on actively animated Atlas layers, not globally.
- Keep the existing image asset and next/font self-hosting; no new network origin is introduced.

## Test Strategy

Implementation follows RED/GREEN development.

- Layout tests prove the Newsreader and Manrope variable-normal configuration, Newsreader `opsz`, IBM Plex Mono 400/500/600/700 normal faces, the three CSS variables, and warning-free hydration of the intentionally mutated root bootstrap attribute.
- Global CSS tests prove the explicit selector map and allowed weights, metadata floor, tabular numerals, responsive sizes, focus-within final-state overrides, reduced-motion states, print overrides, and connector final states.
- `use-section-reveal` tests prove exact initial opacity/Y values, one timeline/ScrollTrigger per eligible root, zero triggers and final state for visible/passed roots, static rejection of nested root pairs, child ordering, exact timing, backward compatibility, document/new-content initialization, cleanup, synchronous preflight, and live motion-gate behavior.
- Landing timeline tests prove the five exact hero entrance states, offsets, durations, and 820 ms bound; camera and progress targets; raw `onUpdate` fill independent of the smoothed playhead; amplitude limits; one Atlas ScrollTrigger; reverse behavior; bootstrap terminal cleanup; and missing-target fallbacks.
- Human Atlas tests prove that initial mount remains final, ordinary scene changes sequence children, interrupted changes skip the next entrance after kill/revert, and reduced motion clears inline state.
- Risk tree tests prove the viewport initialization gate, exact connector/content initial states, origins and timing, the 1,100 ms total bound, focus entering a nested leaf button during construction with both animated ancestors forced final, interrupted evidence transitions, immediate semantic evidence updates, no initial live announcement, a concise localized announcement after user selection, retained button focus, and static fallback behavior.
- Fallback tests separately simulate disabled-JavaScript landing markup, isolated static result markup, reduced motion at load, a preference change during an active tween, missing `matchMedia`, a throwing `matchMedia` or listener, missing ScrollTrigger, Atlas image failure, and a caught decorative setup error.
- Existing landing, results, focus, privacy, and print tests remain part of the regression gate.

Browser QA covers English and French at 1440×900, 390×844, and 320×700. It captures the hero, all Atlas phases, post-Atlas sections, results introduction, risk tree, score, and action plan in normal and reduced motion. It also checks horizontal overflow, hydration/console/page errors, missing `matchMedia`, keyboard focus during active tweens on the hero CTA, a depth card, a risk-tree leaf, and a result disclosure, immediate print during active tween, and asset decoding. Hero contrast is measured against the real image at the lowest handoff opacity: normal copy remains at least 4.5:1 and the large H1 at least 3:1. The settled page is also checked at 200% browser zoom, 400% reflow, and with WCAG text-spacing overrides in English and French; the title mask must not clip accents, descenders, or wrapped lines.

Final gates are TypeScript, ESLint, the full Vitest suite, production build, dependency audit, and an exact-build HTTP smoke test.

## Acceptance Criteria

- Computed font families and weights match every selector row in the explicit typography map, and the built font CSS contains the declared Newsreader/Manrope variable faces plus IBM Plex Mono 400/500/600/700 faces without synthetic styles.
- No assessment question, answer control, `MotionScreen`, or questionnaire progress element gains a new reveal marker or decorative timeline. Question prompts and non-measurement controls use Manrope; the explicit IBM Plex Mono measurement exceptions in the typography map, including `.assessment__progress`, `.pillar-progress__position`, `.pillar-progress__number`, `.question-number input`, and `.question-number__unit`, remain mono.
- At desktop width, the hero handoff never exceeds 36 px, Atlas scale never exceeds 1.035, and image translation remains below 10 px. At widths up to 850 px, the respective limits are 18 px, 1.018, and 4 px.
- In both scroll directions, the active Atlas scene matches the existing four raw-progress quarters and the `onUpdate`-driven progress fill matches raw ScrollTrigger progress within 0.02 even while the `scrub: 0.8` camera timeline trails it. An ordinary scene entrance reaches opacity 1 and zero translation by the end of its 560 ms sequence; an interrupted entrance leaves the newly active scene at that final state before the next paint.
- Conversion, depth choices, privacy facts, result sections, and the risk tree use distinct semantic sequences rather than one generic fade.
- All presentational content is visible at opacity 1 and zero transform when decorative motion is disabled, unsupported, fails setup, or enters the terminal `static` state at the 1,500 ms bootstrap guard. A layout effect that runs after that guard does not reapply an initial state; cleanup from `ready` always reaches `static`.
- During the hero handoff, normal-size copy and the CTA remain at opacity 1, the H1 stays at or above opacity 0.82 and 3:1 composited contrast, and normal copy stays at or above 4.5:1 over the real image. During evidence transitions, panel opacity stays at or above 0.82, composited normal text remains at or above 4.5:1 contrast, and focus forces the target to its final visible state.
- Switching to reduced motion during any active decorative tween settles its scope immediately to final visible state. Returning to no-preference during the same mount does not replay completed or cancelled entrance timelines.
- Mobile has no overlap or horizontal overflow at 320 px.
- Reduced motion, print, missing API, failed asset, and keyboard-focus contracts remain valid.
- No new rectangle, blur, 3D effect, per-letter animation, medical counter, tracking request, or persistent storage is introduced.
