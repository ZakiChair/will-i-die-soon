"use client";

import { useRef, useState, type RefObject } from "react";

import {
  humanAtlasSceneIds,
  type HumanAtlasSceneId,
} from "../data/human-atlas";
import { gsap, ScrollTrigger, useGSAP } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type DecorativeMotionObservation,
  useDecorativeMotion,
} from "./use-decorative-motion";

const HERO_INLINE_PROPERTIES = [
  "clip-path",
  "opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "transform",
  "visibility",
  "will-change",
] as const;

function clearInlineMotion(nodes: Iterable<Element>): void {
  for (const node of nodes) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) continue;
    for (const property of HERO_INLINE_PROPERTIES) node.style.removeProperty(property);
  }
}

function settleHeroBootstrap(): void {
  const root = document.documentElement;
  if (
    root.dataset.motionBootstrap === "pending" ||
    root.dataset.motionBootstrap === "ready"
  ) {
    root.dataset.motionBootstrap = "static";
  }
}

export function atlasSceneFromProgress(progress: number): HumanAtlasSceneId {
  const finiteProgress = Number.isNaN(progress) ? 0 : progress;
  const clampedProgress = Math.min(1, Math.max(0, finiteProgress));
  const sceneIndex = Math.min(
    Math.floor(clampedProgress * humanAtlasSceneIds.length),
    humanAtlasSceneIds.length - 1,
  );

  return humanAtlasSceneIds[sceneIndex];
}

export function useLandingTimeline(
  scope: RefObject<HTMLElement | null>,
): HumanAtlasSceneId {
  const [activeScene, setActiveScene] = useState<HumanAtlasSceneId>("breath");
  const motionAllowed = useDecorativeMotion();
  const terminateEntrance = useRef<(() => void) | null>(null);

  useGSAP(
    (context) => {
      const root = document.documentElement;
      const heroScope = scope.current;
      const heroItems = heroScope
        ? Array.from(heroScope.querySelectorAll<HTMLElement>("[data-hero-item]"))
        : [];
      let observation: DecorativeMotionObservation | undefined;
      let timeline: ReturnType<typeof gsap.timeline> | undefined;
      let terminal = false;
      let ownedTerminator: (() => void) | undefined;

      const cleanup = (revertContext: boolean): void => {
        if (terminal) return;
        terminal = true;
        if (terminateEntrance.current === ownedTerminator) {
          terminateEntrance.current = null;
        }
        try {
          observation?.dispose();
        } catch {
          // Continue releasing independently owned animation state.
        }
        try {
          timeline?.kill();
        } catch {
          // DOM final-state cleanup below must still run.
        }
        if (revertContext) {
          try {
            context.revert();
          } catch {
            // DOM final-state cleanup below must still run.
          }
        }
        clearInlineMotion(heroItems);
        settleHeroBootstrap();
      };

      if (root.dataset.motionBootstrap !== "pending") {
        terminateEntrance.current = null;
        clearInlineMotion(heroItems);
        settleHeroBootstrap();
        return;
      }

      if (
        !heroScope ||
        heroItems.length !== 5 ||
        typeof gsap.timeline !== "function" ||
        typeof ScrollTrigger.create !== "function"
      ) {
        cleanup(false);
        return;
      }

      try {
        observation = observeDecorativeMotion((status) => {
          if (status !== "running") cleanup(true);
        });
        if (observation.status !== "running") {
          cleanup(false);
          return;
        }

        ownedTerminator = () => cleanup(true);
        terminateEntrance.current = ownedTerminator;
        timeline = gsap.timeline({
          onComplete: () => {
            if (terminal) return;
            terminal = true;
            if (terminateEntrance.current === ownedTerminator) {
              terminateEntrance.current = null;
            }
            try {
              observation?.dispose();
            } catch {
              // Completion must still expose final content.
            }
            clearInlineMotion(heroItems);
            if (root.dataset.motionBootstrap === "ready") {
              root.removeAttribute("data-motion-bootstrap");
            }
          },
        });
        timeline
          .fromTo(
            heroItems[0],
            { opacity: 0, y: 12 },
            { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 },
            0,
          )
          .fromTo(
            heroItems[1],
            { opacity: 0, y: 32 },
            { duration: 0.62, ease: "power3.out", opacity: 1, y: 0 },
            0.08,
          )
          .fromTo(
            heroItems[2],
            { opacity: 0, y: 18 },
            { duration: 0.42, ease: "power3.out", opacity: 1, y: 0 },
            0.26,
          )
          .fromTo(
            heroItems[3],
            { opacity: 0, y: 14 },
            { duration: 0.36, ease: "power3.out", opacity: 1, y: 0 },
            0.38,
          )
          .fromTo(
            heroItems[4],
            { opacity: 0, y: 10 },
            { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 },
            0.5,
          );
        root.dataset.motionBootstrap = "ready";
      } catch {
        cleanup(true);
      }

      return () => cleanup(false);
    },
    { dependencies: [], revertOnUpdate: true, scope },
  );

  useGSAP(
    (context) => {
      const landingScope = scope.current;
      const handoffTargets = landingScope
        ? Array.from(landingScope.querySelectorAll<HTMLElement>("[data-hero-handoff]"))
        : [];
      const title = landingScope?.querySelector<HTMLElement>("[data-hero-title]");
      const strengthSignals = landingScope?.querySelectorAll<SVGPathElement>(
        "[data-strength-signal]",
      ) ?? [];
      const clearContinuousState = () => {
        clearInlineMotion(handoffTargets);
        clearInlineMotion(strengthSignals);
      };
      let timeline: ReturnType<typeof gsap.timeline> | undefined;

      if (!motionAllowed) {
        clearContinuousState();
        setActiveScene("breath");
        return;
      }
      if (
        !landingScope ||
        typeof gsap.timeline !== "function" ||
        typeof ScrollTrigger.create !== "function"
      ) {
        settleHeroBootstrap();
        clearContinuousState();
        setActiveScene("breath");
        return;
      }

      const atlas = landingScope.matches(".human-atlas-scroll")
        ? landingScope
        : landingScope.querySelector<HTMLElement>(".human-atlas-scroll");
      if (!atlas) {
        clearContinuousState();
        setActiveScene("breath");
        return;
      }

      try {
        timeline = gsap.timeline({
          scrollTrigger: {
            end: "bottom bottom",
            onLeaveBack: () => setActiveScene("breath"),
            onUpdate: ({ progress }) => setActiveScene(atlasSceneFromProgress(progress)),
            scrub: 0.8,
            start: "top top",
            trigger: atlas,
          },
        });

        if (handoffTargets.length > 0) {
          timeline.to(handoffTargets, { duration: 1, ease: "none", y: -36 }, 0);
        }
        if (title) {
          timeline.to(title, { duration: 1, ease: "none", opacity: 0.82 }, 0);
        }
        if (strengthSignals.length > 0) {
          timeline
            .fromTo(
              strengthSignals,
              { strokeDasharray: "0.16 0.84", strokeDashoffset: 1 },
              { duration: 0.25, ease: "none", strokeDashoffset: 0 },
              0.25,
            )
            .set(strengthSignals, { strokeDashoffset: 0 }, 1);
        }
      } catch {
        try {
          timeline?.kill();
        } catch {
          // Context and DOM cleanup remain independently recoverable.
        }
        try {
          context.revert();
        } catch {
          // DOM final-state cleanup below must still run.
        }
        try {
          terminateEntrance.current?.();
        } catch {
          // Continuous final-state cleanup below must still run.
        }
        settleHeroBootstrap();
        clearContinuousState();
      }
    },
    { dependencies: [motionAllowed], revertOnUpdate: true, scope },
  );

  return activeScene;
}
