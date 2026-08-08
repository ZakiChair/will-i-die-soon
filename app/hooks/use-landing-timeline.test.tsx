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
      if (values.y !== undefined) target.style.transform = `translateY(${String(values.y)}px)`;
      target.style.willChange = "opacity, transform";
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
  atlasSceneFromProgress,
  useLandingTimeline,
} from "./use-landing-timeline";

type ScrollTriggerConfig = Readonly<{
  onLeaveBack: () => void;
  onUpdate: (trigger: { progress: number }) => void;
  scrub: number;
  trigger: Element;
}>;

let motion: MotionEnvironment | undefined;

function TimelineProbe({ hero = true }: { hero?: boolean }) {
  const scope = useRef<HTMLElement>(null);
  const activeScene = useLandingTimeline(scope);

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
          <button data-hero-item type="button">Action</button>
          <p data-hero-item><span data-hero-handoff>Hint</span></p>
        </div>
      ) : null}
      <section className="human-atlas-scroll">
        <div className="human-atlas-stage" />
        <svg aria-hidden="true">
          <path data-strength-signal="true" />
          <path data-strength-signal="true" />
        </svg>
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

test("clamps progress into the four canonical atlas scenes", () => {
  expect(atlasSceneFromProgress(-1)).toBe("breath");
  expect(atlasSceneFromProgress(0)).toBe("breath");
  expect(atlasSceneFromProgress(0.34)).toBe("strength");
  expect(atlasSceneFromProgress(0.67)).toBe("sleep");
  expect(atlasSceneFromProgress(1)).toBe("energy");
  expect(atlasSceneFromProgress(2)).toBe("energy");
});

test("runs the exact five-part entrance before the guard can settle pending motion", () => {
  startPendingBootstrap();
  render(<TimelineProbe />);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "ready");
  const items = heroItems();
  const calls = entranceTimeline().calls.filter((call) => call.method === "fromTo");
  expect(calls).toHaveLength(5);
  expect(calls.map(({ targets }) => targets)).toEqual(items.map((item) => [item]));
  expect(calls.map(({ from }) => from)).toEqual([
    { opacity: 0, y: 12 },
    { opacity: 0, y: 32 },
    { opacity: 0, y: 18 },
    { opacity: 0, y: 14 },
    { opacity: 0, y: 10 },
  ]);
  expect(calls.map(({ position, to }) => ({ position, to }))).toEqual([
    { position: 0, to: { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.08, to: { duration: 0.62, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.26, to: { duration: 0.42, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.38, to: { duration: 0.36, ease: "power3.out", opacity: 1, y: 0 } },
    { position: 0.5, to: { duration: 0.32, ease: "power3.out", opacity: 1, y: 0 } },
  ]);
  expect(Math.max(...calls.map((call) => Number(call.position) + Number(call.to.duration))))
    .toBeCloseTo(0.82, 10);
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
  const title = document.querySelector<HTMLElement>("[data-hero-title]");
  const continuousCalls = continuousTimeline().calls;
  const handoffCall = continuousCalls.find((call) => call.method === "to" && call.targets.length === 4);
  const opacityCalls = continuousCalls.filter((call) => call.to.opacity !== undefined);

  expect(handoffCall?.targets).toEqual(handoffs);
  expect(handoffCall?.to).toEqual(expect.objectContaining({ y: expect.any(Number) }));
  expect(outerItems.some((item) => handoffCall?.targets.includes(item))).toBe(false);
  expect(opacityCalls).toHaveLength(1);
  expect(opacityCalls[0].targets).toEqual([title]);
  expect(opacityCalls[0].to.opacity).toBe(0.82);
  expect(continuousCalls.some((call) => call.to.visibility !== undefined)).toBe(false);
});

test("preserves one scoped scrubbed Atlas timeline and strength-signal state", () => {
  render(<TimelineProbe />);

  expect(useGsapConfigs.some((config) => (
    Array.isArray(config.dependencies) && config.dependencies.length === 0
  ))).toBe(true);
  expect(useGsapConfigs.some((config) => (
    Array.isArray(config.dependencies) && config.dependencies[0] === true
  ))).toBe(true);
  expect(scrollTriggerConfig()).toEqual(expect.objectContaining({
    scrub: 0.8,
    trigger: document.querySelector(".human-atlas-scroll"),
  }));
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
  expect(screen.getByRole("status")).toHaveTextContent("sleep");
  act(() => scrollTriggerConfig().onLeaveBack());
  expect(screen.getByRole("status")).toHaveTextContent("breath");
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
  expect(screen.getByRole("status")).toHaveTextContent("breath");
  expectFinalHeroInlineState();
});
