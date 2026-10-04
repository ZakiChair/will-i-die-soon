import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

// Lenis réel : seule l'horloge GSAP est simulée.
const { ticker } = vi.hoisted(() => ({
  ticker: { add: vi.fn(), lagSmoothing: vi.fn(), remove: vi.fn() },
}));

vi.mock("../lib/gsap-client", () => ({
  gsap: { ticker },
  ScrollTrigger: { update: vi.fn() },
}));

import { useSmoothScroll } from "./use-smooth-scroll";

let motion: MotionEnvironment | undefined;
const initialScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");

function SmoothProbe() {
  const scope = useRef<HTMLDivElement>(null);
  useSmoothScroll(scope);

  return <div ref={scope} />;
}

beforeEach(() => {
  motion = installMotionEnvironment();
  const reducedMedia = motion.media;
  vi.stubGlobal("matchMedia", vi.fn((query: string) => (
    query === "(prefers-reduced-motion: reduce)"
      ? reducedMedia
      : { matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  )));
  vi.stubGlobal("ResizeObserver", class {
    disconnect() {}
    observe() {}
    unobserve() {}
  });
});

afterEach(() => {
  vi.useRealTimers();
  motion?.restore();
  motion = undefined;
  vi.clearAllMocks();
  if (initialScrollY) Object.defineProperty(window, "scrollY", initialScrollY);
  document.documentElement.removeAttribute("class");
});

test("ne laisse pas la classe lenis sur <html> quand l'accueil se démonte juste après un défilement natif", async () => {
  const view = render(<SmoothProbe />);
  await vi.waitFor(() => expect(document.documentElement).toHaveClass("lenis"));

  vi.useFakeTimers();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 240 });
  window.dispatchEvent(new Event("scroll"));
  view.unmount();

  expect(document.documentElement).not.toHaveClass("lenis");
  vi.advanceTimersByTime(1000);
  expect(document.documentElement.className).not.toMatch(/\blenis\b/);
});
