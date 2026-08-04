# Question typography hierarchy design

Date: 2026-08-04  
Status: approved for implementation

## Product context

Will I Die Soon? is a private bilingual health-reflection questionnaire. The assessment screen has
one job: let a person understand one question, see its response controls, and answer without the
interface itself creating stress or fatigue.

The existing botanical field-guide identity remains the visual foundation:

- paper: `#F4F7F5`;
- ink: `#102A2A`;
- deep water: `#123E46`;
- electric blue: `#435CFF`;
- living coral: `#FF6F61`;
- the existing display, body, and data typefaces retain their current roles.

The signature treatment is a two-level question composition: a short, confident question title
followed by calm, complete medical criteria. This is the user-approved visual option C.

## Verified problem

At the viewport represented in the user screenshot, the current screen combines:

- a `.72fr / 1.28fr` assessment split;
- a gap that can reach 100 px;
- question-sheet padding that can reach 64 px;
- a question heading of `clamp(1.9rem, 3.4vw, 3.75rem)`;
- the complete localized prompt inside one `h1`.

The French `urgent_breathing_now` prompt contains 42 words. It wraps to roughly eleven visible
lines and pushes the first response below the initial viewport. The rail consumes roughly
36–40 percent of the composition while leaving a large empty field below its progress controls.

The screenshot shows the ordinary question screen, not the post-answer urgent interruption.
Changing `.assessment--urgent` would therefore miss the reported problem.

## Goals

1. Make every question screen calm, readable, and visually proportionate.
2. Keep the first answer control visible without initial scrolling for the densest supported prompt
   at a 1365 × 800 CSS-pixel desktop viewport.
3. Preserve an expressive title for short prompts without forcing long prompts into poster-scale
   typography.
4. Preserve the complete meaning of every question in English and French.
5. Preserve keyboard focus, screen-reader relationships, mobile containment, reduced motion, and
   print behavior.

## Non-goals

This change does not alter:

- question IDs, eligibility, ordering, depth budgets, branching, or answer values;
- urgent interruption behavior;
- risk rules, evidence, scoring, result trees, or action advice;
- canonical question prompts or raw/localized export content;
- lab parsing, storage, network behavior, privacy boundaries, or Sites access.

## Layout

### Desktop

The assessment remains a two-column field guide, but the rail becomes supporting context rather
than half of the experience.

- Assessment columns: approximately 26% rail and 74% question.
- Grid: `minmax(230px, .52fr) minmax(0, 1.48fr)`.
- Gap: `clamp(24px, 4vw, 56px)`.
- Question-sheet padding: `clamp(24px, 3.5vw, 48px)`.
- The four pillar chapters stack in one column in the desktop rail.
- The rail remains sticky and the overall progressbar remains quantitative.
- The question sheet keeps the readable translucent surface and clipped lower corner.

At the target viewport this yields a question content measure near 740–780 px instead of roughly
630 px.

### Tablet and mobile

- At 850 px and below, the existing single-column assessment layout remains.
- At 560 px and below, the question sheet uses the existing compact horizontal padding.
- Pillar chapters remain a single vertical list.
- No element may increase the document width beyond the viewport at 320, 390, or 560 px.

## Typography

### Ordinary prompt title

Questions without a curated split render their unchanged prompt as the title.

- Desktop size: `clamp(2.125rem, 2.75vw, 2.75rem)` (34–44 px).
- Mobile size: `clamp(1.75rem, 7vw, 2.125rem)` (28–34 px).
- Weight: 550–600 using the existing display face.
- Line height: 1.08.
- Letter spacing: `-0.035em`.
- Measure: `max-width: 28ch` where the content width permits.
- Margin without a detail: 10 px above and `clamp(28px, 4vw, 40px)` below.

### Split prompt title

Curated dense prompts use a short title with the same title scale. The title remains the accessible
label for the answer fieldset. Its margin is 10 px above and 10–14 px below, replacing the ordinary
prompt’s larger bottom margin.

### Prompt details

- Desktop size: `clamp(1rem, 1.2vw, 1.125rem)` (16–18 px).
- Mobile size: 1rem.
- Line height: 1.55.
- Weight: 450–500 using the body face.
- Color: deep water mixed toward the muted text token, while retaining WCAG AA contrast.
- Measure: `max-width: 64ch`.
- Spacing: 10–14 px below the title and 22–28 px above the first response.

The detail is not an optional “why we ask” explanation. It is part of the question and must remain
visible without disclosure controls.

## Curated dense prompts

No automatic punctuation or word-count splitter is allowed. Automated splitting can remove context,
separate a qualifier from a criterion, or produce different meanings between languages.

The initial explicit bilingual split set is:

1. `urgent_breathing_now`
2. `adolescent_substance_severe_timing`
3. `urgent_severe_allergy_now`
4. `corticosteroid_detail_infection_context`
5. `urgent_stroke_signs_now`
6. `isotretinoin_detail_symptoms`
7. `glp1_detail_relevant_history`
8. `minoxidil_detail_cardiac_symptoms`

These are the prompts that reach at least 28 words in one supported locale in the current catalog.
The list is explicit so copy changes cannot silently restructure a question.

The approved reference treatment for `urgent_breathing_now` is:

**English title**

> Are there signs of severe breathing difficulty right now?

**English detail**

> Struggling to breathe, being unable to speak normally, or turning blue or grey; or, for a child,
> grunting, sucking in under the ribs, becoming limp, or not responding normally.

**French title**

> Y a-t-il actuellement des signes de détresse respiratoire grave ?

**French detail**

> Grande difficulté à respirer, impossibilité de parler normalement, peau bleue ou grise ; ou,
> chez un enfant, geignement respiratoire, creusement sous les côtes, mollesse ou réaction anormale.

The remaining approved pairs are:

### `adolescent_substance_severe_timing`

**English title:** When did the serious substance-related event happen?  
**English detail:** Collapse, a seizure, severe breathing trouble, chest pain, or another immediate
substance-related safety concern — happening now or during the past twelve months.

**French title:** Quand l’événement grave lié à une substance s’est-il produit ?  
**French detail:** Effondrement ou perte de connaissance, convulsion, graves difficultés
respiratoires, douleur thoracique ou autre problème de sécurité immédiat lié à une substance —
actuellement ou au cours des douze derniers mois.

### `urgent_severe_allergy_now`

**English title:** Are there signs of a severe allergic reaction right now?  
**English detail:** Sudden swelling of the lips, mouth, tongue, or throat; trouble breathing or
swallowing; or collapse.

**French title:** Y a-t-il actuellement des signes de réaction allergique grave ?  
**French detail:** Gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge ;
difficultés à respirer ou à avaler ; effondrement ou perte de connaissance.

### `corticosteroid_detail_infection_context`

**English title:** While using corticosteroids, do any infection or major physical-stress situations
apply?  
**English detail:** Fever or infection signs; recent chickenpox or shingles exposure; severe illness;
surgery; or major injury.

**French title:** Pendant l’utilisation de corticostéroïdes, l’une de ces situations d’infection ou
de stress physique important s’applique-t-elle ?  
**French detail:** Fièvre ou signes d’infection ; exposition récente à la varicelle ou au zona ;
maladie sévère ; intervention chirurgicale ; ou blessure grave.

### `urgent_stroke_signs_now`

**English title:** Have there been possible stroke signs in the last 24 hours?  
**English detail:** Sudden facial droop, one-sided weakness, or new trouble speaking — even if the
signs have stopped.

**French title:** Y a-t-il eu des signes possibles d’AVC au cours des dernières 24 heures ?  
**French detail:** Affaissement soudain du visage, faiblesse d’un seul côté ou nouvelles difficultés
à parler — même si les signes ont disparu.

### `isotretinoin_detail_symptoms`

**English title:** Have you had any serious symptoms while using isotretinoin?  
**English detail:** Severe headache; vision change; severe abdominal pain; mood or behavior change;
or a blistering rash.

**French title:** Avez-vous eu des symptômes graves pendant l’utilisation d’isotrétinoïne ?  
**French detail:** Maux de tête sévères ; changement de vision ; douleur abdominale sévère ;
changement d’humeur ou de comportement ; ou éruption cutanée avec des cloques.

### `glp1_detail_relevant_history`

**English title:** Do any of these medical-history factors apply to you?  
**English detail:** Pancreatitis; gallbladder disease; severe delayed stomach emptying; kidney
disease; diabetic eye disease; or MEN2.

**French title:** L’un de ces éléments de vos antécédents médicaux s’applique-t-il ?  
**French detail:** Pancréatite ; maladie de la vésicule biliaire ; retard sévère de la vidange
gastrique ; maladie rénale ; atteinte oculaire diabétique ; ou MEN2.

### `minoxidil_detail_cardiac_symptoms`

**English title:** Have you had any concerning symptoms while using minoxidil?  
**English detail:** Chest pain; rapid heartbeat; faintness; breathlessness; swelling; or
sudden weight gain.

**French title:** Avez-vous eu des symptômes préoccupants pendant l’utilisation de minoxidil ?  
**French detail:** Douleur thoracique ; rythme cardiaque rapide ; étourdissement ou évanouissement ;
essoufflement ; gonflement ; ou prise de poids soudaine.

Each combined title/detail must be compared with the unchanged canonical prompt before release.

## Presentation architecture

Introduce a presentation-only value:

```ts
type QuestionPromptPresentation = {
  title: string;
  detail?: string;
};
```

A pure presentation function receives the canonical question ID and active locale and returns this
value. Its data source is an exhaustive typed map for the eight curated IDs in both locales.

For every other question, the fallback is:

```ts
{ title: presentedQuestion.prompt }
```

The function does not mutate `Question`, answers, or localization state. Canonical and localized
full prompts continue to drive exports and existing completeness checks.

## Component semantics

Create a small prompt component responsible only for question copy:

- the title renders as the existing focused `h1#question-title`;
- when present, the detail renders as a visible paragraph with a stable ID;
- the answer `fieldset` keeps `aria-labelledby="question-title"`;
- when detail exists, the fieldset also receives `aria-describedby` pointing to that paragraph;
- locale switches update title and detail without changing the canonical answer or current position;
- focus remains on the title after question navigation and is not stolen by a locale rerender.

The component must not inspect answer values, risk rules, or profile state.

## Failure behavior

- Missing curated copy in either locale is a test failure.
- At runtime, an unavailable or invalid curated entry falls back to the complete presented prompt as
  the title; the interface must never hide medical criteria.
- A missing detail removes `aria-describedby` rather than leaving a dangling reference.
- Unsupported locale values remain impossible through the existing locale type.

## Verification

Implementation follows red-green-refactor.

### Automated tests

1. Replace the brittle CSS regex that locks the old heading clamp with assertions for the new title,
   detail, grid, gap, padding, desktop rail list, and mobile sizes.
2. Test the pure presentation function:
   - all eight IDs have English and French title/detail pairs;
   - ordinary questions fall back to the complete localized prompt;
   - the canonical question objects are unchanged.
3. Test the prompt component:
   - title and detail render visibly;
   - the fieldset has correct `aria-labelledby` and `aria-describedby`;
   - an ordinary question has no dangling description;
   - EN ↔ FR switching preserves answer and focus behavior.
4. Keep the existing 243-question, 47-domain, 54-rule, budget, branching, export, urgent, and result
   suites green.

### Browser checks

- 1365 × 800: the French `urgent_breathing_now` title, full detail, and first answer are all visible
  in the initial viewport.
- 1440 × 900: a short English prompt remains visually prominent without excessive empty space.
- 390 × 844 and 320 × 720: no horizontal overflow; title and detail remain readable; response
  controls preserve their touch targets.
- 200% zoom: question order and reading relationships remain intact.
- Keyboard: focus lands on the title and moves naturally into the response controls.
- Reduced motion and print: no regressions.

### Release gates

- Vitest full suite.
- TypeScript without incremental state.
- ESLint.
- Vinext production build.
- Production dependency audit.
- Focused authenticated check on the private Sites deployment after saving the exact source SHA.

## Acceptance criteria

The change is complete when:

- option C is implemented in both languages;
- the first response is visible for the densest reference question at 1365 × 800;
- the full medical criteria remain visible and accessible;
- no algorithmic or exported value changes;
- desktop, mobile, keyboard, zoom, reduced-motion, and print checks pass;
- the private deployment remains owner-only.
