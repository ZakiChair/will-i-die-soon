import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Landing } from "./landing";

type MotionPreference = {
  media: MediaQueryList;
  setReduced: (reduced: boolean) => void;
};

function installMotionPreference(initiallyReduced = false): MotionPreference {
  const listeners = new Set<EventListener>();
  const media = {
    matches: initiallyReduced,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: EventListener) => {
      listeners.delete(listener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));

  return {
    media,
    setReduced(reduced) {
      Object.assign(media, { matches: reduced });
      const event = new Event("change");
      listeners.forEach((listener) => listener(event));
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
});

test("starts the quick exploration from the landing action", async () => {
  const onStart = vi.fn();
  const user = userEvent.setup();

  render(<Landing onStart={onStart} />);

  expect(
    screen.getByRole("heading", { name: /your health is not a verdict/i }),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: /choose quick/i }));

  expect(onStart).toHaveBeenCalledWith("quick");
});

test("keeps the hero poster available while reduced-motion changes gate the silent loop", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });

  const { container } = render(<Landing onStart={vi.fn()} />);
  const poster = container.querySelector<HTMLImageElement>(
    ".landing__canopy-media img",
  );
  const video = container.querySelector<HTMLVideoElement>(
    ".landing__canopy-video",
  );

  expect(poster).not.toBeNull();
  expect(poster?.getAttribute("src")).toContain("canopy-hero.webp");
  expect(poster).toHaveAttribute("alt", "");
  expect(poster).toHaveAttribute("aria-hidden", "true");
  expect(poster).toHaveAttribute("loading", "eager");
  expect(poster).toHaveAttribute("fetchpriority", "high");
  expect(poster).toHaveAttribute("width", "1920");
  expect(poster).toHaveAttribute("height", "1080");
  expect(video).not.toBeNull();
  expect(video).toHaveAttribute("aria-hidden", "true");
  expect(video).toHaveAttribute("poster", "/media/canopy-hero.webp");
  expect(video).toHaveAttribute("preload", "none");
  expect(video?.autoplay).toBe(true);
  expect(video?.muted).toBe(true);
  expect(video?.loop).toBe(true);
  expect(video?.playsInline).toBe(true);
  expect(video?.querySelector("source")).toHaveAttribute(
    "src",
    "/media/canopy-loop.mp4",
  );

  act(() => motion.setReduced(true));

  expect(
    container.querySelector(".landing__canopy-video"),
  ).not.toBeInTheDocument();
  expect(container.querySelector(".landing__canopy-media img")).toBeInTheDocument();
});

test("stops decorative hero motion while the document is hidden", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: false,
  });

  const { container } = render(<Landing onStart={vi.fn()} />);
  expect(container.querySelector(".landing__canopy-video")).toBeInTheDocument();

  act(() => {
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(
    container.querySelector(".landing__canopy-video"),
  ).not.toBeInTheDocument();

  act(() => {
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(container.querySelector(".landing__canopy-video")).toBeInTheDocument();
});
