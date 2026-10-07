import { act, fireEvent, render as testingRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { name: "ScrollTrigger", register: vi.fn() },
}));

const { recordVisualProps } = vi.hoisted(() => ({ recordVisualProps: vi.fn() }));

vi.mock("./living-atlas-visual", () => ({
  LivingAtlasVisual: (props: { activeScene: string; motionStatus: string; onFailure: () => void }) => {
    recordVisualProps(props);
    return (
      <div data-testid="living-visual" data-scene={props.activeScene} data-status={props.motionStatus}>
        <button type="button" onClick={props.onFailure}>Fail visual</button>
      </div>
    );
  },
}));

import type { HumanAtlasSceneId } from "../data/human-atlas";
import { I18nProvider } from "../i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { HumanAtlasScroll, HumanAtlasStaticStory } from "./human-atlas-scroll";

test("server HTML keeps all four topics available before motion has initialized", () => {
  const html = renderToStaticMarkup(<I18nProvider><HumanAtlasScroll /></I18nProvider>);
  const container = document.createElement("div");
  container.innerHTML = html;
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute("data-motion-ready", "false");
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute("data-active-scene", "sleep");
  expect(container.querySelectorAll(".human-atlas-scene__card")).toHaveLength(4);
  expect(container.querySelectorAll(".health-axis-map [aria-current]")).toHaveLength(0);
  expect(container.querySelector(".living-atlas-pause")).not.toBeInTheDocument();
});

const englishHeadings = [
  "Sleep. Recover.",
  "Run. Find your rhythm.",
  "Lift. Move with control.",
  "Eat. Make room for variety.",
];

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
  recordVisualProps.mockClear();
  vi.unstubAllGlobals();
});

test("renders the living visual and four ordered story descriptions", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);

  expect(headings()).toEqual(englishHeadings);
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-scene", "sleep");
  expect(container.querySelector("[data-atlas-progress-fill]")).toBeInTheDocument();
  expect(container.querySelectorAll(".human-atlas-progress__markers > span")).toHaveLength(4);
  expect(container.querySelectorAll(
    '.human-atlas-progress__markers > span[data-active="true"]',
  )).toHaveLength(1);
  expect(container.querySelector(".human-atlas-stage img, .human-atlas-glow-set")).not.toBeInTheDocument();

  const scenes = [...container.querySelectorAll<HTMLElement>("[data-atlas-scene]")];
  expect(scenes).toHaveLength(4);
  for (const scene of scenes) {
    expect([...scene.querySelectorAll("[data-atlas-scene-item]")].map(({ tagName }) => tagName))
      .toEqual(["P", "H3", "P", "SMALL"]);
  }
});

test.each([false, true])("keeps the four chapter links and text without an explorer panel when reduced motion is %s", (reduced) => {
  installMotionPreference(reduced);
  const { container } = render(<HumanAtlasScroll activeScene="strength" />);
  expect(screen.queryAllByRole("region", { name: "What your profile looks at" })).toHaveLength(0);
  expect(screen.getAllByRole("link")).toHaveLength(4);
  expect(headings()).toEqual(englishHeadings);
  expect(descriptions(container)).toHaveLength(4);
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-scene", "strength");
});

test("updates only the displayed scene state as observer entries advance", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  const story = container.querySelector(".human-atlas-scroll");
  if (!story) throw new Error("Missing Human Atlas story");

  expect(story).toHaveAttribute("data-active-scene", "sleep");

  const observedScenes = ["breath", "strength", "energy"] as const;
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
      container.querySelectorAll(`.human-atlas-progress__markers [data-active="true"]`),
    ).toHaveLength(1);
    expect(screen.getByTestId("living-visual")).toHaveAttribute("data-scene", sceneId);
  }
});

test("uses controlled scene state without starting the observer fallback", () => {
  const observer = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor() {
        observer();
      }

      disconnect = vi.fn();
      observe = vi.fn();
    },
  );

  const { container } = render(<HumanAtlasScroll activeScene="sleep" />);

  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-active-scene",
    "sleep",
  );
  expect(container.querySelectorAll('.human-atlas-progress__markers [data-active="true"]')).toHaveLength(1);
  expect(container.querySelector('.human-atlas-progress__markers [data-active="true"]')).toBe(
    container.querySelectorAll(".human-atlas-progress__markers > span").item(0),
  );
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-scene", "sleep");
  expect(observer).not.toHaveBeenCalled();
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-scene-motion",
    "sequenced",
  );
});

test("keeps the mobile story copy synchronized without duplicate accessible headings or controls", () => {
  const { container, rerender } = render(<HumanAtlasScroll activeScene="sleep" />);
  const panel = container.querySelector(".human-atlas-stage__mobile-story");

  expect(panel).toHaveAttribute("aria-hidden", "true");
  expect(panel).toHaveAttribute("data-mobile-story-scene", "sleep");
  expect(panel).toHaveTextContent("01 · Sleep");
  expect(panel).toHaveTextContent("Sleep. Recover.");
  expect([...panel!.children].map(({ tagName }) => tagName)).toEqual(["P", "H3", "P", "SMALL"]);
  expect(panel!.querySelectorAll("a, button, input, select, textarea, [tabindex], [data-atlas-scene-item]")).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
  expect(container.querySelector("#health-axis-sleep")).toHaveAttribute("tabindex", "-1");

  rerender(<I18nProvider><HumanAtlasScroll activeScene="breath" /></I18nProvider>);

  const activePanel = container.querySelector(".human-atlas-stage__mobile-story");
  expect(panel).not.toBeInTheDocument();
  expect(container.querySelectorAll(".human-atlas-stage__mobile-story")).toHaveLength(1);
  expect(activePanel).toHaveAttribute("aria-hidden", "true");
  expect(activePanel).toHaveAttribute("data-mobile-story-scene", "breath");
  expect(activePanel).toHaveTextContent("02 · Cardio");
  expect(activePanel).toHaveTextContent("Run. Find your rhythm.");
  expect(activePanel).not.toHaveTextContent("Sleep. Recover.");
  expect(activePanel!.querySelectorAll("a, button, input, select, textarea, [tabindex], [data-atlas-scene-item]")).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
});

test("keeps the observer fallback on the parent scene owner", () => {
  installObserver();

  const { container } = render(<HumanAtlasScroll />);

  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-scene-motion",
    "parent",
  );
});

test("sends reduced and hidden motion states to the visual without hiding copy", () => {
  const motion = installMotionPreference(false);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    writable: true,
    value: false,
  });
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  const story = container.querySelector(".human-atlas-scroll");
  const visual = screen.getByTestId("living-visual");

  expect(story).toHaveAttribute("data-motion", "running");
  expect(visual).toHaveAttribute("data-status", "running");
  expect(descriptions(container)).toHaveLength(4);

  act(() => motion.setReduced(true));
  expect(story).toHaveAttribute("data-motion", "paused");
  expect(visual).toHaveAttribute("data-status", "reduced");
  expect(descriptions(container)).toHaveLength(4);

  act(() => {
    motion.setReduced(false);
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(story).toHaveAttribute("data-motion", "running");
  expect(visual).toHaveAttribute("data-status", "hidden");
  expect(descriptions(container)).toHaveLength(4);
});

test("automatically stops and resumes the visual while preserving the active chapter without a pause button", () => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, writable: true, value: false });
  const { container } = render(<HumanAtlasScroll activeScene="sleep" />);
  const story = container.querySelector(".human-atlas-scroll");
  const visual = screen.getByTestId("living-visual");

  expect(visual).toHaveAttribute("data-status", "running");
  expect(screen.queryByRole("button", { name: /pause|resume|reprendre/i })).not.toBeInTheDocument();
  act(() => {
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(visual).toHaveAttribute("data-status", "hidden");
  expect(visual).toHaveAttribute("data-scene", "sleep");
  expect(story).toHaveAttribute("data-active-scene", "sleep");
  expect(story).toHaveAttribute("data-motion", "running");
  expect(story).toHaveAttribute("data-scene-motion", "sequenced");
  expect(screen.queryByRole("button", { name: /pause|resume|reprendre/i })).not.toBeInTheDocument();
  expect(headings()).toEqual(englishHeadings);

  act(() => {
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(visual).toHaveAttribute("data-status", "running");
  expect(visual).toHaveAttribute("data-scene", "sleep");
  expect(story).toHaveAttribute("data-motion", "running");
  expect(story).toHaveAttribute("data-scene-motion", "sequenced");
  expect(screen.queryByRole("button", { name: /pause|resume|reprendre/i })).not.toBeInTheDocument();
});

test.each(["en", "fr"] as const)("keeps chapter links keyboard accessible across hidden and visible states without a manual motion control in %s", async (locale) => {
  installMotionPreference(false);
  Object.defineProperty(document, "hidden", { configurable: true, writable: true, value: false });
  const user = userEvent.setup();
  render(<><LanguageSwitcher /><HumanAtlasScroll activeScene="sleep" /></>);
  if (locale === "fr") await user.click(screen.getByRole("button", { name: "Français" }));
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(4);
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "#health-axis-sleep", "#health-axis-breath", "#health-axis-strength", "#health-axis-energy",
  ]);
  const visual = screen.getByTestId("living-visual");

  links[0].focus();
  await user.tab();
  expect(links[1]).toHaveFocus();
  expect(screen.queryByRole("button", { name: /pause|resume|reprendre/i })).not.toBeInTheDocument();

  act(() => {
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(links[1]).toHaveFocus();
  expect(visual).toHaveAttribute("data-status", "hidden");

  act(() => {
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(screen.getAllByRole("link")[1]).toBe(links[1]);
  expect(links[1]).toHaveFocus();
  expect(visual).toHaveAttribute("data-status", "running");
  expect(visual).toHaveAttribute("data-scene", "sleep");
  expect(screen.queryByRole("button", { name: /pause|resume|reprendre/i })).not.toBeInTheDocument();
  await user.tab();
  expect(links[2]).toHaveFocus();
});

test("keeps the full explanation when the decorative visual fails", () => {
  installObserver();
  const { container } = render(<HumanAtlasScroll />);
  fireEvent.click(screen.getByRole("button", { name: "Fail visual" }));

  expect(container.querySelector(".human-atlas-scroll")).toHaveClass(
    "human-atlas-scroll--failed",
  );
  expect(screen.queryByTestId("living-visual")).not.toBeInTheDocument();
  expect(screen.getByText("The animated sculpture is unavailable. The four-axis guide remains accessible.")).toBeVisible();
  expect(screen.getByText("The animated sculpture is unavailable. The four-axis guide remains accessible.")).not.toHaveAttribute("role", "alert");
  expect(headings()).toEqual(englishHeadings);
  expect(container.querySelectorAll("[data-atlas-scene-item]")).toHaveLength(16);
  for (const item of container.querySelectorAll<HTMLElement>("[data-atlas-scene-item]")) {
    expect(item.style.opacity).toBe("");
    expect(item.style.transform).toBe("");
  }
});

test("reports visual failure once and terminally switches controlled motion to static", () => {
  const onVisualFailure = vi.fn();
  const { container } = render(
    <HumanAtlasScroll activeScene="strength" onVisualFailure={onVisualFailure} />,
  );
  const onFailure = recordVisualProps.mock.lastCall?.[0].onFailure;
  expect(onFailure).toBeTypeOf("function");
  act(() => {
    onFailure();
    onFailure();
  });

  expect(onVisualFailure).toHaveBeenCalledOnce();
  expect(screen.queryByTestId("living-visual")).not.toBeInTheDocument();
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-scene-motion",
    "static",
  );
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-motion",
    "paused",
  );
});

test("keeps externally disabled controlled chapters static without removing the story", () => {
  const { container } = render(
    <HumanAtlasScroll activeScene="sleep" motionDisabled />,
  );

  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-scene-motion",
    "static",
  );
  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  expect(headings()).toHaveLength(4);
  expect(screen.getByTestId("living-visual")).toHaveAttribute("data-status", "reduced");
});

test("keeps sleep active and story source order when IntersectionObserver is unavailable", () => {
  Reflect.deleteProperty(window, "IntersectionObserver");
  const { container } = render(<HumanAtlasScroll />);

  expect(container.querySelector(".human-atlas-scroll")).toHaveAttribute(
    "data-active-scene",
    "sleep",
  );
  expect(headings()).toEqual(englishHeadings);
});

test("renders a non-sticky non-interactive static story", () => {
  const { container } = render(<HumanAtlasStaticStory />);

  expect(headings()).toEqual(englishHeadings);
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
    "Dormir. Récupérer.",
    "Courir. Trouver son rythme.",
    "Soulever. Maîtriser le geste.",
    "Manger. Varier les plaisirs.",
  ]);
  expect([...container.querySelectorAll(".human-atlas-scene small")].map(({ textContent }) => textContent)).toEqual([
    "Durée habituelle de sommeil · récupération ressentie dans l’heure suivant le réveil",
    "VO₂ max connue · ml/kg/min · minutes hebdomadaires d’activité modérée",
    "Levers de chaise en 30 secondes · jours de renforcement musculaire par semaine",
    "Portions quotidiennes de fruits et légumes · aliments ultra-transformés comme repas principal",
  ]);
  expect(container.textContent).not.toMatch(
    /Sleep\. Recover|Run\. Find|Lift\. Move|Eat\. Make|Known VO₂/i,
  );
});
