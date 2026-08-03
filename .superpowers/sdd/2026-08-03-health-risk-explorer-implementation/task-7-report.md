# Task 7 report — original imagery, silent loop, and interaction polish

## Status

Implemented, corrected, and verified. The landing now combines the functional living canopy
with an original local poster and one silent derived loop. Milestone intermissions select one
of three original local field-notebook landscapes without making imagery necessary to
understand or continue the assessment. The single social card uses the final brand and
headline.

## Delivered media and wiring

- `public/media/canopy-hero.webp` is the 1920×1080 landing poster (245,576 bytes).
- `public/media/canopy-loop.mp4` is a 10.0-second, 1920×1080, 30 fps H.264 video-only loop
  (2,027,294 bytes). `ffprobe` reports one video stream and no audio stream.
- `public/media/sleep-intermission.webp` is 1920×1080 (260,270 bytes).
- `public/media/metabolism-intermission.webp` is 1920×1080 (346,596 bytes).
- `public/media/recovery-intermission.webp` is 1920×1080 (186,858 bytes).
- `public/og.png` is the only social-card asset, 1200×630 (1,223,724 bytes). Visual inspection
  confirmed the exact text **Will I Die Soon?** and **Your health is not a verdict. It is a
  map.** in the final palette and canopy language.
- All four WebP stills were inspected at full frame. They share matte paper texture,
  deep-water botanical/landscape structure, restrained signal color, and useful central
  negative space. No readable text, logo, body, organ, anatomy, clinical equipment, or factual
  diagram was found.

`Landing` keeps the poster in the initial render with explicit 1920×1080 dimensions,
responsive `sizes`, eager loading, and high priority. React emits exactly one image preload for
that poster in the production DOM. The MP4 source is not present in the server render and is
mounted only after the browser confirms that reduced motion is off and the document is
visible. A media-query change or `visibilitychange` immediately unmounts the decorative video;
the still remains throughout. The loop is muted, inline, looping, non-focusable, and has no
controls or semantic content.

`Intermission` maps sleep/recovery-related domains to the sleep landscape, metabolic and
measurement domains to the metabolism landscape, and remaining domains to the recovery
landscape. Each image has explicit 1920×1080 dimensions, responsive `sizes`, `loading="lazy"`,
async decoding, empty alt text, and `aria-hidden="true"`. The milestone, completed-domain fact,
and continue action remain normal HTML above the media and never wait for an image event.

`layout.tsx` exposes one Open Graph image and one Twitter descriptor for the same `/og.png`
asset, with the exact title, headline, dimensions, and descriptive alt text. Both resolve
through an environment-aware `metadataBase`: `NEXT_PUBLIC_SITE_URL` is used when it is a valid
HTTP(S) URL and `http://localhost:3000` is the safe local fallback. No production domain is
hardcoded, and no second social card is generated or referenced.

## Accessibility, responsive, and browser evidence

- Desktop and 390×844 mobile landing screenshots were visually inspected. The poster remains
  quiet behind the functional canopy, headline and controls remain legible, and the mobile
  layout has no horizontal overflow.
- A real Quick assessment reached the first intermission at milestone 7 of 20. At 390×844 the
  heading, completed-domain copy, and focused **Continue assessment** button all fit in the
  viewport above the responsive landscape crop.
- Accessibility snapshots contain the functional canopy buttons and intermission content but
  no decorative image or video nodes.
- In a normal-motion real-browser load, the poster returned 200, the MP4 returned 206, and the
  video reported `readyState: 4`, `paused: false`, and `muted: true`.
- With reduced motion installed before navigation, the production behavior reported
  `hasVideo: false`, `hasPoster: true`, and `canopy--still`; the network contained the poster
  request and no MP4 request.
- Initial landing HTML contains no intermission asset reference. During the real assessment,
  only `recovery-intermission.webp` was requested when that intermission mounted; the unused
  sleep and metabolism images were not requested.
- The production DOM contains exactly one hero image preload and one Open Graph/Twitter image
  each; both originate from the single `/og.png` descriptor.
- Chrome Lighthouse snapshot: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing
  100; 28 audits passed and 0 failed.

## TDD evidence

The first focused RED run was:

`npm test -- app/components/intermission.test.tsx app/components/landing.test.tsx app/globals.test.ts`

It failed 6/11 tests for the intended missing behaviors: no intermission media, no landing
poster/video, no document-visibility gate, and no responsive/reduced-motion media CSS. After
the minimal component and CSS implementation, the same command passed 11/11 tests across
3/3 files. The tests exercise real components and cover semantic decoration, exact local asset
routing, explicit dimensions/loading, silent-loop attributes, live reduced-motion changes, and
document-hidden removal/restoration.

The production HTML smoke later exposed a duplicate hero preload from the explicit layout link
and React's image resource hint. The explicit duplicate was removed. A fresh production DOM
probe then found exactly one `link[rel="preload"][as="image"]` for the hero poster.

## Controller correction evidence

The seamless-media regression tests were written before the correction. The landing component
test failed because no ready-state handoff classes existed, and the CSS test failed because the
poster and video both retained non-zero opacity. The metadata tests were isolated from Next's
font loader, then failed on the intended missing `metadataBase` behavior. This established four
feature-specific RED failures.

The corrected landing keeps the image poster as the only visible layer while the video loads.
`canplay` atomically covers the poster and reveals the video at the same visual opacity; a video
error restores the poster. Disabling motion or hiding the document also clears video readiness,
so a remounted loop must become playable again before it replaces the fallback. Focused
component and CSS tests exercise the initial, ready, and error states.

Metadata tests exercise a configured `NEXT_PUBLIC_SITE_URL`, missing and malformed values, and
an unsupported protocol. They verify the local fallback, absolute resolution of both Open Graph
and Twitter URLs, one descriptor per channel, the shared `/og.png` path, and explicit Twitter
alt text. No media binary was changed as part of this correction.

## Final verification

- Focused original Task 7 tests — 3 files, 11/11 passed.
- Focused controller-correction tests — 3 files, 12/12 passed.
- `npm test` — 12 files, 4,409/4,409 passed.
- `npm run lint` — passed, exit 0.
- `npm run build` — passed, exit 0; all five Vinext environments built.
- `git diff --check` — passed, exit 0.
- Production artifact smoke — `/`, all five media files, and `/og.png` returned successfully;
  the rendered head contained the expected Open Graph and Twitter title, headline, card, and
  dimensions.
- `file`, exact-byte `stat`, and `ffprobe` checks confirmed every delivery dimension, image
  format, video codec, frame rate, duration, and absence of audio described above.

A standalone `npx tsc --noEmit` probe still reports the repository-wide Vitest-global,
Cloudflare `Fetcher`, and pre-existing scoring/risk-engine type debts already deferred to Task
8 in the progress ledger. It also created `tsconfig.tsbuildinfo`; that untracked probe artifact
was removed. Task 7 production code introduced no lint or build error.
