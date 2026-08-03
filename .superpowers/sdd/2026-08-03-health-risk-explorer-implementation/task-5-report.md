# Task 5 report — evidence-tiered qualitative risk engine

## Status

Implemented and correction-audited. The private prototype emits transparent qualitative
leaves without probability, never parses free text or printed laboratory strings, and does
not diagnose conditions or create medicine dosing plans. The correction round closes the
source-currency, evidence-fit, jurisdiction, structured-safety, defensive-branching, and
semantic de-duplication findings raised by independent review.

## Current inventory and changed surfaces

- `app/data/evidence.ts` — 60 reviewed source records. The correction updates the Zepbound
  label to FDA 2026, Rayos to FDA 2024, and the retired NHS melanoma URL to the current NHS
  `Moles` page. It adds global emergency, mental-health, adolescent-service, sexual-safety,
  pregnancy-care/medicine, broad unapproved/compounded-product, injection-safety, steroid-card,
  and international glucocorticoid-adrenal-insufficiency sources.
- `app/data/rules.ts` — 45 explicit rules across 14 groups. The correction consumes the
  sexual-safety, adult-pregnancy, and structured steroid-omission declarations; replaces
  surveillance or overly narrow citations; adds globally applicable urgent evidence; and
  downgrades the NIDA psychedelic association to evidence-limited support.
- `app/data/questions/medications.ts` — adds exact boolean systemic-steroid omission and
  post-omission symptom questions, retains free text only for a documented clinician-led
  plan, and makes the adult steroid gate reachable in Detailed.
- `app/data/questions/clinical.ts` — makes the age-13+ sexual consent/safety declaration an
  all-depth safety question at priority 18.3, placing it at index 18 in both Quick and
  Detailed rather than leaving it unreachable for adolescents.
- `app/lib/questionnaire.ts` — validates a branch answer against its declared question type
  and options before evaluating `equals`, `not-equals`, or `includes`.
- `app/lib/release-policy.ts`, `app/lib/types.ts`, and `app/lib/risk-engine.ts` — add the
  supported ruleset identifier, regulated country/version enforcement, per-profile source
  applicability, ruleset provenance on every leaf, and semantic de-duplication.
- `app/lib/risk-engine.test.ts` and `app/lib/questionnaire.test.ts` — cover source records,
  source jurisdiction, regulated mismatch, all newly consumed routes and gates, malformed
  branch answers, Detailed/Deep reachability, no text parsing, and same-key semantic
  collisions.
- The original Task 5 implementation also changed the core/substance question banks,
  assessment interruption UI, multi-select `none` handling, styles, and assessment tests.
  Those surfaces remain covered and were not loosened by this correction.

The combined question bank now contains 239 declarations. Counts above were taken from the
current source registry/rule bank/question bank, not copied from the pre-correction report.

## TDD evidence

The original Task 5 implementation recorded these test-first cycles:

- initial missing-module failures for the evidence registry, rule bank, policies, and engine;
- eight questionnaire/UI failures for current-safety questions, emergency metadata, Deep
  availability, interruption, exclusive `none`, and queue reconciliation;
- 32 route failures plus one pass, followed by 33/33 green for audited medicine/substance
  classes;
- independent-review regressions progressing through 110/110, 112/112, and 122/122 focused
  green states for Deep sizing, adolescent pregnancy safety, factor gating, and substance
  reachability.

The first correction pass added four explicit RED/GREEN cycles:

- source records, unconsumed declarations, steroid structure/reachability, and invalid
  questionnaire branches: seven expected failures across the two focused suites, then
  130/130 green;
- regulated jurisdiction/version, source applicability, and evidence-quality contracts:
  five expected failures with 131 passing, then 137/137 green;
- same-key semantic collisions: two expected failures with 105 passing in the engine suite,
  then 140/140 green across engine and questionnaire suites;
- pregnancy medicine review outside GB: one expected failure with 107 skipped, then one pass
  with 107 skipped after adding globally applicable evidence.

Fresh independent correction review then drove four further RED/GREEN slices:

- the steroid omission leaf disappeared in CH/DE: one failure with 107 skipped, then one pass
  after adding the 2024 joint ESE/Endocrine Society guideline and exact CH assertion;
- pregnancy context suppressed adolescent sexual-safety support: one failure with 108 skipped,
  then one pass after preserving that distinct safety leaf alongside pregnancy support;
- the sexual-safety declaration was unreachable in adolescent queues: one failure with 33
  skipped, then one pass after adding its all-depth safety priority;
- adolescent sexual-safety and non-GB pregnancy-medicine evidence fit: two failures with 107
  skipped, then two passes after adding the WHO child/adolescent guideline and replacing the
  generic medicine fallback with CDC/NHS and medicine-specific global WHO sources.

## Engine and evidence boundaries

- Every rule condition reads a declared question ID and validates its runtime value against
  the question's type/options. Boolean signals require exact `true`; missing, null,
  undeclared unknown/refusal strings, wrong types, non-finite or out-of-range numbers,
  duplicate/unknown multi options, and `none` plus a positive option do not activate rules.
- Questionnaire branches independently enforce the same declared-answer boundary before a
  condition can unlock a follow-up. For example, adolescent
  `alcohol_frequency: "unsure"` cannot open alcohol or urgent substance follow-ups.
- Text answers and printed laboratory values have no rule conditions and are never parsed.
  The systemic-steroid route depends only on the new exact booleans and supplies no taper or
  dosing instruction.
- A matched rule resolves every source, filters records to `jurisdictions: "all"` or the
  normalized confirmed profile country, and is suppressed if no applicable source remains.
  Thus a US leaf cannot display a GB-only NHS record. Global WHO evidence preserves urgent
  routes outside GB/US-specific source jurisdictions.
- Every emitted leaf carries the exact supported `risk-rules-v1` provenance. A regulated
  evaluation fails closed unless policy jurisdiction equals the normalized confirmed profile
  country and `enabledModelVersion` equals that supported ruleset. Private/public policies
  do not inherit this regulated-only constraint.
- Semantically distinct leaves that share a de-duplication key and urgency remain separate,
  preserving their own title, group, copy, factors, tier, and sources. A true urgent leaf
  suppresses lower-urgency duplicates only; it retains their unique factors/missing inputs/
  sources and adds explicit copy stating that related context neither identifies cause nor
  changes the emergency action.
- Evaluation enforces source applicability before materialization. `assertEvidenceContract`
  separately requires rule/ruleset provenance, complete source metadata, non-diagnostic copy,
  no unvalidated percentages, and no probability outside the validated-estimate tier.

## Corrected route and source coverage

- Current safety remains direct and country-localized for chest symptoms, severe breathing
  difficulty, stroke signs, severe allergy, overdose/poisoning/unresponsiveness, uncontrolled
  bleeding, immediate self-harm danger, and gated adolescent pregnancy/safeguarding danger.
- `sexual_contact_safety: true` at age 13+ now produces confidential support with exact gate,
  age/country applicability, and a directly fitted WHO child/adolescent clinical guideline.
  It remains visible when adolescent pregnancy support is also active.
- Adult pregnancy declarations now independently route a new concern, lack of care access or
  safety/support, and absent/planned medicine review. Medicine review uses the direct CDC page
  in the US, the operational NHS page in GB, and WHO pregnancy pharmacovigilance plus
  Medication Without Harm globally; the generic pregnancy service-access page is not used for
  the authoritative medicine claim.
- Ongoing/recent systemic-steroid use plus an exact missed/stopped answer and exact severe
  symptom answer now produces prompt professional review. Stale details and matching words in
  free text do not trigger it. US and GB add only their applicable FDA/MHRA record to the
  global 2024 joint endocrine guideline, while CH and other countries retain the global route.
- Adolescent substance routes use WHO adolescent-friendly service guidance and US SAMHSA
  youth support rather than CDC YRBSS surveillance. The urgent pregnancy route includes a
  global pregnancy-care source. The psychedelic route is evidence-limited support, and broad
  research/compounded routes cite broad FDA/CDC product and injection-safety sources rather
  than GLP-1/semaglutide-only pages.
- A default-agent `curl` sweep returned 2xx/3xx for 56 of 60 records, 403 for the two SAMHSA
  pages, and 404 for the two current FDA label PDFs. The FDA PDFs both return 200 with a
  browser user-agent and were opened as the 02/2026 Zepbound and 03/2024 Rayos labels. The
  current official SAMHSA titles/paths were revalidated through the official search index;
  their direct 403 responses are treated as bot protection, not as HTTP-200 checks.

## Queue and age behavior

- Quick remains exactly 20 and Detailed exactly 50. Detailed exposes all five adolescent
  substance gates and the adult systemic-steroid gate; affirmative gates make their nested
  follow-ups reachable. Deep retains its deterministic 150-question base and grows active
  branches under the hard 200-question cap.
- The sexual route starts at age 13 and its question is index 18 in both Quick and Detailed;
  adult pregnancy and systemic-steroid routes start at 18. Stale downstream values cannot
  bypass the exact upstream gate.
- Minors continue to receive only urgent or support leaves. No correction introduced an adult
  probability or adult-only medicine route for a minor; pregnancy support no longer erases a
  distinct sexual-safety support leaf.

## Verification

- Correction focused suites: `npx vitest run app/lib/risk-engine.test.ts
  app/lib/questionnaire.test.ts` — 2 files, 143/143 passed.
- Repository suite: `npm test` — 6 files, 225/225 passed.
- `npm run lint` — exit 0 with no findings.
- `npm run build` — exit 0; all five vinext environments built. Vinext retained only its
  informational unknown-route classification.
- `git diff --check` — exit 0.
- Correction code commit: `1592713a18c9fff6ae855c120c6e05d594153bca`
  (`fix: preserve evidence semantics in risk routing`).

## Review disposition and deferred work

The source-currency, regulated-gate, source-jurisdiction, steroid omission, unconsumed
sexual/pregnancy answers, evidence-tier/source fit, defensive questionnaire branching, and
semantic de-duplication findings all have focused regressions. Final independent re-review
reproduced the corrected CH steroid, pregnancy-plus-sexual, and queue-reachability scenarios,
ran 143/143 focused and 225/225 repository tests, and returned `APPROVED` with no remaining
Critical, High, or Medium finding in scope.

Three non-blocking follow-ups remain explicitly deferred to Task 8/tooling work: broaden the
copy linter beyond its current diagnostic/dose phrases, add explicit temporal follow-ups where
a past-year exposure and current symptoms could otherwise be ambiguous, and repair the global
standalone TypeScript check configuration (Vitest types and the worker `Fetcher` type). The
official production build remains the release compilation gate. Node's dependency deprecation
warning and vinext's informational unknown-route classification are also unchanged and
non-failing.
