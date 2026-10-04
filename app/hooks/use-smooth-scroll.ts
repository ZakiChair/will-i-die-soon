"use client";

import type Lenis from "lenis";
import { useEffect, type RefObject } from "react";

import { gsap, ScrollTrigger } from "../lib/gsap-client";
import {
  observeDecorativeMotion,
  type SettledDecorativeMotionStatus,
} from "./use-decorative-motion";

type SmoothScroller = Pick<Lenis, "destroy" | "on" | "raf" | "scrollTo">;

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const LINK_SCROLL_SECONDS = 1.1;
// Valeurs par défaut de GSAP, rétablies quand Lenis ne pilote plus l'horloge.
const DEFAULT_LAG_SMOOTHING = [500, 33] as const;

function prefersFinePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(FINE_POINTER_QUERY).matches;
  } catch {
    return false;
  }
}

function internalTarget(event: MouseEvent, root: HTMLElement): HTMLElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
  if (!(link instanceof HTMLAnchorElement) || !root.contains(link) || link.hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(link.hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * Inertie de molette au bureau seulement ; le toucher garde le défilement natif.
 * Les liens internes glissent vers leur cible au lieu de sauter, sauf en mouvement réduit.
 */
export function useSmoothScroll(scope: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    let disposed = false;
    let loading = false;
    let motionStatus: SettledDecorativeMotionStatus = "unsupported";
    let lenis: SmoothScroller | null = null;
    let tick: ((time: number) => void) | null = null;

    const canSmooth = () => !disposed && motionStatus === "running" && prefersFinePointer();

    const stop = () => {
      if (tick) {
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(...DEFAULT_LAG_SMOOTHING);
        tick = null;
      }
      const instance = lenis;
      lenis = null;
      try {
        instance?.destroy();
      } catch {
        // Le défilement natif reprend même si la destruction échoue.
      }
    };

    const start = () => {
      if (lenis || loading || !canSmooth() || typeof gsap.ticker?.add !== "function") return;
      loading = true;
      import("lenis")
        .then(({ default: LenisScroller }) => {
          loading = false;
          if (lenis || !canSmooth()) return;
          const instance = new LenisScroller({
            allowNestedScroll: true,
            anchors: false,
            autoRaf: false,
            lerp: 0.1,
            smoothWheel: true,
            syncTouch: false,
          });
          if (typeof ScrollTrigger.update === "function") instance.on("scroll", ScrollTrigger.update);
          const advance = (time: number) => instance.raf(time * 1000);
          gsap.ticker.add(advance);
          gsap.ticker.lagSmoothing(0);
          tick = advance;
          lenis = instance;
        })
        .catch(() => {
          loading = false;
        });
    };

    const onClick = (event: MouseEvent) => {
      if (motionStatus !== "running") return;
      const target = internalTarget(event, root);
      if (!target) return;
      if (lenis) {
        event.preventDefault();
        lenis.scrollTo(target, { duration: LINK_SCROLL_SECONDS });
      } else if (typeof target.scrollIntoView === "function") {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        return;
      }
      if (target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
    };

    const observation = observeDecorativeMotion((status) => {
      motionStatus = status;
      if (status === "running") start();
      else stop();
    });
    motionStatus = observation.status;
    start();
    root.addEventListener("click", onClick);

    return () => {
      disposed = true;
      root.removeEventListener("click", onClick);
      observation.dispose();
      stop();
    };
  }, [scope]);
}
