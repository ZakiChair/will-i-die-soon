# Final Review Atlas Fix Report

## Scope

Fixed only the three confirmed final-review Atlas findings from exact base
`ccff05be2e44ca1f31c48880a47e14a1420c9257`:

1. Removed simultaneous parent and child entrance animation ownership.
2. Made the hero/camera endpoints responsive to every ScrollTrigger refresh.
3. Propagated image failure to the landing animation owner and made that failure terminal for the mount.

The footer fix, deferred Minors, assessment flow, result flow, localization copy,
asset, and ledger were not changed.

## Implementation

- Added explicit Atlas scene-motion modes. Controlled landing chapters use
  `sequenced`, so the parent keeps inactive styling but has no transition while
  the four children own the entrance. The uncontrolled IntersectionObserver
  fallback keeps the existing `parent` CSS owner. Reduced, unsupported,
  externally disabled, and failed states use `static`.
- Added the optional `enabled` argument to `useAtlasSceneTransition`. Disabling
  it kills/reverts an active entrance, clears every child inline property, and
  terminally prevents replay during that mount.
- Changed the three continuous endpoints to functional GSAP values and added
  `invalidateOnRefresh: true`. The existing single ScrollTrigger, `scrub: 0.8`,
  and shared raw `onUpdate`/`onRefresh` callback remain intact.
- Added optional `motionDisabled` and `onImageFailure` props to
  `HumanAtlasScroll`. The error callback is guarded by a ref and fires once.
  `Landing` stores the irreversible failure flag and passes it both to the
  continuous owner and back to the child.
- Added monotone terminal disable state to `useLandingTimeline`. Cleanup kills
  the continuous timeline, lets the GSAP context revert, settles an active hero
  entrance, clears hero handoff/camera/progress/strength inline state, and makes
  stale update, refresh, and leave-back callbacks inert.

## TDD Evidence

### Finding 1: single visual owner

RED:

```text
npm test -- app/hooks/use-atlas-scene-transition.test.tsx app/components/human-atlas-scroll.test.tsx app/globals-editorial.test.ts
Test Files  3 failed (3)
Tests       4 failed | 83 passed (87)
```

The failures reported the absent `sequenced`/`parent` modes, missing sequenced
CSS override, and lack of an `enabled` lifecycle in the chapter hook.

GREEN: the same command passed 3 files and 87 tests.

### Finding 2: refresh-responsive amplitudes

RED:

```text
npm test -- app/hooks/use-landing-timeline.test.tsx
Test Files  1 failed (1)
Tests       4 failed | 22 passed (26)
```

The camera and hero endpoints were numeric values captured at setup, and the
ScrollTrigger config had no `invalidateOnRefresh` flag.

GREEN: the same command passed 26 tests, including literal expectations for
1440 to 320 and 320 to 1440 refreshes.

### Finding 3: terminal image failure

RED:

```text
npm test -- app/hooks/use-landing-timeline.test.tsx app/components/human-atlas-scroll.test.tsx app/components/landing.test.tsx app/globals-editorial.test.ts
Test Files  4 failed (4)
Tests       5 failed | 110 passed (115)
```

The failures proved the child did not report image failure, Landing did not
pass a terminal flag, the continuous owner remained live, and no static scene
mode existed.

GREEN: the combined Atlas hook/component/CSS group passed 5 files and 126 tests.

A final stale-callback RED then received `breath` instead of the frozen `sleep`
scene after calling a killed trigger's `onLeaveBack`. Guarding it with the same
owner-active flag produced 1 passing targeted test; stale update and refresh
were already inert.

Expanded targeted Atlas/landing/CSS regression: 8 files, 156 tests, pass.

## Exact Production Browser QA

Built the exact final code, served it at `127.0.0.1:4317`, and tested real
GSAP/ScrollTrigger behavior in Chromium.

Responsive refresh in one mounted trigger:

| State | Hero Y | Camera scale | Camera Y |
| --- | ---: | ---: | ---: |
| 1440x900 initial end | -35.835 | 1.0348 | 7.9633 |
| refresh to 320x700 | -17.9944 | 1.018 | 3.9987 |
| refresh back to 1440x900 | -36 | 1.035 | 8 |

The small initial differences are the expected `scrub: 0.8` settling values;
the same raw trigger continued selecting `energy` at the end.

At 40 ms into an ordinary controlled chapter entrance, the parent computed to
opacity `1`, Y `0`, and transition duration `0s`; the first child was opacity
`0.6232` and Y `8.2218`. Effective opacity therefore never composed below the
child's `.45` starting contract. After a rapid strength-to-sleep threshold
change, the sleep parent and all four children were opacity `1` and Y `0` at the
next animation frame, with child inline opacity/transform cleared.

With the Atlas image request deliberately aborted at 390x844, the final build
reported `data-motion="paused"`, `data-scene-motion="static"`, bootstrap
`static`, 16 final chapter children, and empty hero/fill inline motion state.
Scrolling to the document end left the scene at `breath` and did not restore
animation. The injected abort produced only the expected failed-resource
console entries; the subsequent normal navigation had no console warning or
error.

The server was stopped and port 4317 was released after QA.

## Final Gates

```text
npx tsc --noEmit --incremental false  -> exit 0
npm run lint                          -> exit 0
npm test                              -> 45 files, 4945 tests, pass
npm run build                         -> exit 0
npm audit --omit=dev                  -> 0 vulnerabilities
git diff --check                      -> empty
```

Generated `dist`, `.vinext`, `.wrangler`, and `tsconfig.tsbuildinfo` artifacts
were removed after verification.

## Concerns

- Vitest and the build retain the existing Node `DEP0205` deprecation warning.
- Vinext retains its existing route-classification note and chunk-over-500-kB
  warning. Neither was introduced or changed by this fix.
