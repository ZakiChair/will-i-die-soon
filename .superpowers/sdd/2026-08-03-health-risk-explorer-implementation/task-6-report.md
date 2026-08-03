# Task 6 report — fair Purity Score, risk canopy, actions, and export

## Status

Implemented, correction-audited, and independently approved. The results journey now keeps
urgent qualitative signals, the adult wellness-habit ledger, adolescent reflection, confirmed
lab context, and local export as visibly separate systems. It does not produce a mortality or
disease probability, diagnosis, lab interpretation, medicine change, or adult score for a
minor.

The original production feature commit is
`abf8412fedbf5edb3bd39c9824b8d5c5413fcb61` (`feat: deliver explainable risk tree and purity
score`). Controller correction round 1 is implemented in
`3f33557c43de247365518982fe5d53e31be81643` (`fix: harden task 6 privacy and provenance`).

## Delivered surfaces

- `app/lib/scoring.ts` implements `purity-score-v1` with the exact eight-category, 100-point
  contract, decimal half-up arithmetic, explicit 25-question allow-list, conditional
  exclusions, raw `D / T` coverage gate, and discriminated adult/coverage/not-available
  results. Non-score variants contain no hidden score, numerator, denominator, or full ledger.
- `app/lib/scoring.ts` also produces at most three category-de-duplicated actions. Access and
  safety support is first, simultaneous barriers and every distinct applicable source are
  preserved in one support action, an already-planned step wins an equal-deficit tie, and
  remaining ties use the documented v1 evidence-direction order rather than category spelling
  or protected/context data. Actions use deterministic, de-duplicated `sources[]` throughout
  scoring, rendering, and export.
- `app/components/risk-tree.tsx` provides the complete semantic canopy: “You today” branches
  into urgent signals, medical review, longer-term domains, and protective roots. Nested lists
  and buttons work independently of color and pointer precision; selection opens an adjacent
  evidence region with careful wording, factors, missing inputs, evidence tier, and applicable
  official sources.
- `app/components/results.tsx` renders urgent signals before habits content, the exact adult
  label `Purity Score — wellness habits, not a health verdict.`, inspectable component caps,
  non-ranked adolescent cards, confirmed-but-uninterpreted labs, actions with every source link,
  print, JSON export, and restart.
- `app/lib/export.ts` emits `health-risk-explorer-report-v2` interpreted output by default. It
  removes raw answers, free text, file/source metadata, birth-date-like fields, and
  exact-location-like fields. Explicit raw opt-in is honored only when the report carries a
  separate finite integer age guard of at least 18; the guard itself is never serialized.
- `app/page.tsx` carries assessment depth and locally confirmed labs into Results. Restart
  replaces the whole in-memory result/assessment state with the landing state.
- The core, substance, medication, and lifestyle banks contain the required adult nicotine,
  preventive-follow-up, medication-access, and exact score/exclusion consumers. Medicine-use
  behavior questions now require an affirmative current-prescription gate, and preventive due
  status is independent of access barriers.
- `app/globals.css` uses a two-color focus-visible indicator: amber is visible against
  deep-water and deep-water is visible against paper. Selected risk-tree buttons preserve both
  focus bands, reduced-motion behavior remains intact, and citation rows cannot inherit action
  card layout or numbering.

## Age and privacy routing

- Adults outside Quick can receive a number only after the exact coverage, five-category, and
  tobacco/alcohol gate checks pass. Quick always remains a non-numeric reflection.
- Ages 13–17 never receive score-shaped state or adult points. Unassisted adolescents see the
  private, non-ranked **My Health Habits Map** immediately.
- If an adolescent reports adult assistance, urgent content remains visible first, followed by
  a neutral handoff. Personalized canopy, habits map, labs, interpreted export, and print remain
  absent until **Show my private results** is activated. Focus then moves to the revealed canopy
  heading. Raw-answer export remains unavailable for every user under 18.
- Under 13, urgent content may appear, followed only by general information, guardian/trusted
  adult routing, and **Restart and clear**. Canopy, map, labs, print, JSON, raw answers, and all
  adult scoring are suppressed.
- Raw export authorization is independent of score shape. Tests deny explicit opt-in for child
  and adolescent ages, null/missing/invalid age guards, including an adult-shaped score supplied
  with a minor guard. Verified adults may opt in with Quick, insufficient-coverage, or published
  adult-score results. The age guard and all other private metadata remain absent from JSON.

## Exact scoring and action evidence

The normative mutation fixtures pass as specified:

- F1: `E = D = T = 100`, coverage `100%`, score `100`, no score-derived action.
- F2: `E = 30.90`, `D = T = 100`, coverage `100%`, score `31`; action categories are tobacco,
  nutrition, then alcohol. Movement is fourth by deficit and does not displace alcohol.
- F3: tobacco/alcohol-only answers expose coverage `35%` and no raw or public numeric score.
- F4: medicine access/use barriers remove the affected component from numerator and denominator,
  can retain score `100`, and produce practical support rather than a penalty. A merged
  preventive-and-medicine support action retains both reasons and both official source links.
- F5: positive values beyond caps equal the caps; negative/non-finite values and fractional
  day/portion counts are missing. Protected/context-only mutations leave arithmetic, ledger,
  and actions identical.
- F6: every tested age below 18 and unverified/invalid age returns exactly the not-available
  variant with no score-shaped fields.

Urgent and other qualitative leaves are evaluated separately under the private prototype
policy. They remain in the urgent summary/canopy and cannot consume or reorder score-derived
action slots. Confirmed lab values remain copied context and never enter either engine.

## Question-bank and reachability audit

- Registry size after Task 6: 243 questions.
- Quick and Detailed remain exactly 20 and 50 questions. Deep retains its 150-question base;
  audited active adult routes are nicotine 155, alcohol 153, medicines 158, preventive 151,
  and all four together 167, below the hard 200 cap. The medicine route is the 150-item base
  plus five detail prompts and the three now-gated behavior prompts.
- Ages 18, 24, and 34 retain a 150-item Deep base through the existing
  `preventive_fall_review` functional question at its established priority 139. Its adult-age
  wording covers falls, balance concerns, fear of falling, and activity limitation; no filler
  item was introduced.
- Realistic Detailed no-current-medicine, no-prescriber-access, and medicine-barrier routes all
  remain adult-score eligible at the raw `D / T >= 70%` gate. Deep remains the reliable
  full-coverage route.
- All Task 5 age, branch, urgent-interruption, evidence, and queue gates remain covered by the
  full repository suite.

## Recovery-source research note

The recovery source was checked on 3 August 2026 against the official WHO publication page,
[Doing What Matters in Times of Stress: An Illustrated Guide](https://www.who.int/publications/i/item/9789240003927).
WHO published the 132-page guide on 29 April 2020 under ISBN `9789240003927`. It supports brief
self-help stress-management practice for a few minutes each day and names grounding, unhooking,
acting on values, being kind, and making room. “Making room” means allowing difficult thoughts
and feelings; the guide does not support the previous generic “recovery or enjoyable activity”
copy. The question, ledger, adult action, protective root, and adolescent card were narrowed to
the practices the guide actually names.

## TDD and correction evidence

The first implementation began with missing scoring/export/results modules and failing
contract tests, then reached 39/39 focused tests before correction review. Subsequent
counterexamples were recorded RED before production changes:

- F2 category ranking: 1 failed / 28 skipped, then scoring 29/29.
- Exact public label: 1 failed / 7 passed, then results 8/8.
- Assessed-ledger denominator wording: 1 failed / 8 passed, then results 9/9.
- Pregnancy-support map plus finite redacted export shape: 2 failed / 10 passed, then 12/12.
- Missing/excluded component cap wording: 1 failed / 8 skipped, then the focused slice passed.
- Barrier support below score coverage: 3 failed / 29 skipped, then scoring 32/32.
- Explicit evidence-direction tie fallback: 1 failed / 32 skipped, then scoring 33/33.
- Binding minor privacy contract: 4 failed / 6 passed. Three failures were the intended raw
  toggle, assisted-handoff, and under-13 suppression counterexamples; the existing page journey
  also hit its default timeout during that loaded RED run. The unchanged journey and all new
  privacy behavior then passed 10/10.
- Final action review: 3 failed / 33 skipped for simultaneous barrier retention, related support
  de-duplication, and planned-step tie priority; the same slice then passed 3/3 with 33 skipped.
- Reveal focus transfer: 1 failed / 9 skipped with focus falling to `body`, then 1 passed / 9
  skipped after focusing the revealed heading.

Controller correction round 1 also recorded every new counterexample RED before production
changes:

- Trusted export guard: 5 denied-age cases failed while leaking raw answers, then the export
  suite passed 11/11 across minor, missing, invalid, Quick, insufficient, and adult-score shapes.
- Medicine-only behavior routing: 6 failures exposed the three unconditional questions in
  eligibility, Detailed/Deep reconciliation, No, Skip, and Back paths. The Back path passed
  independently after one loaded-run timeout. Deep then failed at 149 base items for ages 18,
  24, and 34 before the existing falls/balance item restored the 150-item contract; the focused
  queue slice passed 7/7 and Detailed coverage routes passed 3/3.
- Preventive due/access separation: bank/UI/scoring cases failed 3/4 before the status prompt,
  not-due label, and explanations were corrected; bank, realistic UI route, scoring, and export
  then passed 4/4.
- WHO recovery source and scope: three question/source/adolescent-copy cases failed, then passed
  3/3 with the exact publication and named brief practices.
- Merged provenance: six scoring/render/export cases failed because only one `source` survived,
  then passed 6/6 with deterministic `sources[]` and every distinct reason/link.
- Focus contrast: the old blue outline failed on deep-water. The initial two-color assertions
  passed 2/2, then independent review exposed two CSS cascade counterexamples. Selected-button
  focus and nested citation layout failed 2/2 before the composed shadow/direct-child fix made
  the global style suite pass 4/4. The test computes deep-water/paper contrast at `10.80:1` and
  amber/deep-water at `7.41:1` from the production variables.
- Final independent review found the plural-source export still mislabeled as schema v1 and one
  stale “due and accessible” explanation. Those three checks failed, then passed 3/3 after the
  v2 discriminator and access-neutral copy were applied.

Independent correction re-review first found four Important gaps: risk-tree focus cascade,
nested source-list cascade, the export schema discriminator, and a stale preventive-access
inference. After each was reproduced and fixed, final re-review returned **APPROVED — no
remaining Critical, Important, or Minor findings**. The reviewer made no edits.

## Final verification

- `npx vitest run app/globals.test.ts app/lib/scoring.test.ts app/lib/export.test.ts
  app/components/results.test.tsx app/lib/questionnaire.test.ts
  app/components/assessment.test.tsx --reporter=dot` — 6 files, 129/129 tests passed.
- `npx vitest run app/lib/questionnaire.test.ts app/components/assessment.test.tsx
  --reporter=dot` — 2 files, 64/64 tests passed.
- `npm test -- --reporter=dot` — 10 files, 4,399/4,399 tests passed.
- `npm run lint` — passed, exit 0.
- `npm run build` — passed, exit 0; all five vinext environments built.
- `git diff --check` and staged diff check — passed, exit 0.
- Fresh production artifact smoke request to `http://127.0.0.1:4187/` — HTTP 200 with the
  expected **Will I Die / Health Risk Explorer** page markers.

The full test run retains two pre-existing, non-failing PDF.js Node warnings about the legacy
build and `standardFontDataUrl`; neither changes Task 6 behavior or test status.
