"use client";

import { useEffect, useState } from "react";

export function useDecorativeMotion(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(!media.matches && !document.hidden);

    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return allowed;
}
