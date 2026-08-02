# Will I Die Soon? — Health Risk Explorer Design

## Product thesis

`Will I Die Soon?` is an English-language, private health-risk exploration experience for a broad international audience. It turns a potentially exhausting health questionnaire into a paced, visually engaging journey and returns an explainable tree of urgent signals, longer-term risk domains, protective factors, and practical next steps.

The product does not claim to predict death. Its deliberately provocative name is balanced by precise copy: it explores health signals and modifiable factors, not fate. The final “Purity Score” is a transparent wellness-habit index, not a lifespan, mortality, diagnostic, or clinical probability.

## Delivery stages

The three desired product statuses are sequential:

1. **Private research prototype:** complete experience, local processing, evidence registry, rule tests, and explicit prototype labels.
2. **Public wellness edition:** only non-device wellness reflections and generic educational guidance are public.
3. **Regulated medical modules:** disease probabilities, triage, and clinical recommendations are released jurisdiction by jurisdiction after clinical validation, quality-management, risk-management, licensing, and conformity work.

One codebase supports all stages through an evidence registry and release-policy flags. A disclaimer never substitutes for the required release policy.

## Audience and language

- Interface and generated report: English.
- Ages: all ages, with separate child, adolescent, adult, pregnancy, and older-adult routing.
- Under-age routes use age-appropriate language and ask whether a parent or guardian is assisting.
- Country of residence is required because model eligibility, calibration, emergency guidance, and regulatory availability differ by jurisdiction.
- Ethnicity or ancestry is optional, skippable, and used only when a named source or validated model requires it.
- Sex assigned at birth is distinct from optional gender identity. A model may consume the former only when its published definition requires it.

## Privacy model

- No account, backend, database, telemetry, session replay, advertising pixel, or remote AI call from the assessment.
- Answers, branching, scoring, file parsing, and report generation remain in browser memory.
- The app does not write answer data to `localStorage`, cookies, IndexedDB, URL parameters, logs, or analytics.
- Optional lab files are parsed on-device and are never uploaded.
- Leaving or reloading clears the assessment after a confirmation prompt.
- Export is an explicit user action and produces a printable report or local JSON file.

## Information architecture

### Landing

The first viewport states the proposition directly: “Your health is not a verdict. It is a map.” The page demonstrates a living risk tree whose branches react to pointer or keyboard focus. Three depth cards explain the time and output differences. Privacy and evidence explanations appear before the start action.

### Consent and routing

Before health questions, the user confirms:

- this is a private prototype and not a diagnosis;
- immediate danger should use local emergency services;
- local-only processing;
- age, country, and assisted-minor status;
- chosen depth.

### Assessment

The assessment uses one-question-per-screen pacing. Desktop layout has a narrow domain rail, the question stage, and a compact “why we ask” evidence note. Mobile collapses the rail into a progress header. Keyboard, touch, and screen-reader flows are first-class.

The three depths are:

- **Quick:** exactly 20 core questions, about 3 minutes.
- **Detailed:** exactly 50 core and domain questions, about 8 minutes.
- **Deep:** adaptive branches targeting 150–200 answered questions from a bank of at least 220, about 20–30 minutes.

Answers open relevant branches and remove irrelevant ones. Medication questions ask ingredient, route, indication, dose pattern, duration, source, and monitoring only when use is reported. Sensitive questions always include “Prefer not to say.”

### Intermissions

A short visual intermission appears after meaningful milestones, not on a fixed distracting timer. It uses original generated art, quiet ambient movement, one useful fact about progress, and a continue action. Reduced-motion users see a still frame. No media autoplays with sound.

### Results

Results begin with immediate signals, followed by the risk tree and action plan:

1. **Act now:** red-flag combinations, with local emergency wording and no probability.
2. **Discuss soon:** medication, lab, symptom, or screening follow-up.
3. **Longer-term domains:** cardiovascular, metabolic, sleep, respiratory, liver, kidney, mental wellbeing, dependency, musculoskeletal, sexual/reproductive, skin/hair, and medication safety.
4. **Protective roots:** habits and measurements that lower concern.
5. **Next three actions:** prioritized for impact, feasibility, and evidence strength.

Every leaf shows: evidence tier, factors used, factors missing, applicable population, time horizon when available, source link, and last-reviewed date.

## Questionnaire domains

The bank covers demographics, measurements, family history, diagnosed conditions, current symptoms, emergency symptoms, diet, hydration, movement, sedentary time, sleep, circadian rhythm, stress, mood, anxiety, cognition, social connection, work exposures, environment, sun, dental health, sexual and reproductive health, pregnancy, tobacco and nicotine, alcohol, cannabis, stimulants, opioids, psychedelics, other recreational drugs, anabolic steroids, corticosteroids, peptides/research compounds, GLP-1 medicines, isotretinoin, oral and topical minoxidil, prescription medicines, over-the-counter medicines, supplements, adherence, interactions, preventive care, vaccinations, blood pressure, blood testing, and lab values.

The questionnaire is not a free-form chatbot. Each item has a stable ID, response type, eligible age range, depth, domain, sensitivity flag, optional evidence note, branch condition, and scoring consumers.

## Scientific architecture

### Evidence tiers

1. **Validated estimate:** frozen published model, exact inputs and eligibility, named endpoint and horizon. Numeric probability is allowed only here.
2. **Authoritative safety rule:** regulator label or public-health rule. Produces a warning or review suggestion, never a probability.
3. **Guideline action:** produces a screening, measurement, or clinician-discussion suggestion.
4. **Evidence-limited association:** qualitative context only; contributes neither a clinical percentage nor a definitive causal statement.

### Initial validated estimate

The only planned numeric clinical estimate is the WHO 2019 revised cardiovascular risk model when the implementation has been verified against the corrected publication and the user exactly matches its population. The registry records its age range, prior-disease exclusions, country-to-region mapping, measured inputs, horizon, endpoint, version, source, license, and test vectors. If any requirement is absent, the leaf states “insufficient validated inputs” instead of imputing a value.

SCORE2, SCORE2-OP, DESIR, FINDRISC, and other models remain disabled until their population, calibration, exact formula, rights, and test vectors are documented. Medication, substance, peptide, GLP-1, minoxidil, and isotretinoin answers never modify a validated formula unless the formula itself contains that variable.

### Prototype risk engine

For all non-validated domains, the research prototype uses transparent qualitative rules. Each rule declares its inputs, rationale, evidence tier, direction, strength, and result copy. It produces `low signal`, `worth attention`, `high signal`, or `urgent`, never a disease probability. Correlated factors are grouped to avoid double-counting.

### Purity Score

The score is a 0–100 behavioral index computed only from modifiable domains: sleep regularity, movement, nutrition pattern, tobacco/nicotine exposure, alcohol risk pattern, recovery/stress practices, preventive follow-up, and medication safety behavior. Age, sex, ethnicity, disability, diagnosis, unavoidable exposure, and family history cannot lower the score. Missing or skipped answers reduce coverage confidence rather than the score. The result always shows the category subscores and exact answer-to-weight explanation.

## Lab import

- Users first answer whether they have recent results and provide collection date.
- Manual entry is always available.
- PDF, image, and plain-text import runs locally through dynamically loaded parsers.
- Extracted marker, value, unit, reference range, fasting status, and date require user confirmation.
- Unit normalization preserves the original value and records the normalized value separately.
- The system never infers a diagnosis from an isolated marker or replaces the laboratory’s reference range.

## Safety behavior

Urgent combinations are isolated from the wellness score and evaluated immediately after each relevant answer. The interface tells users that the tool cannot monitor them. Crisis, overdose, chest-pain, stroke-like, severe-breathing, severe-allergy, and other red-flag paths show direct action language and a country-aware instruction to contact local emergency services. The prototype does not recommend starting, stopping, or changing medication doses.

## Visual direction

### Subject, audience, job

The subject is the body as a living branching system; the audience is a curious, sometimes anxious person; the page’s single job is to turn uncertainty into a calm, inspectable map.

### Tokens

- `paper`: `#F4F7F5`
- `ink`: `#102A2A`
- `deep-water`: `#123E46`
- `electric-blue`: `#435CFF`
- `living-coral`: `#FF6F61`
- `signal-amber`: `#F4C95D`
- Display: Bricolage Grotesque
- Body: Manrope
- Data: IBM Plex Mono

### Layout and signature

The interface resembles a contemporary field notebook crossed with an anatomical map: precise rules, offset labels, broad whitespace, and occasional saturated signals. The signature is the **living risk canopy**—a line-based tree that grows while the user answers and becomes the final navigation structure. It is functional, not ornamental.

Rounded rectangles are used sparingly. Question stages and result leaves use clipped corners, inset rules, and typographic hierarchy. The single deliberate visual risk is a full-viewport intermission where generated biological landscapes slowly pan beneath a translucent progress contour.

### Motion and media

- One orchestrated tree-growth animation anchors landing, progress, and results.
- Generated stills become lightweight silent intermission loops through controlled pan, depth, and grain effects.
- All animation honors `prefers-reduced-motion`.
- Assets contain no medical labels or factual diagrams that could be mistaken for evidence.

## Accessibility and resilience

- WCAG 2.2 AA contrast targets.
- Complete keyboard flow, visible focus, semantic headings, labels, fieldsets, progress announcements, and error summaries.
- Touch targets at least 44×44 CSS pixels.
- No answer depends on color alone.
- Deep-mode lists use progressive rendering to stay responsive.
- Unsupported file types and failed OCR keep manual entry available.
- The final report remains useful when no validated numeric estimate is eligible.

## Testing and acceptance

- Unit tests cover branching, exact mode counts, skip behavior, purity-score fairness constraints, evidence-tier restrictions, rule grouping, unit normalization, and export redaction.
- Component tests cover keyboard answers, age routing, consent, intermissions, lab confirmation, immediate-alert priority, and result-tree navigation.
- Static checks reject a numeric probability from any non-validated evidence tier.
- The production build contains no endpoint that receives assessment answers and no analytics/session-replay dependency.
- Quick completes after 20 answers, Detailed after 50, and Deep selects between 150 and 200 eligible answers when the bank has enough applicable items.

## Primary sources for the prototype registry

- WHO revised CVD model publication: https://pmc.ncbi.nlm.nih.gov/articles/PMC7025029/
- Corrected WHO supplement: https://pmc.ncbi.nlm.nih.gov/articles/PMC9880194/
- EU medical-device software qualification: https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf
- Swissmedic medical-device software guidance: https://www.swissmedic.ch/dam/swissmedic/en/dokumente/medizinprodukte/mep_urr/bw630_30_007d_mbmedizinprodukte-software.pdf.download.pdf/BW630_30_007e_MB%20Medical%20Device%20Software.pdf
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- Swiss FADP: https://www.fedlex.admin.ch/eli/cc/2022/491/en

## Explicit non-goals for this implementation

- No public claim of regulatory clearance, clinical validation, diagnosis, prognosis, or treatment recommendation.
- No fabricated “global disease probability,” life-expectancy estimate, or date-of-death estimate.
- No model training on user answers.
- No server storage, sharing, clinician portal, insurance use, employer use, or eligibility decision.
- No automated medication dose changes.

