import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { installMotionEnvironment, type MotionEnvironment } from "../test/motion-fixture";

const { MockLenis, scrollTriggerUpdate, ticker } = vi.hoisted(() => {
  class MockLenis {
    static instances: MockLenis[] = [];
    readonly destroy = vi.fn();
    readonly on = vi.fn();
    readonly raf = vi.fn();
    readonly scrollTo = vi.fn();
    readonly stop = vi.fn();

    constructor(readonly options: Record<string, unknown>) {
      MockLenis.instances.push(this);
    }
  }

  return {
    MockLenis,
    scrollTriggerUpdate: vi.fn(),
    ticker: { add: vi.fn(), lagSmoothing: vi.fn(), remove: vi.fn() },
  };
});

vi.mock("lenis", () => ({ default: MockLenis }));
vi.mock("../lib/gsap-client", () => ({
  gsap: { ticker },
  ScrollTrigger: { update: scrollTriggerUpdate },
}));

import { useSmoothScroll } from "./use-smooth-scroll";

let motion: MotionEnvironment | undefined;

function SmoothProbe() {
  const scope = useRef<HTMLDivElement>(null);
  useSmoothScroll(scope);

  return (
    <div ref={scope}>
      <a href="#target">Go</a>
      <a href="#missing">Missing</a>
      <h2 id="target" tabIndex={-1}>Target</h2>
    </div>
  );
}

function installPointer(fine: boolean): void {
  const reducedMedia = motion!.media;
  vi.stubGlobal("matchMedia", vi.fn((query: string) => (
    query === "(prefers-reduced-motion: reduce)"
      ? reducedMedia
      : { matches: fine, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  )));
}

async function settleImports(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderWithLenis() {
  const view = render(<SmoothProbe />);
  await vi.waitFor(() => expect(MockLenis.instances).toHaveLength(1));
  return { ...view, lenis: MockLenis.instances[0] };
}

beforeEach(() => {
  MockLenis.instances.length = 0;
  motion = installMotionEnvironment();
  installPointer(true);
});

afterEach(() => {
  motion?.restore();
  motion = undefined;
  vi.clearAllMocks();
});

test("installe l'inertie au bureau, la synchronise avec ScrollTrigger et la libère au démontage", async () => {
  const { lenis, unmount } = await renderWithLenis();

  expect(lenis.options).toEqual(expect.objectContaining({
    allowNestedScroll: true,
    anchors: false,
    autoRaf: false,
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
  }));
  expect(lenis.on).toHaveBeenCalledWith("scroll", scrollTriggerUpdate);
  expect(ticker.add).toHaveBeenCalledTimes(1);
  expect(ticker.lagSmoothing).toHaveBeenCalledWith(0);
  const tick = ticker.add.mock.calls[0][0] as (time: number) => void;
  tick(0.5);
  expect(lenis.raf).toHaveBeenCalledWith(500);

  unmount();

  expect(ticker.remove).toHaveBeenCalledWith(tick);
  expect(ticker.lagSmoothing).toHaveBeenLastCalledWith(500, 33);
  expect(lenis.destroy).toHaveBeenCalledTimes(1);
});

test.each([
  ["sans matchMedia", () => vi.stubGlobal("matchMedia", undefined)],
  ["en mouvement réduit", () => {
    motion?.restore();
    motion = installMotionEnvironment({ reduced: true });
    installPointer(true);
  }],
  ["au toucher", () => installPointer(false)],
  ["onglet masqué", () => {
    motion?.restore();
    motion = installMotionEnvironment({ hidden: true });
    installPointer(true);
  }],
] as const)("ne charge pas Lenis %s", async (_label, install) => {
  install();
  render(<SmoothProbe />);
  await settleImports();

  expect(MockLenis.instances).toHaveLength(0);
  expect(ticker.add).not.toHaveBeenCalled();
});

test("coupe l'inertie dès que le mouvement réduit s'active", async () => {
  const { lenis } = await renderWithLenis();

  act(() => motion?.setReduced(true));

  expect(lenis.destroy).toHaveBeenCalledTimes(1);
  expect(ticker.remove).toHaveBeenCalledTimes(1);
  expect(ticker.lagSmoothing).toHaveBeenLastCalledWith(500, 33);
});

test("ne crée pas d'instance tardive après le démontage", async () => {
  const { unmount } = render(<SmoothProbe />);
  unmount();
  await settleImports();

  expect(MockLenis.instances).toHaveLength(0);
  expect(ticker.add).not.toHaveBeenCalled();
});

test("anime les liens internes avec l'inertie et donne le focus à la cible", async () => {
  const { lenis } = await renderWithLenis();
  const target = screen.getByRole("heading", { name: "Target" });

  expect(fireEvent.click(screen.getByRole("link", { name: "Go" }))).toBe(false);

  expect(lenis.scrollTo).toHaveBeenCalledWith(target, expect.objectContaining({ duration: 1.1 }));
  expect(target).toHaveFocus();
});

test("défile en douceur sans Lenis quand le mouvement est permis", async () => {
  installPointer(false);
  render(<SmoothProbe />);
  await settleImports();
  const target = screen.getByRole("heading", { name: "Target" });
  const scrollIntoView = vi.fn();
  target.scrollIntoView = scrollIntoView;

  expect(fireEvent.click(screen.getByRole("link", { name: "Go" }))).toBe(false);

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  expect(target).toHaveFocus();
});

test("laisse la navigation native en mouvement réduit, pour une cible absente ou un clic modifié", async () => {
  motion?.restore();
  motion = installMotionEnvironment({ reduced: true });
  installPointer(true);
  render(<SmoothProbe />);
  await settleImports();
  const target = screen.getByRole("heading", { name: "Target" });
  const scrollIntoView = vi.fn();
  target.scrollIntoView = scrollIntoView;

  expect(fireEvent.click(screen.getByRole("link", { name: "Go" }))).toBe(true);
  act(() => motion?.setReduced(false));
  expect(fireEvent.click(screen.getByRole("link", { name: "Missing" }))).toBe(true);
  expect(fireEvent.click(screen.getByRole("link", { name: "Go" }), { ctrlKey: true })).toBe(true);
  expect(scrollIntoView).not.toHaveBeenCalled();
});
