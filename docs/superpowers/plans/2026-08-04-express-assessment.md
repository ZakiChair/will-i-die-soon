# Adult Express Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class, adult-only nine-question Express assessment with transparent VO₂ max, strength, sleep, and nutrition summaries while preserving every Quick, Detailed, and Deep contract.

**Architecture:** Extend the canonical depth type and questionnaire selector with an explicit nine-ID Express queue. Keep answer collection on the shared assessment path, add a pure summary builder for derived strength ratios, and render a dedicated Express result component while leaving existing risk, score, and result surfaces unchanged for the other depths.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 16/Vinext, Vitest 4, Testing Library, Decimal.js, bilingual in-memory i18n, CSS in `app/globals.css`.

## Global Constraints

- Express is available only when `profile.age >= 18`.
- Express contains exactly nine stable IDs and no adaptive branch.
- Express shows no chapter intermission and never opens laboratory import.
- Quick remains 20, Detailed remains 50, and Deep remains 150–200.
- No VO₂ max estimate, BMI, global Express score, fitness ranking, diagnosis, or new clinical rule.
- Squat and deadlift prompts refer only to an already completed one-repetition maximum and explicitly discourage testing a new maximum for the questionnaire.
- Missing or skipped answers are canonical `null`, never zero.
- Strength ratios are `loadKg / weightKg`, rounded half-up to two decimals, and omitted for non-positive or missing inputs.
- English and French presentation may change; canonical IDs, option values, answer values, rules, and sources remain language-independent.
- No new dependency, backend, persistence, analytics, cookie, remote runtime asset, or answer upload.
- Release verification uses Node.js `v24.13.0` and the existing npm lockfile.

---

### Task 1: Canonical Express depth, question bank, and deterministic queue

**Files:**
- Create: `app/data/questions/performance.ts`
- Create: `app/i18n/questions-fr-performance.ts`
- Modify: `app/lib/types.ts:1`
- Modify: `app/data/questions/factory.ts:1-18`
- Modify: `app/data/questions/core.ts:1-120`
- Modify: `app/data/questions/lifestyle.ts:25-70`
- Modify: `app/data/questions/index.ts:1-22`
- Modify: `app/i18n/questions-fr.ts:1-20`
- Modify: `app/lib/health-pillars.ts:63-89`
- Modify: `app/lib/questionnaire.ts:1-280`
- Test: `app/lib/questionnaire.test.ts`
- Test: `app/lib/health-pillars.test.ts`
- Test: `app/i18n/questions-fr.test.ts`

**Interfaces:**
- Produces: `AnalysisDepth = "express" | "quick" | "detailed" | "deep"`.
- Produces: `expressAndAllDepths`, a readonly tier tuple for reused core questions.
- Produces: `performanceQuestions`, the three new adult-only definitions.
- Produces: `EXPRESS_QUESTION_IDS`, the ordered readonly nine-ID queue contract.
- Consumes: existing `Question`, `ProfileContext`, `defineQuestions`, `groupQuestionsByPillar`, and French localization merge.

- [ ] **Step 1: Write failing queue and bank tests**

Add exact Express assertions to `app/lib/questionnaire.test.ts`:

```ts
const expressIds = [
  "reported_vo2_max_ml_kg_min",
  "squat_one_rep_max_kg",
  "deadlift_one_rep_max_kg",
  "usual_sleep_hours",
  "sleep_refreshed",
  "height_cm",
  "weight_kg",
  "plant_food_frequency",
  "diet_ultra_processed",
] as const;

test("builds the exact adult Express queue and keeps it stable after answers", () => {
  const initial = buildAssessmentQueue("express", questionBank, adult, {});
  expect(initial.map(({ id }) => id)).toEqual(expressIds);

  const reconciled = reconcileAssessmentState(
    "express",
    questionBank,
    adult,
    { reported_vo2_max_ml_kg_min: 48, weight_kg: 80 },
  );
  expect(reconciled.queue.map(({ id }) => id)).toEqual(expressIds);
  expect(reconciled.answers).toMatchObject({
    reported_vo2_max_ml_kg_min: 48,
    weight_kg: 80,
  });
});

test("offers Express only to adults and refuses a short minor queue", () => {
  expect(getAvailableDepths(questionBank, adult, {})[0]).toBe("express");
  expect(getAvailableDepths(questionBank, child, {})).not.toContain("express");
  expect(getAvailableDepths(questionBank, adolescent, {})).not.toContain("express");
  expect(() => buildAssessmentQueue("express", questionBank, child, {})).toThrow(
    /Express assessment is available only to adults/i,
  );
});
```

Update closed counts to 246 in `app/lib/health-pillars.test.ts` and `app/i18n/questions-fr.test.ts`. Assert the two lift IDs resolve to `strength-neural`, the VO₂ max ID resolves to `cardio-energy`, every new question is `minAge: 18`, and every numeric question still has a unit key.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx vitest run app/lib/questionnaire.test.ts app/lib/health-pillars.test.ts app/i18n/questions-fr.test.ts
```

Expected: TypeScript/test failures because `express`, the three IDs, their French copy, and the 246-question count do not exist.

- [ ] **Step 3: Add the canonical type, questions, translations, and tiers**

Change the type and tier constants:

```ts
export type AnalysisDepth = "express" | "quick" | "detailed" | "deep";
```

```ts
export const allDepths = ["quick", "detailed", "deep"] as const;
export const expressAndAllDepths = ["express", ...allDepths] as const;
```

Create `app/data/questions/performance.ts` with these complete definitions:

```ts
import { defineQuestions } from "./factory";

export const performanceQuestions = defineQuestions([
  {
    id: "reported_vo2_max_ml_kg_min",
    domain: "measurements",
    prompt: "What is your most recent measured or device-estimated VO₂ max?",
    why: "A reported VO₂ max gives cardiorespiratory-fitness context, but values can differ by test protocol or device.",
    answerType: "number",
    minAge: 18,
    priority: 1,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
  {
    id: "squat_one_rep_max_kg",
    domain: "measurements",
    prompt: "What is the heaviest squat you have already completed for one repetition?",
    why: "Use an existing result only. Do not attempt a new maximal lift for this questionnaire.",
    answerType: "number",
    minAge: 18,
    priority: 2,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
  {
    id: "deadlift_one_rep_max_kg",
    domain: "measurements",
    prompt: "What is the heaviest deadlift you have already completed for one repetition?",
    why: "Use an existing result only. Do not attempt a new maximal lift for this questionnaire.",
    answerType: "number",
    minAge: 18,
    priority: 3,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
]);
```

Merge `performanceQuestions` into `questionBank`. Add French prompt/rationale entries in `questions-fr-performance.ts` and spread them into `frQuestionTranslations`. Use `expressAndAllDepths` for `height_cm`, `weight_kg`, `plant_food_frequency`, and `usual_sleep_hours`; add `tiers: ["express", "detailed", "deep"]` to `sleep_refreshed` and `diet_ultra_processed`.

Add health-pillar overrides:

```ts
reported_vo2_max_ml_kg_min: "cardio-energy",
squat_one_rep_max_kg: "strength-neural",
deadlift_one_rep_max_kg: "strength-neural",
```

- [ ] **Step 4: Implement explicit Express availability and selection**

In `app/lib/questionnaire.ts`, add:

```ts
export const EXPRESS_QUESTION_IDS = [
  "reported_vo2_max_ml_kg_min",
  "squat_one_rep_max_kg",
  "deadlift_one_rep_max_kg",
  "usual_sleep_hours",
  "sleep_refreshed",
  "height_cm",
  "weight_kg",
  "plant_food_frequency",
  "diet_ultra_processed",
] as const;

const DEPTH_LIMITS: Readonly<Record<AnalysisDepth, number>> = {
  express: 9,
  quick: 20,
  detailed: 50,
  deep: 200,
};

const DEPTH_MINIMUMS: Readonly<Record<AnalysisDepth, number>> = {
  express: 9,
  quick: 20,
  detailed: 50,
  deep: 150,
};

const DEPTH_ORDER: ReadonlyArray<AnalysisDepth> = [
  "express",
  "quick",
  "detailed",
  "deep",
];
```

For availability, require every Express ID to be present in the eligible set. For selection, map the explicit IDs in order and throw `RangeError("Express assessment is available only to adults with all nine eligible questions.")` if any definition is missing. Return the selected definitions before the existing pillar grouping; the listed order already matches the four pillar groups.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npx vitest run app/lib/questionnaire.test.ts app/lib/health-pillars.test.ts app/i18n/questions-fr.test.ts
```

Expected: all focused tests pass; Quick/Detailed/Deep count assertions remain unchanged.

- [ ] **Step 6: Commit the canonical contract**

```bash
git add app/lib/types.ts app/data/questions/factory.ts app/data/questions/core.ts app/data/questions/lifestyle.ts app/data/questions/index.ts app/data/questions/performance.ts app/i18n/questions-fr.ts app/i18n/questions-fr-performance.ts app/lib/health-pillars.ts app/lib/questionnaire.ts app/lib/questionnaire.test.ts app/lib/health-pillars.test.ts app/i18n/questions-fr.test.ts
git commit -m "feat: add canonical adult express queue"
```

---

### Task 2: Express landing, consent gate, and uninterrupted assessment

**Files:**
- Modify: `app/components/landing.tsx:1-180`
- Modify: `app/components/consent-screen.tsx:1-179`
- Modify: `app/components/assessment.tsx:68-319`
- Modify: `app/components/question-control.tsx:8-230`
- Modify: `app/i18n/ui-copy.ts:1-881`
- Modify: `app/globals.css:150-170,864-924`
- Test: `app/components/landing.test.tsx`
- Test: `app/components/assessment.test.tsx`
- Test: `app/components/question-control.test.tsx`
- Test: `app/page.test.tsx`
- Test: `app/i18n/ui-copy.test.ts`

**Interfaces:**
- Consumes: canonical `AnalysisDepth`, `getAvailableDepths`, and the exact nine-question queue from Task 1.
- Produces: first landing card `express`, adult consent start, minor Quick fallback, Express skip label, and assessment completion with zero intermissions.

- [ ] **Step 1: Write failing landing, consent, and assessment tests**

Add tests with these observable contracts:

```tsx
test("offers Express first as the nine-question adult route", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();
  render(<Landing onStart={onStart} />);

  const depthHeadings = screen.getAllByRole("heading", { level: 3 });
  expect(depthHeadings.map((heading) => heading.textContent)).toEqual([
    "Express",
    "Quick",
    "Detailed",
    "Deep",
  ]);
  expect(screen.getByText(/9 targeted questions.*under 1 minute/i)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Choose Express" }));
  expect(onStart).toHaveBeenCalledWith("express");
});
```

```tsx
test("runs nine Express questions without an intermission", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  render(<Assessment depth="express" profile={adultProfile} onComplete={onComplete} />);

  expect(screen.queryByRole("button", { name: "Continue assessment" })).not.toBeInTheDocument();
  expect(screen.getByText("Question 1 of 9")).toBeVisible();
  expect(screen.getByRole("progressbar")).toHaveAttribute("max", "9");

  for (let answered = 0; answered < 9; answered += 1) {
    await user.click(
      screen.getByRole("button", { name: "I don't know or prefer not to answer" }),
    );
  }
  expect(onComplete).toHaveBeenCalledOnce();
  expect(Object.values(onComplete.mock.calls[0][0])).toEqual(Array(9).fill(null));
});
```

Add a page-level test that selects Express, enters age 17, chooses the required minor mode, sees `Express is for adults aged 18 or older`, clicks `Use Quick instead`, and starts Quick. Add a French assertion for `Je ne sais pas ou je préfère ne pas répondre`.

- [ ] **Step 2: Run the focused UI tests and verify RED**

Run:

```bash
npx vitest run app/components/landing.test.tsx app/components/assessment.test.tsx app/components/question-control.test.tsx app/page.test.tsx app/i18n/ui-copy.test.ts
```

Expected: failures for missing Express copy/card/fallback and the initial intermission.

- [ ] **Step 3: Add bilingual Express UI copy and canonical depth mapping**

Add English/French parity for:

```ts
"depth.express"
"depth.express.detail"
"depth.express.description"
"consent.express.unavailable"
"consent.express.useQuick"
"question.skip.express"
"unit.reported_vo2_max_ml_kg_min"
"unit.squat_one_rep_max_kg"
"unit.deadlift_one_rep_max_kg"
```

Use these English meanings exactly: `Express`, `9 targeted questions · under 1 minute`, `VO₂ max, strength, sleep, and nutrition for adults.`, `Express is for adults aged 18 or older. Choose Quick to continue.`, `Use Quick instead`, `I don't know or prefer not to answer`, `ml/kg/min`, `kg`, and `kg`. Add `express` to `uiCopyKeys.depth`, `expectedDynamicKeys.depth`, and the three metric IDs to `questionUnitKeys`.

Import `AnalysisDepth` into `landing.tsx`, remove its duplicate local union, and prepend the Express descriptor to `depths`. Give every card a stable modifier class such as `depth-card--express` rather than adding new `nth-child` coupling. Keep the existing Detailed dark card and Deep blue border, and give Express a restrained coral border/accent.

- [ ] **Step 4: Implement adult fallback and Express pacing**

In `ConsentScreen`, render a localized Express-unavailable status whenever the selected route is Express and `getAvailableDepths` excludes it. Its action sets `selectedDepth` to `quick`; retain the current Deep-to-Detailed branch unchanged.

Extend `QuestionControlProps` with:

```ts
readonly skipLabelKey?: UiCopyKey;
```

Render `t(skipLabelKey ?? "question.skip")` in the skip button. In `Assessment`, pass `"question.skip.express"` and initialize/schedule intermissions only when `depth !== "express"`:

```ts
const isExpress = depth === "express";
const [intermission, setIntermission] = useState<PillarIntro | null>(() =>
  !isExpress && firstPillar ? { pillar: firstPillar, completed: 0 } : null,
);
```

Guard the later chapter transition with `!isExpress`. Do not add a special laboratory branch; the exact queue makes it unreachable.

- [ ] **Step 5: Add responsive four-card landing layout and verify GREEN**

Use four equal columns at wide widths, two columns at an intermediate breakpoint, and one column at the existing mobile breakpoint. Preserve minimum 44-pixel controls, existing focus styles, French wrapping, and no horizontal overflow.

Run:

```bash
npx vitest run app/components/landing.test.tsx app/components/assessment.test.tsx app/components/question-control.test.tsx app/page.test.tsx app/i18n/ui-copy.test.ts
```

Expected: all focused UI/i18n tests pass.

- [ ] **Step 6: Commit the Express journey**

```bash
git add app/components/landing.tsx app/components/consent-screen.tsx app/components/assessment.tsx app/components/question-control.tsx app/i18n/ui-copy.ts app/globals.css app/components/landing.test.tsx app/components/assessment.test.tsx app/components/question-control.test.tsx app/page.test.tsx app/i18n/ui-copy.test.ts
git commit -m "feat: add uninterrupted express journey"
```

---

### Task 3: Pure Express summary, no-score routing, and export contract

**Files:**
- Create: `app/lib/express-summary.ts`
- Create: `app/lib/express-summary.test.ts`
- Modify: `app/lib/scoring.ts:115-145,1030-1085`
- Modify: `app/lib/scoring.test.ts:270-310`
- Modify: `app/i18n/presentation.test.ts:1280-1320`
- Modify: `app/lib/export.test.ts`

**Interfaces:**
- Produces: `ExpressSummary` and `buildExpressSummary(answers: AnswerMap): ExpressSummary`.
- Produces: insufficient-coverage reason `express-assessment` for exports and internal routing.
- Consumes: canonical structured `AnswerMap`, Decimal.js, and existing redacted export validation.

- [ ] **Step 1: Write failing pure-summary tests**

Create `app/lib/express-summary.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildExpressSummary } from "./express-summary";

describe("Express summary", () => {
  test("preserves raw metrics and rounds body-weight ratios half-up to two decimals", () => {
    expect(buildExpressSummary({
      reported_vo2_max_ml_kg_min: 48.5,
      squat_one_rep_max_kg: 123,
      deadlift_one_rep_max_kg: 181,
      height_cm: 182,
      weight_kg: 80,
      usual_sleep_hours: 7.5,
      sleep_refreshed: 8,
      plant_food_frequency: 4,
      diet_ultra_processed: "rarely",
    })).toEqual({
      vo2Max: 48.5,
      bodyContext: { heightCm: 182, weightKg: 80 },
      strength: {
        squatKg: 123,
        squatBodyWeightRatio: 1.54,
        deadliftKg: 181,
        deadliftBodyWeightRatio: 2.26,
      },
      sleep: { hours: 7.5, refreshed: 8 },
      nutrition: { plantPortions: 4, ultraProcessedFrequency: "rarely" },
    });
  });

  test.each([undefined, null, 0, -80, Number.NaN, Number.POSITIVE_INFINITY])(
    "omits strength ratios for invalid body weight %s",
    (weight) => {
      const summary = buildExpressSummary({
        weight_kg: weight as never,
        squat_one_rep_max_kg: 120,
        deadlift_one_rep_max_kg: 180,
      });
      expect(summary.strength.squatBodyWeightRatio).toBeNull();
      expect(summary.strength.deadliftBodyWeightRatio).toBeNull();
    },
  );

  test("treats skipped and invalid performance values as missing rather than zero", () => {
    const summary = buildExpressSummary({
      reported_vo2_max_ml_kg_min: null,
      squat_one_rep_max_kg: -1,
      deadlift_one_rep_max_kg: Number.NaN,
      usual_sleep_hours: 0,
      sleep_refreshed: 0,
      plant_food_frequency: 0,
    });
    expect(summary.vo2Max).toBeNull();
    expect(summary.strength.squatKg).toBeNull();
    expect(summary.strength.deadliftKg).toBeNull();
    expect(summary.sleep).toEqual({ hours: 0, refreshed: 0 });
    expect(summary.nutrition.plantPortions).toBe(0);
  });
});
```

Add a scoring test that Express returns `kind: "insufficient-coverage"`, `reason: "express-assessment"`, and no `score`. Add presentation preservation for `express-assessment`. Add an export test whose adult raw opt-in contains all nine valid structured Express answers, `assessmentDepth: "express"`, and no private metadata.

- [ ] **Step 2: Run focused model tests and verify RED**

Run:

```bash
npx vitest run app/lib/express-summary.test.ts app/lib/scoring.test.ts app/i18n/presentation.test.ts app/lib/export.test.ts
```

Expected: missing module/type and missing Express score reason failures.

- [ ] **Step 3: Implement the pure summary model**

Define focused readonly types and helpers in `app/lib/express-summary.ts`:

```ts
import Decimal from "decimal.js";
import type { AnswerMap } from "./types";

const ULTRA_PROCESSED_FREQUENCIES = new Set([
  "never",
  "rarely",
  "sometimes",
  "often",
  "daily",
]);

function finiteAtLeastZero(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function positive(value: unknown): number | null {
  const number = finiteAtLeastZero(value);
  return number !== null && number > 0 ? number : null;
}

function ratio(load: number | null, weight: number | null): number | null {
  return load !== null && weight !== null
    ? new Decimal(load).div(weight).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
    : null;
}
```

`buildExpressSummary` uses `positive` for VO₂ max, height, weight, squat, and deadlift; `finiteAtLeastZero` for sleep hours, refreshed score, and plant portions; and accepts only the five canonical frequency strings. Return exactly the object asserted by the test.

- [ ] **Step 4: Add explicit Express score routing and export coverage**

Extend `PublicInsufficientCoverageResult.reason` with `"express-assessment"`. In `calculatePurityScore`, return it before the Quick branch:

```ts
if (routing.assessmentDepth === "express") {
  return insufficientCoverage(ledger, "express-assessment");
}
if (routing.assessmentDepth === "quick") {
  return insufficientCoverage(ledger, "quick-assessment");
}
```

No export implementation change is required beyond the expanded depth type and bank definitions; prove the existing structured-answer allowlist includes the new numeric IDs.

- [ ] **Step 5: Run focused model tests and verify GREEN**

Run:

```bash
npx vitest run app/lib/express-summary.test.ts app/lib/scoring.test.ts app/i18n/presentation.test.ts app/lib/export.test.ts
```

Expected: all summary, score-routing, localization-preservation, and export tests pass.

- [ ] **Step 6: Commit the model and export contract**

```bash
git add app/lib/express-summary.ts app/lib/express-summary.test.ts app/lib/scoring.ts app/lib/scoring.test.ts app/i18n/presentation.test.ts app/lib/export.test.ts
git commit -m "feat: derive transparent express summaries"
```

---

### Task 4: Four-card Express results and shared tools

**Files:**
- Create: `app/components/express-results.tsx`
- Create: `app/components/express-results.test.tsx`
- Modify: `app/components/results.tsx:1-560`
- Modify: `app/components/results.test.tsx`
- Modify: `app/i18n/ui-copy.ts:250-350,620-710,720-881`
- Modify: `app/globals.css:730-925,931-950`

**Interfaces:**
- Consumes: `buildExpressSummary`, `AnswerMap`, locale/t function, and the shared result-tools block.
- Produces: `ExpressResults({ answers }: { readonly answers: AnswerMap })` with one neutral context region and exactly four summary articles.
- Preserves: existing Results props, urgent evaluation, print/download/restart controls, and every non-Express result branch.

- [ ] **Step 1: Write failing component and integration tests**

Create a direct component test that renders a complete answer set in English, then French, and asserts:

```tsx
expect(screen.getByRole("heading", { name: "Your Express snapshot" })).toBeVisible();
expect(screen.getAllByRole("article")).toHaveLength(4);
expect(screen.getByRole("heading", { name: "VO₂ max" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Strength" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Sleep" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Nutrition" })).toBeVisible();
expect(screen.getByText("1.54 × body weight")).toBeVisible();
expect(screen.getByText("2.26 × body weight")).toBeVisible();
expect(document.body.textContent).not.toMatch(/BMI|poor|average|good|excellent|elite|\/ 100/i);
```

Add a missing-data test that shows localized `Not provided` without displaying `0 kg` or `0 ml/kg/min`. In `results.test.tsx`, render `Results` at `assessmentDepth="express"` and assert the Express snapshot and result tools are visible while `Health signal pillars`, `Purity Score`, `wellness habits reflection`, and `Actions you can choose` are absent.

- [ ] **Step 2: Run focused result tests and verify RED**

Run:

```bash
npx vitest run app/components/express-results.test.tsx app/components/results.test.tsx app/i18n/ui-copy.test.ts
```

Expected: missing component/copy and existing generic Results surface failures.

- [ ] **Step 3: Add bilingual result copy and implement `ExpressResults`**

Add English/French parity for the Express eyebrow, title, intro, boundary, body-context title, height, weight, four card titles, value labels, missing label, ratio template, VO₂ protocol note, and the five ultra-processed frequency values. Add a typed `uiCopyKeys.expressFrequency` mapping from `never | rarely | sometimes | often | daily` to those keys.

Implement `ExpressResults` as:

```tsx
export function ExpressResults({ answers }: { readonly answers: AnswerMap }) {
  const { locale, t } = useI18n();
  const summary = buildExpressSummary(answers);
  const numberFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const ratioFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const missing = t("expressResults.missing");
  const metric = (value: number | null, unit: string) =>
    value === null ? missing : `${numberFormat.format(value)} ${unit}`;
  const ratio = (value: number) =>
    t("expressResults.strength.ratio", { ratio: ratioFormat.format(value) });
  const frequency = summary.nutrition.ultraProcessedFrequency === null
    ? missing
    : t(uiCopyKeys.expressFrequency[summary.nutrition.ultraProcessedFrequency]);

  return (
    <section className="express-results" aria-labelledby="express-results-title">
      <p className="data-label">{t("expressResults.eyebrow")}</p>
      <h2 id="express-results-title">{t("expressResults.title")}</h2>
      <p className="express-results__intro">{t("expressResults.intro")}</p>
      <p className="express-results__context-title">{t("expressResults.context.title")}</p>
      <dl className="express-results__context">
        <div>
          <dt>{t("expressResults.context.height")}</dt>
          <dd>{metric(summary.bodyContext.heightCm, "cm")}</dd>
        </div>
        <div>
          <dt>{t("expressResults.context.weight")}</dt>
          <dd>{metric(summary.bodyContext.weightKg, "kg")}</dd>
        </div>
      </dl>
      <div className="express-results__grid">
        <article className="express-result-card">
          <h3>{t("expressResults.vo2.title")}</h3>
          <p>{metric(summary.vo2Max, "ml/kg/min")}</p>
          <p>{t("expressResults.vo2.note")}</p>
        </article>
        <article className="express-result-card">
          <h3>{t("expressResults.strength.title")}</h3>
          <dl>
            <div>
              <dt>{t("expressResults.strength.squat")}</dt>
              <dd>
                {metric(summary.strength.squatKg, "kg")}
                {summary.strength.squatBodyWeightRatio === null
                  ? null
                  : ` · ${ratio(summary.strength.squatBodyWeightRatio)}`}
              </dd>
            </div>
            <div>
              <dt>{t("expressResults.strength.deadlift")}</dt>
              <dd>
                {metric(summary.strength.deadliftKg, "kg")}
                {summary.strength.deadliftBodyWeightRatio === null
                  ? null
                  : ` · ${ratio(summary.strength.deadliftBodyWeightRatio)}`}
              </dd>
            </div>
          </dl>
        </article>
        <article className="express-result-card">
          <h3>{t("expressResults.sleep.title")}</h3>
          <p>{t("expressResults.sleep.hours")}: {metric(summary.sleep.hours, t("expressResults.unit.hours"))}</p>
          <p>{t("expressResults.sleep.refreshed")}: {metric(summary.sleep.refreshed, "/ 10")}</p>
        </article>
        <article className="express-result-card">
          <h3>{t("expressResults.nutrition.title")}</h3>
          <p>{t("expressResults.nutrition.plants")}: {metric(summary.nutrition.plantPortions, t("expressResults.unit.portions"))}</p>
          <p>{t("expressResults.nutrition.ultraProcessed")}: {frequency}</p>
        </article>
      </div>
      <p className="express-results__boundary">{t("expressResults.boundary")}</p>
    </section>
  );
}
```

Add the referenced `expressResults.unit.hours` and `expressResults.unit.portions` copy keys. Keep `null` distinct from numeric zero, and resolve the nutrition frequency only through `uiCopyKeys.expressFrequency`.

- [ ] **Step 4: Integrate the dedicated branch without changing other depths**

In `Results`, keep urgent computation and the shared tools. Inside the revealed/adult result body, use `assessmentDepth === "express"` to render `<ExpressResults answers={answers} />`; otherwise render the existing `results-canopy`/`RiskTree`, adolescent-or-score branch, and `ActionPlan` JSX byte-for-byte. Keep `ConfirmedLabs` and `result-tools` after this conditional so the tool controls remain shared.

Return an empty action list for Express in the existing `useMemo`, so the redacted export does not imply a ranked plan from nine answers:

```ts
const actions = useMemo(
  () => assessmentDepth === "express" ? [] : buildActionPlan(leaves, score),
  [assessmentDepth, leaves, score],
);
```

Keep `ConfirmedLabs` and `result-tools` after the branch. Express has no confirmed labs in normal flow, but no separate prop contract is needed.

- [ ] **Step 5: Style, print, and verify GREEN**

Add `.express-results`, `.express-results__context`, `.express-results__grid`, and `.express-result-card` styles derived from existing paper/ink/deep-water/electric-blue/coral/amber tokens. Use four columns wide, two columns at the intermediate breakpoint, and one below 850px. Use typography and borders rather than gauges, progress rings, traffic-light colours, or a new visual asset. Include `.express-results` and its cards in the existing print normalization.

Run:

```bash
npx vitest run app/components/express-results.test.tsx app/components/results.test.tsx app/i18n/ui-copy.test.ts
```

Expected: all focused result/i18n tests pass in English and French.

- [ ] **Step 6: Commit the Express result surface**

```bash
git add app/components/express-results.tsx app/components/express-results.test.tsx app/components/results.tsx app/components/results.test.tsx app/i18n/ui-copy.ts app/globals.css
git commit -m "feat: render four-part express results"
```

---

### Task 5: Current documentation and complete release verification

**Files:**
- Modify: `README.md:7-25,65-75`
- Modify: `docs/privacy-and-release.md:14-20,55-65`
- Modify: `docs/superpowers/specs/2026-08-04-express-assessment-design.md:1-194`
- Verify: all tracked source and test files

**Interfaces:**
- Consumes: the complete Express implementation from Tasks 1–4.
- Produces: current 246-question documentation, implemented design status, and evidence from the full local release matrix.

- [ ] **Step 1: Update current-state documentation without rewriting historical specs**

In `README.md`, change the current bank/mapping count from 243 to 246 and add an implemented-scope bullet:

```md
- **Express:** exactly 9 adult-only targeted questions, under 1 minute, covering reported VO₂ max, squat/deadlift one-rep maxima, sleep, body context, and nutrition. It returns four transparent summaries without a global score or fitness ranking.
```

In `docs/privacy-and-release.md`, update the current closed guard to 246 questions, name Express 9 alongside the unchanged 20/50/150–200 contracts, and clarify that Express reports a user-entered measured/device-estimated VO₂ max but does not measure or estimate it itself. Leave old dated design/plan counts unchanged because they describe their plan-time baseline.

Set the Express design status to `implemented; release verification complete` only after every command below passes. Do not claim deployment because deployment is outside this request.

- [ ] **Step 2: Run TypeScript and focused Express tests**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npx vitest run app/lib/questionnaire.test.ts app/lib/health-pillars.test.ts app/i18n/questions-fr.test.ts app/components/landing.test.tsx app/components/assessment.test.tsx app/components/question-control.test.tsx app/page.test.tsx app/lib/express-summary.test.ts app/lib/scoring.test.ts app/i18n/presentation.test.ts app/lib/export.test.ts app/components/express-results.test.tsx app/components/results.test.tsx app/i18n/ui-copy.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the full pinned release matrix**

Run:

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
. "$NVM_DIR/nvm.sh"
nvm use 24.13.0
test "$(node --version)" = "v24.13.0"
npm run lint
npm test -- --run
npm run build
npm audit --omit=dev --json
git diff --check
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -print
```

Expected: TypeScript already passed; lint, full Vitest, build, audit, and diff check exit 0; audit reports zero production vulnerabilities; no `.tsbuildinfo` path prints.

- [ ] **Step 4: Perform focused browser QA**

Start the local app and verify desktop plus 390px mobile in English and French:

- Express is first and its four-card landing layout does not overflow.
- Adult consent starts Express; age 17 displays the Quick fallback.
- Question progress is 1/9 through 9/9 with no intermission or lab import.
- A language switch preserves the current draft and answer.
- The skip action is localized and keyboard reachable.
- Four Express result cards and neutral body context render; missing values do not become zero.
- Print hides decorative/result tools as before; no runtime request leaves localhost; no storage or cookie is written.

- [ ] **Step 5: Record verification status and commit**

After all verification passes, set the design status as specified and record only factual local test/build results in the current README verification paragraph without replacing the retained historical deployment record.

```bash
git add README.md docs/privacy-and-release.md docs/superpowers/specs/2026-08-04-express-assessment-design.md
git commit -m "docs: record express assessment verification"
```

- [ ] **Step 6: Inspect the final branch**

Run:

```bash
git status --short --branch
git log --oneline --decorate -7
git diff HEAD~5..HEAD --check
```

Expected: clean feature branch, five implementation/documentation commits after the design and plan commits, and no whitespace errors.
