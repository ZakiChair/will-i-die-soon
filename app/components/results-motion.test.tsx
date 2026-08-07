import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useMemo, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

type TimelineDouble = Readonly<{
  fromTo: ReturnType<typeof vi.fn<(target: unknown, from: Record<string, unknown>, to: Record<string, unknown>) => TimelineDouble>>;
  kill: ReturnType<typeof vi.fn>;
}>;

type TriggerConfig = Readonly<{
  animation: TimelineDouble;
  trigger: Element;
}>;

const { mockRefresh, mockRevert, mockTimeline, mockTriggerCreate, mockUseGSAP } = vi.hoisted(() => {
  const mockTimeline = vi.fn(() => {
    const timeline: TimelineDouble = {
      fromTo: vi.fn((...args) => {
        void args;
        return timeline;
      }),
      kill: vi.fn(),
    };
    return timeline;
  });

  return {
    mockRefresh: vi.fn(),
    mockRevert: vi.fn(),
    mockTimeline,
    mockTriggerCreate: vi.fn((config: TriggerConfig) => {
      void config;
      return { kill: vi.fn() };
    }),
    mockUseGSAP: vi.fn(),
  };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: { timeline: mockTimeline },
  ScrollTrigger: { create: mockTriggerCreate, refresh: mockRefresh },
  useGSAP: mockUseGSAP,
}));

import { I18nProvider } from "../i18n/context";
import { Results } from "./results";

let rootTop = 0;
let animationFrames: FrameRequestCallback[] = [];

function useMockGSAP(
  callback: (context: { revert: typeof mockRevert }) => void | (() => void),
  options: { readonly dependencies: ReadonlyArray<unknown> },
) {
  const callbackRef = useRef(callback);
  const context = useMemo(() => ({ revert: mockRevert }), []);
  const [mode, selector] = options.dependencies;

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useLayoutEffect(() => {
    const cleanup = callbackRef.current(context);
    return () => {
      mockRevert();
      cleanup?.();
    };
  }, [context, mode, selector]);

  return { context, ...options };
}

beforeEach(() => {
  rootTop = window.innerHeight + 100;
  animationFrames = [];
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    bottom: window.innerHeight + 200,
    height: 100,
    left: 0,
    right: 100,
    top: rootTop,
    width: 100,
    x: 0,
    y: rootTop,
    toJSON: () => ({}),
  }));
  mockUseGSAP.mockImplementation(useMockGSAP);
});

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("registers only newly mounted private-result bands and refreshes once next frame", async () => {
  const user = userEvent.setup();
  const { unmount } = render(
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

  const initialTargets = mockTriggerCreate.mock.calls.map(
    ([{ trigger }]) => trigger as HTMLElement,
  );
  expect(initialTargets.map(({ className }) => className)).toEqual([
    "results__intro",
    "private-results-handoff",
  ]);

  rootTop = 0;
  await user.click(screen.getByRole("button", { name: /show my private results/i }));

  const mountedTargets = mockTriggerCreate.mock.calls
    .slice(initialTargets.length)
    .map(([{ trigger }]) => trigger as HTMLElement);
  expect(mountedTargets.map(({ className }) => className)).toEqual([
    "section-heading",
    "habits-map__heading",
    "habits-map__cards",
    "result-tools",
  ]);
  expect(mountedTargets.some((target) => initialTargets.includes(target))).toBe(false);
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(requestAnimationFrame).toHaveBeenCalledOnce();

  animationFrames[0](0);
  expect(mockRefresh).toHaveBeenCalledOnce();

  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
});

test("keeps the private-results heading focused when its deferred reveal starts", async () => {
  const user = userEvent.setup();
  const focusAtRevealInitialization = vi.fn();
  const deferredRevealInitialized = vi.fn();
  mockTriggerCreate.mockImplementation(({ animation, trigger }) => {
    if (
      !(trigger instanceof HTMLElement) ||
      !trigger.classList.contains("section-heading")
    ) return { kill: vi.fn() };

    window.setTimeout(() => {
      const focusedDescendant = trigger.querySelector<HTMLElement>(":focus");
      focusAtRevealInitialization(focusedDescendant);
      const usesAutoAlpha = animation.fromTo.mock.calls.some(
        ([, fromVars, toVars]) => [fromVars, toVars].some(
          (vars) => typeof vars === "object" && vars !== null && "autoAlpha" in vars,
        ),
      );
      if (usesAutoAlpha) focusedDescendant?.blur();
      deferredRevealInitialized();
    }, 0);
    return { kill: vi.fn() };
  });

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

  await user.click(screen.getByRole("button", { name: /show my private results/i }));

  const heading = screen.getByRole("heading", {
    name: /four health pillars you can inspect/i,
  });
  await waitFor(() => expect(deferredRevealInitialized).toHaveBeenCalledOnce());

  expect(focusAtRevealInitialization).toHaveBeenCalledWith(heading);
  expect(heading).toHaveFocus();
});
