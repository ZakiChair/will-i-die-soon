# Task 2 report — typed adaptive questionnaire and curated bank

## Status

Implemented the Task 2 type contracts, pure eligibility/selection/traversal engine, and a literal English question bank. No assessment UI, scoring, lab parser, validated model, or risk-result rules were added.

## Changed files

- `app/lib/types.ts` — `Question`, `AnswerValue`, `AnswerMap`, `AnalysisDepth`, `ProfileContext`, `BranchCondition`, `HealthDomain`, and `QuestionnaireState`.
- `app/lib/questionnaire.ts` — age/answer eligibility, recursive branch evaluation, stable core reservation and priority/ID selection, depth caps, and null-aware next-question traversal.
- `app/lib/questionnaire.test.ts` — bank, metadata, domain, skip, count, ordering, age, child-route, traversal, and branch tests.
- `app/data/questions/factory.ts` — typed data-definition helper and shared branch/depth helpers.
- `app/data/questions/core.ts` — 40 core/routing questions, including 20 adult Quick items and four child-safe Quick alternatives.
- `app/data/questions/lifestyle.ts` — 54 lifestyle and wellbeing questions.
- `app/data/questions/clinical.ts` — 50 clinical-context, exposure, preventive, reproductive, vaccination, and measurement questions.
- `app/data/questions/substances.ts` — 28 tobacco, alcohol, recreational-substance, and anabolic/SARM questions.
- `app/data/questions/medications.ts` — 38 prescription, GLP-1, systemic corticosteroid, research-compound, isotretinoin, minoxidil, OTC, supplement, adherence, and interaction questions.
- `app/data/questions/labs.ts` — 18 recent-testing and lab-value questions.
- `app/data/questions/index.ts` — deterministic bank composition and domain exports.

Task 1's `Landing` and `LivingCanopy` behavior and exports were not changed.

## TDD evidence

### RED 1 — required Task 2 surface absent

After writing the bank/selector invariants and branch tests first:

```text
$ npm test -- questionnaire.test.ts
FAIL app/lib/questionnaire.test.ts
Error: Failed to resolve import "@/app/data/questions"
Test Files 1 failed (1)
exit 1
```

This was the expected missing-module failure before any Task 2 production implementation existed.

### RED 2 — conservative child routing reduced Quick below its promise

Self-review against the pediatric routing note identified that four adult-style Quick items were correctly age-gated away from under-13 users. A test was added before the child alternatives:

```text
$ npm test -- questionnaire.test.ts
FAIL questionnaire selection > keeps guardian-assisted child Quick mode at 20 with child-safe alternatives
expected length 20 but got 16
Tests 1 failed | 11 passed
exit 1
```

Four neutral, `maxAge: 12` alternatives were then added for trusted-adult support, household smoke exposure, feeling-support access, and food access. The rerun passed 12/12.

### Intermediate implementation issue

The first implementation run exposed module temporal-dead-zone errors for option constants declared after bank construction. The constants were moved before their consumers. This was an implementation correction, not a changed test expectation.

## GREEN verification

Focused questionnaire suite:

```text
$ npm test -- questionnaire.test.ts
Test Files 1 passed (1)
Tests 12 passed (12)
exit 0
```

Full suite:

```text
$ npm test
Test Files 2 passed (2)
Tests 13 passed (13)
exit 0
```

Lint:

```text
$ npm run lint
exit 0
```

Task 2 targeted strict TypeScript check:

```text
$ npx tsc --noEmit --target ES2022 --lib ES2022,DOM --module esnext \
    --moduleResolution bundler --strict --skipLibCheck --types vitest/globals \
    app/lib/types.ts app/lib/questionnaire.ts app/lib/questionnaire.test.ts \
    app/data/questions/*.ts
exit 0
```

Production build:

```text
$ npm run build
vinext build: all five environments built
Build complete
exit 0
```

`git diff --check` also exited 0.

## Exact counts

Total bank size: **228** questions.

Source-file counts:

| File | Count |
| --- | ---: |
| core | 40 |
| lifestyle | 54 |
| clinical | 50 |
| substances | 28 |
| medications | 38 |
| labs | 18 |

Adult age-35 queue counts with no answers: Quick **20**, Detailed **50**, Deep **150**. Guardian-assisted age-12 Quick count: **20**.

Domain counts:

| Domain | Count | Domain | Count |
| --- | ---: | --- | ---: |
| alcohol | 4 | anabolic-steroids | 4 |
| anxiety | 3 | blood-pressure | 6 |
| blood-testing | 5 | cannabis | 4 |
| circadian-rhythm | 5 | cognition | 2 |
| corticosteroids | 5 | current-symptoms | 4 |
| demographics | 3 | dental-health | 4 |
| diagnosed-conditions | 3 | diet | 12 |
| emergency-symptoms | 5 | environment | 6 |
| family-history | 4 | glp1 | 7 |
| hydration | 4 | interactions | 1 |
| isotretinoin | 4 | lab-values | 14 |
| measurements | 5 | medication-adherence | 2 |
| minoxidil | 5 | mood | 5 |
| movement | 7 | opioids | 4 |
| otc-medications | 2 | pregnancy | 7 |
| prescription-medications | 6 | preventive-care | 7 |
| psychedelics | 3 | recreational-drugs | 3 |
| reproductive-health | 5 | research-compounds | 5 |
| sedentary-time | 4 | sexual-health | 6 |
| sleep | 9 | social-connection | 6 |
| stimulants | 3 | stress | 5 |
| sun | 4 | supplements | 2 |
| tobacco-nicotine | 5 | vaccinations | 4 |
| work-exposures | 5 |  |  |

All 47 design domains are represented. The bank audit found 228 unique stable IDs, 228 unique prompts, no dangling condition references, and no single/multi question without options.

## Branch outcomes

- `uses_glp1=false`: **0** `glp1_detail_*` questions; `true`: **6** details.
- `has_recent_labs=false`: **0** `lab-values` questions; `true`: **14** values.
- `current_medications=false`: **0** `med_detail_*` questions; `true`: **5** details.
- Unknown branch answers also keep dependent questions ineligible; the engine does not treat missing or `null` as false.
- Deep selection never pads with ineligible items and remains capped at 200 as branches open.

## Self-review

- Selection is pure and stable: eligibility first, then tier filtering; Quick-tier core items are reserved; each group sorts by numeric priority and stable ID.
- `getNextQuestion` uses own-property presence, so `null` is a completed skip rather than an unanswered value.
- Sensitive categorical data does not duplicate `Prefer not to say`; `Question.sensitive` plus `AnswerValue`'s `null` member is the renderer contract for Task 3.
- Medication wording records exact product, route, source, status, indication, follow-up, and symptoms. It does not calculate doses, advise starting/stopping, infer product authenticity, or make suitability decisions.
- Pediatric research changed only eligibility and neutral wording. Under-13 personal substance, pregnancy, and adult mood-screen questions remain excluded, while the child Quick route retains its promised length.
- All questions have a meaningful prompt, explanatory `why`, answer type, tiers, deterministic priority, and at least one named consumer.

## Concerns and handoff notes

- A bare repository-wide `npx tsc --noEmit` still reports pre-existing configuration gaps outside Task 2: Vitest globals are not declared for `landing.test.tsx`, and the Cloudflare `Fetcher` global is not declared for `worker/index.ts`. Task 2's strict targeted typecheck, ESLint, full tests, and production build all pass.
- Node 22 emits the existing `[DEP0205] module.register()` deprecation warning through the current Vite/Vitest toolchain; it does not fail tests or build.
- Task 3 must enforce the consent/guardian screen and inject the visible `Prefer not to say` control for every sensitive categorical item. This engine supplies the age gates and null skip semantics but intentionally does not implement UI policy.
- The bank is curated prototype intake content, not a validated diagnostic instrument. Later evidence/risk tasks must continue to keep medication and substance answers out of numeric models unless a published model explicitly includes them.

## Fix round 1/5 — null branching, depth availability, adolescent routes, and sensitivity

### Findings addressed

- **Null branch leak:** branch evaluation now treats `null`, an absent key, and defensive runtime `undefined` as unresolved before evaluating `equals`, `not-equals`, or `includes`. A deliberate skip therefore unlocks no dependent questions. `getNextQuestion` continues to treat a present `null` value as a completed skip.
- **Deep minimum:** added `getAvailableDepths(bank, context, answers): AnalysisDepth[]`. It exposes a depth only when at least 20 Quick, 50 Detailed, or 150 Deep-tier questions are eligible. `buildAssessmentQueue("deep", ...)` now throws a descriptive `RangeError` below 150 rather than returning a misleading short Deep assessment.
- **Adolescent disclosure routes:** added seven `minAge: 13`, `maxAge: 17` follow-ups covering nicotine, alcohol, cannabis, other drugs, shared urgent substance safety, pregnancy support, and urgent pregnancy/safety concerns. The prompts are broad, voluntary, non-diagnostic, non-scored, time-bounded for substance use, and remain separate from adult detail branches.
- **Sensitivity policy:** `Question.sensitive` is now required as the literal type `true`; the typed factory applies it to every bank item. The invariant checks the entire bank, not just entries already flagged sensitive.
- **Answer typing:** `AnswerMap` is now `Readonly<Partial<Record<string, AnswerValue>>>`. A missing key is unanswered; `null` is the only explicit skip value. `AnswerValue` excludes `undefined`.

### RED evidence

The first fix tests were written before implementation:

```text
$ npm test -- questionnaire.test.ts
Test Files 1 failed (1)
Tests 3 failed | 12 passed (15)

FAIL marks every health question sensitive and leaves skip rendering to controls
expected false to be true

FAIL treats null and missing gates as unresolved for not-equals branches
expected true to be false

FAIL offers adolescents broad support and urgent-safety follow-ups without adult details
expected adolescent follow-up IDs, received none
exit 1
```

After those three behaviors were green, the separate Deep-availability tests were added first:

```text
$ npm test -- questionnaire.test.ts
Test Files 1 failed (1)
Tests 2 failed | 15 passed (17)

FAIL advertises Deep only when the profile has at least 150 eligible Deep items
TypeError: getAvailableDepths is not a function

FAIL rejects unavailable Deep queues instead of returning a misleading short assessment
expected function to throw an error
exit 1
```

### GREEN outcomes

Focused questionnaire suite after both RED→GREEN cycles:

```text
$ npm test -- questionnaire.test.ts
Test Files 1 passed (1)
Tests 17 passed (17)
exit 0
```

Full suite:

```text
$ npm test
Test Files 2 passed (2)
Tests 18 passed (18)
exit 0
```

Lint:

```text
$ npm run lint
exit 0
```

Task 2 strict targeted typecheck:

```text
$ npx tsc --noEmit --target ES2022 --lib ES2022,DOM --module esnext \
    --moduleResolution bundler --strict --skipLibCheck --types vitest/globals \
    app/lib/types.ts app/lib/questionnaire.ts app/lib/questionnaire.test.ts \
    app/data/questions/*.ts
exit 0
```

Production build:

```text
$ npm run build
vinext built all five environments
Build complete
exit 0
```

### Updated exact audits

- Bank total: **235** questions, all **235** explicitly sensitive.
- Updated source counts: core **40**, lifestyle **54**, clinical **52**, substances **33**, medications **38**, labs **18**.
- Updated affected domain counts: tobacco-nicotine **6**, alcohol **5**, cannabis **5**, recreational-drugs **5**, pregnancy **9**. Other domain counts remain as listed in the initial report.
- Age 12: **108** eligible Deep-tier items; available depths are Quick and Detailed; direct Deep construction rejects.
- Age 15: **127** eligible Deep-tier items; available depths are Quick and Detailed; direct Deep construction rejects.
- Age 35: **150** eligible Deep-tier items; Quick, Detailed, and Deep are available; queues remain 20, 50, and 150.
- Skipped `alcohol_frequency: null`: **0** alcohol detail questions.
- A second synthetic `not-equals` gate with `null`: **0** dependents.
- Adult detail questions remain excluded at age 15; all seven adolescent follow-ups are eligible when their gates are affirmatively answered.

### Fix-round concerns

- Task 3 must call `getAvailableDepths` before presenting depth choices and handle the defensive Deep `RangeError` if profile/answer eligibility changes.
- The existing Node `[DEP0205] module.register()` warning remains non-failing in tests and builds.
- The pre-existing bare repository-wide TypeScript configuration gaps noted above are unchanged; the strict Task 2 target, lint, full tests, and production build pass.
