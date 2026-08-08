"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import { gsap } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type DecorativeMotionObservation,
} from "./use-decorative-motion";

const ATLAS_SCENE_INLINE_PROPERTIES = [
  "opacity",
  "transform",
  "visibility",
  "will-change",
] as const;

function atlasSceneItems(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-atlas-scene-item]"));
}

function clearAtlasSceneItems(items: readonly HTMLElement[]): void {
  for (const item of items) {
    for (const property of ATLAS_SCENE_INLINE_PROPERTIES) {
      item.style.removeProperty(property);
    }
  }
}

export function useAtlasSceneTransition(
  scope: RefObject<HTMLElement | null>,
  activeScene: HumanAtlasSceneId,
): void {
  const initialMountRef = useRef(true);
  const interruptedRef = useRef(false);
  const motionCancelledRef = useRef(false);
  const previousSceneRef = useRef(activeScene);
  const timelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const contextRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  useLayoutEffect(() => {
    const atlasScope = scope.current;
    const items = atlasScope ? atlasSceneItems(atlasScope) : [];
    let context: ReturnType<typeof gsap.context> | undefined;
    let observation: DecorativeMotionObservation | undefined;
    let timeline: ReturnType<typeof gsap.timeline> | undefined;
    let timelineCompleted = false;
    let terminal = false;

    clearAtlasSceneItems(items);
    const sceneChanged = previousSceneRef.current !== activeScene;
    previousSceneRef.current = activeScene;

    const cleanup = ({
      cancelMotion = false,
      detectInterruption = false,
    } = {}): void => {
      if (terminal) return;
      terminal = true;

      if (cancelMotion) motionCancelledRef.current = true;
      if (detectInterruption && !cancelMotion) {
        let interrupted = timeline !== undefined && !timelineCompleted;
        try {
          interrupted = timeline?.isActive() === true || interrupted;
        } catch {
          interrupted = true;
        }
        interruptedRef.current = interrupted;
      }

      try {
        observation?.dispose();
      } catch {
        // Continue releasing the animation and finalizing the DOM.
      }
      try {
        timeline?.kill();
      } catch {
        // Context and DOM cleanup must still run.
      }
      try {
        context?.revert();
      } catch {
        // DOM cleanup below is the terminal fallback.
      }
      clearAtlasSceneItems(items);
      if (timelineRef.current === timeline) timelineRef.current = null;
      if (contextRef.current === context) contextRef.current = null;
    };

    if (!atlasScope) {
      initialMountRef.current = false;
      motionCancelledRef.current = true;
      return;
    }

    if (
      motionCancelledRef.current ||
      typeof gsap.context !== "function" ||
      typeof gsap.timeline !== "function"
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
        motionCancelledRef.current = true;
        clearAtlasSceneItems(items);
        return () => cleanup();
      }

      if (initialMountRef.current || !sceneChanged) {
        initialMountRef.current = false;
        return () => cleanup();
      }

      if (interruptedRef.current) {
        interruptedRef.current = false;
        return () => cleanup();
      }

      const activeItems = Array.from(atlasScope.querySelectorAll<HTMLElement>(
        `[data-atlas-scene="${activeScene}"] [data-atlas-scene-item]`,
      ));
      if (activeItems.length !== 4) {
        motionCancelledRef.current = true;
        return () => cleanup();
      }

      context = gsap.context(() => undefined, atlasScope);
      contextRef.current = context;
      context.add(() => {
        timeline = gsap.timeline({
          onComplete: () => {
            timelineCompleted = true;
            clearAtlasSceneItems(activeItems);
          },
        });
        timelineRef.current = timeline;
        timeline.fromTo(
          activeItems,
          { opacity: 0.45, y: 12 },
          {
            duration: 0.38,
            ease: "power2.out",
            opacity: 1,
            stagger: 0.06,
            y: 0,
          },
        );
      });
    } catch {
      cleanup({ cancelMotion: true });
      return;
    }

    return () => cleanup({ detectInterruption: true });
  }, [activeScene, scope]);
}
