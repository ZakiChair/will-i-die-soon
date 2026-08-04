import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { useDecorativeMotion } from "./use-decorative-motion";

type MotionPreference = {
  readonly media: MediaQueryList;
  setReduced: (reduced: boolean) => void;
  readonly removeEventListener: ReturnType<typeof vi.fn>;
};

function installMotionPreference(initiallyReduced = false): MotionPreference {
  const listeners = new Set<EventListener>();
  const removeEventListener = vi.fn((_type: string, listener: EventListener) => {
    listeners.delete(listener);
  });
  const media = {
    matches: initiallyReduced,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.add(listener);
    },
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));

  return {
    media,
    removeEventListener,
    setReduced(reduced) {
      Object.assign(media, { matches: reduced });
      listeners.forEach((listener) => listener(new Event("change")));
    },
  };
}

function MotionProbe({ states }: { readonly states: boolean[] }) {
  const allowed = useDecorativeMotion();
  states.push(allowed);
  return <output>{String(allowed)}</output>;
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
});

test("starts false before enabling visible pages without reduced motion", () => {
  const states: boolean[] = [];
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionProbe states={states} />);

  expect(states[0]).toBe(false);
  expect(screen.getByText("true")).toBeVisible();
});

test("responds to reduced-motion preference changes", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionProbe states={[]} />);
  expect(screen.getByText("true")).toBeVisible();

  act(() => motion.setReduced(true));
  expect(screen.getByText("false")).toBeVisible();

  act(() => motion.setReduced(false));
  expect(screen.getByText("true")).toBeVisible();
});

test("responds to document visibility changes", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: false,
  });

  render(<MotionProbe states={[]} />);
  expect(screen.getByText("true")).toBeVisible();

  act(() => {
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByText("false")).toBeVisible();
});

test("stays false when matchMedia is unavailable", () => {
  Reflect.deleteProperty(window, "matchMedia");
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionProbe states={[]} />);

  expect(screen.getByText("false")).toBeVisible();
});

test("removes media and visibility listeners on cleanup", () => {
  const motion = installMotionPreference(false);
  const removeVisibilityListener = vi.spyOn(document, "removeEventListener");
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  const { unmount } = render(<MotionProbe states={[]} />);
  unmount();

  expect(motion.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  expect(removeVisibilityListener).toHaveBeenCalledWith(
    "visibilitychange",
    expect.any(Function),
  );
});
