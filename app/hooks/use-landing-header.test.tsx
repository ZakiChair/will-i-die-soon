import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";
import { useLandingHeader } from "./use-landing-header";

let motion: MotionEnvironment | undefined;

function HeaderProbe({ sequenced = false }: { sequenced?: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  useLandingHeader(scope);

  return (
    <div ref={scope}>
      <header className="landing__header" />
      <section className="human-atlas-scroll" data-scroll-sequenced={sequenced ? "true" : undefined} />
    </div>
  );
}

function header(): HTMLElement {
  const element = document.querySelector<HTMLElement>(".landing__header");
  if (!element) throw new Error("Missing header");
  return element;
}

function scrollPage(y: number): void {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  motion = installMotionEnvironment();
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.restoreAllMocks();
});

test("garde l'en-tête en haut, l'efface vers le bas et le rétablit vers le haut", () => {
  render(<HeaderProbe />);
  expect(header()).toHaveAttribute("data-header", "visible");
  expect(header()).not.toHaveAttribute("data-header-scrolled");

  scrollPage(20);
  expect(header()).toHaveAttribute("data-header", "visible");
  expect(header()).toHaveAttribute("data-header-scrolled", "true");
  scrollPage(240);
  expect(header()).toHaveAttribute("data-header", "hidden");
  scrollPage(236);
  expect(header()).toHaveAttribute("data-header", "hidden");
  scrollPage(226);
  expect(header()).toHaveAttribute("data-header", "visible");
  scrollPage(231);
  expect(header()).toHaveAttribute("data-header", "visible");
  scrollPage(242);
  expect(header()).toHaveAttribute("data-header", "hidden");
  scrollPage(12);
  expect(header()).toHaveAttribute("data-header", "visible");
  scrollPage(0);
  expect(header()).not.toHaveAttribute("data-header-scrolled");
});

test("reprend l'état de la page au montage", () => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
  render(<HeaderProbe />);

  expect(header()).toHaveAttribute("data-header", "visible");
  expect(header()).toHaveAttribute("data-header-scrolled", "true");
});

test("laisse la scène occuper l'écran tant que le récit séquencé est épinglé", () => {
  render(<HeaderProbe sequenced />);
  const atlas = document.querySelector<HTMLElement>(".human-atlas-scroll")!;
  let top = 0;
  atlas.getBoundingClientRect = () => ({ top, bottom: top + 3000, height: 3000 } as DOMRect);

  top = -400;
  scrollPage(400);
  expect(header()).toHaveAttribute("data-header", "hidden");
  top = -300;
  scrollPage(300);
  expect(header()).toHaveAttribute("data-header", "hidden");
  top = -2400;
  scrollPage(2400);
  top = -2300;
  scrollPage(2300);
  expect(header()).toHaveAttribute("data-header", "visible");
  top = -2400;
  scrollPage(2400);
  expect(header()).toHaveAttribute("data-header", "hidden");
  atlas.removeAttribute("data-scroll-sequenced");
  top = -300;
  scrollPage(300);
  expect(header()).toHaveAttribute("data-header", "visible");
});

test("reste visible en mouvement réduit tout en signalant qu'il recouvre la page", () => {
  render(<HeaderProbe sequenced />);
  scrollPage(600);
  expect(header()).toHaveAttribute("data-header", "hidden");

  act(() => motion?.setReduced(true));
  expect(header()).toHaveAttribute("data-header", "visible");
  scrollPage(1200);
  expect(header()).toHaveAttribute("data-header", "visible");
  expect(header()).toHaveAttribute("data-header-scrolled", "true");
});

test("reste visible sans matchMedia", () => {
  vi.stubGlobal("matchMedia", undefined);
  render(<HeaderProbe />);
  scrollPage(600);

  expect(header()).toHaveAttribute("data-header", "visible");
});

test("retire ses attributs et son écoute au démontage", () => {
  const { unmount } = render(<HeaderProbe />);
  scrollPage(400);
  const element = header();
  expect(element).toHaveAttribute("data-header", "hidden");
  const removeListener = vi.spyOn(window, "removeEventListener");

  unmount();
  scrollPage(10);

  expect(removeListener.mock.calls.some(([type]) => type === "scroll")).toBe(true);
  expect(element).not.toHaveAttribute("data-header");
  expect(element).not.toHaveAttribute("data-header-scrolled");
});
