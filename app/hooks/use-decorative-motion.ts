"use client";

import { useEffect, useState } from "react";

export type DecorativeMotionStatus =
  | "pending"
  | "running"
  | "hidden"
  | "reduced"
  | "unsupported";

export function useDecorativeMotionStatus(): DecorativeMotionStatus {
  const [status, setStatus] = useState<DecorativeMotionStatus>("pending");

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      const unsupportedTimer = window.setTimeout(() => setStatus("unsupported"), 0);
      return () => window.clearTimeout(unsupportedTimer);
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setStatus(media.matches ? "reduced" : document.hidden ? "hidden" : "running");
    };

    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return status;
}

export function useDecorativeMotion(): boolean {
  return useDecorativeMotionStatus() === "running";
}
