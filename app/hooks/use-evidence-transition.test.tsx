import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

type TimelineDouble = Readonly<{
  complete(): void;
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
      fromTo: vi.fn((target: HTMLElement, from: Record<string, unknown>) => {
        cleanupOrder.push(`fromTo:${target.textContent}`);
        if (from.opacity !== undefined) target.style.opacity = String(from.opacity);
        if (from.y !== undefined) target.style.transform = `translateY(${String(from.y)}px)`;
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
    context: mockContext as typeof mockContext | undefined,
    timeline: mockTimeline as typeof mockTimeline | undefined,
  };

  return {
    cleanupOrder,
    contexts,
    mockContext,
    mockGsap,
    mockTimeline,
    timelines,
  };
});

vi.mock("../lib/gsap-client", () => ({
  gsap: mockGsap,
}));

import { useEvidenceTransition } from "./use-evidence-transition";

let motion: MotionEnvironment | undefined;

function EvidenceProbe({
  evidenceKey,
  seeded = false,
}: {
  evidenceKey: string | undefined;
  seeded?: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);
  useEvidenceTransition(scope, evidenceKey);

  return (
    <div
      data-evidence-transition
      ref={scope}
      style={seeded ? { opacity: 0.4, transform: "translateY(20px)" } : undefined}
    >
      <p>{evidenceKey ? `${evidenceKey} evidence` : "No evidence"}</p>
      <button type="button">Inspect {evidenceKey ?? "empty"}</button>
    </div>
  );
}

function evidenceContent(): HTMLElement {
  const content = document.querySelector<HTMLElement>("[data-evidence-transition]");
  if (!content) throw new Error("Missing evidence transition content");
  return content;
}

function expectFinalInlineState(content: HTMLElement): void {
  expect(content.style.opacity).toBe("");
  expect(content.style.transform).toBe("");
  expect(content.style.visibility).toBe("");
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

test("keeps the initially committed evidence final without announcing an entrance", () => {
  render(<EvidenceProbe evidenceKey="first" seeded />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(evidenceContent());
});

test("transitions changed evidence from the contrast-safe state to final", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);

  rerender(<EvidenceProbe evidenceKey="second" />);

  const content = evidenceContent();
  expect(mockTimeline).toHaveBeenCalledOnce();
  expect(timelines[0].fromTo).toHaveBeenCalledWith(
    content,
    { opacity: 0.82, y: 8 },
    expect.objectContaining({
      duration: 0.22,
      ease: "power2.out",
      opacity: 1,
      y: 0,
    }),
  );
  expect(content).toHaveTextContent("second evidence");
  expect(content.style.opacity).toBe("0.82");
  expect(content.style.transform).toBe("translateY(8px)");

  timelines[0].complete();
  expectFinalInlineState(content);
});

test("kills and reverts an active transition before starting the latest evidence", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);
  rerender(<EvidenceProbe evidenceKey="second" />);
  cleanupOrder.length = 0;

  rerender(<EvidenceProbe evidenceKey="third" />);

  expect(timelines[0].isActive).toHaveBeenCalledOnce();
  expect(cleanupOrder.slice(0, 3)).toEqual([
    "kill",
    "revert",
    "fromTo:third evidenceInspect third",
  ]);
  expect(mockTimeline).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("second evidence")).not.toBeInTheDocument();
  expect(screen.getByText("third evidence")).toBeVisible();
  expect(evidenceContent().style.opacity).toBe("0.82");
});

test("does not move focus from evidence content during its transition", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);
  rerender(<EvidenceProbe evidenceKey="second" />);
  const content = evidenceContent();
  const control = screen.getByRole("button", { name: "Inspect second" });

  control.focus();

  expect(control).toHaveFocus();
  expect(content).toContainElement(control);
  expect(content).toHaveAttribute("data-evidence-transition");
  expect(content.style.opacity).toBe("0.82");
  expect(content.style.transform).toBe("translateY(8px)");
});

test("keeps changed evidence final and terminal when timeline is missing", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);
  Object.assign(mockGsap, { timeline: undefined });

  rerender(<EvidenceProbe evidenceKey="second" seeded />);

  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(evidenceContent());

  Object.assign(mockGsap, { timeline: mockTimeline });
  rerender(<EvidenceProbe evidenceKey="third" seeded />);
  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(evidenceContent());
});

test("reverts a throwing transition and does not replay later evidence", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);
  mockTimeline.mockImplementationOnce(() => {
    throw new Error("timeline unavailable");
  });

  rerender(<EvidenceProbe evidenceKey="second" seeded />);

  expect(contexts.at(-1)?.revert).toHaveBeenCalledOnce();
  expectFinalInlineState(evidenceContent());

  rerender(<EvidenceProbe evidenceKey="third" seeded />);
  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(evidenceContent());
});

test("keeps synchronous reduced motion final and does not replay when enabled later", () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  const { rerender } = render(<EvidenceProbe evidenceKey="first" seeded />);

  rerender(<EvidenceProbe evidenceKey="second" seeded />);
  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(evidenceContent());

  act(() => motion?.setReduced(false));
  rerender(<EvidenceProbe evidenceKey="third" seeded />);
  expect(mockTimeline).not.toHaveBeenCalled();
  expectFinalInlineState(evidenceContent());
});

test("settles a live transition on reduced motion and never replays it", () => {
  const { rerender } = render(<EvidenceProbe evidenceKey="first" />);
  rerender(<EvidenceProbe evidenceKey="second" />);
  const activeTimeline = timelines[0];

  act(() => motion?.setReduced(true));

  expect(activeTimeline.kill).toHaveBeenCalledOnce();
  expect(contexts.at(-1)?.revert).toHaveBeenCalledOnce();
  expectFinalInlineState(evidenceContent());

  act(() => motion?.setReduced(false));
  rerender(<EvidenceProbe evidenceKey="third" seeded />);
  expect(mockTimeline).toHaveBeenCalledOnce();
  expectFinalInlineState(evidenceContent());
});
