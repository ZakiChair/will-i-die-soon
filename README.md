# Will I Die Soon? — Health Risk Explorer

> **Private research prototype.** This experience is not clinically validated, does not diagnose or predict death, and is not a public wellness or regulated medical release. Do not treat its qualitative outputs or Purity Score as medical advice, a disease probability, life expectancy, or a substitute for care.

An English-default, fully bilingual English/French health-risk exploration that keeps the journey in browser memory. It turns a large structured questionnaire into a paced assessment, then presents urgent signals, qualitative risk domains, protective roots, a transparent adult wellness-habit score, and practical follow-up actions through four ordered health pillars.

## Implemented scope

- **246 curated questions** across 47 health domains, with stable IDs, deterministic eligibility, age gates, and answer-driven branches.
- **Four ordered presentation pillars:** Cardio, VO₂ max & cellular energy / *Cardio, VO₂ max et énergie cellulaire*; Strength, nervous system & recovery / *Force, système nerveux et récupération*; Sleep & circadian rhythm / *Sommeil et rythme circadien*; Nutrition & metabolic health / *Alimentation et santé métabolique*. This is presentation grouping only.
- **Closed mapping guards:** tests require every current question (246), domain (47), and risk rule (54) to resolve exactly once; they also check 88 conditional questions, 98 gate edges, and the 12/23/2/17 risk-rule pillar distribution.
- **Express:** exactly 9 adult-only targeted questions, under 1 minute, covering reported VO₂ max, squat/deadlift one-rep maxima, sleep, body context, and nutrition. It returns four transparent summaries without a global score or fitness ranking.
- **Quick:** exactly 20 eligible core questions, about 3 minutes.
- **Detailed (medium-depth):** exactly 50 eligible questions, about 8 minutes.
- **Deep:** 150 eligible base questions are the target/minimum; active branches can expand the queue up to the implemented maximum of 200. Deep is unavailable when the profile has fewer than 150 eligible base questions.
- **English + French:** English is the default. The complete interface, questions, qualitative results, score/action presentation, and exports localize to French without changing canonical IDs, values, units, rules, scores, or state. Locale is not persisted or placed in the URL.
- **Age and country routes:** the profile accepts whole ages 0–120 and requires Switzerland, United Kingdom, United States, or another country/region. Children under 13 require an assisting parent/guardian/trusted adult; adolescents 13–17 choose assisted or private answering; adults use the adult route. Age and country still filter question/rule applicability.
- **Local laboratory context:** manual entry is always available. Local import accepts plain-text `.txt`/`.text`, PDF, and image files; CSV and every other unsupported type fall back to manual entry. Extraction uses lazy PDF.js/Tesseract parsers and same-origin vendored worker assets. Draft rows require explicit review. Limits are 20 MiB, 50 PDF pages, and 500,000 extracted characters; the OCR input/output limits are guardrails, not hard peak-memory bounds for the decoded image and materialized OCR output.
- **Explainable results:** immediate signals come first, followed by a semantic keyboard-accessible risk tree, evidence leaves, missing-factor context, protective roots, and up to three prioritized actions.
- **Purity Score:** a transparent adult wellness-habit index for sufficiently covered Detailed/Deep assessments. Quick shows a reflection rather than a number; under-18 or unverified-age routes do not receive a score. Age, sex, ethnicity, disability, diagnoses, family history, and unavoidable exposures cannot lower it.
- **Explicit local handoff:** print and redacted JSON require clicks. Structured raw answers are an adult-only opt-in; free text, filenames, raw file/parser content, and private metadata are excluded.
- **Purposeful visuals:** a non-interactive ambient botanical surface, six local WebP presentation images, the Human Atlas CSS/SVG scroll light, and one silent local Cardio loop. The Human Atlas landing uses its local WebP rather than a video. The Cardio video retains its poster until `canplay`, falls back to the poster on error, and is static/absent for reduced motion, hidden documents, and print. No runtime media is remote. Generated media was created with OpenAI's built-in image-generation tool and locally post-processed/encoded with local FFmpeg/cwebp tooling; it was not created with Sora and contains no medical labels or factual diagrams.

## Decorative media provenance

The selected Human Atlas artwork (`public/media/human-atlas-hero.webp`) was generated with OpenAI's built-in image-generation tool, **not Sora**, on 2026-08-05. Its exact selected source was 1672 × 941 pixels with SHA-256 `e04f29b719ef94f6f1a3644ac72506057819b73694208f1026473f4d8f553886`. The local derivative uses `cwebp -q 84 -m 6 -metadata none`; it has no medical labels or factual diagram text. The WebP is a static, same-origin presentation plate aligned with CSS/SVG glow layers; it neither represents a medical measurement nor changes with a person's answers or profile.

The Cardio transition poster (`public/media/cardio-intermission.webp`) was generated on 2026-08-04 with OpenAI's built-in image-generation tool, then resized/cropped with FFmpeg and locally WebP-compressed with cwebp. It is explicitly not Sora-generated. Its prompt requested a serene 16:9 scientific-botanical collage: pale paper and silver-green leaves, deep-teal capillary-like branches, subtle oxygen arcs and abstract mitochondrial cristae, with a quiet central space and no text, anatomy, devices, labels, logos, or watermark. The matching local Cardio loop (`public/media/cardio-intermission.mp4`) is a silent restrained zoom derived from that poster. These decorative files are locally hosted, non-interactive, hidden in print, and suppressed for reduced motion.

## Evidence limits

The private prototype evaluates 54 transparent qualitative rules across 14 declared groups (12 nonempty). It contains 29 authoritative-safety, 21 guideline-action, and 4 evidence-limited outputs, with **zero validated-estimate rules and zero clinical percentages**. No hidden model or remote inference is used. Medication/substance outputs do not instruct starting, stopping, or changing a dose.

See [the complete evidence register](docs/evidence-register.md) for every rule, source, population and consumption status, and [the privacy/release record](docs/privacy-and-release.md) for the data boundary, audits, response hardening, and exact private-deployment prerequisites.

## Privacy boundary

There is no account, application backend, database, analytics, session replay, cookie, persistent answer storage, or server-side answer processing. Profile, locale, answers, labs, and results are in React memory. Restart, reload, navigation away, or session closure clears that state. The assessment-only leave confirmation protects work in progress; results intentionally clear when left. Evidence links navigate externally only when clicked. Lab OCR/PDF processing remains local; its only parser asset requests are packaged same-origin `/lab-assets/*` files.

## Development and verification

Use Node.js **v24.13.0** for the release matrix (the package engine remains `>=22.13.0`). Install exactly from the lockfile:

```bash
npm ci
```

Run the release gates:

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || { echo "nvm is required for the release matrix" >&2; exit 1; }
. "$NVM_DIR/nvm.sh"
nvm use 24.13.0
test "$(node --version)" = "v24.13.0"
node --version
npm --version
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test -- --run
npm run build
npm audit --omit=dev --json
git diff --check
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -print
```

Run local development or the built production server:

```bash
npm run dev
npm start
```

The Sites/Vinext structure is retained. `.openai/hosting.json` identifies the configured owner-only project and declares no D1 or R2 application binding. On exact source HEAD `cbaf5b591d18a95f2f7f3668bfe3e580cdfd45e1`, the fresh Node `v24.13.0` / npm `11.6.2` matrix passed: TypeScript and ESLint exited 0, all 26 test files / 4,658 tests passed, the Vinext build completed its 5/5 stages with exit 0, `npm audit --omit=dev` found zero production vulnerabilities, `git diff` and `git diff --check` were clean, and no `.tsbuildinfo` was produced. Isolated-Chrome QA covered desktop/mobile EN/FR, Quick 20, all four introductions and branches, evidence/keyboard interaction, local lab import, reduced motion, print, local-only requests/storage/cookies, and Lighthouse 13.4.1 desktop/mobile scores of 100/100/100 for Accessibility/Best Practices/SEO; the mobile file-input overflow was fixed and rechecked. A final focused exact-head Chrome run confirmed passive four-pillar progress, retained `1/20` on Back, localized progress naming, no overflow, terminal poster-error fallback, and 37 localhost-only GETs with no POST, `Set-Cookie`, storage, or runtime errors. Independent spec and quality reviews are Ready with no open findings.

Historical private-release record (2026-08-04): version 1 (`696e500611b4827ba44e5d44e52f7f0a4bce4aca`) is retained as first-deployment history. The final verified deployed-product baseline in that record is owner-only Sites version 2, saved and deployed from exact source `e2666f09f736cc35a28e387257f492660085ba03` at `https://will-i-die-soon-health-map.zaki-chair.chatgpt.site`; its exact-source match and deployed-product QA passed. At the recorded recheck, custom access allowed one non-external owner and zero groups or external visitors. The documentation-only closure was intended at that time for a later exact owner-only saved version; this dated intent is not a deployment attestation or present publication promise for the current branch.

The current Human Atlas Express branch is locally implemented and has not been saved, published, or deployed to Sites. Current final-review verification used Node `v24.13.0` / npm `11.6.2`: non-incremental TypeScript and ESLint exited 0; the focused questionnaire file passed 60 tests; the full suite passed 30 files / 4,722 tests; and `git diff --check` was clean. The preceding broader local Express verification also completed all 5 Vinext build stages and reported zero production vulnerabilities across 33 production dependencies with `npm audit --omit=dev`.
