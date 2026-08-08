"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import { gsap } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type DecorativeMotionObservation,
} from "./use-decorative-motion";

const EVIDENCE_INLINE_PROPERTIES = [
  "opacity",
  "transform",
  "visibility",
  "will-change",
] as const;

function clearEvidenceContent(content: HTMLElement): void {
  for (const property of EVIDENCE_INLINE_PROPERTIES) {
    content.style.removeProperty(property);
  }
}

export function useEvidenceTransition(
  scope: RefObject<HTMLElement | null>,
  evidenceKey: string | undefined,
): void {
  const initialMountRef = useRef(true);
  const motionCancelledRef = useRef(false);
  const previousEvidenceKeyRef = useRef(evidenceKey);

  useLayoutEffect(() => {
    const content = scope.current;
    let context: ReturnType<typeof gsap.context> | undefined;
    let observation: DecorativeMotionObservation | undefined;
    let timeline: ReturnType<typeof gsap.timeline> | undefined;
    let terminal = false;

    if (content) clearEvidenceContent(content);
    const evidenceChanged = previousEvidenceKeyRef.current !== evidenceKey;
    previousEvidenceKeyRef.current = evidenceKey;

    const cleanup = ({ cancelMotion = false, inspectActive = false } = {}): void => {
      if (terminal) return;
      terminal = true;
      if (cancelMotion) motionCancelledRef.current = true;

      if (inspectActive) {
        try {
          timeline?.isActive();
        } catch {
          // Cleanup remains authoritative if timeline state cannot be read.
        }
      }
      try {
        observation?.dispose();
      } catch {
        // Continue releasing animation ownership and finalizing the DOM.
      }
      try {
        timeline?.kill();
      } catch {
        // Context reversion and inline cleanup remain authoritative.
      }
      try {
        context?.revert();
      } catch {
        // Explicit inline cleanup below is the terminal fallback.
      }
      if (content) clearEvidenceContent(content);
    };

    if (
      !content
      || motionCancelledRef.current
      || typeof gsap.context !== "function"
      || typeof gsap.timeline !== "function"
    ) {
      initialMountRef.current = false;
      motionCancelledRef.current = true;
      return;
    }

    try {
      observation = observeDecorativeMotion((status) => {
        if (status !== "running") cleanup({ cancelMotion: true });
      });

      if (observation.status !== "running") {
        initialMountRef.current = false;
        cleanup({ cancelMotion: true });
        return;
      }

      if (initialMountRef.current || !evidenceChanged) {
        initialMountRef.current = false;
        return () => cleanup();
      }

      context = gsap.context(() => undefined, content);
      context.add(() => {
        timeline = gsap.timeline({
          onComplete: () => clearEvidenceContent(content),
        });
        timeline.fromTo(
          content,
          { opacity: 0.82, y: 8 },
          {
            duration: 0.22,
            ease: "power2.out",
            opacity: 1,
            y: 0,
          },
        );
      });
    } catch {
      cleanup({ cancelMotion: true });
      return;
    }

    return () => cleanup({ inspectActive: true });
  }, [evidenceKey, scope]);
}
