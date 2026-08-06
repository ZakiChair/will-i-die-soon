# Bioluminescent GSAP Frontend Redesign

Date: 2026-08-06
Status: approved for implementation

## Outcome

Redesign the complete Will I Die Soon? experience as a controlled cinematic, bioluminescent interface. The new system covers the landing, consent, assessment, intermissions, results, language control, and shared chrome while preserving every existing questionnaire, scoring, privacy, evidence, and safety contract.

The visual identity remains anchored by the selected Human Atlas artwork. GSAP and ScrollTrigger add continuous, deliberate motion, but content and controls remain usable without animation. The product must feel contemporary and immersive without resembling a medical scanner, game HUD, or diagnostic instrument.

## Validated Direction

The accepted direction is `C2 - controlled cinematic` with these explicit corrections:

- use a near-black green canvas, pale mint foreground, cyan light, and coral signal colour;
- integrate light into the body artwork as diffuse glow rather than placing a green rectangle, target box, scan frame, or badge beside it;
- keep the existing Human Atlas image instead of generating a replacement;
- extend the visual system through the entire in-memory journey, not only the landing;
- use GSAP as the principal animation engine;
- keep medical boundaries and local-only behavior unchanged;
- do not add WebGL, canvas rendering, pointer tracking, smooth-scroll hijacking, or simulated diagnostic readouts.

## Visual System

### Palette

- `Abyss #041719`: page canvas and deepest sections.
- `Depth #071F22`: reading surfaces and lower navigation bands.
- `Phosphor #55F1CA`: primary actions, focus, and active progress.
- `Current #42C9FF`: atlas breath/sleep light and informational emphasis.
- `Flare #FF7154`: warnings, energy accents, and sparse contrast.
- `Mist #EFFFFC`: primary text and quiet surfaces.

Muted text, borders, and translucent surfaces are derived from these tokens. No decorative purple gradient, beige editorial field, discrete background orb, glass-card stack, or green rectangle is permitted.

### Typography

Replace the current Bricolage Grotesque, Manrope, Newsreader, and IBM Plex Mono combination across the product:

- `Space Grotesk` for display headings and the wordmark;
- `Geist` for body copy, controls, and functional labels;
- `Geist Mono` for progress, units, short metadata, and evidence labels.

All fonts load locally through `next/font/google`. Letter spacing is `0`; hierarchy comes from size, weight, line height, width, and colour. Large French and English headlines must wrap without clipping at 320 CSS pixels.

### Geometry

The layout uses square or four-pixel-radius controls, fine luminous rules, strong vertical rhythm, and full-width bands. Cards remain limited to repeated choices and result items; page sections are unframed. Fixed-format controls, progress rails, and result grids use stable responsive dimensions so animation never changes layout.

## Experience

### Landing

The compact wordmark and language control sit over the dark canvas. The first viewport contains the product name, a clear Express CTA, the Human Atlas, and a visible hint of the first chapter below the fold.

The Atlas becomes a GSAP ScrollTrigger story:

- one pinned stage drives hero, breath, strength, sleep, and energy phases;
- one scrubbed timeline crossfades copy, shifts the artwork only subtly, updates the progress rail, and blends the four existing SVG glow maps;
- the artwork remains full bleed and visually stable while illumination supplies the primary change;
- `strength` receives a real travelling signal animation instead of a static glow;
- scrolling back to the top always restores the hero/breath baseline instead of retaining a later scene;
- the Express conversion, secondary analysis depths, privacy boundary, and urgent note enter through restrained section reveals rather than appearing as a static page tail.

The hero headline becomes the validated concept, `Read the signals. Not a verdict.` / `Lisez les signaux. Pas un verdict.` The primary control remains accurately labelled `Start Express` / `Commencer Express` because it opens consent immediately.

### Consent And Assessment

Consent uses a focused, unframed reading column with the same dark system. Starting the questionnaire triggers a short opacity and vertical handoff, then moves focus according to the existing behavior.

Assessment keeps one question per screen. GSAP animates only the question sheet, progress signal, and selected answer feedback. Controls respond immediately and never wait for a decorative timeline. Intermission artwork uses slow scale and luminance changes only when motion is allowed.

### Results

Results use the same palette and typography. The introduction, urgent boundary, risk map, Express summaries, evidence, action plan, lab table, and export tools retain their content and order. ScrollTrigger reveals content bands and active progress; it does not animate numeric values, imply recalculation, or hide evidence behind motion.

## Motion Architecture

Use `gsap@3.15.0`, `@gsap/react@2.1.2`, and the bundled `ScrollTrigger` plugin. Register plugins in one client-only module. Use `useGSAP()` with scoped refs and automatic context cleanup. Use `gsap.matchMedia()` to separate desktop, compact, reduced-motion, and no-motion behavior.

Motion tiers:

1. Landing scrub timeline: pinning, phase transitions, glow blending, and progress.
2. Section reveals: one reusable hook for landing tail and results bands.
3. Screen entrances: one reusable keyed wrapper for landing, consent, assessment, and results.
4. CSS micro-interactions: buttons, focus, form selection, and ambient glow.

GSAP is progressive enhancement. Initial CSS renders every screen visibly. A failed or unavailable animation module leaves the normal document flow intact. Animations apply transforms and opacity only after setup succeeds and always revert on unmount.

## Accessibility And Resilience

- Respect `prefers-reduced-motion: reduce`: no pin, scrub, scale loop, travelling signal, or entrance offset.
- Keep all controls keyboard reachable with a high-contrast visible focus state.
- Keep semantic landmarks, headings, labels, fieldsets, and live regions unchanged.
- Do not announce decorative animation, atlas progress, or glow layers.
- Preserve the image-failure, missing-browser-API, hidden-document, and print fallbacks.
- Maintain at least 44 by 44 CSS-pixel targets and readable contrast.
- Prevent horizontal overflow and text/image overlap at 320, 390, 768, 1024, and 1440 CSS pixels.
- Do not add remote media, analytics, persistence, cookies, or answer requests.

## Component Boundaries

- `app/lib/gsap-client.ts`: client-only plugin registration and exports.
- `app/hooks/use-landing-timeline.ts`: scoped landing ScrollTrigger timeline and scene state.
- `app/hooks/use-section-reveal.ts`: reusable progressive reveal for landing tail and results.
- `app/components/motion-screen.tsx`: keyed screen entrance with static fallback.
- `app/components/human-atlas-scroll.tsx`: atlas markup and ref contract; no timeline construction.
- `app/components/landing.tsx`: product hierarchy and CTA callbacks.
- Existing journey components keep health and questionnaire logic; only presentation hooks, classes, and wrappers change.

No health data enters an animation hook. Motion consumes DOM references, breakpoint state, visibility state, and reduced-motion preference only.

## Verification

Behavioral tests must cover:

- GSAP context cleanup and reduced-motion branches;
- landing scene order, rewind-to-top behavior, CTA callbacks, and fallback content;
- screen entrance behavior without delaying focus or user actions;
- unchanged EN/FR copy completeness and questionnaire/result contracts;
- required typography and palette tokens without the forbidden green rectangle/HUD selectors.

Run TypeScript, ESLint, the full Vitest suite, production build, production dependency audit, and `git diff --check`. Visual QA must use a production server and Playwright/Chrome screenshots on desktop and mobile in English and French, covering the landing top, all Atlas scenes, consent, a question, an intermission, results, reduced motion, keyboard focus, network/storage behavior, and horizontal overflow.
