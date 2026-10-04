"use client";

import { useRef, useState, type RefObject } from "react";

import {
  humanAtlasStorySceneIds,
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
const ATLAS_CSS_PROPERTIES = ["--atlas-scroll", "--atlas-chapter-progress", "--atlas-scene-index"] as const;
const CHAPTER_CSS_PROPERTIES = ["--scene-presence", "--scene-drift"] as const;
// Un chapitre s'efface sur un peu plus d'une demi-vue : deux voisins ne sont jamais pleins ensemble.
const CHAPTER_PRESENCE_REACH = 0.55;
// Sous ce déplacement, l'aimant ramène au chapitre de départ (tremblement du pavé tactile).
const SNAP_DEAD_ZONE_PX = 16;

type SnapTrigger = Readonly<{
  direction?: number;
  end?: number;
  scroll?: () => number;
  start?: number;
}>;

function clampProgress(progress: number): number {
  return Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/**
 * Aimant directionnel : le geste mène au point suivant dans son sens,
 * sauf micro-déplacement ; après le dernier point, la descente reste libre.
 */
export function snapAtlasProgress(
  value: number,
  direction: number,
  points: readonly number[],
  deadZone = 0,
): number {
  const progress = clampProgress(value);
  const stops = points.filter(Number.isFinite).map(clampProgress).sort((left, right) => left - right);
  if (stops.length === 0) return progress;
  const last = stops[stops.length - 1];
  if (progress >= last) return direction > 0 ? progress : last;
  if (progress <= stops[0]) return stops[0];

  let index = 0;
  while (index < stops.length - 2 && progress > stops[index + 1]) index += 1;
  const from = stops[index];
  const to = stops[index + 1];
  if (direction > 0) return progress - from > deadZone ? to : from;
  if (direction < 0) return to - progress > deadZone ? from : to;
  return progress - from <= to - progress ? from : to;
}

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
    Math.floor(clampedProgress * humanAtlasStorySceneIds.length),
    humanAtlasStorySceneIds.length - 1,
  );

  return humanAtlasStorySceneIds[sceneIndex];
}

export function atlasMotionLimits(width: number): {
  heroY: number;
  imageScale: number;
  imageY: number;
} {
  return width <= 850
    ? { heroY: 18, imageScale: 1.12, imageY: -18 }
    : { heroY: 36, imageScale: 1.24, imageY: -42 };
}

export function useLandingTimeline(
  scope: RefObject<HTMLElement | null>,
  disabled = false,
  progressRef?: RefObject<number>,
): HumanAtlasSceneId {
  const [activeScene, setActiveScene] = useState<HumanAtlasSceneId>(humanAtlasStorySceneIds[0]);
  const motionAllowed = useDecorativeMotion();
  const terminateEntrance = useRef<(() => void) | null>(null);
  const atlasTerminated = useRef(false);

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

      if (disabled) atlasTerminated.current = true;

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

      if (atlasTerminated.current || root.dataset.motionBootstrap !== "pending") {
        terminateEntrance.current = null;
        clearInlineMotion(heroItems);
        settleHeroBootstrap();
        return;
      }

      if (
        !heroScope ||
        heroItems.length !== 4 ||
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
            { opacity: 0, y: 10 },
            { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 },
            0.38,
          );
        root.dataset.motionBootstrap = "ready";
      } catch {
        cleanup(true);
      }

      return () => cleanup(false);
    },
    { dependencies: [disabled], revertOnUpdate: true, scope },
  );

  useGSAP(
    (context) => {
      const landingScope = scope.current;
      const atlas = landingScope?.matches(".human-atlas-scroll")
        ? landingScope
        : landingScope?.querySelector<HTMLElement>(".human-atlas-scroll");
      const handoffTargets = landingScope
        ? Array.from(landingScope.querySelectorAll<HTMLElement>("[data-hero-handoff]"))
        : [];
      const stage = landingScope?.querySelector<HTMLElement>(".human-atlas-stage");
      const hero = landingScope?.querySelector<HTMLElement>(".landing__atlas-hero");
      // Le corps et ses lumières partagent le cadrage pour rester alignés.
      const camera = landingScope?.querySelector<HTMLElement>("[data-atlas-optics]")
        ?? landingScope?.querySelector<HTMLElement>("[data-atlas-camera]");
      const sweep = landingScope?.querySelector<HTMLElement>("[data-atlas-sweep]");
      const progressFill = landingScope?.querySelector<HTMLElement>(
        "[data-atlas-progress-fill]",
      );
      const strengthSignals = landingScope?.querySelectorAll<SVGPathElement>(
        "[data-strength-signal]",
      ) ?? [];
      const chapters = atlas
        ? Array.from(atlas.querySelectorAll<HTMLElement>("[data-atlas-scene]"))
        : [];
      const clearContinuousState = () => {
        clearInlineMotion(handoffTargets);
        if (camera) clearInlineMotion([camera]);
        if (sweep) clearInlineMotion([sweep]);
        if (progressFill) clearInlineMotion([progressFill]);
        clearInlineMotion(strengthSignals);
        for (const property of ATLAS_CSS_PROPERTIES) stage?.style.removeProperty(property);
        for (const chapter of chapters) {
          for (const property of CHAPTER_CSS_PROPERTIES) chapter.style.removeProperty(property);
        }
        atlas?.removeAttribute("data-scroll-sequenced");
      };
      let timeline: ReturnType<typeof gsap.timeline> | undefined;
      let active = true;

      if (disabled) atlasTerminated.current = true;

      const cleanup = (revertContext: boolean): void => {
        if (!active) return;
        active = false;
        try {
          timeline?.kill();
        } catch {
          // Context and DOM cleanup remain independently recoverable.
        }
        if (revertContext) {
          try {
            context.revert();
          } catch {
            // DOM final-state cleanup below must still run.
          }
        }
        clearContinuousState();
      };

      if (atlasTerminated.current) {
        try {
          terminateEntrance.current?.();
        } catch {
          // Continuous final-state cleanup below must still run.
        }
        settleHeroBootstrap();
        cleanup(false);
        return;
      }
      if (!motionAllowed) {
        clearContinuousState();
        return;
      }
      if (
        !landingScope ||
        typeof gsap.timeline !== "function" ||
        typeof ScrollTrigger.create !== "function"
      ) {
        settleHeroBootstrap();
        clearContinuousState();
        return;
      }

      if (!atlas) {
        clearContinuousState();
        return;
      }

      try {
        const writeStageProgress = (progress: number, chapterProgress: number, scene: HumanAtlasSceneId) => {
          stage?.style.setProperty("--atlas-scroll", String(progress));
          stage?.style.setProperty("--atlas-chapter-progress", String(chapterProgress));
          stage?.style.setProperty("--atlas-scene-index", String(humanAtlasStorySceneIds.indexOf(scene)));
        };
        writeStageProgress(0, 0, humanAtlasStorySceneIds[0]);
        const syncAtlasProgress = ({ progress }: { progress: number }) => {
          if (!active) return;
          const clampedProgress = clampProgress(progress);
          const viewportHeight = Number.isFinite(window.innerHeight) && window.innerHeight > 0 ? window.innerHeight : 1;
          // Le texte peut prendre davantage de place en français ou sur mobile.
          // Le chapitre visible pilote donc la lumière, indépendamment de sa hauteur.
          let nearest = atlasSceneFromProgress(clampedProgress);
          let nearestDistance = Infinity;
          let chapterProgress = clampProgress(clampedProgress * humanAtlasStorySceneIds.length - humanAtlasStorySceneIds.indexOf(nearest));
          let firstChapterTop: number | null = null;
          const presenceReach = viewportHeight * CHAPTER_PRESENCE_REACH;
          for (const chapter of chapters) {
            const bounds = chapter.getBoundingClientRect();
            const id = chapter.dataset.atlasScene as HumanAtlasSceneId;
            if (!humanAtlasStorySceneIds.includes(id) || !Number.isFinite(bounds.top) || !Number.isFinite(bounds.height) || bounds.height <= 0) continue;
            if (id === humanAtlasStorySceneIds[0]) firstChapterTop = bounds.top;
            const offset = bounds.top + bounds.height / 2 - viewportHeight / 2;
            const distance = Math.abs(offset);
            // Seule la carte consomme ces variables : la section reste immobile et sa mesure exacte.
            chapter.style.setProperty("--scene-presence", smoothstep(1 - distance / presenceReach).toFixed(3));
            chapter.style.setProperty("--scene-drift", Math.min(1, Math.max(-1, offset / presenceReach)).toFixed(3));
            if (distance < nearestDistance) {
              nearest = id;
              nearestDistance = distance;
              chapterProgress = clampProgress((viewportHeight / 2 - bounds.top) / bounds.height);
            }
          }
          // Les bornes restent explicites quand le dernier texte est encore sous le centre mobile.
          if (clampedProgress === 0 || clampedProgress === 1) {
            nearest = clampedProgress === 0 ? humanAtlasStorySceneIds[0] : humanAtlasStorySceneIds[humanAtlasStorySceneIds.length - 1];
            chapterProgress = clampedProgress;
          }
          // Seuls les spans de texte sont concernés : CTA et couche d'entrée restent disponibles.
          const handoff = clampedProgress === 0 || firstChapterTop === null ? 0
            : clampProgress((viewportHeight * 0.88 - firstChapterTop) / (viewportHeight * 0.3));
          for (const target of handoffTargets) target.style.opacity = String(1 - handoff);
          writeStageProgress(clampedProgress, chapterProgress, nearest);
          if (progressRef) progressRef.current = clampedProgress;
          if (progressFill) gsap.set(progressFill, { scaleX: clampedProgress });
          setActiveScene(nearest);
        };

        // Les points d'aimant sont les positions d'ancrage des chapitres (haut moins
        // scroll-margin-top) : un lien de navigation et l'aimant s'arrêtent au même endroit.
        const snapPoints = (trigger: SnapTrigger): number[] => {
          const start = Number(trigger.start);
          const distance = Number(trigger.end) - start;
          const scroll = typeof trigger.scroll === "function" ? Number(trigger.scroll()) : window.scrollY;
          if (!Number.isFinite(start) || !Number.isFinite(distance) || distance <= 0 || !Number.isFinite(scroll)) return [];
          const anchors: number[] = [];
          for (const chapter of chapters) {
            const bounds = chapter.getBoundingClientRect();
            if (!Number.isFinite(bounds.top) || !Number.isFinite(bounds.height) || bounds.height <= 0) continue;
            const margin = Number.parseFloat(getComputedStyle(chapter).scrollMarginTop);
            anchors.push((scroll + bounds.top - (Number.isFinite(margin) ? margin : 0) - start) / distance);
          }
          return anchors.length > 0 ? [0, ...anchors] : [];
        };
        const snapToChapter = (value: number, trigger?: SnapTrigger): number => {
          if (!active || !trigger) return value;
          const distance = Number(trigger.end) - Number(trigger.start);
          const deadZone = Number.isFinite(distance) && distance > 0 ? SNAP_DEAD_ZONE_PX / distance : 0;
          const direction = Number.isFinite(trigger.direction) ? Number(trigger.direction) : 0;
          return snapAtlasProgress(value, direction, snapPoints(trigger), deadZone);
        };
        // Héros posé sur la scène (bureau) : l'atlas commence sous l'en-tête, mais le récit
        // s'ouvre en haut de page, où l'aimant ramène avec l'en-tête visible.
        const storyStart = () => (hero && getComputedStyle(hero).position === "absolute" ? 0 : "top top");

        if (camera) camera.style.willChange = "transform";
        timeline = gsap.timeline({
          scrollTrigger: {
            end: "bottom bottom",
            invalidateOnRefresh: true,
            onLeaveBack: () => syncAtlasProgress({ progress: 0 }),
            onRefresh: syncAtlasProgress,
            onUpdate: syncAtlasProgress,
            scrub: 0.8,
            snap: {
              delay: 0.18,
              duration: { min: 0.3, max: 0.8 },
              ease: "power2.inOut",
              inertia: false,
              snapTo: snapToChapter,
            },
            start: storyStart,
            trigger: atlas,
          },
        });

        if (handoffTargets.length > 0) {
          timeline.to(
            handoffTargets,
            {
              duration: 1,
              ease: "none",
              y: () => -atlasMotionLimits(window.innerWidth).heroY,
            },
            0,
          );
        }
        if (camera) {
          timeline.fromTo(
            camera,
            { scale: 1, y: 0 },
            {
              duration: 1,
              ease: "none",
              scale: () => atlasMotionLimits(window.innerWidth).imageScale,
              y: () => atlasMotionLimits(window.innerWidth).imageY,
            },
            0,
          );
        }
        if (sweep) {
          timeline.fromTo(sweep, { y: 0 }, {
            duration: 1,
            ease: "none",
            y: () => (atlas.querySelector<HTMLElement>(".human-atlas-stage")?.clientHeight ?? 600) * 0.76,
          }, 0);
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
        // Le CSS ne masque les chapitres qu'une fois le séquençage réellement installé.
        atlas.setAttribute("data-scroll-sequenced", "true");
      } catch {
        cleanup(true);
        try {
          terminateEntrance.current?.();
        } catch {
          // Continuous final-state cleanup below must still run.
        }
        settleHeroBootstrap();
      }

      return () => cleanup(false);
    },
    { dependencies: [disabled, motionAllowed, progressRef], revertOnUpdate: true, scope },
  );

  return activeScene;
}
