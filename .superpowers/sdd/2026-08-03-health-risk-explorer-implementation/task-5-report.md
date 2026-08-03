# Task 5 report — evidence-tiered qualitative risk engine

## Status

Implemented and correction-audited. The private prototype emits transparent qualitative
leaves without probability, never parses free text or printed laboratory strings, and does
not diagnose conditions or create medicine dosing plans. The second correction round closes
the provenance/applicability, urgent de-duplication, product-specific GLP-1, acute adolescent
support, postpartum, research-product, source-population, and operational emergency findings
raised by controller and independent review. The third correction round closes the remaining
adolescent-pregnancy age and source-scope findings and hardens the all-branch age matrix.

## Current inventory and changed surfaces

- `app/data/evidence.ts` — 71 reviewed source records. Publisher/regulator
  `jurisdictions` are provenance only. Independent `applicability` metadata describes
  supported content countries and ages, while `operationalCountries` identifies sources that
  directly support local numbers or workflows. The final pass adds WHO sources for
  all-gender survivor care, child mental-health services, and globally relevant
  substandard/falsified products, then removes the LMIC-only adolescent-pregnancy guideline
  because no active global route can honestly use it.
- `app/data/rules.ts` — 54 explicit rules across 14 groups. Six GLP-1 routes consume an exact
  structured product-plus-ingredient identity and conditionally resolve only that product's
  current label. A new current adolescent substance-safety rule is urgent and localized;
  the separate resolved past-year route remains support-only.
- `app/data/questions/medications.ts` — narrows supported structured GLP-1 identities to
  Zepbound/tirzepatide, Wegovy/semaglutide, Saxenda/liraglutide, and
  Trulicity/dulaglutide. Mounjaro, Ozempic, Rybelsus, Victoza, and unknown products cannot be
  mapped to a different brand's label. Research-source options separately identify
  authorized online, unauthorized online, research-use-only, and unknown sources.
- `app/data/questions/substances.ts` — replaces the ambiguous past-year/current substance
  boolean with exact `happening_now`, `past_year_not_now`, and `none` timing choices.
- `app/lib/types.ts` and `app/lib/risk-engine.ts` — define source content/population scope,
  operational-country scope, conditional source references, fail-loud evidence resolution,
  source-backed emergency localization, and equivalence-based semantic de-duplication.
- `app/lib/risk-engine.test.ts` and `app/lib/questionnaire.test.ts` — contain a 54-rule by
  5-country source matrix across every satisfiable `condition.any` path, inside/outside rule
  ages, and question-versus-rule age contracts, plus malformed metadata, operational-copy,
  exact product/label, research/postpartum, adolescent, and urgent-collision regressions.
- Earlier Task 5 corrections to the clinical/core question banks, questionnaire branch
  validation, release policy, assessment interruption UI, multi-select `none` handling, and
  assessment tests remain intact and covered.

The live modules contain 240 question declarations, 71 source records, and 54 rules across
14 declared groups; 12 groups contain rules, while `metabolic` and `kidney` remain explicitly
empty. These counts were loaded directly from the registries after the final code correction.

## TDD evidence

The original Task 5 implementation recorded missing-module failures, questionnaire/UI route
failures, and medicine/substance route failures before production work. The first correction
pass recorded RED/GREEN slices for metadata completeness, structured steroid omission,
defensive question branching, regulated policy matching, source filtering, semantic
collisions, pregnancy medicine evidence, adolescent sexual-safety reachability, and
international steroid evidence.

The controller's provenance counterexample started the second correction:

- The first exhaustive matrix ran the then-current 52 rules for US, GB, CH, DE, and OTHER
  profiles and exposed 118 failures with 142 passes. Publisher jurisdiction had been
  incorrectly suppressing generally applicable evidence.
- The expanded behavior/contract slice reached 201 expected failures with 267 passes,
  covering provenance versus applicability, malformed population metadata, operational
  emergency claims, structured GLP-1 selection, postpartum and research sources, acute
  adolescent support, and urgent collision behavior.
- After the first production pass split research reaction from storage, 53 x 5 country cases
  passed 265/265, GLP-1 mapping passed 15/15, urgent de-duplication passed 5/5, focused suites
  passed 473/473, and the repository suite passed 555/555.

Independent review of that first production pass then produced five further RED/GREEN slices:

- Exact product identity: 5 expected failures with 1 pass and 475 skipped before replacing
  ingredient-only routing.
- Current versus past-year adolescent substance timing: 5 expected failures with 477 skipped
  before adding the localized urgent route.
- Research-source splitting, global research evidence, WHO population bounds, child-specific
  evidence, and exact DailyMed metadata: 13 expected failures with 476 skipped.
- The corrected focused engine/questionnaire suites passed 494/494.
- Independent re-review found that the child service guidance begins at age 5, not birth:
  3 expected failures with 1,059 skipped preceded the final source/question/rule age gate.
- The strengthened source matrix passed all 270 rule-country cases plus 565 rule-country
  age-boundary cases, 835/835 total.

The third controller/reviewer pass then produced the final RED/GREEN slices:

- The adolescent-pregnancy age/source slice failed 44 of 4,200 engine cases as expected:
  30 injected `pregnancy_relevant` cases at ages 0, 4, 5, 9, 10, and 12 across five
  countries; 10 age-13/17 source/copy/applicability cases; the input-age contract; the
  LMIC-source registry contract; the urgent route reference; and the prior leaf-source
  assertion. The other 4,156 cases remained green.
- Adding `minAge: 13`, narrowing the copy to adolescent-friendly service access, replacing
  the route evidence with global WHO adolescent-service guidance, and removing the LMIC-only
  record made the expanded engine suite green.
- Independent review found three future-only witness-generator edge classes. Dedicated RED
  slices covered overlapping and bounded numeric ranges, fractional intersections, and a
  contradictory multi-select `none` combination. Candidate branching, full-condition
  filtering, valid-bound witnesses, and structural multi-select rejection made each slice
  green without changing any production rule.
- The final matrix covers all 179 satisfiable activation variants, all five countries,
  representative/in-range boundary ages, and declared below/above ages. Its 3,974 cases pass.

## Engine and evidence boundaries

- Every rule condition reads a declared question ID and validates its runtime value against
  the question's type/options. Boolean signals require exact `true`; malformed, stale,
  unknown, refusal, contradictory multi-select, and out-of-range values cannot activate a
  route. Questionnaire branches enforce the same boundary.
- Every declared rule input must fit inside the input question's age range. The sole audited
  exception is `urgent-self-harm:urgent_self_harm_now`: a legacy/stale immediate-danger
  answer remains routable below the question's current age-13 display boundary, with direct
  age-11 urgent-routing regression coverage. Non-urgent routes receive no exception.
- Text answers and printed laboratory values have no rule conditions and are never parsed.
  Free-text brand or ingredient names cannot substitute for an exact GLP-1 product identity.
- `EvidenceSource.jurisdictions` records source origin only and never filters a user.
  `EvidenceSource.applicability` filters only when content or population is truly scoped.
  A matched rule with no applicable source throws a contract error rather than disappearing.
- Local service claims are narrower than clinical content. A numeric emergency instruction
  requires `operationalCountries` support for the confirmed country. US, GB, and CH resolve
  911, 999, and 144 from official sources; DE and OTHER receive a generic local-emergency
  instruction. Unsupported `do not drive` copy was removed.
- GLP-1 label references are conditional on exact structured identities. Zepbound resolves
  version 38, Wegovy version 19, Saxenda version 22, and Trulicity version 60. The vision
  route excludes Saxenda because that current label does not support the retinopathy claim.
  Other brands and `other_or_unsure` do not activate these label-specific routes.
- A `dedupeKey` merges only when title, copy, group, evidence tier, urgency, signal, and
  applicability also match. Equivalent chest/breathing emergency actions merge factors and
  sources. Minoxidil, pregnancy, medicine, and other non-equivalent contexts remain separate.
- Every emitted leaf carries `risk-rules-v1` provenance. Regulated evaluation still fails
  closed unless policy jurisdiction and enabled ruleset match the confirmed profile.

## Corrected route and source coverage

- Urgent physical routes retain WHO/ICRC Basic Emergency Care globally and add National 911
  Program `Calling 911`, NHS `When to call 999`, or Swiss Confederation `Emergencies and
  danger` only where applicable. 988 and Swiss poison-number copy remain limited to their
  exact US or CH operational evidence.
- The adolescent substance timing choice now feeds either
  `urgent-adolescent-substance-safety` for a current collapse, seizure, severe breathing
  problem, chest symptom, or immediate danger, or a separate support leaf for a resolved
  past-year event. The urgent route has direct WHO acute evidence and localized actions.
- New pregnancy/postpartum concerns include WHO `Getting the health services you need: after
  childbirth`. The LMIC-only 2025 adolescent-pregnancy programme guideline is no longer in
  the registry or any active route. Urgent adolescent pregnancy/safeguarding routing retains
  direct WHO pregnancy-service and emergency evidence.
- `minor-pregnancy-support` now applies exactly at ages 13–17 in every supported country and
  cites global WHO adolescent-friendly service guidance (content ages 10–19). Its narrowed
  copy offers local service access, asks the service what privacy rules apply, and explicitly
  avoids determining pregnancy or giving medicine advice; it no longer makes trying,
  breastfeeding, medicine-decision, trusted-adult, or guaranteed-confidentiality claims.
- WHO adolescent-friendly service guidance is scoped to ages 10–19. `child-feeling-support`
  uses separate WHO/UNICEF `Mental health of children and young people: service guidance`,
  preserving global support at ages 5–12. The self-report question and rule both start at age
  5, so a stale answer cannot activate the route for ages 0–4 outside the source population.
- Minor sexual-safety leaves use the WHO child/adolescent guideline through age 17. Adult
  leaves use the 2025 WHO survivor-care curriculum, whose clinical scenarios and guidance
  include people of all gender identities, instead of a women-only handbook.
- Research source review no longer treats every online purchase as suspect. It activates
  only for a declared unauthorized online, research-use-only, or unknown source; the copy
  states that this assessment cannot verify identity/quality. WHO's global substandard and
  falsified-products record supports every country, while the FDA unapproved-drug record is
  content-scoped to US profiles.
- Research-product reaction and storage remain distinct evidence-limited routes. Site or
  whole-body concerns use FDA `Product Problems`; warm/damaged packaging uses FDA `Safe Drug
  Use After a Natural Disaster` and directs users to exact product instructions, a pharmacist,
  clinician, or manufacturer.
- The four current DailyMed records store the label headings from the live pages and identify
  DailyMed's publisher as the U.S. National Library of Medicine rather than FDA.
- Runtime source validation rejects empty, duplicate, lowercase, malformed, or reversed
  provenance, applicability, operational-country, and age metadata.

## Queue and age behavior

- Quick remains exactly 20 and Detailed exactly 50. Detailed exposes all five adolescent
  substance gates and the adult systemic-steroid gate. Deep retains its deterministic
  150-question base and stays under the hard 200-question cap.
- Exact GLP-1 product identity is reachable only after `uses_glp1: true`. The adolescent
  substance timing choice is reachable only behind an exact substance gate and triggers
  assessment interruption when `happening_now` produces the urgent leaf.
- The sexual route starts at age 13; adult pregnancy and systemic-steroid routes start at
  18. Stale downstream values cannot bypass exact gates. Minors receive only urgent/support
  leaves.
- The minor pregnancy-support rule now mirrors its gate at ages 13–17. Injected or persisted
  `pregnancy_relevant: true` cannot activate it at ages 0, 4, 5, 9, 10, 12, or 18 in US, GB,
  CH, DE, or OTHER; age 13 and 17 support remains available in every one of those countries.

## Verification

- All-path country and age-boundary matrix: `npx vitest run
  app/lib/risk-engine.test.ts -t "global rule source support matrix"` — 3,974/3,974
  passed. It covers 179 satisfiable route variants across US, GB, CH, DE, and OTHER,
  in-range ages, below/above declared rule ages, the input-question age contract, and helper
  witness invariants.
- Dedicated minor/pregnancy age sweep: `npx vitest run app/lib/risk-engine.test.ts -t
  "minor and pregnancy boundaries"` — 52/52 passed.
- Focused engine/questionnaire suites: `npx vitest run app/lib/risk-engine.test.ts
  app/lib/questionnaire.test.ts` — 2 files, 4,246/4,246 passed.
- Repository suite: `npm test -- --reporter=dot` — 6 files, 4,328/4,328 passed. The lab
  dependency retained its known non-failing PDF font/legacy-build warnings.
- `npm run lint` — exit 0 with no findings.
- `npm run build` — exit 0; all five vinext environments built. Vinext retained only its
  informational unknown-route classification.
- `git diff --check` — exit 0.
- Correction commits:
  - `da33d6add97ae5684d64223984717e76d2352bf3` — provenance/applicability,
    conditional labels, de-duplication, source fit, and operational actions.
  - `38fdccc799030db5b592ab3c59eaf59a2c736752` — exact product/population/source
    narrowing and current adolescent emergency routing.
  - `bc3609a874c034cf9634432195a4da31f0508f5c` — exact WHO/UNICEF child-service
    age boundary across source, question, rule, and regressions.
  - `912231910784aa0fa793788fe9ade7aa6a280497` — adolescent pregnancy age/source
    correction plus all-path and outside-boundary matrix hardening.

## Review disposition and deferred work

Independent re-review through `bc3609a` returned `APPROVED` for the second correction. The
third review initially reproduced the two remaining Important findings (minor pregnancy
support below age 13 and globally mis-scoped adolescent-pregnancy evidence), then reviewed
the corrected working tree before commit. Its final verdict was `APPROVED — no findings in
the requested scope`. It confirmed the 13–17 behavior across all five countries, the global
WHO adolescent-service source/copy fit, complete removal of the LMIC-only record from active
data, the explicit age-11 urgent self-harm exception, and all satisfiable `any`-path and age
boundary coverage. It independently passed the focused engine/questionnaire suites, lint,
and `git diff --check`.

Three non-blocking follow-ups remain deferred to Task 8/tooling work: broaden the copy linter
beyond its current diagnostic/dose phrases, add temporal follow-ups for other routes where
past exposure and current symptoms remain separate concepts, and repair the global standalone
TypeScript check configuration (Vitest types and the worker `Fetcher` type). The official
production build remains the release compilation gate. Node's dependency deprecation warning
and vinext's informational unknown-route classification remain non-failing.
