"use client";

import type { RefObject } from "react";

import { gsap, useGSAP } from "../lib/gsap-client";
import { useDecorativeMotion } from "./use-decorative-motion";

export function useSectionReveal(
  scope: RefObject<HTMLElement | null>,
  selector = "[data-reveal]",
) {
  const decorativeMotion = useDecorativeMotion();

  useGSAP(
    () => {
      if (!decorativeMotion || !scope.current) return;

      scope.current.querySelectorAll<HTMLElement>(selector).forEach((target) => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { start: "top 86%", once: true, trigger: target },
            y: 0,
          },
        );
      });
    },
    { dependencies: [decorativeMotion, selector], revertOnUpdate: true, scope },
  );
}
