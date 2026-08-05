import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useRef } from "react";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import {
  type HumanAtlasSceneElements,
  useActiveAtlasScene,
} from "./use-active-atlas-scene";

type RectInput = Readonly<{ top: number; height: number }>;

let observerOptions: IntersectionObserverInit | undefined;
let observedNodes: HTMLElement[] = [];
let disconnect = vi.fn();
let emit: (entries: IntersectionObserverEntry[]) => void = () => undefined;

function rect({ top, height }: RectInput): DOMRectReadOnly {
  return {
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top,
    width: 0,
    x: 0,
    y: top,
  };
}

function installObserver() {
  observerOptions = undefined;
  observedNodes = [];
  disconnect = vi.fn();

  class ObserverFake {
    constructor(
      private readonly callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      observerOptions = options;
      emit = (entries) => this.callback(entries, this as unknown as IntersectionObserver);
    }

    disconnect = disconnect;
    observe = (node: Element) => observedNodes.push(node as HTMLElement);
    root = null;
    rootMargin = "";
    thresholds = [];
    takeRecords = () => [];
    unobserve = () => undefined;
  }

  vi.stubGlobal("IntersectionObserver", ObserverFake);
}

function AtlasProbe({ unknown = false }: { readonly unknown?: boolean }) {
  const sceneElements = useRef<HumanAtlasSceneElements>({});
  const activeScene = useActiveAtlasScene(sceneElements);

  return (
    <>
      <output role="status">{activeScene}</output>
      {(["breath", "strength", "sleep", "energy"] as const).map((sceneId) => (
        <section
          data-atlas-scene={unknown && sceneId === "breath" ? "unknown" : sceneId}
          key={sceneId}
          ref={(node) => {
            sceneElements.current[sceneId] = node;
          }}
        />
      ))}
    </>
  );
}

function nodeFor(sceneId: HumanAtlasSceneId): HTMLElement {
  const node = observedNodes.find(
    (candidate) => candidate.getAttribute("data-atlas-scene") === sceneId,
  );
  if (!node) throw new Error(`Missing observed ${sceneId} node`);
  return node;
}

function setNodeRect(sceneId: HumanAtlasSceneId, input: RectInput) {
  nodeFor(sceneId).getBoundingClientRect = () => rect(input) as DOMRect;
}

function entryFor(
  sceneId: HumanAtlasSceneId,
  isIntersecting: boolean,
  intersectionRatio: number,
): IntersectionObserverEntry {
  const boundingClientRect = nodeFor(sceneId).getBoundingClientRect();
  return {
    boundingClientRect,
    intersectionRatio,
    intersectionRect: boundingClientRect,
    isIntersecting,
    rootBounds: rect({ top: 0, height: 600 }),
    target: nodeFor(sceneId),
    time: 0,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("selects the visible scene nearest the centre band", () => {
  installObserver();
  render(<AtlasProbe />);

  expect(screen.getByRole("status")).toHaveTextContent("breath");
  expect(observerOptions).toEqual({
    root: null,
    rootMargin: "-38% 0px -42% 0px",
    threshold: [0, 0.15, 0.35, 0.6],
  });

  setNodeRect("strength", { top: 260, height: 240 });
  setNodeRect("sleep", { top: 390, height: 240 });
  act(() => emit([entryFor("strength", true, 0.6), entryFor("sleep", true, 0.6)]));
  expect(screen.getByRole("status")).toHaveTextContent("strength");
});

test("keeps previously intersecting scenes eligible after another threshold crossing", () => {
  installObserver();
  render(<AtlasProbe />);

  setNodeRect("strength", { top: 260, height: 240 });
  act(() => emit([entryFor("strength", true, 0.6)]));
  expect(screen.getByRole("status")).toHaveTextContent("strength");

  setNodeRect("strength", { top: 380, height: 240 });
  setNodeRect("energy", { top: 700, height: 240 });
  act(() => emit([entryFor("energy", true, 0.15)]));
  expect(screen.getByRole("status")).toHaveTextContent("strength");
});

test("uses canonical scene order for an exact centre-distance tie", () => {
  installObserver();
  render(<AtlasProbe />);

  setNodeRect("breath", { top: 100, height: 200 });
  setNodeRect("strength", { top: 300, height: 200 });
  act(() => emit([entryFor("strength", true, 0.6), entryFor("breath", true, 0.6)]));

  expect(screen.getByRole("status")).toHaveTextContent("breath");
});

test("does not activate an unknown data-atlas-scene value", () => {
  installObserver();
  render(<AtlasProbe unknown />);

  const unknownNode = observedNodes.find(
    (node) => node.getAttribute("data-atlas-scene") === "unknown",
  );
  if (!unknownNode) throw new Error("Missing unknown scene node");
  unknownNode.getBoundingClientRect = () => rect({ top: 200, height: 200 }) as DOMRect;
  const unknownEntry = {
    boundingClientRect: unknownNode.getBoundingClientRect(),
    intersectionRatio: 0.6,
    intersectionRect: unknownNode.getBoundingClientRect(),
    isIntersecting: true,
    rootBounds: rect({ top: 0, height: 600 }),
    target: unknownNode,
    time: 0,
  } as IntersectionObserverEntry;

  act(() => emit([unknownEntry]));
  expect(screen.getByRole("status")).toHaveTextContent("breath");
});

test("falls back to breath when IntersectionObserver is unavailable", () => {
  Reflect.deleteProperty(window, "IntersectionObserver");
  render(<AtlasProbe />);

  expect(screen.getByRole("status")).toHaveTextContent("breath");
});

test("disconnects the observer when unmounted", () => {
  installObserver();
  const { unmount } = render(<AtlasProbe />);

  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

test("does not register a scroll listener", () => {
  installObserver();
  const addEventListener = vi.spyOn(window, "addEventListener");
  render(<AtlasProbe />);

  expect(addEventListener).not.toHaveBeenCalledWith("scroll", expect.any(Function));
});
