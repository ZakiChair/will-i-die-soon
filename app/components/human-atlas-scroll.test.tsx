import { act, fireEvent, render as testingRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import { I18nProvider } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { HumanAtlasScroll, HumanAtlasStaticStory } from "./human-atlas-scroll";

function render(ui: ReactElement) {
  return testingRender(<I18nProvider>{ui}</I18nProvider>);
}

type MotionPreference = {
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
    setReduced(reduced) {
      Object.assign(media, { matches: reduced });
      listeners.forEach((listener) => listener(new Event("change")));
    },
  };
}

let emit: (entries: IntersectionObserverEntry[]) => void = () => undefined;

function installObserver() {
  class ObserverFake {
    constructor(private readonly callback: IntersectionObserverCallback) {
      emit = (entries) => this.callback(entries, this as unknown as IntersectionObserver);
    }

    disconnect = () => undefined;
    observe = () => undefined;
    root = null;
    rootMargin = "";
    thresholds = [];
    takeRecords = () => [];
    unobserve = () => undefined;
  }

  vi.stubGlobal("IntersectionObserver", ObserverFake);
}

function sceneEntry(
  container: HTMLElement,
  sceneId: HumanAtlasSceneId,
  isIntersecting = true,
): IntersectionObserverEntry {
  const target = container.querySelector<HTMLElement>(
    `[data-atlas-scene="${sceneId}"]`,
  );
  if (!target) throw new Error(`Missing ${sceneId} scene`);

  const bounds = {
    bottom: 600,
    height: 600,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  } as DOMRectReadOnly;

  return {
    boundingClientRect: bounds,
    intersectionRatio: 0.6,
    intersectionRect: bounds,
    isIntersecting,
    rootBounds: bounds,
    target,
    time: 0,
  };
}

function headings(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map(({ textContent }) => textContent ?? "");
}

function descriptions(container: HTMLElement): string[] {
  return [...container.querySelectorAll(".human-atlas-scene__card > p:not(.data-label)")]
    .map(({ textContent }) => textContent ?? "");
}

afterEach(() => {
  Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
});

test("renders the local decorative atlas and four ordered story descriptions", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);

  expect(headings()).toEqual([
    "Lungs and heart, one circuit.",
    "The signal travels through the whole body.",
    "The brain sets the tempo.",
    "The digestive core lights up.",
  ]);

  const image = container.querySelector<HTMLImageElement>(".human-atlas-stage img");
  expect(image?.getAttribute("src")).toContain("human-atlas-hero.webp");
  expect(image).toHaveAttribute("alt", "");
  expect(image).toHaveAttribute("aria-hidden", "true");
  expect(image).toHaveAttribute("loading", "eager");
  expect(image).toHaveAttribute("fetchpriority", "high");
  expect(image).toHaveAttribute("width", "1672");
  expect(image).toHaveAttribute("height", "941");
  expect(container.querySelector("video, canvas")).not.toBeInTheDocument();
  expect(container.querySelector(".human-atlas-glow-set")).toBeInTheDocument();
  expect(container.querySelectorAll("svg[data-atlas-glow]")).toHaveLength(4);
});

test("updates only the displayed scene state as observer entries advance", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  const story = container.querySelector(".human-atlas-scroll");
  if (!story) throw new Error("Missing Human Atlas story");

  expect(story).toHaveAttribute("data-active-scene", "breath");

  const observedScenes = ["strength", "sleep", "energy"] as const;
  for (const [index, sceneId] of observedScenes.entries()) {
    act(() =>
      emit([
        ...observedScenes.slice(0, index).map((previousScene) =>
          sceneEntry(container, previousScene, false),
        ),
        sceneEntry(container, sceneId),
      ]),
    );
    expect(story).toHaveAttribute("data-active-scene", sceneId);
    expect(
      container.querySelectorAll(`.human-atlas-progress [data-active="true"]`),
    ).toHaveLength(1);
    expect(
      container.querySelector(`[data-atlas-glow="${sceneId}"]`),
    ).toHaveAttribute("data-active", "true");
  }
});

test("pauses decorative glow motion for reduced motion and hidden documents without hiding copy", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: false,
  });
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  const glowSet = container.querySelector(".human-atlas-glow-set > div");

  expect(glowSet).toHaveAttribute("data-motion", "running");
  expect(descriptions(container)).toHaveLength(4);

  act(() => motion.setReduced(true));
  expect(glowSet).toHaveAttribute("data-motion", "paused");
  expect(descriptions(container)).toHaveLength(4);

  act(() => {
    motion.setReduced(false);
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(glowSet).toHaveAttribute("data-motion", "paused");
  expect(descriptions(container)).toHaveLength(4);
});

test("keeps the full explanation when the decorative image fails", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  const image = container.querySelector<HTMLImageElement>(".human-atlas-stage img");
  if (!image) throw new Error("Missing Human Atlas image");

  fireEvent.error(image);

  expect(container.querySelector(".human-atlas-scroll")).toHaveClass(
    "human-atlas-scroll--failed",
  );
  expect(container.querySelectorAll("svg[data-atlas-glow]")).toHaveLength(0);
  expect(screen.getByText("The atlas image is unavailable; the four-part explanation remains below.")).toBeVisible();
  expect(screen.getByText("The atlas image is unavailable; the four-part explanation remains below.")).not.toHaveAttribute("role", "alert");
  expect(headings()).toEqual([
    "Lungs and heart, one circuit.",
    "The signal travels through the whole body.",
    "The brain sets the tempo.",
    "The digestive core lights up.",
  ]);
});

test("keeps breath active and story source order when IntersectionObserver is unavailable", () => {
  Reflect.deleteProperty(window, "IntersectionObserver");
  const { container } = render(<HumanAtlasScroll />);

  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-active-scene",
    "breath",
  );
  expect(headings()).toEqual([
    "Lungs and heart, one circuit.",
    "The signal travels through the whole body.",
    "The brain sets the tempo.",
    "The digestive core lights up.",
  ]);
});

test("renders a non-sticky non-interactive static story", () => {
  const { container } = render(<HumanAtlasStaticStory />);

  expect(headings()).toEqual([
    "Lungs and heart, one circuit.",
    "The signal travels through the whole body.",
    "The brain sets the tempo.",
    "The digestive core lights up.",
  ]);
  expect(container.querySelector(".human-atlas-stage, .human-atlas-scroll")).not.toBeInTheDocument();
  expect(container.querySelectorAll("a, button, input, select, textarea, [tabindex]")).toHaveLength(0);
});

test("switches every story heading and input label to French", async () => {
  installObserver();
  const user = userEvent.setup();
  const { container } = render(
    <>
      <LanguageSwitcher />
      <HumanAtlasScroll />
    </>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(headings()).toEqual([
    "Poumons et cœur, un même circuit.",
    "Le signal traverse tout le corps.",
    "Le cerveau donne le tempo.",
    "Le noyau digestif s'illumine.",
  ]);
  expect([...container.querySelectorAll(".human-atlas-scene small")].map(({ textContent }) => textContent)).toEqual([
    "Donnée déclarée · VO₂ max mesurée ou estimée par un appareil · ml/kg/min",
    "Données déclarées · max existants au squat et au soulevé de terre · rapportés au poids",
    "Données déclarées · durée habituelle · récupération ressentie dans l'heure suivant le réveil",
    "Données déclarées · portions quotidiennes de fruits et légumes · aliments ultra-transformés comme repas principal",
  ]);
  expect(container.textContent).not.toMatch(
    /Lungs and heart|The signal travels|The brain sets|The digestive core|Reported input/i,
  );
});
