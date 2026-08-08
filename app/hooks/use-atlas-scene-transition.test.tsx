import { act, render } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import { humanAtlasSceneIds } from "../data/human-atlas";
import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

type TimelineDouble = Readonly<{
  complete(): void;
  deactivateWithoutCompletion(): void;
  fromTo: ReturnType<typeof vi.fn>;
  isActive: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
}>;

const {
  cleanupOrder,
  contexts,
  mockContext,
  mockGsap,
  mockTimeline,
  timelines,
} = vi.hoisted(() => {
  const cleanupOrder: string[] = [];
  const contexts: Array<{
    add: ReturnType<typeof vi.fn>;
    revert: ReturnType<typeof vi.fn>;
  }> = [];
  const timelines: TimelineDouble[] = [];
  const mockTimeline = vi.fn((options?: { onComplete?: () => void }) => {
    let active = true;
    const timeline: TimelineDouble = {
      complete() {
        active = false;
        options?.onComplete?.();
      },
      deactivateWithoutCompletion() {
        active = false;
      },
      fromTo: vi.fn((targets, from) => {
        for (const target of Array.from(targets as Iterable<HTMLElement>)) {
          if (from.opacity !== undefined) target.style.opacity = String(from.opacity);
          if (from.y !== undefined) target.style.transform = `translateY(${String(from.y)}px)`;
          target.style.willChange = "opacity, transform";
        }
        return timeline;
      }),
      isActive: vi.fn(() => active),
      kill: vi.fn(() => {
        cleanupOrder.push("kill");
        active = false;
      }),
    };
    timelines.push(timeline);
    return timeline;
  });
  const mockContext = vi.fn(() => {
    const context = {
      add: vi.fn((callback: () => void) => callback()),
      revert: vi.fn(() => cleanupOrder.push("revert")),
    };
    contexts.push(context);
    return context;
  });
  const mockGsap = {
    context: mockContext,
    timeline: mockTimeline as typeof mockTimeline | undefined,
  };

  return { cleanupOrder, contexts, mockContext, mockGsap, mockTimeline, timelines };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: mockGsap,
}));

import { useAtlasSceneTransition } from "./use-atlas-scene-transition";

let motion: MotionEnvironment | undefined;

function AtlasProbe({
  activeScene,
  enabled = true,
  seeded = false,
}: {
  activeScene: HumanAtlasSceneId;
  enabled?: boolean;
  seeded?: boolean;
}) {
  const scope = useRef<HTMLElement>(null);
  useAtlasSceneTransition(scope, activeScene, enabled);

  return (
    <main ref={scope}>
      {humanAtlasSceneIds.map((sceneId) => (
        <section
          data-active={activeScene === sceneId ? "true" : "false"}
          data-atlas-scene={sceneId}
          key={sceneId}
        >
          {["eyebrow", "heading", "body", "source"].map((label) => (
            <span
              data-atlas-scene-item
              key={label}
              style={seeded ? { opacity: 0.2, transform: "translateY(12px)" } : undefined}
            >
              {sceneId}-{label}
            </span>
          ))}
        </section>
      ))}
    </main>
  );
}

function sceneItems(container: HTMLElement, sceneId: HumanAtlasSceneId): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    `[data-atlas-scene="${sceneId}"] [data-atlas-scene-item]`,
  ));
}

function allItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-atlas-scene-item]"));
}

function expectFinalInlineState(items: readonly HTMLElement[]): void {
  for (const item of items) {
    expect(item.style.opacity).toBe("");
    expect(item.style.transform).toBe("");
    expect(item.style.willChange).toBe("");
  }
}

beforeEach(() => {
  Object.assign(mockGsap, { context: mockContext, timeline: mockTimeline });
  motion = installMotionEnvironment();
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  cleanupOrder.length = 0;
  contexts.length = 0;
  timelines.length = 0;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("keeps the initial chapter in its final state without an entrance", () => {
  const { container } = render(<AtlasProbe activeScene="breath" seeded />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(allItems(container));
});

test("treats a Strict Mode layout-effect replay as the same initial chapter", () => {
  const { container } = render(
    <StrictMode>
      <AtlasProbe activeScene="breath" seeded />
    </StrictMode>,
  );

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(allItems(container));
});

test("sequences the four newly active chapter items over 560 ms", () => {
  const { container, rerender } = render(<AtlasProbe activeScene="breath" />);

  rerender(<AtlasProbe activeScene="strength" />);

  const activeItems = sceneItems(container, "strength");
  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(timelines[0].fromTo).toHaveBeenCalledWith(
    activeItems,
    { opacity: 0.45, y: 12 },
    expect.objectContaining({
      duration: 0.38,
      ease: "power2.out",
      opacity: 1,
      stagger: 0.06,
      y: 0,
    }),
  );
  expect(0.38 + 3 * 0.06).toBe(0.56);

  timelines[0].complete();
  expectFinalInlineState(activeItems);
});

test("kills, reverts, settles, and skips exactly one entrance after interruption", () => {
  const removeProperty = CSSStyleDeclaration.prototype.removeProperty;
  vi.spyOn(CSSStyleDeclaration.prototype, "removeProperty").mockImplementation(function (
    this: CSSStyleDeclaration,
    property: string,
  ) {
    if (property === "opacity") cleanupOrder.push("final");
    return removeProperty.call(this, property);
  });
  const { container, rerender } = render(<AtlasProbe activeScene="breath" />);
  rerender(<AtlasProbe activeScene="strength" />);
  cleanupOrder.length = 0;

  rerender(<AtlasProbe activeScene="sleep" />);

  expect(cleanupOrder.slice(0, 3)).toEqual(["kill", "revert", "final"]);
  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(sceneItems(container, "sleep"));

  rerender(<AtlasProbe activeScene="energy" />);
  expect(mockTimeline).toHaveBeenCalledTimes(2);
  expect(timelines[1].fromTo).toHaveBeenCalledWith(
    sceneItems(container, "energy"),
    expect.any(Object),
    expect.any(Object),
  );
});

test("still skips after scoped revert deactivates an entrance before cleanup", () => {
  const { container, rerender } = render(<AtlasProbe activeScene="breath" />);
  rerender(<AtlasProbe activeScene="strength" />);
  timelines[0].deactivateWithoutCompletion();

  rerender(<AtlasProbe activeScene="sleep" />);

  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(sceneItems(container, "sleep"));
  rerender(<AtlasProbe activeScene="energy" />);
  expect(mockTimeline).toHaveBeenCalledTimes(2);
});

test("terminally settles a live entrance when reduced motion starts", () => {
  const { container, rerender } = render(<AtlasProbe activeScene="breath" />);
  rerender(<AtlasProbe activeScene="strength" />);
  const activeTimeline = timelines[0];
  const revertCount = contexts.at(-1)?.revert.mock.calls.length ?? 0;

  act(() => motion?.setReduced(true));

  expect(activeTimeline.kill).toHaveBeenCalledOnce();
  expect(contexts.at(-1)?.revert).toHaveBeenCalledTimes(revertCount + 1);
  expectFinalInlineState(allItems(container));

  act(() => motion?.setReduced(false));
  rerender(<AtlasProbe activeScene="sleep" />);
  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(sceneItems(container, "sleep"));
});

test("terminally settles an active entrance when disabled and never replays it", () => {
  const { container, rerender } = render(
    <AtlasProbe activeScene="breath" />,
  );
  rerender(<AtlasProbe activeScene="strength" />);
  const activeTimeline = timelines[0];

  rerender(<AtlasProbe activeScene="strength" enabled={false} seeded />);

  expect(activeTimeline.kill).toHaveBeenCalledOnce();
  expect(contexts.at(-1)?.revert).toHaveBeenCalled();
  expectFinalInlineState(allItems(container));

  rerender(<AtlasProbe activeScene="sleep" enabled />);
  rerender(<AtlasProbe activeScene="energy" enabled />);

  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(allItems(container));
});

test("keeps synchronous reduced motion terminal and final", () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  const { container, rerender } = render(<AtlasProbe activeScene="breath" seeded />);

  rerender(<AtlasProbe activeScene="strength" seeded />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(allItems(container));
});

test("checks for a callable timeline before retaining any initial state", () => {
  Object.assign(mockGsap, { timeline: undefined });
  const { container, rerender } = render(<AtlasProbe activeScene="breath" seeded />);

  rerender(<AtlasProbe activeScene="strength" seeded />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(allItems(container));
});

test("reverts and leaves no initial state when timeline creation throws", () => {
  mockTimeline.mockImplementationOnce(() => {
    throw new Error("timeline unavailable");
  });
  const { container, rerender } = render(<AtlasProbe activeScene="breath" seeded />);
  cleanupOrder.length = 0;

  rerender(<AtlasProbe activeScene="strength" seeded />);

  expect(cleanupOrder).toContain("revert");
  expectFinalInlineState(allItems(container));
});

test("settles an active entrance on unmount", () => {
  const { container, rerender, unmount } = render(<AtlasProbe activeScene="breath" />);
  rerender(<AtlasProbe activeScene="strength" />);
  const items = allItems(container);
  const activeTimeline = timelines[0];

  unmount();

  expect(activeTimeline.kill).toHaveBeenCalledOnce();
  expectFinalInlineState(items);
});
