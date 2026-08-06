"use client";

import { useRef, type ReactNode } from "react";

import { useDecorativeMotion } from "../hooks/use-decorative-motion";
import { gsap, useGSAP } from "../lib/gsap-client";

type MotionScreenProps = Readonly<{
  screenKey: string;
  children: ReactNode;
}>;

export function MotionScreen({ screenKey, children }: MotionScreenProps) {
  const scope = useRef<HTMLDivElement>(null);
  const decorativeMotion = useDecorativeMotion();

  useGSAP(
    () => {
      if (!decorativeMotion || !scope.current) return;

      gsap.fromTo(
        scope.current,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, duration: 0.45, ease: "power2.out", y: 0 },
      );
    },
    { dependencies: [decorativeMotion], revertOnUpdate: true, scope },
  );

  return <div ref={scope} data-motion-screen={screenKey}>{children}</div>;
}
