import { render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
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

import { MotionScreen } from "./motion-screen";

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

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("renders visible content and reveals it through a scoped GSAP context", () => {
  installMotionPreference();
  mockUseGSAP.mockImplementation((callback, options) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert }, ...options };
  });

  render(
    <MotionScreen screenKey="consent">
      <h1>Consent</h1>
    </MotionScreen>,
  );

  expect(screen.getByRole("heading", { name: "Consent" })).toBeVisible();
  expect(mockUseGSAP).toHaveBeenLastCalledWith(
    expect.any(Function),
    expect.objectContaining({ scope: expect.anything() }),
  );
  expect(mockFromTo).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({ autoAlpha: 1 }),
  );
});

test("skips screen tweens when reduced motion is preferred", () => {
  installMotionPreference(true);
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert } };
  });

  render(
    <MotionScreen screenKey="consent">
      <h1>Consent</h1>
    </MotionScreen>,
  );

  expect(screen.getByRole("heading", { name: "Consent" })).toBeVisible();
  expect(mockFromTo).not.toHaveBeenCalled();
});

test("reverts the animation context on unmount", () => {
  installMotionPreference();
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert } };
  });

  const { unmount } = render(
    <MotionScreen screenKey="consent">
      <h1>Consent</h1>
    </MotionScreen>,
  );
  unmount();

  expect(mockRevert).toHaveBeenCalled();
});
