# Task 5 report — evidence-tiered qualitative risk engine

## Status

Implemented the audited evidence registry, release-policy gates, transparent qualitative
risk engine, immediate safety routing, questionnaire safety additions, and accessible
same-answer interruption. The private prototype emits no probability, does not parse free
text or printed laboratory strings, and does not diagnose a condition.

## Changed files

- `app/data/evidence.ts` — 43 reviewed authoritative source records, including the exact
  Swiss FOPH addiction-help and UFI emergency URLs and age-applicable child/adolescent
  sources.
- `app/data/rules.ts` — 14 explicit rule groups with structured gates, sources, factors,
  evidence tiers, urgency, applicability, de-duplication keys, and audited omission notes.
- `app/lib/release-policy.ts` — private-prototype, public-wellness, and regulated release
  gates, including a separate gate for prompt clinical-review conclusions.
- `app/lib/risk-engine.ts` — strict answer validation, condition evaluation, policy and
  applicability gates, localized emergency copy, leaf construction, evidence-contract
  enforcement, context-preserving de-duplication, minor boundaries, and display sorting.
- `app/lib/types.ts` — `EvidenceSource`, `RiskRule`, `RiskLeaf`, `ReleasePolicy`, and their
  supporting unions and contracts.
- `app/data/questions/core.ts` — current overdose/poisoning/unresponsiveness and severe-
  bleeding questions, revised stroke/allergy/breathing wording, and the self-harm age gate.
- `app/data/questions/substances.ts` — the five broad substance gates moved into the
  Detailed priority band so adult and adolescent safety/support branches are reachable.
- `app/lib/questionnaire.ts` — shared build/reconciliation selection, a deterministic
  150-question Deep base, active-branch growth, and a hard 200-question cap.
- `app/components/assessment.tsx` — same-answer urgent interruption, focused alert heading,
  and correction route.
- `app/components/question-control.tsx` — exclusive `none` multi-select behavior.
- `app/globals.css` — project-native immediate-safety presentation.
- `app/lib/risk-engine.test.ts`, `app/lib/questionnaire.test.ts`, and
  `app/components/assessment.test.tsx` — contract, route, boundary, queue, and reachable UI
  regression coverage.

## TDD evidence

The first risk-engine run failed because the evidence, rules, policy, and engine modules did
not exist. The initial questionnaire/UI RED run then exposed eight expected gaps: the two
current-safety questions, revised emergency wording/age metadata, adult Deep availability,
immediate interruption, exclusive `none`, and stable queue reconciliation.

Further test-first cycles recorded before implementation:

- five failures for required leaf metadata and the 200-question defensive cap;
- 32 failures and one pass for medication/substance class routes, followed by 33/33 green;
- one failure for adolescent past-year severe-event support routing;
- 18 failures with 92 passes for independent-review regressions, followed by 110/110 green;
- nine failures with 35 passes for the clarified Deep invariant, followed by 44/44 green;
- two failures with 110 passes for the uncovered adolescent pregnancy/safeguarding safety
  route, followed by 112/112 green;
- six failures with 116 passes for pregnancy de-duplication, gate-aware adolescent factors,
  and substance-route queue reachability, followed by 122/122 green.

## Engine and evidence boundaries

- Every condition reads a declared question ID and validates the runtime value against that
  question's answer type and options.
- Boolean signals require exact `true`. Missing, `null`, `"unsure"`, invalid types,
  non-finite or rule-out-of-range numbers, duplicated or unknown options, and `none` plus a
  positive option cannot trigger a rule or reassuring conclusion.
- Text answers and printed laboratory values have no rule conditions and are never parsed.
  Metabolic and kidney groups are present but deliberately empty because Task 5 has no safe
  structured inputs for classifying the available printed lab strings.
- Closely related routes share de-duplication keys. The highest-urgency leaf wins while
  retaining unique matched factors, missing-input IDs, and sources from suppressed routes.
- Every emitted leaf has non-empty factors, a missing-input list, reviewed source records,
  applicability, evidence tier, urgency, signal, and non-diagnostic copy.
- `assertEvidenceContract` rejects incomplete metadata or sources, diagnostic claims,
  percentages, and probability outside the validated-estimate tier.
- The prototype permits qualitative and urgent rules but no probability. Public wellness
  suppresses urgent and prompt-review triage while retaining non-triage wellness/support
  information. Regulated evaluation fails closed without jurisdiction and model version.

## Audited route coverage

- Direct current safety: chest symptoms, severe breathing difficulty, stroke signs, severe
  allergy, suspected overdose/poisoning/unresponsiveness, uncontrolled bleeding, and
  immediate self-harm danger, plus gated adolescent pregnancy/safeguarding danger.
- Adult qualitative context: sleep, sleep breathing, changed breathlessness, blood pressure
  with salt, mood, nicotine/alcohol support, movement, eating distress, and changing skin
  marks.
- Structured medicine/substance review: GLP-1, isotretinoin, oral/topical minoxidil,
  systemic corticosteroids, research/compounded injectables, anabolic/SARM products,
  cannabis, stimulants, opioid/sedative mixing, psychedelics, and unknown recreational
  drugs. Every class route requires its exact upstream gate; temporal ambiguity stays in
  prompt-review rather than call-now routing.
- Adolescent substance selections and the past-year severe-event question require an active
  upstream substance gate and produce support-only output. Every displayed factor repeats
  its own exact gate, so a stale downstream answer cannot leak into a valid grouped leaf.

## Immediate and age-specific behavior

- Confirmed country alone selects emergency copy: US `911` (plus `988` for self-harm), GB
  `999`, CH `144` (plus poison information `145` only for poisoning), and generic local-
  emergency wording elsewhere. Severe-bleeding copy qualifies direct pressure when no object
  is embedded and says not to remove an embedded object.
- A legacy self-harm answer still routes below the question's current `minAge: 13`.
- Minors receive only urgent or support leaves. Confirmed minor pregnancy context suppresses
  ordinary support in favor of immediate safety plus the sourced pregnancy-support leaf.
- An adolescent's exact current pregnancy/safeguarding safety answer requires the pregnancy
  gate, interrupts immediately, and uses confirmed-country urgent copy without diagnosis.
- The assessment stores the answer, interrupts before normal advance, focuses a dedicated
  `role="alert"` safety screen, states that the prototype cannot contact help, and offers
  “Change my answer.” No score or result tree appears during the interruption.

## Queue and control behavior

- Quick remains exactly 20 and Detailed exactly 50.
- Detailed includes all five broad cannabis/nonmedical-drug gates at ages 13, 15, and 17
  and for adults; affirmative adolescent gates make the opt-in support and shared safety
  follow-ups reachable while adult quantity/detail screens remain age-gated.
- Deep is available for adults aged 18, 24, and 34 with the same deterministic 150-question
  base. A non-branching answer preserves that exact base.
- Active conditional questions are added to the base, so five medicine details produce 155
  questions. Branch growth is deterministic and capped at 200.
- Selecting `none` clears positive options, and selecting a positive option clears `none`.
  The engine independently rejects contradictory bags received outside the UI.

## Verification

- Focused Task 5 suites: `npm test -- --run app/lib/risk-engine.test.ts
  app/lib/questionnaire.test.ts app/components/assessment.test.tsx` — 3 files, 142 tests
  passed.
- Repository suite: `npm test -- --run` — 6 files, 204 tests passed.
- `npm run lint` — exit 0 with no findings.
- `npm run build` — exit 0; all five vinext environments built and `/` was emitted.
- `git diff --check` — exit 0.

## Review and concerns

Independent review identified public-policy triage leakage, context loss during
de-duplication, overlapping route keys, the combined minoxidil route, age-inapplicable
sources, an incomplete bleeding caveat, numeric missing-data reporting, adolescent gate
enforcement, urgent-screen focus, and ambiguous Deep sizing. Each item received a focused
regression and implementation fix. Re-review then found the previously unconsumed adolescent
pregnancy/safeguarding current-safety input; it now has a gated, sourced urgent route and
reachable interruption regression. A final route audit then caught stale factor leakage and
unreachable adolescent substance gates; per-factor gates and Detailed priority tests now
cover ages 13, 15, and 17. Evidence review dates are a snapshot (`2026-08-03`) and
should be refreshed before a later release. Node still emits its dependency deprecation
warning, and vinext prints its informational unknown-route classification; neither fails
verification. Final independent re-review approved the implementation with no remaining
blockers.
