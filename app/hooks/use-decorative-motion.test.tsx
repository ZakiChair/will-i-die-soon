import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import {
  observeDecorativeMotion,
  readDecorativeMotionStatus,
  useDecorativeMotion,
  useDecorativeMotionStatus,
  type DecorativeMotionStatus,
} from "./use-decorative-motion";
import { installMotionEnvironment } from "../test/motion-fixture";

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

function MotionStatusProbe({ states }: { readonly states: DecorativeMotionStatus[] }) {
  const status = useDecorativeMotionStatus();
  states.push(status);
  return <output>{status}</output>;
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
});

test("reads the current motion status synchronously", () => {
  const environment = installMotionEnvironment();

  expect(readDecorativeMotionStatus()).toBe("running");

  environment.restore();
});

test("observes reduced motion and document visibility changes", () => {
  const environment = installMotionEnvironment();
  const listener = vi.fn();
  const observation = observeDecorativeMotion(listener);

  expect(observation.status).toBe("running");

  environment.setReduced(true);
  expect(listener).toHaveBeenLastCalledWith("reduced");

  environment.setReduced(false);
  environment.setHidden(true);
  expect(listener).toHaveBeenLastCalledWith("hidden");

  observation.dispose();
  expect(environment.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));

  environment.restore();
});

test("returns unsupported when matchMedia is missing or non-callable", () => {
  Reflect.deleteProperty(window, "matchMedia");
  expect(readDecorativeMotionStatus()).toBe("unsupported");
  expect(observeDecorativeMotion(vi.fn()).status).toBe("unsupported");

  vi.stubGlobal("matchMedia", {});
  expect(readDecorativeMotionStatus()).toBe("unsupported");
  expect(observeDecorativeMotion(vi.fn()).status).toBe("unsupported");
});

test("returns unsupported when matchMedia throws", () => {
  vi.stubGlobal("matchMedia", () => {
    throw new Error("unavailable");
  });

  expect(readDecorativeMotionStatus()).toBe("unsupported");
  expect(observeDecorativeMotion(vi.fn()).status).toBe("unsupported");
});

test("returns unsupported when media listener APIs are unavailable", () => {
  const environment = installMotionEnvironment();
  Object.assign(environment.media, {
    addEventListener: undefined,
    removeEventListener: undefined,
  });

  expect(observeDecorativeMotion(vi.fn()).status).toBe("unsupported");

  environment.restore();
});

test("cleans up a partial observer setup when media listener installation throws", () => {
  const environment = installMotionEnvironment();
  const addMediaListener = environment.media.addEventListener as ReturnType<typeof vi.fn>;
  addMediaListener.mockImplementationOnce(() => {
    throw new Error("cannot listen");
  });

  const observation = observeDecorativeMotion(vi.fn());

  expect(observation.status).toBe("unsupported");
  expect(environment.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
  observation.dispose();
  expect(environment.removeMediaListener).toHaveBeenCalledTimes(1);

  environment.restore();
});

test("cleans up a partial observer setup when visibility listener installation throws", () => {
  const environment = installMotionEnvironment();
  const removeVisibilityListener = vi.spyOn(document, "removeEventListener");
  const originalAddEventListener = document.addEventListener.bind(document);
  const addVisibilityListener = vi.spyOn(document, "addEventListener").mockImplementation((
    type,
    ...args
  ) => {
    if (type === "visibilitychange") throw new Error("cannot listen");
    originalAddEventListener(type, ...args);
  });

  try {
    const observation = observeDecorativeMotion(vi.fn());

    expect(observation.status).toBe("unsupported");
    expect(environment.removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(removeVisibilityListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    observation.dispose();
    expect(environment.removeMediaListener).toHaveBeenCalledTimes(1);
  } finally {
    addVisibilityListener.mockRestore();
    environment.restore();
  }
});

test("makes observer disposal idempotent", () => {
  const environment = installMotionEnvironment();
  const observation = observeDecorativeMotion(vi.fn());

  observation.dispose();
  observation.dispose();

  expect(environment.removeMediaListener).toHaveBeenCalledTimes(1);
  environment.restore();
});

test("starts false before enabling visible pages without reduced motion", () => {
  const states: boolean[] = [];
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionProbe states={states} />);

  expect(states[0]).toBe(false);
  expect(screen.getByText("true")).toBeVisible();
});

test("does not rerender boolean motion consumers when decorative motion stays disabled", () => {
  const states: boolean[] = [];
  installMotionPreference(true);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionProbe states={states} />);

  expect(states).toEqual([false]);
});

test("keeps dynamic layout pending until supported motion resolves", () => {
  const states: DecorativeMotionStatus[] = [];
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionStatusProbe states={states} />);

  expect(states[0]).toBe("pending");
  expect(screen.getByText("running")).toBeVisible();
});

test("distinguishes a hidden page from a static motion preference", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: true,
  });

  render(<MotionStatusProbe states={[]} />);
  expect(screen.getByText("hidden")).toBeVisible();

  act(() => {
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByText("running")).toBeVisible();

  act(() => motion.setReduced(true));
  expect(screen.getByText("reduced")).toBeVisible();
});

test("reports reduced preference as a static fallback", () => {
  installMotionPreference(true);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionStatusProbe states={[]} />);

  expect(screen.getByText("reduced")).toBeVisible();
});

test("reports missing matchMedia as an unsupported static fallback", async () => {
  Reflect.deleteProperty(window, "matchMedia");
  Object.defineProperty(document, "hidden", { configurable: true, value: false });

  render(<MotionStatusProbe states={[]} />);

  expect(await screen.findByText("unsupported")).toBeVisible();
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
