import { act, render } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

type TimelineCall = Readonly<{
  targets: HTMLElement[];
  to: Record<string, unknown>;
  position?: number;
}>;

type TimelineDouble = Readonly<{
  calls: TimelineCall[];
  complete(): void;
  kill: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
}>;

const {
  contexts,
  mockContext,
  mockGsap,
  mockScrollTrigger,
  mockSet,
  mockTimeline,
  mockTriggerCreate,
  timelines,
  triggers,
} = vi.hoisted(() => {
  const contexts: Array<{
    add: ReturnType<typeof vi.fn>;
    revert: ReturnType<typeof vi.fn>;
  }> = [];
  const timelines: TimelineDouble[] = [];
  const triggers: Array<{ kill: ReturnType<typeof vi.fn> }> = [];
  const elementsFor = (targets: HTMLElement | Iterable<HTMLElement>): HTMLElement[] => (
    targets instanceof HTMLElement ? [targets] : Array.from(targets)
  );
  const mockSet = vi.fn((targets: HTMLElement | Iterable<HTMLElement>, values: Record<string, unknown>) => {
    for (const element of elementsFor(targets)) {
      for (const [property, value] of Object.entries(values)) {
        if (property.startsWith("--")) element.style.setProperty(property, String(value));
        if (property === "opacity") element.style.opacity = String(value);
        if (property === "y") element.style.transform = `translateY(${String(value)}px)`;
      }
    }
  });
  const mockTimeline = vi.fn((options?: { onComplete?: () => void }) => {
    const calls: TimelineCall[] = [];
    const timeline: TimelineDouble = {
      calls,
      complete: () => options?.onComplete?.(),
      kill: vi.fn(),
      to: vi.fn((targets, to, position) => {
        calls.push({ targets: elementsFor(targets), to, position });
        return timeline;
      }),
    };
    timelines.push(timeline);
    return timeline;
  });
  const mockContext = vi.fn(() => {
    const context = {
      add: vi.fn((callback: () => void) => callback()),
      revert: vi.fn(),
    };
    contexts.push(context);
    return context;
  });
  const mockTriggerCreate = vi.fn(() => {
    const trigger = { kill: vi.fn() };
    triggers.push(trigger);
    return trigger;
  });
  const mockGsap = {
    context: mockContext as typeof mockContext | undefined,
    set: mockSet as typeof mockSet | undefined,
    timeline: mockTimeline as typeof mockTimeline | undefined,
  };
  const mockScrollTrigger = {
    create: mockTriggerCreate as typeof mockTriggerCreate | undefined,
  };

  return {
    contexts,
    mockContext,
    mockGsap,
    mockScrollTrigger,
    mockSet,
    mockTimeline,
    mockTriggerCreate,
    timelines,
    triggers,
  };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: mockGsap,
  ScrollTrigger: mockScrollTrigger,
}));

import { useRiskTreeConstruction } from "./use-risk-tree-construction";

let motion: MotionEnvironment | undefined;
let treeTop = 0;

function rectangle(top: number): DOMRect {
  return {
    bottom: top + 600,
    height: 600,
    left: 0,
    right: 800,
    top,
    width: 800,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

function TreeProbe({ seeded = false }: { seeded?: boolean }) {
  const scope = useRef<HTMLElement>(null);
  useRiskTreeConstruction(scope);

  return (
    <nav
      data-risk-tree-trunk
      ref={scope}
      style={seeded ? { "--risk-trunk-progress": 0.25 } as React.CSSProperties : undefined}
    >
      <p>Root</p>
      <ul>
        {[0, 1, 2, 3].map((index) => (
          <li
            data-risk-tree-branch
            data-risk-tree-item
            key={index}
            style={seeded ? {
              "--risk-branch-progress": 0.25,
              opacity: 0.25,
              transform: "translateY(16px)",
            } as React.CSSProperties : undefined}
          >
            <ul
              data-risk-tree-item
              style={seeded ? { opacity: 0.25, transform: "translateY(10px)" } : undefined}
            >
              <li>Leaf {index}</li>
            </ul>
          </li>
        ))}
      </ul>
      <section
        className="risk-tree__foundation"
        data-risk-tree-item
        style={seeded ? { opacity: 0.25, transform: "translateY(12px)" } : undefined}
      >
        Foundation
      </section>
    </nav>
  );
}

function treeParts(container: HTMLElement) {
  const trunk = container.matches("[data-risk-tree-trunk]")
    ? container
    : container.querySelector<HTMLElement>("[data-risk-tree-trunk]");
  if (!trunk) throw new Error("Missing test trunk");
  return {
    branches: Array.from(trunk.querySelectorAll<HTMLElement>("[data-risk-tree-branch]")),
    foundation: trunk.querySelector<HTMLElement>(".risk-tree__foundation"),
    leafGroups: Array.from(trunk.querySelectorAll<HTMLElement>("li > [data-risk-tree-item]")),
    pillars: Array.from(trunk.querySelectorAll<HTMLElement>("[data-risk-tree-branch][data-risk-tree-item]")),
    trunk,
  };
}

function expectFinalInlineState(container: HTMLElement): void {
  const { branches, foundation, leafGroups, pillars, trunk } = treeParts(container);
  expect(trunk.style.getPropertyValue("--risk-trunk-progress")).toBe("");
  for (const branch of branches) {
    expect(branch.style.getPropertyValue("--risk-branch-progress")).toBe("");
  }
  for (const item of [...pillars, ...leafGroups, foundation]) {
    expect(item?.style.opacity).toBe("");
    expect(item?.style.transform).toBe("");
  }
}

beforeEach(() => {
  treeTop = window.innerHeight + 100;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => (
    rectangle(treeTop)
  ));
  Object.assign(mockGsap, { context: mockContext, set: mockSet, timeline: mockTimeline });
  Object.assign(mockScrollTrigger, { create: mockTriggerCreate });
  motion = installMotionEnvironment();
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  contexts.length = 0;
  timelines.length = 0;
  triggers.length = 0;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("constructs one below-viewport tree on the exact 1.10 second schedule", () => {
  const { container } = render(<TreeProbe />);
  const { branches, foundation, leafGroups, pillars, trunk } = treeParts(container);

  expect(mockSet).toHaveBeenCalledWith(trunk, { "--risk-trunk-progress": 0 });
  expect(mockSet).toHaveBeenCalledWith(branches, { "--risk-branch-progress": 0 });
  expect(mockSet).toHaveBeenCalledWith(pillars, { opacity: 0, y: 16 });
  expect(mockSet).toHaveBeenCalledWith(leafGroups, { opacity: 0, y: 10 });
  expect(mockSet).toHaveBeenCalledWith(foundation, { opacity: 0, y: 12 });
  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(mockTimeline).toHaveBeenCalledWith(expect.objectContaining({ onComplete: expect.any(Function), paused: true }));
  expect(mockTriggerCreate).toHaveBeenCalledOnce();
  expect(mockTriggerCreate).toHaveBeenCalledWith({
    animation: timelines[0],
    once: true,
    start: "top 84%",
    trigger: trunk,
  });

  const [trunkCall, ...remainingCalls] = timelines[0].calls;
  const branchCalls = remainingCalls.slice(0, 4);
  const [pillarCall, leafCall, foundationCall] = remainingCalls.slice(4);
  expect(trunkCall).toEqual({
    position: 0,
    targets: [trunk],
    to: expect.objectContaining({ "--risk-trunk-progress": 1, duration: 0.55 }),
  });
  expect(branchCalls.map((call) => call.position)).toEqual([0.16, 0.24, 0.32, 0.4]);
  branchCalls.forEach((call, index) => {
    expect(call.targets).toEqual([branches[index]]);
    expect(call.to).toEqual(expect.objectContaining({ "--risk-branch-progress": 1, duration: 0.55 }));
  });
  expect(pillarCall).toEqual({
    position: 0.22,
    targets: pillars,
    to: expect.objectContaining({ duration: 0.38, opacity: 1, stagger: 0.06, y: 0 }),
  });
  expect(leafCall).toEqual({
    position: 0.38,
    targets: leafGroups,
    to: expect.objectContaining({ duration: 0.38, opacity: 1, stagger: 0.06, y: 0 }),
  });
  expect(foundationCall).toEqual({
    position: 0.72,
    targets: [foundation],
    to: expect.objectContaining({ duration: 0.38, opacity: 1, y: 0 }),
  });
  const end = Math.max(...timelines[0].calls.map((call) => (
    (call.position ?? 0)
      + Number(call.to.duration ?? 0)
      + (call.targets.length - 1) * Number(call.to.stagger ?? 0)
  )));
  expect(end).toBeCloseTo(1.1, 10);
});

test("keeps a tree touching the viewport bottom in its CSS-defined final state", () => {
  treeTop = window.innerHeight;
  const { container } = render(<TreeProbe seeded />);

  expect(mockSet).not.toHaveBeenCalled();
  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expectFinalInlineState(container);
});

test("kills, reverts, clears, and unsubscribes when construction completes", () => {
  const { container } = render(<TreeProbe />);

  act(() => timelines[0].complete());

  expect(triggers[0].kill).toHaveBeenCalledOnce();
  expect(timelines[0].kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expect(motion?.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalInlineState(container);
});

test("terminally settles live construction when reduced motion starts without replay", () => {
  const { container } = render(<TreeProbe />);

  act(() => motion?.setReduced(true));

  expect(triggers[0].kill).toHaveBeenCalledOnce();
  expect(timelines[0].kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expectFinalInlineState(container);

  act(() => motion?.setReduced(false));
  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(mockTriggerCreate).toHaveBeenCalledOnce();
});

test("settles owned construction on unmount", () => {
  const { container, unmount } = render(<TreeProbe />);
  const tree = container.firstElementChild as HTMLElement;

  unmount();

  expect(triggers[0].kill).toHaveBeenCalledOnce();
  expect(timelines[0].kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expectFinalInlineState(tree);
});

test("keeps synchronous reduced motion final and immediately unsubscribed", () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  const { container } = render(<TreeProbe seeded />);

  expect(mockSet).not.toHaveBeenCalled();
  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expect(motion.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalInlineState(container);
});

test.each([
  ["gsap.timeline", () => Object.assign(mockGsap, { timeline: undefined })],
  ["ScrollTrigger.create", () => Object.assign(mockScrollTrigger, { create: undefined })],
])("checks callable %s before applying initial tree state", (_name, removeCapability) => {
  removeCapability();
  const { container } = render(<TreeProbe seeded />);

  expect(mockSet).not.toHaveBeenCalled();
  expect(mockTimeline).not.toHaveBeenCalled();
  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expectFinalInlineState(container);
});

test("kills partial setup and leaves no initial state when trigger creation throws", () => {
  mockTriggerCreate.mockImplementationOnce(() => {
    throw new Error("cannot create trigger");
  });
  const { container } = render(<TreeProbe seeded />);

  expect(mockSet).toHaveBeenCalled();
  expect(timelines[0].kill).toHaveBeenCalledOnce();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expect(motion?.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalInlineState(container);
});

test("leaves no initial state when timeline creation throws", () => {
  mockTimeline.mockImplementationOnce(() => {
    throw new Error("cannot create timeline");
  });
  const { container } = render(<TreeProbe seeded />);

  expect(mockTriggerCreate).not.toHaveBeenCalled();
  expect(contexts[0].revert).toHaveBeenCalledOnce();
  expect(motion?.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expectFinalInlineState(container);
});

test("does not replay construction during a Strict Mode effect replay", () => {
  const { container } = render(
    <StrictMode>
      <TreeProbe />
    </StrictMode>,
  );

  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(mockTriggerCreate).toHaveBeenCalledOnce();
  expectFinalInlineState(container);
});
