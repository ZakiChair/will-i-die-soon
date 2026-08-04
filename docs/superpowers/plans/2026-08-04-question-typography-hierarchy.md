# Question Typography Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace oversized monolithic questionnaire headings with the approved option C: a calm short title, complete supporting criteria for eight dense bilingual prompts, a narrower chapter rail, and responsive typography that keeps the first answer visible.

**Architecture:** Keep canonical `Question.prompt` data, French localization, answer state, branching, scoring, and exports unchanged. Add one pure presentation resolver keyed by eight stable question IDs, render its output through a small semantic `QuestionPrompt` component, and connect optional detail text to the existing answer `fieldset` with `aria-describedby`. Apply the approved proportions only to the ordinary questionnaire while preserving the urgent screen's current typography.

**Tech Stack:** Next/Vinext, React 19.2.8, TypeScript 5.9, Vitest 4.1, Testing Library, CSS, Node 24.13.0, Chrome browser QA, Sites private owner-only hosting.

## Global Constraints

- Implement the user-approved visual option C: short question title plus complete, visibly rendered detail text.
- Curate exactly these eight IDs: `urgent_breathing_now`, `adolescent_substance_severe_timing`, `urgent_severe_allergy_now`, `corticosteroid_detail_infection_context`, `urgent_stroke_signs_now`, `isotretinoin_detail_symptoms`, `glp1_detail_relevant_history`, and `minoxidil_detail_cardiac_symptoms`.
- Do not modify `Question`, `questionBank`, question IDs, answer options, question eligibility, depth budgets, queue order, branching, risk rules, score calculations, lab handling, or export schemas.
- Do not replace canonical English or French full prompts. The new catalog is presentation-only and is called after `localizeQuestion`.
- Every curated ID must have a non-empty English and French `title` and `detail`; an unknown ID or invalid curated entry falls back to the complete localized prompt as its title with no detail.
- Keep `QuestionControl key={question.id}` so an answer draft survives a locale change.
- Keep the current question-focus effect independent of `locale`; switching languages must leave focus on the language button.
- The answer `fieldset` uses `aria-labelledby="question-title"` and receives `aria-describedby="question-detail"` only when that detail element exists.
- Desktop layout is exactly `minmax(230px, .52fr) minmax(0, 1.48fr)` with `clamp(24px, 4vw, 56px)` gap. The four rail chapters stack in one column.
- Question-sheet padding is exactly `clamp(24px, 3.5vw, 48px)`.
- Desktop question title is `clamp(2.125rem, 2.75vw, 2.75rem)`, `1.08` line-height, `-.035em` letter spacing, and `28ch` maximum width.
- Mobile question title is `clamp(1.75rem, 7vw, 2.125rem)`; detail stays at `1rem` with `1.55` line-height and `64ch` maximum width.
- Preserve the existing urgent interruption heading scale. Do not let the new ordinary-question rules restyle `.safety-screen h1`.
- At 1365 × 800 in French on `urgent_breathing_now`, the entire title, detail, and first answer control must be visible without initial scrolling.
- At 390 × 844 and 320 × 720, there must be no horizontal overflow.
- Preserve keyboard navigation, 200% zoom reflow, reduced-motion behavior, print readability, and ≥44 px answer targets.
- Use Node `v24.13.0` for every test, lint, typecheck, build, and audit command.
- Hosting remains private and owner-only. Never call a public deployment method without separate explicit approval.

---

### Task 1: Pure bilingual prompt-presentation catalog

**Files:**
- Create: `app/i18n/question-prompt-presentation.ts`
- Create: `app/i18n/question-prompt-presentation.test.ts`
- Verify unchanged: `app/lib/types.ts`
- Verify unchanged: `app/data/questions/**`
- Verify unchanged: `app/i18n/questions-fr*.ts`
- Verify unchanged: `app/lib/export.ts`

**Interfaces:**
- Produces: `CURATED_QUESTION_PROMPT_IDS`, `CuratedQuestionPromptId`, `QuestionPromptPresentation`, and `getQuestionPromptPresentation(questionId, locale, completePrompt)`.
- Consumes: `Locale` and the already localized full prompt.
- Guarantees: every supported pair is complete; all unsupported or invalid cases fall back to `{ title: completePrompt }`; no input object is mutated.

- [x] **Step 1: Write the failing catalog tests.**

Create `app/i18n/question-prompt-presentation.test.ts` with a fixture lookup and an exact expected table. The test data must contain the following sixteen entries, without paraphrasing:

```ts
import { describe, expect, test } from "vitest";
import { questionBank } from "../data/questions";
import { localizeQuestion } from "./questions-fr";
import {
  CURATED_QUESTION_PROMPT_IDS,
  getQuestionPromptPresentation,
} from "./question-prompt-presentation";
import type { Locale } from "./types";

const expected = {
  urgent_breathing_now: {
    en: {
      title: "Are there signs of severe breathing difficulty right now?",
      detail: "Struggling to breathe, being unable to speak normally, or turning blue or grey; or, for a child, grunting, sucking in under the ribs, becoming limp, or not responding normally.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de détresse respiratoire grave ?",
      detail: "Grande difficulté à respirer, impossibilité de parler normalement, peau bleue ou grise ; ou, chez un enfant, geignement respiratoire, creusement sous les côtes, mollesse ou réaction anormale.",
    },
  },
  adolescent_substance_severe_timing: {
    en: {
      title: "When did the serious substance-related event happen?",
      detail: "Collapse, a seizure, severe breathing trouble, chest pain, or another immediate substance-related safety concern — happening now or during the past twelve months.",
    },
    fr: {
      title: "Quand l’événement grave lié à une substance s’est-il produit ?",
      detail: "Effondrement ou perte de connaissance, convulsion, graves difficultés respiratoires, douleur thoracique ou autre problème de sécurité immédiat lié à une substance — actuellement ou au cours des douze derniers mois.",
    },
  },
  urgent_severe_allergy_now: {
    en: {
      title: "Are there signs of a severe allergic reaction right now?",
      detail: "Sudden swelling of the lips, mouth, tongue, or throat; trouble breathing or swallowing; or collapse.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de réaction allergique grave ?",
      detail: "Gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge ; difficultés à respirer ou à avaler ; effondrement ou perte de connaissance.",
    },
  },
  corticosteroid_detail_infection_context: {
    en: {
      title: "While using corticosteroids, do any infection or major physical-stress situations apply?",
      detail: "Fever or infection signs; recent chickenpox or shingles exposure; severe illness; surgery; or major injury.",
    },
    fr: {
      title: "Pendant l’utilisation de corticostéroïdes, l’une de ces situations d’infection ou de stress physique important s’applique-t-elle ?",
      detail: "Fièvre ou signes d’infection ; exposition récente à la varicelle ou au zona ; maladie sévère ; intervention chirurgicale ; ou blessure grave.",
    },
  },
  urgent_stroke_signs_now: {
    en: {
      title: "Have there been possible stroke signs in the last 24 hours?",
      detail: "Sudden facial droop, one-sided weakness, or new trouble speaking — even if the signs have stopped.",
    },
    fr: {
      title: "Y a-t-il eu des signes possibles d’AVC au cours des dernières 24 heures ?",
      detail: "Affaissement soudain du visage, faiblesse d’un seul côté ou nouvelles difficultés à parler — même si les signes ont disparu.",
    },
  },
  isotretinoin_detail_symptoms: {
    en: {
      title: "Have you had any serious symptoms while using isotretinoin?",
      detail: "Severe headache; vision change; severe abdominal pain; mood or behavior change; or a blistering rash.",
    },
    fr: {
      title: "Avez-vous eu des symptômes graves pendant l’utilisation d’isotrétinoïne ?",
      detail: "Maux de tête sévères ; changement de vision ; douleur abdominale sévère ; changement d’humeur ou de comportement ; ou éruption cutanée avec des cloques.",
    },
  },
  glp1_detail_relevant_history: {
    en: {
      title: "Do any of these medical-history factors apply to you?",
      detail: "Pancreatitis; gallbladder disease; severe delayed stomach emptying; kidney disease; diabetic eye disease; or MEN2.",
    },
    fr: {
      title: "L’un de ces éléments de vos antécédents médicaux s’applique-t-il ?",
      detail: "Pancréatite ; maladie de la vésicule biliaire ; retard sévère de la vidange gastrique ; maladie rénale ; atteinte oculaire diabétique ; ou MEN2.",
    },
  },
  minoxidil_detail_cardiac_symptoms: {
    en: {
      title: "Have you had any concerning symptoms while using minoxidil?",
      detail: "Chest pain; rapid heartbeat; faintness; breathlessness; swelling; or sudden weight gain.",
    },
    fr: {
      title: "Avez-vous eu des symptômes préoccupants pendant l’utilisation de minoxidil ?",
      detail: "Douleur thoracique ; rythme cardiaque rapide ; étourdissement ou évanouissement ; essoufflement ; gonflement ; ou prise de poids soudaine.",
    },
  },
} as const;

function requiredQuestion(id: string) {
  const question = questionBank.find((candidate) => candidate.id === id);
  if (!question) throw new Error(`Missing question fixture: ${id}`);
  return question;
}

describe("question prompt presentation", () => {
  test("contains exactly the eight approved dense prompt IDs", () => {
    expect(CURATED_QUESTION_PROMPT_IDS).toEqual(Object.keys(expected));
  });

  test.each(CURATED_QUESTION_PROMPT_IDS)(
    "returns exact complete bilingual presentation for %s",
    (id) => {
      const canonical = requiredQuestion(id);
      for (const locale of ["en", "fr"] satisfies Locale[]) {
        const localized = localizeQuestion(canonical, locale);
        expect(
          getQuestionPromptPresentation(id, locale, localized.prompt),
        ).toEqual(expected[id][locale]);
      }
    },
  );

  test("uses the complete localized prompt for an ordinary question", () => {
    const canonical = requiredQuestion("usual_sleep_hours");
    const localized = localizeQuestion(canonical, "fr");
    expect(
      getQuestionPromptPresentation(canonical.id, "fr", localized.prompt),
    ).toEqual({ title: localized.prompt });
  });

  test("falls back without mutating canonical question data", () => {
    const canonical = requiredQuestion("urgent_breathing_now");
    const before = structuredClone(canonical);
    expect(
      getQuestionPromptPresentation("unknown-id", "en", canonical.prompt),
    ).toEqual({ title: canonical.prompt });
    expect(canonical).toEqual(before);
  });
});
```

- [x] **Step 2: Run the focused RED suite.**

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || { echo "nvm is required" >&2; exit 1; }
. "$NVM_DIR/nvm.sh"
nvm use 24.13.0
test "$(node --version)" = "v24.13.0"
npx vitest run app/i18n/question-prompt-presentation.test.ts --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: FAIL because `app/i18n/question-prompt-presentation.ts` does not exist.

- [x] **Step 3: Implement the typed resolver.**

Create `app/i18n/question-prompt-presentation.ts` with this public shape and the exact `expected` copy above moved into its production catalog:

```ts
import type { Locale } from "./types";

export const CURATED_QUESTION_PROMPT_IDS = [
  "urgent_breathing_now",
  "adolescent_substance_severe_timing",
  "urgent_severe_allergy_now",
  "corticosteroid_detail_infection_context",
  "urgent_stroke_signs_now",
  "isotretinoin_detail_symptoms",
  "glp1_detail_relevant_history",
  "minoxidil_detail_cardiac_symptoms",
] as const;

export type CuratedQuestionPromptId =
  (typeof CURATED_QUESTION_PROMPT_IDS)[number];

export type QuestionPromptPresentation = Readonly<{
  title: string;
  detail?: string;
}>;

type CompleteQuestionPromptPresentation = Readonly<
  Required<QuestionPromptPresentation>
>;

const curatedQuestionPromptPresentations = {
  urgent_breathing_now: {
    en: {
      title: "Are there signs of severe breathing difficulty right now?",
      detail: "Struggling to breathe, being unable to speak normally, or turning blue or grey; or, for a child, grunting, sucking in under the ribs, becoming limp, or not responding normally.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de détresse respiratoire grave ?",
      detail: "Grande difficulté à respirer, impossibilité de parler normalement, peau bleue ou grise ; ou, chez un enfant, geignement respiratoire, creusement sous les côtes, mollesse ou réaction anormale.",
    },
  },
  adolescent_substance_severe_timing: {
    en: {
      title: "When did the serious substance-related event happen?",
      detail: "Collapse, a seizure, severe breathing trouble, chest pain, or another immediate substance-related safety concern — happening now or during the past twelve months.",
    },
    fr: {
      title: "Quand l’événement grave lié à une substance s’est-il produit ?",
      detail: "Effondrement ou perte de connaissance, convulsion, graves difficultés respiratoires, douleur thoracique ou autre problème de sécurité immédiat lié à une substance — actuellement ou au cours des douze derniers mois.",
    },
  },
  urgent_severe_allergy_now: {
    en: {
      title: "Are there signs of a severe allergic reaction right now?",
      detail: "Sudden swelling of the lips, mouth, tongue, or throat; trouble breathing or swallowing; or collapse.",
    },
    fr: {
      title: "Y a-t-il actuellement des signes de réaction allergique grave ?",
      detail: "Gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge ; difficultés à respirer ou à avaler ; effondrement ou perte de connaissance.",
    },
  },
  corticosteroid_detail_infection_context: {
    en: {
      title: "While using corticosteroids, do any infection or major physical-stress situations apply?",
      detail: "Fever or infection signs; recent chickenpox or shingles exposure; severe illness; surgery; or major injury.",
    },
    fr: {
      title: "Pendant l’utilisation de corticostéroïdes, l’une de ces situations d’infection ou de stress physique important s’applique-t-elle ?",
      detail: "Fièvre ou signes d’infection ; exposition récente à la varicelle ou au zona ; maladie sévère ; intervention chirurgicale ; ou blessure grave.",
    },
  },
  urgent_stroke_signs_now: {
    en: {
      title: "Have there been possible stroke signs in the last 24 hours?",
      detail: "Sudden facial droop, one-sided weakness, or new trouble speaking — even if the signs have stopped.",
    },
    fr: {
      title: "Y a-t-il eu des signes possibles d’AVC au cours des dernières 24 heures ?",
      detail: "Affaissement soudain du visage, faiblesse d’un seul côté ou nouvelles difficultés à parler — même si les signes ont disparu.",
    },
  },
  isotretinoin_detail_symptoms: {
    en: {
      title: "Have you had any serious symptoms while using isotretinoin?",
      detail: "Severe headache; vision change; severe abdominal pain; mood or behavior change; or a blistering rash.",
    },
    fr: {
      title: "Avez-vous eu des symptômes graves pendant l’utilisation d’isotrétinoïne ?",
      detail: "Maux de tête sévères ; changement de vision ; douleur abdominale sévère ; changement d’humeur ou de comportement ; ou éruption cutanée avec des cloques.",
    },
  },
  glp1_detail_relevant_history: {
    en: {
      title: "Do any of these medical-history factors apply to you?",
      detail: "Pancreatitis; gallbladder disease; severe delayed stomach emptying; kidney disease; diabetic eye disease; or MEN2.",
    },
    fr: {
      title: "L’un de ces éléments de vos antécédents médicaux s’applique-t-il ?",
      detail: "Pancréatite ; maladie de la vésicule biliaire ; retard sévère de la vidange gastrique ; maladie rénale ; atteinte oculaire diabétique ; ou MEN2.",
    },
  },
  minoxidil_detail_cardiac_symptoms: {
    en: {
      title: "Have you had any concerning symptoms while using minoxidil?",
      detail: "Chest pain; rapid heartbeat; faintness; breathlessness; swelling; or sudden weight gain.",
    },
    fr: {
      title: "Avez-vous eu des symptômes préoccupants pendant l’utilisation de minoxidil ?",
      detail: "Douleur thoracique ; rythme cardiaque rapide ; étourdissement ou évanouissement ; essoufflement ; gonflement ; ou prise de poids soudaine.",
    },
  },
} as const satisfies Readonly<
  Record<
    CuratedQuestionPromptId,
    Readonly<Record<Locale, CompleteQuestionPromptPresentation>>
  >
>;

const curatedQuestionPromptIds = new Set<string>(CURATED_QUESTION_PROMPT_IDS);

function fallback(completePrompt: string): QuestionPromptPresentation {
  return { title: completePrompt };
}

export function getQuestionPromptPresentation(
  questionId: string,
  locale: Locale,
  completePrompt: string,
): QuestionPromptPresentation {
  if (!curatedQuestionPromptIds.has(questionId)) return fallback(completePrompt);
  const presentation = curatedQuestionPromptPresentations[
    questionId as CuratedQuestionPromptId
  ][locale];
  if (!presentation.title.trim() || !presentation.detail.trim()) {
    return fallback(completePrompt);
  }
  return presentation;
}
```

- [x] **Step 4: Run GREEN and prove the canonical boundary.**

```bash
npx vitest run app/i18n/question-prompt-presentation.test.ts app/i18n/questions-fr.test.ts app/lib/export.test.ts --maxWorkers=1 --testTimeout=20000 --reporter=default
git diff -- app/lib/types.ts app/data/questions app/i18n/questions-fr.ts app/i18n/questions-fr-core.ts app/i18n/questions-fr-substances.ts app/i18n/questions-fr-medications.ts app/lib/export.ts
```

Expected: all selected tests PASS and the final `git diff` produces no output.

- [x] **Step 5: Commit the pure presentation layer.**

```bash
git add app/i18n/question-prompt-presentation.ts app/i18n/question-prompt-presentation.test.ts
git commit -m "feat: add bilingual question prompt presentations"
```

---

### Task 2: Semantic prompt component and answer-description contract

**Files:**
- Create: `app/components/question-prompt.tsx`
- Create: `app/components/question-prompt.test.tsx`
- Modify: `app/components/question-control.tsx`
- Modify: `app/components/question-control.test.tsx`

**Interfaces:**
- Produces: `QUESTION_PROMPT_TITLE_ID`, `QUESTION_PROMPT_DETAIL_ID`, and `QuestionPrompt`.
- Extends: `QuestionControlProps` with optional `questionDescriptionId?: string`.
- Guarantees: a visible detail owns one stable DOM ID; an ordinary prompt renders no detail node; the `fieldset` never receives a dangling description reference.

- [x] **Step 1: Write failing component and ARIA tests.**

Create `app/components/question-prompt.test.tsx`:

```tsx
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  QUESTION_PROMPT_DETAIL_ID,
  QUESTION_PROMPT_TITLE_ID,
  QuestionPrompt,
} from "./question-prompt";

test("renders a focusable short title followed by complete criteria", () => {
  render(
    <QuestionPrompt
      presentation={{ title: "Short title", detail: "Complete criteria." }}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );

  const heading = screen.getByRole("heading", { level: 1, name: "Short title" });
  expect(heading).toHaveAttribute("id", QUESTION_PROMPT_TITLE_ID);
  expect(heading).toHaveAttribute("tabindex", "-1");
  expect(heading).toHaveClass("question-prompt__title--split");
  expect(screen.getByText("Complete criteria.")).toHaveAttribute(
    "id",
    QUESTION_PROMPT_DETAIL_ID,
  );
});

test("renders no detail node or split modifier for an ordinary prompt", () => {
  render(
    <QuestionPrompt
      presentation={{ title: "Ordinary question" }}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );

  expect(screen.getByRole("heading", { name: "Ordinary question" })).not.toHaveClass(
    "question-prompt__title--split",
  );
  expect(document.getElementById(QUESTION_PROMPT_DETAIL_ID)).toBeNull();
});
```

Append two tests to `app/components/question-control.test.tsx`. Render a heading and detail before the control in the described case so Testing Library evaluates the real accessible relationships:

```tsx
test("describes the answer group with visible question criteria", () => {
  render(
    <I18nProvider>
      <h1 id="question-title">Short title</h1>
      <p id="question-detail">Complete criteria.</p>
      <QuestionControl
        question={requiredQuestion("urgent_breathing_now")}
        questionDescriptionId="question-detail"
        onAnswer={vi.fn()}
        onBack={vi.fn()}
        canGoBack={false}
      />
    </I18nProvider>,
  );

  const group = screen.getByRole("group", { name: "Short title" });
  expect(group).toHaveAccessibleDescription("Complete criteria.");
  expect(group).toHaveAttribute("aria-describedby", "question-detail");
});

test("omits aria-describedby when a question has no presentation detail", () => {
  render(
    <I18nProvider>
      <h1 id="question-title">Ordinary question</h1>
      <QuestionControl
        question={requiredQuestion("usual_sleep_hours")}
        onAnswer={vi.fn()}
        onBack={vi.fn()}
        canGoBack={false}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("group", { name: "Ordinary question" })).not.toHaveAttribute(
    "aria-describedby",
  );
});
```

- [x] **Step 2: Run the focused RED suite.**

```bash
npx vitest run app/components/question-prompt.test.tsx app/components/question-control.test.tsx --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: FAIL because `QuestionPrompt` and `questionDescriptionId` do not exist.

- [x] **Step 3: Implement `QuestionPrompt`.**

Create `app/components/question-prompt.tsx`:

```tsx
import type { RefObject } from "react";
import type { QuestionPromptPresentation } from "../i18n/question-prompt-presentation";

export const QUESTION_PROMPT_TITLE_ID = "question-title";
export const QUESTION_PROMPT_DETAIL_ID = "question-detail";

export type QuestionPromptProps = Readonly<{
  presentation: QuestionPromptPresentation;
  headingRef: RefObject<HTMLHeadingElement | null>;
}>;

export function QuestionPrompt({
  presentation,
  headingRef,
}: QuestionPromptProps) {
  const detail = presentation.detail?.trim() ? presentation.detail : undefined;

  return (
    <>
      <h1
        id={QUESTION_PROMPT_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
        className={[
          "question-prompt__title",
          detail ? "question-prompt__title--split" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {presentation.title}
      </h1>
      {detail ? (
        <p id={QUESTION_PROMPT_DETAIL_ID} className="question-prompt__detail">
          {detail}
        </p>
      ) : null}
    </>
  );
}
```

- [x] **Step 4: Extend `QuestionControl` without changing any answer behavior.**

Add `questionDescriptionId?: string` to `QuestionControlProps`, destructure it, and change only the existing fieldset opening tag:

```tsx
<fieldset
  aria-labelledby={QUESTION_PROMPT_TITLE_ID}
  aria-describedby={questionDescriptionId}
>
```

Import `QUESTION_PROMPT_TITLE_ID` from `./question-prompt`; do not alter the numeric input's unit-level `aria-describedby`, form keyboard handling, draft initialization, answer commits, or button behavior.

- [x] **Step 5: Run GREEN and the existing control behavior suite.**

```bash
npx vitest run app/components/question-prompt.test.tsx app/components/question-control.test.tsx --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: PASS, including existing canonical boolean, single, multi, number, scale, and text answer tests.

- [x] **Step 6: Commit the semantic component boundary.**

```bash
git add app/components/question-prompt.tsx app/components/question-prompt.test.tsx app/components/question-control.tsx app/components/question-control.test.tsx
git commit -m "feat: render accessible question prompt details"
```

---

### Task 3: Integrate the hierarchy without losing focus or drafts

**Files:**
- Modify: `app/components/assessment.tsx`
- Modify: `app/components/assessment.test.tsx`

**Interfaces:**
- Consumes: `getQuestionPromptPresentation`, `QuestionPrompt`, and `QUESTION_PROMPT_DETAIL_ID`.
- Passes: the optional detail ID into `QuestionControl` only when a non-blank detail exists.
- Preserves: queue construction, question index, draft component identity, urgent rendering, lab import, pillar intermissions, and locale-switch focus.

- [x] **Step 1: Write the failing bilingual integration test.**

Append this test to `app/components/assessment.test.tsx`:

```tsx
test("shows dense prompt criteria in both languages without losing draft or language focus", async () => {
  const user = userEvent.setup();
  render(
    <>
      <LanguageSwitcher />
      <Assessment depth="quick" profile={adultProfile} onComplete={vi.fn()} />
    </>,
  );

  await skipUntilQuestion(user, /severe.*breath/i);

  const englishHeading = screen.getByRole("heading", {
    level: 1,
    name: "Are there signs of severe breathing difficulty right now?",
  });
  expect(englishHeading).toHaveFocus();
  expect(
    screen.getByText(/unable to speak normally.*turning blue or grey/i),
  ).toBeVisible();
  expect(screen.getByRole("group", { name: englishHeading.textContent ?? "" })).toHaveAccessibleDescription(
    /struggling to breathe.*child.*under the ribs/i,
  );

  await user.click(screen.getByRole("radio", { name: "No" }));
  const french = screen.getByRole("button", { name: "Français" });
  await user.click(french);

  expect(french).toHaveFocus();
  expect(screen.getByRole("radio", { name: "Non" })).toBeChecked();
  const frenchHeading = screen.getByRole("heading", {
    level: 1,
    name: "Y a-t-il actuellement des signes de détresse respiratoire grave ?",
  });
  expect(frenchHeading).toBeVisible();
  expect(frenchHeading).not.toHaveFocus();
  expect(screen.getByText(/chez un enfant.*creusement sous les côtes/i)).toBeVisible();
  expect(screen.getByRole("group", { name: frenchHeading.textContent ?? "" })).toHaveAccessibleDescription(
    /grande difficulté à respirer.*réaction anormale/i,
  );
});
```

- [x] **Step 2: Run the focused RED suite.**

```bash
npx vitest run app/components/assessment.test.tsx --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: the new test FAILS because the full prompt is still inside the `h1` and no visible description exists.

- [x] **Step 3: Resolve presentation after localization.**

In `app/components/assessment.tsx`, import the resolver and component constants:

```ts
import { getQuestionPromptPresentation } from "../i18n/question-prompt-presentation";
import {
  QUESTION_PROMPT_DETAIL_ID,
  QuestionPrompt,
} from "./question-prompt";
```

Immediately after `presentedQuestion`, calculate:

```ts
const promptPresentation = presentedQuestion
  ? getQuestionPromptPresentation(
      presentedQuestion.id,
      locale,
      presentedQuestion.prompt,
    )
  : null;
```

Do not memoize this object and do not add `locale` to the question-focus effect dependency list.

- [x] **Step 4: Replace only the ordinary assessment heading.**

Replace the current ordinary `<h1 id="question-title">` with:

```tsx
{promptPresentation ? (
  <QuestionPrompt
    presentation={promptPresentation}
    headingRef={questionHeading}
  />
) : null}
```

Keep the urgent `<h1 id="urgent-action-title">` untouched. Add this prop to the existing keyed `QuestionControl`:

```tsx
questionDescriptionId={
  promptPresentation?.detail?.trim()
    ? QUESTION_PROMPT_DETAIL_ID
    : undefined
}
```

Retain `key={question.id}` exactly. Do not place a locale-dependent key on `QuestionPrompt`, `QuestionControl`, `article`, or `section`.

- [x] **Step 5: Run GREEN plus urgent, lab, intermission, and locale regressions.**

```bash
npx vitest run app/components/assessment.test.tsx app/components/question-control.test.tsx app/i18n/question-prompt-presentation.test.ts --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: PASS. The selected `No` becomes checked `Non`, the French language button retains focus, new-question navigation focuses the question title, and urgent/lab/intermission flows remain unchanged.

- [x] **Step 6: Commit the assessment integration.**

```bash
git add app/components/assessment.tsx app/components/assessment.test.tsx
git commit -m "feat: integrate responsive question hierarchy"
```

---

### Task 4: Responsive typography and proportional assessment layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Produces: `.question-prompt__title`, `.question-prompt__title--split`, and `.question-prompt__detail` visual contracts.
- Changes: only ordinary assessment layout proportions, question-sheet padding, and passive pillar chapter stacking.
- Preserves: `.safety-screen h1`, controls, reduced-motion rules, print rules, and all non-assessment layouts.

- [x] **Step 1: Replace the obsolete CSS test with failing exact contracts.**

Replace `uses the smaller question-heading scale at desktop and mobile widths` in `app/globals.test.ts` with:

```ts
test("uses the approved question title and detail hierarchy", () => {
  expect(css).toMatch(
    /\.question-sheet \.question-prompt__title[^{]*\{[^}]*max-width:\s*28ch[^}]*font-size:\s*clamp\(2\.125rem,\s*2\.75vw,\s*2\.75rem\)[^}]*letter-spacing:\s*-\.035em[^}]*line-height:\s*1\.08/s,
  );
  expect(css).toMatch(
    /\.question-sheet \.question-prompt__title--split[^{]*\{[^}]*margin-bottom:\s*12px/s,
  );
  expect(css).toMatch(
    /\.question-prompt__detail[^{]*\{[^}]*max-width:\s*64ch[^}]*margin:\s*0 0 clamp\(22px,\s*2vw,\s*28px\)[^}]*font-size:\s*clamp\(1rem,\s*1\.2vw,\s*1\.125rem\)[^}]*line-height:\s*1\.55/s,
  );
  expect(css).toMatch(
    /@media \(max-width: 560px\)[\s\S]+\.question-sheet \.question-prompt__title[^{]*\{[^}]*font-size:\s*clamp\(1\.75rem,\s*7vw,\s*2\.125rem\)/s,
  );
  expect(css).toMatch(
    /@media \(max-width: 560px\)[\s\S]+\.question-prompt__detail[^{]*\{[^}]*font-size:\s*1rem/s,
  );
});

test("gives the question more room while keeping the chapter rail passive", () => {
  expect(css).toMatch(
    /\.assessment__layout\s*\{[^}]*grid-template-columns:\s*minmax\(230px,\s*\.52fr\) minmax\(0,\s*1\.48fr\)[^}]*gap:\s*clamp\(24px,\s*4vw,\s*56px\)/s,
  );
  expect(css).toMatch(
    /\.pillar-progress__chapters\s*\{[^}]*grid-template-columns:\s*1fr/s,
  );
  expect(css).toMatch(
    /\.question-sheet\s*\{[^}]*padding:\s*clamp\(24px,\s*3\.5vw,\s*48px\)/s,
  );
  expect(css).toMatch(/\.safety-screen h1\s*\{/);
});
```

In the existing pillar-rail test, replace the mobile-only chapter-column assertion with a base assertion for `grid-template-columns: 1fr`. Keep the mobile layout assertion for the overall assessment at `max-width: 850px`.

- [x] **Step 2: Run the CSS RED suite.**

```bash
npx vitest run app/globals.test.ts --maxWorkers=1 --testTimeout=20000 --reporter=default
```

Expected: FAIL on the old `.72fr / 1.28fr` grid, 100 px gap, two-column chapter rail, 64 px sheet padding, and old heading clamps.

- [x] **Step 3: Apply the approved desktop proportions.**

Change only these declarations:

```css
.assessment__layout {
  display: grid;
  grid-template-columns: minmax(230px, .52fr) minmax(0, 1.48fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
  padding-top: clamp(42px, 7vw, 88px);
}

.pillar-progress__chapters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.question-sheet {
  min-height: 620px;
  padding: clamp(24px, 3.5vw, 48px);
  border: 1px solid var(--line);
  background: var(--surface-readable);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%);
}
```

- [x] **Step 4: Scope the title and detail styles.**

Preserve the current generic question-heading declarations for the urgent screen by moving them to `.safety-screen h1`. Add the ordinary-question styles after them so the two surfaces are independent:

```css
.safety-screen h1 {
  max-width: 780px;
  margin: 10px 0 clamp(34px, 6vw, 64px);
  font-size: clamp(1.9rem, 3.4vw, 3.75rem);
  font-weight: 550;
  letter-spacing: -.045em;
  line-height: 1.02;
}

.question-sheet .question-prompt__title {
  max-width: 28ch;
  margin: 10px 0 clamp(28px, 4vw, 40px);
  font-size: clamp(2.125rem, 2.75vw, 2.75rem);
  font-weight: 550;
  letter-spacing: -.035em;
  line-height: 1.08;
}

.question-sheet .question-prompt__title--split {
  margin-bottom: 12px;
}

.question-prompt__detail {
  max-width: 64ch;
  margin: 0 0 clamp(22px, 2vw, 28px);
  color: color-mix(in srgb, var(--deep-water) 78%, var(--muted));
  font-size: clamp(1rem, 1.2vw, 1.125rem);
  font-weight: 475;
  line-height: 1.55;
}
```

The later existing `.safety-screen h1 { margin-bottom: ... }` rule may remain; it intentionally preserves the urgent screen's narrower bottom-margin override.

- [x] **Step 5: Apply the mobile type scale without changing targets.**

In `@media (max-width: 560px)`, replace `.question-sheet h1` with:

```css
.safety-screen h1 {
  font-size: clamp(1.7rem, 7.4vw, 2.6rem);
}

.question-sheet .question-prompt__title {
  font-size: clamp(1.75rem, 7vw, 2.125rem);
}

.question-prompt__detail {
  font-size: 1rem;
}
```

Keep `.question-sheet { min-height: 0; padding: 24px 18px 38px; }`, the 54 px answer-option height, and the one-column response/action adaptations unchanged.

- [x] **Step 6: Run GREEN and commit the visual system.**

```bash
npx vitest run app/globals.test.ts app/components/question-prompt.test.tsx app/components/assessment.test.tsx --maxWorkers=1 --testTimeout=20000 --reporter=default
git add app/globals.css app/globals.test.ts
git commit -m "style: rebalance assessment question typography"
```

Expected: all selected tests PASS; the urgent heading still has the old scale and the ordinary title/detail use the approved scale.

---

### Task 5: Full release verification and owner-only deployment

**Files:**
- Modify after verification: `docs/superpowers/specs/2026-08-04-question-typography-hierarchy-design.md`
- Modify during execution: `docs/superpowers/plans/2026-08-04-question-typography-hierarchy.md`
- Modify after deployment evidence: `docs/privacy-and-release.md`
- Create ignored evidence only: `.superpowers/verification/question-typography-hierarchy/**`

**Interfaces:**
- Produces: a tested release commit, browser evidence at all approved viewports, and an owner-only deployed Sites version matching an exact source SHA.
- Consumes: the existing build scripts, local browser tooling, and Sites private-hosting workflow.
- Does not produce: public access, analytics, remote media, new credentials in tracked files, or changes to clinical logic.

- [x] **Step 1: Run the full release matrix on Node 24.13.0.**

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || { echo "nvm is required for the release matrix" >&2; exit 1; }
. "$NVM_DIR/nvm.sh"
nvm use 24.13.0
test "$(node --version)" = "v24.13.0"
npm ci
npx tsc --noEmit --incremental false
npm run lint
npm test -- --maxWorkers=1 --testTimeout=20000 --reporter=default
npm run build
npm audit --omit=dev --json
test ! -e tsconfig.tsbuildinfo
```

Expected: typecheck, lint, the complete Vitest suite, and Vinext build PASS; the production audit reports zero vulnerabilities; no incremental TypeScript artifact remains.

- [x] **Step 2: Start the production build and verify the worst desktop case.**

Start the production server from the built artifact in a PTY and wait for its ready message:

```bash
npm start
```

Use `http://localhost:3000`, unless Vinext's ready message reports another local port. Then use browser tooling to complete consent, select Quick, enter an adult profile, pass the first pillar intermission, switch to French, and reach `urgent_breathing_now` at 1365 × 800.

Record in the ignored evidence directory:

- viewport dimensions;
- screenshot;
- `getBoundingClientRect()` values for title, detail, fieldset, and first answer option;
- `window.innerHeight` and `document.documentElement.scrollWidth/clientWidth`;
- computed title and detail font sizes.

Pass criteria: title, full detail, and the complete first response target all fit in the initial viewport; title computes between 34 and 44 px; detail computes between 16 and 18 px; horizontal scroll width equals client width.

- [x] **Step 3: Verify ordinary, mobile, zoom, focus, motion, and print cases.**

Run these browser checkpoints against the same production server:

- 1440 × 900, short English question: no detail node, no `aria-describedby`, first response visible, title 34–44 px.
- 390 × 844 and 320 × 720, French dense prompt: no horizontal overflow, title 28–34 px, detail 16 px, every visible answer target at least 44 px tall.
- 200% zoom: visual and DOM order remains title → detail → fieldset, with no clipped text or horizontal overflow.
- Keyboard: after answering/navigating, the new `h1` receives focus; Tab reaches the first response; after EN → FR, the language button retains focus and the selected draft remains checked.
- Screen-reader semantics: the answer group has the short title as accessible name and complete criteria as accessible description; an ordinary question has no dangling description ID.
- `prefers-reduced-motion: reduce`: typography and detail remain visible and no motion regression appears.
- Print emulation: question title, detail, and responses remain readable; the botanical background rules remain removed as before.
- Urgent interruption: its heading scale, focus, role alert, local emergency copy, and correction route are unchanged.

Save screenshots and concise observed measurements in `.superpowers/verification/question-typography-hierarchy/`; keep that evidence ignored.

- [x] **Step 4: Run an independent specification and code-quality review.**

Use `superpowers:requesting-code-review` with the approved design spec, this plan, the base commit `0574c9450fd80f61f9618cca3f560773e3bb3f09`, and current `HEAD`. Resolve every Critical or Important finding with a new focused failing test, implementation, and rerun of the affected suite. Re-run the full release matrix after any code change.

- [x] **Step 5: Record verified implementation status and commit.**

Change the design spec status to `implemented; private deployment pending`. Check completed plan boxes through Task 5 Step 5. Add a short section to `docs/privacy-and-release.md` stating that the presentation layer affects display only and leaves question/risk/export contracts unchanged.

```bash
git add docs/privacy-and-release.md docs/superpowers/specs/2026-08-04-question-typography-hierarchy-design.md docs/superpowers/plans/2026-08-04-question-typography-hierarchy.md
git commit -m "docs: verify question typography release"
git status --short
```

Expected: documentation commit succeeds and the tracked worktree is clean.

- [ ] **Step 6: Reconfirm owner-only access and deploy the exact commit.**

Use `sites:sites-hosting`. Before packaging, query the current site and require custom/private access with exactly the owner allowed, zero groups, and zero external visitors. Stop if access is public or broader than owner-only. Package the project with the official Sites package script into a fresh `mktemp -d` directory, save the exact `git rev-parse HEAD` as a new version, deploy it with the private deployment method, and poll to terminal success.

Do not call a public deployment method. Do not write access credentials or ephemeral tokens into the repository.

- [ ] **Step 7: Verify the deployed URL and close the release.**

Open the owner-authenticated deployed URL and repeat at minimum the 1365 × 800 French dense prompt, 390 × 844 mobile prompt, locale/draft/focus check, and owner-only access check. Confirm the deployed version source SHA exactly equals local `HEAD` at packaging time.

Record the private URL, version, exact source SHA, access result, and verification date in `docs/privacy-and-release.md`; change the design status to `implemented and privately deployed`; check the remaining plan boxes; commit the documentation; package and privately deploy that final documentation-only commit as the next exact version so the final deployed SHA again matches local `HEAD`.

```bash
git add docs/privacy-and-release.md docs/superpowers/specs/2026-08-04-question-typography-hierarchy-design.md docs/superpowers/plans/2026-08-04-question-typography-hierarchy.md
git commit -m "docs: record private typography deployment"
git status --short
```

Expected: owner-only deployment reaches terminal success, deployed source matches the final local commit, all browser checkpoints pass, and the tracked worktree is clean.

---

## Final verification checklist

- [ ] Exactly eight curated IDs have exact non-empty EN/FR titles and details.
- [ ] Every uncurated question falls back to its complete localized prompt as title.
- [ ] Canonical English/French question data and exports are unchanged.
- [ ] No question ID, queue, branching, answer, risk, score, or lab behavior changed.
- [ ] Dense prompt detail is visible and programmatically describes the answer group.
- [ ] Ordinary prompts have neither a detail node nor a dangling `aria-describedby`.
- [ ] Locale switching preserves the live draft and leaves focus on the language button.
- [ ] New-question navigation focuses the short title.
- [ ] Desktop rail/question split, gap, sheet padding, chapter stacking, and type clamps match the approved spec exactly.
- [ ] The urgent interruption retains its previous heading scale and safety behavior.
- [ ] 1365 × 800 French worst case shows the first full response without initial scrolling.
- [ ] 390 × 844 and 320 × 720 have no horizontal overflow.
- [ ] 200% zoom, keyboard, reduced motion, and print checks pass.
- [ ] Typecheck, lint, full tests, build, and production audit pass on Node 24.13.0.
- [ ] Independent review has no unresolved Critical or Important findings.
- [ ] Final Sites deployment is private, owner-only, terminal-successful, and matches the final source SHA.
