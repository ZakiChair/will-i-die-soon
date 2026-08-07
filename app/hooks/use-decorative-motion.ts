"use client";

import { useEffect, useState } from "react";

export type DecorativeMotionStatus =
  | "pending"
  | "running"
  | "hidden"
  | "reduced"
  | "unsupported";

export type SettledDecorativeMotionStatus = Exclude<DecorativeMotionStatus, "pending">;

export type DecorativeMotionObservation = Readonly<{
  status: SettledDecorativeMotionStatus;
  dispose(): void;
}>;

const noop = () => undefined;

export function readDecorativeMotionStatus(): SettledDecorativeMotionStatus {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "unsupported";
  }
  try {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    return media.matches ? "reduced" : document.hidden ? "hidden" : "running";
  } catch {
    return "unsupported";
  }
}

export function observeDecorativeMotion(
  onChange: (status: SettledDecorativeMotionStatus) => void,
): DecorativeMotionObservation {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return { status: "unsupported", dispose: noop };
  }

  let media: MediaQueryList;
  try {
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      typeof media.addEventListener !== "function" ||
      typeof media.removeEventListener !== "function"
    ) {
      return { status: "unsupported", dispose: noop };
    }
  } catch {
    return { status: "unsupported", dispose: noop };
  }

  const currentStatus = (): SettledDecorativeMotionStatus =>
    media.matches ? "reduced" : document.hidden ? "hidden" : "running";
  const emit = () => onChange(currentStatus());
  let disposed = false;
  let mediaInstalled = false;
  let visibilityInstalled = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (mediaInstalled) {
      try {
        media.removeEventListener("change", emit);
      } catch {
        // Best-effort cleanup after partial observer setup.
      }
    }
    if (visibilityInstalled) {
      try {
        document.removeEventListener("visibilitychange", emit);
      } catch {
        // Best-effort cleanup after partial observer setup.
      }
    }
  };

  try {
    mediaInstalled = true;
    media.addEventListener("change", emit);
    visibilityInstalled = true;
    document.addEventListener("visibilitychange", emit);
  } catch {
    dispose();
    return { status: "unsupported", dispose: noop };
  }

  return { status: currentStatus(), dispose };
}

export function useDecorativeMotionStatus(): DecorativeMotionStatus {
  const [status, setStatus] = useState<DecorativeMotionStatus>("pending");

  useEffect(() => {
    const updateStatus = (nextStatus: SettledDecorativeMotionStatus) => setStatus(nextStatus);
    const observation = observeDecorativeMotion(updateStatus);
    updateStatus(observation.status);
    return observation.dispose;
  }, []);

  return status;
}

export function useDecorativeMotion(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const updateAllowed = (status: SettledDecorativeMotionStatus) => {
      setAllowed(status === "running");
    };
    const observation = observeDecorativeMotion(updateAllowed);
    updateAllowed(observation.status);
    return observation.dispose;
  }, []);

  return allowed;
}
