# Will I Die Soon? — Health Risk Explorer

> **Private research prototype.** This experience is not clinically validated, does not diagnose or predict death, and is not a public wellness or regulated medical release. Do not treat its qualitative outputs or Purity Score as medical advice, a disease probability, life expectancy, or a substitute for care.

An English-default, fully bilingual English/French health-risk exploration that keeps the journey in browser memory. It turns a large structured questionnaire into a paced assessment, then presents urgent signals, qualitative risk domains, protective roots, a transparent adult wellness-habit score, and practical follow-up actions as an inspectable living canopy.

## Implemented scope

- **243 curated questions** across 47 health domains, with stable IDs, deterministic eligibility, age gates, and answer-driven branches.
- **Quick:** exactly 20 eligible core questions, about 3 minutes.
- **Detailed (medium-depth):** exactly 50 eligible questions, about 8 minutes.
- **Deep:** 150 eligible base questions are the target/minimum; active branches can expand the queue up to the implemented maximum of 200. Deep is unavailable when the profile has fewer than 150 eligible base questions.
- **English + French:** English is the default. The complete interface, questions, qualitative results, score/action presentation, and exports localize to French without changing canonical IDs, values, units, rules, scores, or state. Locale is not persisted or placed in the URL.
- **Age and country routes:** the profile accepts whole ages 0–120 and requires Switzerland, United Kingdom, United States, or another country/region. Children under 13 require an assisting parent/guardian/trusted adult; adolescents 13–17 choose assisted or private answering; adults use the adult route. Age and country still filter question/rule applicability.
- **Local laboratory context:** manual entry is always available. Plain text, PDF, and image extraction runs locally with lazy PDF.js/Tesseract parsers and same-origin vendored worker assets. Draft rows require explicit review. Limits are 20 MiB, 50 PDF pages, and 500,000 extracted characters.
- **Explainable results:** immediate signals come first, followed by a semantic keyboard-accessible risk tree, evidence leaves, missing-factor context, protective roots, and up to three prioritized actions.
- **Purity Score:** a transparent adult wellness-habit index for sufficiently covered Detailed/Deep assessments. Quick shows a reflection rather than a number; under-18 or unverified-age routes do not receive a score. Age, sex, ethnicity, disability, diagnoses, family history, and unavoidable exposures cannot lower it.
- **Explicit local handoff:** print and redacted JSON require clicks. Structured raw answers are an adult-only opt-in; free text, filenames, raw file/parser content, and private metadata are excluded.
- **Purposeful visuals:** a code-native living canopy, four generated stills, and a silent derived hero loop. Motion respects reduced-motion settings. Generated media was created with imagegen and ffmpeg, not Sora, and contains no medical labels or factual diagrams.

## Evidence limits

The private prototype evaluates 54 transparent qualitative rules across 14 declared groups (12 nonempty). It contains 29 authoritative-safety, 21 guideline-action, and 4 evidence-limited outputs, with **zero validated-estimate rules and zero clinical percentages**. No hidden model or remote inference is used. Medication/substance outputs do not instruct starting, stopping, or changing a dose.

See [the complete evidence register](docs/evidence-register.md) for every rule, source, population and consumption status, and [the privacy/release record](docs/privacy-and-release.md) for the data boundary, audits, response hardening, and exact private-deployment prerequisites.

## Privacy boundary

There is no account, application backend, database, analytics, session replay, cookie, persistent answer storage, or outbound answer request. Profile, locale, answers, labs, and results are in React memory. Restart, reload, navigation away, or session closure clears that state. The assessment-only leave confirmation protects work in progress; results intentionally clear when left. Evidence links navigate externally only when clicked.

## Development and verification

Node.js **>=22.13.0** is required. Install exactly from the lockfile:

```bash
npm ci
```

Run the release gates:

```bash
npx tsc --noEmit --incremental false
npm test -- --run
npm run lint
npm run build
npm audit --omit=dev
git diff --check
```

Run local development or the built production server:

```bash
npm run dev
npm start
```

The Sites/Vinext structure is retained. `.openai/hosting.json` identifies the configured owner-only project and declares no D1 or R2 application binding. This repository state does **not** claim that a version was saved, pushed, or deployed; those remain owner-controlled steps after all gates and access checks pass for the exact commit.
