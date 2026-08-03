# Will I Die Soon? Health Risk Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and privately deploy a polished, local-only, English-default bilingual English/French health-risk questionnaire with three adaptive depths, original visual intermissions, transparent evidence rules, local lab import, a wellness Purity Score, and an explainable risk tree.

**Architecture:** A client-only React application keeps transient assessment and locale state in memory. Typed questionnaire and evidence registries feed pure selection, scoring, safety, and report functions; UI routes consume those functions without embedding health logic. English remains canonical, while typed French dictionaries and presentation adapters localize render/export copy without changing IDs, machine values, sources, units, rules, or scores. Heavy file parsers load only after a user selects a lab file, and no assessment answer crosses the network.

**Tech Stack:** Sites vinext starter, React, TypeScript, Tailwind CSS, Vitest, Testing Library, lucide-react, Framer Motion, pdfjs-dist, Tesseract.js, browser File APIs.

## Global Constraints

- Supported interface/report languages are exactly English and French; English is the default, and the locale is neither persisted nor encoded in the URL.
- No account, backend, analytics, cookies, session replay, remote inference, or answer persistence.
- Quick selects exactly 20 questions; Detailed selects exactly 50; Deep adaptively selects 150–200 eligible questions from at least 220 curated items.
- Numeric disease probabilities can originate only from an enabled `validated-estimate` model with complete eligibility and test vectors.
- The Purity Score excludes age, sex, ethnicity, disability, diagnoses, family history, and unavoidable exposures.
- Medication and substance results do not advise starting, stopping, or changing a dose.
- All sensitive questions are skippable.
- All animation supports reduced motion, and all controls are keyboard and touch accessible.
- The implementation is a private research prototype, not a clinically validated or publicly cleared medical product.

---

## File map

- `app/page.tsx`: route-level application shell and screen transitions.
- `app/layout.tsx`: fonts, metadata, and social preview metadata.
- `app/globals.css`: token system, layout primitives, motion, and print styles.
- `app/components/landing.tsx`: product thesis, privacy promise, and mode entry.
- `app/components/consent-screen.tsx`: consent, age, country, and assisted-minor routing.
- `app/components/assessment.tsx`: one-question stage, navigation, progress, and intermissions.
- `app/components/question-control.tsx`: accessible controls for every answer type.
- `app/components/lab-import.tsx`: local file extraction and confirmation UI.
- `app/components/risk-tree.tsx`: interactive result tree and evidence leaves.
- `app/components/results.tsx`: urgent-first result composition, Purity Score, actions, and export.
- `app/components/living-canopy.tsx`: code-native tree visualization used across screens.
- `app/data/questions/*.ts`: curated domain question data.
- `app/data/evidence.ts`: evidence source registry.
- `app/data/rules.ts`: transparent qualitative rule definitions.
- `app/lib/types.ts`: shared domain types.
- `app/lib/questionnaire.ts`: eligibility, branching, and depth selection.
- `app/lib/scoring.ts`: Purity Score and coverage.
- `app/lib/risk-engine.ts`: evidence-tier-enforced result evaluation.
- `app/lib/labs.ts`: local text parsing and unit normalization.
- `app/lib/export.ts`: redacted JSON and printable report construction.
- `app/lib/release-policy.ts`: prototype/wellness/regulated feature policy.
- `app/i18n/*`: typed in-memory locale context plus complete French question, UI, risk, score, action, and protective-root presentation dictionaries.
- `app/**/*.test.ts(x)`: colocated unit and component tests.
- `public/media/*`: generated artwork and derived silent loops.

---

### Task 1: Scaffold, test harness, and distinctive landing shell

**Files:**
- Create: project scaffold files from the Sites initializer
- Modify: `package.json`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `app/components/landing.tsx`
- Create: `app/components/living-canopy.tsx`
- Test: `app/components/landing.test.tsx`

**Interfaces:**
- Produces: `Landing({ onStart }: { onStart: (depth: AnalysisDepth) => void })`
- Produces: `LivingCanopy({ progress, tone, reducedMotion }: LivingCanopyProps)`

- [ ] **Step 1: Initialize the Sites project once and retain its vinext hosting structure.**

Run the plugin initializer from `/Users/zakichair/will-i-die-soon`, then inspect `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, and `.openai/hosting.json`.

- [ ] **Step 2: Add the unit/component test harness and write a failing landing test.**

```tsx
render(<Landing onStart={onStart} />)
expect(screen.getByRole('heading', { name: /your health is not a verdict/i })).toBeVisible()
await user.click(screen.getByRole('button', { name: /choose quick/i }))
expect(onStart).toHaveBeenCalledWith('quick')
```

Run `npm test -- landing.test.tsx`; expect failure because `Landing` does not exist.

- [ ] **Step 3: Implement the visual tokens and landing component.**

Define `--paper`, `--ink`, `--deep-water`, `--electric-blue`, `--living-coral`, and `--signal-amber` from the design spec. Use Bricolage Grotesque for display, Manrope for body, and IBM Plex Mono for data labels. Implement the three explicit depth actions and privacy/evidence copy. Keep the living canopy code-native and semantic; do not use a generated diagram.

- [ ] **Step 4: Remove starter preview artifacts and validate the landing.**

Run `npm test -- landing.test.tsx` and `npm run build`; both must pass. Remove `_sites-preview`, the starter metadata marker, and unused skeleton dependency before committing.

- [ ] **Step 5: Commit the shell.**

```bash
git add .
git commit -m "feat: establish private health explorer shell"
```

### Task 2: Typed questionnaire engine and 220+ curated questions

**Files:**
- Create: `app/lib/types.ts`
- Create: `app/lib/questionnaire.ts`
- Create: `app/data/questions/core.ts`
- Create: `app/data/questions/lifestyle.ts`
- Create: `app/data/questions/clinical.ts`
- Create: `app/data/questions/substances.ts`
- Create: `app/data/questions/medications.ts`
- Create: `app/data/questions/labs.ts`
- Create: `app/data/questions/index.ts`
- Test: `app/lib/questionnaire.test.ts`

**Interfaces:**
- Produces: `Question`, `AnswerValue`, `AnswerMap`, `AnalysisDepth`, `ProfileContext`, and `BranchCondition` types.
- Produces: `getEligibleQuestions(bank, context, answers): Question[]`
- Produces: `buildAssessmentQueue(depth, bank, context, answers): Question[]`
- Produces: `getNextQuestion(state): Question | null`

- [ ] **Step 1: Write failing invariants for the question bank and selectors.**

```ts
expect(questionBank.length).toBeGreaterThanOrEqual(220)
expect(new Set(questionBank.map((q) => q.id)).size).toBe(questionBank.length)
expect(buildAssessmentQueue('quick', questionBank, adult, {}).length).toBe(20)
expect(buildAssessmentQueue('detailed', questionBank, adult, {}).length).toBe(50)
expect(buildAssessmentQueue('deep', questionBank, adult, {}).length).toBeGreaterThanOrEqual(150)
expect(buildAssessmentQueue('deep', questionBank, adult, {}).length).toBeLessThanOrEqual(200)
expect(getEligibleQuestions(questionBank, child, {})).not.toContainEqual(expect.objectContaining({ minAge: 18 }))
```

Run `npm test -- questionnaire.test.ts`; expect missing-module failure.

- [ ] **Step 2: Define the question schema and deterministic selection rules.**

```ts
export type Question = {
  id: string
  domain: HealthDomain
  prompt: string
  why: string
  answerType: 'boolean' | 'single' | 'multi' | 'number' | 'scale' | 'text'
  options?: ReadonlyArray<{ value: string; label: string }>
  tiers: ReadonlyArray<AnalysisDepth>
  priority: number
  sensitive?: boolean
  minAge?: number
  maxAge?: number
  condition?: BranchCondition
  consumers: ReadonlyArray<string>
}
```

Selection must be stable by `priority` then `id`, reserve required core items first, apply age/answer eligibility, and cap at 20, 50, or 200. Deep must not pad with ineligible questions.

- [ ] **Step 3: Curate domain files with meaningful, non-duplicated items.**

Every item must have real wording, a `why` explanation, an answer type, applicability, and at least one consumer. Cover all domains listed in the design spec, including routes for GLP-1 medicines, anabolic steroids, corticosteroids, research peptides, minoxidil route, isotretinoin, recreational substances, sleep, recent blood testing, and current medication use. Add “Prefer not to say” to sensitive categorical controls through the renderer rather than duplicating it in each item.

- [ ] **Step 4: Pass invariant and branch tests.**

Add tests proving `uses_glp1=false` removes GLP-1 detail questions, `has_recent_labs=false` removes lab-value questions, and `current_medications=false` removes medication-detail questions. Run `npm test -- questionnaire.test.ts`; expect all tests to pass.

- [ ] **Step 5: Commit the engine and bank.**

```bash
git add app/lib app/data app/**/*.test.ts
git commit -m "feat: add adaptive evidence-aware question bank"
```

### Task 3: Consent, assessment flow, and visual pacing

**Files:**
- Create: `app/components/consent-screen.tsx`
- Create: `app/components/assessment.tsx`
- Create: `app/components/question-control.tsx`
- Create: `app/components/intermission.tsx`
- Modify: `app/page.tsx`
- Test: `app/components/assessment.test.tsx`

**Interfaces:**
- Consumes: `buildAssessmentQueue`, `getNextQuestion`, `Question`, and `AnswerMap` from Task 2.
- Produces: `ConsentScreen({ depth, onAccept }: ConsentScreenProps)`
- Produces: `Assessment({ depth, profile, onComplete }: AssessmentProps)`

- [ ] **Step 1: Write failing flow tests.**

Test that consent is required, an under-18 profile reveals assisted-minor routing, a sensitive item can be skipped, Enter advances only after a valid answer, Back preserves an in-memory answer, and Quick completes after exactly 20 answered items.

- [ ] **Step 2: Implement route-level state as a finite screen union.**

```ts
type AppScreen =
  | { kind: 'landing' }
  | { kind: 'consent'; depth: AnalysisDepth }
  | { kind: 'assessment'; depth: AnalysisDepth; profile: ProfileContext }
  | { kind: 'results'; answers: AnswerMap; profile: ProfileContext }
```

Do not serialize `answers`. Add a `beforeunload` prompt only while an assessment is in progress.

- [ ] **Step 3: Implement accessible controls and progress.**

Use native `fieldset`, `legend`, `input`, and `button` semantics. Announce `Question N of M` through an `aria-live="polite"` region. Numeric fields show units beside, not inside, the input. “Prefer not to say” stores `null` and advances.

- [ ] **Step 4: Add milestone intermissions without answer loss.**

Show at most two intermissions in Quick, four in Detailed, and six in Deep, at completed-domain boundaries. Continue returns focus to the next question. Reduced motion disables transforms and autoplay-like movement.

- [ ] **Step 5: Run flow tests and commit.**

Run `npm test -- assessment.test.tsx` and the full `npm test`; commit with `feat: build adaptive assessment journey`.

### Task 4: Local lab import and confirmation

**Files:**
- Create: `app/lib/labs.ts`
- Create: `app/components/lab-import.tsx`
- Test: `app/lib/labs.test.ts`
- Test: `app/components/lab-import.test.tsx`

**Interfaces:**
- Produces: `extractLabText(file: File): Promise<string>`
- Produces: `parseLabCandidates(text: string): LabCandidate[]`
- Produces: `normalizeLabValue(candidate: LabCandidate): NormalizedLabValue`
- Produces: `LabImport({ onConfirm, onCancel }: LabImportProps)`

- [ ] **Step 1: Write failing parser tests using synthetic local text.**

```ts
expect(parseLabCandidates('HbA1c 5.7 % (4.0 - 5.6)')).toContainEqual(
  expect.objectContaining({ marker: 'hba1c', value: 5.7, unit: '%' })
)
expect(normalizeLabValue({ marker: 'glucose', value: 5.5, unit: 'mmol/L' }).normalizedUnit).toBe('mg/dL')
```

Also test cholesterol, HDL, LDL, triglycerides, ALT, AST, creatinine, eGFR, TSH, hemoglobin, ferritin, and vitamin D aliases without diagnosing any value.

- [ ] **Step 2: Implement deterministic parsing and unit normalization.**

Preserve original strings and ranges. Reject impossible numeric syntax rather than guessing. Implement only documented conversion pairs and round display values without mutating the stored normalized number.

- [ ] **Step 3: Implement client-only file extraction with dynamic imports.**

Plain text uses `File.text()`. PDFs dynamically import `pdfjs-dist`; images dynamically import `tesseract.js`. The component visibly states “Processed on this device.” Unsupported or failed extraction opens the manual entry grid.

- [ ] **Step 4: Require confirmation and test privacy behavior.**

No candidate reaches answers until the user checks it and confirms its marker, value, unit, date, fasting state, and laboratory range. Mock `fetch` and assert that selecting and parsing a file causes zero application network requests.

- [ ] **Step 5: Run tests and commit.**

Run both lab test files and `npm run build`; commit with `feat: add on-device lab result import`.

### Task 5: Evidence registry, urgent rules, and qualitative risk engine

**Files:**
- Create: `app/data/evidence.ts`
- Create: `app/data/rules.ts`
- Create: `app/lib/release-policy.ts`
- Create: `app/lib/risk-engine.ts`
- Test: `app/lib/risk-engine.test.ts`

**Interfaces:**
- Produces: `EvidenceSource`, `RiskRule`, `RiskLeaf`, and `ReleasePolicy`.
- Produces: `evaluateRisks(answers, profile, policy): RiskLeaf[]`
- Produces: `sortRisksForDisplay(leaves): RiskLeaf[]`
- Produces: `assertEvidenceContract(leaf): void`

- [ ] **Step 1: Write failing evidence-contract tests.**

```ts
expect(() => assertEvidenceContract({ evidenceTier: 'guideline-action', probability: 0.42 } as RiskLeaf)).toThrow()
expect(sortRisksForDisplay([longTerm, urgent])[0].urgency).toBe('urgent')
expect(evaluateRisks({}, adult, prototypePolicy).every((leaf) => leaf.sources.length > 0)).toBe(true)
```

- [ ] **Step 2: Implement release policy gates.**

```ts
export const prototypePolicy: ReleasePolicy = {
  audience: 'private-research',
  allowQualitativeRules: true,
  allowValidatedProbabilities: false,
  allowUrgentSignals: true,
}
```

The public-wellness policy disables clinical probabilities and triage conclusions; regulated modules require an explicit jurisdiction and enabled model version.

- [ ] **Step 3: Curate transparent rule groups.**

Create independent groups for immediate red flags, cardiovascular signals, metabolic signals, sleep, respiratory, liver, kidney, mental wellbeing, dependency, medication/substance review, preventive follow-up, skin/hair, reproductive health, and musculoskeletal health. Each rule names exact question inputs and authoritative source URLs. Closely related inputs produce one leaf with multiple factors rather than duplicate alarms.

- [ ] **Step 4: Enforce output language and missing-data behavior.**

Risk copy uses “may be associated with,” “worth discussing,” or direct emergency action language. It never says “you have,” “you will develop,” or produces a non-validated percentage. Missing inputs reduce confidence and list what would improve the assessment.

- [ ] **Step 5: Pass tests and commit.**

Run `npm test -- risk-engine.test.ts` and commit with `feat: add transparent evidence-tiered risk engine`.

### Task 6: Fair Purity Score, risk tree, actions, and export

**Files:**
- Create: `app/lib/scoring.ts`
- Create: `app/lib/export.ts`
- Create: `app/components/risk-tree.tsx`
- Create: `app/components/results.tsx`
- Modify: `app/page.tsx`
- Test: `app/lib/scoring.test.ts`
- Test: `app/components/results.test.tsx`

**Interfaces:**
- Produces: `calculatePurityScore(answers): PurityScoreResult`
- Produces: `buildActionPlan(leaves, score): ActionItem[]`
- Produces: `createRedactedExport(report): Blob`
- Produces: `Results({ answers, profile, onRestart }: ResultsProps)`

- [ ] **Step 1: Write failing fairness and result-priority tests.**

Prove that changing only age, sex, ethnicity, diagnosis, or family history leaves the Purity Score unchanged; skipped answers change coverage but not numerator; urgent leaves render before the score; and the export omits raw free-text, file names, birth date, and exact location.

- [ ] **Step 2: Implement category-normalized scoring.**

Compute eight equally inspectable category subscores and reweight only across answered modifiable categories. Return `score`, `coverage`, `categories`, and `explanations`. Cap every question’s contribution so no single answer dominates the total.

- [ ] **Step 3: Implement the living risk canopy as navigation.**

Root is “You today”; first-level branches are urgent, medical review, longer-term domains, and protective roots. Selecting a leaf opens an adjacent evidence panel. Use semantic buttons and nested lists beneath the visual layer so the entire tree works without pointer precision or color perception.

- [ ] **Step 4: Implement prioritized actions and local export.**

Choose at most three initial actions, de-duplicate related advice, and display why each action appears. `window.print()` provides PDF output; JSON export contains only the interpreted report by default, with a separate explicit toggle for raw answers.

- [ ] **Step 5: Run tests and commit.**

Run scoring, results, and full tests; commit with `feat: deliver explainable risk tree and purity score`.

### Task 7: Original imagery, silent loops, and interaction polish

**Files:**
- Create: `public/media/canopy-hero.webp`
- Create: `public/media/sleep-intermission.webp`
- Create: `public/media/metabolism-intermission.webp`
- Create: `public/media/recovery-intermission.webp`
- Create: `public/media/canopy-loop.mp4`
- Create: `public/og.png`
- Modify: `app/components/intermission.tsx`
- Modify: `app/components/landing.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: stable palette, headline, and living-canopy motif from Tasks 1 and 3.
- Produces: optimized, locally served art assets and one silent derived motion loop.

- [ ] **Step 1: Generate four original project-bound images using the built-in image generation tool.**

Use one coherent prompt family: editorial scientific landscapes made from translucent tissue-like contours, mineral paper textures, cobalt/electric-blue paths, coral signal points, no text, no logos, no anatomical misinformation, and useful negative space. Generate each subject separately and inspect each output before moving it into `public/media`.

- [ ] **Step 2: Derive a lightweight silent loop from the hero still.**

Use a slow pan/scale and subtle grain with no flashing, no sound track, and a duration long enough to avoid a visibly abrupt repeat. Export H.264 MP4 with a poster image; retain the still as the reduced-motion and unsupported-video fallback.

- [ ] **Step 3: Wire purposeful media and performance behavior.**

Lazy-load intermission imagery, preload only the hero poster, set explicit dimensions, and never block answering while media loads. Stop decorative motion when the document is hidden.

- [ ] **Step 4: Generate and validate exactly one social card.**

The card must contain the final brand name and headline verbatim, reuse the final palette and canopy motif, and remain legible in a landscape unfurl. If generated text is incorrect, retry once; otherwise omit image metadata rather than shipping broken text.

- [ ] **Step 5: Run accessibility/static checks and commit.**

Verify reduced motion, focus order, contrast, responsive layouts, and asset sizes. Commit with `feat: add original visual intermissions and motion`.

### Completed addendum: bilingual presentation and question typography

The English-default/French in-memory localization and smaller question-heading work is complete
under [the localization implementation plan](./2026-08-03-french-localization-and-question-typography.md).
Its release gate verifies exact coverage for 243 questions, 54 risk rules, 80 distinct factor
labels across 100 occurrences, 9 emergency kinds across 36 country paths, 8 score categories,
21 score components across 116 variants, 9 reachable action IDs, 9 protective roots, 330 UI
keys in each language, and 47 live health domains. Locale switching and localized export remain
presentation-only, in-memory, state-preserving, and schema-preserving.

This addendum does not complete or replace Task 8. Final evidence/privacy documentation, clean
installation verification, security and dependency review, canonical-origin configuration,
source-state saving, and owner-only deployment remain open below.

### Task 8: Final content audit, verification, and private deployment

**Files:**
- Create: `docs/evidence-register.md`
- Create: `docs/privacy-and-release.md`
- Create: `README.md`
- Modify: `.openai/hosting.json`
- Modify: any file implicated by verification failures

**Interfaces:**
- Consumes: the complete application.
- Produces: verified build, documentation, saved Sites version, and owner-only production deployment.

- [ ] **Step 1: Document evidence and release boundaries.**

List every enabled rule group, source URL, evidence tier, last-reviewed date, intended population, and release policy. Document that the production deployment is private research access and that public wellness/regulated releases require separate review.

- [ ] **Step 2: Run automated verification from a clean install.**

Run `npm ci`, `npm test -- --run`, and `npm run build`. Search the production code for `fetch(`, analytics packages, storage APIs, “you will develop,” and unguarded `%` disease outputs. Resolve every unexpected match.
Apply the same calibrated-language and medicine-neutrality scans to both English and French
presentation corpora.

- [ ] **Step 3: Review React quality and bundle behavior.**

Confirm stable component definitions, direct imports, lazy heavy parsers, accessible semantics, derived state computed during render, and no unnecessary effect synchronization. Confirm the long question bank does not render all items simultaneously.

- [ ] **Step 4: Perform final security and privacy checks.**

Verify lab files never leave the device, no answer appears in a URL or persistent browser store, exports require explicit clicks, and restarts clear in-memory answers. Confirm public assets contain no embedded user data.

- [ ] **Step 5: Commit, save, and privately deploy the exact verified source state.**

Commit with `chore: verify private research prototype`. Push the exact commit to the Sites source repository, save a version for that commit, and use the private-deployment path only after confirming owner-only access. Poll deployment status to completion and record the resulting URL without exposing credentials.

## Plan self-review

- Spec coverage: every product requirement maps to Tasks 1–8.
- Placeholder scan: no unresolved `TBD`, `TODO`, “implement later,” or unnamed error handling remains.
- Type consistency: `AnalysisDepth`, `ProfileContext`, `AnswerMap`, `RiskLeaf`, `ReleasePolicy`, and `PurityScoreResult` are introduced before consumption.
- Scope: this plan delivers the private prototype and the policy foundation; public wellness and regulated medical release work are deliberately separate future plans.
