# Four-pillar visual system

Date: 2026-08-04
Status: approved direction; implementation pending written-spec review

## Outcome

Replace the ambiguous interactive canopy with a calm botanical visual system and organise the assessment and results around four understandable health pillars:

1. Cardio, VO2 max & cellular energy
2. Strength, nervous system & recovery
3. Sleep & circadian rhythm
4. Nutrition & metabolic health

The change simplifies navigation and presentation. It does not turn the prototype into a diagnostic tool, add disease probabilities, or change a risk rule's condition, evidence tier, urgency, or action.

## User problem

The landing illustration currently overlays four controls labelled Sleep, Heart, Habits, and Care. They look actionable, but activating one only changes colours and branch lengths. There is no destination, explanation, filter, or analysis behind the action. This is a false affordance and an accessibility problem because focus is also represented as a pressed state.

The botanical art itself is strong and should become the consistent visual signature of the product. The interface needs to preserve that art while removing the decorative interaction and giving the long questionnaire a clear four-part rhythm.

## Scope

### In scope

- Remove all decorative canopy buttons, lines, pressed state, and hover-dependent meaning from the landing page and assessment rail.
- Reuse the static botanical artwork as an ambient, non-repeating background on landing, consent, assessment, lab import, and results.
- Add a typed, bilingual four-pillar presentation model for questions, chapter progress, intermissions, and result-tree branches.
- Preserve the existing adaptive depth contracts: Quick 20, Detailed 50, and Deep 150–200 questions.
- Preserve the existing local-only lab import, urgent interruption, child/adolescent routing, evidence links, Purity Score boundary, and EN/FR switching.
- Reuse the existing sleep, recovery, and metabolism artwork; generate one missing cardio/cellular-energy artwork.
- Keep the existing botanical landing loop and add at least one lightweight pillar-transition loop, with static fallbacks.
- Verify desktop/mobile, EN/FR, keyboard navigation, reduced motion, print, and asset/network behaviour.

### Out of scope

- Estimating VO2 max from questionnaire answers as if it were measured.
- Claiming to measure mitochondrial function.
- Introducing new disease probabilities, clinical thresholds, treatment advice, or medication dosing.
- Rewriting the underlying 54 risk-rule conditions or changing evidence tiers.
- Uploading answers, laboratory documents, or extracted values to a server.
- Autoplaying video throughout the questionnaire or results page.

## Information architecture

### Intake and safety

Consent, age/country context, profile measurements, and immediate red-flag routing remain ahead of or above the four pillars. This is not a fifth health pillar; it is the safety envelope for the experience. A triggered urgent signal continues to interrupt the normal sequence immediately.

Medication, substance, laboratory, and care-access answers are cross-cutting inputs. Each question has one primary presentation pillar so it appears only once, while its consumers and risk rules may influence more than one result.

### Four pillars

| Pillar | User-facing purpose | Representative inputs | Presentation boundary |
| --- | --- | --- | --- |
| Cardio, VO2 max & cellular energy | Explore circulation, breathing capacity, activity tolerance, and energy-production context. | Movement, sedentary time, blood pressure, tobacco/nicotine, cardiopulmonary symptoms, relevant family history and labs. | A self-reported or imported VO2 max is labelled as reported data. Without a suitable test, the product discusses associated signals only. |
| Strength, nervous system & recovery | Explore force production, neuromuscular function, recovery load, stress, cognition, and exposure effects. | Resistance activity, function, injuries, cognition, mood/stress, anabolic steroids, peptides/research compounds, stimulants and other relevant substances or medicines. | No questionnaire response is described as a direct neurological or endocrine measurement. |
| Sleep & circadian rhythm | Explore sleep opportunity, quality, timing, breathing symptoms, alertness, and recovery. | Sleep duration, schedule, snoring/apnoea signals, daytime sleepiness, shift patterns, sedating or stimulating exposures. | The pillar reports patterns and follow-up signals, not a sleep-disorder diagnosis. |
| Nutrition & metabolic health | Explore intake, hydration, body measurements, appetite, metabolic context, and relevant laboratory follow-up. | Diet, hydration, alcohol, weight/height, GLP-1 use, supplements, glucose/lipid/liver/kidney-related labs. | The pillar keeps medication safety and laboratory confirmation language distinct from lifestyle suggestions. |

The physiological wording follows the integrated definition of cardiorespiratory fitness: circulatory and respiratory systems deliver oxygen to skeletal-muscle mitochondria for energy production. That connection supports the first pillar, but it does not make a questionnaire a direct VO2-max or mitochondrial assay. See the American Heart Association scientific statement: <https://www.ahajournals.org/doi/10.1161/CIR.0000000000000866>.

## Data and component design

### Typed presentation mapping

Add a pure presentation module with a closed union such as:

```ts
type HealthPillar = "cardio-energy" | "strength-neural" | "sleep-circadian" | "nutrition-metabolic";
```

The module owns:

- the ordered pillar list;
- bilingual copy keys and artwork identifiers;
- an exhaustive `HealthDomain` default mapping;
- explicit question-level overrides for cross-cutting domains;
- an exhaustive risk-rule-to-pillar mapping.

Tests must prove that every question and every non-deprecated risk rule resolves to exactly one primary pillar. Conditions, factors, inputs, source IDs, evidence tiers, urgency, and signals remain untouched.

### Questionnaire chapters

The selected adaptive queue is grouped into the four pillar chapters after eligibility and depth selection. Question selection counts do not change. Within a pillar, existing priority and stable ID order are preserved.

Conditional routing must remain valid. The implementation must test that a gate question is in the same or an earlier pillar than every question it can reveal. If a current mapping violates that invariant, the dependent question receives an explicit presentation override; the branch logic itself is not changed.

The assessment UI shows:

- the current pillar name and position, for example `02 / 04`;
- overall answered-question progress;
- the existing, smaller question typography;
- a chapter transition only when the next unanswered question enters a new pillar.

Back navigation and reconciliation may return to an earlier pillar when an answer changes eligibility. The visible pillar is always derived from the current question rather than maintained as separate mutable state.

### Results tree

The result tree has exactly four primary branches, one for each pillar. Urgent signals remain in the prominent summary above the tree and also remain selectable under their primary pillar so the evidence notebook is not lost. Urgency and evidence-tier labels stay visible on each leaf and in its evidence panel.

Protective roots appear as a shared foundation below the four branches, not as a fifth branch. Empty pillars use a calm bilingual empty state. The first available leaf remains selected by default, and every leaf button continues to control the evidence panel with an explicit accessible relationship.

### Purity Score

The score remains a separate reflective device. Its mathematical components are not silently collapsed into four medical scores. The four pillars may be used as navigation headings, but the existing coverage warnings and non-diagnostic wording remain unchanged.

## Visual system

### Signature artwork

`/media/canopy-hero.webp` becomes a cached, static ambient layer. It is never tiled and never interactive. Its peripheral branches frame the page while its light centre remains behind reading surfaces.

Suggested tokens:

```css
--motif-canopy: url("/media/canopy-hero.webp");
--motif-wash: rgb(244 247 245 / 92%);
--motif-wash-dense: rgb(244 247 245 / 96%);
--surface-readable: rgb(255 255 255 / 88%);
```

- Landing: the artwork remains strongest in the hero, without boxes, generated branches, or active states.
- Consent and questionnaire: a faint top-anchored motif frames opaque or near-opaque content surfaces.
- Lab import: the densest wash and most opaque panel protect form and table readability.
- Results: the motif is visible around major sections, while the risk tree, evidence notebook, and data tables keep solid contrast.
- Mobile: the artwork is recropped, not repeated; no horizontal overflow.
- Print: all ambient artwork and video are removed.

The palette remains paper, ink, deep water, electric blue, coral, and amber. Blue is reserved for real selection/progress/link states. Decorative branches no longer change colour.

### Media rhythm

Media appears at chapter transitions, not behind individual answer controls. This keeps long assessments engaging without turning every question into a loading event.

- Reuse the sleep, recovery, and metabolism WebP intermissions.
- Generate one cardio/cellular-energy WebP in the same botanical-scientific art direction.
- Keep the current landing MP4 as one motion moment.
- Add at least one second short, silent, local MP4 for a pillar transition; target a small encoded size and lazy loading.
- Video is muted, inline, looped, nonessential, hidden when the document is not visible, and replaced by the poster when reduced motion is requested or playback fails.
- No remote media, analytics beacon, CDN worker, or user-specific asset request is introduced.
- Generated-media provenance is recorded accurately; the interface does not claim a particular generator unless that generator was actually used.

## Accessibility and privacy

- No decorative element is focusable or exposed as a control.
- Pillar progress uses text as well as colour.
- Focus remains visible and moves to the new chapter heading after a transition.
- Touch targets remain at least 44 by 44 CSS pixels.
- All content remains complete in English and French; French expansion is tested at narrow widths.
- `prefers-reduced-motion` yields a static experience with no loss of information.
- No answers, locale choice, laboratory file, OCR output, or questionnaire state are persisted.
- Existing local PDF/image/text parsing and local OCR assets remain unchanged.

## Error handling

- A missing or failed motion asset falls back to its static poster without an error dialog.
- A missing pillar artwork falls back to the global paper-and-canopy surface.
- An unmapped question or active rule fails tests and development builds rather than silently entering a catch-all branch.
- Empty result pillars render explicit empty copy; they never disappear, preserving the promised four-part model.

## Test strategy

Implementation follows red-green-refactor.

1. Add failing unit tests for exhaustive question/rule mapping, ordered pillars, and gate-before-dependent invariants.
2. Add failing component tests proving the old Sleep/Heart/Habits/Care buttons and pressed states are absent.
3. Add failing assessment tests for four-pillar ordering, chapter transitions, adaptive branch reconciliation, and unchanged 20/50/150–200 depth contracts.
4. Add failing results tests for exactly four branches, urgent-summary preservation, evidence-panel selection, protective foundations, and bilingual empty states.
5. Add failing media/CSS tests for local posters, lazy transition video, reduced-motion fallback, print removal, and readable surfaces.
6. Run the complete TypeScript, ESLint, Vitest, production build, dependency audit, and clean-tree checks under the pinned Node 24 toolchain.
7. Perform browser QA at desktop and 390-pixel mobile widths in EN and FR, including keyboard-only navigation, reduced motion, no storage/cookies, no overflow, and local-only network hosts.

## Acceptance criteria

- The landing illustration contains no clickable Sleep/Heart/Habits/Care overlay and no decorative colour-changing bars.
- The botanical artwork visually frames every major screen without reducing text/form contrast or print clarity.
- The questionnaire presents four ordered pillars while preserving adaptive routing and exact depth budgets.
- The results tree presents exactly four pillar branches; urgent alerts remain prominent and evidence remains inspectable.
- Existing health rules and source provenance are unchanged except for explicit presentation metadata.
- At least four pillar-appropriate static visuals and two local motion moments exist, with reduced-motion and failure fallbacks.
- English and French are complete on desktop and mobile.
- All automated and manual release gates pass before a new private deployment is created.
