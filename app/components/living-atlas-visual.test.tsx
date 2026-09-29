import { act, render, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { LivingAtlasVisual } from "./living-atlas-visual";

const { construct, constructHuman, dispose, setRunning } = vi.hoisted(() => ({
  construct: vi.fn(), constructHuman: vi.fn(), dispose: vi.fn(), setRunning: vi.fn(),
}));

vi.mock("../lib/human-signal-scene", () => ({
  HumanSignalScene: class {
    constructor(...args: unknown[]) { constructHuman(...args); }
    dispose = dispose;
    setRunning = setRunning;
  },
}));

vi.mock("../lib/living-atlas-scene", () => ({
  LivingAtlasScene: class {
    constructor(...args: unknown[]) { construct(...args); }
    dispose = dispose;
    setRunning = setRunning;
  },
}));

let intersect: (visible: boolean) => void;
const disconnect = vi.fn();
const progressRef = { current: 0 };
const onFailure = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  construct.mockReset();
  constructHuman.mockReset();
  progressRef.current = 0;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 0, bottom: 500, width: 500, height: 500,
  } as DOMRect);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      intersect = (visible) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe = vi.fn();
    disconnect = disconnect;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("renders a decorative static composition without starting WebGL for reduced motion", () => {
  const { container } = render(<LivingAtlasVisual activeScene="breath" motionStatus="reduced" progressRef={progressRef} onFailure={onFailure} />);
  expect(container.querySelector(".living-atlas")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelectorAll("svg ellipse")).toHaveLength(36);
  expect(container.querySelector(".living-atlas")).toHaveAttribute("data-ready", "false");
  expect(construct).not.toHaveBeenCalled();
});

test("the human variant uses its own scene and retains a recognizable SVG in reduced motion", async () => {
  const view = render(<LivingAtlasVisual variant="human" activeScene="sleep" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(constructHuman).toHaveBeenCalledOnce());
  expect(construct).not.toHaveBeenCalled();
  expect(constructHuman.mock.calls[0][1]()).toEqual({ progress: 0, scene: "sleep" });
  view.rerender(<LivingAtlasVisual variant="human" activeScene="sleep" motionStatus="reduced" progressRef={progressRef} onFailure={onFailure} />);
  expect(dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector(".human-signal-still")).toBeInTheDocument();
  expect(view.container.querySelector(".living-atlas--human")).toHaveAttribute("data-ready", "false");
});

test.each(["sleep", "breath", "strength", "energy"] as const)("preserves the %s human pose in server HTML and reduced motion without WebGL", async (scene) => {
  const props = { variant: "human" as const, activeScene: scene, progressRef, onFailure };
  const effect = {
    sleep: 'data-human-expression="resting"',
    breath: 'data-human-effect="sweat"',
    strength: 'data-human-expression="focused"',
    energy: 'data-human-expression="happy"',
  }[scene];
  const markup = renderToStaticMarkup(<LivingAtlasVisual {...props} motionStatus="pending" />);
  expect(markup).toContain(`data-action="${scene}"`);
  expect(markup).toContain("<svg");
  expect(markup).toContain(effect);
  const { container } = render(<LivingAtlasVisual {...props} motionStatus="reduced" />);
  expect(container.querySelector(".living-atlas--human")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelector(".living-atlas--human")).toHaveAttribute("data-ready", "false");
  expect(container.querySelector(".human-signal-still")).toHaveAttribute("data-action", scene);
  expect(container.querySelector(".human-signal-still")).toHaveAttribute("data-appearance", "translucent");
  expect(container.querySelector(`[${effect}]`)).toBeInTheDocument();
  expect(container.querySelector("canvas, animate, animateTransform, image")).toBeNull();
  await act(async () => { await Promise.resolve(); });
  expect(constructHuman).not.toHaveBeenCalled();
  expect(construct).not.toHaveBeenCalled();
});

test("replaces running sweat with a happy meal expression without animating the reduced-motion fallback", () => {
  const view = render(<LivingAtlasVisual variant="human" activeScene="breath" motionStatus="reduced" progressRef={progressRef} onFailure={onFailure} />);
  const gradientId = view.container.querySelector("linearGradient")?.id;
  expect(view.container.querySelectorAll('[data-human-effect="sweat"] path').length).toBeGreaterThan(1);
  expect(view.container.querySelector('[data-human-expression="happy"]')).toBeNull();
  view.rerender(<LivingAtlasVisual variant="human" activeScene="energy" motionStatus="reduced" progressRef={progressRef} onFailure={onFailure} />);
  expect(view.container.querySelector('[data-human-effect="sweat"]')).toBeNull();
  expect(view.container.querySelector('[data-human-expression="happy"]')).toBeInTheDocument();
  expect(view.container.querySelector("linearGradient")).toHaveAttribute("id", gradientId);
  expect(view.container.querySelector("canvas, animate, animateMotion, animateTransform, button, image")).toBeNull();
  expect(view.container.querySelector(".living-atlas--human")).toHaveAttribute("aria-hidden", "true");
  expect(constructHuman).not.toHaveBeenCalled();
});

test("reads live scroll and scene values, pauses offscreen and disposes on unmount", async () => {
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(construct).toHaveBeenCalledOnce());
  expect(setRunning).toHaveBeenLastCalledWith(true);
  const getState = construct.mock.calls[0][1];
  progressRef.current = 0.65;
  view.rerender(<LivingAtlasVisual activeScene="sleep" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  expect(getState()).toEqual({ progress: 0.65, scene: "sleep" });
  act(() => intersect(false));
  expect(setRunning).toHaveBeenLastCalledWith(false);
  act(() => intersect(true));
  expect(setRunning).toHaveBeenLastCalledWith(true);
  view.unmount();
  expect(dispose).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalledOnce();
  act(() => intersect(true));
  expect(construct).toHaveBeenCalledOnce();
});

test("retains the same renderer when the document or user pauses and resumes", async () => {
  const view = render(<LivingAtlasVisual activeScene="strength" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(construct).toHaveBeenCalledOnce());
  view.rerender(<LivingAtlasVisual activeScene="strength" motionStatus="hidden" progressRef={progressRef} onFailure={onFailure} />);
  expect(setRunning).toHaveBeenLastCalledWith(false);
  expect(dispose).not.toHaveBeenCalled();
  view.rerender(<LivingAtlasVisual activeScene="strength" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  expect(setRunning).toHaveBeenLastCalledWith(true);
  expect(construct).toHaveBeenCalledOnce();
});

test("starts after an initially hidden document becomes visible", async () => {
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="hidden" progressRef={progressRef} onFailure={onFailure} />);
  expect(construct).not.toHaveBeenCalled();
  view.rerender(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(construct).toHaveBeenCalledOnce());
  expect(setRunning).toHaveBeenLastCalledWith(true);
});

test("switching to reduced motion releases the renderer and reveals the still", async () => {
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(construct).toHaveBeenCalledOnce());
  view.rerender(<LivingAtlasVisual activeScene="breath" motionStatus="reduced" progressRef={progressRef} onFailure={onFailure} />);
  expect(dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector(".living-atlas")).toHaveAttribute("data-ready", "false");
  view.rerender(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  expect(view.container.querySelector(".living-atlas")).toHaveAttribute("data-ready", "false");
  await waitFor(() => expect(construct).toHaveBeenCalledTimes(2));
  expect(view.container.querySelector(".living-atlas")).toHaveAttribute("data-ready", "true");
});

test("does not initialize from a late import after unmount or while hidden", async () => {
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  view.rerender(<LivingAtlasVisual activeScene="breath" motionStatus="hidden" progressRef={progressRef} onFailure={onFailure} />);
  await act(async () => { await Promise.resolve(); });
  expect(construct).not.toHaveBeenCalled();
  view.rerender(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  view.unmount();
  await act(async () => { await Promise.resolve(); });
  expect(construct).not.toHaveBeenCalled();
});

test.each(["constructor", "observe"])("recovers and cleans up when IntersectionObserver %s throws", async (stage) => {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      if (stage === "constructor") throw new Error("No observer");
      intersect = (visible) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() { throw new Error("Cannot observe"); }
    disconnect = disconnect;
  });
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  expect(onFailure).toHaveBeenCalledOnce();
  view.unmount();
  if (stage === "observe") {
    expect(disconnect).toHaveBeenCalledOnce();
    act(() => intersect(true));
  }
  await act(async () => { await Promise.resolve(); });
  expect(construct).not.toHaveBeenCalled();
});

test.each(["living", "human"] as const)("unavailable WebGL reports failure once and keeps the %s static illustration", async (variant) => {
  const constructor = variant === "human" ? constructHuman : construct;
  constructor.mockImplementation(() => { throw new Error("WebGL unavailable"); });
  const { container } = render(<LivingAtlasVisual variant={variant} activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(onFailure).toHaveBeenCalledOnce());
  act(() => intersect(true));
  expect(constructor).toHaveBeenCalledOnce();
  expect(container.querySelector(".living-atlas")).toHaveAttribute("data-ready", "false");
  expect(container.querySelector("svg.living-atlas__still")).toBeInTheDocument();
  if (variant === "human") {
    expect(container.querySelector(".human-signal-still")).toHaveAttribute("data-action", "breath");
  }
});

test("runtime context failure is terminal and stale callbacks cannot reach the parent", async () => {
  const view = render(<LivingAtlasVisual activeScene="breath" motionStatus="running" progressRef={progressRef} onFailure={onFailure} />);
  await waitFor(() => expect(construct).toHaveBeenCalledOnce());
  const fail = construct.mock.calls[0][2];
  act(() => { fail(); fail(); });
  expect(onFailure).toHaveBeenCalledOnce();
  expect(setRunning).toHaveBeenCalledTimes(1);
  view.unmount();
  act(() => fail());
  expect(onFailure).toHaveBeenCalledOnce();
});
