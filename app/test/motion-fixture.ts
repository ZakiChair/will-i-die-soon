import { vi } from "vitest";

export type MotionEnvironment = Readonly<{
  media: MediaQueryList;
  setHidden(hidden: boolean): void;
  setReduced(reduced: boolean): void;
  removeMediaListener: ReturnType<typeof vi.fn>;
  restore(): void;
}>;

export function installMotionEnvironment(
  { hidden = false, reduced = false } = {},
): MotionEnvironment {
  let hiddenState = hidden;
  let reducedState = reduced;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const previousHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  const invoke = (listener: EventListenerOrEventListenerObject, event: Event) => {
    if (typeof listener === "function") listener.call(media, event);
    else listener.handleEvent(event);
  };
  const removeMediaListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change") listeners.delete(listener);
    },
  );
  const media = {
    get matches() { return reducedState; },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "change") listeners.add(listener);
      },
    ),
    removeEventListener: removeMediaListener,
    addListener: vi.fn((listener: EventListener) => listeners.add(listener)),
    removeListener: vi.fn((listener: EventListener) => listeners.delete(listener)),
    dispatchEvent(event: Event) {
      for (const listener of listeners) invoke(listener, event);
      return !event.defaultPrevented;
    },
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hiddenState,
  });

  return {
    media,
    removeMediaListener,
    setHidden(next) {
      hiddenState = next;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    setReduced(next) {
      reducedState = next;
      media.dispatchEvent(new Event("change"));
    },
    restore() {
      vi.unstubAllGlobals();
      if (previousHidden) Object.defineProperty(document, "hidden", previousHidden);
      else Reflect.deleteProperty(document, "hidden");
    },
  };
}
