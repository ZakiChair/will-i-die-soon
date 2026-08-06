"use client";

import { useState, type RefObject } from "react";

import {
  humanAtlasSceneIds,
  type HumanAtlasSceneId,
} from "../data/human-atlas";
import { gsap, useGSAP } from "../lib/gsap-client";
import { useDecorativeMotion } from "./use-decorative-motion";

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

  useGSAP(
    () => {
      if (!motionAllowed || !scope.current) {
        setActiveScene("breath");
        return;
      }

      const atlas = scope.current.matches(".human-atlas-scroll")
        ? scope.current
        : scope.current.querySelector<HTMLElement>(".human-atlas-scroll");
      if (!atlas) {
        setActiveScene("breath");
        return;
      }

      const strengthSignals = scope.current.querySelectorAll<SVGPathElement>(
        "[data-strength-signal]",
      );
      const timeline = gsap.timeline({
        scrollTrigger: {
          end: "bottom bottom",
          onLeaveBack: () => setActiveScene("breath"),
          onUpdate: ({ progress }) => setActiveScene(atlasSceneFromProgress(progress)),
          scrub: 0.8,
          start: "top top",
          trigger: atlas,
        },
      });

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
    },
    { dependencies: [motionAllowed], revertOnUpdate: true, scope },
  );

  return activeScene;
}
