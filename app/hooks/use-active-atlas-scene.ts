"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  humanAtlasSceneIds,
  isHumanAtlasSceneId,
  type HumanAtlasSceneId,
} from "../data/human-atlas";

export type HumanAtlasSceneElements = Partial<
  Record<HumanAtlasSceneId, HTMLElement | null>
>;

export function useActiveAtlasScene(
  sceneElements: RefObject<HumanAtlasSceneElements>,
): HumanAtlasSceneId {
  const [activeScene, setActiveScene] = useState<HumanAtlasSceneId>("breath");

  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;

    let observer: IntersectionObserver | undefined;

    try {
      const nodes = humanAtlasSceneIds
        .map((sceneId) => sceneElements.current[sceneId])
        .filter((node): node is HTMLElement => node instanceof HTMLElement);
      if (nodes.length === 0) return;

      const intersecting = new Map<HTMLElement, boolean>(
        nodes.map((node) => [node, false]),
      );

      observer = new IntersectionObserver(
        (entries) => {
          try {
            for (const entry of entries) {
              if (entry.target instanceof HTMLElement && intersecting.has(entry.target)) {
                intersecting.set(entry.target, entry.isIntersecting);
              }
            }

            const rootCentre = entries[0]?.rootBounds
              ? entries[0].rootBounds.top + entries[0].rootBounds.height / 2
              : window.innerHeight / 2;
            const visible = nodes
              .filter((node) => intersecting.get(node))
              .sort((left, right) => {
                const leftRect = left.getBoundingClientRect();
                const rightRect = right.getBoundingClientRect();
                const leftCentre = leftRect.top + leftRect.height / 2;
                const rightCentre = rightRect.top + rightRect.height / 2;
                const byDistance =
                  Math.abs(leftCentre - rootCentre) -
                  Math.abs(rightCentre - rootCentre);
                if (byDistance !== 0) return byDistance;

                const leftScene = left.getAttribute("data-atlas-scene");
                const rightScene = right.getAttribute("data-atlas-scene");
                return (
                  humanAtlasSceneIds.indexOf(leftScene as HumanAtlasSceneId) -
                  humanAtlasSceneIds.indexOf(rightScene as HumanAtlasSceneId)
                );
              })[0];
            const candidate = visible?.getAttribute("data-atlas-scene");
            if (isHumanAtlasSceneId(candidate)) setActiveScene(candidate);
          } catch {
            setActiveScene("breath");
          }
        },
        {
          root: null,
          rootMargin: "-38% 0px -42% 0px",
          threshold: [0, 0.15, 0.35, 0.6],
        },
      );

      nodes.forEach((node) => observer?.observe(node));
      return () => observer?.disconnect();
    } catch {
      observer?.disconnect();
    }
  }, [sceneElements]);

  return activeScene;
}
