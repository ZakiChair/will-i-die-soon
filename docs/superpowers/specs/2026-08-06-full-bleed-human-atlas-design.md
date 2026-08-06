# Full-bleed Human Atlas landing

Date: 2026-08-06
Status: approved visual direction; implementation pending

## Outcome

Remove the framed-poster appearance from the Human Atlas landing while preserving the selected artwork, the four anatomical glow maps, and the Express-first product hierarchy. The page keeps a deliberate breathing space above the artwork, then becomes edge-to-edge with no visible side bands or empty area below the first image viewport.

The transition into Breath, Strength, Sleep, and Energy remains one continuous premium scroll story: the atlas stays visually anchored while the introduction and four short chapters hand off through restrained fades, vertical movement, and targeted light.

## Approved direction

Use one continuous full-bleed Atlas stage below the existing top controls and header:

- retain one intentional `clamp(16px, 2vw, 28px)` top gap before the artwork;
- make the Atlas experience and sticky stage span the viewport width;
- remove the stage border and exposed beige fallback bands in the successful-image state;
- use a full `100svh` image stage below that gap, so the artwork extends beyond the first fold and later fills the viewport when sticky;
- keep the selected `human-atlas-hero.webp` unchanged;
- place the image and every SVG glow map in the same cover-sized coordinate frame;
- preserve the figure as the stable visual anchor throughout the story;
- transition from hero copy into the four chapters without a blank separator or a second visual canvas.

This is not an Apple visual clone. The interaction borrows the clarity and continuity of premium product scrollytelling while retaining the project's botanical anatomical atlas, editorial type, deep-teal ink, coral signals, amber energy, and electric-blue light.

## Layout

### Top breathing space

The global language control keeps its existing dimensions on every screen. On the landing only, remove `.landing`'s current top padding and the independent hero margin, keep the compact product header in normal flow, and begin the Atlas after one `clamp(16px, 2vw, 28px)` spacing token measured from the header divider. No other vertical spacer may sit between the header and the artwork. Consent, assessment, and result chrome must remain unchanged.

### Full-bleed stage

The stage spans `100%` of the viewport width. A shared `--atlas-stage-height: 100svh` token drives the sticky stage, its negative scene offset, and every scene's minimum height instead of the current `820px` ceiling. It has no visible border, inset, or surrounding background when the image loads.

The production image keeps its intrinsic `1672 / 941` geometry and current WebP SHA-256 `049911bc3c13c1151155d05c2449a629d801b9bfb3941c022e7b1a2af83f35e0`. Its intrinsic-ratio cover frame must be large enough to fill both stage dimensions without stretching. The raster and glow-set outer rectangles must match within one CSS pixel, and every SVG scene remains inside that shared frame with the existing internal glow geometry. Cropping therefore moves the image and glows together instead of scaling them independently.

Desktop cropping preserves the existing centred frame and left-side negative space for copy. Mobile keeps the current shared-frame focal rule—`left: 50%` with `translateX(-62%)`—so the source image's body axis remains near the viewport centre. Head, thorax, nervous axis, and abdomen must remain visible after the intro leaves; intro copy may overlap decorative anatomy on narrow screens. Feet or outer botanical texture may crop on unusually wide screens.

### Narrative handoff

The initial headline, description, CTA, and scroll cue occupy the first Atlas viewport. They leave through normal document scrolling and remain visible, interactive, and keyboard-focusable until physically outside the viewport; do not add an opacity-only hidden focus state. The same sticky image remains in place while the four scene texts enter in order:

1. Breath;
2. Strength;
3. Sleep;
4. Energy.

Each scene uses the existing active-state observer and activates only its matching glow. Copy moves through the artwork's negative space with a short fade and vertical settle. Avoid lateral parallax, cursor tracking, hard snap points, WebGL, and continuous per-pixel React state.

The intro occupies one shared stage height and each chapter occupies one shared stage height. After the Energy chapter completes its final stage-height interval, the sticky stage releases and the existing Express conversion follows with `margin-top: 0`. The allowed geometric gap between the Atlas story and conversion is zero CSS pixels, excluding the conversion's own border. There must be no blank viewport, exposed stage background, or sudden jump between them.

## Visual system

Retain the current Human Atlas visual direction:

- paper: `#F4F7F5`;
- ink: `#102A2A`;
- deep water: `#123E46`;
- electric blue: `#435CFF`;
- living coral: `#FF6F61`;
- signal amber: `#F4C95D`;
- Newsreader for Atlas headlines;
- Manrope for functional and explanatory copy;
- IBM Plex Mono for data labels and microcopy.

The signature remains the same body revealing four systems through light. Add no decorative badges, organ outlines, selection zones, glass cards, video, or competing illustration. Where scene copy needs contrast, use an edge-to-transparent paper wash with no rectangular border or panel shadow; it must not recreate the appearance of a framed card over the artwork.

## Responsive behavior

### Desktop and landscape tablet

- stage touches both viewport edges;
- image covers the stage with no letterboxing;
- head, thorax, nervous axis, and abdomen remain usable within the crop;
- copy stays inside a readable left safe area;
- story height and scene spacing use one shared stage-height token so sticky timing cannot drift.

### Mobile portrait

- stage remains edge-to-edge;
- the image uses a body-biased crop so head, thorax, abdomen, and nervous path stay visible;
- intro copy may overlap decorative anatomy; after it scrolls away, each chapter's active target remains visible and unobstructed;
- scene copy settles near the lower safe area and never causes horizontal overflow;
- interactive controls remain at least 44 CSS pixels.

### Reduced motion and hidden documents

Preserve the existing non-sticky reduced-motion story. Disable pulsing and transition animation, retain the deterministic static Breath glow, and keep all chapter copy in normal document flow. Hidden documents continue to pause decorative motion.

### Print and image failure

Print continues to hide the decorative stage and place the hero plus four chapter summaries in normal flow without overlap. If the image fails, switch the Atlas story to normal flow: collapse its scroll height, render a bordered paper fallback with a minimum height of `240px`, and stack all four existing chapter summaries below it. Do not retain a viewport-sized sticky or empty surface in this state.

## Accessibility and performance

- Keep the artwork and glow maps decorative and `aria-hidden`.
- Preserve semantic headings, both Express CTAs, keyboard focus, EN/FR parity, and consent focus behavior.
- Do not add a scroll listener, canvas, WebGL, remote media, analytics, or answer-dependent personalization.
- Keep transforms and opacity as the primary animated properties.
- Preserve local-only network behavior and the current LCP asset priority.
- Avoid layout shift by reserving the final stage geometry before the image loads.

## Verification

Implementation follows test-driven development.

Vitest regression coverage uses CSS-source and DOM-contract assertions; computed sticky and cover geometry remains browser QA. The new source-contract test must first fail against the current framed layout and then prove that:

- the Atlas experience is edge-to-edge on desktop and mobile;
- the stage and all five narrative intervals use the shared `100svh` height and the successful-image stage has no border;
- the media frame covers both stage dimensions while preserving the source ratio;
- mobile does not reintroduce the current `32px` inset;
- reduced-motion and print contracts remain intact;
- both Express actions and all four chapter semantics remain unchanged.

Browser QA covers `2048×1100` in English, `1365×900` in English and French, plus `390×844` and `320×700` in both languages. At each viewport verify:

- stage left and right edges match the viewport;
- at initial scroll, the stage begins one spacing token below the header divider and its bottom extends beyond the viewport bottom;
- once sticky, the stage top is zero and its height matches the visual viewport within one CSS pixel;
- the image covers all four stage edges;
- no horizontal overflow exists;
- the image and glow-set rectangles match within one CSS pixel, and each active glow remains on the same visual landmark as the approved current Atlas reference;
- the intro-to-scene and scene-to-scene transitions are continuous;
- no blank area appears below the first viewport or before the conversion section;
- reduced-motion and print fallbacks remain readable.

Run three Slow 4G / CPU 4× traces at `1365×900`. Median LCP must remain at or below `1.1s`, CLS must remain at or below `0.02`, and chapter transitions must not introduce a long task above `50ms`.

## Out of scope

- regenerating, replacing, retouching, or baking effects into the selected image;
- changing questionnaire content, scoring, consent, results, or assessment depths;
- adding video, Sora output, WebGL, canvas, 3D, or pointer-following effects;
- redesigning sections below the Atlas conversion beyond the spacing required for a smooth handoff;
- changing the site's current public access policy.
