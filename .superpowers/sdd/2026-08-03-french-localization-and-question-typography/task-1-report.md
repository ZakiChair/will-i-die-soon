# Task 1 report: locale context, global selector, and typography

## Scope completed

- Added typed in-memory locale support in `app/i18n/types.ts`, `app/i18n/ui-copy.ts`, and
  `app/i18n/context.tsx`.
- Added a globally rendered `LanguageSwitcher` and placed it above `HomeExperience`, leaving
  the existing screen state owned by `HomeExperience`.
- Added the smaller question-heading desktop/mobile scales, selector target/focus-compatible
  styling, mobile reserved row, and print hiding.
- Added focused context, selector, and typography tests.

## Files changed

- `app/i18n/types.ts`
- `app/i18n/ui-copy.ts`
- `app/i18n/context.tsx`
- `app/i18n/context.test.tsx`
- `app/components/language-switcher.tsx`
- `app/components/language-switcher.test.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/globals.test.ts`

## TDD evidence

### RED

Command:

```sh
npm test -- app/i18n/context.test.tsx app/components/language-switcher.test.tsx app/globals.test.ts
```

Result: failed as intended. The new context and switcher modules were absent, and the typography
test rejected the existing `clamp(2.45rem, 5vw, 5.5rem)` question-heading scale.

### GREEN

Command:

```sh
npm test -- app/i18n/context.test.tsx app/components/language-switcher.test.tsx app/globals.test.ts
```

Result: passed — 3 test files, 10 tests.

## Verification

- `npm run lint` passed.
- `git diff --check` passed.
- Self-review confirmed the locale starts as English, stays in React memory only, updates
  `document.documentElement.lang`, interpolates exact `{name}` tokens, and throws missing keys
  outside production.
- Self-review confirmed no changes to the safety or intermission heading rules, and no Task 2+
  question or presentation translations were added.

## Concerns

`npx tsc --noEmit` remains unavailable as a repository-wide verification command because the
existing configuration includes tests without Vitest globals and has unrelated existing type
errors in assessment, lab import, questionnaire, scoring, risk-engine, and worker files. It did
not report an error in the Task 1 locale files. This task's required focused tests and lint pass.

## Commit

`feat: add in-memory language switching`
