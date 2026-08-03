# Task 6 report — fair Purity Score, risk canopy, actions, and export

## Status

Implemented, correction-audited, and independently approved. The results journey now keeps
urgent qualitative signals, the adult wellness-habit ledger, adolescent reflection, confirmed
lab context, and local export as visibly separate systems. It does not produce a mortality or
disease probability, diagnosis, lab interpretation, medicine change, or adult score for a
minor.

The production feature commit is
`abf8412fedbf5edb3bd39c9824b8d5c5413fcb61` (`feat: deliver explainable risk tree and purity
score`).

## Delivered surfaces

- `app/lib/scoring.ts` implements `purity-score-v1` with the exact eight-category, 100-point
  contract, decimal half-up arithmetic, explicit 25-question allow-list, conditional
  exclusions, raw `D / T` coverage gate, and discriminated adult/coverage/not-available
  results. Non-score variants contain no hidden score, numerator, denominator, or full ledger.
- `app/lib/scoring.ts` also produces at most three category-de-duplicated actions. Access and
  safety support is first, simultaneous barriers are preserved in one support action, an
  already-planned step wins an equal-deficit tie, and remaining ties use the documented v1
  evidence-direction order rather than category spelling or protected/context data.
- `app/components/risk-tree.tsx` provides the complete semantic canopy: “You today” branches
  into urgent signals, medical review, longer-term domains, and protective roots. Nested lists
  and buttons work independently of color and pointer precision; selection opens an adjacent
  evidence region with careful wording, factors, missing inputs, evidence tier, and applicable
  official sources.
- `app/components/results.tsx` renders urgent signals before habits content, the exact adult
  label `Purity Score — wellness habits, not a health verdict.`, inspectable component caps,
  non-ranked adolescent cards, confirmed-but-uninterpreted labs, actions, print, JSON export,
  and restart.
- `app/lib/export.ts` emits interpreted output by default. It removes raw answers, free text,
  file/source metadata, birth-date-like fields, and exact-location-like fields. An adult-only
  explicit toggle can add validated structured answers while continuing to exclude text and
  private file metadata.
- `app/page.tsx` carries assessment depth and locally confirmed labs into Results. Restart
  replaces the whole in-memory result/assessment state with the landing state.
- The core, substance, medication, and lifestyle banks contain the required adult nicotine,
  preventive-follow-up, medication-access, and exact score/exclusion consumers.

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

## Exact scoring and action evidence

The normative mutation fixtures pass as specified:

- F1: `E = D = T = 100`, coverage `100%`, score `100`, no score-derived action.
- F2: `E = 30.90`, `D = T = 100`, coverage `100%`, score `31`; action categories are tobacco,
  nutrition, then alcohol. Movement is fourth by deficit and does not displace alcohol.
- F3: tobacco/alcohol-only answers expose coverage `35%` and no raw or public numeric score.
- F4: medicine access/use barriers remove the affected component from numerator and denominator,
  can retain score `100`, and produce practical support rather than a penalty.
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
  audited active adult routes were nicotine 155, alcohol 153, medicines 155, preventive 151,
  and all four together 164, below the hard 200 cap.
- Detailed score reachability was measured from actual queued answers: no-current-medicines
  `63 / 90 = 70%`; no-prescriber-access `65 / 92 = 70.65%`; and medicine access barrier
  `64 / 91 = 70.33%`. Deep remains the reliable full-coverage route.
- All Task 5 age, branch, urgent-interruption, evidence, and queue gates remain covered by the
  full repository suite.

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

Independent final review returned **APPROVED — no remaining Critical, Important, or Minor
findings** after checking scoring/actions, minor privacy, semantic navigation, focus, print,
and export redaction.

## Final verification

- `npx vitest run app/lib/scoring.test.ts app/lib/export.test.ts app/components/results.test.tsx
  --reporter=dot` — 3 files, 49/49 tests passed.
- `npx vitest run app/lib/questionnaire.test.ts app/components/assessment.test.tsx
  --reporter=dot` — 2 files, 58/58 tests passed.
- `npm test -- --reporter=dot` — 9 files, 4,377/4,377 tests passed.
- `npm run lint` — passed, exit 0.
- `npm run build` — passed, exit 0; all five vinext environments built.
- `git diff --check` and staged diff check — passed, exit 0.
- Fresh production artifact smoke request to `http://127.0.0.1:4173/` — HTTP 200.

The full test run retains two pre-existing, non-failing PDF.js Node warnings about the legacy
build and `standardFontDataUrl`; neither changes Task 6 behavior or test status.
