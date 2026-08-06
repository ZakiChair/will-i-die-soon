import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useLayoutEffect, useRef } from "react";
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

function FocusedHeading() {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <h1 ref={heading} tabIndex={-1}>
      Consent
    </h1>
  );
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

test("keeps descendant focus stable when the screen entrance starts", async () => {
  installMotionPreference();
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => callback(), [callback]);
    return { context: { revert: mockRevert } };
  });
  mockFromTo.mockImplementation((target, fromVars) => {
    if (
      target instanceof HTMLElement &&
      typeof fromVars === "object" &&
      fromVars !== null &&
      "autoAlpha" in fromVars &&
      fromVars.autoAlpha === 0
    ) {
      target.querySelector<HTMLElement>(":focus")?.blur();
    }
  });

  render(
    <MotionScreen screenKey="consent">
      <FocusedHeading />
    </MotionScreen>,
  );

  await waitFor(() => expect(mockFromTo).toHaveBeenCalled());
  expect(screen.getByRole("heading", { name: "Consent" })).toHaveFocus();
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
