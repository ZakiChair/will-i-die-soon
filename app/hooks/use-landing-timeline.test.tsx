import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { afterEach, expect, test, vi } from "vitest";

const {
  mockFromTo,
  mockRevert,
  mockSet,
  mockTimeline,
  mockTo,
  mockUseGSAP,
} = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockRevert: vi.fn(),
  mockSet: vi.fn(),
  mockTimeline: vi.fn(),
  mockTo: vi.fn(),
  mockUseGSAP: vi.fn(),
}));

vi.mock("../lib/gsap-client", () => ({
  gsap: { timeline: mockTimeline },
  ScrollTrigger: {},
  useGSAP: mockUseGSAP,
}));

import {
  atlasSceneFromProgress,
  useLandingTimeline,
} from "./use-landing-timeline";

type ScrollTriggerConfig = Readonly<{
  onLeaveBack: () => void;
  onUpdate: (trigger: { progress: number }) => void;
  scrub: number;
  trigger: Element;
}>;

function installMotionPreference(reduced = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
}

function TimelineProbe() {
  const scope = useRef<HTMLDivElement>(null);
  const activeScene = useLandingTimeline(scope);

  return (
    <div ref={scope}>
      <output role="status">{activeScene}</output>
      <section className="human-atlas-scroll">
        <div className="human-atlas-stage" />
        <svg aria-hidden="true">
          <path data-strength-signal="true" />
          <path data-strength-signal="true" />
        </svg>
      </section>
    </div>
  );
}

function scrollTriggerConfig(): ScrollTriggerConfig {
  const options = mockTimeline.mock.calls.at(-1)?.[0] as
    | { scrollTrigger?: ScrollTriggerConfig }
    | undefined;
  if (!options?.scrollTrigger) throw new Error("Missing ScrollTrigger configuration");
  return options.scrollTrigger;
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("clamps progress into the four canonical atlas scenes", () => {
  expect(atlasSceneFromProgress(-1)).toBe("breath");
  expect(atlasSceneFromProgress(0)).toBe("breath");
  expect(atlasSceneFromProgress(0.34)).toBe("strength");
  expect(atlasSceneFromProgress(0.67)).toBe("sleep");
  expect(atlasSceneFromProgress(1)).toBe("energy");
  expect(atlasSceneFromProgress(2)).toBe("energy");
});

test("drives scene state from one scoped scrubbed timeline and rewinds to breath", () => {
  installMotionPreference();
  mockSet.mockReturnThis();
  mockTo.mockReturnThis();
  mockFromTo.mockReturnThis();
  mockTimeline.mockReturnValue({
    fromTo: mockFromTo,
    set: mockSet,
    to: mockTo,
  });
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(() => {
      callback();
      return mockRevert;
    }, [callback]);
    return { context: { revert: mockRevert } };
  });

  const { container, unmount } = render(<TimelineProbe />);

  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(scrollTriggerConfig()).toEqual(
    expect.objectContaining({
      scrub: 0.8,
      trigger: container.querySelector(".human-atlas-scroll"),
    }),
  );
  expect(mockFromTo).toHaveBeenCalledWith(
    container.querySelectorAll("[data-strength-signal]"),
    expect.objectContaining({ strokeDashoffset: 1 }),
    expect.objectContaining({ duration: 0.25, strokeDashoffset: 0 }),
    0.25,
  );
  expect(mockSet).toHaveBeenCalledWith(
    container.querySelectorAll("[data-strength-signal]"),
    { strokeDashoffset: 0 },
    1,
  );

  act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }));
  expect(screen.getByRole("status")).toHaveTextContent("sleep");

  act(() => scrollTriggerConfig().onLeaveBack());
  expect(screen.getByRole("status")).toHaveTextContent("breath");

  unmount();
  expect(mockRevert).toHaveBeenCalled();
});

test("does not create the scrub or strength signal motion for reduced motion", () => {
  installMotionPreference(true);
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(callback, [callback]);
    return { context: { revert: mockRevert } };
  });

  render(<TimelineProbe />);

  expect(screen.getByRole("status")).toHaveTextContent("breath");
  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockFromTo).not.toHaveBeenCalled();
});

test("does not create a timeline when matchMedia is unavailable", () => {
  Reflect.deleteProperty(window, "matchMedia");
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  mockUseGSAP.mockImplementation((callback) => {
    useLayoutEffect(callback, [callback]);
    return { context: { revert: mockRevert } };
  });

  render(<TimelineProbe />);

  expect(screen.getByRole("status")).toHaveTextContent("breath");
  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockFromTo).not.toHaveBeenCalled();
});
