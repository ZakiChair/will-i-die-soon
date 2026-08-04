# Privacy and release record

Audit date: **2026-08-04**. Release state: **active private owner-only release**. Version 2 is the final verified deployed-product baseline; this documentation-only closure will be privately published next and its exact SHA/version attestation will be appended to the ignored Task 7 evidence report without another tracked documentation mutation.

## Data boundary

The locale, profile, adaptive queue, assessment answers, confirmed laboratory observations, results, and export preference live only in React memory. English is the default and French is a presentation-only in-memory switch. There is no account, application backend, database, analytics, session replay, advertising pixel, cookie, persistent answer storage, or outbound application fetch containing answers.

The app does not write answers or locale to `localStorage`, `sessionStorage`, IndexedDB, cookies, query parameters, URL fragments, console logs, or analytics. No API route receives an assessment. The Cloudflare Worker forwards the incoming page request to the Vinext handler; that inbound request boundary is not an answer endpoint. Hosting-provider infrastructure logs remain an owner/platform audit boundary and cannot be proved absent from application source, but the journey never sends assessment answers to that handler after the page is loaded.

Ordinary evidence links are external HTTPS navigation initiated by the user. They use `target="_blank"` and `rel="noreferrer"`; the app does not prefetch their content or attach answers to their URLs.

## Four-pillar presentation boundary

The ordered presentation pillars are `cardio-energy`, `strength-neural`, `sleep-circadian`, and `nutrition-metabolic`: **Cardio, VO₂ max & cellular energy**, **Strength, nervous system & recovery**, **Sleep & circadian rhythm**, and **Nutrition & metabolic health**. Their French labels are **Cardio, VO₂ max et énergie cellulaire**, **Force, système nerveux et récupération**, **Sommeil et rythme circadien**, and **Alimentation et santé métabolique**.

This layer only groups already-selected questions and evaluated evidence leaves. Its closed guards cover 243 questions, 47 domains, 54 risk rules, 88 conditional questions, and 98 gate edges; risk-rule distribution is 12/23/2/17 in pillar order. Quick remains exactly 20 questions, Detailed exactly 50, and Deep remains 150–200 after selection and active branches. The grouping does not change clinical rules, evidence tiers, scoring, exports, laboratory parsing, or the underlying risk conditions. It does not directly measure VO₂ max or mitochondrial function, diagnose disease, predict an exact disease probability, or estimate time to death.

## Lifecycle and clearing

- Restart replaces the route-level journey state with the landing state, unmounting and clearing profile, answers, labs, and results from application memory.
- Reloading, closing the tab/window, navigating away, or closing the browser session discards the in-memory journey. Closing or leaving a results screen intentionally clears those results; there is no recovery store.
- Cancelling the laboratory-import screen, unmounting it, or selecting a replacement file aborts the active parser operation. Aborted work cannot update the laboratory draft; a PDF loading task is destroyed, and any OCR worker whose handle becomes available is terminated, including one whose initialization resolves after the abort.
- A `beforeunload` confirmation is installed only while an assessment is in progress to protect unfinished work. Results do not install that prompt. This is intentional clearing behavior, not a privacy gap: neither screen persists data, and leaving either screen releases the in-memory state.
- The app cannot clear browser history, operating-system swap, screenshots, print files, JSON files a user explicitly saved, or what another person can see on the display. Those are outside the application state boundary.

## Local laboratory import

Accepted plain-text files have a `.txt` or `.text` extension and use the browser's local `File.text()`. CSV and other unsupported file types are not parsed and open the editable manual-entry fallback. PDF.js and Tesseract load lazily only after a PDF or image is selected. Their worker, WebAssembly, and English language-data URLs are fixed same-origin `/lab-assets/...` paths; OCR caching is disabled. The selected file and extracted text are passed in memory and are not placed in an asset URL or request body.

Processing is bounded to protect the local browser:

- maximum source-file size: **20 MiB**;
- maximum PDF length: **50 pages**, checked before the page extraction loop;
- maximum extracted text: **500,000 characters** for plain text, PDF, and OCR output.

PDF text is streamed through the application parser page by page, with the 500,000-character bound enforced incrementally and the loading task destroyed on success, failure, limit, or abort. Once Tesseract exposes an OCR worker handle, the worker is terminated on those paths too. Cancellation, component unmount, and replacement-file selection abort the active operation; if OCR initialization later succeeds, that late worker is terminated before its result can be used.

The OCR public API necessarily materializes the decoded image and recognition output before the application can enforce the output bound. The 20 MiB source-file limit and 500,000-character OCR-output limit therefore reduce exposure but are not hard peak-memory bounds. Tesseract 7.0.0 also exposes no worker handle when `createWorker()` rejects during initialization, so the application cannot terminate that internal worker through the public API; this possible initialization-rejection worker leak is a residual accepted for the private prototype. Decoded-image/OCR peak memory and this initialization-rejection case must be reassessed as a parser/toolchain gate before a broader release or parser upgrade.

A distinct English/French limit message opens the same editable manual-entry fallback. Unsupported input, extraction failure, or no unambiguous marker also preserves manual entry. Parsed rows are drafts: no value enters assessment state until the user explicitly selects it and reviews marker, value, unit, reference range, collection date, and fasting status.

The vendored minified Tesseract worker contains upstream default CDN strings, but application configuration supplies the local worker/core/language paths. Those immutable third-party bundles are excluded from first-party source scans and must remain allowlisted only as vendored code. A production-like browser network check of PDF and an ordinary successful image import remains a deployment prerequisite to confirm no upstream fallback request occurs.

## Export boundary

Print and JSON export each require an explicit button click. Printing invokes the browser's local print dialog. JSON is generated in an in-memory Blob, downloaded locally, and its object URL is revoked. The default JSON includes interpreted results, actions, and user-reviewed/normalized laboratory observations.

Structured raw answers require a separate explicit opt-in and are allowed only for an adult profile. Even then, free text and private metadata-shaped fields are excluded. Exports do not contain the selected filename, raw file bytes, raw OCR/PDF text, raw laboratory line, parser/source metadata, upload metadata, exact location/address-shaped fields, or inferred diagnoses.

## Public asset audit

The first-party presentation assets are `og.png` (1200×630), `favicon.svg`, five WebP images, and two silent local MP4 loops. The remaining public files are fixed parser workers/cores/language data, their licences, and starter SVG icons. File-type, string, and metadata inspection found no embedded assessment answer, filename, user identifier, credential, author, copyright owner, or download-origin metadata in the presentation media. The MP4's x264/VideoLAN encoder string and library/schema URLs in vendored parser assets are tool provenance, not user data or secrets.

Generated artwork contains no medical labels, numerical claims, or factual diagram text that could be mistaken for evidence. The Cardio WebP was created with OpenAI's built-in image-generation tool on 2026-08-04, resized/cropped locally with FFmpeg, and compressed locally with cwebp; it is not Sora-generated. The silent Cardio loop was derived locally with FFmpeg. Landing and Cardio motion use local poster/canplay/error fallbacks, are static for reduced motion or hidden documents, and are removed from print. There is no remote runtime media.

## React and bundle audit

Route and leaf components are stable top-level definitions with direct imports. The only intentional dynamic imports are the heavy `pdfjs-dist` and `tesseract.js` parsers. Assessment selection/branching is derived in memory; only `queue[currentIndex]` is rendered, so the 243-question bank is never mounted as one large form.

Effects are limited to browser/DOM or external-event synchronization: assessment-only `beforeunload`, focus transfer, reduced-motion/media-query and visibility listeners, and the document language attribute. Risk evaluation, score, localization, action plan, and export report are derived during render (memoized where appropriate), not mirrored into effect-managed state.

The audited interaction surface uses native buttons, links, labels, inputs, selects, fieldsets/legends, tables, progress, headings and landmarks; visible focus and live/alert regions; keyboard/Enter navigation; touch-sized controls; and reduced-motion handling. Question controls render one current item at a time. Production bundles retain the lazy parser split and do not embed the 11 known development-tool implementations.

## Request metadata and response hardening

Metadata is generated per request with the Next 16 asynchronous `headers()` API. A valid explicit `NEXT_PUBLIC_SITE_URL` origin takes precedence. Otherwise, the resolver uses the validated routed `host` header; a normalized `x-forwarded-host` may corroborate the same host but can neither override it nor stand alone. It validates the first `x-forwarded-proto` token, uses HTTP only for localhost or the IPv4/IPv6 loopback ranges and HTTPS otherwise, and falls back to `http://localhost:3000`. Credentials, paths, queries, fragments, schemes in host fields, whitespace, and invalid host labels are rejected. Canonical `/`, Open Graph URL `/`, and `/og.png` are absolute for the resolved origin; the bespoke favicon remains `/favicon.svg`.

The Worker adds these defaults without reading the body, changing body/status/status text, or replacing an existing policy header: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, camera/microphone/geolocation/payment/USB-denying `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and the minimal CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'`. No script/style CSP is imposed, avoiding a Next hydration break.

## Dependency and scan boundary

The production dependency gate is `npm audit --omit=dev`. The verified dependency baseline has zero production vulnerabilities with Next 16.2.12, React/React DOM/RSC 19.2.8, PostCSS 8.5.25, and sharp 0.35.3. The full development-tree audit remains a separate residual: 11 development-only nodes (2 low, 3 moderate, 6 high, 0 critical) in Babel/Cloudflare/Vite/Wrangler-related tooling. Their fixes require a coordinated build-toolchain upgrade; artifact scans found no affected implementation embedded in production JavaScript. Advisory-registry severity is a point-in-time snapshot, not a fixed property, so both the production and full audits must be rerun for a later release.

First-party scans cover network transports, analytics, cookies/browser storage, URL answer state, unsafe HTML/eval, console output, deterministic/future-disease claims, medicine start/stop/dose instructions, and disease percentages in both English and French presentation corpora. Vendored `/public/lab-assets` code is excluded from first-party findings; the Worker's single inbound handler call is allowlisted and documented above. Every non-allowlisted match must be manually classified before deployment.

## 2026-08-04 release verification

On exact source HEAD `cbaf5b591d18a95f2f7f3668bfe3e580cdfd45e1`, the fresh pinned Node `v24.13.0` / npm `11.6.2` release matrix passed with `npm ci`, TypeScript with incremental output disabled, ESLint, all 26 Vitest files / 4,658 tests, the Vinext production build (5/5 stages), `npm audit --omit=dev --json`, diff checking, and a `.tsbuildinfo` search. TypeScript and ESLint exited 0; the production audit found zero vulnerabilities; `git diff` and `git diff --check` were clean; and no `.tsbuildinfo` file was produced. Targeted scans cover obsolete canopy controls, browser persistence/unsafe HTML, HTTP(S) media paths, and deterministic disease/probability wording; every match is reviewed in the task release report.

Isolated-Chrome QA first exercised the broad production flow on `fd921df9b73757edc14dd982a26963e29c959259`, then rechecked the mobile file-input containment fix on `4892de5cf8e41b046e1446c6a226345f4b1e8bf3`. It covered desktop/mobile English and French, Quick's exact 20-question route, all four chapter introductions and result branches, evidence selection and keyboard operation, local laboratory import, reduced motion, print, and the local-only network/storage/cookie boundary. Lighthouse `13.4.1` scored Accessibility, Best Practices, and SEO at 100/100/100 for both desktop and mobile. The final focused Chrome run on exact HEAD `cbaf5b591d18a95f2f7f3668bfe3e580cdfd45e1` confirmed four passive progress labels, exactly one `aria-current` and one progressbar, Back retaining `1/20`, the localized French progress label, no horizontal overflow, terminal poster-error unmounting, and 37 localhost GETs with no POST, `Set-Cookie`, storage, console errors, or page errors. Independent final spec review is Ready after focus/poster corrections; independent final quality review is Ready after rail/media/foundation/progress corrections. Neither review has an open finding.

### Question-prompt presentation boundary

The bilingual short-title and detail catalog changes display and accessible description only. Canonical English/French questions, question IDs, answer and queue behavior, branching, risk and score calculations, laboratory handling, and raw/localized export contracts remain unchanged. Curated entries are guarded against canonical-copy drift and otherwise fall back to the complete localized prompt.

## Sites state and private-deployment record

Immediately before the first deployment, the active Sites project used custom access with exactly one allowed account: a non-external owner. It had zero allowed groups, zero tenant/workspace group IDs, and zero external visitors; the access-policy revision was 1 and there was no earlier live URL or saved version. No credential is stored in this repository or this record.

The reviewed remote Sites source branch `main` was first pushed and independently verified at `696e500611b4827ba44e5d44e52f7f0a4bce4aca`. The official package archive was validated, and the first owner-only deployment saved **version 1** from that exact source commit. It succeeded at **2026-08-04T10:41:29.202972+00:00** and is available at **https://will-i-die-soon-health-map.zaki-chair.chatgpt.site**.

The final verified deployed-product baseline then saved and privately deployed **version 2** from exact local and remote source `e2666f09f736cc35a28e387257f492660085ba03` at the same URL. Deployment reached terminal success; the exact source match and final deployed-product QA passed. At the final recheck, custom access allowed exactly one non-external owner, with zero allowed groups, tenant/workspace group IDs, or external visitors. The current release remains in that owner-only state; no credential is stored in this repository or record.

The question-typography release saved and privately deployed **version 4** from exact local, pushed, packaged, and saved source `6e99b600f92fa91922ef069a899872857ffc4539`. It reached terminal success on **2026-08-04** at **https://will-i-die-soon-health-map.zaki-chair.chatgpt.site**. Authenticated deployed checks passed the 1365 × 800 French dense prompt, 390 × 844 responsive prompt, and English-to-French draft/focus behavior. The source attestation matched exactly, and the access recheck remained custom with exactly one non-external owner, zero editors, groups, tenant/workspace group IDs, or external visitors.

Task 7 Steps 5 and 6 are complete for version 2: the exact source was reverified, saved, and privately deployed, then the authenticated owner session passed metadata/header, English/French, four-pillar, evidence-selection, reduced-motion, print/JSON, clearing, and local-only request checks. The closure commit containing this documentation is deliberately documentation-only and changes the source SHA. It will be published immediately as the next exact owner-only saved version. After terminal success, the controller will append that version and exact SHA match to the ignored Task 7 evidence report, avoiding a further tracked mutation that would itself require redeployment.

Public access, a public wellness edition, and regulated medical modules remain separate release decisions and require new review. A disclaimer alone does not satisfy those gates.
