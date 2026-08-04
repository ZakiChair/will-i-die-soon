# Four-pillar Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the false interactive canopy with a global botanical theme and present the adaptive assessment and evidence tree through four bilingual health pillars without changing clinical logic or depth budgets.

**Architecture:** Add one pure presentation module that maps every question and every active risk-rule ID to one of four ordered pillars. Apply question grouping only after the existing eligibility and budget selection, derive the visible chapter from the current question, and group evaluated leaves only inside the result-tree renderer; the questionnaire, risk engine, score, export schema, and evidence provenance remain canonical. Static botanical media provides the persistent atmosphere, while locally hosted motion appears only at the landing hero and a pillar transition with reduced-motion and failure fallbacks.

**Tech Stack:** Next/Vinext, React 19.2.8, TypeScript 5.9, Vitest, Testing Library, CSS, existing local image/video assets, built-in image generation, FFmpeg, Node 24.13.0, Sites private hosting.

## Global Constraints

- Pillar order is exactly `cardio-energy`, `strength-neural`, `sleep-circadian`, `nutrition-metabolic`.
- User-facing English labels are exactly `Cardio, VO₂ max & cellular energy`, `Strength, nervous system & recovery`, `Sleep & circadian rhythm`, and `Nutrition & metabolic health`; complete French equivalents are required.
- Intake/profile and urgent routing are a safety envelope, not a fifth pillar.
- Quick remains exactly 20 questions, Detailed exactly 50, and Deep 150–200; pillar grouping happens after selection and cannot change the selected ID multiset.
- Every current question (243 at plan time), every current `HealthDomain` (47), and every current active risk rule (54) resolves to exactly one primary presentation pillar; missing or stale mappings fail tests.
- No risk-rule condition, input, factor, source ID, evidence tier, urgency, signal, applicability, dedupe key, emergency kind, score formula, export schema, or lab parsing contract changes.
- VO₂ max is shown only as reported/measured context; the questionnaire does not claim to measure VO₂ max or mitochondrial function.
- No new runtime dependency, backend, analytics, cookie, browser storage, remote media, remote OCR/PDF worker, or answer upload.
- Question typography remains `clamp(1.9rem, 3.4vw, 3.75rem)` and mobile `clamp(1.7rem, 7.4vw, 2.6rem)`.
- Decorative media carries no interaction or semantic information. Motion is muted, inline, nonessential, visibility-gated, and absent under `prefers-reduced-motion`.
- Use the pinned `/Users/zakichair/.nvm/versions/node/v24.13.0/bin` toolchain for installs, tests, lint, build, and audits.
- Hosting remains private and owner-only. Never call the public Sites deployment method without a separate user approval.

---

### Task 1: Typed four-pillar model and stable queue ordering

**Files:**
- Create: `app/lib/health-pillars.ts`
- Create: `app/lib/health-pillars.test.ts`
- Modify: `app/lib/questionnaire.ts:182-270`
- Modify: `app/lib/questionnaire.test.ts`

**Interfaces:**
- Produces: `HEALTH_PILLARS`, `HealthPillar`, `DEFAULT_PILLAR_BY_DOMAIN`, `QUESTION_PILLAR_OVERRIDES`, `healthPillarForQuestion(question)`, and `groupQuestionsByPillar(questions)`.
- Produces: `RISK_RULE_PILLAR_BY_ID`, `healthPillarForRiskRule(ruleId)`, and `indexRiskLeavesByPillar(leaves)` for Task 4.
- Consumes: canonical `HealthDomain`, `Question`, and `RiskLeaf` types; it does not import UI copy or mutate inputs.

- [x] **Step 1: Write the failing coverage and gate-order tests.**

Create `app/lib/health-pillars.test.ts` with real-bank assertions:

```ts
import { describe, expect, test } from "vitest";
import { questionBank } from "../data/questions";
import { riskRules } from "../data/rules";
import type { BranchCondition } from "./types";
import {
  DEFAULT_PILLAR_BY_DOMAIN,
  HEALTH_PILLARS,
  QUESTION_PILLAR_OVERRIDES,
  RISK_RULE_PILLAR_BY_ID,
  groupQuestionsByPillar,
  healthPillarForQuestion,
} from "./health-pillars";

function conditionRefs(condition: BranchCondition): string[] {
  if ("questionId" in condition) return [condition.questionId];
  if ("all" in condition) return condition.all.flatMap(conditionRefs);
  return condition.any.flatMap(conditionRefs);
}

test("defines the four pillars in product order", () => {
  expect(HEALTH_PILLARS).toEqual([
    "cardio-energy",
    "strength-neural",
    "sleep-circadian",
    "nutrition-metabolic",
  ]);
});

test("maps every current domain, question, and risk rule exactly once", () => {
  expect(Object.keys(DEFAULT_PILLAR_BY_DOMAIN).sort()).toEqual(
    [...new Set(questionBank.map(({ domain }) => domain))].sort(),
  );
  expect(Object.keys(RISK_RULE_PILLAR_BY_ID).sort()).toEqual(
    riskRules.map(({ id }) => id).sort(),
  );
  for (const question of questionBank) {
    expect(HEALTH_PILLARS).toContain(healthPillarForQuestion(question));
  }
});

test("keeps every conditional gate in the same or an earlier pillar", () => {
  const byId = new Map(questionBank.map((question) => [question.id, question]));
  const order = new Map(HEALTH_PILLARS.map((pillar, index) => [pillar, index]));
  const violations: string[] = [];
  for (const dependent of questionBank) {
    if (!dependent.condition) continue;
    for (const gateId of conditionRefs(dependent.condition)) {
      const gate = byId.get(gateId);
      expect(gate, `${dependent.id} references ${gateId}`).toBeDefined();
      if (order.get(healthPillarForQuestion(gate!))! > order.get(healthPillarForQuestion(dependent))!) {
        violations.push(`${gateId} -> ${dependent.id}`);
      }
    }
  }
  expect(violations).toEqual([]);
});

test("groups without changing IDs and preserves order inside each pillar", () => {
  const grouped = groupQuestionsByPillar(questionBank);
  expect(grouped.map(({ id }) => id).sort()).toEqual(questionBank.map(({ id }) => id).sort());
  for (const pillar of HEALTH_PILLARS) {
    expect(grouped.filter((q) => healthPillarForQuestion(q) === pillar).map(({ id }) => id))
      .toEqual(questionBank.filter((q) => healthPillarForQuestion(q) === pillar).map(({ id }) => id));
  }
});
```

Also assert every question override names a real question and differs from its domain default. The plan-time graph must report 243 questions, 88 conditional questions, and 98 gate edges.

- [x] **Step 2: Run the focused RED suite.**

Run:

```bash
export PATH=/Users/zakichair/.nvm/versions/node/v24.13.0/bin:$PATH
npx vitest run app/lib/health-pillars.test.ts
```

Expected: FAIL because `app/lib/health-pillars.ts` does not exist.

- [x] **Step 3: Implement the exhaustive question mapping.**

Create the pure module with this exact public shape and product order:

```ts
import type { HealthDomain, Question, RiskLeaf } from "./types";

export const HEALTH_PILLARS = [
  "cardio-energy",
  "strength-neural",
  "sleep-circadian",
  "nutrition-metabolic",
] as const;
export type HealthPillar = (typeof HEALTH_PILLARS)[number];

export const DEFAULT_PILLAR_BY_DOMAIN = {
  demographics: "cardio-energy",
  "family-history": "cardio-energy",
  "diagnosed-conditions": "cardio-energy",
  "current-symptoms": "cardio-energy",
  "emergency-symptoms": "cardio-energy",
  movement: "cardio-energy",
  "sedentary-time": "cardio-energy",
  environment: "cardio-energy",
  "tobacco-nicotine": "cardio-energy",
  "blood-pressure": "cardio-energy",

  stress: "strength-neural",
  mood: "strength-neural",
  anxiety: "strength-neural",
  cognition: "strength-neural",
  "social-connection": "strength-neural",
  "work-exposures": "strength-neural",
  sun: "strength-neural",
  "sexual-health": "strength-neural",
  "reproductive-health": "strength-neural",
  pregnancy: "strength-neural",
  cannabis: "strength-neural",
  stimulants: "strength-neural",
  opioids: "strength-neural",
  psychedelics: "strength-neural",
  "recreational-drugs": "strength-neural",
  "anabolic-steroids": "strength-neural",
  corticosteroids: "strength-neural",
  "research-compounds": "strength-neural",
  isotretinoin: "strength-neural",
  minoxidil: "strength-neural",
  "prescription-medications": "strength-neural",
  "otc-medications": "strength-neural",
  "medication-adherence": "strength-neural",
  interactions: "strength-neural",
  "preventive-care": "strength-neural",
  vaccinations: "strength-neural",

  sleep: "sleep-circadian",
  "circadian-rhythm": "sleep-circadian",

  measurements: "nutrition-metabolic",
  diet: "nutrition-metabolic",
  hydration: "nutrition-metabolic",
  "dental-health": "nutrition-metabolic",
  alcohol: "nutrition-metabolic",
  glp1: "nutrition-metabolic",
  supplements: "nutrition-metabolic",
  "blood-testing": "nutrition-metabolic",
  "lab-values": "nutrition-metabolic",
} as const satisfies Record<HealthDomain, HealthPillar>;

export const QUESTION_PILLAR_OVERRIDES = {
  family_diabetes: "nutrition-metabolic",
  diagnosed_high_cholesterol: "nutrition-metabolic",
  pain_interference: "strength-neural",
  resting_heart_rate_known: "cardio-energy",
  movement_strength_days: "strength-neural",
  movement_balance_training: "strength-neural",
  movement_daily_tasks: "strength-neural",
  movement_limiting_condition: "strength-neural",
  movement_recovery: "strength-neural",
  sedentary_screen_evening: "sleep-circadian",
  work_airborne_exposure: "cardio-energy",
  work_schedule_control: "sleep-circadian",
  diet_meal_regular: "sleep-circadian",
  reproductive_menopause_change: "sleep-circadian",
  has_recent_labs: "cardio-energy",
  lab_value_total_cholesterol: "cardio-energy",
  lab_value_hdl_cholesterol: "cardio-energy",
  lab_value_ldl_cholesterol: "cardio-energy",
  lab_value_hemoglobin: "strength-neural",
  lab_value_ferritin: "strength-neural",
  lab_value_vitamin_d: "strength-neural",
  uses_minoxidil: "cardio-energy",
  minoxidil_detail_cardiac_symptoms: "cardio-energy",
  adolescent_substance_severe_timing: "nutrition-metabolic",
} as const satisfies Readonly<Record<string, HealthPillar>>;

export function healthPillarForQuestion(question: Question): HealthPillar {
  return QUESTION_PILLAR_OVERRIDES[question.id as keyof typeof QUESTION_PILLAR_OVERRIDES]
    ?? DEFAULT_PILLAR_BY_DOMAIN[question.domain];
}

export function groupQuestionsByPillar(questions: ReadonlyArray<Question>): Question[] {
  return HEALTH_PILLARS.flatMap((pillar) =>
    questions.filter((question) => healthPillarForQuestion(question) === pillar),
  );
}
```

The `adolescent_substance_severe_timing` override is required because it depends on both strength/substance gates and the later nutrition/alcohol gate. Do not delete it as a cosmetic exception.

- [x] **Step 4: Implement the exhaustive risk-rule presentation table.**

Add this explicit mapping to the same module; it changes presentation only:

```ts
export const RISK_RULE_PILLAR_BY_ID = {
  "urgent-chest": "cardio-energy",
  "urgent-breathing": "cardio-energy",
  "urgent-severe-allergy": "cardio-energy",
  "urgent-severe-bleeding": "cardio-energy",
  "blood-pressure-salt-context": "cardio-energy",
  "breathlessness-review": "cardio-energy",
  "nicotine-support": "cardio-energy",
  "oral-minoxidil-symptom-review": "cardio-energy",
  "topical-minoxidil-symptom-review": "cardio-energy",
  "anabolic-cardiorespiratory-review": "cardio-energy",
  "anabolic-leg-symptom-review": "cardio-energy",
  "stimulant-symptom-review": "cardio-energy",

  "urgent-stroke": "strength-neural",
  "urgent-overdose-poisoning": "strength-neural",
  "urgent-self-harm": "strength-neural",
  "urgent-adolescent-substance-safety": "strength-neural",
  "low-mood-support": "strength-neural",
  "child-feeling-support": "strength-neural",
  "adolescent-substance-support": "strength-neural",
  "adolescent-substance-safety-support": "strength-neural",
  "isotretinoin-physical-symptom-review": "strength-neural",
  "isotretinoin-mood-review": "strength-neural",
  "topical-minoxidil-scalp-review": "strength-neural",
  "research-product-source-review": "strength-neural",
  "research-product-condition-review": "strength-neural",
  "research-product-storage-review": "strength-neural",
  "anabolic-neurologic-review": "strength-neural",
  "anabolic-mood-review": "strength-neural",
  "cannabis-unwanted-effect-review": "strength-neural",
  "opioid-mixing-safety-review": "strength-neural",
  "psychedelic-aftereffect-review": "strength-neural",
  "recreational-drug-effect-review": "strength-neural",
  "changing-skin-mark-review": "strength-neural",
  "sexual-safety-support": "strength-neural",
  "adult-movement-pattern": "strength-neural",

  "adult-short-sleep": "sleep-circadian",
  "sleep-breathing-review": "sleep-circadian",

  "urgent-adolescent-pregnancy-safety": "nutrition-metabolic",
  "anabolic-liver-symptom-review": "nutrition-metabolic",
  "alcohol-control-support": "nutrition-metabolic",
  "glp1-severe-allergy": "nutrition-metabolic",
  "glp1-gastrointestinal-review": "nutrition-metabolic",
  "glp1-glucose-symptom-review": "nutrition-metabolic",
  "glp1-diabetes-vision-review": "nutrition-metabolic",
  "glp1-history-review": "nutrition-metabolic",
  "glp1-pregnancy-procedure-review": "nutrition-metabolic",
  "isotretinoin-pregnancy-program-review": "nutrition-metabolic",
  "systemic-steroid-illness-review": "nutrition-metabolic",
  "systemic-steroid-omission-review": "nutrition-metabolic",
  "eating-distress-support": "nutrition-metabolic",
  "pregnancy-new-concern-review": "nutrition-metabolic",
  "pregnancy-care-safety-support": "nutrition-metabolic",
  "pregnancy-medicine-review": "nutrition-metabolic",
  "minor-pregnancy-support": "nutrition-metabolic",
} as const satisfies Readonly<Record<string, HealthPillar>>;

export function healthPillarForRiskRule(ruleId: string): HealthPillar {
  if (!Object.hasOwn(RISK_RULE_PILLAR_BY_ID, ruleId)) {
    throw new Error(`Missing health-pillar mapping for risk rule: ${ruleId}`);
  }
  return RISK_RULE_PILLAR_BY_ID[ruleId as keyof typeof RISK_RULE_PILLAR_BY_ID];
}

export function indexRiskLeavesByPillar(leaves: ReadonlyArray<RiskLeaf>) {
  const index: Record<HealthPillar, RiskLeaf[]> = {
    "cardio-energy": [],
    "strength-neural": [],
    "sleep-circadian": [],
    "nutrition-metabolic": [],
  };
  for (const leaf of leaves) index[healthPillarForRiskRule(leaf.ruleId)].push(leaf);
  return index;
}
```

The coverage test must require exactly 54 keys and the distribution 12 / 23 / 2 / 17. A new rule must fail until classified.

- [x] **Step 5: Group queues only after existing selection and prove budgets unchanged.**

In both `buildAssessmentQueue` and `reconcileAssessmentState`, wrap the existing result only after `selectAssessmentQuestions`:

```ts
return groupQuestionsByPillar(selectAssessmentQuestions(depth, eligible, stableAnswers));
```

Extend `app/lib/questionnaire.test.ts` to assert non-decreasing pillar indices, unchanged selected ID multisets, exact 20/50 budgets, Deep 150–200, and conditional reconciliation. Run:

```bash
npx vitest run app/lib/health-pillars.test.ts app/lib/questionnaire.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit the pure model.**

```bash
git add app/lib/health-pillars.ts app/lib/health-pillars.test.ts app/lib/questionnaire.ts app/lib/questionnaire.test.ts
git commit -m "feat: add four-pillar presentation model"
```

---

### Task 2: Bilingual chapter progress and pillar transitions

**Files:**
- Create: `app/components/pillar-progress.tsx`
- Create: `app/components/pillar-progress.test.tsx`
- Modify: `app/i18n/ui-copy.ts:3-380`
- Modify: `app/i18n/ui-copy.test.ts`
- Modify: `app/components/assessment.tsx:61-330`
- Modify: `app/components/assessment.test.tsx`
- Modify: `app/components/intermission.tsx`
- Modify: `app/components/intermission.test.tsx`

**Interfaces:**
- Consumes: `HEALTH_PILLARS`, `HealthPillar`, and `healthPillarForQuestion` from Task 1.
- Produces: `uiCopyKeys.pillar`, `uiCopyKeys.pillarShort`, and bilingual chapter/intermission copy.
- Produces: `PillarProgress({ currentPillar, completedQuestions, totalQuestions })` and `Intermission({ pillar, completed, total, onContinue })`.

- [x] **Step 1: Write RED copy, progress, and transition tests.**

Add copy coverage for these exact labels:

```ts
expect(t("pillar.cardio-energy")).toBe("Cardio, VO₂ max & cellular energy");
expect(t("pillar.strength-neural")).toBe("Strength, nervous system & recovery");
expect(t("pillar.sleep-circadian")).toBe("Sleep & circadian rhythm");
expect(t("pillar.nutrition-metabolic")).toBe("Nutrition & metabolic health");
```

French expectations are `Cardio, VO₂ max et énergie cellulaire`, `Force, système nerveux et récupération`, `Sommeil et rythme circadien`, and `Alimentation et santé métabolique`.

Create a component test that expects a non-interactive four-step list, `aria-current="step"` on the current pillar, text `02 / 04`, and no button/link roles. Add assessment tests that expect an initial `01 / 04` pillar introduction, a single introduction for each newly entered pillar, no repeated introduction after Back, and unchanged urgent/lab interruption priority.

Run:

```bash
npx vitest run app/i18n/ui-copy.test.ts app/components/pillar-progress.test.tsx app/components/intermission.test.tsx app/components/assessment.test.tsx
```

Expected: FAIL for missing keys/component and domain-based intermissions.

- [x] **Step 2: Add typed English and French pillar copy.**

Add long labels above plus short labels:

```ts
"pillar.cardio-energy.short": "Cardio & energy",
"pillar.strength-neural.short": "Strength & recovery",
"pillar.sleep-circadian.short": "Sleep",
"pillar.nutrition-metabolic.short": "Nutrition & metabolism",
```

French short labels are `Cardio et énergie`, `Force et récupération`, `Sommeil`, and `Nutrition et métabolisme`. Add:

```ts
"assessment.pillar.aria": "Assessment chapters",
"assessment.pillar.position": "{current} / 04 · {pillar}",
"intermission.eyebrow": "Chapter {current} / 04",
"intermission.title": "Next: {pillar}",
"intermission.body": "A short pause before the next chapter. Your answers are still only in this browser session.",
```

Provide complete French equivalents and typed `uiCopyKeys.pillar` records. Do not remove old canopy keys until Task 3, while the old component still compiles.

- [x] **Step 3: Implement non-interactive pillar progress.**

Use an ordered list, not tabs, navigation, or buttons:

```tsx
type PillarProgressProps = {
  readonly currentPillar: HealthPillar;
  readonly completedQuestions: number;
  readonly totalQuestions: number;
};

export function PillarProgress({
  currentPillar,
  completedQuestions,
  totalQuestions,
}: PillarProgressProps) {
  const { t } = useI18n();
  const current = HEALTH_PILLARS.indexOf(currentPillar);
  return (
    <section className="pillar-progress" aria-label={t("assessment.pillar.aria")}>
      <p className="pillar-progress__position">
        {t("assessment.pillar.position", {
          current: String(current + 1).padStart(2, "0"),
          pillar: t(uiCopyKeys.pillar[currentPillar]),
        })}
      </p>
      <ol>
        {HEALTH_PILLARS.map((pillar, index) => (
          <li key={pillar} aria-current={pillar === currentPillar ? "step" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {t(uiCopyKeys.pillarShort[pillar])}
          </li>
        ))}
      </ol>
      <progress value={completedQuestions} max={totalQuestions} />
    </section>
  );
}
```

The labelled section describes progress only; it does not permit skipping adaptive questions.

- [x] **Step 4: Replace arbitrary domain milestones with one-time pillar introductions.**

Remove `INTERMISSION_LIMITS`, `milestoneIndices`, and domain-set artwork heuristics. Derive the current pillar from the current question. Treat entry from intake into the first available pillar as the first introduction, then show an introduction only when `nextPillar !== answeredPillar` and that next pillar has not been introduced:

```ts
type PillarIntro = { readonly pillar: HealthPillar; readonly completed: number };
const firstPillar = initialQueue[0] ? healthPillarForQuestion(initialQueue[0]) : null;
const [intermission, setIntermission] = useState<PillarIntro | null>(() =>
  firstPillar ? { pillar: firstPillar, completed: 0 } : null,
);
const introducedPillars = useRef(new Set<HealthPillar>(firstPillar ? [firstPillar] : []));

const nextPillar = healthPillarForQuestion(nextQuestion);
const answeredPillar = healthPillarForQuestion(answeredQuestion);
if (nextPillar !== answeredPillar && !introducedPillars.current.has(nextPillar)) {
  introducedPillars.current.add(nextPillar);
  setIntermission({ pillar: nextPillar, completed });
}
```

The initial intro provides the cardio artwork opportunity; subsequent intros use the entering pillar. Back navigation does not clear `introducedPillars`. An urgent leaf clears the intro exactly as it clears the current intermission now. Lab import keeps precedence when `has_recent_labs` is answered.

During this task, map `cardio-energy` temporarily to `/media/canopy-hero.webp`, strength to recovery, sleep to sleep, and nutrition to metabolism; Task 5 replaces the cardio fallback with its generated asset and adds motion.

- [x] **Step 5: Update assessment helpers and verify all routes.**

Teach test helpers to click `Continue assessment` when a chapter intro is present. Assert adult Quick includes all four pillar labels, minors retain their existing private/assisted routes, an urgent answer still interrupts before later chapter content, and lab import still resumes the correct pillar.

Run:

```bash
npx vitest run app/i18n/ui-copy.test.ts app/components/pillar-progress.test.tsx app/components/intermission.test.tsx app/components/assessment.test.tsx app/page.test.tsx
```

Expected: PASS.

- [x] **Step 6: Commit chapter navigation.**

```bash
git add app/components/pillar-progress.tsx app/components/pillar-progress.test.tsx app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts app/components/assessment.tsx app/components/assessment.test.tsx app/components/intermission.tsx app/components/intermission.test.tsx
git commit -m "feat: organize assessment into four chapters"
```

---

### Task 3: Remove the false canopy controls and apply the ambient background

**Files:**
- Delete: `app/components/living-canopy.tsx`
- Modify: `app/components/landing.tsx:1-130`
- Modify: `app/components/landing.test.tsx`
- Modify: `app/components/assessment.tsx:282-320`
- Modify: `app/i18n/ui-copy.ts`
- Modify: `app/i18n/ui-copy.test.ts`
- Modify: `app/globals.css:3-200, 301-325, 774-858`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: existing `/media/canopy-hero.webp` and `/media/canopy-loop.mp4`.
- Produces: decorative `landing__canopy-media` with no focusable descendants and global CSS tokens `--motif-canopy`, `--motif-wash`, `--motif-wash-dense`, and `--surface-readable`.

- [x] **Step 1: Write tests that reproduce the false affordance and demand its removal.**

Add to `landing.test.tsx`:

```tsx
expect(screen.queryByRole("button", { name: /sleep|heart|habits|care/i })).not.toBeInTheDocument();
expect(container.querySelector(".canopy__leaf[aria-pressed]")).not.toBeInTheDocument();
expect(container.querySelectorAll(".canopy__branch, .canopy__trunk")).toHaveLength(0);
expect(container.querySelector(".landing__canopy-media img")).toBeInTheDocument();
```

Add CSS tests for the four background tokens, `no-repeat`, readable surfaces, and print removal. Replace the old assertion mentioning `.canopy__leaf:focus-visible` with an assertion that no `.canopy__leaf` selector exists.

Run:

```bash
npx vitest run app/components/landing.test.tsx app/globals.test.ts
```

Expected: FAIL because the four decorative buttons and canopy CSS still exist.

- [x] **Step 2: Remove the component and stale copy without touching the functional risk tree.**

Remove `LivingCanopy` imports and renders from landing and assessment. Delete only `app/components/living-canopy.tsx`; do not delete `RiskTree`. Remove `canopy.aria`, `canopy.caption`, all four `canopyBranch.*` keys, and `uiCopyKeys.canopyBranch` after no caller remains.

Keep the hero media wrapper, poster/video handoff, static fallback, and reduced-motion behaviour. Its image and video remain `aria-hidden`, empty-alt, and non-focusable.

- [x] **Step 3: Implement the static botanical theme and readable surfaces.**

Add exact tokens:

```css
:root {
  --motif-canopy: url("/media/canopy-hero.webp");
  --motif-wash: rgb(244 247 245 / 92%);
  --motif-wash-dense: rgb(244 247 245 / 96%);
  --surface-readable: rgb(255 255 255 / 88%);
}

body {
  background:
    linear-gradient(var(--motif-wash), var(--motif-wash)),
    var(--motif-canopy) top center / min(1920px, 100vw) auto no-repeat,
    linear-gradient(90deg, transparent 0 7.9%, rgb(18 62 70 / 8%) 7.9% 8%, transparent 8% 92%, rgb(18 62 70 / 8%) 92% 92.1%, transparent 92.1%),
    var(--paper);
}
```

Use `--surface-readable` for consent/question/result cards and `--motif-wash-dense` or an equally opaque surface for lab forms/tables. Remove every `.canopy`, `.canopy__*`, and `.assessment__rail .canopy*` rule. Keep blue for real progress, checked answers, links, and the functional result selection only.

At 560px, set `background-size: 100% 760px, auto 760px, 100% 100%` and `background-position: top center, top center, top center`; assert `document.documentElement.scrollWidth === innerWidth` in browser QA. Under print, set `body { background: white; background-image: none; }`.

- [x] **Step 4: Run focused and full first-party UI tests.**

```bash
npx vitest run app/components/landing.test.tsx app/components/assessment.test.tsx app/page.test.tsx app/components/lab-import.test.tsx app/components/results.test.tsx app/globals.test.ts app/i18n/ui-copy.test.ts
```

Expected: PASS; no landing/assessment button named Sleep, Heart, Habits, or Care remains.

- [x] **Step 5: Commit the root-cause fix and visual surface.**

```bash
git add app/components/landing.tsx app/components/landing.test.tsx app/components/assessment.tsx app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts app/globals.css app/globals.test.ts
git rm app/components/living-canopy.tsx
git commit -m "fix: remove decorative canopy controls"
```

---

### Task 4: Four-branch evidence tree

**Files:**
- Modify: `app/components/risk-tree.tsx:18-218`
- Modify: `app/components/risk-tree.test.tsx`
- Modify: `app/components/results.tsx:388-422`
- Modify: `app/components/results.test.tsx`
- Modify: `app/i18n/ui-copy.ts:229-290`
- Modify: `app/i18n/ui-copy.test.ts`
- Modify: `app/globals.css:510-610, 774-858`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: `HEALTH_PILLARS`, `indexRiskLeavesByPillar`, and `healthPillarForRiskRule` from Task 1.
- Produces: exactly four result branches, shared protective foundation, leaf urgency/evidence badges, and the unchanged functional evidence notebook.
- Produces: `uiCopyKeys.riskUrgency` with exact EN/FR labels for all four canonical `RiskUrgency` values.

- [x] **Step 1: Write RED result-tree tests using real mapped rule IDs.**

Replace fixture IDs such as `first`, `second`, or `sparse` with real `ruleId` values. Assert:

```tsx
const branches = within(screen.getByRole("navigation", { name: /health signal pillars/i }))
  .getAllByRole("listitem", { name: /pillar/i });
expect(branches).toHaveLength(4);
expect(screen.getByText("Cardio, VO₂ max & cellular energy")).toBeVisible();
expect(screen.getByText("Strength, nervous system & recovery")).toBeVisible();
expect(screen.getByText("Sleep & circadian rhythm")).toBeVisible();
expect(screen.getByText("Nutrition & metabolic health")).toBeVisible();
expect(screen.queryByText("Medical review")).not.toBeInTheDocument();
expect(screen.queryByText("Longer-term domains")).not.toBeInTheDocument();
```

Also test four empty branches, protective roots outside the four-branch list, an unknown rule ID throwing, a selected leaf retaining `aria-controls`/`aria-pressed`, and EN/FR text. In results integration, prove `urgent-chest` appears in both the urgent summary and the cardio branch while sharing the same evidence source data.

Run:

```bash
npx vitest run app/components/risk-tree.test.tsx app/components/results.test.tsx
```

Expected: FAIL because branches are still urgency-based.

- [x] **Step 2: Replace urgency filters with the explicit pillar index.**

Keep `requestedLeafId` and the canonical first-leaf fallback, then render all pillars even when empty:

```tsx
const leavesByPillar = indexRiskLeavesByPillar(leaves);

<ul className="risk-tree__branches">
  {HEALTH_PILLARS.map((pillar) => (
    <li
      key={pillar}
      className={`risk-tree__branch risk-tree__branch--${pillar}`}
      aria-label={t("riskTree.pillar.aria", { pillar: t(uiCopyKeys.pillar[pillar]) })}
    >
      <span className="risk-tree__branch-label">{t(uiCopyKeys.pillar[pillar])}</span>
      <LeafList
        leaves={leavesByPillar[pillar]}
        selectedId={selectedLeaf?.id}
        onSelect={setRequestedLeafId}
      />
    </li>
  ))}
</ul>
<section className="risk-tree__foundation" aria-label={t("riskTree.protective")}>
  <span className="risk-tree__branch-label">{t("riskTree.protective")}</span>
  <ul className="risk-tree__roots">...</ul>
</section>
```

Preserve leaf order inside each pillar. Do not change `evaluateRisks`, `localizeRiskLeaves`, or export data.

- [x] **Step 3: Keep urgency and evidence visible after regrouping.**

Add the translated urgency and evidence tier to each leaf button:

```tsx
<span className="risk-tree__leaf-title">{leaf.title}</span>
<span className="risk-tree__leaf-meta">
  {t(uiCopyKeys.riskUrgency[leaf.urgency])} · {t(uiCopyKeys.evidenceTier[leaf.evidenceTier])}
</span>
```

Add `riskUrgency.urgent`, `riskUrgency.prompt-review`, `riskUrgency.long-term`, and `riskUrgency.support` with English values `Urgent`, `Prompt review`, `Longer-term`, and `Support`, and French values `Urgent`, `À examiner rapidement`, `À plus long terme`, and `Soutien`. Add `riskTree.pillar.aria` as `{pillar} pillar` / `Pilier {pillar}`, plus an `Urgency / Urgence` row in `EvidencePanel`. Rename `riskTree.aria`, `results.canopy.*`, and related French copy from “living canopy” to the four-pillar vocabulary. Keep the urgent summary copy unchanged.

- [x] **Step 4: Restyle the tree as a labelled 2×2 pillar grid.**

Remove `--urgent`, `--review`, `--longer`, and `--protective` branch modifiers. Add stable pillar modifiers and a full-width `.risk-tree__foundation`. Preserve the existing selected inset blue bar and two-colour focus ring. On mobile, render one column and keep badge text wrapping; no information may rely on colour alone.

- [x] **Step 5: Run presentation and unchanged engine regressions.**

```bash
npx vitest run app/lib/health-pillars.test.ts app/components/risk-tree.test.tsx app/components/results.test.tsx app/i18n/ui-copy.test.ts app/globals.test.ts app/lib/risk-engine.test.ts app/lib/export.test.ts
```

Expected: PASS; risk engine and export expectations remain unchanged.

- [x] **Step 6: Commit result presentation.**

```bash
git add app/components/risk-tree.tsx app/components/risk-tree.test.tsx app/components/results.tsx app/components/results.test.tsx app/i18n/ui-copy.ts app/i18n/ui-copy.test.ts app/globals.css app/globals.test.ts
git commit -m "feat: group results into four health pillars"
```

---

### Task 5: Cardio artwork and local transition motion

**Files:**
- Create: `public/media/cardio-intermission.webp`
- Create: `public/media/cardio-intermission.mp4`
- Create: `app/hooks/use-decorative-motion.ts`
- Create: `app/hooks/use-decorative-motion.test.tsx`
- Modify: `app/components/landing.tsx:37-121`
- Modify: `app/components/landing.test.tsx`
- Modify: `app/components/intermission.tsx`
- Modify: `app/components/intermission.test.tsx`
- Modify: `app/globals.css:123-146, 400-430, 831-835`
- Modify: `app/globals.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: `useDecorativeMotion(): boolean`, shared by landing and intermission.
- Produces: pillar-media metadata where cardio has poster and MP4, while strength/sleep/nutrition keep local WebP posters.
- Consumes: built-in image generation and FFmpeg only; no runtime package is added.

- [x] **Step 1: Write RED motion/fallback tests.**

Create hook tests for media-query changes and `document.hidden`. Extend intermission tests to assert:

```tsx
expect(poster?.getAttribute("src")).toContain("cardio-intermission.webp");
expect(video).toHaveAttribute("poster", "/media/cardio-intermission.webp");
expect(video.querySelector("source")).toHaveAttribute("src", "/media/cardio-intermission.mp4");
expect(video).toHaveAttribute("preload", "none");
```

After reduced motion or a video error, the static poster remains and the video is absent/not visible. Assert every media URL starts with `/media/` and no HTTP(S) media URL appears.

Run:

```bash
npx vitest run app/hooks/use-decorative-motion.test.tsx app/components/landing.test.tsx app/components/intermission.test.tsx app/globals.test.ts
```

Expected: FAIL for missing hook/cardio assets/video.

- [x] **Step 2: Generate the cardio/cellular-energy artwork.**

Read and use the `imagegen` skill. Generate one 16:9 image with this prompt:

```text
A serene scientific-botanical collage for a private health reflection website, 16:9 landscape. Pale paper texture and translucent silver-green leaves frame a large quiet luminous centre. Fine deep-teal capillary branches flow into subtle oxygen arcs and abstract mitochondrial cristae, suggesting cardiorespiratory fitness and cellular energy without depicting anatomy literally. Sparse electric-blue accents, restrained amber highlights, no red alarm colour. Editorial, delicate, airy, sophisticated, no people, no medical devices, no pills, no text, no labels, no logos, no watermark. Match an existing botanical field-notebook visual system and leave generous negative space for an opaque content panel.
```

Inspect the result before use. Convert it to 1920×1080 WebP with FFmpeg in a safe temporary directory, then place the final asset at `public/media/cardio-intermission.webp`. Target at most 358,400 bytes; adjust WebP quality only, not dimensions or crop, if necessary. Record accurate generated-media provenance in README without claiming Sora unless Sora was actually used.

- [x] **Step 3: Encode one seamless local cardio transition loop.**

Create an eight-second, silent, 1280×720 H.264 loop from the approved poster:

```bash
ffmpeg -y -loop 1 -i public/media/cardio-intermission.webp \
  -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='1.018+0.012*sin(2*PI*on/192)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=192:s=1280x720:fps=24,format=yuv420p" \
  -t 8 -an -c:v libx264 -profile:v high -level 4.0 -crf 28 -movflags +faststart \
  public/media/cardio-intermission.mp4
```

Verify with:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration,size -of json public/media/cardio-intermission.mp4
test "$(stat -f %z public/media/cardio-intermission.mp4)" -le 1572864
```

Expected: H.264, 1280×720, 24 fps, about 8 seconds, no audio, at most 1.5 MiB. If FFmpeg's exact last frame prevents a seamless loop, reduce the `-t` duration to `7.958333` so the duplicated endpoint is omitted; do not add a runtime animation dependency.

- [x] **Step 4: Extract and reuse the motion gate.**

Move the existing landing `matchMedia` plus `visibilitychange` logic into:

```ts
export function useDecorativeMotion(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(!media.matches && !document.hidden);
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return allowed;
}
```

Refactor landing without changing poster/video handoff. In `Intermission`, use a pillar-media map and render the cardio MP4 only when motion is allowed; strength, sleep, and nutrition remain static. Keep the poster visible until `canplay`, restore it on `error`, and never render essential copy inside the media layer.

- [x] **Step 5: Verify media behaviour and commit.**

```bash
npx vitest run app/hooks/use-decorative-motion.test.tsx app/components/landing.test.tsx app/components/intermission.test.tsx app/globals.test.ts
git diff --check
git add public/media/cardio-intermission.webp public/media/cardio-intermission.mp4 app/hooks/use-decorative-motion.ts app/hooks/use-decorative-motion.test.tsx app/components/landing.tsx app/components/landing.test.tsx app/components/intermission.tsx app/components/intermission.test.tsx app/globals.css app/globals.test.ts README.md
git commit -m "feat: add local pillar transition media"
```

---

### Task 6: Integrated release gates and independent review

**Files:**
- Modify: `README.md`
- Modify: `docs/privacy-and-release.md`
- Modify: `docs/superpowers/specs/2026-08-04-four-pillar-visual-system-design.md`
- Modify: `docs/superpowers/plans/2026-08-04-four-pillar-visual-system.md`

**Interfaces:**
- Consumes: Tasks 1–5 exact HEAD.
- Produces: verified documentation, browser evidence, independent spec/quality review, and a clean release candidate.

- [x] **Step 1: Update documentation before the release run.**

Document the four-pillar presentation layer, the 243/47/54 exhaustive mapping tests, the generated cardio WebP, both local MP4 motion moments, reduced-motion behaviour, and the unchanged clinical/risk/export boundary. Change the design document status to `implemented; release verification pending`. Do not claim direct VO₂ max or mitochondrial measurement and do not attribute a generator that was not used.

- [x] **Step 2: Run the exact full verification matrix under Node 24.**

```bash
export PATH=/Users/zakichair/.nvm/versions/node/v24.13.0/bin:$PATH
node --version
npm --version
npm ci
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test -- --run
npm run build
npm audit --omit=dev --json
git diff --check
git status --short
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -print
```

Expected: Node `v24.13.0`; TypeScript/lint/tests/build pass; production audit has zero vulnerabilities; no TypeScript build artifact; worktree contains only intentional documentation/checklist changes before their commit.

- [x] **Step 3: Run targeted invariant scans.**

```bash
rg -n "canopy__leaf|canopy__branch|canopyBranch\.|aria-pressed=.*Sleep|aria-pressed=.*Heart" app
rg -n "localStorage|sessionStorage|document\.cookie|indexedDB|dangerouslySetInnerHTML" app
rg -n "https?://" app/components app/hooks public/media
rg -n "you (have|will develop)|vous (avez|développerez)|\b[0-9]+%.*(disease|maladie)" app --glob '!**/*.test.*'
```

Expected: no obsolete decorative-canopy controls; no persistence/unsafe HTML; no remote runtime media; no deterministic disease/probability claim. Source links in the evidence registry are outside the runtime-media scan scope.

- [ ] **Step 4: Perform browser QA on the production build.**

Start `npm start` on a free local port and verify with Chrome DevTools:

- desktop 1440+ width and mobile 390×844;
- English and French landing, first chapter, one pillar transition, lab-import surface, four-branch results, and evidence selection;
- no horizontal overflow and question heading scale remains small;
- no Sleep/Heart/Habits/Care controls or colour-changing decorative bars;
- exactly four labelled progress steps and exactly four labelled result branches;
- keyboard-only focus order and evidence button relationships;
- reduced motion removes both videos while posters remain;
- print preview removes ambient art/video;
- `localStorage`, `sessionStorage`, cookies are empty;
- all runtime asset requests use the selected local host; OCR/PDF imports still request only `/lab-assets/*`.

Run a Lighthouse navigation audit for accessibility, best practices, and SEO; investigate any new failure introduced by this change.

- [ ] **Step 5: Request two-stage independent review.**

Use `superpowers:requesting-code-review`. The spec reviewer checks exact four-pillar labels/order, mapping coverage, adaptive budgets, clinical invariants, media/fallbacks, EN/FR, and the removal of false controls. The quality reviewer checks component boundaries, React state, focus/a11y, CSS specificity, performance, tests, and generated-asset provenance. Address Critical and Important findings through fresh implementation agents, rerun affected tests, and request re-review until approved.

- [ ] **Step 6: Commit the verified release candidate.**

After reviews and fresh green gates:

```bash
git add README.md docs/privacy-and-release.md docs/superpowers/specs/2026-08-04-four-pillar-visual-system-design.md docs/superpowers/plans/2026-08-04-four-pillar-visual-system.md
git commit -m "docs: verify four-pillar prototype"
git status --short
```

Expected: clean worktree.

---

### Task 7: Owner-only deployment and exact-version verification

**Files:**
- Modify after first deployment: `docs/privacy-and-release.md`
- Modify after first deployment: `docs/superpowers/specs/2026-08-04-four-pillar-visual-system-design.md`
- Modify after first deployment: `docs/superpowers/plans/2026-08-04-four-pillar-visual-system.md`
- Preserve exactly: `.openai/hosting.json` keys `project_id`, `d1`, and `r2`

**Interfaces:**
- Consumes: clean, reviewed Task 6 HEAD and existing Sites project `appgprj_6a70dd6389a88191986c131c5d0eb343`.
- Produces: an owner-only Sites URL whose final deployed version matches the final documented commit.

- [ ] **Step 1: Reconfirm access before any deployment.**

Call `sites_get_site` and require custom/private access with exactly the owner allowed, zero groups, and zero external visitors. Stop if access is public or broader than owner-only. Do not call the public deployment method.

- [ ] **Step 2: Push the reviewed commit with an ephemeral Sites credential.**

Create a source-repository credential, use its token only through a per-command HTTP authorization header, and push exact `HEAD` to the returned branch. Do not persist the token in remotes, config, shell history, logs, or files. Confirm the pushed SHA equals `git rev-parse HEAD`.

- [ ] **Step 3: Package, save, and privately deploy the first exact version.**

Run the bundled `sites` `package-site.sh` against the project into a `mktemp -d` archive, save the version with the exact commit SHA, call `sites_deploy_private_site_version`, and poll `sites_get_deployment_status` until success or a concrete failure. Open the returned URL in Codex and verify owner authentication/access.

- [ ] **Step 4: Record deployment evidence and create the final documentation commit.**

Record the private URL, deployed version/commit, owner-only access result, verification date, and browser gates in `docs/privacy-and-release.md`. Change the design status to `implemented and privately deployed`. Check every completed plan box using `apply_patch`. Commit only these documents:

```bash
git add docs/privacy-and-release.md docs/superpowers/specs/2026-08-04-four-pillar-visual-system-design.md docs/superpowers/plans/2026-08-04-four-pillar-visual-system.md
git commit -m "docs: record private four-pillar deployment"
```

- [ ] **Step 5: Reverify and deploy the final documented commit.**

Because Step 4 changes the source SHA, rerun on exact final HEAD:

```bash
export PATH=/Users/zakichair/.nvm/versions/node/v24.13.0/bin:$PATH
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test -- --run
npm run build
npm audit --omit=dev --json
git diff --check
git status --short
```

Push the final SHA with a fresh ephemeral credential, package/save it, and deploy it privately again. Poll to success. Confirm the final Sites version commit equals local `HEAD` and access remains owner-only.

- [ ] **Step 6: Verify the deployed product, then run branch completion handoff.**

On the final URL, repeat landing metadata/security headers, EN/FR switch, first pillar intro, reduced motion, no storage/cookies, no obsolete canopy controls, four result pillars, evidence selection, and local-only runtime request checks. Then invoke `superpowers:finishing-a-development-branch` and present its exact three branch options to the user without auto-merging.

---

## Plan self-review checklist

- [ ] Every design requirement maps to Tasks 1–7.
- [ ] No placeholder or unstated implementation step remains.
- [ ] Question and rule mappings are explicit and runtime-covered.
- [ ] Questionnaire budgets and clinical/export contracts remain unchanged.
- [ ] All new copy is complete in EN/FR.
- [ ] The generated artwork and both motion moments have static/reduced-motion fallbacks.
- [ ] Final private deployment matches the final documented commit SHA.
