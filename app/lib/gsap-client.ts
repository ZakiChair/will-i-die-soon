"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP);

function supportsMatchMedia(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;

  try {
    window.matchMedia("(prefers-reduced-motion: reduce)");
    return true;
  } catch {
    return false;
  }
}

if (supportsMatchMedia()) {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger, useGSAP };
