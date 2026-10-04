"use client";

import { useEffect, type RefObject } from "react";

import {
  observeDecorativeMotion,
  type SettledDecorativeMotionStatus,
} from "./use-decorative-motion";

type HeaderState = "visible" | "hidden";

const TOP_ZONE = 24;
const SCROLLED_OFFSET = 8;
const DIRECTION_THRESHOLD = 8;

function storyIsPinned(scope: HTMLElement): boolean {
  const atlas = scope.querySelector<HTMLElement>('.human-atlas-scroll[data-scroll-sequenced="true"]');
  if (!atlas) return false;
  const bounds = atlas.getBoundingClientRect();
  return bounds.top <= 0 && bounds.bottom >= window.innerHeight;
}

/** L'en-tête collant s'efface pendant la lecture et revient dès que l'on remonte. */
export function useLandingHeader(scope: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = scope.current;
    const header = root?.querySelector<HTMLElement>(".landing__header");
    if (!root || !header) return;

    let motionStatus: SettledDecorativeMotionStatus = "unsupported";
    let state: HeaderState = "visible";
    let lastY = Number.isFinite(window.scrollY) ? window.scrollY : 0;
    let travel = 0;

    const write = (y: number) => {
      header.dataset.header = state;
      if (y > SCROLLED_OFFSET) header.dataset.headerScrolled = "true";
      else header.removeAttribute("data-header-scrolled");
    };

    const update = () => {
      const y = Number.isFinite(window.scrollY) ? window.scrollY : 0;
      const delta = y - lastY;
      lastY = y;
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;

      let next = state;
      if (motionStatus !== "running" || y <= TOP_ZONE) next = "visible";
      else if (storyIsPinned(root)) next = "hidden";
      else if (travel >= DIRECTION_THRESHOLD) next = "hidden";
      else if (travel <= -DIRECTION_THRESHOLD) next = "visible";

      if (next !== state) {
        state = next;
        travel = 0;
      }
      write(y);
    };

    const observation = observeDecorativeMotion((status) => {
      motionStatus = status;
      update();
    });
    motionStatus = observation.status;
    write(lastY);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      observation.dispose();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      header.removeAttribute("data-header");
      header.removeAttribute("data-header-scrolled");
    };
  }, [scope]);
}
