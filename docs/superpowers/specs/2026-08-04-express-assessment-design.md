# Express assessment design

Date: 2026-08-04  
Status: approved for implementation

## Outcome

Add a first-class, adult-only `Express` assessment alongside Quick, Detailed,
and Deep. Express asks exactly nine targeted questions in under one minute and
returns four transparent summaries: VO₂ max, strength, sleep, and nutrition.

Express is a concise performance-and-habits snapshot. It does not diagnose,
predict mortality, calculate the adult Purity Score, or assign unsupported
fitness categories.

## Scope

### In scope

- Add `express` to the canonical `AnalysisDepth` union.
- Show Express first on the landing page with accurate English and French copy.
- Make Express available only for profiles aged 18 or older.
- Select exactly nine stable question IDs, without adaptive branches.
- Add three adult-only numeric questions for reported VO₂ max, squat one-rep
  maximum, and deadlift one-rep maximum.
- Reuse six existing questions for sleep, body context, and nutrition.
- Skip chapter intermissions and laboratory import in Express.
- Present a dedicated four-card Express result with transparent raw values and
  strength-to-body-weight ratios.
- Preserve in-memory privacy, bilingual switching, keyboard access, explicit
  skipping, print, redacted export, and restart behaviour.
- Add unit, questionnaire, component, result, localization, and export tests.

### Out of scope

- Estimating VO₂ max from questionnaire answers.
- Asking the user to perform a maximal lift or fitness test.
- Classifying VO₂ max or strength as poor, average, good, or elite.
- Calculating BMI or body-composition claims from height and weight.
- Producing a global Express score or Purity Score.
- Changing the Quick 20, Detailed 50, or Deep 150–200 selection contracts.
- Changing an existing risk rule, evidence source, or release-policy gate.

## User journey

1. The landing page presents Express before the three existing depths. Its
   detail line says that it contains nine targeted questions and takes under a
   minute; its description names the four summaries and states that it is for
   adults.
2. Consent continues to collect age, country, and acknowledgement. An adult can
   start Express. A minor sees a localized explanation and can switch to Quick.
3. Express uses the existing one-question-per-screen interaction and overall
   progress, but it shows no initial or between-pillar intermission.
4. Express never opens the laboratory-import detour because its curated queue
   does not include the laboratory gate.
5. Completion opens a dedicated Express summary before the shared print,
   redacted-export, and restart actions.

## Canonical questionnaire contract

Express selects these exact IDs, grouped in the existing pillar order:

| Position | Pillar | Question ID | Source | Unit / response |
| --- | --- | --- | --- | --- |
| 1 | Cardio | `reported_vo2_max_ml_kg_min` | new | ml/kg/min |
| 2 | Strength | `squat_one_rep_max_kg` | new | kg |
| 3 | Strength | `deadlift_one_rep_max_kg` | new | kg |
| 4 | Sleep | `usual_sleep_hours` | existing | hours |
| 5 | Sleep | `sleep_refreshed` | existing | 0–10 scale |
| 6 | Nutrition / body context | `height_cm` | existing | cm |
| 7 | Nutrition / body context | `weight_kg` | existing | kg |
| 8 | Nutrition | `plant_food_frequency` | existing | portions/day |
| 9 | Nutrition | `diet_ultra_processed` | existing | frequency choice |

The three new questions are `minAge: 18` and Express-only. The six reused
questions add Express to their existing tier list without changing their
participation in Quick, Detailed, or Deep.

Express selection is an explicit curated contract, not `slice(0, 9)`. Queue
construction and reconciliation must reject an Express route when the profile
is under 18 or any required definition is unavailable. Express has no branch
conditions, so its queue remains stable as answers are recorded or skipped.

The VO₂ max prompt accepts a previously measured or device-estimated value. The
strength prompts accept a one-repetition maximum already completed with the
user's normal safe technique. Their supporting copy explicitly says not to
perform a new maximal effort for this questionnaire.

For Express, the skip action reads “I don't know or prefer not to answer” (and
its French equivalent). It stores the same canonical `null` used elsewhere;
the result treats it as missing rather than as zero.

## Result model

A pure Express-summary helper reads the nine answers and produces display data
without mutating the risk engine or Purity Score:

- **VO₂ max:** reported value and unit, or a missing-value message. A note says
  that device estimates and test protocols can differ.
- **Strength:** squat and deadlift kilograms. When body weight is a positive
  finite number, each available lift also shows `load / body weight`, rounded
  consistently to two decimals. Missing or zero weight suppresses the ratio.
- **Sleep:** usual hours and refreshed score out of ten, with missing values
  shown explicitly.
- **Nutrition:** daily fruit-and-vegetable portions and the localized
  ultra-processed-meal frequency label.

Height and weight appear once as neutral body context above or within the
strength summary. No BMI, ranking, colour-coded judgment, or inferred value is
produced. A concise boundary explains that the summary reports answers and is
not a fitness test or medical assessment.

The existing qualitative risk engine may continue to evaluate compatible
answers internally, but Express does not manufacture extra clinical leaves to
fill empty pillars. The dedicated summary is the promised result surface.
Express receives the same no-number score state as Quick, represented by an
explicit Express reason rather than accidentally falling through Detailed or
Deep coverage logic.

## Components and data flow

- `AnalysisDepth` becomes `"express" | "quick" | "detailed" | "deep"`.
- Landing imports the canonical type instead of maintaining a duplicate union.
- Questionnaire limits, minimums, order, and availability include Express, with
  a dedicated curated-ID selection path.
- The question bank adds the three metrics and explicitly tags the six reused
  questions for Express.
- Health-pillar overrides map VO₂ max to Cardio and both lifts to Strength.
- `Assessment` derives `isExpress` from depth and suppresses intermissions. Its
  normal answer, back, urgent-check, locale, focus, and completion paths remain
  shared.
- `Results` derives an Express summary through a pure helper and renders four
  accessible cards. Other depths retain their existing result paths.
- Export continues to carry the canonical `assessmentDepth: "express"` and
  validated structured answers; no new private metadata is added.

## Interface direction

Express uses the existing botanical notebook visual language. The landing card
is distinguished through hierarchy and concise copy, not a new palette or a
competing illustration. The four-card result grid follows the established
pillar order and uses typographic values rather than gauges or traffic-light
colours. Responsive behaviour is one column on narrow screens and two or four
columns as space allows.

## Error and edge handling

- Non-finite, missing, zero, or negative body weight never produces a ratio.
- Missing lift or VO₂ max answers render as unknown, never zero.
- A minor Express route cannot construct an assessment even if invoked outside
  the consent UI.
- A missing curated question definition fails deterministically in tests and
  throws a descriptive development/runtime error instead of silently shortening
  the queue.
- Language switching preserves drafts, answers, current position, and canonical
  numeric values.
- Print remains legible and decorative motion remains suppressed according to
  the existing print and reduced-motion rules.

## Test strategy

Implementation follows red-green-refactor.

1. Add failing questionnaire tests for the four-depth type contract, adult
   availability, exact nine-ID Express queue, stable reconciliation, and minor
   rejection.
2. Add failing bank and localization tests for the three new questions, their
   units, French prompts, and the six reused Express tiers.
3. Add failing landing/consent tests for ordering, bilingual copy, adult start,
   and minor Quick fallback.
4. Add failing assessment tests proving `1/9`, no intermissions, normal back/
   skip behaviour, and completion after exactly nine answers.
5. Add failing pure-summary tests for raw values, two-decimal ratios, and all
   missing/invalid-weight cases.
6. Add failing result tests for exactly four summaries, no global score or
   unsupported ranking, bilingual labels, print/export/restart continuity.
7. Run focused tests after each implementation slice, then TypeScript, ESLint,
   the full Vitest suite, production build, audit, and diff checks.

## Acceptance criteria

- Landing visibly offers Express first as nine adult questions in under one
  minute.
- An adult completes exactly nine questions with no chapter intermission or lab
  import.
- A minor cannot start Express and can switch to Quick.
- The result contains VO₂ max, Strength, Sleep, and Nutrition summaries, plus
  neutral height/weight context.
- Strength ratios are correct and omitted when weight or lift data is missing.
- No Express score, BMI, normative fitness category, diagnosis, or new clinical
  claim appears.
- Quick remains exactly 20, Detailed exactly 50, and Deep 150–200.
- English and French, keyboard navigation, reduced motion, print, privacy, and
  redacted export retain their existing guarantees.
