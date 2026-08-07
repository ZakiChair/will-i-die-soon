import { act, render } from "@testing-library/react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

type TimelineCall = Readonly<{
  targets: HTMLElement[];
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  position?: number | string;
}>;

type TimelineDouble = Readonly<{
  calls: TimelineCall[];
  fromTo: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
}>;

const {
  contexts,
  mockGsap,
  mockScrollTrigger,
  mockTimeline,
  mockTriggerCreate,
  mockUseGSAP,
  timelines,
  triggers,
} = vi.hoisted(() => {
  const timelines: TimelineDouble[] = [];
  const triggers: Array<{ kill: ReturnType<typeof vi.fn> }> = [];
  const contexts: Array<{ revert: ReturnType<typeof vi.fn> }> = [];
  const mockTimeline = vi.fn(() => {
    const calls: TimelineCall[] = [];
    const timeline: TimelineDouble = {
      calls,
      fromTo: vi.fn((targets, from, to, position) => {
        const elements = targets instanceof HTMLElement
          ? [targets]
          : Array.from(targets as Iterable<HTMLElement>);
        calls.push({ targets: elements, from, to, position });
        for (const element of elements) {
          if (from.opacity !== undefined) element.style.opacity = String(from.opacity);
          if (from.visibility !== undefined) element.style.visibility = String(from.visibility);
          if (from.y !== undefined) element.style.transform = `translateY(${String(from.y)}px)`;
          if (from.scaleX !== undefined) element.style.transform = `scaleX(${String(from.scaleX)})`;
          if (from.transformOrigin !== undefined) {
            element.style.transformOrigin = String(from.transformOrigin);
          }
          element.style.willChange = "opacity, transform";
        }
        return timeline;
      }),
      kill: vi.fn(),
    };
    timelines.push(timeline);
    return timeline;
  });
  const mockTriggerCreate = vi.fn(() => {
    const trigger = { kill: vi.fn() };
    triggers.push(trigger);
    return trigger;
  });
  const mockGsap = { timeline: mockTimeline };
  const mockScrollTrigger = { create: mockTriggerCreate };
  const mockUseGSAP = vi.fn((callback) => {
    const registeredCleanup = useRef<(() => void) | undefined>(undefined);
    const context = useMemo(() => ({
      revert: vi.fn(() => registeredCleanup.current?.()),
    }), []);
    contexts.push(context);
    useLayoutEffect(() => {
      const cleanup = callback(context);
      registeredCleanup.current = typeof cleanup === "function" ? cleanup : undefined;
      return () => context.revert();
    }, [callback, context]);
    return { context, contextSafe: (fn: unknown) => fn };
  });

  return {
    contexts,
    mockGsap,
    mockScrollTrigger,
    mockTimeline,
    mockTriggerCreate,
    mockUseGSAP,
    timelines,
    triggers,
  };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: mockGsap,
  ScrollTrigger: mockScrollTrigger,
  useGSAP: mockUseGSAP,
}));

import { useSectionReveal, type SectionRevealMode } from "./use-section-reveal";

let motion: MotionEnvironment | undefined;
let rootTop = 0;

function rectangle(top: number): DOMRect {
  return {
    bottom: top + 100,
    height: 100,
    left: 0,
    right: 100,
    top,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

function RevealProbe({ mode = "document" }: { mode?: SectionRevealMode }) {
  const scope = useRef<HTMLElement>(null);
  useSectionReveal(scope, "[data-reveal]", mode);
  return (
    <section ref={scope}>
      <div data-reveal="single">Single</div>
      <section data-reveal="heading">
        <p data-reveal-item>Eyebrow</p>
        <h2 data-reveal-item>Heading</h2>
        <span aria-hidden="true" data-reveal-item="rule" />
      </section>
      <div data-reveal="group"><article data-reveal-item>Card</article></div>
    </section>
  );
}

function styledRevealNodes(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-item]"));
}

function expectFinalInlineState(nodes: HTMLElement[]) {
  for (const node of nodes) {
    expect(node.style.opacity).toBe("");
    expect(node.style.transform).toBe("");
    expect(node.style.visibility).toBe("");
    expect(node.style.willChange).toBe("");
    if (node.dataset.revealItem === "rule") expect(node.style.transformOrigin).toBe("");
  }
}

beforeEach(() => {
  rootTop = window.innerHeight + 100;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => (
    rectangle(rootTop)
  ));
  Object.assign(mockGsap, { timeline: mockTimeline });
  Object.assign(mockScrollTrigger, { create: mockTriggerCreate });
  motion = installMotionEnvironment();
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  timelines.length = 0;
  triggers.length = 0;
  contexts.length = 0;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("creates one semantic timeline and trigger per offscreen reveal root", () => {
  render(<RevealProbe />);

  expect(timelines).toHaveLength(3);
  expect(triggers).toHaveLength(3);
  expect(mockTimeline).toHaveBeenCalledTimes(3);
  expect(mockTimeline).toHaveBeenCalledWith({ paused: true });
  const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  roots.forEach((root, index) => {
    expect(mockTriggerCreate).toHaveBeenNthCalledWith(index + 1, {
      animation: timelines[index],
      once: true,
      start: "top 84%",
      trigger: root,
    });
  });

  const [singleCall] = timelines[0].calls;
  expect(singleCall.targets).toEqual([roots[0]]);
  expect(singleCall.from).toEqual(expect.objectContaining({ opacity: 0, y: 20 }));
  expect(singleCall.to).toEqual(expect.objectContaining({
    duration: 0.55,
    ease: "power3.out",
    opacity: 1,
    y: 0,
  }));

  const [headingCall, ruleCall] = timelines[1].calls;
  expect(headingCall.targets.map((target) => target.textContent)).toEqual(["Eyebrow", "Heading"]);
  expect(headingCall.from).toEqual(expect.objectContaining({ opacity: 0, y: 24 }));
  expect(headingCall.to).toEqual(expect.objectContaining({ duration: 0.65, stagger: 0.08 }));
  expect(ruleCall.targets[0]).toHaveAttribute("data-reveal-item", "rule");
  expect(ruleCall.from).toEqual(expect.objectContaining({
    opacity: 1,
    scaleX: 0,
    transformOrigin: "left center",
  }));
  expect(ruleCall.to).toEqual(expect.objectContaining({ scaleX: 1 }));

  const [groupCall] = timelines[2].calls;
  expect(groupCall.from).toEqual(expect.objectContaining({ opacity: 0, y: 18 }));
  expect(groupCall.to).toEqual(expect.objectContaining({ duration: 0.55, stagger: 0.07 }));
  for (const timeline of timelines) {
    for (const call of timeline.calls) {
      expect(call.from).not.toHaveProperty("autoAlpha");
      expect(call.from).not.toHaveProperty("visibility");
      expect(call.to).not.toHaveProperty("autoAlpha");
      expect(call.to).not.toHaveProperty("visibility");
    }
  }
});

test("skips roots already visible in document mode", () => {
  rootTop = window.innerHeight;
  const { container } = render(<RevealProbe />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expectFinalInlineState(styledRevealNodes(container));
});

test("reveals already-visible roots in new-content mode without measuring them away", () => {
  rootTop = window.innerHeight;
  render(<RevealProbe mode="new-content" />);

  expect(mockTimeline).toHaveBeenCalledTimes(3);
  expect(mockTriggerCreate).toHaveBeenCalledTimes(3);
});

test("treats bare and invalid reveal values as single variants", () => {
  function BareRevealProbe() {
    const scope = useRef<HTMLElement>(null);
    useSectionReveal(scope);
    return <section ref={scope}><p data-reveal>Bare</p><p data-reveal="other">Invalid</p></section>;
  }

  render(<BareRevealProbe />);

  expect(timelines).toHaveLength(2);
  for (const timeline of timelines) {
    expect(timeline.calls).toHaveLength(1);
    expect(timeline.calls[0].from).toEqual(expect.objectContaining({ opacity: 0, y: 20 }));
    expect(timeline.calls[0].to).toEqual(expect.objectContaining({ duration: 0.55, y: 0 }));
  }
});

test("rejects both members of nested root pairs while keeping unrelated roots active", () => {
  function NestedRevealProbe() {
    const scope = useRef<HTMLElement>(null);
    useSectionReveal(scope);
    return (
      <main ref={scope}>
        <section data-reveal="group" style={{ opacity: 0, transform: "translateY(18px)", visibility: "hidden", willChange: "opacity" }}>
          <article data-reveal-item style={{ opacity: 0, transform: "translateY(18px)" }}>
            <div data-reveal="single" style={{ opacity: 0, transform: "translateY(20px)" }}>Nested</div>
          </article>
        </section>
        <aside data-reveal="single">Unrelated</aside>
      </main>
    );
  }

  const { container } = render(<NestedRevealProbe />);

  expect(timelines).toHaveLength(1);
  expect(timelines[0].calls[0].targets[0]).toHaveTextContent("Unrelated");
  expect(mockTriggerCreate).toHaveBeenCalledOnce();
  expectFinalInlineState(styledRevealNodes(container).slice(0, 3));
});

test.each([
  ["gsap.timeline", () => Object.assign(mockGsap, { timeline: undefined })],
  ["ScrollTrigger.create", () => Object.assign(mockScrollTrigger, { create: {} })],
])("checks callable %s before applying any initial state", (_name, removeCapability) => {
  removeCapability();
  const { container } = render(<RevealProbe />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expectFinalInlineState(styledRevealNodes(container));
});

test("cleans owned resources and inline state when trigger setup throws", () => {
  mockTriggerCreate.mockImplementationOnce(() => {
    throw new Error("cannot create trigger");
  });
  const { container } = render(<RevealProbe />);

  expect(timelines).toHaveLength(1);
  expect(timelines[0].kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expect(motion?.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalInlineState(styledRevealNodes(container));
});

test("permanently cancels live reveals when decorative motion stops", () => {
  const { container } = render(<RevealProbe />);
  const createdTimelines = [...timelines];
  const createdTriggers = [...triggers];

  act(() => motion?.setReduced(true));

  createdTriggers.forEach((trigger) => expect(trigger.kill).toHaveBeenCalledOnce());
  createdTimelines.forEach((timeline) => expect(timeline.kill).toHaveBeenCalledOnce());
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expectFinalInlineState(styledRevealNodes(container));

  act(() => motion?.setReduced(false));
  expect(mockTimeline).toHaveBeenCalledTimes(3);
  expect(mockTriggerCreate).toHaveBeenCalledTimes(3);
});

test("keeps a synchronous reduced-motion mount final and disposes its observation", () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  const { container, unmount } = render(<RevealProbe />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expectFinalInlineState(styledRevealNodes(container));

  unmount();
  expect(motion.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
});

test("runs terminal cleanup on unmount", () => {
  const { container, unmount } = render(<RevealProbe />);
  const revealNodes = styledRevealNodes(container);
  const createdTimelines = [...timelines];
  const createdTriggers = [...triggers];

  unmount();

  createdTriggers.forEach((trigger) => expect(trigger.kill).toHaveBeenCalledOnce());
  createdTimelines.forEach((timeline) => expect(timeline.kill).toHaveBeenCalledOnce());
  expectFinalInlineState(revealNodes);
});
