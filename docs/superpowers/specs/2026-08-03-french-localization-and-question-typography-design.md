# French localization and question typography design

## Outcome

`Will I Die Soon?` remains English by default and adds a visible `EN / FR` selector that can
switch the complete experience to international French at any point without losing profile,
answers, imported laboratory context, questionnaire position, or results state. Question
headings become materially smaller on desktop and mobile so long prompts remain calm and easy
to scan.

## Language boundary

- Supported locales are exactly `en` and `fr`; startup locale is `en`.
- Locale is kept in React memory only. It is not written to cookies, URLs, local storage,
  session storage, analytics, or a backend.
- The selector remains reachable on landing, consent, assessment, lab import, intermissions,
  urgent screens, and results. It is a labelled two-button group with a visible selected state.
- Switching locale updates `document.documentElement.lang` to `en` or `fr` and preserves focus,
  answers, the adaptive queue, depth, profile, confirmed labs, and result visibility.
- The brand name `Will I Die Soon?`, official source titles/publishers, URLs, laboratory symbols,
  medicine names, product names, units, and machine-readable answer values remain invariant.
- All other first-party visible copy is translated, including 243 prompts, rationales, option
  labels, consent and minor routes, emergency instructions, lab review, intermissions, risk
  tree labels, qualitative signals, Purity Score explanations, actions, tools, and print copy.
- French uses formal, non-judgmental `vous`, preserves uncertainty language, and must not turn a
  qualitative association into a diagnosis, prognosis, probability, or medication direction.

## Architecture

`app/i18n/context.tsx` owns the in-memory locale and exposes `locale`, `setLocale`, `t`, and
localization helpers. `app/i18n/ui-copy.ts` contains typed flat UI messages and domain labels.
Question translations are split by their existing source groups and combined by
`app/i18n/questions-fr.ts`; each entry is keyed by `question.id`, and option translations are
keyed by the unchanged `option.value`.

The questionnaire engine continues to consume the canonical English `questionBank` and stable
answer values. Components call `localizeQuestion(question, locale)` only at render time. A
completeness test walks the actual bank and rejects a missing prompt, rationale, extra/missing
option key, or blank translation. This keeps branching, scoring, and rules language-neutral.

The evidence/risk engine and score calculation also remain canonical. A presentation adapter
localizes risk leaves by `ruleId`, factor labels by their canonical label, score components by
`questionId`, and action copy by stable action/category IDs. Emergency copy is regenerated in
French from the rule's `emergencyKind`, confirmed country, and already-filtered sources so 911,
999, 144, Swiss poison line 145, and US 988 remain exactly routed. The displayed and exported
report uses the localized presentation objects; IDs, numeric values, evidence tiers, source
metadata, and URLs do not change.

## Visual treatment

The language selector uses the existing paper/deep-water/electric-blue system, 44px minimum
targets, clear `aria-pressed` state, and the existing two-ring focus treatment. It stays above
the screen shell without obscuring the header; mobile spacing reserves its own row. It is
hidden in print because the selected language is already reflected in the document.

`.question-sheet h1` changes from `clamp(2.45rem, 5vw, 5.5rem)` to
`clamp(1.9rem, 3.4vw, 3.75rem)`, with line-height `1.02` and letter-spacing `-0.045em`. At 560px
and below it uses `clamp(1.7rem, 7.4vw, 2.6rem)`. Urgent and intermission headings retain their
own intentional scales.

## Failure behavior and verification

- English never depends on a translation lookup and remains the exact canonical fallback.
- French completeness is a release gate; the application does not silently mix English into a
  French question or result when an identifier is known.
- Invalid locale values cannot enter the context API.
- Tests prove locale switching preserves a typed answer and current question, all 243 questions
  and option values are covered, emergency numbers remain correct, French results retain
  evidence links, JSON export uses localized display copy without changing schema, and the
  smaller question scale applies at desktop and mobile widths.
- Browser verification covers one English→French switch during a live assessment, one French
  urgent route, one French intermission, one French adult results screen, focus visibility,
  390px layout, and no storage/network write caused by changing language.

## Release boundary

This remains a private research prototype and not medical care. French availability does not
expand the evidence model, jurisdictions, age policy, or release classification. Public or
regulated French release requires separate qualified medical/legal localization review.
