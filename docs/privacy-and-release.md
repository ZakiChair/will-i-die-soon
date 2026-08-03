# Privacy and release record

Audit date: **2026-08-03**. Release state: **verified source candidate for a private research prototype; not deployed by this task**.

## Data boundary

The locale, profile, adaptive queue, assessment answers, confirmed laboratory observations, results, and export preference live only in React memory. English is the default and French is a presentation-only in-memory switch. There is no account, application backend, database, analytics, session replay, advertising pixel, cookie, persistent answer storage, or outbound application fetch containing answers.

The app does not write answers or locale to `localStorage`, `sessionStorage`, IndexedDB, cookies, query parameters, URL fragments, console logs, or analytics. No API route receives an assessment. The Cloudflare Worker forwards the incoming page request to the Vinext handler; that inbound request boundary is not an answer endpoint. Hosting-provider infrastructure logs remain an owner/platform audit boundary and cannot be proved absent from application source, but the journey never sends assessment answers to that handler after the page is loaded.

Ordinary evidence links are external HTTPS navigation initiated by the user. They use `target="_blank"` and `rel="noreferrer"`; the app does not prefetch their content or attach answers to their URLs.

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

The first-party presentation assets are `og.png` (1200×630), `favicon.svg`, four WebP images, and one silent MP4 loop. The remaining public files are fixed parser workers/cores/language data, their licences, and starter SVG icons. File-type, string, and metadata inspection found no embedded assessment answer, filename, user identifier, credential, author, copyright owner, or download-origin metadata in the presentation media. The MP4's x264/VideoLAN encoder string and library/schema URLs in vendored parser assets are tool provenance, not user data or secrets.

Generated artwork contains no medical labels, numerical claims, or factual diagram text that could be mistaken for evidence. The stills were created with the built-in **imagegen** workflow and the silent loop was derived with **ffmpeg**. No Sora-generated media is used.

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

## Sites state and exact private-deployment prerequisites

The checked-in Sites configuration names project `appgprj_6a70dd6389a88191986c131c5d0eb343` with `d1: null` and `r2: null`. The controller independently confirmed a custom **owner-only** access state: **1 allowed owner, 0 allowed groups, 0 external visitors**. No credential is stored here. This source-state task did not push, save a Sites version, change access, or deploy, and it does not claim a production URL or completed deployment.

Before any private deployment, the owner/controller must complete all of the following against the exact verified commit:

1. Re-run TypeScript with incremental output disabled, affected and full tests, lint, production build, production audit, diff check, first-party scans, public-asset audit, and the production-like PDF/image network check; confirm no `.tsbuildinfo` or credential entered source.
2. Confirm the canonical request-host metadata and response security headers in the production-like runtime, including a hostile-header fallback case and the actual private HTTPS host.
3. Reconfirm access immediately before deployment: exactly the intended owner is allowed; groups and external visitors remain zero. Do not use a public or link-access path.
4. Push the exact verified commit to the Sites source repository, save a version for that exact commit, and privately deploy that saved version. Do not rebuild from an uncommitted or different source state.
5. Poll deployment to terminal success; verify the deployed source identity, owner-only access from both allowed and disallowed sessions, canonical/OG/favicon URLs, response headers, EN/FR journeys, reduced motion, print/JSON, restart clearing, and zero outbound answer/parser-fallback requests.
6. Record the private URL, commit, saved version, access evidence, deployment status, browser/network evidence, and any platform-log retention decision in an owner-controlled release record without exposing credentials.

Public access, a public wellness edition, and regulated medical modules remain separate release decisions and require new review. A disclaimer alone does not satisfy those gates.
