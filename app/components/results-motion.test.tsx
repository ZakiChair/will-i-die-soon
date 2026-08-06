import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

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

import { I18nProvider } from "../i18n/context";
import { Results } from "./results";

function useMockGSAP(
  callback: () => void,
  options: { readonly dependencies: ReadonlyArray<unknown> },
) {
  const callbackRef = useRef(callback);
  const [decorativeMotion, selector] = options.dependencies;

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useLayoutEffect(() => {
    callbackRef.current();
    return mockRevert;
  }, [decorativeMotion, selector]);

  return { context: { revert: mockRevert }, ...options };
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  mockUseGSAP.mockImplementation(useMockGSAP);
});

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("registers only newly mounted private-result bands after the handoff", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <Results
        answers={{ adolescent_nicotine_support: "find_service" }}
        assessmentDepth="detailed"
        confirmedLabs={[]}
        profile={{ age: 15, countryCode: "CH", assistedMinor: true }}
        onRestart={vi.fn()}
      />
    </I18nProvider>,
  );

  const initialTargets = mockFromTo.mock.calls.map(([target]) => target as HTMLElement);
  expect(initialTargets.map(({ className }) => className)).toEqual([
    "results__intro",
    "private-results-handoff",
  ]);

  await user.click(screen.getByRole("button", { name: /show my private results/i }));

  const mountedTargets = mockFromTo.mock.calls
    .slice(initialTargets.length)
    .map(([target]) => target as HTMLElement);
  expect(mountedTargets.map(({ className }) => className)).toEqual([
    "results-canopy",
    "habits-map",
    "result-tools",
  ]);
  expect(mountedTargets.some((target) => initialTargets.includes(target))).toBe(false);
});
