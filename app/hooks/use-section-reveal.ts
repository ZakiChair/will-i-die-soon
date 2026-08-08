"use client";

import type { RefObject } from "react";

import { gsap, ScrollTrigger, useGSAP } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type DecorativeMotionObservation,
} from "./use-decorative-motion";

export type SectionRevealMode = "document" | "new-content";

const REVEAL_VARIANTS = {
  single: {
    from: { opacity: 0, y: 20 },
    to: { duration: 0.55, ease: "power3.out", opacity: 1, y: 0 },
  },
  heading: {
    from: { opacity: 0, y: 24 },
    to: { duration: 0.65, ease: "power3.out", opacity: 1, stagger: 0.08, y: 0 },
  },
  group: {
    from: { opacity: 0, y: 18 },
    to: { duration: 0.55, ease: "power3.out", opacity: 1, stagger: 0.07, y: 0 },
  },
} as const;

const INLINE_REVEAL_PROPERTIES = ["opacity", "transform", "visibility", "will-change"];

function revealNodes(root: HTMLElement): HTMLElement[] {
  return [root, ...root.querySelectorAll<HTMLElement>("[data-reveal-item]")];
}

function clearRevealRoot(root: HTMLElement): void {
  for (const node of revealNodes(root)) {
    for (const property of INLINE_REVEAL_PROPERTIES) node.style.removeProperty(property);
    if (node.dataset.revealItem === "rule") node.style.removeProperty("transform-origin");
  }
}

function clearRevealRoots(roots: readonly HTMLElement[]): void {
  for (const root of roots) clearRevealRoot(root);
}

function directRevealItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement => (
      child instanceof HTMLElement && child.hasAttribute("data-reveal-item")
    ),
  );
}

export function useSectionReveal(
  scope: RefObject<HTMLElement | null>,
  selector = "[data-reveal]",
  mode: SectionRevealMode = "document",
): void {
  useGSAP(
    (context) => {
      const revealScope = scope.current;
      const roots = revealScope
        ? Array.from(revealScope.querySelectorAll<HTMLElement>(selector))
        : [];
      const invalidRoots = new Set<HTMLElement>();

      for (let left = 0; left < roots.length; left += 1) {
        for (let right = left + 1; right < roots.length; right += 1) {
          if (roots[left].contains(roots[right]) || roots[right].contains(roots[left])) {
            invalidRoots.add(roots[left]);
            invalidRoots.add(roots[right]);
          }
        }
      }
      clearRevealRoots([...invalidRoots]);

      if (
        !revealScope ||
        typeof gsap.timeline !== "function" ||
        typeof ScrollTrigger.create !== "function"
      ) {
        clearRevealRoots(roots);
        return;
      }

      const validRoots = roots.filter((root) => !invalidRoots.has(root));
      const timelines: ReturnType<typeof gsap.timeline>[] = [];
      const triggers: ReturnType<typeof ScrollTrigger.create>[] = [];
      let observation: DecorativeMotionObservation | undefined;
      let terminal = false;

      const terminalCleanup = (revertContext: boolean): void => {
        if (terminal) return;
        terminal = true;

        try {
          observation?.dispose();
        } catch {
          // Continue releasing owned animation and DOM state.
        }
        for (const trigger of triggers) {
          try {
            trigger.kill();
          } catch {
            // Cleanup is best-effort across independently owned resources.
          }
        }
        for (const timeline of timelines) {
          try {
            timeline.kill();
          } catch {
            // Cleanup is best-effort across independently owned resources.
          }
        }
        if (revertContext) {
          try {
            context.revert();
          } catch {
            // DOM final-state cleanup below must still run.
          }
        }
        clearRevealRoots(roots);
      };

      try {
        observation = observeDecorativeMotion((status) => {
          if (status !== "running") terminalCleanup(true);
        });

        if (observation.status !== "running") {
          clearRevealRoots(roots);
          return observation.dispose;
        }

        for (const root of validRoots) {
          if (mode === "document" && root.getBoundingClientRect().top <= window.innerHeight) {
            clearRevealRoot(root);
            continue;
          }

          const variantName = root.dataset.reveal === "heading" || root.dataset.reveal === "group"
            ? root.dataset.reveal
            : "single";
          const timeline = gsap.timeline({ paused: true });
          timelines.push(timeline);

          if (variantName === "single") {
            const variant = REVEAL_VARIANTS.single;
            timeline.fromTo(root, variant.from, variant.to);
          } else {
            const variant = REVEAL_VARIANTS[variantName];
            const items = directRevealItems(root);
            const standardItems = items.filter((item) => item.dataset.revealItem !== "rule");
            const stagger = variant.to.stagger;

            if (standardItems.length > 0) {
              timeline.fromTo(standardItems, variant.from, variant.to, 0);
            }
            for (const rule of items.filter((item) => item.dataset.revealItem === "rule")) {
              timeline.fromTo(
                rule,
                { opacity: 1, scaleX: 0, transformOrigin: "left center" },
                {
                  duration: variant.to.duration,
                  ease: variant.to.ease,
                  opacity: 1,
                  scaleX: 1,
                },
                items.indexOf(rule) * stagger,
              );
            }
          }

          triggers.push(ScrollTrigger.create({
            animation: timeline,
            once: true,
            start: root.hasAttribute("data-reveal-terminal") ? "top bottom" : "top 84%",
            trigger: root,
          }));
        }
      } catch {
        terminalCleanup(true);
      }

      return () => terminalCleanup(false);
    },
    { dependencies: [mode, selector], revertOnUpdate: true, scope },
  );
}
