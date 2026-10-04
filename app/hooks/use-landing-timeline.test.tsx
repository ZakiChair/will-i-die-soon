import { act, render, screen } from "@testing-library/react";
import { StrictMode, useLayoutEffect, useMemo, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

type TimelineCall = Readonly<{
  method: "fromTo" | "set" | "to";
  targets: Element[];
  from?: Record<string, unknown>;
  to: Record<string, unknown>;
  position?: number | string;
}>;

type TimelineDouble = Readonly<{
  calls: TimelineCall[];
  kill: ReturnType<typeof vi.fn>;
  options: Record<string, unknown>;
}> & {
  fromTo: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
};

const {
  continuousTweenError,
  contexts,
  mockGsap,
  mockGsapSet,
  mockScrollTrigger,
  mockTimeline,
  mockTriggerCreate,
  mockUseGSAP,
  timelines,
  useGsapConfigs,
} = vi.hoisted(() => {
  const continuousTweenError = { current: false };
  const timelines: TimelineDouble[] = [];
  const contexts: Array<{ revert: ReturnType<typeof vi.fn> }> = [];
  const useGsapConfigs: Array<Record<string, unknown>> = [];
  const elements = (targets: Element | Iterable<Element>): Element[] => (
    targets instanceof Element ? [targets] : Array.from(targets)
  );
  const apply = (targets: Element[], values: Record<string, unknown>) => {
    for (const target of targets) {
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) continue;
      if (values.opacity !== undefined) target.style.opacity = String(values.opacity);
      if (values.scaleX !== undefined) {
        target.style.transform = `scaleX(${String(values.scaleX)})`;
      }
      if (values.y !== undefined) target.style.transform = `translateY(${String(values.y)}px)`;
      if (values.willChange !== undefined) {
        target.style.willChange = String(values.willChange);
      } else if (values.opacity !== undefined) {
        target.style.willChange = "opacity, transform";
      }
    }
  };
  const mockTimeline = vi.fn((options: Record<string, unknown> = {}) => {
    const calls: TimelineCall[] = [];
    const timeline = {
      calls,
      fromTo: vi.fn((targets, from, to, position) => {
        const nodes = elements(targets);
        calls.push({ method: "fromTo", targets: nodes, from, to, position });
        apply(nodes, from);
        return timeline;
      }),
      kill: vi.fn(),
      options,
      set: vi.fn((targets, to, position) => {
        const nodes = elements(targets);
        calls.push({ method: "set", targets: nodes, to, position });
        apply(nodes, to);
        return timeline;
      }),
      to: vi.fn((targets, to, position) => {
        const nodes = elements(targets);
        calls.push({ method: "to", targets: nodes, to, position });
        if ("scrollTrigger" in options && continuousTweenError.current) {
          apply(nodes, to);
          throw new Error("cannot add continuous tween");
        }
        return timeline;
      }),
    } as TimelineDouble;
    timelines.push(timeline);
    return timeline;
  });
  const mockGsapSet = vi.fn((targets, values) => {
    apply(elements(targets), values);
  });
  const mockTriggerCreate = vi.fn();
  const mockGsap = { set: mockGsapSet, timeline: mockTimeline };
  const mockScrollTrigger = { create: mockTriggerCreate };
  const mockUseGSAP = vi.fn((callback, config: Record<string, unknown>) => {
    const context = useMemo(() => ({ revert: vi.fn() }), []);
    contexts.push(context);
    useGsapConfigs.push(config);
    useLayoutEffect(() => {
      const cleanup = callback(context);
      return () => {
        if (typeof cleanup === "function") cleanup();
        context.revert();
      };
    // The test double intentionally follows the explicit useGSAP dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, config.dependencies as readonly unknown[]);
    return { context, contextSafe: (fn: unknown) => fn };
  });

  return {
    continuousTweenError,
    contexts,
    mockGsap,
    mockGsapSet,
    mockScrollTrigger,
    mockTimeline,
    mockTriggerCreate,
    mockUseGSAP,
    timelines,
    useGsapConfigs,
  };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: mockGsap,
  ScrollTrigger: mockScrollTrigger,
  useGSAP: mockUseGSAP,
}));

import {
  atlasMotionLimits,
  atlasSceneFromProgress,
  snapAtlasProgress,
  useLandingTimeline,
} from "./use-landing-timeline";

type SnapTrigger = Readonly<{
  direction?: number;
  end?: number;
  scroll?: () => number;
  start?: number;
}>;

type ScrollTriggerConfig = Readonly<{
  invalidateOnRefresh: boolean;
  onLeaveBack: () => void;
  onRefresh: (trigger: { progress: number }) => void;
  onUpdate: (trigger: { progress: number }) => void;
  scrub: number;
  snap: Readonly<{
    delay: number;
    duration: Readonly<{ min: number; max: number }>;
    ease: string;
    inertia: boolean;
    snapTo: (value: number, trigger?: SnapTrigger) => number;
  }>;
  start: unknown;
  trigger: Element;
}>;

function resolvedTweenNumber(value: unknown): number {
  if (typeof value !== "function") {
    throw new Error("Expected a refreshable functional tween value");
  }
  return Number(value());
}

let motion: MotionEnvironment | undefined;

function TimelineProbe({
  chapters = false,
  camera = true,
  disabled = false,
  fill = true,
  hero = true,
}: {
  chapters?: boolean;
  camera?: boolean;
  disabled?: boolean;
  fill?: boolean;
  hero?: boolean;
}) {
  const scope = useRef<HTMLElement>(null);
  const activeScene = useLandingTimeline(scope, disabled);

  return (
    <section ref={scope}>
      <output role="status">{activeScene}</output>
      {hero ? (
        <div className="landing__atlas-hero">
          <p data-hero-item><span data-hero-handoff>Eyebrow</span></p>
          <div data-hero-title-mask>
            <h1 data-hero-item><span data-hero-handoff data-hero-title>Title</span></h1>
          </div>
          <p data-hero-item><span data-hero-handoff>Body</span></p>
          <button type="button">Action</button>
          <p data-hero-item><span data-hero-handoff>Hint</span></p>
        </div>
      ) : null}
      <section className="human-atlas-scroll">
        <div className="human-atlas-stage">
          <div className="human-atlas-media">
            {camera ? <span data-atlas-camera /> : null}
          </div>
          {fill ? <span data-atlas-progress-fill /> : null}
          <span data-atlas-sweep />
        </div>
        <svg aria-hidden="true">
          <path data-strength-signal="true" />
          <path data-strength-signal="true" />
        </svg>
        {chapters ? ["sleep", "breath", "strength", "energy"].map((id) => (
          <section key={id} className="human-atlas-scene" data-atlas-scene={id} />
        )) : null}
      </section>
    </section>
  );
}

function entranceTimeline(): TimelineDouble {
  const timeline = timelines.find((candidate) => !("scrollTrigger" in candidate.options));
  if (!timeline) throw new Error("Missing entrance timeline");
  return timeline;
}

function continuousTimeline(): TimelineDouble {
  const timeline = timelines.find((candidate) => "scrollTrigger" in candidate.options);
  if (!timeline) throw new Error("Missing continuous timeline");
  return timeline;
}

function continuousTimelines(): TimelineDouble[] {
  return timelines.filter((candidate) => "scrollTrigger" in candidate.options);
}

function scrollTriggerConfig(): ScrollTriggerConfig {
  return continuousTimeline().options.scrollTrigger as ScrollTriggerConfig;
}

function startPendingBootstrap(): void {
  document.documentElement.dataset.motionBootstrap = "pending";
}

function heroItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-hero-item]"));
}

function expectFinalHeroInlineState(): void {
  for (const item of heroItems()) {
    expect(item.style.opacity).toBe("");
    expect(item.style.transform).toBe("");
    expect(item.style.visibility).toBe("");
    expect(item.style.willChange).toBe("");
    expect(item.style.clipPath).toBe("");
  }
}

beforeEach(() => {
  continuousTweenError.current = false;
  Object.assign(mockGsap, { set: mockGsapSet, timeline: mockTimeline });
  Object.assign(mockScrollTrigger, { create: mockTriggerCreate });
  document.documentElement.removeAttribute("data-motion-bootstrap");
  motion = installMotionEnvironment();
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  timelines.length = 0;
  contexts.length = 0;
  useGsapConfigs.length = 0;
  document.documentElement.removeAttribute("data-motion-bootstrap");
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("clamps progress into the four landing story scenes", () => {
  expect(atlasSceneFromProgress(-1)).toBe("sleep");
  expect(atlasSceneFromProgress(0)).toBe("sleep");
  expect(atlasSceneFromProgress(0.34)).toBe("breath");
  expect(atlasSceneFromProgress(0.67)).toBe("strength");
  expect(atlasSceneFromProgress(1)).toBe("energy");
  expect(atlasSceneFromProgress(2)).toBe("energy");
});

test("selects the exact compact Atlas camera limits at the 850 pixel boundary", () => {
  expect(atlasMotionLimits(1440)).toEqual({ heroY: 36, imageScale: 1.24, imageY: -42 });
  expect(atlasMotionLimits(851)).toEqual({ heroY: 36, imageScale: 1.24, imageY: -42 });
  expect(atlasMotionLimits(850)).toEqual({ heroY: 18, imageScale: 1.12, imageY: -18 });
});

test("runs the four-part entrance with an immediately available action before the guard can settle pending motion", () => {
  startPendingBootstrap();
  render(<TimelineProbe />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "ready");
  const items = heroItems();
  const calls = entranceTimeline().calls.filter((call) => call.method === "fromTo");
  expect(calls).toHaveLength(4);
  expect(calls.map(({ targets }) => targets)).toEqual(items.map((item) => [item]));
  expect(calls.map(({ from }) => from)).toEqual([
    { opacity: 0, y: 12 },
    { opacity: 0, y: 32 },
    { opacity: 0, y: 18 },
    { opacity: 0, y: 10 },
  ]);
  expect(calls.map(({ position, to }) => ({ position, to }))).toEqual([
    { position: 0, to: { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.08, to: { duration: 0.62, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.26, to: { duration: 0.42, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.38, to: { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 } },
  ]);
  expect(Math.max(...calls.map((call) => Number(call.position) + Number(call.to.duration))))
    .toBeCloseTo(0.70, 10);
});

test("removes bootstrap ownership and inline entrance state on completion", () => {
  startPendingBootstrap();
  render(<TimelineProbe />);

  const options = entranceTimeline().options as { onComplete?: () => void };
  act(() => options.onComplete?.());

  expect(document.documentElement).not.toHaveAttribute("data-motion-bootstrap");
  expectFinalHeroInlineState();
});

test("keeps entrance and continuous handoff motion on separate DOM layers", () => {
  startPendingBootstrap();
  render(<TimelineProbe />);

  const outerItems = heroItems();
  const handoffs = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-handoff]"));
  const continuousCalls = continuousTimeline().calls;
  const handoffCall = continuousCalls.find((call) => call.method === "to" && call.targets.length === 4);
  const opacityCalls = continuousCalls.filter((call) => call.to.opacity !== undefined);

  expect(handoffCall?.targets).toEqual(handoffs);
  expect(handoffCall?.to).toEqual(expect.objectContaining({ y: expect.any(Function) }));
  expect(outerItems.some((item) => handoffCall?.targets.includes(item))).toBe(false);
  expect(opacityCalls).toHaveLength(0);
  expect(continuousCalls.some((call) => call.to.visibility !== undefined)).toBe(false);
});

test("targets the Atlas image layer with responsive camera motion", () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(850);
  render(<TimelineProbe />);

  const camera = document.querySelector("[data-atlas-camera]");
  const media = document.querySelector(".human-atlas-media");
  const cameraCall = continuousTimeline().calls.find((call) => (
    call.method === "fromTo" && call.targets.includes(camera as Element)
  ));

  expect(cameraCall).toEqual(expect.objectContaining({
    from: { scale: 1, y: 0 },
    position: 0,
    targets: [camera],
    to: expect.objectContaining({
      duration: 1,
      ease: "none",
      scale: expect.any(Function),
      y: expect.any(Function),
    }),
  }));
  expect(resolvedTweenNumber(cameraCall?.to.scale)).toBe(1.12);
  expect(resolvedTweenNumber(cameraCall?.to.y)).toBe(-18);
  expect(cameraCall?.targets).not.toContain(media);
  expect((camera as HTMLElement).style.willChange).toBe("transform");
  const handoffCall = continuousTimeline().calls.find((call) => (
    call.method === "to" && call.targets.length === 4
  ));
  expect(resolvedTweenNumber(handoffCall?.to.y)).toBe(-18);
});

test.each([
  [1440, 320, { heroY: -36, imageScale: 1.24, imageY: -42 }, { heroY: -18, imageScale: 1.12, imageY: -18 }],
  [320, 1440, { heroY: -18, imageScale: 1.12, imageY: -18 }, { heroY: -36, imageScale: 1.24, imageY: -42 }],
] as const)(
  "re-evaluates Atlas amplitudes on refresh from %i to %i pixels",
  (initialWidth, refreshedWidth, initial, refreshed) => {
    let width = initialWidth;
    vi.spyOn(window, "innerWidth", "get").mockImplementation(() => width);
    render(<TimelineProbe />);

    const camera = document.querySelector("[data-atlas-camera]");
    const cameraCall = continuousTimeline().calls.find((call) => (
      call.method === "fromTo" && call.targets.includes(camera as Element)
    ));
    const handoffCall = continuousTimeline().calls.find((call) => (
      call.method === "to" && call.targets.length === 4
    ));

    expect(scrollTriggerConfig().invalidateOnRefresh).toBe(true);
    expect({
      heroY: resolvedTweenNumber(handoffCall?.to.y),
      imageScale: resolvedTweenNumber(cameraCall?.to.scale),
      imageY: resolvedTweenNumber(cameraCall?.to.y),
    }).toEqual(initial);

    width = refreshedWidth;
    act(() => scrollTriggerConfig().onRefresh({ progress: 0.6 }));

    expect({
      heroY: resolvedTweenNumber(handoffCall?.to.y),
      imageScale: resolvedTweenNumber(cameraCall?.to.scale),
      imageY: resolvedTweenNumber(cameraCall?.to.y),
    }).toEqual(refreshed);
    expect(continuousTimelines()).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("strength");
  },
);

test("preserves one scoped scrubbed Atlas timeline and strength-signal state", () => {
  render(<TimelineProbe />);

  expect(document.querySelector(".human-atlas-scroll")).toHaveAttribute("data-scroll-sequenced", "true");

  expect(useGsapConfigs.some((config) => (
    Array.isArray(config.dependencies) &&
    config.dependencies.length === 1 &&
    config.dependencies[0] === false
  ))).toBe(true);
  expect(useGsapConfigs.some((config) => (
    Array.isArray(config.dependencies) &&
    config.dependencies.length === 3 &&
    config.dependencies[0] === false &&
    config.dependencies[1] === true
  ))).toBe(true);
  expect(scrollTriggerConfig()).toEqual(expect.objectContaining({
    invalidateOnRefresh: true,
    scrub: 0.8,
    trigger: document.querySelector(".human-atlas-scroll"),
  }));
  expect(scrollTriggerConfig().onRefresh).toBe(scrollTriggerConfig().onUpdate);
  const strengthSignals = document.querySelectorAll("[data-strength-signal]");
  expect(continuousTimeline().calls).toContainEqual(expect.objectContaining({
    method: "fromTo",
    targets: Array.from(strengthSignals),
    from: expect.objectContaining({ strokeDashoffset: 1 }),
    to: expect.objectContaining({ duration: 0.25, strokeDashoffset: 0 }),
    position: 0.25,
  }));
  expect(continuousTimeline().calls).toContainEqual(expect.objectContaining({
    method: "set",
    targets: Array.from(strengthSignals),
    to: { strokeDashoffset: 0 },
    position: 1,
  }));

  act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }));
  expect(mockGsapSet).toHaveBeenCalledWith(
    document.querySelector("[data-atlas-progress-fill]"),
    { scaleX: 0.6 },
  );
  expect(screen.getByRole("status")).toHaveTextContent("strength");
  act(() => scrollTriggerConfig().onLeaveBack());
  expect(screen.getByRole("status")).toHaveTextContent("sleep");
});

test("keeps the progress fill within two percent of raw trigger progress", () => {
  render(<TimelineProbe />);
  const fill = document.querySelector<HTMLElement>("[data-atlas-progress-fill]");
  if (!fill) throw new Error("Missing progress fill");

  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    act(() => scrollTriggerConfig().onUpdate({ progress }));
    const renderedProgress = Number(fill.style.transform.match(/scaleX\(([^)]+)\)/)?.[1]);
    expect(Math.abs(renderedProgress - progress)).toBeLessThanOrEqual(0.02);
  }
});

test("keeps camera and fill targets optional", () => {
  expect(() => render(<TimelineProbe camera={false} fill={false} />)).not.toThrow();
  expect(() => act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }))).not.toThrow();
  expect(() => act(() => scrollTriggerConfig().onRefresh({ progress: 0.6 }))).not.toThrow();
  expect(screen.getByRole("status")).toHaveTextContent("strength");
});

test("settles an interrupted entrance on unmount and releases owned resources", () => {
  startPendingBootstrap();
  const { unmount } = render(<TimelineProbe />);
  const entrance = entranceTimeline();

  unmount();

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(entrance.kill).toHaveBeenCalledOnce();
  expect(contexts.some((context) => context.revert.mock.calls.length > 0)).toBe(true);
  expect(motion?.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalHeroInlineState();
});

test.each(["reduced", "hidden"] as const)(
  "settles an active entrance when motion becomes %s and never replays it",
  (status) => {
    startPendingBootstrap();
    render(<TimelineProbe />);
    expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(1);

    act(() => {
      if (status === "reduced") motion?.setReduced(true);
      else motion?.setHidden(true);
    });
    expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
    expectFinalHeroInlineState();

    act(() => {
      if (status === "reduced") motion?.setReduced(false);
      else motion?.setHidden(false);
    });
    expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(1);
  },
);

test("turns a Strict Mode replay into a terminal static state without replaying entrance", () => {
  startPendingBootstrap();

  render(<StrictMode><TimelineProbe /></StrictMode>);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(1);
  expectFinalHeroInlineState();
});

test.each([
  ["gsap.timeline", () => Reflect.set(mockGsap, "timeline", undefined)],
  ["ScrollTrigger.create", () => Reflect.set(mockScrollTrigger, "create", undefined)],
] as const)("settles pending before any GSAP mutation when %s is unavailable", (_name, disable) => {
  startPendingBootstrap();
  disable();

  render(<TimelineProbe />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(mockGsapSet).not.toHaveBeenCalled();
  expect(timelines).toHaveLength(0);
  expect(document.querySelector(".human-atlas-scroll")).not.toHaveAttribute("data-scroll-sequenced");
  expectFinalHeroInlineState();
});

test("settles pending and clears partial state when entrance setup throws", () => {
  startPendingBootstrap();
  mockTimeline.mockImplementationOnce(() => {
    throw new Error("timeline unavailable");
  });

  render(<TimelineProbe />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expectFinalHeroInlineState();
});

test("kills and reverts a partial continuous timeline when tween setup throws", () => {
  const partialTimeline = {
    calls: [],
    fromTo: vi.fn(),
    kill: vi.fn(),
    options: {},
    set: vi.fn(),
    to: vi.fn(() => {
      throw new Error("cannot add tween");
    }),
  } as TimelineDouble;
  mockTimeline.mockImplementationOnce((options) => {
    Object.assign(partialTimeline.options, options);
    timelines.push(partialTimeline);
    return partialTimeline;
  });

  render(<TimelineProbe />);

  expect(partialTimeline.kill).toHaveBeenCalledOnce();
  expect(contexts.some((context) => context.revert.mock.calls.length > 0)).toBe(true);
  expectFinalHeroInlineState();
});

test("terminally finalizes an active entrance when continuous setup throws", () => {
  startPendingBootstrap();
  continuousTweenError.current = true;

  render(<TimelineProbe />);

  const entrance = entranceTimeline();
  const continuous = continuousTimeline();
  const allHeroLayers = Array.from(document.querySelectorAll<HTMLElement>(
    "[data-hero-item], [data-hero-handoff]",
  ));

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(continuous.kill).toHaveBeenCalledOnce();
  expect(entrance.kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expect(document.querySelector(".human-atlas-scroll")).not.toHaveAttribute("data-scroll-sequenced");
  for (const node of allHeroLayers) {
    expect(node.style.opacity).toBe("");
    expect(node.style.transform).toBe("");
    expect(node.style.visibility).toBe("");
    expect(node.style.willChange).toBe("");
    expect(node.style.clipPath).toBe("");
  }

  continuousTweenError.current = false;
  act(() => motion?.setHidden(true));
  act(() => motion?.setHidden(false));
  expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(1);
});

test("recreates only continuous motion at raw progress after a completed entrance is hidden", () => {
  startPendingBootstrap();
  render(<TimelineProbe />);
  const complete = entranceTimeline().options as { onComplete?: () => void };
  act(() => complete.onComplete?.());
  expect(document.documentElement).not.toHaveAttribute("data-motion-bootstrap");

  const firstContinuous = continuousTimeline();
  const firstContinuousContext = contexts[1];
  act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }));
  expect(screen.getByRole("status")).toHaveTextContent("strength");

  act(() => motion?.setHidden(true));
  expect(firstContinuousContext.revert).toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("strength");
  act(() => motion?.setHidden(false));

  expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(1);
  expect(continuousTimelines()).toHaveLength(2);
  expect(continuousTimelines()[1]).not.toBe(firstContinuous);

  const replacementConfig = continuousTimelines()[1].options.scrollTrigger as ScrollTriggerConfig;
  act(() => replacementConfig.onRefresh({ progress: 0.6 }));
  expect(mockGsapSet).toHaveBeenLastCalledWith(
    document.querySelector("[data-atlas-progress-fill]"),
    { scaleX: 0.6 },
  );
  expect(screen.getByRole("status")).toHaveTextContent("strength");
});

test("clears camera will-change and raw fill state on continuous cleanup", () => {
  const { unmount } = render(<TimelineProbe />);
  const camera = document.querySelector<HTMLElement>("[data-atlas-camera]");
  const fill = document.querySelector<HTMLElement>("[data-atlas-progress-fill]");
  if (!camera || !fill) throw new Error("Missing Atlas motion targets");
  act(() => scrollTriggerConfig().onUpdate({ progress: 0.6 }));
  expect(camera.style.willChange).toBe("transform");
  expect(fill.style.transform).toBe("scaleX(0.6)");

  unmount();

  expect(camera.style.willChange).toBe("");
  expect(camera.style.transform).toBe("");
  expect(fill.style.transform).toBe("");
});

test("terminally disables Atlas motion, clears every owned layer, and ignores stale updates", () => {
  startPendingBootstrap();
  const { rerender } = render(<TimelineProbe />);
  const entrance = entranceTimeline();
  const continuous = continuousTimeline();
  const staleTrigger = scrollTriggerConfig();
  const handoff = document.querySelector<HTMLElement>("[data-hero-handoff]");
  const title = document.querySelector<HTMLElement>("[data-hero-title]");
  const camera = document.querySelector<HTMLElement>("[data-atlas-camera]");
  const fill = document.querySelector<HTMLElement>("[data-atlas-progress-fill]");
  const signal = document.querySelector<SVGPathElement>("[data-strength-signal]");
  if (!handoff || !title || !camera || !fill || !signal) {
    throw new Error("Missing Atlas motion targets");
  }

  act(() => staleTrigger.onUpdate({ progress: 0.6 }));
  handoff.style.transform = "translateY(-12px)";
  title.style.opacity = "0.9";
  camera.style.transform = "scale(1.02) translateY(4px)";
  signal.style.strokeDashoffset = "0.4";

  rerender(<TimelineProbe disabled />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(entrance.kill).toHaveBeenCalledOnce();
  expect(continuous.kill).toHaveBeenCalledOnce();
  for (const target of [handoff, title, camera, fill, signal]) {
    expect(target.style.opacity).toBe("");
    expect(target.style.transform).toBe("");
    expect(target.style.willChange).toBe("");
  }
  expect(signal.style.strokeDashoffset).toBe("");
  expect(screen.getByRole("status")).toHaveTextContent("strength");

  act(() => staleTrigger.onUpdate({ progress: 1 }));
  act(() => staleTrigger.onLeaveBack());
  expect(fill.style.transform).toBe("");
  expect(screen.getByRole("status")).toHaveTextContent("strength");

  rerender(<TimelineProbe disabled={false} />);
  act(() => motion?.setHidden(true));
  act(() => motion?.setHidden(false));
  expect(continuousTimelines()).toHaveLength(1);
});

test.each(["absent", "static"])("does not prepare entrance for a %s bootstrap", (state) => {
  if (state === "static") document.documentElement.dataset.motionBootstrap = "static";

  render(<TimelineProbe />);

  expect(timelines.filter((timeline) => !("scrollTrigger" in timeline.options))).toHaveLength(0);
  expect(heroItems().every((item) => item.getAttribute("style") === null)).toBe(true);
});

test("settles pending without mutation when required hero targets are missing", () => {
  startPendingBootstrap();

  render(<TimelineProbe hero={false} />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(mockGsapSet).not.toHaveBeenCalled();
  expect(timelines).toHaveLength(1);
  expect("scrollTrigger" in timelines[0].options).toBe(true);
});

test("keeps all motion static for reduced motion", () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  startPendingBootstrap();

  render(<TimelineProbe />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(timelines).toHaveLength(0);
  expect(screen.getByRole("status")).toHaveTextContent("sleep");
  expectFinalHeroInlineState();
});

test("pilote le balayage dans la timeline et libère son état au démontage", () => {
  const { unmount } = render(<TimelineProbe />);
  const sweep = document.querySelector<HTMLElement>("[data-atlas-sweep]")!;
  const call = continuousTimeline().calls.find((entry) => entry.targets.includes(sweep));
  expect(call).toEqual(expect.objectContaining({
    method: "fromTo",
    from: expect.objectContaining({ y: 0 }),
    to: expect.objectContaining({ y: expect.any(Function), ease: "none" }),
  }));
  sweep.style.transform = "translateY(120px)";
  unmount();
  expect(sweep.style.transform).toBe("");
});

test("synchronise la lumière avec le chapitre réellement au centre de la vue", () => {
  render(<TimelineProbe chapters />);
  for (const [index, chapter] of document.querySelectorAll<HTMLElement>("[data-atlas-scene]").entries()) {
    chapter.getBoundingClientRect = () => ({ top: window.innerHeight / 2 - 200 + index * 700, height: 400 } as DOMRect);
  }
  const trigger = continuousTimeline().options.scrollTrigger as ScrollTriggerConfig;
  act(() => trigger.onUpdate({ progress: 0.4 }));
  expect(screen.getByRole("status")).toHaveTextContent("sleep");
});

test("expose une progression CSS continue fondée sur les dimensions réelles du chapitre actif", () => {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(844);
  render(<TimelineProbe chapters />);
  const stage = document.querySelector<HTMLElement>(".human-atlas-stage")!;
  let chapterTop = 102, chapterHeight = 640;
  for (const chapter of document.querySelectorAll<HTMLElement>("[data-atlas-scene]")) {
    chapter.getBoundingClientRect = () => chapter.dataset.atlasScene === "breath"
      ? { top: chapterTop, height: chapterHeight } as DOMRect
      : { top: chapter.dataset.atlasScene === "sleep" ? -900 : 1200, height: 400 } as DOMRect;
  }
  act(() => scrollTriggerConfig().onUpdate({ progress: 0.13 }));
  expect(screen.getByRole("status")).toHaveTextContent("breath");
  expect(stage.style.getPropertyValue("--atlas-scroll")).toBe("0.13");
  expect(Number(stage.style.getPropertyValue("--atlas-chapter-progress"))).toBeCloseTo(0.5);
  expect(stage.style.getPropertyValue("--atlas-scene-index")).toBe("1");
  chapterTop = 122; chapterHeight = 900;
  act(() => scrollTriggerConfig().onRefresh({ progress: 0.13 }));
  expect(Number(stage.style.getPropertyValue("--atlas-chapter-progress"))).toBeCloseTo(1 / 3);
  expect(stage.parentElement!.style.getPropertyValue("--atlas-scroll")).toBe("");
});

test("borne les propriétés CSS et restaure le premier chapitre au retour en haut", () => {
  render(<TimelineProbe chapters />);
  const stage = document.querySelector<HTMLElement>(".human-atlas-stage")!;
  for (const progress of [NaN, -Infinity, Infinity, -2, 3, 0.347]) {
    act(() => scrollTriggerConfig().onUpdate({ progress }));
    for (const property of ["--atlas-scroll", "--atlas-chapter-progress"]) {
      const value = Number(stage.style.getPropertyValue(property));
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  }
  act(() => scrollTriggerConfig().onUpdate({ progress: 1 }));
  expect(stage.style.getPropertyValue("--atlas-chapter-progress")).toBe("1");
  expect(stage.style.getPropertyValue("--atlas-scene-index")).toBe("3");
  act(() => scrollTriggerConfig().onLeaveBack());
  expect(stage.style.getPropertyValue("--atlas-scroll")).toBe("0");
  expect(stage.style.getPropertyValue("--atlas-chapter-progress")).toBe("0");
  expect(stage.style.getPropertyValue("--atlas-scene-index")).toBe("0");
});

test("efface le texte d’introduction à l’entrée des chapitres sans modifier les CTA puis le restaure", () => {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  render(<TimelineProbe chapters />);
  let firstTop = 900;
  for (const [index, chapter] of document.querySelectorAll<HTMLElement>("[data-atlas-scene]").entries()) {
    chapter.getBoundingClientRect = () => ({ top: firstTop + index * 600, height: 500 } as DOMRect);
  }
  const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-handoff]"));
  act(() => scrollTriggerConfig().onUpdate({ progress: 0.03 }));
  expect(layers.every((node) => node.style.opacity === "1")).toBe(true);
  firstTop = 350;
  act(() => scrollTriggerConfig().onUpdate({ progress: 0.19 }));
  expect(layers.every((node) => node.style.opacity === "0")).toBe(true);
  expect(screen.getByRole("button", { name: "Action" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Action" })).not.toHaveAttribute("style");
  expect(heroItems().every((node) => node.style.opacity === "")).toBe(true);
  act(() => scrollTriggerConfig().onLeaveBack());
  expect(layers.every((node) => node.style.opacity === "1")).toBe(true);
});

test.each(["reduced", "hidden", "disabled", "unmount"] as const)("retire les propriétés CSS et ignore les anciens callbacks après %s", (reason) => {
  const { rerender, unmount } = render(<TimelineProbe chapters />);
  const stage = document.querySelector<HTMLElement>(".human-atlas-stage")!;
  const atlas = document.querySelector<HTMLElement>(".human-atlas-scroll")!;
  expect(atlas).toHaveAttribute("data-scroll-sequenced", "true");
  const stale = scrollTriggerConfig();
  act(() => stale.onUpdate({ progress: 0.6 }));
  expect(stage.style.getPropertyValue("--atlas-scroll")).toBe("0.6");
  if (reason === "disabled") rerender(<TimelineProbe chapters disabled />);
  else if (reason === "unmount") unmount();
  else act(() => reason === "reduced" ? motion?.setReduced(true) : motion?.setHidden(true));
  act(() => { stale.onUpdate({ progress: 1 }); stale.onRefresh({ progress: 1 }); stale.onLeaveBack(); });
  expect(atlas).not.toHaveAttribute("data-scroll-sequenced");
  for (const property of ["--atlas-scroll", "--atlas-chapter-progress", "--atlas-scene-index"]) {
    expect(stage.style.getPropertyValue(property)).toBe("");
  }
});

test.each(["onUpdate", "onRefresh"] as const)("sélectionne le dernier axe à la fin mobile via %s, puis reprend le chapitre le plus proche en remontant", (callback) => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(844);
  render(<TimelineProbe chapters />);
  for (const chapter of document.querySelectorAll<HTMLElement>("[data-atlas-scene]")) {
    // Centres observés à la fin sur mobile : sommeil 216, alimentation 653,
    // face au centre de la fenêtre à 422 ; les deux premiers axes sont hors vue.
    const center = chapter.dataset.atlasScene === "sleep" ? 216
      : chapter.dataset.atlasScene === "energy" ? 653 : -500;
    chapter.getBoundingClientRect = () => ({ top: center - 100, height: 200 } as DOMRect);
  }
  const trigger = scrollTriggerConfig();

  act(() => trigger[callback]({ progress: 0.999 }));
  expect(screen.getByRole("status")).toHaveTextContent("sleep");

  act(() => trigger[callback]({ progress: 1 }));
  expect(screen.getByRole("status")).toHaveTextContent("energy");

  act(() => trigger[callback]({ progress: 0.999 }));
  expect(screen.getByRole("status")).toHaveTextContent("sleep");
});

test("aimante dans le sens du geste, ramène les micro-déplacements et laisse sortir après le dernier chapitre", () => {
  const points = [0, 0.15, 0.35, 0.55, 0.75];
  const deadZone = 0.004;

  expect(snapAtlasProgress(0.2, 1, points, deadZone)).toBe(0.35);
  expect(snapAtlasProgress(0.152, 1, points, deadZone)).toBe(0.15);
  expect(snapAtlasProgress(0.05, 1, points, deadZone)).toBe(0.15);
  expect(snapAtlasProgress(0.35, 1, points, deadZone)).toBe(0.35);
  expect(snapAtlasProgress(0.3, -1, points, deadZone)).toBe(0.15);
  expect(snapAtlasProgress(0.348, -1, points, deadZone)).toBe(0.35);
  expect(snapAtlasProgress(0.05, -1, points, deadZone)).toBe(0);
  expect(snapAtlasProgress(0.2, 0, points, deadZone)).toBe(0.15);
  expect(snapAtlasProgress(0.3, 0, points, deadZone)).toBe(0.35);
  expect(snapAtlasProgress(0.9, 1, points, deadZone)).toBe(0.9);
  expect(snapAtlasProgress(0.9, -1, points, deadZone)).toBe(0.75);
  expect(snapAtlasProgress(Number.NaN, 1, points, deadZone)).toBe(0);
  expect(snapAtlasProgress(-1, -1, points, deadZone)).toBe(0);
  expect(snapAtlasProgress(0.4, 1, [], deadZone)).toBe(0.4);
  expect(snapAtlasProgress(0.4, 1, [0.55, Number.NaN, 0.15], deadZone)).toBe(0.55);
});

test("aimante le récit sur les ancres réelles des chapitres et se retire hors mesure", () => {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  render(<TimelineProbe chapters />);
  const tops: Record<string, number> = { sleep: -400, breath: 400, strength: 1200, energy: 2000 };
  for (const chapter of document.querySelectorAll<HTMLElement>("[data-atlas-scene]")) {
    chapter.getBoundingClientRect = () => ({ top: tops[chapter.dataset.atlasScene!], height: 560 } as DOMRect);
  }
  const { snap } = scrollTriggerConfig();

  expect(snap).toEqual(expect.objectContaining({
    delay: 0.18,
    duration: { min: 0.3, max: 0.8 },
    ease: "power2.inOut",
    inertia: false,
  }));
  // Position 1000 sur une course de 4000 : ancres à 0,15, 0,35, 0,55 et 0,75 ; zone morte de 16 px.
  const trigger = { direction: 1, end: 4000, scroll: () => 1000, start: 0 };
  expect(snap.snapTo(0.2, trigger)).toBeCloseTo(0.35);
  expect(snap.snapTo(0.152, trigger)).toBeCloseTo(0.15);
  expect(snap.snapTo(0.2, { ...trigger, direction: -1 })).toBeCloseTo(0.15);
  expect(snap.snapTo(0.05, trigger)).toBeCloseTo(0.15);
  expect(snap.snapTo(0.05, { ...trigger, direction: -1 })).toBe(0);
  expect(snap.snapTo(0.9, trigger)).toBe(0.9);
  expect(snap.snapTo(0.9, { ...trigger, direction: -1 })).toBeCloseTo(0.75);
  expect(snap.snapTo(0.42)).toBe(0.42);
  expect(snap.snapTo(0.42, { direction: 1, end: Number.NaN, start: 0 })).toBe(0.42);
});

test("ouvre le récit en haut de page quand le héros est posé sur la scène, sinon au sommet de l'atlas", () => {
  render(<TimelineProbe chapters />);
  const { start } = scrollTriggerConfig();
  if (typeof start !== "function") throw new Error("Expected a start re-evaluated on refresh");
  const hero = document.querySelector<HTMLElement>(".landing__atlas-hero")!;

  expect(start()).toBe("top top");
  hero.style.position = "absolute";
  expect(start()).toBe(0);
});

test.each(["unmount", "reduced"] as const)("fond chaque chapitre selon sa distance au centre puis efface sa présence après %s", (reason) => {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  const { unmount } = render(<TimelineProbe chapters />);
  const tops: Record<string, number> = { sleep: -900, breath: 200, strength: 520, energy: 1600 };
  const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-atlas-scene]"));
  for (const chapter of chapters) {
    chapter.getBoundingClientRect = () => ({ top: tops[chapter.dataset.atlasScene!], height: 400 } as DOMRect);
  }
  const value = (id: string, property: string) => Number(
    chapters.find((chapter) => chapter.dataset.atlasScene === id)!.style.getPropertyValue(property),
  );

  act(() => scrollTriggerConfig().onUpdate({ progress: 0.3 }));

  expect(value("breath", "--scene-presence")).toBeCloseTo(1);
  expect(value("strength", "--scene-presence")).toBeGreaterThan(0);
  expect(value("strength", "--scene-presence")).toBeLessThan(0.5);
  expect(value("sleep", "--scene-presence")).toBe(0);
  expect(value("energy", "--scene-presence")).toBe(0);
  expect(value("breath", "--scene-drift")).toBeCloseTo(0);
  expect(value("strength", "--scene-drift")).toBeGreaterThan(0);
  expect(value("sleep", "--scene-drift")).toBe(-1);
  expect(value("energy", "--scene-drift")).toBe(1);
  expect(continuousTimeline().calls.some((call) => call.to.opacity !== undefined)).toBe(false);

  if (reason === "unmount") unmount();
  else act(() => motion?.setReduced(true));

  for (const chapter of chapters) {
    expect(chapter.style.getPropertyValue("--scene-presence")).toBe("");
    expect(chapter.style.getPropertyValue("--scene-drift")).toBe("");
  }
});
