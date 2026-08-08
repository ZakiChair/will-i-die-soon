import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";
import { HERO_MOTION_BOOTSTRAP_SCRIPT } from "./motion-bootstrap";

let motion: MotionEnvironment | undefined;

function runBootstrap(): void {
  Function(HERO_MOTION_BOOTSTRAP_SCRIPT)();
}

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.removeAttribute("data-motion-bootstrap");
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  document.documentElement.removeAttribute("data-motion-bootstrap");
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("settles a pending bootstrap on first scroll and clears its guard timer", () => {
  motion = installMotionEnvironment();

  runBootstrap();
  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "pending");

  window.dispatchEvent(new Event("scroll"));
  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");

  document.documentElement.dataset.motionBootstrap = "ready";
  vi.advanceTimersByTime(1500);
  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "ready");
});

test("settles a pending bootstrap after the 1500 millisecond guard", () => {
  motion = installMotionEnvironment();

  runBootstrap();
  vi.advanceTimersByTime(1499);
  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "pending");

  vi.advanceTimersByTime(1);
  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
});

test("leaves the bootstrap attribute absent for initial reduced motion", () => {
  motion = installMotionEnvironment({ reduced: true });

  runBootstrap();

  expect(document.documentElement).not.toHaveAttribute("data-motion-bootstrap");
  expect(vi.getTimerCount()).toBe(0);
});

test("leaves the bootstrap attribute absent when matchMedia is missing", () => {
  Reflect.deleteProperty(window, "matchMedia");

  runBootstrap();

  expect(document.documentElement).not.toHaveAttribute("data-motion-bootstrap");
  expect(vi.getTimerCount()).toBe(0);
});

test("leaves the bootstrap attribute absent when matchMedia throws before setup", () => {
  vi.stubGlobal("matchMedia", () => {
    throw new Error("unavailable");
  });

  runBootstrap();

  expect(document.documentElement).not.toHaveAttribute("data-motion-bootstrap");
  expect(vi.getTimerCount()).toBe(0);
});

test("settles pending motion when the preference changes to reduce", () => {
  motion = installMotionEnvironment();

  runBootstrap();
  motion.setReduced(true);

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(motion.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

test("settles and releases a partially installed scroll listener when media setup throws", () => {
  motion = installMotionEnvironment();
  const removeScrollListener = vi.spyOn(window, "removeEventListener");
  const addMediaListener = motion.media.addEventListener as ReturnType<typeof vi.fn>;
  addMediaListener.mockImplementationOnce(() => {
    throw new Error("cannot listen");
  });

  runBootstrap();

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(removeScrollListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  expect(motion.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

test("settles when scroll listener installation throws after pending is set", () => {
  motion = installMotionEnvironment();
  const removeScrollListener = vi.spyOn(window, "removeEventListener");
  const nativeAddEventListener = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "scroll") throw new Error("cannot listen");
    nativeAddEventListener(type, listener, options);
  });

  runBootstrap();

  expect(document.documentElement).toHaveAttribute("data-motion-bootstrap", "static");
  expect(removeScrollListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});
