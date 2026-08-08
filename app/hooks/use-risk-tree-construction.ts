"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import { gsap, ScrollTrigger } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type DecorativeMotionObservation,
} from "./use-decorative-motion";

const BRANCH_STARTS = [0.16, 0.24, 0.32, 0.4] as const;

type RiskTreeParts = Readonly<{
  branches: HTMLElement[];
  foundation: HTMLElement | null;
  leafGroups: HTMLElement[];
  pillars: HTMLElement[];
  tree: HTMLElement;
}>;

function riskTreeParts(tree: HTMLElement): RiskTreeParts {
  const branches = Array.from(
    tree.querySelectorAll<HTMLElement>("[data-risk-tree-branch]"),
  );

  return {
    branches,
    foundation: tree.querySelector<HTMLElement>(
      ".risk-tree__foundation[data-risk-tree-item]",
    ),
    leafGroups: Array.from(
      tree.querySelectorAll<HTMLElement>(
        "[data-risk-tree-branch] > [data-risk-tree-item]",
      ),
    ),
    pillars: branches.filter((branch) => branch.hasAttribute("data-risk-tree-item")),
    tree,
  };
}

function clearRiskTree(parts: RiskTreeParts): void {
  parts.tree.style.removeProperty("--risk-trunk-progress");
  for (const branch of parts.branches) {
    branch.style.removeProperty("--risk-branch-progress");
  }
  for (const item of [...parts.pillars, ...parts.leafGroups, parts.foundation]) {
    item?.style.removeProperty("opacity");
    item?.style.removeProperty("transform");
  }
}

function hasCompleteTree(parts: RiskTreeParts): parts is RiskTreeParts & {
  foundation: HTMLElement;
} {
  return (
    parts.tree.hasAttribute("data-risk-tree-trunk")
    && parts.branches.length === 4
    && parts.pillars.length === 4
    && parts.leafGroups.length === 4
    && parts.foundation !== null
  );
}

export function useRiskTreeConstruction(
  scope: RefObject<HTMLElement | null>,
): void {
  const cancelledRef = useRef(false);

  useLayoutEffect(() => {
    const tree = scope.current;
    if (!tree) {
      cancelledRef.current = true;
      return;
    }

    const parts = riskTreeParts(tree);
    let context: ReturnType<typeof gsap.context> | undefined;
    let observation: DecorativeMotionObservation | undefined;
    let timeline: ReturnType<typeof gsap.timeline> | undefined;
    let trigger: ReturnType<typeof ScrollTrigger.create> | undefined;
    let motionStoppedDuringPreflight = false;
    let preflightComplete = false;
    let terminal = false;

    const terminalCleanup = (): void => {
      if (terminal) return;
      terminal = true;
      cancelledRef.current = true;

      try {
        observation?.dispose();
      } catch {
        // Continue releasing animation ownership and finalizing the DOM.
      }
      try {
        trigger?.kill();
      } catch {
        // The timeline and DOM still need terminal cleanup.
      }
      try {
        timeline?.kill();
      } catch {
        // Context reversion and DOM cleanup remain authoritative.
      }
      try {
        context?.revert();
      } catch {
        // Explicit inline cleanup below is the final fallback.
      }
      clearRiskTree(parts);
    };

    try {
      const hasContext = typeof gsap.context === "function";
      const hasSet = typeof gsap.set === "function";
      const hasTimeline = typeof gsap.timeline === "function";
      const hasTrigger = typeof ScrollTrigger.create === "function";
      const completeTree = hasCompleteTree(parts);

      observation = observeDecorativeMotion((status) => {
        if (!preflightComplete) {
          motionStoppedDuringPreflight ||= status !== "running";
        } else if (status !== "running") {
          terminalCleanup();
        }
      });
      const initialMotionStatus = observation.status;
      const belowViewport = tree.getBoundingClientRect().top > window.innerHeight;
      preflightComplete = true;

      if (
        cancelledRef.current
        || !hasContext
        || !hasSet
        || !hasTimeline
        || !hasTrigger
        || !completeTree
        || initialMotionStatus !== "running"
        || motionStoppedDuringPreflight
        || !belowViewport
      ) {
        terminalCleanup();
        return;
      }

      context = gsap.context(() => undefined, tree);
      context.add(() => {
        timeline = gsap.timeline({
          onComplete: terminalCleanup,
          paused: true,
        });

        gsap.set(tree, { "--risk-trunk-progress": 0 });
        gsap.set(parts.branches, { "--risk-branch-progress": 0 });
        gsap.set(parts.pillars, { opacity: 0, y: 16 });
        gsap.set(parts.leafGroups, { opacity: 0, y: 10 });
        gsap.set(parts.foundation, { opacity: 0, y: 12 });

        timeline.to(
          tree,
          { "--risk-trunk-progress": 1, duration: 0.55, ease: "power2.out" },
          0,
        );
        parts.branches.forEach((branch, index) => {
          timeline?.to(
            branch,
            { "--risk-branch-progress": 1, duration: 0.55, ease: "power2.out" },
            BRANCH_STARTS[index],
          );
        });
        timeline.to(
          parts.pillars,
          { duration: 0.38, ease: "power2.out", opacity: 1, stagger: 0.06, y: 0 },
          0.22,
        );
        timeline.to(
          parts.leafGroups,
          { duration: 0.38, ease: "power2.out", opacity: 1, stagger: 0.06, y: 0 },
          0.38,
        );
        timeline.to(
          parts.foundation,
          { duration: 0.38, ease: "power2.out", opacity: 1, y: 0 },
          0.72,
        );
      });

      trigger = ScrollTrigger.create({
        animation: timeline,
        once: true,
        start: "top 84%",
        trigger: tree,
      });
    } catch {
      terminalCleanup();
      return;
    }

    return terminalCleanup;
  }, [scope]);
}
