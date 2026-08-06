import { render } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { afterEach, expect, test, vi } from "vitest";

const { mockFromTo, mockRevert, mockUseGSAP } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockRevert: vi.fn(),
  mockUseGSAP: vi.fn(),
}));

vi.mock("../lib/gsap-client", () => ({
  gsap: { fromTo: mockFromTo },
  ScrollTrigger: {},
  useGSAP: mockUseGSAP,
}));

import { useSectionReveal } from "./use-section-reveal";

function installMotionPreference(initiallyReduced = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: initiallyReduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
}

function RevealProbe() {
  const scope = useRef<HTMLElement>(null);
  useSectionReveal(scope);

  return (
    <section ref={scope}>
      <h2 data-reveal>First</h2>
      <p data-reveal>Second</p>
    </section>
  );
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("creates one ScrollTrigger-backed reveal tween for each scoped target", () => {
  installMotionPreference();
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert } };
  });

  render(<RevealProbe />);

  expect(mockFromTo).toHaveBeenCalledTimes(2);
  expect(mockFromTo).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      scrollTrigger: expect.objectContaining({ start: "top 86%", once: true }),
    }),
  );
});

test("does not create reveal tweens when reduced motion is preferred", () => {
  installMotionPreference(true);
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert } };
  });

  render(<RevealProbe />);

  expect(mockFromTo).not.toHaveBeenCalled();
});
