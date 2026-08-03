# French Localization and Question Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete in-memory English/French switching across the existing private health explorer and reduce oversized question headings without changing questionnaire, risk, score, or privacy behavior.

**Architecture:** Keep all audited data and decisions canonical, keyed by stable IDs, and localize only render/export presentation objects. A client context owns the non-persisted locale; typed UI dictionaries, complete question dictionaries, and risk/score adapters provide French copy while external evidence titles and machine values stay invariant.

**Tech Stack:** Next/Vinext, React 19, TypeScript 5.9, Vitest, Testing Library, existing CSS and data-driven question/risk/scoring modules.

## Global Constraints

- Supported locales are exactly `en` and `fr`; default is `en`; no locale persistence or URL state.
- Switching language must not reset age, country, depth, answers, adaptive queue, labs, current screen, private handoff, or results.
- Cover every current question in `questionBank` (243 at plan time), every option value, every enabled risk rule, and all first-party visible result/action copy.
- French copy must preserve direct urgent action, uncertainty, medicine neutrality, age gates, country numbers, and source applicability.
- Official source titles/publishers, URLs, brand, medicine/product names, lab symbols, units, answer values, rule IDs, and schema keys remain canonical.
- No new runtime dependency, fetch, analytics, cookie, storage API, or backend.
- `.question-sheet h1` must use `clamp(1.9rem, 3.4vw, 3.75rem)` and mobile `clamp(1.7rem, 7.4vw, 2.6rem)`; urgent/intermission scales remain separate.

---

### Task 1: Locale context, global selector, and typography

**Files:**
- Create: `app/i18n/types.ts`
- Create: `app/i18n/ui-copy.ts`
- Create: `app/i18n/context.tsx`
- Create: `app/i18n/context.test.tsx`
- Create: `app/components/language-switcher.tsx`
- Create: `app/components/language-switcher.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Produces: `type Locale = "en" | "fr"`, `I18nProvider`, and `useI18n(): { locale; setLocale; t }`.
- Produces: `t(key, variables?)` where variables replace exact `{name}` tokens and missing keys throw in tests/development.
- Produces: one `LanguageSwitcher` rendered outside the screen-state branches so switching cannot recreate `HomeExperience` state.

- [ ] **Step 1: Write failing locale and typography tests.**

```tsx
expect(screen.getByRole("group", { name: /language|langue/i })).toBeVisible();
await user.click(screen.getByRole("button", { name: "Français" }));
expect(document.documentElement).toHaveAttribute("lang", "fr");
expect(screen.getByRole("button", { name: "Français" })).toHaveAttribute("aria-pressed", "true");
```

```ts
expect(css).toMatch(/\.question-sheet h1[^{]*\{[^}]*font-size:\s*clamp\(1\.9rem,\s*3\.4vw,\s*3\.75rem\)/s);
expect(css).toMatch(/@media \(max-width: 560px\)[\s\S]+\.question-sheet h1[^{]*\{[^}]*clamp\(1\.7rem,\s*7\.4vw,\s*2\.6rem\)/s);
```

- [ ] **Step 2: Run the focused RED suite.**

Run: `npm test -- app/i18n/context.test.tsx app/components/language-switcher.test.tsx app/globals.test.ts`

Expected: failures for absent provider/switcher and old `5.5rem` question maximum.

- [ ] **Step 3: Implement the typed in-memory context and selector.**

```ts
export type Locale = "en" | "fr";
export type MessageVariables = Readonly<Record<string, string | number>>;
```

```tsx
const [locale, setLocale] = useState<Locale>("en");
useEffect(() => {
  document.documentElement.lang = locale;
}, [locale]);
```

`Home` must render `<I18nProvider><LanguageSwitcher /><HomeExperience /></I18nProvider>` so
`HomeExperience` owns the existing `screen` state below the provider and selector. Implement
44px targets, `aria-pressed`, visible focus, mobile reserved space, and `@media print { display:
none; }`. Do not read or write browser storage.

- [ ] **Step 4: Apply the exact question heading scale.**

Replace only the base `.question-sheet h1` scale/spacing and add the 560px override. Confirm
`.safety-screen h1` and `.intermission h1` retain their explicit rules.

- [ ] **Step 5: Run focused tests, lint, and commit.**

Run: `npm test -- app/i18n/context.test.tsx app/components/language-switcher.test.tsx app/globals.test.ts`

Run: `npm run lint`

Commit: `feat: add in-memory language switching`

---

### Task 2: Complete French question corpus

**Files:**
- Create: `app/i18n/question-types.ts`
- Create: `app/i18n/questions-fr-core.ts`
- Create: `app/i18n/questions-fr-lifestyle.ts`
- Create: `app/i18n/questions-fr-clinical.ts`
- Create: `app/i18n/questions-fr-substances.ts`
- Create: `app/i18n/questions-fr-medications.ts`
- Create: `app/i18n/questions-fr-labs.ts`
- Create: `app/i18n/questions-fr.ts`
- Create: `app/i18n/questions-fr.test.ts`

**Interfaces:**
- Produces: `QuestionTranslation = { prompt: string; why: string; options?: Readonly<Record<string, string>> }`.
- Produces: `localizeQuestion(question: Question, locale: Locale): Question` without mutating the canonical question or changing option values.
- Consumes: all six arrays that form `questionBank`.

- [ ] **Step 1: Write a corpus completeness test against the real bank.**

```ts
expect(Object.keys(frQuestionTranslations).sort()).toEqual(
  questionBank.map(({ id }) => id).sort(),
);
for (const question of questionBank) {
  const translated = frQuestionTranslations[question.id];
  expect(translated.prompt.trim()).not.toBe("");
  expect(translated.why.trim()).not.toBe("");
  expect(Object.keys(translated.options ?? {}).sort()).toEqual(
    (question.options ?? []).map(({ value }) => value).sort(),
  );
}
```

Also assert the plan-time count is 243, localized values retain every canonical option value,
and `localizeQuestion(question, "en") === question`.

- [ ] **Step 2: Run the corpus test RED.**

Run: `npm test -- app/i18n/questions-fr.test.ts`

Expected: missing translation modules/243 entries.

- [ ] **Step 3: Translate the six source groups in parallel-owned files.**

Use formal international French, retain exact medicine/product names and units, translate both
`prompt` and `why`, and map every option by `value`. Preserve distinctions such as prescribed
versus non-prescribed use, current versus former use, uncertainty, pregnancy/postpartum timing,
assisted-minor support, and immediate versus historical symptoms. Do not soften emergency copy
or introduce diagnosis/probability wording.

- [ ] **Step 4: Aggregate and implement render-only localization.**

```ts
export function localizeQuestion(question: Question, locale: Locale): Question {
  if (locale === "en") return question;
  const copy = frQuestionTranslations[question.id];
  if (!copy) throw new Error(`Missing French question: ${question.id}`);
  return {
    ...question,
    prompt: copy.prompt,
    why: copy.why,
    options: question.options?.map((option) => ({
      ...option,
      label: copy.options?.[option.value] ?? missingOption(question.id, option.value),
    })),
  };
}
```

- [ ] **Step 5: Run corpus/full-questionnaire tests and commit.**

Run: `npm test -- app/i18n/questions-fr.test.ts app/lib/questionnaire.test.ts app/data/questions.test.ts`

Commit: `feat: translate the complete question bank into French`

---

### Task 3: French clinical presentation adapters

**Files:**
- Create: `app/i18n/risk-copy-fr.ts`
- Create: `app/i18n/score-copy-fr.ts`
- Create: `app/i18n/presentation.ts`
- Create: `app/i18n/presentation.test.ts`
- Modify: `app/lib/types.ts` only if a readonly presentation type is required; do not change rule evaluation contracts.

**Interfaces:**
- Produces: `localizeRiskLeaves(leaves, locale, profile): RiskLeaf[]`.
- Produces: `localizePurityScore(score, locale): PurityScoreResult`.
- Produces: `localizeActions(actions, locale): ActionItem[]` and localized protective-root helpers.
- Consumes: stable `ruleId`, factor labels, `questionId`, score category IDs, action IDs, country, and already-applicable sources.

- [ ] **Step 1: Write RED coverage and safety tests.**

Tests must enumerate every `riskRules` ID, every unique factor label, score category/component,
and action ID. Exercise Swiss overdose (`144` and `145`), US self-harm (`911` and `988`), GB
emergency (`999`), and OTHER-country generic instructions. Assert source objects/URLs and all
numeric score values are referentially unchanged after localization.

Run: `npm test -- app/i18n/presentation.test.ts`

- [ ] **Step 2: Translate rule and score copy by stable identifiers.**

Keep `may be associated with` semantics as `peut être associé à`, `worth discussing` as
`mérite d’être discuté`, and direct emergency imperatives as direct imperatives. Do not use
`vous avez`, `vous développerez`, a disease percentage, or a direction to start/stop/change a
medicine.

- [ ] **Step 3: Implement immutable presentation transforms.**

Look up the canonical rule to recover `emergencyKind` when needed; regenerate localized
country-aware emergency copy from that kind and the leaf's already-filtered sources. Clone
only display fields. Keep `id`, `ruleId`, versions, urgency, signal, applicability, evidence
tier, source metadata, score, points, coverage, question IDs, and action order unchanged.

- [ ] **Step 4: Run risk/score regressions and commit.**

Run: `npm test -- app/i18n/presentation.test.ts app/lib/risk-engine.test.ts app/lib/scoring.test.ts app/lib/export.test.ts`

Commit: `feat: localize risk and score presentation in French`

---

### Task 4: Translate all screen components and preserve live state

**Files:**
- Modify: `app/components/landing.tsx`
- Modify: `app/components/consent-screen.tsx`
- Modify: `app/components/assessment.tsx`
- Modify: `app/components/question-control.tsx`
- Modify: `app/components/intermission.tsx`
- Modify: `app/components/lab-import.tsx`
- Modify: `app/components/living-canopy.tsx`
- Modify: `app/components/risk-tree.tsx`
- Modify: `app/components/results.tsx`
- Modify: corresponding `app/components/*.test.tsx`
- Modify: `app/page.tsx`
- Create: `app/page.test.tsx`

**Interfaces:**
- Consumes: `useI18n`, `localizeQuestion`, and Task 3 presentation adapters.
- Produces: complete bilingual render and localized printed/JSON display copy while preserving canonical schema and answer values.

- [ ] **Step 1: Add RED component and integration tests.**

Start a Detailed assessment in English, answer the first question, switch to French, and assert
the current localized question and selected answer remain. Cover French boolean/control labels,
progress/domain/units, consent/minor routes, intermission, lab import errors/manual rows, urgent
screen, adult score, adolescent map, child guide, evidence panel, action plan, export controls,
and restart. Assert no English first-party UI marker from a curated sentinel list remains in
French screens; official source titles are permitted.

- [ ] **Step 2: Replace component literals with typed messages.**

Use `t` for fixed/dynamic UI strings and `localizeQuestion` only on the current rendered
question. Translate domain labels through `domain.{healthDomain}` keys. Keep input names,
question IDs, values, types, limits, and event handlers unchanged.

- [ ] **Step 3: Localize displayed and exported results.**

Calculate risks/score/actions canonically, transform presentation after calculation, and pass
localized objects to `RiskTree`, score/actions UI, print DOM, and `createRedactedExport`.
External source titles/publishers and URLs remain canonical. JSON schema keys and IDs remain
unchanged; visible copy values follow the selected locale.

- [ ] **Step 4: Run focused then full verification.**

Run: `npm test -- app/page.test.tsx app/components/assessment.test.tsx app/components/question-control.test.tsx app/components/lab-import.test.tsx app/components/results.test.tsx app/components/risk-tree.test.tsx`

Run: `npm test -- --run`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

- [ ] **Step 5: Browser-check desktop/mobile and commit.**

At 1440px and 390px, switch to French during a live Quick route, reach an intermission, and
confirm no overflow, visible focus, smaller question headings, no state loss, correct `lang`,
and no locale-related storage/network write. Exercise a French emergency screen and a French
results screen with evidence links.

Commit: `feat: deliver the complete bilingual health journey`

---

### Task 5: Localization release gate and handoff into final audit

**Files:**
- Create: `.superpowers/sdd/2026-08-03-french-localization/task-report.md`
- Modify: `docs/superpowers/specs/2026-08-03-health-risk-explorer-design.md`
- Modify: `docs/superpowers/plans/2026-08-03-health-risk-explorer-implementation.md`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: reviewed bilingual scope for the existing final content/privacy/deployment Task 8.

- [ ] **Step 1: Run release-gate scans.**

Assert 243/243 question coverage, every risk/action/score identifier covered, no `localStorage`,
`sessionStorage`, `document.cookie`, locale query string, new `fetch(`, or analytics package,
and no French string that states a diagnosis, deterministic future disease, or medication dose
change.

- [ ] **Step 2: Run an independent controller review.**

Review translation completeness, safety-equivalence samples across every domain, emergency
numbers, state preservation, typography, accessibility, privacy, full tests, lint, build, and
diff integrity. Correct every Critical/Important finding and re-review to approval.

- [ ] **Step 3: Document and commit the approved gate.**

Record exact counts, commands, browser widths/routes, remaining release boundary, and commit
range. Update the original product spec from English-only to English-default bilingual private
research access, then mark Task 7 and localization complete in the main SDD ledger.

Commit: `docs: record bilingual release verification`
