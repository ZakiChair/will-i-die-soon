# Task 3 report — consent, assessment flow, and visual pacing

## Status

Implemented the consent/profile route, minor routing gates, one-question assessment UI, in-memory answer navigation, deliberate skip handling, exact depth queues, milestone intermissions, focus management, reduced-motion support, and a temporary typed completion handoff. No scoring, result calculation, OCR, answer persistence, analytics, or production imagery was added.

## Changed files

- `app/components/consent-screen.tsx` — consent, age/country profile entry, privacy boundary, under-13 guardian-assisted gate, 13–17 assisted/private choice, and `getAvailableDepths`-driven Deep availability with an explicit Detailed choice.
- `app/components/assessment.tsx` — 235-question-engine integration through `buildAssessmentQueue` and `getNextQuestion`, one-question state, progress, in-memory answers, Back behavior, intermission scheduling, focus restoration, and LivingCanopy progress.
- `app/components/question-control.tsx` — native fieldset/legend/input/button controls for boolean, single, multi, number, scale, and text answers; visible/programmatic numeric units; valid-Enter behavior; deliberate `null` skip.
- `app/components/intermission.tsx` — milestone screen and continuation control.
- `app/components/assessment.test.tsx` — route, age, availability, input, skip, Back, queue-length, pacing, focus, and unload-guard coverage.
- `app/page.tsx` — finite `AppScreen` union, route transitions, active-assessment `beforeunload` guard, in-memory completion state, and temporary typed completion handoff.
- `app/globals.css` — responsive consent/assessment/intermission styling using the Landing/LivingCanopy palette, typography, geometry, focus indicators, and reduced-motion behavior.
- `.superpowers/sdd/2026-08-03-health-risk-explorer-implementation/task-3-report.md` — this report.

## RED/GREEN evidence

Strict TDD cycles were run in the worktree:

1. Consent gate
   - RED: `npm test -- assessment.test.tsx` — 1 failed because choosing Quick left Landing visible and no “Before we begin” heading existed.
   - GREEN: 1/1 passed after the minimal consent route and age field were added.
2. Pediatric routes and depth availability
   - RED: 4/5 failed at the missing country/profile controls.
   - GREEN: 5/5 passed after under-13 assisted routing, adolescent private/assisted routing, direct `getAvailableDepths` consumption, explicit Detailed fallback, child Detailed=50, and adult Deep=150 were implemented.
3. Answer controls and in-memory state
   - RED: 2/7 failed because no native answer group or “Prefer not to say” control existed.
   - GREEN: 7/7 passed after native controls, valid-Enter handling, Back restoration, and exact 20-item Quick completion with `null` skips.
4. Milestones and unload guard
   - RED: 4/11 failed: observed intermission counts were 0 rather than 2/4/6 and active assessment did not cancel `beforeunload`.
   - GREEN: 11/11 passed after domain-boundary milestones, next-question focus restoration, and scoped guard setup/cleanup.
5. Accessible restored skip and units
   - RED: 2/12 failed because `cm` was not an accessible description and a restored deliberate skip lacked `aria-pressed="true"`.
   - GREEN: 12/12 passed after programmatic unit association and restored-skip state were added.
6. Complete numeric-unit coverage
   - RED: 1/13 failed when the test iterated all bank number questions and encountered one without an accessible unit.
   - GREEN: 13/13 passed after explicit adjacent units were supplied for every numeric question in the bank.

## Flow coverage

- Consent is mandatory before any bank question appears.
- Ages 0–12 cannot start without guardian/trusted-adult-assisted mode.
- Ages 13–17 can choose assisted or private adolescent mode.
- Deep is not offered to an ineligible child profile; the UI explains the 150-question minimum and exposes “Use Detailed instead.”
- An eligible adult starts Deep at exactly `Question 1 of 150`.
- Quick completes only after exactly 20 answer-map entries.
- Every bank question visibly offers “Prefer not to say”; it writes `null`, never `undefined`.
- Empty Enter does not advance; a selected valid answer does.
- Back restores selected answers and visibly restores a deliberate skip.
- Every numeric bank question has an adjacent, programmatically associated unit.
- Progress is announced through `aria-live="polite"`.
- Quick/Detailed/Deep produce exactly 2/4/6 intermissions for the current queues, all selected from completed-domain boundaries.
- Intermission Continue focuses the next question heading.
- The unload guard is absent on Landing/consent, present during assessment, and removed on unmount/completion.

## Verification outcomes

- Targeted: `npm test -- assessment.test.tsx` — 13/13 passed.
- Full: `npm test` — 3 test files, 31/31 tests passed.
- Lint: `npm run lint` — exit 0, no ESLint findings.
- Build: `npm run build` — exit 0, all five vinext environments built successfully.
- Whitespace: `git diff --check` — exit 0.
- Persistence/network audit: `rg` over changed runtime files found no `localStorage`, `sessionStorage`, IndexedDB, cookies, `fetch`, XHR, or explicit `undefined` AnswerMap writes.

The test/build output includes Node's existing `DEP0205` warning about `module.register()` and vinext's informational warning that static route classification is currently incomplete. Neither caused a failure.

## Self-review

- The route state matches the required finite screen union and keeps `answers` only in React memory.
- Consent/profile state is not treated as an answer and no answer map key is created until a valid answer or deliberate skip occurs.
- `getAvailableDepths` is called with the real question bank and entered profile; Deep never catches an engine exception or silently changes depth.
- Pediatric copy follows the supplied conservative boundary: no identity/contact/date-of-birth collection, no promise of clinical confidentiality, and guardian assistance is not modeled as a separate recipient/identity.
- The assessment consumes the existing queue/next-question engine and does not add scoring, risk, model, lab OCR, or result behavior.
- Native controls remain keyboard-operable. The question heading is the fieldset's accessible name, numeric units use `aria-describedby`, and keyboard focus is moved only at meaningful screen changes.
- Milestones are computed from actual adjacent domain changes and capped by depth; already-seen milestones are not replayed after Back.
- Reduced motion disables LivingCanopy transitions/animation and hover transforms; the intermission contains no autoplay-like movement.
- The completion screen is explicitly a temporary in-memory handoff, not a fabricated health result.
- Existing Landing and Task 2 files/interfaces were preserved; no unrelated files were changed.

## Concerns / follow-up

- The typed completion handoff intentionally holds answers without presenting results; the results/scoring task must replace that screen.
- The existing Task 2 engine builds a deterministic queue from eligibility at assessment start. This task does not invent a second branching engine or inject newly eligible conditional questions mid-run.
- vinext currently emits an informational “Unknown” route classification during build, and Node emits the upstream `DEP0205` deprecation warning noted above.
