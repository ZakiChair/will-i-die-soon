# Task 4 report: local lab import and confirmation

## Status

Implemented the optional, on-device laboratory report import and connected it to the
existing assessment. Plain text, PDF text extraction, and image OCR have no application
API route. Extracted rows remain drafts until a person selects the row and reviews its
marker, value, unit, collection date, fasting state, and printed range.

## Changed files

- `app/lib/labs.ts` — approved marker types, deterministic parser, decimal unit
  conversions, and dynamically imported text/PDF/image extraction.
- `app/lib/labs.test.ts` — alias, ambiguity, source-preservation, conversion, local
  extraction, same-origin OCR asset, and non-persistence tests.
- `app/components/lab-import.tsx` — file selection, local-processing disclosure,
  editable review grid, manual fallback, explicit row selection, and confirmation.
- `app/components/lab-import.test.tsx` — privacy, zero-fetch, manual fallback,
  confirmation gating, cancellation, and reachable assessment integration tests.
- `app/components/assessment.tsx` — optional import pause after
  `has_recent_labs=true`, confirmed `lab_value_*` prefills, and structured in-memory
  completion handoff.
- `app/page.tsx` — retains confirmed structured lab observations in the in-memory
  results-screen state.
- `app/globals.css` — responsive import/review presentation.
- `package.json`, `package-lock.json` — locked parser and decimal dependencies.
- `public/lab-assets/**` — same-origin PDF worker, OCR worker, LSTM WebAssembly loader
  variants, English language data, licenses, and provenance/privacy README.
- `eslint.config.mjs` — excludes immutable vendored/minified parser assets from source
  linting.

## TDD evidence

RED was observed before the implementation:

1. The first focused run failed both suites because `./labs` and `./lab-import` did not
   exist.
2. After minimal export stubs, the focused run executed 45 tests and failed 37 on the
   intended missing parsing, conversion, extraction, and review behavior.
3. The real assessment integration test failed because answering yes advanced directly
   to the blood-pressure question instead of showing import.
4. A privacy regression test for image OCR failed because `cacheMethod: "none"` was not
   yet passed to Tesseract.

GREEN evidence during implementation:

- Parser/component/integration: 46/46 passed before the final OCR persistence fixture.
- OCR same-origin/non-persistence fixture: 40/40 parser tests passed after the minimal
  option change.
- The final fresh full test, lint, and build results are recorded in Verification.

## Parser behavior and safety traps

- Marker recognition is line-oriented, deterministic, and restricted to whole approved
  aliases plus a compatible printed unit.
- The parser normalizes Unicode micro symbols, whitespace, and unit capitalization for
  matching while retaining `rawTestName`, `valueText`, `rawUnit`, `rawRange`, the
  printed H/L flag, printed method, collection date, and reported fasting hours/status
  when present.
- Invalid numeric syntax is not repaired or guessed.
- Bare `LDL`, bare vitamin D, urine creatinine, `Hgb` outside CBC context,
  `AST/ALT ratio`, and 1,25-dihydroxy vitamin D remain unmapped.
- Calculated/direct LDL provenance is retained. No LDL calculation or AST:ALT ratio is
  performed.
- No app threshold, classification, diagnosis, treatment, urgency, or prognosis is
  produced.

## Conversion fixtures

Conversion math uses `decimal.js` and stores the unrounded normalized number. Only the
separate display string is rounded. Tested literal fixtures include:

| Marker | Original | Stored normalized value | Display |
| --- | --- | --- | --- |
| Glucose | 100 mg/dL | 5.551 mmol/L | 5.55 |
| Glucose | 5.551 mmol/L | 100 mg/dL | 100 |
| Total cholesterol | 200 mg/dL | 5.172 mmol/L | 5.172 |
| HDL cholesterol | 40 mg/dL | 1.0344 mmol/L | 1.0344 |
| LDL cholesterol | 100 mg/dL | 2.586 mmol/L | 2.586 |
| Triglycerides | 150 mg/dL | 1.6935 mmol/L | 1.6935 |
| HbA1c | 6.5% | 47.545 mmol/mol | 48 |
| Creatinine | 1.00 mg/dL | 88.4 µmol/L | 88.4 |
| Haemoglobin | 13.2 g/dL | 132 g/L | 132 |
| Ferritin | 30 ng/mL | 30 µg/L | 30 |
| Total 25-OH vitamin D | 20 ng/mL | 49.92 nmol/L | 49.92 |
| ALT | 60 U/L | 1 µkat/L | 1 |
| AST | 48 U/L | 0.8 µkat/L | 0.8 |
| eGFR | 90 mL/min/1.73m² | 1.5 mL/s/1.73m² | 1.5 |
| TSH | 2.0 µIU/mL | 2.0 mIU/L | 2 |

The implementation also supports only the documented reverse pairs. Unsupported manual
units are preserved without an invented conversion.

## Dependency and asset provenance

- `pdfjs-dist` 6.2.108 supplies PDF text extraction and
  `pdf.worker.min.mjs`.
- `tesseract.js` 7.0.0 supplies the browser OCR orchestration and worker.
- `tesseract.js-core` 7.0.0 (locked transitively) supplies the LSTM baseline, SIMD, and
  relaxed-SIMD WebAssembly loaders selected by current Tesseract feature detection.
- `@tesseract.js-data/eng` 1.0.0 supplies `4.0.0/eng.traineddata.gz`.
- `decimal.js` 10.6.0 supplies decimal conversion arithmetic.

The copied asset directory is approximately 23 MiB. License files are shipped beside
the assets. `public/lab-assets/README.md` records provenance and the network boundary.

## Reachable integration behavior

- On every assessment depth, `has_recent_labs=true` pauses at the visible optional
  “Optional report import” screen because the gate is an all-depth core question.
- “Continue without import” resumes the existing reconciled queue.
- Confirming selected rows maps canonical markers to their existing
  `lab_value_total_cholesterol`, `lab_value_hdl_cholesterol`,
  `lab_value_ldl_cholesterol`, `lab_value_triglycerides`, `lab_value_hba1c`,
  `lab_value_glucose`, `lab_value_creatinine`, `lab_value_egfr`, `lab_value_alt`,
  `lab_value_ast`, `lab_value_tsh`, `lab_value_hemoglobin`, `lab_value_ferritin`, and
  `lab_value_vitamin_d` answer IDs.
- Answer strings use the explicitly reviewed value, unit, and range plus the immutable
  laboratory-printed flag. Structured observations separately retain source, reviewed,
  and normalized data, and are passed as the second `onComplete` argument into page-local
  result state.
- Confirmed answers participate in normal reconciliation and are skipped as already
  answered. Full regression tests retain exact 20/50/150+ depth behavior, adaptive
  branch pruning, null skip semantics, intermission limits, Back behavior, and focus.
- Changing the recent-labs gate to false removes conditional lab answers through the
  existing reconciler and clears the structured lab handoff.

## Privacy and network evidence

- Plain text calls only `File.text()`.
- PDF and OCR packages are dynamic imports inside the PDF/image branches, reached only
  after file selection. The production build emits separate PDF and parser dependency
  chunks rather than adding PDF.js to the initial page chunk.
- PDF worker, Tesseract worker/core, and English data paths are absolute same-origin
  `/lab-assets/...` paths. Their requests contain fixed asset names only; report bytes
  and extracted text are passed in memory and never included in an asset request.
- Tesseract is configured with `cacheMethod: "none"`, preventing its normal IndexedDB
  language-data cache.
- The component test spies on `fetch` and observes zero calls for selecting/parsing a
  text report. The integration test spies on `Storage.prototype.setItem` and observes
  zero writes. The OCR test verifies same-origin paths and persistence-disabled options.
- A source scan found no `fetch`, XHR, API path, local/session storage, or IndexedDB call
  in the changed application files. No server/API route was added.

## Verification

Fresh final verification after all production changes:

- `npm test -- app/lib/labs.test.ts app/components/lab-import.test.tsx` — exit 0;
  2 files and 47 tests passed.
- `npm test` — exit 0; 5 files and 83 tests passed.
- `npm run lint` — exit 0 with no project-source findings.
- `npm run build` — exit 0; all five vinext build stages completed and `/` was emitted.

The first lint attempt intentionally revealed that ESLint traversed the copied minified
worker files (5,386 third-party findings). Adding the immutable vendor directory to the
global ignore made lint evaluate project source cleanly; no rule was weakened for
hand-authored code.

## Self-review

- Mutation check: removing whole-alias/unit checks, numeric validation, any documented
  factor, row selection, required review field, same-origin option, persistence option,
  answer mapping, or structured handoff makes a focused test fail.
- The parser does not infer omitted specimen, fasting status, range, or test identity.
- Manual entry remains reachable before selection, after unsupported files, after
  extraction failures, and when no unambiguous supported marker is found.
- Heavy parser imports are absent from module top level.
- Existing questionnaire selection/reconciliation logic was reused rather than changed.

## Concerns

- OCR language/core assets add approximately 23 MiB of static files, loaded only for an
  image import.
- OCR and PDF extraction quality depends on source quality; all failures and ambiguous
  observations fall back to review/manual entry.
- `npm audit --omit=dev` reports three high-severity production dependency groups rooted
  in the pre-existing pinned `next@16.2.6`; npm proposes `next@16.2.12`. Updating the
  framework is outside Task 4 and was not mixed into this commit.

## Review round 1/5 hardening evidence

### RED evidence

- Added a generated, valid multi-row PDF fixture. Before the fix, PDF.js extraction
  returned both observations on one space-joined line, so the expected row separator and
  separate Glucose/AST candidates failed.
- Added exact-source assertions for `rawLine` and delimited `rawRange`; the previous
  parser discarded the line and stripped the printed delimiters.
- Added a fasting-status table covering `yes`, `fasting`, `no`, `not fasting`, eight
  hours, `unknown`, and `not stated`. The former substring check incorrectly classified
  negative/unknown statements as fasting.
- Added an ISO collection-date regression. The prior bare-range expression captured
  `2026-07` from `2026-07-30` as a numeric reference range.
- Added component/integration tests for immutable source fields after every reviewed
  field is edited, import-heading focus, a 14-marker Quick import, and full-to-subset
  re-import with a preserved manual answer. The initial component run had four failures:
  edited values overwrote source evidence, the heading was not focused, Quick contained
  34 questionnaire answers, and stale imported values remained.
- A final contract test refinement initially produced three focused failures because the
  confirmation object still mixed reviewed measurement keys, normalized keys, and source
  metadata at its root. This RED result drove the explicit three-part object contract.

### GREEN implementation

- PDF extraction now reconstructs rows from PDF.js `hasEOL` and text-item y coordinates
  before parsing. The worker remains same-origin in browsers, while Node-based tests use
  PDF.js's supported package entry and worker behavior.
- Candidates retain the exact source line and printed range token, including brackets or
  parentheses. Numeric bounds remain separately available for structured use.
- Fasting context is accepted only from explicit anchored report-context lines; negative
  and unknown values remain negative/unknown rather than becoming fasting by substring.
- Bare-range matching now uses digit/hyphen boundaries, preventing partial ISO-date
  matches.
- A confirmed observation has exactly three root concepts: `source` is the readonly
  extracted `LabCandidate` (or `null` for manual entry), `reviewed` is the readonly user-
  confirmed marker/value/unit/range/date/fasting record, and `normalized` contains only
  normalized value, unit, and display value. There are no ambiguous root-level
  measurement fields. Questionnaire answer display uses reviewed values without
  rewriting source provenance.
- Import reconciliation tracks which questionnaire answers came from the prior import,
  removes only those on re-import, preserves manual answers, and pre-fills only lab
  questions present in the current depth's queue. All confirmed observations still reach
  the structured handoff, so Quick stays at exactly 20 questionnaire answers.
- The import heading receives programmatic focus on entry.
- The four direct lab dependencies are now exact pins:
  `@tesseract.js-data/eng@1.0.0`, `decimal.js@10.6.0`,
  `pdfjs-dist@6.2.108`, and `tesseract.js@7.0.0`.

### Final verification for review round 1/5

- `npm test -- app/lib/labs.test.ts app/components/lab-import.test.tsx` — exit 0;
  2 files and 60 tests passed.
- `npm test` — exit 0; 5 files and 96 tests passed.
- `npm run lint` — exit 0 with no findings.
- Changed-file TypeScript check with Vitest and jest-dom types — exit 0.
  The repository-wide check has one unrelated baseline error:
  `worker/index.ts(5,11): Cannot find name 'Fetcher'`.
- `npm run build` — exit 0; all five vinext stages completed.
- Privacy scan — no `fetch`, XHR, API route, browser storage, or IndexedDB use in the
  changed application files. Runtime tests continue to observe zero report-data network
  calls and zero persistent-storage writes.
- Provenance check — all six vendored runtime assets byte-match the files from the locked
  npm packages. SHA-256 prefixes/full hashes are:
  `0613f414…18cb3` (PDF worker), `576b7df7…2c6d` (OCR worker),
  `eef5f8b2…8680` (LSTM core), `861a536c…59b3` (relaxed-SIMD LSTM core),
  `c58b46a4…47b38` (SIMD LSTM core), and `ed350f37…246a8` (English data).
- `npm audit --omit=dev` still reports only the three pre-existing high-severity groups
  rooted in `next@16.2.6`; no Task 4 dependency added a new audit finding.
